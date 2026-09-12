/**
 * test/phase2/selection.test.js
 *
 * Tests for provider selection, scoring models, and filtering.
 */

"use strict";

const { expect } = require("chai");
const { ethers } = require("hardhat");

const { createMarketplace } = require("../../marketplace/server");
const { PROVIDERS } = require("../../marketplace/providers");
const { discoverAndSelect } = require("../../agent/provider-selector");
const { deterministicSelect, keywordParseIntent } = require("../../agent/llm-client");

const MARKET_PORT = 13201;
const MARKET_URL = `http://localhost:${MARKET_PORT}`;

describe("Phase 2 — Provider Selection and Scoring", function () {
  this.timeout(30000);

  let enforcer, ownerSigner, agentSigner;
  let marketplace;

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
      port: MARKET_PORT,
      contractAddress,
      baseUrl: MARKET_URL,
      _verifierOverride: verifierOverride,
    });
    await new Promise((r) => setTimeout(r, 200));
  });

  beforeEach(function () {
    marketplace.clearAll();
    for (const p of PROVIDERS) p.availability = 1.0;
  });

  after(function () {
    return marketplace.stop();
  });

  // =========================================================================
  // S-01: Cost-priority selects cheapest qualifying provider
  // =========================================================================
  it("S-01 — cost priority selects the cheapest qualifying provider", async function () {
    // Translation providers:
    // alpha-translate: price 4, quality 0.92
    // beta-translate:  price 3, quality 0.84
    // gamma-translate: price 6, quality 0.97
    const requirements = {
      serviceType: "translation",
      priority: "cost",
      minQuality: 0.80,
    };

    const result = await discoverAndSelect(MARKET_URL, requirements);
    expect(result.selectedProvider.providerId).to.equal("beta-translate");
    expect(result.selectionReason).to.include("cost");
  });

  // =========================================================================
  // S-02: Quality-priority selects highest-quality qualifying provider
  // =========================================================================
  it("S-02 — quality priority selects the highest-quality qualifying provider", async function () {
    const requirements = {
      serviceType: "translation",
      priority: "quality",
      maxPrice: 10,
    };

    const result = await discoverAndSelect(MARKET_URL, requirements);
    expect(result.selectedProvider.providerId).to.equal("gamma-translate");
    expect(result.selectedProvider.qualityScore).to.equal(0.97);
  });

  // =========================================================================
  // S-03: Balanced priority balances cost and quality
  // =========================================================================
  it("S-03 — balanced priority scores across price and quality", async function () {
    const requirements = {
      serviceType: "translation",
      priority: "balanced",
    };

    const result = await discoverAndSelect(MARKET_URL, requirements);
    expect(result).to.have.property("selectedProvider");
    expect(result.ranking).to.have.lengthOf(3);
    // Highest ranked provider is chosen
    expect(result.ranking[0].providerId).to.equal(result.selectedProvider.providerId);
  });

  // =========================================================================
  // S-04: minQuality filter eliminates below-threshold providers
  // =========================================================================
  it("S-04 — minQuality filter eliminates below-threshold providers before selection", async function () {
    // beta-translate is quality 0.84. If minQuality is 0.85, beta should be filtered out.
    // Between alpha (0.92, $4) and gamma (0.97, $6), cost priority should pick alpha.
    const requirements = {
      serviceType: "translation",
      priority: "cost",
      minQuality: 0.85,
    };

    const result = await discoverAndSelect(MARKET_URL, requirements);
    expect(result.selectedProvider.providerId).to.equal("alpha-translate");
    const filteredIds = result.filteredOut.map((f) => f.providerId);
    expect(filteredIds).to.include("beta-translate");
  });

  // =========================================================================
  // S-05: maxPrice filter eliminates too-expensive providers
  // =========================================================================
  it("S-05 — maxPrice filter eliminates too-expensive providers", async function () {
    // gamma-translate is $6. With maxPrice=5, gamma must be filtered out even if quality is requested.
    const requirements = {
      serviceType: "translation",
      priority: "quality",
      maxPrice: 5,
    };

    const result = await discoverAndSelect(MARKET_URL, requirements);
    expect(result.selectedProvider.providerId).to.equal("alpha-translate");
    const filteredIds = result.filteredOut.map((f) => f.providerId);
    expect(filteredIds).to.include("gamma-translate");
  });

  // =========================================================================
  // S-06: No qualifying provider throws with clear reason
  // =========================================================================
  it("S-06 — throws clear error when no provider meets criteria", async function () {
    const requirements = {
      serviceType: "translation",
      minQuality: 0.99, // none has 0.99
    };

    let caught = null;
    try {
      await discoverAndSelect(MARKET_URL, requirements);
    } catch (err) {
      caught = err;
    }

    expect(caught).to.exist;
    expect(caught.message).to.include("No providers satisfy the requirements");
    expect(caught.message).to.include("Filtered out");
  });

  // =========================================================================
  // S-07: Single qualifying provider selected regardless of score
  // =========================================================================
  it("S-07 — single qualifying provider is selected directly", async function () {
    const requirements = {
      serviceType: "compute", // only delta-compute exists
      priority: "cost",
    };

    const result = await discoverAndSelect(MARKET_URL, requirements);
    expect(result.selectedProvider.providerId).to.equal("delta-compute");
    expect(result.allCandidates).to.have.lengthOf(1);
  });
});
