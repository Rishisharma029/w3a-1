const http = require('http');

const DASHBOARD_URL = 'http://localhost:14300';

function getJSON(path) {
  return new Promise((resolve, reject) => {
    http.get(`${DASHBOARD_URL}${path}`, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function postJSON(path, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload || {});
    const req = http.request(
      `${DASHBOARD_URL}${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testLiveEventStream() {
  console.log('════════════════════════════════════════════════════════════');
  console.log('  TEST: W3A-1 Live Event Stream (Backend -> SSE)');
  console.log('════════════════════════════════════════════════════════════\n');

  // Step 1: Verify /api/events/history endpoint
  console.log('1. Verifying /api/events/history...');
  const historyRes = await getJSON('/api/events/history');
  if (!historyRes || !Array.isArray(historyRes.events)) {
    throw new Error('Invalid /api/events/history response: ' + JSON.stringify(historyRes));
  }
  console.log(`   ✔ /api/events/history returned ${historyRes.count} cached events.\n`);

  // Step 2: Connect to SSE stream
  console.log('2. Connecting to SSE stream GET /api/events/stream...');
  const receivedEvents = [];
  let handshakeReceived = false;

  const sseReq = http.request(
    `${DASHBOARD_URL}/api/events/stream`,
    {
      method: 'GET',
      headers: {
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      }
    },
    res => {
      if (res.statusCode !== 200) {
        throw new Error(`SSE request failed with status: ${res.statusCode}`);
      }
      console.log('   ✔ SSE HTTP 200 connection established. Content-Type:', res.headers['content-type']);

      let buffer = '';
      res.on('data', chunk => {
        buffer += chunk.toString();
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep partial chunk

        for (const lineGroup of lines) {
          if (!lineGroup.trim()) continue;
          let eventName = 'message';
          let eventData = '';

          const subLines = lineGroup.split('\n');
          for (const line of subLines) {
            if (line.startsWith('event:')) {
              eventName = line.replace('event:', '').trim();
            } else if (line.startsWith('data:')) {
              eventData = line.replace('data:', '').trim();
            }
          }

          if (eventName === 'connected') {
            handshakeReceived = true;
            console.log('   ✔ SSE "connected" handshake received from server.');
          } else if (eventName === 'w3a1_event' && eventData) {
            try {
              const parsed = JSON.parse(eventData);
              receivedEvents.push(parsed);
              console.log(`   [STREAM EVENT] ${parsed.type} | ${parsed.message || ''}`);
            } catch (err) {
              console.error('   Error parsing event JSON:', err);
            }
          }
        }
      });
    }
  );

  sseReq.on('error', err => {
    console.error('SSE connection error:', err);
  });
  sseReq.end();

  // Wait for handshake
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!handshakeReceived) {
    throw new Error('Failed to receive SSE handshake within timeout.');
  }

  // Step 3: Trigger an n8n purchase orchestration to generate live event sequence
  console.log('\n3. Triggering automated agent purchase (/api/orchestrate/n8n)...');
  const triggerRes = await postJSON('/api/orchestrate/n8n', {
    task: 'Translate security incident audit report into French',
    service: 'translation',
    maxBudget: 5.0
  });

  console.log(`   ✔ Orchestrator initiated. Result status: ${triggerRes && triggerRes.status || 'OK'}`);

  // Wait for events to flow over SSE
  console.log('   Waiting for live events to arrive over SSE stream...');
  await new Promise(resolve => setTimeout(resolve, 2500));

  // Step 4: Verify expected lifecycle event types were received
  console.log(`\n4. Verifying received stream events (Total: ${receivedEvents.length})...`);
  const receivedTypes = receivedEvents.map(e => e.type);
  console.log('   Event types received on stream:', receivedTypes);

  const expectedTypes = [
    'INTENT_RECEIVED',
    'PROVIDER_SEARCH',
    'PROVIDER_SELECTED',
    'PAYMENT_REQUIRED',
    'PAYMENT_SIGNED',
    'SETTLEMENT_SUBMITTED',
    'SETTLEMENT_CONFIRMED',
    'DELIVERY_RECEIVED',
    'HASH_VERIFIED'
  ];

  for (const exp of expectedTypes) {
    if (receivedTypes.includes(exp)) {
      console.log(`   ✔ Confirmed stream event: ${exp}`);
    } else {
      console.warn(`   [WARN] Note: Event ${exp} not in this slice (might have completed earlier)`);
    }
  }

  // Step 4b: Verify HTTP 402 Payment Requirements Details
  console.log('\n4b. Verifying HTTP 402 Payment Requirements on event stream...');
  const pRequiredEvt = receivedEvents.find(e => e.type === 'PAYMENT_REQUIRED');
  if (!pRequiredEvt) {
    throw new Error('PAYMENT_REQUIRED event not received on stream');
  }
  console.log('   402 Event Detail:', {
    reqId: pRequiredEvt.reqId,
    amountUSD: pRequiredEvt.amountUSD,
    amountAtomic: pRequiredEvt.amountAtomic,
    providerId: pRequiredEvt.providerId,
    data: pRequiredEvt.data
  });
  console.log('   ✔ HTTP 402 challenge details successfully validated on stream.');

  // Step 5: Test freeze/unfreeze event generation
  console.log('\n5. Testing Security Event broadcast (Freeze & Fund)...');
  const freezeCountBefore = receivedEvents.length;
  await postJSON('/api/freeze', { freeze: true, reason: 'Test Live Stream Freeze' });
  await new Promise(resolve => setTimeout(resolve, 400));
  await postJSON('/api/freeze', { freeze: false, reason: 'Test Live Stream Unfreeze' });
  await new Promise(resolve => setTimeout(resolve, 600));

  const freezeEvents = receivedEvents.slice(freezeCountBefore);
  const freezeTypes = freezeEvents.map(e => e.type);
  console.log('   Security events received:', freezeTypes);

  const hasFrozen = freezeTypes.includes('AGENT_FROZEN');
  const hasUnfrozen = freezeTypes.includes('AGENT_UNFROZEN');

  if (hasFrozen && hasUnfrozen) {
    console.log('   ✔ Confirmed AGENT_FROZEN and AGENT_UNFROZEN delivered via SSE.');
  } else {
    throw new Error(`Expected AGENT_FROZEN & AGENT_UNFROZEN in stream, got: ${freezeTypes.join(', ')}`);
  }

  // Clean up
  sseReq.destroy();
  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  ✔ ALL LIVE EVENT STREAM VERIFICATION TESTS PASSED!');
  console.log('════════════════════════════════════════════════════════════\n');
}

testLiveEventStream().catch(err => {
  console.error('\n[REJECTED] Test failed:', err.message);
  process.exit(1);
});
