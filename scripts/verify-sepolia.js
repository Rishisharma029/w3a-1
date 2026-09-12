/**
 * scripts/verify-sepolia.js
 *
 * Phase 4 — Sepolia Testnet Read-Only Verification
 * =================================================
 * Read-only script to verify deployed contract state on Sepolia.
 * NEVER commits secrets. NEVER sends transactions.
 * Only reads public contract state via ethers.js JsonRpcProvider.
 *
 * Usage:
 *   SEPOLIA_RPC_URL=<rpc_url> \
 *   ENFORCER_ADDRESS=<address> \
 *   TOKEN_ADDRESS=<address> \
 *   node scripts/verify-sepolia.js
 *
 * OR with .env file containing those variables.
 */

"use strict";

const { ethers } = require("ethers");
const chalk = require("chalk");
require("dotenv").config();

const ENFORCER_ABI = [
  "function owner() view returns (address)",
  "function agent() view returns (address)",
  "function isFrozen() view returns (bool)",
  "function totalFunded() view returns (uint256)",
  "function authorizedBudget() view returns (uint256)",
  "function settledSpend() view returns (uint256)",
  "function remainingBudget() view returns (uint256)",
  "function unspentEscrow() view returns (uint256)",
  "function isRequestUsed(bytes32) view returns (bool)",
  "function token() view returns (address)",
];

const TOKEN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

function formatUSDC(val) {
  return `$${(Number(val) / 1e6).toFixed(6)} USDC`;
}

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const enforcerAddress = process.env.ENFORCER_ADDRESS;
  const tokenAddress = process.env.TOKEN_ADDRESS;

  console.log(chalk.bold.cyan("\n╔══════════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║    W3A-1 — Sepolia Testnet Contract Verification (READ-ONLY)  ║"));
  console.log(chalk.bold.cyan("╚══════════════════════════════════════════════════════════════╝\n"));

  if (!rpcUrl || !enforcerAddress) {
    console.log(chalk.yellow("  ⚠  SEPOLIA_RPC_URL and ENFORCER_ADDRESS env vars required."));
    console.log(chalk.white("     Set them in .env or export to shell before running.\n"));
    console.log(chalk.gray("  Example:"));
    console.log(chalk.gray("    SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY"));
    console.log(chalk.gray("    ENFORCER_ADDRESS=0x..."));
    console.log(chalk.gray("    TOKEN_ADDRESS=0x..."));
    console.log(chalk.gray("    node scripts/verify-sepolia.js\n"));
    console.log(chalk.blue("  NOTE: For local Hardhat verification, run: hardhat run scripts/gas-report.js\n"));
    process.exit(0);
  }

  console.log(chalk.white(`  Network:          Sepolia Testnet (chainId 11155111)`));
  console.log(chalk.white(`  RPC URL:          ${rpcUrl.replace(/\/[a-f0-9]{32}/, "/***redacted***")}`));
  console.log(chalk.white(`  Enforcer Address: ${enforcerAddress}`));
  if (tokenAddress) console.log(chalk.white(`  Token Address:    ${tokenAddress}\n`));

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Verify network
  const network = await provider.getNetwork();
  if (network.chainId !== 11155111n) {
    console.error(chalk.red(`  ✘ Wrong network! Expected Sepolia (11155111), got ${network.chainId}`));
    process.exit(1);
  }
  console.log(chalk.green(`  ✔  Connected to Sepolia (chainId: ${network.chainId})\n`));

  // Verify enforcer exists
  const code = await provider.getCode(enforcerAddress);
  if (code === "0x") {
    console.error(chalk.red(`  ✘ No contract found at ${enforcerAddress}`));
    process.exit(1);
  }
  console.log(chalk.green(`  ✔  Contract bytecode found at ${enforcerAddress} (${(code.length / 2 - 1)} bytes)\n`));

  const enforcer = new ethers.Contract(enforcerAddress, ENFORCER_ABI, provider);

  // Read all state
  try {
    const [owner, agent, isFrozen, totalFunded, authorized, settled, remaining, unspent, onChainToken] = await Promise.all([
      enforcer.owner(),
      enforcer.agent(),
      enforcer.isFrozen(),
      enforcer.totalFunded(),
      enforcer.authorizedBudget(),
      enforcer.settledSpend(),
      enforcer.remainingBudget(),
      enforcer.unspentEscrow(),
      enforcer.token(),
    ]);

    console.log(chalk.bold.white("  ── Contract State ─────────────────────────────────────────────────"));
    console.log(chalk.white(`     Owner Address:       ${owner}`));
    console.log(chalk.white(`     Agent Address:       ${agent}`));
    console.log(chalk.white(`     Agent Frozen:        ${isFrozen ? chalk.red("YES ⚠") : chalk.green("NO ✔")}`));
    console.log(chalk.white(`     Token Address:       ${onChainToken}`));
    console.log("");
    console.log(chalk.bold.white("  ── Budget State ───────────────────────────────────────────────────"));
    console.log(chalk.white(`     Total Funded:        ${formatUSDC(totalFunded)}`));
    console.log(chalk.white(`     Authorized Budget:   ${formatUSDC(authorized)}`));
    console.log(chalk.white(`     Settled Spend:       ${formatUSDC(settled)}`));
    console.log(chalk.white(`     Remaining Budget:    ${formatUSDC(remaining)}`));
    console.log(chalk.white(`     Unspent Escrow:      ${formatUSDC(unspent)}`));

    // Invariant checks
    console.log("");
    console.log(chalk.bold.white("  ── Invariant Verification ──────────────────────────────────────────"));
    const inv1 = remaining === authorized - settled;
    const inv2 = unspent <= authorized;
    const inv4 = settled <= authorized;
    console.log(inv1 ? chalk.green(`  ✔  INV-01: remaining == authorized - settled`) : chalk.red(`  ✘  INV-01 VIOLATED`));
    console.log(inv4 ? chalk.green(`  ✔  INV-04: settledSpend <= authorizedBudget`) : chalk.red(`  ✘  INV-04 VIOLATED`));
    console.log(inv2 ? chalk.green(`  ✔  INV-02: unspentEscrow <= authorizedBudget`) : chalk.red(`  ✘  INV-02 violated`));

    // Token details if address provided
    if (tokenAddress && tokenAddress !== "undefined") {
      const tokenCode = await provider.getCode(tokenAddress);
      if (tokenCode !== "0x") {
        const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
        const [name, symbol, decimals, supply, contractBalance] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.decimals(),
          tokenContract.totalSupply(),
          tokenContract.balanceOf(enforcerAddress),
        ]);
        console.log("");
        console.log(chalk.bold.white("  ── Token State ─────────────────────────────────────────────────────"));
        console.log(chalk.white(`     Name:               ${name}`));
        console.log(chalk.white(`     Symbol:             ${symbol}`));
        console.log(chalk.white(`     Decimals:           ${decimals}`));
        console.log(chalk.white(`     Total Supply:       ${formatUSDC(supply)}`));
        console.log(chalk.white(`     Enforcer Balance:   ${formatUSDC(contractBalance)}`));
        const inv2actual = contractBalance === unspent;
        console.log(inv2actual ? chalk.green(`  ✔  INV-02: token.balanceOf(contract) == unspentEscrow()`) : chalk.red(`  ✘  INV-02 VIOLATED: balanceOf != unspentEscrow`));
      }
    }

    console.log("");
    console.log(chalk.bold.green("  ✔  Sepolia verification complete. All readable state verified.\n"));
    console.log(chalk.blue("  IMPORTANT: This script is READ-ONLY. No transactions were sent.\n"));

  } catch (err) {
    console.error(chalk.red(`\n  ✘  Contract read failed: ${err.message}`));
    console.error(chalk.gray("     Check that the address is correct and the ABI matches deployed bytecode."));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
