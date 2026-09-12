/**
 * provider/receipt-store.js
 *
 * In-memory idempotency store for the mock provider.
 *
 * Purpose
 * -------
 * Guarantees that a given reqId produces exactly one delivery, regardless
 * of how many times POST /deliver is called.  This is the PROVIDER-SIDE
 * double-charge protection layer — complementary to the contract-level
 * replay protection.
 *
 * In production this would be a database with a UNIQUE constraint on reqId.
 * For Phase 1 we use an in-memory Map.
 *
 * Security note
 * -------------
 * The store is keyed on reqId (bytes32 hex string).  An attacker cannot
 * "poison" an existing receipt because the reqId is already marked as used
 * in the contract — any second authorize() call with the same ID reverts.
 * The provider only writes to the store AFTER verifying authorization
 * on-chain, so the store is always consistent with contract state.
 */

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
