"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Phase 3 — MockUSDC Token & Budget Escrow Accounting", function () {
  this.timeout(30000);

  let token, enforcer;
  let owner, agent, stranger;
  const DECIMALS = 6;
  const ONE_USDC = 10n ** BigInt(DECIMALS);

  beforeEach(async function () {
    [owner, agent, stranger] = await ethers.getSigners();

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
  });

  // =========================================================================
  // TB-01: MockUSDC token decimals and minting
  // =========================================================================
  it("TB-01 — MockUSDC has 6 decimals and supports test minting", async function () {
    expect(await token.decimals()).to.equal(6);
    expect(await token.symbol()).to.equal("MockUSDC");

    // Mint 50 USDC to stranger
    await token.mint(stranger.address, 50n * ONE_USDC);
    expect(await token.balanceOf(stranger.address)).to.equal(50n * ONE_USDC);
  });

  // =========================================================================
  // TB-02: Owner deposits MockUSDC into TokenBudgetEnforcer
  // =========================================================================
  it("TB-02 — owner deposits MockUSDC into escrow via fundBudget", async function () {
    const depositAmount = 20n * ONE_USDC;
    const enforcerAddress = await enforcer.getAddress();

    // Approve and deposit
    await token.connect(owner).approve(enforcerAddress, depositAmount);
    await expect(enforcer.connect(owner).fundBudget(depositAmount))
      .to.emit(enforcer, "BudgetFunded")
      .withArgs(owner.address, depositAmount, depositAmount);

    expect(await enforcer.totalFunded()).to.equal(depositAmount);
    expect(await enforcer.authorizedBudget()).to.equal(depositAmount);
    expect(await enforcer.unspentEscrow()).to.equal(depositAmount);
    expect(await token.balanceOf(enforcerAddress)).to.equal(depositAmount);
  });

  // =========================================================================
  // TB-03: Invariant check: remainingBudget == authorizedBudget - settledSpend
  // =========================================================================
  it("TB-03 — invariant holds: remainingBudget == authorizedBudget - settledSpend", async function () {
    const depositAmount = 30n * ONE_USDC;
    await token.connect(owner).approve(await enforcer.getAddress(), depositAmount);
    await enforcer.connect(owner).fundBudget(depositAmount);

    const authorized = await enforcer.authorizedBudget();
    const settled = await enforcer.settledSpend();
    const remaining = await enforcer.remainingBudget();

    expect(remaining).to.equal(authorized - settled);
    expect(settled).to.equal(0n);
    expect(remaining).to.equal(depositAmount);
  });

  // =========================================================================
  // TB-04: Non-owner cannot fund budget or set cap
  // =========================================================================
  it("TB-04 — non-owner cannot call fundBudget or setAuthorizedBudget", async function () {
    await token.mint(stranger.address, 10n * ONE_USDC);
    await token.connect(stranger).approve(await enforcer.getAddress(), 10n * ONE_USDC);

    await expect(
      enforcer.connect(stranger).fundBudget(10n * ONE_USDC)
    ).to.be.revertedWith("TokenBudgetEnforcer: caller is not owner");

    await expect(
      enforcer.connect(stranger).setAuthorizedBudget(50n * ONE_USDC)
    ).to.be.revertedWith("TokenBudgetEnforcer: caller is not owner");
  });

  // =========================================================================
  // TB-05: Owner can withdraw unspent tokens
  // =========================================================================
  it("TB-05 — owner can withdraw unspent tokens, updating escrow balance and cap", async function () {
    const depositAmount = 25n * ONE_USDC;
    const withdrawAmount = 10n * ONE_USDC;
    const enforcerAddress = await enforcer.getAddress();

    await token.connect(owner).approve(enforcerAddress, depositAmount);
    await enforcer.connect(owner).fundBudget(depositAmount);

    const ownerBalBefore = await token.balanceOf(owner.address);

    await expect(enforcer.connect(owner).withdrawUnspent(withdrawAmount))
      .to.emit(enforcer, "Withdrawal")
      .withArgs(owner.address, withdrawAmount, 15n * ONE_USDC);

    expect(await enforcer.authorizedBudget()).to.equal(15n * ONE_USDC);
    expect(await enforcer.unspentEscrow()).to.equal(15n * ONE_USDC);
    expect(await token.balanceOf(owner.address)).to.equal(ownerBalBefore + withdrawAmount);
  });

  // =========================================================================
  // TB-06: Owner cannot withdraw tokens that breach settled spend
  // =========================================================================
  it("TB-06 — owner cannot withdraw amount that exceeds unspent balance", async function () {
    const depositAmount = 10n * ONE_USDC;
    await token.connect(owner).approve(await enforcer.getAddress(), depositAmount);
    await enforcer.connect(owner).fundBudget(depositAmount);

    await expect(
      enforcer.connect(owner).withdrawUnspent(15n * ONE_USDC)
    ).to.be.revertedWith("TokenBudgetEnforcer: insufficient escrow balance");
  });

  // =========================================================================
  // TB-07: Owner can freeze agent; frozen agent cannot authorize
  // =========================================================================
  it("TB-07 — owner can freeze agent; frozen agent cannot authorize payments", async function () {
    const depositAmount = 10n * ONE_USDC;
    await token.connect(owner).approve(await enforcer.getAddress(), depositAmount);
    await enforcer.connect(owner).fundBudget(depositAmount);

    // Freeze agent
    await expect(enforcer.connect(owner).freezeAgent(true))
      .to.emit(enforcer, "AgentFrozen")
      .withArgs(true);

    expect(await enforcer.isFrozen()).to.be.true;

    // Agent attempts to authorize payment
    const reqId = "0x" + "11".repeat(32);
    const validBefore = Math.floor(Date.now() / 1000) + 300;

    await expect(
      enforcer.connect(agent).authorizePayment(reqId, stranger.address, 2n * ONE_USDC, validBefore)
    ).to.be.revertedWith("TokenBudgetEnforcer: agent is frozen by owner");
  });

  // =========================================================================
  // TB-08: Owner can unfreeze agent; authorizations resume
  // =========================================================================
  it("TB-08 — owner can unfreeze agent, restoring spending authority", async function () {
    const depositAmount = 10n * ONE_USDC;
    await token.connect(owner).approve(await enforcer.getAddress(), depositAmount);
    await enforcer.connect(owner).fundBudget(depositAmount);

    // Freeze then unfreeze
    await enforcer.connect(owner).freezeAgent(true);
    await enforcer.connect(owner).freezeAgent(false);
    expect(await enforcer.isFrozen()).to.be.false;

    const reqId = "0x" + "22".repeat(32);
    const validBefore = Math.floor(Date.now() / 1000) + 300;

    await expect(
      enforcer.connect(agent).authorizePayment(reqId, stranger.address, 2n * ONE_USDC, validBefore)
    ).to.emit(enforcer, "PaymentAuthorized");
  });
});
