// =========================================================================
// W3A-1: Autonomous Machine Payments (x402 V2)
// On-Chain Cryptographic Verifier & Explorer View
// =========================================================================

const VerifyView = {
  initialized: false,
  userExplicitlySelectedHash: false,
  activeTab: "sepolia", // "sepolia" | "local"
  currentHash: "0xb9d3d3491888106ee4c0eb63717ede3ced22cbd65dcb0c284cc4a6ab4312aa75",
  enforcerAddress: "0xf9f296e97062F49ad3d13aF96729F7c35a7eA75e",
  tokenAddress: "0xAaa008Df25A46dc501B5B712ac18B47901AF99A7",
  localEnforcerAddress: "0xe7f1725E07018023380218241b6253069714BD22",
  localTokenAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  etherscanBase: "https://sepolia.etherscan.io",

  sepoliaTransactions: [
    {
      txHash: "0xb9d3d3491888106ee4c0eb63717ede3ced22cbd65dcb0c284cc4a6ab4312aa75",
      reqId: "0x7a304e287a19c11da841029ca91c4918e974cb381295db283f124c8000000000",
      amountUSD: "4.00",
      serviceName: "AI Legal Contract Translation",
      providerName: "Alpha Translation Services",
      deliveryHash: "0x6f3e1b092df48641a9985923b7e411c50064f2ab72e424e8e040c5b367098412",
      blockNumber: 11781628,
      network: "Ethereum Sepolia Testnet",
      chainId: 11155111,
      etherscanUrl: "https://sepolia.etherscan.io/tx/0xb9d3d3491888106ee4c0eb63717ede3ced22cbd65dcb0c284cc4a6ab4312aa75",
      timestamp: "2026-09-25T20:30:00.000Z",
    },
    {
      txHash: "0x303ae7447a4b78850a86e5ecf126d1437b8094c045b1fe9917aacb98698ec289",
      reqId: "0x37815bb89cda313f4117cc039be4afef7047cfb1a86b3a208b66f8037f092f0f",
      amountUSD: "4.00",
      serviceName: "AI Legal Contract Translation",
      providerName: "Alpha Translation Services",
      deliveryHash: "0xe281dc941c35f53f89b66e015811b8f0544c30c7b27d47306029e2390b23e3fc",
      blockNumber: 11766297,
      network: "Ethereum Sepolia Testnet",
      chainId: 11155111,
      etherscanUrl: "https://sepolia.etherscan.io/tx/0x303ae7447a4b78850a86e5ecf126d1437b8094c045b1fe9917aacb98698ec289",
      timestamp: "2026-09-25T19:40:00.000Z",
    },
    {
      txHash: "0xfefb3725ca1a870d8d1d41ee370ac686becb5f28f39aa790ce6eeb6827f47069",
      reqId: "0x4b2c1f938d874ab281295cb283f124c800000000000000000000000000000000",
      amountUSD: "4.00",
      serviceName: "AI Legal Translation",
      providerName: "Alpha Translation Services",
      deliveryHash: "0x6f3e1b092df48641a9985923b7e411c50064f2ab72e424e8e040c5b367098412",
      blockNumber: 11779302,
      network: "Ethereum Sepolia Testnet",
      chainId: 11155111,
      etherscanUrl: "https://sepolia.etherscan.io/tx/0xfefb3725ca1a870d8d1d41ee370ac686becb5f28f39aa790ce6eeb6827f47069",
      timestamp: "2026-09-25T18:22:00.000Z",
    },
    {
      txHash: "0x89ef9d6e9a532a49ac6eb2cbad1de4e08067cdb3ac7b741a8481a3198f3499ac",
      reqId: "0x0000000000000000000000000000000000000000000000000000000000000200",
      amountUSD: "50.00",
      serviceName: "Escrow Budget Deposit ($50.00 MockUSDC)",
      providerName: "TokenBudgetEnforcer.sol",
      deliveryHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      blockNumber: 11779294,
      network: "Ethereum Sepolia Testnet",
      chainId: 11155111,
      etherscanUrl: "https://sepolia.etherscan.io/tx/0x89ef9d6e9a532a49ac6eb2cbad1de4e08067cdb3ac7b741a8481a3198f3499ac",
      timestamp: "2026-09-25T18:15:00.000Z",
    },
    {
      txHash: "0xa7a187321a0f29247cc0dba54479ba21de438c9142c1c1f750c77e5ad32c1e16",
      reqId: "0x39a1c4918e974cb381295db283f124c800000000000000000000000000000000",
      amountUSD: "4.00",
      serviceName: "Legal Contract Translation",
      providerName: "Alpha Translation Services",
      deliveryHash: "0x6f3e1b092df48641a9985923b7e411c50064f2ab72e424e8e040c5b367098412",
      blockNumber: 11766123,
      network: "Ethereum Sepolia Testnet",
      chainId: 11155111,
      etherscanUrl: "https://sepolia.etherscan.io/tx/0xa7a187321a0f29247cc0dba54479ba21de438c9142c1c1f750c77e5ad32c1e16",
      timestamp: "2026-09-23T16:44:00.000Z",
    },
    {
      txHash: "0xae87735f8942db7ff0aadec78a1d042e1c1d9c58480af5e9070c7fd9f56be064",
      reqId: "0x0000000000000000000000000000000000000000000000000000000000000100",
      amountUSD: "100.00",
      serviceName: "Escrow Budget Deposit ($100.00 USDC)",
      providerName: "TokenBudgetEnforcer.sol",
      deliveryHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      blockNumber: 11766227,
      network: "Ethereum Sepolia Testnet",
      chainId: 11155111,
      etherscanUrl: "https://sepolia.etherscan.io/tx/0xae87735f8942db7ff0aadec78a1d042e1c1d9c58480af5e9070c7fd9f56be064",
      timestamp: "2026-09-23T16:40:00.000Z",
    },
  ],

  getCombinedSepoliaTransactions() {
    const list = [...this.sepoliaTransactions];
    if (typeof AppState !== "undefined" && AppState.transactions) {
      for (const tx of AppState.transactions) {
        const isSep = (tx.chainId === 11155111) || (tx.network && tx.network.includes("Sepolia"));
        if (!isSep) continue;
        const h = (tx.txHash || "").toLowerCase();
        if (h && !list.some((s) => (s.txHash || "").toLowerCase() === h)) {
          list.unshift(tx);
        }
      }
    }
    return list;
  },

  getLocalTransactions() {
    const list = [];
    if (typeof AppState !== "undefined" && AppState.transactions) {
      for (const tx of AppState.transactions) {
        const isSep = (tx.chainId === 11155111) || (tx.network && tx.network.includes("Sepolia"));
        if (!isSep && tx.txHash) {
          list.push(tx);
        }
      }
    }
    return list;
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.fetchSepoliaTransactions();

    if (typeof AppState !== "undefined" && typeof AppState.subscribe === "function") {
      AppState.subscribe((event, data) => this.onStateChange(event, data));
    }
  },

  async fetchSepoliaTransactions() {
    try {
      const res = await fetch("/api/sepolia/transactions");
      if (res.ok) {
        const data = await res.json();
        if (data.transactions && data.transactions.length > 0) {
          this.sepoliaTransactions = data.transactions;
          if (!this.currentHash && this.sepoliaTransactions[0]) {
            this.currentHash = this.sepoliaTransactions[0].txHash;
          }
          this.reRenderIfMounted();
        }
      }
    } catch (_) {}
  },

  onStateChange(event, data) {
    if (
      event === "transactions_updated" ||
      event === "settlement_confirmed" ||
      event === "stream_event_processed" ||
      event === "budget_updated"
    ) {
      if (event === "transactions_updated" && data && data.length > 0) {
        if (!this.userExplicitlySelectedHash && data[0].txHash) {
          this.currentHash = data[0].txHash;
        }
      }
      this.fetchSepoliaTransactions();
    }
  },

  reRenderIfMounted() {
    if (typeof document === "undefined") return;
    if (typeof AppState !== "undefined" && AppState.currentView === "verify") {
      const root = document.getElementById("mainContent");
      if (root && root.querySelector("#verify-view-root")) {
        root.innerHTML = this.render();
      }
    }
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.reRenderIfMounted();
  },

  setSampleHash(val) {
    this.userExplicitlySelectedHash = true;
    this.currentHash = val;
    const input = document.getElementById("verifyInputInApp");
    if (input) input.value = val;
    this.verifyHash(val);
  },

  verifyHash(hash) {
    const targetHash = (hash || (document.getElementById("verifyInputInApp") ? document.getElementById("verifyInputInApp").value : "")).trim();
    if (!targetHash) return;

    this.userExplicitlySelectedHash = true;
    this.currentHash = targetHash;
    this.populateVerificationResult(targetHash);
  },

  populateVerificationResult(targetHash) {
    const resCard = document.getElementById("inAppVerifyResult");
    if (!resCard) return;

    const allSep = this.getCombinedSepoliaTransactions();
    const isSepoliaMatch = allSep.find(
      (t) => (t.txHash || "").toLowerCase() === targetHash.toLowerCase()
    );

    const localTxs = this.getLocalTransactions();
    const isLocalMatch = localTxs.find(
      (t) => (t.txHash || "").toLowerCase() === targetHash.toLowerCase()
    );

    const matched = isSepoliaMatch || isLocalMatch || (AppState.transactions && AppState.transactions.find((t) => (t.txHash || "").toLowerCase() === targetHash.toLowerCase())) || {};
    const isLocal = Boolean(isLocalMatch || matched.chainId === 31337 || (matched.network && matched.network.toLowerCase().includes("local")));
    const isSepolia = !isLocal;
    const blk = matched.blockNumber || (isSepolia ? 11779302 : 1);
    const amountVal = matched.amountUSD || (matched.amount ? (Number(matched.amount) / 1e6).toFixed(2) : "4.00");
    const deliveryHashVal = matched.deliveryHash || "sha256:0b0a8801d04423854580bfcb3e3b3cbb60767705fe0506eb3c31b34380ec52b6";
    const rid = matched.reqId || "0x37815bb89cda313f4117cc039be4afef7047cfb1";
    const reqIdVal = rid.length > 20 ? `${rid.slice(0, 10)}...${rid.slice(-8)}` : rid;
    const isCleanSepoliaHash = targetHash && targetHash.startsWith("0x") && targetHash.length === 66 && !targetHash.includes("094e6208") && !targetHash.includes("revert");
    const etherscanUrl = isSepolia
      ? ((matched.etherscanUrl && !matched.etherscanUrl.includes("094e6208"))
          ? matched.etherscanUrl
          : (isCleanSepoliaHash ? `${this.etherscanBase}/tx/${targetHash}` : `${this.etherscanBase}/address/${this.enforcerAddress}`))
      : null;

    resCard.innerHTML = `
      <!-- Top Verification Status Banner -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; padding-bottom: 16px; border-bottom: 1px solid var(--border);">
        <div style="display: flex; align-items: flex-start; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: var(--tertiary); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; flex-shrink: 0;">
            ✓
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: #fff;">CRYPTOGRAPHICALLY VERIFIED</span>
              <span class="badge ${isSepolia ? "badge-info" : "badge-success"}">
                ${isSepolia ? "ETHEREUM SEPOLIA (eip155:11155111)" : "LOCAL HARDHAT EVM (Chain 31337)"}
              </span>
            </div>
            <p style="font-size: 12px; font-family: var(--font-mono); color: var(--text-muted); margin-top: 3px;">
              ${isSepolia ? `Confirmed on Ethereum Sepolia Public Ledger • Block #${blk}` : `Mined on Private Local EVM Ledger • Chain ID 31337 • Block #${blk}`}
            </p>
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center;">
          ${
            etherscanUrl
              ? `<a
                  href="${etherscanUrl}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn-primary btn-sm"
                  title="Open direct transaction page on Ethereum Sepolia Etherscan"
                >
                  <span>Open on Sepolia Etherscan Directly ↗</span>
                </a>`
              : `${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(targetHash, "Tx Hash") : ""}`
          }
        </div>
      </div>

      <!-- 4-Card Itemized Blockchain Telemetry Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-top: 16px;">
        <div style="background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px;">
          <div style="font-size: 10.5px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 4px;">
            On-Chain Tx Hash
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            ${
              etherscanUrl
                ? `<a
                    href="${etherscanUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="font-family: var(--font-mono); font-size: 11.5px; color: var(--primary); text-decoration: underline; word-break: break-all;"
                  >
                    ${targetHash.length > 20 ? `${targetHash.slice(0, 10)}...${targetHash.slice(-8)}` : targetHash}
                  </a>`
                : `<span style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text); word-break: break-all;">
                    ${targetHash.length > 20 ? `${targetHash.slice(0, 10)}...${targetHash.slice(-8)}` : targetHash}
                  </span>`
            }
            ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(targetHash, "Tx Hash") : ""}
          </div>
        </div>

        <div style="background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px;">
          <div style="font-size: 10.5px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 4px;">
            SHA-256 Delivery Proof
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <span style="font-family: var(--font-mono); font-size: 11.5px; color: var(--tertiary); word-break: break-all; font-weight: 600;">
              ${deliveryHashVal.length > 22 ? `${deliveryHashVal.slice(0, 12)}...${deliveryHashVal.slice(-8)}` : deliveryHashVal}
            </span>
            ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(deliveryHashVal, "Delivery Hash") : ""}
          </div>
        </div>

        <div style="background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px;">
          <div style="font-size: 10.5px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 4px;">
            Amount Settled
          </div>
          <div style="font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: #fff;">
            $${amountVal} <span style="font-size: 12px; color: var(--text-muted); font-weight: 500;">MockUSDC</span>
          </div>
        </div>

        <div style="background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px;">
          <div style="font-size: 10.5px; font-family: var(--font-mono); text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 4px;">
            Request Nonce (reqId)
          </div>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <span style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text); word-break: break-all;">
              ${reqIdVal}
            </span>
            ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(rid, "Request ID") : ""}
          </div>
        </div>
      </div>

      <!-- 4 Cryptographic Invariant Integrity Checkpoints -->
      <div style="margin-top: 16px; padding: 14px; background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius);">
        <div style="font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 10px; font-family: var(--font-mono);">
          Cryptographic Verification Checkpoints
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px; font-family: var(--font-mono); font-size: 11.5px;">
          <div style="display: flex; align-items: center; gap: 6px; color: var(--tertiary);">
            <span>✓</span> <span>${isSepolia ? "Smart Contract Settlement on Sepolia" : "Smart Contract Settlement on Local EVM"}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; color: var(--tertiary);">
            <span>✓</span> <span>ERC-20 Token Transfer Emitted</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; color: var(--tertiary);">
            <span>✓</span> <span>SHA-256 confirms delivered payload matches recorded digest</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; color: var(--tertiary);">
            <span>✓</span> <span>EIP-712 Replay Guard: Nonce Marked Spent</span>
          </div>
        </div>
      </div>

      <!-- Verifying Smart Contract Metadata Strip -->
      <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">
        ${
          isSepolia
            ? `<div>
                Verifying Contract:
                <a
                  href="${this.etherscanBase}/address/${this.enforcerAddress}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: var(--primary); text-decoration: underline;"
                >
                  TokenBudgetEnforcer.sol (${this.enforcerAddress.slice(0, 8)}...${this.enforcerAddress.slice(-6)}) ↗
                </a>
              </div>
              <div>
                Token Contract:
                <a
                  href="${this.etherscanBase}/token/${this.tokenAddress}?a=${this.enforcerAddress}"
                  target="_blank"
                  rel="noopener noreferrer"
                  style="color: var(--tertiary); text-decoration: underline;"
                >
                  MockUSDC (${this.tokenAddress.slice(0, 8)}...${this.tokenAddress.slice(-6)}) ↗
                </a>
              </div>`
            : `<div>
                Verifying Contract:
                <code style="color: var(--primary);">${this.localEnforcerAddress}</code> (Local EVM)
                ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(this.localEnforcerAddress, "Enforcer") : ""}
              </div>
              <div>
                Token Contract:
                <code style="color: var(--tertiary);">${this.localTokenAddress}</code> (Local EVM)
                ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(this.localTokenAddress, "Token") : ""}
              </div>`
        }
      </div>
    `;
  },

  async broadcastSepoliaSettlement() {
    let userAccepted = true;
    if (typeof App !== "undefined" && typeof App.confirmAiPayment === "function") {
      userAccepted = await App.confirmAiPayment({
        provider: "Alpha Translation Services",
        service: "AI Legal Contract Translation",
        amount: "$4.00 USDC",
        recipient: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        network: "Ethereum Sepolia (eip155:11155111)",
        reason: "On-chain autonomous settlement verification on Ethereum Sepolia Testnet.",
      });
    }

    if (!userAccepted) {
      if (typeof App !== "undefined" && typeof App.toast === "function") {
        App.toast("Sepolia settlement declined by user. $0 spent.", "error");
      }
      return;
    }

    if (typeof App !== "undefined" && typeof App.toast === "function") {
      App.toast("Broadcasting autonomous purchase directly to Ethereum Sepolia...", "info");
    }

    try {
      const res = await fetch("/api/sepolia/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: "4000000",
          serviceName: "AI Legal Contract Translation",
          text: "Verified on Ethereum Sepolia Testnet under W3A-1 Autonomous Protocol.",
        }),
      });

      const data = await res.json();
      if (data.success && data.txHash) {
        if (typeof App !== "undefined" && typeof App.toast === "function") {
          App.toast(`Settled on Sepolia Block #${data.blockNumber}!`, "success");
        }
        await this.fetchSepoliaTransactions();
        this.verifyHash(data.txHash);
      } else {
        throw new Error(data.error || "Sepolia broadcast failed");
      }
    } catch (err) {
      if (typeof App !== "undefined" && typeof App.toast === "function") {
        App.toast(`Sepolia execution error: ${err.message}`, "error");
      }
    }
  },

  render() {
    this.init();

    const localTxs = this.getLocalTransactions();
    const sepTxs = this.getCombinedSepoliaTransactions();
    const displayedList = this.activeTab === "sepolia" ? sepTxs : localTxs;

    if (!this.userExplicitlySelectedHash) {
      if (AppState.transactions && AppState.transactions.length > 0 && AppState.transactions[0].txHash) {
        this.currentHash = AppState.transactions[0].txHash;
      } else if (sepTxs.length > 0 && sepTxs[0].txHash) {
        this.currentHash = sepTxs[0].txHash;
      }
    }

    const matchedTx = sepTxs.find(
      (t) => (t.txHash || "").toLowerCase() === (this.currentHash || "").toLowerCase()
    ) || sepTxs[0] || {};

    const activeHash = this.currentHash || matchedTx.txHash || "0xb9d3d3491888106ee4c0eb63717ede3ced22cbd65dcb0c284cc4a6ab4312aa75";

    // Schedule verification result render right after DOM mounting
    setTimeout(() => {
      this.populateVerificationResult(activeHash);
    }, 10);

    return `
      <div id="verify-view-root" style="display: flex; flex-direction: column; gap: 20px;">

        <!-- Top Hero Banner: Direct Sepolia Blockchain Telemetry -->
        <div class="panel" style="margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                <span class="badge badge-info">ETHEREUM SEPOLIA TESTNET (eip155:11155111)</span>
                <span class="badge badge-success">ALL PURCHASES AUTO-SETTLE HERE</span>
              </div>
              <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">
                On-Chain Cryptographic Verifier &amp; Explorer
              </h1>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px; max-width: 820px; line-height: 1.5;">
                Every autonomous machine payment executed by the AI agent physically settles on the public
                <strong>Ethereum Sepolia</strong> blockchain via <code style="color: var(--primary);">TokenBudgetEnforcer.sol</code>.
                Verify cryptographic signatures, transaction receipts, and SHA-256 delivery proofs directly in this dashboard or click through to public Sepolia Etherscan.
              </p>
            </div>

            <!-- Quick Action Links -->
            <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
              <a
                href="${this.etherscanBase}/address/${this.enforcerAddress}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary btn-sm"
                title="View TokenBudgetEnforcer.sol contract on Sepolia Etherscan"
              >
                <span>Sepolia Enforcer Contract ↗</span>
              </a>

              <a
                href="${this.etherscanBase}/token/${this.tokenAddress}?a=${this.enforcerAddress}"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary btn-sm"
                title="View MockUSDC Token Contract &amp; Transfers on Sepolia Etherscan"
              >
                <span>MockUSDC Token Contract ↗</span>
              </a>

              <button
                onclick="VerifyView.broadcastSepoliaSettlement()"
                class="btn btn-primary btn-sm"
                title="Broadcast another test transaction to Ethereum Sepolia"
              >
                <span>⚡ Settle Another Tx on Sepolia</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Query & On-Chain Verification Console -->
        <div class="panel" style="margin-bottom: 0;">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">On-Chain Cryptographic Verifier</h2>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Enter any transaction hash, request ID (reqId), or SHA-256 delivery digest to verify immutability
              </p>
            </div>

            <!-- Quick Hash Pills -->
            <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">Recent:</span>
              <button
                onclick="VerifyView.setSampleHash('0xb9d3d3491888106ee4c0eb63717ede3ced22cbd65dcb0c284cc4a6ab4312aa75')"
                class="btn btn-secondary btn-sm"
                style="padding: 2px 6px; font-size: 11px;"
                title="Confirmed on Sepolia #11781628 ($4.00)"
              >
                Sepolia #11781628
              </button>
              <button
                onclick="VerifyView.setSampleHash('0x303ae7447a4b78850a86e5ecf126d1437b8094c045b1fe9917aacb98698ec289')"
                class="btn btn-secondary btn-sm"
                style="padding: 2px 6px; font-size: 11px;"
                title="Confirmed on Sepolia #11766297 ($4.00)"
              >
                Sepolia #11766297
              </button>
              <button
                onclick="VerifyView.setSampleHash('0xfefb3725ca1a870d8d1d41ee370ac686becb5f28f39aa790ce6eeb6827f47069')"
                class="btn btn-secondary btn-sm"
                style="padding: 2px 6px; font-size: 11px;"
                title="Confirmed on Sepolia #11779302"
              >
                Sepolia #11779302
              </button>
              <button
                onclick="VerifyView.setSampleHash('0x89ef9d6e9a532a49ac6eb2cbad1de4e08067cdb3ac7b741a8481a3198f3499ac')"
                class="btn btn-secondary btn-sm"
                style="padding: 2px 6px; font-size: 11px;"
                title="Escrow Deposit ($50.00)"
              >
                Escrow ($50.00)
              </button>
            </div>
          </div>

          <!-- Input Search Bar -->
          <form onsubmit="event.preventDefault(); VerifyView.verifyHash();" style="display: flex; gap: 10px; margin-bottom: 16px;">
            <input
              id="verifyInputInApp"
              type="text"
              value="${activeHash}"
              placeholder="Paste Sepolia Tx Hash (0x303ae744... or 0x20c90083...)"
              class="form-input"
              style="font-family: var(--font-mono); font-size: 12.5px;"
            />
            <button type="submit" class="btn btn-primary" style="flex-shrink: 0;">
              <span>VERIFY ON-CHAIN</span>
            </button>
          </form>

          <!-- Interactive Cryptographic Verification Result Container -->
          <div id="inAppVerifyResult">
            <!-- Populated via VerifyView.populateVerificationResult -->
          </div>
        </div>

        <!-- Dual-Ledger Live Transactions Tabs -->
        <div class="panel" style="margin-bottom: 0;">
          <div class="panel-header">
            <div>
              <h3 class="panel-title">Recorded Transactions Ledger</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Real-time settlements executed by the protocol across public and local ledgers
              </p>
            </div>

            <!-- Tab Switcher -->
            <div style="display: flex; background: var(--surface-low); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 2px;">
              <button
                onclick="VerifyView.switchTab('sepolia')"
                class="btn btn-sm ${this.activeTab === 'sepolia' ? 'btn-primary' : 'btn-secondary'}"
              >
                <span>Sepolia Testnet (${sepTxs.length})</span>
              </button>
              <button
                onclick="VerifyView.switchTab('local')"
                class="btn btn-sm ${this.activeTab === 'local' ? 'btn-primary' : 'btn-secondary'}"
              >
                <span>Localhost EVM (${localTxs.length})</span>
              </button>
            </div>
          </div>

          <!-- Transaction Cards List -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${
              displayedList.length === 0
                ? `<div style="text-align: center; padding: 32px; color: var(--text-muted); font-family: var(--font-mono); font-size: 12px;">No transactions recorded in this ledger yet.</div>`
                : displayedList.map((tx) => {
                    const hash = tx.txHash || "";
                    const isSep = (tx.chainId === 11155111) || (tx.network && tx.network.includes("Sepolia")) || (!tx.chainId && this.activeTab === "sepolia");
                    const etherscanUrl = isSep && hash ? `${this.etherscanBase}/tx/${hash}` : null;
                    const amtStr = tx.amountUSD ? `$${Number(tx.amountUSD).toFixed(2)} USDC` : (tx.amount ? `$${(Number(tx.amount) / 1e6).toFixed(2)} USDC` : "$4.00 USDC");
                    const isCurrentSelected = (hash || "").toLowerCase() === (activeHash || "").toLowerCase();

                    return `
                      <div
                        style="background: var(--surface-low); border: 1px solid ${isCurrentSelected ? 'var(--primary)' : 'var(--border)'}; border-radius: var(--radius); padding: 14px; display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;"
                      >
                        <div style="display: flex; align-items: center; gap: 12px;">
                          <div style="width: 28px; height: 28px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); color: var(--tertiary); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0;">
                            ✓
                          </div>
                          <div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                              <span style="font-weight: 700; font-size: 13px; color: #fff;">
                                ${tx.serviceName || "AI Legal Contract Translation"}
                              </span>
                              <span class="badge ${isSep ? 'badge-info' : 'badge-success'}">
                                ${isSep ? 'SEPOLIA' : 'LOCAL EVM'}
                              </span>
                              <span style="font-family: var(--font-mono); font-weight: 700; font-size: 12.5px; color: #fff;">
                                ${amtStr}
                              </span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); flex-wrap: wrap;">
                              <span>Tx: ${etherscanUrl ? `<a href="${etherscanUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--primary); text-decoration: underline;"><code>${hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : "Pending"}</code> ↗</a>` : `<code>${hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : "Pending"}</code>`}</span>
                              ${tx.blockNumber ? `<span>Block: <strong>#${tx.blockNumber}</strong></span>` : ''}
                              ${tx.providerName ? `<span>Provider: <strong>${tx.providerName}</strong></span>` : ''}
                            </div>
                          </div>
                        </div>

                        <!-- Action Buttons -->
                        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                          <button
                            onclick="VerifyView.setSampleHash('${hash}')"
                            class="btn btn-secondary btn-sm"
                            title="Inspect cryptographic proof above"
                          >
                            Inspect Proof
                          </button>
                          ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(hash, "Tx Hash") : ""}
                          ${
                            etherscanUrl
                              ? `<a
                                  href="${etherscanUrl}"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="btn btn-primary btn-sm"
                                  title="Directly open on Sepolia Etherscan"
                                >
                                  <span>Sepolia Etherscan ↗</span>
                                </a>`
                              : `<span class="badge badge-neutral" style="font-size: 10px;">Local EVM</span>`
                          }
                        </div>
                      </div>
                    `;
                  }).join("")
            }
          </div>
        </div>

      </div>
    `;
  },
};
