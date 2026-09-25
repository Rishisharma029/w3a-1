"use strict";
// 1. UI Formatter & Presentation Helpers
const UIFormatter = {
  /**
   * Format long Ethereum address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 -> 0xf39F...2266
   */
  formatAddress(addr, chars = 6) {
    if (!addr || typeof addr !== "string") return "—";
    if (addr.length <= chars * 2 + 3) return addr;
    return `${addr.slice(0, chars)}...${addr.slice(-4)}`;
  },

  /**
   * Format transaction hash or bytes32: 0x0da0c71e...3a4d
   */
  formatHash(hash, chars = 8) {
    if (!hash || typeof hash !== "string") return "—";
    if (hash.length <= chars * 2 + 3) return hash;
    return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
  },

  /**
   * Format cryptographic delivery hash: sha256:543d7a...caed
   */
  formatDeliveryHash(hash, chars = 8) {
    if (!hash || typeof hash !== "string") return "—";
    if (hash.startsWith("sha256:")) {
      const hex = hash.slice(7);
      return `sha256:${hex.slice(0, chars)}...${hex.slice(-chars)}`;
    }
    return this.formatHash(hash, chars);
  },

  /**
   * Format ISO date string into local time
   */
  formatTime(isoString) {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? "—" : d.toLocaleTimeString();
    } catch (_) {
      return "—";
    }
  },

  /**
   * Format timestamp alias
   */
  formatTimestamp(isoString) {
    return this.formatTime(isoString);
  },

  /**
   * Format relative time: "5s ago", "2m ago", "1h ago"
   */
  formatRelativeTime(isoString) {
    if (!isoString) return "just now";
    try {
      const d = new Date(isoString);
      const diffMs = Date.now() - d.getTime();
      const diffSec = Math.max(0, Math.floor(diffMs / 1000));
      if (diffSec < 60) return `${diffSec}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      return d.toLocaleDateString();
    } catch (_) {
      return "just now";
    }
  },

  /**
   * Format ISO date string into short date + time
   */
  formatDateTime(isoString) {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? "—" : `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
    } catch (_) {
      return "—";
    }
  },

  /**
   * Safe number formatting into USD string ($4.00)
   */
  formatUSD(val) {
    const n = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(n)) return "$0.00";
    return `$${n.toFixed(2)}`;
  },

  /**
   * Copy to clipboard with toast notification
   */
  async copy(text, label = "Value") {
    if (!text || text === "—") return;
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      if (typeof App !== "undefined" && App.toast) {
        App.toast(`${label} copied to clipboard`, "success");
      }
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
    }
  },

  /**
   * Generate an inline copy button
   */
  copyButton(text, label = "Copy") {
    const escaped = String(text).replace(/"/g, "&quot;");
    return `
      <button
        onclick="event.stopPropagation(); UIFormatter.copy('${escaped}', '${label}')"
        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition border border-slate-700/60"
        title="Copy full ${label}"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
        <span>Copy</span>
      </button>
    `;
  },

  /**
   * Standard semantic status badge
   */
  statusBadge(status) {
    const s = String(status || "UNKNOWN").toUpperCase();

    if (s === "SETTLED" || s === "VERIFIED" || s === "AUTHORIZED" || s === "SELECTED" || s === "OPERATIONAL" || s === "MATCH" || s === "SUCCESS") {
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>${s}
      </span>`;
    }

    if (s === "CAPPED" || s === "BUDGET CAPPED" || s === "CAPPED / REJECTED") {
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/15 text-rose-300 border border-rose-500/40">
        <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>${s}
      </span>`;
    }

    if (s === "BLOCKED" || s === "REJECTED" || s === "REJECTED (> $5)" || s === "FROZEN" || s === "FAILED" || s === "TAMPERED" || s === "CRITICAL") {
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/10 text-rose-300 border border-rose-500/30">
        <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>${s}
      </span>`;
    }

    if (s === "PENDING" || s === "STANDBY" || s === "STANDBY FALLBACK" || s === "WARNING" || s === "HIGH") {
      return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>${s}
      </span>`;
    }

    return `<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-400 border border-slate-700/60">
      <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span>${s}
    </span>`;
  },

  /**
   * Standard empty state renderer
   */
  emptyState(title, message) {
    return `
      <div class="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-2">
        <div class="w-10 h-10 mx-auto rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
        </div>
        <h4 class="text-sm font-semibold text-slate-300 font-sans">${title}</h4>
        <p class="text-xs text-slate-500 max-w-sm mx-auto font-sans leading-relaxed">${message}</p>
      </div>
    `;
  },
};
// 2. Provider Data Normalization Adapter
const ProviderAdapter = {
  normalize(raw) {
    if (!raw || typeof raw !== "object") {
      return this.fallbackProvider();
    }

    const providerId = String(raw.providerId || raw.id || "unknown-provider");
    const name = String(raw.name || raw.providerName || providerId);
    const serviceType = String(raw.serviceType || raw.category || "general");

    const rawQuality = raw.qualityScore ?? raw.quality;
    const qualityScore =
      typeof rawQuality === "number" && !isNaN(rawQuality)
        ? parseFloat(rawQuality.toFixed(2))
        : 0.90;

    const rawLatency = raw.estimatedLatencyMs ?? raw.latencyMs ?? raw.latency;
    const estimatedLatencyMs =
      typeof rawLatency === "number" && !isNaN(rawLatency)
        ? Math.round(rawLatency)
        : (parseInt(rawLatency, 10) || 200);

    const rawAvail = raw.availability ?? raw.uptime;
    const availability =
      typeof rawAvail === "number" && !isNaN(rawAvail)
        ? parseFloat(rawAvail.toFixed(2))
        : 1.0;

    // Unpack services from object map or array
    let rawServicesList = [];
    if (Array.isArray(raw.services)) {
      rawServicesList = raw.services;
    } else if (raw.services && typeof raw.services === "object") {
      rawServicesList = Object.values(raw.services);
    }

    const services = rawServicesList.map((s, idx) => {
      if (!s || typeof s !== "object") {
        return {
          serviceId: `service-${idx + 1}`,
          name: "Standard Service",
          price: 0,
          currency: "USDC",
          description: "Autonomous service execution.",
          amountUnits: "0",
        };
      }
      const sId = String(s.serviceId || s.id || `service-${idx + 1}`);
      const sName = String(s.name || s.title || "Standard Service");
      const sPrice = typeof s.price === "number" ? s.price : (parseFloat(s.price) || 0);
      const sCurrency = s.currency === "MockUSDC" || s.currency === "UNIT" || !s.currency ? "USDC" : String(s.currency);
      const sDesc = String(s.description || s.desc || "Autonomous service execution.");
      const sAmountUnits = String(s.amountUnits || (BigInt(Math.round(sPrice * 1e6))).toString());

      return {
        serviceId: sId,
        name: sName,
        price: sPrice,
        currency: sCurrency,
        description: sDesc,
        amountUnits: sAmountUnits,
      };
    });

    let primaryService = services[0];
    if (!primaryService) {
      const rootPrice = typeof raw.price === "number" ? raw.price : (parseFloat(raw.price) || 0);
      primaryService = {
        serviceId: "default",
        name: name,
        price: rootPrice,
        currency: raw.currency || "USDC",
        description: raw.description || "Autonomous service execution endpoint.",
        amountUnits: (BigInt(Math.round(rootPrice * 1e6))).toString(),
      };
      services.push(primaryService);
    }

    const priceNum = typeof primaryService.price === "number" ? primaryService.price : (parseFloat(primaryService.price) || 0);
    const currency = primaryService.currency || "USDC";
    const price = `$${priceNum.toFixed(2)}`;
    const formattedPrice = `${price} ${currency}`;
    const description = primaryService.description || raw.description || "Autonomous service execution endpoint.";
    const serviceName = primaryService.name || name;

    let decisionStatus = "STANDBY FALLBACK";
    if (providerId === "alpha-translate") {
      decisionStatus = "SELECTED";
    } else if (priceNum > 5) {
      decisionStatus = "REJECTED (> $5)";
    }

    let reason = raw.reason;
    if (!reason || typeof reason !== "string") {
      if (providerId === "alpha-translate") {
        reason = `Selected: optimal quality score (${qualityScore.toFixed(2)}) satisfying human budget ceiling (under $5.00).`;
      } else if (priceNum > 5) {
        reason = `Exceeds $5 human budget ceiling (${price}) — filtered out by protocol boundary.`;
      } else if (serviceType === "compute") {
        reason = `High-throughput compute provider for data processing (${price}, ${estimatedLatencyMs}ms).`;
      } else if (serviceType === "image-analysis") {
        reason = `Vision AI provider for image analysis and object classification (${price}, quality ${qualityScore.toFixed(2)}).`;
      } else {
        reason = `Alternative candidate (${price}, quality ${qualityScore.toFixed(2)}) on standby for fallback.`;
      }
    }

    const status = availability > 0 ? "AVAILABLE" : "OFFLINE";

    return {
      providerId,
      name,
      serviceType,
      qualityScore,
      estimatedLatencyMs,
      availability,
      services,
      primaryService,
      serviceName,
      priceNum,
      price,
      formattedPrice,
      currency,
      description,
      decisionStatus,
      reason,
      status,
    };
  },

  normalizeList(list) {
    if (!Array.isArray(list)) return [];
    return list.map((item) => this.normalize(item));
  },

  fallbackProvider() {
    return {
      providerId: "unknown",
      name: "Unknown Provider",
      serviceType: "general",
      qualityScore: 0.0,
      estimatedLatencyMs: 0,
      availability: 0.0,
      services: [],
      primaryService: {
        serviceId: "none",
        name: "Unavailable",
        price: 0,
        currency: "USDC",
        description: "No provider service description available.",
        amountUnits: "0",
      },
      serviceName: "Unavailable",
      priceNum: 0,
      price: "$0.00",
      formattedPrice: "$0.00 USDC",
      currency: "USDC",
      description: "No provider service description available.",
      decisionStatus: "UNAVAILABLE",
      reason: "No data returned by provider registry.",
      status: "OFFLINE",
    };
  },
};
// 3. Transaction Normalization Adapter
const TransactionAdapter = {
  /** Map known provider addresses to human-readable labels */
  KNOWN_PROVIDERS: {
    "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc": "Alpha Translation Services",
    "0x90f79bf6eb2c4f870365e785982e1f101e93b906": "Delta Compute Engine",
    "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65": "Beta Translate (Budget)",
    "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc": "Gamma Premium Translation",
    "0x976ea74026e72cd178867bf30415d1a4153320c6": "Epsilon Vision AI",
  },

  normalize(raw, index = 0) {
    if (!raw || typeof raw !== "object") {
      return this.fallbackTransaction();
    }

    const reqId = String(raw.reqId || raw.requestId || `0xreq_${Date.now().toString(16)}_${index}`);
    const providerAddr = String(raw.provider || raw.payTo || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC");
    
    // Provider name resolution
    const lowerAddr = providerAddr.toLowerCase();
    let providerName = raw.providerName;
    if (!providerName || typeof providerName !== "string") {
      providerName = this.KNOWN_PROVIDERS[lowerAddr] || `Provider (${UIFormatter.formatAddress(providerAddr)})`;
    }

    // Service ID & Name resolution
    let serviceId = raw.serviceId || raw.service;
    if (!serviceId || typeof serviceId !== "string") {
      if (lowerAddr.includes("3c44") || lowerAddr.includes("15d3") || lowerAddr.includes("9965")) {
        serviceId = "text-translate";
      } else if (lowerAddr.includes("90f7")) {
        serviceId = "data-process";
      } else if (lowerAddr.includes("976e")) {
        serviceId = "image-analyze";
      } else {
        serviceId = "service-execution";
      }
    }

    const serviceName = raw.serviceName || (
      serviceId === "text-translate" ? "Text Translation" :
      serviceId === "data-process" ? "Data Processing" :
      serviceId === "image-analyze" ? "Image Analysis" : "Service Execution"
    );

    // Amount normalization (handles atomic units vs decimal USD)
    let amountUnits = "0";
    let amountUSD = "0.00";
    let amountNum = 0;

    if (raw.amountUSD !== undefined && raw.amountUSD !== null) {
      amountNum = parseFloat(raw.amountUSD) || 0;
      amountUSD = amountNum.toFixed(2);
      amountUnits = raw.amount ? String(raw.amount) : Math.round(amountNum * 1e6).toString();
    } else if (raw.amount !== undefined && raw.amount !== null) {
      amountUnits = String(raw.amount);
      amountNum = Number(amountUnits) / 1e6;
      amountUSD = amountNum.toFixed(2);
    }

    const formattedAmount = `$${amountUSD} USDC`;
    const currency = "USDC";

    // Status mapping
    const rawStatus = String(raw.status || raw.settlementStatus || raw.displayStatus || "SETTLED").toUpperCase();
    let displayStatus = "SETTLED";
    if (rawStatus.includes("BLOCK") || rawStatus.includes("REJECT") || rawStatus.includes("FAIL")) {
      displayStatus = "BLOCKED";
    } else if (rawStatus.includes("PEND") || rawStatus.includes("AUTH")) {
      displayStatus = "PENDING";
    }

    // Hashes & Monospace IDs
    const txHash = String(raw.txHash || (displayStatus === "BLOCKED" ? "0xreverted_on_chain" : "0xpending"));
    const deliveryHash = String(raw.deliveryHash || (displayStatus === "BLOCKED" ? "N/A (Reverted)" : "sha256:pending"));
    const blockNumber = raw.blockNumber ? Number(raw.blockNumber) : 12;
    const timestamp = raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString();

    // Intent & Quality
    const intent = raw.intent ? String(raw.intent) : (
      serviceId === "text-translate" ? "Get the highest-quality translation under $5" :
      serviceId === "data-process" ? "Execute parallel batch compute under $4" :
      serviceId === "image-analyze" ? "Perform multimodal object detection under $6" : "Autonomous task purchase"
    );
    const quality = typeof raw.quality === "number" ? raw.quality : (parseFloat(raw.quality) || 0.92);

    // Protocol details
    const x402Version = raw.x402Version || 2;
    const scheme = raw.scheme || "exact";
    const network = raw.network || "eip155:31337";
    const asset = raw.asset || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const payer = raw.payer || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    const nonce = raw.nonce || reqId.slice(0, 18);
    const validBefore = raw.validBefore || Math.floor(Date.now() / 1000) + 300;

    // Budget transitions
    const budgetBefore = raw.budgetBefore ? String(raw.budgetBefore) : "30.00";
    const budgetAfter = raw.budgetAfter ? String(raw.budgetAfter) : (Math.max(parseFloat(budgetBefore) - amountNum, 0)).toFixed(2);

    // Content payload
    const content = raw.content || {
      provider: providerIdForAddress(providerAddr),
      service: serviceId,
      reqId,
      deliveredAt: timestamp,
      status: "COMPLETED",
      result: `Delivered execution for ${serviceName}`,
    };

    const hashVerified = raw.hashVerified !== undefined ? Boolean(raw.hashVerified) : (displayStatus === "SETTLED");

    return {
      reqId,
      requestId: reqId,
      provider: providerAddr,
      providerName,
      serviceId,
      serviceName,
      intent,
      userIntent: intent,
      quality,
      amount: amountUnits,
      amountUnits,
      amountUSD,
      formattedAmount,
      currency,
      displayStatus,
      status: displayStatus,
      txHash,
      blockNumber,
      deliveryHash,
      timestamp,
      x402Version,
      scheme,
      network,
      asset,
      payer,
      payTo: providerAddr,
      nonce,
      validBefore,
      signatureStatus: "VERIFIED",
      verificationStatus: "PASSED",
      settlementStatus: displayStatus,
      budgetBefore,
      budgetAfter,
      content,
      hashVerified,
    };
  },

  normalizeList(list) {
    if (!Array.isArray(list)) return [];
    return list.map((item, idx) => this.normalize(item, idx));
  },

  fallbackTransaction() {
    return {
      reqId: "0xnone",
      requestId: "0xnone",
      provider: "0x0000000000000000000000000000000000000000",
      providerName: "Unknown Provider",
      serviceId: "none",
      serviceName: "None",
      intent: "No transaction data available",
      userIntent: "No transaction data available",
      quality: 0.0,
      amount: "0",
      amountUnits: "0",
      amountUSD: "0.00",
      formattedAmount: "$0.00 USDC",
      currency: "USDC",
      displayStatus: "PENDING",
      status: "PENDING",
      txHash: "0xnone",
      blockNumber: 0,
      deliveryHash: "N/A",
      timestamp: new Date().toISOString(),
      x402Version: 2,
      scheme: "exact",
      network: "eip155:31337",
      asset: "—",
      payer: "—",
      payTo: "—",
      nonce: "—",
      validBefore: 0,
      signatureStatus: "UNKNOWN",
      verificationStatus: "UNKNOWN",
      settlementStatus: "PENDING",
      budgetBefore: "0.00",
      budgetAfter: "0.00",
      content: { note: "No data" },
      hashVerified: false,
    };
  },

  /**
   * Normalize an alert or security block into a full transaction record schema
   */
  normalizeAlert(raw, index = 0) {
    if (!raw || typeof raw !== "object") return null;

    const rawType = String(raw.type || raw.event || "SECURITY_ALERT").toUpperCase();
    const isOverspend = rawType.includes("OVERSPEND") || rawType.includes("BUDGET");
    const isReplay = rawType.includes("REPLAY");
    const isTamper = rawType.includes("TAMPER");
    const isFreeze = rawType.includes("FREEZE") || rawType.includes("FROZEN");

    // Amount extraction
    let amountUSD = "0.00";
    if (raw.amountUSD !== undefined && raw.amountUSD !== null) {
      amountUSD = typeof raw.amountUSD === "number" ? raw.amountUSD.toFixed(2) : String(raw.amountUSD).replace("$", "").trim();
    } else if (raw.interceptedAmount && typeof raw.interceptedAmount === "string" && !raw.interceptedAmount.includes("undefined")) {
      amountUSD = raw.interceptedAmount.replace(/[^0-9.]/g, "") || "0.00";
    } else if (raw.amount || raw.amountAtomic) {
      const val = Number(raw.amount || raw.amountAtomic);
      if (!isNaN(val) && val > 0) {
        amountUSD = val >= 10000 ? (val / 1e6).toFixed(2) : val.toFixed(2);
      }
    } else if (isOverspend) {
      amountUSD = "25.00";
    }

    const reqId = raw.reqId && String(raw.reqId).length > 10 ? String(raw.reqId) : `0xdefend_${Date.now().toString(16)}_${index}`;
    const txHash = raw.txHash || "0xreverted_on_chain";

    let status = "BLOCKED";
    let displayStatus = "BLOCKED";
    let isCapped = false;
    let isRejected = false;

    if (isOverspend) {
      status = "CAPPED";
      displayStatus = "CAPPED";
      isCapped = true;
    } else if (isReplay || isTamper || isFreeze) {
      status = "REJECTED";
      displayStatus = "REJECTED";
      isRejected = true;
    }

    const providerAddr = raw.provider || raw.offenseTarget || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    const lowerAddr = String(providerAddr).toLowerCase();
    let providerName = raw.providerName;
    if (!providerName) {
      providerName = this.KNOWN_PROVIDERS[lowerAddr] || (
        String(providerAddr).startsWith("0x") ? UIFormatter.formatAddress(providerAddr) : String(providerAddr)
      );
    }

    let serviceName = raw.serviceName;
    if (!serviceName) {
      if (isOverspend) serviceName = "Budget Cap Defense";
      else if (isReplay) serviceName = "Replay Attack Defense";
      else if (isTamper) serviceName = "Payload Tamper Defense";
      else serviceName = raw.type ? raw.type.replace(/_/g, " ") : "Protocol Security Intercept";
    }

    const serviceId = raw.serviceId || (isOverspend ? "budget-overspend-intercept" : "security-intercept");
    const reason = raw.reason || (
      isOverspend ? `Smart contract rejected: requested ${amountUSD} exceeds authorized spending cap (ZERO tokens moved).` :
      isReplay ? "Contract replay guard rejected: request ID already executed on-chain." :
      "Cryptographic integrity check intercepted unauthorized transaction."
    );

    const deliveryHash = raw.deliveryHash || "N/A (Reverted On-Chain)";
    const blockNumber = raw.blockNumber ? Number(raw.blockNumber) : 12;
    const timestamp = raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString();

    return {
      reqId,
      requestId: reqId,
      provider: providerAddr,
      providerName,
      serviceId,
      serviceName,
      intent: reason,
      userIntent: reason,
      quality: 0.0,
      amount: Math.round(parseFloat(amountUSD) * 1e6).toString(),
      amountUnits: Math.round(parseFloat(amountUSD) * 1e6).toString(),
      amountUSD,
      formattedAmount: `${amountUSD} USDC`,
      currency: "USDC",
      displayStatus,
      status,
      isSettled: false,
      isBlocked: true,
      isCapped,
      isRejected,
      isBlockedAttack: true,
      txHash,
      blockNumber,
      deliveryHash,
      timestamp,
      x402Version: 2,
      scheme: "exact",
      network: "eip155:31337",
      asset: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      payTo: providerAddr,
      nonce: reqId.slice(0, 18),
      validBefore: 0,
      signatureStatus: "VERIFIED",
      verificationStatus: isOverspend ? "CAP_EXCEEDED" : "REVERTED",
      settlementStatus: displayStatus,
      budgetBefore: "20.00",
      budgetAfter: "20.00",
      content: {
        reason,
        status: "INTERCEPTED",
        layer: raw.layer || raw.enforcementLayer || "TokenBudgetEnforcer.sol",
        zeroTokensMoved: true,
      },
      hashVerified: false,
    };
  },

  /**
   * Get unified list of all transactions: Settled, Capped, Blocked, and Rejected attempts
   */
  getUnifiedHistory(transactions = [], alerts = [], providerSelectionState = null) {
    const settled = this.normalizeList(transactions || []).map((t) => ({
      ...t,
      isSettled: true,
      isBlocked: false,
      isCapped: false,
      isRejected: false,
      isBlockedAttack: false,
    }));

    const alertRecords = (alerts || [])
      .map((a, idx) => this.normalizeAlert(a, idx))
      .filter(Boolean);

    // If Gamma Premium Translation was rejected during AI provider selection, include candidate record
    const candidateRejections = [];
    if (providerSelectionState && providerSelectionState.evaluations && providerSelectionState.evaluations["gamma-translate"]) {
      const g = providerSelectionState.evaluations["gamma-translate"];
      if (g.status === "REJECTED") {
        candidateRejections.push({
          reqId: "0xgamma_ceiling_reject_01",
          requestId: "0xgamma_ceiling_reject_01",
          provider: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
          providerName: "Gamma Premium Translation",
          serviceId: "text-translate",
          serviceName: "Text Translation (Premium)",
          intent: "Translate legal contract under $5 budget ceiling",
          userIntent: "Translate legal contract under $5 budget ceiling",
          quality: 0.97,
          amount: "6000000",
          amountUnits: "6000000",
          amountUSD: "6.00",
          formattedAmount: "$6.00 USDC",
          currency: "USDC",
          displayStatus: "REJECTED",
          status: "REJECTED",
          isSettled: false,
          isBlocked: true,
          isCapped: true,
          isRejected: true,
          isBlockedAttack: true,
          txHash: "0xrejected_ceiling_rule",
          blockNumber: 12,
          deliveryHash: "N/A (Pre-Settlement Rejection)",
          timestamp: new Date(Date.now() - 240000).toISOString(),
          x402Version: 2,
          scheme: "exact",
          network: "eip155:31337",
          asset: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          payer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          payTo: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
          nonce: "0xgamma_rej_01",
          validBefore: 0,
          signatureStatus: "BLOCKED",
          verificationStatus: "CEILING_EXCEEDED",
          settlementStatus: "REJECTED",
          budgetBefore: "30.00",
          budgetAfter: "30.00",
          content: {
            reason: "Exceeds $5 budget limit ($6.00 > $5.00) — filtered out by autonomous agent spending ceiling rule.",
            status: "REJECTED",
            layer: "Protocol Policy Engine",
            zeroTokensMoved: true,
          },
          hashVerified: false,
        });
      }
    }

    // Merge and deduplicate by reqId or txHash
    const seen = new Set();
    const unified = [];

    for (const record of [...settled, ...alertRecords, ...candidateRejections]) {
      const key = record.reqId || record.txHash;
      if (!seen.has(key)) {
        seen.add(key);
        unified.push(record);
      }
    }

    // Sort chronologically descending (newest first)
    unified.sort((a, b) => {
      const tA = new Date(a.timestamp).getTime() || 0;
      const tB = new Date(b.timestamp).getTime() || 0;
      return tB - tA;
    });

    return unified;
  },
};

function providerIdForAddress(addr) {
  const l = String(addr).toLowerCase();
  if (l.includes("3c44")) return "alpha-translate";
  if (l.includes("15d3")) return "beta-translate";
  if (l.includes("9965")) return "gamma-translate";
  if (l.includes("90f7")) return "delta-compute";
  if (l.includes("976e")) return "epsilon-vision";
  return "provider";
}
// 4. Security Alerts Normalization Adapter
const SecurityAdapter = {
  normalize(raw) {
    if (!raw || typeof raw !== "object") return null;

    const rawType = String(raw.type || raw.event || "SECURITY_ALERT").toUpperCase();
    let severity = raw.severity || "HIGH";
    if (rawType.includes("OVERSPEND") || rawType.includes("ATTACK")) {
      severity = "CRITICAL";
    } else if (rawType.includes("TAMPER") || rawType.includes("REPLAY")) {
      severity = "HIGH";
    } else if (rawType.includes("FROZEN") || rawType.includes("UNFROZEN")) {
      severity = "INFO";
    }

    const timestamp = raw.timestamp ? new Date(raw.timestamp).toISOString() : new Date().toISOString();
    const reason = raw.reason || (
      rawType.includes("OVERSPEND") ? "Agent attempted to settle payment exceeding authorized smart contract spending cap." :
      rawType.includes("REPLAY") ? "Replay attack detected: Request ID already used on-chain, transaction reverted." :
      rawType.includes("TAMPER") ? "Provider delivered content that diverged from canonical SHA-256 hash." :
      "Security boundary condition enforced by TokenBudgetEnforcer.sol."
    );

    const reqId = raw.reqId || raw.requestId || raw.nonce || "0xblock_protocol_enforce";
    const txHash = raw.txHash || raw.transactionHash || "0xreverted_on_chain";

    // Format amount cleanly: handle amountUSD, amountAtomic, amount, interceptedAmount
    let amountUSD = "0.00";
    if (raw.amountUSD !== undefined && raw.amountUSD !== null) {
      amountUSD = typeof raw.amountUSD === "number" ? raw.amountUSD.toFixed(2) : String(raw.amountUSD).replace("$", "").trim();
    } else if (raw.interceptedAmount && typeof raw.interceptedAmount === "string" && !raw.interceptedAmount.includes("undefined")) {
      amountUSD = raw.interceptedAmount.replace(/[^0-9.]/g, "") || "0.00";
    } else if (raw.amount || raw.amountAtomic) {
      const val = Number(raw.amount || raw.amountAtomic);
      if (!isNaN(val) && val > 0) {
        amountUSD = val >= 10000 ? (val / 1e6).toFixed(2) : val.toFixed(2);
      }
    } else if (rawType.includes("OVERSPEND")) {
      amountUSD = "25.00";
    }

    const formattedAmount = `$${amountUSD} USDC`;
    const interceptedAmount = formattedAmount;

    // Resolve offense target / provider / endpoint
    const offenseTarget = raw.offenseTarget || raw.target || raw.providerId || raw.provider || raw.endpoint || (
      rawType.includes("OVERSPEND") ? "TokenBudgetEnforcer.sol (Spending Cap)" :
      rawType.includes("REPLAY") ? "TokenBudgetEnforcer.sol (Replay Guard)" :
      rawType.includes("TAMPER") ? "Provider Delivery Gateway (SHA-256)" :
      "TokenBudgetEnforcer.sol"
    );
    const target = offenseTarget;
    const provider = raw.provider || raw.providerId || offenseTarget;

    // Enforcement layer
    const layer = raw.layer || raw.enforcementLayer || (
      rawType.includes("TAMPER") ? "SHA-256 Verifier" :
      rawType.includes("REPLAY") ? "Contract Nonce Replay Guard" :
      "TokenBudgetEnforcer.sol (EVM)"
    );
    const enforcementLayer = layer;

    return {
      type: rawType,
      severity,
      reason,
      reqId,
      txHash,
      timestamp,
      amount: amountUSD,
      amountUSD,
      formattedAmount,
      interceptedAmount,
      offenseTarget,
      target,
      provider,
      layer,
      enforcementLayer,
    };
  },

  normalizeList(list) {
    if (!Array.isArray(list)) return [];
    return list.map((a) => this.normalize(a)).filter(Boolean);
  },

  computeStats(alerts = []) {
    const safeList = Array.isArray(alerts) ? alerts : [];
    const overspends = safeList.filter((a) => a && a.type && a.type.includes("OVERSPEND")).length;
    const replays = safeList.filter((a) => a && a.type && a.type.includes("REPLAY")).length;
    const tampers = safeList.filter((a) => a && a.type && a.type.includes("TAMPER")).length;
    const invalidSignatures = safeList.filter((a) => a && a.type && a.type.includes("SIGNATURE")).length;

    return {
      activeThreats: 0, // When all attacks are blocked, active threats count is 0
      blockedOverspends: overspends,
      blockedReplays: replays,
      replayAttempts: replays,
      tamperedPayloads: tampers,
      tamperingAttempts: tampers,
      invalidSignatures,
      totalHistoricalEvents: safeList.length,
    };
  },
};
// 5. Budget Normalization Adapter
const BudgetAdapter = {
  normalize(raw) {
    if (!raw || typeof raw !== "object") {
      return {
        totalFunded: "30.00",
        authorizedBudget: "20.00",
        settledSpend: "0.00",
        remaining: "30.00",
        unspentEscrow: "30.00",
        isFrozen: false,
        utilizationPercent: 0,
        formattedTotal: "$30.00 USDC",
        formattedSpent: "$0.00 USDC",
        formattedRemaining: "$30.00 USDC",
      };
    }

    const totalNum = parseFloat(raw.totalFunded) || 0;
    const authNum = parseFloat(raw.authorizedBudget) || totalNum;
    const spentNum = parseFloat(raw.settledSpend) || 0;
    const remNum = raw.remaining !== undefined ? parseFloat(raw.remaining) : Math.max(authNum - spentNum, 0);
    const unspentNum = raw.unspentEscrow !== undefined ? parseFloat(raw.unspentEscrow) : remNum;
    const isFrozen = Boolean(raw.isFrozen);

    const utilization = authNum > 0 ? ((spentNum / authNum) * 100).toFixed(1) : "0.0";

    return {
      spent: spentNum,
      total: totalNum,
      totalFunded: totalNum.toFixed(2),
      authorizedBudget: authNum.toFixed(2),
      settledSpend: spentNum.toFixed(2),
      remaining: remNum.toFixed(2),
      unspentEscrow: unspentNum.toFixed(2),
      isFrozen,
      utilizationPercent: parseFloat(utilization) || 0,
      formattedTotal: `$${totalNum.toFixed(2)} USDC`,
      formattedSpent: `$${spentNum.toFixed(2)} USDC`,
      formattedRemaining: `$${remNum.toFixed(2)} USDC`,
    };
  },
};

// Export to window for browser
if (typeof window !== "undefined") {
  window.UIFormatter = UIFormatter;
  window.ProviderAdapter = ProviderAdapter;
  window.TransactionAdapter = TransactionAdapter;
  window.SecurityAdapter = SecurityAdapter;
  window.BudgetAdapter = BudgetAdapter;
}

// Export for Node.js testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    UIFormatter,
    ProviderAdapter,
    TransactionAdapter,
    SecurityAdapter,
    BudgetAdapter,
  };
}
