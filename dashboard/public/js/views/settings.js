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

    const enforcerAddr = config.enforcerAddress || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const tokenAddr = config.tokenAddress || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const ownerAddr = config.ownerAddress || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const agentAddr = config.agentAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

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
                Verify contract deployments, inspect trust boundaries, and manage on-chain budget escrow.
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
              <div style="font-weight: 700; color: var(--text); word-break: break-all; cursor: pointer;" onclick="App.copyText('${ownerAddr}')" title="Click to copy">
                ${ownerAddr} &copy;
              </div>
              <p style="color: var(--text-muted); font-size: 11.5px; margin-top: 8px; font-family: var(--font-sans);">
                Authority over deposits, collateral withdrawals, and emergency circuit-breaker freeze controls.
              </p>
            </div>

            <div style="background: var(--surface-low); padding: 14px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Autonomous Agent Signer</div>
              <div style="font-weight: 700; color: var(--primary); word-break: break-all; cursor: pointer;" onclick="App.copyText('${agentAddr}')" title="Click to copy">
                ${agentAddr} &copy;
              </div>
              <p style="color: var(--text-muted); font-size: 11.5px; margin-top: 8px; font-family: var(--font-sans);">
                Authorized EIP-712 signer bounded by hard on-chain allowance and per-call spending ceilings.
              </p>
            </div>
          </div>
        </div>

        <!-- 2. Smart Contract Infrastructure -->
        <div class="panel" style="margin: 0;">
          <div class="panel-header">
            <span class="panel-title">2. Smart Contract Deployments</span>
            <span class="badge badge-info">Hardhat EVM (31337)</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; font-family: var(--font-mono); font-size: 12px;">
            <div style="background: var(--surface-low); padding: 14px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">TokenBudgetEnforcer.sol</div>
              <div style="font-weight: 700; color: var(--tertiary); word-break: break-all; cursor: pointer;" onclick="App.copyText('${enforcerAddr}')" title="Click to copy">
                ${enforcerAddr} &copy;
              </div>
              <p style="color: var(--text-muted); font-size: 11.5px; margin-top: 8px; font-family: var(--font-sans);">
                Core settlement enforcer: enforces spending ceilings, EIP-712 permit signatures, and delivery digest linkage.
              </p>
            </div>

            <div style="background: var(--surface-low); padding: 14px; border-radius: var(--radius); border: 1px solid var(--border);">
              <div style="color: var(--text-muted); font-size: 11px; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">MockUSDC Asset Contract</div>
              <div style="font-weight: 700; color: var(--text); word-break: break-all; cursor: pointer;" onclick="App.copyText('${tokenAddr}')" title="Click to copy">
                ${tokenAddr} &copy;
              </div>
              <p style="color: var(--text-muted); font-size: 11.5px; margin-top: 8px; font-family: var(--font-sans);">
                6-decimal ERC-20 asset contract used for micro-settlement across autonomous machine services.
              </p>
            </div>
          </div>
        </div>

      </div>
    `;
  }
};
