"use strict";

const { ethers } = require("ethers");
const path       = require("path");
const fs         = require("fs");

// ABI — only the functions we need from the contract
const VERIFIER_ABI = [
  "function verifyAuthorization(bytes32 reqId, uint256 amount) external view returns (bool)",
  "function remainingBudget() external view returns (uint256)",
  "function totalSpent() external view returns (uint256)",
  "function maxBudget() external view returns (uint256)",
];

class ContractVerifier {
  constructor(contractAddress, ethersProvider) {
    this.contract = new ethers.Contract(
      contractAddress,
      VERIFIER_ABI,
      ethersProvider
    );
  }

  async verifyAuthorization(reqId, amount) {
    return this.contract.verifyAuthorization(reqId, amount);
  }

  async getBudgetState() {
    const [maxBudget, totalSpent, remaining] = await Promise.all([
      this.contract.maxBudget(),
      this.contract.totalSpent(),
      this.contract.remainingBudget(),
    ]);
    return { maxBudget, totalSpent, remaining };
  }
}

module.exports = { ContractVerifier };
