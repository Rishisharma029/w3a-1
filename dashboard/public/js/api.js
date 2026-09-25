// Client-Side In-Memory Query Cache with In-Flight Deduplication & TTL
const ClientQueryCache = {
  cache: new Map(),
  inFlight: new Map(),

  async fetch(url, options = {}, ttlMs = 4000) {
    const method = (options.method || "GET").toUpperCase();
    if (method !== "GET") {
      return fetch(url, options).then((r) => (r.ok ? r.json() : Promise.reject(r)));
    }

    const key = url;
    const now = Date.now();
    const cached = this.cache.get(key);
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
        return data;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  },

  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (!pattern || key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  },
};

const ApiService = {
  baseUrl: "",
  queryCache: ClientQueryCache,

  async init() {
    await this.syncAll();
  },

  async syncAll() {
    if (AppState.isMockMode) {
      return;
    }

    try {
      const [bRes, tRes, xRes, sRes, pRes, cRes, svcRes] = await Promise.allSettled([
        ClientQueryCache.fetch(`${this.baseUrl}/api/budget`, {}, 3000),
        ClientQueryCache.fetch(`${this.baseUrl}/api/transactions`, {}, 3000),
        ClientQueryCache.fetch(`${this.baseUrl}/api/x402/transactions`, {}, 4000),
        ClientQueryCache.fetch(`${this.baseUrl}/api/security`, {}, 5000),
        ClientQueryCache.fetch(`${this.baseUrl}/api/providers`, {}, 15000),
        ClientQueryCache.fetch(`${this.baseUrl}/api/config`, {}, 60000),
        ClientQueryCache.fetch(`${this.baseUrl}/api/services`, {}, 15000),
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
        // Backend offline -> gracefully fallback to seeded mock data only if state empty
        if (!AppState.isMockMode && (!AppState.transactions || AppState.transactions.length === 0)) {
          AppState.loadMockSeed();
        }
      }
    } catch (err) {
      console.warn("ApiService sync error (fallback to mock):", err);
      AppState.isBackendReachable = false;
      if (!AppState.isMockMode && (!AppState.transactions || AppState.transactions.length === 0)) {
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

    ClientQueryCache.invalidate("budget");
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

    ClientQueryCache.invalidate("budget");
    const data = await res.json();
    await this.syncAll();
    return data;
  },

  async fundAgent(amountUSD) {
    return this.fundBudget(amountUSD);
  },


) {
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
      const data = await ClientQueryCache.fetch("services", 15000, async () => {
        const res = await fetch(`${this.baseUrl}/api/services`);
        if (!res.ok) throw new Error("Failed to fetch services");
        return await res.json();
      });
      return data.services || [];
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

    ClientQueryCache.invalidate("services");
    ClientQueryCache.invalidate("providers");
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
          txHash: "0x20c9008318891465b63dd8720c78919b3e582a09af77d77336dd97d448d3a136",
          blockNumber: 11766134,
          etherscanUrl: "https://sepolia.etherscan.io/tx/0x20c9008318891465b63dd8720c78919b3e582a09af77d77336dd97d448d3a136",
          network: "Ethereum Sepolia Testnet",
          caip2: "eip155:11155111",
          chainId: 11155111,
          contractAddress: "0xf9f296e97062F49ad3d13aF96729F7c35a7eA75e",
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
    ClientQueryCache.invalidate("budget");
    ClientQueryCache.invalidate("transactions");
    ClientQueryCache.invalidate("sepolia");
    await this.syncAll();
    return data;
  },

  async getSepoliaTransactions() {
    try {
      const data = await ClientQueryCache.fetch(`${this.baseUrl}/api/sepolia/transactions`, {}, 5000);
      return data.transactions || [];
    } catch (_) {
      return [];
    }
  },

  async verifySepoliaTx(txHash) {
    try {
      return await ClientQueryCache.fetch(`${this.baseUrl}/api/sepolia/verify?txHash=${encodeURIComponent(txHash)}`, {}, 10000);
    } catch (err) {
      return { verified: false, error: err.message };
    }
  },
};

if (typeof window !== "undefined") {
  window.ApiService = ApiService;
}
