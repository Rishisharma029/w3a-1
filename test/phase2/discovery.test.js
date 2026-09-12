/**
 * test/phase2/discovery.test.js
 *
 * Tests for the Phase 2 marketplace registry and service discovery.
 * These tests use the marketplace server with an in-process contract verifier.
 */

"use strict";

const { expect }  = require("chai");
const { ethers }  = require("hardhat");
const axios       = require("axios");

const { createMarketplace } = require("../../marketplace/server");
const { PROVIDERS }         = require("../../marketplace/providers");

const MARKET_PORT = 13200;
const MARKET_URL  = `http://localhost:${MARKET_PORT}`;

// ---------------------------------------------------------------------------
// Suite setup — deploy contract once, start marketplace
// ---------------------------------------------------------------------------
describe("Phase 2 — Service Discovery", function () {
  this.timeout(30000);

  let enforcer, ownerSigner, agentSigner;
  let marketplace;
  let snapshotId;

  before(async function () {
    [ownerSigner, agentSigner] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("BudgetEnforcer");
    enforcer = await Factory.deploy(ownerSigner.address, agentSigner.address, 50n);
    await enforcer.waitForDeployment();

    const contractAddress = await enforcer.getAddress();
    const verifierOverride = {
      verifyAuthorization: (reqId, amt) => enforcer.verifyAuthorization(reqId, amt),
    };

    marketplace = createMarketplace({
      port:              MARKET_PORT,
      contractAddress,
      baseUrl:           MARKET_URL,
      _verifierOverride: verifierOverride,
    });
    await new Promise((r) => setTimeout(r, 200));
  });

  beforeEach(async function () {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
    marketplace.clearAll();
    // Restore all providers to full availability
    for (const p of PROVIDERS) p.availability = 1.0;
  });

  afterEach(async function () {
    await ethers.provider.send("evm_revert", [snapshotId]);
    marketplace.clearAll();
    for (const p of PROVIDERS) p.availability = 1.0;
  });

  after(function () {
    return marketplace.stop();
  });

  // =========================================================================
  // D-01: Full provider list
  // =========================================================================
  it("D-01 — /registry/discover returns all 5 providers", async function () {
    const resp = await axios.get(`${MARKET_URL}/registry/discover`);
    expect(resp.status).to.equal(200);
    expect(resp.data.providers).to.have.lengthOf(5);
    const ids = resp.data.providers.map((p) => p.providerId);
    expect(ids).to.include("alpha-translate");
    expect(ids).to.include("beta-translate");
    expect(ids).to.include("gamma-translate");
    expect(ids).to.include("delta-compute");
    expect(ids).to.include("epsilon-vision");
  });

  // =========================================================================
  // D-02: Filter by serviceType=translation
  // =========================================================================
  it("D-02 — serviceType=translation returns only translation providers", async function () {
    const resp = await axios.get(`${MARKET_URL}/registry/discover`, {
      params: { serviceType: "translation" },
    });
    expect(resp.data.providers).to.have.lengthOf(3);
    resp.data.providers.forEach((p) => {
      expect(p.serviceType).to.equal("translation");
    });
  });

  // =========================================================================
  // D-03: Filter by serviceType=compute
  // =========================================================================
  it("D-03 — serviceType=compute returns exactly 1 provider", async function () {
    const resp = await axios.get(`${MARKET_URL}/registry/discover`, {
      params: { serviceType: "compute" },
    });
    expect(resp.data.providers).to.have.lengthOf(1);
    expect(resp.data.providers[0].providerId).to.equal("delta-compute");
  });

  // =========================================================================
  // D-04: Filter by minQuality=0.93 (above three providers)
  // =========================================================================
  it("D-04 — minQuality=0.93 returns only high-quality providers", async function () {
    const resp = await axios.get(`${MARKET_URL}/registry/discover`, {
      params: { minQuality: 0.93 },
    });
    resp.data.providers.forEach((p) => {
      expect(p.qualityScore).to.be.greaterThanOrEqual(0.93);
    });
    // gamma-translate(0.97) and epsilon-vision(0.95) qualify
    expect(resp.data.providers.length).to.be.greaterThanOrEqual(2);
  });

  // =========================================================================
  // D-05: Filter by maxPrice=3 excludes expensive providers
  // =========================================================================
  it("D-05 — maxPrice=3 excludes providers whose cheapest service > 3", async function () {
    const resp = await axios.get(`${MARKET_URL}/registry/discover`, {
      params: { maxPrice: 3 },
    });
    resp.data.providers.forEach((p) => {
      const cheapest = Math.min(...p.services.map((s) => s.price));
      expect(cheapest).to.be.lessThanOrEqual(3);
    });
  });

  // =========================================================================
  // D-06: Unknown serviceType returns empty list (not error)
  // =========================================================================
  it("D-06 — unknown serviceType returns empty providers list", async function () {
    const resp = await axios.get(`${MARKET_URL}/registry/discover`, {
      params: { serviceType: "quantum-computing" },
    });
    expect(resp.status).to.equal(200);
    expect(resp.data.providers).to.have.lengthOf(0);
  });

  // =========================================================================
  // D-07: Each provider has required discovery fields
  // =========================================================================
  it("D-07 — each provider entry has required discovery fields", async function () {
    const resp = await axios.get(`${MARKET_URL}/registry/discover`);
    for (const p of resp.data.providers) {
      expect(p).to.have.property("providerId").that.is.a("string");
      expect(p).to.have.property("name").that.is.a("string");
      expect(p).to.have.property("serviceType").that.is.a("string");
      expect(p).to.have.property("qualityScore").that.is.a("number");
      expect(p).to.have.property("estimatedLatencyMs").that.is.a("number");
      expect(p).to.have.property("availability").that.is.a("number");
      expect(p).to.have.property("services").that.is.an("array");
      for (const s of p.services) {
        expect(s).to.have.property("serviceId").that.is.a("string");
        expect(s).to.have.property("price").that.is.a("number");
        expect(s).to.have.property("currency", "UNIT");
      }
    }
  });

  // =========================================================================
  // D-08: Unavailable provider excluded from discovery
  // =========================================================================
  it("D-08 — provider with availability=0 is excluded from discovery", async function () {
    // Set one provider unavailable
    marketplace.setProviderAvailability("beta-translate", 0);

    const resp = await axios.get(`${MARKET_URL}/registry/discover`, {
      params: { serviceType: "translation" },
    });
    const ids = resp.data.providers.map((p) => p.providerId);
    expect(ids).to.not.include("beta-translate");
    expect(resp.data.providers.length).to.equal(2); // only alpha and gamma
  });
});
