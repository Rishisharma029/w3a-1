/**
 * dashboard/public/js/views/settings.js
 *
 * Page 7: Settings & System Infrastructure Configuration
 * ========================================================
 * Structured into:
 *   1. IDENTITY & AUTHORITY (Owner and Agent Public Wallets)
 *   2. ON-CHAIN CONTRACT INFRASTRUCTURE (Enforcer & ERC-20 Addresses)
 *   3. PROTOCOL & NETWORK PARAMETERS (x402 V2, CAIP-2, EIP-712 Domain)
 *   4. DEPLOYMENT & RPC DIAGNOSTICS (Ports, Endpoints, Health)
 *   5. OWNER ESCROW & DEFENSE ACTIONS (Fund Escrow & Freeze Circuit Breaker)
 */

const SettingsView = {
  render() {
    const { config, isBackendReachable, isMockMode } = AppState;
    const normBudget = BudgetAdapter.normalize(AppState.budget);
    const isFrozen = normBudget.isFrozen;

    const enforcerAddr = config.enforcerAddress || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const tokenAddr = config.tokenAddress || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const ownerAddr = config.ownerAddress || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const agentAddr = config.agentAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    return `
      <div class="space-y-6">

        <!-- Header -->
        <div class="rounded-2xl bg-surface-low/90 border border-outline-variant/40 p-6 backdrop-blur-md">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-outline">System Infrastructure</span>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-secondary/15 text-secondary border border-secondary/30">
                  EVM Configurations
                </span>
              </div>
              <h1 class="font-headline text-2xl lg:text-3xl font-bold text-white tracking-tight">System Settings & Architecture</h1>
              <p class="text-sm text-on-surface-variant mt-1 leading-relaxed">
                Verify contract deployments, inspect trust boundaries, and manage on-chain budget escrow.
              </p>
            </div>
            <div class="flex items-center gap-2 font-mono text-xs">
              <span class="status-dot ${isBackendReachable ? "status-dot-emerald" : "status-dot-amber"}"></span>
              <span class="text-on-surface">${isBackendReachable ? "Backend Live (Port 14300)" : isMockMode ? "Demo Mode Active" : "Backend Standby"}</span>
            </div>
          </div>
        </div>

        <!-- ===================================================================
             1. IDENTITY & AUTHORITY BOUNDARIES
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-4">
          <div class="flex items-center gap-2.5">
            <div class="w-2 h-5 bg-secondary rounded-sm glow-cyan"></div>
            <h2 class="font-headline text-base font-bold text-white tracking-tight">1. Identity & Cryptographic Authority</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] text-outline uppercase font-sans font-bold">Human Owner Wallet (Admin Authority)</span>
                ${UIFormatter.copyButton(ownerAddr, "Owner Address")}
              </div>
              <p class="text-white font-bold break-all select-all">${ownerAddr}</p>
              <p class="text-[10px] text-on-surface-variant font-sans border-t border-outline-variant/20 pt-1.5">
                Full authority to deposit funds, withdraw unspent collateral, and execute emergency freeze.
              </p>
            </div>

            <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] text-outline uppercase font-sans font-bold">AI Agent Wallet (Purchasing Signer)</span>
                ${UIFormatter.copyButton(agentAddr, "Agent Address")}
              </div>
              <p class="text-secondary font-bold break-all select-all">${agentAddr}</p>
              <p class="text-[10px] text-on-surface-variant font-sans border-t border-outline-variant/20 pt-1.5">
                Authorized EIP-712 signer; strictly bounded by on-chain budget ceiling and single-use nonces.
              </p>
            </div>
          </div>
        </div>

        <!-- ===================================================================
             2. ON-CHAIN CONTRACT INFRASTRUCTURE
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-4">
          <div class="flex items-center gap-2.5">
            <div class="w-2 h-5 bg-secondary rounded-sm glow-cyan"></div>
            <h2 class="font-headline text-base font-bold text-white tracking-tight">2. Smart Contract Infrastructure</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] text-outline uppercase font-sans font-bold">TokenBudgetEnforcer.sol (Enforcer)</span>
                ${UIFormatter.copyButton(enforcerAddr, "Enforcer Contract Address")}
              </div>
              <p class="text-primary font-bold break-all select-all">${enforcerAddr}</p>
              <p class="text-[10px] text-on-surface-variant font-sans border-t border-outline-variant/20 pt-1.5">
                Core hackathon contract: enforces hard spending limits, EIP-712 signatures, and delivery hash linkage.
              </p>
            </div>

            <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] text-outline uppercase font-sans font-bold">MockUSDC ERC-20 Asset Contract</span>
                ${UIFormatter.copyButton(tokenAddr, "Token Contract Address")}
              </div>
              <p class="text-tertiary font-bold break-all select-all">${tokenAddr}</p>
              <p class="text-[10px] text-on-surface-variant font-sans border-t border-outline-variant/20 pt-1.5">
                6-decimal token contract used for simulated micro-settlement across providers.
              </p>
            </div>
          </div>
        </div>

        <!-- ===================================================================
             3. PROTOCOL & NETWORK SPECIFICATIONS
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-4">
          <div class="flex items-center gap-2.5">
            <div class="w-2 h-5 bg-secondary rounded-sm glow-cyan"></div>
            <h2 class="font-headline text-base font-bold text-white tracking-tight">3. Protocol & Network Specifications</h2>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div class="p-3.5 rounded-xl bg-surface-lowest border border-outline-variant/30">
              <p class="text-[10px] text-outline uppercase font-sans">Protocol Specification</p>
              <p class="text-white font-bold mt-1">x402 V2 EXACT</p>
            </div>
            <div class="p-3.5 rounded-xl bg-surface-lowest border border-outline-variant/30">
              <p class="text-[10px] text-outline uppercase font-sans">CAIP-2 Network</p>
              <p class="text-secondary font-bold mt-1">${config.networkCaip2 || "eip155:31337"}</p>
            </div>
            <div class="p-3.5 rounded-xl bg-surface-lowest border border-outline-variant/30">
              <p class="text-[10px] text-outline uppercase font-sans">EIP-712 Domain</p>
              <p class="text-primary font-bold mt-1">TokenBudgetEnforcer</p>
            </div>
            <div class="p-3.5 rounded-xl bg-surface-lowest border border-outline-variant/30">
              <p class="text-[10px] text-outline uppercase font-sans">Replay Protection</p>
              <p class="text-tertiary font-bold mt-1">Single-Use Nonce</p>
            </div>
          </div>
        </div>

        <!-- ===================================================================
             4. RPC & LOCAL DEPLOYMENT DIAGNOSTICS
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-4">
          <div class="flex items-center gap-2.5">
            <div class="w-2 h-5 bg-secondary rounded-sm glow-cyan"></div>
            <h2 class="font-headline text-base font-bold text-white tracking-tight">4. Network Ports & Process Endpoints</h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div class="p-3.5 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center justify-between">
              <div>
                <p class="text-[10px] text-outline uppercase font-sans">Owner Dashboard</p>
                <p class="text-white font-bold">http://localhost:14300</p>
              </div>
              <span class="w-2 h-2 rounded-full bg-tertiary"></span>
            </div>
            <div class="p-3.5 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center justify-between">
              <div>
                <p class="text-[10px] text-outline uppercase font-sans">x402 Marketplace</p>
                <p class="text-secondary font-bold">http://localhost:14210</p>
              </div>
              <span class="w-2 h-2 rounded-full bg-secondary"></span>
            </div>
            <div class="p-3.5 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center justify-between">
              <div>
                <p class="text-[10px] text-outline uppercase font-sans">Hardhat EVM Node</p>
                <p class="text-primary font-bold">http://localhost:8545</p>
              </div>
              <span class="w-2 h-2 rounded-full bg-primary"></span>
            </div>
          </div>
        </div>

        <!-- ===================================================================
             5. OWNER ESCROW & EMERGENCY ACTIONS
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 space-y-4">
          <div class="flex items-center gap-2.5">
            <div class="w-2 h-5 bg-secondary rounded-sm glow-cyan"></div>
            <h2 class="font-headline text-base font-bold text-white tracking-tight">5. Owner Escrow Management & Emergency Circuit Breaker</h2>
          </div>
          <div class="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-surface-lowest border border-outline-variant/30">
            <div>
              <p class="text-xs font-bold text-white font-sans">Emergency Circuit Breaker Trigger</p>
              <p class="text-xs text-on-surface-variant font-mono mt-0.5">
                Current status: <strong class="${isFrozen ? "text-error" : "text-tertiary"} font-bold">${isFrozen ? "FROZEN (Agent Halted)" : "ACTIVE (Agent Permitted)"}</strong>
              </p>
            </div>
            <button
              onclick="App.openFreezeModal()"
              class="px-4 py-2 text-xs font-mono font-bold rounded-xl ${
                isFrozen ? "bg-tertiary/20 hover:bg-tertiary/30 text-tertiary border border-tertiary/50 glow-emerald" : "bg-error-container/80 hover:bg-error-container text-white border border-error/50 glow-crimson"
              } transition shadow-md"
            >
              ${isFrozen ? "UNFREEZE AGENT" : "EMERGENCY FREEZE"}
            </button>
          </div>
        </div>

      </div>
    `;
  },
};
