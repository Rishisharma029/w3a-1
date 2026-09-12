/**
 * agent/payment-client.js
 *
 * Implements the agent side of the x402-style payment flow.
 *
 * The agent:
 *   1. Requests a service from the provider (GET /service).
 *   2. Receives HTTP 402 with a payment challenge (reqId, price, endpoint).
 *   3. Calls BudgetEnforcer.authorize(reqId, price) on the contract.
 *      ← This is where the hard budget cap is enforced.  If the contract
 *        reverts, the agent CANNOT proceed — it has no other path.
 *   4. Submits the authorization proof to the provider (POST /deliver).
 *   5. Receives delivered content + receipt.
 *   6. Verifies the content hash locally.
 *
 * The agent does NOT define its own spending limit.
 * The agent REQUESTS authorization from the contract.
 * The contract is authoritative.
 *
 * Idempotency on the agent side:
 *   The agent tracks completed reqIds in its local deliveryCache.
 *   If a network timeout occurs after step 3 but before step 5,
 *   the agent retries with the same reqId.  The contract will reject
 *   the second authorize() call (replay protection), but the provider
 *   will return the cached receipt (idempotency store).
 *   So the agent can safely retry step 4 with the original reqId.
 */

"use strict";

const axios    = require("axios");
const { ethers } = require("ethers");

const { AuditEvent }       = require("../shared/events");
const { computeContentHash } = require("../shared/types");

// ABI — only the functions the agent needs
const AGENT_ABI = [
  "function authorize(bytes32 reqId, uint256 amount) external",
  "function remainingBudget() external view returns (uint256)",
  "function totalSpent() external view returns (uint256)",
  "function maxBudget() external view returns (uint256)",
];

class PaymentClient {
  /**
   * @param {object} opts
   * @param {string} opts.contractAddress   - BudgetEnforcer contract address
   * @param {ethers.Signer} opts.agentSigner - Wallet that is the authorized agent
   * @param {import('./audit-log').AuditLog} opts.auditLog
   */
  constructor({ contractAddress, agentSigner, auditLog }) {
    this.contract = new ethers.Contract(
      contractAddress,
      AGENT_ABI,
      agentSigner
    );
    this.auditLog = auditLog;

    /**
     * Local delivery cache.
     * Key:   reqId (bytes32 hex)
     * Value: { receipt, contentHash }
     *
     * Advisory only — the hard idempotency is enforced by the contract
     * (replay rejection) and provider (receipt store).
     */
    this._deliveryCache = new Map();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Purchase a service from a provider using the full x402-style flow.
   *
   * @param {string} providerUrl  - Base URL of the provider (e.g. http://localhost:3001)
   * @param {string} serviceId    - Service identifier
   * @returns {Promise<PurchaseResult>}
   */
  async purchaseService(providerUrl, serviceId) {
    // ── Step 1: Request service (expect HTTP 402) ─────────────────────────
    this.auditLog.record(AuditEvent.REQUESTED, "pending", { providerUrl, serviceId });

    let challenge;
    try {
      const resp = await axios.get(`${providerUrl}/service`, {
        params: { serviceId },
        validateStatus: (s) => s === 402 || s === 200,
      });

      if (resp.status !== 402) {
        throw new Error(
          `Expected 402 Payment Required, got ${resp.status}`
        );
      }

      challenge = resp.data.challenge;
    } catch (err) {
      this.auditLog.record(AuditEvent.FAILED, "pending", {
        reason: err.message,
        step: "GET /service",
      });
      throw err;
    }

    const { reqId, price, paymentEndpoint } = challenge;

    this.auditLog.record(AuditEvent.PAYMENT_REQUIRED, reqId, {
      serviceId,
      price,
      providerUrl,
    });

    // ── Check local delivery cache (advisory — not the hard guard) ─────────
    if (this._deliveryCache.has(reqId)) {
      const cached = this._deliveryCache.get(reqId);
      this.auditLog.record(AuditEvent.RETRY_DETECTED, reqId, {
        note: "Already in local cache",
      });
      return cached;
    }

    // ── Step 2: Authorize spending via contract ────────────────────────────
    // This is the ONLY path to authorization.  If the contract reverts,
    // execution stops here — the agent cannot proceed.
    let txHash;
    try {
      const tx = await this.contract.authorize(reqId, BigInt(price));
      const receipt = await tx.wait();
      txHash = receipt.hash;

      this.auditLog.record(AuditEvent.PAYMENT_AUTHORIZED, reqId, {
        amount: price,
        txHash,
      });
    } catch (err) {
      // Determine whether this was an overspend rejection or a replay
      const reason = err.reason || err.message || "";
      let event = AuditEvent.FAILED;

      if (reason.includes("spending cap exceeded")) {
        event = AuditEvent.OVERSPEND_REJECTED;
      } else if (reason.includes("already used")) {
        // Contract rejected replay — check if provider has a cached receipt
        event = AuditEvent.RETRY_DETECTED;
      }

      this.auditLog.record(event, reqId, { reason });

      // On replay, attempt to retrieve cached delivery from provider
      if (reason.includes("already used")) {
        return await this._retryDeliver(paymentEndpoint, reqId, serviceId, price);
      }

      throw Object.assign(err, { reqId, event });
    }

    // ── Step 3: Submit payment proof to provider ──────────────────────────
    this.auditLog.record(AuditEvent.PAYMENT_COMPLETED, reqId, {
      txHash,
      serviceId,
      amount: price,
    });

    const deliveryResult = await this._deliver(
      paymentEndpoint, reqId, serviceId, price
    );

    // ── Step 4: Verify content hash locally ───────────────────────────────
    const { receipt } = deliveryResult;
    const recomputedHash = computeContentHash(receipt.content);

    if (recomputedHash !== receipt.contentHash) {
      this.auditLog.record(AuditEvent.FAILED, reqId, {
        reason: "Content hash mismatch",
        expected: receipt.contentHash,
        got: recomputedHash,
      });
      throw new Error(
        `Content hash mismatch for ${reqId}. ` +
        `Expected ${receipt.contentHash}, got ${recomputedHash}`
      );
    }

    this.auditLog.record(AuditEvent.VERIFIED, reqId, {
      contentHash: receipt.contentHash,
      receiptId: receipt.receiptId,
    });

    // Cache locally
    const result = { reqId, receipt, contentHash: receipt.contentHash, txHash };
    this._deliveryCache.set(reqId, result);

    return result;
  }

  /**
   * Get current budget state from the contract.
   * @returns {Promise<{maxBudget: bigint, totalSpent: bigint, remaining: bigint}>}
   */
  async getBudgetState() {
    const [maxBudget, totalSpent, remaining] = await Promise.all([
      this.contract.maxBudget(),
      this.contract.totalSpent(),
      this.contract.remainingBudget(),
    ]);
    return { maxBudget, totalSpent, remaining };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

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
      this.auditLog.record(AuditEvent.FAILED, reqId, {
        reason: "POST /deliver failed",
        detail,
      });
      throw Object.assign(
        new Error(`Delivery failed: ${JSON.stringify(detail)}`),
        { reqId }
      );
    }
  }

  /**
   * After a contract replay rejection, ask the provider for the cached receipt.
   * The provider's idempotency store will return it without re-charging.
   */
  async _retryDeliver(endpoint, reqId, serviceId, amount) {
    this.auditLog.record(AuditEvent.RETRY_DETECTED, reqId, {
      note: "Contract rejected replay — fetching cached receipt from provider",
    });

    try {
      const resp = await axios.post(endpoint, { reqId, serviceId, amount });
      const { receipt } = resp.data;

      if (receipt) {
        this.auditLog.record(AuditEvent.DELIVERED, reqId, {
          receiptId:  receipt.receiptId,
          idempotent: true,
          note:       "Cached receipt returned — no second charge",
        });
        const result = {
          reqId,
          receipt,
          contentHash: receipt.contentHash,
          txHash: null,
          idempotent: true,
        };
        this._deliveryCache.set(reqId, result);
        return result;
      }
    } catch (err) {
      // Even the retry failed — propagate
    }

    throw new Error(`Replay detected for ${reqId} but no cached receipt found`);
  }
}

module.exports = { PaymentClient };
