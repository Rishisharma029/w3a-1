"use strict";

const { ethers } = require("ethers");
const { validatePaymentPayload, validatePaymentRequirements } = require("@x402/core/schemas");

// EIP-712 Domain & Types for TokenBudgetEnforcer
const EIP712_DOMAIN_NAME = "TokenBudgetEnforcer";
const EIP712_DOMAIN_VERSION = "1";

const EIP712_TYPES = {
  PaymentAuthorization: [
    { name: "reqId", type: "bytes32" },
    { name: "provider", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "validBefore", type: "uint256" },
  ],
};

class PaymentFacilitator {
  constructor({ enforcerAddress, enforcerContract, settlerSigner, chainId = 31337, tokenAddress }) {
    this.enforcerAddress = enforcerAddress;
    this.enforcerContract = enforcerContract;
    this.settlerSigner = settlerSigner;
    this.chainId = chainId;
    this.tokenAddress = tokenAddress;
  }

  getDomain() {
    return {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId: this.chainId,
      verifyingContract: this.enforcerAddress,
    };
  }

  getTypes() {
    return EIP712_TYPES;
  }

  async verify(paymentPayload, paymentRequirements) {
    if (!paymentPayload || !paymentRequirements) {
      return { valid: false, reason: "Missing payment payload or requirements" };
    }

    // 1. Basic field checks
    if (paymentPayload.reqId !== paymentRequirements.reqId) {
      return { valid: false, reason: `reqId mismatch: expected ${paymentRequirements.reqId}, got ${paymentPayload.reqId}` };
    }

    if (paymentPayload.provider.toLowerCase() !== paymentRequirements.recipient.toLowerCase()) {
      return { valid: false, reason: `Provider address mismatch: expected ${paymentRequirements.recipient}, got ${paymentPayload.provider}` };
    }

    if (BigInt(paymentPayload.amount) !== BigInt(paymentRequirements.amount)) {
      return { valid: false, reason: `Amount mismatch: expected ${paymentRequirements.amount}, got ${paymentPayload.amount}` };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (paymentPayload.validBefore < nowSec) {
      return { valid: false, reason: `Payment authorization expired at ${paymentPayload.validBefore}` };
    }

    // 2. On-chain contract checks — batched in parallel
    try {
      const [isFrozen, isUsed, remaining] = await Promise.all([
        this.enforcerContract.isFrozen(),
        this.enforcerContract.isRequestUsed(paymentPayload.reqId),
        this.enforcerContract.remainingBudget(),
      ]);

      if (isFrozen) {
        return { valid: false, reason: "Agent spending is frozen by contract owner" };
      }

      if (isUsed) {
        return { valid: false, reason: "Request ID has already been used on-chain (replay protection)" };
      }

      if (BigInt(paymentPayload.amount) > remaining) {
        return { valid: false, reason: `Amount ${paymentPayload.amount} exceeds remaining budget ${remaining}` };
      }

      // 3. If signed EIP-712 authorization, verify signature resolves to authorized agent
      if (paymentPayload.signature) {
        const domain = this.getDomain();
        const value = {
          reqId: paymentPayload.reqId,
          provider: paymentPayload.provider,
          amount: paymentPayload.amount,
          validBefore: paymentPayload.validBefore,
        };
        const recovered = ethers.verifyTypedData(domain, EIP712_TYPES, value, paymentPayload.signature);
        const agentAddress = await this.enforcerContract.agent();
        if (recovered.toLowerCase() !== agentAddress.toLowerCase()) {
          return { valid: false, reason: `Signature recovered ${recovered}, does not match agent ${agentAddress}` };
        }
      }

      return { valid: true };
    } catch (err) {
      return { valid: false, reason: `Contract verification error: ${err.message}` };
    }
  }

  async settle(paymentPayload, deliveryHash) {
    try {
      const deliveryBytes32 = deliveryHash.startsWith("0x")
        ? deliveryHash
        : ethers.keccak256(ethers.toUtf8Bytes(deliveryHash));

      let tx;
      if (paymentPayload.signature) {
        // Settle atomically via EIP-712 signed authorization
        const contractWithSigner = this.settlerSigner
          ? this.enforcerContract.connect(this.settlerSigner)
          : this.enforcerContract;

        tx = await contractWithSigner.settleWithSignature(
          paymentPayload.reqId,
          paymentPayload.provider,
          BigInt(paymentPayload.amount),
          paymentPayload.validBefore,
          deliveryBytes32,
          paymentPayload.signature
        );
      } else {
        // Settle previously authorized payment
        const contractWithSigner = this.settlerSigner
          ? this.enforcerContract.connect(this.settlerSigner)
          : this.enforcerContract;

        tx = await contractWithSigner.settlePayment(paymentPayload.reqId, deliveryBytes32);
      }

      const receipt = await tx.wait();
      return {
        settled: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        deliveryHash: deliveryBytes32,
      };
    } catch (err) {
      return {
        settled: false,
        error: err.reason || err.message,
      };
    }
  }

  async verifyX402(paymentPayload, expectedRequirements) {
    if (!paymentPayload || !expectedRequirements) {
      return { valid: false, reason: "Missing x402 payment payload or requirements" };
    }

    // 1. Official schema validation using @x402/core Zod schemas
    let validatedPayload;
    try {
      validatedPayload = validatePaymentPayload(paymentPayload);
    } catch (err) {
      return { valid: false, reason: `Invalid x402 PaymentPayload schema: ${err.message || err}` };
    }

    // 2. Validate accepted requirements against expected
    const { accepted, payload: innerPayload } = validatedPayload;
    if (accepted.scheme !== expectedRequirements.scheme) {
      return { valid: false, reason: `Scheme mismatch: expected ${expectedRequirements.scheme}, got ${accepted.scheme}` };
    }
    if (accepted.network !== expectedRequirements.network) {
      return { valid: false, reason: `Network mismatch: expected ${expectedRequirements.network}, got ${accepted.network}` };
    }
    if (accepted.asset.toLowerCase() !== expectedRequirements.asset.toLowerCase()) {
      return { valid: false, reason: `Asset mismatch: expected ${expectedRequirements.asset}, got ${accepted.asset}` };
    }
    if (accepted.payTo.toLowerCase() !== expectedRequirements.payTo.toLowerCase()) {
      return { valid: false, reason: `PayTo mismatch: expected ${expectedRequirements.payTo}, got ${accepted.payTo}` };
    }
    if (BigInt(accepted.amount) !== BigInt(expectedRequirements.amount)) {
      return { valid: false, reason: `Amount mismatch: expected ${expectedRequirements.amount}, got ${accepted.amount}` };
    }

    // 3. Validate inner EVM exact scheme payload
    if (!innerPayload || typeof innerPayload !== "object") {
      return { valid: false, reason: "Missing inner scheme payload in x402 PaymentPayload" };
    }

    const { reqId, provider, amount, validBefore, signature } = innerPayload;
    if (!reqId || !provider || !amount || !validBefore || !signature) {
      return { valid: false, reason: "Inner scheme payload missing required EIP-712 fields" };
    }

    if (provider.toLowerCase() !== accepted.payTo.toLowerCase()) {
      return { valid: false, reason: `Inner payload provider ${provider} does not match accepted payTo ${accepted.payTo}` };
    }
    if (BigInt(amount) !== BigInt(accepted.amount)) {
      return { valid: false, reason: `Inner payload amount ${amount} does not match accepted amount ${accepted.amount}` };
    }

    if (expectedRequirements.extra && expectedRequirements.extra.reqId && expectedRequirements.extra.reqId !== reqId) {
      return { valid: false, reason: `reqId mismatch: expected ${expectedRequirements.extra.reqId}, got ${reqId}` };
    }

    // 4. Delegate to existing on-chain verification (budget, freeze, replay, EIP-712 signature)
    return this.verify(
      { reqId, provider, amount: amount.toString(), validBefore: Number(validBefore), signature },
      { reqId, recipient: accepted.payTo, amount: accepted.amount }
    );
  }

  async settleX402(paymentPayload, deliveryHash) {
    const inner = (paymentPayload && paymentPayload.payload) ? paymentPayload.payload : paymentPayload;
    const accepted = (paymentPayload && paymentPayload.accepted) ? paymentPayload.accepted : null;

    const settlementResult = await this.settle(inner, deliveryHash);
    if (!settlementResult.settled) {
      return settlementResult;
    }

    const agentAddress = await this.enforcerContract.agent();
    const network = accepted ? accepted.network : `eip155:${this.chainId}`;

    // Official x402 V2 SettlementResponse structure
    const settlementResponse = {
      success: true,
      transaction: settlementResult.txHash,
      network,
      payer: agentAddress,
      extra: {
        reqId: inner.reqId,
        deliveryHash: deliveryHash,
        amount: inner.amount ? inner.amount.toString() : undefined,
        blockNumber: settlementResult.blockNumber,
      },
    };

    return {
      settled: true,
      txHash: settlementResult.txHash,
      blockNumber: settlementResult.blockNumber,
      settlementResponse,
    };
  }

  async getSettlementStatus(reqId) {
    const isUsed = await this.enforcerContract.isRequestUsed(reqId);
    if (!isUsed) {
      return { settled: false, status: "NOT_FOUND" };
    }

    const auth = await this.enforcerContract.getAuthorization(reqId);
    return {
      settled: auth.settled,
      provider: auth.provider,
      amount: auth.amount.toString(),
      validBefore: Number(auth.validBefore),
      deliveryHash: auth.deliveryHash,
      status: auth.settled ? "SETTLED" : "AUTHORIZED",
    };
  }

  async getContractBudgetState() {
    const [totalFunded, authorizedBudget, settledSpend, remaining, unspent, isFrozen, agent] = await Promise.all([
      this.enforcerContract.totalFunded(),
      this.enforcerContract.authorizedBudget(),
      this.enforcerContract.settledSpend(),
      this.enforcerContract.remainingBudget(),
      this.enforcerContract.unspentEscrow(),
      this.enforcerContract.isFrozen(),
      this.enforcerContract.agent(),
    ]);

    return {
      totalFunded: totalFunded.toString(),
      authorizedBudget: authorizedBudget.toString(),
      settledSpend: settledSpend.toString(),
      remaining: remaining.toString(),
      unspentEscrow: unspent.toString(),
      isFrozen,
      agent,
    };
  }
}

module.exports = { PaymentFacilitator, EIP712_DOMAIN_NAME, EIP712_DOMAIN_VERSION, EIP712_TYPES };
