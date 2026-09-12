/**
 * marketplace/server.js
 *
 * Multi-provider marketplace server.
 *
 * Routes:
 *   GET  /registry/discover            - List all providers (with filters)
 *   GET  /registry/discover?serviceType=X&minQuality=0.9&maxPrice=5
 *   GET  /providers/:providerId/service?serviceId=Y  → 402
 *   POST /providers/:providerId/deliver               → deliver
 *   GET  /providers/:providerId/receipts              → audit
 *   GET  /health
 *
 * Each provider is completely isolated:
 *   - Its own ReceiptStore (no cross-provider leakage of reqIds)
 *   - Its own QuoteStore  (stale-quote protection per provider)
 *   - Its own tamperNext flag (for demo delivery-tampering scenario)
 *
 * @param {object} opts
 * @param {number} opts.port
 * @param {string} opts.contractAddress
 * @param {string} opts.rpcUrl
 * @param {string} opts.baseUrl
 * @param {object[]} opts.auditLog           - Shared audit log array
 * @param {object}  opts._verifierOverride   - (TEST ONLY) in-process verifier
 * @returns {{ app, server, stop, tamperNextFor }}
 */

"use strict";

require("dotenv").config();

const express  = require("express");
const { ethers } = require("ethers");

const { PROVIDERS, listProviders, providerToDiscovery } = require("./providers");
const { createProviderRouter }  = require("./provider-router");
const { createReceiptStore }    = require("../provider/receipt-store");
const { createQuoteStore }      = require("./quote-store");
const { ContractVerifier }      = require("../provider/verifier");

const DEFAULT_PORT    = parseInt(process.env.MARKETPLACE_PORT || "3002", 10);
const DEFAULT_RPC_URL = process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545";

function createMarketplace({
  port              = DEFAULT_PORT,
  contractAddress,
  rpcUrl            = DEFAULT_RPC_URL,
  baseUrl,
  auditLog          = [],
  _verifierOverride = null,
} = {}) {
  if (!contractAddress) throw new Error("Marketplace requires contractAddress");

  // ── Build verifier ────────────────────────────────────────────────────────
  let verifier;
  if (_verifierOverride) {
    verifier = _verifierOverride;
  } else {
    verifier = new ContractVerifier(
      contractAddress,
      new ethers.JsonRpcProvider(rpcUrl)
    );
  }

  // ── Per-provider state ────────────────────────────────────────────────────
  // Each provider gets isolated stores and a tamper flag.
  const providerState = {};
  for (const p of PROVIDERS) {
    providerState[p.providerId] = {
      receiptStore: createReceiptStore(),
      quoteStore:   createQuoteStore(),
      tamperNext:   { value: false },
    };
  }

  const app = express();
  app.use(express.json());

  const resolvedBaseUrl = baseUrl || `http://localhost:${port}`;
  app.locals.baseUrl  = resolvedBaseUrl;
  app.locals.auditLog = auditLog;

  // ── Registry — service discovery ─────────────────────────────────────────
  app.get("/registry/discover", (req, res) => {
    const { serviceType, minQuality, maxPrice } = req.query;

    const candidates = listProviders({
      serviceType: serviceType || undefined,
      minQuality:  minQuality  ? parseFloat(minQuality)  : undefined,
      maxPrice:    maxPrice    ? parseFloat(maxPrice)    : undefined,
    });

    res.json({
      count:     candidates.length,
      providers: candidates.map(providerToDiscovery),
    });
  });

  // ── Per-provider routes ───────────────────────────────────────────────────
  for (const providerConfig of PROVIDERS) {
    const { providerId } = providerConfig;
    const state = providerState[providerId];

    const router = createProviderRouter({
      providerConfig,
      verifier,
      receiptStore:   state.receiptStore,
      quoteStore:     state.quoteStore,
      sharedAuditLog: auditLog,
      tamperNext:     state.tamperNext,
    });

    app.use(`/providers/${providerId}`, router);
  }

  // ── Health ────────────────────────────────────────────────────────────────
  app.get("/health", (req, res) => {
    res.json({
      status:          "ok",
      contractAddress,
      providerCount:   PROVIDERS.length,
      providers:       PROVIDERS.map((p) => p.providerId),
    });
  });

  // ── 404 ──────────────────────────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Forward /api/orchestrate to Dashboard orchestrator on port 14300
  const axios = require("axios");
  app.use("/api/orchestrate", async (req, res) => {
    try {
      const targetUrl = `http://localhost:14300${req.originalUrl}`;
      const forwardResp = await axios({
        method: req.method,
        url: targetUrl,
        headers: {
          ...req.headers,
          host: "localhost:14300",
        },
        data: req.body,
        validateStatus: () => true,
      });

      res.status(forwardResp.status);
      for (const [k, v] of Object.entries(forwardResp.headers)) {
        res.setHeader(k, v);
      }
      return res.send(forwardResp.data);
    } catch (err) {
      return res.status(502).json({ error: "Dashboard orchestrator gateway error", detail: err.message });
    }
  });

  // ── Error handler ─────────────────────────────────────────────────────────
  app.use((err, req, res, _next) => {
    console.error("[Marketplace] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  const server = app.listen(port, () => {
    console.log(`[Marketplace] Running on port ${port}`);
    console.log(`[Marketplace] Contract: ${contractAddress}`);
    console.log(`[Marketplace] Providers: ${PROVIDERS.map((p) => p.providerId).join(", ")}`);
  });

  /**
   * Make the next delivery from a specific provider return tampered content.
   * Used exclusively for the delivery-tampering demo/test scenario.
   * @param {string} providerId
   */
  function tamperNextFor(providerId) {
    if (!providerState[providerId]) {
      throw new Error(`Unknown provider: ${providerId}`);
    }
    providerState[providerId].tamperNext.value = true;
  }

  /**
   * Clear all stores for a provider (used in tests).
   * @param {string} providerId
   */
  function clearProvider(providerId) {
    if (providerState[providerId]) {
      providerState[providerId].receiptStore.clear();
      providerState[providerId].quoteStore.clear();
      providerState[providerId].tamperNext.value = false;
    }
  }

  /**
   * Clear all provider stores (used in tests).
   */
  function clearAll() {
    for (const id of Object.keys(providerState)) clearProvider(id);
  }

  /**
   * Set a provider's availability (0 = unavailable, 1 = available).
   * Used in tests for provider-failure / fallback scenarios.
   */
  function setProviderAvailability(providerId, value) {
    const p = PROVIDERS.find((x) => x.providerId === providerId);
    if (p) p.availability = value;
  }

  function stop() {
    return new Promise((resolve) => server.close(resolve));
  }

  return { app, server, stop, tamperNextFor, clearAll, clearProvider, setProviderAvailability };
}

// ---------------------------------------------------------------------------
// Standalone entry point
// ---------------------------------------------------------------------------
if (require.main === module) {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("ERROR: CONTRACT_ADDRESS env var required.");
    process.exit(1);
  }
  createMarketplace({ contractAddress });
}

module.exports = { createMarketplace };
