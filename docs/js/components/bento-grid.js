/**
 * dashboard/public/js/components/bento-grid.js
 *
 * Aceternity UI BentoGrid Component (BentoGridThirdDemo)
 * ========================================================
 * Ported for W3A-1 Autonomous Safe-Spend Protocol Deck.
 * Replaces generic filler items with live cybernetic protocol telemetry:
 *   - Item 1: Total Authorized Escrow Vault (SkeletonOne: layered typed envelopes)
 *   - Item 2: Settled Spend & Wire Velocity (SkeletonTwo: multi-tier wire streaming)
 *   - Item 3: Spending Ceiling Invariant (SkeletonThree: pulsing gradient invariant radar)
 *   - Item 4 (col-span-2): Autonomous Pareto Engine (SkeletonFour: candidate comparison)
 *   - Item 5: Budget Utilization & Epoch Window (SkeletonFive: circular telemetry dial)
 */

(function() {
  function cn(...classes) {
    return classes.filter(Boolean).join(" ");
  }

  const BentoGridComponent = {
    cn,

    /**
     * Outer BentoGrid container
     */
    BentoGrid({ className = "", children = "" } = {}) {
      return `
        <div class="${cn(
          "grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto md:auto-rows-[19.5rem]",
          className
        )}">
          ${children}
        </div>
      `;
    },

    /**
     * BentoGridItem item wrapper
     */
    BentoGridItem({
      title = "",
      description = "",
      header = "",
      className = "",
      icon = "",
      id = ""
    } = {}) {
      return `
        <div
          ${id ? `id="${id}"` : ""}
          class="${cn(
            "row-span-1 rounded-2xl group/bento hover:shadow-2xl transition duration-300 p-5 bg-surface-low/90 border border-white/[0.08] hover:border-cyan-500/50 justify-between flex flex-col space-y-3 relative overflow-hidden backdrop-blur-md",
            className
          )}"
        >
          <!-- Ambient Hover Glow -->
          <div class="absolute -right-16 -top-16 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl group-hover/bento:bg-cyan-500/20 transition-all duration-500 pointer-events-none"></div>

          <!-- Header / Skeleton -->
          <div class="flex-1 w-full min-h-[8rem] rounded-xl overflow-hidden relative flex flex-col justify-center">
            ${header}
          </div>

          <!-- Content Footer -->
          <div class="group-hover/bento:translate-x-2 transition duration-200 relative z-10">
            <div class="flex items-center gap-2 mb-1">
              ${icon}
              <div class="font-headline font-bold text-white text-base tracking-tight">
                ${title}
              </div>
            </div>
            <div class="font-mono text-xs text-on-surface-variant leading-relaxed">
              ${description}
            </div>
          </div>
        </div>
      `;
    },

    /**
     * SkeletonOne: Layered animated EIP-712 typed envelopes & vault escrow
     */
    SkeletonOne({ totalEscrow = "$30.00 USDC", vaultAddress = "0xe7f1...0512" } = {}) {
      return `
        <div class="w-full h-full p-2 flex flex-col justify-center items-center gap-2 relative select-none bg-dot-grid">
          <!-- Ambient Glow Orb -->
          <div class="absolute w-24 h-24 bg-cyan-500/15 rounded-full blur-xl pointer-events-none"></div>

          <!-- Card 1 (Top Layer): Translates right & tilts +3deg on hover -->
          <div class="w-full max-w-[17rem] p-2 rounded-lg bg-surface-container/90 border border-cyan-500/30 flex items-center justify-between text-[11px] font-mono shadow-md bento-tilt-right transition-transform duration-300">
            <div class="flex items-center gap-1.5 text-cyan-300">
              <span class="material-symbols-outlined text-xs">key</span>
              <span class="font-bold">EIP-712 Envelope</span>
            </div>
            <span class="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">SEALED</span>
          </div>

          <!-- Card 2 (Center Layer): Primary Escrow Balance + Quick Top-Up -->
          <div class="w-full max-w-[17.5rem] p-3 rounded-xl bg-surface-highest/95 border border-primary/40 flex items-center justify-between shadow-xl bento-elevate transition-transform duration-300 relative z-10">
            <div>
              <div class="text-[9px] font-mono uppercase font-bold text-outline">ALLOCATED ESCROW</div>
              <div class="font-headline text-lg font-bold text-white font-mono tracking-tight">${totalEscrow}</div>
            </div>
            <button
              onclick="App.openFundModal()"
              class="px-2.5 py-1 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 font-mono text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer glow-cyan"
            >
              <span class="material-symbols-outlined text-xs">add</span>
              <span>TOP UP</span>
            </button>
          </div>

          <!-- Card 3 (Bottom Layer): Translates left & tilts -3deg on hover -->
          <div class="w-full max-w-[17rem] p-2 rounded-lg bg-surface-container/80 border border-outline-variant/30 flex items-center justify-between text-[10px] font-mono text-outline shadow-md bento-tilt-left transition-transform duration-300">
            <span>Vault: <span class="text-primary">${vaultAddress}</span></span>
            <span class="text-[9px] text-tertiary font-bold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              ACTIVE
            </span>
          </div>
        </div>
      `;
    },

    /**
     * SkeletonTwo: Multi-tier progressive wire protocol velocity streams
     */
    SkeletonTwo({ settledSpend = "$4.00 USDC", txCount = 5, avgTx = "0.80 USDC" } = {}) {
      return `
        <div class="w-full h-full p-2.5 flex flex-col justify-center gap-2 font-mono text-xs select-none">
          <!-- Metric Highlight Header -->
          <div class="flex items-baseline justify-between mb-1">
            <span class="font-headline text-xl font-bold text-secondary font-mono">${settledSpend}</span>
            <span class="text-[10px] text-outline">${txCount} purchases &bull; avg ${avgTx}</span>
          </div>

          <!-- Tier 1: x402 Challenge -->
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

          <!-- Tier 2: EIP-712 Secp256k1 Signature -->
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

          <!-- Tier 3: EVM On-Chain Settlement -->
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
      `;
    },

    /**
     * SkeletonThree: Pulsing gradient invariant radar shield ($5.00 ceiling defense)
     */
    SkeletonThree({ remainingAllowance = "$26.00 USDC", ceiling = "$5.00" } = {}) {
      return `
        <div class="w-full h-full rounded-xl relative flex flex-col items-center justify-center overflow-hidden p-3 bg-gradient-to-br from-amber-500/10 via-surface-lowest to-tertiary/10 border border-outline-variant/20">
          <!-- Animated Radial Radar Rings -->
          <div class="absolute w-36 h-36 rounded-full border border-tertiary/20 animate-ping opacity-25 pointer-events-none"></div>
          <div class="absolute w-24 h-24 rounded-full border border-amber-400/30 pointer-events-none"></div>

          <!-- Central Shield Icon with Pulsing Beacon -->
          <div class="w-10 h-10 rounded-2xl bg-tertiary/20 border border-tertiary/50 flex items-center justify-center glow-emerald mb-1.5 relative z-10">
            <span class="material-symbols-outlined text-tertiary text-xl">verified_user</span>
          </div>

          <!-- Dynamic Remaining Value -->
          <div class="font-headline text-xl font-bold text-tertiary font-mono tracking-tight relative z-10">
            ${remainingAllowance}
          </div>

          <!-- Hard-Cap Invariant Pill -->
          <div class="mt-1 px-2.5 py-0.5 rounded-full bg-surface-highest/90 border border-amber-400/40 text-[10px] font-mono text-amber-300 flex items-center gap-1 relative z-10 shadow-lg">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>STRICT HARD-CAP: ${ceiling} MAX</span>
          </div>
        </div>
      `;
    },

    /**
     * SkeletonFour: Wide Pareto Comparison Canvas (md:col-span-2)
     * Demonstrates AI agent multi-objective selection & defense against overspend.
     */
    SkeletonFour() {
      return `
        <div class="w-full h-full p-2 flex flex-col justify-center gap-2 select-none">
          <!-- Sub-header telemetry badge -->
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

          <!-- Candidate Cards Row (3-column comparison inside the span-2 box) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <!-- Candidate 1: Alpha Translate (Optimal Pareto - SELECTED) -->
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

            <!-- Candidate 2: Beta Neural (Standby Backup) -->
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

            <!-- Candidate 3: Rogue / Malicious Provider (BLOCKED > $5 CEILING) -->
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
      `;
    },

    /**
     * SkeletonFive: Budget Utilization Circular Dial & Nonce Replay Guard
     */
    SkeletonFive({ utilizationPercent = "20.0", unspentPercent = "80.0" } = {}) {
      const utilNum = parseFloat(utilizationPercent) || 0;
      const strokeDash = Math.round((utilNum / 100) * 126);

      return `
        <div class="w-full h-full p-2 flex items-center justify-around select-none">
          <!-- Circular SVG Progress Ring -->
          <div class="relative w-20 h-20 flex items-center justify-center shrink-0">
            <svg class="w-20 h-20 -rotate-90 transform" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                stroke-width="4"
                class="text-surface-highest"
                fill="none"
              ></circle>
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                stroke-width="4"
                stroke-dasharray="126"
                stroke-dashoffset="${126 - strokeDash}"
                stroke-linecap="round"
                class="text-cyan-400 transition-all duration-700 glow-cyan"
                fill="none"
              ></circle>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="font-headline font-bold text-white text-xs font-mono">${utilNum.toFixed(0)}%</span>
              <span class="text-[8px] font-mono text-outline uppercase">USED</span>
            </div>
          </div>

          <!-- Replay Guard & Epoch Stats -->
          <div class="flex flex-col gap-1.5 font-mono">
            <div class="text-[10px] text-tertiary font-bold flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
              <span>${unspentPercent}% Unspent</span>
            </div>
            <div class="text-[10px] text-outline">
              Epoch: <span class="text-white font-semibold">Rolling Block</span>
            </div>
            <div class="px-2 py-0.5 rounded bg-surface-highest border border-outline-variant/30 text-[9px] text-cyan-300 font-bold">
              NONCE GUARD: PASS
            </div>
          </div>
        </div>
      `;
    },

    /**
     * BentoGridThirdDemo: Main Composite Deck
     */
    BentoGridThirdDemo({
      normBudget = {},
      normTxs = [],
      enforcerAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
    } = {}) {
      const formattedTotal = normBudget.formattedTotal || "$30.00 USDC";
      const formattedSpent = normBudget.formattedSpent || "$4.00 USDC";
      const formattedRemaining = normBudget.formattedRemaining || "$26.00 USDC";
      const utilizationPercent = normBudget.utilizationPercent || "20.0";
      const unspentPercent = (100 - parseFloat(utilizationPercent)).toFixed(1);
      const txCount = normTxs.length || 0;
      const avgTx = txCount > 0
        ? (parseFloat(normBudget.settledSpend || normBudget.spent || 0) / txCount).toFixed(2) + " USDC"
        : "0.80 USDC";

      const items = [
        // Item 1: Escrow Vault
        {
          title: formattedTotal + " Authorized Escrow",
          description: "Allocated via Smart Contract Vault (" + (enforcerAddress ? enforcerAddress.slice(0, 6) + "..." + enforcerAddress.slice(-4) : "0xe7f1...0512") + "). Micro-invoices verified via EIP-712 typed envelopes.",
          header: this.SkeletonOne({ totalEscrow: formattedTotal, vaultAddress: enforcerAddress ? enforcerAddress.slice(0, 6) + "..." + enforcerAddress.slice(-4) : "0xe7f1...0512" }),
          className: "md:col-span-1",
          icon: '<span class="material-symbols-outlined text-cyan-400 text-lg">account_balance_wallet</span>'
        },
        // Item 2: Settled Spend Wire Stream
        {
          title: formattedSpent + " Settled Spend (24H)",
          description: "Across " + txCount + " autonomous purchases. Real-time x402 wire protocol streaming with zero human delay.",
          header: this.SkeletonTwo({ settledSpend: formattedSpent, txCount: txCount, avgTx: avgTx }),
          className: "md:col-span-1",
          icon: '<span class="material-symbols-outlined text-emerald-400 text-lg">query_stats</span>'
        },
        // Item 3: Spending Ceiling Defense
        {
          title: formattedRemaining + " Remaining Allowance",
          description: "Strict Hard-Cap Active: $5.00 max per call. Cryptographically enforced before signature release.",
          header: this.SkeletonThree({ remainingAllowance: formattedRemaining, ceiling: "$5.00" }),
          className: "md:col-span-1",
          icon: '<span class="material-symbols-outlined text-amber-400 text-lg">verified_user</span>'
        },
        // Item 4: Autonomous Pareto Provider Selection (span-2)
        {
          title: "Autonomous Pareto Provider Arbitrage",
          description: "AI agent dynamically ranks latency, price & quality on the Pareto frontier. Overspending proposals are rejected deterministically before signature generation.",
          header: this.SkeletonFour(),
          className: "md:col-span-2",
          icon: '<span class="material-symbols-outlined text-purple-400 text-lg">psychology</span>'
        },
        // Item 5: Budget Utilization & Security Guard
        {
          title: utilizationPercent + "% Budget Utilization",
          description: unspentPercent + "% unspent reserve. Rolling block window ensures automatic replay protection with deterministic nonces.",
          header: this.SkeletonFive({ utilizationPercent: utilizationPercent, unspentPercent: unspentPercent }),
          className: "md:col-span-1",
          icon: '<span class="material-symbols-outlined text-blue-400 text-lg">pie_chart</span>'
        }
      ];

      const children = items
        .map((item, i) =>
          this.BentoGridItem({
            title: item.title,
            description: item.description,
            header: item.header,
            className: item.className,
            icon: item.icon,
            id: "bento-item-" + i
          })
        )
        .join("");

      return this.BentoGrid({
        className: "md:auto-rows-[19.5rem]",
        children: children
      });
    }
  };

  if (typeof window !== "undefined") {
    window.BentoGrid = BentoGridComponent;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = BentoGridComponent;
  }
})();
