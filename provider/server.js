/**
 * provider/server.js
 *
 * Mock provider HTTP server.
 *
 * In Phase 1 this runs on localhost and connects to the local Hardhat node.
 * In Phase 2 it would connect to Sepolia via an RPC URL.
 *
 * Configuration (via environment / passed-in options):
 *   PROVIDER_PORT         - HTTP port (default 3001)
 *   CONTRACT_ADDRESS      - Deployed BudgetEnforcer address
 *   HARDHAT_RPC_URL       - JSON-RPC endpoint (default http://127.0.0.1:8545)
 *   PROVIDER_ADDRESS      - Provider's mock identity string
 */

"use strict";

require("dotenv").config();

const express  = require("express");
const { ethers } = require("ethers");

const serviceRouter        = require("./routes/service");
const { ContractVerifier } = require("./verifier");

const DEFAULT_PORT     = parseInt(process.env.PROVIDER_PORT || "3001", 10);
const DEFAULT_RPC_URL  = process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545";
const DEFAULT_PROVIDER_ADDRESS = process.env.PROVIDER_ADDRESS || "MockProvider-v1";

/**
 * Create and start the provider server.
 *
 * @param {object}  opts
 * @param {number}  opts.port              - HTTP port (default: PROVIDER_PORT env or 3001)
 * @param {string}  opts.contractAddress   - Deployed BudgetEnforcer address
 * @param {string}  opts.rpcUrl            - JSON-RPC URL for contract reads
 * @param {string}  opts.providerAddress   - This provider's identifier
 * @param {string}  opts.baseUrl           - Base URL of this server (for 402 challenge)
 * @param {any[]}   opts.auditLog          - Shared in-memory audit log array (optional)
 * @returns {{ app, server, stop }}
 */
function createServer({
  port              = DEFAULT_PORT,
  contractAddress,
  rpcUrl            = DEFAULT_RPC_URL,
  providerAddress   = DEFAULT_PROVIDER_ADDRESS,
  baseUrl,
  auditLog          = [],
  _verifierOverride = null,
} = {}) {
  if (!contractAddress) {
    throw new Error("Provider server requires contractAddress");
  }

  let verifier;
  if (_verifierOverride) {
    verifier = _verifierOverride;
  } else {
    const ethersProvider = new ethers.JsonRpcProvider(rpcUrl);
    verifier = new ContractVerifier(contractAddress, ethersProvider);
  }

  const app = express();
  app.use(express.json());

  // Share dependencies via app.locals (no global state)
  app.locals.verifier        = verifier;
  app.locals.providerAddress = providerAddress;
  app.locals.baseUrl         = baseUrl || `http://localhost:${port}`;
  app.locals.auditLog        = auditLog;

  // Routes
  app.use("/", serviceRouter);

  // Health check
  app.get("/health", (req, res) => {
    res.json({ status: "ok", contractAddress, providerAddress });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Error handler
  app.use((err, req, res, _next) => {
    console.error("[Provider] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  const server = app.listen(port, () => {
    console.log(
      `[Provider] Mock service provider running on port ${port}`
    );
    console.log(`[Provider] Contract: ${contractAddress}`);
    console.log(`[Provider] RPC:      ${rpcUrl}`);
  });

  function stop() {
    return new Promise((resolve) => server.close(resolve));
  }

  return { app, server, stop };
}

// ---------------------------------------------------------------------------
// Standalone entry point (node provider/server.js)
// ---------------------------------------------------------------------------
if (require.main === module) {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error(
      "ERROR: CONTRACT_ADDRESS environment variable is required.\n" +
      "Run the deploy script first: node scripts/deploy.js"
    );
    process.exit(1);
  }

  createServer({ contractAddress });
}

module.exports = { createServer };
