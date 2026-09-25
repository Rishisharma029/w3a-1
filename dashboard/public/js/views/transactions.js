const TransactionsView = {
  activeFilter: "All Purchases",
  searchQuery: "",
  viewMode: "cards", // "cards" | "table"
  isLoading: false,
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
    if (this.activeFilter === filterId) return;
    this.activeFilter = filterId;
    this.isLoading = true;
    this.reRender();
    setTimeout(() => {
      this.isLoading = false;
      this.reRender();
    }, 200);
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

    renderSkeletonCards(count = 5) {
    return `
      <div class="space-y-3">
        ${Array.from({ length: count }).map(() => `
          <div class="p-4 sm:p-5 rounded-2xl bg-surface-low border border-outline-variant/30 skeleton-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div class="flex items-center gap-3.5 flex-1">
              <div class="w-10 h-10 rounded-xl skeleton-shimmer shrink-0"></div>
              <div class="space-y-2 flex-1">
                <div class="h-4 w-48 skeleton-shimmer rounded"></div>
                <div class="h-3 w-64 skeleton-shimmer-cyan rounded"></div>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="h-7 w-24 rounded-lg skeleton-shimmer-emerald"></div>
              <div class="h-8 w-24 rounded-xl skeleton-shimmer"></div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  },
  exportCSV() {
    const allRecords = typeof TransactionAdapter !== "undefined" && typeof TransactionAdapter.getUnifiedHistory === "function"
      ? TransactionAdapter.getUnifiedHistory(AppState.transactions, AppState.alerts, AppState.providerSelectionState)
      : (AppState.transactions || []);
    const rows = [["Request ID", "Provider", "Service", "Amount USD", "Status", "Tx Hash", "Delivery Hash", "Timestamp", "Reason"]];
    allRecords.forEach((t) => {
      rows.push([t.reqId, t.providerName || t.provider, t.serviceName || t.serviceId, t.amountUSD, t.status, t.txHash, t.deliveryHash, t.timestamp, t.intent || ""]);
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

    const allRecords = typeof TransactionAdapter !== "undefined" && typeof TransactionAdapter.getUnifiedHistory === "function"
      ? TransactionAdapter.getUnifiedHistory(rawTxs, rawAlerts, AppState.providerSelectionState)
      : (rawTxs || []);

    const settledRecords = allRecords.filter((r) => r.isSettled || r.status === "SETTLED");
    const blockedRecords = allRecords.filter((r) => r.isBlocked || r.status === "CAPPED" || r.status === "BLOCKED" || r.status === "REJECTED");
    const pendingRecords = allRecords.filter((r) => r.displayStatus === "PENDING");

    const filtered = allRecords.filter((record) => {
      if (this.activeFilter === "Settled Purchases") {
        if (!record.isSettled && record.status !== "SETTLED") return false;
      } else if (this.activeFilter === "Capped & Rejected" || this.activeFilter === "Blocked Attacks") {
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
              { id: "All Purchases", label: "All Purchases", count: allRecords.length },
              { id: "Settled Purchases", label: "Settled Purchases", count: settledRecords.length },
              { id: "Capped & Rejected", label: "Capped & Rejected", count: blockedRecords.length, isAlert: true },
              { id: "Pending", label: "Pending", count: pendingRecords.length },
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
          this.isLoading ? this.renderSkeletonCards(5) : this.viewMode === 'cards' ? `
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
                      const isSuccess = t.isSettled || t.status === "SETTLED";
                      const isCapped = t.status === "CAPPED" || t.isCapped;
                      const isRejected = t.status === "REJECTED" || t.isRejected;

                      let statusClass = "bg-tertiary/15 text-tertiary border-tertiary/40";
                      let statusLabel = "SETTLED";
                      if (isCapped) {
                        statusClass = "bg-rose-500/15 text-rose-300 border-rose-500/40";
                        statusLabel = "CAPPED";
                      } else if (isRejected || !isSuccess) {
                        statusClass = "bg-amber-500/15 text-amber-300 border-amber-500/40";
                        statusLabel = "REJECTED";
                      }

                      const isSep = (t.chainId === 11155111) || (t.network && String(t.network).includes('Sepolia'));
                      const netBadge = isSep
                        ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/15 text-cyan-300 border border-blue-500/30">ETHEREUM SEPOLIA</span>`
                        : `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">LOCAL EVM</span>`;

                      const subNotice = isCapped
                        ? `<span class="text-[10px] text-rose-400 font-mono flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>Blocked: Exceeds spending cap (ZERO tokens moved)</span>`
                        : isRejected
                        ? `<span class="text-[10px] text-amber-400 font-mono flex items-center gap-1"><span>⚠</span>${t.intent || "Intercepted by security protocol"}</span>`
                        : `<span class="text-[10px] text-on-surface-variant font-mono">Verified SHA-256 Content Delivery</span>`;

                      return `
                        <div
                          onclick="App.openTransactionDetail('${t.reqId}')"
                          class="p-4 sm:p-5 rounded-2xl bg-surface-low border border-outline-variant/30 hover:border-secondary/60 hover:bg-surface-container transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm group"
                        >
                          <div class="flex items-start sm:items-center gap-4">
                            <span class="px-2.5 py-1 rounded-md text-xs font-mono font-extrabold border shrink-0 mt-0.5 sm:mt-0 ${statusClass}">
                              ${statusLabel}
                            </span>
                            <div>
                              <div class="flex items-center gap-2">
                                <h3 class="font-headline text-base font-bold text-white group-hover:text-secondary transition-colors">
                                  ${t.serviceName || t.serviceId || "Autonomous Service"}
                                </h3>
                                ${netBadge}
                              </div>
                              <div class="flex flex-wrap items-center gap-2 mt-0.5">
                                <span class="text-xs font-mono text-outline">
                                  ${t.providerName || t.provider || "Decentralized Provider"}
                                </span>
                                <span class="text-outline text-xs">&bull;</span>
                                ${subNotice}
                              </div>
                            </div>
                          </div>

                          <div class="flex items-center justify-between sm:justify-end gap-6 font-mono text-xs shrink-0">
                            <div class="text-left sm:text-right">
                              <span class="text-white font-bold text-sm block">${t.amountUSD} USDC</span>
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
                    <th class="py-3 px-3">Network</th>
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
                    .map((t) => {
                      const isSuccess = t.isSettled || t.status === "SETTLED";
                      const isCapped = t.status === "CAPPED" || t.isCapped;
                      const isRejected = t.status === "REJECTED" || t.isRejected;
                      const isSep = (t.chainId === 11155111) || (t.network && String(t.network).includes('Sepolia'));

                      let badgeClass = "bg-tertiary/15 text-tertiary border border-tertiary/30";
                      let badgeLabel = "SETTLED";
                      if (isCapped) {
                        badgeClass = "bg-rose-500/15 text-rose-300 border border-rose-500/40";
                        badgeLabel = "CAPPED";
                      } else if (isRejected || !isSuccess) {
                        badgeClass = "bg-amber-500/15 text-amber-300 border border-amber-500/40";
                        badgeLabel = "REJECTED";
                      }

                      return `
                        <tr class="hover:bg-surface-high/40 transition-colors cursor-pointer" onclick="App.openTransactionDetail('${t.reqId}')">
                          <td class="py-3 px-3">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeClass}">
                              ${badgeLabel}
                            </span>
                          </td>
                          <td class="py-3 px-3">
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold font-mono ${isSep ? 'bg-blue-500/15 text-cyan-300 border border-blue-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}">
                              ${isSep ? 'Sepolia' : 'Local EVM'}
                            </span>
                          </td>
                          <td class="py-3 px-3 text-white font-bold font-sans">${t.serviceName || t.serviceId}</td>
                          <td class="py-3 px-3 text-outline">${t.providerName}</td>
                          <td class="py-3 px-3 text-white font-bold">${t.amountUSD} USDC</td>
                          <td class="py-3 px-3 text-secondary font-mono">${UIFormatter.formatHash(t.txHash, 4)}</td>
                          <td class="py-3 px-3 text-outline">${UIFormatter.formatRelativeTime(t.timestamp)}</td>
                          <td class="py-3 px-3 text-right text-secondary hover:text-white font-bold">Inspect &rarr;</td>
                        </tr>
                      `;
                    })
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
