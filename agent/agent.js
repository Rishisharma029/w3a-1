"use strict";

const { ethers }       = require("ethers");
const { PaymentClient } = require("./payment-client");
const { AuditLog }     = require("./audit-log");
const { AuditEvent }   = require("../shared/events");

class Agent {
  constructor({ contractAddress, signer, providerUrl, auditLog }) {
    this.providerUrl = providerUrl;
    this.auditLog    = auditLog || new AuditLog();
    this.client      = new PaymentClient({
      contractAddress,
      agentSigner: signer,
      auditLog:    this.auditLog,
    });
  }

  async purchase(serviceId) {
    return this.client.purchaseService(this.providerUrl, serviceId);
  }

  async getBudgetState() {
    return this.client.getBudgetState();
  }

  getAuditLog() {
    return this.auditLog.all();
  }
}

module.exports = { Agent };
