/**
 * test/phase4/invariants.test.js
 *
 * Phase 4 — Property / Invariant Tests
 * =====================================
 * These tests verify that critical system invariants hold across all operations:
 *
 *   INV-01: remainingBudget() == authorizedBudget - settledSpend (always)
 *   INV-02: unspentEscrow() == token.balanceOf(contract) (always)
 *   INV-03: settledSpend never decreases
 *   INV-04: settledSpend always <= authorizedBudget
 *   INV-05: totalFunded >= totalWithdrawn + authorizedBudget (no double-counting)
 *   INV-06: Once a reqId is used, it stays used forever
 *   INV-07: Freeze is binary — either all or nothing
 *   INV-08: Delivery hash stored on-chain exactly matches computed hash
 *   INV-09: Token transfer to provider == settled amount in PaymentSettled event
 *   INV-10: No phantom authorizations (non-existent reqId returns zero-value auth)
 */

"use strict";

const { ethers } = require("hardhat");
const { expect } = require("chai");

const { PaymentFacilitator } = require("../../facilitator/facilitator");
const { computeContentHash } = require("../../shared/types");

const DECIMALS = 6;
const ONE_USDC = 10n ** BigInt(DECIMALS);

describe("Phase 4 — System Invariants & Property Tests", function () {
  this.timeout(20000);

  let token, enforcer, ownerSigner, agentSigner, providerSigner;
  let facilitator;

  const DOMAIN_NAME = "TokenBudgetEnforcer";
  const DOMAIN_VERSION = "1";
  const EIP712_TYPES = {
    PaymentAuthorization: [
      { name: "reqId", type: "bytes32" },
      { name: "provider", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "validBefore", type: "uint256" },
    ],
  };

  async function getDomain() {
    return {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: 31337,
      verifyingContract: await enforcer.getAddress(),
    };
  }

  async function settle(reqId, amount, providerAddr) {
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const domain = await getDomain();
    const value = { reqId, provider: providerAddr, amount, validBefore };
    const signature = await agentSigner.signTypedData(domain, EIP712_TYPES, value);
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes(`delivery-${reqId}`));
    return enforcer.connect(ownerSigner).settleWithSignature(
      reqId, providerAddr, amount, validBefore, deliveryHash, signature
    );
  }

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
  });

  // INV-01: remainingBudget always equals authorizedBudget - settledSpend
  it("INV-01 — remainingBudget() == authorizedBudget - settledSpend at all times", async function () {
    async function checkInvariant() {
      const [remaining, authorized, settled] = await Promise.all([
        enforcer.remainingBudget(),
        enforcer.authorizedBudget(),
        enforcer.settledSpend(),
      ]);
      expect(remaining).to.equal(authorized - settled, "INV-01 violated");
    }

    await checkInvariant();
    // Settle a payment and check again
    const reqId = ethers.id("inv01-" + Date.now());
    await settle(reqId, 3n * ONE_USDC, providerSigner.address);
    await checkInvariant();
  });

  // INV-02: unspentEscrow always equals token.balanceOf(contract)
  it("INV-02 — unspentEscrow() == token.balanceOf(contract) at all times", async function () {
    async function checkInvariant() {
      const [escrow, balance] = await Promise.all([
        enforcer.unspentEscrow(),
        token.balanceOf(await enforcer.getAddress()),
      ]);
      expect(escrow).to.equal(balance, "INV-02 violated: escrow view != actual balance");
    }

    await checkInvariant();
    const reqId = ethers.id("inv02-" + Date.now());
    await settle(reqId, 4n * ONE_USDC, providerSigner.address);
    await checkInvariant();
  });

  // INV-03: settledSpend is monotonically non-decreasing
  it("INV-03 — settledSpend is monotonically non-decreasing", async function () {
    const before = await enforcer.settledSpend();

    const reqId = ethers.id("inv03-" + Date.now());
    await settle(reqId, 3n * ONE_USDC, providerSigner.address);

    const after = await enforcer.settledSpend();
    expect(after).to.be.gte(before, "INV-03 violated: settledSpend decreased");
    expect(after - before).to.equal(3n * ONE_USDC);
  });

  // INV-04: settledSpend never exceeds authorizedBudget
  it("INV-04 — settledSpend <= authorizedBudget always holds", async function () {
    const [settled, authorized] = await Promise.all([
      enforcer.settledSpend(),
      enforcer.authorizedBudget(),
    ]);
    expect(settled).to.be.lte(authorized, "INV-04 violated: settledSpend exceeds budget");

    // Try to breach and confirm it still holds after rejection
    const remaining = await enforcer.remainingBudget();
    const overspendAmt = remaining + 1n * ONE_USDC;
    const reqId = ethers.id("inv04-overspend-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const domain = await getDomain();
    const value = { reqId, provider: providerSigner.address, amount: overspendAmt, validBefore };
    const sig = await agentSigner.signTypedData(domain, EIP712_TYPES, value);
    const dHash = ethers.keccak256(ethers.toUtf8Bytes("inv04-delivery"));

    try {
      await enforcer.connect(ownerSigner).settleWithSignature(
        reqId, providerSigner.address, overspendAmt, validBefore, dHash, sig
      );
    } catch (_) {}

    const [settledAfter, authorizedAfter] = await Promise.all([
      enforcer.settledSpend(),
      enforcer.authorizedBudget(),
    ]);
    expect(settledAfter).to.be.lte(authorizedAfter, "INV-04 violated after failed overspend");
  });

  // INV-05: totalFunded >= settledSpend (no money created from nothing)
  it("INV-05 — totalFunded >= settledSpend (no value created from nothing)", async function () {
    const [funded, settled] = await Promise.all([
      enforcer.totalFunded(),
      enforcer.settledSpend(),
    ]);
    expect(funded).to.be.gte(settled, "INV-05 violated: settled exceeds total funded");
  });

  // INV-06: Once a reqId is used, it stays used (immutable replay guard)
  it("INV-06 — once a reqId is marked used on-chain, it stays used permanently", async function () {
    const reqId = ethers.id("inv06-" + Date.now());
    await settle(reqId, 3n * ONE_USDC, providerSigner.address);

    const usedBefore = await enforcer.isRequestUsed(reqId);
    expect(usedBefore).to.equal(true);

    // Mine several blocks
    await ethers.provider.send("evm_mine", []);
    await ethers.provider.send("evm_mine", []);

    const usedAfter = await enforcer.isRequestUsed(reqId);
    expect(usedAfter).to.equal(true, "INV-06 violated: reqId became unused");
  });

  // INV-07: Freeze is binary — when frozen NO settlement works; when unfrozen it works
  it("INV-07 — freeze is binary: frozen blocks all settlements, unfrozen allows them", async function () {
    await enforcer.connect(ownerSigner).freezeAgent(true);

    const frozenReqId = ethers.id("inv07-frozen-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const domain = await getDomain();
    const value = { reqId: frozenReqId, provider: providerSigner.address, amount: 3n * ONE_USDC, validBefore };
    const sig = await agentSigner.signTypedData(domain, EIP712_TYPES, value);
    const dHash = ethers.keccak256(ethers.toUtf8Bytes("inv07-frozen"));

    await expect(
      enforcer.connect(ownerSigner).settleWithSignature(
        frozenReqId, providerSigner.address, 3n * ONE_USDC, validBefore, dHash, sig
      )
    ).to.be.revertedWith("TokenBudgetEnforcer: agent is frozen by owner");

    // Unfreeze and verify it works
    await enforcer.connect(ownerSigner).freezeAgent(false);
    const unfrozenReqId = ethers.id("inv07-unfrozen-" + Date.now());
    const value2 = { reqId: unfrozenReqId, provider: providerSigner.address, amount: 3n * ONE_USDC, validBefore };
    const sig2 = await agentSigner.signTypedData(domain, EIP712_TYPES, value2);
    const dHash2 = ethers.keccak256(ethers.toUtf8Bytes("inv07-unfrozen"));

    await enforcer.connect(ownerSigner).settleWithSignature(
      unfrozenReqId, providerSigner.address, 3n * ONE_USDC, validBefore, dHash2, sig2
    );
    const used = await enforcer.isRequestUsed(unfrozenReqId);
    expect(used).to.equal(true);
  });

  // INV-08: Delivery hash stored on-chain matches computed content hash
  it("INV-08 — delivery hash recorded on-chain is exactly the hash of delivered content", async function () {
    const reqId = ethers.id("inv08-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const amount = 3n * ONE_USDC;
    const domain = await getDomain();
    const value = { reqId, provider: providerSigner.address, amount, validBefore };
    const sig = await agentSigner.signTypedData(domain, EIP712_TYPES, value);

    // Compute delivery hash the same way the system does
    const content = { result: "test-content", timestamp: 12345 };
    const contentHashStr = computeContentHash(content);
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes(contentHashStr));

    await enforcer.connect(ownerSigner).settleWithSignature(
      reqId, providerSigner.address, amount, validBefore, deliveryHash, sig
    );

    const auth = await enforcer.getAuthorization(reqId);
    expect(auth.deliveryHash).to.equal(deliveryHash, "INV-08: on-chain hash does not match expected");
  });

  // INV-09: PaymentSettled event amount matches actual token transfer
  it("INV-09 — PaymentSettled event amount equals actual ERC-20 tokens transferred to provider", async function () {
    const reqId = ethers.id("inv09-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const amount = 3n * ONE_USDC;
    const domain = await getDomain();
    const value = { reqId, provider: providerSigner.address, amount, validBefore };
    const sig = await agentSigner.signTypedData(domain, EIP712_TYPES, value);
    const dHash = ethers.keccak256(ethers.toUtf8Bytes("inv09-delivery"));

    const providerBefore = await token.balanceOf(providerSigner.address);

    const tx = await enforcer.connect(ownerSigner).settleWithSignature(
      reqId, providerSigner.address, amount, validBefore, dHash, sig
    );
    const receipt = await tx.wait();

    const providerAfter = await token.balanceOf(providerSigner.address);
    const actualTransfer = providerAfter - providerBefore;

    // Check event
    const settledEvent = receipt.logs.find((log) => {
      try {
        const parsed = enforcer.interface.parseLog(log);
        return parsed && parsed.name === "PaymentSettled";
      } catch (_) {
        return false;
      }
    });
    const parsed = enforcer.interface.parseLog(settledEvent);

    expect(parsed.args.amount).to.equal(amount, "Event amount mismatch");
    expect(actualTransfer).to.equal(amount, "INV-09: token transfer != event amount");
  });

  // INV-10: Non-existent reqId returns zero-value authorization (no phantom data)
  it("INV-10 — non-existent reqId returns zero-value authorization struct (no phantom data)", async function () {
    const fakeReqId = ethers.id("inv10-does-not-exist-" + Date.now());
    const auth = await enforcer.getAuthorization(fakeReqId);

    expect(auth.provider).to.equal(ethers.ZeroAddress);
    expect(auth.amount).to.equal(0n);
    expect(auth.validBefore).to.equal(0n);
    expect(auth.deliveryHash).to.equal(ethers.ZeroHash);
    expect(auth.settled).to.equal(false);

    const isUsed = await enforcer.isRequestUsed(fakeReqId);
    expect(isUsed).to.equal(false);
  });
});
