"use strict";

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("\n========================================================");
  console.log("🚀 DEPLOYING W3A-1 CONTRACTS TO ETHEREUM SEPOLIA TESTNET");
  console.log("========================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer Address : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance : ${ethers.formatEther(balance)} Sepolia ETH\n`);

  if (balance === 0n) {
    throw new Error("Deployer wallet has 0 Sepolia ETH. Please fund with faucet first.");
  }

  // 1. Deploy MockUSDC
  console.log("1. Deploying MockUSDC (6 decimals) to Sepolia...");
  const TokenFactory = await ethers.getContractFactory("MockUSDC");
  const token = await TokenFactory.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`✔ MockUSDC deployed at: ${tokenAddress}`);
  console.log(`  Etherscan: https://sepolia.etherscan.io/address/${tokenAddress}\n`);

  // 2. Deploy TokenBudgetEnforcer
  console.log("2. Deploying TokenBudgetEnforcer.sol to Sepolia...");
  const ownerAddress = deployer.address;
  const agentAddress = deployer.address;

  const EnforcerFactory = await ethers.getContractFactory("TokenBudgetEnforcer");
  const enforcer = await EnforcerFactory.deploy(tokenAddress, ownerAddress, agentAddress);
  await enforcer.waitForDeployment();
  const enforcerAddress = await enforcer.getAddress();
  console.log(`✔ TokenBudgetEnforcer deployed at: ${enforcerAddress}`);
  console.log(`  Etherscan: https://sepolia.etherscan.io/address/${enforcerAddress}\n`);

  // 3. Fund Escrow ($20.00 MockUSDC)
  console.log("3. Funding Escrow with $20.00 MockUSDC on Sepolia...");
  const fundAmount = 20n * 10n ** 6n;
  const approveTx = await token.approve(enforcerAddress, fundAmount);
  console.log(`  Approve Tx broadcasted: ${approveTx.hash}`);
  await approveTx.wait(1);

  const fundTx = await enforcer.fundBudget(fundAmount);
  console.log(`  FundBudget Tx broadcasted: ${fundTx.hash}`);
  await fundTx.wait(1);
  console.log(`✔ Escrow successfully funded with $20.00 MockUSDC!`);
  console.log(`  Etherscan: https://sepolia.etherscan.io/tx/${fundTx.hash}\n`);

  // 4. Update .env file with Sepolia addresses
  const envPath = path.resolve(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    envContent = envContent.replace(/#?\s*SEPOLIA_ENFORCER_ADDRESS=.*/g, `SEPOLIA_ENFORCER_ADDRESS=${enforcerAddress}`);
    envContent = envContent.replace(/#?\s*SEPOLIA_TOKEN_ADDRESS=.*/g, `SEPOLIA_TOKEN_ADDRESS=${tokenAddress}`);
    fs.writeFileSync(envPath, envContent, "utf8");
    console.log("✔ Updated .env with live Sepolia addresses!");
  }

  // 5. Final Summary Banner with clickable links
  console.log("\n========================================================");
  console.log("🎉 SEPOLIA DEPLOYMENT SUCCESSFUL & VERIFIED ON-CHAIN!");
  console.log("========================================================");
  console.log(`Token Contract:    https://sepolia.etherscan.io/address/${tokenAddress}`);
  console.log(`Enforcer Contract: https://sepolia.etherscan.io/address/${enforcerAddress}`);
  console.log(`Escrow Deposit Tx: https://sepolia.etherscan.io/tx/${fundTx.hash}`);
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("❌ Sepolia deployment failed:", err.message);
  process.exit(1);
});
