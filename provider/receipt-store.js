"use strict";

class ReceiptStore {
  constructor() {
    /** @type {Map<string, import('../shared/types').DeliveryReceipt>} */
    this._store = new Map();
  }

  /**
   * Check whether a receipt exists for the given reqId.
   * @param {string} reqId
   * @returns {boolean}
   */
  has(reqId) {
    return this._store.has(reqId);
  }

  /**
   * Retrieve the cached receipt for a reqId.
   * Returns undefined if not found.
   * @param {string} reqId
   * @returns {import('../shared/types').DeliveryReceipt | undefined}
   */
  get(reqId) {
    return this._store.get(reqId);
  }

  /**
   * Persist a new receipt.  Throws if reqId already exists (safety guard).
   * @param {string} reqId
   * @param {import('../shared/types').DeliveryReceipt} receipt
   */
  set(reqId, receipt) {
    if (this._store.has(reqId)) {
      throw new Error(
        `ReceiptStore: attempt to overwrite existing receipt for ${reqId}`
      );
    }
    this._store.set(reqId, receipt);
  }

  /**
   * Return all receipts as an array (for debugging / admin endpoints).
   * @returns {import('../shared/types').DeliveryReceipt[]}
   */
  all() {
    return Array.from(this._store.values());
  }

  /** Clear the store (used in tests). */
  clear() {
    this._store.clear();
  }
}

// Singleton instance shared across the Phase 1 provider process.
const _singleton = new ReceiptStore();

/**
 * Create a new, independent ReceiptStore instance.
 * Used by the Phase 2 marketplace to give each provider its own store.
 * @returns {ReceiptStore}
 */
function createReceiptStore() {
  return new ReceiptStore();
}

module.exports = _singleton;
module.exports.createReceiptStore = createReceiptStore;
module.exports.ReceiptStore = ReceiptStore;
