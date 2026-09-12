/**
 * scripts/deploy.js
 *
 * Deploys BudgetEnforcer to the configured network and prints the address.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network localhost
 *   npx hardhat run scripts/deploy.js --network sepolia   (Phase 2)
 *
 * For local use in tests/demo the contract is deployed programmatically
 * via ethers.js ContractFactory — this script is for standalone deployment.
 */

"use strict";

const { ethers } = require("hardhat");

async function main() {
  const [deployer, agentWallet] = await ethers.getSigners();

  console.log("Deployer :", deployer.address);
  console.log("Agent    :", agentWallet.address);

  const maxBudget = 10n; // 10 budget units

  const Factory = await ethers.getContractFactory("BudgetEnforcer");
  const contract = await Factory.deploy(
    deployer.address,
    agentWallet.address,
    maxBudget
  );
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\nBudgetEnforcer deployed to:", address);
  console.log("Max budget:", maxBudget.toString(), "units");
  console.log("\nAdd to .env:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
