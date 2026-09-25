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
    console.warn("[LLM] Init failed:", err.message);
  }
}

const INTENT_SYSTEM = `You are a structured data extractor for a service-purchasing agent.
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

const SELECTION_SYSTEM = `You are a provider selection engine for an autonomous purchasing agent.
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
    const clean = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(clean);
  } catch (err) {
    clearTimeout(timer);
    console.warn("[LLM] Call failed:", err.message, "→ using fallback");
    return null;
  }
}

async function parseIntent(userRequest) {
  const result = await callGemini(INTENT_SYSTEM, INTENT_USER_TMPL(userRequest));
  if (result && result.serviceType !== undefined) {
    return sanitizeIntent(result, userRequest);
  }
  return keywordParseIntent(userRequest);
}

async function selectProvider(providers, requirements) {
  if (providers.length === 0) throw new Error("No providers available for selection");
  if (providers.length === 1) {
    return {
      selectedProviderId: providers[0].providerId,
      reason: "Only available provider.",
      filteredOut: [],
      ranking: [{ providerId: providers[0].providerId, score: 1.0, notes: "sole option" }],
    };
  }

  if (geminiModel) {
    const result = await callGemini(SELECTION_SYSTEM, SELECTION_USER_TMPL(providers, requirements));
    if (result && result.selectedProviderId && providers.some((p) => p.providerId === result.selectedProviderId)) {
      return result;
    }
  }

  return deterministicSelect(providers, requirements);
}

function keywordParseIntent(text) {
  const lower = text.toLowerCase();

  let serviceType = null;
  if (/weather|forecast|temperature|delhi|climate|meteorolog/.test(lower))          serviceType = "data-compute";
  else if (/currenc|forex|fx|exchange rate|convert usd|convert inr|convert eur/.test(lower)) serviceType = "data-compute";
  else if (/ipstack|ip address|geolocation|geo location|ip lookup|where is ip/.test(lower)) serviceType = "data-compute";
  else if (/amazon|product price|asin|scrape amazon|ecommerce price/.test(lower))    serviceType = "data-compute";
  else if (/giphy|gif|meme|animation|reaction gif/.test(lower))                     serviceType = "image-video";
  else if (/apiflash|blitapp|screenshot|capture website|page snapshot|web capture/.test(lower)) serviceType = "vision-ocr";
  else if (/apitemplate|invoice pdf|generate pdf|create pdf|pdf document/.test(lower)) serviceType = "document-research";
  else if (/translat|hindi|spanish|french|german|language/.test(lower))             serviceType = "translation";
  else if (/compute|calculat|matrix|statist|anomal|risk|monte|process|data|analyz/.test(lower)) serviceType = "compute";
  else if (/ocr|image.analyz|vision|photo|picture|detect|receipt|invoice|face/.test(lower)) serviceType = "image-analysis";
  else if (/reason|llm|generat|story|plan|schema|json|summar|tldr|distill/.test(lower))   serviceType = "text-generation";
  else if (/speech|audio|voice|stt|tts|whisper|diariz|noise/.test(lower))           serviceType = "speech-audio";
  else if (/diffus|image.gen|upscal|video|matting|background/.test(lower))          serviceType = "image-video";
  else if (/code|sandbox|audit|eval|sql|mock|ast|syntax/.test(lower))               serviceType = "code-dev";
  else if (/embed|vector|rag|retriev|knowledge|chunk|citation/.test(lower))         serviceType = "rag-embeddings";
  else if (/moderat|toxic|safety|pii|redact|academic|scholar|sentiment/.test(lower)) serviceType = "document-research";

  let priority = "balanced";
  if (/best.quality|highest.quality|premium|accurate|precision|gamma|expert/.test(lower)) {
    priority = "quality";
  } else if (/cheap|cheapest|lowest.cost|minimize.cost|low.cost|\bbudget\b(?!\s*(?:limit|exceed|cap))/.test(lower)) {
    priority = "cost";
  }

  let minQuality = null;
  const qMatch = lower.match(/quality\s+(?:above|at.least|>=?|min(?:imum)?)\s*(0\.\d+)/);
  if (qMatch) minQuality = parseFloat(qMatch[1]);

  let maxPrice = null;
  const pMatch = lower.match(/(?:under|below|max(?:imum)?|budget.of?|less.than)\s*\$?(\d+)/);
  if (pMatch) maxPrice = parseInt(pMatch[1], 10);

  let targetLanguage = null;
  const langMatch = text.match(/\b(Hindi|Spanish|French|German|Japanese|Arabic|Chinese|Italian|Portuguese)\b/i);
  if (langMatch) targetLanguage = langMatch[1];

  let preferredProvider = null;
  if (/weather|open-meteo/i.test(lower))           preferredProvider = "open-meteo";
  else if (/currenc|forex|fx|exchange/i.test(lower)) preferredProvider = "currencylayer-fx";
  else if (/ipstack|geolocation|ip lookup/i.test(lower))   preferredProvider = "ipstack-geo";
  else if (/amazon/i.test(lower))                  preferredProvider = "amazon-scraper";
  else if (/giphy|gif/i.test(lower))               preferredProvider = "giphy-media";
  else if (/apiflash|web capture/i.test(lower))    preferredProvider = "apiflash-render";
  else if (/blitapp|snapshot/i.test(lower))        preferredProvider = "blitapp-cloud";
  else if (/apitemplate|pdf engine/i.test(lower))  preferredProvider = "apitemplate-docs";
  else if (/alpha/i.test(lower))        preferredProvider = "alpha-translate";
  else if (/beta/i.test(lower))    preferredProvider = "beta-translate";
  else if (/gamma/i.test(lower))   preferredProvider = "gamma-translate";
  else if (/delta/i.test(lower))   preferredProvider = "delta-compute";
  else if (/epsilon/i.test(lower)) preferredProvider = "epsilon-vision";
  else if (/zeta/i.test(lower))    preferredProvider = "zeta-llm";
  else if (/eta/i.test(lower))     preferredProvider = "eta-summarize";
  else if (/theta/i.test(lower))   preferredProvider = "theta-audio";
  else if (/iota/i.test(lower))    preferredProvider = "iota-diffusion";
  else if (/kappa/i.test(lower))   preferredProvider = "kappa-data";
  else if (/lambda/i.test(lower))  preferredProvider = "lambda-code";
  else if (/mu/i.test(lower))      preferredProvider = "mu-embeddings";
  else if (/nu/i.test(lower))      preferredProvider = "nu-rag";
  else if (/xi/i.test(lower))      preferredProvider = "xi-compliance";

  let payload = null;
  if (targetLanguage) payload = { targetLanguage };
  else if (/weather|delhi/i.test(lower)) {
    const cityMatch = text.match(/\b(Delhi|Tokyo|London|New York|Paris|Berlin|Mumbai|Singapore|Sydney)\b/i);
    payload = { city: cityMatch ? cityMatch[1] : "Delhi" };
  } else if (/currenc|forex|convert/i.test(lower)) {
    payload = { currencies: "EUR,GBP,INR,JPY" };
  } else if (/ip|geolocation/i.test(lower)) {
    const ipMatch = text.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
    payload = { ip: ipMatch ? ipMatch[0] : "134.201.250.155" };
  } else if (/amazon|asin/i.test(lower)) {
    const asinMatch = text.match(/\b[B0-9][A-Z0-9]{9}\b/);
    payload = { asin: asinMatch ? asinMatch[0] : "B08N5WRWNW" };
  } else if (/giphy|gif/i.test(lower)) {
    payload = { query: text };
  }

  return { serviceType, priority, minQuality, maxPrice, targetLanguage, preferredProvider, payload };
}

// Weighted scoring: cost → price=0.7/quality=0.3, quality → price=0.2/quality=0.8, balanced → 0.5/0.5
function deterministicSelect(providers, requirements) {
  const { priority = "balanced" } = requirements;
  const weights = {
    cost:     { price: 0.7, quality: 0.3 },
    quality:  { price: 0.2, quality: 0.8 },
    balanced: { price: 0.5, quality: 0.5 },
  };
  const w = weights[priority] || weights.balanced;

  const prices    = providers.map((p) => getServicePrice(p));
  const qualities = providers.map((p) => p.qualityScore);
  const minPrice  = Math.min(...prices);
  const maxPrice  = Math.max(...prices);
  const minQ      = Math.min(...qualities);
  const maxQ      = Math.max(...qualities);
  const EPS       = 1e-9;

  const ranked = providers.map((p) => {
    const price        = getServicePrice(p);
    const priceScore   = 1 - (price - minPrice)  / (maxPrice - minPrice  + EPS);
    const qualityScore = (p.qualityScore - minQ) / (maxQ    - minQ      + EPS);
    let score          = w.price * priceScore + w.quality * qualityScore;
    if (requirements.preferredProvider && p.providerId === requirements.preferredProvider) score += 2.0;
    return {
      providerId: p.providerId,
      score:      Math.round(score * 1000) / 1000,
      price,
      quality:    p.qualityScore,
      notes:      `price=${price} quality=${p.qualityScore} → score=${score.toFixed(3)}`,
    };
  }).sort((a, b) => b.score - a.score);

  const best        = ranked[0];
  const isPreferred = requirements.preferredProvider && best && best.providerId === requirements.preferredProvider;
  return {
    selectedProviderId: best ? best.providerId : null,
    reason: isPreferred
      ? `Explicit user request: selected ${best.providerId} matching requested provider.`
      : `Scoring (priority=${priority}): priceWeight=${w.price} qualityWeight=${w.quality}. ${best ? best.providerId : "None"} scored ${best ? best.score : 0}.`,
    filteredOut: [],
    ranking:     ranked,
  };
}

function getServicePrice(providerDiscovery) {
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
  if (originalText && /best.quality|highest.quality|premium/i.test(originalText)) priority = "quality";

  return {
    serviceType:    typeof raw.serviceType === "string" ? raw.serviceType : null,
    priority,
    minQuality:     minQuality && !isNaN(minQuality) ? minQuality : null,
    maxPrice:       maxPrice && !isNaN(maxPrice) ? maxPrice : null,
    targetLanguage: typeof raw.targetLanguage === "string" ? raw.targetLanguage : null,
    payload:        raw.payload || null,
  };
}

module.exports = { parseIntent, selectProvider, deterministicSelect, keywordParseIntent };
