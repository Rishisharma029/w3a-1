const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');
const { ethers } = require('hardhat');

const env = dotenv.parse(fs.readFileSync('.env'));

const TIMEOUT = 8000;

function mask(str) {
  if (!str) return '(none)';
  str = String(str).trim();
  if (str.length <= 8) return '***';
  return str.slice(0, 4) + '...' + str.slice(-4) + ` (len: ${str.length})`;
}

async function checkIpStack() {
  console.log('\n========================================');
  console.log('1. IPSTACK GEOLOCATION API');
  console.log('========================================');
  const key = env.IPSTACK_API_KEY;
  console.log('Key:', mask(key));
  try {
    const res = await axios.get('http://api.ipstack.com/134.201.250.155', {
      params: { access_key: key },
      timeout: TIMEOUT
    });
    if (res.data && res.data.success === false) {
      console.log('STATUS: FAILED');
      console.log('Error info:', res.data.error);
    } else {
      console.log('STATUS: WORKING PERFECTLY');
      console.log('Response sample:', {
        ip: res.data.ip,
        city: res.data.city,
        region: res.data.region_name,
        country: res.data.country_name
      });
    }
  } catch (err) {
    console.log('STATUS: ERROR');
    console.log('HTTP Status:', err.response?.status);
    console.log('Data:', err.response?.data || err.message);
  }

  // Also check IPSTACK_MCP_KEY if present
  if (env.IPSTACK_MCP_KEY) {
    console.log('\n--- IPSTACK_MCP_KEY ---');
    console.log('Key:', mask(env.IPSTACK_MCP_KEY));
    // Test as APILayer apikey header
    try {
      const res = await axios.get('https://api.apilayer.com/ipstack/134.201.250.155', {
        headers: { apikey: env.IPSTACK_MCP_KEY },
        timeout: TIMEOUT
      });
      console.log('STATUS (APILayer endpoint): WORKING PERFECTLY');
      console.log('City:', res.data.city, 'Country:', res.data.country_name);
    } catch (err) {
      console.log('STATUS (APILayer endpoint):', err.response?.status, err.response?.data?.message || err.message);
      // Try as direct query param
      try {
        const res2 = await axios.get('http://api.ipstack.com/134.201.250.155', {
          params: { access_key: env.IPSTACK_MCP_KEY },
          timeout: TIMEOUT
        });
        if (res2.data?.success === false) {
          console.log('STATUS (ipstack.com query param):', res2.data.error);
        } else {
          console.log('STATUS (ipstack.com query param): WORKING');
        }
      } catch (e2) {
        console.log('STATUS (ipstack.com query param):', e2.response?.status || e2.message);
      }
    }
  }
}

async function checkCurrencyLayer() {
  console.log('\n========================================');
  console.log('2. CURRENCYLAYER FOREX API');
  console.log('========================================');
  const key = env.CURRENCY_LAYER_API_KEY;
  console.log('Key:', mask(key));
  try {
    const res = await axios.get('http://api.currencylayer.com/live', {
      params: { access_key: key, currencies: 'EUR,GBP,INR', source: 'USD' },
      timeout: TIMEOUT
    });
    if (res.data && res.data.success === false) {
      console.log('STATUS: FAILED');
      console.log('Error info:', res.data.error);
    } else {
      console.log('STATUS: WORKING PERFECTLY');
      console.log('Response sample:', {
        source: res.data.source,
        timestamp: res.data.timestamp,
        quotes: res.data.quotes
      });
    }
  } catch (err) {
    console.log('STATUS: ERROR');
    console.log('HTTP Status:', err.response?.status);
    console.log('Data:', err.response?.data || err.message);
  }
}

async function checkGiphy() {
  console.log('\n========================================');
  console.log('3. GIPHY MEDIA API');
  console.log('========================================');
  const key = env.GIPHY_API_KEY;
  console.log('Key:', mask(key));
  try {
    const res = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: { api_key: key, q: 'payment', limit: 1, rating: 'g' },
      timeout: TIMEOUT
    });
    if (res.data && res.data.meta && res.data.meta.status === 200) {
      console.log('STATUS: WORKING PERFECTLY');
      console.log('GIF Title:', res.data.data?.[0]?.title);
      console.log('GIF URL:', res.data.data?.[0]?.url);
    } else {
      console.log('STATUS: UNEXPECTED RESPONSE', res.data?.meta);
    }
  } catch (err) {
    console.log('STATUS: ERROR');
    console.log('HTTP Status:', err.response?.status);
    console.log('Data:', err.response?.data || err.message);
  }
}

async function checkApiFlash() {
  console.log('\n========================================');
  console.log('4. APIFLASH SCREENSHOT API');
  console.log('========================================');
  const key = env.APIFLASH_ACCESS_KEY;
  console.log('Key:', mask(key));
  try {
    const res = await axios.get('https://api.apiflash.com/v1/urltoimage', {
      params: { access_key: key, url: 'https://example.com', response_type: 'json' },
      timeout: TIMEOUT
    });
    if (res.data && res.data.url) {
      console.log('STATUS: WORKING PERFECTLY');
      console.log('Screenshot URL:', res.data.url);
    } else {
      console.log('STATUS: UNEXPECTED RESPONSE', res.data);
    }
  } catch (err) {
    console.log('STATUS: ERROR');
    console.log('HTTP Status:', err.response?.status);
    console.log('Data:', err.response?.data || err.message);
  }
}

async function checkAmazonScraper() {
  console.log('\n========================================');
  console.log('5. AMAZON SCRAPER API');
  console.log('========================================');
  const key = env.AMAZON_SCRAPER_API_KEY;
  console.log('Key:', mask(key));
  
  // Test various known APIs that issue `asa_` keys:
  // 1. https://api.amazonscraperapi.com/
  // 2. https://api.scraperapi.com/
  // 3. https://api.rainforestapi.com/
  // 4. https://amazon-data-scraper1.p.rapidapi.com/
  const candidates = [
    { name: 'amazonscraperapi.com', url: 'https://api.amazonscraperapi.com/product?api_key=' + key + '&asin=B08N5WRWNW' },
    { name: 'scraperapi.com', url: 'https://api.scraperapi.com?api_key=' + key + '&url=' + encodeURIComponent('https://www.amazon.com/dp/B08N5WRWNW') },
    { name: 'rainforestapi.com', url: 'https://api.rainforestapi.com/request?api_key=' + key + '&type=product&asin=B08N5WRWNW' }
  ];

  for (const c of candidates) {
    try {
      const res = await axios.get(c.url, { timeout: 4000 });
      console.log(`Endpoint ${c.name}: Status ${res.status}`, JSON.stringify(res.data).slice(0, 100));
    } catch (e) {
      console.log(`Endpoint ${c.name}: Status ${e.response?.status || e.message}`);
      if (e.response?.data) {
        console.log(`  Details: ${JSON.stringify(e.response.data).slice(0, 100)}`);
      }
    }
  }
}

async function checkBlitapp() {
  console.log('\n========================================');
  console.log('6. BLITAPP API');
  console.log('========================================');
  const key = env.BLITAPP_API_KEY;
  console.log('Key:', mask(key));
  const endpoints = [
    { method: 'GET', url: 'https://blitapp.com/api/v1/screenshots' },
    { method: 'GET', url: 'https://blitapp.com/api/v1/captures' },
    { method: 'POST', url: 'https://blitapp.com/api/v1/screenshots', data: { url: 'https://example.com' } },
    { method: 'POST', url: 'https://blitapp.com/api/v1/captures', data: { url: 'https://example.com' } }
  ];

  for (const ep of endpoints) {
    try {
      const res = await axios({
        method: ep.method,
        url: ep.url,
        headers: { Authorization: `Bearer ${key}` },
        data: ep.data,
        timeout: 4000
      });
      console.log(`Blitapp ${ep.method} ${ep.url}: Status ${res.status}`, JSON.stringify(res.data).slice(0, 100));
    } catch (e) {
      console.log(`Blitapp ${ep.method} ${ep.url}: Status ${e.response?.status || e.message}`);
      if (e.response?.data) {
        console.log(`  Details: ${JSON.stringify(e.response.data).slice(0, 100)}`);
      }
    }
  }
}

async function checkApiTemplate() {
  console.log('\n========================================');
  console.log('7. APITEMPLATE API');
  console.log('========================================');
  const key = env.APITEMPLATE_API_KEY;
  console.log('Key:', mask(key));
  try {
    const res = await axios.get('https://rest.apitemplate.io/v2/list-templates', {
      headers: { 'X-API-KEY': key },
      timeout: TIMEOUT
    });
    console.log('STATUS: KEY IS VALID & AUTHENTICATED!');
    console.log('Account templates:', res.data);
  } catch (err) {
    console.log('STATUS: ERROR');
    console.log('HTTP Status:', err.response?.status);
    console.log('Data:', err.response?.data || err.message);
  }
}

async function checkSepolia() {
  console.log('\n========================================');
  console.log('8. SEPOLIA TESTNET & ALCHEMY RPC');
  console.log('========================================');
  const rpcUrl = env.SEPOLIA_RPC_URL;
  console.log('RPC URL:', mask(rpcUrl));
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    console.log('STATUS: RPC CONNECTED PERFECTLY');
    console.log('Chain ID:', network.chainId.toString(), '(Expected: 11155111)');
    console.log('Current Sepolia Block:', blockNumber);

    if (env.SEPOLIA_OWNER_PRIVATE_KEY) {
      const wallet = new ethers.Wallet(env.SEPOLIA_OWNER_PRIVATE_KEY, provider);
      const balance = await provider.getBalance(wallet.address);
      console.log('\nOwner Signer Address:', wallet.address);
      console.log('Owner Sepolia ETH Balance:', ethers.formatEther(balance), 'ETH');
    }

    if (env.SEPOLIA_ENFORCER_ADDRESS) {
      const code = await provider.getCode(env.SEPOLIA_ENFORCER_ADDRESS);
      console.log('Enforcer Address:', env.SEPOLIA_ENFORCER_ADDRESS);
      console.log('Enforcer Deployed Code Length:', code.length, code !== '0x' ? '✔ VERIFIED DEPLOYED CONTRACT' : '❌ NOT DEPLOYED');
    }

    if (env.SEPOLIA_TOKEN_ADDRESS) {
      const code = await provider.getCode(env.SEPOLIA_TOKEN_ADDRESS);
      console.log('Token Address:', env.SEPOLIA_TOKEN_ADDRESS);
      console.log('Token Deployed Code Length:', code.length, code !== '0x' ? '✔ VERIFIED DEPLOYED CONTRACT' : '❌ NOT DEPLOYED');
    }
  } catch (err) {
    console.log('STATUS: RPC ERROR', err.message);
  }
}

async function checkN8n() {
  console.log('\n========================================');
  console.log('9. N8N CLOUD & MCP');
  console.log('========================================');
  console.log('Webhook URL:', env.N8N_WEBHOOK_URL);
  console.log('MCP URL:', env.N8N_MCP_URL);
  console.log('Access Key:', mask(env.N8N_ACCESS_KEY));

  try {
    const res = await axios.get('https://rishisharma029.app.n8n.cloud/api/v1/workflows', {
      headers: { 'X-N8N-API-KEY': env.N8N_ACCESS_KEY },
      timeout: TIMEOUT
    });
    console.log('STATUS (n8n Cloud REST API): WORKING PERFECTLY');
    console.log('Workflows count:', res.data?.data?.length);
    if (res.data?.data) {
      console.log('Workflows:', res.data.data.map(w => ({ id: w.id, name: w.name, active: w.active })));
    }
  } catch (err) {
    console.log('STATUS (n8n Cloud REST API):', err.response?.status, err.response?.data?.message || err.message);
  }

  try {
    const res = await axios.post(env.N8N_WEBHOOK_URL, { test: true }, { timeout: TIMEOUT });
    console.log('Webhook POST status:', res.status, res.data);
  } catch (err) {
    console.log('Webhook POST status:', err.response?.status, err.response?.data || err.message);
  }
}

async function runAll() {
  await checkIpStack();
  await checkCurrencyLayer();
  await checkGiphy();
  await checkApiFlash();
  await checkAmazonScraper();
  await checkBlitapp();
  await checkApiTemplate();
  await checkSepolia();
  await checkN8n();
  console.log('\n========================================');
  console.log('DIAGNOSTICS COMPLETED');
  console.log('========================================\n');
}

runAll().catch(e => console.error(e));
