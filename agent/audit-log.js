"use strict";

class AuditLog {
  constructor() {
    this._entries = [];
  }

  record(event, reqId, extra = {}) {
    const entry = { event, reqId, timestamp: new Date().toISOString(), ...extra };
    this._entries.push(entry);
    return entry;
  }

  forRequest(reqId) {
    return this._entries.filter((e) => e.reqId === reqId);
  }

  all() {
    return [...this._entries];
  }

  dump() {
    console.log("\n── AUDIT LOG ──────────────────────────────────────────");
    for (const e of this._entries) console.log(JSON.stringify(e));
    console.log("───────────────────────────────────────────────────────\n");
  }

  clear() {
    this._entries = [];
  }
}

module.exports = { AuditLog };
