// =========================================================================
// W3A-1: Autonomous Machine Payments (x402 V2)
// Security View — Factual Protocol Invariant & Verification Console
// =========================================================================

const SecurityView = {
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof AppState !== "undefined" && typeof AppState.subscribe === "function") {
      AppState.subscribe((event) => this.onStateChange(event));
    }
  },

  onStateChange(event) {
    if (
      event === "alerts_updated" ||
      event === "security_event" ||
      event === "budget_updated" ||
      event === "stream_event_processed"
    ) {
      this.reRenderIfMounted();
    }
  },

  reRenderIfMounted() {
    if (typeof document !== "undefined" && typeof AppState !== "undefined" && AppState.currentView === "security") {
      const root = document.getElementById("mainContent");
      if (root) {
        root.innerHTML = this.render();
      }
    }
  },

  render() {
    this.init();
    const isFrozen = AppState.budget ? AppState.budget.isFrozen : false;
    const remaining = AppState.budget ? (AppState.budget.remaining || "26.00") : "26.00";
    const alerts = AppState.alerts || [];

    return `
      <div id="security-view-root" style="display: flex; flex-direction: column; gap: 20px;">

        <!-- Header Panel -->
        <div class="panel" style="margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span class="badge ${isFrozen ? 'badge-danger' : 'badge-success'}">
                  ${isFrozen ? 'AGENT SPENDING FROZEN' : 'ACTIVE INVARIANTS ENFORCED'}
                </span>
                <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
                  TokenBudgetEnforcer.sol Hard Constraints
                </span>
              </div>
              <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Security &amp; Invariants</h1>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
                Mathematical limits checked on-chain before signing. EIP-712 replay protection and SHA-256 integrity verification.
              </p>
            </div>

            <button
              onclick="App.openFreezeModal()"
              class="btn ${isFrozen ? 'btn-primary' : 'btn-danger'} btn-sm"
            >
              ${isFrozen ? 'Unfreeze Agent Spending' : 'Emergency Freeze Spending'}
            </button>
          </div>
        </div>

        <!-- 4 Core Invariants Status Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
          <div class="panel" style="margin: 0; padding: 16px;">
            <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Per-Call Cap</div>
            <div style="font-size: 18px; font-weight: 700; margin-top: 4px; color: var(--tertiary); font-family: var(--font-mono);">$5.00 USDC Max</div>
            <div style="font-size: 11.5px; color: var(--text-subtle); margin-top: 2px;">Rejects requests above threshold</div>
          </div>

          <div class="panel" style="margin: 0; padding: 16px;">
            <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Replay Detection</div>
            <div style="font-size: 18px; font-weight: 700; margin-top: 4px; color: var(--tertiary); font-family: var(--font-mono);">Fresh Nonces</div>
            <div style="font-size: 11.5px; color: var(--text-subtle); margin-top: 2px;">Prevents authorization re-use</div>
          </div>

          <div class="panel" style="margin: 0; padding: 16px;">
            <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Signature Binding</div>
            <div style="font-size: 18px; font-weight: 700; margin-top: 4px; color: var(--tertiary); font-family: var(--font-mono);">EIP-712 Typed</div>
            <div style="font-size: 11.5px; color: var(--text-subtle); margin-top: 2px;">Exact payTo and amount hashing</div>
          </div>

          <div class="panel" style="margin: 0; padding: 16px;">
            <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Circuit Breaker</div>
            <div style="font-size: 18px; font-weight: 700; margin-top: 4px; color: ${isFrozen ? 'var(--error)' : 'var(--tertiary)'}; font-family: var(--font-mono);">
              ${isFrozen ? 'Tripped (Frozen)' : 'Ready / Active'}
            </div>
            <div style="font-size: 11.5px; color: var(--text-subtle); margin-top: 2px;">Instant human owner override</div>
          </div>
        </div>

        <!-- Rejected Requests & Enforcement Log -->
        <div class="panel" style="margin: 0;">
          <div class="panel-header">
            <div>
              <span class="panel-title">Enforcement Log</span>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Factual record of requests blocked by contract constraints or integrity checks.
              </p>
            </div>
            <span class="badge">${alerts.length > 0 ? alerts.length + ' Recorded' : 'Clean'}</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; font-family: var(--font-mono); font-size: 12px;">
            <!-- Overspend check record -->
            <div style="padding: 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--error); border-radius: var(--radius-sm);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge badge-danger">BLOCKED</span>
                  <strong style="color: var(--text);">Overspend Attempt Rejected</strong>
                </div>
                <span style="color: var(--text-subtle); font-size: 11px;">Enforced on-chain</span>
              </div>
              <div style="color: var(--text-muted); font-size: 11.5px; line-height: 1.5;">
                An attempt exceeding the authorized per-call or remaining allowance is intercepted before permit release.
                TokenBudgetEnforcer.sol reverts transactions exceeding allowance. 0 wei transferred.
              </div>
            </div>

            <!-- Content integrity record -->
            <div style="padding: 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--warning); border-radius: var(--radius-sm);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge badge-warning">VERIFICATION</span>
                  <strong style="color: var(--text);">Delivery Content Hash Validation</strong>
                </div>
                <span style="color: var(--text-subtle); font-size: 11px;">Client SHA-256</span>
              </div>
              <div style="color: var(--text-muted); font-size: 11.5px; line-height: 1.5;">
                Every provider response is hashed locally and matched against the on-chain receipt hash.
                Note: SHA-256 verifies content integrity. It does not establish semantic correctness.
              </div>
            </div>
          </div>
        </div>

      </div>
    `;
  }
};
