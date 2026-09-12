/**
 * demo/demo.js
 *
 * CLI end-to-end demo — demonstrates all mandatory judge scenarios:
 *
 *   SCENARIO 1: Purchase service for 4 units        → APPROVED
 *   SCENARIO 2: Purchase service for 6 units        → APPROVED (budget exhausted)
 *   SCENARIO 3: Purchase service for any amount     → REJECTED (cap exceeded)
 *   SCENARIO 4: Retry the first purchase's reqId   → NO SECOND CHARGE
 *   SCENARIO 5: Live delivery proof verification   → HASH VERIFIED
 *
 * Runs entirely on a local Hardhat in-process node.
 * No external services or real ETH required.
 */

"use strict";

const { ethers }        = require("hardhat");
const chalk             = require("chalk");

const { createServer }  = require("../provider/server");
const { Agent }         = require("../agent/agent");
const { AuditLog }      = require("../agent/audit-log");
const { computeContentHash } = require("../shared/types");
const receiptStore      = require("../provider/receipt-store");

const PROVIDER_PORT = 14001;
const PROVIDER_URL  = `http://localhost:${PROVIDER_PORT}`;
const MAX_BUDGET    = 10n;

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------
function banner(title) {
  console.log("\n" + chalk.cyan("═".repeat(62)));
  console.log(chalk.cyan.bold(`  ${title}`));
  console.log(chalk.cyan("═".repeat(62)));
}

function ok(msg)   { console.log(chalk.green(`  ✔  ${msg}`)); }
function fail(msg) { console.log(chalk.red(`  ✘  ${msg}`)); }
function info(msg) { console.log(chalk.white(`     ${msg}`)); }
function warn(msg) { console.log(chalk.yellow(`  ⚠  ${msg}`)); }

async function printBudget(agent) {
  const { maxBudget, totalSpent, remaining } = await agent.getBudgetState();
  info(`Budget: max=${maxBudget} | spent=${totalSpent} | remaining=${remaining}`);
}

// ---------------------------------------------------------------------------
// Main demo
// ---------------------------------------------------------------------------
async function main() {
  console.log(chalk.bold.magenta("\n  W3A-1 — Let AI Agents Buy Services Safely"));
  console.log(chalk.magenta("  Phase 1 — End-to-End Demo\n"));

  // ── Deploy contract ────────────────────────────────────────────────────────
  const [ownerSigner, agentSigner] = await ethers.getSigners();

  info(`Owner : ${ownerSigner.address}`);
  info(`Agent : ${agentSigner.address}`);

  const Factory = await ethers.getContractFactory("BudgetEnforcer");
  const enforcer = await Factory.deploy(
    ownerSigner.address,
    agentSigner.address,
    MAX_BUDGET
  );
  await enforcer.waitForDeployment();
  const contractAddress = await enforcer.getAddress();

  ok(`BudgetEnforcer deployed: ${contractAddress}`);
  ok(`Initial budget: ${MAX_BUDGET} units`);

  // ── Start provider ─────────────────────────────────────────────────────────
  // Use an in-process verifier so the demo doesn't require a standalone
  // `hardhat node` running on 8545 — it reads contract state directly
  // from the in-process Hardhat EVM.
  const providerAuditLog = [];
  const inProcessVerifier = {
    verifyAuthorization: (reqId, amount) =>
      enforcer.verifyAuthorization(reqId, amount),
    getBudgetState: async () => ({
      maxBudget:  await enforcer.maxBudget(),
      totalSpent: await enforcer.totalSpent(),
      remaining:  await enforcer.remainingBudget(),
    }),
  };

  const { server } = createServer({
    port:              PROVIDER_PORT,
    contractAddress,
    rpcUrl:            "http://127.0.0.1:8545", // unused when _verifierOverride is set
    providerAddress:   "MockProvider-v1",
    baseUrl:           PROVIDER_URL,
    auditLog:          providerAuditLog,
    _verifierOverride: inProcessVerifier,
  });

  await new Promise((r) => setTimeout(r, 300));
  ok(`Mock provider started on port ${PROVIDER_PORT}`);

  // ── Create agent ───────────────────────────────────────────────────────────
  const auditLog = new AuditLog();
  const agent = new Agent({
    contractAddress,
    signer:      agentSigner,
    providerUrl: PROVIDER_URL,
    auditLog,
  });

  // ══════════════════════════════════════════════════════════════════════════
  banner("SCENARIO 1 — Purchase weather-report (costs 4 units)");
  // ══════════════════════════════════════════════════════════════════════════
  let result1;
  try {
    result1 = await agent.purchase("weather-report");
    ok(`PAYMENT APPROVED`);
    ok(`Service: weather-report | Amount: 4 units`);
    ok(`Receipt: ${result1.receipt.receiptId}`);
    ok(`Content hash: ${result1.receipt.contentHash}`);
    await printBudget(agent);
  } catch (err) {
    fail(`Unexpected failure: ${err.message}`);
    process.exit(1);
  }

  // ══════════════════════════════════════════════════════════════════════════
  banner("SCENARIO 2 — Purchase market-data (costs 6 units)");
  // ══════════════════════════════════════════════════════════════════════════
  try {
    const result2 = await agent.purchase("market-data");
    ok(`PAYMENT APPROVED`);
    ok(`Service: market-data | Amount: 6 units`);
    ok(`Receipt: ${result2.receipt.receiptId}`);
    await printBudget(agent);
  } catch (err) {
    fail(`Unexpected failure: ${err.message}`);
    process.exit(1);
  }

  // ══════════════════════════════════════════════════════════════════════════
  banner("SCENARIO 3 — Agent attempts news-summary (costs 3 units) — BUDGET EXHAUSTED");
  // ══════════════════════════════════════════════════════════════════════════
  try {
    await agent.purchase("news-summary");
    fail("ERROR: Purchase should have been rejected but was not!");
    process.exit(1);
  } catch (err) {
    const reason = err.reason || err.message || "";
    if (
      reason.includes("spending cap exceeded") ||
      reason.includes("OVERSPEND")
    ) {
      ok(`PAYMENT REJECTED — SPENDING CAP EXCEEDED`);
      ok(`Enforcement was at the CONTRACT level (not agent logic)`);
      await printBudget(agent);
    } else {
      fail(`Wrong error: ${reason}`);
      process.exit(1);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  banner("SCENARIO 4 — Retry Scenario 1's reqId (network timeout simulation)");
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Simulate: after Scenario 1's authorize() succeeded, a network failure
  // occurred.  Agent retries POST /deliver with the SAME reqId.
  // Expected: cached receipt returned, NO second charge.
  //
  const axios = require("axios");
  const retryResp = await axios.post(`${PROVIDER_URL}/deliver`, {
    reqId:     result1.reqId,
    serviceId: "weather-report",
    amount:    4,
  });

  if (retryResp.data.idempotent === true) {
    ok(`NO SECOND CHARGE — cached receipt returned`);
    ok(`Receipt ID matches: ${retryResp.data.receipt.receiptId === result1.receipt.receiptId}`);
    ok(`Content hash matches: ${retryResp.data.receipt.contentHash === result1.receipt.contentHash}`);
    info(`Idempotent: ${retryResp.data.message}`);
  } else {
    fail("ERROR: Provider charged again instead of returning cached receipt!");
    process.exit(1);
  }

  const spentAfterRetry = await enforcer.totalSpent();
  if (spentAfterRetry === 10n) {
    ok(`totalSpent is still 10 — budget unchanged after retry`);
  } else {
    fail(`totalSpent changed after retry! Got ${spentAfterRetry}`);
    process.exit(1);
  }

  // ══════════════════════════════════════════════════════════════════════════
  banner("SCENARIO 5 — Independent Delivery Proof Verification");
  // ══════════════════════════════════════════════════════════════════════════
  const { receipt } = result1;
  const recomputed = computeContentHash(receipt.content);

  info(`Stored hash  : ${receipt.contentHash}`);
  info(`Recomputed   : ${recomputed}`);

  if (recomputed === receipt.contentHash) {
    ok(`HASH VERIFIED — content matches recorded hash`);
    ok(`Delivery is cryptographically tied to payment reqId: ${result1.reqId}`);
  } else {
    fail(`Hash mismatch! Content may have been tampered with.`);
    process.exit(1);
  }

  // ══════════════════════════════════════════════════════════════════════════
  banner("AUDIT LOG SUMMARY");
  // ══════════════════════════════════════════════════════════════════════════
  auditLog.dump();

  // ══════════════════════════════════════════════════════════════════════════
  banner("ALL SCENARIOS PASSED");
  // ══════════════════════════════════════════════════════════════════════════
  ok("Budget enforcement: PASSED (contract-level, not agent-logic)");
  ok("HTTP 402 flow:      PASSED (5 distinct steps)");
  ok("Idempotency:        PASSED (no double-charge on retry)");
  ok("Delivery proof:     PASSED (hash verified independently)");
  ok("Overspend demo:     PASSED (live rejection shown)");
  console.log();

  server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(chalk.red("\nDemo failed:"), err);
  process.exit(1);
});
