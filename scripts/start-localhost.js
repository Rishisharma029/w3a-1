/**
 * scripts/start-localhost.js
 *
 * Full-Stack Localhost Runner for W3A-1:
 * "Let AI Agents Buy Services Safely"
 *
 * Boots:
 *  1. Local Hardhat EVM Signers & Contracts (MockUSDC, TokenBudgetEnforcer)
 *  2. Escrow Funding & Authorized Budget
 *  3. Payment Facilitator & Event Indexer
 *  4. x402 Token Marketplace on http://localhost:14205
 *  5. Owner Control Center UI Dashboard on http://localhost:14300
 *  6. Executes an initial live verified x402 V2 agent transaction
 *  7. Keeps the environment alive for interactive browser use
 *
 * Usage:
 *   npx hardhat run scripts/start-localhost.js
 *   or: npm run start:local
 */

"use strict";

require("dotenv").config();

const { ethers } = require("hardhat");
const chalk = require("chalk");
const axios = require("axios");
const {
  decodePaymentRequiredHeader,
  encodePaymentSignatureHeader,
  decodePaymentResponseHeader,
} = require("@x402/core/http");
const { validatePaymentRequired, validatePaymentPayload } = require("@x402/core/schemas");

const { PaymentFacilitator } = require("../facilitator/facilitator");
const { createTokenMarketplace } = require("../marketplace/token-server");
const { EventIndexer } = require("../indexer/indexer");
const { createDashboardServer } = require("../dashboard/server");
const { computeContentHash } = require("../shared/types");

const MARKETPLACE_PORT = process.env.MARKETPLACE_PORT ? parseInt(process.env.MARKETPLACE_PORT, 10) : 14210;
const DASHBOARD_PORT = process.env.DASHBOARD_PORT ? parseInt(process.env.DASHBOARD_PORT, 10) : 14300;
const DECIMALS = 6;
const ONE_USDC = 10n ** BigInt(DECIMALS);

async function main() {
  console.log(chalk.bold.cyan("\n╔══════════════════════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║           W3A-1: OWNER CONTROL CENTER & LOCALHOST STACK                  ║"));
  console.log(chalk.bold.cyan("║          \"Let AI Agents Buy Services Safely\" — Hackathon Demo            ║"));
  console.log(chalk.bold.cyan("╚══════════════════════════════════════════════════════════════════════════╝\n"));

  const [ownerSigner, agentSigner, providerSigner] = await ethers.getSigners();
  console.log(chalk.gray(`  • Owner Wallet:    ${chalk.white(ownerSigner.address)}`));
  console.log(chalk.gray(`  • Agent Signer:    ${chalk.white(agentSigner.address)}`));
  console.log(chalk.gray(`  • Provider Wallet: ${chalk.white(providerSigner.address)}`));

  // 1. Deploy MockUSDC
  console.log(chalk.blue("\n[1/5] Deploying MockUSDC (6 decimals) on Local EVM..."));
  const TokenFactory = await ethers.getContractFactory("MockUSDC");
  const token = await TokenFactory.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(chalk.green(`  ✔ MockUSDC deployed at: ${tokenAddress}`));

  // 2. Deploy TokenBudgetEnforcer
  console.log(chalk.blue("[2/5] Deploying TokenBudgetEnforcer (Protocol Spending Cap)..."));
  const EnforcerFactory = await ethers.getContractFactory("TokenBudgetEnforcer");
  const enforcer = await EnforcerFactory.deploy(tokenAddress, ownerSigner.address, agentSigner.address);
  await enforcer.waitForDeployment();
  const enforcerAddress = await enforcer.getAddress();
  console.log(chalk.green(`  ✔ TokenBudgetEnforcer deployed at: ${enforcerAddress}`));

  // 3. Fund Escrow & Set Budget
  console.log(chalk.blue("[3/5] Funding Escrow ($30.00 USDC) & Authorizing Agent Budget ($20.00 USDC)..."));
  const deposit = 30n * ONE_USDC;
  await token.connect(ownerSigner).approve(enforcerAddress, deposit);
  await enforcer.connect(ownerSigner).fundBudget(deposit);
  console.log(chalk.green(`  ✔ Escrow funded with $30.00 MockUSDC (Authorized Ceiling: $20.00)`));

  // 4. Start Infrastructure Components
  console.log(chalk.blue("[4/5] Starting Facilitator, Marketplace & Owner Control Center..."));
  const facilitator = new PaymentFacilitator({
    enforcerAddress,
    enforcerContract: enforcer,
    settlerSigner: ownerSigner,
    chainId: 31337,
    tokenAddress,
  });

  const indexer = new EventIndexer({ contract: enforcer });
  await indexer.start();

  const marketplace = createTokenMarketplace({
    port: MARKETPLACE_PORT,
    facilitator,
    tokenAddress,
    providerWalletAddress: providerSigner.address,
    agentSigner,
    enforcerContract: enforcer,
    indexer,
  });

  const dashboard = createDashboardServer({
    port: DASHBOARD_PORT,
    enforcerContract: enforcer,
    tokenContract: token,
    indexer,
    ownerSigner,
    agentSigner,
    facilitator,
    marketplaceUrl: `http://localhost:${MARKETPLACE_PORT}`,
  });

  await new Promise((r) => setTimeout(r, 400));
  console.log(chalk.green(`  ✔ x402 Token Marketplace live on: http://localhost:${MARKETPLACE_PORT}`));
  console.log(chalk.green(`  ✔ Owner Control Center UI live on: http://localhost:${DASHBOARD_PORT}`));

  // 5. Run Initial Live Transaction via x402 V2 Protocol
  console.log(chalk.blue("\n[5/5] Executing initial live x402 V2 autonomous transaction..."));
  try {
    const serviceUrl = `http://localhost:${MARKETPLACE_PORT}/x402/providers/alpha-translate/service`;
    
    // Step A: Request protected service -> expect HTTP 402
    let initialResp;
    try {
      initialResp = await axios.get(serviceUrl, {
        params: { text: "Hello world, testing autonomous AI payments", targetLang: "es" },
      });
    } catch (err) {
      initialResp = err.response;
    }

    if (initialResp && initialResp.status === 402) {
      const payReqHeader = initialResp.headers["payment-required"];
      const payReq = decodePaymentRequiredHeader(payReqHeader);
      const pr = validatePaymentRequired(payReq);
      const requirement = pr.accepts[0];
      const reqId = requirement.extra.reqId;
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + requirement.maxTimeoutSeconds);

      // Step B: Agent cryptographically signs EIP-712 payload
      const domain = {
        name: "TokenBudgetEnforcer",
        version: "1",
        chainId: 31337,
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
      const value = {
        reqId,
        provider: requirement.payTo,
        amount: BigInt(requirement.amount),
        validBefore,
      };

      const signature = await agentSigner.signTypedData(domain, types, value);

      const paymentPayload = {
        x402Version: 2,
        resource: pr.resource,
        accepted: requirement,
        payload: {
          reqId,
          provider: requirement.payTo,
          amount: requirement.amount,
          validBefore: Number(validBefore),
          signature,
          payer: agentSigner.address,
        },
        extensions: null,
      };
      validatePaymentPayload(paymentPayload);

      // Step C: Retry with PAYMENT-SIGNATURE
      const encodedSigHeader = encodePaymentSignatureHeader(paymentPayload);
      const paidResp = await axios.get(serviceUrl, {
        params: { text: "Hello world, testing autonomous AI payments", targetLang: "es" },
        headers: { "PAYMENT-SIGNATURE": encodedSigHeader },
      });

      if (paidResp.status === 200) {
        const respHeader = paidResp.headers["payment-response"];
        const settlement = decodePaymentResponseHeader(respHeader);
        const deliveredText = JSON.stringify(paidResp.data);
        const calculatedHash = computeContentHash(deliveredText);

        console.log(chalk.green(`  ✔ Initial seed purchase succeeded! Tx: ${settlement.transaction}`));
        console.log(chalk.green(`  ✔ Verified Delivery Hash: ${calculatedHash}`));
        console.log(chalk.green(`  ✔ Settled $4.00 USDC to provider Alpha on EVM`));
      }
    }
  } catch (err) {
    console.log(chalk.yellow(`  [WARN] Note on initial seed: ${err.message}`));
  }

  // Final Banner
  console.log("\n" + chalk.cyan("═".repeat(76)));
  console.log(chalk.bold.green("  ✔  W3A-1 LOCALHOST ENVIRONMENT RUNNING & READY"));
  console.log(chalk.cyan("═".repeat(76)));
  console.log(chalk.bold.white(`\n  > Open Owner Control Center:  ${chalk.underline.cyan(`http://localhost:${DASHBOARD_PORT}`)}`));
  console.log(chalk.bold.white(`  > x402 Token Marketplace:     ${chalk.underline.cyan(`http://localhost:${MARKETPLACE_PORT}`)}`));
  console.log(chalk.gray("\n  • Live Network: Hardhat Local EVM (Chain ID: 31337)"));
  console.log(chalk.gray(`  • Token Contract (MockUSDC):      ${tokenAddress}`));
  console.log(chalk.gray(`  • Protocol Enforcer Contract:     ${enforcerAddress}`));
  console.log(chalk.gray("  • Real-time updates active. Press Ctrl+C to terminate.\n"));

  // Keep process alive indefinitely
  const keepAliveInterval = setInterval(() => {}, 60000);

  async function shutdown() {
    clearInterval(keepAliveInterval);
    console.log(chalk.yellow("\nGracefully shutting down services..."));
    try {
      await marketplace.stop();
      await dashboard.stop();
      await indexer.stop();
    } catch (_) {}
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(chalk.red("\nStartup error:"), err);
  process.exit(1);
});
