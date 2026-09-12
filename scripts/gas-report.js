/**
 * scripts/gas-report.js
 *
 * Phase 4 — Gas Cost Inspection Report
 * ======================================
 * Measures gas used for each critical contract operation:
 *   1. Token approval + fundBudget (owner funds escrow)
 *   2. authorizePayment (agent direct authorization)
 *   3. settleWithSignature (EIP-712 signed atomic settlement)
 *   4. settlePayment (settlement of pre-authorized payment)
 *   5. freezeAgent (owner emergency freeze)
 *   6. withdrawUnspent (owner reclaims tokens)
 *   7. setAuthorizedBudget (owner adjusts cap)
 *
 * Run with: node scripts/gas-report.js
 * OR:       hardhat run scripts/gas-report.js
 */

"use strict";

const { ethers } = require("hardhat");
const chalk = require("chalk");

const DECIMALS = 6;
const ONE_USDC = 10n ** BigInt(DECIMALS);

async function main() {
  console.log(chalk.bold.cyan("\n╔══════════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║     W3A-1 — Phase 4 Gas Cost Inspection Report               ║"));
  console.log(chalk.bold.cyan("╚══════════════════════════════════════════════════════════════╝\n"));

  const [ownerSigner, agentSigner, providerSigner] = await ethers.getSigners();

  // --- Deploy ---
  const TokenFactory = await ethers.getContractFactory("MockUSDC");
  const token = await TokenFactory.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  const EnforcerFactory = await ethers.getContractFactory("TokenBudgetEnforcer");
  const enforcer = await EnforcerFactory.deploy(tokenAddress, ownerSigner.address, agentSigner.address);
  await enforcer.waitForDeployment();
  const enforcerAddress = await enforcer.getAddress();

  console.log(chalk.white(`  MockUSDC deployed at:          ${tokenAddress}`));
  console.log(chalk.white(`  TokenBudgetEnforcer deployed at: ${enforcerAddress}\n`));

  const results = [];

  function record(op, gas, desc) {
    results.push({ op, gas: Number(gas), desc });
    const gasStr = Number(gas).toLocaleString();
    const costUSD = (Number(gas) * 20 * 1e-9 * 3000).toFixed(4); // ~20 gwei, $3000 ETH
    console.log(
      chalk.green(`  ✔ `) +
      chalk.bold(op.padEnd(30)) +
      chalk.yellow(`${gasStr.padStart(10)} gas`) +
      chalk.gray(` ≈ \$${costUSD} @ 20 gwei, \$3000/ETH`)
    );
    if (desc) console.log(chalk.gray(`       ${desc}`));
  }

  // 1. fundBudget
  const budget = 20n * ONE_USDC;
  let approveTx = await token.connect(ownerSigner).approve(enforcerAddress, budget);
  await approveTx.wait();
  let tx = await enforcer.connect(ownerSigner).fundBudget(budget);
  let receipt = await tx.wait();
  record("fundBudget($20 USDC)", receipt.gasUsed, "Owner deposits tokens into escrow, sets budget cap");

  // 2. setAuthorizedBudget
  tx = await enforcer.connect(ownerSigner).setAuthorizedBudget(15n * ONE_USDC);
  receipt = await tx.wait();
  record("setAuthorizedBudget($15)", receipt.gasUsed, "Owner adjusts spending cap (≥ settled spend)");

  // 3. authorizePayment (agent direct on-chain)
  const reqId1 = ethers.id("gas-req-1");
  const validBefore = Math.floor(Date.now() / 1000) + 300;
  tx = await enforcer.connect(agentSigner).authorizePayment(
    reqId1, providerSigner.address, 4n * ONE_USDC, validBefore
  );
  receipt = await tx.wait();
  record("authorizePayment", receipt.gasUsed, "Agent pre-authorizes payment on-chain before delivery");

  // 4. settlePayment (settle pre-authorized)
  const deliveryHash1 = ethers.keccak256(ethers.toUtf8Bytes("delivery-gas-1"));
  tx = await enforcer.connect(ownerSigner).settlePayment(reqId1, deliveryHash1);
  receipt = await tx.wait();
  record("settlePayment (pre-authorized)", receipt.gasUsed, "Facilitator settles a pre-authorized payment, ERC-20 transfer");

  // 5. settleWithSignature (EIP-712 atomic — the main flow)
  const reqId2 = ethers.id("gas-req-2");
  const domain = {
    name: "TokenBudgetEnforcer", version: "1", chainId: 31337,
    verifyingContract: enforcerAddress,
  };
  const types = {
    PaymentAuthorization: [
      { name: "reqId", type: "bytes32" },
      { name: "provider", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "validBefore", type: "uint256" },
    ],
  };
  const value = { reqId: reqId2, provider: providerSigner.address, amount: 4n * ONE_USDC, validBefore };
  const signature = await agentSigner.signTypedData(domain, types, value);
  const deliveryHash2 = ethers.keccak256(ethers.toUtf8Bytes("delivery-gas-2"));

  tx = await enforcer.connect(ownerSigner).settleWithSignature(
    reqId2, providerSigner.address, 4n * ONE_USDC, validBefore, deliveryHash2, signature
  );
  receipt = await tx.wait();
  record("settleWithSignature (EIP-712)", receipt.gasUsed, "Atomic: verify sig + budget check + ERC-20 transfer — CRITICAL PATH");

  // 6. freezeAgent
  tx = await enforcer.connect(ownerSigner).freezeAgent(true);
  receipt = await tx.wait();
  record("freezeAgent(true)", receipt.gasUsed, "Owner emergency freeze — instant halt for all settlements");

  tx = await enforcer.connect(ownerSigner).freezeAgent(false);
  receipt = await tx.wait();
  record("freezeAgent(false)", receipt.gasUsed, "Owner unfreeze — resume normal operations");

  // 7. withdrawUnspent
  const reqId3 = ethers.id("gas-req-3");
  const v3 = { reqId: reqId3, provider: providerSigner.address, amount: 3n * ONE_USDC, validBefore };
  const sig3 = await agentSigner.signTypedData(domain, types, v3);
  const dHash3 = ethers.keccak256(ethers.toUtf8Bytes("delivery-gas-3"));
  await (await enforcer.connect(ownerSigner).settleWithSignature(
    reqId3, providerSigner.address, 3n * ONE_USDC, validBefore, dHash3, sig3
  )).wait();

  tx = await enforcer.connect(ownerSigner).withdrawUnspent(1n * ONE_USDC);
  receipt = await tx.wait();
  record("withdrawUnspent($1 USDC)", receipt.gasUsed, "Owner reclaims unspent tokens from escrow");

  // --- Summary ---
  console.log("\n" + chalk.cyan("─".repeat(72)));
  console.log(chalk.bold.white("  Summary"));
  console.log(chalk.cyan("─".repeat(72)));

  const sorted = [...results].sort((a, b) => b.gas - a.gas);
  for (const r of sorted) {
    const bar = "█".repeat(Math.round(r.gas / 5000));
    console.log(chalk.gray(`  ${r.op.padEnd(35)} ${bar}`));
  }

  const critical = results.find((r) => r.op.includes("settleWithSignature"));
  console.log(chalk.yellow(`\n  Critical path (settleWithSignature): ${Number(critical.gas).toLocaleString()} gas`));

  const totalEth = results.reduce((s, r) => s + r.gas, 0) * 20 * 1e-9;
  console.log(chalk.white(`  Total for all operations: ${results.reduce((s, r) => s + r.gas, 0).toLocaleString()} gas`));
  console.log(chalk.white(`  @ 20 gwei/gas, $3000/ETH: ~\$${(totalEth * 3000).toFixed(4)} USD total\n`));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
