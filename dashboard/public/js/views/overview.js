/**
 * dashboard/public/js/views/overview.js
 *
 * Page 1: Overview & Autonomous Safe-Spend Protocol Deck
 * =======================================================
 * Answers the core hackathon question in under 30 seconds:
 *   "Can I safely give this AI agent money?"
 *
 * Designed with Stitch MCP & Cybernetic Telemetry System:
 *   - Autonomous Safe-Spend Protocol Deck Hero with live Risk Waveform
 *   - 4 Financial Spending Ceiling Hero Cards (Authorized Escrow, Settled Spend 24H, Remaining Allowance, Budget Utilization)
 *   - 9-Step Autonomous Purchase Pipeline (AI Decision -> Wire Protocol -> EVM Settlement)
 *   - Cryptographic Defense Matrix (Blocked Overspends, Replay Attack Guard, Payload Injection Defense, Live Security Console)
 *   - Settled Autonomous Purchase Ledger with SHA-256 Verification Actions
 */

const OverviewView = {
  initialized: false,
  activeLedgerTab: "all",

  setLedgerTab(tab) {
    this.activeLedgerTab = tab;
    if (typeof document !== "undefined" && typeof AppState !== "undefined" && AppState.currentView === "overview") {
      const root = document.getElementById("mainContent") || document.getElementById("main-content");
      if (root && root.querySelector("#overview-view-root")) {
        root.innerHTML = this.render();
      }
    }
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof AppState !== "undefined" && typeof AppState.subscribe === "function") {
      AppState.subscribe((event, data) => this.onStateChange(event, data));
    }
  },

  onStateChange(event, data) {
    if (
      event === "budget_updated" ||
      event === "transactions_updated" ||
      event === "settlement_confirmed" ||
      event === "alerts_updated" ||
      event === "security_event" ||
      event === "stream_event_processed"
    ) {
      if (typeof document !== "undefined" && typeof AppState !== "undefined" && AppState.currentView === "overview") {
        const root = document.getElementById("mainContent") || document.getElementById("main-content");
        if (root && root.querySelector("#overview-view-root")) {
          root.innerHTML = this.render();
        }
      }
    }
  },

  
  renderBentoGrid(normBudget, normTxs, secStats, isFrozen) {
    if (typeof BentoGrid !== "undefined" && typeof BentoGrid.BentoGridThirdDemo === "function") {
      return BentoGrid.BentoGridThirdDemo({
        normBudget,
        normTxs,
        enforcerAddress: (typeof AppState !== "undefined" && AppState.config && AppState.config.enforcerAddress) || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
      });
    }

    const formattedTotal = normBudget.formattedTotal || "$30.00 USDC";
    const formattedSpent = normBudget.formattedSpent || "$4.00 USDC";
    const formattedRemaining = normBudget.formattedRemaining || "$26.00 USDC";
    const utilizationPercent = normBudget.utilizationPercent || "20.0";
    const unspentPercent = (100 - parseFloat(utilizationPercent)).toFixed(1);
    const txCount = normTxs.length || 0;
    const avgTx = txCount > 0
      ? (parseFloat(normBudget.settledSpend || normBudget.spent || 0) / txCount).toFixed(2) + " USDC"
      : "0.80 USDC";
    const enforcerAddress = (typeof AppState !== "undefined" && AppState.config && AppState.config.enforcerAddress) || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const shortVault = enforcerAddress ? enforcerAddress.slice(0, 6) + "..." + enforcerAddress.slice(-4) : "0xe7f1...0512";
    const utilNum = parseFloat(utilizationPercent) || 0;
    const strokeDash = Math.round((utilNum / 100) * 126);

    return `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto md:auto-rows-[19.5rem]">
        <!-- Item 1: Total Authorized Escrow Vault -->
        <div class="row-span-1 rounded-2xl group/bento hover:shadow-2xl transition duration-300 p-5 bg-surface-low/90 border border-white/[0.08] hover:border-cyan-500/50 justify-between flex flex-col space-y-3 relative overflow-hidden backdrop-blur-md md:col-span-1">
          <div class="absolute -right-16 -top-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl group-hover/bento:bg-cyan-500/20 transition-all duration-500 pointer-events-none"></div>
          <div class="flex-1 w-full min-h-[8rem] rounded-xl overflow-hidden relative flex flex-col justify-center">
            <div class="w-full h-full p-2 flex flex-col justify-center items-center gap-2 relative select-none bg-dot-grid">
              <div class="absolute w-24 h-24 bg-cyan-500/15 rounded-full blur-xl pointer-events-none"></div>
              <div class="w-full max-w-[17rem] p-2 rounded-lg bg-surface-container/90 border border-cyan-500/30 flex items-center justify-between text-[11px] font-mono shadow-md bento-tilt-right transition-transform duration-300">
                <div class="flex items-center gap-1.5 text-cyan-300">
                  <span class="material-symbols-outlined text-xs">key</span>
                  <span class="font-bold">EIP-712 Envelope</span>
                </div>
                <span class="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">SEALED</span>
              </div>
              <div class="w-full max-w-[17.5rem] p-3 rounded-xl bg-surface-highest/95 border border-primary/40 flex items-center justify-between shadow-xl bento-elevate transition-transform duration-300 relative z-10">
                <div>
                  <div class="text-[9px] font-mono uppercase font-bold text-outline">ALLOCATED ESCROW</div>
                  <div class="font-headline text-lg font-bold text-white font-mono tracking-tight">${formattedTotal}</div>
                </div>
                <button
                  onclick="App.openFundModal()"
                  class="px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-mono text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer glow-cyan"
                >
                  <span class="material-symbols-outlined text-xs">add</span>
                  <span>TOP UP</span>
                </button>
              </div>
              <div class="w-full max-w-[17rem] p-2 rounded-lg bg-surface-container/80 border border-outline-variant/30 flex items-center justify-between text-[10px] font-mono text-outline shadow-md bento-tilt-left transition-transform duration-300">
                <span>Vault: <span class="text-primary hover:underline cursor-pointer" onclick="App.copyText('${enforcerAddress}')">${shortVault}</span></span>
                <span class="text-[9px] text-tertiary font-bold flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
          <div class="group-hover/bento:translate-x-2 transition duration-200 relative z-10">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-cyan-400 text-lg">account_balance_wallet</span>
              <div class="font-headline font-bold text-white text-base tracking-tight">${formattedTotal} Authorized Escrow</div>
            </div>
            <div class="font-mono text-xs text-on-surface-variant leading-relaxed">
              Allocated via Smart Contract Vault (${shortVault}). Micro-invoices verified via EIP-712 typed envelopes.
            </div>
          </div>
        </div>

        <!-- Item 2: Settled Spend & Wire Velocity -->
        <div class="row-span-1 rounded-2xl group/bento hover:shadow-2xl transition duration-300 p-5 bg-surface-low/90 border border-white/[0.08] hover:border-secondary/50 justify-between flex flex-col space-y-3 relative overflow-hidden backdrop-blur-md md:col-span-1">
          <div class="absolute -right-16 -top-16 w-36 h-36 bg-secondary/10 rounded-full blur-2xl group-hover/bento:bg-secondary/20 transition-all duration-500 pointer-events-none"></div>
          <div class="flex-1 w-full min-h-[8rem] rounded-xl overflow-hidden relative flex flex-col justify-center">
            <div class="w-full h-full p-2.5 flex flex-col justify-center gap-2 font-mono text-xs select-none">
              <div class="flex items-baseline justify-between mb-1">
                <span class="font-headline text-xl font-bold text-secondary font-mono">${formattedSpent}</span>
                <span class="text-[10px] text-outline">${txCount} purchases &bull; avg ${avgTx}</span>
              </div>
              <div class="space-y-1">
                <div class="flex justify-between text-[10px] text-on-surface-variant">
                  <span class="flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    <span>x402 Micro-Invoice</span>
                  </span>
                  <span class="text-cyan-400 font-bold">100% OK</span>
                </div>
                <div class="w-full bg-surface-highest rounded-full h-1.5 overflow-hidden">
                  <div class="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full w-full glow-cyan"></div>
                </div>
              </div>
              <div class="space-y-1">
                <div class="flex justify-between text-[10px] text-on-surface-variant">
                  <span class="flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>ECDSA Typed Hash</span>
                  </span>
                  <span class="text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div class="w-full bg-surface-highest rounded-full h-1.5 overflow-hidden">
                  <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full w-[96%] glow-emerald"></div>
                </div>
              </div>
              <div class="space-y-1">
                <div class="flex justify-between text-[10px] text-on-surface-variant">
                  <span class="flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    <span>EVM On-Chain Settle</span>
                  </span>
                  <span class="text-purple-300 font-bold">CONFIRMED</span>
                </div>
                <div class="w-full bg-surface-highest rounded-full h-1.5 overflow-hidden">
                  <div class="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full w-full"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="group-hover/bento:translate-x-2 transition duration-200 relative z-10">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-emerald-400 text-lg">query_stats</span>
              <div class="font-headline font-bold text-white text-base tracking-tight">${formattedSpent} Settled Spend (24H)</div>
            </div>
            <div class="font-mono text-xs text-on-surface-variant leading-relaxed">
              Across ${txCount} autonomous purchases. Real-time x402 wire protocol streaming with zero human delay.
            </div>
          </div>
        </div>

        <!-- Item 3: Spending Ceiling Defense -->
        <div class="row-span-1 rounded-2xl group/bento hover:shadow-2xl transition duration-300 p-5 bg-surface-low/90 border border-white/[0.08] hover:border-tertiary/50 justify-between flex flex-col space-y-3 relative overflow-hidden backdrop-blur-md md:col-span-1">
          <div class="absolute -right-16 -top-16 w-36 h-36 bg-tertiary/10 rounded-full blur-2xl group-hover/bento:bg-tertiary/20 transition-all duration-500 pointer-events-none"></div>
          <div class="flex-1 w-full min-h-[8rem] rounded-xl overflow-hidden relative flex flex-col justify-center">
            <div class="w-full h-full rounded-xl relative flex flex-col items-center justify-center overflow-hidden p-3 bg-gradient-to-br from-amber-500/10 via-surface-lowest to-tertiary/10 border border-outline-variant/20">
              <div class="absolute w-36 h-36 rounded-full border border-tertiary/20 animate-ping opacity-25 pointer-events-none"></div>
              <div class="absolute w-24 h-24 rounded-full border border-amber-400/30 pointer-events-none"></div>
              <div class="w-10 h-10 rounded-2xl bg-tertiary/20 border border-tertiary/50 flex items-center justify-center glow-emerald mb-1.5 relative z-10">
                <span class="material-symbols-outlined text-tertiary text-xl">verified_user</span>
              </div>
              <div class="font-headline text-xl font-bold text-tertiary font-mono tracking-tight relative z-10">
                ${formattedRemaining}
              </div>
              <div class="mt-1 px-2.5 py-0.5 rounded-full bg-surface-highest/90 border border-amber-400/40 text-[10px] font-mono text-amber-300 flex items-center gap-1 relative z-10 shadow-lg">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span>STRICT HARD-CAP: $5.00 MAX</span>
              </div>
            </div>
          </div>
          <div class="group-hover/bento:translate-x-2 transition duration-200 relative z-10">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-amber-400 text-lg">shield</span>
              <div class="font-headline font-bold text-white text-base tracking-tight">${formattedRemaining} Remaining Allowance</div>
            </div>
            <div class="font-mono text-xs text-on-surface-variant leading-relaxed">
              Strict Hard-Cap Active: $5.00 max per call. Cryptographically enforced before signature release.
            </div>
          </div>
        </div>

        <!-- Item 4: Autonomous Pareto Provider Selection (span-2) -->
        <div class="row-span-1 rounded-2xl group/bento hover:shadow-2xl transition duration-300 p-5 bg-surface-low/90 border border-white/[0.08] hover:border-purple-500/50 justify-between flex flex-col space-y-3 relative overflow-hidden backdrop-blur-md md:col-span-2">
          <div class="absolute -right-16 -top-16 w-44 h-44 bg-purple-500/10 rounded-full blur-2xl group-hover/bento:bg-purple-500/20 transition-all duration-500 pointer-events-none"></div>
          <div class="flex-1 w-full min-h-[8rem] rounded-xl overflow-hidden relative flex flex-col justify-center">
            <div class="w-full h-full p-2 flex flex-col justify-center gap-2 select-none">
              <div class="flex items-center justify-between px-1">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-mono uppercase font-bold text-outline">MULTI-OBJECTIVE PARETO OPTIMIZATION</span>
                  <span class="px-1.5 py-0.2 rounded bg-secondary/20 text-secondary text-[9px] font-mono font-bold">3 CANDIDATES EVALUATED</span>
                </div>
                <span class="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs">auto_awesome</span>
                  AUTONOMOUS ARBITRAGE
                </span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div class="p-2.5 rounded-xl bg-surface-container/90 border border-emerald-500/50 glow-emerald flex flex-col justify-between transition-all duration-300 hover:scale-[1.02]">
                  <div>
                    <div class="flex items-center justify-between">
                      <span class="font-headline font-bold text-white text-xs">Alpha Translate</span>
                      <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[8px] font-bold">SELECTED</span>
                    </div>
                    <div class="mt-1 font-mono text-xs font-bold text-emerald-400">$0.02 USDC</div>
                    <div class="text-[10px] font-mono text-outline">Latency: 82ms &bull; Score: 0.98</div>
                  </div>
                  <div class="mt-2 pt-1 border-t border-emerald-500/20 text-[9px] font-mono text-emerald-300 flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">check_circle</span>
                    <span>Enforcer Approved</span>
                  </div>
                </div>
                <div class="p-2.5 rounded-xl bg-surface-container/60 border border-outline-variant/30 flex flex-col justify-between transition-all duration-300 hover:border-cyan-500/40">
                  <div>
                    <div class="flex items-center justify-between">
                      <span class="font-headline font-bold text-on-surface-variant text-xs">Beta Neural</span>
                      <span class="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[8px] font-bold">STANDBY</span>
                    </div>
                    <div class="mt-1 font-mono text-xs font-bold text-cyan-300">$0.05 USDC</div>
                    <div class="text-[10px] font-mono text-outline">Latency: 64ms &bull; Score: 0.91</div>
                  </div>
                  <div class="mt-2 pt-1 border-t border-outline-variant/20 text-[9px] font-mono text-outline flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">schedule</span>
                    <span>Secondary Pareto</span>
                  </div>
                </div>
                <div class="p-2.5 rounded-xl bg-error/10 border border-error/50 glow-crimson flex flex-col justify-between transition-all duration-300">
                  <div>
                    <div class="flex items-center justify-between">
                      <span class="font-headline font-bold text-error text-xs line-through">Gamma Rogue</span>
                      <span class="px-1.5 py-0.5 rounded bg-error/20 text-error text-[8px] font-bold">REJECTED</span>
                    </div>
                    <div class="mt-1 font-mono text-xs font-bold text-error line-through">$12.00 USDC</div>
                    <div class="text-[10px] font-mono text-error/80">Breaches $5 Invariant</div>
                  </div>
                  <div class="mt-2 pt-1 border-t border-error/20 text-[9px] font-mono text-error flex items-center gap-1 font-bold">
                    <span class="material-symbols-outlined text-xs">block</span>
                    <span>Zero-Exposure Halt</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="group-hover/bento:translate-x-2 transition duration-200 relative z-10">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-purple-400 text-lg">psychology</span>
              <div class="font-headline font-bold text-white text-base tracking-tight">Autonomous Pareto Provider Arbitrage</div>
            </div>
            <div class="font-mono text-xs text-on-surface-variant leading-relaxed">
              AI agent dynamically ranks latency, price & quality on the Pareto frontier. Overspending proposals are rejected deterministically before signature generation.
            </div>
          </div>
        </div>

        <!-- Item 5: Budget Utilization & Security Guard -->
        <div class="row-span-1 rounded-2xl group/bento hover:shadow-2xl transition duration-300 p-5 bg-surface-low/90 border border-white/[0.08] hover:border-blue-500/50 justify-between flex flex-col space-y-3 relative overflow-hidden backdrop-blur-md md:col-span-1">
          <div class="absolute -right-16 -top-16 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl group-hover/bento:bg-blue-500/20 transition-all duration-500 pointer-events-none"></div>
          <div class="flex-1 w-full min-h-[8rem] rounded-xl overflow-hidden relative flex flex-col justify-center">
            <div class="w-full h-full p-2 flex items-center justify-around select-none">
              <div class="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg class="w-20 h-20 -rotate-90 transform" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="4" class="text-surface-highest" fill="none"></circle>
                  <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="4" stroke-dasharray="126" stroke-dashoffset="${126 - strokeDash}" stroke-linecap="round" class="text-cyan-400 transition-all duration-700 glow-cyan" fill="none"></circle>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="font-headline font-bold text-white text-xs font-mono">${utilNum.toFixed(0)}%</span>
                  <span class="text-[8px] font-mono text-outline uppercase">USED</span>
                </div>
              </div>
              <div class="flex flex-col gap-1.5 font-mono">
                <div class="text-[10px] text-tertiary font-bold flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                  <span>${unspentPercent}% Unspent</span>
                </div>
                <div class="text-[10px] text-outline">Epoch: <span class="text-white font-semibold">Rolling Block</span></div>
                <div class="px-2 py-0.5 rounded bg-surface-highest border border-outline-variant/30 text-[9px] text-cyan-300 font-bold">NONCE GUARD: PASS</div>
              </div>
            </div>
          </div>
          <div class="group-hover/bento:translate-x-2 transition duration-200 relative z-10">
            <div class="flex items-center gap-2 mb-1">
              <span class="material-symbols-outlined text-blue-400 text-lg">pie_chart</span>
              <div class="font-headline font-bold text-white text-base tracking-tight">${utilizationPercent}% Budget Utilization</div>
            </div>
            <div class="font-mono text-xs text-on-surface-variant leading-relaxed">
              ${unspentPercent}% unspent reserve. Rolling block window ensures automatic replay protection with deterministic nonces.
            </div>
          </div>
        </div>
      </div>
    `;
  },

  render() {
    this.init();
    const normBudget = BudgetAdapter.normalize(AppState.budget);
    const unifiedTxs = typeof TransactionAdapter !== "undefined" && typeof TransactionAdapter.getUnifiedHistory === "function"
      ? TransactionAdapter.getUnifiedHistory(AppState.transactions, AppState.alerts, AppState.providerSelectionState)
      : (typeof TransactionAdapter !== "undefined" ? TransactionAdapter.normalizeList(AppState.transactions || []) : []);
    const normTxs = unifiedTxs;
    const secStats = SecurityAdapter.computeStats(AppState.alerts);
    const isFrozen = normBudget.isFrozen;

    const settledTxs = unifiedTxs.filter((t) => t.isSettled || t.status === "SETTLED");
    const blockedTxs = unifiedTxs.filter((t) => t.isBlocked || t.status === "CAPPED" || t.status === "BLOCKED" || t.status === "REJECTED");

    const currentTab = this.activeLedgerTab || "all";
    const displayedLedgerTxs = currentTab === "settled"
      ? settledTxs
      : currentTab === "blocked"
      ? blockedTxs
      : unifiedTxs;

    const preventedOverspendSum = blockedTxs.reduce((sum, t) => sum + (parseFloat(t.amountUSD) || 0), 0);
    const formattedPreventedOverspend = `${preventedOverspendSum.toFixed(2)} USDC`;

    // Latest transaction for dynamic pipeline binding (prefer latest settled or recent attempt)
    const latestTx = settledTxs.length > 0 ? settledTxs[0] : (unifiedTxs.length > 0 ? unifiedTxs[0] : TransactionAdapter.fallbackTransaction());

    const liveEvents = AppState.liveEvents || [];
    const liveEventsRows = liveEvents.length > 0
      ? liveEvents.slice(0, 25).map((evt) => {
          const type = evt.type || "EVENT";
          let badgeColor = "bg-surface-high text-white border border-outline-variant/40";
          if (type.includes("BLOCKED") || type.includes("REJECTED") || type.includes("TAMPERED") || type === "FAILED") {
            badgeColor = "bg-error/15 text-error border border-error/40 glow-crimson";
          } else if (type === "SETTLEMENT_CONFIRMED" || type === "HASH_VERIFIED" || type === "DELIVERY_RECEIVED") {
            badgeColor = "bg-tertiary/15 text-tertiary border border-tertiary/40 glow-emerald";
          } else if (type === "PAYMENT_SIGNED" || type === "SETTLEMENT_SUBMITTED") {
            badgeColor = "bg-amber-400/15 text-amber-400 border border-amber-400/40";
          } else if (type === "INTENT_RECEIVED" || type === "PROVIDER_SEARCH") {
            badgeColor = "bg-secondary/15 text-secondary border border-secondary/40";
          } else if (type === "PROVIDER_SELECTED" || type === "PAYMENT_REQUIRED") {
            badgeColor = "bg-primary/15 text-primary border border-primary/40";
          } else if (type === "AGENT_FROZEN") {
            badgeColor = "bg-error-container text-white border border-error glow-crimson";
          } else if (type === "RETRY_DETECTED") {
            badgeColor = "bg-cyan-400/15 text-cyan-400 border border-cyan-400/40";
          }

          const timeStr = evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : "";
          const reqSnippet = evt.reqId && evt.reqId !== "0x" ? `${evt.reqId.slice(0, 8)}...` : "";

          return `
            <div class="flex items-start gap-3 p-2.5 rounded-lg bg-surface-container/60 hover:bg-surface-container border border-outline-variant/30 text-xs font-mono transition-all duration-300">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor} shrink-0 uppercase tracking-wider">
                ${type}
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-white font-medium truncate">${evt.message || type}</span>
                  <span class="text-[10px] text-outline shrink-0">${timeStr}</span>
                </div>
                <div class="flex items-center gap-3 text-[10px] text-on-surface-variant mt-0.5">
                  ${evt.providerId ? `<span>Provider: <strong class="text-secondary">${evt.providerId}</strong></span>` : ""}
                  ${evt.amountUSD && evt.amountUSD !== "0.00" ? `<span>Amount: <strong class="text-tertiary">$${evt.amountUSD}</strong></span>` : ""}
                  ${reqSnippet ? `<span>reqId: <code class="text-outline">${reqSnippet}</code></span>` : ""}
                  ${evt.txHash ? `<span class="text-primary font-bold">Tx: ${evt.txHash.slice(0, 8)}...</span>` : ""}
                </div>
              </div>
            </div>
          `;
        }).join("")
      : `<div id="liveEventStreamEmpty" class="text-center py-6 text-outline text-xs font-mono">Stream active. Waiting for incoming machine payment events...</div>`;

    return `
      <div id="overview-view-root" class="space-y-6">

        <!-- ===================================================================
             1. HERO: AGENT AUTHORITY & EMERGENCY CIRCUIT BREAKER
             =================================================================== -->
        <section class="relative overflow-hidden rounded-2xl bg-surface-low/90 border ${
          isFrozen ? "border-error/60" : "border-outline-variant/40"
        } p-6 backdrop-blur-md">
          <!-- Ambient Glow Decorator -->
          <div class="absolute -right-20 -top-20 w-80 h-80 ${isFrozen ? "bg-error/10" : "bg-secondary/10"} rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -left-20 -bottom-20 w-80 h-80 ${isFrozen ? "bg-error/10" : "bg-primary/10"} rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <!-- Left: Node Identity & Authority Status -->
            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-3 py-1 rounded-full ${
                  isFrozen
                    ? "bg-error/15 border border-error/50 text-error glow-crimson"
                    : "bg-tertiary/15 border border-tertiary/50 text-tertiary glow-emerald"
                } font-mono text-xs font-bold flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full ${isFrozen ? "bg-error" : "bg-tertiary"} animate-ping"></span>
                  ${isFrozen ? "FROZEN: ON-CHAIN CIRCUIT BREAKER TRIPPED" : "AUTHORIZED: ACTIVE PROTOCOL GUARD"}
                </span>
                <span class="text-on-surface-variant font-mono text-xs flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm text-outline" data-icon="memory">memory</span>
                  FLEET-NODE-01 // AUTONOMOUS AGENT PROCUREMENT
                </span>
              </div>
              <h1 class="font-headline text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Autonomous Safe-Spend Protocol Deck
              </h1>
              <p class="text-on-surface-variant text-sm max-w-2xl leading-relaxed">
                Deterministic cryptographically constrained purchasing loop for AI sub-agents. Micro-invoices verified via EIP-712 typed envelopes with zero exposure to unbounded multi-sig reserves.
              </p>
            </div>

            <!-- Right: Risk Telemetry & Circuit Breaker Actions -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 self-start lg:self-center">
              <!-- Risk Score Telemetry Wave -->
              <div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-lowest border border-outline-variant/30">
                <div class="flex flex-col">
                  <span class="text-[10px] font-mono uppercase font-bold text-outline">RISK COEFFICIENT</span>
                  <span class="font-mono text-sm font-bold ${isFrozen ? "text-error" : "text-tertiary"}">
                    ${isFrozen ? "0.99" : "0.02"} <span class="text-xs text-on-surface-variant">${isFrozen ? "[CRITICAL]" : "[LOW]"}</span>
                  </span>
                </div>
                <!-- Dynamic SVG Pulse Wave -->
                <svg class="w-14 h-7 ${isFrozen ? "text-error" : "text-tertiary"}" fill="none" viewBox="0 0 64 32">
                  <path d="M0 16H18L22 4L28 28L34 10L38 20L42 16H64" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                </svg>
              </div>

              <!-- Buttons Group -->
              <div class="flex items-center gap-2">
                <button
                  onclick="App.openFundModal()"
                  class="px-4 py-2.5 rounded-xl bg-tertiary/20 hover:bg-tertiary/30 text-tertiary border border-tertiary/50 glow-emerald font-mono text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-lg cursor-pointer"
                  title="Deposit funds into agent escrow on-chain"
                >
                  <span class="material-symbols-outlined text-sm">add_circle</span>
                  <span>+ ADD FUNDS</span>
                </button>
                <button
                  onclick="App.openFreezeModal()"
                  class="px-4 py-2.5 rounded-xl ${
                    isFrozen
                      ? "bg-tertiary/20 hover:bg-tertiary/30 text-tertiary border border-tertiary/50 glow-emerald"
                      : "bg-error-container/80 hover:bg-error-container text-white border border-error/50 glow-crimson"
                  } font-mono text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg cursor-pointer"
                >
                  <span class="material-symbols-outlined text-sm" data-icon="bolt">bolt</span>
                  <span>${isFrozen ? "UNFREEZE AGENT" : "EMERGENCY FREEZE (HALT)"}</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- ===================================================================
             2. ACETERNITY UI BENTO GRID: SAFE-SPEND & AUTONOMOUS PROTOCOL DECK
             =================================================================== -->
        <section id="overviewBentoGridSection" class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span class="text-xs font-mono uppercase tracking-wider font-bold text-outline">
                ACETERNITY UI &bull; PROTOCOL TELEMETRY BENTO DECK
              </span>
            </div>
            <span class="text-[11px] font-mono text-on-surface-variant flex items-center gap-1">
              <span class="material-symbols-outlined text-xs text-primary">verified</span>
              EIP-712 &bull; x402 V2 &bull; Hardhat / Base
            </span>
          </div>
          ${this.renderBentoGrid(normBudget, normTxs, secStats, isFrozen)}
        </section>

        <!-- ===================================================================
             HERO SPOTLIGHT: CURRENT AUTONOMOUS PURCHASE SCREEN BANNER
             =================================================================== -->
        <div class="rounded-2xl bg-gradient-to-r from-secondary/15 via-surface-low to-primary/15 border border-secondary/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-2xl bg-secondary/20 border border-secondary/50 flex items-center justify-center glow-cyan shrink-0">
              <span class="material-symbols-outlined text-secondary text-2xl animate-pulse">bolt</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-secondary">Dominant Execution Center</span>
                <span class="px-2 py-0.2 rounded bg-tertiary/20 text-tertiary font-mono text-[9px] font-bold">8-STAGE HERO PIPELINE</span>
              </div>
              <h2 class="font-headline text-lg font-bold text-white tracking-tight mt-0.5">
                Inspect Current Autonomous Purchase (Live Wire Protocol)
              </h2>
              <p class="text-xs text-on-surface-variant font-mono">
                User Request &rarr; AI Decision &rarr; x402 Challenge &rarr; Signature &rarr; Protocol Check &rarr; EVM Settle &rarr; Delivery &rarr; SHA-256 Match
              </p>
            </div>
          </div>
          <button
            onclick="App.navigate('current')"
            class="px-5 py-2.5 rounded-xl bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/50 font-mono text-xs font-bold flex items-center gap-2 transition glow-cyan shrink-0 active:scale-95 shadow-lg"
          >
            <span>Open Dedicated Screen</span>
            <span class="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>

        <!-- ===================================================================
             3. MAIN BODY (2 COLUMNS: PIPELINE & DEFENSE TELEMETRY)
             =================================================================== -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          <!-- LEFT COLUMN (7 cols): 9-STEP AUTONOMOUS PURCHASE PIPELINE -->
          <section class="lg:col-span-7 flex flex-col gap-4">
            <!-- Section Header -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-2 h-5 bg-secondary rounded-sm glow-cyan"></div>
                <div>
                  <h2 class="font-headline text-base font-bold text-white tracking-tight">Autonomous Purchase Pipeline</h2>
                  <span class="font-mono text-xs text-on-surface-variant">Active Trace: ${UIFormatter.formatHash(latestTx.reqId, 8)}</span>
                </div>
              </div>
              <div class="flex items-center gap-1.5 text-xs font-mono bg-surface-high px-2.5 py-1 rounded-lg border border-outline-variant/40 text-secondary">
                <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span>STEP 9 OF 9 SETTLED</span>
              </div>
            </div>

            <!-- Sequenced Visual Pipeline List -->
            <div class="flex flex-col gap-2.5">

              <!-- Step 1 -->
              <div class="p-3.5 rounded-xl bg-surface-low border border-outline-variant/40 flex items-start gap-3 hover:border-tertiary/40 transition-colors">
                <div class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary flex items-center justify-center mt-0.5 shrink-0">
                  <span class="material-symbols-outlined text-xs font-bold" data-icon="check">check</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider">1. Agent Intent Formulated</span>
                    <span class="font-mono text-xs text-tertiary">Verified</span>
                  </div>
                  <p class="text-xs text-on-surface-variant mt-0.5 font-mono truncate">"${latestTx.intent}"</p>
                  <div class="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono text-outline">
                    <span class="bg-surface-lowest px-2 py-0.5 rounded">T: ${UIFormatter.formatTimestamp(latestTx.timestamp)}</span>
                    <span class="bg-surface-lowest px-2 py-0.5 rounded text-tertiary">reqId: ${UIFormatter.formatHash(latestTx.reqId, 6)}</span>
                  </div>
                </div>
              </div>

              <!-- Step 2 -->
              <div class="p-3.5 rounded-xl bg-surface-low border border-outline-variant/40 flex items-start gap-3 hover:border-tertiary/40 transition-colors">
                <div class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary flex items-center justify-center mt-0.5 shrink-0">
                  <span class="material-symbols-outlined text-xs font-bold" data-icon="check">check</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider">2. Provider Discovery & Selection</span>
                    <span class="font-mono text-xs text-tertiary">Matched</span>
                  </div>
                  <p class="text-xs text-on-surface-variant mt-0.5">Matched optimal candidate: <strong class="text-secondary font-mono">${latestTx.providerName}</strong> (Score: ${latestTx.quality.toFixed(2)})</p>
                  <div class="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono text-outline">
                    <span class="bg-surface-lowest px-2 py-0.5 rounded">Service: ${latestTx.serviceName}</span>
                    <span class="bg-surface-lowest px-2 py-0.5 rounded text-secondary">Pareto-optimal quality/cost</span>
                  </div>
                </div>
              </div>

              <!-- Step 3 -->
              <div class="p-3.5 rounded-xl bg-surface-low border border-outline-variant/40 flex items-start gap-3 hover:border-tertiary/40 transition-colors">
                <div class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary flex items-center justify-center mt-0.5 shrink-0">
                  <span class="material-symbols-outlined text-xs font-bold" data-icon="check">check</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider">3. HTTP 402 Payment Required</span>
                    <span class="font-mono text-xs text-secondary font-bold">${latestTx.formattedAmount}</span>
                  </div>
                  <p class="text-xs text-on-surface-variant mt-0.5">x402 V2 invoice received: <span class="font-mono text-secondary">${Number(latestTx.amountUnits).toLocaleString()} atomic units</span> on ${latestTx.network}</p>
                  <div class="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono text-outline">
                    <span class="bg-surface-lowest px-2 py-0.5 rounded">Header: PAYMENT-REQUIRED</span>
                    <span class="bg-surface-lowest px-2 py-0.5 rounded">Scheme: exact</span>
                  </div>
                </div>
              </div>

              <!-- Step 4 -->
              <div class="p-3.5 rounded-xl bg-surface-low border border-outline-variant/40 flex items-start gap-3 hover:border-tertiary/40 transition-colors">
                <div class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary flex items-center justify-center mt-0.5 shrink-0">
                  <span class="material-symbols-outlined text-xs font-bold" data-icon="check">check</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider">4. Spending Limit & Policy Guardrail</span>
                    <span class="font-mono text-xs text-tertiary">Passed (${latestTx.formattedAmount} &le; $5.00)</span>
                  </div>
                  <p class="text-xs text-on-surface-variant mt-0.5">Verified on-chain ceiling and hourly quota before authorization signature.</p>
                  <div class="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono text-outline">
                    <span class="bg-surface-lowest px-2 py-0.5 rounded">Rule: CEIL_PER_CALL &le; $5.00</span>
                    <span class="bg-tertiary/10 text-tertiary px-2 py-0.5 rounded">Margin: Sufficient</span>
                  </div>
                </div>
              </div>

              <!-- Step 5 -->
              <div class="p-3.5 rounded-xl bg-surface-low border border-outline-variant/40 flex items-start gap-3 hover:border-tertiary/40 transition-colors">
                <div class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary flex items-center justify-center mt-0.5 shrink-0">
                  <span class="material-symbols-outlined text-xs font-bold" data-icon="check">check</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider">5. EIP-712 Structured Signature Generation</span>
                    <span class="font-mono text-xs text-tertiary">Signed</span>
                  </div>
                  <p class="text-xs text-on-surface-variant mt-0.5">Agent generated typed signature over payment requirement envelope with unique nonce.</p>
                  <div class="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono text-outline">
                    <span class="bg-surface-lowest px-2 py-0.5 rounded text-secondary font-mono">sig: ${UIFormatter.formatHash(latestTx.txHash || "0x9f8c11a2", 6)}</span>
                    <span class="bg-surface-lowest px-2 py-0.5 rounded">Domain: TokenBudgetEnforcer</span>
                  </div>
                </div>
              </div>

              <!-- Step 6 -->
              <div class="p-3.5 rounded-xl bg-surface-low border border-outline-variant/40 flex items-start gap-3 hover:border-tertiary/40 transition-colors">
                <div class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary flex items-center justify-center mt-0.5 shrink-0">
                  <span class="material-symbols-outlined text-xs font-bold" data-icon="check">check</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider">6. Facilitator Pre-Flight Verification</span>
                    <span class="font-mono text-xs text-tertiary">Gasless Validated</span>
                  </div>
                  <p class="text-xs text-on-surface-variant mt-0.5">Off-chain facilitator verified signature validity, unspent balance, and replay protection.</p>
                  <div class="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono text-outline">
                    <span class="bg-surface-lowest px-2 py-0.5 rounded">Signer: Agent Session Key</span>
                    <span class="bg-surface-lowest px-2 py-0.5 rounded text-tertiary">Replay Nonce: Unused</span>
                  </div>
                </div>
              </div>

              <!-- Step 7 -->
              <div class="p-3.5 rounded-xl bg-surface-high border-2 border-secondary/80 flex items-start gap-3 glow-cyan relative overflow-hidden">
                <div class="w-6 h-6 rounded-full bg-secondary text-surface flex items-center justify-center mt-0.5 shrink-0">
                  <span class="material-symbols-outlined text-xs font-bold" data-icon="check">check</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      7. EVM Settlement Transaction Confirmed
                      <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    </span>
                    <span class="font-mono text-xs text-secondary font-bold">Block #${latestTx.blockNumber}</span>
                  </div>
                  <p class="text-xs text-on-surface mt-0.5">Token transfer settled via TokenBudgetEnforcer contract on Hardhat EVM.</p>
                  <div class="mt-2 p-2 rounded-lg bg-surface-lowest border border-secondary/30 flex items-center justify-between">
                    <div class="flex items-center gap-2 font-mono text-[11px]">
                      <span class="text-secondary font-semibold">TX:</span>
                      <span class="text-white">${UIFormatter.formatHash(latestTx.txHash, 6)}</span>
                      <button onclick="App.copyText('${latestTx.txHash}')" class="text-outline hover:text-secondary">
                        <span class="material-symbols-outlined text-xs" data-icon="content_copy">content_copy</span>
                      </button>
                    </div>
                    <div class="font-mono text-[11px] text-tertiary">Settled: ${latestTx.formattedAmount}</div>
                  </div>
                </div>
              </div>

              <!-- Step 8 -->
              <div class="p-3.5 rounded-xl bg-surface-low border border-outline-variant/40 flex items-start gap-3 hover:border-tertiary/40 transition-colors">
                <div class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary flex items-center justify-center mt-0.5 shrink-0">
                  <span class="material-symbols-outlined text-xs font-bold" data-icon="check">check</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider">8. Provider Delivery & Payload Receipt</span>
                    <span class="font-mono text-xs text-tertiary">HTTP 200 OK</span>
                  </div>
                  <p class="text-xs text-on-surface-variant mt-0.5">Payload received from provider with content delivery cryptographic witness.</p>
                  <div class="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono text-outline">
                    <span class="bg-surface-lowest px-2 py-0.5 rounded">Service: ${latestTx.serviceName}</span>
                    <span class="bg-surface-lowest px-2 py-0.5 rounded text-tertiary">Delivery Status: Complete</span>
                  </div>
                </div>
              </div>

              <!-- Step 9 -->
              <div class="p-3.5 rounded-xl bg-surface-low border border-outline-variant/40 flex items-start gap-3 hover:border-tertiary/40 transition-colors">
                <div class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary flex items-center justify-center mt-0.5 shrink-0">
                  <span class="material-symbols-outlined text-xs font-bold" data-icon="check">check</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-white uppercase tracking-wider">9. SHA-256 Hash Verification & On-Chain Audit</span>
                    <span class="font-mono text-xs text-tertiary font-bold">MATCH CONFIRMED</span>
                  </div>
                  <p class="text-xs text-on-surface-variant mt-0.5">Independent SHA-256 calculation verified against provider commitment and recorded for audit.</p>
                  <div class="mt-1.5 flex flex-wrap gap-2 text-[10px] font-mono text-outline">
                    <span class="bg-surface-lowest px-2 py-0.5 rounded text-tertiary">Hash: ${UIFormatter.formatDeliveryHash(latestTx.deliveryHash, 8)}</span>
                    <span class="bg-tertiary/10 text-tertiary px-2 py-0.5 rounded">Cryptographically Proven</span>
                  </div>
                </div>
              </div>

            </div>
          </section>

          <!-- RIGHT COLUMN (5 cols): DEFENSE TELEMETRY & ATTACK NEUTRALIZATION -->
          <section class="lg:col-span-5 flex flex-col gap-4">
            <!-- Section Header -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-2 h-5 bg-error rounded-sm glow-crimson"></div>
                <div>
                  <h2 class="font-headline text-base font-bold text-white tracking-tight">Cryptographic Defense Matrix</h2>
                  <span class="font-mono text-xs text-on-surface-variant">Active Threat Mitigation Sensors</span>
                </div>
              </div>
              <span class="material-symbols-outlined text-tertiary" data-icon="verified_user">verified_user</span>
            </div>

            <!-- Defense Cards Stack -->
            <div class="grid grid-cols-1 gap-3">
              <!-- Defense 1: Blocked Overspends -->
              <div class="p-4 rounded-xl bg-surface-low border border-outline-variant/40 hover:border-error/40 transition-colors">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-lg bg-error/15 text-error flex items-center justify-center">
                      <span class="material-symbols-outlined" data-icon="gavel">gavel</span>
                    </div>
                    <div>
                      <h3 class="font-headline text-sm font-bold text-white">Blocked Overspends</h3>
                      <span class="text-[10px] font-mono text-error font-bold">${secStats.blockedOverspends || secStats.blockedAttacks || 0} ATTEMPTS INTERCEPTED</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-error-container text-white font-mono text-[10px] font-bold">SHIELD ACTIVE</span>
                </div>
                <p class="text-xs text-on-surface-variant mt-2.5 leading-relaxed">
                  Budget cap enforcement: Autonomous attempts exceeding single-transaction ceiling or vault balance are rejected before settlement.
                </p>
                <div class="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[10px] font-mono text-outline">
                  <span>Enforcer: TokenBudgetEnforcer.sol</span>
                  <span class="text-tertiary">Zero-Leak Guarantee</span>
                </div>
              </div>

              <!-- Defense 2: Replay Attack Guard -->
              <div class="p-4 rounded-xl bg-surface-low border border-outline-variant/40 hover:border-tertiary/40 transition-colors">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-lg bg-tertiary/15 text-tertiary flex items-center justify-center">
                      <span class="material-symbols-outlined" data-icon="replay">replay</span>
                    </div>
                    <div>
                      <h3 class="font-headline text-sm font-bold text-white">Replay Attack Guard</h3>
                      <span class="text-[10px] font-mono text-tertiary font-bold">${secStats.replayAttempts || 0} VULNERABILITIES DETECTED</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-tertiary/20 text-tertiary font-mono text-[10px] font-bold">SECURE</span>
                </div>
                <p class="text-xs text-on-surface-variant mt-2.5 leading-relaxed">
                  Non-fungible request identifiers strictly verified on-chain. Signature reuse window collapsed to zero-entropy state.
                </p>
                <div class="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[10px] font-mono text-outline">
                  <span>Nonce State: Synchronized</span>
                  <span class="text-tertiary">State Tree Clean</span>
                </div>
              </div>

              <!-- Defense 3: Payload Injection Defense -->
              <div class="p-4 rounded-xl bg-surface-low border border-outline-variant/40 hover:border-secondary/40 transition-colors">
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
                      <span class="material-symbols-outlined" data-icon="fingerprint">fingerprint</span>
                    </div>
                    <div>
                      <h3 class="font-headline text-sm font-bold text-white">Payload Injection Defense</h3>
                      <span class="text-[10px] font-mono text-secondary font-bold">${secStats.tamperingAttempts || 0} TAMPERING ATTEMPTS BLOCKED</span>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded bg-secondary/20 text-secondary font-mono text-[10px] font-bold">EIP-712 RIGOR</span>
                </div>
                <p class="text-xs text-on-surface-variant mt-2.5 leading-relaxed">
                  Cryptographic binding enforces recipient address, amount, and CAIP-2 network. Malicious manipulation invalidates signature.
                </p>
                <div class="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[10px] font-mono text-outline">
                  <span>Domain Separator: Validated</span>
                  <span class="text-secondary">Strict EIP-712 Type</span>
                </div>
              </div>
            </div>

            <!-- Live System Stream Developer Terminal -->
            <div class="col-span-1 lg:col-span-2">
              ${typeof LiveSystemTerminal !== "undefined" ? LiveSystemTerminal.render("overviewTerminalStreamBody") : ""}
            </div>
        </div>

        <!-- ===================================================================
             x402 V2 LIVE PROTOCOL STEPPER & HTTP 402 REQUIREMENTS CARD
             =================================================================== -->
        <section class="x402-visualizer-container">
          ${typeof X402ProtocolVisualizer !== "undefined" ? X402ProtocolVisualizer.render() : ""}
        </section>

        <!-- ===================================================================
             LIVE REAL-TIME EVENT STREAM (SSE REACTIVE FEED)
             =================================================================== -->
        <section class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 flex flex-col gap-4 shadow-xl">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-2 h-5 bg-secondary rounded-sm glow-cyan"></div>
              <div>
                <div class="flex items-center gap-2">
                  <h2 class="font-headline text-base font-bold text-white tracking-tight">Unified Live Event Stream</h2>
                  <div class="sse-status-badge flex items-center px-2.5 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-[10px] font-mono">
                    <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse glow-emerald"></span>
                    <span class="text-emerald-400 font-bold">LIVE STREAM (SSE)</span>
                  </div>
                </div>
                <span class="font-mono text-xs text-on-surface-variant">Real-time wire protocol & on-chain settlement telemetry via Server-Sent Events</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                id="btnToggleStreamPause"
                onclick="LiveEventStream.togglePause()"
                class="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-surface-container hover:bg-surface-high text-on-surface border border-outline-variant/40 transition"
              >
                PAUSE STREAM
              </button>
              <button
                onclick="LiveEventStream.clear()"
                class="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-surface-container hover:bg-surface-high text-outline hover:text-white border border-outline-variant/40 transition"
              >
                CLEAR
              </button>
            </div>
          </div>

          <!-- Live Event Feed Container -->
          <div
            id="liveEventStreamList"
            class="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin"
          >
            ${liveEventsRows}
          </div>
        </section>

        <!-- ===================================================================
             4. BOTTOM SECTION: AUTONOMOUS PURCHASE & SECURITY LEDGER TABLE
             =================================================================== -->
        <section class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 flex flex-col gap-4">
          <!-- Table Header & Controls -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="w-2 h-5 bg-tertiary rounded-sm glow-emerald"></div>
              <div>
                <h2 class="font-headline text-base font-bold text-white tracking-tight">Autonomous Purchase &amp; Security Ledger</h2>
                <span class="font-mono text-xs text-on-surface-variant">On-chain settlements, budget caps &amp; cryptographic security intercepts</span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <!-- Filter Tabs -->
              <div class="flex items-center gap-1 bg-surface-lowest p-1 rounded-xl border border-outline-variant/30 text-xs font-mono">
                <button
                  onclick="OverviewView.setLedgerTab('all')"
                  class="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'all'
                      ? 'bg-secondary/20 text-secondary font-bold border border-secondary/30'
                      : 'text-outline hover:text-white'
                  }"
                >
                  <span>All (${unifiedTxs.length})</span>
                </button>
                <button
                  onclick="OverviewView.setLedgerTab('settled')"
                  class="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'settled'
                      ? 'bg-tertiary/20 text-tertiary font-bold border border-tertiary/40'
                      : 'text-outline hover:text-white'
                  }"
                >
                  <span>Settled (${settledTxs.length})</span>
                </button>
                <button
                  onclick="OverviewView.setLedgerTab('blocked')"
                  class="px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'blocked'
                      ? 'bg-error/20 text-error font-bold border border-error/40'
                      : 'text-outline hover:text-white'
                  }"
                >
                  <span>Capped / Blocked (${blockedTxs.length})</span>
                </button>
              </div>

              <button
                onclick="AppState.setView('transactions')"
                class="px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface-highest text-secondary border border-outline-variant/40 font-mono text-xs font-semibold transition cursor-pointer"
              >
                View Full Explorer (${unifiedTxs.length}) &rarr;
              </button>
            </div>
          </div>

          <!-- Ledger Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left font-mono text-xs">
              <thead>
                <tr class="border-b border-outline-variant/30 text-outline text-[11px]">
                  <th class="pb-3 font-medium">TX HASH / REQ</th>
                  <th class="pb-3 font-medium">AGENT / SERVICE TARGET</th>
                  <th class="pb-3 font-medium">AMOUNT</th>
                  <th class="pb-3 font-medium">EIP-712 SIGNATURE</th>
                  <th class="pb-3 font-medium">EVM / PROTOCOL</th>
                  <th class="pb-3 font-medium">STATUS</th>
                  <th class="pb-3 font-medium text-right">PROOF COMMITMENT</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/15 text-on-surface">
                ${
                  displayedLedgerTxs.length > 0
                    ? displayedLedgerTxs
                        .slice(0, 6)
                        .map(
                          (t) => {
                            const isSettled = t.isSettled || t.status === "SETTLED";
                            const isCapped = t.status === "CAPPED" || t.isCapped;
                            const isRejected = t.status === "REJECTED" || t.isRejected;
                            
                            let statusBadgeHtml = '';
                            if (isSettled) {
                              statusBadgeHtml = `
                                <span class="px-2.5 py-0.5 rounded-full bg-tertiary/15 text-tertiary border border-tertiary/40 text-[10px] font-bold inline-flex items-center gap-1">
                                  <span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                                  Settled On-Chain
                                </span>`;
                            } else if (isCapped) {
                              statusBadgeHtml = `
                                <span class="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                                  <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                                  Budget Capped
                                </span>`;
                            } else {
                              statusBadgeHtml = `
                                <span class="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 text-[10px] font-bold inline-flex items-center gap-1">
                                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                  Rejected / Revert
                                </span>`;
                            }

                            const proofBtnText = isSettled 
                              ? 'SHA-256 Proof' 
                              : isCapped 
                              ? 'Enforcer Intercept' 
                              : 'Guard Proof';
                            const proofBtnIcon = isSettled ? 'verified' : isCapped ? 'gavel' : 'shield';
                            const proofBtnClass = isSettled
                              ? 'text-outline hover:text-secondary hover:border-secondary/40'
                              : isCapped
                              ? 'text-rose-300 hover:text-rose-200 border-rose-500/30 hover:border-rose-500/50 bg-rose-500/5'
                              : 'text-amber-300 hover:text-amber-200 border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5';

                            const evmColMain = isSettled 
                              ? `Block #${t.blockNumber}` 
                              : isCapped 
                              ? 'TokenBudgetEnforcer' 
                              : 'Protocol Rule';
                            const evmColSub = isSettled 
                              ? 'EVM Settled' 
                              : isCapped 
                              ? 'Spending Ceiling' 
                              : 'Revert Guard';
                            const evmColSubClass = isSettled ? 'text-outline' : isCapped ? 'text-rose-400' : 'text-amber-400';

                            const dotColor = isSettled ? 'bg-secondary' : isCapped ? 'bg-rose-400' : 'bg-amber-400';

                            return `
                              <tr
                                onclick="App.openTransactionDetail('${t.reqId}')"
                                class="hover:bg-surface-high/40 transition-colors cursor-pointer group"
                              >
                                <td class="py-3 font-medium text-secondary flex items-center gap-1.5">
                                  <span>${UIFormatter.formatHash(t.txHash, 6)}</span>
                                  <button
                                    onclick="event.stopPropagation(); App.copyText('${t.txHash}')"
                                    class="text-outline hover:text-secondary opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Copy Hash"
                                  >
                                    <span class="material-symbols-outlined text-xs" data-icon="content_copy">content_copy</span>
                                  </button>
                                </td>
                                <td class="py-3">
                                  <div class="flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full ${dotColor}"></span>
                                    <span class="font-semibold text-white font-sans">${t.providerName}</span>
                                  </div>
                                  <span class="text-[10px] text-outline font-sans">${t.serviceName}</span>
                                </td>
                                <td class="py-3 font-bold text-white font-mono text-sm">
                                  ${t.formattedAmount} <span class="text-xs font-normal text-on-surface-variant">USDC</span>
                                </td>
                                <td class="py-3 text-outline">
                                  ${UIFormatter.formatHash(t.reqId, 4)}
                                </td>
                                <td class="py-3">
                                  <div class="truncate max-w-[140px]">${evmColMain}</div>
                                  <span class="text-[10px] ${evmColSubClass}">${evmColSub}</span>
                                </td>
                                <td class="py-3">
                                  ${statusBadgeHtml}
                                </td>
                                <td class="py-3 text-right">
                                  <button
                                    onclick="event.stopPropagation(); App.openTransactionDetail('${t.reqId}')"
                                    class="px-2.5 py-1 rounded-lg bg-surface-lowest border border-outline-variant/30 ${proofBtnClass} text-[11px] inline-flex items-center gap-1 transition-colors"
                                  >
                                    <span class="material-symbols-outlined text-xs" data-icon="${proofBtnIcon}">${proofBtnIcon}</span>
                                    ${proofBtnText}
                                  </button>
                                </td>
                              </tr>
                            `;
                          }
                        )
                        .join("")
                    : `
                      <tr>
                        <td colspan="7" class="py-8 text-center text-outline">
                          No transactions found for the selected filter.
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>

          <!-- Ledger Summary Footer -->
          <div class="flex flex-col sm:flex-row items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-outline-variant/30 font-mono gap-2">
            <div>Showing ${Math.min(displayedLedgerTxs.length, 6)} of ${displayedLedgerTxs.length} items (${settledTxs.length} settled, ${blockedTxs.length} capped/blocked)</div>
            <div class="flex flex-wrap items-center gap-4 mt-2 sm:mt-0">
              <span>Total Settled: <strong class="text-white font-bold">${normBudget.formattedSpent}</strong></span>
              <span>Prevented Overspend: <strong class="text-rose-400 font-bold">${formattedPreventedOverspend}</strong></span>
              <span>Available Allowance: <strong class="text-tertiary font-bold">${normBudget.formattedRemaining}</strong></span>
            </div>
          </div>
        </section>

      </div>
    `;
    return htmlOutput;
  },
};

if (typeof window !== "undefined") {
  window.OverviewView = OverviewView;
}
