/**
 * test/phase3/reserved-spend.test.js
 *
 * Comprehensive tests for reservedSpend, availableBudget(),
 * and authorization lifecycle (create, settle, cancel, expire).
 */

"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Phase 3 — Reserved Spend & Capital Allocation Invariants", function () {
  this.timeout(30000);

  let token, enforcer;
  let owner, agent, provider, stranger;
  const DECIMALS = 6;
  const ONE_USDC = 10n ** BigInt(DECIMALS);
  const BUDGET = 20n * ONE_USDC;

  beforeEach(async function () {
    [owner, agent, provider, stranger] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("MockUSDC");
    token = await TokenFactory.deploy();
    await token.waitForDeployment();

    const EnforcerFactory = await ethers.getContractFactory("TokenBudgetEnforcer");
    enforcer = await EnforcerFactory.deploy(
      await token.getAddress(),
      owner.address,
      agent.address
    );
    await enforcer.waitForDeployment();

    // Fund contract with $20 USDC
    await token.connect(owner).approve(await enforcer.getAddress(), BUDGET);
    await enforcer.connect(owner).fundBudget(BUDGET);
  });

  it("RS-01 — authorizePayment increases reservedSpend and reduces availableBudget", async function () {
    expect(await enforcer.reservedSpend()).to.equal(0n);
    expect(await enforcer.availableBudget()).to.equal(BUDGET);
    expect(await enforcer.remainingBudget()).to.equal(BUDGET);

    const reqId = ethers.id("req-1");
    const amount = 5n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) + 3600;

    await expect(enforcer.connect(agent).authorizePayment(reqId, provider.address, amount, validBefore))
      .to.emit(enforcer, "PaymentAuthorized")
      .withArgs(reqId, provider.address, amount, validBefore);

    expect(await enforcer.reservedSpend()).to.equal(amount);
    expect(await enforcer.settledSpend()).to.equal(0n);
    expect(await enforcer.availableBudget()).to.equal(BUDGET - amount);
    expect(await enforcer.remainingBudget()).to.equal(BUDGET - amount);
  });

  it("RS-02 — multiple authorizations cumulatively increment reservedSpend", async function () {
    const validBefore = Math.floor(Date.now() / 1000) + 3600;

    await enforcer.connect(agent).authorizePayment(ethers.id("req-1"), provider.address, 4n * ONE_USDC, validBefore);
    await enforcer.connect(agent).authorizePayment(ethers.id("req-2"), provider.address, 6n * ONE_USDC, validBefore);
    await enforcer.connect(agent).authorizePayment(ethers.id("req-3"), provider.address, 5n * ONE_USDC, validBefore);

    expect(await enforcer.reservedSpend()).to.equal(15n * ONE_USDC);
    expect(await enforcer.availableBudget()).to.equal(5n * ONE_USDC);
  });

  it("RS-03 — multiple pending authorizations collectively cannot exceed authorizedBudget", async function () {
    const validBefore = Math.floor(Date.now() / 1000) + 3600;

    // Reserve 12 USDC
    await enforcer.connect(agent).authorizePayment(ethers.id("req-1"), provider.address, 12n * ONE_USDC, validBefore);
    // Reserve 5 USDC (total reserved: 17 USDC, remaining: 3 USDC)
    await enforcer.connect(agent).authorizePayment(ethers.id("req-2"), provider.address, 5n * ONE_USDC, validBefore);

    expect(await enforcer.reservedSpend()).to.equal(17n * ONE_USDC);
    expect(await enforcer.availableBudget()).to.equal(3n * ONE_USDC);

    // Attempting to reserve 4 USDC (17 + 4 = 21 > 20) must REVERT
    await expect(
      enforcer.connect(agent).authorizePayment(ethers.id("req-3"), provider.address, 4n * ONE_USDC, validBefore)
    ).to.be.revertedWith("TokenBudgetEnforcer: spending cap exceeded");

    // But reserving 3 USDC exactly fits
    await expect(
      enforcer.connect(agent).authorizePayment(ethers.id("req-4"), provider.address, 3n * ONE_USDC, validBefore)
    ).to.emit(enforcer, "PaymentAuthorized");

    expect(await enforcer.reservedSpend()).to.equal(20n * ONE_USDC);
    expect(await enforcer.availableBudget()).to.equal(0n);
  });

  it("RS-04 — settlePayment atomically decrements reservedSpend and increments settledSpend", async function () {
    const reqId = ethers.id("req-settle");
    const amount = 8n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) + 3600;
    const deliveryHash = ethers.id("content-proof");

    await enforcer.connect(agent).authorizePayment(reqId, provider.address, amount, validBefore);
    expect(await enforcer.reservedSpend()).to.equal(amount);
    expect(await enforcer.settledSpend()).to.equal(0n);

    const providerBalBefore = await token.balanceOf(provider.address);

    await expect(enforcer.connect(provider).settlePayment(reqId, deliveryHash))
      .to.emit(enforcer, "PaymentSettled")
      .withArgs(reqId, provider.address, amount, deliveryHash);

    expect(await enforcer.reservedSpend()).to.equal(0n);
    expect(await enforcer.settledSpend()).to.equal(amount);
    expect(await enforcer.availableBudget()).to.equal(BUDGET - amount);

    const providerBalAfter = await token.balanceOf(provider.address);
    expect(providerBalAfter - providerBalBefore).to.equal(amount);
  });

  it("RS-05 — cancelAuthorization by agent or owner releases reservedSpend immediately", async function () {
    const reqId1 = ethers.id("req-cancel-1");
    const reqId2 = ethers.id("req-cancel-2");
    const amount = 5n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) + 3600;

    await enforcer.connect(agent).authorizePayment(reqId1, provider.address, amount, validBefore);
    await enforcer.connect(agent).authorizePayment(reqId2, provider.address, amount, validBefore);
    expect(await enforcer.reservedSpend()).to.equal(10n * ONE_USDC);

    // Agent cancels reqId1
    await expect(enforcer.connect(agent).cancelAuthorization(reqId1))
      .to.emit(enforcer, "AuthorizationCancelled")
      .withArgs(reqId1, amount);

    expect(await enforcer.reservedSpend()).to.equal(5n * ONE_USDC);
    expect(await enforcer.isAuthorizationCancelled(reqId1)).to.be.true;

    // Owner cancels reqId2
    await expect(enforcer.connect(owner).cancelAuthorization(reqId2))
      .to.emit(enforcer, "AuthorizationCancelled")
      .withArgs(reqId2, amount);

    expect(await enforcer.reservedSpend()).to.equal(0n);
    expect(await enforcer.availableBudget()).to.equal(BUDGET);
  });

  it("RS-06 — cannot settle an authorization that was cancelled", async function () {
    const reqId = ethers.id("req-cancelled");
    const amount = 5n * ONE_USDC;
    const validBefore = Math.floor(Date.now() / 1000) + 3600;
    const deliveryHash = ethers.id("proof");

    await enforcer.connect(agent).authorizePayment(reqId, provider.address, amount, validBefore);
    await enforcer.connect(agent).cancelAuthorization(reqId);

    await expect(
      enforcer.connect(provider).settlePayment(reqId, deliveryHash)
    ).to.be.revertedWith("TokenBudgetEnforcer: authorization cancelled");
  });

  it("RS-07 — releaseExpiredAuthorization permissionlessly frees capital after validBefore", async function () {
    const snapshotId = await ethers.provider.send("evm_snapshot", []);
    try {
      const reqId = ethers.id("req-expired");
      const amount = 7n * ONE_USDC;
      // Set expiry 10 seconds in the future
      const latestBlock = await ethers.provider.getBlock("latest");
      const validBefore = latestBlock.timestamp + 10;

      await enforcer.connect(agent).authorizePayment(reqId, provider.address, amount, validBefore);
      expect(await enforcer.reservedSpend()).to.equal(amount);

      // Calling before expiry must revert
      await expect(
        enforcer.connect(stranger).releaseExpiredAuthorization(reqId)
      ).to.be.revertedWith("TokenBudgetEnforcer: authorization not expired");

      // Advance EVM time past validBefore
      await ethers.provider.send("evm_increaseTime", [15]);
      await ethers.provider.send("evm_mine", []);

      // Stranger can now permissionlessly release expired authorization
      await expect(enforcer.connect(stranger).releaseExpiredAuthorization(reqId))
        .to.emit(enforcer, "AuthorizationExpired")
        .withArgs(reqId, amount);

      expect(await enforcer.reservedSpend()).to.equal(0n);
      expect(await enforcer.availableBudget()).to.equal(BUDGET);
      expect(await enforcer.isAuthorizationCancelled(reqId)).to.be.true;
    } finally {
      await ethers.provider.send("evm_revert", [snapshotId]);
    }
  });

  it("RS-08 — owner cannot reduce authorizedBudget below settledSpend + reservedSpend", async function () {
    const validBefore = Math.floor(Date.now() / 1000) + 3600;
    await enforcer.connect(agent).authorizePayment(ethers.id("req-1"), provider.address, 6n * ONE_USDC, validBefore);

    // reservedSpend is 6 USDC. Settle 4 USDC of another request
    const reqId2 = ethers.id("req-2");
    await enforcer.connect(agent).authorizePayment(reqId2, provider.address, 4n * ONE_USDC, validBefore);
    await enforcer.connect(provider).settlePayment(reqId2, ethers.id("delivery-2"));

    // settledSpend = 4 USDC, reservedSpend = 6 USDC -> committed = 10 USDC
    expect(await enforcer.settledSpend()).to.equal(4n * ONE_USDC);
    expect(await enforcer.reservedSpend()).to.equal(6n * ONE_USDC);

    // Reducing budget to 9 USDC (< 10 USDC committed) must revert
    await expect(
      enforcer.connect(owner).setAuthorizedBudget(9n * ONE_USDC)
    ).to.be.revertedWith("TokenBudgetEnforcer: budget cannot be below committed spend");

    // Reducing to 10 USDC exactly succeeds
    await expect(enforcer.connect(owner).setAuthorizedBudget(10n * ONE_USDC))
      .to.emit(enforcer, "BudgetCapUpdated")
      .withArgs(10n * ONE_USDC);
  });

  it("RS-09 — owner cannot withdraw tokens leaving escrow below settledSpend + reservedSpend", async function () {
    const validBefore = Math.floor(Date.now() / 1000) + 3600;
    await enforcer.connect(agent).authorizePayment(ethers.id("req-1"), provider.address, 8n * ONE_USDC, validBefore);

    // Escrow has 20 USDC, committed is 8 USDC. Max withdrawal is 12 USDC.
    // Withdrawing 13 USDC must revert
    await expect(
      enforcer.connect(owner).withdrawUnspent(13n * ONE_USDC)
    ).to.be.revertedWith("TokenBudgetEnforcer: withdrawal breaches committed spend");

    // Withdrawing 12 USDC succeeds
    await expect(enforcer.connect(owner).withdrawUnspent(12n * ONE_USDC))
      .to.emit(enforcer, "Withdrawal");

    expect(await token.balanceOf(await enforcer.getAddress())).to.equal(8n * ONE_USDC);
  });

  it("RS-10 — settleWithSignature respects reserved capital", async function () {
    const validBefore = Math.floor(Date.now() / 1000) + 3600;

    // Reserve 16 USDC via authorizePayment
    await enforcer.connect(agent).authorizePayment(ethers.id("req-reserved"), provider.address, 16n * ONE_USDC, validBefore);

    // Available budget is only 4 USDC
    expect(await enforcer.availableBudget()).to.equal(4n * ONE_USDC);

    // Try to settle 5 USDC with signature (16 + 5 = 21 > 20)
    const reqIdSig = ethers.id("req-sig");
    const domain = {
      name: "TokenBudgetEnforcer",
      version: "1",
      chainId: 31337,
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
      reqId: reqIdSig,
      provider: provider.address,
      amount: 5n * ONE_USDC,
      validBefore,
    };
    const signature = await agent.signTypedData(domain, types, value);

    await expect(
      enforcer.connect(provider).settleWithSignature(
        reqIdSig,
        provider.address,
        5n * ONE_USDC,
        validBefore,
        ethers.id("delivery"),
        signature
      )
    ).to.be.revertedWith("TokenBudgetEnforcer: spending cap exceeded");

    // But settling 4 USDC succeeds
    const value4 = {
      reqId: reqIdSig,
      provider: provider.address,
      amount: 4n * ONE_USDC,
      validBefore,
    };
    const sig4 = await agent.signTypedData(domain, types, value4);

    await expect(
      enforcer.connect(provider).settleWithSignature(
        reqIdSig,
        provider.address,
        4n * ONE_USDC,
        validBefore,
        ethers.id("delivery"),
        sig4
      )
    ).to.emit(enforcer, "PaymentSettled");

    expect(await enforcer.settledSpend()).to.equal(4n * ONE_USDC);
    expect(await enforcer.reservedSpend()).to.equal(16n * ONE_USDC);
    expect(await enforcer.availableBudget()).to.equal(0n);
  });

  it("RS-11 — invariant settledSpend + reservedSpend <= authorizedBudget holds across all states", async function () {
    const validBefore = Math.floor(Date.now() / 1000) + 3600;

    async function assertInvariant() {
      const settled = await enforcer.settledSpend();
      const reserved = await enforcer.reservedSpend();
      const authorized = await enforcer.authorizedBudget();
      expect(settled + reserved).to.be.lte(authorized, "Invariant breached: settled + reserved > authorized");
    }

    await assertInvariant();

    const r1 = ethers.id("r1");
    await enforcer.connect(agent).authorizePayment(r1, provider.address, 5n * ONE_USDC, validBefore);
    await assertInvariant();

    const r2 = ethers.id("r2");
    await enforcer.connect(agent).authorizePayment(r2, provider.address, 7n * ONE_USDC, validBefore);
    await assertInvariant();

    await enforcer.connect(provider).settlePayment(r1, ethers.id("del-1"));
    await assertInvariant();

    await enforcer.connect(agent).cancelAuthorization(r2);
    await assertInvariant();
  });
});
