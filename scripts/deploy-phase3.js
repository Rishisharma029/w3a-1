/**
 * scripts/deploy-phase3.js
 *
 * Deployment script for Phase 3: MockUSDC + TokenBudgetEnforcer
 * Supports local Hardhat node and Ethereum Sepolia testnet.
 *
 * Usage:
 *   Local:   npx hardhat run scripts/deploy-phase3.js --network localhost
 *   Sepolia: npx hardhat run scripts/deploy-phase3.js --network sepolia
 */

"use strict";

const { ethers, network } = require("hardhat");
require("dotenv").config();

async function main() {
  console.log(`\n========================================================`);
  console.log(`Deploying W3A-1 Phase 3 to Network: ${network.name}`);
  console.log(`========================================================\n`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address : ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer ETH     : ${ethers.formatEther(balance)} ETH\n`);

  // 1. Deploy or reuse MockUSDC
  let tokenAddress = process.env.TOKEN_ADDRESS;
  let token;

  if (!tokenAddress) {
    console.log(`Deploying new MockUSDC token...`);
    const TokenFactory = await ethers.getContractFactory("MockUSDC");
    token = await TokenFactory.deploy();
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    console.log(`✔ MockUSDC deployed at: ${tokenAddress}`);
  } else {
    console.log(`✔ Reusing existing token at: ${tokenAddress}`);
    token = await ethers.getContractAt("MockUSDC", tokenAddress);
  }

  // 2. Deploy TokenBudgetEnforcer
  const ownerAddress = process.env.OWNER_ADDRESS || deployer.address;
  const agentAddress = process.env.AGENT_ADDRESS || deployer.address;

  console.log(`Owner address    : ${ownerAddress}`);
  console.log(`Agent address    : ${agentAddress}`);
  console.log(`Deploying TokenBudgetEnforcer...`);

  const EnforcerFactory = await ethers.getContractFactory("TokenBudgetEnforcer");
  const enforcer = await EnforcerFactory.deploy(tokenAddress, ownerAddress, agentAddress);
  await enforcer.waitForDeployment();
  const enforcerAddress = await enforcer.getAddress();

  console.log(`✔ TokenBudgetEnforcer deployed at: ${enforcerAddress}\n`);

  // 3. Optional initial funding
  const fundAmountUSDC = process.env.INITIAL_FUNDING_USDC || "20";
  if (Number(fundAmountUSDC) > 0 && token) {
    try {
      const fundUnits = BigInt(Math.round(Number(fundAmountUSDC) * 1e6));
      console.log(`Funding budget with ${fundAmountUSDC} MockUSDC...`);
      const approveTx = await token.approve(enforcerAddress, fundUnits);
      await approveTx.wait();
      const fundTx = await enforcer.fundBudget(fundUnits);
      await fundTx.wait();
      console.log(`✔ Budget funded with ${fundAmountUSDC} MockUSDC (tx: ${fundTx.hash})`);
    } catch (err) {
      console.warn(`Initial funding skipped or failed: ${err.message}`);
    }
  }

  console.log(`\n========================================================`);
  console.log(`DEPLOYMENT COMPLETE`);
  console.log(`========================================================`);
  console.log(`TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`ENFORCER_ADDRESS=${enforcerAddress}`);
  console.log(`NETWORK=${network.name}`);
  console.log(`========================================================\n`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
