const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const examplePath = path.join(__dirname, '..', '.env.example');

const defaultEnv = [
  "# =============================================",
  "# W3A-1: Autonomous Machine Payments (x402 V2)",
  "# Environment Configuration",
  "# =============================================",
  "",
  "# ---- Local Stack & Network Configuration ----",
  "NETWORK=localhost",
  "CHAIN_ID=31337",
  "CAIP2_NETWORK=eip155:31337",
  "HARDHAT_PORT=8545",
  "MARKETPLACE_PORT=14210",
  "DASHBOARD_PORT=14300",
  "",
  "# ---- Smart Contract Addresses (Localhost / Hardhat) ----",
  "ENFORCER_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  "TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "",
  "# ---- Signers & Cryptographic Keypairs (Hardhat Default Signers) ----",
  "OWNER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "OWNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "",
  "AGENT_ADDRESS=0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "AGENT_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "",
  "PROVIDER_ALPHA_ADDRESS=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "PROVIDER_ALPHA_PRIVATE_KEY=0x5de4111afa1a4b94908f83103eb2f9547b1015d10d0f8b898be2381283c4114d",
  "",
  "# ---- Accounting & Financial Invariants ----",
  "UNIT_MULTIPLIER=1",
  "TOKEN_DECIMALS=6",
  "INITIAL_ESCROW_FUNDING=50.00",
  "AUTHORIZED_BUDGET=20.00",
  "DEFAULT_SPEND_CAP=5.00",
  "",
  "# ---- Cloud Orchestrator (n8n Cloud & MCP Gateway) ----",
  "N8N_WEBHOOK_URL=https://rishisharma029.app.n8n.cloud/webhook/w3a1/purchase",
  "N8N_MCP_URL=https://rishisharma029.app.n8n.cloud/mcp-server/http",
  `N8N_ACCESS_KEY=${process.env.N8N_ACCESS_KEY || (fs.existsSync(envPath) ? (fs.readFileSync(envPath, 'utf8').match(/N8N_ACCESS_KEY=([^\r\n]+)/) || [])[1] : '') || ''}`,
  "",
  "# ---- Phase 2 (Sepolia Testnet Configuration) ----",
  "# SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
  "# SEPOLIA_CHAIN_ID=11155111",
  "# SEPOLIA_CAIP2=eip155:11155111",
  "# SEPOLIA_OWNER_PRIVATE_KEY=",
  "# SEPOLIA_AGENT_PRIVATE_KEY=",
  "# SEPOLIA_ENFORCER_ADDRESS=",
  "# SEPOLIA_TOKEN_ADDRESS=",
  ""
].join("\n");

const force = process.argv.includes('--force');

if (!fs.existsSync(envPath) || force) {
  fs.writeFileSync(envPath, defaultEnv, 'utf8');
  console.log('\x1b[32m✔ .env created successfully.\x1b[0m');
} else {
  console.log('\x1b[36mℹ .env already exists. (Use --force to overwrite)\x1b[0m');
}

console.log('\n--- Environment Summary ---');
console.log('NETWORK:               localhost (Hardhat Local EVM)');
console.log('CAIP-2:                eip155:31337');
console.log('ENFORCER_ADDRESS:      0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
console.log('TOKEN_ADDRESS:         0x5FbDB2315678afecb367f032d93F642f64180aa3');
console.log('OWNER_ADDRESS:         0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
console.log('AGENT_ADDRESS:         0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
console.log('PROVIDER_ALPHA:        0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
console.log('MARKETPLACE_PORT:      14210');
console.log('DASHBOARD_PORT:        14300');
console.log('N8N CLOUD:             https://rishisharma029.app.n8n.cloud');
console.log('---------------------------\n');
