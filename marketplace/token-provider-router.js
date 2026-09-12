/**
 * marketplace/token-provider-router.js
 *
 * x402 Real Token Settlement Provider Router
 * ==========================================
 * Implements x402 payment requirements, EIP-712 payment payload verification,
 * on-chain token settlement via PaymentFacilitator, and delivery proof generation.
 */

"use strict";

const express = require("express");
const { v4: uuid } = require("uuid");
const { makeDeliveryReceipt } = require("../shared/types");
const { AuditEvent } = require("../shared/events");

const QUOTE_TTL_SECONDS = 300; // 5 minutes

function generateReqId() {
  const raw = uuid().replace(/-/g, "");
  return "0x" + raw.padEnd(64, "0");
}

function createTokenProviderRouter({
  providerConfig,
  facilitator,
  receiptStore,
  quoteStore,
  providerWalletAddress,
  tokenAddress,
  sharedAuditLog = [],
  tamperNext = { value: false },
}) {
  const router = express.Router();
  const { providerId, services } = providerConfig;
  const recipient = providerWalletAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Mock provider wallet

  // ---------------------------------------------------------------------------
  // GET /service — x402 Payment Required Challenge
  // ---------------------------------------------------------------------------
  router.get("/service", (req, res) => {
    const { serviceId, payload: payloadStr } = req.query;

    if (!serviceId) {
      return res.status(400).json({ error: "serviceId query parameter is required" });
    }

    const service = services[serviceId];
    if (!service) {
      return res.status(404).json({ error: `Unknown service: ${serviceId}` });
    }

    if (!providerConfig.availability || providerConfig.availability <= 0) {
      return res.status(503).json({
        error: "Provider unavailable",
        providerId,
        retryAfter: 30,
      });
    }

    const reqId = generateReqId();
    const expiresAt = Math.floor(Date.now() / 1000) + QUOTE_TTL_SECONDS;
    const tokenAmount = BigInt(service.price) * 1_000_000n; // 6 decimals (e.g. 4 -> 4,000,000)

    // Store pending quote
    quoteStore.set(reqId, {
      serviceId,
      price: service.price,
      amountUnits: tokenAmount.toString(),
      expiresAt,
      providerId,
    });

    const challenge = {
      scheme: "exact",
      network: "hardhat",
      token: tokenAddress,
      recipient,
      amount: tokenAmount.toString(),
      validBefore: expiresAt,
      reqId,
      providerId,
      serviceId,
      priceUSD: service.price,
    };

    sharedAuditLog.push({
      event: AuditEvent.PAYMENT_REQUIRED,
      reqId,
      providerId,
      serviceId,
      amountUnits: tokenAmount.toString(),
      timestamp: Date.now(),
    });

    return res.status(402).json({
      error: "Payment Required",
      protocol: "x402",
      challenge,
    });
  });

  // ---------------------------------------------------------------------------
  // POST /deliver — Verify x402 Payment, Settle On-Chain, Deliver Resource
  // ---------------------------------------------------------------------------
  router.post("/deliver", async (req, res) => {
    const { serviceId, payload, paymentPayload } = req.body;

    if (!serviceId || !paymentPayload || !paymentPayload.reqId) {
      return res.status(400).json({ error: "serviceId and paymentPayload are required" });
    }

    const { reqId, amount, provider } = paymentPayload;

    const service = services[serviceId];
    if (!service) {
      return res.status(404).json({ error: `Unknown service: ${serviceId}` });
    }

    // 1. Idempotency check (no double-charge on retry)
    if (receiptStore.has(reqId)) {
      const cached = receiptStore.get(reqId);
      sharedAuditLog.push({
        event: AuditEvent.RETRY_DETECTED,
        reqId,
        providerId,
        serviceId,
        timestamp: Date.now(),
        note: "Returning cached receipt — no double charge",
      });
      return res.json({
        idempotent: true,
        message: "Previously delivered — returning cached receipt",
        receipt: cached,
      });
    }

    // 2. Quote freshness and price match check
    const quoteCheck = quoteStore.validate(reqId, serviceId, service.price);
    if (!quoteCheck.valid) {
      return res.status(402).json({
        error: "Quote validation failed",
        detail: quoteCheck.reason,
      });
    }

    // 3. Facilitator verifies payment payload against requirements
    const expectedRequirements = {
      reqId,
      recipient,
      amount: (BigInt(service.price) * 1_000_000n).toString(),
    };

    const verifyResult = await facilitator.verify(paymentPayload, expectedRequirements);
    if (!verifyResult.valid) {
      return res.status(402).json({
        error: "Payment verification failed",
        detail: verifyResult.reason,
      });
    }

    // 4. Generate content
    const content = service.generate(reqId, payload || {});
    const shouldTamper = tamperNext.value;
    if (shouldTamper) {
      tamperNext.value = false;
    }

    let receipt = makeDeliveryReceipt({
      receiptId: "REC-" + uuid(),
      reqId,
      serviceId,
      providerAddress: recipient,
      amountAuthorized: Number(amount) / 1e6,
      timestamp: Math.floor(Date.now() / 1000),
      content,
      txReference: `PENDING-${reqId}`,
    });

    if (shouldTamper) {
      receipt = Object.assign({}, receipt, {
        content: {
          ...content,
          TAMPERED: true,
          corruptedPayload: "Deliberately altered payload to test hash mismatch",
        },
      });
    }

    // 5. Execute on-chain token settlement linking the delivery hash
    const settlementResult = await facilitator.settle(paymentPayload, receipt.contentHash);
    if (!settlementResult.settled) {
      return res.status(402).json({
        error: "On-chain settlement rejected by smart contract",
        detail: settlementResult.error,
      });
    }

    // Update receipt with confirmed settlement tx
    receipt = Object.assign({}, receipt, {
      txReference: settlementResult.txHash,
    });

    // Persist receipt & clean up pending quote
    receiptStore.set(reqId, receipt);
    quoteStore.delete(reqId);

    sharedAuditLog.push({
      event: AuditEvent.DELIVERED,
      reqId,
      providerId,
      serviceId,
      receiptId: receipt.receiptId,
      contentHash: receipt.contentHash,
      txHash: settlementResult.txHash,
      timestamp: Date.now(),
    });

    return res.json({
      idempotent: false,
      message: "Service delivered and payment settled on-chain",
      receipt,
      settlement: settlementResult,
    });
  });

  return router;
}

module.exports = { createTokenProviderRouter };
