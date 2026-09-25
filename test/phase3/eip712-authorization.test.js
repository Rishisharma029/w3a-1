"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { PaymentFacilitator, EIP712_TYPES } = require("../../facilitator/facilitator");

describe("Phase 3 — EIP-712 Signed Payment Authorizations", function () {
  this.timeout(30000);

  let token, enforcer, facilitator;
  let owner, agent, provider, stranger;
  const DECIMALS = 6;
  const ONE_USDC = 10n ** BigInt(DECIMALS);
  const BUDGET = 50n * ONE_USDC;

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

    // 3. Fund contract
    await token.connect(owner).approve(await enforcer.getAddress(), BUDGET);
    await enforcer.connect(owner).fundBudget(BUDGET);

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
  // EA-01: Agent signs valid EIP-712 authorization
  // =========================================================================
  it("EA-01 — agent generates valid EIP-712 typed signature", async function () {
    const reqId = "0x" + "aa".repeat(32);
    const amount = 4n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) + 300;

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount, validBefore };

    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);
    expect(signature).to.match(/^0x[a-f0-9]{130}$/i);

    // Ethers recover check
    const recovered = ethers.verifyTypedData(domain, EIP712_TYPES, value, signature);
    expect(recovered.toLowerCase()).to.equal(agent.address.toLowerCase());
  });

  // =========================================================================
  // EA-02: Facilitator verifies valid signature
  // =========================================================================
  it("EA-02 — facilitator verifies valid authorization payload", async function () {
    const reqId = "0x" + "ab".repeat(32);
    const amount = 3n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) + 300;

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    const payload = { reqId, provider: provider.address, amount: amount.toString(), validBefore, signature };
    const requirements = { reqId, recipient: provider.address, amount: amount.toString() };

    const result = await facilitator.verify(payload, requirements);
    expect(result.valid).to.be.true;
  });

  // =========================================================================
  // EA-03: Invalid signature from unauthorized signer is rejected
  // =========================================================================
  it("EA-03 — signature from stranger (unauthorized signer) is rejected", async function () {
    const reqId = "0x" + "ac".repeat(32);
    const amount = 3n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) + 300;

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount, validBefore };
    // Signed by stranger instead of authorized agent
    const signature = await stranger.signTypedData(domain, EIP712_TYPES, value);

    const payload = { reqId, provider: provider.address, amount: amount.toString(), validBefore, signature };
    const requirements = { reqId, recipient: provider.address, amount: amount.toString() };

    const result = await facilitator.verify(payload, requirements);
    expect(result.valid).to.be.false;
    expect(result.reason).to.include("does not match agent");
  });

  // =========================================================================
  // EA-04: Mismatched provider address is rejected
  // =========================================================================
  it("EA-04 — authorization for Provider A cannot be submitted for Provider B", async function () {
    const reqId = "0x" + "ad".repeat(32);
    const amount = 5n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) + 300;

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    const payload = { reqId, provider: provider.address, amount: amount.toString(), validBefore, signature };
    // Attacker submits to stranger address
    const requirements = { reqId, recipient: stranger.address, amount: amount.toString() };

    const result = await facilitator.verify(payload, requirements);
    expect(result.valid).to.be.false;
    expect(result.reason).to.include("Provider address mismatch");
  });

  // =========================================================================
  // EA-05: Mismatched amount is rejected
  // =========================================================================
  it("EA-05 — authorization for $3 cannot be used to pay $5", async function () {
    const reqId = "0x" + "ae".repeat(32);
    const amount = 3n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) + 300;

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    const payload = { reqId, provider: provider.address, amount: (5n * ONE_USDC).toString(), validBefore, signature };
    const requirements = { reqId, recipient: (5n * ONE_USDC).toString(), amount: (5n * ONE_USDC).toString() };

    const result = await facilitator.verify(payload, requirements);
    expect(result.valid).to.be.false;
  });

  // =========================================================================
  // EA-06: Expired authorization is rejected
  // =========================================================================
  it("EA-06 — expired authorization (validBefore in past) is rejected", async function () {
    const reqId = "0x" + "af".repeat(32);
    const amount = 2n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) - 60; // 1 min ago

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    const payload = { reqId, provider: provider.address, amount: amount.toString(), validBefore, signature };
    const requirements = { reqId, recipient: provider.address, amount: amount.toString() };

    const result = await facilitator.verify(payload, requirements);
    expect(result.valid).to.be.false;
    expect(result.reason).to.include("expired");
  });

  // =========================================================================
  // EA-07: Replayed authorization on-chain is rejected
  // =========================================================================
  it("EA-07 — replaying same authorization on-chain reverts with Request ID already used", async function () {
    const reqId = "0x" + "b1".repeat(32);
    const amount = 4n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("content-1"));

    const domain = getDomain(await enforcer.getAddress());
    const value = { reqId, provider: provider.address, amount, validBefore };
    const signature = await agent.signTypedData(domain, EIP712_TYPES, value);

    // First settlement succeeds
    await enforcer.settleWithSignature(reqId, provider.address, amount, validBefore, deliveryHash, signature);

    // Second settlement with same reqId must revert
    await expect(
      enforcer.settleWithSignature(reqId, provider.address, amount, validBefore, deliveryHash, signature)
    ).to.be.revertedWith("TokenBudgetEnforcer: request ID already used");
  });

  // =========================================================================
  // EA-08: Reused request ID cannot be authorized twice
  // =========================================================================
  it("EA-08 — request ID already used in direct authorization cannot be authorized again", async function () {
    const reqId = "0x" + "b2".repeat(32);
    const amount = 2n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) + 300;

    await enforcer.connect(agent).authorizePayment(reqId, provider.address, amount, validBefore);

    await expect(
      enforcer.connect(agent).authorizePayment(reqId, provider.address, amount, validBefore)
    ).to.be.revertedWith("TokenBudgetEnforcer: request ID already used");
  });
});
