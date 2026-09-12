/**
 * test/phase4/malicious-agent.test.js
 *
 * Phase 4 — Malicious Agent Attack Scenarios
 * ==========================================
 * Proves that a compromised or malicious AI agent CANNOT:
 *   MA-01: Spend above its authorized budget
 *   MA-02: Modify its own budget (caller must be owner)
 *   MA-03: Call owner-only functions (setAgent, freezeAgent, withdrawUnspent, setAuthorizedBudget)
 *   MA-04: Reuse an old authorization (replay protection)
 *   MA-05: Alter the provider address in a signed authorization
 *   MA-06: Alter the amount in a signed authorization
 *   MA-07: Use an expired authorization
 *   MA-08: Continue spending after being frozen
 *
 * Every failure must come from the ENFORCEMENT LAYER (smart contract revert),
 * not from application-level checks.
 */

"use strict";

const { ethers } = require("hardhat");
const { expect } = require("chai");

const { PaymentFacilitator } = require("../../facilitator/facilitator");

const DECIMALS = 6;
const ONE_USDC = 10n ** BigInt(DECIMALS);

describe("Phase 4 — Malicious Agent Attack Scenarios", function () {
  this.timeout(20000);

  let token, enforcer, ownerSigner, agentSigner, providerSigner, attackerSigner;
  let facilitator;
  const enforcerAbi = [
    "function fundBudget(uint256) external",
    "function setAuthorizedBudget(uint256) external",
    "function freezeAgent(bool) external",
    "function setAgent(address) external",
    "function withdrawUnspent(uint256) external",
    "function settleWithSignature(bytes32,address,uint256,uint256,bytes32,bytes) external",
    "function authorizePayment(bytes32,address,uint256,uint256) external",
    "function remainingBudget() view returns (uint256)",
    "function settledSpend() view returns (uint256)",
    "function isRequestUsed(bytes32) view returns (bool)",
    "function isFrozen() view returns (bool)",
    "function agent() view returns (address)",
  ];

  before(async function () {
    [ownerSigner, agentSigner, providerSigner, attackerSigner] = await ethers.getSigners();

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

    // Fund $15 budget for agent
    const budget = 15n * ONE_USDC;
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

  // MA-01: Agent cannot spend above authorized budget
  it("MA-01 — agent CANNOT spend above remaining budget (protocol enforces hard cap)", async function () {
    const remaining = await enforcer.remainingBudget();
    const overspendAmt = remaining + 1n * ONE_USDC; // $1 above remaining

    const reqId = ethers.id("ma-01-overspend-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) + 300;

    // Agent signs authorization for overspend amount
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
    const value = { reqId, provider: providerSigner.address, amount: overspendAmt, validBefore };
    const signature = await agentSigner.signTypedData(domain, types, value);

    const fakeDelivery = ethers.keccak256(ethers.toUtf8Bytes("test-delivery"));
    await expect(
      enforcer.connect(ownerSigner).settleWithSignature(
        reqId,
        providerSigner.address,
        overspendAmt,
        validBefore,
        fakeDelivery,
        signature
      )
    ).to.be.revertedWith("TokenBudgetEnforcer: spending cap exceeded");
  });

  // MA-02: Agent cannot modify its own budget
  it("MA-02 — agent CANNOT call setAuthorizedBudget (owner-only at contract level)", async function () {
    // Attempt to increase own budget — must revert
    await expect(
      enforcer.connect(agentSigner).setAuthorizedBudget(999n * ONE_USDC)
    ).to.be.revertedWith("TokenBudgetEnforcer: caller is not owner");
  });

  // MA-03: Agent cannot call owner-only functions
  it("MA-03 — agent CANNOT call freezeAgent, setAgent, or withdrawUnspent", async function () {
    await expect(
      enforcer.connect(agentSigner).freezeAgent(false)
    ).to.be.revertedWith("TokenBudgetEnforcer: caller is not owner");

    await expect(
      enforcer.connect(agentSigner).setAgent(agentSigner.address)
    ).to.be.revertedWith("TokenBudgetEnforcer: caller is not owner");

    await expect(
      enforcer.connect(agentSigner).withdrawUnspent(1n * ONE_USDC)
    ).to.be.revertedWith("TokenBudgetEnforcer: caller is not owner");
  });

  // MA-04: Agent cannot replay an old reqId to double-charge
  it("MA-04 — agent CANNOT reuse a settled reqId (on-chain replay protection)", async function () {
    const reqId = ethers.id("ma-04-replay-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) + 300;
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
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("ma04-delivery"));

    // First settlement — should succeed
    await enforcer.connect(ownerSigner).settleWithSignature(
      reqId, providerSigner.address, amount, validBefore, deliveryHash, signature
    );

    // Replay — must revert
    await expect(
      enforcer.connect(ownerSigner).settleWithSignature(
        reqId, providerSigner.address, amount, validBefore, deliveryHash, signature
      )
    ).to.be.revertedWith("TokenBudgetEnforcer: request ID already used");
  });

  // MA-05: Agent cannot alter provider address after signing
  it("MA-05 — altered provider address causes EIP-712 signature verification to fail", async function () {
    const reqId = ethers.id("ma-05-wrong-provider-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) + 300;
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

    // Sign for providerSigner — but submit with attackerSigner as provider
    const value = { reqId, provider: providerSigner.address, amount, validBefore };
    const signature = await agentSigner.signTypedData(domain, types, value);
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("ma05-delivery"));

    await expect(
      enforcer.connect(ownerSigner).settleWithSignature(
        reqId,
        attackerSigner.address, // Wrong provider
        amount,
        validBefore,
        deliveryHash,
        signature
      )
    ).to.be.revertedWith("TokenBudgetEnforcer: invalid agent signature");
  });

  // MA-06: Agent cannot alter the amount after signing
  it("MA-06 — altered payment amount causes EIP-712 signature verification to fail", async function () {
    const reqId = ethers.id("ma-06-wrong-amount-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) + 300;
    const signedAmount = 3n * ONE_USDC;
    const tamperedAmount = 1n * ONE_USDC; // Lower amount — provider tries to front-run

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

    // Signed for $3 but submitted with $1
    const value = { reqId, provider: providerSigner.address, amount: signedAmount, validBefore };
    const signature = await agentSigner.signTypedData(domain, types, value);
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("ma06-delivery"));

    await expect(
      enforcer.connect(ownerSigner).settleWithSignature(
        reqId,
        providerSigner.address,
        tamperedAmount, // Tampered
        validBefore,
        deliveryHash,
        signature
      )
    ).to.be.revertedWith("TokenBudgetEnforcer: invalid agent signature");
  });

  // MA-07: Agent cannot use an expired authorization
  it("MA-07 — expired authorization is rejected at smart contract level", async function () {
    const reqId = ethers.id("ma-07-expired-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) - 10; // Already expired
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
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("ma07-delivery"));

    await expect(
      enforcer.connect(ownerSigner).settleWithSignature(
        reqId, providerSigner.address, amount, validBefore, deliveryHash, signature
      )
    ).to.be.revertedWith("TokenBudgetEnforcer: authorization expired");
  });

  // MA-08: Agent cannot continue spending after owner freeze
  it("MA-08 — frozen agent CANNOT settle any payment (contract hard stop)", async function () {
    // Owner freezes agent
    await enforcer.connect(ownerSigner).freezeAgent(true);
    const frozen = await enforcer.isFrozen();
    expect(frozen).to.equal(true);

    const reqId = ethers.id("ma-08-frozen-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) + 300;
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
    const deliveryHash = ethers.keccak256(ethers.toUtf8Bytes("ma08-delivery"));

    await expect(
      enforcer.connect(ownerSigner).settleWithSignature(
        reqId, providerSigner.address, amount, validBefore, deliveryHash, signature
      )
    ).to.be.revertedWith("TokenBudgetEnforcer: agent is frozen by owner");

    // Unfreeze for subsequent tests
    await enforcer.connect(ownerSigner).freezeAgent(false);
  });
});
