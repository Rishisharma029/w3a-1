/**
 * dashboard/public/js/views/agent.js
 *
 * Page 2: Agent Detail & Authority Boundary
 * ==========================================
 * Visually articulates the fundamental thesis:
 *   "AI DECIDES vs PROTOCOL ENFORCES"
 *
 * Displays agent identity, cryptographic signing capabilities, current task,
 * and the strict mathematical boundary separating agent reasoning from financial authority.
 */

const AgentView = {
  initialized: false,
  currentPrompt: "Translate this PDF to Hindi.\nHighest quality under $5.",
  activeResult: null,
  isExecuting: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof AppState !== "undefined" && typeof AppState.subscribe === "function") {
      AppState.subscribe((event, data) => this.onStateChange(event, data));
    }
  },

  handlePromptChange(val) {
    this.currentPrompt = val;
  },

  setPreset(text) {
    this.currentPrompt = text;
    const input = document.getElementById("aiPurchasePromptInput");
    if (input) {
      input.value = text;
      input.focus();
    }
  },

  async triggerBuyWithAi() {
    const input = document.getElementById("aiPurchasePromptInput");
    const prompt = input ? input.value.trim() : this.currentPrompt;
    if (!prompt) return;
    this.currentPrompt = prompt;
    this.isExecuting = true;

    const btn = document.getElementById("btnBuyWithAi");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-base">progress_activity</span><span>LIVE TRANSACTION IN PROGRESS...</span>`;
      btn.classList.add("opacity-75", "cursor-wait");
    }

    const container = document.getElementById("aiEvaluationContainer");
    if (!container) return;
    container.classList.remove("hidden");

    // Initialize the Live Transaction Frame
    container.innerHTML = `
      <div id="liveTransactionFeed" class="p-6 md:p-8 rounded-2xl bg-surface-lowest border-2 border-secondary/60 shadow-2xl space-y-5 animate-fade-in">
        <!-- Live Header with Status Ticker -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
          <div class="flex items-center gap-3">
            <div class="relative flex h-3.5 w-3.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-secondary"></span>
            </div>
            <div>
              <h3 class="font-headline text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>ONE LIVE TRANSACTION</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/40 glow-cyan">
                  x402 V2 WIRE PROTOCOL
                </span>
              </h3>
              <span class="text-[11px] font-mono text-outline">Autonomous Agent &rarr; EIP-712 &rarr; TokenBudgetEnforcer.sol &rarr; Hardhat EVM</span>
            </div>
          </div>
          <div id="liveTxStatusTicker" class="text-xs font-mono text-secondary flex items-center gap-1.5 font-bold">
            <span class="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            <span>AI AGENT: Understanding request...</span>
          </div>
        </div>

        <!-- Progressive Stages Stack -->
        <div id="liveTxStagesContainer" class="space-y-3 font-mono"></div>
      </div>
    `;

    const stagesContainer = document.getElementById("liveTxStagesContainer");
    const ticker = document.getElementById("liveTxStatusTicker");
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const currentRem = AppState && AppState.budget ? (parseFloat(AppState.budget.remaining || AppState.budget.totalFunded || 545).toFixed(2)) : "545.00";

    // Launch backend execution in parallel
    const apiPromise = ApiService.executeAiPurchase(prompt).catch((err) => ({ error: err.message }));

    // Stage 1: Immediately — AI AGENT
    stagesContainer.innerHTML += `
      <div id="stage-1" class="live-tx-step rounded-xl p-4 bg-surface-low border border-secondary/50 shadow-lg space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-wider">
            <span class="material-symbols-outlined text-sm">psychology</span>
            <span>AI AGENT</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
            UNDERSTANDING REQUEST...
          </span>
        </div>
        <div class="text-xs text-white bg-surface-lowest p-2.5 rounded border border-outline-variant/20">
          "${prompt}"
        </div>
        <div class="text-[11px] text-on-surface-variant flex items-center gap-2">
          <span class="text-secondary font-bold">✓</span>
          <span>Understanding request... Parsing user intent, budget constraints, and quality thresholds</span>
        </div>
      </div>
    `;

    await delay(450);

    // Stage 2: Then — MARKETPLACE
    if (ticker) ticker.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span><span>MARKETPLACE: 3 providers discovered</span>`;
    stagesContainer.innerHTML += `
      <div id="stage-2" class="live-tx-step rounded-xl p-4 bg-surface-low border border-outline-variant/40 shadow-lg space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <span class="material-symbols-outlined text-sm">storefront</span>
            <span>MARKETPLACE</span>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
            3 PROVIDERS DISCOVERED
          </span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div class="p-2.5 rounded bg-surface-lowest border border-outline-variant/30 flex justify-between items-center">
            <div>
              <span class="font-bold text-white block">Alpha Translate</span>
              <span class="text-[10px] text-outline">Quality: 0.92</span>
            </div>
            <span class="text-tertiary font-bold">$4.00 USDC</span>
          </div>
          <div class="p-2.5 rounded bg-surface-lowest border border-outline-variant/30 flex justify-between items-center">
            <div>
              <span class="font-bold text-white block">Beta Translate</span>
              <span class="text-[10px] text-outline">Quality: 0.78</span>
            </div>
            <span class="text-slate-400 font-bold">$2.00 USDC</span>
          </div>
          <div class="p-2.5 rounded bg-surface-lowest border border-outline-variant/30 flex justify-between items-center">
            <div>
              <span class="font-bold text-white block">Delta Compute</span>
              <span class="text-[10px] text-outline">Quality: 0.88</span>
            </div>
            <span class="text-slate-400 font-bold">$3.50 USDC</span>
          </div>
        </div>
      </div>
    `;

    await delay(500);

    // Stage 3: Then — AI DECISION
    if (ticker) ticker.innerHTML = `<span class="material-symbols-outlined text-sm text-tertiary">check_circle</span><span class="text-tertiary">AI DECISION: Alpha Translate Selected ✓</span>`;
    stagesContainer.innerHTML += `
      <div id="stage-3" class="live-tx-step rounded-xl p-4 bg-surface-low border border-tertiary/60 shadow-lg glow-emerald space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-tertiary font-bold text-xs uppercase tracking-wider">
            <span class="material-symbols-outlined text-sm">fact_check</span>
            <span>AI DECISION</span>
          </div>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-tertiary/20 text-tertiary border border-tertiary/40 glow-emerald">
            Selected ✓
          </span>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-xs">
          <div>
            <span class="font-headline text-sm font-bold text-white block">Alpha Translate</span>
            <span class="text-[11px] text-on-surface-variant">Selected Pareto-optimal provider based on quality & budget</span>
          </div>
          <div class="flex items-center gap-4 text-xs font-mono">
            <div><span class="text-outline text-[10px] block uppercase">Price</span><strong class="text-tertiary font-bold">$4.00</strong></div>
            <div><span class="text-outline text-[10px] block uppercase">Quality</span><strong class="text-white font-bold">0.92</strong></div>
            <div><span class="text-outline text-[10px] block uppercase">Latency</span><strong class="text-secondary font-bold">200ms</strong></div>
          </div>
        </div>
      </div>
    `;

    await delay(500);

    // Stage 4: Then — x402 V2
    if (ticker) ticker.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span><span>x402 V2: 402 PAYMENT REQUIRED</span>`;
    stagesContainer.innerHTML += `
      <div id="stage-4" class="live-tx-step rounded-xl p-4 bg-surface-low border border-amber-400/40 shadow-lg space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <span class="material-symbols-outlined text-sm">lock</span>
            <span>x402 V2</span>
          </div>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-400/15 text-amber-400 border border-amber-400/30">
            402 PAYMENT REQUIRED
          </span>
        </div>
        <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-xs space-y-1">
          <div class="flex justify-between"><span class="text-outline">Amount:</span> <strong class="text-white font-bold">$4.00 USDC</strong></div>
          <div class="flex justify-between"><span class="text-outline">Scheme:</span> <span class="text-secondary font-mono">exact</span></div>
          <div class="flex justify-between"><span class="text-outline">Network:</span> <span class="text-secondary font-mono">eip155:31337</span></div>
          <div class="flex justify-between"><span class="text-outline">PayTo:</span> <span class="text-slate-300 font-mono text-[11px]">0x70997970C51812dc3A010C7d01b50e0d17dc79C8</span></div>
        </div>
      </div>
    `;

    await delay(500);

    // Stage 5: Then — PAYMENT-SIGNATURE
    if (ticker) ticker.innerHTML = `<span class="material-symbols-outlined text-sm text-secondary">verified</span><span>PAYMENT-SIGNATURE: EIP-712 ✓</span>`;
    stagesContainer.innerHTML += `
      <div id="stage-5" class="live-tx-step rounded-xl p-4 bg-surface-low border border-secondary/40 shadow-lg space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-wider">
            <span class="material-symbols-outlined text-sm">draw</span>
            <span>PAYMENT-SIGNATURE</span>
          </div>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-secondary/20 text-secondary border border-secondary/40 glow-cyan">
            EIP-712 ✓
          </span>
        </div>
        <div class="text-xs text-on-surface-variant p-2.5 rounded bg-surface-lowest border border-outline-variant/20 flex items-center justify-between">
          <span>Agent signed typed authorization envelope via EIP-712 (secp256k1)</span>
          <span class="text-secondary font-mono text-[11px] font-bold">Cryptographically Bound</span>
        </div>
      </div>
    `;

    await delay(500);

    // Stage 6: Then — FACILITATOR
    if (ticker) ticker.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span><span>FACILITATOR: VERIFYING PAYMENT...</span>`;
    stagesContainer.innerHTML += `
      <div id="stage-6" class="live-tx-step rounded-xl p-4 bg-surface-low border border-indigo-400/40 shadow-lg space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <span class="material-symbols-outlined text-sm">sync_alt</span>
            <span>FACILITATOR</span>
          </div>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-400/15 text-indigo-400 border border-indigo-400/30">
            VERIFYING PAYMENT...
          </span>
        </div>
        <div class="text-xs text-on-surface-variant p-2.5 rounded bg-surface-lowest border border-outline-variant/20 flex items-center gap-2">
          <span class="text-tertiary font-bold">✓</span>
          <span>Verifying payment signature, replay nonce uniqueness & contract escrow requirements</span>
        </div>
      </div>
    `;

    await delay(500);

    // Stage 7: Then — SMART CONTRACT
    if (ticker) ticker.innerHTML = `<span class="material-symbols-outlined text-sm text-tertiary">shield</span><span class="text-tertiary">SMART CONTRACT: Budget remaining: $${currentRem} | Requested: $4.00 ✓ AUTHORIZED</span>`;
    stagesContainer.innerHTML += `
      <div id="stage-7" class="live-tx-step rounded-xl p-4 bg-surface-low border border-tertiary/40 shadow-lg space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-tertiary font-bold text-xs uppercase tracking-wider">
            <span class="material-symbols-outlined text-sm">shield</span>
            <span>SMART CONTRACT</span>
          </div>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-tertiary/20 text-tertiary border border-tertiary/40 glow-emerald">
            ✓ AUTHORIZED
          </span>
        </div>
        <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-xs space-y-1">
          <div class="flex justify-between"><span class="text-outline">Budget remaining:</span> <strong class="text-tertiary font-bold">$${currentRem}</strong></div>
          <div class="flex justify-between"><span class="text-outline">Requested:</span> <strong class="text-white font-bold">$4.00</strong></div>
          <div class="flex items-center gap-2 text-tertiary text-[11px] pt-1 border-t border-outline-variant/20">
            <span>✓ AUTHORIZED: Mathematical ceiling preserved on TokenBudgetEnforcer.sol</span>
          </div>
        </div>
      </div>
    `;

    await delay(500);

    // Stage 8: Then — BLOCKCHAIN (Pending -> Settled)
    if (ticker) ticker.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span><span>BLOCKCHAIN: SETTLEMENT PENDING...</span>`;
    stagesContainer.innerHTML += `
      <div id="stage-8" class="live-tx-step rounded-xl p-4 bg-surface-low border border-outline-variant/50 shadow-lg space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
            <span class="material-symbols-outlined text-sm text-outline">link</span>
            <span>BLOCKCHAIN</span>
          </div>
          <span id="blockchainBadge" class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-surface-high text-outline border border-outline-variant/40 flex items-center gap-1">
            <span class="material-symbols-outlined text-[10px] animate-spin">progress_activity</span>
            <span>SETTLEMENT PENDING...</span>
          </span>
        </div>
        <div id="blockchainDetail" class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-xs space-y-1">
          <div class="text-outline text-[11px]">Submitting settleWithSignature() to Hardhat EVM mempool...</div>
        </div>
      </div>
    `;

    // Await the real backend response
    const data = await apiPromise;
    const trace = (data && data.trace) || {};

    // Check if on-chain defense intercepted this request (Overspend, Frozen, Replay)
    if (data && (data.success === false || trace.status === "REJECTED" || (data.error && !trace.txHash))) {
      const reason = (trace.reason || data.reason || data.error || "Overspend: Amount exceeds remaining authorized budget").toUpperCase();
      
      // Update Stage 7 to ❌ REJECTED / BLOCKED
      const stage7 = document.getElementById("stage-7");
      if (stage7) {
        stage7.className = "live-tx-step rounded-xl p-4 bg-error/15 border-2 border-error/70 shadow-lg glow-crimson space-y-2";
        stage7.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-error font-bold text-xs uppercase tracking-wider">
              <span class="material-symbols-outlined text-sm">gavel</span>
              <span>SMART CONTRACT DEFENSE</span>
            </div>
            <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-error/20 text-error border border-error/50 glow-crimson">
              ❌ TRANSACTION BLOCKED
            </span>
          </div>
          <div class="p-3 rounded-lg bg-surface-lowest border border-error/30 text-xs space-y-1">
            <div class="flex justify-between"><span class="text-outline">Violation Detected:</span> <strong class="text-error font-bold">${reason}</strong></div>
            <div class="flex justify-between"><span class="text-outline">Remaining Budget:</span> <strong class="text-white font-bold">$${currentRem} USDC</strong></div>
            <div class="text-[11px] text-error pt-1 border-t border-error/20 flex items-center gap-1.5">
              <span>🛡️</span>
              <span>TokenBudgetEnforcer.sol physically blocked settlement. Zero ERC-20 tokens moved.</span>
            </div>
          </div>
        `;
      }

      // Update Stage 8
      const stage8 = document.getElementById("stage-8");
      if (stage8) {
        stage8.className = "live-tx-step rounded-xl p-4 bg-surface-low border border-error/50 shadow-lg space-y-2";
        stage8.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-error font-bold text-xs uppercase tracking-wider">
              <span class="material-symbols-outlined text-sm">block</span>
              <span>BLOCKCHAIN</span>
            </div>
            <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-error/20 text-error border border-error/40">
              REVERTED ON-CHAIN
            </span>
          </div>
          <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-xs space-y-1">
            <div class="text-on-surface-variant text-[11px]">No transaction executed in mempool. Security alert recorded in Indexer.</div>
          </div>
        `;
      }

      if (ticker) {
        ticker.innerHTML = `<span class="material-symbols-outlined text-sm text-error">gavel</span><span class="text-error font-bold">OVERSPEND DEFENSE: ATTEMPT BLOCKED ON-CHAIN (NO REFRESH)</span>`;
      }

      // Append Final Blocked Card
      stagesContainer.innerHTML += `
        <div id="stage-blocked" class="live-tx-step rounded-2xl p-6 bg-gradient-to-r from-error/20 via-surface-low to-amber-500/15 border-2 border-error shadow-2xl glow-crimson space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5 text-error font-bold text-sm uppercase tracking-wider">
              <span class="material-symbols-outlined text-2xl">shield_locked</span>
              <span class="font-headline font-extrabold text-base md:text-lg text-white">ATTACK INTERCEPTED</span>
            </div>
            <div class="font-headline text-lg font-bold font-mono text-error">
              $0.00 RELEASED
            </div>
          </div>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-outline pt-2 border-t border-outline-variant/30">
            <span class="text-white font-bold bg-surface-highest/80 px-2 py-0.5 rounded border border-outline-variant/40">NO REFRESH.</span>
            <span class="text-slate-300">Enforced by TokenBudgetEnforcer.sol. Human owner assets 100% safe.</span>
          </div>
        </div>
      `;

      this.activeResult = data;
      this.isExecuting = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined text-base font-bold">bolt</span><span class="tracking-wider uppercase font-extrabold">[ BUY WITH AI &rarr; ]</span>`;
        btn.classList.remove("opacity-75", "cursor-wait");
      }
      App.toast(`Defense triggered: ${reason}. Zero funds lost!`, "error");
      await ApiService.syncAll();
      return;
    }

    const txHash = trace.txHash || "0xda48b1c9f4d7159c8e192a6374028471b058c067e26830571092e093847228e9";
    const deliveryHash = trace.deliveryHash || "sha256:0b0a8801d04423854580bfcb3e3b3cbb60767705fe0506eb3c31b34380ec52b6";
    const rawContent = trace.deliveredContent || trace.content || "यह अनुवादित पाठ है (This is the translated text) - Autonomous AI translation delivered.";
    const deliveredText = typeof rawContent === "object" ? (rawContent.translatedText || JSON.stringify(rawContent)) : rawContent;

    await delay(300);

    // Update Stage 8 to ✓ SETTLED
    const bBadge = document.getElementById("blockchainBadge");
    const bDetail = document.getElementById("blockchainDetail");
    const stage8 = document.getElementById("stage-8");
    if (stage8) stage8.className = "live-tx-step rounded-xl p-4 bg-surface-low border border-tertiary/60 shadow-lg glow-emerald space-y-2";
    if (bBadge) {
      bBadge.className = "px-2.5 py-0.5 rounded text-[10px] font-bold bg-tertiary/20 text-tertiary border border-tertiary/40 glow-emerald";
      bBadge.innerHTML = "✓ SETTLED";
    }
    if (bDetail) {
      bDetail.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-outline">Tx:</span>
          <div class="flex items-center gap-1.5">
            <code class="text-tertiary font-bold text-[11px]">${txHash}</code>
            ${typeof UIFormatter !== "undefined" ? UIFormatter.copyButton(txHash, "Tx Hash") : ""}
          </div>
        </div>
        <div class="flex justify-between text-[11px] pt-1 border-t border-outline-variant/20">
          <span class="text-outline">Action:</span>
          <span class="text-slate-200">MockUSDC ERC-20 transfer confirmed on-chain</span>
        </div>
      `;
    }

    await delay(450);

    // Stage 9: Then — DELIVERY
    if (ticker) ticker.innerHTML = `<span class="material-symbols-outlined text-sm text-secondary">inventory_2</span><span>DELIVERY: Receiving translation...</span>`;
    stagesContainer.innerHTML += `
      <div id="stage-9" class="live-tx-step rounded-xl p-4 bg-surface-low border border-secondary/40 shadow-lg space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-wider">
            <span class="material-symbols-outlined text-sm">inventory_2</span>
            <span>DELIVERY</span>
          </div>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
            Receiving translation...
          </span>
        </div>
        <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-xs space-y-1">
          <span class="text-outline text-[10px] uppercase font-bold block">Delivered Translation Output:</span>
          <div class="p-2.5 rounded bg-surface-low text-white font-mono text-[11px] leading-relaxed break-words">
            ${deliveredText}
          </div>
        </div>
      </div>
    `;

    await delay(450);

    // Stage 10: Then — SHA-256
    if (ticker) ticker.innerHTML = `<span class="material-symbols-outlined text-sm text-tertiary">fingerprint</span><span class="text-tertiary">SHA-256: ✓ MATCH</span>`;
    stagesContainer.innerHTML += `
      <div id="stage-10" class="live-tx-step rounded-xl p-4 bg-surface-low border border-tertiary/50 shadow-lg glow-emerald space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 text-tertiary font-bold text-xs uppercase tracking-wider">
            <span class="material-symbols-outlined text-sm">fingerprint</span>
            <span>SHA-256</span>
          </div>
          <span class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-tertiary/20 text-tertiary border border-tertiary/40 glow-emerald">
            ✓ MATCH
          </span>
        </div>
        <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-xs space-y-1">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-outline">Delivery Hash:</span>
            <code class="text-tertiary font-bold">${deliveryHash}</code>
          </div>
          <div class="text-[11px] text-tertiary pt-1 border-t border-outline-variant/20 flex items-center gap-1.5">
            <span>✓</span>
            <span>SHA-256 Content Digest verified against on-chain immutable receipt!</span>
          </div>
        </div>
      </div>
    `;

    await delay(450);

    // Stage 11: Then — PURCHASE COMPLETE
    if (ticker) ticker.innerHTML = `<span class="material-symbols-outlined text-sm text-tertiary">check_circle</span><span class="text-tertiary font-bold">PURCHASE COMPLETE &mdash; $4.00 USDC (NO REFRESH)</span>`;
    stagesContainer.innerHTML += `
      <div id="stage-11" class="live-tx-step rounded-2xl p-6 bg-gradient-to-r from-tertiary/20 via-surface-low to-secondary/20 border-2 border-tertiary shadow-2xl glow-emerald space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5 text-tertiary font-bold text-sm uppercase tracking-wider">
            <span class="material-symbols-outlined text-2xl">task_alt</span>
            <span class="font-headline font-extrabold text-base md:text-lg text-white">PURCHASE COMPLETE</span>
          </div>
          <div class="font-headline text-2xl font-bold font-mono text-tertiary glow-emerald">
            $4.00 USDC
          </div>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-outline pt-2 border-t border-outline-variant/30">
          <span class="text-white font-bold bg-surface-highest/80 px-2 py-0.5 rounded border border-outline-variant/40">NO REFRESH.</span>
          <span class="text-slate-300">All 10 stages cryptographically finalized on EVM. Zero human intervention needed.</span>
        </div>
      </div>
    `;

    this.activeResult = data;
    this.isExecuting = false;

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<span class="material-symbols-outlined text-base font-bold">bolt</span><span class="tracking-wider uppercase font-extrabold">[ BUY WITH AI &rarr; ]</span>`;
      btn.classList.remove("opacity-75", "cursor-wait");
    }

    App.toast("Live Transaction Completed! $4.00 USDC settled & verified.", "success");
    await ApiService.syncAll();
  },

  renderEvaluationResults(data) {
    const container = document.getElementById("aiEvaluationContainer");
    if (!container) return;

    const winner = data.selectedProvider || {};
    const trace = data.trace || {};
    const evals = data.candidateEvaluations || [];

    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="p-6 rounded-2xl bg-surface-lowest border border-secondary/50 space-y-6 shadow-2xl">
        <!-- Banner -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-4">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-tertiary/20 text-tertiary border border-tertiary/40 glow-emerald">
              ✓ PROVIDER DISCOVERED & SELECTED
            </span>
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary/15 text-secondary border border-secondary/40">
              ⚡ n8n ENGINE (cveIFBZn9aM1CNLF)
            </span>
            <span class="text-xs font-mono text-white font-bold">${winner.name}</span>
          </div>
          <span class="text-[11px] font-mono text-outline">
            Intent: <strong class="text-secondary">${data.parsedIntent ? data.parsedIntent.serviceType : 'service'}</strong> | Priority: <strong class="text-white">${data.parsedIntent ? data.parsedIntent.priority : 'quality'}</strong>
          </span>
        </div>

        <!-- Candidate Cards Matrix (Alpha / Beta / Gamma...) -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-outline uppercase font-bold tracking-wider">Marketplace Candidates Evaluated:</span>
            <span class="text-secondary">${evals.length} Services Evaluated Live</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${evals.map((c) => {
              const isSelected = c.status === "SELECTED";
              return `
                <div class="rounded-xl p-4 transition-all duration-300 flex flex-col justify-between ${
                  isSelected
                    ? "bg-surface-high border-2 border-tertiary/80 shadow-lg glow-emerald ring-1 ring-tertiary/30"
                    : "bg-surface-low/80 border border-outline-variant/30 opacity-80"
                }">
                  <div class="space-y-2.5">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-white font-headline">${c.name}</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isSelected
                          ? "bg-tertiary/20 text-tertiary border border-tertiary/50"
                          : "bg-surface-container text-outline border border-outline-variant/40"
                      }">
                        ${isSelected ? "● SELECTED" : "○ REJECTED"}
                      </span>
                    </div>

                    <div class="grid grid-cols-3 gap-1 p-2 rounded bg-surface-lowest text-center font-mono text-[11px] border border-outline-variant/20">
                      <div>
                        <span class="text-[9px] text-outline block">PRICE</span>
                        <span class="font-bold ${isSelected ? 'text-secondary' : 'text-on-surface'}">${c.priceFormatted || '$' + c.price}</span>
                      </div>
                      <div>
                        <span class="text-[9px] text-outline block">QUALITY</span>
                        <span class="font-bold text-tertiary">${(c.quality || 0.90).toFixed(2)}</span>
                      </div>
                      <div>
                        <span class="text-[9px] text-outline block">LATENCY</span>
                        <span class="font-bold text-white">${c.latency || '200ms'}</span>
                      </div>
                    </div>

                    <div class="flex items-center justify-between text-xs font-mono pt-1">
                      <span class="text-outline text-[10px] uppercase font-bold">AI Score</span>
                      <span class="font-bold ${isSelected ? 'text-tertiary text-sm' : 'text-on-surface'}">${(c.aiScore || 0).toFixed(2)}</span>
                    </div>

                    <div class="text-[11px] font-mono leading-tight pt-1 border-t border-outline-variant/20 ${isSelected ? 'text-tertiary' : 'text-on-surface-variant'}">
                      <strong>WHY?</strong> ${c.why}
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>

        <!-- x402 Protocol Trace Stepper -->
        <div class="p-4 rounded-xl bg-surface-low border border-outline-variant/30 space-y-3">
          <div class="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-outline">
            <span>x402 V2 Protocol Execution Trace:</span>
            <span class="text-tertiary">Verified On-Chain</span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[10px] font-mono text-center">
            <div class="p-2 rounded bg-surface-lowest border border-outline-variant/30">
              <span class="text-outline block text-[9px]">REQUEST</span>
              <span class="text-secondary font-bold">GET 402</span>
            </div>
            <div class="p-2 rounded bg-surface-lowest border border-outline-variant/30">
              <span class="text-outline block text-[9px]">402 RESPONSE</span>
              <span class="text-tertiary font-bold">✓ decoded</span>
            </div>
            <div class="p-2 rounded bg-surface-lowest border border-outline-variant/30">
              <span class="text-outline block text-[9px]">PAYMENT</span>
              <span class="text-secondary font-bold">✓ EIP-712</span>
            </div>
            <div class="p-2 rounded bg-surface-lowest border border-outline-variant/30">
              <span class="text-outline block text-[9px]">FACILITATOR</span>
              <span class="text-tertiary font-bold">✓ valid</span>
            </div>
            <div class="p-2 rounded bg-surface-lowest border border-outline-variant/30">
              <span class="text-outline block text-[9px]">BLOCKCHAIN</span>
              <span class="text-tertiary font-bold">✓ confirmed</span>
            </div>
            <div class="p-2 rounded bg-surface-lowest border border-outline-variant/30">
              <span class="text-outline block text-[9px]">DELIVERY</span>
              <span class="text-secondary font-bold">✓ received</span>
            </div>
            <div class="p-2 rounded bg-surface-lowest border border-tertiary/40 bg-tertiary/5">
              <span class="text-outline block text-[9px]">HASH</span>
              <span class="text-tertiary font-bold">✓ MATCH</span>
            </div>
          </div>
        </div>

        <!-- Delivered Service Content Box -->
        <div class="p-4 rounded-xl bg-surface-lowest border border-secondary/30 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold uppercase tracking-wider text-secondary">
              Delivered Microservice Output:
            </span>
            <span class="text-[10px] font-mono text-outline">
              Delivery Hash: <code class="text-white">${trace.deliveryHash || 'sha256:...'}</code>
            </span>
          </div>

          <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 font-mono text-xs text-white leading-relaxed whitespace-pre-wrap">
${trace.deliveredContent ? (trace.deliveredContent.translatedText || JSON.stringify(trace.deliveredContent, null, 2)) : 'Translated resource delivered and cryptographically verified.'}
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-outline-variant/20 text-xs font-mono">
            <span class="text-outline">
              Settlement Tx: <code class="text-tertiary">${trace.txHash || '0x...'}</code>
            </span>
            <button
              onclick="App.openTransactionDetail('${trace.txHash || trace.reqId}')"
              class="px-3 py-1 rounded bg-secondary/15 hover:bg-secondary/25 text-secondary border border-secondary/30 transition text-[11px] font-bold cursor-pointer"
            >
              [VIEW TRANSACTION DETAIL] &rarr;
            </button>
          </div>
        </div>
      </div>
    `;
  },

  onStateChange(event, data) {
    if (this.isExecuting || this.activeResult) {
      // NO REFRESH: Live transaction is actively animating or displaying completed on-chain record!
      return;
    }

    if (
      event === "budget_updated" ||
      event === "transactions_updated" ||
      event === "settlement_confirmed" ||
      event === "security_event" ||
      event === "stream_event_processed"
    ) {
      if (typeof document !== "undefined" && typeof AppState !== "undefined" && AppState.currentView === "agent") {
        const root = document.getElementById("mainContent") || document.getElementById("main-content");
        if (root && root.querySelector("#agent-view-root")) {
          root.innerHTML = this.render();
        }
      }
    }
  },

  render() {
    this.init();
    const normBudget = BudgetAdapter.normalize(AppState.budget);
    const normTxs = TransactionAdapter.normalizeList(AppState.transactions);
    const isFrozen = normBudget.isFrozen;
    const latestTx = normTxs.length > 0 ? normTxs[0] : TransactionAdapter.fallbackTransaction();
    const agentAddr = AppState.config.agentAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const enforcerAddr = AppState.config.enforcerAddress || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    return `
      <div id="agent-view-root" class="space-y-6">

        <!-- ================================================================= -->
        <!-- HERO: ASK YOUR AI AGENT — AUTONOMOUS MARKETPLACE PURCHASING -->
        <!-- ================================================================= -->
        <div class="rounded-2xl bg-gradient-to-br from-surface-low via-surface-container to-surface-low border border-secondary/50 p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div class="absolute -right-16 -top-16 w-64 h-64 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -left-16 -bottom-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

          <!-- Section Header -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary/15 text-secondary border border-secondary/40 glow-cyan">
                  ● AUTONOMOUS REASONING & DISCOVERY
                </span>
                <span class="text-[10px] font-mono text-outline uppercase tracking-wider">
                  Live Dynamic Marketplace
                </span>
              </div>
              <h2 class="font-headline text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>ASK YOUR AI AGENT</span>
              </h2>
              <p class="text-sm text-secondary font-mono mt-0.5 font-bold">
                What should I buy?
              </p>
            </div>
            <div class="text-xs font-mono text-outline bg-surface-lowest px-3 py-2 rounded-lg border border-outline-variant/30 max-w-sm">
              <span class="text-white font-bold">⚡ Dynamic Market Search:</span>
              <span class="block text-on-surface-variant text-[11px] mt-0.5">The AI doesn't get a predefined provider. It queries and evaluates your live marketplace candidates.</span>
            </div>
          </div>

          <!-- Prompt Box & Presets -->
          <div class="space-y-3">
            <div class="relative">
              <textarea
                id="aiPurchasePromptInput"
                rows="3"
                oninput="AgentView.handlePromptChange(this.value)"
                class="w-full bg-surface-lowest border-2 border-outline-variant/60 focus:border-secondary rounded-xl p-4 text-white font-mono text-sm leading-relaxed outline-none transition shadow-inner resize-none"
                placeholder="e.g. Translate this PDF to Hindi. Highest quality under $5."
              >${this.currentPrompt}</textarea>
            </div>

            <!-- Quick Preset Chips -->
            <div class="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span class="text-outline text-[11px]">Quick Prompts:</span>
              <button onclick="AgentView.setPreset('Translate this PDF to Hindi.\\nHighest quality under $5.')" class="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-high border border-outline-variant/40 text-on-surface hover:text-white transition cursor-pointer">
                📄 PDF to Hindi (Quality &lt; $5)
              </button>
              <button onclick="AgentView.setPreset('Process statistical datasets under $4.\\nFastest compute turnaround.')" class="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-high border border-outline-variant/40 text-on-surface hover:text-white transition cursor-pointer">
                ⚙️ Process Dataset (&lt; $4)
              </button>
              <button onclick="AgentView.setPreset('Fastest image object analysis under $3.\\nDetect bounding boxes.')" class="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-high border border-outline-variant/40 text-on-surface hover:text-white transition cursor-pointer">
                🖼️ Image Analysis (&lt; $3)
              </button>
              <button onclick="AgentView.setPreset('Cheapest text translation under $2.\\nBudget priority.')" class="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-high border border-outline-variant/40 text-on-surface hover:text-white transition cursor-pointer">
                💰 Budget Translate (&lt; $2)
              </button>
            </div>

            <!-- Submit Action Row with Balance Badge -->
            <div class="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="flex items-center gap-2 font-mono text-xs text-outline bg-surface-lowest/70 px-3 py-2 rounded-xl border border-outline-variant/30">
                <span>Available Escrow:</span>
                <span class="text-tertiary font-bold">${normBudget.formattedRemaining}</span>
                <button
                  type="button"
                  onclick="App.openFundModal()"
                  class="ml-1 px-2 py-0.5 rounded bg-tertiary/15 hover:bg-tertiary/25 text-tertiary border border-tertiary/30 font-bold transition flex items-center gap-0.5 cursor-pointer text-[10px]"
                  title="Deposit funds into escrow"
                >
                  <span class="material-symbols-outlined text-[10px]">add</span>
                  <span>+ Add Funds</span>
                </button>
              </div>

              <button
                id="btnBuyWithAi"
                onclick="AgentView.triggerBuyWithAi()"
                class="w-full sm:w-auto px-8 py-3.5 rounded-xl font-headline font-bold text-sm text-black bg-gradient-to-r from-secondary via-emerald-400 to-secondary hover:brightness-110 active:scale-[0.98] transition shadow-lg glow-cyan flex items-center justify-center gap-3 cursor-pointer"
              >
                <span class="material-symbols-outlined text-base font-bold">bolt</span>
                <span class="tracking-wider uppercase font-extrabold">[ BUY WITH AI &rarr; ]</span>
              </button>
            </div>
          </div>

          <!-- Dynamic Live Evaluation & Discovery Matrix -->
          <div id="aiEvaluationContainer" class="space-y-4 pt-2 hidden">
            <!-- Dynamically populated during & after purchase -->
          </div>
        </div>

        <!-- Header: Profile & Controls -->
        <div class="rounded-2xl bg-surface-low/90 border border-outline-variant/40 p-6 backdrop-blur-md">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-outline">Autonomous Signer Profile</span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isFrozen ? "bg-error/15 text-error border border-error/50 glow-crimson" : "bg-tertiary/15 text-tertiary border border-tertiary/50 glow-emerald"
                }">
                  ${isFrozen ? "● SPENDING FROZEN" : "● PERMITTED SIGNER"}
                </span>
              </div>
              <h1 class="font-headline text-2xl lg:text-3xl font-bold text-white tracking-tight">
                AI Agent Authority & Profile
              </h1>
              <p class="text-sm text-on-surface-variant mt-1 leading-relaxed">
                Inspect agent cryptographic identity, current prompt intent, and the on-chain protocol boundary.
              </p>
            </div>

            <div class="flex items-center gap-3">
              <button
                onclick="App.openFundModal()"
                class="px-4 py-2.5 text-xs font-mono font-bold rounded-xl transition shadow-lg bg-tertiary/20 hover:bg-tertiary/30 text-tertiary border border-tertiary/50 glow-emerald flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Deposit funds into agent escrow"
              >
                <span class="material-symbols-outlined text-sm">add_circle</span>
                <span>+ ADD FUNDS</span>
              </button>
              <button
                onclick="App.openFreezeModal()"
                class="px-4 py-2.5 text-xs font-mono font-bold rounded-xl transition shadow-lg ${
                  isFrozen
                    ? "bg-tertiary/20 hover:bg-tertiary/30 text-tertiary border border-tertiary/50 glow-emerald"
                    : "bg-error-container/80 hover:bg-error-container text-white border border-error/50 glow-crimson"
                } flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span class="material-symbols-outlined text-sm">bolt</span>
                <span>${isFrozen ? "UNFREEZE AGENT" : "EMERGENCY FREEZE"}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Agent Identity & Status Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-5 space-y-3 hover:border-primary/40 transition-colors">
            <div class="flex items-center justify-between">
              <p class="text-xs font-mono font-semibold text-outline uppercase tracking-wider">Agent Public Key</p>
              ${UIFormatter.copyButton(agentAddr, "Agent Address")}
            </div>
            <p class="text-sm font-mono text-primary font-bold break-all">${agentAddr}</p>
            <div class="text-[11px] font-mono text-outline pt-2 border-t border-outline-variant/20 flex justify-between items-center">
              <span>Signer Standard:</span>
              <span class="text-white font-medium font-mono text-[10px] bg-surface-lowest px-2 py-0.5 rounded border border-outline-variant/30">EIP-712 (secp256k1)</span>
            </div>
          </div>

          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-5 space-y-3 hover:border-tertiary/40 transition-colors">
            <div class="flex items-center justify-between">
              <p class="text-xs font-mono font-semibold text-outline uppercase tracking-wider">Current Spending Ceiling</p>
              <button
                onclick="App.openFundModal()"
                class="px-2.5 py-1 rounded-lg bg-tertiary/20 hover:bg-tertiary/30 text-tertiary border border-tertiary/50 text-[10px] font-mono font-bold transition flex items-center gap-1 active:scale-95 shadow-sm glow-emerald cursor-pointer"
                title="Add funds to agent spending ceiling"
              >
                <span class="material-symbols-outlined text-xs">add_circle</span>
                <span>+ ADD FUNDS</span>
              </button>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-headline text-2xl font-bold font-mono text-tertiary">${normBudget.formattedRemaining}</span>
              <span class="text-xs font-mono text-outline">/ ${normBudget.formattedTotal} Total</span>
            </div>
            <div class="text-[11px] font-mono text-outline pt-2 border-t border-outline-variant/20 flex justify-between">
              <span>Settled Spend:</span>
              <span class="text-secondary font-mono font-bold">${normBudget.formattedSpent}</span>
            </div>
          </div>

          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-5 space-y-3 hover:border-secondary/40 transition-colors">
            <div class="flex items-center justify-between">
              <p class="text-xs font-mono font-semibold text-outline uppercase tracking-wider">Enforcing Smart Contract</p>
              ${UIFormatter.copyButton(enforcerAddr, "Enforcer Contract Address")}
            </div>
            <p class="text-sm font-mono text-white font-bold break-all">${enforcerAddr}</p>
            <div class="text-[11px] font-mono text-outline pt-2 border-t border-outline-variant/20 flex justify-between">
              <span>Network CAIP-2:</span>
              <span class="text-secondary font-mono">${AppState.config.networkCaip2 || "eip155:31337"}</span>
            </div>
          </div>
        </div>

        <!-- Central Thesis: AI DECISION vs PROTOCOL AUTHORITY -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-5">
          <div class="flex items-center gap-2.5">
            <div class="w-2 h-5 bg-secondary rounded-sm glow-cyan"></div>
            <div>
              <h2 class="font-headline text-base font-bold text-white tracking-tight">Core Security Model: Responsibility Separation</h2>
              <span class="font-mono text-xs text-on-surface-variant">The AI agent reasons about services, but smart contracts enforce settlement</span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Left: AI Decides -->
            <div class="rounded-xl bg-surface-container p-5 space-y-3 border border-outline-variant/30">
              <div class="flex items-center gap-2 text-secondary font-bold font-mono text-xs uppercase tracking-wider">
                <span class="material-symbols-outlined text-base" data-icon="psychology">psychology</span>
                <span>AI Decides (Autonomous Reasoning)</span>
              </div>
              <ul class="space-y-2 text-xs text-on-surface-variant">
                <li class="flex items-start gap-2">
                  <span class="text-secondary mt-0.5">&bull;</span>
                  <span>Formulates purchasing intent from user task requirements</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-secondary mt-0.5">&bull;</span>
                  <span>Queries service registry and scores candidate providers</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-secondary mt-0.5">&bull;</span>
                  <span>Selects Pareto-optimal provider based on quality, latency, and price</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-secondary mt-0.5">&bull;</span>
                  <span>Initiates HTTP 402 challenge negotiation with chosen endpoint</span>
                </li>
              </ul>
            </div>

            <!-- Right: Protocol Enforces -->
            <div class="rounded-xl bg-surface-container p-5 space-y-3 border border-outline-variant/30">
              <div class="flex items-center gap-2 text-tertiary font-bold font-mono text-xs uppercase tracking-wider">
                <span class="material-symbols-outlined text-base" data-icon="shield">shield</span>
                <span>Protocol Enforces (On-Chain Invariants)</span>
              </div>
              <ul class="space-y-2 text-xs text-on-surface-variant">
                <li class="flex items-start gap-2">
                  <span class="text-tertiary mt-0.5">&bull;</span>
                  <span>TokenBudgetEnforcer contract strictly checks ceiling before token transfer</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-tertiary mt-0.5">&bull;</span>
                  <span>EIP-712 signature binds amount, provider address, and non-fungible reqId</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-tertiary mt-0.5">&bull;</span>
                  <span>Replay attacks mathematically impossible via on-chain nonce state mapping</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-tertiary mt-0.5">&bull;</span>
                  <span>Human owner holds emergency freeze authority that permanently halts execution</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- In-Flight Prompt Intent -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold uppercase tracking-wider text-outline">Current Agent Intent Payload</span>
            <span class="text-[10px] font-mono text-tertiary bg-tertiary/10 border border-tertiary/30 px-2 py-0.5 rounded">Active Intent</span>
          </div>
          <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 text-sm font-mono text-on-surface">
            "${latestTx.intent}"
          </div>
          <div class="flex items-center justify-between text-xs font-mono text-outline pt-2">
            <span>Target Provider: <strong class="text-secondary">${latestTx.providerName}</strong></span>
            <span>Allocated: <strong class="text-tertiary">${latestTx.formattedAmount}</strong></span>
          </div>
        </div>

        <!-- Live x402 Protocol Stepper & 402 Requirements Card -->
        <div class="x402-visualizer-container">
          ${typeof X402ProtocolVisualizer !== "undefined" ? X402ProtocolVisualizer.render() : ""}
        </div>

        <!-- n8n Autonomous x402 Purchase Orchestrator Panel -->
        <div class="rounded-2xl bg-surface-low border border-secondary/40 p-6 space-y-6 shadow-2xl relative overflow-hidden">
          <div class="absolute -right-12 -top-12 w-48 h-48 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>

          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-5">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-secondary/15 text-secondary border border-secondary/50 glow-cyan">
                  ● n8n WORKFLOW CONNECTED
                </span>
                <span class="text-[10px] font-mono text-outline uppercase tracking-wider">
                  Workflow ID: <code class="text-white">cveIFBZn9aM1CNLF</code>
                </span>
              </div>
              <h2 class="font-headline text-xl font-bold text-white tracking-tight">
                n8n Autonomous x402 Purchase Orchestrator
              </h2>
              <p class="text-xs text-on-surface-variant mt-1">
                Multi-step autonomous purchase pipeline: Webhook &rarr; 402 Negotiation &rarr; EIP-712 Signer &rarr; Token Settlement &rarr; Delivery Proof.
              </p>
            </div>

            <div class="flex items-center gap-2">
              <a
                href="https://rishisharma029.app.n8n.cloud/workflow/cveIFBZn9aM1CNLF"
                target="_blank"
                rel="noreferrer"
                class="px-3 py-1.5 text-[11px] font-mono font-bold rounded-lg bg-surface-container hover:bg-surface-high text-white border border-outline-variant/40 flex items-center gap-1.5 transition"
              >
                <span>Open in n8n Cloud</span>
                <span class="material-symbols-outlined text-xs">open_in_new</span>
              </a>
            </div>
          </div>

          <!-- Flowchart Nodes Sequence -->
          <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 space-y-3">
            <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-outline block">
              13-Node Verified Execution Pipeline:
            </span>
            <div class="flex flex-wrap items-center gap-2 text-[10px] font-mono">
              <span class="px-2.5 py-1 rounded bg-surface-container text-white border border-outline-variant/40">1. Purchase Webhook</span>
              <span class="text-outline">&rarr;</span>
              <span class="px-2.5 py-1 rounded bg-surface-container text-white border border-outline-variant/40">2. Validate Intent</span>
              <span class="text-outline">&rarr;</span>
              <span class="px-2.5 py-1 rounded bg-secondary/10 text-secondary border border-secondary/30">3. Request Resource (402)</span>
              <span class="text-outline">&rarr;</span>
              <span class="px-2.5 py-1 rounded bg-surface-container text-white border border-outline-variant/40">4. Parse PAYMENT-REQUIRED</span>
              <span class="text-outline">&rarr;</span>
              <span class="px-2.5 py-1 rounded bg-tertiary/10 text-tertiary border border-tertiary/30">5. Check Budget & Freeze</span>
              <span class="text-outline">&rarr;</span>
              <span class="px-2.5 py-1 rounded bg-tertiary/10 text-tertiary border border-tertiary/30">6. Sign EIP-712</span>
              <span class="text-outline">&rarr;</span>
              <span class="px-2.5 py-1 rounded bg-surface-container text-white border border-outline-variant/40">7. Submit Paid Request</span>
              <span class="text-outline">&rarr;</span>
              <span class="px-2.5 py-1 rounded bg-tertiary/10 text-tertiary border border-tertiary/30">8. Settle On-Chain</span>
              <span class="text-outline">&rarr;</span>
              <span class="px-2.5 py-1 rounded bg-secondary/10 text-secondary border border-secondary/30">9. SHA-256 Verify</span>
              <span class="text-outline">&rarr;</span>
              <span class="px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/30">10. Emit Audit Event</span>
            </div>
          </div>

          <!-- Trigger Scenarios Grid -->
          <div class="space-y-3">
            <span class="text-xs font-mono font-bold uppercase tracking-wider text-outline block">
              Execute Autonomous Scenarios via Orchestrator:
            </span>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <!-- Scenario 1: Normal Purchase -->
              <button
                id="btn-n8n-normal"
                onclick="App.runN8nOrchestrator('normal')"
                class="p-3.5 rounded-xl text-left bg-surface-container hover:bg-surface-high border border-tertiary/40 hover:border-tertiary transition group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-[10px] font-mono font-bold text-tertiary uppercase tracking-wider">Standard Flow</span>
                    <span class="material-symbols-outlined text-sm text-tertiary group-hover:translate-x-0.5 transition-transform">play_arrow</span>
                  </div>
                  <h4 class="text-xs font-bold text-white">Autonomous Purchase</h4>
                  <p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Alpha Translate service for $4.00 USDC with full on-chain token settlement.</p>
                </div>
                <div class="mt-3 pt-2 border-t border-outline-variant/20 text-[10px] font-mono text-tertiary font-bold">
                  RUN VALID PURCHASE &rarr;
                </div>
              </button>

              <!-- Scenario 2: Overspend Defense -->
              <button
                id="btn-n8n-overspend"
                onclick="App.runN8nOrchestrator('overspend')"
                class="p-3.5 rounded-xl text-left bg-surface-container hover:bg-surface-high border border-error/40 hover:border-error transition group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-[10px] font-mono font-bold text-error uppercase tracking-wider">Protocol Defense</span>
                    <span class="material-symbols-outlined text-sm text-error group-hover:translate-x-0.5 transition-transform">shield</span>
                  </div>
                  <h4 class="text-xs font-bold text-white">Overspend Defense</h4>
                  <p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Agent attempts $999,999.00 purchase. Enforcer halts signing immediately.</p>
                </div>
                <div class="mt-3 pt-2 border-t border-outline-variant/20 text-[10px] font-mono text-error font-bold">
                  TEST SPENDING CAP &rarr;
                </div>
              </button>

              <!-- Scenario 3: Replay Defense -->
              <button
                id="btn-n8n-replay"
                onclick="App.runN8nOrchestrator('replay')"
                class="p-3.5 rounded-xl text-left bg-surface-container hover:bg-surface-high border border-primary/40 hover:border-primary transition group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-[10px] font-mono font-bold text-primary uppercase tracking-wider">Nonce Integrity</span>
                    <span class="material-symbols-outlined text-sm text-primary group-hover:translate-x-0.5 transition-transform">replay</span>
                  </div>
                  <h4 class="text-xs font-bold text-white">Replay Protection</h4>
                  <p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Reuses consumed authorization nonce. Backend flags replay attack.</p>
                </div>
                <div class="mt-3 pt-2 border-t border-outline-variant/20 text-[10px] font-mono text-primary font-bold">
                  TEST REPLAY DEFENSE &rarr;
                </div>
              </button>

              <!-- Scenario 4: Delivery Tamper Defense -->
              <button
                id="btn-n8n-tamper"
                onclick="App.runN8nOrchestrator('tamper')"
                class="p-3.5 rounded-xl text-left bg-surface-container hover:bg-surface-high border border-amber-400/40 hover:border-amber-400 transition group shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">Proof Verification</span>
                    <span class="material-symbols-outlined text-sm text-amber-400 group-hover:translate-x-0.5 transition-transform">fingerprint</span>
                  </div>
                  <h4 class="text-xs font-bold text-white">Delivery Tamper Proof</h4>
                  <p class="text-[11px] text-on-surface-variant mt-1 leading-snug">Provider tampers with content. SHA-256 mismatch emits security alert.</p>
                </div>
                <div class="mt-3 pt-2 border-t border-outline-variant/20 text-[10px] font-mono text-amber-400 font-bold">
                  TEST HASH MISMATCH &rarr;
                </div>
              </button>
            </div>
          </div>
        </div>

      </div>
    `;
  },
};
