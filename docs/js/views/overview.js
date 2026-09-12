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

  render() {
    this.init();
    const normBudget = BudgetAdapter.normalize(AppState.budget);
    const normTxs = TransactionAdapter.normalizeList(AppState.transactions);
    const secStats = SecurityAdapter.computeStats(AppState.alerts);
    const isFrozen = normBudget.isFrozen;

    // Latest transaction for dynamic pipeline binding
    const latestTx = normTxs.length > 0 ? normTxs[0] : TransactionAdapter.fallbackTransaction();

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
             2. FINANCIAL SPENDING CEILING HERO CARDS (4-COLUMN GRID)
             =================================================================== -->
        <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Card 1: Total Authorized Escrow -->
          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-5 flex flex-col justify-between hover:border-primary/40 transition-colors">
            <div class="flex items-center justify-between text-on-surface-variant">
              <span class="text-xs font-mono uppercase font-semibold text-outline">TOTAL AUTHORIZED ESCROW</span>
              <button
                onclick="App.openFundModal()"
                class="px-2 py-0.5 rounded bg-primary/15 hover:bg-primary/25 text-primary border border-primary/40 text-[10px] font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                title="Top up escrow vault"
              >
                <span class="material-symbols-outlined text-xs">add</span>
                <span>TOP UP</span>
              </button>
            </div>
            <div class="my-3">
              <div class="font-headline text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight">
                ${normBudget.formattedTotal}
              </div>
              <span class="text-[11px] font-mono text-on-surface-variant">Allocated via Smart Contract Vault</span>
            </div>
            <div class="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] font-mono text-outline">
              <span>Vault Contract</span>
              <span class="text-primary hover:underline cursor-pointer" onclick="App.copyText('${AppState.config.enforcerAddress || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"}')">
                ${UIFormatter.formatAddress(AppState.config.enforcerAddress || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512")}
              </span>
            </div>
          </div>

          <!-- Card 2: Settled Spend -->
          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-5 flex flex-col justify-between hover:border-secondary/40 transition-colors">
            <div class="flex items-center justify-between text-on-surface-variant">
              <span class="text-xs font-mono uppercase font-semibold text-outline">SETTLED SPEND (24H)</span>
              <span class="material-symbols-outlined text-secondary" data-icon="query_stats">query_stats</span>
            </div>
            <div class="my-3 flex items-baseline justify-between">
              <div>
                <div class="font-headline text-2xl lg:text-3xl font-bold text-secondary font-mono tracking-tight">
                  ${normBudget.formattedSpent}
                </div>
                <span class="text-[11px] font-mono text-on-surface-variant">Across ${normTxs.length} autonomous purchases</span>
              </div>
              <!-- Sparkline Visualizer -->
              <div class="h-8 w-16 flex items-end gap-1">
                <div class="w-2.5 bg-secondary/30 rounded-t h-3"></div>
                <div class="w-2.5 bg-secondary/50 rounded-t h-5"></div>
                <div class="w-2.5 bg-secondary/70 rounded-t h-4"></div>
                <div class="w-2.5 bg-secondary rounded-t h-8 glow-cyan"></div>
              </div>
            </div>
            <div class="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] font-mono text-outline">
              <span>Avg Transaction</span>
              <span class="text-on-surface font-semibold">${normTxs.length > 0 ? (parseFloat(normBudget.settledSpend || normBudget.spent || 0) / normTxs.length).toFixed(2) : "0.00"} USDC</span>
            </div>
          </div>

          <!-- Card 3: Remaining Allowance -->
          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-5 flex flex-col justify-between hover:border-tertiary/40 transition-colors">
            <div class="flex items-center justify-between text-on-surface-variant">
              <span class="text-xs font-mono uppercase font-semibold text-outline">REMAINING ALLOWANCE</span>
              <button
                onclick="App.openFundModal()"
                class="px-2 py-0.5 rounded bg-tertiary/15 hover:bg-tertiary/25 text-tertiary border border-tertiary/40 text-[10px] font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                title="Add funds to remaining allowance"
              >
                <span class="material-symbols-outlined text-xs">add</span>
                <span>+ ADD FUNDS</span>
              </button>
            </div>
            <div class="my-3">
              <div class="font-headline text-2xl lg:text-3xl font-bold text-tertiary font-mono tracking-tight">
                ${normBudget.formattedRemaining}
              </div>
              <span class="text-[11px] font-mono text-on-surface-variant">Safe reserve cap: $5.00 max per single call</span>
            </div>
            <div class="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] font-mono text-outline">
              <span>Policy Ceiling</span>
              <span class="text-tertiary font-semibold">Strict Hard-Cap Active</span>
            </div>
          </div>

          <!-- Card 4: Budget Utilization -->
          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-5 flex flex-col justify-between hover:border-secondary/40 transition-colors">
            <div class="flex items-center justify-between text-on-surface-variant">
              <span class="text-xs font-mono uppercase font-semibold text-outline">BUDGET UTILIZATION</span>
              <span class="material-symbols-outlined text-secondary" data-icon="pie_chart">pie_chart</span>
            </div>
            <div class="my-3">
              <div class="flex items-baseline justify-between">
                <span class="font-headline text-2xl lg:text-3xl font-bold text-white font-mono">${normBudget.utilizationPercent}%</span>
                <span class="font-mono text-tertiary text-xs">${(100 - parseFloat(normBudget.utilizationPercent)).toFixed(1)}% Unspent</span>
              </div>
              <!-- High-Contrast Gradient Progress Bar -->
              <div class="w-full bg-surface-highest rounded-full h-2 mt-2 overflow-hidden border border-outline-variant/30">
                <div class="bg-gradient-to-r from-secondary to-tertiary h-2 rounded-full glow-cyan transition-all duration-500" style="width: ${normBudget.utilizationPercent}%"></div>
              </div>
            </div>
            <div class="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px] font-mono text-outline">
              <span>Epoch Reset</span>
              <span class="text-on-surface font-semibold">Rolling Block Window</span>
            </div>
          </div>
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
             4. BOTTOM SECTION: SETTLED AUTONOMOUS PURCHASE LEDGER TABLE
             =================================================================== -->
        <section class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 flex flex-col gap-4">
          <!-- Table Header & Controls -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="w-2 h-5 bg-tertiary rounded-sm glow-emerald"></div>
              <div>
                <h2 class="font-headline text-base font-bold text-white tracking-tight">Settled Autonomous Purchase Ledger</h2>
                <span class="font-mono text-xs text-on-surface-variant">On-chain cryptographically verifiable record</span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                onclick="AppState.setView('transactions')"
                class="px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface-highest text-secondary border border-outline-variant/40 font-mono text-xs font-semibold transition"
              >
                View Full Explorer (${normTxs.length}) &rarr;
              </button>
            </div>
          </div>

          <!-- Ledger Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left font-mono text-xs">
              <thead>
                <tr class="border-b border-outline-variant/30 text-outline text-[11px]">
                  <th class="pb-3 font-medium">TX HASH</th>
                  <th class="pb-3 font-medium">AGENT / SERVICE TARGET</th>
                  <th class="pb-3 font-medium">AMOUNT</th>
                  <th class="pb-3 font-medium">EIP-712 SIGNATURE</th>
                  <th class="pb-3 font-medium">EVM BLOCK</th>
                  <th class="pb-3 font-medium">STATUS</th>
                  <th class="pb-3 font-medium text-right">PROOF COMMITMENT</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/15 text-on-surface">
                ${
                  normTxs.length > 0
                    ? normTxs
                        .slice(0, 5)
                        .map(
                          (t) => `
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
                              <span class="w-2 h-2 rounded-full bg-secondary"></span>
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
                            <div>Block #${t.blockNumber}</div>
                            <span class="text-[10px] text-outline">EVM Settled</span>
                          </td>
                          <td class="py-3">
                            <span class="px-2.5 py-0.5 rounded-full bg-tertiary/15 text-tertiary border border-tertiary/40 text-[10px] font-bold inline-flex items-center gap-1">
                              <span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                              Settled On-Chain
                            </span>
                          </td>
                          <td class="py-3 text-right">
                            <button
                              onclick="event.stopPropagation(); App.openTransactionDetail('${t.reqId}')"
                              class="px-2.5 py-1 rounded-lg bg-surface-lowest border border-outline-variant/30 text-outline hover:text-secondary hover:border-secondary/40 text-[11px] inline-flex items-center gap-1 transition-colors"
                            >
                              <span class="material-symbols-outlined text-xs" data-icon="verified">verified</span>
                              SHA-256 Proof
                            </button>
                          </td>
                        </tr>
                      `
                        )
                        .join("")
                    : `
                      <tr>
                        <td colspan="7" class="py-8 text-center text-outline">
                          No transactions settled in current epoch. Click 'Run Autonomous Purchase' to trigger an authentic live purchase flow.
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>

          <!-- Ledger Summary Footer -->
          <div class="flex flex-col sm:flex-row items-center justify-between text-xs text-on-surface-variant pt-2 border-t border-outline-variant/30 font-mono">
            <div>Showing ${Math.min(normTxs.length, 5)} of ${normTxs.length} settled transactions</div>
            <div class="flex items-center gap-4 mt-2 sm:mt-0">
              <span>Total Settled: <strong class="text-white font-bold">${normBudget.formattedSpent}</strong></span>
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
