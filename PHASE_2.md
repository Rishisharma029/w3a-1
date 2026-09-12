# W3A-1 Phase 2 — Intelligent Agent + Multi-Provider Payment Layer

## 1. System Overview & Core Principle

In Phase 2, W3A-1 evolves from a single-provider test harness into an autonomous multi-provider purchasing system. An AI agent accepts high-level natural language human intent, discovers available providers, filters and ranks them according to price, quality, and user preferences, handles the HTTP 402 payment flow, verifies delivery content hashes, and logs an auditable purchase record.

### The Immutable Trust Boundary

Throughout this autonomy, the critical architectural constraint established in Phase 1 remains inviolate:

```
                HUMAN OWNER
                     | (Deploys contract & sets budget)
                     v
             BUDGET AUTHORITY
                     | (Immutable on-chain rules)
                     v
          SMART CONTRACT (BudgetEnforcer.sol)
                     | (Strict spending cap, caller check, replay guard)
                     v
                  AGENT (SmartAgent)
              /      |      \
             v       v       v
        Provider A  Provider B  Provider C
```

**Financial authority is enforced exclusively by the EVM smart contract, outside the AI agent.**
- The AI agent decides **WHAT** to buy and **WHICH** provider to select.
- The AI agent **NEVER** decides whether it is permitted to exceed the owner's budget.
- The spending limit is **NOT** enforced by prompt engineering, system instructions, or client-side `if` statements. Even if the AI agent's reasoning is compromised or adversarial, `BudgetEnforcer.authorize()` physically reverts before any state change occurs.

---

## 2. Multi-Provider Marketplace Architecture

The marketplace (`marketplace/server.js`) hosts 5 independent mock providers across 3 real-world service categories:

| Provider ID | Service Type | Service ID | Base Price | Quality Score | Latency | Description |
|---|---|---|---|---|---|---|
| `alpha-translate` | `translation` | `text-translate` | 4 units | 0.92 | 200ms | Nuanced translation with cultural checks |
| `beta-translate` | `translation` | `text-translate` | 3 units | 0.84 | 100ms | Fast, cost-effective translation |
| `gamma-translate` | `translation` | `text-translate` | 6 units | 0.97 | 400ms | Premium human-reviewed translation |
| `delta-compute` | `compute` | `data-process` | 3 units | 0.88 | 150ms | Deterministic mathematical & statistical processing |
| `epsilon-vision` | `image-analysis` | `image-analyze` | 5 units | 0.95 | 600ms | Object detection & scene classification |

### Provider Isolation
Every provider instance operates with its own:
1. **Isolated Route Namespace**: `/providers/:providerId/service` and `/providers/:providerId/deliver`
2. **Dedicated ReceiptStore**: Zero cross-provider contamination of request IDs or deliveries.
3. **Dedicated QuoteStore**: Independent pending-quote lifecycle and stale-quote protection.
4. **Availability Control**: Can simulate outages (HTTP 503) individually for fallback testing.

---

## 3. Service Discovery Registry

The discovery registry (`GET /registry/discover`) enables dynamic inspection without hardcoding endpoints:
- Supports query parameters: `serviceType`, `minQuality`, `maxPrice`.
- Returns structured provider capabilities:
```json
{
  "count": 3,
  "providers": [
    {
      "providerId": "alpha-translate",
      "name": "Alpha Translation Services",
      "serviceType": "translation",
      "qualityScore": 0.92,
      "estimatedLatencyMs": 200,
      "availability": 1.0,
      "services": [
        {
          "serviceId": "text-translate",
          "name": "Text Translation",
          "price": 4,
          "currency": "UNIT",
          "description": "Accurate translation with cultural nuance checking."
        }
      ]
    }
  ]
}
```

---

## 4. Transparent Provider-Ranking & Selection Model

When the agent receives a human request (e.g., *"Translate to Hindi. Quality >= 0.90, budget max $5"*), selection proceeds in three strictly deterministic stages:

### Stage 1: Natural Language Intent Parsing (`agent/llm-client.js`)
Gemini 1.5-Flash (or deterministic fallback when offline) maps user intent to a structured specification:
```json
{
  "serviceType": "translation",
  "priority": "cost" | "quality" | "balanced",
  "minQuality": 0.90,
  "maxPrice": 5,
  "targetLanguage": "Hindi",
  "payload": { "targetLanguage": "Hindi" }
}
```

### Stage 2: Hard Constraint Filtering (`agent/provider-selector.js`)
Before scoring, providers failing hard constraints are eliminated:
- `p.qualityScore < minQuality` $\rightarrow$ Filtered out
- `min(p.services.price) > maxPrice` $\rightarrow$ Filtered out
- `p.availability <= 0` or in `excludedProviders` $\rightarrow$ Filtered out

### Stage 3: Min-Max Normalized Multi-Objective Scoring
For candidate providers $c \in C$:
$$\text{priceScore}(c) = 1 - \frac{c.\text{price} - \min(\text{Prices})}{\max(\text{Prices}) - \min(\text{Prices}) + \epsilon}$$
$$\text{qualityScore}(c) = \frac{c.\text{quality} - \min(\text{Qualities})}{\max(\text{Qualities}) - \min(\text{Qualities}) + \epsilon}$$
$$\text{FinalScore}(c) = w_{\text{price}} \cdot \text{priceScore}(c) + w_{\text{quality}} \cdot \text{qualityScore}(c)$$

Weights are transparent and rule-based:
- **Cost Priority**: $w_{\text{price}} = 0.70$, $w_{\text{quality}} = 0.30$
- **Quality Priority**: $w_{\text{price}} = 0.20$, $w_{\text{quality}} = 0.80$
- **Balanced**: $w_{\text{price}} = 0.50$, $w_{\text{quality}} = 0.50$

The provider with the highest `FinalScore` is selected.

---

## 5. Explicit 9-State Purchase Flow State Machine

The purchasing workflow is orchestrated by `agent/purchase-flow.js` across explicit state transitions:

```
   [IDLE]
     │
     ▼
[INTENT_PARSED] ── (Extraction of serviceType, priority, filters)
     │
     ▼
[DISCOVERED] ── (Registry queried, hard filters applied)
     │
     ▼
 [SELECTED] ── (Scoring model picks optimal provider)
     │
     ▼
[PAYMENT_REQUIRED] ── (GET /service receives HTTP 402 challenge)
     │
     ▼
 [AUTHORIZED] ── (BudgetEnforcer.authorize() succeeds on-chain)
     │                │
     │                └─► [REJECTED] (If budget exceeded)
     ▼
 [DELIVERED] ── (POST /deliver returns content + receipt)
     │
     ▼
  [VERIFIED] ── (computeContentHash(content) matches receipt)
     │                │
     │                └─► [VERIFICATION_FAILED] (Hash mismatch)
     ▼
 [COMPLETE]
```

### Stale-Quote & Price-Change Defense (`marketplace/quote-store.js`)
To prevent race conditions, stale quotes, or price gouging between discovery and delivery:
1. When issuing a 402 challenge, the provider records a pending quote:
   $$\{ \text{reqId}, \text{serviceId}, \text{price}, \text{expiresAt}, \text{providerId} \}$$
2. Upon receiving `POST /deliver`, the provider validates:
   - Does `pendingQuotes[reqId]` exist? (Prevents forgery)
   - Has the quote expired ($\text{now} > \text{expiresAt}$)? (Prevents stale quotes)
   - Does submitted `amount == quote.price`? (Prevents under/over charging)
3. If validation fails, delivery is aborted with HTTP 402 without touching delivery logic.

### Automated Provider Outage Fallback
If the selected provider returns HTTP 503 or encounters a connection timeout:
1. The failed provider is added to `excludedProviders`.
2. The agent automatically transitions to `FALLBACK`.
3. The next best qualifying provider is selected.
4. A fresh request ID and quote are generated.
5. Smart contract budget enforcement applies to the fallback purchase seamlessly.

---

## 6. Delivery Verification & Complete PurchaseRecord

### Cryptographic Proof of Delivery
The receipt contains a canonical content hash:
$$\text{contentHash} = \text{sha256}(\text{canonicalJSON}(\text{content}))$$
`canonicalJSON` sorts keys lexicographically, ensuring deterministic hashing regardless of object key order.
Upon delivery, `PurchaseFlow` recomputes the hash from the raw delivered content. If a provider returns modified content or corrupt data, `VERIFICATION_FAILED` is flagged and the purchase marked `FAILED`.

### Auditable PurchaseRecord Schema (`agent/purchase-record.js`)
Each purchase emits a machine-readable record linking user intent to on-chain execution:
- `purchaseId`: Unique UUID prefixed with `PUR-`
- `userRequest`: Original human prompt
- `intent`: Parsed filters and priorities
- `discoveredProviders`: Array of all available providers
- `filteredOut`: List of providers excluded with specific rationale
- `selectedProviderId` & `selectionReason`: Chosen provider and score justification
- `reqId`: Bytes32 on-chain request identifier
- `quotedPrice` & `authorizedAmount`: Expected vs authorized spend
- `txHash`: EVM transaction hash committing spend
- `receipt`: Complete `DeliveryReceipt` object
- `contentHash` & `verified`: Delivery verification status
- `stateHistory`: Chronological array of timestamped state transitions

---

## 7. Security Review & Threat Model Analysis

| Threat | Attack Scenario | Defense Mechanism | Verified By |
|---|---|---|---|
| **Autonomous Overspend** | Agent tries to purchase $6 service with $4 budget | `BudgetEnforcer.sol` checks `totalSpent + amount > maxBudget` and reverts before state update | TC-03, TC-12, IT-04, ADV-01, Demo S4 |
| **Replay Attack** | Agent or attacker resubmits same `reqId` to contract | Contract stores `_usedRequests[reqId] = true`; second call reverts with `request ID already used` | TC-06, TC-11, ADV-02 |
| **Double-Charge on Retry** | Network timeout causes retry of `POST /deliver` | Provider `ReceiptStore` returns cached receipt immediately without re-checking contract | IT-03, ADV-08, Demo S5 |
| **Price Tampering** | Provider quotes 3 units, agent submits 1 unit (or provider claims 6) | `QuoteStore` validates `amount === quote.price` before verifying on contract | F-03, ADV-04 |
| **Stale Quotes** | Agent holds 402 challenge past TTL then tries to execute | `QuoteStore` rejects quotes where `now > expiresAt` | F-02, ADV-04 |
| **Delivery Tampering** | Provider alters content after receipt creation or serves corrupt data | Client recomputes `sha256(canonicalJSON(content))`; flags hash mismatch | F-06, ADV-06, Demo S6 |
| **Unauthorized Agent** | Rogue wallet calls `authorize()` directly on contract | `onlyAgent` modifier checks `msg.sender == agent`; reverts immediately | TC-05, IT-05, ADV-09 |
| **Provider Impersonation** | Rogue provider attempts to use another provider's `reqId` | `reqId` is bound to provider in `QuoteStore` and `ReceiptStore`; cross-provider delivery fails | ADV-02, ADV-04 |
| **Provider Outage** | Primary provider returns 503 | `PurchaseFlow` catches 503, excludes provider, selects next qualifying option | F-04, ADV-03, Demo S3 |

### Known Limitations & Phase 3 Roadmap
1. **Off-Chain Payments in Phase 2**: In Phase 2, `BudgetEnforcer` tracks unit-based commitments on-chain. Phase 3 will introduce ERC-20 / ETH transfer on verification.
2. **Centralized Discovery**: In Phase 2, discovery runs through `marketplace/server.js`. Phase 3 will introduce decentralized on-chain provider registries or ENS-based discovery.
3. **Optimistic Delivery**: If delivery verification fails, funds were authorized on-chain. Phase 3 will integrate escrow or conditional payment channels (e.g. hashlocks or stake slashing).

---

## 8. Test Suite Summary

### Phase 1 Suite (Retained & Passing)
- `test/contract/BudgetEnforcer.test.js`: **33 tests** (Contract unit tests, edge cases, replays, authorizations)
- `test/integration/flow.test.js`: **7 tests** (Phase 1 end-to-end flow, retries, overspend)
- **Phase 1 Subtotal**: **40 tests**

### Phase 2 Suite (New & Passing)
- `test/phase2/discovery.test.js`: **8 tests** (Registry discovery, filtering, latency, availability)
- `test/phase2/selection.test.js`: **7 tests** (Cost/quality scoring, constraint filters, edge cases)
- `test/phase2/flow.test.js`: **6 tests** (Autonomous flow, stale quotes, price mismatch, fallback, audit trail, tampering)
- `test/phase2/adversarial.test.js`: **9 tests** (Overspend attack, replays, 503 fallback, quote validation, budget exhaustion)
- **Phase 2 Subtotal**: **30 tests**

### Overall Test Suite Total
$$\mathbf{70\text{ tests passing, } 0\text{ failing}}$$
