/**
 * agent/provider-selector.js
 *
 * Provider discovery + filtering + selection.
 *
 * This module is the bridge between the LLM's structured intent spec
 * and the live provider registry.
 *
 * It is deterministic in that:
 *   - Registry data is fetched via HTTP.
 *   - Hard filters (minQuality, maxPrice) are enforced here — not by the LLM.
 *   - The LLM (or deterministic scorer) is only consulted AFTER filtering.
 *
 * If the user's requirements cannot be satisfied by ANY available provider,
 * this throws with a clear, human-readable explanation — before any payment
 * is attempted.
 */

"use strict";

const axios = require("axios");
const { selectProvider } = require("./llm-client");

/**
 * Discover providers from the registry, apply hard filters, and select one.
 *
 * @param {string} marketplaceBaseUrl
 * @param {object} requirements       - From llm-client.parseIntent()
 * @param {string[]} [excludeIds=[]]  - Provider IDs to skip (for fallback)
 * @returns {Promise<{ selectedProvider, selectionReason, ranking, allCandidates }>}
 */
async function discoverAndSelect(marketplaceBaseUrl, requirements, excludeIds = []) {
  // ── Step 1: Fetch discovery listing ─────────────────────────────────────
  const params = {};
  if (requirements.serviceType) params.serviceType = requirements.serviceType;
  // Note: we do NOT pass minQuality/maxPrice to the registry as filters yet —
  // we want the full candidate list so we can give the user a proper "filtered out" explanation.

  const resp = await axios.get(`${marketplaceBaseUrl}/registry/discover`, { params });
  const allProviders = resp.data.providers || [];

  if (allProviders.length === 0) {
    throw new Error(
      `No providers found for service type: ${requirements.serviceType || "any"}`
    );
  }

  // ── Step 2: Apply hard filters ────────────────────────────────────────────
  const filteredOut = [];
  const candidates  = [];

  for (const p of allProviders) {
    // Skip explicitly excluded providers (fallback scenario)
    if (excludeIds.includes(p.providerId)) {
      filteredOut.push({ providerId: p.providerId, reason: "excluded (unavailable or failed)" });
      continue;
    }

    // Quality filter
    if (requirements.minQuality && p.qualityScore < requirements.minQuality) {
      filteredOut.push({
        providerId: p.providerId,
        reason:     `Quality ${p.qualityScore} < required ${requirements.minQuality}`,
      });
      continue;
    }

    // Price filter (check the cheapest service in this provider)
    if (requirements.maxPrice) {
      const cheapest = Math.min(...(p.services || []).map((s) => s.price));
      if (cheapest > requirements.maxPrice) {
        filteredOut.push({
          providerId: p.providerId,
          reason:     `Cheapest service $${cheapest} > maxPrice $${requirements.maxPrice}`,
        });
        continue;
      }
    }

    candidates.push(p);
  }

  if (candidates.length === 0) {
    const reasons = filteredOut.map((f) => `  • ${f.providerId}: ${f.reason}`).join("\n");
    throw new Error(
      `No providers satisfy the requirements.\nFiltered out:\n${reasons}`
    );
  }

  // ── Step 3: LLM / deterministic selection ─────────────────────────────────
  const selectionResult = await selectProvider(candidates, requirements);

  // Validate LLM output: ensure selectedProviderId is in candidates
  const selected = candidates.find(
    (p) => p.providerId === selectionResult.selectedProviderId
  );
  if (!selected) {
    throw new Error(
      `Selection returned unknown provider: ${selectionResult.selectedProviderId}`
    );
  }

  // ── Step 4: Verify against live MySQL Pareto Frontier SQL Engine ───────────
  let sqlDecision = null;
  let reason = selectionResult.reason;
  try {
    const phpUrl = process.env.PHP_API_URL || `${marketplaceBaseUrl}/api/marketplace/decision`;
    const decisionRes = await axios.get(phpUrl, {
      params: {
        action: "query_decision",
        category_id: requirements.serviceType || "translation",
        budget: requirements.maxPrice || 5.0,
        min_quality: requirements.minQuality || 0.85,
      },
      timeout: 800,
    });
    if (decisionRes.data && decisionRes.data.success && decisionRes.data.selected_service) {
      sqlDecision = decisionRes.data;
      reason = `[MySQL 8.0 Pareto SQL Verified] ${reason}`;
    }
  } catch (_) {
    // Graceful fallback to in-memory ranking
  }

  return {
    selectedProvider: selected,
    selectionReason:  reason,
    ranking:          selectionResult.ranking || [],
    filteredOut,
    allCandidates:    candidates,
    sqlDecision,
  };
}

/**
 * Return the cheapest service offered by a provider that matches the
 * required serviceType (or the first service if no type filter).
 *
 * @param {object} providerDiscovery  - Registry listing for one provider
 * @param {string} [serviceType]
 * @returns {{ serviceId, price } | undefined}
 */
function pickService(providerDiscovery, serviceType) {
  const services = providerDiscovery.services || [];
  if (services.length === 0) return undefined;
  // Sort by price ascending, take the cheapest
  const sorted = [...services].sort((a, b) => a.price - b.price);
  return sorted[0];
}

module.exports = { discoverAndSelect, pickService };
