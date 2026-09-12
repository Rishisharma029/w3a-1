/**
 * agent/agent.js
 *
 * The AI Agent — a simple programmatic agent that uses PaymentClient
 * to purchase services from a provider.
 *
 * In Phase 2 this would be replaced by an LLM-driven reasoning loop.
 * For Phase 1 it is a deterministic script that demonstrates the required
 * judge scenarios.
 *
 * Key design constraint:
 *   The agent has NO mechanism to increase its own spending cap.
 *   It can only CALL authorize() — and the contract decides yes or no.
 */

"use strict";

const { ethers }       = require("ethers");
const { PaymentClient } = require("./payment-client");
const { AuditLog }     = require("./audit-log");
const { AuditEvent }   = require("../shared/events");

class Agent {
  /**
   * @param {object} opts
   * @param {string} opts.contractAddress   - BudgetEnforcer contract address
   * @param {ethers.Signer} opts.signer     - Authorized agent wallet
   * @param {string} opts.providerUrl       - Base URL of the provider
   * @param {AuditLog} [opts.auditLog]      - Optional shared audit log
   */
  constructor({ contractAddress, signer, providerUrl, auditLog }) {
    this.providerUrl = providerUrl;
    this.auditLog    = auditLog || new AuditLog();
    this.client      = new PaymentClient({
      contractAddress,
      agentSigner: signer,
      auditLog:    this.auditLog,
    });
  }

  /**
   * Ask the agent to purchase a service.
   *
   * Returns the PurchaseResult on success.
   * Throws with event metadata on failure (overspend, etc.).
   *
   * @param {string} serviceId
   * @returns {Promise<PurchaseResult>}
   */
  async purchase(serviceId) {
    return this.client.purchaseService(this.providerUrl, serviceId);
  }

  /**
   * Get the current budget state (reads from contract — authoritative).
   * @returns {Promise<{maxBudget: bigint, totalSpent: bigint, remaining: bigint}>}
   */
  async getBudgetState() {
    return this.client.getBudgetState();
  }

  /**
   * Return the agent's full audit log.
   */
  getAuditLog() {
    return this.auditLog.all();
  }
}

module.exports = { Agent };
