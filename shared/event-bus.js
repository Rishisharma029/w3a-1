/**
 * shared/event-bus.js
 *
 * Central Real-Time Event Bus for W3A-1
 * =====================================
 * Implements a unified pub/sub event pipeline connecting:
 *   Backend / AI Agent / x402 Marketplace / Facilitator / Indexer
 *         ↓
 *   W3A1EventBus (EventEmitter + In-Memory Replay Buffer)
 *         ↓
 *   Server-Sent Events (SSE) Stream / WebSocket
 *         ↓
 *   Owner Control Center Dashboard
 *
 * Emits canonical machine payment lifecycle events:
 *   - INTENT_RECEIVED
 *   - PROVIDER_SEARCH
 *   - PROVIDER_SELECTED
 *   - PAYMENT_REQUIRED
 *   - PAYMENT_SIGNED
 *   - PAYMENT_VERIFIED
 *   - SETTLEMENT_SUBMITTED
 *   - SETTLEMENT_CONFIRMED
 *   - DELIVERY_RECEIVED
 *   - HASH_VERIFIED
 *   - OVERSPEND_BLOCKED
 *   - RETRY_DETECTED
 *   - AGENT_FROZEN / AGENT_UNFROZEN
 *   - BUDGET_FUNDED
 */

"use strict";

const { EventEmitter } = require("events");
const { AuditEvent } = require("./events");

const MAX_HISTORY = 150;

class W3A1EventBus extends EventEmitter {
  constructor({ maxHistory = MAX_HISTORY } = {}) {
    super();
    this.maxHistory = maxHistory;
    this.history = [];
    this._seq = 1;
    this.setMaxListeners(100);
  }

  /**
   * Emit a structured W3A-1 event.
   *
   * @param {string} type - Event type constant from AuditEvent
   * @param {object} payload - Event payload details
   * @returns {object} Formatted event envelope
   */
  emitEvent(type, payload = {}) {
    const amountUnits = payload.amountAtomic || payload.amount || "0";
    let amountUSD = payload.amountUSD || "0.00";
    try {
      if ((!payload.amountUSD || payload.amountUSD === "0.00") && amountUnits && amountUnits !== "0") {
        amountUSD = (Number(BigInt(amountUnits)) / 1e6).toFixed(2);
      }
    } catch (_) {
      amountUSD = (Number(amountUnits) / 1e6).toFixed(2);
    }

    const enriched = { ...payload, amountUSD, amountAtomic: amountUnits.toString() };

    const envelope = {
      id: `EVT-${Date.now()}-${this._seq++}`,
      type: type || AuditEvent.REQUESTED,
      timestamp: new Date().toISOString(),
      reqId: payload.reqId || payload.requestId || "0x",
      providerId: payload.providerId || null,
      serviceId: payload.serviceId || null,
      amountAtomic: amountUnits.toString(),
      amountUSD,
      txHash: payload.txHash || null,
      deliveryHash: payload.deliveryHash || null,
      deliveryStatus: payload.deliveryStatus || null,
      reason: payload.reason || null,
      data: payload.data || payload,
      message: payload.message || this._defaultMessage(type, enriched),
      status: this._deriveStatus(type, enriched),
    };

    // Store in circular history buffer for instant replay upon new connections
    this.history.unshift(envelope);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    // Emit on wildcard and specific channel
    this.emit("event", envelope);
    this.emit(envelope.type, envelope);

    return envelope;
  }

  /**
   * Retrieve recent events from history.
   * @param {number} [limit=50]
   */
  getHistory(limit = 50) {
    return this.history.slice(0, Math.min(limit, this.history.length));
  }

  /**
   * Clear in-memory history.
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Create an Express HTTP handler for Server-Sent Events (SSE).
   */
  createSSEHandler() {
    return (req, res) => {
      // Set SSE headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
      });

      const connectionId = `CONN-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // 1. Send handshake with recent replay history
      const handshake = {
        connectionId,
        status: "CONNECTED",
        serverTime: new Date().toISOString(),
        recentEvents: this.getHistory(25),
      };
      res.write(`event: connected\ndata: ${JSON.stringify(handshake)}\n\n`);

      // 2. Real-time event listener
      const onEvent = (envelope) => {
        try {
          res.write(`event: w3a1_event\ndata: ${JSON.stringify(envelope)}\n\n`);
        } catch (_) {}
      };

      this.on("event", onEvent);

      // 3. Keepalive heartbeat ping every 15 seconds
      const pingInterval = setInterval(() => {
        try {
          res.write(`: keepalive ${Date.now()}\n\n`);
        } catch (_) {}
      }, 15000);

      // 4. Cleanup on disconnect
      req.on("close", () => {
        clearInterval(pingInterval);
        this.removeListener("event", onEvent);
      });
    };
  }

  _deriveStatus(type, payload) {
    if (type.includes("BLOCKED") || type.includes("REJECTED") || type.includes("TAMPERED") || type === "FAILED") {
      return "SECURITY_ALERT";
    }
    if (type === "SETTLEMENT_CONFIRMED" || type === "HASH_VERIFIED" || type === "DELIVERY_RECEIVED") {
      return "SUCCESS";
    }
    if (type === "AGENT_FROZEN") {
      return "CRITICAL";
    }
    return "INFO";
  }

  _defaultMessage(type, payload) {
    const prov = payload.providerId ? `[${payload.providerId}]` : "";
    switch (type) {
      case "INTENT_RECEIVED":
        return `Intent received: "${payload.intent || payload.userRequest || payload.text || 'Autonomous purchase'}"`;
      case "PROVIDER_SEARCH":
        return `Searching registry for eligible providers (${payload.serviceType || 'services'})`;
      case "PROVIDER_SELECTED":
        return `Provider selected: ${payload.providerId || 'Provider'} (${payload.amountUSD ? '$' + payload.amountUSD : ''})`;
      case "PAYMENT_REQUIRED":
        return `HTTP 402 challenge received from ${prov}. Payment required: $${payload.amountUSD || '0.00'}`;
      case "PAYMENT_SIGNED":
        return `Agent signed EIP-712 payment authorization for ${prov} ($${payload.amountUSD || '0.00'})`;
      case "PAYMENT_VERIFIED":
        return `Facilitator verified EIP-712 signature & spending cap for ${prov}`;
      case "SETTLEMENT_SUBMITTED":
        return `Settlement transaction submitted on EVM for ${prov}`;
      case "SETTLEMENT_CONFIRMED":
        return `Settled on-chain: $${payload.amountUSD || '0.00'} MockUSDC transferred to ${prov} (Tx: ${payload.txHash ? payload.txHash.slice(0, 10) + '...' : 'Confirmed'})`;
      case "DELIVERY_RECEIVED":
        return `Delivered content received from ${prov}`;
      case "HASH_VERIFIED":
        return `Delivery content SHA-256 hash verified independently against on-chain proof ✔`;
      case "OVERSPEND_BLOCKED":
        return `SPENDING CAP ENFORCED: Overspend attempt blocked physically by protocol (${payload.reason || 'Ceiling exceeded'})`;
      case "RETRY_DETECTED":
        return `Replay/idempotent retry detected for reqId ${payload.reqId ? payload.reqId.slice(0, 10) + '...' : ''} — returning cached receipt with 0 duplicate charge`;
      case "AGENT_FROZEN":
        return `EMERGENCY FREEZE: AI Agent spending frozen by contract owner`;
      case "AGENT_UNFROZEN":
        return `Agent spending unfrozen by contract owner`;
      case "BUDGET_FUNDED":
        return `Escrow funded with $${payload.amountUSD || payload.amount || '0.00'} MockUSDC`;
      case "DELIVERY_TAMPERED":
        return `SECURITY VIOLATION: Delivered payload hash mismatch (Tampered content detected)`;
      default:
        return payload.message || `Lifecycle event: ${type}`;
    }
  }
}

// Global shared singleton for the process
const globalEventBus = new W3A1EventBus();

module.exports = {
  W3A1EventBus,
  globalEventBus,
};
