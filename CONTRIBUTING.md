# Contributing to W3A-1

Thank you for your interest in contributing to **W3A-1: Autonomous Machine Payments (x402 V2)**!

We welcome contributions from developers, security researchers, and Web3 builders.

---

## Getting Started

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Hardhat**: Local EVM environment
- **PHP**: 8.2+ with PDO MySQL (optional, required for persistent marketplace layer)
- **MySQL**: 8.0+ (optional, fallback in-memory mock available)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Rishisharma029/w3a-1.git
cd w3a-1

# Install Node dependencies
npm install

# Copy environment template
cp .env.example .env
```

---

## Development Workflow

### Running Tests
W3A-1 maintains a zero-regression invariant across smart contracts, x402 HTTP wire handshakes, and adversarial attack scenarios:

```bash
# Run all unit and integration tests (169 passing)
npm run test:all

# Run contract unit tests
npm test

# Run 18-step product integration test
node scripts/test-product-integration.js
```

### Running Localhost Stack
To boot the complete full-stack environment (Hardhat EVM, MockUSDC, TokenBudgetEnforcer, MySQL 8.0, PHP 8.3 API, x402 Marketplace, and Owner Control Center Dashboard):

```bash
npm run start:local
```
- **Owner Control Center**: `http://localhost:14300`
- **Marketplace Portal**: `http://localhost:14210`
- **PHP RESTful API**: `http://127.0.0.1:8088/api.php`
- **Hardhat RPC**: `http://127.0.0.1:8545`

---

## Coding Standards

1. **Security Invariant**: The smart contract (`TokenBudgetEnforcer.sol`) is always the source of financial truth. Never trust client or LLM intent for spending authorization.
2. **x402 Compliance**: Follow official x402 V2 specifications with `@x402/core`. Use exact atomic units (e.g. `4000000` for 4.00 USDC).
3. **Prepared Statements**: All SQL queries in PHP must use PDO prepared statements to guarantee SQL injection immunity.
4. **No Secrets in Git**: Never commit `.env`, private keys, or API tokens. Keep them in `.env` (gitignored).

---

## Submitting Pull Requests

1. Fork the repo and create your feature branch: `git checkout -b feature/my-feature`.
2. Commit your changes with conventional commit messages: `git commit -m "feat: add capability..."`.
3. Verify that all 169 tests pass: `npm run test:all`.
4. Push to your branch and open a Pull Request.

---

## License & Code of Conduct
By contributing to W3A-1, you agree that your contributions will be licensed under the [MIT License](LICENSE) and abide by our [Code of Conduct](CODE_OF_CONDUCT.md).
