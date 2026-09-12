require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      // Local in-process Hardhat network — default for tests
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Uncomment for Phase 2 Sepolia deployment
    // sepolia: {
    //   url: process.env.SEPOLIA_RPC_URL || "",
    //   accounts: process.env.OWNER_PRIVATE_KEY ? [process.env.OWNER_PRIVATE_KEY] : [],
    // },
  },
  paths: {
    sources: "./contracts",
    // "test" is used by: npx hardhat test (contract unit tests only)
    // Integration tests are in test/integration/ and run via:
    //   npx hardhat test test/integration/flow.test.js
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 60000, // 60 s — contract deploys can be slow on first run
  },
};
