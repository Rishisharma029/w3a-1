"use strict";

const axios = require("axios");
const { selectProvider } = require("./llm-client");

async function discoverAndSelect(marketplaceBaseUrl, requirements, excludeIds = []) {
  const params = {};
  if (requirements.serviceType) params.serviceType = requirements.serviceType;

  const resp = await axios.get(`${marketplaceBaseUrl}/registry/discover`, { params });
  const allProviders = resp.data.providers || [];

  if (allProviders.length === 0) {
    throw new Error(`No providers found for service type: ${requirements.serviceType || "any"}`);
  }

  const filteredOut = [];
  const candidates  = [];

  for (const p of allProviders) {
    if (excludeIds.includes(p.providerId)) {
      filteredOut.push({ providerId: p.providerId, reason: "excluded (unavailable or failed)" });
      continue;
    }
    if (requirements.minQuality && p.qualityScore < requirements.minQuality) {
      filteredOut.push({ providerId: p.providerId, reason: `Quality ${p.qualityScore} < required ${requirements.minQuality}` });
      continue;
    }
    if (requirements.maxPrice) {
      const cheapest = Math.min(...(p.services || []).map((s) => s.price));
      if (cheapest > requirements.maxPrice) {
        filteredOut.push({ providerId: p.providerId, reason: `Cheapest service $${cheapest} > maxPrice $${requirements.maxPrice}` });
        continue;
      }
    }
    candidates.push(p);
  }

  if (candidates.length === 0) {
    const reasons = filteredOut.map((f) => `  • ${f.providerId}: ${f.reason}`).join("\n");
    throw new Error(`No providers satisfy the requirements.\nFiltered out:\n${reasons}`);
  }

  const selectionResult = await selectProvider(candidates, requirements);
  const selected = candidates.find((p) => p.providerId === selectionResult.selectedProviderId);
  if (!selected) throw new Error(`Selection returned unknown provider: ${selectionResult.selectedProviderId}`);

  let sqlDecision = null;
  let reason = selectionResult.reason;
  try {
    const phpUrl = process.env.PHP_API_URL || `${marketplaceBaseUrl}/api/marketplace/decision`;
    const decisionRes = await axios.get(phpUrl, {
      params: {
        action:      "query_decision",
        category_id: requirements.serviceType || "translation",
        budget:      requirements.maxPrice || 5.0,
        min_quality: requirements.minQuality || 0.85,
      },
      timeout: 800,
    });
    if (decisionRes.data?.success && decisionRes.data?.selected_service) {
      sqlDecision = decisionRes.data;
      reason = `[MySQL Pareto SQL Verified] ${reason}`;
    }
  } catch (_) {}

  return { selectedProvider: selected, selectionReason: reason, ranking: selectionResult.ranking || [], filteredOut, allCandidates: candidates, sqlDecision };
}

function pickService(providerDiscovery, serviceType) {
  const services = providerDiscovery.services || [];
  if (services.length === 0) return undefined;
  return [...services].sort((a, b) => a.price - b.price)[0];
}

module.exports = { discoverAndSelect, pickService };
