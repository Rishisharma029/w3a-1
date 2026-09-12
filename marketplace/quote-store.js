/**
 * marketplace/quote-store.js
 *
 * Stale-Quote Protection Store
 * =============================
 * When a provider issues a 402 Payment Required, it records the pending quote
 * in this store:
 *
 *   pendingQuotes[reqId] = { serviceId, price, expiresAt, providerId }
 *
 * When the agent submits POST /deliver, the provider validates:
 *   1. Does a pending quote exist for this reqId?           (not forged)
 *   2. Has the quote expired?                               (not stale)
 *   3. Does the submitted amount match the quoted price?    (no price manipulation)
 *
 * This is the PROVIDER-SIDE stale-quote defence.
 * The contract's verifyAuthorization is an independent second check.
 *
 * Security note
 * =============
 * A malicious agent could:
 *   (a) Submit a reqId it never received → no pending quote → rejected.
 *   (b) Receive a quote at price $3, wait until it expires, pay $3,
 *       then POST /deliver → quote expired → rejected.
 *   (c) Receive a quote at price $3, authorize $3 on contract, but submit
 *       amount=1 in POST /deliver → price mismatch → rejected.
 *   (d) Receive a quote at price $3, authorize $3, post correctly → succeeds.
 */

"use strict";

class QuoteStore {
  constructor() {
    /** @type {Map<string, {serviceId: string, price: number, expiresAt: number, providerId: string}>} */
    this._store = new Map();
  }

  /**
   * Record a newly issued pending quote.
   * @param {string} reqId
   * @param {object} quote
   * @param {string} quote.serviceId
   * @param {number} quote.price
   * @param {number} quote.expiresAt  - Unix timestamp (seconds)
   * @param {string} quote.providerId
   */
  set(reqId, quote) {
    this._store.set(reqId, quote);
  }

  /**
   * Validate a pending quote.
   *
   * Returns { valid: true } on success.
   * Returns { valid: false, reason: string } on failure.
   *
   * @param {string} reqId
   * @param {string} serviceId   - Must match the quote
   * @param {number} amount      - Must match the quoted price exactly
   * @returns {{ valid: boolean, reason?: string, quote?: object }}
   */
  validate(reqId, serviceId, amount) {
    const quote = this._store.get(reqId);

    if (!quote) {
      return { valid: false, reason: "No pending quote for this reqId. Request a new quote via GET /service." };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec > quote.expiresAt) {
      this._store.delete(reqId); // clean up
      return { valid: false, reason: `Quote expired at ${new Date(quote.expiresAt * 1000).toISOString()}. Request a new quote.` };
    }

    if (quote.serviceId !== serviceId) {
      return { valid: false, reason: `Service ID mismatch: quoted ${quote.serviceId}, got ${serviceId}.` };
    }

    if (Number(amount) !== quote.price) {
      return {
        valid:  false,
        reason: `Price mismatch: quoted ${quote.price} units, submitted ${amount} units. ` +
                `Request a new quote if the price has changed.`,
      };
    }

    return { valid: true, quote };
  }

  /**
   * Remove a pending quote (called after successful delivery).
   * @param {string} reqId
   */
  delete(reqId) {
    this._store.delete(reqId);
  }

  /** Clear all pending quotes (for tests). */
  clear() {
    this._store.clear();
  }
}

/**
 * Factory — create a new QuoteStore instance.
 * Each provider gets its own store.
 */
function createQuoteStore() {
  return new QuoteStore();
}

module.exports = { QuoteStore, createQuoteStore };
