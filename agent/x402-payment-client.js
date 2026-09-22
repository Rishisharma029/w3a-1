/**
 * agent/x402-payment-client.js
 *
 * Official x402 V2 Payment Client for Autonomous Agent
 * =====================================================
 * Implements genuine x402 V2 wire protocol flow on the client side:
 *
 *   1. requestChallenge():
 *      GET protected resource -> receives HTTP 402 + PAYMENT-REQUIRED header
 *      Decodes and validates PaymentRequiredV2 with @x402/core
 *
 *   2. createPaymentPayload():
 *      Signs EIP-712 PaymentAuthorization bound to requirement
 *      Constructs official PaymentPayloadV2 structure
 *      Validates PaymentPayloadV2 with @x402/core
 *
 *   3. submitPayment():
 *      Encodes PAYMENT-SIGNATURE header via @x402/core
 *      Retries request with payment header
 *      Receives HTTP 200 + PAYMENT-RESPONSE header
 *      Verifies delivery content hash independently
 *
 * Security boundary:
 *   The agent can craft or sign any payload, but the on-chain TokenBudgetEnforcer
 *   physically prevents overspend, replay, or unpermitted token transfers.
 */

"use strict";

const axios = require("axios");
const { ethers } = require("ethers");
const {
  decodePaymentRequiredHeader,
  encodePaymentSignatureHeader,
  decodePaymentResponseHeader,
} = require("@x402/core/http");
const { validatePaymentRequired, validatePaymentPayload } = require("@x402/core/schemas");
const { computeContentHash } = require("../shared/types");
const { EIP712_DOMAIN_NAME, EIP712_DOMAIN_VERSION, EIP712_TYPES } = require("../facilitator/facilitator");

class X402PaymentClient {
  /**
   * @param {object} opts
   * @param {ethers.Signer} opts.agentSigner      - Agent wallet with private key
   * @param {string} opts.enforcerAddress        - TokenBudgetEnforcer contract address
   * @param {number} [opts.chainId=31337]        - EVM chain ID
   * @param {object} [opts.auditLog]             - Optional client-side audit log
   */
  constructor({ agentSigner, enforcerAddress, chainId = 31337, auditLog = null }) {
    this.agentSigner = agentSigner;
    this.enforcerAddress = enforcerAddress;
    this.chainId = chainId;
    this.auditLog = auditLog;
  }

  /**
   * Return EIP-712 domain for TokenBudgetEnforcer.
   */
  getDomain() {
    return {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId: this.chainId,
      verifyingContract: this.enforcerAddress,
    };
  }

  /**
   * Step 1: Request protected resource and parse official x402 V2 challenge.
   *
   * @param {string} serviceUrl - Resource endpoint URL
   * @param {object} [params={}] - Query parameters (e.g. serviceId)
   * @returns {Promise<{ paymentRequired: object, requirement: object, rawHeader: string }>}
   */
  async requestChallenge(serviceUrl, params = {}) {
    const resp = await axios.get(serviceUrl, {
      params,
      validateStatus: (s) => s === 402,
    });

    if (resp.status !== 402) {
      throw new Error(`Expected HTTP 402 Payment Required, got ${resp.status}`);
    }

    const rawHeader = resp.headers["payment-required"] || resp.headers["PAYMENT-REQUIRED"];
    if (!rawHeader) {
      throw new Error("Missing PAYMENT-REQUIRED header in 402 response");
    }

    // Decode and validate with official @x402/core
    const decoded = decodePaymentRequiredHeader(rawHeader);
    const paymentRequired = validatePaymentRequired(decoded);

    if (!paymentRequired.accepts || paymentRequired.accepts.length === 0) {
      throw new Error("PaymentRequired object contains no accepted payment options");
    }

    return {
      paymentRequired,
      requirement: paymentRequired.accepts[0],
      rawHeader,
    };
  }

  /**
   * Step 2: Construct and cryptographically sign an official x402 V2 PaymentPayload.
   *
   * @param {object} paymentRequired - Official PaymentRequired object
   * @param {number} [requirementIndex=0] - Index of requirement to fulfill
   * @param {object} [overrides={}] - Optional overrides for testing tamper scenarios
   * @returns {Promise<object>} Official PaymentPayload object
   */
  async createPaymentPayload(paymentRequired, requirementIndex = 0, overrides = {}) {
    const acceptedReq = paymentRequired.accepts[requirementIndex];
    if (!acceptedReq) {
      throw new Error(`Requirement index ${requirementIndex} out of range`);
    }

    const reqId = overrides.reqId || (acceptedReq.extra && acceptedReq.extra.reqId);
    if (!reqId) {
      throw new Error("Missing reqId in payment requirement extra data");
    }

    const providerAddress = overrides.provider || acceptedReq.payTo;
    const amount = overrides.amount || acceptedReq.amount;
    const nowSec = Math.floor(Date.now() / 1000);
    const validBefore = overrides.validBefore || (nowSec + (acceptedReq.maxTimeoutSeconds || 3600));

    // Sign EIP-712 PaymentAuthorization
    const domain = this.getDomain();
    const value = {
      reqId,
      provider: providerAddress,
      amount: BigInt(amount),
      validBefore: BigInt(validBefore),
    };

    let signature = overrides.signature;
    if (!signature) {
      signature = await this.agentSigner.signTypedData(domain, EIP712_TYPES, value);
    }

    const agentAddress = await this.agentSigner.getAddress();

    const paymentPayload = {
      x402Version: 2,
      resource: paymentRequired.resource,
      accepted: Object.assign({}, acceptedReq, overrides.accepted || {}),
      payload: Object.assign(
        {
          reqId,
          provider: providerAddress,
          amount: amount.toString(),
          validBefore,
          signature,
          payer: agentAddress,
        },
        overrides.payload || {}
      ),
      extensions: overrides.extensions || null,
    };

    // Validate structure with official @x402/core schema unless deliberate test tampering
    if (!overrides.skipValidation) {
      validatePaymentPayload(paymentPayload);
    }

    return paymentPayload;
  }

  /**
   * Step 3: Submit payment via official PAYMENT-SIGNATURE header and verify delivery.
   *
   * @param {string} serviceUrl - Resource endpoint URL
   * @param {object} paymentPayload - Official PaymentPayload object
   * @param {object} [options={}] - Request options
   * @returns {Promise<object>} Purchase result with receipt, settlement, and hash verification
   */
  async submitPayment(serviceUrl, paymentPayload, options = {}) {
    const encodedSigHeader = encodePaymentSignatureHeader(paymentPayload);

    const headers = Object.assign(
      {
        "PAYMENT-SIGNATURE": encodedSigHeader,
      },
      options.headers || {}
    );

    const resp = await axios.get(serviceUrl, {
      params: options.params || {},
      headers,
      validateStatus: () => true,
    });

    if (resp.status !== 200) {
      const errDetail = resp.data.detail || resp.data.error || "Payment rejected";
      throw new Error(`Payment/Delivery failed (${resp.status}): ${errDetail}`);
    }

    // Decode official PAYMENT-RESPONSE header
    const rawResponseHeader = resp.headers["payment-response"] || resp.headers["PAYMENT-RESPONSE"];
    let settlementResponse = null;
    if (rawResponseHeader) {
      try {
        settlementResponse = decodePaymentResponseHeader(rawResponseHeader);
      } catch (_) {}
    }

    const { receipt, settlement } = resp.data;
    if (!receipt || !receipt.content) {
      throw new Error("Provider response missing valid delivery receipt");
    }

    // Verify content hash independently on client side
    const recomputedHash = computeContentHash(receipt.content);
    const hashVerified = recomputedHash === receipt.contentHash;

    return {
      status: resp.status,
      data: resp.data,
      receipt,
      settlement: settlement || settlementResponse,
      settlementResponse,
      reqId: paymentPayload.payload.reqId,
      contentHash: receipt.contentHash,
      hashVerified,
      idempotent: resp.data.idempotent || false,
    };
  }

  /**
   * Execute full canonical x402 V2 service purchase end-to-end.
   *
   * @param {string} serviceUrl - Protected resource URL
   * @param {object} [params={}] - Query parameters
   * @returns {Promise<object>}
   */
  async purchaseService(serviceUrl, params = {}) {
    // 1. GET -> 402 challenge
    const { paymentRequired } = await this.requestChallenge(serviceUrl, params);

    // 2. Sign EIP-712 & build official PaymentPayload
    const paymentPayload = await this.createPaymentPayload(paymentRequired, 0);

    // 3. Retry with PAYMENT-SIGNATURE header -> 200 OK
    const result = await this.submitPayment(serviceUrl, paymentPayload, { params });

    return result;
  }
}

module.exports = { X402PaymentClient };
