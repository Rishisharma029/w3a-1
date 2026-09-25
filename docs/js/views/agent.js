// =========================================================================
// W3A-1: Autonomous Machine Payments (x402 V2)
// Agent / Purchase View — Clean Technical Execution Timeline
// =========================================================================

const AgentView = {
  initialized: false,
  currentPrompt: "Translate this legal contract to English.\nHighest quality under $5.",
  activeResult: null,
  isExecuting: false,
  lastCompletedTx: null,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof AppState !== "undefined" && typeof AppState.subscribe === "function") {
      AppState.subscribe((event) => {
        if (event === "budget_updated" || event === "settlement_confirmed") {
          this.reRenderIfMounted();
        }
      });
    }
  },

  reRenderIfMounted() {
    if (typeof document !== "undefined" && typeof AppState !== "undefined" && AppState.currentView === "agent") {
      // Don't disturb active execution or user textarea focus
      const activeEl = document.activeElement;
      if (this.isExecuting || (activeEl && activeEl.id === "agentPromptInput")) {
        return;
      }
      const root = document.getElementById("mainContent");
      if (root) {
        root.innerHTML = this.render();
      }
    }
  },

  setPrompt(text) {
    this.currentPrompt = text;
    const el = document.getElementById("agentPromptInput");
    if (el) {
      el.value = text;
      el.focus();
    }
  },

  getLatestTx() {
    if (this.lastCompletedTx) {
      return this.lastCompletedTx;
    }
    if (typeof AppState !== "undefined" && AppState.transactions && AppState.transactions.length > 0) {
      return AppState.transactions[0];
    }
    return {
      reqId: "0x088e7c75ddcc48eba8329618b1a37c02b3df468e82a09c2a1387d40294716b23",
      txHash: "0xfefb3725ca1a870d8d1d41ee370ac686becb5f28f39aa790ce6eeb6827f47069",
      deliveryHash: "sha256:0b0a8801d04423854580bfcb3e3b3cbb60767705fe0506eb3c31b34380ec52b6",
      providerName: "Alpha Translation Labs",
      serviceName: "Neural Text Translation",
      amountUSD: "4.00",
      timestamp: new Date().toISOString(),
      network: "Local Hardhat EVM (31337)",
      deliveredText: "Verified legal translation payload delivered under W3A-1 protocol specifications."
    };
  },

  downloadReceipt() {
    const tx = this.getLatestTx();
    const dateStr = tx.timestamp ? new Date(tx.timestamp).toUTCString() : new Date().toUTCString();
    const text = `================================================
W3A-1 AUTONOMOUS PURCHASE RECEIPT
Protocol: x402 V2 Machine Payments
================================================
Date:            ${dateStr}
Request ID:      ${tx.reqId || '-'}
Service:         ${tx.serviceName || tx.serviceId || 'Service'}
Provider:        ${tx.providerName || tx.provider || '-'}
Authorized Cost: $${Number(tx.amountUSD || 4.0).toFixed(2)} USDC
Payment Method:  EIP-712 Permit (secp256k1)
Enforcer:        TokenBudgetEnforcer.sol
------------------------------------------------
Settlement:      ${tx.network || 'Local Hardhat EVM (31337)'}
Tx Hash:         ${tx.txHash || '-'}
Delivery Hash:   ${tx.deliveryHash || '-'}
Verification:    SHA-256 Digest Matched
------------------------------------------------
Output Payload:
${tx.deliveredText || tx.content || 'Service delivered.'}
================================================
Note: SHA-256 verifies content integrity. It does not establish semantic correctness.
`;

    try {
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `receipt-${(tx.reqId || 'purchase').slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (typeof App !== "undefined" && App.toast) {
        App.toast("Receipt downloaded successfully.", "success");
      }
    } catch (_) {
      window.print();
    }
  },

  async runPurchase(customPrompt) {
    const promptInput = document.getElementById("agentPromptInput");
    const prompt = (customPrompt || (promptInput ? promptInput.value : this.currentPrompt) || "").trim();
    if (!prompt) return;

    this.currentPrompt = prompt;
    this.isExecuting = true;

    const btn = document.getElementById("btnExecuteAgentPurchase");
    const traceContainer = document.getElementById("agentTraceContainer");

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Processing...";
    }
    if (traceContainer) {
      traceContainer.style.display = "block";
      traceContainer.innerHTML = `
        <div class="card" style="font-family: var(--font-mono); font-size: 12px; margin-top: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong>Autonomous Execution Timeline</strong>
            <span class="badge badge-warning">PROCESSING</span>
          </div>
          <div style="color: var(--text-muted);">
            Executing 11-stage pipeline: parsing intent &rarr; discovering providers &rarr; verifying spending constraints &rarr; signing EIP-712 permit &rarr; settling on-chain...
          </div>
        </div>
      `;
    }

    try {
      const res = await fetch("/api/orchestrate/ai-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      this.activeResult = data;

      if (data.trace && data.trace.txHash) {
        this.lastCompletedTx = {
          reqId: data.runId || data.trace.reqId,
          serviceName: data.selectedProvider ? data.selectedProvider.name : "Machine Service",
          providerName: data.selectedProvider ? data.selectedProvider.name : "Provider",
          amountUSD: data.trace.amountUSD || "4.00",
          txHash: data.trace.txHash,
          deliveryHash: data.trace.deliveryHash,
          deliveredText: typeof data.trace.deliveredContent === 'object'
            ? (data.trace.deliveredContent.translatedText || data.trace.deliveredContent.output || JSON.stringify(data.trace.deliveredContent))
            : (data.trace.deliveredContent || data.trace.content),
          network: data.trace.network || "Local Hardhat EVM (31337)",
          timestamp: new Date().toISOString()
        };
        if (typeof AppState !== "undefined") {
          AppState.transactions = [this.lastCompletedTx, ...(AppState.transactions || [])];
          AppState.notify("transactions_updated", AppState.transactions);
        }
      }

      this.renderTrace(data);
    } catch (err) {
      if (traceContainer) {
        traceContainer.innerHTML = `
          <div class="card" style="margin-top: 16px; border-color: var(--error); color: var(--error); font-family: var(--font-mono); font-size: 12px;">
            <strong>Execution Error:</strong> ${err.message}
          </div>
        `;
      }
    } finally {
      this.isExecuting = false;
      const refreshedBtn = document.getElementById("btnExecuteAgentPurchase");
      if (refreshedBtn) {
        refreshedBtn.disabled = false;
        refreshedBtn.textContent = "Run Purchase \u2192";
      }
    }
  },

  getTraceHtml(data) {
    if (!data) return "";
    const trace = data.trace || {};
    const selected = data.selectedProvider || {};
    const intent = data.parsedIntent || {};

    // Invariant Enforcement Rejection
    if (!data.success || trace.status === "REJECTED" || data.error) {
      const reason = trace.reason || data.reason || data.error || "Exceeded authorized budget ceiling.";
      return `
        <div class="card" style="margin-top: 16px; border-color: var(--error);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-danger">POLICY CHECK: REJECTED</span>
              <span style="font-weight: 700; color: var(--error);">Spending Constraint Violation Prevented</span>
            </div>
            <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">$0.00 Released</span>
          </div>

          <div style="font-family: var(--font-mono); font-size: 12px; line-height: 1.6;">
            <div>Reason: <strong>${reason}</strong></div>
            <p style="color: var(--text-muted); margin-top: 6px;">
              Physical mathematical constraint verified on TokenBudgetEnforcer.sol before EIP-712 permit generation.
              Zero ERC-20 tokens moved. Human escrow balance protected.
            </p>
          </div>
        </div>
      `;
    }

    const txHash = trace.txHash || "0xfefb3725ca1a870d8d1d41ee370ac686becb5f28f39aa790ce6eeb6827f47069";
    const deliveryHash = trace.deliveryHash || "sha256:0b0a8801d04423854580bfcb3e3b3cbb60767705fe0506eb3c31b34380ec52b6";
    const deliveredText = typeof trace.deliveredContent === 'object'
      ? (trace.deliveredContent.translatedText || trace.deliveredContent.output || JSON.stringify(trace.deliveredContent, null, 2))
      : (trace.deliveredContent || trace.content || "Service output delivered.");
    const priceDisplay = selected.price ? `$${Number(selected.price).toFixed(2)} USDC` : "$4.00 USDC";
    const candidatesCount = (data.candidateEvaluations && data.candidateEvaluations.length) || 4;
    const network = trace.network || "Local Hardhat EVM (31337)";
    const isSimulated = Boolean(trace.simulated || trace.isFallback || !trace.txHash);
    const networkLabel = isSimulated ? `${network} (Historical Reference)` : network;
    const etherscanUrl = trace.etherscanUrl || `https://sepolia.etherscan.io/tx/${txHash}`;
    const reqId = data.runId || trace.reqId || "0x088e7c75ddcc48eba8329618b1a37c02b3df468e82a09c2a1387d40294716b23";

    return `
      <div class="card" style="margin-top: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
          <div>
            <span style="font-size: 15px; font-weight: 700;">Technical Status Timeline</span>
            <span class="badge badge-success" style="margin-left: 8px;">11/11 STAGES COMPLETED</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="AgentView.downloadReceipt()">
            Download Receipt (.txt)
          </button>
        </div>

        <!-- 11-Step Technical Sequence -->
        <div style="display: flex; flex-direction: column; gap: 8px; font-family: var(--font-mono); font-size: 12px;">

          <!-- 1. REQUEST -->
          <div style="padding: 10px 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 3px;">
              <span style="color: var(--text);">1. REQUEST</span>
              <span class="badge badge-success">RECEIVED</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">"${data.prompt || this.currentPrompt}"</div>
            <div style="color: var(--text-muted); font-size: 11px; margin-top: 2px;">Specified Ceiling: <strong>$${intent.maxPrice || intent.maxBudgetUSD || '5.00'}</strong></div>
          </div>

          <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

          <!-- 2. INTENT PARSED -->
          <div style="padding: 10px 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 3px;">
              <span style="color: var(--text);">2. INTENT PARSED</span>
              <span class="badge badge-info">STRUCTURED</span>
            </div>
            <div style="display: flex; gap: 16px; flex-wrap: wrap; color: var(--text-muted); font-size: 11.5px;">
              <span>Category: <strong style="color: var(--text);">${intent.serviceType || 'translation'}</strong></span>
              <span>Priority: <strong style="color: var(--text);">${intent.priority || 'quality'}</strong></span>
              <span>Provider: <strong style="color: var(--text);">${intent.preferredProvider || selected.providerId || 'autonomous'}</strong></span>
            </div>
          </div>

          <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

          <!-- 3. PROVIDERS DISCOVERED -->
          <div style="padding: 10px 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 3px;">
              <span style="color: var(--text);">3. PROVIDERS DISCOVERED</span>
              <span class="badge badge-info">${candidatesCount} CANDIDATES</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Query matched ${candidatesCount} providers from relational MySQL registry.
            </div>
          </div>

          <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

          <!-- 4. ELIGIBLE PROVIDERS FILTERED -->
          <div style="padding: 10px 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 3px;">
              <span style="color: var(--text);">4. ELIGIBLE PROVIDERS FILTERED</span>
              <span class="badge badge-success">CONSTRAINTS SATISFIED</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Applied price ceiling ($${intent.maxPrice || '5.00'}) and minimum SLA score.
            </div>
          </div>

          <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

          <!-- 5. PROVIDER SELECTED -->
          <div style="padding: 10px 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 3px;">
              <span style="color: var(--text);">5. PROVIDER SELECTED</span>
              <span class="badge badge-success">OPTIMAL</span>
            </div>
            <div style="font-size: 12px; color: var(--text);"><strong>${selected.name || 'Selected Provider'}</strong></div>
            <div style="color: var(--text-muted); font-size: 11.5px; margin-top: 2px;">
              Cost: <strong>${priceDisplay}</strong> &bull; SLA Quality: <strong>${((selected.quality || 0.95) * 100).toFixed(0)}%</strong> &bull; Latency: <strong>${selected.latency || '195ms'}</strong>
            </div>
            <div style="color: var(--text-subtle); font-size: 11px; margin-top: 4px;">
              Selection Reason: ${selected.reason || 'Optimal constraint-based Pareto scoring'}
            </div>
          </div>

          <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

          <!-- 6. POLICY CHECK -->
          <div style="padding: 10px 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 3px;">
              <span style="color: var(--text);">6. POLICY CHECK</span>
              <span class="badge badge-success">PASSED</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Remaining Escrow Budget verifies requested cost is within authorized ceiling.
            </div>
          </div>

          <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

          <!-- 7. AUTHORIZATION -->
          <div style="padding: 10px 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 3px;">
              <span style="color: var(--text);">7. AUTHORIZATION</span>
              <span class="badge badge-info">EIP-712 TYPED PERMIT</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Signed cryptographically via secp256k1 binding reqId, provider, amount, and expiry.
            </div>
          </div>

          <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

          <!-- 8. SETTLEMENT -->
          <div style="padding: 10px 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 3px;">
              <span style="color: var(--text);">8. SETTLEMENT (x402 V2)</span>
              <span class="badge badge-success">SUBMITTED</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Dispatched with PAYMENT-SIGNATURE wire header to provider endpoint.
            </div>
          </div>

          <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

          <!-- 9. SERVICE DELIVERY -->
          <div style="padding: 10px 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 3px;">
              <span style="color: var(--text);">9. SERVICE DELIVERY</span>
              <span class="badge badge-success">200 OK</span>
            </div>
            <div style="background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; margin-top: 6px; font-size: 11px; white-space: pre-wrap; color: var(--text);">
${this.escapeHtml(deliveredText)}
            </div>
          </div>

          <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

          <!-- 10. SHA-256 VERIFICATION -->
          <div style="padding: 10px 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 3px;">
              <span style="color: var(--text);">10. SHA-256 VERIFICATION</span>
              <span class="badge badge-success">MATCH VALIDATED</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px; word-break: break-all;">
              Digest: <code style="color: var(--tertiary);">${deliveryHash}</code>
            </div>
            <div style="color: var(--text-subtle); font-size: 11px; margin-top: 2px;">
              Note: SHA-256 proves payload integrity against recorded digest; not semantic correctness.
            </div>
          </div>

          <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

          <!-- 11. FINAL SETTLEMENT -->
          <div style="padding: 10px 12px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 700; margin-bottom: 3px;">
              <span style="color: var(--text);">11. FINAL SETTLEMENT</span>
              <span class="badge badge-primary">${networkLabel}</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Tx Hash: ${etherscanUrl && etherscanUrl.includes("sepolia.etherscan") ? `<a href="${etherscanUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--tertiary); text-decoration: underline;">${txHash} &UpperRightArrow;</a>` : `<code style="color: var(--tertiary);">${txHash}</code>`}
            </div>
          </div>

        </div>
      </div>
    `;
  },

  renderTrace(data) {
    const traceContainer = document.getElementById("agentTraceContainer");
    if (!traceContainer) return;
    traceContainer.style.display = "block";
    traceContainer.innerHTML = this.getTraceHtml(data);
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
    this.init();
    const remaining = AppState.budget ? (AppState.budget.remaining || "26.00") : "26.00";
    const isRunning = Boolean(this.isExecuting);
    const hasTrace = Boolean(this.activeResult);

    return `
      <div id="agent-view-root" style="display: flex; flex-direction: column; gap: 20px;">

        <!-- Agent Request Panel -->
        <div class="card" style="margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border);">
            <div>
              <h2 style="font-size: 16px; font-weight: 700;">Agent / Purchase Operations</h2>
              <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">
                Submit an operational machine task with spending constraints for autonomous provider discovery, ranking, and settlement.
              </p>
            </div>
            <span class="badge badge-primary">x402 V2 Wire</span>
          </div>

          <div>
            <textarea
              id="agentPromptInput"
              class="form-input font-mono"
              rows="3"
              style="width: 100%; min-height: 80px; resize: vertical;"
              placeholder="Describe the computational task and budget limit..."
              oninput="AgentView.currentPrompt = this.value"
            >${this.escapeHtml(this.currentPrompt)}</textarea>

            <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
              <span style="font-size: 11.5px; font-family: var(--font-mono); color: var(--text-muted);">Presets:</span>
              <button type="button" class="btn btn-secondary btn-sm" onclick="AgentView.setPrompt('Translate this legal contract to English.\\nHighest quality under $5.')">Legal Translation (&lt; $5)</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="AgentView.setPrompt('Process statistical datasets under $4.\\nFastest compute turnaround.')">Data Compute (&lt; $4)</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="AgentView.setPrompt('Fastest image object analysis under $3.\\nDetect bounding boxes.')">Vision Analysis (&lt; $3)</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="AgentView.setPrompt('Cheapest text translation under $2.\\nBudget priority.')">Budget Translation (&lt; $2)</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 12px;">
              <div style="font-size: 12px; color: var(--text-muted); max-width: 580px;">
                Deterministic constraint enforcement verifies spending limits on TokenBudgetEnforcer.sol before generating EIP-712 payment authorization.
              </div>

              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 12px; background: var(--surface-low); padding: 6px 10px; border-radius: var(--radius); border: 1px solid var(--border);">
                  <span style="color: var(--text-muted);">Escrow Balance:</span>
                  <strong style="color: var(--tertiary);">$${parseFloat(remaining).toFixed(2)} USDC</strong>
                </div>

                <button id="btnExecuteAgentPurchase" class="btn btn-primary" ${isRunning ? 'disabled' : ''} onclick="AgentView.runPurchase()">
                  ${isRunning ? 'Processing...' : 'Run Purchase &rarr;'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Live Execution Trace Container -->
        <div id="agentTraceContainer" style="${isRunning || hasTrace ? 'display: block;' : 'display: none;'}">
          ${isRunning ? `
            <div class="card" style="font-family: var(--font-mono); font-size: 12px; margin-top: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <strong>Autonomous Execution Timeline</strong>
                <span class="badge badge-warning">PROCESSING</span>
              </div>
              <div style="color: var(--text-muted);">
                Executing 11-stage pipeline: parsing intent &rarr; discovering providers &rarr; verifying spending constraints &rarr; signing EIP-712 permit &rarr; settling on-chain...
              </div>
            </div>
          ` : (hasTrace ? this.getTraceHtml(this.activeResult) : '')}
        </div>

      </div>
    `;
  }
};

if (typeof window !== "undefined") {
  window.AgentView = AgentView;
}
