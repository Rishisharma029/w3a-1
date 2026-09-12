# W3A-1: Let AI Agents Buy Services Safely

[![Live Control Center](https://img.shields.io/badge/Live%20Demo-Owner%20Control%20Center-00f2ff?style=for-the-badge&logo=googlechrome&logoColor=white)](https://rishisharma029.github.io/w3a-1/)
[![Live Marketplace](https://img.shields.io/badge/Live%20Demo-Service%20Marketplace-10b981?style=for-the-badge&logo=fastapi&logoColor=white)](https://rishisharma029.github.io/w3a-1/marketplace/)
[![Tests Passing](https://img.shields.io/badge/Tests-169%20Passing-brightgreen?style=for-the-badge)](https://github.com/Rishisharma029/w3a-1)
[![x402 V2](https://img.shields.io/badge/Protocol-x402%20V2%20Wire-blueviolet?style=for-the-badge)](https://github.com/coinbase/x402)

> **Live Owner Control Center:** [https://rishisharma029.github.io/w3a-1/](https://rishisharma029.github.io/w3a-1/)  
> **Live Service Marketplace:** [https://rishisharma029.github.io/w3a-1/marketplace/](https://rishisharma029.github.io/w3a-1/marketplace/)  
> **Autonomous AI Agent Purchasing with Genuine x402 V2 Protocol Negotiation and Protocol-Level Smart Contract Spending Caps**  
> Built for the Hackathon Track: **"Let AI Agents Buy Services Safely"**  
> Verified Baseline: **169 Automated Tests Passing | 0 Failures**

---

## 1. Executive Summary

W3A-1 solves the fundamental security vulnerability of autonomous AI agents in Web3 commerce: **agent hallucination and prompt injection causing unauthorized financial drainage**. 

Instead of trusting the LLM to respect financial limits or relying purely on off-chain payment logic, W3A-1 enforces a **hard spending ceiling directly on the Ethereum Virtual Machine (EVM)** using `TokenBudgetEnforcer.sol`. The AI agent can choose what service to purchase and negotiate using the **official x402 V2 HTTP wire protocol (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`)**, but the smart contract physically blocks any payment exceeding the owner's authorized budget.

```
┌──────────────┐     x402 V2      ┌─────────────────┐     EIP-712     ┌────────────────────────┐     SafeERC20     ┌────────────────┐
│   AI Agent   │ ───────────────► │ Resource Server │ ──────────────► │  TokenBudgetEnforcer   │ ────────────────► │  MockUSDC /    │
│  (Reasoning) │ ◄─────────────── │   (Provider)    │                 │    (Smart Contract)    │                   │ Provider Wallet│
└──────────────┘   HTTP 402/200   └─────────────────┘                 └────────────────────────┘                   └────────────────┘
       │                                                                           ▲
       └───────────────────────────────────────────────────────────────────────────┘
                       HARD AUTHORIZATION CEILING: ON-CHAIN REVERT ON OVERSPEND
```

---

## 2. Core Architectural Guarantees

1. **AI Decides:** The agent uses natural language and heuristics to discover, compare, and select optimal services.
2. **x402 Negotiates:** The service interaction follows the official x402 V2 specification (`@x402/core@2.25.0`) with `PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, and `PAYMENT-RESPONSE` HTTP headers.
3. **Protocol Enforces:** The spending ceiling is enforced on-chain by `TokenBudgetEnforcer.sol`. Overspend attempts revert on-chain with **$0 tokens moved**.
4. **Blockchain Settles:** Real `MockUSDC` ERC-20 tokens (6 decimals) are transferred via `SafeERC20` from contract escrow to provider wallets.
5. **Hash Proves:** Every delivery is cryptographically bound to a canonical `sha256:hex` content hash recorded directly in the on-chain settlement event.
6. **Owner Controls:** The human owner can monitor real-time utilization and trigger an emergency **FREEZE AGENT** on-chain at any time.

---

## 3. Quick Start (Run in 60 Seconds)

```bash
# 1. Install dependencies (including official @x402/core & @x402/evm)
npm install

# 2. Run all 169 automated tests
npm run test:all

# 3. Run Flagship x402 V2 10-step Judge Demo
npm run demo:x402

# 4. Run Phase 4 Security Hardening Demo (10 adversarial attack scenarios)
npm run demo4
```

---

## 4. Test Evidence (169 Passing, 0 Failing)

| Test Suite | File | Tests | Focus Area |
|---|---|---|---|
| **Phase 1 Contract** | `test/contract/BudgetEnforcer.test.js` | 33 | Unit budget enforcement, access control, state bounds |
| **Phase 1 Flow** | `test/integration/flow.test.js` | 7 | HTTP 402 handshake, idempotency, delivery receipt |
| **Phase 2 Discovery** | `test/phase2/discovery.test.js` | 8 | Service catalog discovery and capability filtering |
| **Phase 2 Selection** | `test/phase2/selection.test.js` | 7 | Cost vs quality ranking, fallback candidates |
| **Phase 2 Flow** | `test/phase2/flow.test.js` | 6 | Multi-turn purchase state machine |
| **Phase 2 Adversarial** | `test/phase2/adversarial.test.js` | 9 | Stale quotes, provider downtime, corrupted responses |
| **Phase 3 Token Budget**| `test/phase3/token-budget.test.js` | 8 | Real ERC-20 escrow, owner deposit/withdraw, unspent accounting |
| **Phase 3 EIP-712** | `test/phase3/eip712-authorization.test.js`| 7 | Portable signed authorizations, domain separation |
| **Phase 3 Settlement** | `test/phase3/settlement.test.js` | 8 | Multi-provider token releases, delivery hash verification |
| **Phase 3 x402 Flow** | `test/phase3/x402-flow.test.js` | 7 | End-to-end token flow with live marketplace server |
| **Phase 4 x402 Wire** | `test/phase4/x402-protocol.test.js` | 12 | Challenge structure, quote freshness, hash binding |
| **Phase 4 Malicious Agent**| `test/phase4/malicious-agent.test.js` | 8 | Overspend, replay, unauthorized signer, freeze |
| **Phase 4 Malicious Provider**| `test/phase4/malicious-provider.test.js` | 9 | Price gouging, fake delivery, duplicate settlement |
| **Phase 4 Invariants** | `test/phase4/invariants.test.js` | 10 | Mathematical proofs: solvency, monotonicity, immutability |
| **Phase 5 x402 Real V2**| `test/phase5/x402-real.test.js` | 30 | Official `@x402/core` Zod schemas, wire fetch(), CAIP-2 |
| **TOTAL** | **15 Test Files** | **169** | **0 Failures across entire suite** |

---

## 5. Official x402 V2 Implementation Highlights

W3A-1 integrates the official x402 V2 protocol specification (`@x402/core@2.25.0`):
- **HTTP 402 Status:** Protected routes return standard HTTP `402 Payment Required`.
- **`PAYMENT-REQUIRED` Header:** Base64-encoded `PaymentRequiredV2` object validated by official Zod schemas.
- **`PAYMENT-SIGNATURE` Header:** Base64-encoded `PaymentPayloadV2` carrying EIP-712 authorization.
- **`PAYMENT-RESPONSE` Header:** Base64-encoded `SettlementResponse` carrying transaction hash and on-chain block receipt.
- **CAIP-2 Identifiers:** Strict CAIP-2 network identifiers (`eip155:31337` for local EVM, `eip155:11155111` for Sepolia).
- **Exact Atomic Units:** String-based integer units (`4000000` = $4.00 USDC) preventing floating-point rounding errors.
- **Pure Wire Test (`XR-14`):** Fully tested via native `globalThis.fetch()` without any internal client helpers.

See [`X402.md`](./X402.md) for full protocol analysis and comparison tables.

---

## 6. Live Human Owner Control Center (Dashboard)

Run the dashboard and inspect live transactions in real-time:
```bash
npm run demo:x402
# Open http://localhost:14305 in your browser
```

### Dashboard Features
- **Real-Time On-Chain Budget Metrics:** Total Funded, Authorized Budget, Settled Spend, Remaining Escrow, Utilization %.
- **Dedicated x402 V2 Transaction Explorer:** Shows Version, Scheme, Network (CAIP-2), Asset, PayTo, Request ID, Nonce, Verify/Settle Status, Tx Hash, Delivery Hash, and Budget Before/After.
- **Live Threat & Security Feed:** Displays on-chain blocked overspends, replay attempts, and delivery hash tampering alerts.
- **Emergency Agent Freeze:** Interactive button sending an EVM transaction to immediately freeze or unfreeze agent spending.

---

## 7. The Flagship Demos

| Command | Demonstration | Description |
|---|---|---|
| `npm run demo:x402` | **Official x402 V2 Flagship** | 10-step canonical x402 wire flow: challenge, sign, submit, verify, settle, deliver, verify hash, and overspend defense |
| `npm run demo4` | **Phase 4 Full Security Suite** | 10 adversarial attacks proven blocked by the EVM smart contract layer |
| `npm run demo3` | **Phase 3 Real Token Settlement** | ERC-20 token balance changes, EIP-712 settlement, and dashboard sync |
| `npm run demo2` | **Phase 2 Multi-Provider** | Autonomous discovery, quality/cost selection, and automatic fallback |
| `npm run demo` | **Phase 1 Foundation** | Core 5-step deterministic flow and replay guard |

---

## 8. Directory Layout

```
contracts/
  TokenBudgetEnforcer.sol     — Authoritative on-chain token budget enforcer with EIP-712 & freeze
  MockUSDC.sol                — Test ERC-20 token (6 decimals)
  BudgetEnforcer.sol          — Phase 1 foundation enforcer

agent/
  x402-payment-client.js      — Official x402 V2 client with PAYMENT-SIGNATURE encoding & hash check
  token-payment-client.js     — Phase 3 token payment client
  smart-agent.js              — Autonomous LLM/heuristic agent interface
  provider-selector.js        — Multi-provider ranking & selection logic

facilitator/
  facilitator.js              — x402 PaymentFacilitator (verifyX402, settleX402, on-chain state)

marketplace/
  x402-provider-router.js     — Official x402 V2 route handler (/x402/providers/:id/service)
  token-server.js             — Token marketplace server hosting legacy & x402 V2 endpoints
  quote-store.js              — Stale quote & price tampering defense
  providers.js                — Catalogue of 5 services (Translation, Compute, Vision)

dashboard/
  server.js                   — Owner Control Center REST API
  public/index.html           — Real-time dashboard UI with x402 V2 explorer

indexer/
  indexer.js                  — Real-time EVM event indexer

test/
  phase5/x402-real.test.js    — 30 official x402 V2 protocol & security tests
  phase4/                     — 39 protocol, malicious agent/provider, and invariant tests
  phase3/                     — 30 token budget & settlement tests
  phase2/                     — 30 discovery, selection, & flow tests
  contract/ & integration/    — 40 foundation tests

X402.md                       — Complete x402 V2 protocol specification & analysis document
SECURITY.md                   — Threat model, trust boundaries, and failure mode analysis
ARCHITECTURE.md               — Detailed component map & 13-step sequence flow
```

---

## 9. Security Disclosures & Honesty Statement

In accordance with strict technical integrity standards:
- **Token:** Tests and demos use `MockUSDC.sol` on local Hardhat EVM (`eip155:31337`) with standard 6 decimals. This is a local simulation of real USDC.
- **x402 Standard:** We implement the official x402 V2 wire format using `@x402/core@2.25.0`. We do not claim Uniswap Permit2 compatibility because Permit2 lacks owner spending ceilings and escrow protection.
- **Delivery Proof:** Cryptographic hash verification occurs independently on the client side; on-chain settlement binds the content hash into transaction logs.

---

## 10. The Final Standard

> **AI DECIDES** (Autonomous reasoning chooses optimal services)  
> **x402 NEGOTIATES** (Standardized HTTP 402 challenge & payload handshake)  
> **PROTOCOL ENFORCES** (Immutable EVM spending ceiling blocks overspending)  
> **BLOCKCHAIN SETTLES** (Real ERC-20 token release from contract escrow)  
> **PROVIDER DELIVERS** (Service resource delivered upon verified payment)  
> **HASH PROVES** (Independent SHA-256 verification proves delivery integrity)  
> **OWNER AUDITS / FREEZES** (Human owner maintains ultimate financial authority)

**The AI can choose. The AI cannot override the protocol.**
