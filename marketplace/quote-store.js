"use strict";

class QuoteStore {
  constructor() {
    this._store = new Map();
  }

  set(reqId, quote) {
    this._store.set(reqId, quote);
  }

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

  delete(reqId) {
    this._store.delete(reqId);
  }

  clear() {
    this._store.clear();
  }
}

function createQuoteStore() {
  return new QuoteStore();
}

module.exports = { QuoteStore, createQuoteStore };
