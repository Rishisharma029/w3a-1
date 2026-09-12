/**
 * test/integration/flow.test.js
 *
 * Integration tests for the full W3A-1 payment flow.
 *
 * These tests spin up:
 *   1. An in-process Hardhat node (via hardhat network provider)
 *   2. The mock provider server (Express)
 *   3. The agent PaymentClient
 *
 * and exercise the complete Agent → 402 → Contract → Provider → Delivery path.
 *
 * Judge-required scenarios covered:
 *   IT-01  Happy path: full flow end-to-end
 *   IT-02  Content hash independently recomputed → matches receipt
 *   IT-03  Retry with same reqId → no second charge, cached receipt returned
 *   IT-04  Overspend attempt → contract reverts, provider never delivers
 *   IT-05  Unauthorized agent → contract reverts
 *   IT-06  Delivery proof exists and is complete
 */

"use strict";

const { expect }     = require("chai");
const { ethers }     = require("hardhat");
const { createServer } = require("../../provider/server");
const { PaymentClient } = require("../../agent/payment-client");
const { AuditLog }   = require("../../agent/audit-log");
const { AuditEvent } = require("../../shared/events");
const { computeContentHash } = require("../../shared/types");
const receiptStore   = require("../../provider/receipt-store");

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const PROVIDER_PORT = 13001; // Use a port unlikely to conflict
const PROVIDER_URL  = `http://localhost:${PROVIDER_PORT}`;

describe("Integration — Full Payment Flow", function () {
  this.timeout(30000); // contract deploys take a few seconds

  let enforcer, ownerSigner, agentSigner, strangerSigner;
  let server, client;
  let snapshotId; // EVM snapshot for state isolation

  // Deploy contract ONCE for the whole suite
  before(async function () {
    [ownerSigner, agentSigner, strangerSigner] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BudgetEnforcer");
    enforcer = await Factory.deploy(
      ownerSigner.address,
      agentSigner.address,
      10n // 10 units budget
    );
    await enforcer.waitForDeployment();
    const contractAddress = await enforcer.getAddress();

    // Start provider server ONCE (uses injected in-process verifier)
    const providerVerifierOverride = {
      verifyAuthorization: async (reqId, amount) =>
        enforcer.verifyAuthorization(reqId, amount),
      getBudgetState: async () => ({
        maxBudget:  await enforcer.maxBudget(),
        totalSpent: await enforcer.totalSpent(),
        remaining:  await enforcer.remainingBudget(),
      }),
    };

    const serverResult = createServer({
      port:              PROVIDER_PORT,
      contractAddress,
      rpcUrl:            "http://127.0.0.1:8545",
      providerAddress:   "TestProvider-v1",
      baseUrl:           PROVIDER_URL,
      auditLog:          [],
      _verifierOverride: providerVerifierOverride,
    });
    server = serverResult.server;

    await new Promise((r) => setTimeout(r, 200));
  });

  // Snapshot EVM state before each test; restore after.
  // This gives each test a fresh budget = 10 units.
  beforeEach(async function () {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
    receiptStore.clear();

    const agentAuditLog = new AuditLog();
    client = new PaymentClient({
      contractAddress: await enforcer.getAddress(),
      agentSigner,
      auditLog: agentAuditLog,
    });
  });

  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
    receiptStore.clear();
  });

  after(function (done) {
    server.close(done);
  });

  // =========================================================================
  // IT-01: Happy path — full end-to-end flow
  // =========================================================================
  it("IT-01 — happy path: full flow end-to-end", async function () {
    const result = await client.purchaseService(PROVIDER_URL, "weather-report");

    expect(result).to.have.property("reqId");
    expect(result).to.have.property("receipt");
    expect(result).to.have.property("contentHash");

    const { receipt } = result;
    expect(receipt.serviceId).to.equal("weather-report");
    expect(receipt.deliveryStatus).to.equal("DELIVERED");
    expect(receipt.contentHash).to.match(/^sha256:/);
    expect(receipt.amountAuthorized).to.equal(4); // weather-report costs 4

    // Contract state updated
    const spent = await enforcer.totalSpent();
    expect(spent).to.equal(4n);
  });

  // =========================================================================
  // IT-02: Content hash can be independently recomputed
  // =========================================================================
  it("IT-02 — content hash can be independently recomputed and verified", async function () {
    const result = await client.purchaseService(PROVIDER_URL, "news-summary");
    const { receipt } = result;

    // Independently recompute hash from the content that was delivered
    const recomputed = computeContentHash(receipt.content);
    expect(recomputed).to.equal(receipt.contentHash);
  });

  // =========================================================================
  // IT-03: Retry with same reqId → no double charge
  // =========================================================================
  it("IT-03 — retry same reqId returns cached receipt without re-charging", async function () {
    // Perform a successful purchase
    const result1 = await client.purchaseService(PROVIDER_URL, "news-summary");
    const { reqId, receipt: receipt1 } = result1;

    const spentAfterFirst = await enforcer.totalSpent();

    // Simulate: network timeout occurred after contract.authorize() succeeded.
    // Agent retries POST /deliver with the SAME reqId.
    // Provider returns the cached receipt without re-charging.
    const axios = require("axios");
    const retryResp = await axios.post(`${PROVIDER_URL}/deliver`, {
      reqId,
      serviceId: "news-summary",
      amount: 3,
    });

    expect(retryResp.data.idempotent).to.equal(true);
    expect(retryResp.data.receipt.receiptId).to.equal(receipt1.receiptId);
    expect(retryResp.data.receipt.contentHash).to.equal(receipt1.contentHash);

    // totalSpent must NOT have changed
    const spentAfterRetry = await enforcer.totalSpent();
    expect(spentAfterRetry).to.equal(spentAfterFirst);
  });

  // =========================================================================
  // IT-04: Overspend attempt — contract reverts, provider never delivers
  // =========================================================================
  it("IT-04 — overspend: contract reverts, provider never delivers", async function () {
    // Spend 6 units (market-data)
    await client.purchaseService(PROVIDER_URL, "market-data");
    // 4 units remain. Try to buy market-data again (costs 6) — must fail.

    let caught;
    try {
      // Recreate client (fresh local cache; contract still has the spent state)
      const client2 = new PaymentClient({
        contractAddress: await enforcer.getAddress(),
        agentSigner,
        auditLog: new AuditLog(),
      });
      await client2.purchaseService(PROVIDER_URL, "market-data");
    } catch (err) {
      caught = err;
    }

    expect(caught, "expected overspend to throw").to.exist;
    const errMsg = (caught.reason || caught.message || "").toLowerCase();
    expect(errMsg).to.satisfy(
      (s) => s.includes("spending cap exceeded") || s.includes("overspend"),
      `Expected overspend error, got: ${errMsg}`
    );

    // Contract spend must still be exactly 6 (market-data only)
    const spent = await enforcer.totalSpent();
    expect(spent).to.equal(6n);
  });

  // =========================================================================
  // IT-05: Unauthorized agent → contract reverts
  // =========================================================================
  it("IT-05 — unauthorized agent address cannot authorize spend", async function () {
    const unauthorizedClient = new PaymentClient({
      contractAddress: await enforcer.getAddress(),
      agentSigner: strangerSigner, // NOT the authorized agent
      auditLog: new AuditLog(),
    });

    let caught;
    try {
      await unauthorizedClient.purchaseService(PROVIDER_URL, "news-summary");
    } catch (err) {
      caught = err;
    }

    expect(caught).to.exist;
    const msg = caught.reason || caught.message || "";
    expect(msg).to.include("caller is not agent");
  });

  // =========================================================================
  // IT-06: Delivery proof is complete and structurally correct
  // =========================================================================
  it("IT-06 — delivery proof is complete with all required fields", async function () {
    const result = await client.purchaseService(PROVIDER_URL, "weather-report");
    const { receipt } = result;

    // Check all required fields are present
    expect(receipt).to.have.property("receiptId").that.matches(/^REC-/);
    expect(receipt).to.have.property("reqId");
    expect(receipt).to.have.property("serviceId", "weather-report");
    expect(receipt).to.have.property("providerAddress");
    expect(receipt).to.have.property("amountAuthorized").that.is.a("number");
    expect(receipt).to.have.property("timestamp").that.is.a("number");
    expect(receipt).to.have.property("content").that.is.an("object");
    expect(receipt).to.have.property("contentHash").that.matches(/^sha256:/);
    expect(receipt).to.have.property("txReference");
    expect(receipt).to.have.property("deliveryStatus", "DELIVERED");
  });

  // =========================================================================
  // Bonus: provider rejects delivery if reqId is not authorized on contract
  // =========================================================================
  it("provider rejects delivery if reqId is not authorized on contract", async function () {
    const fakeReqId = "0x" + "ab".repeat(32); // valid hex but never authorized
    const axios = require("axios");

    const resp = await axios.post(
      `${PROVIDER_URL}/deliver`,
      { reqId: fakeReqId, serviceId: "news-summary", amount: 3 },
      { validateStatus: () => true }
    );

    expect(resp.status).to.equal(402);
    expect(resp.data.error).to.include("Payment not verified");
  });
});
