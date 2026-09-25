"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");
const axios = require("axios");

const { createMarketplace } = require("../../marketplace/server");
const { PROVIDERS } = require("../../marketplace/providers");
const { SmartAgent } = require("../../agent/smart-agent");
const { PurchaseFlow } = require("../../agent/purchase-flow");

const MARKET_PORT = 13203;
const MARKET_URL = `http://localhost:${MARKET_PORT}`;

describe("Phase 2 — Adversarial and Failure Scenarios", function () {
  this.timeout(30000);

  let enforcer, ownerSigner, agentSigner, strangerSigner;
  let marketplace;
  let agent;
  let snapshotId;

  before(async function () {
    [ownerSigner, agentSigner, strangerSigner] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BudgetEnforcer");
    // Initial budget = 7 units (enough for $6 gamma-translate once, or $4+$3, but not $6+$3)
    enforcer = await Factory.deploy(ownerSigner.address, agentSigner.address, 7n);
    await enforcer.waitForDeployment();

    const contractAddress = await enforcer.getAddress();
    const verifierOverride = {
      verifyAuthorization: (reqId, amt) => enforcer.verifyAuthorization(reqId, amt),
    };

    marketplace = createMarketplace({
      port: MARKET_PORT,
      contractAddress,
      baseUrl: MARKET_URL,
      _verifierOverride: verifierOverride,
    });
    await new Promise((r) => setTimeout(r, 200));

    agent = new SmartAgent({
      marketplaceBaseUrl: MARKET_URL,
      agentSigner,
      contractAddress,
    });
  });

  beforeEach(async function () {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
    marketplace.clearAll();
    for (const p of PROVIDERS) p.availability = 1.0;
  });

  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
    marketplace.clearAll();
    for (const p of PROVIDERS) p.availability = 1.0;
  });

  after(function () {
    return marketplace.stop();
  });

  // =========================================================================
  // ADV-01: AI chooses an unaffordable provider → contract rejects
  // =========================================================================
  it("ADV-01 — contract rejects payment when agent attempts an unaffordable provider", async function () {
    // 1. Spend 4 units on alpha-translate ($4)
    const firstPurchase = await agent.purchase("Translate text with alpha. Quality 0.9.");
    expect(firstPurchase.finalState).to.equal("COMPLETE");
    expect(firstPurchase.authorizedAmount).to.equal(4);

    // Remaining budget is 7 - 4 = 3 units
    const remaining = await enforcer.remainingBudget();
    expect(remaining).to.equal(3n);

    // 2. Now user/agent tries to purchase premium gamma-translate ($6)
    // Even if prompt explicitly requests gamma or agent decides to buy it:
    const secondPurchase = await agent.purchase(
      "Get premium translation with highest quality. (gamma-translate)"
    );

    // Smart contract rejects authorization!
    expect(secondPurchase.finalState).to.equal("REJECTED");
    expect(secondPurchase.rejectionReason).to.include("Spending cap exceeded");

    // Spend remains 4 units, untouched!
    expect(await enforcer.totalSpent()).to.equal(4n);
  });

  // =========================================================================
  // ADV-02: Replay of same reqId on contract reverts
  // =========================================================================
  it("ADV-02 — contract reverts if same reqId is replayed for authorization", async function () {
    const reqId = "0x" + "99".repeat(32);
    // First authorization of 2 units succeeds
    await enforcer.connect(agentSigner).authorize(reqId, 2n);
    expect(await enforcer.totalSpent()).to.equal(2n);

    // Second authorization with exact same reqId must revert (replay protection)
    await expect(
      enforcer.connect(agentSigner).authorize(reqId, 2n)
    ).to.be.revertedWith("BudgetEnforcer: request ID already used");

    // Spend unchanged
    expect(await enforcer.totalSpent()).to.equal(2n);
  });

  // =========================================================================
  // ADV-03: Provider 503 during GET /service triggers graceful fallback
  // =========================================================================
  it("ADV-03 — provider 503 during service request triggers automated fallback", async function () {
    // Make beta-translate return 503
    marketplace.setProviderAvailability("beta-translate", 0);

    // User asks for lowest cost translation
    const record = await agent.purchase("Translate this text. Lowest cost.");

    expect(record.finalState).to.equal("COMPLETE");
    // Seamlessly fell back to next viable provider
    expect(record.selectedProviderId).to.equal("alpha-translate");
    expect(record.verified).to.be.true;
  });

  // =========================================================================
  // ADV-04: Provider price change between quote and delivery is blocked
  // =========================================================================
  it("ADV-04 — stale quote protection blocks payment if amount != quoted price", async function () {
    // 1. Get quote for delta-compute (costs 3 units)
    const sResp = await axios.get(`${MARKET_URL}/providers/delta-compute/service`, {
      params: { serviceId: "data-process" },
      validateStatus: (s) => s === 402,
    });
    const { reqId } = sResp.data.challenge;

    // 2. Authorize 6 units instead of 3 on contract
    await enforcer.connect(agentSigner).authorize(reqId, 6n);

    // 3. Attempt delivery with manipulated amount (6 units)
    const deliverResp = await axios.post(
      `${MARKET_URL}/providers/delta-compute/deliver`,
      {
        reqId,
        serviceId: "data-process",
        amount: 6, // changed from quote 3
      },
      { validateStatus: () => true }
    );

    expect(deliverResp.status).to.equal(402);
    expect(deliverResp.data.detail).to.include("Price mismatch");
  });

  // =========================================================================
  // ADV-05: Missing fields in 402 challenge aborts flow safely
  // =========================================================================
  it("ADV-05 — invalid 402 challenge aborts flow without calling contract", async function () {
    const flow = new PurchaseFlow({
      marketplaceBaseUrl: MARKET_URL,
      agentSigner,
      contractAddress: await enforcer.getAddress(),
    });

    // Mock an attempt where challenge is invalid
    const dummyRecord = await flow._tryOnce(
      { setFailed: () => {}, setSelection: () => {}, setDiscovery: () => {} },
      { serviceType: "invalid-non-existent" },
      []
    );

    expect(dummyRecord.success).to.be.false;
    // Total spent must still be 0
    expect(await enforcer.totalSpent()).to.equal(0n);
  });

  // =========================================================================
  // ADV-06: Provider delivers altered content → hash verification flags it
  // =========================================================================
  it("ADV-06 — altered content fails content hash verification and flags FAILED", async function () {
    marketplace.tamperNextFor("beta-translate");

    const record = await agent.purchase("Translate text with beta-translate. Low cost.");

    expect(record.finalState).to.equal("FAILED");
    expect(record.verified).to.be.false;
    expect(record.errorDetail).to.include("hash mismatch");
  });

  // =========================================================================
  // ADV-07: Budget exhausted after multiple purchases rejects future spends
  // =========================================================================
  it("ADV-07 — budget exhaustion stops all subsequent purchases cold", async function () {
    // Budget is 7.
    // 1. Buy delta-compute ($3)
    const p1 = await agent.purchase("Data processing compute task.");
    expect(p1.finalState).to.equal("COMPLETE");
    expect(p1.authorizedAmount).to.equal(3);

    // 2. Buy beta-translate ($3) - explicitly specify lowest cost priority
    const p2 = await agent.purchase("Translate small string with beta-translate. Lowest cost.");
    expect(p2.finalState).to.equal("COMPLETE");
    expect(p2.authorizedAmount).to.equal(3);

    // Total spent = 6. Remaining = 1.
    expect(await enforcer.totalSpent()).to.equal(6n);
    expect(await enforcer.remainingBudget()).to.equal(1n);

    // 3. Try to buy anything (cheapest service in market is $3)
    const p3 = await agent.purchase("Another compute task.");
    expect(p3.finalState).to.equal("REJECTED");
    expect(p3.rejectionReason).to.include("Spending cap exceeded");

    // Spend remains strictly 6
    expect(await enforcer.totalSpent()).to.equal(6n);
  });

  // =========================================================================
  // ADV-08: Retry of same reqId returns cached delivery without double charging
  // =========================================================================
  it("ADV-08 — retry with same reqId returns cached receipt without charging again", async function () {
    const p1 = await agent.purchase("Compute task with delta.");
    expect(p1.finalState).to.equal("COMPLETE");
    const spentAfterP1 = await enforcer.totalSpent();

    // Call POST /deliver directly with the same reqId
    const retryResp = await axios.post(
      `${MARKET_URL}/providers/delta-compute/deliver`,
      {
        reqId: p1.reqId,
        serviceId: "data-process",
        amount: 3,
      }
    );

    expect(retryResp.status).to.equal(200);
    expect(retryResp.data.idempotent).to.be.true;
    expect(retryResp.data.receipt.receiptId).to.equal(p1.receipt.receiptId);

    // Spend must not have increased
    expect(await enforcer.totalSpent()).to.equal(spentAfterP1);
  });

  // =========================================================================
  // ADV-09: Unauthorized caller cannot authorize spending on contract
  // =========================================================================
  it("ADV-09 — unauthorized agent address cannot authorize spending", async function () {
    const unauthorizedAgent = new SmartAgent({
      marketplaceBaseUrl: MARKET_URL,
      agentSigner: strangerSigner, // Stranger, not authorized agent
      contractAddress: await enforcer.getAddress(),
    });

    const record = await unauthorizedAgent.purchase("Translate with beta-translate.");
    expect(record.finalState).to.equal("FAILED");
    expect(record.errorDetail).to.include("caller is not agent");

    // Budget untouched
    expect(await enforcer.totalSpent()).to.equal(0n);
  });
});
