/**
 * agent/llm-client.js
 *
 * Thin wrapper around the Gemini 1.5-flash API.
 *
 * IMPORTANT SECURITY PROPERTY
 * ===========================
 * The LLM is NEVER asked whether a payment is authorized or whether the
 * agent is allowed to exceed its budget. Those decisions are made by the
 * smart contract.
 *
 * The LLM is asked ONLY:
 *   (a) Parse user intent into a structured requirement spec.
 *   (b) Select the best provider from a list, given the spec.
 *
 * Both outputs are validated and sanitized before use.
 * If the LLM is unavailable or returns invalid JSON, a deterministic
 * fallback handles the task without blocking the payment flow.
 *
 * Fallback behaviour
 * ==================
 * Set GEMINI_API_KEY in .env to enable Gemini.
 * If the key is missing or the API call fails, the deterministic fallback
 * (keyword parser + scoring function) is used automatically.
 * All tests run in fallback mode — no API key required.
 */

"use strict";

require("dotenv").config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
let geminiModel = null;

if (GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  } catch (err) {
    console.warn("[LLM] Failed to initialize Gemini:", err.message);
  }
}

// ---------------------------------------------------------------------------
// Intent parsing prompt
// ---------------------------------------------------------------------------
const INTENT_SYSTEM = `You are a structured data extractor for a service-purchasing AI agent.
Extract the user's service request into a JSON object.
Return ONLY valid JSON — no prose, no markdown fences.`;

const INTENT_USER_TMPL = (userRequest) => `
Parse this user request into a structured JSON spec:
"${userRequest}"

Return exactly this JSON shape (use null for unspecified fields):
{
  "serviceType": "translation" | "compute" | "image-analysis" | null,
  "priority": "cost" | "quality" | "balanced",
  "minQuality": <number 0-1 or null>,
  "maxPrice": <integer or null>,
  "targetLanguage": <string or null>,
  "payload": <any additional context as an object or null>
}
`;

// ---------------------------------------------------------------------------
// Provider selection prompt
// ---------------------------------------------------------------------------
const SELECTION_SYSTEM = `You are a provider selection AI for an autonomous purchasing agent.
Given a list of providers and user requirements, select the best one.
Return ONLY valid JSON — no prose, no markdown fences.`;

const SELECTION_USER_TMPL = (providers, requirements) => `
User requirements: ${JSON.stringify(requirements, null, 2)}

Available providers:
${JSON.stringify(providers, null, 2)}

Select the best provider. Consider: minQuality filter, maxPrice filter, then priority.
Return exactly this JSON shape:
{
  "selectedProviderId": "<must be one of the providerId values above>",
  "reason": "<one sentence explanation>",
  "filteredOut": ["<providerId>", ...],
  "ranking": [{"providerId": "<id>", "score": <0-1>, "notes": "<brief>"}]
}
`;

// ---------------------------------------------------------------------------
// LLM call helper (with timeout)
// ---------------------------------------------------------------------------
async function callGemini(systemInstruction, userPrompt, timeoutMs = 8000) {
  if (!geminiModel) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      systemInstruction,
      generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
    });
    clearTimeout(timer);
    const text = result.response.text().trim();
    // Strip markdown fences if model adds them
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    clearTimeout(timer);
    console.warn("[LLM] Gemini call failed:", err.message, "→ using fallback");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a natural-language user request into a structured intent spec.
 * Falls back to keyword-based parsing if Gemini is unavailable.
 *
 * @param {string} userRequest
 * @returns {Promise<IntentSpec>}
 */
async function parseIntent(userRequest) {
  const geminiResult = await callGemini(
    INTENT_SYSTEM,
    INTENT_USER_TMPL(userRequest)
  );

  if (geminiResult && geminiResult.serviceType !== undefined) {
    return sanitizeIntent(geminiResult, userRequest);
  }

  // Deterministic keyword fallback
  return keywordParseIntent(userRequest);
}

/**
 * Select the best provider from a list given user requirements.
 * Falls back to deterministic scoring if Gemini is unavailable.
 *
 * @param {object[]} providers  - Discovery listing entries
 * @param {IntentSpec} requirements
 * @returns {Promise<SelectionResult>}
 */
async function selectProvider(providers, requirements) {
  if (providers.length === 0) {
    throw new Error("No providers available for selection");
  }
  if (providers.length === 1) {
    return {
      selectedProviderId: providers[0].providerId,
      reason:             "Only available provider.",
      filteredOut:        [],
      ranking:            [{ providerId: providers[0].providerId, score: 1.0, notes: "sole option" }],
    };
  }

  const geminiResult = await callGemini(
    SELECTION_SYSTEM,
    SELECTION_USER_TMPL(providers, requirements)
  );

  if (
    geminiResult &&
    geminiResult.selectedProviderId &&
    providers.some((p) => p.providerId === geminiResult.selectedProviderId)
  ) {
    return geminiResult;
  }

  console.warn("[LLM] Falling back to deterministic scoring.");
  return deterministicSelect(providers, requirements);
}

// ---------------------------------------------------------------------------
// Deterministic fallbacks
// ---------------------------------------------------------------------------

function keywordParseIntent(text) {
  const lower = text.toLowerCase();

  // Service type
  let serviceType = null;
  if (/translat|hindi|spanish|french|german|language/.test(lower)) serviceType = "translation";
  else if (/compute|calculat|process|data|analyz/.test(lower))      serviceType = "compute";
  else if (/image|vision|photo|picture|detect/.test(lower))         serviceType = "image-analysis";

  // Priority
  let priority = "balanced";
  if (/best.quality|highest.quality|premium|accurate|precision|gamma/.test(lower)) {
    priority = "quality";
  } else if (/cheap|cheapest|lowest.cost|minimize.cost|low.cost|\bbudget\b(?!\s*(?:limit|exceed|cap))/.test(lower)) {
    priority = "cost";
  }

  // minQuality
  let minQuality = null;
  const qMatch = lower.match(/quality\s+(?:above|at.least|>=?|min(?:imum)?)\s*(0\.\d+)/);
  if (qMatch) minQuality = parseFloat(qMatch[1]);

  // maxPrice
  let maxPrice = null;
  const pMatch = lower.match(/(?:under|below|max(?:imum)?|budget.of?|less.than)\s*\$?(\d+)/);
  if (pMatch) maxPrice = parseInt(pMatch[1], 10);

  // targetLanguage
  let targetLanguage = null;
  const langMatch = text.match(/\b(Hindi|Spanish|French|German|Japanese|Arabic|Chinese|Italian|Portuguese)\b/i);
  if (langMatch) targetLanguage = langMatch[1];

  // preferredProvider or preferredService
  let preferredProvider = null;
  if (/alpha/i.test(lower)) preferredProvider = "alpha-translate";
  else if (/beta/i.test(lower)) preferredProvider = "beta-translate";
  else if (/gamma/i.test(lower)) preferredProvider = "gamma-translate";
  else if (/delta/i.test(lower)) preferredProvider = "delta-compute";
  else if (/epsilon/i.test(lower)) preferredProvider = "epsilon-vision";

  return { serviceType, priority, minQuality, maxPrice, targetLanguage, preferredProvider, payload: targetLanguage ? { targetLanguage } : null };
}

/**
 * Deterministic provider scoring and selection.
 *
 * Formula (min-max normalized):
 *   priceScore   = 1 - (price - minPrice) / (maxPrice - minPrice + ε)
 *   qualityScore = (quality - minQ) / (maxQ - minQ + ε)
 *   finalScore   = priceWeight * priceScore + qualityWeight * qualityScore
 *
 * Weights:
 *   cost     → price=0.7, quality=0.3
 *   quality  → price=0.2, quality=0.8
 *   balanced → price=0.5, quality=0.5
 */
function deterministicSelect(providers, requirements) {
  const { priority = "balanced" } = requirements;

  const weights = {
    cost:     { price: 0.7, quality: 0.3 },
    quality:  { price: 0.2, quality: 0.8 },
    balanced: { price: 0.5, quality: 0.5 },
  };
  const w = weights[priority] || weights.balanced;

  // Get min/max values for normalization
  const prices    = providers.map((p) => getServicePrice(p));
  const qualities = providers.map((p) => p.qualityScore);
  const minPrice  = Math.min(...prices);
  const maxPrice  = Math.max(...prices);
  const minQ      = Math.min(...qualities);
  const maxQ      = Math.max(...qualities);
  const EPS       = 1e-9; // avoid division by zero

  const ranked = providers.map((p) => {
    const price  = getServicePrice(p);
    const priceScore   = 1 - (price - minPrice)  / (maxPrice - minPrice  + EPS);
    const qualityScore = (p.qualityScore - minQ) / (maxQ    - minQ      + EPS);
    let score        = w.price * priceScore + w.quality * qualityScore;
    if (requirements.preferredProvider && p.providerId === requirements.preferredProvider) {
      score += 2.0;
    }
    return {
      providerId: p.providerId,
      score:      Math.round(score * 1000) / 1000,
      price,
      quality:    p.qualityScore,
      notes:      `price=${price} quality=${p.qualityScore} → score=${score.toFixed(3)}`,
    };
  }).sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const isPreferred = requirements.preferredProvider && best && best.providerId === requirements.preferredProvider;
  return {
    selectedProviderId: best ? best.providerId : null,
    reason: isPreferred
      ? `Explicit user request: selected ${best.providerId} matching requested service provider.`
      : `Deterministic scoring (priority=${priority}): ` +
        `priceWeight=${w.price} qualityWeight=${w.quality}. ` +
        `${best ? best.providerId : "None"} scored ${best ? best.score : 0}.`,
    filteredOut: [],
    ranking:     ranked,
  };
}

function getServicePrice(providerDiscovery) {
  // providerDiscovery.services is an array from the registry listing
  const services = providerDiscovery.services || [];
  if (services.length === 0) return Infinity;
  return Math.min(...services.map((s) => s.price));
}

function sanitizeIntent(raw, originalText = "") {
  let maxPrice = typeof raw.maxPrice === "number" ? Math.round(raw.maxPrice) : (typeof raw.maxPrice === "string" ? parseInt(raw.maxPrice.replace(/[^0-9]/g, ""), 10) : null);
  if ((!maxPrice || isNaN(maxPrice)) && originalText) {
    const pMatch = originalText.match(/(?:under|below|max(?:imum)?|budget.of?|less.than)\s*\$?(\d+)/i);
    if (pMatch) maxPrice = parseInt(pMatch[1], 10);
  }

  let minQuality = typeof raw.minQuality === "number" ? raw.minQuality : (typeof raw.minQuality === "string" ? parseFloat(raw.minQuality) : null);
  if ((!minQuality || isNaN(minQuality)) && originalText) {
    const qMatch = originalText.match(/quality\s+(?:above|at.least|>=?|min(?:imum)?)\s*(0\.\d+)/i);
    if (qMatch) minQuality = parseFloat(qMatch[1]);
  }

  let priority = ["cost", "quality", "balanced"].includes(raw.priority) ? raw.priority : "balanced";
  if (originalText && /best.quality|highest.quality|premium/i.test(originalText)) {
    priority = "quality";
  }

  return {
    serviceType:    typeof raw.serviceType === "string" ? raw.serviceType : null,
    priority,
    minQuality:     minQuality && !isNaN(minQuality) ? minQuality : null,
    maxPrice:       maxPrice && !isNaN(maxPrice) ? maxPrice : null,
    targetLanguage: typeof raw.targetLanguage === "string" ? raw.targetLanguage : null,
    payload:        raw.payload || null,
  };
}

module.exports = {
  parseIntent,
  selectProvider,
  deterministicSelect,
  keywordParseIntent,
};
