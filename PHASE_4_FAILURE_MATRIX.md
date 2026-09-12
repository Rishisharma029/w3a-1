# PHASE_4_FAILURE_MATRIX.md — W3A-1 Attack & Failure Scenarios

## Purpose

This matrix documents every known failure scenario, what the expected outcome is, and which enforcement layer catches it. This is the authoritative reference for "what happens when X goes wrong."

---

## Malicious Agent Failures

| # | Failure | Expected Result | Enforcement Layer |
|---|---------|----------------|------------------|
| MA-01 | Agent signs authorization for amount > remaining budget | `settleWithSignature` reverts: "spending cap exceeded" | Smart contract (`TokenBudgetEnforcer`) |
| MA-02 | Agent calls `setAuthorizedBudget` to increase own budget | Reverts: "caller is not owner" | `onlyOwner` modifier |
| MA-03 | Agent calls `freezeAgent(false)` to unfreeze itself | Reverts: "caller is not owner" | `onlyOwner` modifier |
| MA-04 | Agent calls `withdrawUnspent` to drain escrow | Reverts: "caller is not owner" | `onlyOwner` modifier |
| MA-05 | Agent replays settled reqId with valid signature | Reverts: "request ID already used" | `_usedRequests` mapping |
| MA-06 | Agent signs for provider A but settlement submitted for provider B | Reverts: "invalid agent signature" | EIP-712 + `ECDSA.recover()` |
| MA-07 | Agent signs for $4 but settlement submitted for $8 | Reverts: "invalid agent signature" | EIP-712 + `ECDSA.recover()` |
| MA-08 | Agent submits expired authorization (`validBefore < now`) | Reverts: "authorization expired" | `block.timestamp <= validBefore` |
| MA-09 | Agent attempts purchase while frozen by owner | Reverts: "agent is frozen by owner" | `whenNotFrozen` modifier |
| MA-10 | Agent uses `address(0)` as provider in authorization | Reverts: "invalid provider" | Constructor null check |

---

## Malicious Provider Failures

| # | Failure | Expected Result | Enforcement Layer |
|---|---------|----------------|------------------|
| MP-01 | Provider changes price after issuing quote | Quote store rejects with 400 "price mismatch" | `quote-store.js` off-chain validation |
| MP-02 | Provider redirects payment destination address | Reverts: "invalid agent signature" | EIP-712 signature binding |
| MP-03 | Provider delivers modified content | Client detects hash mismatch; `hashVerified = false` | SHA-256 hash comparison (off-chain) |
| MP-04 | Provider replays delivery request for second payment | Reverts: "request ID already used" | `_usedRequests` on-chain mapping |
| MP-05 | Provider submits duplicate `settlePayment` for same reqId | Reverts: "payment already settled" | `auth.settled` flag check |
| MP-06 | Provider calls `settlePayment` without prior authorization | Reverts: "authorization not found" | `auth.amount > 0` check |
| MP-07 | Provider omits reqId in paymentPayload | Returns 400: "missing reqId" | Express route validation |
| MP-08 | Provider submits `bytes32(0)` as delivery hash | Reverts: "invalid delivery hash" | `deliveryHash != bytes32(0)` check |
| MP-09 | Provider becomes unavailable after agent signs | Agent gets failure response; no budget charged | reqId never submitted; replaying fails if partial |
| MP-10 | Provider submits stale quote (TTL expired) | Quote store rejects with 400 "quote expired" | `quote-store.js` TTL validation |
| MP-11 | Provider attempts to call `fundBudget` on behalf of owner | Reverts: "caller is not owner" | `onlyOwner` modifier |
| MP-12 | Provider uses zero address as payment destination | Reverts: "invalid provider" | Constructor check on provider param |

---

## Protocol / Infrastructure Failures

| # | Failure | Expected Result | Enforcement Layer |
|---|---------|----------------|------------------|
| PF-01 | Network timeout after payment signed but before delivery | Agent retries; idempotency from reqId replay protection | `_usedRequests` prevents double-settle |
| PF-02 | Settlement transaction dropped (no receipt) | Facilitator returns `settled: false`; retry with new reqId | Application-level error handling |
| PF-03 | EVM node goes offline during settlement | ethers.js throws; facilitator returns `settled: false` | Error propagation |
| PF-04 | Agent crashes mid-purchase | Budget not charged (settlement not submitted) | EVM atomicity |
| PF-05 | Two agents attempt same reqId simultaneously | One wins; other reverts on replay guard | `nonReentrant` + `_usedRequests` |
| PF-06 | Chain reorg after settlement | Possible on mainnet; acceptable risk for testnet demo | External risk (not mitigated) |

---

## Owner Control Failures

| # | Failure | Expected Result | Enforcement Layer |
|---|---------|----------------|------------------|
| OC-01 | Owner withdraws more than unspent escrow | Reverts: "insufficient escrow balance" | Balance check in `withdrawUnspent` |
| OC-02 | Owner sets budget below already-settled spend | Reverts: "budget cannot be below settled spend" | `setAuthorizedBudget` validation |
| OC-03 | Non-owner calls freeze/withdraw/setAgent | Reverts: "caller is not owner" | `onlyOwner` modifier |
| OC-04 | Owner sets agent to `address(0)` | Reverts: "zero agent address" | Null check in `setAgent` |
| OC-05 | Owner tries to deploy with zero token address | Reverts: "zero token address" | Constructor validation |

---

## Off-Chain / Application Failures (Cannot Be Caught On-Chain)

| # | Failure | Expected Result | Mitigation |
|---|---------|----------------|------------|
| OA-01 | AI agent jailbroken to select wrong provider | Agent selects expensive/wrong provider | Budget cap still enforces hard limit |
| OA-02 | Registry shows fake providers | Agent may pay a fake provider | Off-chain issue; on-chain: any valid EIP-712 signature settles |
| OA-03 | Dashboard shows stale state | UI may lag; actual on-chain state is authoritative | Polling + manual refresh |
| OA-04 | Facilitator sends wrong delivery hash on-chain | Wrong hash stored permanently | Provider accountability; off-chain record |
| OA-05 | Agent trusts malicious provider's receipt | Content may be wrong even if hash matches | Use trusted provider set |

---

## Invariants That Must Never Be Violated

| Invariant | Description |
|-----------|-------------|
| INV-01 | `remainingBudget() == authorizedBudget - settledSpend` always |
| INV-02 | `unspentEscrow() == token.balanceOf(contract)` always |
| INV-03 | `settledSpend` is monotonically non-decreasing |
| INV-04 | `settledSpend <= authorizedBudget` always |
| INV-05 | `totalFunded >= settledSpend` always |
| INV-06 | Once `_usedRequests[reqId] = true`, it stays true permanently |
| INV-07 | When `isFrozen == true`, NO settlement can succeed |
| INV-08 | `auth.deliveryHash` after settlement is immutable |
| INV-09 | Token transferred to provider == amount in `PaymentSettled` event |
| INV-10 | Non-existent reqId returns zero-value struct from `getAuthorization` |
