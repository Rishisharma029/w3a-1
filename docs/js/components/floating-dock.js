(function() {
  const GLOBAL_DOCK_ITEMS = [
    {
      id: "dock_overview",
      title: "Owner Center (Pillar 3)",
      view: "overview",
      icon: '<span class="material-symbols-outlined text-[20px] text-primary">dashboard</span>',
      action: () => window.App?.navigate('overview')
    },
    {
      id: "dock_providers",
      title: "Marketplace (Pillar 1)",
      view: "providers",
      icon: '<span class="material-symbols-outlined text-[20px] text-tertiary">storefront</span>',
      action: () => window.App?.navigate('providers')
    },
    {
      id: "dock_agent",
      title: "AI Purchase (Pillar 2)",
      view: "agent",
      icon: '<span class="material-symbols-outlined text-[20px] text-secondary">smart_toy</span>',
      action: () => window.App?.navigate('agent')
    },
    {
      id: "dock_current",
      title: "Live Stream (SSE)",
      view: "current",
      icon: '<span class="material-symbols-outlined text-[20px] text-amber-400">bolt</span>',
      action: () => window.App?.navigate('current')
    },
    {
      id: "dock_transactions",
      title: "Transactions Ledger",
      view: "transactions",
      icon: '<span class="material-symbols-outlined text-[20px] text-purple-300">receipt_long</span>',
      action: () => window.App?.navigate('transactions')
    },
    {
      id: "dock_security",
      title: "Security Defense & Cap",
      view: "security",
      icon: '<span class="material-symbols-outlined text-[20px] text-error">shield</span>',
      action: () => window.App?.navigate('security')
    },
    {
      id: "dock_delivery",
      title: "Delivery Proof (SHA-256)",
      view: "delivery",
      icon: '<span class="material-symbols-outlined text-[20px] text-tertiary">verified</span>',
      action: () => window.App?.navigate('delivery')
    },
    {
      id: "dock_addfunds",
      title: "+ Add Funds (Escrow)",
      icon: '<span class="material-symbols-outlined text-[20px] text-emerald-400">add_circle</span>',
      action: () => window.App?.openFundModal()
    },
    {
      id: "dock_autopurchase",
      title: "Run Autonomous Purchase",
      icon: '<span class="material-symbols-outlined text-[20px] text-secondary">rocket_launch</span>',
      action: () => window.App?.runAutonomousPurchaseSequence()
    },
    {
      id: "dock_3d",
      title: "3D Interactive Scene",
      icon: '<span class="material-symbols-outlined text-[20px] text-cyan-300">view_in_ar</span>',
      action: () => typeof window.openSplineIntro === 'function' ? window.openSplineIntro() : null
    },
    {
      id: "dock_github",
      title: "GitHub Repository",
      icon: '<svg class="w-5 h-5 fill-current text-white" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>',
      action: () => window.open("https://github.com/Rishisharma029/w3a-1", "_blank")
    }
  ];

  const HEADER_ITEMS = [
    {
      id: "btnPillarMarketplace",
      title: "Pillar 1: Marketplace",
      view: "providers",
      label: "MARKETPLACE",
      icon: '<span class="material-symbols-outlined text-sm text-tertiary">storefront</span>',
      action: () => window.App?.navigate('providers')
    },
    {
      id: "btnPillarAiPurchase",
      title: "Pillar 2: AI Purchase",
      view: "agent",
      label: "AI PURCHASE",
      icon: '<span class="material-symbols-outlined text-sm text-secondary">smart_toy</span>',
      action: () => window.App?.navigate('agent')
    },
    {
      id: "btnPillarOwnerCenter",
      title: "Pillar 3: Owner Center",
      view: "overview",
      label: "OWNER CENTER",
      icon: '<span class="material-symbols-outlined text-sm text-primary">dashboard</span>',
      action: () => window.App?.navigate('overview')
    },
    {
      id: "btnPillarLiveStream",
      title: "Live Stream Telemetry",
      view: "current",
      label: "LIVE STREAM",
      icon: '<span class="material-symbols-outlined text-sm text-amber-400">bolt</span>',
      action: () => window.App?.navigate('current')
    },
    {
      id: "btnPillarSecurity",
      title: "Security Defense & Cap",
      view: "security",
      label: "SECURITY",
      icon: '<span class="material-symbols-outlined text-sm text-error">shield</span>',
      action: () => window.App?.navigate('security')
    }
  ];

  class W3AFloatingDock {
    constructor(options = {}) {
      this.containerId = options.containerId || "w3aGlobalFloatingDock";
      this.isHeader = options.isHeader || false;
      this.items = options.items || (this.isHeader ? HEADER_ITEMS : GLOBAL_DOCK_ITEMS);
      this.isMobileOpen = false;
      this.currentView = "overview";
      this.baseSize = this.isHeader ? 36 : 44;
      this.maxSize = this.isHeader ? 48 : 68;
      this.influenceRadius = this.isHeader ? 90 : 140;
      this.mouseX = Infinity;
      this.elements = [];
    }

    init() {
      const container = document.getElementById(this.containerId);
      if (!container) return;

      container.innerHTML = this.renderHTML();
      this.bindEvents();
      this.syncActiveView();
    }

    renderHTML() {
      if (this.isHeader) {
        return `
          <div class="flex items-center p-1 rounded-xl bg-surface-low border border-outline-variant/40 font-mono text-xs font-bold gap-1 shadow-inner" id="${this.containerId}_desktop">
            ${this.items.map((item, idx) => `
              <button
                type="button"
                id="${item.id}"
                data-view="${item.view || ''}"
                data-dock-idx="${idx}"
                class="w3a-dock-header-item px-3 py-1.5 rounded-lg transition-all text-on-surface hover:text-white flex items-center gap-1.5 cursor-pointer relative group"
                title="${item.title}"
              >
                <span class="w3a-dock-h-icon transition-transform duration-100 flex items-center">${item.icon}</span>
                <span class="tracking-wide text-[11px] font-mono font-bold">${item.label}</span>
                <div class="w3a-dock-active-dot absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-secondary glow-cyan opacity-0 transition-opacity"></div>
              </button>
            `).join("")}
          </div>
        `;
      }

      return `
        <!-- Desktop Floating Dock (Mac OS Style Magnification) -->
        <div class="hidden md:flex items-end gap-2.5 px-3.5 py-2.5 rounded-2xl bg-surface-lowest/90 border border-outline-variant/40 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] glow-cyan transition-all" id="${this.containerId}_desktop">
          ${this.items.map((item, idx) => `
            <div 
              class="w3a-dock-item relative flex flex-col items-center justify-end cursor-pointer select-none group"
              data-dock-idx="${idx}"
              data-view="${item.view || ''}"
              id="${item.id}"
              style="width: ${this.baseSize}px; height: ${this.baseSize}px;"
            >
              <!-- Floating Tooltip -->
              <div class="w3a-dock-tooltip pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 translate-y-1 transition-all duration-200 ease-out z-50 whitespace-pre rounded-lg bg-surface-lowest/95 border border-secondary/40 px-2.5 py-1 text-[11px] font-mono font-bold tracking-wider text-secondary shadow-[0_4px_16px_rgba(0,0,0,0.6)] backdrop-blur-md">
                ${item.title}
              </div>

              <!-- Animated Icon Container with Spring Hover -->
              <div 
                class="w3a-dock-icon-box w-full h-full rounded-2xl bg-surface-high/80 border border-outline-variant/30 flex items-center justify-center transition-colors group-hover:border-secondary/60 group-hover:bg-surface-high relative"
              >
                <div class="w3a-dock-icon transition-transform duration-100 flex items-center justify-center">
                  ${item.icon}
                </div>
              </div>

              <!-- Active View Indicator Dot -->
              <div class="w3a-dock-active-dot w-1.5 h-1.5 rounded-full bg-secondary glow-cyan mt-1 opacity-0 transition-opacity"></div>
            </div>
          `).join("")}
        </div>

        <!-- Mobile Expandable Floating Circular Button -->
        <div class="block md:hidden relative" id="${this.containerId}_mobile_wrap">
          <!-- Expanded drawer items -->
          <div 
            id="${this.containerId}_mobile_drawer" 
            class="absolute bottom-16 right-0 flex flex-col gap-2.5 transition-all duration-300 pointer-events-none opacity-0 translate-y-4"
          >
            ${this.items.slice(0, 7).map((item, idx) => `
              <button 
                type="button"
                data-view="${item.view || ''}"
                class="w-11 h-11 rounded-full bg-surface-high/95 border border-outline-variant/40 flex items-center justify-center shadow-xl backdrop-blur-md text-white active:scale-95"
                id="${this.containerId}_m_item_${idx}"
                title="${item.title}"
              >
                <span class="scale-90 flex items-center justify-center">${item.icon}</span>
              </button>
            `).join("")}
          </div>

          <!-- Main circular trigger toggle -->
          <button 
            type="button"
            id="${this.containerId}_mobile_btn"
            class="w-12 h-12 rounded-full bg-surface-high border border-secondary/50 flex items-center justify-center text-secondary shadow-2xl glow-cyan active:scale-95"
            aria-label="Toggle Navigation Dock"
          >
            <span class="material-symbols-outlined text-2xl transition-transform duration-300" id="${this.containerId}_mobile_icon">grid_view</span>
          </button>
        </div>
      `;
    }

    bindEvents() {
      const desktop = document.getElementById(`${this.containerId}_desktop`);
      if (desktop) {
        const itemSelector = this.isHeader ? ".w3a-dock-header-item" : ".w3a-dock-item";
        this.elements = Array.from(desktop.querySelectorAll(itemSelector));

        desktop.addEventListener("mousemove", (e) => {
          this.mouseX = e.pageX;
          this.updateMagnification();
        });

        desktop.addEventListener("mouseleave", () => {
          this.mouseX = Infinity;
          this.resetMagnification();
        });

        this.elements.forEach((el, idx) => {
          const item = this.items[idx];
          if (!item) return;

          if (!this.isHeader) {
            const tooltip = el.querySelector(".w3a-dock-tooltip");
            el.addEventListener("mouseenter", () => {
              if (tooltip) {
                tooltip.classList.remove("opacity-0", "translate-y-1");
                tooltip.classList.add("opacity-100", "translate-y-0");
              }
            });

            el.addEventListener("mouseleave", () => {
              if (tooltip) {
                tooltip.classList.remove("opacity-100", "translate-y-0");
                tooltip.classList.add("opacity-0", "translate-y-1");
              }
            });
          }

          el.addEventListener("click", (e) => {
            if (item.view) {
              if (window.App && typeof window.App.navigate === "function") {
                window.App.navigate(item.view);
              } else if (typeof App !== "undefined" && typeof App.navigate === "function") {
                App.navigate(item.view);
              }
              this.setActiveView(item.view);
            }
            if (typeof item.action === "function") {
              try {
                item.action();
              } catch (err) {
                console.warn("[FloatingDock] Action error:", err);
              }
            }
          });
        });
      }

      // Mobile button toggle
      const mobileBtn = document.getElementById(`${this.containerId}_mobile_btn`);
      const mobileDrawer = document.getElementById(`${this.containerId}_mobile_drawer`);
      const mobileIcon = document.getElementById(`${this.containerId}_mobile_icon`);

      if (mobileBtn && mobileDrawer) {
        mobileBtn.addEventListener("click", () => {
          this.isMobileOpen = !this.isMobileOpen;
          if (this.isMobileOpen) {
            mobileDrawer.classList.remove("opacity-0", "translate-y-4", "pointer-events-none");
            mobileDrawer.classList.add("opacity-100", "translate-y-0", "pointer-events-auto");
            if (mobileIcon) mobileIcon.innerText = "close";
          } else {
            mobileDrawer.classList.remove("opacity-100", "translate-y-0", "pointer-events-auto");
            mobileDrawer.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
            if (mobileIcon) mobileIcon.innerText = "grid_view";
          }
        });

        this.items.slice(0, 7).forEach((item, idx) => {
          const mItem = document.getElementById(`${this.containerId}_m_item_${idx}`);
          if (mItem) {
            mItem.addEventListener("click", () => {
              if (item.view) {
                if (window.App && typeof window.App.navigate === "function") {
                  window.App.navigate(item.view);
                } else if (typeof App !== "undefined" && typeof App.navigate === "function") {
                  App.navigate(item.view);
                }
                this.setActiveView(item.view);
              }
              if (typeof item.action === "function") {
                try { item.action(); } catch (_) {}
              }
              this.isMobileOpen = false;
              mobileDrawer.classList.remove("opacity-100", "translate-y-0", "pointer-events-auto");
              mobileDrawer.classList.add("opacity-0", "translate-y-4", "pointer-events-none");
              if (mobileIcon) mobileIcon.innerText = "grid_view";
            });
          }
        });
      }
    }

    updateMagnification() {
      if (this.mouseX === Infinity) return;

      this.elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2 + window.scrollX;
        const distance = Math.abs(this.mouseX - centerX);

        if (distance < this.influenceRadius) {
          const norm = 1 - distance / this.influenceRadius;
          const factor = Math.sin((norm * Math.PI) / 2);
          
          if (!this.isHeader) {
            const targetSize = this.baseSize + (this.maxSize - this.baseSize) * factor;
            const iconScale = 1 + 0.35 * factor;
            el.style.width = `${targetSize}px`;
            el.style.height = `${targetSize}px`;
            const icon = el.querySelector(".w3a-dock-icon");
            if (icon) icon.style.transform = `scale(${iconScale})`;
          } else {
            const iconScale = 1 + 0.25 * factor;
            const icon = el.querySelector(".w3a-dock-h-icon");
            if (icon) icon.style.transform = `scale(${iconScale})`;
            el.style.transform = `translateY(-${3 * factor}px)`;
          }
        } else {
          if (!this.isHeader) {
            el.style.width = `${this.baseSize}px`;
            el.style.height = `${this.baseSize}px`;
            const icon = el.querySelector(".w3a-dock-icon");
            if (icon) icon.style.transform = "scale(1)";
          } else {
            const icon = el.querySelector(".w3a-dock-h-icon");
            if (icon) icon.style.transform = "scale(1)";
            el.style.transform = "none";
          }
        }
      });
    }

    resetMagnification() {
      this.elements.forEach((el) => {
        if (!this.isHeader) {
          el.style.width = `${this.baseSize}px`;
          el.style.height = `${this.baseSize}px`;
          const icon = el.querySelector(".w3a-dock-icon");
          if (icon) icon.style.transform = "scale(1)";
        } else {
          const icon = el.querySelector(".w3a-dock-h-icon");
          if (icon) icon.style.transform = "scale(1)";
          el.style.transform = "none";
        }
      });
    }

    setActiveView(view) {
      this.currentView = view;
      this.syncActiveView();
      if (this.isHeader && window._globalFloatingDock && window._globalFloatingDock.currentView !== view) {
        window._globalFloatingDock.currentView = view;
        window._globalFloatingDock.syncActiveView();
      } else if (!this.isHeader && window._headerFloatingDock && window._headerFloatingDock.currentView !== view) {
        window._headerFloatingDock.currentView = view;
        window._headerFloatingDock.syncActiveView();
      }
    }

    syncActiveView() {
      const active = this.currentView || (window.AppState && window.AppState.currentView) || (typeof AppState !== "undefined" && AppState.currentView) || "overview";
      this.elements.forEach((el) => {
        const itemV = el.getAttribute("data-view");
        const dot = el.querySelector(".w3a-dock-active-dot");
        const box = el.querySelector(".w3a-dock-icon-box");

        if (itemV && itemV === active) {
          if (dot) dot.classList.remove("opacity-0");
          if (box) {
            box.classList.add("border-secondary/80", "bg-surface-high");
            box.classList.remove("border-outline-variant/30");
          }
          if (this.isHeader) {
            el.classList.add("bg-surface-high", "text-white", "shadow-sm");
            el.classList.remove("text-on-surface");
          }
        } else {
          if (dot) dot.classList.add("opacity-0");
          if (box) {
            box.classList.remove("border-secondary/80");
            box.classList.add("border-outline-variant/30");
          }
          if (this.isHeader) {
            el.classList.remove("bg-surface-high", "text-white", "shadow-sm");
            el.classList.add("text-on-surface");
          }
        }
      });
    }
  }

  window.FloatingDock = {
    create(options) {
      const dock = new W3AFloatingDock(options);
      dock.init();
      return dock;
    },
    init() {
      // 1. Initialize Header Floating Dock
      const headerContainer = document.getElementById("w3aHeaderFloatingDock");
      if (headerContainer) {
        window._headerFloatingDock = new W3AFloatingDock({
          containerId: "w3aHeaderFloatingDock",
          isHeader: true
        });
        window._headerFloatingDock.init();
      }

      // 2. Initialize Bottom Global Floating Dock
      let globalContainer = document.getElementById("w3aGlobalFloatingDock");
      if (!globalContainer) {
        globalContainer = document.createElement("div");
        globalContainer.id = "w3aGlobalFloatingDock";
        globalContainer.className = "fixed bottom-5 left-1/2 -translate-x-1/2 z-40 select-none";
        document.body.appendChild(globalContainer);
      }
      window._globalFloatingDock = new W3AFloatingDock({
        containerId: "w3aGlobalFloatingDock",
        isHeader: false
      });
      window._globalFloatingDock.init();

      // Hook App.navigate to keep docks synchronized
      if (window.App && typeof window.App.navigate === "function") {
        const origNav = window.App.navigate.bind(window.App);
        window.App.navigate = function(view) {
          origNav(view);
          if (window._globalFloatingDock) {
            window._globalFloatingDock.setActiveView(view);
          }
          if (window._headerFloatingDock) {
            window._headerFloatingDock.setActiveView(view);
          }
        };
      }
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      window.FloatingDock.init();
    }, 150);
  });
})();
