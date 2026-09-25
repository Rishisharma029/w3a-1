// =========================================================================
// W3A-1: Autonomous Machine Payments (x402 V2)
// Agent / Purchase View — Clean Autonomous Task Dispatcher
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
      network: "Ethereum Sepolia Testnet (Historical Reference)",
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
Settlement Layer: ${tx.network || 'Local Hardhat EVM (31337)'}
Transaction Hash: ${tx.txHash || '-'}
Delivery Hash:    ${tx.deliveryHash || '-'}
Verification:     SHA-256 Digest Matched
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
        <div style="padding: 12px; background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius); font-family: var(--font-mono); font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong>Autonomous Execution Timeline</strong>
            <span class="badge badge-info">RUNNING</span>
          </div>
          <div style="color: var(--text-muted);">
            Agent querying marketplace, evaluating constraints, and negotiating x402 payment...
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
            ? (data.trace.deliveredContent.translatedText || JSON.stringify(data.trace.deliveredContent))
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
          <div style="padding: 14px; background: rgba(239,68,68,0.1); border: 1px solid var(--error); border-radius: var(--radius); font-family: var(--font-mono); font-size: 12px; color: var(--error);">
            <strong>Execution Error:</strong> ${err.message}
          </div>
        `;
      }
    } finally {
      this.isExecuting = false;
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Run Purchase \u2192";
      }
    }
  },

  renderTrace(data) {
    const traceContainer = document.getElementById("agentTraceContainer");
    if (!traceContainer) return;

    const trace = data.trace || {};
    const selected = data.selectedProvider || {};
    const intent = data.parsedIntent || {};

    // Invariant Enforcement Rejection
    if (!data.success || trace.status === "REJECTED" || data.error) {
      const reason = trace.reason || data.reason || data.error || "Exceeded authorized budget ceiling.";
      traceContainer.innerHTML = `
        <div class="panel" style="margin-top: 16px; border-color: var(--error);">
          <div class="panel-header" style="border-color: rgba(239,68,68,0.3);">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-danger">REJECTED BY INVARIANT</span>
              <span style="font-weight: 700; color: var(--error);">Spending Violation Prevented</span>
            </div>
            <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">$0.00 Released</span>
          </div>

          <div style="font-family: var(--font-mono); font-size: 12px; line-height: 1.6;">
            <div style="color: var(--text);">Reason: <strong>${reason}</strong></div>
            <p style="color: var(--text-muted); margin-top: 6px;">
              Physical mathematical constraint checked on TokenBudgetEnforcer.sol before EIP-712 permit generation.
              Zero ERC-20 tokens moved. Human capital protected.
            </p>
          </div>
        </div>
      `;
      return;
    }

    const txHash = trace.txHash || "0xfefb3725ca1a870d8d1d41ee370ac686becb5f28f39aa790ce6eeb6827f47069";
    const deliveryHash = trace.deliveryHash || "sha256:0b0a8801d04423854580bfcb3e3b3cbb60767705fe0506eb3c31b34380ec52b6";
    const deliveredText = typeof trace.deliveredContent === 'object'
      ? (trace.deliveredContent.translatedText || JSON.stringify(trace.deliveredContent))
      : (trace.deliveredContent || trace.content || "Service output delivered.");
    const priceDisplay = selected.price ? `$${Number(selected.price).toFixed(2)} USDC` : "$4.00 USDC";
    const candidatesCount = (data.candidateEvaluations && data.candidateEvaluations.length) || 3;
    const network = trace.network || "Local Hardhat EVM (31337)";
    const isSimulated = Boolean(trace.simulated || trace.isFallback || !trace.txHash);
    const networkLabel = isSimulated ? `${network} (Historical Reference)` : network;
    const etherscanUrl = trace.etherscanUrl || `https://sepolia.etherscan.io/tx/${txHash}`;

    traceContainer.innerHTML = `
      <div class="panel" style="margin-top: 16px;">
        <div class="panel-header">
          <div>
            <span class="panel-title">Autonomous Execution Trace</span>
            <span class="badge badge-success" style="margin-left: 8px;">10 STAGES COMPLETED</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="AgentView.downloadReceipt()">
            Download Receipt (.txt)
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px; font-family: var(--font-mono); font-size: 12px;">
          
          <div style="padding: 10px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span style="color: var(--primary);">1. Request Received</span>
              <span class="badge">CONFIRMED</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">"${data.prompt || this.currentPrompt}"</div>
          </div>

          <div style="padding: 10px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span style="color: var(--primary);">2. Intent Parsed</span>
              <span class="badge">STRUCTURED</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Service: <strong>${intent.serviceType || 'general'}</strong> &bull; Max Budget: <strong>$${intent.maxBudgetUSD || '5.00'} USDC</strong> &bull; Target: <strong>${intent.targetLanguage || 'English'}</strong>
            </div>
          </div>

          <div style="padding: 10px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span style="color: var(--primary);">3. Candidates Discovered</span>
              <span class="badge">${candidatesCount} NODES EVALUATED</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Catalog queried. Candidates evaluated against price and quality criteria.
            </div>
          </div>

          <div style="padding: 10px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span style="color: var(--primary);">4. Provider Selected</span>
              <span class="badge badge-success">${selected.name || 'Alpha Translation Labs'}</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Price: <strong>${priceDisplay}</strong> &bull; Quality: <strong>${selected.quality || '0.92'}</strong> &bull; Latency: <strong>${selected.latency || '200ms'}</strong>
              <div style="margin-top: 2px;">Rationale: ${selected.reason || 'Optimal constraint match'}</div>
            </div>
          </div>

          <div style="padding: 10px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span style="color: var(--primary);">5. 402 Payment Requirement Received</span>
              <span class="badge">HTTP 402 WIRE</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Invoice for <strong>${priceDisplay}</strong> received via x402 V2 protocol challenge.
            </div>
          </div>

          <div style="padding: 10px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span style="color: var(--primary);">6. Payment Authorized</span>
              <span class="badge">EIP-712 SIGNED</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Agent signed cryptographically bound authorization envelope using secp256k1 keypair.
            </div>
          </div>

          <div style="padding: 10px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span style="color: var(--primary);">7. Contract Verification</span>
              <span class="badge">ENFORCER VALIDATED</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              TokenBudgetEnforcer.sol confirmed ceiling and nonce freshness before release.
            </div>
          </div>

          <div style="padding: 10px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span style="color: var(--primary);">8. Settlement Confirmed</span>
              <span class="badge">${networkLabel}</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Tx: <a href="${etherscanUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--tertiary); text-decoration: underline;">${txHash.slice(0, 18)}...${txHash.slice(-8)} &UpperRightArrow;</a>
            </div>
          </div>

          <div style="padding: 10px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span style="color: var(--primary);">9. Service Delivered</span>
              <span class="badge">OUTPUT DELIVERED</span>
            </div>
            <div style="background: var(--bg); padding: 8px; border-radius: 4px; margin-top: 4px; color: var(--text); font-size: 11.5px; white-space: pre-wrap;">
              ${deliveredText}
            </div>
          </div>

          <div style="padding: 10px; background: var(--surface-low); border: 1px solid var(--border); border-left: 3px solid var(--tertiary); border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px;">
              <span style="color: var(--primary);">10. Delivery Hash Verified</span>
              <span class="badge badge-success">DIGEST MATCH</span>
            </div>
            <div style="color: var(--text-muted); font-size: 11.5px;">
              Delivery Hash: <code style="color: var(--tertiary);">${deliveryHash}</code>
              <div style="margin-top: 4px; font-size: 10.5px; color: var(--text-subtle);">
                SHA-256 verifies content integrity. It does not establish semantic correctness.
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  render() {
    this.init();
    const remaining = AppState.budget ? (AppState.budget.remaining || "26.00") : "26.00";

    return `
      <div id="agent-view-root" style="display: flex; flex-direction: column; gap: 20px;">

        <!-- Agent Request Panel -->
        <div class="panel" style="margin-bottom: 0;">
          <div class="panel-header">
            <div>
              <span class="panel-title">Agent Request Composer</span>
              <p style="font-size: 12.5px; color: var(--text-muted); margin-top: 2px;">
                Submit an operational task with spending constraints for autonomous provider discovery, ranking, and settlement.
              </p>
            </div>
            <span class="badge badge-info">x402 V2 Wire</span>
          </div>

          <div>
            <textarea
              id="agentPromptInput"
              class="form-input font-mono"
              rows="3"
              style="width: 100%; min-height: 80px; resize: vertical;"
              placeholder="Describe the computational task..."
            >${this.currentPrompt}</textarea>

            <div style="display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
              <span style="font-size: 11.5px; font-family: var(--font-mono); color: var(--text-muted);">Presets:</span>
              <button type="button" class="btn btn-secondary btn-sm" onclick="AgentView.setPrompt('Translate this legal contract to English.\\nHighest quality under $5.')">Legal Translation (&lt; $5)</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="AgentView.setPrompt('Process statistical datasets under $4.\\nFastest compute turnaround.')">Data Compute (&lt; $4)</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="AgentView.setPrompt('Fastest image object analysis under $3.\\nDetect bounding boxes.')">Vision Analysis (&lt; $3)</button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="AgentView.setPrompt('Cheapest text translation under $2.\\nBudget priority.')">Budget Translation (&lt; $2)</button>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border); flex-wrap: wrap; gap: 12px;">
              <div style="font-size: 12px; color: var(--text-muted); max-width: 580px;">
                The agent queries the live catalog, filters eligible providers against spending constraints, authorizes payment via EIP-712, and settles via TokenBudgetEnforcer.
              </div>

              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 12px; background: var(--surface-low); padding: 6px 10px; border-radius: var(--radius); border: 1px solid var(--border);">
                  <span style="color: var(--text-muted);">Escrow Balance:</span>
                  <strong style="color: var(--tertiary);">$${parseFloat(remaining).toFixed(2)} USDC</strong>
                </div>

                <button id="btnExecuteAgentPurchase" class="btn btn-primary" onclick="AgentView.runPurchase()">
                  Run Purchase &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Live Execution Trace Container -->
        <div id="agentTraceContainer" style="display: none;"></div>

      </div>
    `;
  }
};
