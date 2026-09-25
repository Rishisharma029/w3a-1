// =========================================================================
// W3A-1: Autonomous Machine Payments (x402 V2)
// Settings View — Configuration & Contract Architecture
// =========================================================================

const SettingsView = {
  render() {
    const { config, isBackendReachable, isMockMode } = AppState;
    const normBudget = typeof BudgetAdapter !== "undefined"
      ? BudgetAdapter.normalize(AppState.budget)
      : { isFrozen: false };
    const isFrozen = normBudget.isFrozen;

    const ownerAddr = (config && config.ownerAddress) || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const agentAddr = (config && config.agentAddress) || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    const localEnforcer = (config && config.enforcerAddress) || "0xe7f1725E07018023380218241b6253069714BD22";
    const localToken = (config && config.tokenAddress) || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const sepoliaEnforcer = "0xf9f296e97062F49ad3d13aF96729F7c35a7eA75e";
    const sepoliaToken = "0xAaa008Df25A46dc501B5B712ac18B47901AF99A7";
    const sepoliaExplorer = "https://sepolia.etherscan.io";

    return `
      <div id="settings-view-root" style="display: flex; flex-direction: column; gap: 20px;">

        <!-- Header Panel -->
        <div class="panel" style="margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span class="badge">Configuration</span>
                <span style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">Cryptographic &amp; Network Parameters</span>
              </div>
              <h1 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">System Configuration</h1>
              <p style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">
                Verify contract deployments, inspect trust boundaries, and review dual-network parameters.
              </p>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 12px;">
              <span class="status-dot ${isBackendReachable ? 'status-dot-emerald' : (isMockMode ? 'status-dot-amber' : 'status-dot-rose')}"></span>
              <span>${isBackendReachable ? 'Backend Connected' : (isMockMode ? 'Demo Mode Active' : 'Backend Standby')}</span>
            </div>
          </div>
        </div>

        <!-- 1. Cryptographic Authorities -->
        <div class="panel" style="margin: 0;">
          <div class="panel-header">
            <span class="panel-title">1. Keypairs &amp; Cryptographic Authorities</span>
            <span class="badge">EIP-712 Boundaries</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; font-family: var(--font-mono); font-size: 12px;">
            <div style="background: var(--surface-low); padding: 14px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Human Owner Authority</div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span style="font-weight: 700; color: var(--text); word-break: break-all;">
                  ${ownerAddr}
                </span>
                ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(ownerAddr, "Owner Address") : ""}
              </div>
              <p style="color: var(--text-muted); font-size: 11.5px; margin-top: 8px; font-family: var(--font-sans); line-height: 1.4;">
                Authority over deposits, collateral withdrawals, and emergency circuit-breaker freeze controls.
              </p>
            </div>

            <div style="background: var(--surface-low); padding: 14px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Autonomous Agent Signer</div>
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span style="font-weight: 700; color: var(--primary); word-break: break-all;">
                  ${agentAddr}
                </span>
                ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(agentAddr, "Agent Address") : ""}
              </div>
              <p style="color: var(--text-muted); font-size: 11.5px; margin-top: 8px; font-family: var(--font-sans); line-height: 1.4;">
                Authorized EIP-712 signer bounded by hard on-chain allowance and per-call spending ceilings ($5.00 USDC cap).
              </p>
            </div>
          </div>
        </div>

        <!-- 2. Dual-Network Smart Contract Deployments -->
        <div class="panel" style="margin: 0;">
          <div class="panel-header">
            <div>
              <span class="panel-title">2. Dual-Network Smart Contract Deployments</span>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Separate on-chain environments for private local development and public testnet settlement
              </p>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; font-family: var(--font-mono); font-size: 12px;">
            <!-- Local Hardhat EVM -->
            <div style="background: var(--surface-low); padding: 16px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge badge-success">LOCAL HARDHAT EVM</span>
                  <span style="color: var(--text-muted); font-size: 11px;">Chain ID: 31337 (eip155:31337)</span>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">TokenBudgetEnforcer.sol</div>
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                    <code style="color: var(--tertiary); font-size: 11.5px; word-break: break-all;">${localEnforcer}</code>
                    ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(localEnforcer, "Local Enforcer") : ""}
                  </div>
                </div>

                <div>
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">MockUSDC Asset Contract</div>
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                    <code style="color: var(--text); font-size: 11.5px; word-break: break-all;">${localToken}</code>
                    ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(localToken, "Local Token") : ""}
                  </div>
                </div>

                <div style="font-family: var(--font-sans); font-size: 11.5px; color: var(--text-muted); padding-top: 6px; border-top: 1px dashed var(--border);">
                  RPC: <code>http://127.0.0.1:8545</code> • Sub-second mining • Isolated test ledger
                </div>
              </div>
            </div>

            <!-- Ethereum Sepolia Testnet -->
            <div style="background: var(--surface-low); padding: 16px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge badge-info">ETHEREUM SEPOLIA</span>
                  <span style="color: var(--text-muted); font-size: 11px;">Chain ID: 11155111 (eip155:11155111)</span>
                </div>
              </div>

              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">TokenBudgetEnforcer.sol</div>
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                    <a
                      href="${sepoliaExplorer}/address/${sepoliaEnforcer}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="color: var(--primary); text-decoration: underline; font-size: 11.5px; word-break: break-all;"
                    >
                      ${sepoliaEnforcer} ↗
                    </a>
                    ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(sepoliaEnforcer, "Sepolia Enforcer") : ""}
                  </div>
                </div>

                <div>
                  <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">MockUSDC Asset Contract</div>
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                    <a
                      href="${sepoliaExplorer}/token/${sepoliaToken}?a=${sepoliaEnforcer}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="color: var(--tertiary); text-decoration: underline; font-size: 11.5px; word-break: break-all;"
                    >
                      ${sepoliaToken} ↗
                    </a>
                    ${typeof UIFormatter !== "undefined" && UIFormatter.copyButton ? UIFormatter.copyButton(sepoliaToken, "Sepolia Token") : ""}
                  </div>
                </div>

                <div style="font-family: var(--font-sans); font-size: 11.5px; color: var(--text-muted); padding-top: 6px; border-top: 1px dashed var(--border);">
                  Public Ledger • Live Etherscan Explorer • Verified Bytecode
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. EIP-712 Domain Specification -->
        <div class="panel" style="margin: 0;">
          <div class="panel-header">
            <div>
              <span class="panel-title">3. EIP-712 Typed Data Domain Specification</span>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Cryptographic domain separator preventing cross-chain and cross-contract signature replays
              </p>
            </div>
            <span class="badge badge-neutral">RFC-712 Standards</span>
          </div>

          <div style="background: var(--surface-low); padding: 14px; border-radius: var(--radius); border: 1px solid var(--border); font-family: var(--font-mono); font-size: 12px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 12px;">
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Domain Name:</span>
                <div style="color: #fff; font-weight: 700;">TokenBudgetEnforcer</div>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Version:</span>
                <div style="color: #fff; font-weight: 700;">1</div>
              </div>
              <div>
                <span style="color: var(--text-muted); font-size: 11px;">Primary Type:</span>
                <div style="color: var(--tertiary); font-weight: 700;">PermitPayment</div>
              </div>
            </div>

            <div style="padding-top: 8px; border-top: 1px dashed var(--border); font-size: 11px; color: var(--text-muted);">
              Type Definition: <code style="color: var(--text);">PermitPayment(address payer,address payTo,uint256 amount,uint256 nonce,uint256 validBefore)</code>
            </div>
          </div>
        </div>

      </div>
    `;
  }
};
