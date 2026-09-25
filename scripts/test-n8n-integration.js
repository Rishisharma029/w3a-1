"use strict";

const { ethers } = require("hardhat");
const assert = require("assert");
const axios = require("axios");

const { PaymentFacilitator } = require("../facilitator/facilitator");
const { createTokenMarketplace } = require("../marketplace/token-server");
const { EventIndexer } = require("../indexer/indexer");
const { createDashboardServer } = require("../dashboard/server");

const MARKETPLACE_PORT = 14218;
const DASHBOARD_PORT = 14308;
const DECIMALS = 6;
const ONE_USDC = 10n ** BigInt(DECIMALS);

async function runTests() {
  console.log("=== Starting W3A-1 n8n Integration End-to-End Tests ===");

  const [ownerSigner, agentSigner, providerSigner] = await ethers.getSigners();

  // 1. Deploy contracts
  console.log("\n1. Deploying MockUSDC & TokenBudgetEnforcer...");
  const TokenFactory = await ethers.getContractFactory("MockUSDC");
  const token = await TokenFactory.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  const EnforcerFactory = await ethers.getContractFactory("TokenBudgetEnforcer");
  const enforcer = await EnforcerFactory.deploy(tokenAddress, ownerSigner.address, agentSigner.address);
  await enforcer.waitForDeployment();
  const enforcerAddress = await enforcer.getAddress();

  // Fund budget: $30.00 total funded, initial authorized budget = $30.00
  const deposit = 30n * ONE_USDC;
  await token.connect(ownerSigner).approve(enforcerAddress, deposit);
  await enforcer.connect(ownerSigner).fundBudget(deposit);

  // 2. Start services
  console.log("\n2. Initializing Facilitator, Indexer, Marketplace, and Dashboard...");
  const facilitator = new PaymentFacilitator({
    enforcerAddress,
    enforcerContract: enforcer,
    settlerSigner: ownerSigner,
    chainId: 31337,
    tokenAddress,
  });

  const indexer = new EventIndexer({ contract: enforcer });
  await indexer.start();

  const marketplace = createTokenMarketplace({
    port: MARKETPLACE_PORT,
    facilitator,
    tokenAddress,
    providerWalletAddress: providerSigner.address,
    agentSigner,
    enforcerContract: enforcer,
    indexer,
  });

  const dashboard = createDashboardServer({
    port: DASHBOARD_PORT,
    enforcerContract: enforcer,
    tokenContract: token,
    indexer,
    ownerSigner,
    agentSigner,
    facilitator,
    marketplaceUrl: `http://localhost:${MARKETPLACE_PORT}`,
  });

  await new Promise((r) => setTimeout(r, 600));

  const apiBase = `http://localhost:${DASHBOARD_PORT}`;

  // 3. Test n8n Status Endpoint
  console.log("\n3. Testing GET /api/orchestrate/n8n/status...");
  const statusRes = await axios.get(`${apiBase}/api/orchestrate/n8n/status`);
  assert.strictEqual(statusRes.status, 200);
  assert.strictEqual(statusRes.data.connected, true);
  assert.strictEqual(statusRes.data.workflowId, "cveIFBZn9aM1CNLF");
  console.log("   ✔ Status verified (Workflow: cveIFBZn9aM1CNLF)");

  // 4. Test Scenario 1: Normal Autonomous Purchase ($4.00 Alpha Translate)
  console.log("\n4. Testing Scenario 1: Normal Autonomous Purchase via n8n Orchestrator...");
  const budgetBefore = await enforcer.remainingBudget();
  console.log(`   Budget before: $${Number(budgetBefore) / 1e6}`);

  const purchaseRes = await axios.post(`${apiBase}/api/orchestrate/n8n`, {
    providerId: "alpha-translate",
    serviceId: "text-translate",
    amountAtomic: "4000000",
    text: "Testing full n8n purchase pipeline",
    targetLang: "es",
  });

  assert.strictEqual(purchaseRes.status, 200);
  assert.strictEqual(purchaseRes.data.success, true);
  assert.strictEqual(purchaseRes.data.trace.status, "SUCCESS");
  assert.strictEqual(purchaseRes.data.trace.deliveryStatus, "VERIFIED");
  assert.ok(purchaseRes.data.trace.txHash.startsWith("0x"), "Should have valid EVM txHash");
  console.log(`   ✔ Purchase successful! TxHash: ${purchaseRes.data.trace.txHash}`);

  const budgetAfter = await enforcer.remainingBudget();
  console.log(`   Budget after: $${Number(budgetAfter) / 1e6}`);
  assert.strictEqual(Number(budgetBefore - budgetAfter), 4_000_000, "Should have spent exactly $4.00 USDC");

  // 5. Test Scenario 2: Overspend Protocol Defense
  console.log("\n5. Testing Scenario 2: Overspend Defense ($999,999 USDC)...");
  const overspendRes = await axios.post(`${apiBase}/api/orchestrate/n8n`, {
    providerId: "alpha-translate",
    simulateOverspend: true,
  });

  assert.strictEqual(overspendRes.status, 200);
  assert.strictEqual(overspendRes.data.success, false);
  assert.strictEqual(overspendRes.data.trace.status, "REJECTED");
  assert.strictEqual(overspendRes.data.trace.reason, "OVERSPEND");
  console.log("   ✔ Overspend physically blocked by backend contract check (Reason: OVERSPEND)");

  // 6. Test Scenario 3: Replay Protection Defense
  console.log("\n6. Testing Scenario 3: Anti-Replay Defense...");
  const replayRes = await axios.post(`${apiBase}/api/orchestrate/n8n`, {
    providerId: "alpha-translate",
    simulateReplay: true,
  });

  assert.strictEqual(replayRes.status, 200);
  assert.strictEqual(replayRes.data.success, false);
  assert.strictEqual(replayRes.data.trace.status, "REJECTED");
  assert.strictEqual(replayRes.data.trace.reason, "REPLAY");
  console.log("   ✔ Replay attack physically blocked by on-chain nonce state check (Reason: REPLAY)");

  // 7. Test Scenario 4: Delivery Tamper Defense
  console.log("\n7. Testing Scenario 4: Delivery Tamper Verification...");
  const tamperRes = await axios.post(`${apiBase}/api/orchestrate/n8n`, {
    providerId: "alpha-translate",
    simulateTamper: true,
  });

  assert.strictEqual(tamperRes.status, 200);
  assert.strictEqual(tamperRes.data.trace.deliveryStatus, "TAMPERED");
  console.log("   ✔ Tampered delivery correctly flagged (DeliveryStatus: TAMPERED)");

  // 8. Test Scenario 5: Emergency Freeze Defense
  console.log("\n8. Testing Scenario 5: Emergency Freeze Defense...");
  // Owner freezes agent
  await enforcer.connect(ownerSigner).freezeAgent(true);
  const frozenRes = await axios.post(`${apiBase}/api/orchestrate/n8n`, {
    providerId: "alpha-translate",
  });

  assert.strictEqual(frozenRes.status, 200);
  assert.strictEqual(frozenRes.data.success, false);
  assert.strictEqual(frozenRes.data.trace.status, "REJECTED");
  assert.strictEqual(frozenRes.data.trace.reason, "AGENT_FROZEN");
  console.log("   ✔ Frozen agent signing rejected immediately (Reason: AGENT_FROZEN)");

  // Unfreeze for cleanup
  await enforcer.connect(ownerSigner).freezeAgent(false);

  // 9. Verify Audit Events
  console.log("\n9. Testing GET /api/audit-events...");
  const auditRes = await axios.get(`${apiBase}/api/audit-events`);
  assert.strictEqual(auditRes.status, 200);
  assert.ok(auditRes.data.events.length >= 4, "Should have recorded multiple audit events");
  console.log(`   ✔ Audit log contains ${auditRes.data.events.length} verified events`);

  // 10. Direct /internal/x402/confirm verification
  console.log("\n10. Testing POST /internal/x402/confirm...");
  const confirmRes = await axios.post(`${apiBase}/internal/x402/confirm`, {
    requestId: purchaseRes.data.trace.steps[2].reqId,
  });
  assert.strictEqual(confirmRes.status, 200);
  assert.strictEqual(confirmRes.data.settled, true);
  console.log(`   ✔ /internal/x402/confirm returned settled: true with txHash: ${confirmRes.data.txHash}`);

  console.log("\n=================================================================");
  console.log("ALL 10 n8n WORKFLOW INTEGRATION CHECKS PASSED PERFECTLY! ");
  console.log("=================================================================");

  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
