"use strict";

const crypto = require("crypto");

/**
 * DeliveryReceipt — canonical record produced by the provider for every
 * successfully paid and delivered service request.
 *
 * The contentHash field ties the delivery to the payment:
 *   contentHash = SHA-256( JSON.stringify(content, sortedKeys) )
 *
 * Any party can recompute the hash from the raw content to independently
 * verify that the delivered data matches what was recorded in the receipt.
 *
 * @param {object} params
 * @param {string}  params.receiptId        - UUID prefixed with "REC-"
 * @param {string}  params.reqId            - The provider-generated request ID echoed back
 * @param {string}  params.serviceId        - Service identifier (e.g. "weather-report")
 * @param {string}  params.providerAddress  - Provider's Ethereum address (or mock identifier)
 * @param {number}  params.amountAuthorized - Amount authorized in budget units
 * @param {number}  params.timestamp        - Unix timestamp (seconds)
 * @param {any}     params.content          - Delivered content (any JSON-serializable value)
 * @param {string}  params.txReference      - Contract tx hash or "LOCAL-<reqId>" in mock mode
 * @returns {DeliveryReceipt}
 */
function makeDeliveryReceipt({
  receiptId,
  reqId,
  serviceId,
  providerAddress,
  amountAuthorized,
  timestamp,
  content,
  txReference,
}) {
  const contentHash = computeContentHash(content);
  return Object.freeze({
    receiptId,
    reqId,
    serviceId,
    providerAddress,
    amountAuthorized,
    timestamp,
    content,
    contentHash,
    txReference,
    deliveryStatus: "DELIVERED",
  });
}

/**
 * Compute a deterministic SHA-256 content hash.
 *
 * Keys are sorted so that JSON.stringify produces a canonical string
 * regardless of insertion order.  Works for any JSON-serializable value.
 *
 * @param {any} content
 * @returns {string}  "sha256:<hex>"
 */
function computeContentHash(content) {
  const canonical = canonicalStringify(content);
  const hash = crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
  return `sha256:${hash}`;
}

/**
 * Produce a canonical (sorted-key) JSON string for deterministic hashing.
 * Handles nested objects and arrays.
 *
 * @param {any} value
 * @returns {string}
 */
function canonicalStringify(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalStringify).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    const sorted = Object.keys(value)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonicalStringify(value[k]));
    return "{" + sorted.join(",") + "}";
  }
  return JSON.stringify(value);
}

/**
 * Payment402Challenge — what the provider sends in a 402 response body.
 * Modelled after x402 semantics for future compatibility.
 *
 * @param {object} params
 * @param {string} params.reqId            - Provider-generated unique request ID (bytes32 hex)
 * @param {string} params.serviceId        - Human-readable service name
 * @param {number} params.price            - Cost in budget units
 * @param {string} params.providerAddress  - Provider address / identifier
 * @param {string} params.paymentEndpoint  - URL to POST payment proof to
 * @param {number} params.expiresAt        - Unix timestamp when this challenge expires
 * @returns {Payment402Challenge}
 */
function makePayment402Challenge({
  reqId,
  serviceId,
  price,
  providerAddress,
  paymentEndpoint,
  expiresAt,
}) {
  return Object.freeze({
    reqId,
    serviceId,
    price,
    providerAddress,
    paymentEndpoint,
    expiresAt,
  });
}

module.exports = {
  makeDeliveryReceipt,
  makePayment402Challenge,
  computeContentHash,
  canonicalStringify,
};
