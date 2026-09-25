"use strict";

const axios      = require("axios");
const { ethers } = require("ethers");

const { AuditEvent }         = require("../shared/events");
const { computeContentHash } = require("../shared/types");

const AGENT_ABI = [
  "function authorize(bytes32 reqId, uint256 amount) external",
  "function remainingBudget() external view returns (uint256)",
  "function totalSpent() external view returns (uint256)",
  "function maxBudget() external view returns (uint256)",
];

class PaymentClient {
  constructor({ contractAddress, agentSigner, auditLog }) {
    this.contract = new ethers.Contract(contractAddress, AGENT_ABI, agentSigner);
    this.auditLog = auditLog;
    this._deliveryCache = new Map();
  }

  async purchaseService(providerUrl, serviceId) {
    this.auditLog.record(AuditEvent.REQUESTED, "pending", { providerUrl, serviceId });

    let challenge;
    try {
      const resp = await axios.get(`${providerUrl}/service`, {
        params: { serviceId },
        validateStatus: (s) => s === 402 || s === 200,
      });
      if (resp.status !== 402) throw new Error(`Expected 402 Payment Required, got ${resp.status}`);
      challenge = resp.data.challenge;
    } catch (err) {
      this.auditLog.record(AuditEvent.FAILED, "pending", { reason: err.message, step: "GET /service" });
      throw err;
    }

    const { reqId, price, paymentEndpoint } = challenge;
    this.auditLog.record(AuditEvent.PAYMENT_REQUIRED, reqId, { serviceId, price, providerUrl });

    if (this._deliveryCache.has(reqId)) {
      this.auditLog.record(AuditEvent.RETRY_DETECTED, reqId, { note: "Already in local cache" });
      return this._deliveryCache.get(reqId);
    }

    let txHash;
    try {
      const tx      = await this.contract.authorize(reqId, BigInt(price));
      const receipt = await tx.wait();
      txHash = receipt.hash;
      this.auditLog.record(AuditEvent.PAYMENT_AUTHORIZED, reqId, { amount: price, txHash });
    } catch (err) {
      const reason = err.reason || err.message || "";
      let event = AuditEvent.FAILED;
      if (reason.includes("spending cap exceeded"))  event = AuditEvent.OVERSPEND_REJECTED;
      else if (reason.includes("already used"))      event = AuditEvent.RETRY_DETECTED;

      this.auditLog.record(event, reqId, { reason });
      if (reason.includes("already used")) return await this._retryDeliver(paymentEndpoint, reqId, serviceId, price);
      throw Object.assign(err, { reqId, event });
    }

    this.auditLog.record(AuditEvent.PAYMENT_COMPLETED, reqId, { txHash, serviceId, amount: price });
    const deliveryResult = await this._deliver(paymentEndpoint, reqId, serviceId, price);

    const { receipt } = deliveryResult;
    const recomputedHash = computeContentHash(receipt.content);
    if (recomputedHash !== receipt.contentHash) {
      this.auditLog.record(AuditEvent.FAILED, reqId, {
        reason:   "Content hash mismatch",
        expected: receipt.contentHash,
        got:      recomputedHash,
      });
      throw new Error(`Content hash mismatch for ${reqId}. Expected ${receipt.contentHash}, got ${recomputedHash}`);
    }

    this.auditLog.record(AuditEvent.VERIFIED, reqId, { contentHash: receipt.contentHash, receiptId: receipt.receiptId });

    const result = { reqId, receipt, contentHash: receipt.contentHash, txHash };
    this._deliveryCache.set(reqId, result);
    return result;
  }

  async getBudgetState() {
    const [maxBudget, totalSpent, remaining] = await Promise.all([
      this.contract.maxBudget(),
      this.contract.totalSpent(),
      this.contract.remainingBudget(),
    ]);
    return { maxBudget, totalSpent, remaining };
  }

  async _deliver(endpoint, reqId, serviceId, amount) {
    try {
      const resp = await axios.post(endpoint, { reqId, serviceId, amount });
      this.auditLog.record(AuditEvent.DELIVERED, reqId, {
        receiptId:   resp.data.receipt?.receiptId,
        contentHash: resp.data.receipt?.contentHash,
        idempotent:  resp.data.idempotent,
      });
      return resp.data;
    } catch (err) {
      const detail = err.response?.data || err.message;
      this.auditLog.record(AuditEvent.FAILED, reqId, { reason: "POST /deliver failed", detail });
      throw Object.assign(new Error(`Delivery failed: ${JSON.stringify(detail)}`), { reqId });
    }
  }

  async _retryDeliver(endpoint, reqId, serviceId, amount) {
    this.auditLog.record(AuditEvent.RETRY_DETECTED, reqId, { note: "Contract rejected replay — fetching cached receipt" });
    try {
      const resp      = await axios.post(endpoint, { reqId, serviceId, amount });
      const { receipt } = resp.data;
      if (receipt) {
        this.auditLog.record(AuditEvent.DELIVERED, reqId, { receiptId: receipt.receiptId, idempotent: true });
        const result = { reqId, receipt, contentHash: receipt.contentHash, txHash: null, idempotent: true };
        this._deliveryCache.set(reqId, result);
        return result;
      }
    } catch (_) {}
    throw new Error(`Replay detected for ${reqId} but no cached receipt found`);
  }
}

module.exports = { PaymentClient };
