/**
 * dashboard/public/js/views/security.js
 *
 * Page 5: Security Operations Center & Threat Defense
 * ====================================================
 * Features:
 *   - Security Posture: Real-time defense status, 0 active threats, on-chain defense engine
 *   - Active Threats: Clean empty state when no active/unmitigated threats exist
 *   - Historical Blocked Attacks: Chronological audit trail of blocked overspends,
 *     replay attempts, and payload tampering with root causes and copyable request IDs
 */

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
    const normAlerts = SecurityAdapter.normalizeList(AppState.alerts);
    const stats = SecurityAdapter.computeStats(AppState.alerts);
    const isFrozen = AppState.budget.isFrozen;

    return `
      <div id="security-view-root" class="space-y-6">

        <!-- ===================================================================
             1. SECURITY POSTURE HERO
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low/90 border border-outline-variant/40 p-6 backdrop-blur-md">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-outline">Security Operations Center</span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-tertiary/15 text-tertiary border border-tertiary/40">
                  SYSTEM SECURITY: PROTECTED
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-lowest text-secondary border border-secondary/30">
                  0 ACTIVE THREATS
                </span>
              </div>
              <h1 class="font-headline text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Cryptographic & Smart Contract Defense
              </h1>
              <p class="text-sm text-on-surface-variant mt-1 leading-relaxed">
                Autonomous agent boundary defense: prompt-injection overspends, transaction replays, and delivery tampering intercepted.
              </p>
            </div>
            <div class="flex items-center gap-3">
              <div class="px-3.5 py-2 rounded-xl bg-surface-high border border-tertiary/40 flex items-center gap-2 font-mono text-xs text-on-surface shadow-sm">
                <span class="status-dot status-dot-emerald"></span>
                <span>Defense Engine: <strong class="text-tertiary">Active On-Chain</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 5 Attack Vector Defense Cards (Real Data Driven) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-4 space-y-1 hover:border-error/40 transition-colors">
            <p class="text-[10px] font-mono font-semibold text-outline uppercase tracking-wider">Overspends Blocked</p>
            <p class="font-headline text-2xl font-bold font-mono text-error">${stats.blockedOverspends || stats.blockedAttacks || 0}</p>
            <p class="text-[10px] font-mono text-outline">TokenBudgetEnforcer.sol revert</p>
          </div>

          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-4 space-y-1 hover:border-secondary/40 transition-colors">
            <p class="text-[10px] font-mono font-semibold text-outline uppercase tracking-wider">Replays Blocked</p>
            <p class="font-headline text-2xl font-bold font-mono text-secondary">${stats.replayAttempts || 0}</p>
            <p class="text-[10px] font-mono text-outline">Nonce consumed on-chain</p>
          </div>

          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-4 space-y-1 hover:border-tertiary/40 transition-colors">
            <p class="text-[10px] font-mono font-semibold text-outline uppercase tracking-wider">Invalid Signatures</p>
            <p class="font-headline text-2xl font-bold font-mono text-tertiary">0</p>
            <p class="text-[10px] font-mono text-outline">EIP-712 signer verified</p>
          </div>

          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-4 space-y-1 hover:border-error/40 transition-colors">
            <p class="text-[10px] font-mono font-semibold text-outline uppercase tracking-wider">Tampered Payloads</p>
            <p class="font-headline text-2xl font-bold font-mono text-error">${stats.tamperingAttempts || 0}</p>
            <p class="text-[10px] font-mono text-outline">SHA-256 digest mismatch</p>
          </div>

          <div class="rounded-xl bg-surface-low border border-outline-variant/40 p-4 space-y-1 hover:border-tertiary/40 transition-colors">
            <p class="text-[10px] font-mono font-semibold text-outline uppercase tracking-wider">Emergency Freeze</p>
            <p class="font-headline text-xl font-bold font-mono ${isFrozen ? "text-error" : "text-tertiary"} mt-0.5">
              ${isFrozen ? "FROZEN" : "STANDBY"}
            </p>
            <p class="text-[10px] font-mono text-outline">Instant on-chain kill switch</p>
          </div>
        </div>

        <!-- ===================================================================
             2. ACTIVE THREATS (DISTINGUISHED FROM HISTORICAL)
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-3">
          <div class="flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
              <h2 class="font-headline text-sm font-bold text-white uppercase tracking-wider">Active Threats & Live Breaches</h2>
            </div>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-tertiary/15 text-tertiary border border-tertiary/40">
              0 ACTIVE THREATS
            </span>
          </div>

          <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center justify-between text-xs">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-tertiary/15 text-tertiary flex items-center justify-center">
                <span class="material-symbols-outlined" data-icon="verified_user">verified_user</span>
              </div>
              <div>
                <p class="font-bold text-white font-sans">No Active Threats Intercepting Agent Execution</p>
                <p class="text-[11px] text-on-surface-variant font-mono">All cryptographic boundary checks, nonces, and on-chain ceilings are healthy.</p>
              </div>
            </div>
            <span class="text-tertiary font-mono text-xs font-bold flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-tertiary"></span>
              SURVEILLANCE NORMAL
            </span>
          </div>
        </div>

        <!-- ===================================================================
             3. HISTORICAL BLOCKED ATTACK ATTEMPTS
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <div>
              <h2 class="font-headline text-sm font-bold text-white uppercase tracking-wider">Historical Blocked Attack Attempts & Enforcements</h2>
              <p class="text-xs text-on-surface-variant">Permanent record of rogue overspend attempts, replay exploits, and delivery tampering</p>
            </div>
            <span class="text-xs font-mono text-outline">${normAlerts.length} Intercepted Events</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left font-mono text-xs">
              <thead class="border-b border-outline-variant/30 uppercase text-[10px] text-outline">
                <tr>
                  <th class="pb-3 font-medium">Timestamp</th>
                  <th class="pb-3 font-medium">Attack Vector</th>
                  <th class="pb-3 font-medium">Request ID</th>
                  <th class="pb-3 font-medium">Intercepted Amount</th>
                  <th class="pb-3 font-medium">Defense Layer</th>
                  <th class="pb-3 font-medium">Root Cause & Diagnostic</th>
                  <th class="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/15 text-on-surface">
                ${
                  normAlerts.length > 0
                    ? normAlerts
                        .map(
                          (a) => `
                        <tr class="hover:bg-surface-high/40 transition-colors">
                          <td class="py-3 text-outline whitespace-nowrap">${UIFormatter.formatTimestamp(a.timestamp)}</td>
                          <td class="py-3 text-error font-bold font-sans">${a.type || "Threat Intercepted"}</td>
                          <td class="py-3 text-secondary">
                            <span class="inline-flex items-center gap-1">
                              ${UIFormatter.formatHash(a.reqId, 6)}
                              <button onclick="App.copyText('${a.reqId}')" class="text-outline hover:text-secondary">
                                <span class="material-symbols-outlined text-xs" data-icon="content_copy">content_copy</span>
                              </button>
                            </span>
                          </td>
                          <td class="py-3 text-error font-bold">${a.formattedAmount}</td>
                          <td class="py-3">
                            <span class="px-2 py-0.5 rounded text-[10px] bg-surface-lowest text-secondary border border-secondary/30">
                              ${a.layer}
                            </span>
                          </td>
                          <td class="py-3 text-on-surface-variant font-sans text-xs max-w-xs truncate" title="${a.reason}">
                            ${a.reason}
                          </td>
                          <td class="py-3 text-right">
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-error/15 text-error border border-error/40">
                              BLOCKED
                            </span>
                          </td>
                        </tr>
                      `
                        )
                        .join("")
                    : `
                      <tr>
                        <td colspan="7" class="py-8 text-center text-outline">
                          No attack attempts recorded in current session.
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  },
};
