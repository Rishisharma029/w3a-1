const SecurityView = {
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof AppState !== "undefined" && typeof AppState.subscribe === "function") {
      AppState.subscribe((event, data) => this.onStateChange(event, data));
    }
  },

  onStateChange(event, data) {
    if (
      event === "alerts_updated" ||
      event === "security_event" ||
      event === "budget_updated" ||
      event === "stream_event_processed"
    ) {
      if (typeof document !== "undefined" && typeof AppState !== "undefined" && AppState.currentView === "security") {
        const root = document.getElementById("mainContent") || document.getElementById("main-content");
        if (root && root.querySelector("#security-view-root")) {
          root.innerHTML = this.render();
        }
      }
    }
  },

  render() {
    this.init();
    const isFrozen = AppState.budget ? AppState.budget.isFrozen : false;
    const remaining = AppState.budget ? AppState.budget.remaining || "16.00" : "16.00";

    return `
      <div id="security-view-root" class="space-y-6 max-w-5xl mx-auto">

        <!-- ===================================================================
             1. Item 7: SECURITY POSTURE (TOP SECTION)
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 md:p-8 space-y-6 shadow-xl">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 pb-5">
            <div>
              <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-outline block mb-1">Autonomous Agent Guardrails</span>
              <h1 class="font-headline text-2xl md:text-3xl font-bold text-white tracking-tight">SECURITY POSTURE</h1>
            </div>

            <!-- Big Protected Status Badge -->
            <div class="flex items-center gap-2.5">
              <span class="w-3.5 h-3.5 rounded-full bg-tertiary animate-pulse glow-emerald"></span>
              <span class="px-4 py-1.5 rounded-full text-xs font-mono font-extrabold bg-tertiary/15 text-tertiary border border-tertiary/40 glow-emerald">
                PROTECTED
              </span>
            </div>
          </div>

          <!-- 4 Active Guardrails -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono text-xs">
            <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary border border-tertiary/40 flex items-center justify-center font-bold text-xs glow-emerald">✓</span>
              <span class="text-white font-bold">Hard cap active</span>
            </div>
            <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary border border-tertiary/40 flex items-center justify-center font-bold text-xs glow-emerald">✓</span>
              <span class="text-white font-bold">Replay protection active</span>
            </div>
            <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary border border-tertiary/40 flex items-center justify-center font-bold text-xs glow-emerald">✓</span>
              <span class="text-white font-bold">EIP-712 binding active</span>
            </div>
            <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center gap-3">
              <span class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary border border-tertiary/40 flex items-center justify-center font-bold text-xs glow-emerald">✓</span>
              <span class="text-white font-bold">Emergency freeze ready</span>
            </div>
          </div>

          <!-- Contract & Emergency Controls Row -->
          <div class="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant/20 text-xs font-mono">
            <div class="flex items-center gap-2 text-outline">
              <span>On-chain enforcement:</span>
              <code class="text-white font-bold bg-surface-lowest px-2 py-1 rounded border border-outline-variant/30">TokenBudgetEnforcer.sol</code>
            </div>
            <button
              onclick="App.toggleFreeze()"
              class="px-5 py-2.5 rounded-xl ${isFrozen ? 'bg-tertiary text-background hover:bg-tertiary/90' : 'bg-error/20 text-error hover:bg-error/30 border border-error/50'} font-mono font-bold transition flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span class="material-symbols-outlined text-sm">${isFrozen ? 'lock_open' : 'lock'}</span>
              <span>${isFrozen ? 'UNFREEZE AGENT' : 'EMERGENCY FREEZE SPENDING'}</span>
            </button>
          </div>
        </div>

        <!-- ===================================================================
             2. Item 7: RECENT INCIDENTS (FOCUSED & DIRECT)
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 md:p-8 space-y-4 shadow-xl">
          <div class="flex items-center justify-between border-b border-outline-variant/20 pb-3">
            <h2 class="font-headline text-lg font-bold text-white uppercase tracking-wider">RECENT INCIDENTS</h2>
            <span class="text-xs font-mono text-outline">Deterministic Protocol Interceptions</span>
          </div>

          <div class="space-y-3 font-mono text-xs">
            <!-- Incident 1: Overspend blocked -->
            <div class="p-5 rounded-xl bg-surface-lowest border border-error/40 space-y-3">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-1 rounded text-xs font-bold bg-error/15 text-error border border-error/30">
                  [ALERT] Overspend blocked
                </span>
                <span class="text-error font-bold text-xs">Contract rejected</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/20">
                  <span class="text-outline block text-[10px] uppercase">Agent requested</span>
                  <strong class="text-white text-sm">$25.00 USDC</strong>
                </div>
                <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/20">
                  <span class="text-outline block text-[10px] uppercase">Remaining budget</span>
                  <strong class="text-secondary text-sm">$${remaining} USDC</strong>
                </div>
              </div>
              <p class="text-[11px] text-outline pt-1 border-t border-outline-variant/15">
                Physical mathematical spending ceiling preserved on-chain by TokenBudgetEnforcer.sol. 0 wei transferred.
              </p>
            </div>

            <!-- Incident 2: Delivery tampering -->
            <div class="p-5 rounded-xl bg-surface-lowest border border-amber-400/40 space-y-3">
              <div class="flex items-center justify-between">
                <span class="px-2.5 py-1 rounded text-xs font-bold bg-amber-400/15 text-amber-400 border border-amber-400/30">
                  [ALERT] Delivery tampering
                </span>
                <span class="text-amber-400 font-bold text-xs">Content hash mismatch</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/20">
                  <span class="text-outline block text-[10px] uppercase">Provided Hash</span>
                  <code class="text-white text-xs">sha256:7bd1674136f9868f25814fa668616297740ebc5bf6015c0868dff32f09761e20</code>
                </div>
                <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/20">
                  <span class="text-outline block text-[10px] uppercase">Recomputed Hash</span>
                  <code class="text-amber-300 text-xs">sha256:9f8a32b014cd768912ef093847228e938192a84c0128471b058c067e26830571</code>
                </div>
              </div>
              <p class="text-[11px] text-outline pt-1 border-t border-outline-variant/15">
                SHA-256 client verification caught payload discrepancy. Malicious delivery rejected prior to acceptance.
              </p>
            </div>
          </div>
        </div>

      </div>
    `;
  },
};
