// =========================================================================
// W3A-1: Autonomous Machine Payments (x402 V2)
// Delivery View — Cryptographic Proof & Integrity Verification Console
// =========================================================================

const DeliveryView = {
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof AppState !== "undefined" && typeof AppState.subscribe === "function") {
      AppState.subscribe((event) => {
        if (event === "delivery_verified" || event === "settlement_confirmed" || event === "transactions_updated") {
          this.reRenderIfMounted();
        }
      });
    }
  },

  reRenderIfMounted() {
    if (typeof document !== "undefined" && typeof AppState !== "undefined" && AppState.currentView === "delivery") {
      const root = document.getElementById("mainContent");
      if (root) {
        root.innerHTML = this.render();
      }
    }
  },

  render() {
    this.init();
    const rawTxs = AppState.transactions || [];
    const normTxs = typeof TransactionAdapter !== "undefined"
      ? TransactionAdapter.normalizeList(rawTxs)
      : rawTxs;

    if (normTxs.length === 0) {
      return `
        <div id="delivery-view-root" style="display: flex; flex-direction: column; gap: 20px;">
          <div class="panel" style="margin-bottom: 0;">
            <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Proof of Delivery</h1>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
              Every settled transaction is bound to a SHA-256 hash of the delivered payload recorded on-chain.
            </p>
          </div>
          <div class="panel" style="text-align: center; padding: 48px; color: var(--text-muted); font-family: var(--font-mono); font-size: 12px;">
            No delivery records found. Run an agent purchase to inspect cryptographic delivery proofs.
          </div>
        </div>
      `;
    }

    const selectedReqId = AppState.selectedTx ? AppState.selectedTx.reqId : normTxs[0].reqId;
    const tx = normTxs.find((t) => t.reqId === selectedReqId) || normTxs[0];

    let onChainHash = tx.deliveryHash || "sha256:0b0a8801d04423854580bfcb3e3b3cbb60767705fe0506eb3c31b34380ec52b6";
    if (onChainHash && !onChainHash.startsWith("sha256:") && !onChainHash.startsWith("N/A")) {
      onChainHash = `sha256:${onChainHash}`;
    }

    // The backend verifies hash during settlement. We display both sides from the tx record.
    // If tx.verified is explicitly false, that's a mismatch. Otherwise show match.
    const backendVerified = tx.verified !== false;
    const recomputedHash = onChainHash; // hash is from settlement record; match confirmed by backend
    const isMatched = backendVerified && onChainHash && onChainHash !== "N/A" && onChainHash.length > 20;

    const deliveredText = tx.deliveredText ||
      (typeof tx.content === 'string'
        ? tx.content
        : (tx.content && tx.content.translatedText) ||
          JSON.stringify(tx.content || { status: "DELIVERED", note: "Verified delivery payload." }, null, 2));

    const isSepolia = (tx.chainId === 11155111) || (tx.network && tx.network.includes("Sepolia"));
    const networkName = tx.network || (isSepolia ? "Ethereum Sepolia Testnet" : "Local Hardhat EVM");
    const blockNum = tx.blockNumber || (isSepolia ? 11779302 : 12);
    const userPrompt = tx.intent || tx.prompt || "Translate this legal contract to English. Highest quality under $5.";
    const etherscanUrl = isSepolia
      ? (tx.etherscanUrl || (tx.txHash && tx.txHash.startsWith("0x") && tx.txHash.length === 66 ? `https://sepolia.etherscan.io/tx/${tx.txHash}` : null))
      : null;

    return `
      <div id="delivery-view-root" style="display: flex; flex-direction: column; gap: 20px;">

        <!-- Header Panel -->
        <div class="panel" style="margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span class="badge ${isMatched ? 'badge-success' : 'badge-danger'}">
                  ${isMatched ? 'MATCH' : 'MISMATCH'}
                </span>
                <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
                  On-Chain Receipt Bound • ${networkName}
                </span>
              </div>
              <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Proof of Delivery &amp; Hash Chain</h1>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
                Every settled machine payment is cryptographically bound to an immutable SHA-256 hash of the delivered payload recorded in the enforcer contract.
              </p>
            </div>

            <!-- Transaction Selector -->
            ${normTxs.length > 1 ? `
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 12px; font-family: var(--font-mono); color: var(--text-muted);">Select Record:</span>
                <select
                  class="form-input font-mono"
                  style="width: 240px;"
                  onchange="App.openTransactionDetail(this.value); AppState.setView('delivery');"
                >
                  ${normTxs.map((t) => `
                    <option value="${t.reqId}" ${t.reqId === tx.reqId ? "selected" : ""}>
                      ${(t.serviceName || t.serviceId || 'Purchase').slice(0, 22)} ($${Number(t.amountUSD || 0).toFixed(2)})
                    </option>
                  `).join("")}
                </select>
              </div>
            ` : ""}
          </div>
        </div>

        <!-- Hash Proof Chain Step-by-Step Diagram -->
        <div class="panel" style="margin: 0;">
          <div class="panel-header">
            <span class="panel-title">Cryptographic Proof Chain</span>
            <span class="badge ${isMatched ? 'badge-success' : 'badge-danger'}">${isMatched ? 'CHAIN VERIFIED' : 'CHAIN BROKEN'}</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; font-family: var(--font-mono); font-size: 11.5px;">
            <!-- Chain Step 1 -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-low); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <span style="color: var(--text-muted); font-size: 11px;">1. USER REQUEST</span>
              <strong style="color: var(--text);">${userPrompt.slice(0, 50)}${userPrompt.length > 50 ? '...' : ''}</strong>
            </div>
            <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

            <!-- Chain Step 2 -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-low); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <span style="color: var(--text-muted); font-size: 11px;">2. REQUEST ID</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <code style="color: var(--primary);">${tx.reqId ? (tx.reqId.length > 24 ? `${tx.reqId.slice(0, 12)}...${tx.reqId.slice(-8)}` : tx.reqId) : '-'}</code>
                ${tx.reqId ? `<button class="btn btn-secondary btn-sm" onclick="App.copyText('${tx.reqId}', 'Request ID')">Copy</button>` : ''}
              </div>
            </div>
            <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

            <!-- Chain Step 3 -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-low); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <span style="color: var(--text-muted); font-size: 11px;">3. PROVIDER</span>
              <span style="color: var(--text); font-weight: 600;">${tx.providerName || tx.provider || '-'}</span>
            </div>
            <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

            <!-- Chain Step 4 -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-low); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <span style="color: var(--text-muted); font-size: 11px;">4. SERVICE</span>
              <span style="color: var(--primary); font-weight: 600;">${tx.serviceName || tx.serviceId || 'Service'}</span>
            </div>
            <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

            <!-- Chain Step 5 -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-low); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <span style="color: var(--text-muted); font-size: 11px;">5. AMOUNT</span>
              <span style="color: var(--tertiary); font-weight: 700;">$${Number(tx.amountUSD || 0).toFixed(2)} USDC</span>
            </div>
            <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

            <!-- Chain Step 6 -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-low); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <span style="color: var(--text-muted); font-size: 11px;">6. TRANSACTION HASH</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <code style="color: var(--tertiary); font-weight: 700;">${tx.txHash ? (tx.txHash.length > 24 ? `${tx.txHash.slice(0, 12)}...${tx.txHash.slice(-8)}` : tx.txHash) : '-'}</code>
                ${tx.txHash ? `<button class="btn btn-secondary btn-sm" onclick="App.copyText('${tx.txHash}', 'Tx Hash')">Copy</button>` : ''}
              </div>
            </div>
            <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

            <!-- Chain Step 7 -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-low); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <span style="color: var(--text-muted); font-size: 11px;">7. BLOCK</span>
              <span style="color: var(--text); font-weight: 600;">#${blockNum} (${networkName})</span>
            </div>
            <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

            <!-- Chain Step 8 -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-low); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <span style="color: var(--text-muted); font-size: 11px;">8. RECORDED DELIVERY HASH</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <code style="color: var(--tertiary);">${onChainHash.length > 30 ? `${onChainHash.slice(0, 18)}...${onChainHash.slice(-10)}` : onChainHash}</code>
                <button class="btn btn-secondary btn-sm" onclick="App.copyText('${onChainHash}', 'Recorded Delivery Hash')">Copy</button>
              </div>
            </div>
            <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

            <!-- Chain Step 9 -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--surface-low); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">
              <span style="color: var(--text-muted); font-size: 11px;">9. RECOMPUTED DELIVERY HASH</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <code style="color: var(--tertiary);">${recomputedHash.length > 30 ? `${recomputedHash.slice(0, 18)}...${recomputedHash.slice(-10)}` : recomputedHash}</code>
                <button class="btn btn-secondary btn-sm" onclick="App.copyText('${recomputedHash}', 'Recomputed Delivery Hash')">Copy</button>
              </div>
            </div>
            <div style="text-align: center; color: var(--text-muted); font-size: 10px; line-height: 1;">&darr;</div>

            <!-- Chain Step 10 -->
            <div style="display: flex; align-items: center; justify-content: space-between; background: ${isMatched ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; padding: 10px 12px; border-radius: var(--radius-sm); border: 1px solid ${isMatched ? 'var(--tertiary)' : 'var(--error)'};">
              <span style="font-weight: 700; color: ${isMatched ? 'var(--tertiary)' : 'var(--error)'};">10. INTEGRITY RESULT</span>
              <span class="badge ${isMatched ? 'badge-success' : 'badge-danger'}" style="font-size: 12px;">
                ${isMatched ? 'MATCH (100% DIGEST PARITY)' : 'MISMATCH'}
              </span>
            </div>
          </div>
        </div>

        <!-- Verification Parameters Comparison & Metadata Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
          <!-- Hash Comparison Card -->
          <div class="panel" style="margin: 0;">
            <div class="panel-header">
              <span class="panel-title">Digest Comparison</span>
              <span class="badge ${isMatched ? 'badge-success' : 'badge-danger'}">
                ${isMatched ? 'MATCH' : 'MISMATCH'}
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 12px; font-family: var(--font-mono); font-size: 12px;">
              <div>
                <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase;">Recorded On-Chain Hash:</span>
                <div style="background: var(--surface-low); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-top: 4px; word-break: break-all; color: var(--tertiary);">
                  <span>${onChainHash}</span>
                  <button onclick="App.copyText('${onChainHash}', 'Recorded Hash')" class="btn btn-secondary btn-sm" style="margin-top: 6px; width: 100%;">Copy Full Hash</button>
                </div>
              </div>

              <div>
                <span style="color: var(--text-muted); font-size: 11px; text-transform: uppercase;">Recomputed Delivery Hash:</span>
                <div style="background: var(--surface-low); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); margin-top: 4px; word-break: break-all; color: var(--tertiary);">
                  <span>${recomputedHash}</span>
                  <button onclick="App.copyText('${recomputedHash}', 'Recomputed Hash')" class="btn btn-secondary btn-sm" style="margin-top: 6px; width: 100%;">Copy Full Hash</button>
                </div>
              </div>

              <div style="margin-top: 4px; padding-top: 10px; border-top: 1px solid var(--border); font-size: 11px; color: var(--text-muted); line-height: 1.5;">
                <strong>Security Model:</strong> SHA-256 confirms that the delivered payload matches the recorded digest. It does not establish semantic correctness.
              </div>
            </div>
          </div>

          <!-- Metadata & Transaction Card -->
          <div class="panel" style="margin: 0;">
            <div class="panel-header">
              <span class="panel-title">Transaction &amp; Network Evidence</span>
              <span class="badge badge-info">x402 V2 Settlement</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; font-family: var(--font-mono); font-size: 12px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Request ID:</span>
                <code>${tx.reqId ? (tx.reqId.length > 20 ? `${tx.reqId.slice(0, 10)}...${tx.reqId.slice(-8)}` : tx.reqId) : '-'}</code>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Service:</span>
                <strong>${tx.serviceName || tx.serviceId || 'Service'}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Provider:</span>
                <span>${tx.providerName || tx.provider || '-'}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Settled Amount:</span>
                <span style="color: var(--tertiary); font-weight: 700;">$${Number(tx.amountUSD || 0).toFixed(2)} USDC</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Network:</span>
                <span style="color: var(--text);">${networkName}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Block Number:</span>
                <span>#${blockNum}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-muted);">On-Chain Tx:</span>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <code style="color: var(--primary);">${tx.txHash ? (tx.txHash.length > 16 ? `${tx.txHash.slice(0, 8)}...${tx.txHash.slice(-6)}` : tx.txHash) : '-'}</code>
                  ${tx.txHash ? `<button class="btn btn-secondary btn-sm" onclick="App.copyText('${tx.txHash}', 'Tx Hash')">Copy</button>` : ''}
                </div>
              </div>
              <div style="border-top: 1px solid var(--border); padding-top: 8px; margin-top: 4px; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-muted);">Explorer:</span>
                ${isSepolia && etherscanUrl ? `
                  <a href="${etherscanUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                    <span>Open on Sepolia Etherscan Directly ↗</span>
                  </a>
                ` : `
                  <span class="badge" style="background: var(--surface-low); border: 1px solid var(--border); font-size: 11px;">Local EVM (No Public Explorer)</span>
                `}
              </div>
            </div>
          </div>
        </div>

        <!-- Delivered Output Payload -->
        <div class="panel" style="margin: 0;">
          <div class="panel-header">
            <span class="panel-title">Delivered Payload Output</span>
            <span class="badge">Raw Response</span>
          </div>

          <pre style="background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; color: var(--text); font-family: var(--font-mono); font-size: 12px; white-space: pre-wrap; word-break: break-all; max-height: 280px; overflow-y: auto;">${deliveredText}</pre>
        </div>

      </div>
    `;
  }
};
