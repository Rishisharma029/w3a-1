/**
 * marketplace/x402-provider-router.js
 *
 * Official x402 V2 Provider Router for W3A-1
 * ============================================
 * Implements genuine x402 V2 HTTP protocol flow on top of W3A-1 security architecture:
 *
 *   1. Client GET /x402/providers/:providerId/service
 *      -> 402 Payment Required
 *      -> PAYMENT-REQUIRED: <base64 encoded PaymentRequiredV2>
 *
 *   2. Client signs EIP-712 payment authorization & retries
 *      -> GET /x402/providers/:providerId/service
 *      -> PAYMENT-SIGNATURE: <base64 encoded PaymentPayloadV2>
 *
 *   3. Server decodes & validates PaymentPayloadV2 with @x402/core
 *      -> Checks resource & requirement binding
 *      -> Facilitator.verifyX402() (off-chain EIP-712 + on-chain budget/freeze checks)
 *      -> Generates resource content
 *      -> Facilitator.settleX402() -> executes TokenBudgetEnforcer.settleWithSignature()
 *      -> PAYMENT-RESPONSE: <base64 encoded SettlementResponse>
 *      -> HTTP 200 with resource body & delivery proof
 *
 * Security Rule #1:
 *   TokenBudgetEnforcer smart contract remains the final on-chain authority.
 *   x402 standardizes payment negotiation; the EVM contract enforces the spending cap.
 */

"use strict";

const express = require("express");
const { v4: uuid } = require("uuid");
const {
  encodePaymentRequiredHeader,
  decodePaymentSignatureHeader,
  encodePaymentResponseHeader,
} = require("@x402/core/http");
const { validatePaymentPayload, validatePaymentRequired } = require("@x402/core/schemas");
const { makeDeliveryReceipt, computeContentHash } = require("../shared/types");
const { AuditEvent } = require("../shared/events");
const { globalEventBus } = require("../shared/event-bus");

const QUOTE_TTL_SECONDS = 3600; // 1 hour

function generateReqId() {
  const raw = uuid().replace(/-/g, "");
  return "0x" + raw.padEnd(64, "0");
}

function createX402ProviderRouter({
  providerConfig,
  facilitator,
  receiptStore,
  quoteStore,
  providerWalletAddress,
  tokenAddress,
  chainId = 31337,
  sharedAuditLog = [],
  tamperNext = { value: false },
}) {
  const router = express.Router();
  const { providerId, services } = providerConfig;
  const recipient = providerWalletAddress || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  const network = `eip155:${chainId}`;

  // ---------------------------------------------------------------------------
  // GET /service — Canonical x402 V2 Wire Endpoint
  // Handles both initial 402 challenge AND payment submission via PAYMENT-SIGNATURE
  // ---------------------------------------------------------------------------
  const handleServiceRequest = async (req, res) => {
    let serviceId = req.query.serviceId;
    if (!serviceId || !services[serviceId]) {
      const matched = Object.keys(services).find(
        (k) => k === serviceId || (serviceId && (k.includes(serviceId) || serviceId.includes(k)))
      );
      serviceId = matched || Object.keys(services)[0];
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

    const paymentSignatureHeader = req.headers["payment-signature"];

    // -------------------------------------------------------------------------
    // BRANCH A: NO PAYMENT PROVIDED -> Return HTTP 402 with PAYMENT-REQUIRED header
    // -------------------------------------------------------------------------
    if (!paymentSignatureHeader) {
      const reqId = generateReqId();
      const expiresAt = Math.floor(Date.now() / 1000) + QUOTE_TTL_SECONDS;
      const tokenAmount = BigInt(service.price) * 1_000_000n; // 6 decimals atomic units

      // Store pending quote in provider quoteStore
      quoteStore.set(reqId, {
        serviceId,
        price: service.price,
        amountUnits: tokenAmount.toString(),
        expiresAt,
        providerId,
      });

      // Construct official x402 V2 PaymentRequired object
      const paymentRequired = {
        x402Version: 2,
        resource: {
          url: req.originalUrl || `/x402/providers/${providerId}/service`,
          description: service.description || `${providerId} - ${serviceId}`,
          mimeType: "application/json",
          serviceName: providerId,
        },
        accepts: [
          {
            scheme: "exact",
            network,
            amount: tokenAmount.toString(),
            asset: tokenAddress,
            payTo: recipient,
            maxTimeoutSeconds: QUOTE_TTL_SECONDS,
            extra: {
              reqId,
              serviceId,
              providerId,
              priceUSD: service.price,
            },
          },
        ],
        extensions: null,
      };

      // Validate against official x402 schema before encoding
      validatePaymentRequired(paymentRequired);

      // Encode header using official @x402/core encoder
      const encodedHeader = encodePaymentRequiredHeader(paymentRequired);

      res.setHeader("PAYMENT-REQUIRED", encodedHeader);
      res.setHeader("Access-Control-Expose-Headers", "PAYMENT-REQUIRED, PAYMENT-RESPONSE");

      sharedAuditLog.push({
        event: AuditEvent.PAYMENT_REQUIRED,
        reqId,
        providerId,
        serviceId,
        amountUnits: tokenAmount.toString(),
        protocol: "x402-v2",
        timestamp: Date.now(),
      });

      globalEventBus.emitEvent(AuditEvent.PAYMENT_REQUIRED, {
        reqId,
        providerId,
        serviceId,
        amountAtomic: tokenAmount.toString(),
        amountUSD: (Number(tokenAmount) / 1e6).toFixed(2),
        resourceName: service.description || serviceId,
        scheme: "exact",
        network,
        payTo: recipient,
        asset: tokenAddress,
        rawHeader: encodedHeader,
        paymentRequired,
      });

      return res.status(402).json({
        error: "Payment Required",
        x402Version: 2,
        paymentRequired,
      });
    }

    // -------------------------------------------------------------------------
    // BRANCH B: PAYMENT PROVIDED via PAYMENT-SIGNATURE header
    // -------------------------------------------------------------------------
    let paymentPayload;
    try {
      // Decode using official @x402/core decoder
      paymentPayload = decodePaymentSignatureHeader(paymentSignatureHeader);
    } catch (err) {
      return res.status(400).json({
        error: "Malformed PAYMENT-SIGNATURE header",
        detail: err.message,
      });
    }

    // Validate structure with official @x402/core Zod schema
    try {
      paymentPayload = validatePaymentPayload(paymentPayload);
    } catch (err) {
      return res.status(400).json({
        error: "Invalid PaymentPayload structure",
        detail: err.message || err,
      });
    }

    const { accepted, payload: innerPayload, resource } = paymentPayload;

    // 1. Validate resource binding if specified
    if (resource && resource.url && !req.originalUrl.includes(resource.url) && !resource.url.includes(req.path)) {
      return res.status(400).json({
        error: "Resource binding mismatch",
        detail: `Payload resource URL '${resource.url}' does not match requested path '${req.originalUrl}'`,
      });
    }

    // 2. Validate accepted requirements match provider configuration
    const expectedAmount = (BigInt(service.price) * 1_000_000n).toString();
    const expectedRequirements = {
      scheme: "exact",
      network,
      amount: expectedAmount,
      asset: tokenAddress,
      payTo: recipient,
      extra: accepted.extra,
    };

    if (accepted.scheme !== "exact") {
      return res.status(400).json({
        error: "Unsupported scheme",
        detail: `Expected 'exact', got '${accepted.scheme}'`,
      });
    }

    if (accepted.network !== network) {
      return res.status(400).json({
        error: "Network mismatch",
        detail: `Expected '${network}', got '${accepted.network}'`,
      });
    }

    if (accepted.asset.toLowerCase() !== tokenAddress.toLowerCase()) {
      return res.status(400).json({
        error: "Asset mismatch",
        detail: `Expected asset '${tokenAddress}', got '${accepted.asset}'`,
      });
    }

    if (accepted.payTo.toLowerCase() !== recipient.toLowerCase()) {
      return res.status(400).json({
        error: "Recipient mismatch",
        detail: `Expected payTo '${recipient}', got '${accepted.payTo}'`,
      });
    }

    if (BigInt(accepted.amount) !== BigInt(expectedAmount)) {
      return res.status(400).json({
        error: "Amount mismatch",
        detail: `Expected amount '${expectedAmount}', got '${accepted.amount}'`,
      });
    }

    const reqId = innerPayload.reqId;
    if (!reqId) {
      return res.status(400).json({ error: "Missing reqId in inner payment payload" });
    }

    // 3. Idempotency check: if already settled, return cached receipt with zero duplicate charge
    if (receiptStore.has(reqId)) {
      const cached = receiptStore.get(reqId);
      sharedAuditLog.push({
        event: AuditEvent.RETRY_DETECTED,
        reqId,
        providerId,
        serviceId,
        timestamp: Date.now(),
        protocol: "x402-v2",
        note: "Returning cached receipt — no double charge",
      });

      globalEventBus.emitEvent(AuditEvent.RETRY_DETECTED, {
        reqId,
        providerId,
        serviceId,
        amountAtomic: accepted.amount,
      });

      const cachedSettlementResponse = {
        success: true,
        transaction: cached.txReference,
        network,
        payer: innerPayload.payer || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        extra: {
          reqId,
          deliveryHash: cached.contentHash,
          amount: accepted.amount,
        },
      };

      res.setHeader("PAYMENT-RESPONSE", encodePaymentResponseHeader(cachedSettlementResponse));
      return res.json({
        idempotent: true,
        message: "Previously delivered — returning cached receipt",
        receipt: cached,
        settlement: cachedSettlementResponse,
      });
    }

    // 4. Quote freshness check
    const quoteCheck = quoteStore.validate(reqId, serviceId, service.price);
    if (!quoteCheck.valid) {
      return res.status(402).json({
        error: "Quote validation failed",
        detail: quoteCheck.reason,
      });
    }

    // 5. Facilitator read-only verification (EIP-712 sig + on-chain budget/freeze/replay checks)
    const verifyResult = await facilitator.verifyX402(paymentPayload, expectedRequirements);
    if (!verifyResult.valid) {
      return res.status(402).json({
        error: "Payment verification failed",
        detail: verifyResult.reason,
      });
    }

    globalEventBus.emitEvent(AuditEvent.PAYMENT_VERIFIED, {
      reqId,
      providerId,
      serviceId,
      amountAtomic: accepted.amount,
      payer: innerPayload.payer,
    });

    // 6. Generate resource content
    const requestPayload = Object.assign({}, req.query, req.body);
    const content = service.generate(reqId, requestPayload);
    const shouldTamper = tamperNext.value;
    if (shouldTamper) {
      tamperNext.value = false;
    }

    let receipt = makeDeliveryReceipt({
      receiptId: "REC-X402-" + uuid(),
      reqId,
      serviceId,
      providerAddress: recipient,
      amountAuthorized: Number(accepted.amount) / 1e6,
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

    globalEventBus.emitEvent(AuditEvent.SETTLEMENT_SUBMITTED, {
      reqId,
      providerId,
      serviceId,
      amountAtomic: accepted.amount,
      deliveryHash: receipt.contentHash,
    });

    // 7. On-chain token settlement linking the delivery hash
    const settleResult = await facilitator.settleX402(paymentPayload, receipt.contentHash);
    if (!settleResult.settled) {
      return res.status(402).json({
        error: "On-chain settlement rejected by smart contract",
        detail: settleResult.error,
      });
    }

    // Update receipt with confirmed settlement tx
    receipt = Object.assign({}, receipt, {
      txReference: settleResult.txHash,
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
      txHash: settleResult.txHash,
      protocol: "x402-v2",
      timestamp: Date.now(),
    });

    globalEventBus.emitEvent(AuditEvent.SETTLEMENT_CONFIRMED, {
      reqId,
      providerId,
      serviceId,
      amountAtomic: accepted.amount,
      txHash: settleResult.txHash,
      deliveryHash: receipt.contentHash,
    });

    globalEventBus.emitEvent(AuditEvent.DELIVERY_RECEIVED, {
      reqId,
      providerId,
      serviceId,
      receiptId: receipt.receiptId,
      deliveryHash: receipt.contentHash,
    });

    // Encode official PAYMENT-RESPONSE header
    const encodedResponseHeader = encodePaymentResponseHeader(settleResult.settlementResponse);
    res.setHeader("PAYMENT-RESPONSE", encodedResponseHeader);

    return res.json({
      status: "DELIVERED",
      idempotent: false,
      message: "Resource delivered and payment settled on-chain via x402 V2",
      receipt,
      settlement: settleResult.settlementResponse,
    });
  };

  // Support both GET and POST for the x402 protected resource
  router.get("/service", handleServiceRequest);
  router.post("/service", handleServiceRequest);

  return router;
}

module.exports = { createX402ProviderRouter };
