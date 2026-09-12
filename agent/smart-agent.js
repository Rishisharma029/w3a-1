/**
 * agent/smart-agent.js
 *
 * High-level autonomous agent interface for Phase 2.
 *
 * This wraps the PurchaseFlow state machine into a single clean API:
 *
 *   const agent = new SmartAgent({ ... });
 *   const record = await agent.purchase("Translate this to Hindi. Quality >= 0.9");
 *
 * The SmartAgent:
 *   1. Accepts natural-language user requests.
 *   2. Delegates intent parsing to the LLM client.
 *   3. Delegates provider discovery + selection to provider-selector.js.
 *   4. Delegates the full payment flow to purchase-flow.js.
 *   5. Returns a PurchaseRecord.
 *
 * SECURITY BOUNDARY:
 *   SmartAgent never calls contract.authorize() directly.
 *   It never interprets budget policy.
 *   It never decides whether a purchase is allowed.
 *   All of that is handled inside PurchaseFlow → BudgetEnforcer contract.
 */

"use strict";

const { PurchaseFlow } = require("./purchase-flow");
const { AuditLog }     = require("./audit-log");

class SmartAgent {
  /**
   * @param {object} opts
   * @param {string}        opts.marketplaceBaseUrl  - e.g. "http://localhost:3002"
   * @param {ethers.Signer} opts.agentSigner
   * @param {string}        opts.contractAddress
   * @param {AuditLog}      [opts.auditLog]
   * @param {number}        [opts.maxFallbacks=2]
   */
  constructor({ marketplaceBaseUrl, agentSigner, contractAddress, auditLog, maxFallbacks = 2 }) {
    this.marketplaceBaseUrl = marketplaceBaseUrl;
    this.agentSigner        = agentSigner;
    this.contractAddress    = contractAddress;
    this.auditLog           = auditLog || new AuditLog();
    this.maxFallbacks       = maxFallbacks;

    this._flow = new PurchaseFlow({
      marketplaceBaseUrl,
      agentSigner,
      contractAddress,
      auditLog: this.auditLog,
      maxFallbacks,
    });
  }

  /**
   * Execute an autonomous purchase from a natural-language request.
   * Returns a PurchaseRecord (never throws).
   *
   * @param {string} userRequest
   * @returns {Promise<import('./purchase-record').PurchaseRecord>}
   */
  async purchase(userRequest) {
    return this._flow.run(userRequest);
  }

  /**
   * Get the current budget state from the contract.
   * @returns {Promise<{maxBudget, totalSpent, remaining}>}
   */
  async getBudgetState() {
    return this._flow.getBudgetState();
  }
}

module.exports = { SmartAgent };
