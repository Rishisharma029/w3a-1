# W3A-1 Phase 1 — Architecture & Security Documentation

> **"Let AI Agents Buy Services Safely"**  
> Phase 1 — Core Foundation

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Responsibilities](#component-responsibilities)
3. [Trust Boundaries](#trust-boundaries)
4. [Threat Model](#threat-model)
5. [Why the AI Cannot Bypass the Budget](#why-the-ai-cannot-bypass-the-budget)
6. [Payment Sequence (x402-style)](#payment-sequence)
7. [Retry / Idempotency Strategy](#retry--idempotency-strategy)
8. [Delivery Proof Strategy](#delivery-proof-strategy)
9. [Audit Event Model](#audit-event-model)
10. [Test Strategy](#test-strategy)
11. [How to Run the Demo](#how-to-run-the-demo)
12. [How to Run Tests](#how-to-run-tests)
13. [Known Limitations](#known-limitations)
14. [Phase 2 Scope](#phase-2-scope)

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                         TRUST BOUNDARY                             │
│                                                                    │
│  ┌──────────────┐  HTTP/402 flow   ┌────────────────────────────┐ │
│  │   AI Agent   │◄────────────────►│    Mock Provider           │ │
│  │  (untrusted) │                  │    (untrusted)             │ │
│  └──────┬───────┘                  └──────────┬─────────────────┘ │
│         │                                     │                   │
│         │  authorize(reqId, amount)            │  verifyAuthorization
│         │  [EVM transaction]                   │  [read-only call] │
│         ▼                                      ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                 BudgetEnforcer.sol                          │  │
│  │                 (AUTHORITATIVE ENFORCEMENT LAYER)           │  │
│  │                                                             │  │
│  │  owner ──set budget──►  maxBudget                           │  │
│  │  owner ──set agent ──►  agent address                       │  │
│  │                                                             │  │
│  │  agent.authorize(reqId, amount)                             │  │
│  │    ├── revert if caller ≠ agent                             │  │
│  │    ├── revert if reqId already used   (replay guard)        │  │
│  │    ├── revert if totalSpent+amount > maxBudget (cap guard)  │  │
│  │    └── totalSpent += amount; emit PaymentAuthorized         │  │
│  │                                                             │  │
│  │  provider.verifyAuthorization(reqId, amount) → bool         │  │
│  │    (read-only; no gas cost for provider)                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Audit log (append-only JSONL) — every event, every reqId         │
└────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Location | Responsibility |
|---|---|---|
| **BudgetEnforcer.sol** | `contracts/` | Authoritative spending cap. Only source of truth. |
| **IBudgetEnforcer.sol** | `contracts/interfaces/` | Interface used by all off-chain code |
| **Mock Provider** | `provider/` | Issues 402 challenges; verifies on-chain; delivers content |
| **receipt-store.js** | `provider/` | Provider-side idempotency (reqId → receipt cache) |
| **verifier.js** | `provider/` | Wraps `verifyAuthorization` contract read |
| **services.js** | `provider/` | Service catalogue with deterministic content generation |
| **PaymentClient** | `agent/` | Implements the 5-step 402 flow on the agent side |
| **Agent** | `agent/` | Orchestrator — has no spending policy of its own |
| **AuditLog** | `agent/` | Append-only event journal |
| **shared/events.js** | `shared/` | Canonical audit event constants |
| **shared/types.js** | `shared/` | DeliveryReceipt constructor + `computeContentHash` |
| **demo/demo.js** | `demo/` | CLI end-to-end demo for judges |
| **test/contract/** | `test/contract/` | Hardhat/Mocha unit tests for contract |
| **test/integration/** | `test/integration/` | End-to-end integration tests |

---

## Trust Boundaries

### What is trusted
- **The EVM and the deployed contract bytecode.** Once deployed, the enforcement logic cannot be changed by the agent, the provider, or anyone except the owner (who can only *increase* the budget).

### What is explicitly NOT trusted
- **The AI agent.** It could be compromised, prompt-injected, or deliberately malicious. It can only call `authorize()` — the contract decides the outcome.
- **The provider.** It could lie about payment verification if it bypassed the contract. That is why the provider checks the contract directly (not the agent's claim).
- **The network.** Requests may time out. Idempotency is required.

### Security assumption: contract is correctly deployed
The owner must deploy the contract and set the correct agent address before the agent runs. If the owner deploys a malicious contract, all bets are off — but this is equivalent to "the owner controls the funds", which is the intended design.

---

## Threat Model

| Threat | Mitigation |
|---|---|
| Agent attempts overspend | Contract `authorize()` reverts if `totalSpent + amount > maxBudget`. No code path exists to spend more. |
| Agent replays an old authorization | `usedRequests[reqId]` is permanent; second call reverts with `ReplayRejected`. |
| Agent modifies its own spending cap | `setBudget()` is `onlyOwner`. Agent has no access. |
| Agent calls authorize with fake reqId | Contract doesn't care about reqId semantics — it just records it. Provider checks the *same* reqId via `verifyAuthorization` — if unauthorized, no delivery. |
| Provider delivers without verifying | Provider would lose revenue. In production, escrow / payment channel would enforce payment before delivery. For Phase 1, the provider code *calls* the contract before delivering. |
| Network timeout after authorize() | Agent retries with the same reqId. Contract rejects (replay protection). Provider returns cached receipt (idempotency store). No double charge. |
| Provider receives fake reqId from agent | `verifyAuthorization(reqId, amount)` returns false → provider returns 402, no delivery. |
| Owner decreases budget below spent | `setBudget()` requires `newBudget > currentBudget`. Can never retroactively invalid recorded spend. |

---

## Why the AI Cannot Bypass the Budget

The budget enforcement is a **physical constraint at the EVM level**, not a software policy:

1. The agent wallet's private key has **no administrative capability** — it can only sign `authorize()` transactions.
2. `authorize()` is a Solidity function with hard-coded checks that run **inside the EVM**. The agent cannot modify these checks by changing a prompt, a config file, or a Python/JS variable.
3. The only way to change the budget is via `setBudget()`, which is `onlyOwner` — a completely separate Ethereum address controlled by the human owner.
4. Even if the agent's code is replaced with malicious code, as long as it uses the same agent wallet, the contract enforcement stands.
5. The provider does **not trust the agent's claim** that payment was made — it calls `verifyAuthorization()` directly on the contract.

The enforcement is **outside the agent's reasoning loop entirely**.

---

## Payment Sequence

The flow is structurally an x402 flow with 5 distinct steps:

```
Agent                          Provider                   BudgetEnforcer
  │                               │                             │
  │──GET /service?serviceId=X────►│                             │
  │                               │                             │
  │◄──── HTTP 402 ────────────────│                             │
  │      { reqId, price,          │                             │
  │        paymentEndpoint }      │                             │
  │                               │                             │
  │──────────────────────────────────────────────────────────  │
  │          authorize(reqId, price)   [EVM TX]                │
  │◄─────────────────────────── PaymentAuthorized event ───────│
  │                               │                             │
  │──POST /deliver──────────────►│                             │
  │   { reqId, serviceId, amount }│                             │
  │                               │──verifyAuthorization(reqId,price)─►│
  │                               │◄────────────── true ──────────────│
  │                               │                             │
  │                               │ (generate content)          │
  │                               │ (compute contentHash)       │
  │                               │ (store receipt)             │
  │◄──── HTTP 200 ────────────────│                             │
  │      { receipt, contentHash } │                             │
  │                               │                             │
  │ (verify hash locally)         │                             │
  │ (record VERIFIED event)       │                             │
```

---

## Retry / Idempotency Strategy

Double-charge protection is enforced at **two independent layers**:

### Layer 1 — Contract (authoritative)
```
_usedRequests[reqId] = true   // set atomically on first authorize()
```
Any second call with the same `reqId` reverts immediately, regardless of caller.

### Layer 2 — Provider receipt store
```javascript
if (receiptStore.has(reqId)) {
  return cachedReceipt;  // no re-verification, no re-delivery, no re-charge
}
```
Even if the contract's second-call revert somehow failed, the provider would still return the cached receipt without calling `verifyAuthorization` again.

### Retry scenario walkthrough
```
1. Agent calls authorize(REQ-123, 4)    → SUCCESS (totalSpent = 4)
2. Network timeout before POST /deliver
3. Agent retries authorize(REQ-123, 4)  → REVERTS (replay protection)
4. Agent retries POST /deliver          → Provider returns cached receipt
5. totalSpent remains 4                 → NO DOUBLE CHARGE
```

---

## Delivery Proof Strategy

Every successful delivery produces a **DeliveryReceipt** that cryptographically ties the delivered content to the payment:

```json
{
  "receiptId":        "REC-<uuid>",
  "reqId":            "0x<bytes32>",
  "serviceId":        "weather-report",
  "providerAddress":  "MockProvider-v1",
  "amountAuthorized": 4,
  "timestamp":        1720000000,
  "content":          { ... },
  "contentHash":      "sha256:abcdef...",
  "txReference":      "LOCAL-0x<reqId>",
  "deliveryStatus":   "DELIVERED"
}
```

### Hash computation
```javascript
contentHash = "sha256:" + SHA256(canonicalJSON(content))
```

`canonicalJSON` sorts all object keys lexicographically before serializing, making the hash deterministic regardless of insertion order.

### Independent verification
Any third party who has the `content` field can recompute `canonicalJSON(content)` → `SHA256` → compare to `contentHash`. If they match, the content has not been modified since delivery.

The `reqId` in the receipt links the delivery to the on-chain authorization record.

---

## Audit Event Model

Events are recorded by both agent (in-memory `AuditLog`) and provider (`auditLog` array):

| Event | Trigger | Fields |
|---|---|---|
| `REQUESTED` | Agent initiates request | `providerUrl`, `serviceId` |
| `PAYMENT_REQUIRED` | Provider returns 402 | `price`, `reqId` |
| `PAYMENT_AUTHORIZED` | Contract emits `PaymentAuthorized` | `amount`, `txHash` |
| `PAYMENT_COMPLETED` | Agent sends POST /deliver | `txHash`, `amount` |
| `DELIVERED` | Provider returns 200 | `receiptId`, `contentHash` |
| `VERIFIED` | Agent recomputes and confirms hash | `contentHash` |
| `RETRY_DETECTED` | Known reqId seen again | `note` |
| `OVERSPEND_REJECTED` | Contract reverts cap exceeded | `reason` |
| `FAILED` | Any unrecoverable error | `reason`, `step` |

All events carry `{ event, reqId, timestamp }` as base fields.

---

## Test Strategy

### Contract Unit Tests (`npm run test:contract`)

Covers all 12 judge-required scenarios:

| TC | Scenario | Test |
|---|---|---|
| TC-01 | Purchase under budget → succeeds | `authorize(4)` on budget=10 |
| TC-02 | Purchase exactly equal to remaining → succeeds | spend 4 then 6 |
| TC-03 | Purchase above remaining → rejected | `authorize(11)` on budget=10 |
| TC-04 | Agent bypasses budget via own request → still rejected | same as TC-03 |
| TC-05 | Unauthorized address calls authorize → rejected | `stranger.authorize()` |
| TC-06 | Same reqId twice → no double charge | two calls with same id |
| TC-07 | Failed payment → state unchanged | check after revert |
| TC-08 | Successful payment → spend increases exactly once | diff before/after |
| TC-09 | Delivery proof exists (verifyAuthorization) | read after authorize |
| TC-10 | Content hash independently recomputed | `computeContentHash` in integration |
| TC-11 | Retry after timeout → no second charge | same reqId, second call reverts |
| TC-12 | Overspend rejection → accounting unchanged | spend unchanged after revert |

### Integration Tests (`npm run test:integration`)

| IT | Scenario |
|---|---|
| IT-01 | Full happy path end-to-end |
| IT-02 | Content hash recomputed independently |
| IT-03 | Retry → cached receipt, no double charge |
| IT-04 | Overspend → contract reverts, provider never delivers |
| IT-05 | Unauthorized agent → contract reverts |
| IT-06 | Delivery proof complete and structurally correct |

---

## How to Run the Demo

```bash
# 1. Clone / enter project
cd "ai engine"

# 2. Install dependencies (first time only)
npm install

# 3. Run the end-to-end CLI demo
npm run demo
```

Expected output:
```
  W3A-1 — Let AI Agents Buy Services Safely
  Phase 1 — End-to-End Demo

  SCENARIO 1 — Purchase weather-report (costs 4 units)
  ✔  PAYMENT APPROVED
  ✔  Receipt: REC-...
  ✔  Content hash: sha256:...
     Budget: max=10 | spent=4 | remaining=6

  SCENARIO 2 — Purchase market-data (costs 6 units)
  ✔  PAYMENT APPROVED
     Budget: max=10 | spent=10 | remaining=0

  SCENARIO 3 — Agent attempts news-summary — BUDGET EXHAUSTED
  ✔  PAYMENT REJECTED — SPENDING CAP EXCEEDED
  ✔  Enforcement was at the CONTRACT level (not agent logic)
     Budget: max=10 | spent=10 | remaining=0

  SCENARIO 4 — Retry Scenario 1's reqId
  ✔  NO SECOND CHARGE — cached receipt returned
  ✔  totalSpent is still 10

  SCENARIO 5 — Independent Delivery Proof Verification
  ✔  HASH VERIFIED

  ALL SCENARIOS PASSED
```

---

## How to Run Tests

```bash
# Contract unit tests (28 tests)
npm run test:contract

# Integration tests (6 scenarios)
npm run test:integration

# Everything
npm run test:all
```

---

## Known Limitations (Phase 1)

1. **No real ETH transfers.** Spending is tracked as integer units in contract storage. The contract does not hold or move actual ETH. Phase 2 will add escrow / ERC-20 transfers.

2. **Single provider.** Multi-provider with price-comparison is Phase 2.

3. **Agent is a script, not an LLM.** The "AI" in Phase 1 is a deterministic purchase script. Phase 2 wires in an LLM reasoning loop.

4. **Provider identity is a string.** In production the provider would have an Ethereum address and sign its 402 challenge. Phase 2 adds provider signatures.

5. **Local Hardhat node only.** Sepolia deployment is configured but not deployed.

6. **In-memory receipt store.** A crash loses all receipts. Phase 2 uses a database.

7. **Budget is denominated in abstract "units".** The `uint256` maps to nothing in particular. Phase 2 converts to wei or a stablecoin.

8. **No access control on the provider's `/receipts` admin endpoint.** Acceptable for Phase 1 demo; Phase 2 adds authentication.

---

## Phase 2 Scope

- Real ETH / ERC-20 transfers in the contract (escrow model)
- Sepolia testnet deployment
- Provider Ethereum identity + signed 402 challenges
- Multiple independent providers with different pricing
- Agent price-comparison and provider selection logic
- React/Next.js dashboard with real-time spend and complete purchase/delivery audit trail
- Full x402 reference implementation compatibility
- LLM-powered agent reasoning loop (OpenAI / Gemini)
- Persistent receipt store (PostgreSQL)
- Authentication UX for the human owner dashboard
