# ARCHITECTURE.md — W3A-1 System Architecture

## Core Narrative

> **AI DECIDES → PROTOCOL ENFORCES → BLOCKCHAIN SETTLES → PROVIDER DELIVERS → HASH PROVES → OWNER AUDITS/FREEZES**

The system separates **reasoning** (off-chain, AI agent) from **enforcement** (on-chain, smart contract). The AI agent can decide anything — but it cannot physically execute a transaction that violates the on-chain budget cap. No amount of prompt manipulation, code modification, or agent compromise can bypass the EVM's enforcement layer.

---

## Component Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                        HUMAN OWNER                                   │
│  • Funds escrow (fundBudget)                                         │
│  • Sets spending cap (setAuthorizedBudget)                           │
│  • Freezes agent (freezeAgent)                                       │
│  • Withdraws unspent (withdrawUnspent)                               │
│  • Monitors via Owner Control Center dashboard                       │
└─────────────────────────────┬────────────────────────────────────────┘
                              │ owns
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  ON-CHAIN ENFORCEMENT LAYER (TokenBudgetEnforcer.sol)               │
│                                                                     │
│  • authorizedBudget (hard cap — agent cannot exceed)                │
│  • settledSpend (monotonic, EVM-enforced accounting)                │
│  • _usedRequests (permanent replay guard)                           │
│  • EIP-712 signature verification (ECDSA binding)                   │
│  • isFrozen (emergency halt switch)                                 │
│  • deliveryHash (on-chain proof of delivery)                        │
│  • SafeERC20 transfer to provider                                   │
└──────────┬──────────────────────────────────────────┬───────────────┘
           │ authorizes / settles                      │ reads state
           ▼                                           ▼
┌──────────────────────────┐              ┌────────────────────────────┐
│     AI AGENT LAYER       │              │  OWNER CONTROL CENTER      │
│                          │              │  (dashboard/server.js)     │
│  smart-agent.js          │              │                            │
│  ├── llm-client.js       │              │  GET /api/budget           │
│  ├── provider-selector   │              │  GET /api/transactions     │
│  ├── purchase-flow.js    │              │  GET /api/security         │
│  └── token-payment-      │              │  POST /api/freeze          │
│      client.js (EIP-712) │              │  POST /api/fund            │
└──────────┬───────────────┘              └────────────────────────────┘
           │ HTTP 402 → pay → deliver              ▲
           ▼                              reads    │
┌──────────────────────────────────────────────────┤
│     PROVIDER / MARKETPLACE LAYER                 │
│                                                  │
│  token-server.js                                 │
│  ├── GET /providers/:id/service   (returns 402)  │
│  └── POST /providers/:id/deliver  (returns 200)  │
│       ├── quote-store validation                 │
│       ├── facilitator.verify() (off-chain)       │
│       ├── content generation                     │
│       └── facilitator.settle() → on-chain tx     │
│                                                  │
│  PROVIDERS: alpha-translate, beta-translate,     │
│             gamma-translate, delta-compute,      │
│             epsilon-vision                       │
└──────────────────────────────────────────────────┘
```

---

## Directory Structure

```
w3a-1/
├── contracts/
│   ├── BudgetEnforcer.sol           Phase 1 — native unit budget enforcement
│   ├── MockUSDC.sol                 Phase 3 — 6-decimal test ERC-20
│   ├── TokenBudgetEnforcer.sol      Phase 3 — real token escrow + EIP-712
│   └── interfaces/
│       └── IBudgetEnforcer.sol      Phase 1 contract interface
│
├── agent/
│   ├── agent.js                     Phase 1 — deterministic agent
│   ├── smart-agent.js               Phase 2 — autonomous LLM-driven agent
│   ├── llm-client.js                Phase 2 — Gemini + fallback intent parser
│   ├── provider-selector.js         Phase 2 — multi-criteria scoring
│   ├── purchase-flow.js             Phase 2 — 9-state purchase state machine
│   ├── purchase-record.js           Phase 2 — audit trail record
│   ├── payment-client.js            Phase 1 — HTTP payment client
│   └── token-payment-client.js      Phase 3 — EIP-712 signing + x402 flow
│
├── marketplace/
│   ├── providers.js                 Provider catalog (5 providers)
│   ├── quote-store.js               TTL quote registry + stale-quote defense
│   ├── provider-router.js           Phase 1/2 — HTTP router factory
│   ├── server.js                    Phase 2 — multi-provider marketplace
│   ├── token-provider-router.js     Phase 3 — x402 + token settlement router
│   └── token-server.js              Phase 3 — token marketplace server
│
├── facilitator/
│   └── facilitator.js               PaymentFacilitator — EIP-712 verify + settle
│
├── indexer/
│   └── indexer.js                   EventIndexer — on-chain event tracking
│
├── dashboard/
│   ├── server.js                    Owner Control Center REST API
│   └── public/
│       └── index.html               Operations console real-time dashboard UI
│
├── provider/
│   ├── server.js                    Phase 1 — single provider HTTP server
│   ├── verifier.js                  Phase 1 — authorization verifier
│   └── receipt-store.js             Idempotent receipt store
│
├── shared/
│   ├── events.js                    Canonical audit event constants
│   └── types.js                     DeliveryReceipt schema + computeContentHash
│
├── scripts/
│   ├── deploy-phase3.js             Local + Sepolia deployment script
│   ├── gas-report.js                Phase 4 — gas cost inspection
│   └── verify-sepolia.js            Phase 4 — read-only Sepolia verification
│
├── demo/
│   ├── demo.js                      Phase 1 — 5-scenario demo
│   ├── demo2.js                     Phase 2 — 6-scenario autonomous agent demo
│   ├── demo3.js                     Phase 3 — 6-scenario real token settlement demo
│   └── demo4.js                     Phase 4 — 10-scenario judge-ready demo
│
└── test/
    ├── contract/
    │   └── BudgetEnforcer.test.js   33 unit tests (Phase 1 contract)
    ├── integration/
    │   └── flow.test.js             7 integration tests (Phase 1 e2e)
    ├── phase2/
    │   ├── discovery.test.js        8 tests
    │   ├── selection.test.js        7 tests
    │   ├── flow.test.js             6 tests
    │   └── adversarial.test.js      9 tests
    ├── phase3/
    │   ├── token-budget.test.js     8 tests
    │   ├── eip712-authorization.test.js  8 tests
    │   ├── settlement.test.js       7 tests
    │   └── x402-flow.test.js        7 tests
    └── phase4/
        ├── x402-protocol.test.js    12 tests
        ├── malicious-agent.test.js  8 tests
        ├── malicious-provider.test.js  10 tests
        └── invariants.test.js       10 tests
```

---

## Payment Flow (Critical Path)

```
1. Human Owner funds escrow
   owner.approve(enforcer, $25)
   enforcer.fundBudget($25)
   → authorizedBudget = $25, token.balanceOf(enforcer) = $25

2. Agent receives human request
   "Get the highest quality translation under $5"

3. Agent queries discovery
   GET /registry/discover?serviceType=text-translate&maxPrice=5

4. Agent scores providers, selects alpha-translate ($4.00, quality 0.92)

5. Agent requests service (HTTP 402 trigger)
   GET /providers/alpha-translate/service
   ← 402 { reqId, amount: 4000000, recipient, validBefore, paymentProtocol }

6. Agent signs EIP-712 authorization
   agentSigner.signTypedData(domain, types, { reqId, provider, amount, validBefore })

7. Agent submits payment
   POST /providers/alpha-translate/deliver
   → { serviceId, payload, paymentPayload: { reqId, provider, amount, validBefore, signature } }

8. Provider verifies (off-chain pre-checks)
   facilitator.verify(paymentPayload, requirements)
   ├── reqId match
   ├── provider match
   ├── amount match
   ├── validBefore not expired
   ├── isFrozen == false (on-chain read)
   ├── isRequestUsed(reqId) == false (on-chain read)
   ├── remainingBudget() >= amount (on-chain read)
   └── EIP-712 recovered address == agent (off-chain verify)

9. Provider generates content + computes SHA-256 hash

10. Provider settles on-chain
    enforcer.settleWithSignature(reqId, provider, amount, validBefore, deliveryHash, signature)
    ├── whenNotFrozen (modifier)
    ├── nonReentrant (modifier)
    ├── !_usedRequests[reqId] (replay guard)
    ├── settledSpend + amount <= authorizedBudget (budget cap)
    ├── ECDSA.recover(EIP-712 digest, signature) == agent (sig verify)
    ├── _usedRequests[reqId] = true (EFFECTS)
    ├── settledSpend += amount (EFFECTS)
    └── token.safeTransfer(provider, amount) (INTERACTION)

11. Provider returns response
    { reqId, content, contentHash, settlement: { txHash, blockNumber } }

12. Agent verifies content hash
    recompute SHA-256 of received content
    compare to receipt.contentHash
    → hashVerified = true/false

13. EventIndexer records settlement
    ← PaymentSettled event: reqId, provider, amount, deliveryHash
```

---

## Token Accounting Invariants

At any point in time:

```
remainingBudget()    == authorizedBudget - settledSpend
unspentEscrow()      == token.balanceOf(contract)
settledSpend         <= authorizedBudget
totalFunded          >= settledSpend
```

These invariants are enforced by the contract's design and verified by the Phase 4 invariant test suite.

---

## Network Configuration

| Network | ChainID | Token | Enforcer | Purpose |
|---------|---------|-------|----------|---------|
| Local Hardhat | 31337 | MockUSDC (deployed fresh) | Deployed fresh | Testing + demo |
| Sepolia | 11155111 | MockUSDC (deployable) | Deployable | Public testnet demo |
| Mainnet | 1 | Real USDC (not used) | N/A | Not in scope |

---

## Port Assignments

| Service | Phase 1 | Phase 2 | Phase 3 | Phase 4 Test | Phase 4 Demo |
|---------|---------|---------|---------|--------------|--------------|
| Provider / Marketplace | 13001 | 14201 | 14203 | 14205 | 14204 |
| Dashboard | — | — | 14303 | — | 14304 |
| Hardhat Node (if used) | 8545 | 8545 | 8545 | 8545 | 8545 |
