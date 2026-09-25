"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { PaymentFacilitator, EIP712_TYPES } = require("../../facilitator/facilitator");

describe("Phase 3 — Real ERC-20 Token Settlement & Accounting", function () {
  this.timeout(30000);

  let token, enforcer, facilitator;
  let owner, agent, provider, stranger;
  const DECIMALS = 6;
  const ONE_USDC = 10n ** BigInt(DECIMALS);
  const INITIAL_BUDGET = 40n * ONE_USDC;

  beforeEach(async function () {
    [owner, agent, provider, stranger] = await ethers.getSigners();

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

    // 3. Fund escrow
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
  });

  function getDomain(enforcerAddress) {
    return {
      name: "TokenBudgetEnforcer",
      version: "1",
      chainId: 31337,
      verifyingContract: enforcerAddress,
    };
  }

  // =========================================================================
  // ST-01: Real ERC-20 tokens are transferred to provider on successful settlement
  // =========================================================================
  it("ST-01 — real MockUSDC tokens are transferred from contract to provider", async function () {
    const settleAmount = 6n * ONE_USDC;
    const reqId = "0x" + "c1".repeat(32);
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("weather-report-data"));

    const provBalBefore = await token.balanceOf(provider.address);
    const contractBalBefore = await token.balanceOf(await enforcer.getAddress());

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount: settleAmount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    const payload = { reqId, provider: provider.address, amount: settleAmount.toString(), validBefore, signature };

    const result = await facilitator.settle(payload, deliveryHash);
    expect(result.settled).to.be.true;
    expect(result.txHash).to.match(/^0x[a-f0-9]{64}$/i);

    // Verify token balance changes
    const provBalAfter = await token.balanceOf(provider.address);
    const contractBalAfter = await token.balanceOf(await enforcer.getAddress());

    expect(provBalAfter - provBalBefore).to.equal(settleAmount);
    expect(contractBalBefore - contractBalAfter).to.equal(settleAmount);
  });

  // =========================================================================
  // ST-02: Contract unspent escrow decreases by exact settled amount
  // =========================================================================
  it("ST-02 — contract unspentEscrow decreases by exact settled amount", async function () {
    const settleAmount = 4n * ONE_USDC;
    const reqId = "0x" + "c2".repeat(32);
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("market-data-1"));

    const escrowBefore = await enforcer.unspentEscrow();

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount: settleAmount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    await facilitator.settle({ reqId, provider: provider.address, amount: settleAmount.toString(), validBefore, signature }, deliveryHash);

    const escrowAfter = await enforcer.unspentEscrow();
    expect(escrowBefore - escrowAfter).to.equal(settleAmount);
  });

  // =========================================================================
  // ST-03: Provider balance increases by exact settled amount
  // =========================================================================
  it("ST-03 — provider balance increases by exact settled amount", async function () {
    const settleAmount = 10n * ONE_USDC;
    const reqId = "0x" + "c3".repeat(32);
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("compute-result-xyz"));

    const balBefore = await token.balanceOf(provider.address);

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount: settleAmount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    await facilitator.settle({ reqId, provider: provider.address, amount: settleAmount.toString(), validBefore, signature }, deliveryHash);

    const balAfter = await token.balanceOf(provider.address);
    expect(balAfter - balBefore).to.equal(settleAmount);
  });

  // =========================================================================
  // ST-04: Double settlement of same reqId reverts on-chain
  // =========================================================================
  it("ST-04 — duplicate settlement of same reqId reverts and transfers zero additional tokens", async function () {
    const settleAmount = 3n * ONE_USDC;
    const reqId = "0x" + "c4".repeat(32);
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("translation-1"));

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount: settleAmount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    const payload = { reqId, provider: provider.address, amount: settleAmount.toString(), validBefore, signature };

    // First settlement succeeds
    const res1 = await facilitator.settle(payload, deliveryHash);
    expect(res1.settled).to.be.true;

    const provBalAfterFirst = await token.balanceOf(provider.address);

    // Second settlement fails
    const res2 = await facilitator.settle(payload, deliveryHash);
    expect(res2.settled).to.be.false;
    expect(res2.error).to.include("request ID already used");

    // Provider balance did not increase
    const provBalAfterSecond = await token.balanceOf(provider.address);
    expect(provBalAfterSecond).to.equal(provBalAfterFirst);
  });

  // =========================================================================
  // ST-05: Delivery hash is immutably recorded in contract authorization
  // =========================================================================
  it("ST-05 — delivery hash is immutably recorded on-chain during settlement", async function () {
    const settleAmount = 5n * ONE_USDC;
    const reqId = "0x" + "c5".repeat(32);
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const rawDeliveryHash = ethers.keccak256(ethers.toUtf8Bytes("verified-content-proof"));

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount: settleAmount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    await facilitator.settle({ reqId, provider: provider.address, amount: settleAmount.toString(), validBefore, signature }, rawDeliveryHash);

    const auth = await enforcer.getAuthorization(reqId);
    expect(auth.settled).to.be.true;
    expect(auth.deliveryHash).to.equal(rawDeliveryHash);
    expect(auth.amount).to.equal(settleAmount);
    expect(auth.provider).to.equal(provider.address);
  });

  // =========================================================================
  // ST-06: Overspend settlement reverts on-chain before token transfer
  // =========================================================================
  it("ST-06 — overspend settlement reverts on-chain and moves zero tokens", async function () {
    const overspendAmount = 100n * ONE_USDC; // Budget is only 40
    const reqId = "0x" + "c6".repeat(32);
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("big-job"));

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount: overspendAmount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    const contractBalBefore = await token.balanceOf(await enforcer.getAddress());
    const provBalBefore = await token.balanceOf(provider.address);

    const res = await facilitator.settle({ reqId, provider: provider.address, amount: overspendAmount.toString(), validBefore, signature }, deliveryHash);
    expect(res.settled).to.be.false;
    expect(res.error.toLowerCase()).to.include("spending cap exceeded");

    // Balances strictly unchanged
    expect(await token.balanceOf(await enforcer.getAddress())).to.equal(contractBalBefore);
    expect(await token.balanceOf(provider.address)).to.equal(provBalBefore);
  });

  // =========================================================================
  // ST-07: Invariant check: contract token balance strictly equals unspent escrow
  // =========================================================================
  it("ST-07 — accounting invariant: token.balanceOf(contract) == unspentEscrow()", async function () {
    const settleAmount = 8n * ONE_USDC;
    const reqId = "0x" + "c7".repeat(32);
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("proof"));

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount: settleAmount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    await facilitator.settle({ reqId, provider: provider.address, amount: settleAmount.toString(), validBefore, signature }, deliveryHash);

    const contractTokenBal = await token.balanceOf(await enforcer.getAddress());
    const unspent = await enforcer.unspentEscrow();
    const remaining = await enforcer.remainingBudget();

    expect(contractTokenBal).to.equal(unspent);
    expect(contractTokenBal).to.equal(INITIAL_BUDGET - settleAmount);
    expect(remaining).to.equal(INITIAL_BUDGET - settleAmount);
  });
});
