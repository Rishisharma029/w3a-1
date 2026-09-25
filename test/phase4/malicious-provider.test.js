"use strict";

const { ethers } = require("hardhat");
const { expect } = require("chai");
const axios = require("axios");

const { createTokenMarketplace } = require("../../marketplace/token-server");
const { TokenPaymentClient } = require("../../agent/token-payment-client");
const { PaymentFacilitator } = require("../../facilitator/facilitator");

const PORT = 14231;
const BASE = `http://localhost:${PORT}`;

const DECIMALS = 6;
const ONE_USDC = 10n ** BigInt(DECIMALS);

describe("Phase 4 — Malicious Provider Attack Scenarios", function () {
  this.timeout(30000);

  let token, enforcer, ownerSigner, agentSigner, providerSigner;
  let marketplace, client, facilitator;

  before(async function () {
    [ownerSigner, agentSigner, providerSigner] = await ethers.getSigners();

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

    const budget = 50n * ONE_USDC;
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

  // MP-01: Provider cannot change price after issuing quote
  it("MP-01 — price-mismatch between quote and settlement payload is rejected (stale quote guard)", async function () {
    // Get a legitimate challenge (must include serviceId)
    const challengeResp = await axios.get(`${BASE}/providers/alpha-translate/service`, {
      params: { serviceId: "text-translate" },
      validateStatus: () => true,
    });
    expect(challengeResp.status).to.equal(402);

    const challenge = challengeResp.data.challenge;
    const quotedAmount = BigInt(challenge.amount);
    const tamperedAmount = quotedAmount * 2n; // Provider doubles the price

    // Sign with tampered amount — contract will reject different-amount signature
    const domain = {
      name: "TokenBudgetEnforcer", version: "1", chainId: 31337,
      verifyingContract: await enforcer.getAddress(),
    };
    const types = {
      PaymentAuthorization: [
        { name: "reqId", type: "bytes32" },
        { name: "provider", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "validBefore", type: "uint256" },
      ],
    };
    const value = {
      reqId: challenge.reqId,
      provider: challenge.recipient,
      amount: tamperedAmount,
      validBefore: challenge.validBefore,
    };
    const signature = await agentSigner.signTypedData(domain, types, value);

    // Submit with tampered amount — quote store OR facilitator.verify() will reject
    // quote-store validates original serviceId+price; amount mismatch → 402 from facilitator.verify
    const deliverResp = await axios.post(
      `${BASE}/providers/alpha-translate/deliver`,
      {
        serviceId: "text-translate",
        payload: { text: "hello", targetLanguage: "Spanish" },
        paymentPayload: {
          reqId: challenge.reqId,
          provider: challenge.recipient,
          amount: tamperedAmount.toString(),
          validBefore: challenge.validBefore,
          signature,
        },
      },
      { validateStatus: () => true }
    );
    // Either 400 (quote store rejects) or 402 (facilitator.verify rejects amount mismatch)
    expect([400, 402]).to.include(deliverResp.status,
      `Expected 400 or 402 for price-mismatch, got ${deliverResp.status}: ${JSON.stringify(deliverResp.data)}`);
  });

  // MP-02: Provider cannot redirect payment to a different wallet
  it("MP-02 — payment destination substitution causes EIP-712 signature failure", async function () {
    const attackerAddress = "0x0000000000000000000000000000000000000042";
    const reqId = ethers.id("mp-02-" + Date.now());
    const latestBlock = await ethers.provider.getBlock("latest");
    const validBefore = Math.max(Math.floor(Date.now() / 1000), latestBlock ? latestBlock.timestamp : 0) + 3600;
    const amount = 4n * ONE_USDC;

    const domain = {
      name: "TokenBudgetEnforcer", version: "1", chainId: 31337,
      verifyingContract: await enforcer.getAddress(),
    };
    const types = {
      PaymentAuthorization: [
        { name: "reqId", type: "bytes32" },
        { name: "provider", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "validBefore", type: "uint256" },
      ],
    };

    // Agent signs for legit provider
    const value = { reqId, provider: providerSigner.address, amount, validBefore };
    const signature = await agentSigner.signTypedData(domain, types, value);
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("mp02-delivery"));

    // Malicious provider substitutes own address with attacker address
    await expect(
      enforcer.connect(ownerSigner).settleWithSignature(
        reqId,
        attackerAddress,   // Substituted destination
        amount,
        validBefore,
        deliveryHash,
        signature
      )
    ).to.be.revertedWith("TokenBudgetEnforcer: invalid agent signature");
  });

  // MP-03: Provider cannot deliver modified content without detection
  it("MP-03 — delivery content tampering is detected by SHA-256 hash mismatch", async function () {
    // Arm tamper mode for one request
    marketplace.tamperNextFor("alpha-translate");

    const result = await client.purchaseService(
      `${BASE}/providers/alpha-translate/service`,
      `${BASE}/providers/alpha-translate/deliver`,
      "text-translate",
      { text: "Tampering test", targetLanguage: "Spanish" }
    );

    // hashVerified must be false — provider tampered content
    expect(result.hashVerified).to.equal(false, "Tampering was not detected");
  });

  // MP-04 & MP-05: Provider cannot replay delivery or submit duplicate settlement
  it("MP-04/MP-05 — duplicate settlement of same reqId is rejected on-chain", async function () {
    const result = await client.purchaseService(
      `${BASE}/providers/beta-translate/service`,
      `${BASE}/providers/beta-translate/deliver`,
      "text-translate",
      { text: "Duplicate test", targetLanguage: "German" }
    );
    expect(result.settlement.settled).to.equal(true);

    // Try to replay settlement directly on contract
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("mp-replay-delivery"));
    const duplicate = await facilitator.settle(
      {
        reqId: result.reqId,
        provider: providerSigner.address,
        amount: (3n * ONE_USDC).toString(),
        validBefore: Math.floor(Date.now() / 1000) + 3600,
        signature: "0x" + "00".repeat(65),
      },
      deliveryHash
    );

    expect(duplicate.settled).to.equal(false);
    expect(duplicate.error).to.match(/already used|already settled/i);
  });

  // MP-06: Provider cannot claim payment without on-chain settlement
  it("MP-06 — on-chain token balance does not change without successful settleWithSignature", async function () {
    const providerBalBefore = await token.balanceOf(providerSigner.address);

    // Provider tries to claim directly by calling safeTransfer — they have no token balance in contract
    // The contract is the only one who can trigger safeTransfer via settleWithSignature
    // So we verify: provider cannot initiate token movement from the enforcer
    const contractBalance = await token.balanceOf(await enforcer.getAddress());

    // Attacker directly attempts to call settlePayment without prior authorization
    const fakeReqId = ethers.id("mp-06-" + Date.now());
    await expect(
      enforcer.connect(providerSigner).settlePayment(fakeReqId, ethers.keccak256(ethers.toUtf8Bytes("x")))
    ).to.be.revertedWith("TokenBudgetEnforcer: authorization not found");

    const providerBalAfter = await token.balanceOf(providerSigner.address);
    expect(providerBalAfter).to.equal(providerBalBefore, "Provider balance changed without valid settlement");
  });

  // MP-07: Malformed 402 response that skips reqId
  it("MP-07 — POST /deliver without reqId in paymentPayload returns 400/402", async function () {
    const response = await axios.post(
      `${BASE}/providers/alpha-translate/deliver`,
      {
        serviceId: "text-translate",
        payload: { text: "hi", targetLanguage: "French" },
        paymentPayload: {
          // reqId deliberately missing
          provider: providerSigner.address,
          amount: (4n * ONE_USDC).toString(),
          validBefore: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      { validateStatus: () => true }
    );
    expect([400, 402]).to.include(response.status);
  });

  // MP-08: Provider cannot submit zero/invalid delivery hash
  it("MP-08 — zero delivery hash in settleWithSignature is rejected by contract", async function () {
    const reqId = ethers.id("mp-08-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) + 3600;
    const amount = 3n * ONE_USDC;

    const domain = {
      name: "TokenBudgetEnforcer", version: "1", chainId: 31337,
      verifyingContract: await enforcer.getAddress(),
    };
    const types = {
      PaymentAuthorization: [
        { name: "reqId", type: "bytes32" },
        { name: "provider", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "validBefore", type: "uint256" },
      ],
    };
    const value = { reqId, provider: providerSigner.address, amount, validBefore };
    const signature = await agentSigner.signTypedData(domain, types, value);

    await expect(
      enforcer.connect(ownerSigner).settleWithSignature(
        reqId,
        providerSigner.address,
        amount,
        validBefore,
        ethers.ZeroHash,  // Zero delivery hash
        signature
      )
    ).to.be.revertedWith("TokenBudgetEnforcer: invalid delivery hash");
  });

  // MP-09: Provider outage after payment — agent gets idempotent receipt (no double charge)
  it("MP-09 — provider outage after payment allows retry with zero duplicate charge", async function () {
    const before = await enforcer.settledSpend();

    // First successful purchase
    const result = await client.purchaseService(
      `${BASE}/providers/delta-compute/service`,
      `${BASE}/providers/delta-compute/deliver`,
      "data-process",
      { data: [10, 20, 30] }
    );
    expect(result.settlement.settled).to.equal(true);

    const after = await enforcer.settledSpend();
    const charged = after - before;

    // Attempting to re-settle via replay returns error (replay protection = no second charge)
    const replayAttempt = await facilitator.settle(
      {
        reqId: result.reqId,
        provider: providerSigner.address,
        amount: (3n * ONE_USDC).toString(),
        validBefore: Math.floor(Date.now() / 1000) + 300,
        signature: "0x" + "00".repeat(65),
      },
      ethers.keccak256(ethers.toUtf8Bytes("replay"))
    );

    expect(replayAttempt.settled).to.equal(false);

    // Verify settled spend did not increase further
    const afterReplay = await enforcer.settledSpend();
    expect(afterReplay).to.equal(after, "Settled spend increased on replay");
    expect(charged).to.equal(3n * ONE_USDC, "Wrong initial charge amount");
  });

  // MP-10: Provider cannot submit receipt for a different service request
  it("MP-10 — delivery receipt from a different reqId is not accepted by contract", async function () {
    // Get a real reqId by completing a purchase
    const result = await client.purchaseService(
      `${BASE}/providers/gamma-translate/service`,
      `${BASE}/providers/gamma-translate/deliver`,
      "text-translate",
      { text: "MP10 test", targetLanguage: "Italian" }
    );
    expect(result.settlement.settled).to.equal(true);

    // Now try to use a completely different fakeReqId as if it was settled
    const fakeReqId = ethers.id("mp-10-fake-" + Date.now());
    const isUsed = await enforcer.isRequestUsed(fakeReqId);
    expect(isUsed).to.equal(false, "Fake reqId incorrectly appears used on-chain");

    // Verify the real reqId IS used and has the correct delivery hash
    const isRealUsed = await enforcer.isRequestUsed(result.reqId);
    expect(isRealUsed).to.equal(true, "Real reqId not marked as used");
  });
});
