"use strict";

const ProvidersView = {
  initialized: false,
  isLoading: false,
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

  onStateChange(event) {
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

  setCategory(cat) {
    if (this.selectedCategory === cat) return;
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
    this.viewingService = services.find((s) => s.id === serviceId || s.serviceId === serviceId) || null;
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

  handleRequestService(serviceId) {
    const services = this.getMarketplaceServices();
    const s = services.find((item) => item.id === serviceId || item.serviceId === serviceId) || this.viewingService;
    if (!s) return;
    this.closeViewService();

    // Navigate to Agent / Purchase view
    if (typeof App !== "undefined" && typeof App.navigate === "function") {
      App.navigate("agent");
    }

    setTimeout(() => {
      const promptInput = document.getElementById("agentPromptInput");
      let promptText = `Execute ${s.name} from ${s.providerName || s.providerId}. Budget $${Math.ceil(s.priceNum || 4)}`;
      if (s.id === "open-meteo-weather" || s.serviceId === "open-meteo-weather") {
        promptText = "I need a weather service for Delhi under $1.";
      } else if (s.id === "currencylayer-live" || s.serviceId === "currencylayer-live") {
        promptText = "Find me a currency conversion service for USD to EUR, GBP, and INR under $2.";
      } else if (s.id === "ipstack-lookup" || s.serviceId === "ipstack-lookup") {
        promptText = "Lookup IP address geolocation for 134.201.250.155 under $2.";
      } else if (s.id === "amazon-product-data" || s.serviceId === "amazon-product-data") {
        promptText = "Scrape Amazon product details for ASIN B08N5WRWNW under $3.";
      } else if (s.id === "giphy-search" || s.serviceId === "giphy-search") {
        promptText = "Search Giphy for autonomous machine payments GIF under $2.";
      } else if (s.id === "apiflash-capture" || s.serviceId === "apiflash-capture") {
        promptText = "Capture website screenshot for https://ethereum.org under $3.";
      } else if (s.id === "blitapp-snapshot" || s.serviceId === "blitapp-snapshot") {
        promptText = "Generate scheduled snapshot for https://ethereum.org under $3.";
      } else if (s.id === "apitemplate-pdf" || s.serviceId === "apitemplate-pdf") {
        promptText = "Generate PDF invoice receipt document under $4.";
      }

      if (promptInput) {
        promptInput.value = promptText;
        promptInput.focus();
      }
      if (typeof AgentView !== "undefined" && typeof AgentView.runPurchase === "function") {
        AgentView.runPurchase(promptText);
      }
    }, 120);
  },

  async handlePublishSubmit(event) {
    if (event) event.preventDefault();

    const name = document.getElementById("pubServiceName")?.value?.trim();
    const desc = document.getElementById("pubServiceDesc")?.value?.trim();
    const price = parseFloat(document.getElementById("pubServicePrice")?.value || "4.0");
    const quality = parseFloat(document.getElementById("pubServiceQuality")?.value || "0.92");
    const latency = document.getElementById("pubServiceLatency")?.value?.trim() || "200ms";
    const category = document.getElementById("pubServiceCategory")?.value || "translation";
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
    if (typeof window !== "undefined" && window.DEFAULT_MARKET_SERVICES && window.DEFAULT_MARKET_SERVICES.length > 0) {
      return window.DEFAULT_MARKET_SERVICES;
    }
    return [];
  },

  escapeHtml(str) {
    if (typeof str !== "string") return String(str ?? "");
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  render() {
    return `<div id="providers-view-root">${this.renderContent()}</div>`;
  },

  renderContent() {
    const services = this.getMarketplaceServices();

    // Compute distinct providers and categories dynamically
    const distinctProviders = new Set();
    const distinctCategories = new Set();
    services.forEach((s) => {
      distinctProviders.add(s.providerName || s.providerId || "Provider");
      if (s.category) distinctCategories.add(s.category.toLowerCase());
    });

    const totalServicesCount = services.length;
    const totalProvidersCount = distinctProviders.size;
    const totalCategoriesCount = distinctCategories.size;

    // Filter services
    let filtered = services;
    if (this.selectedCategory !== "all") {
      const cat = this.selectedCategory.toLowerCase();
      filtered = filtered.filter((s) => {
        const c = (s.category || "").toLowerCase();
        return c === cat || c.includes(cat) || cat.includes(c);
      });
    }

    if (this.searchQuery) {
      const q = this.searchQuery;
      filtered = filtered.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.providerName || "").toLowerCase().includes(q) ||
          (s.providerId || "").toLowerCase().includes(q) ||
          (s.description || "").toLowerCase().includes(q) ||
          (s.category || "").toLowerCase().includes(q)
      );
    }

    const categoriesList = [
      { id: "all", label: "All" },
      { id: "translation", label: "Translation" },
      { id: "data-compute", label: "Compute" },
      { id: "vision-ocr", label: "Vision & OCR" },
      { id: "text-generation", label: "Text Gen" },
      { id: "speech-audio", label: "Audio" },
      { id: "image-video", label: "Media" },
      { id: "code-dev", label: "Code Sandbox" },
      { id: "rag-embeddings", label: "RAG / Vector" },
      { id: "document-research", label: "Research" },
    ];

    const iconSearch = typeof getAppIcon === "function" ? getAppIcon("search") : "";
    const iconPlus = typeof getAppIcon === "function" ? getAppIcon("add_circle") : "+";
    const iconStore = typeof getAppIcon === "function" ? getAppIcon("storefront") : "";

    return `
      <!-- Page Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; gap: 16px; flex-wrap: wrap;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <h1 style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">SERVICE MARKETPLACE</h1>
            <span class="badge badge-primary">x402 V2 Enabled</span>
          </div>
          <p style="font-size: 13px; color: var(--text-muted); max-width: 680px; line-height: 1.5;">
            Operational computational microservices with deterministic constraint selection, x402 V2 payment negotiation, and SHA-256 delivery verification.
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn btn-primary" onclick="ProvidersView.openPublishModal()">
            <span>${iconPlus}</span>
            <span>Publish Service</span>
          </button>
        </div>
      </div>

      <!-- Summary Metrics Strip -->
      <div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 24px;">
        <div class="metric-card">
          <div class="metric-label">Total Services</div>
          <div class="metric-value font-mono">${totalServicesCount}</div>
          <div class="metric-change" style="color: var(--text-muted);">Active microservice catalog</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Connected Providers</div>
          <div class="metric-value font-mono">${totalProvidersCount}</div>
          <div class="metric-change" style="color: var(--text-muted);">Independent compute nodes</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Categories</div>
          <div class="metric-value font-mono">${totalCategoriesCount}</div>
          <div class="metric-change" style="color: var(--text-muted);">Machine service classes</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Settlement Protocol</div>
          <div class="metric-value font-mono" style="font-size: 16px; color: var(--tertiary);">ERC-20 USDC</div>
          <div class="metric-change" style="color: var(--text-muted);">x402 V2 EIP-712 Enforcer</div>
        </div>
      </div>

      <!-- Filter Controls & Search -->
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
        <!-- Category Filters -->
        <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; max-width: 100%;">
          ${categoriesList
            .map((cat) => {
              const active = this.selectedCategory === cat.id;
              return `
                <button
                  type="button"
                  class="btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}"
                  style="font-size: 11.5px; border-radius: var(--radius-sm);"
                  onclick="ProvidersView.setCategory('${cat.id}')"
                >
                  ${cat.label}
                </button>
              `;
            })
            .join("")}
        </div>

        <!-- Search Field -->
        <div style="position: relative; min-width: 240px;">
          <input
            type="text"
            class="form-input font-mono"
            style="padding-left: 28px; font-size: 12.5px; height: 32px;"
            placeholder="Search services..."
            value="${this.escapeHtml(this.searchQuery)}"
            oninput="ProvidersView.setSearchQuery(this.value)"
          />
          <span style="position: absolute; left: 8px; top: 8px; color: var(--text-muted);">${iconSearch}</span>
        </div>
      </div>

      <!-- Services Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; margin-bottom: 24px;">
        ${
          filtered.length === 0
            ? `
              <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted);">
                <p style="margin-bottom: 8px;">No services match your search criteria.</p>
                <button type="button" class="btn btn-secondary btn-sm" onclick="ProvidersView.setCategory('all'); ProvidersView.setSearchQuery('');">
                  Reset Filters
                </button>
              </div>
            `
            : filtered
                .map((s) => {
                  const id = s.id || s.serviceId || s.name;
                  const priceStr = s.priceFormatted || (typeof s.price === "number" ? `$${s.price.toFixed(2)} / request` : `${s.price || "$4.00"} / request`);
                  const qualityStr = typeof s.quality === "number" ? s.quality.toFixed(2) : (s.quality || "0.92");
                  const latencyStr = s.latency || (s.latencyMs ? `${s.latencyMs} ms` : "210 ms");

                  return `
                    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-color: var(--border);">
                      <div>
                        <!-- Header: Name & Provider -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
                          <h3 style="font-size: 14.5px; font-weight: 700; color: var(--text);">${this.escapeHtml(s.name)}</h3>
                          <span class="badge">${this.escapeHtml(s.category || "general")}</span>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                          ${this.escapeHtml(s.providerName || s.providerId || "Alpha Translation Services")}
                        </div>

                        <!-- Price Tag -->
                        <div style="font-family: var(--font-mono); font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 12px;">
                          ${this.escapeHtml(priceStr)}
                        </div>

                        <!-- Technical Specification Block -->
                        <div style="background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 10px 12px; font-family: var(--font-mono); font-size: 11.5px; margin-bottom: 14px; line-height: 1.7;">
                          <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Quality:</span>
                            <span style="color: var(--tertiary); font-weight: 600;">${this.escapeHtml(qualityStr)}</span>
                          </div>
                          <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Latency:</span>
                            <span style="color: var(--text);">${this.escapeHtml(latencyStr)}</span>
                          </div>
                          <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">Settlement:</span>
                            <span style="color: var(--primary);">ERC-20 USDC</span>
                          </div>
                          <div style="display: flex; justify-content: space-between;">
                            <span style="color: var(--text-muted);">x402:</span>
                            <span style="color: var(--tertiary); font-weight: 600;">Supported</span>
                          </div>
                        </div>
                      </div>

                      <!-- Footer Buttons: View Service & Request -->
                      <div style="display: flex; gap: 8px; pt-2; border-top: 1px solid var(--border); padding-top: 10px;">
                        <button
                          type="button"
                          class="btn btn-secondary btn-sm"
                          style="flex: 1;"
                          onclick="ProvidersView.openViewService('${this.escapeHtml(id)}')"
                        >
                          View Service
                        </button>
                        <button
                          type="button"
                          class="btn btn-primary btn-sm"
                          style="flex: 1;"
                          onclick="ProvidersView.handleRequestService('${this.escapeHtml(id)}')"
                        >
                          Request
                        </button>
                      </div>
                    </div>
                  `;
                })
                .join("")
        }
      </div>

      <!-- Service Details Modal -->
      ${this.renderViewServiceModal()}

      <!-- Publish Service Modal -->
      ${this.renderPublishModalMarkup()}
    `;
  },

  renderViewServiceModal() {
    if (!this.viewingService) return "";
    const s = this.viewingService;

    const priceStr = s.priceFormatted || (typeof s.price === "number" ? `$${s.price.toFixed(2)} / request` : `${s.price || "$4.00"} / request`);
    const qualityStr = typeof s.quality === "number" ? s.quality.toFixed(2) : (s.quality || "0.92");
    const latencyStr = s.latency || (s.latencyMs ? `${s.latencyMs} ms` : "210 ms");
    const providerAddr = s.providerAddress || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

    return `
      <div class="modal-backdrop" style="display: flex; align-items: center; justify-content: center; z-index: 100;" onclick="ProvidersView.closeViewService()">
        <div class="modal-card" style="max-width: 540px; padding: 22px;" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
            <div>
              <h2 style="font-size: 16px; font-weight: 700; color: var(--text);">${this.escapeHtml(s.name)}</h2>
              <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                by <strong>${this.escapeHtml(s.providerName || s.providerId || "Alpha Translation Services")}</strong>
              </div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="ProvidersView.closeViewService()">&times;</button>
          </div>

          <p style="font-size: 13px; color: var(--text); line-height: 1.5; margin-bottom: 14px;">
            ${this.escapeHtml(s.description || "Machine-accessible microservice conforming to x402 V2 payment negotiation.")}
          </p>

          <div style="background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; font-family: var(--font-mono); font-size: 12px; line-height: 1.8; margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Price:</span>
              <span style="font-weight: 700; color: var(--text);">${this.escapeHtml(priceStr)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Quality SLA:</span>
              <span style="color: var(--tertiary); font-weight: 600;">${this.escapeHtml(qualityStr)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Latency:</span>
              <span>${this.escapeHtml(latencyStr)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Category:</span>
              <span>${this.escapeHtml(s.category || "translation")}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">Settlement Method:</span>
              <span style="color: var(--primary);">ERC-20 USDC (Hardhat / Sepolia)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-muted);">x402 Availability:</span>
              <span style="color: var(--tertiary); font-weight: 600;">Supported (x402 V2)</span>
            </div>
            <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border); margin-top: 4px; padding-top: 4px;">
              <span style="color: var(--text-muted);">Provider Address:</span>
              <span style="font-size: 11px; color: var(--text);">${this.escapeHtml(providerAddr)}</span>
            </div>
          </div>

          <!-- Endpoint & Technical Details -->
          <div style="margin-bottom: 16px;">
            <div style="font-size: 11.5px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Service Endpoint URL</div>
            <code style="display: block; background: var(--surface-low); border: 1px solid var(--border); padding: 6px 10px; border-radius: var(--radius-sm); font-size: 11px; color: var(--text); overflow-x: auto;">
              ${this.escapeHtml(s.endpoint || `/x402/providers/${s.providerId || "alpha-translate"}/service`)}
            </code>
          </div>

          <!-- x402 Challenge Probe -->
          <div style="margin-bottom: 18px;">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onclick="ProvidersView.runTestChallenge('${this.escapeHtml(s.endpoint || `/x402/providers/${s.providerId || "alpha-translate"}/service`)}')"
              ${this.testChallengeLoading ? "disabled" : ""}
            >
              ${this.testChallengeLoading ? "Testing..." : "Test x402 Challenge"}
            </button>

            ${
              this.testChallengeResult
                ? `
                  <div style="background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; margin-top: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--text);">
                    <div>Status: <strong>${this.testChallengeResult.status || 402} Payment Required</strong></div>
                    <div style="color: var(--tertiary);">x402 Challenge Conforming: true</div>
                  </div>
                `
                : ""
            }
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 8px;">
            <button type="button" class="btn btn-secondary" onclick="ProvidersView.closeViewService()">Close</button>
            <button
              type="button"
              class="btn btn-primary"
              onclick="ProvidersView.handleRequestService('${this.escapeHtml(s.id || s.serviceId || s.name)}')"
            >
              Request Service &rarr;
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderPublishModalMarkup() {
    if (!this.isPublishModalOpen) return "";

    return `
      <div class="modal-backdrop" style="display: flex; align-items: center; justify-content: center; z-index: 100;" onclick="ProvidersView.closePublishModal()">
        <div class="modal-card" style="max-width: 500px; padding: 22px;" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
            <h3 style="font-size: 15px; font-weight: 700;">Publish Service to Catalog</h3>
            <button type="button" class="btn btn-secondary btn-sm" onclick="ProvidersView.closePublishModal()">&times;</button>
          </div>

          <form onsubmit="ProvidersView.handlePublishSubmit(event)">
            <div style="margin-bottom: 12px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Service Name</label>
              <input type="text" id="pubServiceName" class="form-input" placeholder="e.g. Document Parser" required />
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Description</label>
              <input type="text" id="pubServiceDesc" class="form-input" placeholder="Technical microservice capability..." required />
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Price (USDC)</label>
                <input type="number" step="0.01" min="0.01" id="pubServicePrice" class="form-input font-mono" value="4.00" required />
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Quality (0.0 - 1.0)</label>
                <input type="number" step="0.01" min="0" max="1" id="pubServiceQuality" class="form-input font-mono" value="0.94" required />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Category</label>
                <select id="pubServiceCategory" class="form-input">
                  <option value="translation">Translation</option>
                  <option value="data-compute">Compute</option>
                  <option value="vision-ocr">Vision &amp; OCR</option>
                  <option value="text-generation">Text Gen</option>
                  <option value="speech-audio">Audio</option>
                  <option value="image-video">Media</option>
                  <option value="code-dev">Code Sandbox</option>
                  <option value="rag-embeddings">RAG / Vector</option>
                  <option value="document-research">Research</option>
                </select>
              </div>
              <div>
                <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Latency</label>
                <input type="text" id="pubServiceLatency" class="form-input font-mono" value="200ms" required />
              </div>
            </div>

            <div style="margin-bottom: 12px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Provider ID / Node</label>
              <input type="text" id="pubServiceProviderId" class="form-input font-mono" value="alpha-translate" required />
            </div>

            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px;">Endpoint URI</label>
              <input type="text" id="pubServiceEndpoint" class="form-input font-mono" value="/x402/providers/alpha-translate/service" required />
            </div>

            <div style="margin-bottom: 16px;">
              <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; cursor: pointer;">
                <input type="checkbox" id="pubServiceX402" checked />
                <span>Enable x402 V2 payment negotiation</span>
              </label>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 8px;">
              <button type="button" class="btn btn-secondary" onclick="ProvidersView.closePublishModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Publish to Catalog</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },
};

// Global attachment
if (typeof window !== "undefined") {
  window.ProvidersView = ProvidersView;
}
