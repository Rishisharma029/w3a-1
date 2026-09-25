// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @notice Test ERC-20 token simulating USDC with 6 decimals for local testing and Sepolia.
 *         Allows public minting in test environments so any test actor can fund accounts.
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6;

    constructor() ERC20("Mock USD Coin", "MockUSDC") Ownable(msg.sender) {
        // Mint 1,000,000 MockUSDC to deployer for setup/testing
        _mint(msg.sender, 1_000_000 * (10 ** _DECIMALS));
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @notice Test faucet minting for local development and testnets.
     * @param to Recipient address
     * @param amount Amount in 6-decimal units (e.g. 10 * 10^6 = 10 USDC)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
