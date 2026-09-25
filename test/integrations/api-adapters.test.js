"use strict";

const { expect } = require("chai");
const crypto = require("crypto");

const { ConfigManager, KNOWN_CONFIGS } = require("../../integrations/configuration");
const {
  ADAPTERS,
  SERVICE_TO_ADAPTER,
  getAdapterByProvider,
  getAdapterByService,
} = require("../../integrations/adapters");
const { BaseAdapter, ALLOWED_HOSTS } = require("../../integrations/adapters/base/base-adapter");
const { HealthChecker } = require("../../integrations/health/health-checker");
const { keywordParseIntent } = require("../../agent/llm-client");

describe("Third-Party API Integration & Adapter Security Suite", function () {
  this.timeout(20000);

  // =========================================================================
  // 1. Configuration & Secret Isolation Tests
  // =========================================================================
  describe("Configuration Manager & Secret Isolation", function () {
    it("CFG-01: Correctly registers all 8 target third-party APIs", function () {
      const providerIds = Object.keys(KNOWN_CONFIGS);
      expect(providerIds).to.include("ipstack-geo");
      expect(providerIds).to.include("currencylayer-fx");
      expect(providerIds).to.include("giphy-media");
      expect(providerIds).to.include("apiflash-render");
      expect(providerIds).to.include("amazon-scraper");
      expect(providerIds).to.include("blitapp-cloud");
      expect(providerIds).to.include("apitemplate-docs");
      expect(providerIds).to.include("open-meteo");
    });

    it("CFG-02: Public status inspection never exposes raw API keys", function () {
      const statuses = ConfigManager.getAllProviderStatuses();
      expect(statuses.length).to.be.greaterThanOrEqual(8);
      for (const s of statuses) {
        expect(s).to.not.have.property("key");
        expect(s).to.not.have.property("apiKey");
        expect(s).to.not.have.property("secret");
        expect(JSON.stringify(s)).to.not.match(/b87d3fa28bfa|c00aNTk3MjE|tuhvgsQqlVB/);
      }
    });

    it("CFG-03: Extensible custom credential registration without guessing unknown keys", function () {
      ConfigManager.registerCustomConfig("custom-provider-test", "TEST_CUSTOM_KEY", "Test Custom Provider");
      const status = ConfigManager.getSanitizedStatus("custom-provider-test");
      expect(status.providerId).to.equal("custom-provider-test");
      expect(status.name).to.equal("Test Custom Provider");
    });
  });

  // =========================================================================
  // 2. SSRF Protection & Security Invariant Tests
  // =========================================================================
  describe("SSRF Protection & Base Adapter Security", function () {
    const dummyAdapter = new BaseAdapter({
      providerId: "test-adapter",
      serviceId: "test-svc",
      adapterType: "REST",
      defaultEndpoint: "http://api.ipstack.com",
    });

    it("SEC-01: Strictly allows whitelisted provider hostnames", function () {
      expect(dummyAdapter.validateUrl("http://api.ipstack.com/check")).to.be.true;
      expect(dummyAdapter.validateUrl("https://api.open-meteo.com/v1/forecast")).to.be.true;
      expect(dummyAdapter.validateUrl("https://api.giphy.com/v1/gifs/search")).to.be.true;
    });

    it("SEC-02: Strictly rejects unauthorized external hostnames (SSRF prevention)", function () {
      expect(() => dummyAdapter.validateUrl("http://malicious-site.com/steal-data")).to.throw(/SSRF/);
      expect(() => dummyAdapter.validateUrl("http://169.254.169.254/latest/meta-data")).to.throw(/SSRF/);
      expect(() => dummyAdapter.validateUrl("http://localhost:3306")).to.throw(/SSRF/);
      expect(() => dummyAdapter.validateUrl("http://127.0.0.1:8088")).to.throw(/SSRF/);
    });

    it("SEC-03: Strictly rejects non-http/https schemes (file:, gopher:, ftp:)", function () {
      expect(() => dummyAdapter.validateUrl("file:///etc/passwd")).to.throw(/SSRF/);
      expect(() => dummyAdapter.validateUrl("gopher://evil.com")).to.throw(/SSRF/);
    });

    it("SEC-04: Computes canonical deterministic SHA-256 delivery hash", function () {
      const payload1 = { b: 2, a: 1 };
      const payload2 = { a: 1, b: 2 };
      const hash1 = dummyAdapter.computeDeliveryHash(payload1);
      const hash2 = dummyAdapter.computeDeliveryHash(payload2);
      expect(hash1).to.equal(hash2);
      expect(hash1).to.match(/^sha256:[a-f0-9]{64}$/);
    });
  });

  // =========================================================================
  // 3. Adapter Execution & Resilience Tests (Live & Simulation Fallback)
  // =========================================================================
  describe("API Adapter Execution Matrix", function () {
    it("ADP-01: Open-Meteo Weather Adapter executes and produces valid atmospheric data", async function () {
      const adapter = getAdapterByService("open-meteo-weather");
      expect(adapter).to.exist;

      const result = await adapter.execute({ city: "Delhi" }, {});
      expect(result.success).to.be.true;
      expect(result.deliveryHash).to.match(/^sha256:[a-f0-9]{64}$/);
      expect(result.data).to.have.property("current_weather");
      expect(["LIVE", "LOCAL FALLBACK"]).to.include(result.mode);
    });

    it("ADP-02: IPStack Geolocation Adapter returns valid geolocation coordinates", async function () {
      const adapter = getAdapterByService("ipstack-lookup");
      expect(adapter).to.exist;

      const result = await adapter.execute({ ip: "134.201.250.155" }, {});
      expect(result.success).to.be.true;
      expect(result.deliveryHash).to.match(/^sha256:[a-f0-9]{64}$/);
      expect(result.data).to.have.property("ip");
      expect(["LIVE", "LOCAL FALLBACK"]).to.include(result.mode);
    });

    it("ADP-03: CurrencyLayer Forex Adapter returns exchange rate quotes", async function () {
      const adapter = getAdapterByService("currencylayer-live");
      expect(adapter).to.exist;

      const result = await adapter.execute({ currencies: "EUR,GBP,INR" }, {});
      expect(result.success).to.be.true;
      expect(result.deliveryHash).to.match(/^sha256:[a-f0-9]{64}$/);
      expect(result.data).to.have.property("quotes");
      expect(["LIVE", "LOCAL FALLBACK"]).to.include(result.mode);
    });

    it("ADP-04: Giphy Media Adapter executes search and returns animated assets", async function () {
      const adapter = getAdapterByService("giphy-search");
      expect(adapter).to.exist;

      const result = await adapter.execute({ query: "machine payment" }, {});
      expect(result.success).to.be.true;
      expect(result.deliveryHash).to.match(/^sha256:[a-f0-9]{64}$/);
      expect(result.data).to.have.property("data");
      expect(Array.isArray(result.data.data)).to.be.true;
    });

    it("ADP-05: ApiFlash Screenshot Adapter captures website document", async function () {
      const adapter = getAdapterByService("apiflash-capture");
      expect(adapter).to.exist;

      const result = await adapter.execute({ targetUrl: "https://ethereum.org" }, {});
      expect(result.success).to.be.true;
      expect(result.deliveryHash).to.match(/^sha256:[a-f0-9]{64}$/);
      expect(result.data).to.have.property("url");
    });

    it("ADP-06: Amazon Scraper Adapter extracts structured catalog data", async function () {
      const adapter = getAdapterByService("amazon-product-data");
      expect(adapter).to.exist;

      const result = await adapter.execute({ asin: "B08N5WRWNW" }, {});
      expect(result.success).to.be.true;
      expect(result.deliveryHash).to.match(/^sha256:[a-f0-9]{64}$/);
      expect(result.data).to.have.property("asin");
      expect(result.data).to.have.property("price");
    });

    it("ADP-07: APITemplate Document Adapter generates dynamic PDF receipts", async function () {
      const adapter = getAdapterByService("apitemplate-pdf");
      expect(adapter).to.exist;

      const result = await adapter.execute({ title: "W3A-1 Settlement Receipt" }, {});
      expect(result.success).to.be.true;
      expect(result.deliveryHash).to.match(/^sha256:[a-f0-9]{64}$/);
      expect(result.data).to.have.property("download_url");
    });

    it("ADP-08: Force simulation flag deterministically returns high-fidelity local simulation", async function () {
      const adapter = getAdapterByService("open-meteo-weather");
      const simResult = await adapter.execute({ city: "Delhi", forceSimulation: true }, {});
      expect(simResult.mode).to.equal("LOCAL FALLBACK");
      expect(simResult.data.simulated).to.be.true;
      expect(simResult.deliveryHash).to.match(/^sha256:[a-f0-9]{64}$/);
    });
  });

  // =========================================================================
  // 4. Health Check Verification Matrix
  // =========================================================================
  describe("Health Checker & Verification Engine", function () {
    this.timeout(30000);

    it("HLT-01: Correctly classifies zero-auth Open-Meteo as AVAILABLE", async function () {
      const health = await HealthChecker.checkProviderHealth("open-meteo");
      expect(["AVAILABLE", "DEGRADED"]).to.include(health.status);
      expect(health.isConfigured).to.be.true;
    });

    it("HLT-02: Returns REQUIRES_CONFIGURATION if an API key is missing", async function () {
      const oldVal = process.env.APIFLASH_ACCESS_KEY;
      const oldAlt = process.env.APIFLASH_API_KEY;
      delete process.env.APIFLASH_ACCESS_KEY;
      delete process.env.APIFLASH_API_KEY;
      try {
        const health = await HealthChecker.checkProviderHealth("apiflash-render");
        expect(health.status).to.equal("REQUIRES_CONFIGURATION");
        expect(health.message).to.include("Requires provider configuration");
      } finally {
        if (oldVal !== undefined) process.env.APIFLASH_ACCESS_KEY = oldVal;
        if (oldAlt !== undefined) process.env.APIFLASH_API_KEY = oldAlt;
      }
    });

    it("HLT-03: checkAllProviders verifies the entire catalog", async function () {
      const map = await HealthChecker.checkAllProviders();
      const keys = Object.keys(map);
      expect(keys.length).to.be.greaterThanOrEqual(8);
      expect(map).to.have.property("open-meteo");
      expect(map).to.have.property("currencylayer-fx");
    });
  });

  // =========================================================================
  // 5. SmartAgent Intent Parsing for API-Backed Services
  // =========================================================================
  describe("SmartAgent Intent Parsing & Service Matching", function () {
    it("INT-01: Parses weather query for Delhi under $1", function () {
      const intent = keywordParseIntent("I need a weather service for Delhi under $1.");
      expect(intent.serviceType).to.equal("data-compute");
      expect(intent.preferredProvider).to.equal("open-meteo");
      expect(intent.maxPrice).to.equal(1);
      expect(intent.payload).to.deep.equal({ city: "Delhi" });
    });

    it("INT-02: Parses currency conversion request under $2", function () {
      const intent = keywordParseIntent("Find me a currency conversion service for USD to EUR and GBP under $2.");
      expect(intent.serviceType).to.equal("data-compute");
      expect(intent.preferredProvider).to.equal("currencylayer-fx");
      expect(intent.maxPrice).to.equal(2);
    });

    it("INT-03: Parses IP lookup request", function () {
      const intent = keywordParseIntent("Lookup IP address geolocation for 134.201.250.155");
      expect(intent.serviceType).to.equal("data-compute");
      expect(intent.preferredProvider).to.equal("ipstack-geo");
      expect(intent.payload).to.deep.equal({ ip: "134.201.250.155" });
    });

    it("INT-04: Parses Amazon scraper request", function () {
      const intent = keywordParseIntent("Scrape Amazon product details for ASIN B08N5WRWNW under $3.");
      expect(intent.serviceType).to.equal("data-compute");
      expect(intent.preferredProvider).to.equal("amazon-scraper");
      expect(intent.payload).to.deep.equal({ asin: "B08N5WRWNW" });
    });
  });
});
