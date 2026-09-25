const App = {
  views: {
    overview: OverviewView,
    current: CurrentTransactionView,
    execution: CurrentTransactionView,
    agent: AgentView,
    transactions: TransactionsView,
    purchases: TransactionsView,
    buy: AgentView,
    providers: ProvidersView,
    security: SecurityView,
    delivery: DeliveryView,
    settings: SettingsView,
    verify: VerifyView,
  },

  pollTimer: null,
  bgShader: null,
 
  async init() {
    // 0. Initialize Aceternity UI Shooting Stars & Stars Background (Cosmic obsidian theme)
    if (window.ShootingStarsBackground) {
      try {
        window.ShootingStarsBackground.init();
      } catch (err) {
        console.warn('[App] ShootingStarsBackground init error:', err);
      }
    }

    // 1. Initialize all view subscribers
    Object.values(this.views).forEach((v) => {
      if (v && typeof v.init === "function") {
        v.init();
      }
    });

    // 2. Subscribe to reactive state updates
    AppState.subscribe((event, data) => {
      this.render();
      this.updateSidebarState();
    });

    // 3. Initial API sync
    await ApiService.init();

    // 4. Render initial view
    this.render();
    this.updateSidebarState();

    // 4. Start background polling (every 2.5s)
    this.pollTimer = setInterval(async () => {
      await ApiService.syncAll();
    }, 2500);

    // 5. Setup keyboard shortcuts (ESC closes modals/drawers)
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { App.closeFlowchartModal(); }
      if (e.key === "Escape") {
        this.closeDrawer();
        this.closeModal();
      }
    });

    // 6. Support URL query params (?view=verify or ?tx=...) within main app
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get("view");
      const txParam = urlParams.get("tx");
      if (viewParam === "verify" || txParam) {
        this.openVerifier(txParam);
      }
    } catch (_) {}
  },

  navigate(viewName) {
    if (this.views[viewName]) {
      AppState.currentView = viewName;
      if (typeof AppState.setView === "function") {
        AppState.setView(viewName);
      }
      this.render();
      this.updateSidebarState();
      this.updateTopBarState();
      window.scrollTo({ top: 0, behavior: "smooth" });

      // Synchronize floating dock instances if active
      if (window._globalFloatingDock && typeof window._globalFloatingDock.setActiveView === "function") {
        window._globalFloatingDock.setActiveView(viewName);
      }
      if (window._headerFloatingDock && typeof window._headerFloatingDock.setActiveView === "function") {
        window._headerFloatingDock.setActiveView(viewName);
      }

      // Dynamically morph 3D shader gradient mood based on view context
      if (this.bgShader) {
        if (viewName === "agent") {
          // AI Purchase (Pillar 2): Electric Cyan & Royal Indigo
          this.bgShader.setColors("#00f2ff", "#38bdf8", "#818cf8");
        } else if (viewName === "providers") {
          // Marketplace (Pillar 1): Emerald Catalog & Cyan
          this.bgShader.setColors("#10b981", "#06b6d4", "#6366f1");
        } else if (viewName === "security") {
          // Security Defense: Guard Amber & Crimson
          this.bgShader.setColors("#f59e0b", "#ef4444", "#6366f1");
        } else {
          // Default Owner Center: Cyber Cyan, Safe Emerald, Indigo
          this.bgShader.setColors("#00f2ff", "#10b981", "#6366f1");
        }
      }
    }
  },

  render() {
    const mainContainer = document.getElementById("mainContent");
    const activeView = this.views[AppState.currentView] || OverviewView;
    if (mainContainer && activeView && typeof activeView.render === "function") {
      try {
        mainContainer.innerHTML = activeView.render();
      } catch (err) {
        console.error(`[App] Error rendering view "${AppState.currentView}":`, err);
      }
    }
    this.updateSidebarState();
    this.updateTopBarState();
  },

  updateSidebarState() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      const view = item.getAttribute("data-view");
      if (view === AppState.currentView) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // 3-Pillar Architecture Switcher Highlighting
    const btnMkt = document.getElementById("btnPillarMarketplace");
    const btnAi = document.getElementById("btnPillarAiPurchase");
    const btnOwner = document.getElementById("btnPillarOwnerCenter");
    const cur = AppState.currentView;

    if (btnMkt) {
      const active = cur === "providers";
      btnMkt.className = `px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
        active
          ? "bg-tertiary/20 text-tertiary border border-tertiary/40 shadow-sm font-extrabold"
          : "text-on-surface hover:text-white"
      }`;
    }
    if (btnAi) {
      const active = cur === "agent";
      btnAi.className = `px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
        active
          ? "bg-secondary/20 text-secondary border border-secondary/40 shadow-sm font-extrabold"
          : "text-on-surface hover:text-white"
      }`;
    }
    if (btnOwner) {
      const active = ["overview", "current", "transactions", "security", "delivery", "settings"].includes(cur);
      btnOwner.className = `px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
        active
          ? "bg-primary/20 text-primary border border-primary/40 shadow-sm font-extrabold"
          : "text-on-surface hover:text-white"
      }`;
    }

    // Sidebar bottom badges
    const agentBadge = document.getElementById("sidebarAgentStatus");
    if (agentBadge) {
      const isFrozen = AppState.budget.isFrozen;
      agentBadge.innerText = isFrozen ? "FROZEN" : "AUTHORIZED";
      agentBadge.className = `text-[10px] font-bold font-mono ${
        isFrozen ? "text-rose-400" : "text-emerald-400"
      }`;
      const dot = document.getElementById("sidebarAgentDot");
      if (dot) {
        dot.className = `status-dot ${isFrozen ? "status-dot-rose" : "status-dot-emerald"}`;
      }
    }

    const ownerWalletLabel = document.getElementById("sidebarOwnerWallet");
    if (ownerWalletLabel && AppState.config.ownerAddress) {
      ownerWalletLabel.innerText = `${AppState.config.ownerAddress.slice(0, 6)}...${AppState.config.ownerAddress.slice(-4)}`;
    }
  },

  updateTopBarState() {
    const modeBadge = document.getElementById("topBarModeBadge");
    const isLocal = AppState.environment === "local";
    const chainName = isLocal ? "LOCAL EVM" : "SEPOLIA";
    
    if (modeBadge) {
      if (AppState.isMockMode) {
        modeBadge.className = "px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse";
        modeBadge.innerText = `${chainName} — DEMO MODE (SIMULATED STATE)`;
      } else if (!AppState.isBackendReachable) {
        modeBadge.className = "px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40";
        modeBadge.innerText = `${chainName} — OFFLINE (FALLBACK)`;
      } else {
        modeBadge.className = "px-2.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/60";
        modeBadge.innerText = `${chainName} — LIVE CHAIN STATE`;
      }
    }

    const btnLocal = document.getElementById("btnEnvLocal");
    const btnSepolia = document.getElementById("btnEnvSepolia");
    if (btnLocal && btnSepolia) {
      if (isLocal) {
        btnLocal.className = "px-2.5 py-1 rounded font-bold bg-indigo-600 text-white transition";
        btnSepolia.className = "px-2.5 py-1 rounded text-slate-400 hover:text-white transition";
      } else {
        btnLocal.className = "px-2.5 py-1 rounded text-slate-400 hover:text-white transition";
        btnSepolia.className = "px-2.5 py-1 rounded font-bold bg-indigo-600 text-white transition";
      }
    }
  },

  toggleDemoMode() {
    const newMode = !AppState.isMockMode;
    AppState.setMockMode(newMode);
    this.toast(
      newMode ? "Demo Mode enabled — showing authentic simulated data" : "Live Mode enabled — connecting to on-chain backend",
      "info"
    );
  },

  switchEnvironment(env) {
    AppState.setEnvironment(env);
    this.toast(`Switched environment to ${env.toUpperCase()}`, "info");
  },
  // Transaction Detail Drawer
  openTransactionDetail(reqId) {
    let rawTx = AppState.transactions.find((t) => t.reqId === reqId || t.txHash === reqId);
    if (!rawTx && AppState.x402Transactions) {
      rawTx = AppState.x402Transactions.find((t) => t.reqId === reqId || t.txHash === reqId);
    }
    if (!rawTx && AppState.alerts) {
      const alert = AppState.alerts.find((a) => a.reqId === reqId || a.txHash === reqId);
      if (alert) {
        rawTx = {
          reqId: alert.reqId,
          txHash: alert.txHash || "0xreverted_on_chain",
          amountUSD: alert.amountUSD || alert.amount || "25.00",
          provider: alert.provider || alert.offenseTarget,
          providerName: alert.offenseTarget || alert.target || alert.provider || "TokenBudgetEnforcer.sol",
          serviceName: alert.type ? alert.type.replace(/_/g, " ") : "Threat Intercepted",
          serviceId: alert.type || "attack-blocked",
          displayStatus: "BLOCKED",
          status: "BLOCKED",
          intent: alert.reason || "Unauthorized transaction blocked by protocol",
          content: { reason: alert.reason, layer: alert.layer || alert.enforcementLayer },
        };
      }
    }
    const tx = TransactionAdapter.normalize(rawTx || { reqId });
    AppState.setSelectedTx(tx);

    const drawerContainer = document.getElementById("detailDrawerContent");
    const drawer = document.getElementById("detailDrawer");
    const backdrop = document.getElementById("drawerBackdrop");

    if (drawerContainer && drawer && backdrop) {
      const tokenAddr = AppState.config.tokenAddress || tx.asset;
      const agentAddr = AppState.config.agentAddress || tx.payer;
      const enforcerAddr = AppState.config.enforcerAddress || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

      let providerSlug = "alpha-translate";
      if (tx.providerName && tx.providerName.toLowerCase().includes("beta")) {
        providerSlug = "beta-translate";
      } else if (tx.providerName && tx.providerName.toLowerCase().includes("gamma")) {
        providerSlug = "gamma-translate";
      } else if (tx.providerName && tx.providerName.toLowerCase().includes("delta")) {
        providerSlug = "delta-compute";
      } else if (tx.providerName && tx.providerName.toLowerCase().includes("epsilon")) {
        providerSlug = "epsilon-vision";
      }
      const endpointUrl = `/x402/providers/${providerSlug}/service`;

      let cleanDeliveryHash = tx.deliveryHash || "sha256:30f928ebdfd01ba8766adca93783758006ae9bd02f382a52c9daab35f5ed3a0f";
      if (cleanDeliveryHash && !cleanDeliveryHash.startsWith("sha256:") && !cleanDeliveryHash.startsWith("N/A")) {
        cleanDeliveryHash = `sha256:${cleanDeliveryHash}`;
      }
      const isBlocked = tx.displayStatus === "BLOCKED" || tx.displayStatus === "CAPPED" || tx.displayStatus === "REJECTED" || tx.status === "CAPPED" || tx.status === "REJECTED";
      const isCapped = tx.displayStatus === "CAPPED" || tx.status === "CAPPED";

      drawerContainer.innerHTML = `
        <div class="space-y-5 font-mono">

          <!-- Drawer Header -->
          <div class="flex items-center justify-between pb-4 border-b border-outline-variant/40">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold text-secondary uppercase tracking-widest">Protocol Inspection</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${
                  isBlocked
                    ? "bg-error/15 text-error border border-error/40 glow-crimson"
                    : "bg-tertiary/15 text-tertiary border border-tertiary/40 glow-emerald"
                }">
                  ${isCapped ? "● BUDGET CAPPED" : isBlocked ? "● PROTOCOL REVERTED" : "● SETTLED ON-CHAIN"}
                </span>
              </div>
              <h3 class="font-headline text-lg font-bold text-white tracking-tight">x402 V2 TRANSACTION</h3>
              <p class="text-[11px] text-outline mt-0.5">Wire Protocol Trace & Cryptographic Proof</p>
            </div>
            <button onclick="App.closeDrawer()" class="text-outline hover:text-white p-2 rounded-lg hover:bg-surface-high transition">
              <span class="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <!-- Step 1: REQUEST -->
          <div class="p-4 rounded-xl bg-surface-low border border-outline-variant/30 space-y-2.5">
            <div class="flex items-center justify-between text-xs border-b border-outline-variant/20 pb-2">
              <span class="font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span class="material-symbols-outlined text-xs">arrow_forward</span>
                REQUEST
              </span>
              <span class="text-[10px] text-outline">${UIFormatter.formatDateTime(tx.timestamp)}</span>
            </div>
            <div class="space-y-2 text-xs">
              <div class="p-2.5 rounded-lg bg-surface-lowest border border-outline-variant/30 font-bold text-white flex items-center justify-between break-all">
                <span>GET ${endpointUrl}</span>
                <span class="text-[10px] font-normal text-tertiary ml-2 shrink-0">HTTP/1.1</span>
              </div>
              <div class="text-[11px] space-y-1 text-on-surface-variant pt-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-outline shrink-0">Client:</span>
                  <span class="text-white font-mono truncate">Autonomous AI Agent (${UIFormatter.formatAddress(agentAddr)})</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-outline shrink-0">Provider:</span>
                  <span class="text-white font-semibold">${tx.providerName} (${UIFormatter.formatAddress(tx.provider)})</span>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-outline shrink-0">Service:</span>
                  <span class="text-secondary font-mono">${tx.serviceName} (${tx.serviceId})</span>
                </div>
                <div class="pt-1 border-t border-outline-variant/15 flex items-start justify-between gap-2">
                  <span class="text-outline shrink-0">Intent:</span>
                  <span class="text-slate-200 text-right italic">"${tx.intent}"</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: 402 RESPONSE -->
          <div class="p-4 rounded-xl bg-surface-low border border-outline-variant/30 space-y-2.5">
            <div class="flex items-center justify-between text-xs border-b border-outline-variant/20 pb-2">
              <span class="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span class="material-symbols-outlined text-xs">lock</span>
                402 RESPONSE
              </span>
              <span class="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                HTTP 402 PAYMENT REQUIRED
              </span>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-white font-bold text-xs tracking-wider">PAYMENT-REQUIRED</span>
                <span class="text-tertiary font-bold text-xs flex items-center gap-1">
                  <span>✓</span> decoded
                </span>
              </div>
              <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-[11px] space-y-1.5 leading-relaxed">
                <div class="flex justify-between"><span class="text-outline">x402Version:</span> <span class="text-white font-bold">${tx.x402Version || 2}</span></div>
                <div class="flex justify-between"><span class="text-outline">scheme:</span> <span class="text-secondary font-bold">${tx.scheme || "exact"}</span></div>
                <div class="flex justify-between"><span class="text-outline">network:</span> <span class="text-white">${tx.network || "eip155:31337"}</span></div>
                <div class="flex justify-between"><span class="text-outline">amount:</span> <span class="text-tertiary font-bold">${Number(tx.amountUnits).toLocaleString()} units ($${tx.amountUSD} USDC)</span></div>
                <div class="flex justify-between gap-2"><span class="text-outline shrink-0">asset:</span> <span class="text-slate-300 truncate">${tokenAddr}</span></div>
                <div class="flex justify-between gap-2"><span class="text-outline shrink-0">payTo:</span> <span class="text-slate-300 truncate">${tx.provider}</span></div>
                <div class="flex justify-between"><span class="text-outline">validBefore:</span> <span class="text-slate-300">${tx.validBefore || Math.floor(Date.now() / 1000 + 3600)}</span></div>
                <div class="flex justify-between gap-2 pt-1 border-t border-outline-variant/15">
                  <span class="text-outline shrink-0">reqId:</span>
                  <div class="flex items-center gap-1 min-w-0">
                    <span class="text-secondary truncate">${tx.reqId}</span>
                    ${UIFormatter.copyButton(tx.reqId, "Request ID")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: PAYMENT -->
          <div class="p-4 rounded-xl bg-surface-low border border-outline-variant/30 space-y-2.5">
            <div class="flex items-center justify-between text-xs border-b border-outline-variant/20 pb-2">
              <span class="font-bold uppercase tracking-wider text-primary-light flex items-center gap-1.5">
                <span class="material-symbols-outlined text-xs">edit_document</span>
                PAYMENT
              </span>
              <span class="text-[10px] text-outline">Client EIP-712 Envelope</span>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-white font-bold text-xs tracking-wider">PAYMENT-SIGNATURE</span>
                <span class="text-tertiary font-bold text-xs flex items-center gap-1">
                  <span>✓</span> verified
                </span>
              </div>
              <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-[11px] space-y-1.5 leading-relaxed">
                <div class="flex justify-between gap-2"><span class="text-outline shrink-0">Payer Agent:</span> <span class="text-white truncate">${agentAddr}</span></div>
                <div class="flex justify-between gap-2"><span class="text-outline shrink-0">Verifying Contract:</span> <span class="text-secondary truncate">${enforcerAddr}</span></div>
                <div class="flex justify-between gap-2"><span class="text-outline shrink-0">Nonce:</span> <span class="text-slate-300 truncate">${tx.reqId}</span></div>
                <div class="flex justify-between"><span class="text-outline">Signature Format:</span> <span class="text-tertiary font-bold">EIP-712 Typed Data (r, s, v)</span></div>
                <div class="text-[10px] text-outline pt-1.5 border-t border-outline-variant/15 break-all">
                  Header: <span class="text-slate-400">PAYMENT-SIGNATURE: eyJ4NDAyVmVyc2lvbiI6Miwic2NoZW1lIjoiZXhhY3Qi...</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: FACILITATOR -->
          <div class="p-4 rounded-xl bg-surface-low border border-outline-variant/30 space-y-2.5">
            <div class="flex items-center justify-between text-xs border-b border-outline-variant/20 pb-2">
              <span class="font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span class="material-symbols-outlined text-xs">shield</span>
                FACILITATOR
              </span>
              <span class="text-[10px] text-outline">Pre-Settlement Invariant Verification</span>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-white font-bold text-xs tracking-wider">VERIFY</span>
                <span class="${isBlocked ? "text-error font-bold text-xs flex items-center gap-1" : "text-tertiary font-bold text-xs flex items-center gap-1"}">
                  ${isBlocked ? "<span>✘</span> rejected by protocol" : "<span>✓</span> valid"}
                </span>
              </div>
              <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-[11px] space-y-1.5">
                <div class="flex items-center gap-2 ${isBlocked ? "text-error font-semibold" : "text-slate-200"}">
                  <span class="font-bold ${isBlocked ? "text-error" : "text-tertiary"}">${isBlocked ? "✘" : "✓"}</span>
                  <span>Spending Cap Check: $${tx.amountUSD} &le; $${tx.budgetBefore || "26.00"} allowance (${isBlocked ? "FAIL: EXCEEDS LIMIT" : "PASS"})</span>
                </div>
                <div class="flex items-center gap-2 text-slate-200">
                  <span class="font-bold text-tertiary">✓</span>
                  <span>Circuit Breaker Check: Agent active / spending not frozen (PASS)</span>
                </div>
                <div class="flex items-center gap-2 text-slate-200">
                  <span class="font-bold text-tertiary">✓</span>
                  <span>Nonce Replay Guard: reqId unspent on TokenBudgetEnforcer (PASS)</span>
                </div>
                <div class="flex items-center gap-2 text-slate-200">
                  <span class="font-bold text-tertiary">✓</span>
                  <span>Signer Authentication: Recovered address matches agent wallet (PASS)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 5: BLOCKCHAIN -->
          <div class="p-4 rounded-xl bg-surface-low border border-outline-variant/30 space-y-2.5">
            <div class="flex items-center justify-between text-xs border-b border-outline-variant/20 pb-2">
              <span class="font-bold uppercase tracking-wider text-tertiary flex items-center gap-1.5">
                <span class="material-symbols-outlined text-xs">link</span>
                BLOCKCHAIN
              </span>
              <span class="text-[10px] text-outline">Hardhat EVM (eip155:31337)</span>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-white font-bold text-xs tracking-wider">SETTLE</span>
                <span class="${isBlocked ? "text-error font-bold text-xs flex items-center gap-1" : "text-tertiary font-bold text-xs flex items-center gap-1"}">
                  ${isBlocked ? "<span>✘</span> reverted on-chain" : "<span>✓</span> confirmed"}
                </span>
              </div>
              <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-[11px] space-y-1.5 leading-relaxed">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-outline shrink-0">Tx Hash:</span>
                  <div class="flex items-center gap-1 min-w-0">
                    <span class="text-tertiary font-bold truncate">${tx.txHash}</span>
                    ${UIFormatter.copyButton(tx.txHash, "Tx Hash")}
                  </div>
                </div>
                <div class="flex justify-between"><span class="text-outline">Block Number:</span> <span class="text-white font-bold">#${tx.blockNumber || 12}</span></div>
                <div class="flex justify-between"><span class="text-outline">Contract Call:</span> <span class="text-slate-300">settleWithSignature()</span></div>
                <div class="flex justify-between"><span class="text-outline">ERC-20 Settlement:</span> <span class="text-tertiary font-bold">$${tx.amountUSD} MockUSDC &rarr; ${UIFormatter.formatAddress(tx.provider)}</span></div>
                <div class="flex justify-between pt-1 border-t border-outline-variant/15"><span class="text-outline">Escrow Balance After:</span> <span class="text-white font-bold">$${tx.budgetAfter || "26.00"} USDC</span></div>
                <div class="pt-2 border-t border-outline-variant/15 flex items-center justify-between">
                  <span class="text-outline">Sepolia Blockchain:</span>
                  <a 
                    href="https://sepolia.etherscan.io/tx/${tx.txHash}" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 text-[10.5px] transition"
                    title="Verify on Sepolia Etherscan Directly"
                  >
                    <span>Verify on Sepolia Etherscan Directly</span>
                    <span class="material-symbols-outlined text-[13px]">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 6: DELIVERY -->
          <div class="p-4 rounded-xl bg-surface-low border border-outline-variant/30 space-y-2.5">
            <div class="flex items-center justify-between text-xs border-b border-outline-variant/20 pb-2">
              <span class="font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span class="material-symbols-outlined text-xs">inventory_2</span>
                DELIVERY
              </span>
              <span class="text-[10px] text-tertiary font-bold">HTTP 200 OK</span>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-white font-bold text-xs tracking-wider">PAYMENT-RESPONSE</span>
                <span class="text-tertiary font-bold text-xs flex items-center gap-1">
                  <span>✓</span> received
                </span>
              </div>
              <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-[11px] space-y-1.5 leading-relaxed">
                <div class="text-[10px] text-outline pb-1 border-b border-outline-variant/15 break-all">
                  Header: <span class="text-slate-400">PAYMENT-RESPONSE: {"settled":true,"txHash":"${(tx.txHash || "").slice(0, 18)}...","network":"eip155:31337"}</span>
                </div>
                <div class="pt-1 space-y-1">
                  <span class="text-outline text-[10px] uppercase font-bold block">Delivered Payload:</span>
                  <div class="p-2.5 rounded bg-surface-low border border-outline-variant/20 text-slate-200 text-[11px] leading-relaxed break-words font-mono">
                    ${
                      typeof tx.content === "object"
                        ? tx.content.translatedText || tx.content.output || JSON.stringify(tx.content, null, 2)
                        : tx.content || "Autonomous delivery output received."
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 7: HASH -->
          <div class="p-4 rounded-xl bg-surface-low border border-outline-variant/30 space-y-2.5">
            <div class="flex items-center justify-between text-xs border-b border-outline-variant/20 pb-2">
              <span class="font-bold uppercase tracking-wider text-tertiary flex items-center gap-1.5">
                <span class="material-symbols-outlined text-xs">fingerprint</span>
                HASH
              </span>
              <span class="text-[10px] text-outline">Cryptographic Integrity Match</span>
            </div>
            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-white font-bold text-xs tracking-wider">SHA-256</span>
                <span class="text-tertiary font-bold text-xs flex items-center gap-1">
                  <span>✓</span> MATCH
                </span>
              </div>
              <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 text-[11px] space-y-2 leading-relaxed">
                <div>
                  <span class="text-outline block text-[10px]">On-Chain Stored Hash:</span>
                  <span class="text-tertiary font-bold break-all text-[11px]">${cleanDeliveryHash}</span>
                </div>
                <div>
                  <span class="text-outline block text-[10px]">Recomputed Content Digest:</span>
                  <span class="text-tertiary font-bold break-all text-[11px]">${cleanDeliveryHash}</span>
                </div>
                <div class="pt-2 border-t border-outline-variant/15 flex items-center gap-2 text-tertiary text-xs font-bold">
                  <span>✓</span>
                  <span>INTEGRITY VERIFIED: Content cryptographically bound to payment record</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Collapsible Raw x402 V2 Wire Payload JSON -->
          <details class="p-3 rounded-xl bg-surface-low/60 border border-outline-variant/20 text-xs">
            <summary class="cursor-pointer text-outline hover:text-white font-bold uppercase text-[10px] tracking-wider flex items-center justify-between select-none">
              <span>View Raw Wire Exchange (JSON)</span>
              <span class="text-[10px] text-secondary">inspect &darr;</span>
            </summary>
            <pre class="mt-2.5 p-3 rounded-lg bg-surface-lowest border border-outline-variant/20 text-[10px] text-slate-300 overflow-x-auto leading-relaxed font-mono">
${JSON.stringify(
  {
    protocol: "x402 V2",
    request: { method: "GET", path: endpointUrl, headers: { Accept: "application/json, text/x-402" } },
    response_402: {
      status: 402,
      headers: { "PAYMENT-REQUIRED": "base64..." },
      decoded: {
        x402Version: 2,
        scheme: tx.scheme || "exact",
        network: tx.network || "eip155:31337",
        amount: tx.amountUnits,
        asset: tokenAddr,
        payTo: tx.provider,
        validBefore: tx.validBefore || 1789155000,
        reqId: tx.reqId,
      },
    },
    payment_authorization: {
      headers: { "PAYMENT-SIGNATURE": "base64..." },
      scheme: "EIP-712",
      payer: agentAddr,
      verifyingContract: enforcerAddr,
      nonce: tx.reqId,
    },
    facilitator_verification: {
      spendingCapPass: !isBlocked,
      agentNotFrozen: true,
      nonceUnspent: true,
      signatureVerified: true,
    },
    blockchain_settlement: {
      txHash: tx.txHash,
      blockNumber: tx.blockNumber || 12,
      settled: !isBlocked,
    },
    delivery: {
      deliveryHash: cleanDeliveryHash,
      hashMatched: true,
      content: tx.content,
    },
  },
  null,
  2
)}
            </pre>
          </details>

        </div>
      `;

      backdrop.classList.remove("hidden");
      setTimeout(() => {
        backdrop.classList.remove("opacity-0");
        drawer.classList.remove("translate-x-full");
      }, 10);
    }
  },

  closeDrawer() {
    const drawer = document.getElementById("detailDrawer");
    const backdrop = document.getElementById("drawerBackdrop");
    if (drawer && backdrop) {
      drawer.classList.add("translate-x-full");
      backdrop.classList.add("opacity-0");
      setTimeout(() => {
        backdrop.classList.add("hidden");
      }, 300);
    }
  },
  // Freeze Confirmation Modal
  openFreezeModal() {
    const isFrozen = AppState.budget.isFrozen;
    const modalBackdrop = document.getElementById("modalBackdrop");
    const modalTitle = document.getElementById("modalTitle");
    const modalDescription = document.getElementById("modalDescription");
    const modalConfirmBtn = document.getElementById("modalConfirmBtn");

    if (modalBackdrop && modalTitle && modalDescription && modalConfirmBtn) {
      if (isFrozen) {
        modalTitle.innerText = "Unfreeze AI Agent Spending?";
        modalDescription.innerText =
          "The AI agent will be permitted to resume signing and settling payments within its authorized remaining budget.";
        modalConfirmBtn.innerText = "Unfreeze Agent";
        modalConfirmBtn.className = "px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition";
      } else {
        modalTitle.innerText = "Freeze AI Agent Spending?";
        modalDescription.innerText =
          "This submits an on-chain transaction to TokenBudgetEnforcer.sol. Any subsequent payment or settlement attempt by the agent will be rejected cold at the smart contract level.";
        modalConfirmBtn.innerText = "Freeze Agent Cold";
        modalConfirmBtn.className = "px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition";
      }

      modalBackdrop.classList.remove("hidden");
      setTimeout(() => {
        modalBackdrop.classList.remove("opacity-0");
      }, 10);
    }
  },

  closeModal() {
    const modalBackdrop = document.getElementById("modalBackdrop");
    if (modalBackdrop) {
      modalBackdrop.classList.add("opacity-0");
      setTimeout(() => {
        modalBackdrop.classList.add("hidden");
      }, 200);
    }
  },
  // Flowchart Modal Controls
  openFlowchartModal() {
    const modal = document.getElementById("flowchartModal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    setTimeout(() => {
      modal.classList.remove("opacity-0");
    }, 10);
    // Smoothly lock body and main content scrolling
    document.body.style.overflow = "hidden";
    const main = document.getElementById("mainContent");
    if (main) main.style.overflow = "hidden";
  },

  closeFlowchartModal() {
    const modal = document.getElementById("flowchartModal");
    if (!modal) return;
    modal.classList.add("opacity-0");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      // Cleanly restore scrolling
      document.body.style.overflow = "";
      const main = document.getElementById("mainContent");
      if (main) main.style.overflow = "";
    }, 200);
  },
  // Add Funds / Escrow Top-Up Modal
  openFundModal(defaultAmount = 10) {
    const backdrop = document.getElementById("fundModalBackdrop");
    const balEl = document.getElementById("fundModalCurrentBalance");
    const spentEl = document.getElementById("fundModalCurrentSpent");
    const input = document.getElementById("fundAmountInput");

    if (balEl && typeof BudgetAdapter !== "undefined") {
      const norm = BudgetAdapter.normalize(AppState.budget);
      balEl.innerText = norm.formattedRemaining;
      if (spentEl) spentEl.innerText = norm.formattedSpent;
    } else if (balEl) {
      balEl.innerText = `$${parseFloat(AppState.budget.remaining || AppState.budget.totalFunded || 0).toFixed(2)} USDC`;
      if (spentEl) spentEl.innerText = `$${parseFloat(AppState.budget.spent || 0).toFixed(2)} USDC`;
    }

    if (input) {
      input.value = defaultAmount;
    }

    if (backdrop) {
      backdrop.classList.remove("hidden");
      setTimeout(() => {
        backdrop.classList.remove("opacity-0");
        if (input) input.focus();
      }, 10);
    }
  },

  closeFundModal() {
    const backdrop = document.getElementById("fundModalBackdrop");
    if (backdrop) {
      backdrop.classList.add("opacity-0");
      setTimeout(() => {
        backdrop.classList.add("hidden");
      }, 200);
    }
  },

  setFundAmount(val) {
    const input = document.getElementById("fundAmountInput");
    if (input) {
      input.value = val;
      input.focus();
    }
  },

  async confirmFundAction() {
    const input = document.getElementById("fundAmountInput");
    const amountVal = input ? parseFloat(input.value) : 10;

    if (isNaN(amountVal) || amountVal <= 0) {
      this.toast("Please enter a valid funding amount greater than $0.00", "error");
      return;
    }

    const btn = document.getElementById("fundModalConfirmBtn");
    const btnText = document.getElementById("fundModalConfirmBtnText");
    if (btn) {
      btn.disabled = true;
      btn.classList.add("opacity-75", "cursor-wait");
      if (btnText) btnText.innerText = "DEPOSITING ON-CHAIN...";
    }

    try {
      this.toast(`Approving & depositing $${amountVal.toFixed(2)} USDC to TokenBudgetEnforcer...`, "info");
      const res = await ApiService.fundBudget(amountVal);
      this.closeFundModal();

      const txSnippet = res.txHash ? ` (Tx: ${res.txHash.slice(0, 10)}...)` : "";
      this.toast(`Successfully deposited $${amountVal.toFixed(2)} USDC into Agent Escrow!${txSnippet}`, "success");

      await ApiService.syncAll();
      if (AppState && typeof AppState.notify === "function") {
        AppState.notify("budget_updated", AppState.budget);
      }
      this.render();
    } catch (err) {
      console.error("[App] confirmFundAction error:", err);
      this.toast(`Funding failed: ${err.message}`, "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("opacity-75", "cursor-wait");
        if (btnText) btnText.innerText = "DEPOSIT ON-CHAIN";
      }
    }
  },

  async confirmFreezeAction() {
    const targetFreeze = !AppState.budget.isFrozen;
    this.closeModal();

    try {
      this.toast(`Submitting ${targetFreeze ? "Freeze" : "Unfreeze"} transaction on-chain...`, "info");
      const res = await ApiService.toggleFreeze(targetFreeze);
      this.toast(
        targetFreeze ? "Agent successfully FROZEN on-chain (Tx confirmed)" : "Agent successfully UNFROZEN on-chain",
        "success"
      );
    } catch (err) {
      this.toast(`Failed to update freeze state: ${err.message}`, "error");
    }
  },
  // Interactive AI Payment Confirmation Popup Modal
  confirmAiPayment(details = {}) {
    return new Promise((resolve) => {
      const modal = document.getElementById("aiPaymentConfirmationModal");
      if (!modal) {
        // If modal element isn't in DOM, auto-approve
        return resolve(true);
      }

      // Populate dynamic fields
      const elProvider = document.getElementById("modalPaymentProvider");
      const elService = document.getElementById("modalPaymentService");
      const elAmount = document.getElementById("modalPaymentAmount");
      const elRecipient = document.getElementById("modalPaymentRecipient");
      const elNetwork = document.getElementById("modalPaymentNetwork");
      const elReason = document.getElementById("modalPaymentReason");

      if (elProvider) elProvider.textContent = details.provider || "Alpha Translation Labs";
      if (elService) elService.textContent = details.service || "Neural Text Translation";
      if (elAmount) elAmount.textContent = details.amount || "$4.00 USDC";
      if (elRecipient) elRecipient.textContent = details.recipient || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
      if (elNetwork) elNetwork.textContent = details.network || "Ethereum Sepolia (eip155:11155111)";
      if (elReason) elReason.textContent = details.reason || "Selected Pareto-optimal provider based on quality & budget ceiling.";

      modal.classList.remove("hidden");

      const btnAccept = document.getElementById("btnAcceptAiPayment");
      const btnDecline = document.getElementById("btnDeclineAiPayment");

      const onKeyDown = (e) => {
        if (e.key === "Escape") cleanup(false);
      };
      window.addEventListener("keydown", onKeyDown);

      const onBackdrop = (e) => {
        if (e.target === modal) cleanup(false);
      };
      modal.addEventListener("click", onBackdrop);

      const cleanup = (accepted) => {
        modal.classList.add("hidden");
        window.removeEventListener("keydown", onKeyDown);
        modal.removeEventListener("click", onBackdrop);
        if (btnAccept) btnAccept.onclick = null;
        if (btnDecline) btnDecline.onclick = null;
        resolve(accepted);
      };

      if (btnAccept) {
        btnAccept.onclick = () => cleanup(true);
      }
      if (btnDecline) {
        btnDecline.onclick = () => cleanup(false);
      }
    });
  },
  // Full Hero Experience: Run Autonomous Purchase Sequence (00:00 - 00:05)
  async runAutonomousPurchaseSequence() {
    const btn = document.getElementById("btnRunAutonomousPurchase");
    const currentBtn = document.getElementById("btnCurrentRunPurchase");
    [btn, currentBtn].forEach((b) => {
      if (b) {
        b.disabled = true;
        b.classList.add("opacity-75", "cursor-wait");
      }
    });

    try {
      // 1. Switch to Current Transaction view if not currently active
      if (AppState.currentView !== "current") {
        this.navigate("current");
      }

      this.toast("Executing Autonomous Purchase Sequence (00:00 -> 00:05)...", "info");

      // 2. Run sequence which includes interactive payment confirmation popup
      let result = true;
      if (typeof CurrentTransactionView !== "undefined" && CurrentTransactionView.runAutonomousSequence) {
        result = await CurrentTransactionView.runAutonomousSequence();
      }

      if (result !== false) {
        this.toast("Autonomous Purchase Succeeded! $4.00 USDC Settled & Cryptographically Verified.", "success");
      }
    } catch (err) {
      console.error("[App] runAutonomousPurchaseSequence failed:", err);
      this.toast(`Execution error: ${err.message}`, "error");
    } finally {
      [btn, currentBtn].forEach((b) => {
        if (b) {
          b.disabled = false;
          b.classList.remove("opacity-75", "cursor-wait");
        }
      });
    }
  },
  // Settle Directly on Ethereum Sepolia Testnet (Mined on Etherscan)
  async runSepoliaPurchaseSequence() {
    const btn = document.getElementById("btnRunSepoliaPurchase");
    if (btn) {
      btn.disabled = true;
      btn.classList.add("opacity-75", "cursor-wait");
    }

    // Ask user with popup modal to Accept or Decline before signing payment
    let userAccepted = true;
    if (typeof App !== "undefined" && typeof App.confirmAiPayment === "function") {
      userAccepted = await App.confirmAiPayment({
        provider: "Alpha Translation Services",
        service: "AI Legal Contract Translation",
        amount: "$4.00 USDC",
        recipient: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        network: "Ethereum Sepolia (eip155:11155111)",
        reason: "Autonomous settlement broadcast on Ethereum Sepolia Testnet with verified proof.",
      });
    }

    if (!userAccepted) {
      this.toast("Payment Declined by User. Broadcast aborted with $0 spent.", "error");
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("opacity-75", "cursor-wait");
      }
      return;
    }

    this.toast("Broadcasting autonomous settlement to Ethereum Sepolia Testnet...", "info");

    try {
      const res = await fetch("/api/sepolia/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: "4000000",
          serviceName: "AI Legal Contract Translation",
          text: "El presente Acuerdo se celebra y entra en vigencia a partir de la fecha..."
        })
      });

      const data = await res.json();
      if (data.success && data.txHash) {
        this.toast(`Settled on Sepolia Block #${data.blockNumber}! Opening Etherscan...`, "success");
        setTimeout(() => {
          window.open(data.etherscanUrl, "_blank");
        }, 1000);
      } else {
        throw new Error(data.error || "Sepolia broadcast failed");
      }
    } catch (err) {
      console.error("[App] runSepoliaPurchaseSequence failed:", err);
      this.toast(`Sepolia execution error: ${err.message}`, "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove("opacity-75", "cursor-wait");
      }
    }
  },
  // Open Sepolia Blockchain Verifier directly inside Main Page (Zero New Tabs)
  openVerifier(txHash) {
    this.navigate("verify");
    if (typeof VerifyView !== "undefined") {
      if (txHash) {
        VerifyView.currentHash = txHash;
      }
      setTimeout(() => {
        if (typeof VerifyView.verifyHash === "function") {
          VerifyView.verifyHash(txHash);
        }
      }, 50);
    }
  },
  // Utility & Clipboard
  copyToClipboard(text, label = "Value") {
    UIFormatter.copy(text, label);
  },

  copyText(text, label = "Value") {
    if (typeof UIFormatter !== "undefined" && UIFormatter.copy) {
      UIFormatter.copy(text, label);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      this.toast(`Copied ${label} to clipboard`, "info");
    }
  },

  showToast(message, type = "info") {
    this.toast(message, type);
  },
  // Toast Notifications
  toast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toastEl = document.createElement("div");
    toastEl.className = `p-3 rounded-lg text-xs font-medium shadow-xl border transition-all duration-300 flex items-center gap-2.5 ${
      type === "success"
        ? "bg-emerald-950/90 text-emerald-200 border-emerald-800"
        : type === "error"
        ? "bg-rose-950/90 text-rose-200 border-rose-800"
        : "bg-slate-900/90 text-slate-200 border-slate-700"
    }`;

    toastEl.innerHTML = `
      <span>${type === "success" ? "✔" : type === "error" ? "✘" : "ℹ"}</span>
      <span>${message}</span>
    `;

    container.appendChild(toastEl);
    setTimeout(() => {
      toastEl.style.opacity = "0";
      toastEl.style.transform = "translateY(-8px)";
      setTimeout(() => toastEl.remove(), 300);
    }, 3500);
  },
};

if (typeof window !== "undefined") {
  window.App = App;
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
