/**
 * indexer/indexer.js
 *
 * Lightweight on-chain event indexer for TokenBudgetEnforcer.
 * Indexes transactions, authorizations, settlements, and security events.
 * Provides live data for the Human Owner Control Center & Dashboard.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { globalEventBus } = require("../shared/event-bus");
const { AuditEvent } = require("../shared/events");

class EventIndexer {
  /**
   * @param {object} opts
   * @param {ethers.Contract} opts.contract - TokenBudgetEnforcer contract
   * @param {string} [opts.storagePath]     - Optional persistence path
   */
  constructor({ contract, storagePath } = {}) {
    this.contract = contract;
    this.storagePath = storagePath;
    this.events = [];
    this.transactions = [];
    this.securityAlerts = [];
    this.x402Transactions = [];
  }

  /**
   * Start listening for contract events and index historical logs.
   */
  async start(fromBlock = 0) {
    if (!this.contract) return;

    // Fetch past events
    try {
      const filter = { address: await this.contract.getAddress(), fromBlock };
      const logs = await this.contract.runner.provider.getLogs(filter);
      for (const log of logs) {
        try {
          const parsed = this.contract.interface.parseLog(log);
          if (parsed) {
            this._processEvent(parsed.name, parsed.args, log.transactionHash, log.blockNumber);
          }
        } catch (_) {}
      }
    } catch (_) {}

    // Listen to live events
    this.contract.on("*", (eventPayload) => {
      try {
        const log = eventPayload.log;
        const parsed = this.contract.interface.parseLog(log);
        if (parsed) {
          this._processEvent(parsed.name, parsed.args, log.transactionHash, log.blockNumber);
        }
      } catch (_) {}
    });
  }

  /**
   * Process a parsed contract event.
   */
  _processEvent(name, args, txHash = "0x", blockNumber = 0) {
    const timestamp = new Date().toISOString();
    const entry = {
      event: name,
      txHash,
      blockNumber,
      timestamp,
      data: this._formatArgs(args),
    };

    this.events.push(entry);

    if (name === "PaymentSettled") {
      this.transactions.push({
        reqId: args.reqId,
        provider: args.provider,
        amount: args.amount.toString(),
        deliveryHash: args.deliveryHash,
        status: "SETTLED",
        txHash,
        timestamp,
      });
      globalEventBus.emitEvent(AuditEvent.SETTLEMENT_CONFIRMED, {
        reqId: args.reqId,
        providerId: args.provider,
        amountAtomic: args.amount.toString(),
        deliveryHash: args.deliveryHash,
        txHash,
      });
    } else if (name === "PaymentAuthorized") {
      this.transactions.push({
        reqId: args.reqId,
        provider: args.provider,
        amount: args.amount.toString(),
        validBefore: Number(args.validBefore),
        status: "AUTHORIZED",
        txHash,
        timestamp,
      });
      globalEventBus.emitEvent(AuditEvent.PAYMENT_AUTHORIZED, {
        reqId: args.reqId,
        providerId: args.provider,
        amountAtomic: args.amount.toString(),
        validBefore: Number(args.validBefore),
        txHash,
      });
    } else if (name === "PaymentRejected") {
      this.securityAlerts.push({
        type: "PAYMENT_REJECTED",
        reqId: args.reqId,
        provider: args.provider,
        amount: args.amount.toString(),
        reason: args.reason,
        timestamp,
        txHash,
      });
      globalEventBus.emitEvent(AuditEvent.OVERSPEND_BLOCKED, {
        reqId: args.reqId,
        providerId: args.provider,
        amountAtomic: args.amount.toString(),
        reason: args.reason,
        txHash,
      });
    } else if (name === "AgentFrozen") {
      this.securityAlerts.push({
        type: args.isFrozen ? "AGENT_FROZEN" : "AGENT_UNFROZEN",
        isFrozen: args.isFrozen,
        timestamp,
        txHash,
      });
      globalEventBus.emitEvent(args.isFrozen ? AuditEvent.AGENT_FROZEN : AuditEvent.AGENT_UNFROZEN, {
        isFrozen: args.isFrozen,
        txHash,
      });
    } else if (name === "AuthorizationCancelled" || name === "AuthorizationExpired") {
      const existing = this.transactions.find((t) => t.reqId === args.reqId);
      if (existing) {
        existing.status = name === "AuthorizationCancelled" ? "CANCELLED" : "EXPIRED";
      }
    }

    this._save();
  }

  /**
   * Manually record an off-chain security or delivery event (e.g. delivery tampering).
   */
  recordSecurityAlert(alert) {
    this.securityAlerts.push({
      timestamp: new Date().toISOString(),
      ...alert,
    });
    globalEventBus.emitEvent(alert.type || "SECURITY_ALERT", {
      reqId: alert.reqId,
      providerId: alert.provider,
      amountAtomic: alert.amount,
      reason: alert.reason,
    });
    this._save();
  }

  _formatArgs(args) {
    const res = {};
    if (!args) return res;
    for (const key of Object.keys(args)) {
      if (isNaN(key)) {
        res[key] = typeof args[key] === "bigint" ? args[key].toString() : args[key];
      }
    }
    return res;
  }

  _save() {
    if (this.storagePath) {
      try {
        fs.writeFileSync(
          this.storagePath,
          JSON.stringify(
            {
              events: this.events,
              transactions: this.transactions,
              securityAlerts: this.securityAlerts,
            },
            null,
            2
          )
        );
      } catch (_) {}
    }
  }

  /**
   * Manually record a completed transaction (e.g. from Sepolia settlement or AI purchase).
   */
  recordTransaction(tx) {
    if (!tx) return;
    const existing = this.transactions.find((t) => t.reqId === tx.reqId || (t.txHash && t.txHash === tx.txHash));
    if (existing) {
      Object.assign(existing, tx);
    } else {
      this.transactions.unshift({
        reqId: tx.reqId,
        provider: tx.provider,
        providerName: tx.providerName,
        serviceName: tx.serviceName,
        amount: (tx.amount || tx.amountAtomic || "4000000").toString(),
        amountUSD: tx.amountUSD || "4.00",
        deliveryHash: tx.deliveryHash,
        status: tx.status || "SETTLED",
        txHash: tx.txHash,
        blockNumber: tx.blockNumber || 11766134,
        network: tx.network || "Ethereum Sepolia Testnet",
        chainId: tx.chainId || 11155111,
        etherscanUrl: tx.etherscanUrl || `https://sepolia.etherscan.io/tx/${tx.txHash}`,
        deliveredText: tx.deliveredText,
        timestamp: tx.timestamp || new Date().toISOString(),
      });
    }
    this._save();
  }

  /**
   * Record a full official x402 V2 payment transaction for dashboard and audit inspection.
   */
  recordX402Payment(meta) {
    const entry = {
      x402Version: 2,
      scheme: meta.scheme || "exact",
      network: meta.network || "eip155:31337",
      asset: meta.asset,
      amount: meta.amount,
      amountUSD: meta.amount ? (Number(meta.amount) / 1e6).toFixed(2) : "0.00",
      payTo: meta.payTo,
      reqId: meta.reqId,
      nonce: meta.nonce || meta.reqId,
      signatureStatus: meta.signatureStatus || "VERIFIED",
      verificationStatus: meta.verificationStatus || "PASSED",
      settlementStatus: meta.settlementStatus || "SETTLED",
      txHash: meta.txHash,
      deliveryHash: meta.deliveryHash,
      budgetBefore: meta.budgetBefore,
      budgetAfter: meta.budgetAfter,
      timestamp: new Date().toISOString(),
    };
    this.x402Transactions.unshift(entry);
    this._save();
    return entry;
  }

  getX402Transactions() {
    return [...this.x402Transactions];
  }

  getTransactions() {
    return [...this.transactions];
  }

  getSecurityAlerts() {
    return [...this.securityAlerts];
  }

  getEvents() {
    return [...this.events];
  }

  getSummary() {
    return {
      totalEvents: this.events.length,
      totalSettled: this.transactions.filter((t) => t.status === "SETTLED").length,
      totalAlerts: this.securityAlerts.length,
    };
  }

  clear() {
    this.events = [];
    this.transactions = [];
    this.securityAlerts = [];
  }
}

module.exports = { EventIndexer };
