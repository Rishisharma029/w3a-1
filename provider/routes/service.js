/**
 * provider/routes/service.js
 *
 * Express router implementing the two HTTP endpoints of the x402-style flow:
 *
 *   GET  /service?serviceId=<id>
 *        Returns HTTP 402 Payment Required with the payment challenge.
 *        The reqId in the challenge is provider-generated — the agent MUST
 *        echo this exact reqId back when submitting payment.
 *
 *   POST /deliver
 *        Receives the agent's payment proof.
 *        Verifies authorization on-chain.
 *        Checks idempotency store.
 *        Delivers content + receipt.
 *
 *   GET  /services
 *        Lists available services and their prices (no auth required).
 *
 *   GET  /receipts
 *        Admin endpoint — lists all receipts (for audit/demo).
 *
 * The five distinct steps of the payment flow are clearly separated here:
 *   1. GET /service         → Payment Required
 *   2. Agent calls contract → Payment Authorized
 *   3. POST /deliver        → Payment Completed (agent submits proof)
 *   4. verifyAuthorization  → on-chain check (inside POST /deliver)
 *   5. 200 with content     → Delivered
 */

"use strict";

const express      = require("express");
const { v4: uuid } = require("uuid");
const { ethers }   = require("ethers");

const receiptStore               = require("../receipt-store");
const { ContractVerifier }       = require("../verifier");
const { getService, listServices } = require("../services");
const { makeDeliveryReceipt, makePayment402Challenge } = require("../../shared/types");
const { AuditEvent }             = require("../../shared/events");

const router = express.Router();

// ---------------------------------------------------------------------------
// Build a reqId as a bytes32 hex string.
// Provider generates it — this is the critical trust model decision:
// the agent cannot forge a reqId that it hasn't been issued by the provider.
// ---------------------------------------------------------------------------
function generateReqId() {
  // Use uuid v4 → encode as 16 bytes → bytes32 (zero-padded to 32 bytes)
  const raw = uuid().replace(/-/g, ""); // 32 hex chars = 16 bytes
  return "0x" + raw.padEnd(64, "0");    // pad to 32 bytes (64 hex chars)
}

// ---------------------------------------------------------------------------
// GET /services — list all available services
// ---------------------------------------------------------------------------
router.get("/services", (req, res) => {
  res.json({
    providerAddress: req.app.locals.providerAddress,
    services: listServices(),
  });
});

// ---------------------------------------------------------------------------
// GET /service — Step 1: return HTTP 402 Payment Required
// ---------------------------------------------------------------------------
router.get("/service", (req, res) => {
  const { serviceId } = req.query;

  if (!serviceId) {
    return res.status(400).json({ error: "serviceId query param is required" });
  }

  const service = getService(serviceId);
  if (!service) {
    return res.status(404).json({ error: `Unknown service: ${serviceId}` });
  }

  // Generate a fresh reqId for this service request
  const reqId = generateReqId();

  const challenge = makePayment402Challenge({
    reqId,
    serviceId: service.id,
    price: service.price,
    providerAddress: req.app.locals.providerAddress,
    paymentEndpoint:  `${req.app.locals.baseUrl}/deliver`,
    expiresAt: Math.floor(Date.now() / 1000) + 300, // 5 minutes
  });

  // Log the event
  req.app.locals.auditLog?.push({
    event:     AuditEvent.PAYMENT_REQUIRED,
    reqId,
    serviceId: service.id,
    price:     service.price,
    timestamp: Date.now(),
  });

  // HTTP 402 Payment Required
  res.status(402).json({
    error:     "Payment Required",
    challenge,
  });
});

// ---------------------------------------------------------------------------
// POST /deliver — Steps 3-5: verify payment, deliver content
// ---------------------------------------------------------------------------
router.post("/deliver", async (req, res) => {
  const { reqId, serviceId, amount } = req.body;

  // ── Basic input validation ──────────────────────────────────────────────
  if (!reqId || !serviceId || amount === undefined) {
    return res.status(400).json({
      error: "reqId, serviceId, and amount are required",
    });
  }

  const amountBigInt = BigInt(amount);
  if (amountBigInt <= 0n) {
    return res.status(400).json({ error: "amount must be > 0" });
  }

  const service = getService(serviceId);
  if (!service) {
    return res.status(404).json({ error: `Unknown service: ${serviceId}` });
  }

  // ── Step 3: idempotency check (provider layer) ──────────────────────────
  // If we have already delivered for this reqId, return the cached receipt.
  // This handles network timeouts and agent retries without re-charging.
  if (receiptStore.has(reqId)) {
    const cached = receiptStore.get(reqId);
    req.app.locals.auditLog?.push({
      event:     AuditEvent.RETRY_DETECTED,
      reqId,
      serviceId,
      timestamp: Date.now(),
      note:      "Returning cached receipt — no double charge",
    });
    return res.json({
      idempotent: true,
      message:    "Previously delivered — returning cached receipt",
      receipt:    cached,
    });
  }

  // ── Step 4: verify authorization on-chain ──────────────────────────────
  const verifier = req.app.locals.verifier;
  let authorized = false;
  try {
    authorized = await verifier.verifyAuthorization(reqId, amountBigInt);
  } catch (err) {
    console.error("[Provider] Contract verification error:", err.message);
    return res.status(503).json({
      error: "Contract verification failed",
      detail: err.message,
    });
  }

  if (!authorized) {
    req.app.locals.auditLog?.push({
      event:     AuditEvent.FAILED,
      reqId,
      serviceId,
      timestamp: Date.now(),
      reason:    "Contract verifyAuthorization returned false",
    });
    return res.status(402).json({
      error: "Payment not verified",
      detail:
        "Contract did not confirm authorization for this reqId and amount. " +
        "Either the reqId is unknown, the amount does not match, or the " +
        "budget was exceeded.",
    });
  }

  // ── Step 5: deliver content ─────────────────────────────────────────────
  const content = service.generate(reqId);

  const receipt = makeDeliveryReceipt({
    receiptId:        "REC-" + uuid(),
    reqId,
    serviceId,
    providerAddress:  req.app.locals.providerAddress,
    amountAuthorized: Number(amountBigInt),
    timestamp:        Math.floor(Date.now() / 1000),
    content,
    txReference:      `LOCAL-${reqId}`,
  });

  // Persist receipt BEFORE responding (so retries always get the same receipt)
  receiptStore.set(reqId, receipt);

  req.app.locals.auditLog?.push({
    event:     AuditEvent.DELIVERED,
    reqId,
    serviceId,
    receiptId: receipt.receiptId,
    contentHash: receipt.contentHash,
    timestamp: Date.now(),
  });

  return res.json({
    idempotent: false,
    message:    "Service delivered",
    receipt,
  });
});

// ---------------------------------------------------------------------------
// GET /receipts — admin/audit endpoint
// ---------------------------------------------------------------------------
router.get("/receipts", (req, res) => {
  res.json({ receipts: receiptStore.all() });
});

module.exports = router;
