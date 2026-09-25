// =========================================================================
// W3A-1: Autonomous Machine Payments (x402 V2)
// Transactions View — Clean Operations Spending Ledger
// =========================================================================

const TransactionsView = {
  activeFilter: "All Purchases",
  searchQuery: "",
  viewMode: "table", // "table" | "cards"
  isLoading: false,
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
      event === "transactions_updated" ||
      event === "settlement_confirmed" ||
      event === "alerts_updated" ||
      event === "stream_event_processed"
    ) {
      this.reRender();
    }
  },

  setFilter(filterId) {
    if (this.activeFilter === filterId) return;
    this.activeFilter = filterId;
    this.reRender();
  },

  setSearch(query) {
    this.searchQuery = (query || "").trim();
    this.reRender();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    this.reRender();
  },

  reRender() {
    if (typeof document !== "undefined" && typeof AppState !== "undefined" && (AppState.currentView === "transactions" || AppState.currentView === "purchases")) {
      const root = document.getElementById("mainContent");
      if (root) {
        root.innerHTML = this.render();
      }
    }
  },

  exportCSV() {
    const rawTxs = AppState.transactions || [];
    const rawAlerts = AppState.alerts || [];
    const allRecords = typeof TransactionAdapter !== "undefined" && typeof TransactionAdapter.getUnifiedHistory === "function"
      ? TransactionAdapter.getUnifiedHistory(rawTxs, rawAlerts, AppState.providerSelectionState)
      : rawTxs;

    const rows = [["Request ID", "Service", "Provider", "Amount USD", "Status", "Network", "Tx Hash", "Delivery Hash", "Timestamp"]];
    allRecords.forEach((t) => {
      rows.push([
        t.reqId || "",
        t.serviceName || t.serviceId || "",
        t.providerName || t.provider || "",
        t.amountUSD || "0.00",
        t.status || "SETTLED",
        t.network || "Local EVM",
        t.txHash || "",
        t.deliveryHash || "",
        t.timestamp || ""
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.map((val) => `"${val || ""}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `purchases_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (typeof App !== "undefined" && App.toast) {
      App.toast("Exported CSV successfully.", "success");
    }
  },

  render() {
    this.init();
    const rawTxs = AppState.transactions || [];
    const rawAlerts = AppState.alerts || [];

    const allRecords = typeof TransactionAdapter !== "undefined" && typeof TransactionAdapter.getUnifiedHistory === "function"
      ? TransactionAdapter.getUnifiedHistory(rawTxs, rawAlerts, AppState.providerSelectionState)
      : (rawTxs || []);

    const settledRecords = allRecords.filter((r) => r.isSettled || r.status === "SETTLED");
    const blockedRecords = allRecords.filter((r) => r.isBlocked || r.status === "CAPPED" || r.status === "BLOCKED" || r.status === "REJECTED");
    const pendingRecords = allRecords.filter((r) => r.displayStatus === "PENDING");

    const filtered = allRecords.filter((record) => {
      if (this.activeFilter === "Settled Purchases") {
        if (!record.isSettled && record.status !== "SETTLED") return false;
      } else if (this.activeFilter === "Capped & Rejected") {
        if (!record.isBlocked && record.status !== "CAPPED" && record.status !== "BLOCKED" && record.status !== "REJECTED") return false;
      } else if (this.activeFilter === "Pending") {
        if (record.displayStatus !== "PENDING") return false;
      }

      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const mReq = (record.reqId || "").toLowerCase().includes(q);
        const mProv = (record.providerName || record.provider || "").toLowerCase().includes(q);
        const mTx = (record.txHash || "").toLowerCase().includes(q);
        const mSvc = (record.serviceName || record.serviceId || "").toLowerCase().includes(q);
        return mReq || mProv || mTx || mSvc;
      }
      return true;
    });

    return `
      <div id="transactions-view-root" style="display: flex; flex-direction: column; gap: 20px;">

        <!-- Header Panel -->
        <div class="panel" style="margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span class="badge">x402 V2 Audit</span>
                <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">Cryptographic Spending Ledger</span>
              </div>
              <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Purchase History</h1>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
                Every autonomous machine payment verified via TokenBudgetEnforcer and cryptographic SHA-256 delivery receipts.
              </p>
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
              <button
                onclick="TransactionsView.setViewMode('${this.viewMode === 'table' ? 'cards' : 'table'}')"
                class="btn btn-secondary btn-sm"
              >
                <span>${this.viewMode === 'table' ? 'Switch to Cards' : 'Switch to Table'}</span>
              </button>
              <button
                onclick="TransactionsView.exportCSV()"
                class="btn btn-secondary btn-sm"
              >
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <!-- Filter Tabs -->
          <div style="display: flex; gap: 6px; overflow-x: auto;">
            ${[
              { id: "All Purchases", label: "All", count: allRecords.length },
              { id: "Settled Purchases", label: "Settled", count: settledRecords.length },
              { id: "Capped & Rejected", label: "Blocked / Invariants", count: blockedRecords.length },
              { id: "Pending", label: "Pending", count: pendingRecords.length },
            ].map(tab => `
              <button
                type="button"
                onclick="TransactionsView.setFilter('${tab.id}')"
                class="btn btn-sm ${this.activeFilter === tab.id ? 'btn-primary' : 'btn-secondary'}"
              >
                <span>${tab.label}</span>
                <span class="badge" style="margin-left: 4px;">${tab.count}</span>
              </button>
            `).join("")}
          </div>

          <!-- Search Input -->
          <input
            type="text"
            placeholder="Search by service, provider, or hash..."
            value="${this.searchQuery}"
            oninput="TransactionsView.setSearch(this.value)"
            class="form-input font-mono"
            style="width: 280px; max-width: 100%;"
          />
        </div>

        <!-- Table View (Default) -->
        ${this.viewMode === 'table' ? `
          <div class="panel" style="margin: 0; padding: 0; overflow: hidden;">
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
                  ${filtered.length > 0
                    ? filtered.map((t) => {
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
                    : `<tr><td colspan="8" style="text-align: center; padding: 36px; color: var(--text-muted);">No transactions match your search filter.</td></tr>`
                  }
                </tbody>
              </table>
            </div>
          </div>
        ` : `
          <!-- Cards View -->
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px;">
            ${filtered.length > 0
              ? filtered.map((t) => {
                  const isSuccess = t.isSettled || t.status === "SETTLED";
                  const isAlert = t.isBlocked || t.status === "CAPPED" || t.status === "BLOCKED" || t.status === "REJECTED";
                  const timeStr = t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : '-';

                  return `
                    <div class="panel" style="margin: 0; padding: 16px; cursor: pointer;" onclick="App.openTransactionDetail('${t.reqId || t.txHash}')">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div>
                          <div style="font-weight: 700; font-size: 14px;">${t.serviceName || t.serviceId || 'Service'}</div>
                          <div style="font-size: 12px; color: var(--text-muted);">${t.providerName || t.provider || '-'}</div>
                        </div>
                        <span class="badge ${isSuccess ? 'badge-success' : (isAlert ? 'badge-danger' : 'badge-warning')}">
                          ${t.status || 'SETTLED'}
                        </span>
                      </div>

                      <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 12px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border);">
                        <span>Amount: <strong>$${Number(t.amountUSD || 0).toFixed(2)} USDC</strong></span>
                        <span style="color: var(--text-muted);">${timeStr}</span>
                      </div>
                    </div>
                  `;
                }).join('')
              : `<div style="grid-column: 1/-1; text-align: center; padding: 36px; color: var(--text-muted);" class="panel">No transactions match your filter.</div>`
            }
          </div>
        `}

      </div>
    `;
  }
};
