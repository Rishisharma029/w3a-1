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
