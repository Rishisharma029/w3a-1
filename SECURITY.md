# SECURITY.md — W3A-1 Threat Model & Trust Boundaries

## Overview

This document defines the **threat model**, **trust boundaries**, **on-chain guarantees**, and **off-chain assumptions** for the W3A-1 system. It is the authoritative reference for security claims made by this project.

---

## Threat Model

### Adversary Capabilities Considered

| Adversary | Capability |
|-----------|-----------|
| **Malicious AI Agent** | Controls own private key; can craft arbitrary payloads; may have jailbroken system prompts |
| **Malicious Provider** | Can alter response bodies; can fail silently; may attempt to replay delivery or change payment destination |
| **Compromised Facilitator** | May submit on-chain transactions with wrong parameters |
| **Replay Attacker** | Captures a valid EIP-712 signature and resubmits |
| **Eavesdropper** | Can observe HTTP traffic between agent and provider |
| **Malicious Owner** | Can freeze agent, withdraw funds, adjust budget cap |

### Adversary Capabilities NOT Considered

- Compromise of the Hardhat/EVM node itself
- Eclipse attacks on the P2P network
- MEV / reorg attacks on the settlement transaction (acknowledged as external risk)
- Private key theft (assumed secure key management)

---

## Trust Boundaries

```
┌──────────────────────────────────────────────────────────┐
│  OFF-CHAIN (TRUSTED ASSUMPTIONS — not provably secure)   │
│                                                          │
│   ┌─────────────┐    ┌──────────────┐    ┌───────────┐  │
│   │  AI Agent   │    │  Provider    │    │ Dashboard │  │
│   │ (Node.js)   │    │  (Express)   │    │ (Express) │  │
│   └─────┬───────┘    └──────┬───────┘    └─────┬─────┘  │
│         │ HTTP 402          │                  │        │
│         └──────────────────►│                  │        │
│                             │                  │        │
└─────────────────────────────┼──────────────────┼────────┘
                              │ EVM RPC           │ EVM RPC
┌─────────────────────────────▼──────────────────▼────────┐
│  ON-CHAIN (TRUSTLESS GUARANTEES — enforced by EVM)       │
│                                                          │
│   ┌──────────────────────────────────────────────────┐   │
│   │           TokenBudgetEnforcer.sol                │   │
│   │                                                  │   │
│   │  • Budget cap (authorizedBudget)                 │   │
│   │  • Anti-replay (_usedRequests mapping)           │   │
│   │  • EIP-712 signature verification (ECDSA)        │   │
│   │  • Delivery hash binding (deliveryHash)          │   │
│   │  • Owner freeze control (isFrozen)               │   │
│   │  • Real ERC-20 transfer (SafeERC20)              │   │
│   │  • Reentrancy protection (ReentrancyGuard)       │   │
│   └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## On-Chain Guarantees (Provably Enforced by EVM)

These properties hold **regardless of what the AI agent, provider, or facilitator does** at the application layer:

### G1 — Hard Budget Cap
The agent **cannot** cause more than `authorizedBudget` tokens to be transferred, even if it signs authorizations for higher amounts. The contract checks `settledSpend + amount > authorizedBudget` and reverts.

### G2 — Anti-Replay (reqId uniqueness)
Each `reqId` is a bytes32 one-time token. Once used (via `settleWithSignature` or `authorizePayment`), it is permanently marked `_usedRequests[reqId] = true`. The same reqId **cannot** be used again — it is immutable once written.

### G3 — EIP-712 Signature Binding
The agent's signature commits to all of: `reqId`, `provider`, `amount`, `validBefore`. Altering **any** of these parameters post-signing causes `ECDSA.recover()` to return a different address, which will not match `agent`, causing a revert.

### G4 — Delivery Hash Immutability
Once a payment is settled, `auth.deliveryHash` is stored on-chain and **cannot be changed**. The delivery hash links payment to the specific content delivered.

### G5 — Owner Freeze Hard Stop
`whenNotFrozen` modifier blocks **all** `settleWithSignature` and `settlePayment` calls when `isFrozen == true`. The agent literally cannot execute any token transfer during a freeze.

### G6 — Reentrancy Protection
`nonReentrant` modifier on all state-modifying functions prevents reentrancy exploits.

### G7 — SafeERC20
Token transfers use OpenZeppelin's `SafeERC20`, which reverts on failed transfers and handles non-standard ERC-20 return values.

### G8 — Zero Address Rejection
Constructor and `setAgent` reject `address(0)` for owner, agent, and token address.

---

## Off-Chain Assumptions (Trusted Components — NOT Provably Secure)

These properties **are NOT enforced by the EVM** and require trust in the application layer:

### A1 — Provider Delivers Correct Content
The on-chain delivery hash proves **a hash was recorded**, but cannot prove the content was useful or what was requested. The client recomputes the hash off-chain and compares — this comparison happens in Node.js, not EVM.

### A2 — Provider Quote Store Integrity
The stale-quote and price-mismatch defenses in `marketplace/quote-store.js` run off-chain. A malicious provider controlling both quote issuance and delivery response could bypass these checks (but would still fail EIP-712 signature verification at the contract).

### A3 — Dashboard State Accuracy
The Owner Control Center reads blockchain state via ethers.js RPC calls. The display is accurate as of the last poll/refresh, but is not real-time (polling interval applies).

### A4 — Facilitator Honesty
The `PaymentFacilitator` performs off-chain pre-verification before submitting on-chain. A compromised facilitator could skip pre-checks and submit directly to the contract — the contract's on-chain checks would still enforce correctness.

### A5 — Discovery Registry Centralization
The provider registry (`marketplace/providers.js`) is a centralized in-memory registry. Provider discovery is **not decentralized**. A malicious registry could hide providers or inject fake ones.

### A6 — Agent Prompt Integrity
The AI agent's natural language reasoning happens off-chain. A jailbroken agent can be tricked into selecting the wrong provider or service — but cannot exceed the on-chain budget regardless of what it decides.

---

## Security Properties of Contracts

### BudgetEnforcer.sol (Phase 1)

| Property | Enforced | Mechanism |
|----------|----------|-----------|
| Only agent can authorize | ✅ On-chain | `onlyAgent` modifier |
| Replay prevention | ✅ On-chain | `_usedRequests` mapping |
| Budget cap | ✅ On-chain | `totalSpent + amount > maxBudget` revert |
| Budget only increases | ✅ On-chain | `setBudget` requires `newBudget > maxBudget` |
| Reentrancy | ✅ On-chain | `ReentrancyGuard` |

### TokenBudgetEnforcer.sol (Phase 3)

| Property | Enforced | Mechanism |
|----------|----------|-----------|
| Budget cap | ✅ On-chain | `settledSpend + amount > authorizedBudget` revert |
| EIP-712 signature | ✅ On-chain | `ECDSA.recover()` → must equal `agent` |
| Anti-replay | ✅ On-chain | `_usedRequests` mapping permanent |
| Agent freeze | ✅ On-chain | `whenNotFrozen` modifier |
| Delivery hash binding | ✅ On-chain | `auth.deliveryHash` stored in settlement |
| SafeERC20 transfer | ✅ On-chain | OpenZeppelin `SafeERC20` |
| Reentrancy | ✅ On-chain | `ReentrancyGuard` |
| Owner-only functions | ✅ On-chain | `onlyOwner` modifier |
| Zero-address rejection | ✅ On-chain | Constructor requires check |
| Expiry enforcement | ✅ On-chain | `block.timestamp <= validBefore` |
| Amount verification | ✅ On-chain | EIP-712 digest includes amount |
| Provider verification | ✅ On-chain | EIP-712 digest includes provider |
| Content delivery proof | ⚠️ Off-chain | Client-side hash recomputation |
| Discovery integrity | ⚠️ Off-chain | Centralized provider registry |

---

## Known Limitations (Honest Disclosures)

> **This section is required by the Phase 4 spec to maintain technical honesty.**

1. **Not real USDC**: The `MockUSDC` token has no real monetary value. It is a 6-decimal test ERC-20 for demonstration only.

2. **Not full x402 conformant**: We implement an **x402-compatible** flow (HTTP 402 → pay → deliver pattern) but do not use the official x402 SDK or fully conform to all x402 spec headers.

3. **Not fully trustless**: Delivery verification requires the client to recompute and compare the hash in JavaScript. The on-chain hash is a binding commitment, but verifying the content matches is off-chain.

4. **Not decentralized discovery**: Provider registry is a centralized in-memory list. Not a DHT, not a smart contract registry.

5. **Not production-audited**: This contract has not been audited by a professional security firm. Do not deploy with real funds.

6. **MEV risk**: On-chain settlement transactions could theoretically be front-run or sandwiched in production environments.

---

## Vulnerability Disclosure

If you discover a security issue, do not post it publicly. Instead, open a private issue or contact the team directly.
