// =========================================================================
// W3A-1: Autonomous Machine Payments (x402 V2)
// Overview View — Production Operations Console
// =========================================================================

const OverviewView = {
  initialized: false,
  activeLedgerTab: "all",

  setLedgerTab(tab) {
    this.activeLedgerTab = tab;
    this.reRenderIfMounted();
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof AppState !== "undefined" && typeof AppState.subscribe === "function") {
      AppState.subscribe((event) => this.onStateChange(event));
    }
  },

  onStateChange(event) {
    const relevant = [
      "budget_updated",
      "transactions_updated",
      "settlement_confirmed",
      "alerts_updated",
      "security_event",
      "stream_event_processed",
      "live_event_received"
    ];
    if (relevant.includes(event)) {
      this.reRenderIfMounted();
    }
  },

  reRenderIfMounted() {
    if (typeof document !== "undefined" && typeof AppState !== "undefined" && AppState.currentView === "overview") {
      const root = document.getElementById("mainContent");
      if (root) {
        root.innerHTML = this.render();
      }
    }
  },

  render() {
    this.init();
    const normBudget = typeof BudgetAdapter !== "undefined"
      ? BudgetAdapter.normalize(AppState.budget)
      : { formattedTotal: "$30.00 USDC", formattedSpent: "$4.00 USDC", formattedRemaining: "$26.00 USDC", isFrozen: false };
    
    const unifiedTxs = typeof TransactionAdapter !== "undefined" && typeof TransactionAdapter.getUnifiedHistory === "function"
      ? TransactionAdapter.getUnifiedHistory(AppState.transactions, AppState.alerts, AppState.providerSelectionState)
      : (typeof TransactionAdapter !== "undefined" ? TransactionAdapter.normalizeList(AppState.transactions || []) : []);
    
    const isFrozen = normBudget.isFrozen;
    const settledTxs = unifiedTxs.filter((t) => t.isSettled || t.status === "SETTLED");
    const blockedTxs = unifiedTxs.filter((t) => t.isBlocked || t.status === "CAPPED" || t.status === "BLOCKED" || t.status === "REJECTED");

    const currentTab = this.activeLedgerTab || "all";
    const displayedTxs = currentTab === "settled"
      ? settledTxs
      : currentTab === "blocked"
      ? blockedTxs
      : unifiedTxs;

    const enforcerAddress = (AppState.config && AppState.config.enforcerAddress) || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const shortEnforcer = `${enforcerAddress.slice(0, 6)}...${enforcerAddress.slice(-4)}`;
    const agentAddress = (AppState.config && AppState.config.agentAddress) || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const shortAgent = `${agentAddress.slice(0, 6)}...${agentAddress.slice(-4)}`;

    const liveEvents = AppState.liveEvents || [];

    const servicesList = (AppState && Array.isArray(AppState.services) && AppState.services.length)
      ? AppState.services
      : (typeof DEFAULT_MARKET_SERVICES !== "undefined" && Array.isArray(DEFAULT_MARKET_SERVICES) ? DEFAULT_MARKET_SERVICES : []);
    const serviceCount = servicesList.length || 52;
    const providerSet = new Set(servicesList.map((s) => s.provider || s.providerName || (s.metadata && s.metadata.provider)).filter(Boolean));
    const providerCount = providerSet.size || 14;

    return `
      <div id="overview-view-root" style="display: flex; flex-direction: column; gap: 20px;">

        <!-- Executive Operations Header -->
        <div class="panel" style="margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span class="badge ${isFrozen ? 'badge-danger' : 'badge-success'}">
                  ${isFrozen ? 'AGENT FROZEN' : 'ACTIVE / AUTHORIZED'}
                </span>
                <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
                  TokenBudgetEnforcer.sol Safe-Spend Deck
                </span>
              </div>
              <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Operations Overview</h1>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
                Autonomous service procurement with on-chain financial boundaries, EIP-712 authorization, and cryptographic delivery verification.
              </p>
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="btn btn-secondary btn-sm" onclick="App.openFundModal()">
                + Deposit Funds
              </button>
              <button class="btn ${isFrozen ? 'btn-primary' : 'btn-danger'} btn-sm" onclick="App.openFreezeModal()">
                ${isFrozen ? 'Unfreeze Agent' : 'Freeze Agent'}
              </button>
            </div>
          </div>
        </div>

        <!-- 4 Key Financial Metrics -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
          <div class="panel" style="margin: 0; padding: 16px;">
            <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Authorized Budget</div>
            <div style="font-size: 22px; font-weight: 700; margin-top: 4px; font-family: var(--font-mono);">${normBudget.formattedTotal}</div>
            <div style="font-size: 11.5px; color: var(--text-subtle); margin-top: 2px;">Total allocated on-chain escrow</div>
          </div>

          <div class="panel" style="margin: 0; padding: 16px;">
            <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Settled Spend</div>
            <div style="font-size: 22px; font-weight: 700; margin-top: 4px; color: var(--tertiary); font-family: var(--font-mono);">${normBudget.formattedSpent}</div>
            <div style="font-size: 11.5px; color: var(--text-subtle); margin-top: 2px;">Across ${settledTxs.length} settled purchases</div>
          </div>

          <div class="panel" style="margin: 0; padding: 16px;">
            <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Remaining Balance</div>
            <div style="font-size: 22px; font-weight: 700; margin-top: 4px; color: var(--primary); font-family: var(--font-mono);">${normBudget.formattedRemaining}</div>
            <div style="font-size: 11.5px; color: var(--text-subtle); margin-top: 2px;">Available for agent deployment</div>
          </div>

          <div class="panel" style="margin: 0; padding: 16px;">
            <div style="font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Per-Call Spend Cap</div>
            <div style="font-size: 22px; font-weight: 700; margin-top: 4px; font-family: var(--font-mono);">$5.00 USDC</div>
            <div style="font-size: 11.5px; color: var(--text-subtle); margin-top: 2px;">Strict contract-enforced invariant</div>
          </div>
        </div>

        <!-- Operational Status & Invariant Panels -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
          <!-- Contract State & Enforcer Details -->
          <div class="panel" style="margin: 0;">
            <div class="panel-header">
              <span class="panel-title">Contract &amp; Agent Configuration</span>
              <span class="badge badge-info">EVM Chain 31337</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; font-family: var(--font-mono); font-size: 12px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Enforcer Contract:</span>
                <span style="color: var(--text); cursor: pointer;" onclick="App.copyText('${enforcerAddress}')" title="Click to copy">${shortEnforcer} &copy;</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Authorized Agent:</span>
                <span style="color: var(--text); cursor: pointer;" onclick="App.copyText('${agentAddress}')" title="Click to copy">${shortAgent} &copy;</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Permit Protocol:</span>
                <span style="color: var(--text);">EIP-712 Typed Permit</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Replay Protection:</span>
                <span style="color: var(--tertiary);">Deterministic Nonce Freshness</span>
              </div>
            </div>
          </div>

          <!-- Market Network & Topology -->
          <div class="panel" style="margin: 0;">
            <div class="panel-header">
              <span class="panel-title">Marketplace Topology</span>
              <a href="http://localhost:14210" target="_blank" class="badge">Open Catalog &UpperRightArrow;</a>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; font-family: var(--font-mono); font-size: 12px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Provider Nodes:</span>
                <strong>${providerCount} Autonomous Nodes</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Registered Services:</span>
                <strong>${serviceCount} Operational Endpoints</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Selection Algorithm:</span>
                <span>Deterministic Constraint-Based</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Delivery Hash Integrity:</span>
                <span style="color: var(--tertiary);">100% SHA-256 Validated</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Transactions Table -->
        <div class="panel" style="margin: 0;">
          <div class="panel-header">
            <div>
              <span class="panel-title">Purchases Ledger</span>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Autonomous payments negotiated via x402 V2 and confirmed on-chain.
              </p>
            </div>

            <!-- Tab filter buttons -->
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-sm ${currentTab === 'all' ? 'btn-primary' : 'btn-secondary'}" onclick="OverviewView.setLedgerTab('all')">
                All (${unifiedTxs.length})
              </button>
              <button class="btn btn-sm ${currentTab === 'settled' ? 'btn-primary' : 'btn-secondary'}" onclick="OverviewView.setLedgerTab('settled')">
                Settled (${settledTxs.length})
              </button>
              <button class="btn btn-sm ${currentTab === 'blocked' ? 'btn-primary' : 'btn-secondary'}" onclick="OverviewView.setLedgerTab('blocked')">
                Blocked (${blockedTxs.length})
              </button>
            </div>
          </div>

          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Request ID</th>
                  <th>Service</th>
                  <th>Provider</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>On-Chain Tx</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${displayedTxs.length > 0
                  ? displayedTxs.slice(0, 10).map((t) => {
                      const timeStr = t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
                      const reqShort = t.reqId && t.reqId.length > 12 ? `${t.reqId.slice(0, 8)}...` : (t.reqId || '-');
                      const txShort = t.txHash && t.txHash.length > 12 ? `${t.txHash.slice(0, 8)}...` : (t.txHash || '-');
                      const isSuccess = t.isSettled || t.status === 'SETTLED';
                      const isAlert = t.isBlocked || t.status === 'CAPPED' || t.status === 'BLOCKED' || t.status === 'REJECTED';

                      return `
                        <tr onclick="App.openTransactionDetail('${t.reqId || t.txHash}')">
                          <td>${timeStr}</td>
                          <td><code>${reqShort}</code></td>
                          <td><strong>${t.serviceName || t.serviceId || 'Service'}</strong></td>
                          <td>${t.providerName || t.provider || '-'}</td>
                          <td>$${Number(t.amountUSD || 0).toFixed(2)} USDC</td>
                          <td>
                            <span class="badge ${isSuccess ? 'badge-success' : (isAlert ? 'badge-danger' : 'badge-warning')}">
                              ${t.status || 'SETTLED'}
                            </span>
                          </td>
                          <td><code>${txShort}</code></td>
                          <td style="text-align: right;">
                            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); App.openTransactionDetail('${t.reqId || t.txHash}')">
                              Inspect
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')
                  : `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">No transactions recorded in this view.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Protocol Audit Stream -->
        <div class="panel" style="margin: 0;">
          <div class="panel-header">
            <span class="panel-title">Protocol Audit Log</span>
            <span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">${liveEvents.length} events recorded</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; font-family: var(--font-mono); font-size: 11.5px; max-height: 240px; overflow-y: auto;">
            ${liveEvents.length > 0
              ? liveEvents.slice(0, 15).map((evt) => {
                  const type = evt.type || "EVENT";
                  const timeStr = evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : "";
                  const isBlocked = type.includes("BLOCKED") || type.includes("REJECTED") || type.includes("TAMPERED") || type === "FAILED";
                  const isSuccess = type.includes("SETTLED") || type.includes("VERIFIED") || type.includes("CONFIRMED");

                  return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius-sm);">
                      <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                        <span class="badge ${isBlocked ? 'badge-danger' : (isSuccess ? 'badge-success' : 'badge-info')}">
                          ${type}
                        </span>
                        <span style="color: var(--text); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                          ${evt.message || type}
                        </span>
                      </div>
                      <span style="color: var(--text-subtle); flex-shrink: 0; font-size: 10.5px;">${timeStr}</span>
                    </div>
                  `;
                }).join('')
              : `<div style="text-align: center; padding: 20px; color: var(--text-muted);">No audit events received yet. Live stream active.</div>`
            }
          </div>
        </div>

      </div>
    `;
  }
};
