/**
 * agent/audit-log.js
 *
 * Append-only, in-memory audit log for the agent process.
 *
 * Every event is stamped with a timestamp and the reqId so that
 * any single purchase can be traced from REQUESTED → VERIFIED in
 * chronological order.
 *
 * In Phase 2 this would write to a persistent DB or JSONL file.
 * For Phase 1 the log is also flushed to stdout in the demo.
 */

"use strict";

class AuditLog {
  constructor() {
    /** @type {object[]} */
    this._entries = [];
  }

  /**
   * Append a new event.
   * @param {string} event         - AuditEvent constant
   * @param {string} reqId         - Request identifier
   * @param {object} [extra={}]    - Additional context fields
   */
  record(event, reqId, extra = {}) {
    const entry = {
      event,
      reqId,
      timestamp: new Date().toISOString(),
      ...extra,
    };
    this._entries.push(entry);
    return entry;
  }

  /**
   * Return all entries for a specific reqId in order.
   * @param {string} reqId
   * @returns {object[]}
   */
  forRequest(reqId) {
    return this._entries.filter((e) => e.reqId === reqId);
  }

  /**
   * Return all entries.
   * @returns {object[]}
   */
  all() {
    return [...this._entries];
  }

  /**
   * Print the full log to stdout (for demo/debugging).
   */
  dump() {
    console.log("\n═══ AUDIT LOG ═══════════════════════════════════════════");
    for (const e of this._entries) {
      console.log(JSON.stringify(e));
    }
    console.log("═════════════════════════════════════════════════════════\n");
  }

  /** Clear the log (for tests). */
  clear() {
    this._entries = [];
  }
}

module.exports = { AuditLog };
