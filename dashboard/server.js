/**
 * dashboard/server.js
 *
 * Human Owner Control Center Dashboard Server
 * ============================================
 * Provides an interactive UI and REST API for the human owner to inspect:
 *   - Real-time on-chain token budget, spent funds, and remaining balance
 *   - Live autonomous transactions with verification status and tx hashes
 *   - Security alerts (blocked overspends, replay attacks, delivery tampering)
 *   - Emergency freeze/unfreeze controls for the AI agent
 */

"use strict";

const express = require("express");
const path = require("path");

function createDashboardServer({
  port = 14300,
  enforcerContract,
  tokenContract,
  indexer,
  ownerSigner,
  agentSigner,
  facilitator,
  marketplaceUrl = "http://localhost:14210",
} = {}) {
  const app = express();
  app.use(express.json());

  // Serve static files
  app.use(express.static(path.join(__dirname, "public")));

  // Mount n8n Orchestrator & x402 Internal Endpoints
  const { createN8nRouter } = require("../orchestrator/n8n-connector");
  const { globalEventBus } = require("../shared/event-bus");
  const { AuditEvent } = require("../shared/events");

  const n8nRouter = createN8nRouter({
    enforcerContract,
    tokenContract,
    agentSigner,
    indexer,
    facilitator,
    marketplaceUrl,
    dashboardUrl: `http://localhost:${port}`,
  });
  app.use(n8nRouter);

  // ---------------------------------------------------------------------------
  // Gateway: Forward /x402 and /registry requests to Marketplace
  // Allows the public tunnel to serve both Dashboard and Marketplace on one URL
  // ---------------------------------------------------------------------------
  const axios = require("axios");
  app.use(["/x402", "/registry"], async (req, res) => {
    try {
      const targetUrl = `${marketplaceUrl}${req.originalUrl}`;
      const forwardResp = await axios({
        method: req.method,
        url: targetUrl,
        headers: {
          ...req.headers,
          host: new URL(marketplaceUrl).host,
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
      return res.status(502).json({ error: "Marketplace gateway error", detail: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // API: Live Real-Time Event Stream (SSE)
  // ---------------------------------------------------------------------------
  app.get("/api/events/stream", globalEventBus.createSSEHandler());

  app.get("/api/events/history", (req, res) => {
    const limit = parseInt(req.query.limit || "50", 10);
    const events = globalEventBus.getHistory(limit);
    res.json({
      success: true,
      count: events.length,
      events,
    });
  });

  // ---------------------------------------------------------------------------
  // API: Live Budget Statistics
  // ---------------------------------------------------------------------------
  app.get("/api/budget", async (req, res) => {
    try {
      if (!enforcerContract) {
        return res.json({
          totalFunded: "0",
          authorizedBudget: "0",
          settledSpend: "0",
          remaining: "0",
          unspentEscrow: "0",
          isFrozen: false,
          utilizationPercent: 0,
        });
      }

      const [totalFunded, authorizedBudget, settledSpend, remaining, unspentEscrow, isFrozen] = await Promise.all([
        enforcerContract.totalFunded(),
        enforcerContract.authorizedBudget(),
        enforcerContract.settledSpend(),
        enforcerContract.remainingBudget(),
        enforcerContract.unspentEscrow(),
        enforcerContract.isFrozen(),
      ]);

      const authNum = Number(authorizedBudget) / 1e6;
      const spentNum = Number(settledSpend) / 1e6;
      const utilization = authNum > 0 ? ((spentNum / authNum) * 100).toFixed(1) : 0;

      res.json({
        totalFunded: (Number(totalFunded) / 1e6).toFixed(2),
        authorizedBudget: authNum.toFixed(2),
        settledSpend: spentNum.toFixed(2),
        remaining: (Number(remaining) / 1e6).toFixed(2),
        unspentEscrow: (Number(unspentEscrow) / 1e6).toFixed(2),
        isFrozen,
        utilizationPercent: Number(utilization),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // API: Transactions & Settlements
  // ---------------------------------------------------------------------------
  app.get("/api/transactions", (req, res) => {
    const txs = indexer ? indexer.getTransactions() : [];
    res.json({ transactions: txs });
  });

  app.get("/api/x402/transactions", (req, res) => {
    const txs = indexer && indexer.getX402Transactions ? indexer.getX402Transactions() : [];
    res.json({ transactions: txs });
  });

  // ---------------------------------------------------------------------------
  // API: Security Events
  // ---------------------------------------------------------------------------
  app.get("/api/security", (req, res) => {
    const alerts = indexer ? indexer.getSecurityAlerts() : [];
    res.json({ alerts });
  });

  // ---------------------------------------------------------------------------
  // API: Owner Control — Freeze / Unfreeze Agent
  // ---------------------------------------------------------------------------
  app.post("/api/freeze", async (req, res) => {
    try {
      const freezeVal = req.body.freeze !== undefined ? req.body.freeze : req.body.frozen;
      const isFrozen = Boolean(freezeVal);
      if (!ownerSigner || !enforcerContract) {
        return res.status(400).json({ error: "No owner signer available" });
      }

      const tx = await enforcerContract.connect(ownerSigner).freezeAgent(isFrozen);
      await tx.wait();

      globalEventBus.emitEvent(isFrozen ? AuditEvent.AGENT_FROZEN : AuditEvent.AGENT_UNFROZEN, {
        isFrozen,
        txHash: tx.hash,
      });

      res.json({ success: true, isFrozen, txHash: tx.hash });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // API: Owner Control — Fund Budget
  // ---------------------------------------------------------------------------
  app.post("/api/fund", async (req, res) => {
    try {
      const { amount } = req.body; // In USDC units e.g. 10.0
      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: "Invalid funding amount" });
      }

      const amountUnits = BigInt(Math.round(Number(amount) * 1e6));
      const enforcerAddress = await enforcerContract.getAddress();

      // Approve & Deposit
      const approveTx = await tokenContract.connect(ownerSigner).approve(enforcerAddress, amountUnits);
      await approveTx.wait();

      const fundTx = await enforcerContract.connect(ownerSigner).fundBudget(amountUnits);
      await fundTx.wait();

      globalEventBus.emitEvent(AuditEvent.BUDGET_FUNDED, {
        amountAtomic: amountUnits.toString(),
        amountUSD: Number(amount).toFixed(2),
        txHash: fundTx.hash,
      });

      res.json({ success: true, fundedAmount: amount, txHash: fundTx.hash });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // API: Provider Directory
  // ---------------------------------------------------------------------------
  app.get(["/api/providers", "/registry/discover"], (req, res) => {
    try {
      const { listProviders } = require("../marketplace/providers");
      const providers = listProviders();
      res.json({ providers, count: providers.length });
    } catch (_) {
      res.json({ providers: [], count: 0 });
    }
  });

  // ---------------------------------------------------------------------------
  // API: Services Marketplace & Publishing
  // ---------------------------------------------------------------------------
  app.get("/api/services", (req, res) => {
    try {
      const { listAllServices } = require("../marketplace/providers");
      const services = listAllServices();
      res.json({ success: true, count: services.length, services });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message, services: [] });
    }
  });

  app.post("/api/services", (req, res) => {
    try {
      const { publishService } = require("../marketplace/providers");
      const published = publishService(req.body);

      globalEventBus.emitEvent(AuditEvent.SERVICE_PUBLISHED, {
        serviceId: published.serviceId,
        name: published.name,
        providerId: published.providerId,
        providerName: published.providerName,
        price: published.price,
        quality: published.quality,
        latency: published.latency,
        category: published.category,
        endpoint: published.endpoint,
        status: published.status,
      });

      res.status(201).json(published);
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.get("/api/services/:serviceId", (req, res) => {
    try {
      const { listAllServices } = require("../marketplace/providers");
      const services = listAllServices();
      const match = services.find((s) => s.serviceId === req.params.serviceId);
      if (!match) return res.status(404).json({ error: "Service not found" });
      res.json({ success: true, service: match });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // API: System Configuration
  // ---------------------------------------------------------------------------
  app.get("/api/config", async (req, res) => {
    try {
      const enforcerAddress = enforcerContract ? await enforcerContract.getAddress() : "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
      const tokenAddress = tokenContract ? await tokenContract.getAddress() : "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      const ownerAddress = ownerSigner ? await ownerSigner.getAddress() : "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
      const agentAddress = enforcerContract ? await enforcerContract.agent() : "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
      res.json({
        enforcerAddress,
        tokenAddress,
        ownerAddress,
        agentAddress,
        chainId: 31337,
        network: "Local Hardhat EVM",
        networkCaip2: "eip155:31337",
        sepoliaChainId: 11155111,
        sepoliaCaip2: "eip155:11155111",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const server = app.listen(port, () => {
    console.log(`[Dashboard] Owner Control Center live on http://localhost:${port}`);
  });

  function stop() {
    return new Promise((resolve) => server.close(resolve));
  }

  return { app, server, stop };
}

module.exports = { createDashboardServer };

if (require.main === module) {
  const port = process.env.PORT || 14300;
  createDashboardServer({ port });
}
