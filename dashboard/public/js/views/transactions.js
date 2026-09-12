/**
 * dashboard/public/js/views/transactions.js
 *
 * Page 3: Transaction Explorer & Detail Inspection
 * ==================================================
 * Features:
 *   - Search by Request ID, Provider, Tx Hash, or Service
 *   - Status Filters: All, Successful, Blocked, Pending
 *   - Clean monospace formatting with inline copy buttons
 *   - Zero undefined values via TransactionAdapter & UIFormatter
 *   - Interactive row clicks opening the full Transaction Detail Drawer
 */

const TransactionsView = {
  activeFilter: "Settled Purchases",
  searchQuery: "",
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
      if (typeof document !== "undefined" && typeof AppState !== "undefined" && AppState.currentView === "transactions") {
        const root = document.getElementById("mainContent") || document.getElementById("main-content");
        if (root && root.querySelector("#transactions-view-root")) {
          root.innerHTML = this.render();
        }
      }
    }
  },

  render() {
    this.init();
    const rawTxs = AppState.transactions || [];
    const rawAlerts = AppState.alerts || [];

    // Normalize transactions through the central adapter
    const transactions = typeof TransactionAdapter !== "undefined"
      ? TransactionAdapter.normalizeList(rawTxs)
      : rawTxs;

    // Convert security alerts into standard blocked record format
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

      const rawType = String(a.type || a.event || "SECURITY_ALERT");
      const serviceName = a.type ? a.type.replace(/_/g, " ") : "Threat Intercepted";
      const offenseTarget = a.offenseTarget || a.target || a.providerId || a.provider || a.endpoint || "TokenBudgetEnforcer.sol";
      const targetLabel = String(offenseTarget).startsWith("0x") ? UIFormatter.formatAddress(offenseTarget) : String(offenseTarget);

      const hasValidHexReqId = a.reqId && String(a.reqId).startsWith("0x") && String(a.reqId).length > 15 && !String(a.reqId).includes("Protocol Level");
      const reqId = hasValidHexReqId ? String(a.reqId) : `0xdefend_${idx + 1}`;

      return {
        isBlockedAttack: true,
        reqId,
        hasValidHexReqId,
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
        quality: 0.0,
        network: "eip155:31337",
        x402Version: 2,
        scheme: "exact",
        asset: AppState.config.tokenAddress || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        payer: AppState.config.agentAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        nonce: reqId.slice(0, 18),
        validBefore: 0,
        signatureStatus: "REJECTED",
        verificationStatus: "FAILED",
        settlementStatus: "BLOCKED",
        budgetBefore: AppState.budget.totalFunded || "30.00",
        budgetAfter: AppState.budget.remaining || "26.00",
        content: { reason: a.reason, enforcement: a.layer || a.enforcementLayer || "TokenBudgetEnforcer.sol" },
      };
    });

    const allRecords = [...transactions, ...alertRecords];

    // Filter logic
    const filtered = allRecords.filter((item) => {
      if (this.activeFilter === "Settled Purchases" || this.activeFilter === "Successful") {
        if (item.displayStatus !== "SETTLED") return false;
      } else if (this.activeFilter === "Blocked Attacks" || this.activeFilter === "Blocked") {
        if (item.displayStatus !== "BLOCKED") return false;
      } else if (this.activeFilter === "Pending") {
        if (item.displayStatus !== "PENDING") return false;
      }

      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const reqMatch = (item.reqId || "").toLowerCase().includes(q);
        const provMatch = (item.providerName || "").toLowerCase().includes(q);
        const txMatch = (item.txHash || "").toLowerCase().includes(q);
        const servMatch = (item.serviceName || item.serviceId || "").toLowerCase().includes(q);
        return reqMatch || provMatch || txMatch || servMatch;
      }

      return true;
    });

    return `
      <div id="transactions-view-root" class="space-y-6">

        <!-- Header -->
        <div class="rounded-2xl bg-surface-low/90 border border-outline-variant/40 p-6 backdrop-blur-md">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-outline">On-Chain Ledger</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary/15 text-secondary border border-secondary/30">
                  x402 V2 Settlement Explorer
                </span>
              </div>
              <h1 class="font-headline text-2xl lg:text-3xl font-bold text-white tracking-tight">Transactions & Settlements</h1>
              <p class="text-sm text-on-surface-variant mt-1 leading-relaxed">
                Inspect every autonomous purchase, cryptographic delivery receipt, and blocked attack attempt.
              </p>
            </div>

            <!-- Export Actions -->
            <div class="flex items-center gap-2">
              <button
                onclick="TransactionsView.exportCSV()"
                class="px-3.5 py-2 rounded-xl bg-surface-high hover:bg-surface-highest border border-outline-variant/40 text-on-surface font-mono text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <span class="material-symbols-outlined text-xs" data-icon="file_download">file_download</span>
                <span>Export Ledger CSV</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl bg-surface-low border border-outline-variant/40 p-3">
          <!-- Filter Tabs -->
          <div class="flex items-center bg-surface-lowest p-1 rounded-xl border border-outline-variant/30 text-xs font-mono overflow-x-auto">
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
                class="px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
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
              placeholder="Search by ID, provider, tx hash..."
              value="${this.searchQuery}"
              oninput="TransactionsView.setSearch(this.value)"
              class="w-full px-3 py-1.5 pl-8 text-xs font-mono bg-surface-lowest border border-outline-variant/40 rounded-xl text-white placeholder-outline focus:outline-none focus:border-secondary transition"
            />
            <span class="material-symbols-outlined absolute left-2.5 top-2 text-xs text-outline" data-icon="search">search</span>
          </div>
        </div>

        <!-- Ledger Table Card -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-4">
          <div class="overflow-x-auto">
            <table class="w-full text-left font-mono text-xs">
              <thead class="border-b border-outline-variant/30 uppercase text-[10px] text-outline">
                <tr>
                  <th class="pb-3 font-medium">Request ID</th>
                  <th class="pb-3 font-medium">Service</th>
                  <th class="pb-3 font-medium">Provider</th>
                  <th class="pb-3 font-medium">Amount</th>
                  <th class="pb-3 font-medium">Protocol</th>
                  <th class="pb-3 font-medium">Tx Hash</th>
                  <th class="pb-3 font-medium">Delivery Hash</th>
                  <th class="pb-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-outline-variant/15 text-on-surface">
                ${
                  filtered.length > 0
                    ? filtered
                        .map(
                          (t) => `
                        <tr
                          onclick="App.openTransactionDetail('${t.reqId}')"
                          class="hover:bg-surface-high/40 cursor-pointer transition-colors group ${
                            t.isBlockedAttack ? "bg-error/[0.04] border-l-2 border-l-error/70" : ""
                          }"
                        >
                          <td class="py-3 font-mono font-semibold">
                            ${
                              t.isBlockedAttack && !t.hasValidHexReqId
                                ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-error/15 text-error border border-error/30">ON-CHAIN DEFENSE</span>`
                                : `<span class="inline-flex items-center gap-1 ${t.isBlockedAttack ? "text-error" : "text-secondary"}">
                                    ${UIFormatter.formatHash(t.reqId, 6)}
                                    <button onclick="event.stopPropagation(); App.copyText('${t.reqId}')" class="text-outline hover:text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span class="material-symbols-outlined text-xs" data-icon="content_copy">content_copy</span>
                                    </button>
                                  </span>`
                            }
                          </td>
                          <td class="py-3 font-sans text-white">
                            ${
                              t.isBlockedAttack
                                ? `<span class="flex items-center gap-1.5 text-rose-300 font-semibold text-xs">
                                    <span class="material-symbols-outlined text-[13px] text-error" data-icon="shield">shield</span>
                                    ${t.serviceName}
                                  </span>`
                                : t.serviceName
                            }
                          </td>
                          <td class="py-3 text-on-surface-variant font-sans font-semibold">
                            ${
                              t.isBlockedAttack
                                ? `<span class="px-2 py-0.5 rounded text-[10px] bg-surface-lowest text-on-surface border border-outline-variant/40 font-mono">${t.providerName}</span>`
                                : t.providerName
                            }
                          </td>
                          <td class="py-3 font-mono font-bold ${t.displayStatus === "BLOCKED" ? "text-error" : "text-tertiary"}">
                            ${t.formattedAmount}
                            ${t.isBlockedAttack ? `<span class="text-[9px] text-error/80 uppercase font-mono block">Intercepted</span>` : ""}
                          </td>
                          <td class="py-3">
                            <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-lowest ${
                              t.isBlockedAttack ? "text-error border border-error/30" : "text-secondary border border-secondary/30"
                            }">
                              ${t.isBlockedAttack ? "v2 guard" : `v2 ${t.scheme}`}
                            </span>
                          </td>
                          <td class="py-3 font-mono text-outline">
                            ${
                              t.isBlockedAttack
                                ? `<span class="px-2 py-0.5 rounded text-[10px] font-mono bg-error/10 text-error/80 border border-error/20">REVERTED</span>`
                                : `<span class="inline-flex items-center gap-1">
                                    ${UIFormatter.formatHash(t.txHash, 4)}
                                    <button onclick="event.stopPropagation(); App.copyText('${t.txHash}')" class="text-outline hover:text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span class="material-symbols-outlined text-xs" data-icon="content_copy">content_copy</span>
                                    </button>
                                  </span>`
                            }
                          </td>
                          <td class="py-3 font-mono text-[11px] text-outline">
                            ${
                              t.isBlockedAttack
                                ? `<span class="text-outline/70">N/A (Reverted)</span>`
                                : `<span class="inline-flex items-center gap-1">
                                    ${UIFormatter.formatDeliveryHash(t.deliveryHash, 4)}
                                    <button onclick="event.stopPropagation(); App.copyText('${t.deliveryHash}')" class="text-outline hover:text-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span class="material-symbols-outlined text-xs" data-icon="content_copy">content_copy</span>
                                    </button>
                                  </span>`
                            }
                          </td>
                          <td class="py-3 text-right">
                            ${
                              t.isBlockedAttack
                                ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-error/15 text-error border border-error/40 inline-flex items-center gap-1 justify-end ml-auto">
                                    <span class="material-symbols-outlined text-[12px]" data-icon="block">block</span>
                                    BLOCKED ATTACK
                                  </span>`
                                : UIFormatter.statusBadge(t.displayStatus)
                            }
                          </td>
                        </tr>
                      `
                        )
                        .join("")
                    : `
                      <tr>
                        <td colspan="8" class="py-8 text-center text-outline">
                          No transactions matching current filter criteria.
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination / Count Footer -->
          <div class="flex items-center justify-between pt-2 border-t border-outline-variant/30 text-xs font-mono text-on-surface-variant">
            <span>Showing ${filtered.length} of ${allRecords.length} records</span>
            <span class="text-outline">Click any row to open slide-over detail inspection</span>
          </div>
        </div>

      </div>
    `;
  },

  setFilter(filter) {
    this.activeFilter = filter;
    App.render();
  },

  setSearch(q) {
    this.searchQuery = q;
    App.render();
  },

  exportCSV() {
    const rawTxs = AppState.transactions || [];
    const transactions = typeof TransactionAdapter !== "undefined"
      ? TransactionAdapter.normalizeList(rawTxs)
      : rawTxs;

    if (transactions.length === 0) {
      App.showToast("No transactions to export", "info");
      return;
    }

    const headers = ["Request ID", "Provider", "Service", "Amount", "Status", "Tx Hash", "Delivery Hash", "Timestamp"];
    const rows = transactions.map((t) => [
      t.reqId,
      t.providerName,
      t.serviceName,
      t.formattedAmount,
      t.displayStatus,
      t.txHash,
      t.deliveryHash,
      t.timestamp,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `w3a1_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    App.showToast("Ledger CSV exported successfully", "success");
  },
};
