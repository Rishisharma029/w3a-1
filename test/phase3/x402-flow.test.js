/**
 * test/phase3/x402-flow.test.js
 *
 * End-to-end integration tests for x402-compatible token settlement flow:
 * - Full purchase cycle with MockUSDC transfer
 * - Cryptographic delivery hash verification
 * - Retry idempotency with zero double charge
 * - Provider 503 outage and fallback
 * - Delivery tampering detection
 * - Emergency freeze blocking settlement
 * - Event indexer capturing on-chain settlement for dashboard
 */

"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");
const axios = require("axios");

const { PaymentFacilitator } = require("../../facilitator/facilitator");
const { createTokenMarketplace } = require("../../marketplace/token-server");
const { TokenPaymentClient } = require("../../agent/token-payment-client");
const { EventIndexer } = require("../../indexer/indexer");
const { PROVIDERS } = require("../../marketplace/providers");

const MARKET_PORT = 14205;
const MARKET_URL = `http://localhost:${MARKET_PORT}`;

describe("Phase 3 — End-to-End x402 Real Token Settlement Flow", function () {
  this.timeout(30000);

  let token, enforcer, facilitator, marketplace, indexer, client;
  let owner, agent, providerWallet, stranger;
  const DECIMALS = 6;
  const ONE_USDC = 10n ** BigInt(DECIMALS);
  const INITIAL_BUDGET = 30n * ONE_USDC;

  before(async function () {
    [owner, agent, providerWallet, stranger] = await ethers.getSigners();

    // 1. Deploy MockUSDC
    const TokenFactory = await ethers.getContractFactory("MockUSDC");
    token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // 2. Deploy TokenBudgetEnforcer
    const EnforcerFactory = await ethers.getContractFactory("TokenBudgetEnforcer");
    enforcer = await EnforcerFactory.deploy(
      await token.getAddress(),
      owner.address,
      agent.address
    );
    await enforcer.waitForDeployment();

    // 3. Fund escrow with 30 USDC
    await token.connect(owner).approve(await enforcer.getAddress(), INITIAL_BUDGET);
    await enforcer.connect(owner).fundBudget(INITIAL_BUDGET);

    // 4. Setup facilitator
    facilitator = new PaymentFacilitator({
      enforcerAddress: await enforcer.getAddress(),
      enforcerContract: enforcer,
      settlerSigner: owner,
      chainId: 31337,
      tokenAddress: await token.getAddress(),
    });

    // 5. Setup Indexer
    indexer = new EventIndexer({ contract: enforcer });
    await indexer.start();

    // 6. Setup Token Marketplace
    marketplace = createTokenMarketplace({
      port: MARKET_PORT,
      facilitator,
      tokenAddress: await token.getAddress(),
      providerWalletAddress: providerWallet.address,
    });
    await new Promise((r) => setTimeout(r, 200));

    // 7. Setup Agent Client
    client = new TokenPaymentClient({
      agentSigner: agent,
      enforcerAddress: await enforcer.getAddress(),
      chainId: 31337,
    });
  });

  beforeEach(function () {
    marketplace.clearAll();
    for (const p of PROVIDERS) p.availability = 1.0;
  });

  after(function () {
    return marketplace.stop();
  });

  // =========================================================================
  // XF-01: End-to-end x402 purchase with MockUSDC token settlement
  // =========================================================================
  it("XF-01 — full x402 flow settles MockUSDC tokens to provider on-chain", async function () {
    const provBalBefore = await token.balanceOf(providerWallet.address);
    const serviceUrl = `${MARKET_URL}/providers/alpha-translate/service`;
    const deliverUrl = `${MARKET_URL}/providers/alpha-translate/deliver`;

    // Alpha costs 4 USDC
    const result = await client.purchaseService(serviceUrl, deliverUrl, "text-translate", {
      text: "Autonomous Web3 Agent",
      targetLanguage: "Hindi",
    });

    expect(result.receipt).to.exist;
    expect(result.receipt.deliveryStatus).to.equal("DELIVERED");
    expect(result.settlement.settled).to.be.true;
    expect(result.settlement.txHash).to.match(/^0x[a-f0-9]{64}$/i);
    expect(result.hashVerified).to.be.true;

    // Verify token settlement: provider received 4.00 USDC
    const provBalAfter = await token.balanceOf(providerWallet.address);
    expect(provBalAfter - provBalBefore).to.equal(4n * ONE_USDC);

    // Verify on-chain contract accounting
    const spent = await enforcer.settledSpend();
    expect(spent).to.equal(4n * ONE_USDC);
  });

  // =========================================================================
  // XF-02: Cryptographic delivery hash verification
  // =========================================================================
  it("XF-02 — agent independently verifies canonical content hash from delivered resource", async function () {
    const serviceUrl = `${MARKET_URL}/providers/delta-compute/service`;
    const deliverUrl = `${MARKET_URL}/providers/delta-compute/deliver`;

    const result = await client.purchaseService(serviceUrl, deliverUrl, "data-process", {
      data: [10, 20, 30],
    });

    expect(result.hashVerified).to.be.true;
    expect(result.contentHash).to.match(/^sha256:[a-f0-9]{64}$/);
    expect(result.receipt.content.output.sum).to.equal(60);
  });

  // =========================================================================
  // XF-03: Retry idempotency returns cached receipt without double token transfer
  // =========================================================================
  it("XF-03 — network timeout retry returns cached receipt with zero duplicate token charge", async function () {
    const serviceUrl = `${MARKET_URL}/providers/beta-translate/service`;
    const deliverUrl = `${MARKET_URL}/providers/beta-translate/deliver`;

    // 1. Initial purchase
    const result1 = await client.purchaseService(serviceUrl, deliverUrl, "text-translate");
    const provBalAfterP1 = await token.balanceOf(providerWallet.address);

    // 2. Retry with exact same reqId directly to POST /deliver
    const retryResp = await axios.post(deliverUrl, {
      serviceId: "text-translate",
      paymentPayload: {
        reqId: result1.reqId,
        amount: (3n * ONE_USDC).toString(),
        provider: providerWallet.address,
      },
    });

    expect(retryResp.status).to.equal(200);
    expect(retryResp.data.idempotent).to.be.true;
    expect(retryResp.data.receipt.receiptId).to.equal(result1.receipt.receiptId);

    // Provider balance did NOT increase on retry
    const provBalAfterRetry = await token.balanceOf(providerWallet.address);
    expect(provBalAfterRetry).to.equal(provBalAfterP1);
  });

  // =========================================================================
  // XF-04: Provider outage (503) triggers fallback
  // =========================================================================
  it("XF-04 — provider outage (503) allows agent to switch to alternative provider", async function () {
    // Disable beta-translate (outage)
    marketplace.setProviderAvailability("beta-translate", 0);

    const betaUrl = `${MARKET_URL}/providers/beta-translate/service`;
    const resp = await axios.get(betaUrl, {
      params: { serviceId: "text-translate" },
      validateStatus: () => true,
    });

    expect(resp.status).to.equal(503);
    expect(resp.data.error).to.equal("Provider unavailable");

    // Seamless fallback to alpha-translate
    const alphaServiceUrl = `${MARKET_URL}/providers/alpha-translate/service`;
    const alphaDeliverUrl = `${MARKET_URL}/providers/alpha-translate/deliver`;

    const fallbackResult = await client.purchaseService(alphaServiceUrl, alphaDeliverUrl, "text-translate");
    expect(fallbackResult.settlement.settled).to.be.true;
    expect(fallbackResult.hashVerified).to.be.true;
  });

  // =========================================================================
  // XF-05: Delivery tampering detection
  // =========================================================================
  it("XF-05 — delivery tampering by provider is detected by content hash mismatch", async function () {
    marketplace.tamperNextFor("epsilon-vision");

    const serviceUrl = `${MARKET_URL}/providers/epsilon-vision/service`;
    const deliverUrl = `${MARKET_URL}/providers/epsilon-vision/deliver`;

    const result = await client.purchaseService(serviceUrl, deliverUrl, "image-analyze");

    // Tampered payload causes hash mismatch
    expect(result.hashVerified).to.be.false;
    expect(result.receipt.content.TAMPERED).to.be.true;
  });

  // =========================================================================
  // XF-06: Frozen agent cannot settle payment
  // =========================================================================
  it("XF-06 — owner freeze stops payment settlement cold at the contract level", async function () {
    // Owner freezes agent
    await enforcer.connect(owner).freezeAgent(true);

    const serviceUrl = `${MARKET_URL}/providers/alpha-translate/service`;
    const deliverUrl = `${MARKET_URL}/providers/alpha-translate/deliver`;

    let caught = null;
    try {
      await client.purchaseService(serviceUrl, deliverUrl, "text-translate");
    } catch (err) {
      caught = err;
    }

    expect(caught).to.exist;
    expect(caught.message).to.include("frozen by contract owner");

    // Unfreeze for future tests
    await enforcer.connect(owner).freezeAgent(false);
  });

  // =========================================================================
  // XF-07: Event indexer captures settlement for dashboard
  // =========================================================================
  it("XF-07 — on-chain indexer records settlement event with txHash and deliveryHash", async function () {
    const serviceUrl = `${MARKET_URL}/providers/delta-compute/service`;
    const deliverUrl = `${MARKET_URL}/providers/delta-compute/deliver`;

    await client.purchaseService(serviceUrl, deliverUrl, "data-process");

    const txs = indexer.getTransactions();
    expect(txs.length).to.be.greaterThan(0);

    const latest = txs[txs.length - 1];
    expect(latest.status).to.equal("SETTLED");
    expect(latest.deliveryHash).to.match(/^0x[a-f0-9]{64}$/i);
    expect(latest.txHash).to.match(/^0x[a-f0-9]{64}$/i);
  });
});
