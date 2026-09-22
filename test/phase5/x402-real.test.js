/**
 * test/phase5/x402-real.test.js
 *
 * Official x402 V2 Protocol Integration & Security Test Suite
 * ============================================================
 * Proves genuine x402 V2 wire protocol compliance on top of W3A-1:
 *
 *   - Real HTTP 402 with base64 PAYMENT-REQUIRED header
 *   - Official @x402/core schema validation (PaymentRequiredV2, PaymentPayloadV2)
 *   - PAYMENT-SIGNATURE header decoding & execution
 *   - Real MockUSDC ERC-20 settlement on local EVM
 *   - PAYMENT-RESPONSE header encoding & verification
 *   - Wire-level pure HTTP test using global fetch()
 *   - Full adversarial matrix: overspend, replay, freeze, tampering, mismatch
 *   - Core invariant: TokenBudgetEnforcer remains the authoritative spending ceiling
 */

"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");
const axios = require("axios");
const {
  encodePaymentRequiredHeader,
  decodePaymentRequiredHeader,
  encodePaymentSignatureHeader,
  decodePaymentSignatureHeader,
  decodePaymentResponseHeader,
} = require("@x402/core/http");
const {
  validatePaymentRequired,
  validatePaymentPayload,
  validatePaymentRequirements,
} = require("@x402/core/schemas");

const { createTokenMarketplace } = require("../../marketplace/token-server");
const { PaymentFacilitator } = require("../../facilitator/facilitator");
const { X402PaymentClient } = require("../../agent/x402-payment-client");
const { computeContentHash } = require("../../shared/types");

const PORT = 14250;
const BASE_URL = `http://localhost:${PORT}`;
const X402_ALPHA_URL = `${BASE_URL}/x402/providers/alpha-translate/service`;
const X402_BETA_URL = `${BASE_URL}/x402/providers/beta-translate/service`;

const DECIMALS = 6;
const ONE_USDC = 10n ** BigInt(DECIMALS);

describe("Phase 5 — Official x402 V2 Protocol Integration", function () {
  this.timeout(40000);

  let token, enforcer, ownerSigner, agentSigner, providerSigner, attackerSigner;
  let facilitator, marketplace, client;
  let tokenAddress, enforcerAddress;

  before(async function () {
    [ownerSigner, agentSigner, providerSigner, attackerSigner] = await ethers.getSigners();

    // Deploy MockUSDC
    const TokenFactory = await ethers.getContractFactory("MockUSDC");
    token = await TokenFactory.deploy();
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();

    // Deploy TokenBudgetEnforcer
    const EnforcerFactory = await ethers.getContractFactory("TokenBudgetEnforcer");
    enforcer = await EnforcerFactory.deploy(tokenAddress, ownerSigner.address, agentSigner.address);
    await enforcer.waitForDeployment();
    enforcerAddress = await enforcer.getAddress();

    // Fund contract escrow with $150.00 MockUSDC
    const initialDeposit = 150n * ONE_USDC;
    await token.connect(ownerSigner).approve(enforcerAddress, initialDeposit);
    await enforcer.connect(ownerSigner).fundBudget(initialDeposit);

    // Initialize PaymentFacilitator
    facilitator = new PaymentFacilitator({
      enforcerAddress,
      enforcerContract: enforcer,
      settlerSigner: ownerSigner,
      chainId: 31337,
      tokenAddress,
    });

    // Launch Token Marketplace with x402 routes
    marketplace = createTokenMarketplace({
      port: PORT,
      facilitator,
      tokenAddress,
      providerWalletAddress: providerSigner.address,
    });
    await new Promise((r) => setTimeout(r, 400));

    // Initialize x402 Payment Client
    client = new X402PaymentClient({
      agentSigner,
      enforcerAddress,
      chainId: 31337,
    });
  });

  beforeEach(async function () {
    if (enforcer && (await enforcer.isFrozen())) {
      await enforcer.connect(ownerSigner).freezeAgent(false);
    }
  });

  after(async function () {
    if (marketplace) await marketplace.stop();
  });

  // ---------------------------------------------------------------------------
  // SECTION 1: x402 V2 HTTP Handshake & Challenge
  // ---------------------------------------------------------------------------

  it("XR-01: GET /x402/providers/:id/service returns HTTP 402 Payment Required", async function () {
    const res = await axios.get(X402_ALPHA_URL, { validateStatus: () => true });
    expect(res.status).to.equal(402);
  });

  it("XR-02: 402 response includes PAYMENT-REQUIRED header", async function () {
    const res = await axios.get(X402_ALPHA_URL, { validateStatus: () => true });
    const header = res.headers["payment-required"] || res.headers["PAYMENT-REQUIRED"];
    expect(header).to.be.a("string");
    expect(header.length).to.be.greaterThan(20);
  });

  it("XR-03: Decoded PAYMENT-REQUIRED conforms to official @x402/core PaymentRequiredV2Schema", async function () {
    const res = await axios.get(X402_ALPHA_URL, { validateStatus: () => true });
    const header = res.headers["payment-required"] || res.headers["PAYMENT-REQUIRED"];
    const decoded = decodePaymentRequiredHeader(header);

    // Must pass official Zod validation
    const validated = validatePaymentRequired(decoded);
    expect(validated.x402Version).to.equal(2);
    expect(validated.accepts).to.be.an("array").with.lengthOf.at.least(1);
    expect(validated.resource).to.be.an("object");
    expect(validated.resource.url).to.be.a("string");
  });

  it("XR-04: PaymentRequirements specifies CAIP-2 network identifier (eip155:31337)", async function () {
    const { requirement } = await client.requestChallenge(X402_ALPHA_URL);
    expect(requirement.network).to.equal("eip155:31337");
    expect(requirement.scheme).to.equal("exact");
  });

  it("XR-05: PaymentRequirements specifies atomic units as string (4000000 for $4.00)", async function () {
    const { requirement } = await client.requestChallenge(X402_ALPHA_URL);
    expect(requirement.amount).to.equal("4000000");
    expect(requirement.asset.toLowerCase()).to.equal(tokenAddress.toLowerCase());
    expect(requirement.payTo.toLowerCase()).to.equal(providerSigner.address.toLowerCase());
  });

  it("XR-06: Decimal conversion is deterministic across standard amounts ($0.01, $1.00, $4.00, $10.00)", function () {
    function toAtomic(dollars) {
      return (BigInt(Math.round(dollars * 1e6))).toString();
    }
    expect(toAtomic(0.01)).to.equal("10000");
    expect(toAtomic(1.0)).to.equal("1000000");
    expect(toAtomic(4.0)).to.equal("4000000");
    expect(toAtomic(10.0)).to.equal("10000000");
  });

  it("XR-07: PaymentRequirements asset correctly points to MockUSDC contract", async function () {
    const { requirement } = await client.requestChallenge(X402_ALPHA_URL);
    expect(requirement.asset.toLowerCase()).to.equal(tokenAddress.toLowerCase());
  });

  // ---------------------------------------------------------------------------
  // SECTION 2: PaymentPayload & Header Verification
  // ---------------------------------------------------------------------------

  it("XR-08: Client constructs valid PaymentPayloadV2 validated by @x402/core schema", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0);

    const validated = validatePaymentPayload(payload);
    expect(validated.x402Version).to.equal(2);
    expect(validated.accepted.scheme).to.equal("exact");
    expect(validated.accepted.amount).to.equal("4000000");
    expect(validated.payload.signature).to.be.a("string").that.matches(/^0x[0-9a-fA-F]{130}$/);
  });

  it("XR-09: Client encodes PaymentPayloadV2 into valid base64 PAYMENT-SIGNATURE header", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0);
    const encoded = encodePaymentSignatureHeader(payload);

    expect(encoded).to.be.a("string");
    const roundtrip = decodePaymentSignatureHeader(encoded);
    expect(roundtrip.x402Version).to.equal(2);
    expect(roundtrip.accepted.amount).to.equal("4000000");
  });

  it("XR-10: GET with valid PAYMENT-SIGNATURE header returns HTTP 200 OK", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0);
    const result = await client.submitPayment(X402_ALPHA_URL, payload);

    expect(result.status).to.equal(200);
    expect(result.data.status).to.equal("DELIVERED");
    expect(result.receipt).to.be.an("object");
  });

  it("XR-11: HTTP 200 response contains PAYMENT-RESPONSE header matching x402 V2 SettlementResponse", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0);
    const result = await client.submitPayment(X402_ALPHA_URL, payload);

    expect(result.settlementResponse).to.be.an("object");
    expect(result.settlementResponse.success).to.equal(true);
    expect(result.settlementResponse.network).to.equal("eip155:31337");
    expect(result.settlementResponse.transaction).to.be.a("string").that.matches(/^0x[0-9a-fA-F]{64}$/);
    expect(result.settlementResponse.payer.toLowerCase()).to.equal(agentSigner.address.toLowerCase());
  });

  it("XR-12: Real ERC-20 token transfer confirmed on-chain (provider balance increases by $4.00)", async function () {
    const balanceBefore = await token.balanceOf(providerSigner.address);

    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0);
    await client.submitPayment(X402_ALPHA_URL, payload);

    const balanceAfter = await token.balanceOf(providerSigner.address);
    const diff = balanceAfter - balanceBefore;
    expect(diff).to.equal(4n * ONE_USDC);
  });

  it("XR-13: Delivery content hash format (sha256:) matches and is independently verified by client", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0);
    const result = await client.submitPayment(X402_ALPHA_URL, payload);

    expect(result.contentHash).to.be.a("string");
    expect(result.contentHash.startsWith("sha256:")).to.be.true;
    expect(result.hashVerified).to.equal(true);
  });

  // ---------------------------------------------------------------------------
  // SECTION 3: Wire-Level Pure HTTP Test (Section V)
  // ---------------------------------------------------------------------------

  it("XR-14: Wire-level test using native fetch() without client helpers (pure HTTP wire test)", async function () {
    // 1. Initial request -> expects 402
    const resp1 = await fetch(X402_ALPHA_URL);
    expect(resp1.status).to.equal(402);

    const rawReqHeader = resp1.headers.get("PAYMENT-REQUIRED") || resp1.headers.get("payment-required");
    expect(rawReqHeader).to.be.a("string");

    // 2. Decode official header
    const pr = decodePaymentRequiredHeader(rawReqHeader);
    const req = pr.accepts[0];

    // 3. Agent manually signs EIP-712
    const domain = {
      name: "TokenBudgetEnforcer",
      version: "1",
      chainId: 31337,
      verifyingContract: enforcerAddress,
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
      reqId: req.extra.reqId,
      provider: req.payTo,
      amount: BigInt(req.amount),
      validBefore: BigInt(Math.floor(Date.now() / 1000) + 3600),
    };
    const signature = await agentSigner.signTypedData(domain, types, value);

    // 4. Construct PaymentPayload and encode header
    const paymentPayload = {
      x402Version: 2,
      resource: pr.resource,
      accepted: req,
      payload: {
        reqId: req.extra.reqId,
        provider: req.payTo,
        amount: req.amount,
        validBefore: Number(value.validBefore),
        signature,
        payer: agentSigner.address,
      },
      extensions: null,
    };
    const encodedSig = encodePaymentSignatureHeader(paymentPayload);

    // 5. Send second request with PAYMENT-SIGNATURE
    const resp2 = await fetch(X402_ALPHA_URL, {
      headers: {
        "PAYMENT-SIGNATURE": encodedSig,
      },
    });
    expect(resp2.status).to.equal(200);

    const rawRespHeader = resp2.headers.get("PAYMENT-RESPONSE") || resp2.headers.get("payment-response");
    expect(rawRespHeader).to.be.a("string");

    const settleResp = decodePaymentResponseHeader(rawRespHeader);
    expect(settleResp.success).to.equal(true);
    expect(settleResp.transaction).to.be.a("string");

    // Verify on-chain transaction actually exists
    const tx = await ethers.provider.getTransaction(settleResp.transaction);
    expect(tx).to.not.be.null;
  });

  // ---------------------------------------------------------------------------
  // SECTION 4: Tampering & Malicious Inputs (Sections O, P, Q, R, S)
  // ---------------------------------------------------------------------------

  it("XR-15: Malformed PAYMENT-SIGNATURE header returns HTTP 400", async function () {
    const res = await axios.get(X402_ALPHA_URL, {
      headers: { "PAYMENT-SIGNATURE": "this-is-not-valid-base64-or-json!!" },
      validateStatus: () => true,
    });
    expect(res.status).to.equal(400);
  });

  it("XR-16: Unsupported payment scheme (e.g. 'streaming') returns HTTP 400", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0, {
      accepted: { scheme: "streaming" },
    });
    const res = await axios.get(X402_ALPHA_URL, {
      headers: { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(payload) },
      validateStatus: () => true,
    });
    expect(res.status).to.equal(400);
    expect(res.data.error).to.include("Unsupported scheme");
  });

  it("XR-17: Mismatched network identifier (eip155:1 instead of local chain) returns HTTP 400", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0, {
      accepted: { network: "eip155:1" },
    });
    const res = await axios.get(X402_ALPHA_URL, {
      headers: { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(payload) },
      validateStatus: () => true,
    });
    expect(res.status).to.equal(400);
    expect(res.data.error).to.include("Network mismatch");
  });

  it("XR-18: Mismatched asset contract address returns HTTP 400", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const fakeToken = "0x0000000000000000000000000000000000009999";
    const payload = await client.createPaymentPayload(paymentRequired, 0, {
      accepted: { asset: fakeToken },
    });
    const res = await axios.get(X402_ALPHA_URL, {
      headers: { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(payload) },
      validateStatus: () => true,
    });
    expect(res.status).to.equal(400);
    expect(res.data.error).to.include("Asset mismatch");
  });

  it("XR-19: Payment requirement binding — altered amount in accepted returns HTTP 400", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0, {
      accepted: { amount: "9000000" }, // Tamper from 4 USDC to 9 USDC
      amount: "9000000",
    });
    const res = await axios.get(X402_ALPHA_URL, {
      headers: { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(payload) },
      validateStatus: () => true,
    });
    expect(res.status).to.equal(400);
    expect(res.data.error).to.include("Amount mismatch");
  });

  it("XR-20: Payment requirement binding — altered payTo recipient returns HTTP 400", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const attackerWallet = attackerSigner.address;
    const payload = await client.createPaymentPayload(paymentRequired, 0, {
      accepted: { payTo: attackerWallet },
      provider: attackerWallet,
    });
    const res = await axios.get(X402_ALPHA_URL, {
      headers: { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(payload) },
      validateStatus: () => true,
    });
    expect(res.status).to.equal(400);
    expect(res.data.error).to.include("Recipient mismatch");
  });

  it("XR-21: Resource binding — payload signed for Alpha rejected when submitted to Beta", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0);

    // Submit Alpha's payload to Beta
    const res = await axios.get(X402_BETA_URL, {
      headers: { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(payload) },
      validateStatus: () => true,
    });
    // Must be rejected (either Resource binding mismatch or payTo/amount mismatch)
    expect([400, 402]).to.include(res.status);
  });

  it("XR-22: Tampered signature is rejected by facilitator & smart contract", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    // Invalid signature (65 zeroes)
    const fakeSig = "0x" + "00".repeat(65);
    const payload = await client.createPaymentPayload(paymentRequired, 0, { signature: fakeSig });

    const res = await axios.get(X402_ALPHA_URL, {
      headers: { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(payload) },
      validateStatus: () => true,
    });
    expect(res.status).to.equal(402);
    expect(res.data.detail.toLowerCase()).to.satisfy((s) =>
      s.includes("signature") || s.includes("verification") || s.includes("error")
    );
  });

  it("XR-23: Expired authorization (validBefore in past) is rejected", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const pastTimestamp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
    const payload = await client.createPaymentPayload(paymentRequired, 0, {
      validBefore: pastTimestamp,
    });

    const res = await axios.get(X402_ALPHA_URL, {
      headers: { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(payload) },
      validateStatus: () => true,
    });
    expect(res.status).to.equal(402);
    expect(res.data.detail).to.include("expired");
  });

  it("XR-24: Replay attack — re-submitting same PAYMENT-SIGNATURE for new request is rejected on-chain", async function () {
    // 1. Settle legitimate payment first
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0);
    const firstResult = await client.submitPayment(X402_ALPHA_URL, payload);
    expect(firstResult.status).to.equal(200);

    // 2. Direct on-chain replay attempt with same payload
    const replayAttempt = await facilitator.settleX402(payload, "0x" + "ff".repeat(32));
    expect(replayAttempt.settled).to.equal(false);
    expect(replayAttempt.error).to.include("request ID already used");
  });

  it("XR-25: Idempotent retry — repeated HTTP request returns cached receipt with ZERO double charge", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0);

    const balanceBefore = await token.balanceOf(providerSigner.address);

    // First attempt
    const firstResult = await client.submitPayment(X402_ALPHA_URL, payload);
    expect(firstResult.status).to.equal(200);
    expect(firstResult.idempotent).to.equal(false);

    const balanceAfterFirst = await token.balanceOf(providerSigner.address);
    expect(balanceAfterFirst - balanceBefore).to.equal(4n * ONE_USDC);

    // Second attempt (simulating lost response retry)
    const secondResult = await client.submitPayment(X402_ALPHA_URL, payload);
    expect(secondResult.status).to.equal(200);
    expect(secondResult.idempotent).to.equal(true);

    // Provider balance MUST be identical — zero double charge
    const balanceAfterSecond = await token.balanceOf(providerSigner.address);
    expect(balanceAfterSecond).to.equal(balanceAfterFirst);
  });

  // ---------------------------------------------------------------------------
  // SECTION 5: Core Security Invariants (Rule #1 — Smart Contract Authority)
  // ---------------------------------------------------------------------------

  it("XR-26: Overspend attack — valid x402 payload for amount > budget is REJECTED by TokenBudgetEnforcer", async function () {
    const remainingBudget = await enforcer.remainingBudget();
    const overspendAmount = remainingBudget + 10n * ONE_USDC;

    const fakeReqId = ethers.id("overspend-x402-" + Date.now());
    const validBefore = Math.floor(Date.now() / 1000) + 3600;

    // Agent signs overspend authorization
    const domain = {
      name: "TokenBudgetEnforcer",
      version: "1",
      chainId: 31337,
      verifyingContract: enforcerAddress,
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
      reqId: fakeReqId,
      provider: providerSigner.address,
      amount: overspendAmount,
      validBefore,
    };
    const signature = await agentSigner.signTypedData(domain, types, value);

    // Structurally valid x402 PaymentPayload
    const overspendPayload = {
      x402Version: 2,
      resource: { url: "/x402/providers/alpha-translate/service" },
      accepted: {
        scheme: "exact",
        network: "eip155:31337",
        amount: overspendAmount.toString(),
        asset: tokenAddress,
        payTo: providerSigner.address,
        maxTimeoutSeconds: 3600,
        extra: { reqId: fakeReqId },
      },
      payload: {
        reqId: fakeReqId,
        provider: providerSigner.address,
        amount: overspendAmount.toString(),
        validBefore,
        signature,
        payer: agentSigner.address,
      },
      extensions: null,
    };

    // Attempt on-chain settlement via facilitator
    const result = await facilitator.settleX402(overspendPayload, "0x" + "aa".repeat(32));
    expect(result.settled).to.equal(false);
    expect(result.error).to.include("spending cap exceeded");
  });

  it("XR-27: Emergency freeze — valid x402 payload submitted while agent is frozen is REJECTED", async function () {
    // 1. Owner freezes agent on-chain
    await enforcer.connect(ownerSigner).freezeAgent(true);
    expect(await enforcer.isFrozen()).to.equal(true);

    // 2. Frozen agent requests challenge and signs valid payload
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0);

    // 3. Submit payment -> must fail because contract rejects frozen agent
    const res = await axios.get(X402_ALPHA_URL, {
      headers: { "PAYMENT-SIGNATURE": encodePaymentSignatureHeader(payload) },
      validateStatus: () => true,
    });
    expect(res.status).to.equal(402);
    expect(res.data.detail).to.include("frozen");

    // 4. Unfreeze for subsequent tests
    await enforcer.connect(ownerSigner).freezeAgent(false);
    expect(await enforcer.isFrozen()).to.equal(false);
  });

  it("XR-28: Delivery content tampering — provider payload alteration is detected by SHA-256 mismatch", async function () {
    marketplace.tamperNextFor("delta-compute");
    const deltaUrl = `${BASE_URL}/x402/providers/delta-compute/service`;

    const { paymentRequired } = await client.requestChallenge(deltaUrl, { serviceId: "data-process" });
    const payload = await client.createPaymentPayload(paymentRequired, 0);
    const result = await client.submitPayment(deltaUrl, payload, { params: { serviceId: "data-process" } });

    // Payment settled on-chain, BUT client detects delivery tampering independently
    expect(result.hashVerified).to.equal(false);
    expect(result.receipt.content.TAMPERED).to.equal(true);
  });

  it("XR-29: Facilitator verifyX402() distinguishes read-only check from settleX402() state-changing settlement", async function () {
    const { paymentRequired } = await client.requestChallenge(X402_ALPHA_URL);
    const payload = await client.createPaymentPayload(paymentRequired, 0);

    const spendBefore = await enforcer.settledSpend();

    // 1. verifyX402 is strictly read-only: does not execute transaction or alter spend
    const verifyResult = await facilitator.verifyX402(payload, paymentRequired.accepts[0]);
    expect(verifyResult.valid).to.equal(true);

    const spendAfterVerify = await enforcer.settledSpend();
    expect(spendAfterVerify).to.equal(spendBefore);

    // 2. settleX402 is state-changing: executes blockchain transaction and increments spend
    const settleResult = await facilitator.settleX402(payload, "0x" + "11".repeat(32));
    expect(settleResult.settled).to.equal(true);

    const spendAfterSettle = await enforcer.settledSpend();
    expect(spendAfterSettle).to.equal(spendBefore + 4n * ONE_USDC);
  });

  it("XR-30: Official SDK interoperability — @x402/core decode, encode, and schema validation roundtrip", function () {
    const prOriginal = {
      x402Version: 2,
      resource: { url: "http://localhost/test", serviceName: "test-provider" },
      accepts: [
        {
          scheme: "exact",
          network: "eip155:31337",
          amount: "5000000",
          asset: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          payTo: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          maxTimeoutSeconds: 300,
          extra: { reqId: "0x123" },
        },
      ],
      extensions: null,
    };

    const header = encodePaymentRequiredHeader(prOriginal);
    const decoded = decodePaymentRequiredHeader(header);
    const validated = validatePaymentRequired(decoded);

    expect(validated.x402Version).to.equal(2);
    expect(validated.accepts[0].amount).to.equal("5000000");
    expect(validated.accepts[0].network).to.equal("eip155:31337");
  });
});
