"use strict";

const axios      = require("axios");
const { ethers } = require("ethers");

const { parseIntent }                    = require("./llm-client");
const { discoverAndSelect, pickService } = require("./provider-selector");
const { computeContentHash }             = require("../shared/types");
const { AuditEvent }                     = require("../shared/events");
const { PurchaseRecord }                 = require("./purchase-record");

const AGENT_ABI = [
  "function authorize(bytes32 reqId, uint256 amount) external",
  "function remainingBudget() external view returns (uint256)",
  "function totalSpent() external view returns (uint256)",
  "function maxBudget() external view returns (uint256)",
];

class PurchaseFlow {
  constructor({ marketplaceBaseUrl, agentSigner, contractAddress, auditLog, maxFallbacks = 2 }) {
    this.marketplaceBaseUrl = marketplaceBaseUrl;
    this.agentSigner        = agentSigner;
    this.auditLog           = auditLog;
    this.maxFallbacks       = maxFallbacks;
    this.contract = new ethers.Contract(contractAddress, AGENT_ABI, agentSigner);
  }

  async run(userRequest) {
    const record = new PurchaseRecord(userRequest);
    const excludedProviders = [];

    try {
      this._log(AuditEvent.REQUESTED, "pending", { userRequest });
      const intent = await parseIntent(userRequest);
      record.setIntent(intent);
      this._log("INTENT_PARSED", "pending", { intent });

      for (let attempt = 0; attempt <= this.maxFallbacks; attempt++) {
        if (attempt > 0) this._log("FALLBACK_ATTEMPT", record.reqId || "pending", { attempt });

        const result = await this._tryOnce(record, intent, excludedProviders);
        if (result.success) { record.setComplete(); return record; }
        if (result.terminal) return record;

        if (record.selectedProviderId) {
          excludedProviders.push(record.selectedProviderId);
          record.setFallback(record.selectedProviderId, "next");
        }
      }

      record.setFailed("Exhausted all provider fallbacks");
    } catch (err) {
      record.setFailed(err.message);
      this._log(AuditEvent.FAILED, record.reqId || "pending", { error: err.message });
    }

    return record;
  }

  async _tryOnce(record, intent, excludedProviders) {
    let discovery;
    try {
      discovery = await discoverAndSelect(this.marketplaceBaseUrl, intent, excludedProviders);
    } catch (err) {
      record.setFailed(`Discovery/selection failed: ${err.message}`);
      this._log(AuditEvent.FAILED, "pending", { step: "DISCOVERY", error: err.message });
      return { success: false, terminal: true };
    }

    const { selectedProvider, selectionReason, ranking, filteredOut, allCandidates } = discovery;
    record.setDiscovery({ providers: allCandidates, filteredOut });

    const chosenService = pickService(selectedProvider, intent.serviceType);
    if (!chosenService) {
      record.setFailed(`Provider ${selectedProvider.providerId} has no matching service`);
      return { success: false, terminal: true };
    }

    record.setSelection({
      providerId: selectedProvider.providerId,
      serviceId:  chosenService.serviceId,
      reason:     selectionReason,
      ranking,
    });

    const serviceUrl = `${this.marketplaceBaseUrl}/providers/${selectedProvider.providerId}/service`;
    let challenge;

    try {
      const serviceResp = await axios.get(serviceUrl, {
        params: { serviceId: chosenService.serviceId, ...(intent.payload || {}) },
        validateStatus: (s) => s === 402 || s === 200 || s === 503,
      });

      if (serviceResp.status === 503) {
        this._log(AuditEvent.FAILED, "pending", { step: "GET /service", reason: "Provider 503", providerId: selectedProvider.providerId });
        return { success: false, terminal: false };
      }

      if (serviceResp.status !== 402) throw new Error(`Expected 402, got ${serviceResp.status}`);

      challenge = serviceResp.data.challenge;
      if (!challenge || !challenge.reqId || challenge.price === undefined) {
        throw new Error("Invalid 402 challenge: missing required fields");
      }
    } catch (err) {
      if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") return { success: false, terminal: false };
      record.setFailed(`Service request failed: ${err.message}`);
      return { success: false, terminal: true };
    }

    const { reqId, price, paymentEndpoint } = challenge;
    record.setPaymentRequired(reqId, price);
    this._log(AuditEvent.PAYMENT_REQUIRED, reqId, { providerId: selectedProvider.providerId, price });

    let txHash;
    try {
      const tx      = await this.contract.authorize(reqId, BigInt(price));
      const receipt = await tx.wait();
      txHash = receipt.hash;
      record.setAuthorized(price, txHash);
      this._log(AuditEvent.PAYMENT_AUTHORIZED, reqId, { amount: price, txHash });
    } catch (err) {
      const reason = err.reason || err.message || "";
      if (reason.includes("spending cap exceeded")) {
        record.setRejected(`Spending cap exceeded: tried to spend ${price} units`);
        this._log(AuditEvent.OVERSPEND_REJECTED, reqId, { reason });
        return { success: false, terminal: true };
      }
      if (reason.includes("already used")) {
        record.setRetried();
        this._log(AuditEvent.RETRY_DETECTED, reqId, { reason });
        return await this._doDeliver(record, paymentEndpoint, reqId, chosenService.serviceId, price);
      }
      record.setFailed(`Authorization failed: ${reason}`);
      return { success: false, terminal: true };
    }

    return await this._doDeliver(record, paymentEndpoint, reqId, chosenService.serviceId, price, intent.payload);
  }

  async _doDeliver(record, endpoint, reqId, serviceId, amount, payload = null) {
    this._log(AuditEvent.PAYMENT_COMPLETED, reqId, { serviceId, amount });

    let deliveryResp;
    try {
      const resp = await axios.post(endpoint, { reqId, serviceId, amount, payload });
      deliveryResp = resp.data;
    } catch (err) {
      const detail = err.response?.data || err.message;
      record.setFailed(`Delivery failed: ${JSON.stringify(detail)}`);
      this._log(AuditEvent.FAILED, reqId, { step: "POST /deliver", detail });
      return { success: false, terminal: true };
    }

    const { receipt } = deliveryResp;
    if (!receipt) {
      record.setFailed("Provider returned no receipt");
      return { success: false, terminal: true };
    }

    record.setDelivered(receipt);
    this._log(AuditEvent.DELIVERED, reqId, {
      receiptId:   receipt.receiptId,
      contentHash: receipt.contentHash,
      idempotent:  deliveryResp.idempotent,
    });

    const recomputed  = computeContentHash(receipt.content);
    const hashMatches = recomputed === receipt.contentHash;
    record.setVerified(hashMatches, hashMatches ? null : `Expected ${receipt.contentHash}, got ${recomputed}`);

    if (!hashMatches) {
      this._log(AuditEvent.FAILED, reqId, { step: "HASH_VERIFICATION", expected: receipt.contentHash, got: recomputed });
      record.setFailed("Delivery content hash mismatch — possible tampering");
      return { success: false, terminal: true };
    }

    this._log(AuditEvent.VERIFIED, reqId, { contentHash: receipt.contentHash });
    return { success: true };
  }

  _log(event, reqId, extra = {}) {
    if (this.auditLog) this.auditLog.record(event, reqId, extra);
  }

  async getBudgetState() {
    const [maxBudget, totalSpent, remaining] = await Promise.all([
      this.contract.maxBudget(),
      this.contract.totalSpent(),
      this.contract.remainingBudget(),
    ]);
    return { maxBudget, totalSpent, remaining };
  }
}

module.exports = { PurchaseFlow };
