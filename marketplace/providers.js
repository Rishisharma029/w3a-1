/**
 * marketplace/providers.js
 *
 * Canonical catalogue of all service providers in the W3A-1 marketplace.
 * Scale: 52 services · 14 provider nodes · 9 categories · x402 enabled
 *
 * Each provider definition includes:
 *   providerId         — unique machine identifier
 *   name               — human-readable label
 *   serviceType        — primary category slug
 *   qualityScore       — 0–1, independent of price
 *   estimatedLatencyMs — approximate latency in ms
 *   availability       — 0–1 (1.0 = available)
 *   services           — map of serviceId → { id, name, price, description, category, quality, latencyMs, generate(reqId, payload) }
 */

"use strict";

const PROVIDERS = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Alpha Translation Labs (Translation Node - High Precision)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "alpha-translate",
    name:               "Alpha Translation Labs",
    serviceType:        "translation",
    qualityScore:       0.92,
    estimatedLatencyMs: 195,
    availability:       1.0,
    services: {
      "text-translate": {
        id: "text-translate",
        name: "Neural Text Translation",
        price: 4.0,
        category: "translation",
        quality: 0.92,
        latencyMs: 195,
        description: "Accurate multi-language translation with cultural nuance verification.",
        generate(reqId, payload = {}) {
          return {
            provider: "alpha-translate",
            service: "text-translate",
            reqId,
            sourceText: payload.text || "The quick brown fox jumps over the lazy dog.",
            targetLanguage: payload.targetLanguage || "English",
            translatedText: `[Alpha Translation Labs] Verified translation to ${payload.targetLanguage || "English"}:\n"${payload.text || "The quick brown fox jumps over the lazy dog."}"`,
            qualityConfidence: 0.92,
            wordCount: (payload.text || "").split(/\s+/).filter(Boolean).length || 9,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "legal-translate": {
        id: "legal-translate",
        name: "Certified Legal & Financial Translation",
        price: 5.0,
        category: "translation",
        quality: 0.96,
        latencyMs: 320,
        description: "High-compliance sworn translation for contracts, terms, and cross-border filings.",
        generate(reqId, payload = {}) {
          return {
            provider: "alpha-translate",
            service: "legal-translate",
            reqId,
            complianceJurisdiction: "ISO-17100 / EU-GDPR",
            certifiedHash: `LEGAL-CERT-${reqId.slice(2, 10).toUpperCase()}`,
            summary: "Contractual clauses cross-referenced with target jurisdiction legal glossary.",
            qualityConfidence: 0.96,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "dialect-localize": {
        id: "dialect-localize",
        name: "Dialect & Cultural Localization",
        price: 4,
        category: "translation",
        quality: 0.90,
        latencyMs: 180,
        description: "Colloquial and regional dialect adaptation preserving brand voice.",
        generate(reqId, payload = {}) {
          return {
            provider: "alpha-translate",
            service: "dialect-localize",
            reqId,
            regionCode: payload.region || "es-MX",
            adaptedSlangTerms: 4,
            output: "Target tone verified: colloquial professional.",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "bilingual-align": {
        id: "bilingual-align",
        name: "Bilingual Sentence & Corpus Alignment",
        price: 4,
        category: "translation",
        quality: 0.89,
        latencyMs: 140,
        description: "Bi-text parallel sentence segmentation and automated translation memory generation.",
        generate(reqId, payload = {}) {
          return {
            provider: "alpha-translate",
            service: "bilingual-align",
            reqId,
            alignedPairs: 42,
            tmxOutput: "<tmx version='1.4'>...aligned parallel corpus...</tmx>",
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Beta FastTranslate Engine (Translation Node - High Throughput & Budget)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "beta-translate",
    name:               "Beta FastTranslate Engine",
    serviceType:        "translation",
    qualityScore:       0.84,
    estimatedLatencyMs: 90,
    availability:       1.0,
    services: {
      "text-translate": {
        id: "text-translate",
        name: "Text Translation",
        price: 3,
        description: "Fast, cost-effective translation.",
        generate(reqId, payload = {}) {
          return {
            provider: "beta-translate",
            service: "text-translate",
            reqId,
            sourceText: payload.text || "The quick brown fox",
            targetLanguage: payload.targetLanguage || "English",
            translatedText: `[Beta] ${payload.text || "The quick brown fox"} → (translated to ${payload.targetLanguage || "English"})`,
            qualityConfidence: 0.84,
            wordCount: (payload.text || "The quick brown fox").split(" ").length,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "budget-translate": {
        id: "budget-translate",
        name: "High-Throughput Bulk Translation",
        price: 3,
        category: "translation",
        quality: 0.83,
        latencyMs: 90,
        description: "Ultra-fast, cost-effective machine translation optimized for high volume streams.",
        generate(reqId, payload = {}) {
          return {
            provider: "beta-translate",
            service: "budget-translate",
            reqId,
            mode: "quantized-fast-pass",
            throughput: "4,200 tokens/sec",
            translatedText: `[Beta FastTranslate] ${payload.text || "Processed content batch"}`,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "glossary-translate": {
        id: "glossary-translate",
        name: "Terminology-Constrained Translation",
        price: 3,
        category: "translation",
        quality: 0.86,
        latencyMs: 110,
        description: "Enforces strict custom entity mappings and terminology glossaries.",
        generate(reqId, payload = {}) {
          return {
            provider: "beta-translate",
            service: "glossary-translate",
            reqId,
            enforcedTermsCount: 18,
            status: "GLOSSARY_LOCKED",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "streaming-translate": {
        id: "streaming-translate",
        name: "Real-Time Low-Latency Translation",
        price: 3.0,
        category: "translation",
        quality: 0.85,
        latencyMs: 80,
        description: "Sub-100ms chunked token translation for real-time live captions and voice bots.",
        generate(reqId, payload = {}) {
          return {
            provider: "beta-translate",
            service: "streaming-translate",
            reqId,
            streamBufferMs: 65,
            deliveredChunks: 5,
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Gamma Enterprise Localization (Translation Node - High Quality)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "gamma-translate",
    name:               "Gamma Enterprise Localization",
    serviceType:        "translation",
    qualityScore:       0.97,
    estimatedLatencyMs: 420,
    availability:       1.0,
    services: {
      "text-translate": {
        id: "text-translate",
        name: "Text Translation (Premium)",
        price: 6,
        description: "Highest quality, human-reviewed translation.",
        generate(reqId, payload = {}) {
          return {
            provider: "gamma-translate",
            service: "text-translate",
            reqId,
            sourceText: payload.text || "The quick brown fox",
            targetLanguage: payload.targetLanguage || "English",
            translatedText: `[Gamma/Premium] ${payload.text || "The quick brown fox"} → (translated to ${payload.targetLanguage || "English"})`,
            qualityConfidence: 0.97,
            wordCount: (payload.text || "The quick brown fox").split(" ").length,
            humanReviewed: true,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "expert-translate": {
        id: "expert-translate",
        name: "Expert Human-in-the-Loop Translation",
        price: 7.0,
        category: "translation",
        quality: 0.98,
        latencyMs: 450,
        description: "Double-blind reviewed enterprise translation with 98% linguistic guarantee.",
        generate(reqId, payload = {}) {
          return {
            provider: "gamma-translate",
            service: "expert-translate",
            reqId,
            humanReviewerId: "LINGUIST-EXP-4402",
            qualityGuarantee: 0.98,
            deliveredText: `[Gamma Enterprise] Formally verified and attested: "${payload.text || 'Contractual translation completed.'}"`,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "patents-translate": {
        id: "patents-translate",
        name: "Multilingual Patent & IP Translation",
        price: 7,
        category: "translation",
        quality: 0.97,
        latencyMs: 400,
        description: "WIPO / PCT compliant patent claim translation with technical fidelity.",
        generate(reqId, payload = {}) {
          return {
            provider: "gamma-translate",
            service: "patents-translate",
            reqId,
            patentJurisdictions: ["USPTO", "EPO", "JPO"],
            claimIntegrityScore: 0.975,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "medical-translate": {
        id: "medical-translate",
        name: "Clinical & Medical Protocol Translation",
        price: 6.0,
        category: "translation",
        quality: 0.97,
        latencyMs: 380,
        description: "FDA / EMA trial protocol translations with MeSH and SNOMED vocabulary checking.",
        generate(reqId, payload = {}) {
          return {
            provider: "gamma-translate",
            service: "medical-translate",
            reqId,
            terminologyStandard: "SNOMED-CT / MeSH",
            clinicalSafetyCheck: "PASSED",
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Delta Distributed Compute (Data & Compute Node)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "delta-compute",
    name:               "Delta Distributed Compute",
    serviceType:        "compute",
    qualityScore:       0.90,
    estimatedLatencyMs: 150,
    availability:       1.0,
    services: {
      "data-process": {
        id: "data-process",
        name: "Statistical Dataset Aggregation",
        price: 3.0,
        category: "data-compute",
        quality: 0.88,
        latencyMs: 140,
        description: "Deterministic statistical summary, moments calculation, and distribution analysis.",
        generate(reqId, payload = {}) {
          const input = payload.data || [12, 45, 67, 89, 23, 56, 78, 90, 34];
          return {
            provider: "delta-compute",
            service: "data-process",
            reqId,
            input,
            aggregates: {
              sum: input.reduce((a, b) => a + b, 0),
              mean: input.reduce((a, b) => a + b, 0) / input.length,
              count: input.length,
              stdev: 24.6,
            },
            output: {
              sum: input.reduce((a, b) => a + b, 0),
              mean: input.reduce((a, b) => a + b, 0) / input.length,
              min: Math.min(...input),
              max: Math.max(...input),
              count: input.length,
            },
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "matrix-compute": {
        id: "matrix-compute",
        name: "High-Performance Matrix Operations",
        price: 5,
        category: "data-compute",
        quality: 0.93,
        latencyMs: 210,
        description: "BLAS/LAPACK accelerated GPU matrix multiplication and Eigenvalue decomposition.",
        generate(reqId, payload = {}) {
          return {
            provider: "delta-compute",
            service: "matrix-compute",
            reqId,
            flopsMeasured: "1.84 TFLOPS",
            conditionNumber: 1.024,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "monte-carlo": {
        id: "monte-carlo",
        name: "Monte Carlo Risk Simulation",
        price: 5.0,
        category: "data-compute",
        quality: 0.94,
        latencyMs: 290,
        description: "100,000-path stochastic probability modeling and value-at-risk (VaR) estimation.",
        generate(reqId, payload = {}) {
          return {
            provider: "delta-compute",
            service: "monte-carlo",
            reqId,
            iterations: 100000,
            valueAtRisk95: "$142,300",
            confidenceInterval: "[0.948, 0.952]",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "time-series-calc": {
        id: "time-series-calc",
        name: "Time-Series Anomaly Detection",
        price: 3.5,
        category: "data-compute",
        quality: 0.90,
        latencyMs: 160,
        description: "Real-time STL seasonal decomposition and statistical outlier pinpointing.",
        generate(reqId, payload = {}) {
          return {
            provider: "delta-compute",
            service: "time-series-calc",
            reqId,
            anomaliesDetected: 2,
            zScoreThreshold: 3.0,
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Epsilon Vision & OCR Systems (Vision & OCR Node)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "epsilon-vision",
    name:               "Epsilon Vision & OCR Systems",
    serviceType:        "vision-ocr",
    qualityScore:       0.95,
    estimatedLatencyMs: 320,
    availability:       1.0,
    services: {
      "image-analyze": {
        id: "image-analyze",
        name: "Multimodal Object & Scene Detection",
        price: 4.5,
        category: "vision-ocr",
        quality: 0.94,
        latencyMs: 380,
        description: "Zero-shot visual segment labeling, bounding box regression, and scene categorization.",
        generate(reqId, payload = {}) {
          return {
            provider: "epsilon-vision",
            service: "image-analyze",
            reqId,
            detectedObjects: [
              { label: "smart_contract_diagram", confidence: 0.98, bbox: [12, 34, 400, 300] },
              { label: "signature_seal", confidence: 0.96, bbox: [410, 280, 520, 390] },
            ],
            scene: "cryptographic_audit_specification",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "ocr-document": {
        id: "ocr-document",
        name: "Multi-Language Document OCR",
        price: 3.5,
        category: "vision-ocr",
        quality: 0.92,
        latencyMs: 250,
        description: "Layout-aware character recognition with font hierarchy and reading-order recovery.",
        generate(reqId, payload = {}) {
          return {
            provider: "epsilon-vision",
            service: "ocr-document",
            reqId,
            extractedParagraphs: 14,
            recognizedLanguage: "en-US",
            characterConfidence: 0.982,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "receipt-invoice-ocr": {
        id: "receipt-invoice-ocr",
        name: "Structured Invoice & Receipt Table Parser",
        price: 4.0,
        category: "vision-ocr",
        quality: 0.95,
        latencyMs: 290,
        description: "Extract line items, tax IDs, invoice dates, and totals into normalized JSON schemas.",
        generate(reqId, payload = {}) {
          return {
            provider: "epsilon-vision",
            service: "receipt-invoice-ocr",
            reqId,
            lineItemsCount: 4,
            taxAmount: "$0.00",
            totalDetected: "$4.00",
            currencyDetected: "USDC",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "facial-landmark": {
        id: "facial-landmark",
        name: "Biometric Facial Landmark & Pose Detection",
        price: 3.0,
        category: "vision-ocr",
        quality: 0.91,
        latencyMs: 200,
        description: "468-point 3D facial mesh geometry and head pose orientation calculation.",
        generate(reqId, payload = {}) {
          return {
            provider: "epsilon-vision",
            service: "facial-landmark",
            reqId,
            landmarksFound: 468,
            yawPitchRoll: [0.12, -0.04, 0.01],
            livenessVerified: true,
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Zeta Foundation Models (Text Generation Node)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "zeta-llm",
    name:               "Zeta Foundation Models",
    serviceType:        "text-generation",
    qualityScore:       0.96,
    estimatedLatencyMs: 310,
    availability:       1.0,
    services: {
      "deep-reasoning": {
        id: "deep-reasoning",
        name: "Chain-of-Thought Logical Reasoning",
        price: 5.5,
        category: "text-generation",
        quality: 0.96,
        latencyMs: 420,
        description: "Multi-step analytical reasoning and mathematical deduction with step-by-step verification.",
        generate(reqId, payload = {}) {
          return {
            provider: "zeta-llm",
            service: "deep-reasoning",
            reqId,
            reasoningSteps: [
              "Identified core constraint: $5 budget ceiling.",
              "Verified counterparty signature validity on EIP-712.",
              "Concluded optimal execution path via Sepolia settlement.",
            ],
            confidence: 0.965,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "creative-writing": {
        id: "creative-writing",
        name: "Dynamic Copywriting & Creative Storytelling",
        price: 3.5,
        category: "text-generation",
        quality: 0.91,
        latencyMs: 230,
        description: "High-engagement narrative generation, marketing slogans, and technical prose.",
        generate(reqId, payload = {}) {
          return {
            provider: "zeta-llm",
            service: "creative-writing",
            reqId,
            tone: "visionary-technical",
            generatedCopy: "Decentralized autonomy meets cryptographic certainty at the edge of Web3.",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "agent-planner": {
        id: "agent-planner",
        name: "Autonomous Subtask Decomposition & Planning",
        price: 4.0,
        category: "text-generation",
        quality: 0.93,
        latencyMs: 280,
        description: "Breaks high-level user goals into structured dependency graphs and execution actions.",
        generate(reqId, payload = {}) {
          return {
            provider: "zeta-llm",
            service: "agent-planner",
            reqId,
            dagSteps: ["DISCOVERY", "BUDGET_CHECK", "PAYMENT_PAYLOAD", "SETTLEMENT", "HASH_PROOF"],
            isAcyclic: true,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "json-structured": {
        id: "json-structured",
        name: "Strict JSON Schema Extraction",
        price: 3.0,
        category: "text-generation",
        quality: 0.94,
        latencyMs: 180,
        description: "Zero-hallucination structured entity parsing strictly validated against JSONSchema.",
        generate(reqId, payload = {}) {
          return {
            provider: "zeta-llm",
            service: "json-structured",
            reqId,
            schemaValid: true,
            extractedEntities: { currency: "USDC", network: "Sepolia", chainId: 11155111 },
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Eta Synthesis & Summarization (Summarization Node)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "eta-summarize",
    name:               "Eta Synthesis & Summarization",
    serviceType:        "text-generation",
    qualityScore:       0.93,
    estimatedLatencyMs: 210,
    availability:       1.0,
    services: {
      "tldr-summary": {
        id: "tldr-summary",
        name: "Executive Briefing & Key Takeaway Generator",
        price: 2.5,
        category: "text-generation",
        quality: 0.91,
        latencyMs: 150,
        description: "Distills complex technical documentation into 3 concise executive bullet points.",
        generate(reqId, payload = {}) {
          return {
            provider: "eta-summarize",
            service: "tldr-summary",
            reqId,
            executiveTakeaways: [
              "Protocol enables secure autonomous agent microtransactions.",
              "Cryptographic enforcer guarantees zero overspending.",
              "Sepolia settlement provides permanent public auditability.",
            ],
            compressionRatio: "88% condensed",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "longdoc-distill": {
        id: "longdoc-distill",
        name: "100+ Page Recursive Document Distiller",
        price: 5.0,
        category: "text-generation",
        quality: 0.95,
        latencyMs: 360,
        description: "Recursive hierarchical map-reduce summarization for technical whitepapers and books.",
        generate(reqId, payload = {}) {
          return {
            provider: "eta-summarize",
            service: "longdoc-distill",
            reqId,
            totalPagesProcessed: 124,
            chaptersSummarized: 8,
            status: "DISTILLATION_COMPLETE",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "meeting-action-items": {
        id: "meeting-action-items",
        name: "Multi-Speaker Meeting Action Item Extractor",
        price: 3.5,
        category: "text-generation",
        quality: 0.92,
        latencyMs: 210,
        description: "Identifies deliverables, assignees, deadlines, and unassigned commitments from transcripts.",
        generate(reqId, payload = {}) {
          return {
            provider: "eta-summarize",
            service: "meeting-action-items",
            reqId,
            actionItems: [
              { task: "Deploy Sepolia Enforcer", assignee: "DevOps", due: "Immediate" },
              { task: "Audit x402 V2 HTTP Headers", assignee: "Security", due: "T-24h" },
            ],
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. Theta Voice & Speech AI (Speech & Audio Node)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "theta-audio",
    name:               "Theta Voice & Speech AI",
    serviceType:        "speech-audio",
    qualityScore:       0.94,
    estimatedLatencyMs: 220,
    availability:       1.0,
    services: {
      "whisper-stt": {
        id: "whisper-stt",
        name: "Whisper Multilingual Speech-to-Text",
        price: 3.5,
        category: "speech-audio",
        quality: 0.94,
        latencyMs: 240,
        description: "High-accuracy audio transcription with word-level timestamps and punctuation.",
        generate(reqId, payload = {}) {
          return {
            provider: "theta-audio",
            service: "whisper-stt",
            reqId,
            transcription: "Autonomous purchase sequence authorized. Executing on-chain settlement.",
            confidence: 0.974,
            detectedLanguage: "en",
            audioDurationSec: 4.8,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "neural-tts": {
        id: "neural-tts",
        name: "Expressive Neural Voice Synthesis (TTS)",
        price: 3.0,
        category: "speech-audio",
        quality: 0.92,
        latencyMs: 190,
        description: "Natural prosody neural speech generator supporting 40+ lifelike speaker voices.",
        generate(reqId, payload = {}) {
          return {
            provider: "theta-audio",
            service: "neural-tts",
            reqId,
            sampleRateHz: 48000,
            voiceModel: "neural-studio-en-male-02",
            audioFormat: "audio/opus",
            waveformSizeKb: 184,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "audio-diarization": {
        id: "audio-diarization",
        name: "Multi-Speaker Audio Separation & Diarization",
        price: 4.0,
        category: "speech-audio",
        quality: 0.93,
        latencyMs: 290,
        description: "Distinguishes distinct voices and annotates timestamps per individual speaker.",
        generate(reqId, payload = {}) {
          return {
            provider: "theta-audio",
            service: "audio-diarization",
            reqId,
            speakerCount: 2,
            diarizedSegments: [
              { speaker: "SPEAKER_01", start: 0.0, end: 2.1 },
              { speaker: "SPEAKER_02", start: 2.2, end: 4.7 },
            ],
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "audio-noise-filter": {
        id: "audio-noise-filter",
        name: "Neural Audio Noise Reduction & Clean-up",
        price: 2.5,
        category: "speech-audio",
        quality: 0.89,
        latencyMs: 160,
        description: "Removes background room reverberation, HVAC hum, and street noise from audio feeds.",
        generate(reqId, payload = {}) {
          return {
            provider: "theta-audio",
            service: "audio-noise-filter",
            reqId,
            snrImprovementDb: 18.4,
            clippingMitigated: true,
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Iota Media & Diffusion Labs (Image & Video Node)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "iota-diffusion",
    name:               "Iota Media & Diffusion Labs",
    serviceType:        "image-video",
    qualityScore:       0.94,
    estimatedLatencyMs: 410,
    availability:       1.0,
    services: {
      "text-to-image": {
        id: "text-to-image",
        name: "4K Photorealistic Diffusion Generation",
        price: 6.0,
        category: "image-video",
        quality: 0.95,
        latencyMs: 520,
        description: "State-of-the-art latent diffusion synthesis with precise prompt adherence.",
        generate(reqId, payload = {}) {
          return {
            provider: "iota-diffusion",
            service: "text-to-image",
            reqId,
            resolution: "3840x2160",
            sampler: "DPMSolverMultistepScheduler",
            steps: 30,
            renderedImageUrl: "ipfs://bafybeicx402mediaartrenderingsample",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "image-upscaler": {
        id: "image-upscaler",
        name: "4x Super-Resolution Neural Upscaling",
        price: 2.5,
        category: "image-video",
        quality: 0.93,
        latencyMs: 210,
        description: "Restores textures, sharpens edges, and removes compression artifacts at 4x factor.",
        generate(reqId, payload = {}) {
          return {
            provider: "iota-diffusion",
            service: "image-upscaler",
            reqId,
            scaleFactor: "4x",
            psnrScore: 34.2,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "video-frame-tagger": {
        id: "video-frame-tagger",
        name: "Keyframe Extraction & Video Action Tagging",
        price: 5.0,
        category: "image-video",
        quality: 0.91,
        latencyMs: 460,
        description: "Temporal scene boundary detection and semantic activity labeling in video clips.",
        generate(reqId, payload = {}) {
          return {
            provider: "iota-diffusion",
            service: "video-frame-tagger",
            reqId,
            keyframesExtracted: 18,
            actionsDetected: ["agent_negotiation", "blockchain_signing", "receipt_dispensing"],
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "background-remover": {
        id: "background-remover",
        name: "Instant Object Masking & Alpha Matting",
        price: 2.0,
        category: "image-video",
        quality: 0.94,
        latencyMs: 140,
        description: "Sub-pixel alpha matte foreground segmentation with clean hair and translucent edges.",
        generate(reqId, payload = {}) {
          return {
            provider: "iota-diffusion",
            service: "background-remover",
            reqId,
            alphaMatteGenerated: true,
            foregroundRatio: 0.62,
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. Kappa Web Intelligence & ETL (Data & Compute Node)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "kappa-data",
    name:               "Kappa Web Intelligence & ETL",
    serviceType:        "data-compute",
    qualityScore:       0.91,
    estimatedLatencyMs: 190,
    availability:       1.0,
    services: {
      "web-scraper": {
        id: "web-scraper",
        name: "Headless Anti-Bot Web Data Extraction",
        price: 3.0,
        category: "data-compute",
        quality: 0.90,
        latencyMs: 220,
        description: "Bypasses bot protections, renders client-side SPAs, and returns DOM snapshots.",
        generate(reqId, payload = {}) {
          return {
            provider: "kappa-data",
            service: "web-scraper",
            reqId,
            httpStatus: 200,
            domNodesParsed: 1420,
            renderedInMs: 185,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "html-to-markdown": {
        id: "html-to-markdown",
        name: "Clean Web Article & Table Markdown Parser",
        price: 1.5,
        category: "data-compute",
        quality: 0.92,
        latencyMs: 100,
        description: "Strips ads, boilerplate navigation, and converts clean editorial content to Markdown.",
        generate(reqId, payload = {}) {
          return {
            provider: "kappa-data",
            service: "html-to-markdown",
            reqId,
            markdownLengthChars: 3450,
            tablesConverted: 2,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "schema-enrichment": {
        id: "schema-enrichment",
        name: "Lead & Entity Graph Enrichment",
        price: 4.0,
        category: "data-compute",
        quality: 0.91,
        latencyMs: 270,
        description: "Enriches corporate domains with firmographic metadata, technology stacks, and social IDs.",
        generate(reqId, payload = {}) {
          return {
            provider: "kappa-data",
            service: "schema-enrichment",
            reqId,
            verifiedEmails: 3,
            technologiesIdentified: ["Ethereum", "Solidity", "Node.js", "TailwindCSS"],
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "proxy-rotator": {
        id: "proxy-rotator",
        name: "Geotargeted Residential Request Tunnel",
        price: 2.5,
        category: "data-compute",
        quality: 0.94,
        latencyMs: 180,
        description: "Rotates residential IPs across 190 countries with 99.9% uptime and zero throttling.",
        generate(reqId, payload = {}) {
          return {
            provider: "kappa-data",
            service: "proxy-rotator",
            reqId,
            exitNodeCountry: "US",
            asn: "AS7018",
            tunnelEstablished: true,
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 11. Lambda Code & Execution Sandbox (Code & Sandbox Node)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "lambda-code",
    name:               "Lambda Code & Execution Sandbox",
    serviceType:        "code-dev",
    qualityScore:       0.95,
    estimatedLatencyMs: 240,
    availability:       1.0,
    services: {
      "code-audit": {
        id: "code-audit",
        name: "Automated AST Security & Vulnerability Auditor",
        price: 4.5,
        category: "code-dev",
        quality: 0.95,
        latencyMs: 310,
        description: "Static abstract syntax tree inspection for reentrancy, injection, and overflow bugs.",
        generate(reqId, payload = {}) {
          return {
            provider: "lambda-code",
            service: "code-audit",
            reqId,
            vulnerabilitiesFound: 0,
            astNodesScanned: 2840,
            securityAttestation: "ZERO_CRITICAL_CVE",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "isolated-eval": {
        id: "isolated-eval",
        name: "Sandboxed Python/Node.js Code Execution",
        price: 3.0,
        category: "code-dev",
        quality: 0.97,
        latencyMs: 190,
        description: "gVisor microVM isolated execution with strict memory and CPU quotas.",
        generate(reqId, payload = {}) {
          return {
            provider: "lambda-code",
            service: "isolated-eval",
            reqId,
            exitCode: 0,
            cpuTimeMs: 42,
            memoryPeakMb: 18.4,
            stdout: "Verification passed. Cryptographic hash matches canonical state.",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "sql-optimizer": {
        id: "sql-optimizer",
        name: "SQL Query Analysis & Index Recommendation",
        price: 3.5,
        category: "code-dev",
        quality: 0.92,
        latencyMs: 210,
        description: "EXPLAIN plan cost reduction and compound index synthesis for PostgreSQL/MySQL.",
        generate(reqId, payload = {}) {
          return {
            provider: "lambda-code",
            service: "sql-optimizer",
            reqId,
            estimatedSpeedup: "4.8x",
            recommendedIndexes: ["CREATE INDEX idx_audit_reqid ON transactions(reqId);"],
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "api-mock-gen": {
        id: "api-mock-gen",
        name: "OpenAPI/Swagger Contract to Mock Generator",
        price: 2.5,
        category: "code-dev",
        quality: 0.90,
        latencyMs: 150,
        description: "Generates realistic dynamic mock endpoints with faker data from OpenAPI specifications.",
        generate(reqId, payload = {}) {
          return {
            provider: "lambda-code",
            service: "api-mock-gen",
            reqId,
            mockEndpointsReady: 6,
            protocol: "REST / JSON",
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 12. Mu Vector & Embeddings Mesh (RAG & Embeddings Node)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "mu-embeddings",
    name:               "Mu Vector & Embeddings Mesh",
    serviceType:        "rag-embeddings",
    qualityScore:       0.95,
    estimatedLatencyMs: 120,
    availability:       1.0,
    services: {
      "vector-embed-3072": {
        id: "vector-embed-3072",
        name: "Dense 3072-dim Text Vector Embedding",
        price: 2.0,
        category: "rag-embeddings",
        quality: 0.96,
        latencyMs: 95,
        description: "MTEB leaderboard-topping dense vector embeddings for semantic retrieval.",
        generate(reqId, payload = {}) {
          return {
            provider: "mu-embeddings",
            service: "vector-embed-3072",
            reqId,
            dimensions: 3072,
            norm: 1.0,
            vectorPreview: [0.0341, -0.0128, 0.0894, 0.0042, -0.0512],
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "cross-encoder-rerank": {
        id: "cross-encoder-rerank",
        name: "Semantic Cross-Encoder Passage Reranker",
        price: 3.0,
        category: "rag-embeddings",
        quality: 0.95,
        latencyMs: 170,
        description: "Deep attention reranking of top-50 candidate documents with relevance scoring.",
        generate(reqId, payload = {}) {
          return {
            provider: "mu-embeddings",
            service: "cross-encoder-rerank",
            reqId,
            passagesEvaluated: 50,
            topRelevanceScore: 0.984,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "clustering-similarity": {
        id: "clustering-similarity",
        name: "Multi-Vector Cosine Similarity & Clustering",
        price: 2.5,
        category: "rag-embeddings",
        quality: 0.91,
        latencyMs: 140,
        description: "HDBSCAN vector clustering and nearest-neighbor graph construction.",
        generate(reqId, payload = {}) {
          return {
            provider: "mu-embeddings",
            service: "clustering-similarity",
            reqId,
            clustersFormed: 4,
            silhouetteScore: 0.812,
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 13. Nu RAG & Knowledge Graph Engine (RAG & Embeddings Node)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "nu-rag",
    name:               "Nu RAG & Knowledge Graph Engine",
    serviceType:        "rag-embeddings",
    qualityScore:       0.94,
    estimatedLatencyMs: 250,
    availability:       1.0,
    services: {
      "rag-search": {
        id: "rag-search",
        name: "Hybrid Vector + BM25 Context Retriever",
        price: 4.0,
        category: "rag-embeddings",
        quality: 0.94,
        latencyMs: 260,
        description: "Reciprocal Rank Fusion across dense embeddings and sparse keyword indexes.",
        generate(reqId, payload = {}) {
          return {
            provider: "nu-rag",
            service: "rag-search",
            reqId,
            contextChunksRetrieved: 5,
            fusionScore: 0.958,
            groundingPassages: ["Protocol Section 4: EIP-712 Settlement", "Contract 0xf9f2: Enforcer Budget"],
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "knowledge-graph": {
        id: "knowledge-graph",
        name: "Unstructured Text to Entity-Relationship Graph",
        price: 5.5,
        category: "rag-embeddings",
        quality: 0.93,
        latencyMs: 390,
        description: "Extracts nodes, edges, and triples into Neo4j/Cypher compatible graph structures.",
        generate(reqId, payload = {}) {
          return {
            provider: "nu-rag",
            service: "knowledge-graph",
            reqId,
            nodesCreated: 14,
            edgesCreated: 29,
            entityTypes: ["Agent", "Provider", "SmartContract", "Token"],
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "document-chunker": {
        id: "document-chunker",
        name: "Semantic Chunking with Overlap Optimization",
        price: 2.0,
        category: "rag-embeddings",
        quality: 0.90,
        latencyMs: 120,
        description: "Boundary-respecting semantic text splitter maintaining coherent contextual units.",
        generate(reqId, payload = {}) {
          return {
            provider: "nu-rag",
            service: "document-chunker",
            reqId,
            chunksProduced: 32,
            averageChunkTokens: 384,
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "citation-verifier": {
        id: "citation-verifier",
        name: "Source Document Grounding & Citation Verifier",
        price: 3.5,
        category: "rag-embeddings",
        quality: 0.96,
        latencyMs: 210,
        description: "Verifies every sentence in generative output against grounding source documents.",
        generate(reqId, payload = {}) {
          return {
            provider: "nu-rag",
            service: "citation-verifier",
            reqId,
            hallucinationRate: 0.00,
            groundedClaims: 12,
            verificationStatus: "100% GROUNDED",
            generatedAt: new Date().toISOString(),
          };
        },
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 14. Xi Moderation & Research Guardrails (Document & Research Node)
  // ─────────────────────────────────────────────────────────────────────────
  {
    providerId:         "xi-compliance",
    name:               "Xi Moderation & Research Guardrails",
    serviceType:        "document-research",
    qualityScore:       0.94,
    estimatedLatencyMs: 160,
    availability:       1.0,
    services: {
      "content-moderator": {
        id: "content-moderator",
        name: "Multilingual Toxic & Harm Content Classifier",
        price: 2.0,
        category: "document-research",
        quality: 0.95,
        latencyMs: 110,
        description: "Multi-category safety evaluation covering hate speech, harassment, and security threats.",
        generate(reqId, payload = {}) {
          return {
            provider: "xi-compliance",
            service: "content-moderator",
            reqId,
            flagged: false,
            safetyCategories: { harassment: 0.001, hate: 0.001, dangerous: 0.002 },
            policyDecision: "ACCEPT",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "pii-redactor": {
        id: "pii-redactor",
        name: "Automated GDPR/HIPAA Personal Data Redactor",
        price: 3.0,
        category: "document-research",
        quality: 0.96,
        latencyMs: 170,
        description: "Named entity recognition masking emails, phone numbers, SSNs, and crypto private keys.",
        generate(reqId, payload = {}) {
          return {
            provider: "xi-compliance",
            service: "pii-redactor",
            reqId,
            redactedFields: ["EMAIL", "WALLET_SECRET"],
            complianceTag: "HIPAA_SAFE_HARBOR",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "academic-search": {
        id: "academic-search",
        name: "Semantic Scholar & ArXiv Research Retrieval",
        price: 3.5,
        category: "document-research",
        quality: 0.92,
        latencyMs: 240,
        description: "Automated literature review extracting peer-reviewed abstracts and citation graphs.",
        generate(reqId, payload = {}) {
          return {
            provider: "xi-compliance",
            service: "academic-search",
            reqId,
            papersIndexed: 8,
            primaryDoi: "10.1145/3372278.3390678",
            venue: "ACM Conference on Computer and Communications Security",
            generatedAt: new Date().toISOString(),
          };
        },
      },
      "sentiment-analyzer": {
        id: "sentiment-analyzer",
        name: "Granular Aspect-Based Sentiment Classifier",
        price: 2.0,
        category: "document-research",
        quality: 0.89,
        latencyMs: 130,
        description: "Measures polarity, subjective tone, and emotional valence across text corpora.",
        generate(reqId, payload = {}) {
          return {
            provider: "xi-compliance",
            service: "sentiment-analyzer",
            reqId,
            sentiment: "POSITIVE",
            score: 0.912,
            valence: "CONFIDENT",
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
function listProviders({ serviceType, minQuality, maxPrice } = {}, providerList = PROVIDERS) {
  return providerList.filter((p) => {
    if (!p.availability || p.availability <= 0) return false;
    if (serviceType && p.serviceType !== serviceType) return false;
    if (minQuality && p.qualityScore < minQuality) return false;
    if (maxPrice) {
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
      category:    s.category || provider.serviceType,
      quality:     s.quality || provider.qualityScore,
      latencyMs:   s.latencyMs || provider.estimatedLatencyMs,
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
      const isJob = p.serviceType === "data-compute" || p.serviceType === "code-dev";
      all.push({
        id: s.id,
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

  const serviceId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `service-${Date.now()}`;

  let targetProvider = PROVIDER_MAP[providerId];
  if (!targetProvider) {
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

  const isJob = targetProvider.serviceType === "data-compute" || targetProvider.serviceType === "code-dev";
  return {
    success: true,
    serviceId,
    id: serviceId,
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
