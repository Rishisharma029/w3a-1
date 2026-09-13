/**
 * dashboard/public/js/stream.js
 *
 * Real-Time Event Stream Consumer (SSE)
 * =====================================
 * Establishes a persistent Server-Sent Events (SSE) stream with the W3A-1 backend.
 * Replaces intermittent polling with sub-second event push directly to the dashboard.
 *
 * Emitted Events:
 *   INTENT_RECEIVED, PROVIDER_SEARCH, PROVIDER_SELECTED, PAYMENT_REQUIRED,
 *   PAYMENT_SIGNED, PAYMENT_VERIFIED, SETTLEMENT_SUBMITTED, SETTLEMENT_CONFIRMED,
 *   DELIVERY_RECEIVED, HASH_VERIFIED, OVERSPEND_BLOCKED, RETRY_DETECTED,
 *   AGENT_FROZEN, AGENT_UNFROZEN, BUDGET_FUNDED, DELIVERY_TAMPERED
 */

const LiveEventStream = {
  eventSource: null,
  reconnectAttempts: 0,
  maxReconnectDelay: 10000,
  isPaused: false,
  listeners: new Set(),

  init() {
    this.connect();
  },

  connect() {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (_) {}
    }

    const streamUrl = (typeof ApiService !== "undefined" && ApiService.baseUrl ? ApiService.baseUrl : "") + "/api/events/stream";

    try {
      this.eventSource = new EventSource(streamUrl);

      this.eventSource.addEventListener("connected", (e) => {
        try {
          const data = JSON.parse(e.data);
          this.reconnectAttempts = 0;
          if (typeof AppState !== "undefined") {
            AppState.isStreamConnected = true;
            if (data.recentEvents && Array.isArray(data.recentEvents)) {
              AppState.setLiveEvents(data.recentEvents);
            }
          }
          this.updateStatusBadge(true);
        } catch (_) {}
      });

      this.eventSource.addEventListener("w3a1_event", (e) => {
        if (this.isPaused) return;

        try {
          const evt = JSON.parse(e.data);
          this.handleIncomingEvent(evt);
        } catch (err) {
          console.warn("[LiveEventStream] Error parsing SSE payload:", err);
        }
      });

      this.eventSource.onopen = () => {
        this.reconnectAttempts = 0;
        if (typeof AppState !== "undefined") {
          AppState.isStreamConnected = true;
        }
        this.updateStatusBadge(true);
      };

      this.eventSource.onerror = () => {
        if (typeof AppState !== "undefined") {
          AppState.isStreamConnected = false;
        }
        this.updateStatusBadge(false);

        try {
          this.eventSource.close();
        } catch (_) {}

        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay);
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), delay);
      };
    } catch (err) {
      console.warn("[LiveEventStream] SSE init failed:", err);
    }
  },

  handleIncomingEvent(evt) {
    if (typeof AppState !== "undefined") {
      if (typeof AppState.handleStreamEvent === "function") {
        AppState.handleStreamEvent(evt);
      } else {
        AppState.addLiveEvent(evt);
      }

      // Trigger automatic background sync for state-changing events
      const stateChangingEvents = [
        "SETTLEMENT_CONFIRMED",
        "SETTLEMENT_SUBMITTED",
        "AGENT_FROZEN",
        "AGENT_UNFROZEN",
        "BUDGET_FUNDED",
        "OVERSPEND_BLOCKED",
        "PAYMENT_SIGNED",
        "SERVICE_PUBLISHED",
      ];
      if (stateChangingEvents.includes(evt.type) && typeof ApiService !== "undefined") {
        ApiService.syncAll();
      }

      // Drive active x402 protocol visualizer state machine
      this.syncX402FlowFromEvent(evt);
    }

    // Notify registered UI listeners
    for (const listener of this.listeners) {
      try {
        listener(evt);
      } catch (_) {}
    }

    // Direct DOM insertion into the active live stream ticker if visible
    this.appendEventToDom(evt);

    // Stream into developer-style LIVE SYSTEM STREAM terminal
    if (typeof LiveSystemTerminal !== "undefined") {
      LiveSystemTerminal.ingestEvent(evt);
    }

    // Re-render x402 protocol visualizer if present on current view
    if (typeof X402ProtocolVisualizer !== "undefined") {
      X402ProtocolVisualizer.updateDOM();
    }
  },

  syncX402FlowFromEvent(evt) {
    if (typeof AppState === "undefined" || !AppState.activeX402Flow) return;

    const data = evt.data || {};

    switch (evt.type) {
      case "INTENT_RECEIVED":
      case "PROVIDER_SEARCH":
      case "PROVIDER_SELECTED":
        AppState.updateActiveX402Flow({
          stage: "IDLE",
          stageIndex: 0,
          statusText: "AI AGENT NEGOTIATING SERVICE REQUIREMENTS",
          resource: data.resourceName || evt.message || "Text Translation",
          timestamp: evt.timestamp,
        });
        break;

      case "PAYMENT_REQUIRED":
        AppState.updateActiveX402Flow({
          stage: "402",
          stageIndex: 1,
          resource: evt.resourceName || data.resourceName || "Text Translation",
          amountUSD: evt.amountUSD || (evt.amountAtomic ? (Number(evt.amountAtomic) / 1e6).toFixed(2) : "4.00"),
          amountAtomic: evt.amountAtomic || "4000000",
          scheme: data.scheme || "exact",
          network: data.network || (AppState.config && AppState.config.networkCaip2) || "eip155:31337",
          payTo: data.payTo || evt.providerId || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          asset: data.asset || (AppState.config && AppState.config.tokenAddress) || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          reqId: evt.reqId || data.reqId || AppState.activeX402Flow.reqId,
          rawHeader: data.rawHeader || null,
          statusText: "PAYMENT REQUIREMENTS RECEIVED",
          timestamp: evt.timestamp,
        });
        break;

      case "PAYMENT_SIGNED":
        AppState.updateActiveX402Flow({
          stage: "PAYMENT_SIGNED",
          stageIndex: 2,
          statusText: "PAYMENT-SIGNATURE GENERATED (EIP-712)",
          timestamp: evt.timestamp,
        });
        break;

      case "PAYMENT_VERIFIED":
        AppState.updateActiveX402Flow({
          stage: "VERIFY",
          stageIndex: 3,
          statusText: "FACILITATOR VERIFIED SIGNATURE & HARD SPENDING CAP",
          timestamp: evt.timestamp,
        });
        break;

      case "SETTLEMENT_SUBMITTED":
        AppState.updateActiveX402Flow({
          stage: "SETTLE",
          stageIndex: 4,
          statusText: "SETTLEMENT TRANSACTION SUBMITTED TO EVM",
          timestamp: evt.timestamp,
        });
        break;

      case "SETTLEMENT_CONFIRMED":
        AppState.updateActiveX402Flow({
          stage: "SETTLED",
          stageIndex: 4,
          statusText: "SETTLED ON-CHAIN (MockUSDC TRANSFERRED)",
          txHash: evt.txHash || data.txHash || AppState.activeX402Flow.txHash,
          deliveryHash: evt.deliveryHash || data.deliveryHash || AppState.activeX402Flow.deliveryHash,
          timestamp: evt.timestamp,
        });
        break;
    }
  },

  appendEventToDom(evt) {
    const listEl = document.getElementById("liveEventStreamList");
    if (!listEl) return;

    // Remove empty placeholder if present
    const emptyEl = document.getElementById("liveEventStreamEmpty");
    if (emptyEl) emptyEl.remove();

    const row = document.createElement("div");
    row.className = "flex items-start gap-3 p-2.5 rounded-lg bg-surface-container/60 hover:bg-surface-container border border-outline-variant/30 text-xs font-mono transition-all duration-300 animate-fadeIn";
    row.innerHTML = this.renderEventRowInner(evt);

    if (listEl.firstChild) {
      listEl.insertBefore(row, listEl.firstChild);
    } else {
      listEl.appendChild(row);
    }

    // Keep DOM list capped at 50 items for smooth 60fps rendering
    while (listEl.children.length > 50) {
      listEl.removeChild(listEl.lastChild);
    }
  },

  renderEventRowInner(evt) {
    const badgeColor = this.getBadgeColor(evt.type);
    const timeStr = evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : "";
    const reqSnippet = evt.reqId && evt.reqId !== "0x" ? `${evt.reqId.slice(0, 8)}...` : "";

    return `
      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor} shrink-0 uppercase tracking-wider">
        ${evt.type}
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <span class="text-white font-medium truncate">${evt.message || evt.type}</span>
          <span class="text-[10px] text-outline shrink-0">${timeStr}</span>
        </div>
        <div class="flex items-center gap-3 text-[10px] text-on-surface-variant mt-0.5">
          ${evt.providerId ? `<span>Provider: <strong class="text-secondary">${evt.providerId}</strong></span>` : ""}
          ${evt.amountUSD && evt.amountUSD !== "0.00" ? `<span>Amount: <strong class="text-tertiary">$${evt.amountUSD}</strong></span>` : ""}
          ${reqSnippet ? `<span>reqId: <code class="text-outline">${reqSnippet}</code></span>` : ""}
          ${evt.txHash ? `<span class="text-primary font-bold">Tx: ${evt.txHash.slice(0, 8)}...</span>` : ""}
        </div>
      </div>
    `;
  },

  getBadgeColor(type) {
    switch (type) {
      case "INTENT_RECEIVED":
      case "PROVIDER_SEARCH":
        return "bg-secondary/15 text-secondary border border-secondary/40";
      case "PROVIDER_SELECTED":
      case "PAYMENT_REQUIRED":
        return "bg-primary/15 text-primary border border-primary/40";
      case "PAYMENT_SIGNED":
      case "SETTLEMENT_SUBMITTED":
        return "bg-amber-400/15 text-amber-400 border border-amber-400/40";
      case "SETTLEMENT_CONFIRMED":
      case "HASH_VERIFIED":
      case "DELIVERY_RECEIVED":
        return "bg-tertiary/15 text-tertiary border border-tertiary/40 glow-emerald";
      case "OVERSPEND_BLOCKED":
      case "DELIVERY_TAMPERED":
      case "FAILED":
        return "bg-error/15 text-error border border-error/40 glow-crimson";
      case "AGENT_FROZEN":
        return "bg-error-container text-white border border-error glow-crimson";
      case "RETRY_DETECTED":
        return "bg-cyan-400/15 text-cyan-400 border border-cyan-400/40";
      default:
        return "bg-surface-high text-white border border-outline-variant/40";
    }
  },

  updateStatusBadge(connected) {
    const badges = document.querySelectorAll(".sse-status-badge");
    badges.forEach((b) => {
      b.innerHTML = connected
        ? `<span class="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse glow-emerald"></span><span class="text-emerald-400 font-bold">LIVE STREAM (SSE)</span>`
        : `<span class="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5 animate-ping"></span><span class="text-amber-400">CONNECTING...</span>`;
    });
  },

  togglePause() {
    this.isPaused = !this.isPaused;
    const btn = document.getElementById("btnToggleStreamPause");
    if (btn) {
      btn.innerText = this.isPaused ? "RESUME STREAM" : "PAUSE STREAM";
      btn.className = this.isPaused
        ? "px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40"
        : "px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-surface-container text-outline hover:text-white border border-outline-variant/40";
    }
  },

  clear() {
    if (typeof AppState !== "undefined") {
      AppState.clearLiveEvents();
    }
    const listEl = document.getElementById("liveEventStreamList");
    if (listEl) {
      listEl.innerHTML = `<div id="liveEventStreamEmpty" class="text-center py-6 text-outline text-xs font-mono">Stream cleared. Waiting for live events...</div>`;
    }
  },

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },
};

// Initialize when DOM ready
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    LiveEventStream.init();
  });
}

/**
 * LiveSystemTerminal
 * ==================
 * Developer-style live system event terminal.
 * Streams operational milestones and SSE bus messages in authentic console format:
 *
 *   [23:14:02] REQUEST    req_8a19...
 *   [23:14:02] PROVIDER   alpha-translate
 *   [23:14:03] X402       402 PAYMENT_REQUIRED
 *   [23:14:03] SIGN       EIP-712 authorization
 *   [23:14:04] VERIFY     ✓ budget=26 amount=4
 *   [23:14:04] SETTLE     tx=0xda...
 *   [23:14:04] CHAIN      ✓ block #12
 *   [23:14:05] DELIVER    receipt=REC...
 *   [23:14:05] HASH       ✓ MATCH
 */
const LiveSystemTerminal = {
  maxLines: 120,
  autoScroll: true,
  lines: [
    { time: "23:14:02", tag: "REQUEST", text: "req_8a192b4...", type: "request" },
    { time: "23:14:02", tag: "PROVIDER", text: "alpha-translate", type: "provider" },
    { time: "23:14:03", tag: "X402", text: "402 PAYMENT_REQUIRED", type: "x402" },
    { time: "23:14:03", tag: "SIGN", text: "EIP-712 authorization", type: "sign" },
    { time: "23:14:04", tag: "VERIFY", text: "✓ budget=26 amount=4", type: "verify" },
    { time: "23:14:04", tag: "SETTLE", text: "tx=0xda48b1...", type: "settle" },
    { time: "23:14:04", tag: "CHAIN", text: "✓ block #12", type: "chain" },
    { time: "23:14:05", tag: "DELIVER", text: "receipt=REC_78a19...", type: "deliver" },
    { time: "23:14:05", tag: "HASH", text: "✓ MATCH", type: "hash" },
  ],

  appendLine(tag, text, customTime, type) {
    const timeStr = customTime || new Date().toTimeString().split(" ")[0];
    const inferredType = type || tag.toLowerCase();

    this.lines.push({
      time: timeStr,
      tag: String(tag).toUpperCase(),
      text: String(text),
      type: inferredType,
    });

    if (this.lines.length > this.maxLines) {
      this.lines.shift();
    }

    this.updateDOM();
  },

  ingestEvent(evt) {
    const timeStr = evt.timestamp
      ? new Date(evt.timestamp).toTimeString().split(" ")[0]
      : new Date().toTimeString().split(" ")[0];

    const data = evt.data || {};
    const reqSnippet = evt.reqId && evt.reqId !== "0x" ? `req_${evt.reqId.slice(2, 8)}...` : "req_8a19...";

    switch (evt.type) {
      case "INTENT_RECEIVED":
        this.appendLine("REQUEST", reqSnippet, timeStr, "request");
        break;

      case "PROVIDER_SEARCH":
      case "PROVIDER_SELECTED":
        this.appendLine("PROVIDER", evt.providerId || data.providerId || "alpha-translate", timeStr, "provider");
        break;

      case "PAYMENT_REQUIRED":
        this.appendLine("X402", "402 PAYMENT_REQUIRED", timeStr, "x402");
        break;

      case "PAYMENT_SIGNED":
        this.appendLine("SIGN", "EIP-712 authorization", timeStr, "sign");
        break;

      case "PAYMENT_VERIFIED": {
        const remaining = (typeof AppState !== "undefined" && AppState.budget && AppState.budget.remaining)
          ? Math.round(Number(AppState.budget.remaining))
          : 26;
        const amount = evt.amountUSD ? Math.round(Number(evt.amountUSD)) : 4;
        this.appendLine("VERIFY", `✓ budget=${remaining} amount=${amount}`, timeStr, "verify");
        break;
      }

      case "SETTLEMENT_SUBMITTED": {
        const txSnippet = evt.txHash ? `tx=${evt.txHash.slice(0, 8)}...` : "tx=0xda48...";
        this.appendLine("SETTLE", txSnippet, timeStr, "settle");
        break;
      }

      case "SETTLEMENT_CONFIRMED": {
        const blockNum = evt.blockNumber || data.blockNumber || 12;
        this.appendLine("CHAIN", `✓ block #${blockNum}`, timeStr, "chain");
        break;
      }

      case "DELIVERY_RECEIVED": {
        const recSnippet = evt.deliveryHash ? `receipt=REC_${evt.deliveryHash.slice(2, 8)}...` : "receipt=REC_78a1...";
        this.appendLine("DELIVER", recSnippet, timeStr, "deliver");
        break;
      }

      case "HASH_VERIFIED":
        this.appendLine("HASH", "✓ MATCH", timeStr, "hash");
        break;

      case "OVERSPEND_BLOCKED":
        this.appendLine("BLOCKED", "✓ Overspend rejected by protocol", timeStr, "alert");
        break;

      case "RETRY_DETECTED":
        this.appendLine("RETRY", "Idempotent cache hit: 0 duplicate tokens", timeStr, "retry");
        break;

      case "AGENT_FROZEN":
        this.appendLine("FREEZE", "EMERGENCY: AI Agent frozen by owner", timeStr, "alert");
        break;

      case "AGENT_UNFROZEN":
        this.appendLine("UNFREEZE", "AI Agent unfreezed; spend restored", timeStr, "chain");
        break;

      case "SERVICE_PUBLISHED":
        this.appendLine("SERVICE", `+ Published "${data.name || 'New Service'}" (${data.price || '$4.00'} | Q:${data.quality || '0.90'})`, timeStr, "service");
        break;
    }
  },

  getTagStyle(type) {
    switch (type) {
      case "request":
        return { tagClass: "text-sky-400 font-bold", textClass: "text-sky-200" };
      case "provider":
        return { tagClass: "text-indigo-400 font-bold", textClass: "text-indigo-200" };
      case "x402":
        return { tagClass: "text-amber-400 font-bold", textClass: "text-amber-300 font-semibold" };
      case "sign":
        return { tagClass: "text-purple-400 font-bold", textClass: "text-purple-200" };
      case "verify":
        return { tagClass: "text-emerald-400 font-bold", textClass: "text-emerald-300 font-semibold" };
      case "settle":
        return { tagClass: "text-cyan-400 font-bold", textClass: "text-cyan-200" };
      case "chain":
        return { tagClass: "text-emerald-400 font-bold", textClass: "text-emerald-200" };
      case "deliver":
        return { tagClass: "text-blue-400 font-bold", textClass: "text-blue-200" };
      case "hash":
        return { tagClass: "text-emerald-400 font-bold", textClass: "text-emerald-300 font-bold glow-emerald" };
      case "service":
        return { tagClass: "text-secondary font-bold", textClass: "text-secondary font-semibold" };
      case "alert":
        return { tagClass: "text-rose-400 font-bold", textClass: "text-rose-300 font-bold" };
      case "retry":
        return { tagClass: "text-amber-400 font-bold", textClass: "text-amber-200" };
      default:
        return { tagClass: "text-slate-300 font-bold", textClass: "text-slate-300" };
    }
  },

  renderLinesHtml() {
    return this.lines
      .map((l) => {
        const style = this.getTagStyle(l.type);
        const paddedTag = l.tag.padEnd(10, " ");
        return `
          <div class="flex items-center gap-2.5 font-mono text-[11px] leading-relaxed select-text hover:bg-white/[0.03] px-1.5 py-0.5 rounded transition-colors">
            <span class="text-outline/70 shrink-0 select-none">[${l.time}]</span>
            <span class="inline-block w-20 shrink-0 ${style.tagClass}">${paddedTag}</span>
            <span class="truncate ${style.textClass}">${l.text}</span>
          </div>
        `;
      })
      .join("");
  },

  render(containerId = "liveSystemTerminalBody") {
    return `
      <div class="rounded-2xl bg-[#090b10] border border-outline-variant/40 shadow-2xl overflow-hidden font-mono text-xs">
        <!-- Terminal Title Bar -->
        <div class="flex items-center justify-between px-4 py-2.5 bg-[#0f131a] border-b border-outline-variant/30 select-none">
          <div class="flex items-center gap-2">
            <!-- Mac window control buttons -->
            <div class="flex items-center gap-1.5 mr-2">
              <span class="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>
            <span class="text-xs font-bold text-white tracking-wider flex items-center gap-2">
              <span>LIVE SYSTEM STREAM</span>
              <span class="text-[10px] text-outline font-normal">── bash / w3a1-bus.sock</span>
            </span>
          </div>

          <!-- Actions and Status -->
          <div class="flex items-center gap-3 text-[11px]">
            <span class="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 font-bold text-[10px]">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              ● STREAMING
            </span>
            <button
              onclick="LiveSystemTerminal.copyLog()"
              class="text-outline hover:text-white transition flex items-center gap-1"
              title="Copy Output"
            >
              <span class="material-symbols-outlined text-xs">content_copy</span>
              <span class="text-[10px] hidden sm:inline">Copy</span>
            </button>
            <button
              onclick="LiveSystemTerminal.clear()"
              class="text-outline hover:text-white transition flex items-center gap-1"
              title="Clear Terminal"
            >
              <span class="material-symbols-outlined text-xs">delete_sweep</span>
              <span class="text-[10px] hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        <!-- Terminal Output Stream -->
        <div
          id="${containerId}"
          class="terminal-stream-body p-4 space-y-0.5 overflow-y-auto max-h-64 sm:max-h-72 bg-[#07090e] text-[11px] leading-relaxed select-text"
        >
          ${this.renderLinesHtml()}
          <div class="pt-1.5 flex items-center text-outline">
            <span class="text-secondary">&gt;</span>
            <span class="inline-block w-1.5 h-3 bg-secondary animate-pulse ml-1.5"></span>
          </div>
        </div>
      </div>
    `;
  },

  updateDOM() {
    if (typeof document === "undefined") return;
    const bodies = document.querySelectorAll(".terminal-stream-body");
    bodies.forEach((body) => {
      body.innerHTML = `
        ${this.renderLinesHtml()}
        <div class="pt-1.5 flex items-center text-outline">
          <span class="text-secondary">&gt;</span>
          <span class="inline-block w-1.5 h-3 bg-secondary animate-pulse ml-1.5"></span>
        </div>
      `;
      if (this.autoScroll) {
        body.scrollTop = body.scrollHeight;
      }
    });
  },

  clear() {
    this.lines = [];
    this.updateDOM();
  },

  copyLog() {
    const text = this.lines.map((l) => `[${l.time}] ${l.tag.padEnd(10, " ")} ${l.text}`).join("\n");
    if (typeof App !== "undefined" && App.copyText) {
      App.copyText(text, "Live Terminal Log");
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  },
};

/**
 * X402ProtocolVisualizer
 * =======================
 * Interactive x402 V2 Wire Protocol Stepper and Requirements Inspection Card.
 * Renders the visible transition:
 *   402 (PAYMENT-REQUIRED) -> PAYMENT-SIGNATURE -> VERIFY -> SETTLE
 */
const X402ProtocolVisualizer = {
  toggleRawPayload() {
    const drawer = document.getElementById("x402RawPayloadDrawer");
    if (!drawer) return;
    drawer.classList.toggle("hidden");
  },

  updateDOM() {
    if (typeof document === "undefined") return;
    const wrappers = document.querySelectorAll(".x402-visualizer-container");
    if (!wrappers || wrappers.length === 0) return;
    wrappers.forEach((w) => {
      w.innerHTML = this.render();
    });
  },

  async simulateLiveStepByStep() {
    if (typeof AppState === "undefined") return;

    // Reset to idle ○
    AppState.resetActiveX402Flow();
    this.updateDOM();
    await new Promise((r) => setTimeout(r, 450));

    // Step 1: HTTP 402 PAYMENT REQUIRED (○ -> ◉ -> ✓)
    AppState.updateActiveX402Flow({
      stage: "402",
      stageIndex: 1,
      statusText: "◉ NEGOTIATING HTTP 402 WIRE CHALLENGE...",
    });
    this.updateDOM();
    await new Promise((r) => setTimeout(r, 650));

    AppState.updateActiveX402Flow({
      stage: "402",
      stageIndex: 1,
      resource: "Alpha Translation Services",
      amountUSD: "4.00",
      amountAtomic: "4000000",
      scheme: "exact",
      network: (AppState.config && AppState.config.networkCaip2) || "eip155:31337",
      payTo: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      asset: (AppState.config && AppState.config.tokenAddress) || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      reqId: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      statusText: "✓ HTTP 402 REQUIREMENTS RECEIVED & BOUND",
      timestamp: new Date().toISOString(),
    });
    this.updateDOM();
    await new Promise((r) => setTimeout(r, 650));

    // Step 2: PAYMENT-SIGNATURE (○ -> ◉ -> ✓)
    AppState.updateActiveX402Flow({
      stage: "PAYMENT_SIGNED",
      stageIndex: 2,
      statusText: "◉ SIGNING EIP-712 STRUCTURED DATA (secp256k1)...",
    });
    this.updateDOM();
    await new Promise((r) => setTimeout(r, 700));

    AppState.updateActiveX402Flow({
      stage: "PAYMENT_SIGNED",
      stageIndex: 2,
      statusText: "✓ EIP-712 PAYMENT-SIGNATURE GENERATED",
      timestamp: new Date().toISOString(),
    });
    this.updateDOM();
    await new Promise((r) => setTimeout(r, 650));

    // Step 3: VERIFY (○ -> ◉ -> ✓)
    AppState.updateActiveX402Flow({
      stage: "VERIFY",
      stageIndex: 3,
      statusText: "◉ FACILITATOR VERIFYING SIGNATURE & SPENDING CAP...",
    });
    this.updateDOM();
    await new Promise((r) => setTimeout(r, 650));

    AppState.updateActiveX402Flow({
      stage: "VERIFY",
      stageIndex: 3,
      statusText: "✓ SIGNATURE & HARD SPENDING CAP VERIFIED",
      timestamp: new Date().toISOString(),
    });
    this.updateDOM();
    await new Promise((r) => setTimeout(r, 650));

    // Step 4: SETTLE (○ -> ◉ -> ✓ with Tx Hash appearing)
    AppState.updateActiveX402Flow({
      stage: "SETTLE",
      stageIndex: 4,
      statusText: "◉ SETTLEMENT PENDING ON EVM (MEMPOOL BROADCAST)...",
    });
    this.updateDOM();
    await new Promise((r) => setTimeout(r, 850));

    AppState.updateActiveX402Flow({
      stage: "SETTLED",
      stageIndex: 4,
      statusText: "✓ SETTLEMENT CONFIRMED (MockUSDC TRANSFERRED)",
      txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
      deliveryHash: "sha256:30f928ebdfd01ba8766adca93783758006ae9bd02f382a52c9daab35f5ed3a0f",
      timestamp: new Date().toISOString(),
    });
    this.updateDOM();
  },

  render(flowData) {
    const flow = flowData || (typeof AppState !== "undefined" && AppState.activeX402Flow) || {
      stage: "SETTLED",
      stageIndex: 4,
      resource: "Alpha Translation Services",
      amountUSD: "4.00",
      amountAtomic: "4000000",
      scheme: "exact",
      network: "eip155:31337",
      payTo: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      asset: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      reqId: "0x088e7c75ddcc48eba2b158c5b9268bf600000000000000000000000000000000",
      txHash: "0xcd056079875d69bc88e70eb82ba1f36ab203f9c7bf77b6ff39172242c26d9137",
      statusText: "PAYMENT SETTLED ON-CHAIN",
    };

    const sIdx = flow.stageIndex !== undefined ? flow.stageIndex : (flow.stage === "402" ? 1 : flow.stage === "PAYMENT_SIGNED" ? 2 : flow.stage === "VERIFY" ? 3 : 4);

    const steps = [
      { id: 1, key: "402", label: "402", title: "PAYMENT-REQUIRED", subtitle: "HTTP 402 Challenge" },
      { id: 2, key: "PAYMENT_SIGNED", label: "PAYMENT-SIGNATURE", title: "EIP-712 AUTH", subtitle: "Agent Signs Payload" },
      { id: 3, key: "VERIFY", label: "VERIFY", title: "FACILITATOR CHECK", subtitle: "Verify Cap & Sig" },
      { id: 4, key: "SETTLE", label: "SETTLE", title: "EVM SETTLEMENT", subtitle: "Token Transferred" },
    ];

    const copyBtn = typeof UIFormatter !== "undefined" && UIFormatter.copyButton
      ? UIFormatter.copyButton
      : (val) => `<button onclick="App.copyText('${val}')" class="text-outline hover:text-white"><span class="material-symbols-outlined text-xs">content_copy</span></button>`;

    const mockDecodedHeader = {
      x402Version: 2,
      resource: {
        url: "/x402/providers/alpha-translate/service",
        description: flow.resource || "Text Translation",
        mimeType: "application/json",
      },
      accepts: [
        {
          scheme: flow.scheme || "exact",
          network: flow.network || "eip155:31337",
          amount: flow.amountAtomic || "4000000",
          asset: flow.asset || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          payTo: flow.payTo || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          extra: {
            reqId: flow.reqId || "0x088e7c75ddcc48eba2b158c5b9268bf600000000000000000000000000000000",
            priceUSD: flow.amountUSD || "4.00",
          },
        },
      ],
      extensions: null,
    };

    return `
      <div class="rounded-2xl bg-surface-low border border-outline-variant/50 p-6 space-y-6 shadow-2xl relative overflow-hidden">
        <!-- Ambient decorative background glow -->
        <div class="absolute -right-16 -top-16 w-56 h-56 ${sIdx >= 4 ? "bg-tertiary/10" : sIdx >= 1 ? "bg-primary/10" : "bg-secondary/10"} rounded-full blur-3xl pointer-events-none transition-all duration-700"></div>

        <!-- Section Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/15 text-primary border border-primary/40 glow-cyan">
                ● x402 V2 MACHINE PAYMENT PROTOCOL
              </span>
              <span class="text-[10px] font-mono text-outline uppercase tracking-wider">
                Autonomous HTTP Handshake
              </span>
            </div>
            <h2 class="font-headline text-xl font-bold text-white tracking-tight">
              Real-Time x402 Wire Protocol Stepper
            </h2>
            <p class="text-xs text-on-surface-variant mt-1">
              Observe the live machine payment transition: HTTP 402 Challenge &rarr; EIP-712 Signature &rarr; Facilitator Verification &rarr; On-Chain Settlement.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              onclick="X402ProtocolVisualizer.simulateLiveStepByStep()"
              class="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 flex items-center gap-1.5 transition glow-cyan"
            >
              <span class="material-symbols-outlined text-sm">play_arrow</span>
              <span>Replay x402 Protocol Demo</span>
            </button>
          </div>
        </div>

        <!-- 4-Step Wire Protocol Stepper Sequence (402 -> PAYMENT-SIGNATURE -> VERIFY -> SETTLE) -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-outline px-1">
            <span>Protocol State Machine</span>
            <span class="text-secondary font-mono">${flow.statusText || "AWAITING FLOW"}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            ${steps
              .map((st) => {
                const isDone = sIdx > st.id || (sIdx === 4 && st.id === 4 && flow.stage === "SETTLED");
                const isActive = sIdx === st.id && flow.stage !== "SETTLED";

                let cardClasses = "bg-surface-lowest border-outline-variant/30 text-outline";
                let badgeClasses = "bg-surface-container text-outline border-outline-variant/40";
                let statusIcon = "radio_button_unchecked";
                let iconColor = "text-outline";

                if (isDone) {
                  cardClasses = "bg-tertiary/10 border-tertiary/50 text-white shadow-lg glow-emerald";
                  badgeClasses = "bg-tertiary/20 text-tertiary border-tertiary/50";
                  statusIcon = "check_circle";
                  iconColor = "text-tertiary";
                } else if (isActive) {
                  cardClasses = "bg-primary/15 border-primary/60 text-white shadow-lg glow-cyan animate-pulse";
                  badgeClasses = "bg-primary/25 text-primary border-primary/60 font-bold";
                  statusIcon = "sync";
                  iconColor = "text-primary";
                }

                return `
                  <div class="rounded-xl border p-3.5 space-y-2 relative transition-all duration-300 ${cardClasses}">
                    <div class="flex items-center justify-between">
                      <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${badgeClasses}">
                        Step ${st.id} &bull; ${st.label}
                      </span>
                      <span class="material-symbols-outlined text-sm ${iconColor}">
                        ${statusIcon}
                      </span>
                    </div>
                    <div>
                      <h4 class="font-mono text-xs font-bold text-white tracking-wide">${st.title}</h4>
                      <p class="text-[10px] text-on-surface-variant font-mono mt-0.5">${st.subtitle}</p>
                    </div>
                    <div class="text-[9px] font-mono uppercase tracking-wider pt-1 border-t border-outline-variant/20 flex items-center justify-between">
                      <div>
                        ${isDone
                          ? `<span class="op-state-confirmed flex items-center gap-1 font-bold"><span class="text-xs font-mono">✓</span> <span>CONFIRMED</span></span>`
                          : isActive
                          ? `<span class="op-state-active flex items-center gap-1 font-bold"><span class="op-pulse-dot text-xs font-mono">◉</span> <span>IN PROGRESS</span></span>`
                          : `<span class="op-state-pending flex items-center gap-1"><span class="text-xs font-mono">○</span> <span>STANDBY</span></span>`}
                      </div>
                      <span class="text-outline">&rarr;</span>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>

        <!-- The Canonical x402 V2 Payment Requirements Card -->
        <div class="rounded-xl bg-surface-lowest border border-secondary/40 p-5 shadow-2xl space-y-4 font-mono">
          <!-- Card Header Terminal Style -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="px-2.5 py-1 rounded bg-secondary/20 text-secondary border border-secondary/50 font-bold text-xs glow-cyan">
                x402 V2
              </span>
              <span class="text-xs text-white font-bold tracking-wider uppercase">
                HTTP 402 PAYMENT REQUIRED SPECIFICATION
              </span>
            </div>
            <div class="flex items-center gap-1.5 px-3 py-1 rounded-full ${sIdx >= 1 ? "bg-primary/20 text-primary border-primary/40" : "bg-surface-container text-outline"} border text-xs font-bold">
              <span class="w-2 h-2 rounded-full ${sIdx >= 1 ? "bg-primary animate-pulse" : "bg-outline"}"></span>
              <span>${sIdx >= 4 ? "✓ SETTLED ON-CHAIN" : sIdx >= 1 ? "◉ PAYMENT CHALLENGE ACCEPTED" : "○ WAITING CHALLENGE"}</span>
            </div>
          </div>

          <!-- Wire Protocol Details & 3D Interactive Payment Card -->
          <div class="flex flex-col lg:flex-row items-center justify-between gap-6">
            <!-- Key-Value Telemetry Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-surface-container/60 p-4 rounded-xl border border-outline-variant/30 flex-1 w-full">
              <div class="space-y-1">
                <span class="text-outline text-[10px] font-bold uppercase tracking-wider block">Resource</span>
                <span class="text-white font-bold text-sm truncate block">${flow.resource || "Text Translation"}</span>
              </div>

              <div class="space-y-1">
                <span class="text-outline text-[10px] font-bold uppercase tracking-wider block">Amount Required</span>
                <div class="flex items-baseline gap-1.5">
                  <span class="text-tertiary font-bold text-sm block">${flow.amountUSD} USDC</span>
                  <span class="text-[10px] text-outline font-normal">(${flow.amountAtomic} units)</span>
                </div>
              </div>

              <div class="space-y-1">
                <span class="text-outline text-[10px] font-bold uppercase tracking-wider block">Scheme</span>
                <span class="text-secondary font-bold block">${flow.scheme} <span class="text-[10px] text-outline font-normal">(exact / EIP-712)</span></span>
              </div>

              <div class="space-y-1">
                <span class="text-outline text-[10px] font-bold uppercase tracking-wider block">Network (CAIP-2)</span>
                <span class="text-white font-bold block">${flow.network}</span>
              </div>

              <div class="space-y-1 sm:col-span-2">
                <span class="text-outline text-[10px] font-bold uppercase tracking-wider block">PayTo Provider Recipient</span>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-primary font-bold break-all text-xs">${flow.payTo}</span>
                  ${copyBtn(flow.payTo, "Recipient Address")}
                </div>
              </div>

              <div class="space-y-1 sm:col-span-2 pt-2 border-t border-outline-variant/20">
                <span class="text-outline text-[10px] font-bold uppercase tracking-wider block">Request Nonce ID (reqId)</span>
                <div class="flex items-center justify-between gap-2">
                  <span class="text-outline font-mono break-all text-[11px]">${flow.reqId || "0x088e..."}</span>
                  ${copyBtn(flow.reqId, "Request ID")}
                </div>
              </div>

              <div class="space-y-1 sm:col-span-2 pt-2 border-t border-outline-variant/20">
                <span class="text-outline text-[10px] font-bold uppercase tracking-wider block">Settlement Tx Hash</span>
                <div class="flex items-center justify-between gap-2">
                  <span class="${flow.txHash ? "text-tertiary font-mono break-all text-[11px] op-reveal font-bold" : "text-outline font-mono text-[11px]"}">
                    ${flow.txHash ? flow.txHash.slice(0, 14) + "..." : "○ Awaiting EVM transfer"}
                  </span>
                  ${flow.txHash ? copyBtn(flow.txHash, "Tx Hash") : ""}
                </div>
              </div>
            </div>

            <!-- 3D Flip Card (Interactive Agent Credential) -->
            <div class="flex flex-col items-center justify-center shrink-0 py-2 self-center">
              <div class="text-[10px] font-mono text-outline uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>Virtual Agent Card (Hover / Tap)</span>
              </div>
              <div class="flip-card" onclick="this.classList.toggle('flipped')">
                <div class="flip-card-inner">
                  <div class="flip-card-front">
                    <p class="heading_8264">MASTERCARD</p>
                    <svg class="logo" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="36" height="36" viewBox="0 0 48 48">
                      <path fill="#ff9800" d="M32 10A14 14 0 1 0 32 38A14 14 0 1 0 32 10Z"></path><path fill="#d50000" d="M16 10A14 14 0 1 0 16 38A14 14 0 1 0 16 10Z"></path><path fill="#ff3d00" d="M18,24c0,4.755,2.376,8.95,6,11.48c3.624-2.53,6-6.725,6-11.48 C20.376,15.05,18,19.245,18,24z"></path>
                    </svg>
                    <svg version="1.1" class="chip" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 50 50" xml:space="preserve">  <image id="image0" width="50" height="50" x="0" y="0" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAB6VBMVEUAAACNcTiVeUKVeUOYfEaafEeUeUSYfEWZfEaykleyklaXe0SWekSZZjOYfEWYe0WXfUWXe0WcgEicfkiXe0SVekSXekSWekKYe0a9nF67m12ZfUWUeEaXfESVekOdgEmVeUWWekSniU+VeUKVeUOrjFKYfEWliE6WeESZe0GSe0WYfES7ml2Xe0WXeESUeEOWfEWcf0eWfESXe0SXfEWYekSVeUKXfEWxklawkVaZfEWWekOUekOWekSYfESZe0eXekWYfEWZe0WZe0eVeUSWeETAnmDCoWLJpmbxy4P1zoXwyoLIpWbjvXjivnjgu3bfu3beunWvkFWxkle/nmDivXiWekTnwXvkwHrCoWOuj1SXe0TEo2TDo2PlwHratnKZfEbQrWvPrWuafUfbt3PJp2agg0v0zYX0zYSfgkvKp2frxX7mwHrlv3rsxn/yzIPgvHfduXWXe0XuyIDzzISsjVO1lVm0lFitjVPzzIPqxX7duna0lVncuHTLqGjvyIHeuXXxyYGZfUayk1iyk1e2lln1zYTEomO2llrbtnOafkjFpGSbfkfZtXLhvHfkv3nqxH3mwXujhU3KqWizlFilh06khk2fgkqsjlPHpWXJp2erjVOhg0yWe0SliE+XekShhEvAn2D///+gx8TWAAAARnRSTlMACVCTtsRl7Pv7+vxkBab7pZv5+ZlL/UnU/f3SJCVe+Fx39naA9/75XSMh0/3SSkia+pil/KRj7Pr662JPkrbP7OLQ0JFOijI1MwAAAAFiS0dEorDd34wAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfnAg0IDx2lsiuJAAACLElEQVRIx2NgGAXkAUYmZhZWPICFmYkRVQcbOwenmzse4MbFzc6DpIGXj8PD04sA8PbhF+CFaxEU8iWkAQT8hEVgOkTF/InR4eUVICYO1SIhCRMLDAoKDvFDVhUaEhwUFAjjSUlDdMiEhcOEItzdI6OiYxA6YqODIt3dI2DcuDBZsBY5eVTr4xMSYcyk5BRUOXkFsBZFJTQnp6alQxgZmVloUkrKYC0qqmji2WE5EEZuWB6alKoKdi35YQUQRkFYPpFaCouKIYzi6EDitJSUlsGY5RWVRGjJLyxNy4ZxqtIqqvOxaVELQwZFZdkIJVU1RSiSalAt6rUwUBdWG1CP6pT6gNqwOrgCdQyHNYR5YQFhDXj8MiK1IAeyN6aORiyBjByVTc0FqBoKWpqwRCVSgilOaY2OaUPw29qjOzqLvTAchpos47u6EZyYnngUSRwpuTe6D+6qaFQdOPNLRzOM1dzhRZyW+CZouHk3dWLXglFcFIflQhj9YWjJGlZcaKAVSvjyPrRQ0oQVKDAQHlYFYUwIm4gqExGmBSkutaVQJeomwViTJqPK6OhCy2Q9sQBk8cY0DxjTJw0lAQWK6cOKfgNhpKK7ZMpUeF3jPa28BCETamiEqJKM+X1gxvWXpoUjVIVPnwErw71nmpgiqiQGBjNzbgs3j1nus+fMndc+Cwm0T52/oNR9lsdCS24ra7Tq1cbWjpXV3sHRCb1idXZ0sGdltXNxRateRwHRAACYHutzk/2I5QAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMy0wMi0xM1QwODoxNToyOSswMDowMEUnN7UAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjMtMDItMTNUMDg6MTU6MjkrMDA6MDA0eo8JAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDIzLTAyLTEzVDA4OjE1OjI5KzAwOjAwY2+u1gAAAABJRU5ErkJggg=="></image>
                    </svg>
                    <svg version="1.1" class="contactless" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="20px" height="20px" viewBox="0 0 50 50" xml:space="preserve">  <image id="image0" width="50" height="50" x="0" y="0" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAQAAAC0NkA6AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfnAg0IEzgIwaKTAAADDklEQVRYw+1XS0iUURQ+f5qPyjQflGRFEEFK76koKGxRbWyVVLSOgsCgwjZBJJYuKogSIoOonUK4q3U0WVBWFPZYiIE6kuArG3VGzK/FfPeMM/MLt99/NuHdfPd888/57jn3nvsQWWj/VcMlvMMd5KRTogqx9iCdIjUUmcGR9ImUYowyP3xNGQJoRLVaZ2DaZf8kyjEJALhI28ELioyiwC+Rc3QZwRYyO/DH51hQgWm6DMIh10KmD4u9O16K49itVoPOAmcGAWWOepXIRScAoJZ2Frro8oN+EyTT6lWkkg6msZfMSR35QTJmjU0g15tIGSJ08ZZMJkHkNZgSkyXosS13TkJpZ62mPIJvOSzC1bp8vRhhCakEk7G9/o4gmZdbpsTcKu0m63FbnBP9Qrc15zbkbemfgNDtEOI8NO5L5O9VYyRYgmJayZ9nPaxZrSjW4+F6Uw9yQqIiIZwhp2huQTf6OIvCZyGM6gDJBZbyXifJXr7FZjGXsdxADxI7HUJFB6iWvsIhFpkoiIiGTJfjJfiCuJg2ZEspq9EHGVpYgzKqwJqSAOEwuJQ/pxPvE3cYltJCLdxBLiSKKIE5HxJKcTRNeadxfhDiuYw44zVs1dxKwRk/uCxIiQkxKBsSctRVAge9g1E15EHE6yRUaJecRxcWlukdRIbGFOSZCMWQA/iWauIP3slREHXPyliqBcrrD71AmzZ+rD1Mt2Yr8TZc/UR4/YtFnbijnHi3UrN9vKQ9rPaJf867ZiaqDB+czeKYmd3pNa6fuI75MiC0uXXSR5aEMf7s7a6r/PudVXkjFb/SsrCRfROk0Fx6+H1i9kkTGn/E1vEmt1m089fh+RKdQ5O+xNJPUicUIjO0Dm7HwvErEr0YxeibL1StSh37STafE4I7zcBdRq1DiOkdmlTJVnkQTBTS7X1FYyvfO4piaInKbDCDaT2anLudYXCRFsQBgAcIF2/Okwgvz5+Z4tsw118dzruvIvjhTB+HOuWy8UvovEH6beitBKxDyxm9MmISKCWrzB7bSlaqGlsf0FC0gMjzTg6GgAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjMtMDItMTNUMDg6MTk6NTYrMDA6MDCjlq7LAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIzLTAyLTEzVDA4OjE5OjU2KzAwOjAw0ssWdwAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyMy0wMi0xM1QwODoxOTo1NiswMDowMIXeN6gAAAAASUVORK5CYII="></image>
                    </svg>
                    <p class="number">9759 2484 5269 6576</p>
                    <p class="valid_thru">VALID THRU</p>
                    <p class="date_8264">1 2 / 2 4</p>
                    <p class="name">BRUCE WAYNE</p>
                  </div>
                  <div class="flip-card-back">
                    <div class="strip"></div>
                    <div class="mstrip"></div>
                    <div class="sstrip">
                      <p class="code">***</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Bar -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl ${
            flow.stage === "SETTLED"
              ? "bg-tertiary/15 border-tertiary/40 text-tertiary"
              : "bg-primary/15 border-primary/40 text-primary"
          } border text-xs font-bold">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-base">${flow.stage === "SETTLED" ? "verified" : "sync"}</span>
              <span>[ ${flow.statusText || "PAYMENT REQUIREMENTS RECEIVED"} ]</span>
            </div>
            <button
              onclick="X402ProtocolVisualizer.toggleRawPayload()"
              class="text-[11px] text-outline hover:text-white underline font-normal transition flex items-center gap-1"
            >
              <span>Inspect Decoded x402 JSON & Schema</span>
              <span class="material-symbols-outlined text-xs">code</span>
            </button>
          </div>

          <!-- Collapsible Raw JSON / Header Drawer -->
          <div id="x402RawPayloadDrawer" class="hidden p-4 rounded-xl bg-surface-container/90 border border-outline-variant/40 text-[10px] space-y-2">
            <div class="flex items-center justify-between text-outline text-[10px] uppercase font-bold tracking-wider border-b border-outline-variant/20 pb-2">
              <span>Decoded Official @x402/core PaymentRequired V2 Schema</span>
              <button onclick="App.copyText(document.getElementById('x402JsonPre').innerText)" class="hover:text-secondary text-[11px] underline">
                Copy JSON Payload
              </button>
            </div>
            <pre id="x402JsonPre" class="text-tertiary font-mono leading-relaxed overflow-x-auto p-2 bg-surface-lowest rounded-lg border border-outline-variant/20">${JSON.stringify(mockDecodedHeader, null, 2)}</pre>
          </div>
        </div>
      </div>
    `;
  },
};

// Attach to globalThis / window for browser and test runner compatibility
if (typeof globalThis !== "undefined") {
  globalThis.LiveEventStream = LiveEventStream;
  globalThis.X402ProtocolVisualizer = X402ProtocolVisualizer;
  globalThis.LiveSystemTerminal = LiveSystemTerminal;
}
if (typeof window !== "undefined") {
  window.LiveEventStream = LiveEventStream;
  window.X402ProtocolVisualizer = X402ProtocolVisualizer;
  window.LiveSystemTerminal = LiveSystemTerminal;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LiveEventStream, X402ProtocolVisualizer, LiveSystemTerminal };
}
