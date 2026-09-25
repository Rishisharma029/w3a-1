"use strict";

const { PurchaseFlow } = require("./purchase-flow");
const { AuditLog }     = require("./audit-log");

class SmartAgent {
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

  async purchase(userRequest) {
    return this._flow.run(userRequest);
  }

  async getBudgetState() {
    return this._flow.getBudgetState();
  }
}

module.exports = { SmartAgent };
