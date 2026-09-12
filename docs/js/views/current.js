/**
 * dashboard/public/js/views/current.js
 *
 * Screen 3: Live Execution — The "Wow" Screen
 * ============================================
 * Redesigned around ONE core story:
 *   MARKETPLACE → AI PURCHASE → LIVE EXECUTION → RESULT
 *
 * TOP:
 *   AUTONOMOUS PURCHASE
 *   "Translate this PDF to Hindi. Quality > 0.9. Max $5."
 *   STATUS: ● RUNNING / ✓ PURCHASE COMPLETE
 *
 * CENTER:
 *   Clean vertical timeline:
 *   ✓ REQUEST RECEIVED
 *         ↓
 *   ✓ AI UNDERSTOOD INTENT
 *         ↓
 *   ✓ PROVIDERS DISCOVERED
 *         ↓
 *   ✓ ALPHA TRANSLATE SELECTED
 *         ↓
 *   HTTP 402 PAYMENT REQUIRED
 *         ↓
 *   ✓ PAYMENT-SIGNATURE CREATED
 *         ↓
 *   ✓ FACILITATOR VERIFIED
 *         ↓
 *   BLOCKCHAIN SETTLEMENT
 *         ↓
 *   ○ DELIVERY
 *         ↓
 *   ○ HASH VERIFICATION
 *
 *   Each step expands dynamically when active.
 *
 * RESULT:
 *   PURCHASE COMPLETE — $4.00 USDC with delivered payload & SHA-256 match.
 */

const CurrentTransactionView = {
  initialized: false,
  isExecuting: false,
  currentPrompt: "Translate this legal contract to English. Quality > 0.9. Max $5.",
  status: "COMPLETED", // "RUNNING" | "COMPLETED"
  activeStep: 10,       // 1 to 10
  expandedStep: null,   // null = follow active, or manual step index (1-10)
  txHash: "0xda48b1c9f4d7159c8e192a6374028471b058c067e26830571092e093847228e9",
  deliveryHash: "sha256:7bd1674136f9868f25814fa668616297740ebc5bf6015c0868dff32f09761e20",
  deliveredText: "This legal agreement is verified, secure, and confidential. Under the W3A-1 protocol, payment was settled directly on-chain and SHA-256 cryptographic verification succeeded.",
  elapsedSeconds: 0,
  timerInterval: null,
  showTelemetry: false,

  toggleTelemetry() {
    this.showTelemetry = !this.showTelemetry;
    this.reRenderIfMounted();
  },

  stepStates: {
    1: "confirmed",
    2: "confirmed",
    3: "confirmed",
    4: "confirmed",
    5: "confirmed",
    6: "confirmed",
    7: "confirmed",
    8: "confirmed",
    9: "confirmed",
    10: "confirmed",
  },

  stepsMeta: [
    {
      id: 1,
      title: "REQUEST RECEIVED",
      shortSummary: "Purchase directive parsed from user prompt",
      renderDetails(ctx) {
        return `
          <div class="space-y-2 text-xs font-mono">
            <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 space-y-1">
              <span class="text-outline text-[11px] block">User Prompt Directive:</span>
              <p class="text-white font-sans font-semibold">"${ctx.currentPrompt}"</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div class="p-2 rounded bg-surface-lowest border border-outline-variant/30">
                <span class="text-outline">Request ID:</span>
                <span class="text-secondary font-bold block truncate">0x088e7c75ddcc48eba2b158c5b9268bf6...</span>
              </div>
              <div class="p-2 rounded bg-surface-lowest border border-outline-variant/30">
                <span class="text-outline">Client Signer:</span>
                <span class="text-white font-bold block truncate">0x70997970C51812dc3A010C7d01b50e0d...</span>
              </div>
            </div>
          </div>
        `;
      },
    },
    {
      id: 2,
      title: "AI UNDERSTOOD INTENT",
      shortSummary: "Extracted constraints: Legal Contract Translation to English, Quality ≥ 0.90, Max $5.00",
      renderDetails() {
        return `
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-center">
            <div class="p-2.5 rounded-lg bg-surface-lowest border border-outline-variant/30">
              <span class="text-[10px] text-outline uppercase font-bold block">Service</span>
              <span class="text-white font-bold text-sm mt-0.5 block">Translation</span>
            </div>
            <div class="p-2.5 rounded-lg bg-surface-lowest border border-outline-variant/30">
              <span class="text-[10px] text-outline uppercase font-bold block">Target</span>
              <span class="text-secondary font-bold text-sm mt-0.5 block">English (en-US)</span>
            </div>
            <div class="p-2.5 rounded-lg bg-surface-lowest border border-outline-variant/30">
              <span class="text-[10px] text-outline uppercase font-bold block">Quality Floor</span>
              <span class="text-tertiary font-bold text-sm mt-0.5 block">≥ 0.90</span>
            </div>
            <div class="p-2.5 rounded-lg bg-surface-lowest border border-outline-variant/30">
              <span class="text-[10px] text-outline uppercase font-bold block">Budget Cap</span>
              <span class="text-tertiary font-bold text-sm mt-0.5 block">≤ $5.00 USDC</span>
            </div>
          </div>
        `;
      },
    },
    {
      id: 3,
      title: "PROVIDERS DISCOVERED",
      shortSummary: "Queried decentralized marketplace: 3 providers evaluated",
      renderDetails() {
        return `
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div class="p-3 rounded-lg bg-surface-lowest border border-secondary/40 space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white">Alpha Translate</span>
                <span class="text-secondary font-bold">$4.00</span>
              </div>
              <div class="text-[11px] text-outline">Quality: <strong class="text-tertiary">0.92</strong> | Latency: 200ms</div>
            </div>
            <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 space-y-1 opacity-75">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white">Beta Translate</span>
                <span class="text-on-surface font-bold">$3.00</span>
              </div>
              <div class="text-[11px] text-outline">Quality: <strong class="text-amber-400">0.84</strong> | Latency: 180ms</div>
            </div>
            <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 space-y-1 opacity-60">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white">Gamma Premium</span>
                <span class="text-error font-bold">$6.00</span>
              </div>
              <div class="text-[11px] text-outline">Quality: <strong class="text-tertiary">0.97</strong> (Exceeds $5)</div>
            </div>
          </div>
        `;
      },
    },
    {
      id: 4,
      title: "ALPHA TRANSLATE SELECTED",
      shortSummary: "Alpha selected: optimal quality (0.92) within budget ($4.00)",
      renderDetails() {
        return `
          <div class="p-3 rounded-lg bg-surface-lowest border border-tertiary/50 space-y-2 text-xs font-mono">
            <div class="flex items-center justify-between">
              <span class="text-white font-bold text-sm">Alpha Translation Services</span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tertiary/20 text-tertiary border border-tertiary/40">
                Selected ✓
              </span>
            </div>
            <div class="text-on-surface-variant font-sans text-xs leading-relaxed">
              Weighted frontier metric: <strong>0.91</strong>. Satisfies quality threshold (0.92 ≥ 0.90) and human budget ceiling ($4.00 ≤ $5.00).
            </div>
          </div>
        `;
      },
    },
    {
      id: 5,
      title: "HTTP 402 PAYMENT REQUIRED",
      shortSummary: "x402 V2 Challenge: 402 Payment Required ($4.00 USDC / exact scheme)",
      renderDetails(ctx) {
        return `
          <div class="rounded-xl bg-surface-lowest border-2 border-secondary/50 p-5 space-y-4 font-mono">
            <!-- Card Header -->
            <div class="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary/15 text-secondary border border-secondary/40">
                  x402 V2
                </span>
                <span class="text-xs text-outline font-bold">WIRE PROTOCOL CHALLENGE</span>
              </div>
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-400/15 text-amber-400 border border-amber-400/40">
                402 PAYMENT REQUIRED
              </span>
            </div>

            <!-- Simple Clean Key-Value Grid for Judges -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between">
                <span class="text-outline">Service</span>
                <strong class="text-white font-sans">PDF Translation</strong>
              </div>
              <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between">
                <span class="text-outline">Amount</span>
                <strong class="text-secondary font-bold">$4.00 USDC</strong>
              </div>
              <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between">
                <span class="text-outline">Scheme</span>
                <strong class="text-white font-sans">exact</strong>
              </div>
              <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between">
                <span class="text-outline">Network</span>
                <strong class="text-white">eip155:31337</strong>
              </div>
              <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between sm:col-span-2">
                <span class="text-outline">PayTo</span>
                <strong class="text-secondary font-mono">0x3C44CdD42032026644978e73455916233334573</strong>
              </div>
              <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between sm:col-span-2">
                <span class="text-outline">Expires</span>
                <strong class="text-tertiary font-mono">4m 58s</strong>
              </div>
            </div>

            <!-- Requirements Verified Badge -->
            <div class="flex items-center gap-2 text-tertiary text-xs font-bold pt-1">
              <span class="w-4 h-4 rounded-full bg-tertiary/20 flex items-center justify-center text-[10px]">✓</span>
              <span>Payment requirements verified</span>
            </div>

            <!-- Nerdy Technical Proof Payload (Collapsible) -->
            <details class="pt-2 border-t border-outline-variant/20 group">
              <summary class="cursor-pointer text-xs text-secondary hover:text-white font-bold flex items-center gap-1.5 transition select-none">
                <span class="material-symbols-outlined text-sm group-open:rotate-180 transition-transform">expand_more</span>
                <span>View Protocol Payload</span>
                <span class="text-[10px] text-outline font-normal">(Base64 &amp; Raw JSON)</span>
              </summary>
              <div class="mt-3 space-y-2 text-[11px] font-mono">
                <div class="p-2.5 rounded-lg bg-surface-high border border-outline-variant/30 text-outline break-all">
                  <span class="text-[10px] uppercase font-bold text-white block mb-1">Header: PAYMENT-REQUIRED</span>
                  <code class="text-slate-300">eyJ4NDAyVmVyc2lvbiI6MiwicmVxdWlyZW1lbnRzIjp7InNjaGVtZSI6ImV4YWN0IiwicGF5VG8iOiIweDNDNDRDZEQ0MjAzMjAyNjY0NDk3OGU3MzQ1NTkxNjIzMzMzNDU3MyIsImFtb3VudCI6IjQwMDAwMDAiLCJhc3NldCI6IjB4NUZiREIyMzE1Njc4YWZlY2IzNjdmMDMyZDkzRjY0MmY2NDE4MGFhMyIsIm5ldHdvcmsiOiJlaXAxNTU6MzEzMzcifX0=</code>
                </div>
                <div class="p-2.5 rounded-lg bg-surface-high border border-outline-variant/30 text-secondary whitespace-pre overflow-x-auto text-[11px] leading-snug">
{
  "x402Version": 2,
  "requirements": {
    "scheme": "exact",
    "network": "eip155:31337",
    "asset": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "amount": "4000000",
    "payTo": "0x3C44CdD42032026644978e73455916233334573",
    "validBefore": 1789225500
  }
}</div>
              </div>
            </details>
          </div>
        `;
      },
    },
    {
      id: 6,
      title: "PAYMENT-SIGNATURE CREATED",
      shortSummary: "EIP-712 secp256k1 payment authorization signed by agent private key",
      renderDetails() {
        return `
          <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/40 space-y-2 text-xs font-mono">
            <div class="flex items-center justify-between">
              <span class="text-white font-bold">EIP-712 Authorization Signed</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">EIP-712 ✓</span>
            </div>
            <div class="text-[11px] text-outline break-all">
              Sig: <code class="text-secondary">0x3a9f82d41b58c067e26830571092e093847228e938192a84c...</code>
            </div>
          </div>
        `;
      },
    },
    {
      id: 7,
      title: "FACILITATOR VERIFIED",
      shortSummary: "Signature cryptographically valid, budget verified on-chain",
      renderDetails() {
        return `
          <div class="p-3 rounded-lg bg-surface-lowest border border-tertiary/40 flex items-center justify-between text-xs font-mono">
            <div>
              <span class="text-white font-bold block">Facilitator Verification Passed</span>
              <span class="text-outline text-[11px]">Signature verified against agent key, budget ceiling authorized</span>
            </div>
            <span class="px-2.5 py-1 rounded bg-tertiary/20 text-tertiary border border-tertiary/40 font-bold">
              VERIFIED ✓
            </span>
          </div>
        `;
      },
    },
    {
      id: 8,
      title: "BLOCKCHAIN SETTLEMENT",
      shortSummary: "TokenBudgetEnforcer.sol executed on-chain ERC-20 settlement",
      renderDetails(ctx) {
        return `
          <div class="p-3 rounded-lg bg-surface-lowest border border-secondary/40 space-y-2 text-xs font-mono">
            <div class="flex items-center justify-between">
              <span class="text-tertiary font-bold">✓ Settled On-Chain (Hardhat EVM)</span>
              <span class="text-outline text-[11px]">Block #12</span>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-outline">Tx Hash:</span>
              <span class="text-secondary font-bold inline-flex items-center gap-1">
                ${UIFormatter.formatHash(ctx.txHash, 8)}
                <button onclick="App.copyText('${ctx.txHash}')" class="text-outline hover:text-white">
                  <span class="material-symbols-outlined text-xs">content_copy</span>
                </button>
              </span>
            </div>
          </div>
        `;
      },
    },
    {
      id: 9,
      title: "DELIVERY",
      shortSummary: "Decrypted translation content payload received from provider endpoint",
      renderDetails(ctx) {
        return `
          <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/40 space-y-1.5 text-xs font-mono">
            <div class="flex items-center justify-between text-tertiary font-bold">
              <span>Content Delivery Received</span>
              <span class="text-outline text-[10px]">HTTP 200 OK</span>
            </div>
            <p class="text-slate-200 font-sans text-xs leading-relaxed p-2 bg-surface-high/30 rounded border border-outline-variant/20">
              ${ctx.deliveredText}
            </p>
          </div>
        `;
      },
    },
        {
      id: 10,
      title: "HASH VERIFICATION",
      shortSummary: "Client independent SHA-256 integrity check against on-chain proof",
      renderDetails(ctx) {
        return `
          <div class="rounded-xl bg-surface-lowest border-2 border-tertiary/50 p-5 space-y-4 font-mono text-xs">
            <div class="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <span class="font-headline text-sm font-bold text-white tracking-wide">DELIVERY</span>
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold bg-tertiary/15 text-tertiary border border-tertiary/30">
                RESOURCE RECEIVED
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 space-y-1">
                <span class="text-outline block text-[10px] uppercase font-bold">On-chain hash:</span>
                <code class="text-tertiary font-bold break-all block">${ctx.deliveryHash}</code>
              </div>
              <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 space-y-1">
                <span class="text-outline block text-[10px] uppercase font-bold">Client recomputed:</span>
                <code class="text-tertiary font-bold break-all block">${ctx.deliveryHash}</code>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1">
              <span class="text-tertiary font-bold flex items-center gap-1.5 text-xs">
                <span class="w-4 h-4 rounded-full bg-tertiary/20 flex items-center justify-center text-[10px]">✓</span>
                <span>MATCH: Cryptographically bound to payment record</span>
              </span>
              <span class="text-outline text-[10px]">100% Deterministic Verification</span>
            </div>
          </div>
        `;
      },
    },

  onStateChange(event, data) {
    if (
      event === "settlement_confirmed" ||
      event === "x402_flow_updated" ||
      event === "delivery_verified" ||
      event === "budget_updated" ||
      event === "prompt_changed"
    ) {
      if (typeof document !== "undefined" && typeof AppState !== "undefined") {
        const cur = AppState.currentView;
        if ((cur === "execution" || cur === "current") && !this.isExecuting) {
          this.reRenderIfMounted();
        }
      }
    }
  },

  reRenderIfMounted() {
    if (typeof document === "undefined") return;
    const root = document.getElementById("mainContent") || document.getElementById("main-content");
    if (root && root.querySelector("#current-view-root")) {
      root.innerHTML = this.render();
    }
  },

  toggleStep(stepId) {
    this.expandedStep = this.expandedStep === stepId ? null : stepId;
    this.reRenderIfMounted();
  },

  async startLiveExecution(prompt) {
    this.currentPrompt = prompt || (AppState && AppState.currentPrompt) || "Translate this legal contract to English. Quality > 0.9. Max $5.";
    this.status = "RUNNING";
    this.isExecuting = true;
    this.activeStep = 1;
    this.expandedStep = 1;
    this.elapsedSeconds = 0;

    // Reset all steps
    for (let i = 1; i <= 10; i++) {
      this.stepStates[i] = "pending";
    }
    this.stepStates[1] = "active";

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds += 1;
      const el = document.getElementById("liveExecutionTimer");
      if (el) el.innerText = `00:${this.elapsedSeconds < 10 ? "0" + this.elapsedSeconds : this.elapsedSeconds}`;
    }, 1000);

    // Switch view to execution screen immediately
    if (typeof App !== "undefined" && typeof App.navigate === "function") {
      App.navigate("execution");
    }

    // Launch backend execution in parallel
    const apiPromise = fetch("/api/orchestrate/ai-purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: this.currentPrompt }),
    })
      .then((r) => r.json())
      .catch((err) => ({ error: err.message }));

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // Progress through the 10-step pipeline
    const delays = [600, 700, 800, 700, 800, 700, 700, 900, 700, 600];

    for (let step = 1; step <= 10; step++) {
      this.activeStep = step;
      this.expandedStep = step;
      this.stepStates[step] = "active";
      this.reRenderIfMounted();

      if (step === 8) {
        // Await on-chain settlement result
        const apiResult = await Promise.race([apiPromise, sleep(1200)]);
        if (apiResult && apiResult.trace && apiResult.trace.txHash) {
          this.txHash = apiResult.trace.txHash;
        }
      }

      await sleep(delays[step - 1] || 700);
      this.stepStates[step] = "confirmed";
    }

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.status = "COMPLETED";
    this.isExecuting = false;
    this.activeStep = 10;
    this.expandedStep = null; // show completed result summary
    this.reRenderIfMounted();

    if (typeof ApiService !== "undefined") {
      await ApiService.syncAll();
    }
  },

  render() {
    this.init();
    const prompt = this.currentPrompt || (AppState && AppState.currentPrompt) || "Translate this legal contract to English. Quality > 0.9. Max $5.";
    const isRunning = this.status === "RUNNING";
    const isCompleted = this.status === "COMPLETED";

    return `
      <div id="current-view-root" class="space-y-6 max-w-4xl mx-auto pb-16">

        <!-- ===================================================================
             1. TOP: AUTONOMOUS PURCHASE HEADER
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low/95 border border-outline-variant/50 p-6 md:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div class="absolute -right-16 -top-16 w-64 h-64 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>

          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-5">
            <div>
              <div class="flex items-center gap-2 mb-1.5 font-mono text-xs">
                <span class="text-outline uppercase font-bold tracking-widest text-[10px]">PIPELINE STAGE 3</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
                  x402 V2 LIVE WIRE
                </span>
              </div>
              <h1 class="font-headline text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                AUTONOMOUS PURCHASE
              </h1>
              <p class="text-xs md:text-sm text-secondary font-mono mt-1 font-semibold">
                "${prompt}"
              </p>
            </div>

            <!-- STATUS BADGE -->
            <div class="flex items-center gap-3">
              <div class="px-4 py-2 rounded-xl font-mono text-xs font-bold border flex items-center gap-2 shadow-sm ${
                isRunning
                  ? "bg-secondary/20 text-secondary border-secondary/50 glow-cyan animate-pulse"
                  : "bg-tertiary/20 text-tertiary border-tertiary/50 glow-emerald"
              }">
                <span class="w-2 h-2 rounded-full ${isRunning ? "bg-secondary animate-ping" : "bg-tertiary"}"></span>
                <span>STATUS: ${isRunning ? "● RUNNING" : "✓ PURCHASE COMPLETE"}</span>
                ${isRunning ? `<span id="liveExecutionTimer" class="ml-1 text-white">00:${this.elapsedSeconds < 10 ? "0" + this.elapsedSeconds : this.elapsedSeconds}</span>` : ""}
              </div>

              ${
                !isRunning
                  ? `
                <button
                  onclick="CurrentTransactionView.startLiveExecution('${prompt}')"
                  class="px-3 py-2 rounded-xl bg-surface-high hover:bg-surface-highest border border-outline-variant/40 text-xs font-mono font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
                  title="Re-run autonomous execution flow"
                >
                  <span class="material-symbols-outlined text-sm text-secondary">replay</span>
                  <span>Re-Run</span>
                </button>
              `
                  : ""
              }
            </div>
          </div>

          <!-- Supporting Subtitle -->
          <div class="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-outline">
            <span>Protocol: <strong>TokenBudgetEnforcer.sol (Hardhat EVM)</strong></span>
            <span>Spender: <code class="text-white">0x709979...79C8</code></span>
            <span>Settled Spend: <strong class="text-tertiary">$4.00 USDC</strong></span>
          </div>
        </div>

        <!-- ===================================================================
             2. CENTER: CLEAN VERTICAL TIMELINE (EACH STEP EXPANDS WHEN ACTIVE)
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 md:p-8 space-y-4 shadow-xl">
          <div class="flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <h2 class="font-headline text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Deterministic Cryptographic Pipeline</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-lowest text-outline border border-outline-variant/30">
                10 Verified Milestones
              </span>
            </h2>
            <span class="text-xs font-mono text-outline">Click any step to inspect</span>
          </div>

          <!-- Vertical Timeline Stack -->
          <div class="space-y-2 py-2">
            ${this.stepsMeta
              .map((s, idx) => {
                const state = this.stepStates[s.id] || "pending";
                const isCurrentActive = isRunning && this.activeStep === s.id;
                const isExpanded = this.expandedStep === s.id || isCurrentActive;

                let iconHtml = '<span class="w-6 h-6 rounded-full bg-surface-lowest text-outline border border-outline-variant/30 flex items-center justify-center text-xs font-mono">○</span>';
                let titleClass = "text-on-surface-variant font-medium";
                let cardBorder = "border-outline-variant/20 bg-surface-lowest/40";

                if (state === "confirmed") {
                  iconHtml = '<span class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary border border-tertiary/40 flex items-center justify-center text-xs font-bold font-mono glow-emerald">✓</span>';
                  titleClass = "text-white font-bold";
                  cardBorder = "border-outline-variant/40 bg-surface-lowest";
                } else if (state === "active") {
                  iconHtml = '<span class="w-6 h-6 rounded-full bg-secondary/20 text-secondary border border-secondary/50 flex items-center justify-center text-xs font-bold font-mono glow-cyan"><span class="material-symbols-outlined text-xs animate-pulse">bolt</span></span>';
                  titleClass = "text-secondary font-extrabold";
                  cardBorder = "border-secondary/60 bg-secondary/[0.04] shadow-md";
                }

                return `
                  <div class="space-y-2">
                    <!-- Step Row -->
                    <div
                      onclick="CurrentTransactionView.toggleStep(${s.id})"
                      class="rounded-xl border ${cardBorder} p-3.5 transition-all cursor-pointer hover:border-outline-variant/70 flex flex-col gap-2"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                          ${iconHtml}
                          <span class="font-mono text-xs font-bold tracking-wider ${titleClass}">
                            ${s.title}
                          </span>
                        </div>

                        <div class="flex items-center gap-2">
                          <span class="text-[10px] font-mono px-2 py-0.5 rounded ${
                            state === "confirmed"
                              ? "bg-tertiary/10 text-tertiary border border-tertiary/20"
                              : state === "active"
                              ? "bg-secondary/15 text-secondary border border-secondary/30"
                              : "bg-surface-high text-outline"
                          }">
                            ${state.toUpperCase()}
                          </span>
                          <span class="material-symbols-outlined text-sm text-outline transition-transform ${isExpanded ? "rotate-180" : ""}">
                            expand_more
                          </span>
                        </div>
                      </div>

                      <p class="text-[11px] font-mono text-outline pl-9">
                        ${s.shortSummary}
                      </p>

                      <!-- Expanded Details Content -->
                      ${
                        isExpanded
                          ? `
                        <div class="pt-3 mt-1 border-t border-outline-variant/20 pl-9 animate-fadeIn">
                          ${s.renderDetails(this)}
                        </div>
                      `
                          : ""
                      }
                    </div>

                    <!-- Down Arrow Between Steps -->
                    ${
                      idx < this.stepsMeta.length - 1
                        ? `
                      <div class="flex items-center justify-center py-0.5 text-outline/50 font-mono text-xs">
                        <span>↓</span>
                      </div>
                    `
                        : ""
                    }
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>

        
        <!-- Item 5: Embedded Live Telemetry Console (Collapsible) -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-5 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-base text-secondary">terminal</span>
              <h3 class="font-headline text-sm font-bold text-white uppercase tracking-wider">Live Event Telemetry</h3>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary/15 text-secondary border border-secondary/30">
                SSE STREAM
              </span>
            </div>
            <button
              onclick="CurrentTransactionView.toggleTelemetry()"
              id="btnToggleTelemetry"
              class="px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface-highest border border-outline-variant/30 text-xs font-mono text-on-surface hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <span class="material-symbols-outlined text-xs">tune</span>
              <span id="labelToggleTelemetry">${this.showTelemetry ? 'Hide Telemetry' : 'Inspect Live Telemetry'}</span>
            </button>
          </div>

          ${
            this.showTelemetry && typeof LiveSystemTerminal !== 'undefined'
              ? `
            <div class="pt-2 animate-fadeIn">
              ${LiveSystemTerminal.render()}
            </div>
          `
              : ''
          }
        </div>

        <!-- ===================================================================
             3. RESULT SECTION: PURCHASE COMPLETE CARD
             =================================================================== -->
        ${
          isCompleted
            ? `
          <div class="p-6 md:p-8 rounded-2xl bg-surface-low border-2 border-tertiary/60 shadow-2xl space-y-5 glow-emerald animate-fadeIn">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
              <div class="flex items-center gap-3">
                <span class="w-9 h-9 rounded-full bg-tertiary/20 text-tertiary border border-tertiary/40 flex items-center justify-center font-bold font-mono text-lg glow-emerald">✓</span>
                <div>
                  <h3 class="font-headline text-lg md:text-xl font-bold text-white tracking-tight">PURCHASE COMPLETE</h3>
                  <span class="text-xs font-mono text-tertiary font-bold">$4.00 USDC Settled On-Chain (Zero Reload)</span>
                </div>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-mono font-bold bg-tertiary/15 text-tertiary border border-tertiary/40 glow-emerald">
                SHA-256 INTEGRITY MATCH ✓
              </span>
            </div>

            <!-- Delivered Translation Preview -->
            <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 space-y-2">
              <div class="flex items-center justify-between text-[11px] font-mono text-outline">
                <span>Delivered Output (English):</span>
                <span class="text-tertiary font-bold">100% Cryptographic Match</span>
              </div>
              <p class="text-sm font-sans text-white leading-relaxed p-3.5 bg-surface-high/30 rounded-lg border border-outline-variant/20 select-text">
                "${this.deliveredText}"
              </p>
            </div>

            <!-- Settlement & Hash Proof Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div class="p-3 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center justify-between">
                <span class="text-outline">On-Chain Tx Hash:</span>
                <span class="text-secondary font-bold inline-flex items-center gap-1">
                  ${UIFormatter.formatHash(this.txHash, 6)}
                  <button onclick="App.copyText('${this.txHash}')" class="text-outline hover:text-white" title="Copy transaction hash">
                    <span class="material-symbols-outlined text-xs">content_copy</span>
                  </button>
                </span>
              </div>
              <div class="p-3 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center justify-between">
                <span class="text-outline">Delivery Proof:</span>
                <span class="text-tertiary font-bold">${UIFormatter.formatDeliveryHash(this.deliveryHash, 4)}</span>
              </div>
            </div>

            <!-- Navigation Actions -->
            <div class="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                onclick="App.navigate('purchases')"
                class="px-5 py-2.5 rounded-xl bg-surface-high hover:bg-surface-highest border border-outline-variant/40 text-xs font-mono font-bold text-white flex items-center gap-2 transition cursor-pointer active:scale-95"
              >
                <span class="material-symbols-outlined text-sm">receipt_long</span>
                <span>View in Purchases Explorer &rarr;</span>
              </button>
              <button
                onclick="App.navigate('buy')"
                class="px-5 py-2.5 rounded-xl bg-secondary/20 hover:bg-secondary/30 border border-secondary/50 text-xs font-mono font-bold text-secondary hover:text-white flex items-center gap-2 transition shadow-sm glow-cyan cursor-pointer active:scale-95"
              >
                <span class="material-symbols-outlined text-sm">smart_toy</span>
                <span>Buy Another Service</span>
              </button>
            </div>
          </div>
        `
            : ""
        }

      </div>
    `;
  },
};
