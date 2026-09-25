"use strict";

const fs   = require("fs");
const fsp  = require("fs").promises;
const path = require("path");
const { globalEventBus } = require("../shared/event-bus");
const { AuditEvent } = require("../shared/events");

class EventIndexer {
  constructor({ contract, storagePath } = {}) {
    this.contract       = contract;
    this.storagePath    = storagePath;
    this.events         = [];
    this.transactions   = [];
    this.securityAlerts = [];
    this.x402Transactions = [];
    this._saveTimer     = null;
  }



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
        } catch (err) { /* ignore */ }
      }
    } catch (err) { /* ignore */ }

    // Listen to live events
    this.contract.on("*", (eventPayload) => {
      try {
        const log = eventPayload.log;
        const parsed = this.contract.interface.parseLog(log);
        if (parsed) {
          this._processEvent(parsed.name, parsed.args, log.transactionHash, log.blockNumber);
        }
      } catch (err) { /* ignore */ }
    });
  }

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
      const pAddr = String(args.provider || "").toLowerCase();
      const pName = pAddr.includes("3c44") ? "Alpha Translation Services"
                  : pAddr.includes("90f7") ? "Delta Compute Engine"
                  : pAddr.includes("15d3") ? "Beta Translate (Budget)"
                  : pAddr.includes("9965") ? "Gamma Premium Translation"
                  : pAddr.includes("976e") ? "Epsilon Vision AI"
                  : "Alpha Translation Services";
      const amtAtomic = args.amount.toString();
      const amtUSD = (Number(amtAtomic) / 1e6).toFixed(2);
      const isSepolia = Boolean(this.contract && (this.contract.target || "").toLowerCase() === (process.env.SEPOLIA_ENFORCER_ADDRESS || "0xf9f296e97062f49ad3d13af96729f7c35a7ea75e").toLowerCase());

      const txRecord = {
        reqId: args.reqId,
        provider: args.provider,
        providerName: pName,
        serviceName: "Neural Text Translation",
        serviceId: "text-translate",
        amount: amtAtomic,
        amountUSD: amtUSD,
        deliveryHash: args.deliveryHash,
        status: "SETTLED",
        txHash,
        blockNumber,
        network: isSepolia ? "Ethereum Sepolia Testnet" : "Local Hardhat EVM",
        chainId: isSepolia ? 11155111 : 31337,
        caip2: isSepolia ? "eip155:11155111" : "eip155:31337",
        etherscanUrl: isSepolia ? `https://sepolia.etherscan.io/tx/${txHash}` : null,
        timestamp,
      };

      const existingIdx = this.transactions.findIndex(t => (t.txHash && t.txHash.toLowerCase() === txHash.toLowerCase()) || (t.reqId && t.reqId.toLowerCase() === args.reqId.toLowerCase()));
      if (existingIdx >= 0) {
        this.transactions[existingIdx] = { ...this.transactions[existingIdx], ...txRecord };
      } else {
        this.transactions.unshift(txRecord);
      }

      globalEventBus.emitEvent(AuditEvent.SETTLEMENT_CONFIRMED, {
        reqId: args.reqId,
        providerId: args.provider,
        amountAtomic: amtAtomic,
        amountUSD: amtUSD,
        deliveryHash: args.deliveryHash,
        txHash,
        network: isSepolia ? "eip155:11155111" : "eip155:31337",
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
    if (!this.storagePath) return;
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      fs.promises.writeFile(
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
      ).catch(() => { /* ignore */ });
    }, 500);
  }

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
