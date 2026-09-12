/**
 * marketplace/provider-router.js
 *
 * Factory that creates an Express router implementing the x402-style flow
 * for ONE specific provider.
 *
 * Each provider gets:
 *   - Its own GET /:providerId/service    → 402 challenge
 *   - Its own POST /:providerId/deliver   → verify + deliver
 *   - Its own GET /:providerId/receipts   → admin audit list
 *   - Its own ReceiptStore (no cross-provider leakage)
 *   - Its own QuoteStore  (stale-quote protection per provider)
 *
 * Security additions vs Phase 1:
 *   - Quote validation before contract check (stale/tampered quote rejected)
 *   - Price-mismatch protection (quoted price vs submitted amount)
 *   - Payload passthrough to content generator (contextual content)
 *
 * @param {object} providerConfig   - From marketplace/providers.js
 * @param {object} verifier         - ContractVerifier instance (or override)
 * @param {object} receiptStore     - ReceiptStore instance for this provider
 * @param {object} quoteStore       - QuoteStore instance for this provider
 * @param {object} [sharedAuditLog] - Optional shared audit array
 * @returns {express.Router}
 */

"use strict";

const express      = require("express");
const { v4: uuid } = require("uuid");

const { makeDeliveryReceipt } = require("../shared/types");
const { AuditEvent }          = require("../shared/events");

const QUOTE_TTL_SECONDS = 300; // 5 minutes

// ---------------------------------------------------------------------------
// Helper — bytes32 reqId generator (same as Phase 1 provider)
// ---------------------------------------------------------------------------
function generateReqId() {
  const raw = uuid().replace(/-/g, "");
  return "0x" + raw.padEnd(64, "0");
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
function createProviderRouter({
  providerConfig,
  verifier,
  receiptStore,
  quoteStore,
  sharedAuditLog = [],
  tamperNext = { value: false }, // mutable ref for demo/test tampering
}) {
  const router = express.Router();
  const { providerId, services } = providerConfig;

  // ── GET /service — Step 1: 402 Payment Required ─────────────────────────
  router.get("/service", (req, res) => {
    const { serviceId, payload: payloadStr } = req.query;

    if (!serviceId) {
      return res.status(400).json({ error: "serviceId query param required" });
    }

    const service = services[serviceId];
    if (!service) {
      return res.status(404).json({ error: `Unknown service: ${serviceId}` });
    }

    // Check provider availability (can be toggled in tests)
    if (!providerConfig.availability || providerConfig.availability <= 0) {
      return res.status(503).json({
        error:      "Provider unavailable",
        providerId,
        retryAfter: 30,
      });
    }

    const reqId     = generateReqId();
    const expiresAt = Math.floor(Date.now() / 1000) + QUOTE_TTL_SECONDS;

    // Record pending quote (stale-quote protection)
    quoteStore.set(reqId, {
      serviceId,
      price:     service.price,
      expiresAt,
      providerId,
    });

    // Build structured 402 challenge (x402-style)
    const challenge = {
      reqId,
      providerId,
      serviceId,
      price:              service.price,
      currency:           "UNIT",
      paymentEndpoint:    req.app.locals.baseUrl
        ? `${req.app.locals.baseUrl}/providers/${providerId}/deliver`
        : `/providers/${providerId}/deliver`,
      networkInfo:        "local-hardhat",
      expiresAt,
      nonce:              reqId, // reqId doubles as nonce
    };

    sharedAuditLog.push({
      event:     AuditEvent.PAYMENT_REQUIRED,
      reqId,
      providerId,
      serviceId,
      price:     service.price,
      timestamp: Date.now(),
    });

    return res.status(402).json({
      error:     "Payment Required",
      challenge,
    });
  });

  // ── POST /deliver — Steps 3-5 ────────────────────────────────────────────
  router.post("/deliver", async (req, res) => {
    const { reqId, serviceId, amount, payload } = req.body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!reqId || !serviceId || amount === undefined) {
      return res.status(400).json({
        error: "reqId, serviceId, and amount are required",
      });
    }

    const amountNum    = Number(amount);
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
      return res.status(400).json({ error: "amount must be > 0" });
    }

    const service = services[serviceId];
    if (!service) {
      return res.status(404).json({ error: `Unknown service: ${serviceId}` });
    }

    // ── Idempotency check (provider layer) ────────────────────────────────
    if (receiptStore.has(reqId)) {
      const cached = receiptStore.get(reqId);
      sharedAuditLog.push({
        event:     AuditEvent.RETRY_DETECTED,
        reqId,
        providerId,
        serviceId,
        timestamp: Date.now(),
        note:      "Cached receipt returned — no second charge",
      });
      return res.json({
        idempotent: true,
        message:    "Previously delivered — returning cached receipt",
        receipt:    cached,
      });
    }

    // ── Stale-quote protection ────────────────────────────────────────────
    const quoteCheck = quoteStore.validate(reqId, serviceId, amountNum);
    if (!quoteCheck.valid) {
      sharedAuditLog.push({
        event:     AuditEvent.FAILED,
        reqId,
        providerId,
        serviceId,
        timestamp: Date.now(),
        reason:    `Quote validation failed: ${quoteCheck.reason}`,
      });
      return res.status(402).json({
        error:  "Quote validation failed",
        detail: quoteCheck.reason,
      });
    }

    // ── On-chain authorization verification ──────────────────────────────
    let authorized = false;
    try {
      authorized = await verifier.verifyAuthorization(reqId, amountBigInt);
    } catch (err) {
      return res.status(503).json({
        error:  "Contract verification failed",
        detail: err.message,
      });
    }

    if (!authorized) {
      sharedAuditLog.push({
        event:     AuditEvent.FAILED,
        reqId,
        providerId,
        serviceId,
        timestamp: Date.now(),
        reason:    "Contract verifyAuthorization returned false",
      });
      return res.status(402).json({
        error:  "Payment not verified on-chain",
        detail: "Contract did not confirm authorization for this reqId + amount.",
      });
    }

    // ── Content generation (with optional tampering for demo/tests) ───────
    const content = service.generate(reqId, payload || {});
    const shouldTamper = tamperNext.value;
    if (shouldTamper) {
      tamperNext.value = false; // reset after one use
    }

    let receipt = makeDeliveryReceipt({
      receiptId:        "REC-" + uuid(),
      reqId,
      serviceId,
      providerAddress:  providerId,
      amountAuthorized: amountNum,
      timestamp:        Math.floor(Date.now() / 1000),
      content,
      txReference:      `LOCAL-${reqId}`,
    });

    // If tampering is enabled, corrupt the delivered content so it no longer matches contentHash
    if (shouldTamper) {
      receipt = Object.assign({}, receipt, {
        content: {
          ...content,
          TAMPERED: true,
          corruptedPayload: "Deliberately altered payload to simulate provider tampering",
        },
      });
    }

    // Persist receipt BEFORE responding
    receiptStore.set(reqId, receipt);
    // Clean up pending quote
    quoteStore.delete(reqId);

    sharedAuditLog.push({
      event:       AuditEvent.DELIVERED,
      reqId,
      providerId,
      serviceId,
      receiptId:   receipt.receiptId,
      contentHash: receipt.contentHash,
      timestamp:   Date.now(),
    });

    return res.json({
      idempotent: false,
      message:    "Service delivered",
      receipt,
    });
  });

  // ── GET /receipts — admin/audit ──────────────────────────────────────────
  router.get("/receipts", (req, res) => {
    res.json({
      providerId,
      receipts: receiptStore.all(),
    });
  });

  return router;
}

module.exports = { createProviderRouter };
