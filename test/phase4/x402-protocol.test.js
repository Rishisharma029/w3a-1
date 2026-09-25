"use strict";

const { ethers } = require("hardhat");
const axios = require("axios");

const { createTokenMarketplace } = require("../../marketplace/token-server");
const { TokenPaymentClient } = require("../../agent/token-payment-client");
const { PaymentFacilitator } = require("../../facilitator/facilitator");

const PORT = 14230;
const BASE = `http://localhost:${PORT}`;

const DECIMALS = 6;
const ONE_USDC = 10n ** BigInt(DECIMALS);

describe("Phase 4 — x402 Protocol Conformance", function () {
  this.timeout(30000);

  let token, enforcer, ownerSigner, agentSigner, providerSigner;
  let marketplace, client, facilitator;

  before(async function () {
    [ownerSigner, agentSigner, providerSigner] = await ethers.getSigners();

    // Deploy contracts
    const TokenFactory = await ethers.getContractFactory("MockUSDC");
    token = await TokenFactory.deploy();
    await token.waitForDeployment();

    const EnforcerFactory = await ethers.getContractFactory("TokenBudgetEnforcer");
    enforcer = await EnforcerFactory.deploy(
      await token.getAddress(),
      ownerSigner.address,
      agentSigner.address
    );
    await enforcer.waitForDeployment();

    // Fund $30 budget
    const budget = 30n * ONE_USDC;
    await token.connect(ownerSigner).approve(await enforcer.getAddress(), budget);
    await enforcer.connect(ownerSigner).fundBudget(budget);

    facilitator = new PaymentFacilitator({
      enforcerAddress: await enforcer.getAddress(),
      enforcerContract: enforcer,
      settlerSigner: ownerSigner,
      chainId: 31337,
      tokenAddress: await token.getAddress(),
    });

    marketplace = createTokenMarketplace({
      port: PORT,
      facilitator,
      tokenAddress: await token.getAddress(),
      providerWalletAddress: providerSigner.address,
    });
    await new Promise((r) => setTimeout(r, 300));

    client = new TokenPaymentClient({
      agentSigner,
      enforcerAddress: await enforcer.getAddress(),
      chainId: 31337,
    });
  });

  after(async function () {
    if (marketplace) await marketplace.stop();
  });

  // Helper: issue a valid service challenge
  async function getChallenge(provider, serviceId = "text-translate") {
    const resp = await axios.get(`${BASE}/providers/${provider}/service`, {
      params: { serviceId },
      validateStatus: () => true,
    });
    return resp;
  }

  // XP-01: Provider returns HTTP 402 on service request with serviceId
  it("XP-01 — GET /service?serviceId=... returns HTTP 402 with payment challenge", async function () {
    const response = await getChallenge("alpha-translate");
    if (response.status !== 402) {
      throw new Error(`Expected 402, got ${response.status}: ${JSON.stringify(response.data)}`);
    }
  });

  // XP-02: Challenge body contains required x402-style fields
  it("XP-02 — 402 challenge body contains reqId, amount, recipient, validBefore", async function () {
    const response = await getChallenge("alpha-translate");
    const { challenge } = response.data;

    if (!challenge) throw new Error("Missing 'challenge' object in 402 response body");
    if (!challenge.reqId) throw new Error("Missing challenge.reqId");
    if (!challenge.amount) throw new Error("Missing challenge.amount");
    if (!challenge.recipient) throw new Error("Missing challenge.recipient");
    if (!challenge.validBefore) throw new Error("Missing challenge.validBefore");
  });

  // XP-03: Challenge reqId is a valid bytes32 hex string
  it("XP-03 — reqId in challenge is valid bytes32 (66-char hex)", async function () {
    const response = await getChallenge("beta-translate");
    const { reqId } = response.data.challenge;

    if (!/^0x[0-9a-fA-F]{64}$/.test(reqId)) {
      throw new Error(`reqId "${reqId}" is not valid bytes32`);
    }
  });

  // XP-04: Challenge amount is correct for the service
  it("XP-04 — 402 challenge amount matches provider listed price", async function () {
    const response = await getChallenge("alpha-translate");
    // Alpha translate is $4.00 = 4_000_000 units
    const amount = BigInt(response.data.challenge.amount);
    if (amount !== 4n * ONE_USDC) {
      throw new Error(`Expected ${4n * ONE_USDC}, got ${amount}`);
    }
  });

  // XP-05: Challenge validBefore is in the future (at least 60 seconds from now)
  it("XP-05 — challenge validBefore is at least 60s in the future", async function () {
    const response = await getChallenge("alpha-translate");
    const nowSec = Math.floor(Date.now() / 1000);
    const validBefore = Number(response.data.challenge.validBefore);

    if (validBefore <= nowSec + 60) {
      throw new Error(`validBefore ${validBefore} is not sufficiently in the future (now=${nowSec})`);
    }
  });

  // XP-06: POST /deliver without paymentPayload returns 400
  it("XP-06 — POST /deliver without paymentPayload returns 400", async function () {
    const response = await axios.post(
      `${BASE}/providers/alpha-translate/deliver`,
      { serviceId: "text-translate", payload: { text: "hello", targetLanguage: "Spanish" } },
      { validateStatus: () => true }
    );
    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }
  });

  // XP-07: POST /deliver with unknown reqId (not in quoteStore) returns 402 (quote not found)
  it("XP-07 — POST /deliver with unknown reqId returns 402 (quote validation failure)", async function () {
    const fakeReqId = "0x" + "ab".repeat(32);
    const fakePayload = {
      reqId: fakeReqId,
      provider: providerSigner.address,
      amount: (4n * ONE_USDC).toString(),
      validBefore: Math.floor(Date.now() / 1000) + 300,
      signature: "0x" + "00".repeat(65),
    };

    const response = await axios.post(
      `${BASE}/providers/alpha-translate/deliver`,
      {
        serviceId: "text-translate",
        payload: { text: "hello", targetLanguage: "Spanish" },
        paymentPayload: fakePayload,
      },
      { validateStatus: () => true }
    );
    // Quote store will reject unknown reqId with 402 "Quote validation failed"
    if (![400, 402].includes(response.status)) {
      throw new Error(`Expected 400 or 402, got ${response.status}`);
    }
  });

  // XP-08: Successful payment returns 200 with delivery receipt
  it("XP-08 — successful payment+delivery returns 200 with receipt fields", async function () {
    const result = await client.purchaseService(
      `${BASE}/providers/beta-translate/service`,
      `${BASE}/providers/beta-translate/deliver`,
      "text-translate",
      { text: "Protocol Test", targetLanguage: "French" }
    );

    if (!result.reqId) throw new Error("Missing reqId in result");
    if (!result.contentHash) throw new Error("Missing contentHash in result");
    if (!result.settlement) throw new Error("Missing settlement in result");
    if (!result.settlement.txHash) throw new Error("Missing txHash in settlement");
    if (!result.hashVerified) throw new Error("Hash verification failed");
  });

  // XP-09: Receipt contentHash is properly formatted (sha256: prefix)
  it("XP-09 — delivery receipt contentHash has sha256: prefix format", async function () {
    const result = await client.purchaseService(
      `${BASE}/providers/delta-compute/service`,
      `${BASE}/providers/delta-compute/deliver`,
      "data-process",
      { data: [1, 2, 3] }
    );

    if (!result.contentHash.startsWith("sha256:")) {
      throw new Error(`contentHash does not start with sha256: — got ${result.contentHash}`);
    }
    if (result.contentHash.length < 71) {
      // "sha256:" (7) + 64 hex chars = 71 minimum
      throw new Error(`contentHash too short: ${result.contentHash}`);
    }
  });

  // XP-10: Each service request issues a unique reqId
  it("XP-10 — sequential service requests produce distinct reqIds", async function () {
    const r1 = await getChallenge("alpha-translate");
    const r2 = await getChallenge("alpha-translate");
    if (r1.data.challenge.reqId === r2.data.challenge.reqId) {
      throw new Error("Duplicate reqId issued for different requests");
    }
  });

  // XP-11: On-chain reqId is consumed after successful settlement (replay guard)
  it("XP-11 — after successful settlement reqId is marked used on-chain", async function () {
    const result = await client.purchaseService(
      `${BASE}/providers/gamma-translate/service`,
      `${BASE}/providers/gamma-translate/deliver`,
      "text-translate",
      { text: "Test11", targetLanguage: "German" }
    );

    const isUsed = await enforcer.isRequestUsed(result.reqId);
    if (!isUsed) {
      throw new Error("reqId not marked as used on-chain after settlement");
    }
  });

  // XP-12: Settlement links deliveryHash on-chain to payment
  it("XP-12 — on-chain authorization record stores deliveryHash after settlement", async function () {
    const result = await client.purchaseService(
      `${BASE}/providers/beta-translate/service`,
      `${BASE}/providers/beta-translate/deliver`,
      "text-translate",
      { text: "Onchain hash binding test", targetLanguage: "Italian" }
    );

    const auth = await enforcer.getAuthorization(result.reqId);
    // auth.deliveryHash is a bytes32 — verify it's non-zero
    if (auth.deliveryHash === ethers.ZeroHash) {
      throw new Error("deliveryHash on-chain is zero — not bound");
    }
    if (!auth.settled) {
      throw new Error("Authorization not marked as settled on-chain");
    }
  });
});
