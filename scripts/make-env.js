const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const force = process.argv.includes('--force');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const content = fs.readFileSync(filePath, 'utf8');
  return content.split(/\r?\n/).reduce((acc, line) => {
    if (!line || line.trim().startsWith('#')) return acc;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) return acc;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) acc[key] = value;
    return acc;
  }, {});
}

const existingEnv = parseEnvFile(envPath);
const safeDefaults = {
  NETWORK: 'localhost',
  CHAIN_ID: '31337',
  CAIP2_NETWORK: 'eip155:31337',
  HARDHAT_PORT: '8545',
  MARKETPLACE_PORT: '14210',
  DASHBOARD_PORT: '14300',
  ENFORCER_ADDRESS: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  TOKEN_ADDRESS: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  OWNER_ADDRESS: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  AGENT_ADDRESS: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  PROVIDER_ALPHA_ADDRESS: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  UNIT_MULTIPLIER: '1',
  TOKEN_DECIMALS: '6',
  INITIAL_ESCROW_FUNDING: '50.00',
  AUTHORIZED_BUDGET: '20.00',
  DEFAULT_SPEND_CAP: '5.00'
};

const placeholderDefaults = {
  OWNER_PRIVATE_KEY: '',
  AGENT_PRIVATE_KEY: '',
  PROVIDER_ALPHA_PRIVATE_KEY: '',
  N8N_WEBHOOK_URL: '',
  N8N_MCP_URL: '',
  N8N_ACCESS_KEY: ''
};

const sensitiveKeys = new Set(Object.keys(placeholderDefaults));

function pickValue(key) {
  if (process.env[key]) return process.env[key];
  if (force && existingEnv[key]) return existingEnv[key];
  return safeDefaults[key] ?? placeholderDefaults[key] ?? '';
}

const defaultEnv = [
  '# =============================================',
  '# W3A-1: Autonomous Machine Payments (x402 V2)',
  '# Environment Configuration',
  '# =============================================',
  '',
  '# SECURITY NOTE:',
  '# This file no longer includes committed private keys or cloud credentials.',
  '# If previously exposed values were used outside local Hardhat defaults, rotate/revoke them.',
  '',
  '# ---- Local Stack & Network Configuration ----',
  `NETWORK=${pickValue('NETWORK')}`,
  `CHAIN_ID=${pickValue('CHAIN_ID')}`,
  `CAIP2_NETWORK=${pickValue('CAIP2_NETWORK')}`,
  `HARDHAT_PORT=${pickValue('HARDHAT_PORT')}`,
  `MARKETPLACE_PORT=${pickValue('MARKETPLACE_PORT')}`,
  `DASHBOARD_PORT=${pickValue('DASHBOARD_PORT')}`,
  '',
  '# ---- Smart Contract Addresses (Localhost / Hardhat) ----',
  `ENFORCER_ADDRESS=${pickValue('ENFORCER_ADDRESS')}`,
  `TOKEN_ADDRESS=${pickValue('TOKEN_ADDRESS')}`,
  '',
  '# ---- Signers & Cryptographic Keypairs ----',
  `OWNER_ADDRESS=${pickValue('OWNER_ADDRESS')}`,
  `OWNER_PRIVATE_KEY=${pickValue('OWNER_PRIVATE_KEY')}`,
  '',
  `AGENT_ADDRESS=${pickValue('AGENT_ADDRESS')}`,
  `AGENT_PRIVATE_KEY=${pickValue('AGENT_PRIVATE_KEY')}`,
  '',
  `PROVIDER_ALPHA_ADDRESS=${pickValue('PROVIDER_ALPHA_ADDRESS')}`,
  `PROVIDER_ALPHA_PRIVATE_KEY=${pickValue('PROVIDER_ALPHA_PRIVATE_KEY')}`,
  '',
  '# ---- Accounting & Financial Invariants ----',
  `UNIT_MULTIPLIER=${pickValue('UNIT_MULTIPLIER')}`,
  `TOKEN_DECIMALS=${pickValue('TOKEN_DECIMALS')}`,
  `INITIAL_ESCROW_FUNDING=${pickValue('INITIAL_ESCROW_FUNDING')}`,
  `AUTHORIZED_BUDGET=${pickValue('AUTHORIZED_BUDGET')}`,
  `DEFAULT_SPEND_CAP=${pickValue('DEFAULT_SPEND_CAP')}`,
  '',
  '# ---- Cloud Orchestrator (n8n Cloud & MCP Gateway) ----',
  `N8N_WEBHOOK_URL=${pickValue('N8N_WEBHOOK_URL')}`,
  `N8N_MCP_URL=${pickValue('N8N_MCP_URL')}`,
  `N8N_ACCESS_KEY=${pickValue('N8N_ACCESS_KEY')}`,
  '',
  '# ---- Phase 2 (Sepolia Testnet Configuration) ----',
  '# SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  '# SEPOLIA_CHAIN_ID=11155111',
  '# SEPOLIA_CAIP2=eip155:11155111',
  '# SEPOLIA_OWNER_PRIVATE_KEY=',
  '# SEPOLIA_AGENT_PRIVATE_KEY=',
  '# SEPOLIA_ENFORCER_ADDRESS=',
  '# SEPOLIA_TOKEN_ADDRESS=',
  ''
].join('\n');

if (!fs.existsSync(envPath) || force) {
  fs.writeFileSync(envPath, defaultEnv, 'utf8');
  console.log(force ? '\x1b[32m✔ .env regenerated successfully.\x1b[0m' : '\x1b[32m✔ .env created successfully.\x1b[0m');
} else {
  console.log('\x1b[36mℹ .env already exists. (Use --force to regenerate safely)\x1b[0m');
}

function displayValue(key, value) {
  if (sensitiveKeys.has(key)) {
    return value ? '[configured]' : '[not set]';
  }
  return value || '[not set]';
}

const summaryEnv = force ? parseEnvFile(envPath) : { ...safeDefaults, ...existingEnv, ...process.env };

console.log('\n--- Environment Summary ---');
console.log(`NETWORK:               ${displayValue('NETWORK', summaryEnv.NETWORK)}`);
console.log(`CAIP-2:                ${displayValue('CAIP2_NETWORK', summaryEnv.CAIP2_NETWORK)}`);
console.log(`ENFORCER_ADDRESS:      ${displayValue('ENFORCER_ADDRESS', summaryEnv.ENFORCER_ADDRESS)}`);
console.log(`TOKEN_ADDRESS:         ${displayValue('TOKEN_ADDRESS', summaryEnv.TOKEN_ADDRESS)}`);
console.log(`OWNER_ADDRESS:         ${displayValue('OWNER_ADDRESS', summaryEnv.OWNER_ADDRESS)}`);
console.log(`AGENT_ADDRESS:         ${displayValue('AGENT_ADDRESS', summaryEnv.AGENT_ADDRESS)}`);
console.log(`PROVIDER_ALPHA:        ${displayValue('PROVIDER_ALPHA_ADDRESS', summaryEnv.PROVIDER_ALPHA_ADDRESS)}`);
console.log(`MARKETPLACE_PORT:      ${displayValue('MARKETPLACE_PORT', summaryEnv.MARKETPLACE_PORT)}`);
console.log(`DASHBOARD_PORT:        ${displayValue('DASHBOARD_PORT', summaryEnv.DASHBOARD_PORT)}`);
console.log(`N8N_WEBHOOK_URL:       ${displayValue('N8N_WEBHOOK_URL', summaryEnv.N8N_WEBHOOK_URL)}`);
console.log(`N8N_MCP_URL:           ${displayValue('N8N_MCP_URL', summaryEnv.N8N_MCP_URL)}`);
console.log(`N8N_ACCESS_KEY:        ${displayValue('N8N_ACCESS_KEY', summaryEnv.N8N_ACCESS_KEY)}`);
console.log('---------------------------\n');
