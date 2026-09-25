const AppState = {
  currentView: "overview",
  environment: "local",      // "local" | "sepolia"
  isMockMode: false,         // true when user toggles or backend is offline
  isBackendReachable: false, // live backend status

  // Live On-Chain Budget State
  budget: {
    totalFunded: "20.00",
    authorizedBudget: "20.00",
    settledSpend: "4.00",
    remaining: "16.00",
    unspentEscrow: "16.00",
    isFrozen: false,
    utilizationPercent: 20.0,
  },

  // Live & Historical Transactions
  transactions: [],
  x402Transactions: [],

  // Live Threat Defense Events
  alerts: [],

  // Live Real-Time Event Stream (SSE)
  isStreamConnected: false,
  liveEvents: [],

  // Active x402 V2 Protocol Execution State (Visible Step Machine)
  activeX402Flow: {
    stage: "SETTLED", // "IDLE" | "402" | "PAYMENT_SIGNED" | "VERIFY" | "SETTLE" | "SETTLED"
    stageIndex: 4,    // 0: IDLE, 1: 402, 2: PAYMENT_SIGNED, 3: VERIFY, 4: SETTLE
    resource: "Text Translation",
    amountUSD: "4.00",
    amountAtomic: "4000000",
    scheme: "exact",
    network: "eip155:31337",
    payTo: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    asset: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    reqId: "0x088e7c75ddcc48eba2b158c5b9268bf600000000000000000000000000000000",
    txHash: "0xcd056079875d69bc88e70eb82ba1f36ab203f9c7bf77b6ff39172242c26d9137",
    deliveryHash: "sha256:30f928ebdfd01ba8766adca93783758006ae9bd02f382a52c9daab35f5ed3a0f",
    statusText: "PAYMENT SETTLED ON-CHAIN",
    timestamp: new Date().toISOString(),
    rawHeader: null,
    paymentRequired: null,
  },

  // Providers & Services Marketplace Catalogue
  providers: [],
  services: [],

  // Operational Provider Selection State
  providerSelectionState: {
    phase: "selected", // "evaluating" | "candidate" | "rejected" | "selected"
    selectedId: "alpha-translate",
    taskPrompt: "Get the highest-quality translation under $5.",
    evaluations: {
      "alpha-translate": {
        id: "alpha-translate",
        name: "Alpha",
        fullName: "Alpha Translation Services",
        serviceType: "translation",
        endpoint: "/x402/providers/alpha-translate/service",
        price: "$4.00",
        priceNum: 4.0,
        quality: "0.92",
        qualityNum: 0.92,
        latency: "200ms",
        latencyNum: 200,
        aiScore: "0.91",
        scorePercent: 91,
        status: "SELECTED",
        statusText: "● SELECTED",
        statusBadgeClass: "bg-tertiary/20 text-tertiary border border-tertiary/50 glow-emerald",
        whyItems: [
          { icon: "✓", text: "Meets quality ≥0.90", color: "text-slate-200" },
          { icon: "✓", text: "Within $5 budget", color: "text-slate-200" },
          { icon: "✓", text: "Best weighted score", color: "text-tertiary font-bold" },
        ],
      },
      "beta-translate": {
        id: "beta-translate",
        name: "Beta",
        fullName: "Beta Translate (Budget)",
        serviceType: "translation",
        endpoint: "/x402/providers/beta-translate/service",
        price: "$3.00",
        priceNum: 3.0,
        quality: "0.84",
        qualityNum: 0.84,
        latency: "180ms",
        latencyNum: 180,
        aiScore: "0.78",
        scorePercent: 78,
        status: "CANDIDATE",
        statusText: "○ CANDIDATE",
        statusBadgeClass: "bg-surface-container text-outline border border-outline-variant/30",
        whyItems: [
          { icon: "✓", text: "Within $5 budget ($3.00)", color: "text-slate-200" },
          { icon: "✘", text: "Quality 0.84 < 0.90 threshold", color: "text-amber-400" },
          { icon: "⚠", text: "Discarded: lower quality score", color: "text-outline" },
        ],
      },
      "gamma-translate": {
        id: "gamma-translate",
        name: "Gamma",
        fullName: "Gamma Premium Translation",
        serviceType: "translation",
        endpoint: "/x402/providers/gamma-translate/service",
        price: "$6.00",
        priceNum: 6.0,
        quality: "0.97",
        qualityNum: 0.97,
        latency: "350ms",
        latencyNum: 350,
        aiScore: "0.00",
        scorePercent: 0,
        status: "REJECTED",
        statusText: "✘ REJECTED",
        statusBadgeClass: "bg-error/15 text-error border border-error/40 glow-crimson",
        whyItems: [
          { icon: "✓", text: "Meets quality bar (0.97)", color: "text-slate-200" },
          { icon: "✘", text: "Exceeds $5 budget ($6.00 > $5.00)", color: "text-error font-bold" },
          { icon: "✘", text: "Filtered by protocol ceiling rule", color: "text-error" },
        ],
      },
      "delta-compute": {
        id: "delta-compute",
        name: "Delta",
        fullName: "Delta Compute Engine",
        serviceType: "compute",
        endpoint: "/x402/providers/delta-compute/service",
        price: "$3.00",
        priceNum: 3.0,
        quality: "0.88",
        qualityNum: 0.88,
        latency: "120ms",
        latencyNum: 120,
        aiScore: "0.65",
        scorePercent: 65,
        status: "STANDBY",
        statusText: "○ STANDBY",
        statusBadgeClass: "bg-surface-lowest text-outline border border-outline-variant/30",
        whyItems: [
          { icon: "ℹ", text: "Compute node (not translation)", color: "text-outline" },
          { icon: "✓", text: "Available for off-chain batching", color: "text-outline" },
          { icon: "○", text: "Standby for task delegation", color: "text-outline" },
        ],
      },
      "epsilon-vision": {
        id: "epsilon-vision",
        name: "Epsilon",
        fullName: "Epsilon Vision AI",
        serviceType: "vision-ai",
        endpoint: "/x402/providers/epsilon-vision/service",
        price: "$5.00",
        priceNum: 5.0,
        quality: "0.95",
        qualityNum: 0.95,
        latency: "410ms",
        latencyNum: 410,
        aiScore: "0.72",
        scorePercent: 72,
        status: "STANDBY",
        statusText: "○ STANDBY",
        statusBadgeClass: "bg-surface-lowest text-outline border border-outline-variant/30",
        whyItems: [
          { icon: "ℹ", text: "Multimodal OCR (not text-only)", color: "text-outline" },
          { icon: "✓", text: "Meets $5 budget ceiling ($5.00)", color: "text-outline" },
          { icon: "○", text: "Standby for image translation", color: "text-outline" },
        ],
      },
    },
  },

  // System Configuration (Public Keys & Addresses)
  config: {
    enforcerAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    tokenAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    ownerAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    agentAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    chainId: 31337,
    network: "Local Hardhat EVM",
    networkCaip2: "eip155:31337",
    sepoliaChainId: 11155111,
    sepoliaCaip2: "eip155:11155111",
  },

  // Detail Drawer Selection
  selectedTx: null,

  // Event Listeners
  listeners: [],
  // Reactive Listener Methods
  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  },

  notify(event, data) {
    for (const fn of this.listeners) {
      try {
        fn(event, data);
      } catch (err) {
        console.error("State listener error:", err);
      }
    }
  },

  setView(viewName) {
    this.currentView = viewName;
    this.notify("view_changed", viewName);
  },

  setEnvironment(env) {
    this.environment = env;
    this.notify("env_changed", env);
  },

  setMockMode(isMock) {
    this.isMockMode = isMock;
    if (isMock) {
      this.loadMockSeed();
    }
    this.notify("mode_changed", isMock);
  },

  setSelectedTx(tx) {
    this.selectedTx = tx;
    this.notify("drawer_opened", tx);
  },

  updateBudget(budgetData) {
    if (typeof BudgetAdapter !== "undefined") {
      this.budget = BudgetAdapter.normalize({ ...this.budget, ...budgetData });
    } else {
      Object.assign(this.budget, budgetData);
    }
    this.notify("budget_updated", this.budget);
  },

  updateTransactions(txList) {
    const rawList = Array.isArray(txList) ? txList : [];
    const existing = Array.isArray(this.transactions) ? this.transactions : [];
    const map = new Map();

    // 1. Ingest incoming transactions
    for (const item of rawList) {
      if (!item) continue;
      const key = (item.txHash || item.reqId || "").toLowerCase();
      if (key) map.set(key, item);
    }

    // 2. Keep any newly completed transactions from this session
    for (const item of existing) {
      if (!item) continue;
      const key = (item.txHash || item.reqId || "").toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, item);
      }
    }

    const merged = Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    if (typeof TransactionAdapter !== "undefined") {
      this.transactions = TransactionAdapter.normalizeList(merged);
    } else {
      this.transactions = merged;
    }
    this.notify("transactions_updated", this.transactions);
  },

  updateX402Transactions(xList) {
    if (typeof TransactionAdapter !== "undefined") {
      this.x402Transactions = TransactionAdapter.normalizeList(xList);
    } else {
      this.x402Transactions = xList || [];
    }
    this.notify("x402_updated", this.x402Transactions);
  },

  updateAlerts(alertList) {
    if (typeof SecurityAdapter !== "undefined") {
      this.alerts = SecurityAdapter.normalizeList(alertList);
    } else {
      this.alerts = alertList || [];
    }
    this.notify("alerts_updated", this.alerts);
  },

  updateProviders(pList) {
    if (typeof ProviderAdapter !== "undefined") {
      this.providers = ProviderAdapter.normalizeList(pList);
    } else {
      this.providers = pList || [];
    }
    this.notify("providers_updated", this.providers);
  },

  updateServices(sList) {
    this.services = sList || [];
    this.notify("services_updated", this.services);
  },

  addService(service) {
    if (!service) return;
    this.services = [service, ...this.services.filter((s) => s.serviceId !== service.serviceId)];
    this.notify("services_updated", this.services);
  },

  setLiveEvents(events) {
    this.liveEvents = events || [];
    this.notify("live_events_updated", this.liveEvents);
  },

  addLiveEvent(evt) {
    this.liveEvents.unshift(evt);
    if (this.liveEvents.length > 100) {
      this.liveEvents.pop();
    }
    this.notify("live_event_received", evt);
  },

  handleStreamEvent(evt) {
    this.addLiveEvent(evt);

    if (evt && (evt.type === "service_published" || evt.type === "SERVICE_PUBLISHED")) {
      const svc = evt.data && evt.data.service ? evt.data.service : evt.data;
      if (svc && svc.name) {
        this.addService(svc);
      }
    }

    if (evt && (evt.type === "SETTLEMENT_CONFIRMED" || evt.type === "settlement_confirmed" || evt.type === "BUDGET_FUNDED")) {
      if (typeof ApiService !== "undefined") {
        ApiService.syncAll();
      }
    }
  },

  clearLiveEvents() {
    this.liveEvents = [];
    this.notify("live_events_cleared", []);
  },

  updateActiveX402Flow(patch) {
    this.activeX402Flow = { ...this.activeX402Flow, ...patch };
    this.notify("x402_flow_updated", this.activeX402Flow);
  },

  setProviderSelectionPhase(phase) {
    if (!this.providerSelectionState || !this.providerSelectionState.evaluations) return;
    this.providerSelectionState.phase = phase;
    const evals = this.providerSelectionState.evaluations;

    if (phase === "evaluating") {
      evals["alpha-translate"].status = "EVALUATING";
      evals["alpha-translate"].statusText = "Evaluating...";
      evals["alpha-translate"].statusBadgeClass = "bg-primary/20 text-primary-light border border-primary/40 animate-pulse";
      evals["alpha-translate"].aiScore = "...";

      evals["beta-translate"].status = "EVALUATING";
      evals["beta-translate"].statusText = "Evaluating...";
      evals["beta-translate"].statusBadgeClass = "bg-primary/20 text-primary-light border border-primary/40 animate-pulse";
      evals["beta-translate"].aiScore = "...";

      evals["gamma-translate"].status = "EVALUATING";
      evals["gamma-translate"].statusText = "Evaluating...";
      evals["gamma-translate"].statusBadgeClass = "bg-primary/20 text-primary-light border border-primary/40 animate-pulse";
      evals["gamma-translate"].aiScore = "...";

      evals["delta-compute"].status = "STANDBY";
      evals["delta-compute"].statusText = "○ STANDBY";
      evals["delta-compute"].statusBadgeClass = "bg-surface-lowest text-outline border border-outline-variant/30";

      evals["epsilon-vision"].status = "STANDBY";
      evals["epsilon-vision"].statusText = "○ STANDBY";
      evals["epsilon-vision"].statusBadgeClass = "bg-surface-lowest text-outline border border-outline-variant/30";
    } else if (phase === "candidate") {
      evals["alpha-translate"].status = "CANDIDATE";
      evals["alpha-translate"].statusText = "Candidate";
      evals["alpha-translate"].statusBadgeClass = "bg-secondary/20 text-secondary border border-secondary/40";
      evals["alpha-translate"].aiScore = "0.91";

      evals["beta-translate"].status = "CANDIDATE";
      evals["beta-translate"].statusText = "Candidate";
      evals["beta-translate"].statusBadgeClass = "bg-secondary/20 text-secondary border border-secondary/40";
      evals["beta-translate"].aiScore = "0.78";

      evals["gamma-translate"].status = "REJECTED";
      evals["gamma-translate"].statusText = "Rejected";
      evals["gamma-translate"].statusBadgeClass = "bg-error/15 text-error border border-error/40 glow-crimson";
      evals["gamma-translate"].aiScore = "0.00";

      evals["delta-compute"].status = "STANDBY";
      evals["delta-compute"].statusText = "○ STANDBY";
      evals["delta-compute"].statusBadgeClass = "bg-surface-lowest text-outline border border-outline-variant/30";

      evals["epsilon-vision"].status = "STANDBY";
      evals["epsilon-vision"].statusText = "○ STANDBY";
      evals["epsilon-vision"].statusBadgeClass = "bg-surface-lowest text-outline border border-outline-variant/30";
    } else if (phase === "rejected") {
      evals["alpha-translate"].status = "CANDIDATE";
      evals["alpha-translate"].statusText = "Leading Candidate";
      evals["alpha-translate"].statusBadgeClass = "bg-primary/20 text-primary-light border border-primary/50";
      evals["alpha-translate"].aiScore = "0.91";

      evals["beta-translate"].status = "REJECTED";
      evals["beta-translate"].statusText = "Rejected";
      evals["beta-translate"].statusBadgeClass = "bg-error/15 text-error/80 border border-error/30";
      evals["beta-translate"].aiScore = "0.78";

      evals["gamma-translate"].status = "REJECTED";
      evals["gamma-translate"].statusText = "Rejected";
      evals["gamma-translate"].statusBadgeClass = "bg-error/15 text-error border border-error/40 glow-crimson";
      evals["gamma-translate"].aiScore = "0.00";

      evals["delta-compute"].status = "STANDBY";
      evals["delta-compute"].statusText = "○ STANDBY";
      evals["delta-compute"].statusBadgeClass = "bg-surface-lowest text-outline border border-outline-variant/30";

      evals["epsilon-vision"].status = "STANDBY";
      evals["epsilon-vision"].statusText = "○ STANDBY";
      evals["epsilon-vision"].statusBadgeClass = "bg-surface-lowest text-outline border border-outline-variant/30";
    } else {
      evals["alpha-translate"].status = "SELECTED";
      evals["alpha-translate"].statusText = "● SELECTED";
      evals["alpha-translate"].statusBadgeClass = "bg-tertiary/20 text-tertiary border border-tertiary/50 glow-emerald";
      evals["alpha-translate"].aiScore = "0.91";

      evals["beta-translate"].status = "CANDIDATE";
      evals["beta-translate"].statusText = "○ CANDIDATE (STANDBY)";
      evals["beta-translate"].statusBadgeClass = "bg-surface-container text-outline border border-outline-variant/30";
      evals["beta-translate"].aiScore = "0.78";

      evals["gamma-translate"].status = "REJECTED";
      evals["gamma-translate"].statusText = "✘ REJECTED";
      evals["gamma-translate"].statusBadgeClass = "bg-error/15 text-error border border-error/40 glow-crimson";
      evals["gamma-translate"].aiScore = "0.00";

      evals["delta-compute"].status = "STANDBY";
      evals["delta-compute"].statusText = "○ STANDBY";
      evals["delta-compute"].statusBadgeClass = "bg-surface-lowest text-outline border border-outline-variant/30";

      evals["epsilon-vision"].status = "STANDBY";
      evals["epsilon-vision"].statusText = "○ STANDBY";
      evals["epsilon-vision"].statusBadgeClass = "bg-surface-lowest text-outline border border-outline-variant/30";
    }

    this.notify("provider_selection_phase_changed", { phase, state: this.providerSelectionState });
  },

  handleStreamEvent(evt) {
    if (!evt || !evt.type) return;

    this.addLiveEvent(evt);

    switch (evt.type) {
      case "SETTLEMENT_CONFIRMED":
        this.handleSettlementConfirmed(evt);
        break;
      case "DELIVERY_RECEIVED":
      case "HASH_VERIFIED":
        this.handleDeliveryVerified(evt);
        break;
      case "OVERSPEND_BLOCKED":
      case "SECURITY_ALERT":
      case "AGENT_FROZEN":
      case "AGENT_UNFROZEN":
        this.handleSecurityEvent(evt);
        break;
      case "PROVIDER_SEARCH":
        this.setProviderSelectionPhase("evaluating");
        break;
      case "PROVIDER_SELECTED":
        this.setProviderSelectionPhase("selected");
        break;
      case "BUDGET_FUNDED":
        if (evt.data && evt.data.totalFunded) {
          this.updateBudget(evt.data);
        }
        break;
      default:
        break;
    }
    this.notify("stream_event_processed", evt);
  },

  handleSettlementConfirmed(evt) {
    const data = evt.data || {};
    const txHash = data.txHash || evt.txHash || ("0x" + Math.random().toString(16).substring(2, 10));
    const reqId = data.reqId || evt.reqId || ("0x" + Math.random().toString(16).substring(2, 18));
    const amountUSD = evt.amountUSD || (data.amountAtomic ? (Number(data.amountAtomic) / 1e6).toFixed(2) : "4.00");
    const amountNum = parseFloat(amountUSD) || 4.00;

    const currentRemaining = parseFloat(this.budget.remaining) || 26.00;
    const newRemaining = Math.max(0, currentRemaining - amountNum).toFixed(2);
    const currentSettled = parseFloat(this.budget.settledSpend) || 0.00;
    const newSettled = (currentSettled + amountNum).toFixed(2);
    const totalFunded = parseFloat(this.budget.totalFunded) || 50.00;
    const newUtil = totalFunded > 0 ? ((parseFloat(newSettled) / totalFunded) * 100).toFixed(1) : "0.0";

    this.budget = {
      ...this.budget,
      remaining: newRemaining,
      settledSpend: newSettled,
      unspentEscrow: newRemaining,
      utilizationPercent: parseFloat(newUtil),
    };

    const newTx = {
      reqId: reqId,
      txHash: txHash,
      provider: data.provider || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      providerName: data.providerName || "Alpha Translation Services",
      serviceType: data.serviceType || "translation",
      amountUSD: amountUSD,
      amountAtomic: data.amountAtomic || String(amountNum * 1e6),
      status: "SETTLED",
      statusText: "SETTLED",
      blockNumber: data.blockNumber || 12,
      timestamp: evt.timestamp || new Date().toISOString(),
      verified: true,
      hashMatched: true,
      deliveryProof: data.deliveryProof || {
        receiptHash: "0x7a3c881fa990021b6623e",
        verificationMethod: "SHA-256",
        signatureVerified: true,
      },
    };

    const normalizedTx = typeof TransactionAdapter !== "undefined"
      ? TransactionAdapter.normalize(newTx)
      : newTx;

    this.transactions.unshift(normalizedTx);
    if (this.transactions.length > 50) this.transactions.pop();

    this.selectedTx = normalizedTx;

    this.updateActiveX402Flow({
      stage: "SETTLED",
      stageIndex: 5,
      statusText: "SETTLEMENT CONFIRMED ON-CHAIN",
      txHash: txHash,
      reqId: reqId,
      amountUSD: amountUSD,
      timestamp: evt.timestamp,
    });

    this.notify("budget_updated", this.budget);
    this.notify("transactions_updated", this.transactions);
    this.notify("settlement_confirmed", normalizedTx);
  },

  handleDeliveryVerified(evt) {
    const data = evt.data || {};
    if (this.selectedTx) {
      this.selectedTx.hashMatched = true;
      this.selectedTx.verified = true;
      if (data.receiptHash) {
        this.selectedTx.receiptHash = data.receiptHash;
      }
    }
    this.notify("delivery_verified", evt);
  },

  handleSecurityEvent(evt) {
    const data = evt.data || {};
    const alert = {
      id: "sec-" + Date.now(),
      type: evt.type,
      title: evt.message || evt.type.replace(/_/g, " "),
      severity: evt.type === "AGENT_FROZEN" ? "CRITICAL" : "HIGH",
      timestamp: evt.timestamp || new Date().toISOString(),
      details: data,
      resolved: false,
    };
    if (evt.type === "AGENT_FROZEN") {
      this.budget.isFrozen = true;
      this.notify("budget_updated", this.budget);
    } else if (evt.type === "AGENT_UNFROZEN") {
      this.budget.isFrozen = false;
      this.notify("budget_updated", this.budget);
    }
    this.alerts.unshift(alert);
    if (this.alerts.length > 20) this.alerts.pop();
    this.notify("alerts_updated", this.alerts);
    this.notify("security_event", alert);
  },
  // High-Fidelity Mock Seed Data (Reflects Canonical 10-Step Flagship Scenario)
  loadMockSeed() {
    this.budget = typeof BudgetAdapter !== "undefined"
      ? BudgetAdapter.normalize({
          totalFunded: "30.00",
          authorizedBudget: "20.00",
          settledSpend: "4.00",
          remaining: "26.00",
          unspentEscrow: "26.00",
          isFrozen: false,
          utilizationPercent: 20.0,
        })
      : {
          totalFunded: "30.00",
          authorizedBudget: "20.00",
          settledSpend: "4.00",
          remaining: "26.00",
          unspentEscrow: "26.00",
          isFrozen: false,
          utilizationPercent: 20.0,
        };

    const mockTransactions = [
      {
        reqId: "0x7a304e287a19c11da841029ca91c4918e974cb381295db283f124c8000000000",
        provider: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        providerName: "Alpha Translation Services",
        serviceName: "AI Legal Contract Translation",
        serviceId: "text-translate",
        amount: "4000000",
        amountUSD: "4.00",
        deliveryHash: "sha256:6f3e1b092df48641a9985923b7e411c50064f2ab72e424e8e040c5b367098412",
        status: "SETTLED",
        txHash: "0xb9d3d3491888106ee4c0eb63717ede3ced22cbd65dcb0c284cc4a6ab4312aa75",
        blockNumber: 11781628,
        timestamp: new Date(Date.now() - 60000).toISOString(),
        intent: "Execute AI Legal Contract Translation from Alpha Translation Services",
        quality: 0.98,
        x402Version: 2,
        scheme: "exact",
        network: "Ethereum Sepolia Testnet",
        chainId: 11155111,
        caip2: "eip155:11155111",
        etherscanUrl: "https://sepolia.etherscan.io/tx/0xb9d3d3491888106ee4c0eb63717ede3ced22cbd65dcb0c284cc4a6ab4312aa75",
        asset: "0xAaa008Df25A46dc501B5B712ac18B47901AF99A7",
        payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        nonce: "0x7a304e287a19c11da84102",
        validBefore: Math.floor(Date.now() / 1000) + 3600,
        content: {
          sourceText: "This legal agreement is verified, secure, and confidential.",
          targetLanguage: "Spanish",
          translatedText: "Este acuerdo legal esta verificado, seguro y confidencial segun el protocolo W3A-1.",
          qualityConfidence: 0.98,
        },
        hashVerified: true,
        budgetBefore: "30.00",
        budgetAfter: "26.00",
      },
      {
        reqId: "0x4b2c1f938d874ab281295cb283f124c800000000000000000000000000000000",
        provider: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        providerName: "Alpha Translation Services",
        serviceName: "AI Legal Contract Translation",
        serviceId: "text-translate",
        amount: "4000000",
        amountUSD: "4.00",
        deliveryHash: "sha256:6f3e1b092df48641a9985923b7e411c50064f2ab72e424e8e040c5b367098412",
        status: "SETTLED",
        txHash: "0xfefb3725ca1a870d8d1d41ee370ac686becb5f28f39aa790ce6eeb6827f47069",
        blockNumber: 11779302,
        timestamp: new Date(Date.now() - 120000).toISOString(),
        intent: "Get the highest-quality translation under $5",
        quality: 0.98,
        x402Version: 2,
        scheme: "exact",
        network: "Ethereum Sepolia Testnet",
        chainId: 11155111,
        caip2: "eip155:11155111",
        etherscanUrl: "https://sepolia.etherscan.io/tx/0xfefb3725ca1a870d8d1d41ee370ac686becb5f28f39aa790ce6eeb6827f47069",
        asset: "0xAaa008Df25A46dc501B5B712ac18B47901AF99A7",
        payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        nonce: "0x4b2c1f938d874ab2",
        validBefore: Math.floor(Date.now() / 1000) + 3600,
        content: {
          sourceText: "The quick brown fox jumps over the lazy dog",
          targetLanguage: "Spanish",
          translatedText: "[Alpha] El rapido zorro marron salta sobre el perro perezoso",
          qualityConfidence: 0.98,
        },
        hashVerified: true,
        budgetBefore: "30.00",
        budgetAfter: "26.00",
      },
      {
        reqId: "0x0000000000000000000000000000000000000000000000000000000000000200",
        provider: "0xf9f296e97062F49ad3d13aF96729F7c35a7eA75e",
        providerName: "TokenBudgetEnforcer.sol",
        serviceName: "Escrow Budget Deposit ($50.00 MockUSDC)",
        serviceId: "escrow-deposit",
        amount: "50000000",
        amountUSD: "50.00",
        deliveryHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
        status: "SETTLED",
        txHash: "0x89ef9d6e9a532a49ac6eb2cbad1de4e08067cdb3ac7b741a8481a3198f3499ac",
        blockNumber: 11779300,
        timestamp: new Date(Date.now() - 360000).toISOString(),
        intent: "Fund escrow budget allowance with $50.00 MockUSDC",
        quality: 1.0,
        x402Version: 2,
        scheme: "exact",
        network: "Ethereum Sepolia Testnet",
        chainId: 11155111,
        caip2: "eip155:11155111",
        etherscanUrl: "https://sepolia.etherscan.io/tx/0x89ef9d6e9a532a49ac6eb2cbad1de4e08067cdb3ac7b741a8481a3198f3499ac",
        asset: "0xAaa008Df25A46dc501B5B712ac18B47901AF99A7",
        payer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        nonce: "0x0000000000000002",
        validBefore: Math.floor(Date.now() / 1000) + 3600,
        content: {
          processedRecords: 1,
          result: "50.00 MockUSDC Deposited to Sepolia Escrow",
        },
        hashVerified: true,
        budgetBefore: "50.00",
        budgetAfter: "50.00",
      },
      {
        reqId: "0x37815bb89cda313f4117cc039be4afef7047cfb1a86b3a208b66f8037f092f0f",
        provider: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        providerName: "Alpha Translation Services",
        serviceName: "AI Legal Contract Translation",
        serviceId: "text-translate",
        amount: "4000000",
        amountUSD: "4.00",
        deliveryHash: "sha256:e281dc941c35f53f89b66e015811b8f0544c30c7b27d47306029e2390b23e3fc",
        status: "SETTLED",
        txHash: "0x303ae7447a4b78850a86e5ecf126d1437b8094c045b1fe9917aacb98698ec289",
        blockNumber: 11766297,
        timestamp: new Date(Date.now() - 480000).toISOString(),
        intent: "Translate international trade agreement",
        quality: 0.99,
        x402Version: 2,
        scheme: "exact",
        network: "Ethereum Sepolia Testnet",
        chainId: 11155111,
        caip2: "eip155:11155111",
        etherscanUrl: "https://sepolia.etherscan.io/tx/0x303ae7447a4b78850a86e5ecf126d1437b8094c045b1fe9917aacb98698ec289",
        asset: "0xAaa008Df25A46dc501B5B712ac18B47901AF99A7",
        payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        nonce: "0x37815bb89cda313f",
        validBefore: Math.floor(Date.now() / 1000) + 3600,
        content: {
          sourceText: "Commercial trade terms verified under autonomous escrow.",
          translatedText: "Terminos comerciales verificados bajo fideicomiso autonomo.",
          qualityConfidence: 0.99,
        },
        hashVerified: true,
        budgetBefore: "34.00",
        budgetAfter: "30.00",
      },
    ];

    this.transactions = typeof TransactionAdapter !== "undefined"
      ? TransactionAdapter.normalizeList(mockTransactions)
      : mockTransactions;

    const mockX402 = [
      {
        x402Version: 2,
        scheme: "exact",
        network: "eip155:11155111",
        asset: "0xAaa008Df25A46dc501B5B712ac18B47901AF99A7",
        amount: "4000000",
        amountUSD: "4.00",
        payTo: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        reqId: "0x4b2c1f938d874ab281295cb283f124c800000000000000000000000000000000",
        nonce: "0x4b2c1f938d874ab2",
        signatureStatus: "VERIFIED",
        verificationStatus: "PASSED",
        settlementStatus: "SETTLED",
        txHash: "0xfefb3725ca1a870d8d1d41ee370ac686becb5f28f39aa790ce6eeb6827f47069",
        deliveryHash: "sha256:6f3e1b092df48641a9985923b7e411c50064f2ab72e424e8e040c5b367098412",
        etherscanUrl: "https://sepolia.etherscan.io/tx/0xfefb3725ca1a870d8d1d41ee370ac686becb5f28f39aa790ce6eeb6827f47069",
        budgetBefore: "30.00",
        budgetAfter: "26.00",
        timestamp: new Date(Date.now() - 120000).toISOString(),
      },
    ];

    this.x402Transactions = typeof TransactionAdapter !== "undefined"
      ? TransactionAdapter.normalizeList(mockX402)
      : mockX402;

    const mockAlerts = [
      {
        type: "OVERSPEND_ATTACK_BLOCKED",
        severity: "CRITICAL",
        reqId: "0xbad0000192837461928374619283746192837461928374619283746192837461",
        provider: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        amount: "25000000",
        amountUSD: "25.00",
        reason: "Smart contract rejected: requested $25.00 exceeds remaining budget $20.00 (ZERO tokens moved)",
        txHash: "0xreverted_on_chain",
        timestamp: new Date(Date.now() - 60000).toISOString(),
      },
      {
        type: "REPLAY_ATTACK_BLOCKED",
        severity: "HIGH",
        reqId: "0xa861c813eae94fc9b69711ca72b10088fe919a2e389201928374829102837461",
        provider: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        reason: "Contract replay guard rejected: request ID already used on-chain",
        txHash: "0xreverted_on_chain",
        timestamp: new Date(Date.now() - 180000).toISOString(),
      },
      {
        type: "DELIVERY_TAMPERING_DETECTED",
        severity: "HIGH",
        reqId: "0xc902341283746192837461928374619283746192837461928374619283746192",
        provider: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        reason: "Client SHA-256 verification failed: provider delivered corrupted payload",
        txHash: "0x91823719...",
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
    ];

    this.alerts = typeof SecurityAdapter !== "undefined"
      ? SecurityAdapter.normalizeList(mockAlerts)
      : mockAlerts;

    const mockProviders = [
      {
        providerId: "alpha-translate",
        name: "Alpha Translation Services",
        serviceType: "translation",
        services: [
          {
            serviceId: "text-translate",
            name: "Text Translation",
            price: 4,
            currency: "MockUSDC",
            description: "Accurate translation with cultural nuance checking.",
          },
        ],
        qualityScore: 0.92,
        estimatedLatencyMs: 200,
        availability: 1.0,
        reason: "Highest quality score (0.92) satisfying human budget constraint (under $5).",
      },
      {
        providerId: "beta-translate",
        name: "Beta Translate (Budget)",
        serviceType: "translation",
        services: [
          {
            serviceId: "text-translate",
            name: "Text Translation",
            price: 3,
            currency: "MockUSDC",
            description: "Fast, cost-effective translation.",
          },
        ],
        qualityScore: 0.84,
        estimatedLatencyMs: 100,
        availability: 1.0,
        reason: "Alternative budget fallback candidate ($3.00, quality 0.84).",
      },
      {
        providerId: "gamma-translate",
        name: "Gamma Premium Translation",
        serviceType: "translation",
        services: [
          {
            serviceId: "text-translate",
            name: "Text Translation (Premium)",
            price: 6,
            currency: "MockUSDC",
            description: "Highest quality, human-reviewed translation.",
          },
        ],
        qualityScore: 0.97,
        estimatedLatencyMs: 400,
        availability: 1.0,
        reason: "Exceeds $5 human budget limit — filtered out by agent selector.",
      },
      {
        providerId: "delta-compute",
        name: "Delta Compute Engine",
        serviceType: "compute",
        services: [
          {
            serviceId: "data-process",
            name: "Data Processing",
            price: 3,
            currency: "MockUSDC",
            description: "Deterministic data transformation and analysis.",
          },
        ],
        qualityScore: 0.88,
        estimatedLatencyMs: 150,
        availability: 1.0,
        reason: "Selected for parallel compute workloads under $4.",
      },
      {
        providerId: "epsilon-vision",
        name: "Epsilon Vision AI",
        serviceType: "image-analysis",
        services: [
          {
            serviceId: "image-analyze",
            name: "Image Analysis",
            price: 5,
            currency: "MockUSDC",
            description: "Object detection and scene classification.",
          },
        ],
        qualityScore: 0.95,
        estimatedLatencyMs: 600,
        availability: 1.0,
        reason: "Selected for visual inspection tasks with quality 0.95.",
      },
    ];

    this.providers = typeof ProviderAdapter !== "undefined"
      ? ProviderAdapter.normalizeList(mockProviders)
      : mockProviders;

    this.services = [
      {
        serviceId: "text-translate",
        name: "Translation API",
        providerId: "alpha-translate",
        providerName: "Alpha Translate",
        description: "Translate documents to Hindi with nuance verification",
        quality: 0.92,
        latency: "200ms",
        latencyMs: 200,
        price: "$4.00 USDC / request",
        priceNum: 4.0,
        category: "Translation",
        endpoint: "/x402/providers/alpha-translate/service?serviceId=text-translate",
        protocol: "x402 V2",
        status: "AVAILABLE",
        x402Enabled: true,
      },
      {
        serviceId: "data-process",
        name: "Compute API",
        providerId: "delta-compute",
        providerName: "Delta Compute",
        description: "Process statistical datasets and mathematical aggregates",
        quality: 0.88,
        latency: "150ms",
        latencyMs: 150,
        price: "$3.50 USDC / job",
        priceNum: 3.5,
        category: "Compute",
        endpoint: "/x402/providers/delta-compute/service?serviceId=data-process",
        protocol: "x402 V2",
        status: "AVAILABLE",
        x402Enabled: true,
      },
      {
        serviceId: "image-analyze",
        name: "Vision OCR API",
        providerId: "epsilon-vision",
        providerName: "Epsilon Vision AI",
        description: "Multimodal object detection and visual scene understanding",
        quality: 0.95,
        latency: "410ms",
        latencyMs: 410,
        price: "$5.00 USDC / request",
        priceNum: 5.0,
        category: "Vision AI",
        endpoint: "/x402/providers/epsilon-vision/service?serviceId=image-analyze",
        protocol: "x402 V2",
        status: "AVAILABLE",
        x402Enabled: true,
      },
      {
        serviceId: "budget-translate",
        name: "Budget Translation API",
        providerId: "beta-translate",
        providerName: "Beta Translate",
        description: "Fast, cost-effective translation for high-volume jobs",
        quality: 0.84,
        latency: "100ms",
        latencyMs: 100,
        price: "$3.00 USDC / request",
        priceNum: 3.0,
        category: "Translation",
        endpoint: "/x402/providers/beta-translate/service?serviceId=text-translate",
        protocol: "x402 V2",
        status: "AVAILABLE",
        x402Enabled: true,
      },
      {
        serviceId: "premium-translate",
        name: "Premium Translation API",
        providerId: "gamma-translate",
        providerName: "Gamma Premium Translation",
        description: "Highest quality, human-reviewed critical translation",
        quality: 0.97,
        latency: "400ms",
        latencyMs: 400,
        price: "$6.00 USDC / request",
        priceNum: 6.0,
        category: "Translation",
        endpoint: "/x402/providers/gamma-translate/service?serviceId=text-translate",
        protocol: "x402 V2",
        status: "AVAILABLE",
        x402Enabled: true,
      },
    ];
  },
};

// Auto-seed mock data on script load
AppState.loadMockSeed();

if (typeof window !== "undefined") {
  window.AppState = AppState;
  window.State = AppState;
}
