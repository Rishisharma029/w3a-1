/**
 * marketplace/providers.js
 *
 * Canonical catalogue of all service providers in the W3A-1 marketplace.
 *
 * Each provider definition includes:
 *   providerId       — unique machine identifier
 *   name             — human-readable label
 *   serviceType      — category ("translation" | "compute" | "image-analysis")
 *   services         — map of serviceId → { id, name, price, generate(reqId) }
 *   qualityScore     — 0–1, independent of price
 *   estimatedLatencyMs — approximate latency
 *   availability     — 0–1 (1.0 = always available; can be lowered in tests)
 *
 * Adding a new provider: add an entry to PROVIDERS and restart the server.
 * No other code changes required.
 */

"use strict";

const PROVIDERS = [
  // ─────────────────────────────────────────────────────────────────────────
  // Translation providers (3 — different price/quality trade-offs)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:          "alpha-translate",
    name:                "Alpha Translation Services",
    serviceType:         "translation",
    qualityScore:        0.92,
    estimatedLatencyMs:  200,
    availability:        1.0,
    services: {
      "text-translate": {
        id:    "text-translate",
        name:  "Text Translation",
        price: 4,
        description: "Accurate translation with cultural nuance checking.",
        generate(reqId, payload = {}) {
          return {
            provider:        "alpha-translate",
            service:         "text-translate",
            reqId,
            sourceText:      payload.text || "The quick brown fox",
            targetLanguage:  payload.targetLanguage || "English",
            translatedText:  `[Alpha] ${payload.text || "The quick brown fox"} → (translated to ${payload.targetLanguage || "English"})`,
            qualityConfidence: 0.92,
            wordCount:       (payload.text || "The quick brown fox").split(" ").length,
            generatedAt:     new Date().toISOString(),
          };
        },
      },
    },
  },

  {
    providerId:          "beta-translate",
    name:                "Beta Translate (Budget)",
    serviceType:         "translation",
    qualityScore:        0.84,
    estimatedLatencyMs:  100,
    availability:        1.0,
    services: {
      "text-translate": {
        id:    "text-translate",
        name:  "Text Translation",
        price: 3,
        description: "Fast, cost-effective translation.",
        generate(reqId, payload = {}) {
          return {
            provider:        "beta-translate",
            service:         "text-translate",
            reqId,
            sourceText:      payload.text || "The quick brown fox",
            targetLanguage:  payload.targetLanguage || "English",
            translatedText:  `[Beta] ${payload.text || "The quick brown fox"} → (translated to ${payload.targetLanguage || "English"})`,
            qualityConfidence: 0.84,
            wordCount:       (payload.text || "The quick brown fox").split(" ").length,
            generatedAt:     new Date().toISOString(),
          };
        },
      },
    },
  },

  {
    providerId:          "gamma-translate",
    name:                "Gamma Premium Translation",
    serviceType:         "translation",
    qualityScore:        0.97,
    estimatedLatencyMs:  400,
    availability:        1.0,
    services: {
      "text-translate": {
        id:    "text-translate",
        name:  "Text Translation (Premium)",
        price: 6,
        description: "Highest quality, human-reviewed translation.",
        generate(reqId, payload = {}) {
          return {
            provider:        "gamma-translate",
            service:         "text-translate",
            reqId,
            sourceText:      payload.text || "The quick brown fox",
            targetLanguage:  payload.targetLanguage || "English",
            translatedText:  `[Gamma/Premium] ${payload.text || "The quick brown fox"} → (translated to ${payload.targetLanguage || "English"})`,
            qualityConfidence: 0.97,
            wordCount:       (payload.text || "The quick brown fox").split(" ").length,
            humanReviewed:   true,
            generatedAt:     new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Compute provider (1)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:          "delta-compute",
    name:                "Delta Compute Engine",
    serviceType:         "compute",
    qualityScore:        0.88,
    estimatedLatencyMs:  150,
    availability:        1.0,
    services: {
      "data-process": {
        id:    "data-process",
        name:  "Data Processing",
        price: 3,
        description: "Deterministic data transformation and analysis.",
        generate(reqId, payload = {}) {
          const input = payload.data || [1, 2, 3, 4, 5];
          return {
            provider:    "delta-compute",
            service:     "data-process",
            reqId,
            input,
            output: {
              sum:  input.reduce((a, b) => a + b, 0),
              mean: input.reduce((a, b) => a + b, 0) / input.length,
              min:  Math.min(...input),
              max:  Math.max(...input),
              count: input.length,
            },
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Image-analysis provider (1)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:          "epsilon-vision",
    name:                "Epsilon Vision AI",
    serviceType:         "image-analysis",
    qualityScore:        0.95,
    estimatedLatencyMs:  600,
    availability:        1.0,
    services: {
      "image-analyze": {
        id:    "image-analyze",
        name:  "Image Analysis",
        price: 5,
        description: "Object detection and scene classification.",
        generate(reqId, payload = {}) {
          return {
            provider:    "epsilon-vision",
            service:     "image-analyze",
            reqId,
            imageUrl:    payload.imageUrl || "https://example.com/sample.jpg",
            analysis: {
              objects:    ["person", "laptop", "coffee-cup"],
              scene:      "office-environment",
              confidence: 0.95,
              boundingBoxes: [
                { label: "person",     confidence: 0.97, bbox: [10, 20, 200, 400] },
                { label: "laptop",     confidence: 0.95, bbox: [150, 100, 350, 300] },
              ],
            },
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Map of providerId → provider config. */
const PROVIDER_MAP = Object.fromEntries(
  PROVIDERS.map((p) => [p.providerId, p])
);

/**
 * Get a provider by ID.
 * @param {string} providerId
 * @returns {object|undefined}
 */
function getProvider(providerId) {
  return PROVIDER_MAP[providerId];
}

/**
 * List all providers, optionally filtered.
 * @param {object} [filters]
 * @param {string} [filters.serviceType]
 * @param {number} [filters.minQuality]   — provider qualityScore >= minQuality
 * @param {number} [filters.maxPrice]     — all services priced <= maxPrice
 * @returns {object[]}
 */
function listProviders({ serviceType, minQuality, maxPrice } = {}) {
  return PROVIDERS.filter((p) => {
    if (!p.availability || p.availability <= 0) return false;
    if (serviceType && p.serviceType !== serviceType) return false;
    if (minQuality  && p.qualityScore < minQuality)  return false;
    if (maxPrice) {
      // Check if any service in this provider is affordable
      const affordable = Object.values(p.services).some(
        (s) => s.price <= maxPrice
      );
      if (!affordable) return false;
    }
    return true;
  });
}

/**
 * Get a specific service from a provider.
 * @param {string} providerId
 * @param {string} serviceId
 * @returns {{provider, service}|undefined}
 */
function getProviderService(providerId, serviceId) {
  const provider = PROVIDER_MAP[providerId];
  if (!provider) return undefined;
  const service = provider.services[serviceId];
  if (!service) return undefined;
  return { provider, service };
}

/**
 * Build the discovery listing for a provider (no internal detail).
 */
function providerToDiscovery(provider) {
  return {
    providerId:         provider.providerId,
    name:               provider.name,
    serviceType:        provider.serviceType,
    qualityScore:       provider.qualityScore,
    estimatedLatencyMs: provider.estimatedLatencyMs,
    availability:       provider.availability,
    services: Object.values(provider.services).map((s) => ({
      serviceId:   s.id,
      name:        s.name,
      price:       s.price,
      currency:    "UNIT",
      description: s.description,
    })),
  };
}

/**
 * List all services across all providers as independent marketplace items.
 */
function listAllServices() {
  const all = [];
  for (const p of PROVIDERS) {
    if (!p.availability || p.availability <= 0) continue;
    for (const s of Object.values(p.services)) {
      const isJob = p.serviceType === "compute";
      all.push({
        serviceId: s.id,
        name: s.name,
        providerId: p.providerId,
        providerName: p.name,
        description: s.description || `${s.name} provided by ${p.name}`,
        quality: s.quality || p.qualityScore,
        latency: `${s.latencyMs || p.estimatedLatencyMs}ms`,
        latencyMs: s.latencyMs || p.estimatedLatencyMs,
        price: `$${Number(s.price).toFixed(2)} USDC / ${isJob ? "job" : "request"}`,
        priceNum: Number(s.price),
        category: s.category || p.serviceType || "general",
        endpoint: `/x402/providers/${p.providerId}/service?serviceId=${s.id}`,
        protocol: "x402 V2",
        status: "AVAILABLE",
        x402Enabled: true,
      });
    }
  }
  return all;
}

/**
 * Publish / register a new service dynamically at runtime.
 */
function publishService({
  name,
  description,
  price = 4,
  quality = 0.92,
  latency = "200ms",
  category = "translation",
  endpoint,
  providerId = "alpha-translate",
  providerName,
  x402Enabled = true,
} = {}) {
  if (!name) throw new Error("Service name is required");
  const priceNum = Number(price) || 1;
  const qualityNum = Number(quality) || 0.90;
  const latencyMs = parseInt(String(latency).replace(/\D/g, ""), 10) || 200;

  // Clean or generate serviceId
  const serviceId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `service-${Date.now()}`;

  let targetProvider = PROVIDER_MAP[providerId];
  if (!targetProvider) {
    // Dynamically register new independent provider
    const newProvId = providerId || `provider-${Date.now()}`;
    const newProvName = providerName || `${name} Provider`;
    targetProvider = {
      providerId: newProvId,
      name: newProvName,
      serviceType: (category || "general").toLowerCase(),
      qualityScore: qualityNum,
      estimatedLatencyMs: latencyMs,
      availability: 1.0,
      services: {},
    };
    PROVIDERS.push(targetProvider);
    PROVIDER_MAP[newProvId] = targetProvider;
  }

  // Create service definition
  const serviceDef = {
    id: serviceId,
    name: name,
    price: priceNum,
    description: description || `${name} by ${targetProvider.name}`,
    category: (category || targetProvider.serviceType || "general").toLowerCase(),
    quality: qualityNum,
    latencyMs,
    customEndpoint: endpoint || `/x402/providers/${targetProvider.providerId}/service?serviceId=${serviceId}`,
    generate(reqId, payload = {}) {
      return {
        provider: targetProvider.providerId,
        service: serviceId,
        reqId,
        input: payload,
        output: `[${targetProvider.name}] Processed autonomous request for ${name}. Payload verified.`,
        qualityConfidence: qualityNum,
        executedAt: new Date().toISOString(),
      };
    },
  };

  targetProvider.services[serviceId] = serviceDef;

  const isJob = targetProvider.serviceType === "compute";
  return {
    success: true,
    serviceId,
    name,
    providerId: targetProvider.providerId,
    providerName: targetProvider.name,
    description: serviceDef.description,
    price: `$${priceNum.toFixed(2)} USDC / ${isJob ? "job" : "request"}`,
    priceNum,
    quality: qualityNum,
    latency: `${latencyMs}ms`,
    latencyMs,
    category: serviceDef.category,
    endpoint: serviceDef.customEndpoint,
    protocol: "x402 V2",
    status: "AVAILABLE",
    x402Enabled,
  };
}

module.exports = {
  PROVIDERS,
  getProvider,
  listProviders,
  getProviderService,
  providerToDiscovery,
  listAllServices,
  publishService,
};
