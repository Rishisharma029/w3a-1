/**
 * dashboard/public/js/views/transactions.js
 *
 * Purchases & Purchase History
 * =============================
 * Clean, user-friendly card stream:
 *   SUCCESS / BLOCKED status badge
 *   Service Name, Provider Name, Price ($4.00), Relative Time
 *   Click any card -> Opens detailed transaction drawer with cryptographic proofs
 */

const TransactionsView = {
  activeFilter: "Settled Purchases",
  searchQuery: "",
  viewMode: "cards", // "cards" | "table"
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
      event === "transactions_updated" ||
      event === "settlement_confirmed" ||
      event === "alerts_updated" ||
      event === "stream_event_processed"
    ) {
      if (typeof document !== "undefined" && typeof AppState !== "undefined" && (AppState.currentView === "transactions" || AppState.currentView === "purchases")) {
        const root = document.getElementById("mainContent") || document.getElementById("main-content");
        if (root && root.querySelector("#transactions-view-root")) {
          root.innerHTML = this.render();
        }
      }
    }
  },

  setFilter(filterId) {
    this.activeFilter = filterId;
    this.reRender();
  },

  setSearch(query) {
    this.searchQuery = query;
    this.reRender();
  },

  setViewMode(mode) {
    this.viewMode = mode;
    this.reRender();
  },

  reRender() {
    const root = document.getElementById("mainContent") || document.getElementById("main-content");
    if (root && root.querySelector("#transactions-view-root")) {
      root.innerHTML = this.render();
    }
  },

  exportCSV() {
    const rawTxs = AppState.transactions || [];
    const rows = [["Request ID", "Provider", "Service", "Amount USD", "Status", "Tx Hash", "Delivery Hash", "Timestamp"]];
    rawTxs.forEach((t) => {
      rows.push([t.reqId, t.providerName || t.provider, t.serviceId, t.amountUSD, t.status, t.txHash, t.deliveryHash, t.timestamp]);
    });
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.map((val) => `"${val || ""}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `purchases_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  render() {
    this.init();
    const rawTxs = AppState.transactions || [];
    const rawAlerts = AppState.alerts || [];

    const transactions = typeof TransactionAdapter !== "undefined"
      ? TransactionAdapter.normalizeList(rawTxs)
      : rawTxs;

    const alertRecords = rawAlerts.map((a, idx) => {
      let amountUSD = "0.00";
      if (a.amountUSD !== undefined && a.amountUSD !== null) {
        amountUSD = typeof a.amountUSD === "number" ? a.amountUSD.toFixed(2) : String(a.amountUSD).replace("$", "").trim();
      } else if (a.interceptedAmount && typeof a.interceptedAmount === "string") {
        amountUSD = a.interceptedAmount.replace(/[^0-9.]/g, "") || "0.00";
      } else if (a.amount || a.amountAtomic) {
        const val = Number(a.amount || a.amountAtomic);
        if (!isNaN(val) && val > 0) {
          amountUSD = val >= 10000 ? (val / 1e6).toFixed(2) : val.toFixed(2);
        }
      } else if (String(a.type || "").toUpperCase().includes("OVERSPEND")) {
        amountUSD = "25.00";
      }

      const serviceName = a.type ? a.type.replace(/_/g, " ") : "Threat Intercepted";
      const offenseTarget = a.offenseTarget || a.target || a.providerId || a.provider || a.endpoint || "TokenBudgetEnforcer.sol";
      const targetLabel = String(offenseTarget).startsWith("0x") ? UIFormatter.formatAddress(offenseTarget) : String(offenseTarget);
      const reqId = a.reqId && String(a.reqId).startsWith("0x") && String(a.reqId).length > 15 ? String(a.reqId) : `0xdefend_${idx + 1}`;

      return {
        isBlockedAttack: true,
        reqId,
        provider: a.provider || offenseTarget,
        providerName: targetLabel,
        serviceId: a.type || "attack-blocked",
        serviceName,
        amountUSD,
        formattedAmount: `$${amountUSD} USDC`,
        currency: "USDC",
        displayStatus: "BLOCKED",
        status: "BLOCKED",
        txHash: a.txHash || "0xreverted_on_chain",
        deliveryHash: "N/A (Reverted)",
        timestamp: a.timestamp || new Date().toISOString(),
        intent: a.reason || "Unauthorized transaction blocked by protocol",
      };
    });

    const allRecords = [...transactions, ...alertRecords];

    const filtered = allRecords.filter((record) => {
      if (this.activeFilter === "Settled Purchases" && record.isBlockedAttack) return false;
      if (this.activeFilter === "Blocked Attacks" && !record.isBlockedAttack) return false;
      if (this.activeFilter === "Pending" && record.displayStatus !== "PENDING") return false;

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
      <div id="transactions-view-root" class="space-y-6">

        <!-- Header -->
        <div class="rounded-2xl bg-surface-low/90 border border-outline-variant/40 p-6 md:p-8 backdrop-blur-md">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-outline">Autonomous Spending Ledger</span>
                <span class="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary/15 text-secondary border border-secondary/30">
                  x402 V2 Verified
                </span>
              </div>
              <h1 class="font-headline text-2xl lg:text-3xl font-bold text-white tracking-tight">PURCHASE HISTORY</h1>
              <p class="text-sm text-on-surface-variant mt-1 leading-relaxed">
                Click any purchase to open the detailed cryptographic proof drawer.
              </p>
            </div>

            <!-- Toolbar Actions -->
            <div class="flex items-center gap-2">
              <button
                onclick="TransactionsView.setViewMode('${this.viewMode === 'cards' ? 'table' : 'cards'}')"
                class="px-3.5 py-2 rounded-xl bg-surface-high hover:bg-surface-highest border border-outline-variant/40 text-on-surface font-mono text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span class="material-symbols-outlined text-xs">${this.viewMode === 'cards' ? 'table_rows' : 'grid_view'}</span>
                <span>${this.viewMode === 'cards' ? 'Switch to Table' : 'Switch to Cards'}</span>
              </button>
              <button
                onclick="TransactionsView.exportCSV()"
                class="px-3.5 py-2 rounded-xl bg-surface-high hover:bg-surface-highest border border-outline-variant/40 text-on-surface font-mono text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span class="material-symbols-outlined text-xs">file_download</span>
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl bg-surface-low border border-outline-variant/40 p-3">
          <!-- Filter Tabs -->
          <div class="flex items-center bg-surface-lowest p-1 rounded-xl border border-outline-variant/30 text-xs font-mono overflow-x-auto w-full sm:w-auto">
            ${[
              { id: "Settled Purchases", label: "Settled Purchases", count: transactions.length },
              { id: "Blocked Attacks", label: "Blocked Attacks", count: alertRecords.length, isAlert: true },
              { id: "All Activity", label: "All Activity", count: allRecords.length },
              { id: "Pending", label: "Pending", count: allRecords.filter((r) => r.displayStatus === "PENDING").length },
            ]
              .map(
                (tab) => `
              <button
                onclick="TransactionsView.setFilter('${tab.id}')"
                class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  this.activeFilter === tab.id
                    ? tab.isAlert
                      ? "bg-error/20 text-error font-bold border border-error/40"
                      : "bg-secondary/20 text-secondary font-bold border border-secondary/30"
                    : "text-outline hover:text-white"
                }"
              >
                <span>${tab.label}</span>
                <span class="px-1.5 py-0.5 rounded-full text-[10px] ${
                  this.activeFilter === tab.id
                    ? tab.isAlert
                      ? "bg-error/30 text-white"
                      : "bg-secondary/30 text-white"
                    : "bg-surface-high text-outline"
                }">${tab.count}</span>
              </button>
            `
              )
              .join("")}
          </div>

          <!-- Search Input -->
          <div class="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search purchases by service, provider, hash..."
              value="${this.searchQuery}"
              oninput="TransactionsView.setSearch(this.value)"
              class="w-full px-3 py-1.5 pl-8 text-xs font-mono bg-surface-lowest border border-outline-variant/40 rounded-xl text-white placeholder-outline focus:outline-none focus:border-secondary transition"
            />
            <span class="material-symbols-outlined absolute left-2.5 top-2 text-xs text-outline">search</span>
          </div>
        </div>

        <!-- 6. Item 6: PURCHASE HISTORY CARDS (User-Friendly Stream) -->
        ${
          this.viewMode === 'cards'
            ? `
          <div class="space-y-3">
            ${
              filtered.length === 0
                ? `
              <div class="p-12 text-center rounded-2xl bg-surface-low border border-outline-variant/30 text-outline font-mono text-xs">
                No purchases match the selected filter.
              </div>
            `
                : filtered
                    .map((t) => {
                      const isSuccess = t.status === "SETTLED" || t.status === "COMPLETED" || !t.isBlockedAttack;
                      const statusClass = isSuccess
                        ? "bg-tertiary/15 text-tertiary border-tertiary/40"
                        : "bg-error/15 text-error border-error/40";
                      const statusLabel = isSuccess ? "SUCCESS" : "BLOCKED";

                      return `
                        <div
                          onclick="App.showTransactionDrawer('${t.reqId}')"
                          class="p-4 sm:p-5 rounded-2xl bg-surface-low border border-outline-variant/30 hover:border-secondary/60 hover:bg-surface-container transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm group"
                        >
                          <div class="flex items-center gap-4">
                            <span class="px-2.5 py-1 rounded-md text-xs font-mono font-extrabold border ${statusClass}">
                              ${statusLabel}
                            </span>
                            <div>
                              <h3 class="font-headline text-base font-bold text-white group-hover:text-secondary transition-colors">
                                ${t.serviceName || t.serviceId || "Autonomous Service"}
                              </h3>
                              <p class="text-xs font-mono text-outline mt-0.5">
                                ${t.providerName || t.provider || "Decentralized Provider"}
                              </p>
                            </div>
                          </div>

                          <div class="flex items-center justify-between sm:justify-end gap-6 font-mono text-xs">
                            <div class="text-left sm:text-right">
                              <span class="text-white font-bold text-sm block">$${t.amountUSD} USDC</span>
                              <span class="text-[11px] text-outline">${UIFormatter.formatRelativeTime(t.timestamp)}</span>
                            </div>
                            <span class="material-symbols-outlined text-sm text-outline group-hover:text-white group-hover:translate-x-1 transition-all">
                              chevron_right
                            </span>
                          </div>
                        </div>
                      `;
                    })
                    .join("")
            }
          </div>
        `
            : `
          <!-- Table View Fallback for Technical Auditing -->
          <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-4">
            <div class="overflow-x-auto">
              <table class="w-full text-left font-mono text-xs">
                <thead class="border-b border-outline-variant/30 uppercase text-[10px] text-outline">
                  <tr>
                    <th class="py-3 px-3">Status</th>
                    <th class="py-3 px-3">Service</th>
                    <th class="py-3 px-3">Provider</th>
                    <th class="py-3 px-3">Amount</th>
                    <th class="py-3 px-3">Tx Hash</th>
                    <th class="py-3 px-3">Time</th>
                    <th class="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-outline-variant/20">
                  ${filtered
                    .map((t) => `
                    <tr class="hover:bg-surface-high/40 transition-colors cursor-pointer" onclick="App.showTransactionDrawer('${t.reqId}')">
                      <td class="py-3 px-3">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${t.isBlockedAttack ? 'bg-error/15 text-error border border-error/30' : 'bg-tertiary/15 text-tertiary border border-tertiary/30'}">
                          ${t.isBlockedAttack ? 'BLOCKED' : 'SUCCESS'}
                        </span>
                      </td>
                      <td class="py-3 px-3 text-white font-bold font-sans">${t.serviceName || t.serviceId}</td>
                      <td class="py-3 px-3 text-outline">${t.providerName}</td>
                      <td class="py-3 px-3 text-white font-bold">$${t.amountUSD} USDC</td>
                      <td class="py-3 px-3 text-secondary font-mono">${UIFormatter.formatHash(t.txHash, 4)}</td>
                      <td class="py-3 px-3 text-outline">${UIFormatter.formatRelativeTime(t.timestamp)}</td>
                      <td class="py-3 px-3 text-right text-secondary hover:text-white font-bold">Inspect &rarr;</td>
                    </tr>
                  `)
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        `
        }
      </div>
    `;
  },
};
