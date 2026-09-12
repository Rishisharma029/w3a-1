/**
 * provider/verifier.js
 *
 * Wrapper around the BudgetEnforcer contract's verifyAuthorization view.
 *
 * The provider calls this BEFORE delivering content.  It is a read-only
 * call (no gas cost in production; free on local Hardhat node).
 *
 * Security note
 * -------------
 * The provider trusts the CONTRACT, not the agent.  The agent could send a
 * fake txHash or claim it authorized a different amount.  This call goes
 * directly to the chain/node and verifies that:
 *   1. The reqId has been marked as used in the contract.
 *   2. The amount recorded in the contract matches what the provider quoted.
 *
 * A mismatch on either point means the provider does NOT deliver.
 */

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
  /**
   * @param {string} contractAddress  Deployed BudgetEnforcer address
   * @param {ethers.Provider} provider  ethers.js provider
   */
  constructor(contractAddress, ethersProvider) {
    this.contract = new ethers.Contract(
      contractAddress,
      VERIFIER_ABI,
      ethersProvider
    );
  }

  /**
   * Verify that reqId was authorized in the contract for exactly `amount`.
   *
   * @param {string} reqId   bytes32 hex string (0x-prefixed)
   * @param {bigint} amount  Expected authorized amount in budget units
   * @returns {Promise<boolean>}
   */
  async verifyAuthorization(reqId, amount) {
    return this.contract.verifyAuthorization(reqId, amount);
  }

  /**
   * Convenience: return current spend state for logging.
   * @returns {Promise<{maxBudget: bigint, totalSpent: bigint, remaining: bigint}>}
   */
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
