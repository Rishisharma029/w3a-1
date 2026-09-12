/**
 * agent/token-payment-client.js
 *
 * x402 Token Payment Client for Autonomous Agent
 * ==============================================
 * Handles signing portable EIP-712 payment authorizations for real ERC-20
 * settlement on TokenBudgetEnforcer.
 *
 * Security boundary:
 *   The agent can sign authorizations up to whatever it wants, BUT the
 *   TokenBudgetEnforcer smart contract physically rejects any settlement
 *   that exceeds the authorized spending cap or violates replay rules.
 */

"use strict";

const axios = require("axios");
const { ethers } = require("ethers");
const { computeContentHash } = require("../shared/types");
const { EIP712_DOMAIN_NAME, EIP712_DOMAIN_VERSION, EIP712_TYPES } = require("../facilitator/facilitator");

class TokenPaymentClient {
  /**
   * @param {object} opts
   * @param {ethers.Signer} opts.agentSigner
   * @param {string} opts.enforcerAddress
   * @param {number} [opts.chainId=31337]
   * @param {object} [opts.auditLog]
   */
  constructor({ agentSigner, enforcerAddress, chainId = 31337, auditLog = null }) {
    this.agentSigner = agentSigner;
    this.enforcerAddress = enforcerAddress;
    this.chainId = chainId;
    this.auditLog = auditLog;
  }

  /**
   * Return EIP-712 domain.
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
   * Sign an EIP-712 PaymentAuthorization for a 402 challenge.
   *
   * @param {object} challenge
   * @param {string} challenge.reqId
   * @param {string} challenge.recipient
   * @param {number|string|bigint} challenge.amount
   * @param {number} challenge.validBefore
   * @returns {Promise<string>} signature
   */
  async signAuthorization(challenge) {
    const domain = this.getDomain();
    const value = {
      reqId: challenge.reqId,
      provider: challenge.recipient,
      amount: BigInt(challenge.amount),
      validBefore: BigInt(challenge.validBefore),
    };

    const signature = await this.agentSigner.signTypedData(domain, EIP712_TYPES, value);
    return signature;
  }

  /**
   * Execute an x402 service purchase with real token settlement.
   *
   * @param {string} serviceUrl - GET /service endpoint
   * @param {string} deliverUrl - POST /deliver endpoint
   * @param {string} serviceId
   * @param {object} [payload={}]
   * @returns {Promise<object>} Purchase result with receipt, txHash, contentHash
   */
  async purchaseService(serviceUrl, deliverUrl, serviceId, payload = {}) {
    // Step 1: GET /service -> Expect 402 Payment Required
    const resp402 = await axios.get(serviceUrl, {
      params: { serviceId, ...payload },
      validateStatus: (s) => s === 402,
    });

    if (resp402.status !== 402) {
      throw new Error(`Expected HTTP 402 Payment Required, got ${resp402.status}`);
    }

    const challenge = resp402.data.challenge;
    if (!challenge || !challenge.reqId || !challenge.amount) {
      throw new Error("Invalid 402 response: missing required challenge parameters");
    }

    // Step 2: Sign EIP-712 Payment Authorization
    const signature = await this.signAuthorization(challenge);

    const paymentPayload = {
      reqId: challenge.reqId,
      provider: challenge.recipient,
      amount: challenge.amount,
      validBefore: challenge.validBefore,
      signature,
    };

    // Step 3: POST /deliver with x402 payment payload
    const deliverResp = await axios.post(
      deliverUrl,
      {
        serviceId,
        payload,
        paymentPayload,
      },
      { validateStatus: () => true }
    );

    if (deliverResp.status !== 200) {
      const errDetail = deliverResp.data.detail || deliverResp.data.error || "Delivery failed";
      throw new Error(`Payment/Delivery rejected (${deliverResp.status}): ${errDetail}`);
    }

    const { receipt, settlement } = deliverResp.data;
    if (!receipt || !receipt.content) {
      throw new Error("Provider response missing valid delivery receipt");
    }

    // Step 4: Verify Content Hash
    const recomputedHash = computeContentHash(receipt.content);
    const hashVerified = recomputedHash === receipt.contentHash;

    return {
      reqId: challenge.reqId,
      receipt,
      settlement,
      contentHash: receipt.contentHash,
      hashVerified,
      idempotent: deliverResp.data.idempotent || false,
    };
  }
}

module.exports = { TokenPaymentClient };
