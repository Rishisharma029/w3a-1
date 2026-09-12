# W3A-1 Phase 3 — Real Token Settlement + Owner Control Center

## 1. System Overview & Core Principle

In Phase 3, W3A-1 upgrades from an accounting-level spend authorization model into a **production-grade on-chain ERC-20 token settlement and escrow layer**, paired with a **Human Owner Control Center Dashboard**.

### Core Architecture

```
                       HUMAN OWNER
                            │ (Deposits $20 MockUSDC & sets cap)
                            ▼
                TOKEN ESCROW CONTRACT
               (TokenBudgetEnforcer.sol)
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
         BUDGET STATE             EMERGENCY FREEZE
     (EVM-Enforced Hard Cap)   (Instant On-Chain Pause)
               │                         │
               ▼                         ▼
            AI AGENT ──(Signs EIP-712)──► x402 CHALLENGE
               │                         │
               ▼                         ▼
      SERVICE PROVIDER ◄──(Facilitator)──► REAL ERC-20 SETTLEMENT
               │                               (MockUSDC Transfer)
               ▼
     CRYPTOGRAPHIC DELIVERY
   (sha256(canonicalJSON))
               │
               ▼
       OWNER DASHBOARD
 (Live Stats & Threat Alerts)
```

### The Unbreakable Security Invariant

**The AI agent is NEVER the financial authority.**
- The AI agent decides **WHAT** service it desires, **WHICH** provider it prefers, and **SIGNS** bounded payment authorizations.
- The **smart contract and facilitator** decide whether payment is authorized, whether the requested amount exceeds the owner's budget, whether the authorization has expired, whether the request has been replayed, and whether real tokens may be transferred.
- Budget enforcement is **physically enforced on-chain by the EVM**. If the agent attempts to overspend, the smart contract transaction reverts before any token balance changes.

---

## 2. Test ERC-20 Token (`MockUSDC.sol`)

A dedicated test token was introduced (`contracts/MockUSDC.sol`) conforming to standard ERC-20 specifications with **6 decimals** to mirror production USDC semantics:

```solidity
contract MockUSDC is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6;
    ...
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }
}
```

- **6 Decimals Precision**: Amounts are represented as integer micro-units (e.g. $4.00 = `4_000_000` units), preventing floating-point inaccuracies.
- **Test Faucet Minting**: Public `mint(address to, uint256 amount)` enables instant funding on local Hardhat and Sepolia testnets without relying on external faucets.
- **Mainnet / Sepolia Compatibility**: The architecture is fully compatible with standard USDC contracts on Ethereum mainnet or testnet (`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` on Sepolia).

---

## 3. Real Token Escrow & Budget Enforcement (`TokenBudgetEnforcer.sol`)

`TokenBudgetEnforcer.sol` acts as an autonomous treasury for the AI agent, providing:

### A. Escrow Funding & Withdrawal
- `fundBudget(uint256 amount)`: Owner deposits tokens into contract escrow. Increments `totalFunded` and `authorizedBudget`.
- `withdrawUnspent(uint256 amount)`: Owner can withdraw unspent tokens at any time, decreasing `authorizedBudget`. Reverts if withdrawal would breach `settledSpend`.
- `setAuthorizedBudget(uint256 newBudget)`: Owner can adjust spending authority without withdrawing funds.

### B. Strict Accounting Invariants
At all times across all contract operations:
$$\text{remainingBudget} = \text{authorizedBudget} - \text{settledSpend}$$
$$\text{settledSpend} \le \text{authorizedBudget}$$
$$\text{token}.\text{balanceOf}(\text{address}(\text{this})) \ge \text{authorizedBudget} - \text{settledSpend}$$

### C. On-Chain Replay Protection
- Every request ID (`bytes32 reqId`) is recorded in `_usedRequests[reqId] = true` upon authorization or settlement.
- Any subsequent attempt to reuse the same `reqId` immediately reverts with:
  `"TokenBudgetEnforcer: request ID already used"`.

### D. Delivery Hash Binding (Proof of Delivery)
During settlement, the cryptographic hash of the delivered service (`deliveryHash`) is immutably stored in the contract's `Authorization` record:
```solidity
struct Authorization {
    address provider;
    uint256 amount;
    uint256 validBefore;
    bytes32 deliveryHash;
    bool settled;
}
```
This cryptographically connects on-chain token settlement to off-chain service delivery proof.

---

## 4. Portable EIP-712 Signed Authorizations

Rather than requiring the AI agent to submit an on-chain transaction for every quote, Phase 3 implements an **EIP-712 typed signature scheme**.

### EIP-712 Typed Data Schema
```javascript
const EIP712_DOMAIN = {
  name: "TokenBudgetEnforcer",
  version: "1",
  chainId: 31337, // or 11155111 for Sepolia
  verifyingContract: enforcerAddress,
};

const EIP712_TYPES = {
  PaymentAuthorization: [
    { name: "reqId", type: "bytes32" },
    { name: "provider", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "validBefore", type: "uint256" },
  ],
};
```

### Cryptographic Verification in Smart Contract
```solidity
bytes32 structHash = keccak256(
    abi.encode(PAYMENT_AUTH_TYPEHASH, reqId, provider, amount, validBefore)
);
bytes32 digest = _hashTypedDataV4(structHash);
address recovered = ECDSA.recover(digest, signature);
require(recovered == agent, "TokenBudgetEnforcer: invalid agent signature");
```

### Security Properties of Signed Authorizations:
1. **Target Binding**: Signed authorization explicitly specifies `provider`. An attacker cannot divert funds to a different provider.
2. **Amount Binding**: Signed authorization explicitly locks `amount`. An attacker cannot settle for a higher amount.
3. **Temporal Binding**: Signed authorization includes `validBefore`. Expired authorizations revert.
4. **Replay Invalidation**: The contract marks `reqId` as used upon first settlement. Replaying the signature reverts.
5. **No Blind Wallet Approvals**: The AI agent never has unrestricted token allowance. It can only authorize specific payments bound to specific request IDs.

---

## 5. x402 Protocol Integration & Facilitator Abstraction

The payment flow is structured around the **x402 payment protocol** specification.

### Complete Protocol Sequence

```
AGENT                           PROVIDER                       FACILITATOR / CONTRACT
  │                                │                                      │
  │── 1. GET /service?serviceId ──►│                                      │
  │                                │                                      │
  │◄── 2. HTTP 402 Payment Req ────│ (Generates reqId, quotes amount)     │
  │      (x402 Challenge)          │                                      │
  │                                │                                      │
  │── 3. Signs EIP-712 Auth        │                                      │
  │                                │                                      │
  │── 4. POST /deliver ───────────►│                                      │
  │      (with PaymentPayload)     │── 5. verify(paymentPayload) ────────►│
  │                                │◄── 6. { valid: true } ───────────────│
  │                                │                                      │
  │                                │── 7. Generates content & hash        │
  │                                │                                      │
  │                                │── 8. settle(payload, hash) ─────────►│
  │                                │◄── 9. { settled: true, txHash } ─────│ (ERC-20 transferred)
  │                                │                                      │
  │◄── 10. HTTP 200 Delivered ─────│                                      │
  │       (Content + Receipt)      │                                      │
  │                                │                                      │
  │── 11. Recomputes SHA-256 Hash  │                                      │
  │       (Verifies Delivery)      │                                      │
```

### Payment Facilitator Abstraction (`facilitator/facilitator.js`)
Decouples blockchain mechanics from provider business logic:
- `verify(paymentPayload, paymentRequirements)`: Pre-flight check validating provider address, amount, expiry, agent signature, contract remaining budget, and freeze state.
- `settle(paymentPayload, deliveryHash)`: Submits the on-chain settlement transaction to `TokenBudgetEnforcer.settleWithSignature()`, linking the delivery content hash and transferring tokens.
- `getSettlementStatus(reqId)`: Queries on-chain settlement status and transaction references.
- `getContractBudgetState()`: Returns live budget, spend, and unspent escrow balances.

---

## 6. Human Owner Control Center & Dashboard (`dashboard/`)

A dedicated dashboard provides real-time oversight and emergency controls for the human owner:

### Dashboard Features
1. **Live Budget Metrics**: Real-time display of Total Funded, Authorized Cap, Settled Spend, Remaining Budget, and Utilization Percentage.
2. **Emergency Agent Freeze**: An interactive toggle executing on-chain `freezeAgent(bool)`:
   - When frozen, the AI agent can continue reasoning and discovering services, but **every payment settlement physically reverts at the smart contract level**.
3. **Budget Funding Interface**: Deposit additional MockUSDC directly into escrow.
4. **Live Settlements Ledger**: Table of all settled transactions displaying Request ID, Provider, Amount, Settlement Status, Transaction Hash, and Delivery Hash.
5. **Security Threat Defense Feed**: Real-time alerts displaying:
   - `OVERSPEND_REJECTED`: Blocked attempts to exceed spending cap.
   - `REPLAY_REJECTED`: Blocked replay attacks.
   - `DELIVERY_TAMPERING_DETECTED`: Content hash mismatches flagged.
   - `AGENT_FROZEN`: Emergency freeze status changes.

---

## 7. Comprehensive Threat Model & Security Review

| Attack Vector | Threat Scenario | Defense Mechanism | Contract / Test Verification |
|---|---|---|---|
| **Autonomous Overspend** | Agent attempts to purchase $25 service with $16 remaining | `TokenBudgetEnforcer` checks `settledSpend + amount <= authorizedBudget`; reverts before transfer | ST-06, Demo3 S3 |
| **Signature Replay** | Attacker resubmits signed authorization to settle again | Contract records `_usedRequests[reqId] = true`; second call reverts with `"request ID already used"` | EA-07, ST-04, Demo3 S4 |
| **Signature Malleability** | Attacker alters signature bytes | OpenZeppelin `ECDSA.recover` validates canonical `s` and `v` values; rejects malleable signatures | EA-01, EA-03 |
| **Provider Mismatch** | Authorization signed for Provider A submitted to Provider B | Facilitator and contract recover signer over `provider` address; mismatch fails signature or check | EA-04 |
| **Amount Tampering** | Authorization signed for $3 submitted for $5 | `amount` is an explicit field in the EIP-712 struct; altering amount invalidates signature | EA-05 |
| **Expired Authorizations** | Attacker hoards old authorization and submits later | Contract enforces `block.timestamp <= validBefore`; expired calls revert | EA-06 |
| **Emergency Freeze Bypass** | Frozen agent attempts to authorize or settle | `whenNotFrozen` modifier checks `!isFrozen` on every authorization and settlement entry point | TB-07, XF-06, Demo3 S6 |
| **Delivery Tampering** | Provider alters resource payload after generating receipt | Client recomputes `sha256(canonicalJSON(content))`; flags hash mismatch; alerts owner | XF-05, Demo3 S5 |
| **Unauthorized Caller** | Rogue address attempts `fundBudget`, `withdrawUnspent`, or `freezeAgent` | `onlyOwner` modifier checks `msg.sender == owner`; unauthorized calls revert | TB-04 |
| **Reentrancy** | Malicious token or recipient attempts reentrancy during transfer | `nonReentrant` on all state-mutating functions; state updated before external token transfer | ST-01, ST-04 |
| **Integer Underflow / Overspend** | Token decimals / overflow bugs | Solidity 0.8.24 native checked arithmetic prevents overflow/underflow | ST-01, TB-03 |
| **Double-Charge on Retry** | Network drop causes client retry of POST /deliver | Provider `ReceiptStore` returns cached receipt without triggering second on-chain settlement | XF-03 |

---

## 8. Sepolia Deployment Path

A complete deployment configuration is provided via `scripts/deploy-phase3.js` and `hardhat.config.js`.

### Deployment Instructions

1. Configure `.env`:
   ```bash
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
   OWNER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
   OWNER_ADDRESS=0xYOUR_OWNER_ADDRESS
   AGENT_ADDRESS=0xYOUR_AGENT_ADDRESS
   INITIAL_FUNDING_USDC=20
   ```

2. Run Sepolia Deployment:
   ```bash
   npm run deploy:sepolia
   ```

3. Deploy to Local Hardhat Node:
   ```bash
   npm run deploy:local
   ```

---

## 9. Comprehensive Test Suite Matrix

```
======================================================================
PHASE 1 FOUNDATION (40 TESTS)
======================================================================
  BudgetEnforcer Smart Contract Unit Tests        : 33 passing
  Phase 1 Full Payment Flow Integration Tests     : 7 passing

======================================================================
PHASE 2 MULTI-PROVIDER MARKETPLACE (30 TESTS)
======================================================================
  Service Discovery Registry Tests                : 8 passing
  Provider Selection & Scoring Tests              : 7 passing
  End-to-End Autonomous Flow Tests                : 6 passing
  Adversarial & Failure Scenarios Tests           : 9 passing

======================================================================
PHASE 3 REAL TOKEN SETTLEMENT & DASHBOARD (30 TESTS)
======================================================================
  MockUSDC Token & Budget Escrow Tests            : 8 passing
  EIP-712 Signed Authorization Tests              : 8 passing
  Real ERC-20 Settlement & Accounting Tests       : 7 passing
  End-to-End x402 Real Settlement Flow Tests      : 7 passing

======================================================================
TOTAL TEST SUITE SUMMARY
======================================================================
  TOTAL TESTS: 100 PASSING
  FAILURES   : 0
======================================================================
```

---

## 10. Recommended Phase 4 Work

1. **Production x402 Facilitator Integration**: Connect `PaymentFacilitator` to a live x402 facilitator network (e.g. Coinbase Developer Platform x402 facilitator or ERC-4337 paymaster).
2. **Conditional Hashlock Escrow (Trustless Delivery)**: Upgrade the settlement flow to require the provider to reveal a preimage matching a delivery commitment on-chain, achieving 100% trustless conditional delivery without trusting provider honesty.
3. **Multi-Token Support**: Expand `TokenBudgetEnforcer` to manage multiple ERC-20 tokens simultaneously (USDC, USDT, EURC, DAI) with per-token spending limits.
4. **Decentralized Provider Registry**: Migrate the provider discovery registry from HTTP Express to an on-chain registry contract with staking and slashing for misbehaving providers.
