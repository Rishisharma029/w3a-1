/**
 * dashboard/public/js/views/providers.js
 *
 * Page 4: Provider Marketplace & Operational Autonomous Selection
 * ===============================================================
 * Features:
 *   - Operational PROVIDER MARKET showing live multi-constraint evaluation
 *   - Alpha, Beta, Gamma, Delta, Epsilon cards with Price, Quality, Latency
 *   - High-visibility AI SCORE (Weighted Frontier Metric)
 *   - Operational STATUS badge (SELECTED, CANDIDATE, REJECTED, STANDBY)
 *   - WHY? Autonomous AI Decision Rationale bullet points
 *   - Animated 4-stage selection state machine:
 *       Evaluating... -> Candidate -> Rejected -> Selected
 *   - Reactive Pub/Sub subscription to AppState
 */

const ProvidersView = {
  initialized: false,
  activeTab: "marketplace", // "marketplace" | "evaluation"
  selectedCategory: "all",
  searchQuery: "",
  viewingService: null,
  isPublishModalOpen: false,
  testChallengeLoading: false,
  testChallengeResult: null,

  init() {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof AppState !== "undefined" && typeof AppState.subscribe === "function") {
      AppState.subscribe((event, data) => this.onStateChange(event, data));
    }
  },

  onStateChange(event, data) {
    if (
      event === "services_updated" ||
      event === "providers_updated" ||
      event === "provider_selection_phase_changed" ||
      event === "stream_event_processed" ||
      event === "live_event_received"
    ) {
      this.reRenderIfMounted();
    }
  },

  reRenderIfMounted() {
    if (typeof document === "undefined") return;
    const root = document.getElementById("providers-view-root");
    if (root) {
      root.innerHTML = this.renderContent();
    }
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.reRenderIfMounted();
  },

  setCategory(cat) {
    this.selectedCategory = cat;
    this.reRenderIfMounted();
  },

  setSearchQuery(q) {
    this.searchQuery = (q || "").trim().toLowerCase();
    this.reRenderIfMounted();
  },

  openPublishModal() {
    this.isPublishModalOpen = true;
    this.reRenderIfMounted();
  },

  closePublishModal() {
    this.isPublishModalOpen = false;
    this.reRenderIfMounted();
  },

  openViewService(serviceId) {
    const services = this.getMarketplaceServices();
    this.viewingService = services.find((s) => s.serviceId === serviceId) || null;
    this.testChallengeResult = null;
    this.testChallengeLoading = false;
    this.reRenderIfMounted();
  },

  closeViewService() {
    this.viewingService = null;
    this.testChallengeResult = null;
    this.testChallengeLoading = false;
    this.reRenderIfMounted();
  },

  async runTestChallenge(endpoint) {
    this.testChallengeLoading = true;
    this.testChallengeResult = null;
    this.reRenderIfMounted();

    try {
      const res = await ApiService.testServiceChallenge(endpoint);
      this.testChallengeResult = res;
    } catch (err) {
      this.testChallengeResult = { status: 0, error: err.message, is402: false };
    } finally {
      this.testChallengeLoading = false;
      this.reRenderIfMounted();
    }
  },

  async handlePublishSubmit(event) {
    if (event) event.preventDefault();

    const name = document.getElementById("pubServiceName")?.value?.trim();
    const desc = document.getElementById("pubServiceDesc")?.value?.trim();
    const price = parseFloat(document.getElementById("pubServicePrice")?.value || "4.0");
    const quality = parseFloat(document.getElementById("pubServiceQuality")?.value || "0.92");
    const latency = document.getElementById("pubServiceLatency")?.value?.trim() || "200ms";
    const category = document.getElementById("pubServiceCategory")?.value || "Translation";
    const providerId = document.getElementById("pubServiceProviderId")?.value || "alpha-translate";
    const endpoint = document.getElementById("pubServiceEndpoint")?.value?.trim();
    const x402Enabled = document.getElementById("pubServiceX402")?.checked !== false;

    if (!name) {
      if (typeof App !== "undefined" && App.toast) App.toast("Service name is required", "error");
      return;
    }

    const payload = {
      name,
      description: desc,
      price,
      quality,
      latency,
      category,
      providerId,
      endpoint,
      x402Enabled,
    };

    try {
      const res = await ApiService.publishService(payload);
      this.closePublishModal();
      if (typeof App !== "undefined" && App.toast) {
        App.toast(`Service "${name}" published successfully! (${res.price || '$' + price.toFixed(2)})`, "success");
      }
      this.reRenderIfMounted();
    } catch (err) {
      if (typeof App !== "undefined" && App.toast) {
        App.toast(`Publish failed: ${err.message}`, "error");
      }
    }
  },

  getMarketplaceServices() {
    if (typeof AppState !== "undefined" && AppState.services && AppState.services.length > 0) {
      return AppState.services;
    }
    return [
      {
        serviceId: "text-translate",
        name: "Translation API",
        providerId: "alpha-translate",
        providerName: "Alpha Translate",
        description: "Translate documents to Hindi with nuance verification",
        quality: 0.92,
        latency: "200ms",
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

  runSelectionAnimation() {
    if (typeof AppState === "undefined" || typeof AppState.setProviderSelectionPhase !== "function") return;

    AppState.setProviderSelectionPhase("evaluating");

    setTimeout(() => {
      AppState.setProviderSelectionPhase("candidate");
    }, 700);

    setTimeout(() => {
      AppState.setProviderSelectionPhase("rejected");
    }, 1400);

    setTimeout(() => {
      AppState.setProviderSelectionPhase("selected");
    }, 2100);
  },

  getOperationalCards() {
    const defaultEvaluations = {
      "alpha-translate": {
        id: "alpha-translate",
        name: "Alpha",
        fullName: "Alpha Translation Services",
        serviceType: "translation",
        endpoint: "/x402/providers/alpha-translate/service",
        price: "$4.00",
        quality: "0.92",
        latency: "200ms",
        aiScore: "0.91",
        status: "SELECTED",
        statusText: "● SELECTED",
        statusBadgeClass: "bg-tertiary/20 text-tertiary border border-tertiary/50 glow-emerald",
        cardBorderClass: "border-tertiary/80 glow-emerald",
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
        quality: "0.84",
        latency: "180ms",
        aiScore: "0.78",
        status: "CANDIDATE",
        statusText: "○ CANDIDATE",
        statusBadgeClass: "bg-surface-container text-outline border border-outline-variant/30",
        cardBorderClass: "border-outline-variant/40",
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
        quality: "0.97",
        latency: "350ms",
        aiScore: "0.00",
        status: "REJECTED",
        statusText: "✘ REJECTED",
        statusBadgeClass: "bg-error/15 text-error border border-error/40 glow-crimson",
        cardBorderClass: "border-error/40 opacity-80",
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
        quality: "0.88",
        latency: "120ms",
        aiScore: "0.65",
        status: "STANDBY",
        statusText: "○ STANDBY",
        statusBadgeClass: "bg-surface-lowest text-outline border border-outline-variant/30",
        cardBorderClass: "border-outline-variant/30 opacity-70",
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
        quality: "0.95",
        latency: "410ms",
        aiScore: "0.72",
        status: "STANDBY",
        statusText: "○ STANDBY",
        statusBadgeClass: "bg-surface-lowest text-outline border border-outline-variant/30",
        cardBorderClass: "border-outline-variant/30 opacity-70",
        whyItems: [
          { icon: "ℹ", text: "Multimodal OCR (not text-only)", color: "text-outline" },
          { icon: "✓", text: "Meets $5 budget ceiling ($5.00)", color: "text-outline" },
          { icon: "○", text: "Standby for image translation", color: "text-outline" },
        ],
      },
    };

    const liveEvals =
      typeof AppState !== "undefined" &&
      AppState.providerSelectionState &&
      AppState.providerSelectionState.evaluations
        ? AppState.providerSelectionState.evaluations
        : defaultEvaluations;

    return Object.values(liveEvals);
  },

  getCurrentPhase() {
    if (
      typeof AppState !== "undefined" &&
      AppState.providerSelectionState &&
      AppState.providerSelectionState.phase
    ) {
      return AppState.providerSelectionState.phase;
    }
    return "selected";
  },

  renderContent() {
    const services = this.getMarketplaceServices();
    const isMarketplace = this.activeTab === "marketplace";

    return `
      <!-- Top Title & Navigation Tabs -->
      <div class="rounded-2xl bg-surface-low/90 border border-outline-variant/40 p-6 backdrop-blur-md space-y-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-secondary flex items-center gap-1">
                <span class="material-symbols-outlined text-xs text-secondary">storefront</span>
                Autonomous x402 V2 Marketplace
              </span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary/15 text-secondary border border-secondary/30">
                ${services.length} Services Live
              </span>
            </div>
            <h1 class="font-headline text-2xl lg:text-3xl font-bold text-white tracking-tight">
              SERVICE MARKETPLACE
            </h1>
            <p class="text-xs lg:text-sm text-on-surface-variant mt-1 leading-relaxed">
              Decentralized catalogue of independent x402 service providers. Autonomous discovery, negotiation, and cryptographic settlement.
            </p>
          </div>

          <!-- Top Actions: Tab Switcher & + Publish Service -->
          <div class="flex flex-wrap items-center gap-3">
            <!-- View Tabs -->
            <div class="p-1 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center gap-1 font-mono text-xs">
              <button
                onclick="ProvidersView.switchTab('marketplace')"
                class="px-3.5 py-1.5 rounded-lg transition-all font-bold cursor-pointer ${
                  isMarketplace
                    ? 'bg-secondary/20 text-secondary border border-secondary/40 glow-cyan'
                    : 'text-outline hover:text-white'
                }"
              >
                Services Catalogue
              </button>
              <button
                onclick="ProvidersView.switchTab('evaluation')"
                class="px-3.5 py-1.5 rounded-lg transition-all font-bold cursor-pointer ${
                  !isMarketplace
                    ? 'bg-primary/20 text-primary-light border border-primary/40 glow-cyan'
                    : 'text-outline hover:text-white'
                }"
              >
                AI Selection & Matrix
              </button>
            </div>

            <!-- Primary Action: + Publish a Service -->
            <button
              onclick="ProvidersView.openPublishModal()"
              class="px-4 py-2 rounded-xl bg-gradient-to-r from-secondary via-primary-light to-tertiary hover:opacity-95 text-surface font-headline font-bold text-xs flex items-center gap-1.5 transition shadow-lg active:scale-95 cursor-pointer"
            >
              <span class="material-symbols-outlined text-sm font-bold">add_circle</span>
              + Publish a Service
            </button>
          </div>
        </div>

        ${
          isMarketplace
            ? this.renderMarketplaceControls(services)
            : ""
        }
      </div>

      <!-- Main Body Container -->
      ${
        isMarketplace
          ? this.renderMarketplaceCards(services)
          : this.renderEvaluationMatrix()
      }

      <!-- Modals -->
      ${this.isPublishModalOpen ? this.renderPublishModal() : ""}
      ${this.viewingService ? this.renderViewServiceModal() : ""}
    `;
  },

  renderMarketplaceControls(services) {
    const categories = ["all", "translation", "compute", "vision ai"];

    return `
      <!-- Filter Bar: Search + Category Pills -->
      <div class="pt-4 border-t border-outline-variant/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span class="text-[10px] font-mono uppercase text-outline mr-1 shrink-0">Category:</span>
          ${categories
            .map((cat) => {
              const active = this.selectedCategory === cat;
              return `
                <button
                  onclick="ProvidersView.setCategory('${cat}')"
                  class="px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all cursor-pointer ${
                    active
                      ? "bg-secondary text-surface font-bold"
                      : "bg-surface-lowest text-outline hover:text-white border border-outline-variant/30"
                  }"
                >
                  ${cat === "all" ? "All Services" : cat}
                </button>
              `;
            })
            .join("")}
        </div>

        <div class="relative min-w-[220px]">
          <input
            type="text"
            placeholder="Search services or providers..."
            value="${this.searchQuery}"
            oninput="ProvidersView.setSearchQuery(this.value)"
            class="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-lowest border border-outline-variant/40 text-xs text-white placeholder-outline focus:outline-none focus:border-secondary transition font-mono"
          />
          <span class="material-symbols-outlined text-sm text-outline absolute left-2.5 top-2">search</span>
        </div>
      </div>
    `;
  },

  renderMarketplaceCards(services) {
    let filtered = services.filter((s) => {
      if (this.selectedCategory !== "all") {
        const cat = (s.category || "").toLowerCase();
        if (!cat.includes(this.selectedCategory.replace("-", " "))) return false;
      }
      if (this.searchQuery) {
        const str = `${s.name} ${s.providerName} ${s.description} ${s.category}`.toLowerCase();
        if (!str.includes(this.searchQuery)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      return `
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-12 text-center space-y-3">
          <span class="material-symbols-outlined text-4xl text-outline">search_off</span>
          <h3 class="font-headline text-base font-bold text-white">No Matching Services Found</h3>
          <p class="text-xs text-on-surface-variant font-mono">
            No service matches category "${this.selectedCategory}" or search query "${this.searchQuery}".
          </p>
          <button
            onclick="ProvidersView.setCategory('all'); ProvidersView.setSearchQuery('');"
            class="px-4 py-2 rounded-lg bg-surface-high text-xs font-mono text-white hover:bg-surface-highest transition mt-2 cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      `;
    }

    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
        ${filtered
          .map((s) => {
            const isTranslation = (s.category || "").toLowerCase().includes("translation");
            const isCompute = (s.category || "").toLowerCase().includes("compute");

            const accentBadge = isTranslation
              ? "bg-secondary/15 text-secondary border-secondary/30"
              : isCompute
              ? "bg-primary/15 text-primary-light border-primary/30"
              : "bg-tertiary/15 text-tertiary border-tertiary/30";

            return `
              <div class="rounded-2xl bg-surface-low border border-outline-variant/40 hover:border-outline-variant/80 p-6 space-y-5 transition-all duration-300 shadow-md flex flex-col justify-between relative overflow-hidden group">
                <!-- Top Header: Title & Provider -->
                <div class="space-y-2">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-bold border ${accentBadge}">
                        ${s.category || "Service"}
                      </span>
                      <h2 class="font-headline text-xl font-bold text-white tracking-tight mt-1.5 group-hover:text-secondary transition-colors">
                        ${s.name}
                      </h2>
                      <div class="text-xs font-mono text-outline flex items-center gap-1.5 mt-0.5">
                        <span>by</span>
                        <span class="text-slate-200 font-bold">${s.providerName || s.providerId}</span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-1 shrink-0 font-mono">
                      <span class="text-[10px] uppercase font-bold text-outline">Price</span>
                      <span class="text-base font-bold text-tertiary">${s.price}</span>
                    </div>
                  </div>

                  <p class="text-xs text-on-surface-variant leading-relaxed font-sans pt-1">
                    ${s.description}
                  </p>
                </div>

                <!-- Middle: Operational Metrics (Quality & Latency) -->
                <div class="grid grid-cols-3 gap-2 p-3 rounded-xl bg-surface-lowest border border-outline-variant/30 font-mono text-center">
                  <div>
                    <span class="text-[9px] uppercase font-bold text-outline block">Quality</span>
                    <span class="text-sm font-bold text-primary mt-0.5 block">${typeof s.quality === 'number' ? s.quality.toFixed(2) : s.quality}</span>
                  </div>
                  <div>
                    <span class="text-[9px] uppercase font-bold text-outline block">Latency</span>
                    <span class="text-sm font-bold text-white mt-0.5 block">${s.latency}</span>
                  </div>
                  <div>
                    <span class="text-[9px] uppercase font-bold text-outline block">Settlement</span>
                    <span class="text-[11px] font-bold text-tertiary mt-1 block">ERC-20 USDC</span>
                  </div>
                </div>

                <!-- Bottom: Tags & [VIEW SERVICE] Action -->
                <div class="pt-4 border-t border-outline-variant/20 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-1.5">
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-secondary/15 text-secondary border border-secondary/30 glow-cyan">
                      [x402 V2]
                    </span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-tertiary/15 text-tertiary border border-tertiary/30 glow-emerald flex items-center gap-1">
                      <span class="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                      [AVAILABLE]
                    </span>
                  </div>

                  <button
                    onclick="ProvidersView.openViewService('${s.serviceId}')"
                    class="px-4 py-2 rounded-xl bg-surface-high hover:bg-surface-highest border border-outline-variant/40 hover:border-secondary/60 text-xs font-mono font-bold text-white flex items-center gap-1.5 transition shadow-sm active:scale-95 cursor-pointer"
                  >
                    <span>VIEW SERVICE</span>
                    <span class="material-symbols-outlined text-sm text-secondary">arrow_forward</span>
                  </button>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  },

  renderViewServiceModal() {
    const s = this.viewingService;
    if (!s) return "";

    const endpointUrl = s.endpoint.startsWith("http") ? s.endpoint : `${window.location.origin}${s.endpoint}`;

    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-lowest/80 backdrop-blur-md animate-fadeIn">
        <div class="rounded-2xl bg-surface-low border border-outline-variant/60 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
          <!-- Header -->
          <div class="flex items-start justify-between border-b border-outline-variant/30 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-secondary/15 text-secondary border border-secondary/30">
                  ${s.category || "Service"}
                </span>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-tertiary/15 text-tertiary border border-tertiary/30">
                  [x402 V2 EXACT]
                </span>
              </div>
              <h2 class="font-headline text-2xl font-bold text-white tracking-tight mt-1.5">${s.name}</h2>
              <p class="text-xs font-mono text-outline">Provider: <span class="text-white font-bold">${s.providerName || s.providerId}</span></p>
            </div>
            <button
              onclick="ProvidersView.closeViewService()"
              class="w-8 h-8 rounded-lg bg-surface-lowest hover:bg-surface-high border border-outline-variant/30 text-outline hover:text-white flex items-center justify-center cursor-pointer transition"
            >
              ✕
            </button>
          </div>

          <!-- Description & Attributes -->
          <div class="space-y-4">
            <p class="text-xs text-on-surface-variant leading-relaxed">
              ${s.description}
            </p>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 font-mono text-xs">
              <div>
                <span class="text-[9px] uppercase font-bold text-outline block">Price</span>
                <span class="text-sm font-bold text-tertiary mt-0.5 block">${s.price}</span>
              </div>
              <div>
                <span class="text-[9px] uppercase font-bold text-outline block">Quality Score</span>
                <span class="text-sm font-bold text-primary mt-0.5 block">${typeof s.quality === 'number' ? s.quality.toFixed(2) : s.quality}</span>
              </div>
              <div>
                <span class="text-[9px] uppercase font-bold text-outline block">Est. Latency</span>
                <span class="text-sm font-bold text-white mt-0.5 block">${s.latency}</span>
              </div>
              <div>
                <span class="text-[9px] uppercase font-bold text-outline block">Availability</span>
                <span class="text-sm font-bold text-emerald-400 mt-0.5 block">100%</span>
              </div>
            </div>
          </div>

          <!-- x402 V2 Wire Endpoint & Copy -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <span class="material-symbols-outlined text-xs">link</span>
                x402 V2 Endpoint URI
              </span>
              <button
                onclick="App.copyText('${s.endpoint}', 'Endpoint URI')"
                class="text-[10px] text-outline hover:text-white flex items-center gap-1 cursor-pointer"
              >
                Copy URI
              </button>
            </div>
            <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/40 font-mono text-xs text-slate-200 break-all select-all">
              ${s.endpoint}
            </div>
          </div>

          <!-- Live Wire Test: Test x402 Challenge -->
          <div class="rounded-xl bg-surface-lowest border border-outline-variant/40 p-4 space-y-3 font-mono">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-xs font-bold text-white uppercase block">Live Protocol Wire Test</span>
                <span class="text-[10px] text-outline">Issue GET to retrieve and verify HTTP 402 Payment-Required challenge</span>
              </div>
              <button
                onclick="ProvidersView.runTestChallenge('${s.endpoint}')"
                class="px-3.5 py-1.5 rounded-lg bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/40 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              >
                ${
                  this.testChallengeLoading
                    ? `<span class="material-symbols-outlined text-xs animate-spin">refresh</span> Testing...`
                    : `<span class="material-symbols-outlined text-xs">send</span> Test x402 Challenge`
                }
              </button>
            </div>

            ${
              this.testChallengeResult
                ? `
                <div class="mt-3 pt-3 border-t border-outline-variant/20 space-y-2 text-xs animate-fadeIn">
                  <div class="flex items-center justify-between">
                    <span class="text-outline">HTTP Status:</span>
                    <span class="font-bold ${
                      this.testChallengeResult.is402
                        ? "text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800"
                        : "text-white"
                    }">
                      ${this.testChallengeResult.status} ${this.testChallengeResult.statusText || ""}
                    </span>
                  </div>

                  ${
                    this.testChallengeResult.rawHeader
                      ? `
                      <div>
                        <span class="text-[10px] text-outline uppercase block mb-1">Header (payment-required):</span>
                        <div class="p-2 rounded bg-surface-low border border-outline-variant/30 text-[10px] text-slate-300 break-all select-all">
                          ${this.testChallengeResult.rawHeader}
                        </div>
                      </div>
                      `
                      : ""
                  }

                  ${
                    this.testChallengeResult.paymentRequired
                      ? `
                      <div>
                        <span class="text-[10px] text-outline uppercase block mb-1">Decoded Payment Requirements:</span>
                        <pre class="p-3 rounded bg-surface-low border border-outline-variant/30 text-[10px] text-tertiary overflow-x-auto leading-relaxed">${JSON.stringify(
                          this.testChallengeResult.paymentRequired,
                          null,
                          2
                        )}</pre>
                      </div>
                      `
                      : ""
                  }
                </div>
              `
                : ""
            }
          </div>

          <!-- Modal Footer Actions -->
          <div class="flex items-center justify-between pt-4 border-t border-outline-variant/30">
            <button
              onclick="ProvidersView.closeViewService()"
              class="px-4 py-2 rounded-xl bg-surface-high hover:bg-surface-highest text-xs font-mono text-white transition cursor-pointer"
            >
              Close
            </button>
            <button
              onclick="ProvidersView.closeViewService(); App.runAutonomousPurchaseSequence();"
              class="px-5 py-2 rounded-xl bg-gradient-to-r from-secondary to-tertiary text-surface font-headline font-bold text-xs flex items-center gap-2 transition shadow-lg cursor-pointer active:scale-95"
            >
              <span class="material-symbols-outlined text-sm font-bold">bolt</span>
              Purchase With Agent (${s.price})
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderPublishModal() {
    return `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-lowest/80 backdrop-blur-md animate-fadeIn">
        <div class="rounded-2xl bg-surface-low border border-outline-variant/60 shadow-2xl w-full max-w-lg p-6 space-y-5">
          <!-- Header -->
          <div class="flex items-start justify-between border-b border-outline-variant/30 pb-3">
            <div>
              <div class="flex items-center gap-1.5 text-secondary text-xs font-mono font-bold uppercase mb-1">
                <span class="material-symbols-outlined text-sm">add_circle</span>
                Decentralized Service Registry
              </div>
              <h2 class="font-headline text-xl font-bold text-white tracking-tight">+ Publish a Service</h2>
              <p class="text-xs text-on-surface-variant font-mono mt-0.5">Register an independent autonomous service on the x402 marketplace.</p>
            </div>
            <button
              onclick="ProvidersView.closePublishModal()"
              class="w-7 h-7 rounded-lg bg-surface-lowest hover:bg-surface-high border border-outline-variant/30 text-outline hover:text-white flex items-center justify-center cursor-pointer transition"
            >
              ✕
            </button>
          </div>

          <!-- Form Fields -->
          <form onsubmit="ProvidersView.handlePublishSubmit(event)" class="space-y-4 font-mono text-xs">
            <!-- SERVICE Name -->
            <div class="space-y-1">
              <label class="text-[10px] uppercase font-bold text-outline block">Service Name</label>
              <input
                id="pubServiceName"
                type="text"
                required
                placeholder="e.g. PDF Translation"
                value="PDF Translation"
                class="w-full px-3 py-2 rounded-lg bg-surface-lowest border border-outline-variant/40 text-white placeholder-outline focus:outline-none focus:border-secondary transition"
              />
            </div>

            <!-- Provider -->
            <div class="space-y-1">
              <label class="text-[10px] uppercase font-bold text-outline block">Provider Node</label>
              <select
                id="pubServiceProviderId"
                class="w-full px-3 py-2 rounded-lg bg-surface-lowest border border-outline-variant/40 text-white focus:outline-none focus:border-secondary transition cursor-pointer"
              >
                <option value="alpha-translate">Alpha Translation Services (alpha-translate)</option>
                <option value="beta-translate">Beta Translate (beta-translate)</option>
                <option value="gamma-translate">Gamma Premium Translation (gamma-translate)</option>
                <option value="delta-compute">Delta Compute Engine (delta-compute)</option>
                <option value="epsilon-vision">Epsilon Vision AI (epsilon-vision)</option>
                <option value="custom-provider">Register as Independent Custom Provider</option>
              </select>
            </div>

            <!-- Description -->
            <div class="space-y-1">
              <label class="text-[10px] uppercase font-bold text-outline block">Description</label>
              <textarea
                id="pubServiceDesc"
                rows="2"
                placeholder="e.g. Translate PDF documents to Hindi with layout preservation"
                class="w-full px-3 py-2 rounded-lg bg-surface-lowest border border-outline-variant/40 text-white placeholder-outline focus:outline-none focus:border-secondary transition font-sans text-xs"
              >Translate PDF documents to Hindi with layout preservation</textarea>
            </div>

            <!-- Price & Quality Grid -->
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-[10px] uppercase font-bold text-outline block">Price (USDC)</label>
                <div class="relative">
                  <input
                    id="pubServicePrice"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    value="4.00"
                    required
                    class="w-full px-3 py-2 rounded-lg bg-surface-lowest border border-outline-variant/40 text-white focus:outline-none focus:border-secondary transition"
                  />
                  <span class="absolute right-3 top-2 text-[10px] text-outline font-bold">USDC</span>
                </div>
              </div>

              <div class="space-y-1">
                <label class="text-[10px] uppercase font-bold text-outline block">Quality Benchmark (0–1)</label>
                <input
                  id="pubServiceQuality"
                  type="number"
                  step="0.01"
                  min="0.50"
                  max="1.00"
                  value="0.94"
                  required
                  class="w-full px-3 py-2 rounded-lg bg-surface-lowest border border-outline-variant/40 text-white focus:outline-none focus:border-secondary transition"
                />
              </div>
            </div>

            <!-- Latency & Category Grid -->
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label class="text-[10px] uppercase font-bold text-outline block">Est. Latency</label>
                <input
                  id="pubServiceLatency"
                  type="text"
                  value="180ms"
                  class="w-full px-3 py-2 rounded-lg bg-surface-lowest border border-outline-variant/40 text-white focus:outline-none focus:border-secondary transition"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] uppercase font-bold text-outline block">Category</label>
                <select
                  id="pubServiceCategory"
                  class="w-full px-3 py-2 rounded-lg bg-surface-lowest border border-outline-variant/40 text-white focus:outline-none focus:border-secondary transition cursor-pointer"
                >
                  <option value="Translation">Translation</option>
                  <option value="Compute">Compute</option>
                  <option value="Vision AI">Vision AI</option>
                  <option value="Audio / Speech">Audio / Speech</option>
                  <option value="Data Scraping">Data Scraping</option>
                </select>
              </div>
            </div>

            <!-- Endpoint -->
            <div class="space-y-1">
              <label class="text-[10px] uppercase font-bold text-outline block">Wire Endpoint URI</label>
              <input
                id="pubServiceEndpoint"
                type="text"
                value="/x402/providers/alpha-translate/service?serviceId=pdf-translate"
                class="w-full px-3 py-2 rounded-lg bg-surface-lowest border border-outline-variant/40 text-white focus:outline-none focus:border-secondary transition text-[11px]"
              />
            </div>

            <!-- x402 Checkbox -->
            <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <input
                  id="pubServiceX402"
                  type="checkbox"
                  checked
                  class="w-4 h-4 rounded text-secondary border-outline-variant/40 cursor-pointer"
                />
                <label for="pubServiceX402" class="text-xs text-white font-bold cursor-pointer">
                  x402 Enabled
                </label>
              </div>
              <span class="text-[10px] text-tertiary font-bold">EIP-712 Exact Scheme</span>
            </div>

            <!-- Form Actions -->
            <div class="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onclick="ProvidersView.closePublishModal()"
                class="px-4 py-2 rounded-xl bg-surface-high hover:bg-surface-highest text-xs font-mono text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-5 py-2 rounded-xl bg-gradient-to-r from-secondary to-tertiary hover:opacity-95 text-surface font-headline font-bold text-xs flex items-center gap-1.5 transition shadow-lg cursor-pointer active:scale-95"
              >
                <span class="material-symbols-outlined text-sm font-bold">check_circle</span>
                [PUBLISH SERVICE]
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  renderEvaluationMatrix() {
    const cards = this.getOperationalCards();
    const phase = this.getCurrentPhase();
    const taskPrompt =
      (typeof AppState !== "undefined" &&
        AppState.providerSelectionState &&
        AppState.providerSelectionState.taskPrompt) ||
      "Get the highest-quality translation under $5.";

    return `
      <!-- Human Task Prompt & Constraint Context -->
      <div class="rounded-2xl bg-surface-low border-l-4 border-l-secondary border border-outline-variant/40 p-5 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold font-mono uppercase tracking-wider text-secondary flex items-center gap-1.5">
            <span class="material-symbols-outlined text-sm text-secondary">psychology</span>
            Active Agent Objective & Spending Ceiling
          </span>
          <div class="flex items-center gap-3">
            <button
              onclick="ProvidersView.runSelectionAnimation()"
              class="px-3 py-1 rounded-lg bg-surface-high hover:bg-surface-highest border border-outline-variant/40 text-[11px] font-mono text-white flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <span class="material-symbols-outlined text-xs text-secondary">auto_awesome</span>
              Re-Run AI Selection
            </button>
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-secondary/15 text-secondary border border-secondary/30">
              CONSTRAINT: Max $5.00 / Quality ≥ 0.90
            </span>
          </div>
        </div>
        <p class="text-xs text-on-surface-variant leading-relaxed font-sans">
          Human Prompt: <span class="text-white font-semibold font-mono bg-surface-lowest px-2 py-0.5 rounded border border-outline-variant/30">"${taskPrompt}"</span>
        </p>

        <!-- 4-Stage Operational Selection Transition Bar -->
        <div class="mt-3 pt-3 border-t border-outline-variant/20 space-y-2">
          <div class="flex items-center justify-between text-[11px] font-mono text-outline">
            <span>SELECTION LIFECYCLE:</span>
            <span class="text-white font-bold uppercase">Phase: ${phase}</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-center">
            <div class="p-2.5 rounded-lg border transition-all ${
              phase === "evaluating"
                ? "bg-primary/20 border-primary text-primary-light font-bold glow-cyan animate-pulse"
                : "bg-surface-lowest border-outline-variant/30 text-outline"
            }">
              1. Evaluating...
            </div>
            <div class="p-2.5 rounded-lg border transition-all ${
              phase === "candidate"
                ? "bg-secondary/20 border-secondary text-secondary font-bold glow-cyan"
                : "bg-surface-lowest border-outline-variant/30 text-outline"
            }">
              2. Candidate
            </div>
            <div class="p-2.5 rounded-lg border transition-all ${
              phase === "rejected"
                ? "bg-error/20 border-error text-error font-bold glow-crimson"
                : "bg-surface-lowest border-outline-variant/30 text-outline"
            }">
              3. Rejected
            </div>
            <div class="p-2.5 rounded-lg border transition-all ${
              phase === "selected"
                ? "bg-tertiary/20 border-tertiary text-tertiary font-bold glow-emerald"
                : "bg-surface-lowest border-outline-variant/30 text-outline"
            }">
              4. Selected
            </div>
          </div>
        </div>
      </div>

      <!-- 5 Operational Provider Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${cards
          .map((c) => {
            const isSelected = c.status === "SELECTED";
            const isRejected = c.status === "REJECTED";
            const isCandidate = c.status === "CANDIDATE";
            const isEvaluating = c.status === "EVALUATING";

            const borderClass = isSelected
              ? "border-tertiary shadow-lg glow-emerald"
              : isRejected
              ? "border-error/40 opacity-75"
              : isCandidate
              ? "border-secondary/50"
              : isEvaluating
              ? "border-primary/60 animate-pulse"
              : "border-outline-variant/40 opacity-75";

            return `
            <div class="rounded-xl bg-surface-low border ${borderClass} p-5 space-y-4 relative overflow-hidden flex flex-col justify-between transition-all duration-300">
              ${
                isSelected
                  ? `<div class="absolute top-0 right-0 bg-tertiary text-surface text-[9px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-bl">Active Choice</div>`
                  : ""
              }

              <!-- Top Title & Type -->
              <div class="space-y-1">
                <div class="flex items-center justify-between">
                  <h3 class="font-headline text-lg font-bold text-white tracking-tight">${c.name}</h3>
                  <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-lowest text-outline border border-outline-variant/30">
                    ${c.serviceType || "service"}
                  </span>
                </div>
                <p class="text-xs text-on-surface-variant font-mono truncate">${c.fullName || c.name}</p>
              </div>

              <!-- Operational Metrics: Price, Quality, Latency -->
              <div class="grid grid-cols-3 gap-2 p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 font-mono text-center">
                <div>
                  <p class="text-[9px] text-outline uppercase">Price</p>
                  <p class="text-sm font-bold text-tertiary mt-0.5">${c.price}</p>
                </div>
                <div>
                  <p class="text-[9px] text-outline uppercase">Quality</p>
                  <p class="text-sm font-bold text-primary mt-0.5">${c.quality}</p>
                </div>
                <div>
                  <p class="text-[9px] text-outline uppercase">Latency</p>
                  <p class="text-sm font-bold text-on-surface mt-0.5">${c.latency}</p>
                </div>
              </div>

              <!-- AI SCORE -->
              <div class="p-3 rounded-lg bg-surface-container/60 border border-outline-variant/30 flex items-center justify-between">
                <div>
                  <span class="text-[9px] font-mono uppercase tracking-wider text-outline block">AI SCORE</span>
                  <span class="font-mono text-[10px] text-on-surface-variant">Weighted Frontier Value</span>
                </div>
                <div class="flex items-baseline gap-1 font-mono">
                  <span class="font-headline text-2xl font-black ${
                    c.aiScore === "0.00"
                      ? "text-error"
                      : isSelected
                      ? "text-tertiary"
                      : "text-white"
                  }">${c.aiScore}</span>
                  ${
                    c.aiScore !== "..." && c.aiScore !== "0.00"
                      ? `<span class="text-[10px] text-outline">/ 1.00</span>`
                      : ""
                  }
                </div>
              </div>

              <!-- STATUS -->
              <div class="space-y-1">
                <span class="text-[9px] font-mono uppercase tracking-wider text-outline block">STATUS</span>
                <div class="text-xs font-mono font-bold ${c.statusBadgeClass} px-3 py-1.5 rounded-lg text-center">
                  ${c.statusText}
                </div>
              </div>

              <!-- WHY? Rationale Box -->
              <div class="p-3 rounded-lg bg-surface-lowest/80 border border-outline-variant/30 space-y-1.5">
                <div class="text-[10px] font-mono font-bold uppercase tracking-wider text-secondary flex items-center gap-1">
                  <span class="material-symbols-outlined text-xs text-secondary">psychology</span>
                  WHY?
                </div>
                <ul class="space-y-1 text-xs font-sans">
                  ${(c.whyItems || [])
                    .map(
                      (item) => `
                    <li class="flex items-start gap-1.5 ${item.color || "text-slate-200"}">
                      <span class="font-mono font-bold text-xs shrink-0">${item.icon}</span>
                      <span class="leading-tight">${item.text}</span>
                    </li>
                  `
                    )
                    .join("")}
                </ul>
              </div>
            </div>
          `;
          })
          .join("")}
      </div>

      <!-- Deterministic Multi-Provider Quality vs. Cost Matrix -->
      <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-4">
        <div class="flex items-center gap-2.5">
          <div class="w-2 h-5 bg-secondary rounded-sm glow-cyan"></div>
          <div>
            <h2 class="font-headline text-base font-bold text-white tracking-tight">Multi-Provider Quality vs. Cost Matrix</h2>
            <span class="font-mono text-xs text-on-surface-variant">Deterministic Pareto Frontier Evaluation</span>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left font-mono text-xs">
            <thead class="border-b border-outline-variant/30 uppercase text-[10px] text-outline">
              <tr>
                <th class="pb-3 font-medium">Provider</th>
                <th class="pb-3 font-medium">Service Type</th>
                <th class="pb-3 font-medium">Price</th>
                <th class="pb-3 font-medium">Quality</th>
                <th class="pb-3 font-medium">Latency</th>
                <th class="pb-3 font-medium">AI Score</th>
                <th class="pb-3 font-medium text-right">Decision Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/15 text-on-surface">
              ${cards
                .map(
                  (c) => `
                <tr class="hover:bg-surface-high/40 transition-colors">
                  <td class="py-3 text-white font-semibold font-sans">
                    <div>${c.name}</div>
                    <div class="text-[10px] text-secondary font-mono">${c.fullName}</div>
                  </td>
                  <td class="py-3 text-on-surface-variant font-sans uppercase text-[11px]">${c.serviceType}</td>
                  <td class="py-3 text-tertiary font-bold">${c.price}</td>
                  <td class="py-3 text-primary font-bold">${c.quality}</td>
                  <td class="py-3 text-on-surface">${c.latency}</td>
                  <td class="py-3 font-bold ${c.aiScore === "0.00" ? "text-error" : "text-white"}">${c.aiScore}</td>
                  <td class="py-3 font-sans text-right">
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.statusBadgeClass}">
                      ${c.statusText}
                    </span>
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  render() {
    this.init();
    return `
      <div id="providers-view-root" class="space-y-6">
        ${this.renderContent()}
      </div>
    `;
  },
};

// Global export for vanilla ES environments
if (typeof window !== "undefined") {
  window.ProvidersView = ProvidersView;
}
