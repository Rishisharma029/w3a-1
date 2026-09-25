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
  let verifier;
  if (_verifierOverride) {
    verifier = _verifierOverride;
  } else {
    verifier = new ContractVerifier(
      contractAddress,
      new ethers.JsonRpcProvider(rpcUrl)
    );
  }
  const BASE_PROVIDER_IDS = new Set([
    "alpha-translate",
    "beta-translate",
    "gamma-translate",
    "delta-compute",
    "epsilon-vision",
  ]);
  const marketProviders = PROVIDERS.filter((p) => BASE_PROVIDER_IDS.has(p.providerId));
  // Each provider gets isolated stores and a tamper flag.
  const providerState = {};
  for (const p of marketProviders) {
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
  app.get("/registry/discover", (req, res) => {
    const { serviceType, minQuality, maxPrice } = req.query;

    const candidates = listProviders({
      serviceType: serviceType || undefined,
      minQuality:  minQuality  ? parseFloat(minQuality)  : undefined,
      maxPrice:    maxPrice    ? parseFloat(maxPrice)    : undefined,
    }, marketProviders);

    res.json({
      count:     candidates.length,
      providers: candidates.map(providerToDiscovery),
    });
  });
  for (const providerConfig of marketProviders) {
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
  app.get("/health", (req, res) => {
    res.json({
      status:          "ok",
      contractAddress,
      providerCount:   marketProviders.length,
      providers:       marketProviders.map((p) => p.providerId),
    });
  });
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
  app.use((err, req, res, _next) => {
    console.error("[Marketplace] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  const server = app.listen(port, () => {
    console.log(`[Marketplace] Running on port ${port}`);
    console.log(`[Marketplace] Contract: ${contractAddress}`);
    console.log(`[Marketplace] Providers: ${PROVIDERS.map((p) => p.providerId).join(", ")}`);
  });

  function tamperNextFor(providerId) {
    if (!providerState[providerId]) throw new Error(`Unknown provider: ${providerId}`);
    providerState[providerId].tamperNext.value = true;
  }

  function clearProvider(providerId) {
    if (providerState[providerId]) {
      providerState[providerId].receiptStore.clear();
      providerState[providerId].quoteStore.clear();
      providerState[providerId].tamperNext.value = false;
    }
  }

  function clearAll() {
    for (const id of Object.keys(providerState)) clearProvider(id);
  }

  function setProviderAvailability(providerId, value) {
    const p = PROVIDERS.find((x) => x.providerId === providerId);
    if (p) p.availability = value;
  }

  function stop() {
    return new Promise((resolve) => server.close(resolve));
  }

  return { app, server, stop, tamperNextFor, clearAll, clearProvider, setProviderAvailability };
}

// Standalone entry point
if (require.main === module) {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("ERROR: CONTRACT_ADDRESS env var required.");
    process.exit(1);
  }
  createMarketplace({ contractAddress });
}

module.exports = { createMarketplace };
