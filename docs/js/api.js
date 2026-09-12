/**
 * dashboard/public/js/api.js
 *
 * Centralized API & Synchronization Service
 * ===========================================
 * Connects the UI to live backend REST endpoints:
 *   - GET  /api/budget
 *   - GET  /api/transactions
 *   - GET  /api/x402/transactions
 *   - GET  /api/security
 *   - GET  /api/providers
 *   - GET  /api/config
 *   - POST /api/freeze
 *   - POST /api/fund
 *
 * Provides transparent fallback to high-fidelity mock data if the backend
 * is offline or when the user explicitly enables "DEMO DATA" mode.
 */

const ApiService = {
  baseUrl: "",

  async init() {
    await this.syncAll();
  },

  async syncAll() {
    if (AppState.isMockMode) {
      return;
    }

    try {
      const [bRes, tRes, xRes, sRes, pRes, cRes, svcRes] = await Promise.allSettled([
        fetch(`${this.baseUrl}/api/budget`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
        fetch(`${this.baseUrl}/api/transactions`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
        fetch(`${this.baseUrl}/api/x402/transactions`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
        fetch(`${this.baseUrl}/api/security`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
        fetch(`${this.baseUrl}/api/providers`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
        fetch(`${this.baseUrl}/api/config`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
        fetch(`${this.baseUrl}/api/services`).then((r) => (r.ok ? r.json() : Promise.reject(r))),
      ]);

      const isOnline = bRes.status === "fulfilled";
      AppState.isBackendReachable = isOnline;

      if (isOnline) {
        if (bRes.value) AppState.updateBudget(bRes.value);
        if (tRes.value && tRes.value.transactions) AppState.updateTransactions(tRes.value.transactions);
        if (xRes.value && xRes.value.transactions) AppState.updateX402Transactions(xRes.value.transactions);
        if (sRes.value && sRes.value.alerts) AppState.updateAlerts(sRes.value.alerts);
        if (pRes.value && pRes.value.providers && pRes.value.providers.length > 0) {
          AppState.updateProviders(pRes.value.providers);
        }
        if (cRes.value) Object.assign(AppState.config, cRes.value);
        if (svcRes.status === "fulfilled" && svcRes.value && svcRes.value.services) {
          AppState.updateServices(svcRes.value.services);
        }
      } else {
        // Backend offline -> gracefully fallback to seeded mock data
        if (!AppState.isMockMode) {
          AppState.loadMockSeed();
        }
      }
    } catch (err) {
      console.warn("ApiService sync error (fallback to mock):", err);
      AppState.isBackendReachable = false;
      if (!AppState.isMockMode) {
        AppState.loadMockSeed();
      }
    }
  },

  async toggleFreeze(freeze) {
    if (AppState.isMockMode || !AppState.isBackendReachable) {
      AppState.updateBudget({ isFrozen: freeze });
      return { success: true, isFrozen: freeze, txHash: "0xmock_freeze_tx_" + Date.now().toString(16) };
    }

    const res = await fetch(`${this.baseUrl}/api/freeze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freeze }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Freeze request failed");
    }

    const data = await res.json();
    await this.syncAll();
    return data;
  },

  async fundBudget(amountUSD) {
    if (AppState.isMockMode || !AppState.isBackendReachable) {
      const curFunded = parseFloat(AppState.budget.totalFunded) + amountUSD;
      const curRemaining = parseFloat(AppState.budget.remaining) + amountUSD;
      AppState.updateBudget({
        totalFunded: curFunded.toFixed(2),
        authorizedBudget: curFunded.toFixed(2),
        remaining: curRemaining.toFixed(2),
      });
      return { success: true, fundedAmount: amountUSD, txHash: "0xmock_fund_tx_" + Date.now().toString(16) };
    }

    const res = await fetch(`${this.baseUrl}/api/fund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountUSD }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Funding request failed");
    }

    const data = await res.json();
    await this.syncAll();
    return data;
  },

  async fundAgent(amountUSD) {
    return this.fundBudget(amountUSD);
  },

  async getN8nStatus() {
    try {
      const res = await fetch(`${this.baseUrl}/api/orchestrate/n8n/status`);
      if (res.ok) return await res.json();
    } catch (_) {}
    return {
      connected: true,
      workflowId: "cveIFBZn9aM1CNLF",
      workflowName: "W3A-1 — Autonomous x402 Purchase Orchestrator",
      webhookUrl: "https://rishisharma029.app.n8n.cloud/webhook/w3a1/purchase",
      executionCount: 0,
    };
  },

  async orchestrateN8n(options = {}) {
    const res = await fetch(`${this.baseUrl}/api/orchestrate/n8n`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    const data = await res.json();
    await this.syncAll();
    return data;
  },

  async getServices() {
    try {
      const res = await fetch(`${this.baseUrl}/api/services`);
      if (res.ok) {
        const data = await res.json();
        return data.services || [];
      }
    } catch (_) {}
    return AppState.services || [];
  },

  async publishService(serviceData) {
    if (AppState.isMockMode || !AppState.isBackendReachable) {
      const isJob = (serviceData.category || "").toLowerCase() === "compute";
      const priceNum = Number(serviceData.price) || 4;
      const qualityNum = Number(serviceData.quality) || 0.92;
      const mockResult = {
        success: true,
        serviceId: (serviceData.name || "service").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: serviceData.name,
        providerId: serviceData.providerId || "alpha-translate",
        providerName: serviceData.providerName || "Alpha Translate",
        description: serviceData.description || `${serviceData.name} autonomous service`,
        price: `$${priceNum.toFixed(2)} USDC / ${isJob ? "job" : "request"}`,
        priceNum,
        quality: qualityNum,
        latency: serviceData.latency || "180ms",
        category: serviceData.category || "Translation",
        endpoint: serviceData.endpoint || `/x402/providers/alpha-translate/service`,
        protocol: "x402 V2",
        status: "AVAILABLE",
        x402Enabled: true,
      };
      if (typeof AppState !== "undefined" && typeof AppState.addService === "function") {
        AppState.addService(mockResult);
      }
      return mockResult;
    }

    const res = await fetch(`${this.baseUrl}/api/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serviceData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Failed to publish service" }));
      throw new Error(err.error || "Service publication failed");
    }

    const data = await res.json();
    await this.syncAll();
    return data;
  },

  async testServiceChallenge(endpointUrl) {
    try {
      const target = endpointUrl.startsWith("http") ? endpointUrl : `${this.baseUrl}${endpointUrl}`;
      const res = await fetch(target, { method: "GET" });
      const rawPr = res.headers.get("payment-required") || res.headers.get("PAYMENT-REQUIRED");
      let decodedPr = null;
      if (rawPr) {
        try {
          decodedPr = JSON.parse(atob(rawPr));
        } catch (_) {}
      }
      return {
        status: res.status,
        statusText: res.statusText,
        rawHeader: rawPr,
        paymentRequired: decodedPr,
        is402: res.status === 402,
      };
    } catch (err) {
      return {
        status: 0,
        error: err.message,
        is402: false,
      };
    }
  },

  async executeAiPurchase(prompt) {
    if (AppState.isMockMode || !AppState.isBackendReachable) {
      // High-fidelity fallback for offline/demo mode
      const mockResult = {
        success: true,
        runId: "MOCK-AI-" + Date.now(),
        prompt,
        parsedIntent: {
          serviceType: "translation",
          priority: "quality",
          minQuality: 0.90,
          maxPrice: 5,
          targetLanguage: "English",
        },
        selectedProvider: {
          providerId: "alpha-translate",
          name: "Alpha Translation Services",
          price: 4,
          quality: 0.92,
          latency: "200ms",
          reason: "Meets quality >= 0.90, within $5.00 budget cap, highest Pareto score",
        },
        candidateEvaluations: [
          {
            providerId: "alpha-translate",
            name: "Alpha Translation Services",
            price: 4,
            priceFormatted: "$4.00 USDC",
            quality: 0.92,
            latency: "200ms",
            aiScore: 0.91,
            status: "SELECTED",
            why: "Meets quality >= 0.90, within $5.00 budget cap, best weighted score",
          },
          {
            providerId: "beta-translate",
            name: "Beta Translate (Budget)",
            price: 2.5,
            priceFormatted: "$2.50 USDC",
            quality: 0.84,
            latency: "100ms",
            aiScore: 0.76,
            status: "REJECTED",
            why: "Quality 0.84 is below 0.90 requirement for highest quality",
          },
          {
            providerId: "gamma-translate",
            name: "Gamma Fast Translate",
            price: 6,
            priceFormatted: "$6.00 USDC",
            quality: 0.98,
            latency: "400ms",
            aiScore: 0,
            status: "REJECTED",
            why: "$6.00 exceeds user $5.00 maximum budget constraint",
          },
        ],
        trace: {
          reqId: "0xmock_ai_req_" + Date.now().toString(16),
          amountUSD: "4.00",
          txHash: "0xda48b1c9f4d7159c8e192a6374028471b058c067e26830571092e093847228e9",
          blockNumber: 13,
          deliveryHash: "sha256:366cfc3da3d1160ea0519cacc7fd255f48b39114681212789c53d3ce2a12e16c",
          deliveredContent: {
            translatedText: "[Alpha] PDF Translation → (translated to English)",
            confidence: 0.92,
          },
          verified: true,
          status: "COMPLETE",
        },
      };
      return mockResult;
    }

    const res = await fetch(`${this.baseUrl}/api/orchestrate/ai-purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "AI purchase failed" }));
      throw new Error(err.error || "AI purchase failed");
    }

    const data = await res.json();
    await this.syncAll();
    return data;
  },
};

if (typeof window !== "undefined") {
  window.ApiService = ApiService;
}
