/**
 * agent/purchase-flow.js
 *
 * Explicit state machine for the Phase 2 purchase flow.
 *
 * States (in happy-path order):
 *   IDLE → DISCOVERING → SELECTING → REQUESTING_SERVICE
 *   → PAYMENT_REQUIRED → AUTHORIZING → DELIVERING
 *   → VERIFYING_HASH → COMPLETE
 *   (FALLBACK, RETRY, REJECTED, FAILED are error transitions)
 *
 * Security invariant:
 *   The only call that commits spending is:
 *     await contract.authorize(reqId, BigInt(price))
 *   That call is made in the AUTHORIZING state and goes directly to
 *   the BudgetEnforcer contract.  The LLM never reaches this call.
 *   If the contract reverts, the machine transitions to REJECTED or
 *   FALLBACK without spending anything.
 *
 * @param {object} opts
 * @param {string}         opts.marketplaceBaseUrl
 * @param {ethers.Signer}  opts.agentSigner
 * @param {string}         opts.contractAddress
 * @param {AuditLog}       opts.auditLog
 * @param {number}         [opts.maxFallbacks=2]  - Max providers to try
 */

"use strict";

const axios     = require("axios");
const { ethers } = require("ethers");

const { parseIntent }              = require("./llm-client");
const { discoverAndSelect, pickService } = require("./provider-selector");
const { computeContentHash }       = require("../shared/types");
const { AuditEvent }               = require("../shared/events");
const { PurchaseRecord }           = require("./purchase-record");

// Contract ABI (only what the agent needs)
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

  // ── Public entry point ───────────────────────────────────────────────────

  /**
   * Execute a complete purchase flow for a natural-language user request.
   * Returns a PurchaseRecord with finalState="COMPLETE" on success.
   * Returns a PurchaseRecord with finalState="REJECTED"|"FAILED" on failure.
   *
   * Never throws — all errors are captured in the PurchaseRecord.
   *
   * @param {string} userRequest
   * @returns {Promise<PurchaseRecord>}
   */
  async run(userRequest) {
    const record = new PurchaseRecord(userRequest);
    const excludedProviders = [];

    try {
      // ── 1. Parse intent ────────────────────────────────────────────────
      this._log(AuditEvent.REQUESTED, "pending", { userRequest });
      const intent = await parseIntent(userRequest);
      record.setIntent(intent);
      this._log("INTENT_PARSED", "pending", { intent });

      // Try up to maxFallbacks + 1 providers
      for (let attempt = 0; attempt <= this.maxFallbacks; attempt++) {
        if (attempt > 0) {
          this._log("FALLBACK_ATTEMPT", record.reqId || "pending", { attempt });
        }

        const result = await this._tryOnce(record, intent, excludedProviders);

        if (result.success) {
          record.setComplete();
          return record;
        }

        if (result.terminal) {
          // Non-retryable failure (budget exceeded, etc.)
          return record;
        }

        // Provider failed (503/timeout) — try another
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

  // ── Private: single provider attempt ────────────────────────────────────

  async _tryOnce(record, intent, excludedProviders) {
    // ── 2. Discover + select provider ─────────────────────────────────────
    let discovery;
    try {
      discovery = await discoverAndSelect(
        this.marketplaceBaseUrl, intent, excludedProviders
      );
    } catch (err) {
      record.setFailed(`Discovery/selection failed: ${err.message}`);
      this._log(AuditEvent.FAILED, "pending", { step: "DISCOVERY", error: err.message });
      return { success: false, terminal: true };
    }

    const { selectedProvider, selectionReason, ranking, filteredOut, allCandidates } = discovery;
    record.setDiscovery({ providers: allCandidates, filteredOut });

    // Determine which service to request
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

    // ── 3. Request service (GET /service) → expect 402 ────────────────────
    const serviceUrl = `${this.marketplaceBaseUrl}/providers/${selectedProvider.providerId}/service`;
    let challenge;

    try {
      const serviceResp = await axios.get(serviceUrl, {
        params: {
          serviceId: chosenService.serviceId,
          ...(intent.payload || {}),
        },
        validateStatus: (s) => s === 402 || s === 200 || s === 503,
      });

      if (serviceResp.status === 503) {
        // Provider unavailable — trigger fallback
        this._log(AuditEvent.FAILED, "pending", {
          step: "GET /service",
          reason: "Provider 503",
          providerId: selectedProvider.providerId,
        });
        return { success: false, terminal: false }; // non-terminal → try another
      }

      if (serviceResp.status !== 402) {
        throw new Error(`Expected 402, got ${serviceResp.status}`);
      }

      challenge = serviceResp.data.challenge;
      if (!challenge || !challenge.reqId || challenge.price === undefined) {
        throw new Error("Invalid 402 challenge: missing required fields");
      }
    } catch (err) {
      if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
        return { success: false, terminal: false }; // network error → fallback
      }
      record.setFailed(`Service request failed: ${err.message}`);
      return { success: false, terminal: true };
    }

    const { reqId, price, paymentEndpoint } = challenge;
    record.setPaymentRequired(reqId, price);
    this._log(AuditEvent.PAYMENT_REQUIRED, reqId, {
      providerId: selectedProvider.providerId,
      price,
    });

    // ── 4. Authorize spending via contract ────────────────────────────────
    // THIS is where the hard cap is enforced — at the EVM level.
    // The agent cannot override this, no matter what the LLM decided.
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
        return { success: false, terminal: true }; // budget exceeded → no fallback
      }

      if (reason.includes("already used")) {
        // Replay: contract already authorized this reqId
        // Try delivery to get cached receipt from provider
        record.setRetried();
        this._log(AuditEvent.RETRY_DETECTED, reqId, { reason });
        return await this._doDeliver(record, paymentEndpoint, reqId, chosenService.serviceId, price);
      }

      record.setFailed(`Authorization failed: ${reason}`);
      return { success: false, terminal: true };
    }

    // ── 5. Submit delivery request ─────────────────────────────────────────
    return await this._doDeliver(record, paymentEndpoint, reqId, chosenService.serviceId, price, intent.payload);
  }

  // ── Private: POST /deliver → verify hash ──────────────────────────────────

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

    // ── 6. Verify content hash ────────────────────────────────────────────
    const recomputed = computeContentHash(receipt.content);
    const hashMatches = recomputed === receipt.contentHash;
    record.setVerified(hashMatches, hashMatches ? null : `Expected ${receipt.contentHash}, got ${recomputed}`);

    if (!hashMatches) {
      this._log(AuditEvent.FAILED, reqId, {
        step: "HASH_VERIFICATION",
        expected: receipt.contentHash,
        got:      recomputed,
      });
      // NOTE: even though hash failed, the payment was already authorized.
      // We record VERIFICATION_FAILED so the audit trail is accurate.
      record.setFailed("Delivery content hash mismatch — possible tampering");
      return { success: false, terminal: true };
    }

    this._log(AuditEvent.VERIFIED, reqId, { contentHash: receipt.contentHash });
    return { success: true };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  _log(event, reqId, extra = {}) {
    if (this.auditLog) {
      this.auditLog.record(event, reqId, extra);
    }
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
