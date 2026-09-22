// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title TokenBudgetEnforcer
 * @notice Real token escrow and settlement contract for W3A-1 Phase 3.
 *
 * Core Guarantees:
 *  1. Protocol-Level Budget Cap: Spend cannot physically exceed authorizedBudget.
 *  2. Real ERC-20 Settlement: Actual tokens are transferred to providers upon valid delivery.
 *  3. EIP-712 Portable Authorizations: AI agent signs typed authorizations; provider/facilitator settles.
 *  4. Anti-Replay: Each request ID (reqId) can only be authorized and settled once.
 *  5. Bound Parameters: Payee, amount, and expiry are cryptographically bound.
 *  6. Delivery Proof Binding: On-chain settlement records the delivery contentHash.
 *  7. Human Owner Control: Owner can fund, withdraw unspent tokens, or freeze the agent immediately.
 */
contract TokenBudgetEnforcer is ReentrancyGuard, EIP712 {
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // EIP-712 Typehash
    // -------------------------------------------------------------------------
    bytes32 public constant PAYMENT_AUTH_TYPEHASH = keccak256(
        "PaymentAuthorization(bytes32 reqId,address provider,uint256 amount,uint256 validBefore)"
    );

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------
    struct Authorization {
        address provider;
        uint256 amount;
        uint256 validBefore;
        bytes32 deliveryHash;
        bool settled;
        bool cancelled;
    }

    // -------------------------------------------------------------------------
    // Immutables & State Variables
    // -------------------------------------------------------------------------
    IERC20 public immutable token;
    address public owner;
    address public agent;
    bool public isFrozen;

    uint256 public totalFunded;
    uint256 public authorizedBudget;
    uint256 public settledSpend;
    uint256 public reservedSpend;
    uint256 public totalWithdrawn;

    mapping(bytes32 => bool) private _usedRequests;
    mapping(bytes32 => Authorization) private _authorizations;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event BudgetFunded(address indexed funder, uint256 amount, uint256 totalBudget);
    event BudgetCapUpdated(uint256 newBudget);
    event Withdrawal(address indexed recipient, uint256 amount, uint256 remainingBudget);
    event AgentSet(address indexed newAgent);
    event AgentFrozen(bool isFrozen);
    event PaymentAuthorized(bytes32 indexed reqId, address indexed provider, uint256 amount, uint256 validBefore);
    event PaymentSettled(bytes32 indexed reqId, address indexed provider, uint256 amount, bytes32 deliveryHash);
    event PaymentRejected(bytes32 indexed reqId, address indexed provider, uint256 amount, string reason);
    event AuthorizationCancelled(bytes32 indexed reqId, uint256 amount);
    event AuthorizationExpired(bytes32 indexed reqId, uint256 amount);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------
    modifier onlyOwner() {
        require(msg.sender == owner, "TokenBudgetEnforcer: caller is not owner");
        _;
    }

    modifier onlyAgent() {
        require(msg.sender == agent, "TokenBudgetEnforcer: caller is not agent");
        _;
    }

    modifier whenNotFrozen() {
        require(!isFrozen, "TokenBudgetEnforcer: agent is frozen by owner");
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(
        address _token,
        address _owner,
        address _agent
    ) EIP712("TokenBudgetEnforcer", "1") {
        require(_token != address(0), "TokenBudgetEnforcer: zero token address");
        require(_owner != address(0), "TokenBudgetEnforcer: zero owner address");
        require(_agent != address(0), "TokenBudgetEnforcer: zero agent address");

        token = IERC20(_token);
        owner = _owner;
        agent = _agent;
        isFrozen = false;

        emit AgentSet(_agent);
    }

    // -------------------------------------------------------------------------
    // Owner Controls
    // -------------------------------------------------------------------------

    /**
     * @notice Deposit tokens into escrow and increase the authorized budget.
     * @param amount Amount of ERC-20 tokens (e.g. in 6-decimal units)
     */
    function fundBudget(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "TokenBudgetEnforcer: amount must be > 0");

        totalFunded += amount;
        authorizedBudget += amount;

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit BudgetFunded(msg.sender, amount, authorizedBudget);
    }

    /**
     * @notice Adjust authorized spending cap. Must be >= settled spend and <= total unwithdrawn.
     */
    function setAuthorizedBudget(uint256 newBudget) external onlyOwner {
        require(newBudget >= settledSpend + reservedSpend, "TokenBudgetEnforcer: budget cannot be below committed spend");
        require(newBudget <= totalFunded - totalWithdrawn, "TokenBudgetEnforcer: budget exceeds funded balance");

        authorizedBudget = newBudget;
        emit BudgetCapUpdated(newBudget);
    }

    /**
     * @notice Withdraw unspent tokens from the contract escrow back to the owner.
     */
    function withdrawUnspent(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "TokenBudgetEnforcer: amount must be > 0");
        uint256 unspent = token.balanceOf(address(this));
        require(amount <= unspent, "TokenBudgetEnforcer: insufficient escrow balance");
        require(authorizedBudget - amount >= settledSpend + reservedSpend, "TokenBudgetEnforcer: withdrawal breaches committed spend");

        authorizedBudget -= amount;
        totalWithdrawn += amount;

        token.safeTransfer(owner, amount);

        emit Withdrawal(owner, amount, remainingBudget());
    }

    /**
     * @notice Emergency freeze control. Instantly halts all new authorizations and settlements.
     */
    function freezeAgent(bool frozen) external onlyOwner {
        isFrozen = frozen;
        emit AgentFrozen(frozen);
    }

    /**
     * @notice Update agent address.
     */
    function setAgent(address newAgent) external onlyOwner {
        require(newAgent != address(0), "TokenBudgetEnforcer: zero agent address");
        agent = newAgent;
        emit AgentSet(newAgent);
    }

    // -------------------------------------------------------------------------
    // Agent Direct Authorization
    // -------------------------------------------------------------------------

    /**
     * @notice Agent explicitly authorizes a pending payment on-chain before delivery.
     */
    function authorizePayment(
        bytes32 reqId,
        address provider,
        uint256 amount,
        uint256 validBefore
    ) external onlyAgent whenNotFrozen nonReentrant {
        require(amount > 0, "TokenBudgetEnforcer: amount must be > 0");
        require(provider != address(0), "TokenBudgetEnforcer: invalid provider");
        require(block.timestamp <= validBefore, "TokenBudgetEnforcer: authorization expired");

        if (_usedRequests[reqId]) {
            emit PaymentRejected(reqId, provider, amount, "Request ID already used");
            revert("TokenBudgetEnforcer: request ID already used");
        }

        if (settledSpend + reservedSpend + amount > authorizedBudget) {
            emit PaymentRejected(reqId, provider, amount, "Spending cap exceeded");
            revert("TokenBudgetEnforcer: spending cap exceeded");
        }

        _usedRequests[reqId] = true;
        _authorizations[reqId] = Authorization({
            provider: provider,
            amount: amount,
            validBefore: validBefore,
            deliveryHash: bytes32(0),
            settled: false,
            cancelled: false
        });
        reservedSpend += amount;

        emit PaymentAuthorized(reqId, provider, amount, validBefore);
    }

    /**
     * @notice Provider or facilitator settles an authorized payment upon providing delivery proof.
     */
    function settlePayment(
        bytes32 reqId,
        bytes32 deliveryHash
    ) external whenNotFrozen nonReentrant {
        Authorization storage auth = _authorizations[reqId];
        require(auth.amount > 0, "TokenBudgetEnforcer: authorization not found");
        require(!auth.settled, "TokenBudgetEnforcer: payment already settled");
        require(!auth.cancelled, "TokenBudgetEnforcer: authorization cancelled");
        require(block.timestamp <= auth.validBefore, "TokenBudgetEnforcer: authorization expired");
        require(deliveryHash != bytes32(0), "TokenBudgetEnforcer: invalid delivery hash");

        require(settledSpend + auth.amount <= authorizedBudget, "TokenBudgetEnforcer: spending cap exceeded");

        auth.settled = true;
        auth.deliveryHash = deliveryHash;
        reservedSpend -= auth.amount;
        settledSpend += auth.amount;

        token.safeTransfer(auth.provider, auth.amount);

        emit PaymentSettled(reqId, auth.provider, auth.amount, deliveryHash);
    }

    /**
     * @notice Agent or owner cancels an active pending authorization, releasing reserved capital.
     */
    function cancelAuthorization(bytes32 reqId) external whenNotFrozen nonReentrant {
        require(msg.sender == owner || msg.sender == agent, "TokenBudgetEnforcer: unauthorized caller");
        Authorization storage auth = _authorizations[reqId];
        require(auth.amount > 0, "TokenBudgetEnforcer: authorization not found");
        require(!auth.settled, "TokenBudgetEnforcer: payment already settled");
        require(!auth.cancelled, "TokenBudgetEnforcer: authorization already cancelled");

        auth.cancelled = true;
        reservedSpend -= auth.amount;

        emit AuthorizationCancelled(reqId, auth.amount);
    }

    /**
     * @notice Permissionlessly releases reserved capital for an authorization whose validBefore has passed.
     */
    function releaseExpiredAuthorization(bytes32 reqId) external whenNotFrozen nonReentrant {
        Authorization storage auth = _authorizations[reqId];
        require(auth.amount > 0, "TokenBudgetEnforcer: authorization not found");
        require(!auth.settled, "TokenBudgetEnforcer: payment already settled");
        require(!auth.cancelled, "TokenBudgetEnforcer: authorization already cancelled");
        require(block.timestamp > auth.validBefore, "TokenBudgetEnforcer: authorization not expired");

        auth.cancelled = true;
        reservedSpend -= auth.amount;

        emit AuthorizationExpired(reqId, auth.amount);
    }

    // -------------------------------------------------------------------------
    // EIP-712 Signed Authorization Settlement (Portable Flow)
    // -------------------------------------------------------------------------

    /**
     * @notice Atomically verifies the agent's EIP-712 signed authorization, enforces the spending
     *         cap, links the delivery hash, and transfers tokens to the provider.
     */
    function settleWithSignature(
        bytes32 reqId,
        address provider,
        uint256 amount,
        uint256 validBefore,
        bytes32 deliveryHash,
        bytes calldata signature
    ) external whenNotFrozen nonReentrant {
        require(amount > 0, "TokenBudgetEnforcer: amount must be > 0");
        require(provider != address(0), "TokenBudgetEnforcer: invalid provider");
        require(block.timestamp <= validBefore, "TokenBudgetEnforcer: authorization expired");
        require(deliveryHash != bytes32(0), "TokenBudgetEnforcer: invalid delivery hash");

        if (_usedRequests[reqId]) {
            emit PaymentRejected(reqId, provider, amount, "Request ID already used");
            revert("TokenBudgetEnforcer: request ID already used");
        }

        if (settledSpend + reservedSpend + amount > authorizedBudget) {
            emit PaymentRejected(reqId, provider, amount, "Spending cap exceeded");
            revert("TokenBudgetEnforcer: spending cap exceeded");
        }

        // Verify EIP-712 typed signature from the authorized agent
        bytes32 structHash = keccak256(
            abi.encode(PAYMENT_AUTH_TYPEHASH, reqId, provider, amount, validBefore)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        require(recovered == agent, "TokenBudgetEnforcer: invalid agent signature");

        // Effects
        _usedRequests[reqId] = true;
        _authorizations[reqId] = Authorization({
            provider: provider,
            amount: amount,
            validBefore: validBefore,
            deliveryHash: deliveryHash,
            settled: true,
            cancelled: false
        });
        settledSpend += amount;

        // Interaction: Real ERC-20 transfer to provider
        token.safeTransfer(provider, amount);

        emit PaymentSettled(reqId, provider, amount, deliveryHash);
    }

    // -------------------------------------------------------------------------
    // View Functions & Invariants
    // -------------------------------------------------------------------------

    /**
     * @notice Available budget that can be allocated to new authorizations or settlements.
     *         Always equals authorizedBudget - settledSpend - reservedSpend.
     */
    function availableBudget() public view returns (uint256) {
        if (settledSpend + reservedSpend >= authorizedBudget) {
            return 0;
        }
        return authorizedBudget - settledSpend - reservedSpend;
    }

    /**
     * @notice Remaining authorized spend. Equals availableBudget().
     */
    function remainingBudget() public view returns (uint256) {
        return availableBudget();
    }

    /**
     * @notice True if a request ID has already been authorized or settled.
     */
    function isRequestUsed(bytes32 reqId) external view returns (bool) {
        return _usedRequests[reqId];
    }

    /**
     * @notice True if an authorization has been cancelled or expired.
     */
    function isAuthorizationCancelled(bytes32 reqId) external view returns (bool) {
        return _authorizations[reqId].cancelled;
    }

    /**
     * @notice Returns authorization details for a given request ID.
     */
    function getAuthorization(bytes32 reqId) external view returns (
        address provider,
        uint256 amount,
        uint256 validBefore,
        bytes32 deliveryHash,
        bool settled
    ) {
        Authorization storage a = _authorizations[reqId];
        return (a.provider, a.amount, a.validBefore, a.deliveryHash, a.settled);
    }

    /**
     * @notice Returns unspent token balance sitting in escrow.
     */
    function unspentEscrow() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
