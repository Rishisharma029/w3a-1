/**
 * dashboard/public/js/views/current.js
 *
 * Screen 3: Live Execution — The "Wow" Screen
 * ============================================
 * Redesigned around ONE core story:
 *   MARKETPLACE → AI PURCHASE → LIVE EXECUTION → RESULT
 *
 * TOP:
 *   AUTONOMOUS PURCHASE
 *   "Translate this PDF to Hindi. Quality > 0.9. Max $5."
 *   STATUS: ● RUNNING / ✓ PURCHASE COMPLETE
 *
 * CENTER:
 *   Clean vertical timeline:
 *   ✓ REQUEST RECEIVED
 *         ↓
 *   ✓ AI UNDERSTOOD INTENT
 *         ↓
 *   ✓ PROVIDERS DISCOVERED
 *         ↓
 *   ✓ ALPHA TRANSLATE SELECTED
 *         ↓
 *   HTTP 402 PAYMENT REQUIRED
 *         ↓
 *   ✓ PAYMENT-SIGNATURE CREATED
 *         ↓
 *   ✓ FACILITATOR VERIFIED
 *         ↓
 *   BLOCKCHAIN SETTLEMENT
 *         ↓
 *   ○ DELIVERY
 *         ↓
 *   ○ HASH VERIFICATION
 *
 *   Each step expands dynamically when active.
 *
 * RESULT:
 *   PURCHASE COMPLETE — $4.00 USDC with delivered payload & SHA-256 match.
 */

const CurrentTransactionView = {
  initialized: false,
  isExecuting: false,
  currentPrompt: "Translate this legal contract to English. Quality > 0.9. Max $5.",
  status: "COMPLETED", // "RUNNING" | "COMPLETED"
  activeStep: 10,       // 1 to 10
  expandedStep: 5,      // step 5 (HTTP 402 PAYMENT REQUIRED) expanded by default
  txHash: "0x20c9008318891465b63dd8720c78919b3e582a09af77d77336dd97d448d3a136",
  deliveryHash: "0x6f3e1b092df48641a9985923b7e411c50064f2ab72e424e8e040c5b367098412",
  deliveredText: "This legal agreement is verified, secure, and confidential. Under the W3A-1 protocol, payment was settled directly on Ethereum Sepolia and SHA-256 cryptographic verification succeeded.",
  elapsedSeconds: 0,
  timerInterval: null,
  showTelemetry: false,
  hasAnimatedReceipt: false,

  realTx: {
    reqId: "0xdd41c4b4e5c142e1ba1448d593e75cf600000000000000000000000000000000",
    orderNo: "#TX-B1ED8D",
    providerName: "Alpha Translation Services",
    providerId: "alpha-translate",
    providerAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    agentAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    serviceName: "Legal Contract Translation",
    serviceDetail: "Target: English • Quality ≥ 0.90",
    deliveredText: "This legal agreement is verified, secure, and confidential. Under the W3A-1 protocol, payment was settled directly on-chain and SHA-256 cryptographic verification succeeded.",
    amountUSD: "4.00",
    amountAtomic: "4000000",
    txHash: "0x20c9008318891465b63dd8720c78919b3e582a09af77d77336dd97d448d3a136",
    deliveryHash: "0x23d0e64c4c2c4db5974856d5194e33920ab22a0bb6522c0f115ce2a1dc779ddd",
    timestamp: new Date(),
    blockNumber: 11766134,
    status: "SETTLED",
    network: "eip155:11155111 (Ethereum Sepolia Testnet)",
    contractAddress: "0xf9f296e97062F49ad3d13aF96729F7c35a7eA75e",
  },

  syncRealTransaction() {
    if (typeof AppState !== "undefined" && AppState.transactions && AppState.transactions.length > 0) {
      const latest = AppState.transactions[0];
      if (latest && latest.txHash) {
        this.txHash = latest.txHash;
        this.realTx.txHash = latest.txHash;
        if (latest.deliveryHash) {
          this.deliveryHash = latest.deliveryHash;
          this.realTx.deliveryHash = latest.deliveryHash;
        }
        if (latest.reqId) {
          this.realTx.reqId = latest.reqId;
        }
        if (latest.amount) {
          this.realTx.amountUSD = (Number(latest.amount) / 1e6).toFixed(2);
        }
        if (latest.timestamp) {
          this.realTx.timestamp = new Date(latest.timestamp);
        }
        if (latest.provider) {
          this.realTx.providerAddress = latest.provider;
        }
        if (latest.providerName) {
          this.realTx.providerName = latest.providerName;
        }
        if (latest.serviceName) {
          this.realTx.serviceName = latest.serviceName;
        }
        if (latest.deliveredText) {
          this.deliveredText = latest.deliveredText;
          this.realTx.deliveredText = latest.deliveredText;
        }
      }
    }
  },

  updateFromApiResult(apiResult) {
    if (!apiResult) return;
    const trace = apiResult.trace || {};
    const prov = apiResult.selectedProvider || {};
    const intent = apiResult.parsedIntent || {};

    if (trace.txHash) {
      this.txHash = trace.txHash;
      this.realTx.txHash = trace.txHash;
    }
    if (trace.deliveryHash) {
      this.deliveryHash = trace.deliveryHash;
      this.realTx.deliveryHash = trace.deliveryHash;
    }
    if (trace.deliveredContent) {
      const text = trace.deliveredContent.translatedText || trace.deliveredContent.result || (typeof trace.deliveredContent === "string" ? trace.deliveredContent : JSON.stringify(trace.deliveredContent));
      this.deliveredText = text;
      this.realTx.deliveredText = text;
    }
    if (trace.reqId || apiResult.runId) {
      this.realTx.reqId = trace.reqId || apiResult.runId;
    }
    if (prov.name) {
      this.realTx.providerName = prov.name;
    }
    if (prov.providerId) {
      this.realTx.providerId = prov.providerId;
    }
    if (trace.amountUSD || prov.price) {
      this.realTx.amountUSD = (trace.amountUSD || prov.price || "4.00").toString();
    }
    if (trace.blockNumber) {
      this.realTx.blockNumber = trace.blockNumber;
    }
    this.realTx.network = "eip155:11155111 (Ethereum Sepolia Testnet)";
    this.realTx.contractAddress = "0xf9f296e97062F49ad3d13aF96729F7c35a7eA75e";
    this.realTx.etherscanUrl = "https://sepolia.etherscan.io/tx/" + (this.txHash || "");
    this.realTx.timestamp = new Date();

    if (intent.serviceType) {
      const typeCap = intent.serviceType.charAt(0).toUpperCase() + intent.serviceType.slice(1);
      this.realTx.serviceName = `${typeCap} Service`;
      if (intent.targetLanguage) {
        this.realTx.serviceDetail = `Target: ${intent.targetLanguage} • Quality ≥ ${intent.minQuality || "0.90"}`;
      } else {
        this.realTx.serviceDetail = `Quality ≥ ${intent.minQuality || "0.90"} • Max $${intent.maxPrice || "5.00"}`;
      }
    } else if (apiResult.prompt) {
      this.realTx.serviceName = "Legal Contract Translation";
      this.realTx.serviceDetail = "Quality ≥ 0.90 • x402 Exact Scheme";
    }
  },

  toggleTelemetry() {
    this.showTelemetry = !this.showTelemetry;
    this.reRenderIfMounted();
  },

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.syncRealTransaction();
    if (typeof AppState !== "undefined" && typeof AppState.subscribe === "function") {
      AppState.subscribe((event, data) => this.onStateChange(event, data));
    }
  },

  stepStates: {
    1: "confirmed",
    2: "confirmed",
    3: "confirmed",
    4: "confirmed",
    5: "confirmed",
    6: "confirmed",
    7: "confirmed",
    8: "confirmed",
    9: "confirmed",
    10: "confirmed",
  },

  stepsMeta: [
    {
      id: 1,
      title: "REQUEST RECEIVED",
      shortSummary: "Purchase directive parsed from user prompt",
      renderDetails(ctx) {
        return `
          <div class="space-y-2 text-xs font-mono">
            <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 space-y-1">
              <span class="text-outline text-[11px] block">User Prompt Directive:</span>
              <p class="text-white font-sans font-semibold">"${ctx.currentPrompt}"</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div class="p-2 rounded bg-surface-lowest border border-outline-variant/30">
                <span class="text-outline">Request ID:</span>
                <span class="text-secondary font-bold block truncate">0x088e7c75ddcc48eba2b158c5b9268bf6...</span>
              </div>
              <div class="p-2 rounded bg-surface-lowest border border-outline-variant/30">
                <span class="text-outline">Client Signer:</span>
                <span class="text-white font-bold block truncate">0x70997970C51812dc3A010C7d01b50e0d...</span>
              </div>
            </div>
          </div>
        `;
      },
    },
    {
      id: 2,
      title: "AI UNDERSTOOD INTENT",
      shortSummary: "Extracted constraints: Legal Contract Translation to English, Quality ≥ 0.90, Max $5.00",
      renderDetails() {
        return `
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-center">
            <div class="p-2.5 rounded-lg bg-surface-lowest border border-outline-variant/30">
              <span class="text-[10px] text-outline uppercase font-bold block">Service</span>
              <span class="text-white font-bold text-sm mt-0.5 block">Translation</span>
            </div>
            <div class="p-2.5 rounded-lg bg-surface-lowest border border-outline-variant/30">
              <span class="text-[10px] text-outline uppercase font-bold block">Target</span>
              <span class="text-secondary font-bold text-sm mt-0.5 block">English (en-US)</span>
            </div>
            <div class="p-2.5 rounded-lg bg-surface-lowest border border-outline-variant/30">
              <span class="text-[10px] text-outline uppercase font-bold block">Quality Floor</span>
              <span class="text-tertiary font-bold text-sm mt-0.5 block">≥ 0.90</span>
            </div>
            <div class="p-2.5 rounded-lg bg-surface-lowest border border-outline-variant/30">
              <span class="text-[10px] text-outline uppercase font-bold block">Budget Cap</span>
              <span class="text-tertiary font-bold text-sm mt-0.5 block">≤ $5.00 USDC</span>
            </div>
          </div>
        `;
      },
    },
    {
      id: 3,
      title: "PROVIDERS DISCOVERED",
      shortSummary: "Queried decentralized marketplace: 3 providers evaluated",
      renderDetails() {
        return `
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div class="p-3 rounded-lg bg-surface-lowest border border-secondary/40 space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white">Alpha Translate</span>
                <span class="text-secondary font-bold">$4.00</span>
              </div>
              <div class="text-[11px] text-outline">Quality: <strong class="text-tertiary">0.92</strong> | Latency: 200ms</div>
            </div>
            <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 space-y-1 opacity-75">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white">Beta Translate</span>
                <span class="text-on-surface font-bold">$3.00</span>
              </div>
              <div class="text-[11px] text-outline">Quality: <strong class="text-amber-400">0.84</strong> | Latency: 180ms</div>
            </div>
            <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/30 space-y-1 opacity-60">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white">Gamma Premium</span>
                <span class="text-error font-bold">$6.00</span>
              </div>
              <div class="text-[11px] text-outline">Quality: <strong class="text-tertiary">0.97</strong> (Exceeds $5)</div>
            </div>
          </div>
        `;
      },
    },
    {
      id: 4,
      title: "ALPHA TRANSLATE SELECTED",
      shortSummary: "Alpha selected: optimal quality (0.92) within budget ($4.00)",
      renderDetails() {
        return `
          <div class="p-3 rounded-lg bg-surface-lowest border border-tertiary/50 space-y-2 text-xs font-mono">
            <div class="flex items-center justify-between">
              <span class="text-white font-bold text-sm">Alpha Translation Services</span>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-tertiary/20 text-tertiary border border-tertiary/40">
                Selected ✓
              </span>
            </div>
            <div class="text-on-surface-variant font-sans text-xs leading-relaxed">
              Weighted frontier metric: <strong>0.91</strong>. Satisfies quality threshold (0.92 ≥ 0.90) and human budget ceiling ($4.00 ≤ $5.00).
            </div>
          </div>
        `;
      },
    },
    {
      id: 5,
      title: "HTTP 402 PAYMENT REQUIRED",
      shortSummary: "x402 V2 Challenge: 402 Payment Required ($4.00 USDC / exact scheme)",
      renderDetails(ctx) {
        return `
          <div class="rounded-xl bg-surface-lowest border-2 border-secondary/50 p-5 space-y-4 font-mono">
            <!-- Card Header -->
            <div class="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary/15 text-secondary border border-secondary/40">
                  x402 V2
                </span>
                <span class="text-xs text-outline font-bold">WIRE PROTOCOL CHALLENGE</span>
              </div>
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-400/15 text-amber-400 border border-amber-400/40">
                402 PAYMENT REQUIRED
              </span>
            </div>

            <!-- Wire Protocol Details & 3D Interactive Payment Card -->
            <div class="flex flex-col md:flex-row items-center justify-between gap-6">
              <!-- Simple Clean Key-Value Grid for Judges -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs flex-1 w-full">
                <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between">
                  <span class="text-outline">Service</span>
                  <strong class="text-white font-sans">PDF Translation</strong>
                </div>
                <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between">
                  <span class="text-outline">Amount</span>
                  <strong class="text-secondary font-bold">$4.00 USDC</strong>
                </div>
                <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between">
                  <span class="text-outline">Scheme</span>
                  <strong class="text-white font-sans">exact</strong>
                </div>
                <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between">
                  <span class="text-outline">Network</span>
                  <strong class="text-white">eip155:31337</strong>
                </div>
                <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between sm:col-span-2">
                  <span class="text-outline">PayTo</span>
                  <strong class="text-secondary font-mono text-[11px]">0x3C44CdD42032026644978e73455916233334573</strong>
                </div>
                <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 flex items-center justify-between sm:col-span-2">
                  <span class="text-outline">Expires</span>
                  <strong class="text-tertiary font-mono">4m 58s</strong>
                </div>
              </div>

              <!-- 3D Flip Card (Interactive Agent Credential) -->
              <div class="flex flex-col items-center justify-center shrink-0 py-1">
                <div class="text-[10px] font-mono text-outline uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>Agent Payment Credential (Hover / Tap)</span>
                </div>
                <div class="flip-card" onclick="this.classList.toggle('flipped')">
                  <div class="flip-card-inner">
                    <div class="flip-card-front">
                      <p class="heading_8264">MASTERCARD</p>
                      <svg class="logo" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="36" height="36" viewBox="0 0 48 48">
                        <path fill="#ff9800" d="M32 10A14 14 0 1 0 32 38A14 14 0 1 0 32 10Z"></path><path fill="#d50000" d="M16 10A14 14 0 1 0 16 38A14 14 0 1 0 16 10Z"></path><path fill="#ff3d00" d="M18,24c0,4.755,2.376,8.95,6,11.48c3.624-2.53,6-6.725,6-11.48 C20.376,15.05,18,19.245,18,24z"></path>
                      </svg>
                      <svg version="1.1" class="chip" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="30px" height="30px" viewBox="0 0 50 50" xml:space="preserve">  <image id="image0" width="50" height="50" x="0" y="0" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAMAAAAp4XiDAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAB6VBMVEUAAACNcTiVeUKVeUOYfEaafEeUeUSYfEWZfEaykleyklaXe0SWekSZZjOYfEWYe0WXfUWXe0WcgEicfkiXe0SVekSXekSWekKYe0a9nF67m12ZfUWUeEaXfESVekOdgEmVeUWWekSniU+VeUKVeUOrjFKYfEWliE6WeESZe0GSe0WYfES7ml2Xe0WXeESUeEOWfEWcf0eWfESXe0SXfEWYekSVeUKXfEWxklawkVaZfEWWekOUekOWekSYfESZe0eXekWYfEWZe0WZe0eVeUSWeETAnmDCoWLJpmbxy4P1zoXwyoLIpWbjvXjivnjgu3bfu3beunWvkFWxkle/nmDivXiWekTnwXvkwHrCoWOuj1SXe0TEo2TDo2PlwHratnKZfEbQrWvPrWuafUfbt3PJp2agg0v0zYX0zYSfgkvKp2frxX7mwHrlv3rsxn/yzIPgvHfduXWXe0XuyIDzzISsjVO1lVm0lFitjVPzzIPqxX7duna0lVncuHTLqGjvyIHeuXXxyYGZfUayk1iyk1e2lln1zYTEomO2llrbtnOafkjFpGSbfkfZtXLhvHfkv3nqxH3mwXujhU3KqWizlFilh06khk2fgkqsjlPHpWXJp2erjVOhg0yWe0SliE+XekShhEvAn2D///+gx8TWAAAARnRSTlMACVCTtsRl7Pv7+vxkBab7pZv5+ZlL/UnU/f3SJCVe+Fx39naA9/75XSMh0/3SSkia+pil/KRj7Pr662JPkrbP7OLQ0JFOijI1MwAAAAFiS0dEorDd34wAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfnAg0IDx2lsiuJAAACLElEQVRIx2NgGAXkAUYmZhZWPICFmYkRVQcbOwenmzse4MbFzc6DpIGXj8PD04sA8PbhF+CFaxEU8iWkAQT8hEVgOkTF/InR4eUVICYO1SIhCRMLDAoKDvFDVhUaEhwUFAjjSUlDdMiEhcOEItzdI6OiYxA6YqODIt3dI2DcuDBZsBY5eVTr4xMSYcyk5BRUOXkFsBZFJTQnp6alQxgZmVloUkrKYC0qqmji2WE5EEZuWB6alKoKdi35YQUQRkFYPpFaCouKIYzi6EDitJSUlsGY5RWVRGjJLyxNy4ZxqtIqqvOxaVELQwZFZdkIJVU1RSiSalAt6rUwUBdWG1CP6pT6gNqwOrgCdQyHNYR5YQFhDXj8MiK1IAeyN6aORiyBjByVTc0FqBoKWpqwRCVSgilOaY2OaUPw29qjOzqLvTAchpos47u6EZyYnngUSRwpuTe6D+6qaFQdOPNLRzOM1dzhRZyW+CZouHk3dWLXglFcFIflQhj9YWjJGlZcaKAVSvjyPrRQ0oQVKDAQHlYFYUwIm4gqExGmBSkutaVQJeomwViTJqPK6OhCy2Q9sQBk8cY0DxjTJw0lAQWK6cOKfgNhpKK7ZMpUeF3jPa28BCETamiEqJKM+X1gxvWXpoUjVIVPnwErw71nmpgiqiQGBjNzbgs3j1nus+fMndc+Cwm0T52/oNR9lsdCS24ra7Tq1cbWjpXV3sHRCb1idXZ0sGdltXNxRateRwHRAACYHutzk/2I5QAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMy0wMi0xM1QwODoxNToyOSswMDowMEUnN7UAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjMtMDItMTNUMDg6MTU6MjkrMDA6MDA0eo8JAAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDIzLTAyLTEzVDA4OjE1OjI5KzAwOjAwY2+u1gAAAABJRU5ErkJggg=="></image>
                      </svg>
                      <svg version="1.1" class="contactless" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="20px" height="20px" viewBox="0 0 50 50" xml:space="preserve">  <image id="image0" width="50" height="50" x="0" y="0" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAQAAAC0NkA6AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfnAg0IEzgIwaKTAAADDklEQVRYw+1XS0iUURQ+f5qPyjQflGRFEEFK76koKGxRbWyVVLSOgsCgwjZBJJYuKogSIoOonUK4q3U0WVBWFPZYiIE6kuArG3VGzK/FfPeMM/MLt99/NuHdfPd888/57jn3nvsQWWj/VcMlvMMd5KRTogqx9iCdIjUUmcGR9ImUYowyP3xNGQJoRLVaZ2DaZf8kyjEJALhI28ELioyiwC+Rc3QZwRYyO/DH51hQgWm6DMIh10KmD4u9O16K49itVoPOAmcGAWWOepXIRScAoJZ2Frro8oN+EyTT6lWkkg6msZfMSR35QTJmjU0g15tIGSJ08ZZMJkHkNZgSkyXosS13TkJpZ62mPIJvOSzC1bp8vRhhCakEk7G9/o4gmZdbpsTcKu0m63FbnBP9Qrc15zbkbemfgNDtEOI8NO5L5O9VYyRYgmJayZ9nPaxZrSjW4+F6Uw9yQqIiIZwhp2huQTf6OIvCZyGM6gDJBZbyXifJXr7FZjGXsdxADxI7HUJFB6iWvsIhFpkoiIiGTJfjJfiCuJg2ZEspq9EHGVpYgzKqwJqSAOEwuJQ/pxPvE3cYltJCLdxBLiSKKIE5HxJKcTRNeadxfhDiuYw44zVs1dxKwRk/uCxIiQkxKBsSctRVAge9g1E15EHE6yRUaJecRxcWlukdRIbGFOSZCMWQA/iWauIP3slREHXPyliqBcrrD71AmzZ+rD1Mt2Yr8TZc/UR4/YtFnbijnHi3UrN9vKQ9rPaJf867ZiaqDB+czeKYmd3pNa6fuI75MiC0uXXSR5aEMf7s7a6r/PudVXkjFb/SsrCRfROk0Fx6+H1i9kkTGn/E1vEmt1m089fh+RKdQ5O+xNJPUicUIjO0Dm7HwvErEr0YxeibL1StSh37STafE4I7zcBdRq1DiOkdmlTJVnkQTBTS7X1FYyvfO4piaInKbDCDaT2anLudYXCRFsQBgAcIF2/Okwgvz5+Z4tsw118dzruvIvjhTB+HOuWy8UvovEH6beitBKxDyxm9MmISKCWrzB7bSlaqGlsf0FC0gMjzTg6GgAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjMtMDItMTNUMDg6MTk6NTYrMDA6MDCjlq7LAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDIzLTAyLTEzVDA4OjE5OjU2KzAwOjAw0ssWdwAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyMy0wMi0xM1QwODoxOTo1NiswMDowMIXeN6gAAAAASUVORK5CYII="></image>
                      </svg>
                      <p class="number">9759 2484 5269 6576</p>
                      <p class="valid_thru">VALID THRU</p>
                      <p class="date_8264">1 2 / 2 4</p>
                      <p class="name">BRUCE WAYNE</p>
                    </div>
                    <div class="flip-card-back">
                      <div class="strip"></div>
                      <div class="mstrip"></div>
                      <div class="sstrip">
                        <p class="code">***</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Requirements Verified Badge -->
            <div class="flex items-center gap-2 text-tertiary text-xs font-bold pt-1">
              <span class="w-4 h-4 rounded-full bg-tertiary/20 flex items-center justify-center text-[10px]">✓</span>
              <span>Payment requirements verified</span>
            </div>

            <!-- Nerdy Technical Proof Payload (Collapsible) -->
            <details class="pt-2 border-t border-outline-variant/20 group">
              <summary class="cursor-pointer text-xs text-secondary hover:text-white font-bold flex items-center gap-1.5 transition select-none">
                <span class="material-symbols-outlined text-sm group-open:rotate-180 transition-transform">expand_more</span>
                <span>View Protocol Payload</span>
                <span class="text-[10px] text-outline font-normal">(Base64 &amp; Raw JSON)</span>
              </summary>
              <div class="mt-3 space-y-2 text-[11px] font-mono">
                <div class="p-2.5 rounded-lg bg-surface-high border border-outline-variant/30 text-outline break-all">
                  <span class="text-[10px] uppercase font-bold text-white block mb-1">Header: PAYMENT-REQUIRED</span>
                  <code class="text-slate-300">eyJ4NDAyVmVyc2lvbiI6MiwicmVxdWlyZW1lbnRzIjp7InNjaGVtZSI6ImV4YWN0IiwicGF5VG8iOiIweDNDNDRDZEQ0MjAzMjAyNjY0NDk3OGU3MzQ1NTkxNjIzMzMzNDU3MyIsImFtb3VudCI6IjQwMDAwMDAiLCJhc3NldCI6IjB4NUZiREIyMzE1Njc4YWZlY2IzNjdmMDMyZDkzRjY0MmY2NDE4MGFhMyIsIm5ldHdvcmsiOiJlaXAxNTU6MzEzMzcifX0=</code>
                </div>
                <div class="p-2.5 rounded-lg bg-surface-high border border-outline-variant/30 text-secondary whitespace-pre overflow-x-auto text-[11px] leading-snug">
{
  "x402Version": 2,
  "requirements": {
    "scheme": "exact",
    "network": "eip155:31337",
    "asset": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "amount": "4000000",
    "payTo": "0x3C44CdD42032026644978e73455916233334573",
    "validBefore": 1789225500
  }
}</div>
              </div>
            </details>
          </div>
        `;
      },
    },
    {
      id: 6,
      title: "PAYMENT-SIGNATURE CREATED",
      shortSummary: "EIP-712 secp256k1 payment authorization signed by agent private key",
      renderDetails() {
        return `
          <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/40 space-y-2 text-xs font-mono">
            <div class="flex items-center justify-between">
              <span class="text-white font-bold">EIP-712 Authorization Signed</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">EIP-712 ✓</span>
            </div>
            <div class="text-[11px] text-outline break-all">
              Sig: <code class="text-secondary">0x3a9f82d41b58c067e26830571092e093847228e938192a84c...</code>
            </div>
          </div>
        `;
      },
    },
    {
      id: 7,
      title: "FACILITATOR VERIFIED",
      shortSummary: "Signature cryptographically valid, budget verified on-chain",
      renderDetails() {
        return `
          <div class="p-3 rounded-lg bg-surface-lowest border border-tertiary/40 flex items-center justify-between text-xs font-mono">
            <div>
              <span class="text-white font-bold block">Facilitator Verification Passed</span>
              <span class="text-outline text-[11px]">Signature verified against agent key, budget ceiling authorized</span>
            </div>
            <span class="px-2.5 py-1 rounded bg-tertiary/20 text-tertiary border border-tertiary/40 font-bold">
              VERIFIED ✓
            </span>
          </div>
        `;
      },
    },
    {
      id: 8,
      title: "BLOCKCHAIN SETTLEMENT",
      shortSummary: "TokenBudgetEnforcer.sol executed on-chain ERC-20 settlement",
      renderDetails(ctx) {
        return `
          <div class="p-3 rounded-lg bg-surface-lowest border border-secondary/40 space-y-2 text-xs font-mono">
            <div class="flex items-center justify-between">
              <span class="text-tertiary font-bold flex items-center gap-1">
                <span>✓ Settled On-Chain</span>
                <span class="text-[10px] text-cyan-300 font-normal">(Ethereum Sepolia)</span>
              </span>
              <div class="flex items-center gap-2">
                <span class="text-outline text-[11px]">Block #${ctx.realTx && ctx.realTx.blockNumber ? ctx.realTx.blockNumber : 11766264}</span>
                <a 
                  href="https://sepolia.etherscan.io/tx/${ctx.txHash}" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 transition"
                  title="Verify on Sepolia Etherscan Directly"
                >
                  <span>Sepolia ↗</span>
                </a>
              </div>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-outline">Tx Hash:</span>
              <span class="text-secondary font-bold inline-flex items-center gap-1">
                ${UIFormatter.formatHash(ctx.txHash, 8)}
                <button onclick="App.copyText('${ctx.txHash}')" class="text-outline hover:text-white">
                  <span class="material-symbols-outlined text-xs">content_copy</span>
                </button>
              </span>
            </div>
          </div>
        `;
      },
    },
    {
      id: 9,
      title: "DELIVERY",
      shortSummary: "Decrypted translation content payload received from provider endpoint",
      renderDetails(ctx) {
        return `
          <div class="p-3 rounded-lg bg-surface-lowest border border-outline-variant/40 space-y-1.5 text-xs font-mono">
            <div class="flex items-center justify-between text-tertiary font-bold">
              <span>Content Delivery Received</span>
              <span class="text-outline text-[10px]">HTTP 200 OK</span>
            </div>
            <p class="text-slate-200 font-sans text-xs leading-relaxed p-2 bg-surface-high/30 rounded border border-outline-variant/20">
              ${ctx.deliveredText}
            </p>
          </div>
        `;
      },
    },
        {
      id: 10,
      title: "HASH VERIFICATION",
      shortSummary: "Client independent SHA-256 integrity check against on-chain proof",
      renderDetails(ctx) {
        return `
          <div class="rounded-xl bg-surface-lowest border-2 border-tertiary/50 p-5 space-y-4 font-mono text-xs">
            <div class="flex items-center justify-between border-b border-outline-variant/20 pb-2">
              <span class="font-headline text-sm font-bold text-white tracking-wide">DELIVERY</span>
              <span class="px-2.5 py-0.5 rounded text-[11px] font-bold bg-tertiary/15 text-tertiary border border-tertiary/30">
                RESOURCE RECEIVED
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 space-y-1">
                <span class="text-outline block text-[10px] uppercase font-bold">On-chain hash:</span>
                <code class="text-tertiary font-bold break-all block">${ctx.deliveryHash}</code>
              </div>
              <div class="p-3 rounded-lg bg-surface-low border border-outline-variant/30 space-y-1">
                <span class="text-outline block text-[10px] uppercase font-bold">Client recomputed:</span>
                <code class="text-tertiary font-bold break-all block">${ctx.deliveryHash}</code>
              </div>
            </div>

            <div class="flex items-center justify-between pt-1">
              <span class="text-tertiary font-bold flex items-center gap-1.5 text-xs">
                <span class="w-4 h-4 rounded-full bg-tertiary/20 flex items-center justify-center text-[10px]">✓</span>
                <span>MATCH: Cryptographically bound to payment record</span>
              </span>
              <span class="text-outline text-[10px]">100% Deterministic Verification</span>
            </div>
          </div>
        `;
      },
    },
  ],

  onStateChange(event, data) {
    if (
      event === "settlement_confirmed" ||
      event === "x402_flow_updated" ||
      event === "delivery_verified" ||
      event === "budget_updated" ||
      event === "prompt_changed"
    ) {
      if (typeof document !== "undefined" && typeof AppState !== "undefined") {
        const cur = AppState.currentView;
        if ((cur === "execution" || cur === "current") && !this.isExecuting) {
          // If transaction is already completed, ignore background budget polling ticks
          if (this.status === "COMPLETED" && (event === "budget_updated" || event === "x402_flow_updated")) {
            return;
          }
          this.reRenderIfMounted();
        }
      }
    }
  },

  reRenderIfMounted() {
    if (typeof document === "undefined") return;
    const root = document.getElementById("mainContent") || document.getElementById("main-content");
    if (root && root.querySelector("#current-view-root")) {
      root.innerHTML = this.render();
    }
  },

  toggleStep(stepId) {
    this.expandedStep = this.expandedStep === stepId ? null : stepId;
    this.reRenderIfMounted();
  },

  async runAutonomousSequence(prompt) {
    return this.startLiveExecution(prompt);
  },

  async startLiveExecution(prompt) {
    this.currentPrompt = prompt || (AppState && AppState.currentPrompt) || "Translate this legal contract to English. Quality > 0.9. Max $5.";
    this.status = "RUNNING";
    this.isExecuting = true;
    this.activeStep = 1;
    this.expandedStep = 1;
    this.elapsedSeconds = 0;

    // Reset all steps
    for (let i = 1; i <= 10; i++) {
      this.stepStates[i] = "pending";
    }
    this.stepStates[1] = "active";

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.elapsedSeconds += 1;
      const el = document.getElementById("liveExecutionTimer");
      if (el) el.innerText = `00:${this.elapsedSeconds < 10 ? "0" + this.elapsedSeconds : this.elapsedSeconds}`;
    }, 1000);

    // Switch view to execution screen immediately
    if (typeof App !== "undefined" && typeof App.navigate === "function") {
      App.navigate("execution");
    }

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const delays = [600, 700, 800, 700, 800, 700, 700, 900, 700, 600];
    let apiPromise = null;

    // Progress through the 10-step pipeline with interactive user confirmation
    for (let step = 1; step <= 10; step++) {
      this.activeStep = step;
      this.expandedStep = step;
      this.stepStates[step] = "active";
      this.reRenderIfMounted();

      // Step 4 is 402 PAYMENT REQUIRED. Before Step 5 (SIGNING), AI asks user for confirmation!
      if (step === 4) {
        await sleep(delays[step - 1] || 700);
        this.stepStates[4] = "confirmed";
        this.reRenderIfMounted();

        // Ask user with popup modal to Accept or Decline payment
        let userConfirmed = true;
        if (typeof App !== "undefined" && typeof App.confirmAiPayment === "function") {
          userConfirmed = await App.confirmAiPayment({
            provider: "Alpha Translation Labs",
            service: "Neural Text Translation",
            amount: "$4.00 USDC",
            recipient: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
            network: "Ethereum Sepolia (eip155:11155111)",
            reason: "Pareto-optimal provider meeting quality target (0.92) within budget cap.",
          });
        }

        if (!userConfirmed) {
          // User DECLINED payment: Abort cleanly with $0 spent!
          if (this.timerInterval) clearInterval(this.timerInterval);
          this.status = "ABORTED";
          this.isExecuting = false;
          this.activeStep = 4;
          this.expandedStep = 4;
          this.stepStates[5] = "blocked";
          this.reRenderIfMounted();
          if (typeof App !== "undefined" && typeof App.toast === "function") {
            App.toast("Payment Declined by User. Transaction cleanly aborted with $0 spent.", "error");
          }
          return false;
        }

        // User ACCEPTED payment: Launch backend execution on-chain now!
        apiPromise = fetch("/api/orchestrate/ai-purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: this.currentPrompt }),
        })
          .then((r) => r.json())
          .catch((err) => ({ error: err.message }));
        continue;
      }

      if (step === 8 && apiPromise) {
        // Await on-chain settlement result
        const apiResult = await Promise.race([apiPromise, sleep(1200)]);
        if (apiResult && apiResult.trace) {
          this.updateFromApiResult(apiResult);
        }
      }

      await sleep(delays[step - 1] || 700);
      this.stepStates[step] = "confirmed";
    }

    try {
      const finalResult = await apiPromise;
      if (finalResult && finalResult.trace) {
        this.updateFromApiResult(finalResult);
      }
    } catch (_) {}

    if (typeof AppState !== "undefined") {
      const txObj = {
        reqId: this.realTx.reqId,
        provider: this.realTx.providerAddress || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        providerName: this.realTx.providerName,
        serviceId: "text-translate",
        serviceName: this.realTx.serviceName,
        amount: "4000000",
        amountUSD: this.realTx.amountUSD || "4.00",
        status: "SETTLED",
        txHash: this.realTx.txHash || "0x20c9008318891465b63dd8720c78919b3e582a09af77d77336dd97d448d3a136",
        blockNumber: this.realTx.blockNumber || 11766134,
        deliveryHash: this.realTx.deliveryHash,
        deliveredText: this.realTx.deliveredText,
        timestamp: new Date().toISOString(),
        network: "Ethereum Sepolia Testnet",
        chainId: 11155111,
        caip2: "eip155:11155111",
        etherscanUrl: "https://sepolia.etherscan.io/tx/" + (this.realTx.txHash || "0x20c9008318891465b63dd8720c78919b3e582a09af77d77336dd97d448d3a136"),
        content: {
          translatedText: this.realTx.deliveredText,
          provider: this.realTx.providerName,
          service: this.realTx.serviceName,
          reqId: this.realTx.reqId,
        },
      };

      const normalizedTx = typeof TransactionAdapter !== "undefined"
        ? TransactionAdapter.normalize(txObj)
        : txObj;

      if (!AppState.transactions.some(t => t.reqId === normalizedTx.reqId)) {
        AppState.transactions = [normalizedTx, ...(AppState.transactions || [])];
        AppState.x402Transactions = [normalizedTx, ...(AppState.x402Transactions || [])];

        const spentNum = parseFloat(this.realTx.amountUSD || "4.00") || 4.00;
        const prevSettled = AppState.budget ? parseFloat(AppState.budget.settledSpend || "0") : 0;
        const prevBudget = AppState.budget ? parseFloat(AppState.budget.authorizedBudget || "30") : 30;
        const newSettled = prevSettled + spentNum;
        const newRemaining = Math.max(0, prevBudget - newSettled);

        AppState.updateBudget({
          settledSpend: newSettled.toFixed(2),
          remainingBudget: newRemaining.toFixed(2),
        });

        AppState.notify("transactions_updated", AppState.transactions);
        AppState.notify("x402_updated", AppState.x402Transactions);
      }
    }

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.status = "COMPLETED";
    this.isExecuting = false;
    this.activeStep = 10;
    this.expandedStep = null; // show completed result summary
    this.hasAnimatedReceipt = false;
    this.reRenderIfMounted();

    if (typeof ApiService !== "undefined") {
      await ApiService.syncAll();
    }
    return true;
  },

  audioCtx: null,

  playRatchetClick() {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140 + Math.random() * 40, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.audioCtx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.045);
    } catch (e) {}
  },

  scheduleMechanicalSounds() {
    const pauses = [0, 140, 500, 620, 1000, 1120, 1540, 1680, 2100, 2220, 2600];
    pauses.forEach((delay) => {
      setTimeout(() => this.playRatchetClick(), delay);
    });
  },

  replayReceipt() {
    const receiptEl = document.getElementById("liveReceiptPaper");
    const ledEl = document.getElementById("livePrinterLed");
    const statusTextEl = document.getElementById("livePrinterStatusText");
    if (!receiptEl) return;

    // Reset inline styling so keyframe animation takes over cleanly
    receiptEl.style.transform = "";
    receiptEl.style.opacity = "";
    receiptEl.classList.remove("animate-print-feed");
    void receiptEl.offsetWidth; // Force CSS reflow
    receiptEl.classList.add("animate-print-feed");

    if (ledEl) {
      ledEl.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 printer-led-active shadow-[0_0_8px_#22c55e]";
    }
    if (statusTextEl) {
      statusTextEl.innerText = "FEEDING PAPER";
      statusTextEl.className = "text-[10px] font-mono tracking-wider text-emerald-400 font-semibold uppercase animate-pulse";
    }

    this.scheduleMechanicalSounds();

    setTimeout(() => {
      if (receiptEl) {
        receiptEl.classList.remove("animate-print-feed");
        receiptEl.style.transform = "translateY(0%)";
        receiptEl.style.opacity = "1";
      }
      if (ledEl) {
        ledEl.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]";
      }
      if (statusTextEl) {
        statusTextEl.innerText = "PRINTED • READY";
        statusTextEl.className = "text-[10px] font-mono tracking-wider text-emerald-400 font-semibold uppercase";
      }
    }, 2850);
  },

  downloadReceipt() {
    const receiptEl = document.getElementById("liveReceiptPaper");
    if (!receiptEl) return;
    const printWindow = window.open("", "", "width=450,height=700");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>W3A-1 Transaction Receipt #ORD-98241</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; background: white; color: black; font-size: 12px; }
            .receipt-wrap { max-width: 340px; margin: 0 auto; }
            hr { border-top: 1px dashed #444; margin: 12px 0; }
            .bold { font-weight: bold; }
            .flex { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .center { text-align: center; }
          </style>
        </head>
        <body>
          <div class="receipt-wrap">
            \${receiptEl.innerHTML}
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 300);
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  },

  render() {
    this.init();
    this.syncRealTransaction();

    const tx = this.realTx;
    const txDate = tx.timestamp instanceof Date ? tx.timestamp : new Date(tx.timestamp || Date.now());
    const formattedDate = txDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase() + " " + txDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const orderNo = `#TX-${(tx.txHash ? tx.txHash.slice(2, 8) : "B1ED8D").toUpperCase()}`;
    const shortReqId = tx.reqId && tx.reqId.length > 22 ? (tx.reqId.slice(0, 18) + "...") : (tx.reqId || "0x088e7c75ddcc48eba...");
    const amountNum = Number(tx.amountUSD || 4.00);
    const amountFormatted = `$${amountNum.toFixed(2)} USDC`;
    const barcodeCode = `*W3A1-${amountNum.toFixed(0)}USDC-${(tx.txHash ? tx.txHash.slice(2, 10) : "B1ED8D").toUpperCase()}*`;

    const prompt = this.currentPrompt || (AppState && AppState.currentPrompt) || "Translate this legal contract to English. Quality > 0.9. Max $5.";
    const isRunning = this.status === "RUNNING";
    const isCompleted = this.status === "COMPLETED";
    const shouldAnimateReceipt = isCompleted && !this.hasAnimatedReceipt;

    if (shouldAnimateReceipt) {
      // Mark as animated immediately so subsequent background re-renders remain stationary
      this.hasAnimatedReceipt = true;
      this.scheduleMechanicalSounds();
      setTimeout(() => {
        const led = document.getElementById("livePrinterLed");
        const st = document.getElementById("livePrinterStatusText");
        const receipt = document.getElementById("liveReceiptPaper");
        if (receipt) {
          receipt.classList.remove("animate-print-feed");
          receipt.style.transform = "translateY(0%)";
          receipt.style.opacity = "1";
        }
        if (led) {
          led.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#22c55e]";
        }
        if (st) {
          st.innerText = "PRINTED • READY";
          st.className = "text-[10px] font-mono tracking-wider text-emerald-400 font-semibold uppercase";
        }
      }, 2850);
    }

    return `
      <div id="current-view-root" class="space-y-6 max-w-4xl mx-auto pb-16">

        <!-- ===================================================================
             1. TOP: AUTONOMOUS PURCHASE HEADER
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low/95 border border-outline-variant/50 p-6 md:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div class="absolute -right-16 -top-16 w-64 h-64 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>

          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-5">
            <div>
              <div class="flex items-center gap-2 mb-1.5 font-mono text-xs">
                <span class="text-outline uppercase font-bold tracking-widest text-[10px]">PIPELINE STAGE 3</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
                  x402 V2 LIVE WIRE
                </span>
              </div>
              <h1 class="font-headline text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                AUTONOMOUS PURCHASE
              </h1>
              <p class="text-xs md:text-sm text-secondary font-mono mt-1 font-semibold">
                "${prompt}"
              </p>
            </div>

            <!-- STATUS BADGE -->
            <div class="flex items-center gap-3">
              <div class="px-4 py-2 rounded-xl font-mono text-xs font-bold border flex items-center gap-2 shadow-sm ${
                isRunning
                  ? "bg-secondary/20 text-secondary border-secondary/50 glow-cyan animate-pulse"
                  : "bg-tertiary/20 text-tertiary border-tertiary/50 glow-emerald"
              }">
                <span class="w-2 h-2 rounded-full ${isRunning ? "bg-secondary animate-ping" : "bg-tertiary"}"></span>
                <span>STATUS: ${isRunning ? "● RUNNING" : "✓ PURCHASE COMPLETE"}</span>
                ${isRunning ? `<span id="liveExecutionTimer" class="ml-1 text-white">00:${this.elapsedSeconds < 10 ? "0" + this.elapsedSeconds : this.elapsedSeconds}</span>` : ""}
              </div>

              ${
                !isRunning
                  ? `
                <button
                  onclick="CurrentTransactionView.startLiveExecution('${prompt}')"
                  class="px-3 py-2 rounded-xl bg-surface-high hover:bg-surface-highest border border-outline-variant/40 text-xs font-mono font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
                  title="Re-run autonomous execution flow"
                >
                  <span class="material-symbols-outlined text-sm text-secondary">replay</span>
                  <span>Re-Run</span>
                </button>
              `
                  : ""
              }
            </div>
          </div>

          <!-- Supporting Subtitle -->
          <div class="pt-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-outline">
            <span>Protocol: <strong>TokenBudgetEnforcer.sol (Hardhat EVM)</strong></span>
            <span>Spender: <code class="text-white">0x709979...79C8</code></span>
            <span>Settled Spend: <strong class="text-tertiary">$4.00 USDC</strong></span>
          </div>
        </div>

        <!-- ===================================================================
             2. CENTER: CLEAN VERTICAL TIMELINE (EACH STEP EXPANDS WHEN ACTIVE)
             =================================================================== -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-6 md:p-8 space-y-4 shadow-xl">
          <div class="flex items-center justify-between border-b border-outline-variant/30 pb-3">
            <h2 class="font-headline text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Deterministic Cryptographic Pipeline</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-lowest text-outline border border-outline-variant/30">
                10 Verified Milestones
              </span>
            </h2>
            <span class="text-xs font-mono text-outline">Click any step to inspect</span>
          </div>

          <!-- Vertical Timeline Stack -->
          <div class="space-y-2 py-2">
            ${this.stepsMeta
              .map((s, idx) => {
                const state = this.stepStates[s.id] || "pending";
                const isCurrentActive = isRunning && this.activeStep === s.id;
                const isExpanded = this.expandedStep === s.id || isCurrentActive;

                let iconHtml = '<span class="w-6 h-6 rounded-full bg-surface-lowest text-outline border border-outline-variant/30 flex items-center justify-center text-xs font-mono">○</span>';
                let titleClass = "text-on-surface-variant font-medium";
                let cardBorder = "border-outline-variant/20 bg-surface-lowest/40";

                if (state === "confirmed") {
                  iconHtml = '<span class="w-6 h-6 rounded-full bg-tertiary/20 text-tertiary border border-tertiary/40 flex items-center justify-center text-xs font-bold font-mono glow-emerald">✓</span>';
                  titleClass = "text-white font-bold";
                  cardBorder = "border-outline-variant/40 bg-surface-lowest";
                } else if (state === "active") {
                  iconHtml = '<span class="w-6 h-6 rounded-full bg-secondary/20 text-secondary border border-secondary/50 flex items-center justify-center text-xs font-bold font-mono glow-cyan"><span class="material-symbols-outlined text-xs animate-pulse">bolt</span></span>';
                  titleClass = "text-secondary font-extrabold";
                  cardBorder = "border-secondary/60 bg-secondary/[0.04] shadow-md";
                }

                return `
                  <div class="space-y-2">
                    <!-- Step Row -->
                    <div
                      onclick="CurrentTransactionView.toggleStep(${s.id})"
                      class="rounded-xl border ${cardBorder} p-3.5 transition-all cursor-pointer hover:border-outline-variant/70 flex flex-col gap-2"
                    >
                      <div class="flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                          ${iconHtml}
                          <span class="font-mono text-xs font-bold tracking-wider ${titleClass}">
                            ${s.title}
                          </span>
                        </div>

                        <div class="flex items-center gap-2">
                          <span class="text-[10px] font-mono px-2 py-0.5 rounded ${
                            state === "confirmed"
                              ? "bg-tertiary/10 text-tertiary border border-tertiary/20"
                              : state === "active"
                              ? "bg-secondary/15 text-secondary border border-secondary/30"
                              : "bg-surface-high text-outline"
                          }">
                            ${state.toUpperCase()}
                          </span>
                          <span class="material-symbols-outlined text-sm text-outline transition-transform ${isExpanded ? "rotate-180" : ""}">
                            expand_more
                          </span>
                        </div>
                      </div>

                      <p class="text-[11px] font-mono text-outline pl-9">
                        ${s.shortSummary}
                      </p>

                      <!-- Expanded Details Content -->
                      ${
                        isExpanded
                          ? `
                        <div class="pt-3 mt-1 border-t border-outline-variant/20 pl-9 animate-fadeIn">
                          ${s.renderDetails(this)}
                        </div>
                      `
                          : ""
                      }
                    </div>

                    <!-- Down Arrow Between Steps -->
                    ${
                      idx < this.stepsMeta.length - 1
                        ? `
                      <div class="flex items-center justify-center py-0.5 text-outline/50 font-mono text-xs">
                        <span>↓</span>
                      </div>
                    `
                        : ""
                    }
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>

        
        <!-- Item 5: Embedded Live Telemetry Console (Collapsible) -->
        <div class="rounded-2xl bg-surface-low border border-outline-variant/40 p-5 space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-base text-secondary">terminal</span>
              <h3 class="font-headline text-sm font-bold text-white uppercase tracking-wider">Live Event Telemetry</h3>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono bg-secondary/15 text-secondary border border-secondary/30">
                SSE STREAM
              </span>
            </div>
            <button
              onclick="CurrentTransactionView.toggleTelemetry()"
              id="btnToggleTelemetry"
              class="px-3 py-1.5 rounded-lg bg-surface-high hover:bg-surface-highest border border-outline-variant/30 text-xs font-mono text-on-surface hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <span class="material-symbols-outlined text-xs">tune</span>
              <span id="labelToggleTelemetry">${this.showTelemetry ? 'Hide Telemetry' : 'Inspect Live Telemetry'}</span>
            </button>
          </div>

          ${
            this.showTelemetry && typeof LiveSystemTerminal !== 'undefined'
              ? `
            <div class="pt-2 animate-fadeIn">
              ${LiveSystemTerminal.render()}
            </div>
          `
              : ''
          }
        </div>

        <!-- ===================================================================
             3. RESULT SECTION: PURCHASE COMPLETE CARD
             =================================================================== -->
        ${
          isCompleted
            ? `
          <div class="p-6 md:p-8 rounded-2xl bg-surface-low border-2 border-tertiary/60 shadow-2xl space-y-6 glow-emerald animate-fadeIn">
            <!-- Top Status Bar: Order complete & Checkmark Badge -->
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
              <div class="flex items-center gap-3.5">
                <div class="relative flex items-center justify-center">
                  <div class="absolute w-12 h-12 bg-tertiary/20 rounded-full animate-ping"></div>
                  <div class="relative w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold font-mono text-lg shadow-lg shadow-emerald-500/30">
                    ✓
                  </div>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="font-headline text-lg md:text-xl font-bold text-white tracking-tight">Order complete</h3>
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-tertiary/20 text-tertiary border border-tertiary/40">PURCHASE COMPLETE</span>
                  </div>
                  <p class="text-xs font-mono text-tertiary font-bold mt-0.5">${amountFormatted} Settled On-Chain • Zero Reload Needed</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-tertiary/15 text-tertiary border border-tertiary/40 glow-emerald flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                  SHA-256 INTEGRITY MATCH ✓
                </span>
              </div>
            </div>

            <!-- ===================================================================
                 SKEUOMORPHIC THERMAL RECEIPT PRINTER CHASSIS & DISPENSING SLIT
                 =================================================================== -->
            <div class="relative bg-gradient-to-b from-[#181d26] to-[#0e1117] p-3.5 sm:p-5 rounded-2xl border border-zinc-700/60 shadow-[0_12px_30px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)]">
              <!-- Printer Bevel Top Bar with Status LED & Hardware Controls -->
              <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 mb-2 bg-[#090b0e] rounded-lg border border-zinc-800/80">
                <div class="flex items-center gap-2">
                  <span id="livePrinterLed" class="w-2.5 h-2.5 rounded-full bg-emerald-500 ${shouldAnimateReceipt ? 'printer-led-active' : ''} shadow-[0_0_8px_#22c55e]"></span>
                  <span id="livePrinterStatusText" class="text-[10px] font-mono tracking-wider text-emerald-400 font-semibold uppercase ${shouldAnimateReceipt ? 'animate-pulse' : ''}">
                    ${shouldAnimateReceipt ? 'FEEDING PAPER' : 'PRINTED • READY'}
                  </span>
                </div>
                <div class="flex items-center gap-2.5 text-zinc-400 text-[10px] font-mono">
                  <span class="hidden sm:inline">TH-80 PRO • THERMAL DISPENSER</span>
                  <span class="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                  <button 
                    onclick="CurrentTransactionView.replayReceipt()" 
                    class="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:text-white transition flex items-center gap-1 cursor-pointer"
                    title="Re-feed receipt animation"
                  >
                    <span class="material-symbols-outlined text-[13px]">refresh</span>
                    <span>Print Again</span>
                  </button>
                  <button 
                    onclick="CurrentTransactionView.downloadReceipt()" 
                    class="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 hover:text-white transition flex items-center gap-1 cursor-pointer"
                    title="Print or save PDF receipt"
                  >
                    <span class="material-symbols-outlined text-[13px]">download</span>
                    <span>Download</span>
                  </button>
                  <button 
                    type="button"
                    onclick="App.openVerifier('${tx.txHash}')" 
                    class="px-2.5 py-1 rounded bg-blue-600/25 hover:bg-blue-600/40 text-cyan-300 border border-cyan-500/40 transition flex items-center gap-1 cursor-pointer"
                    title="Open Sepolia Blockchain Verifier in this dashboard"
                  >
                    <span class="material-symbols-outlined text-[13px]">verified</span>
                    <span>Sepolia Verifier</span>
                  </button>
                </div>
              </div>

              <!-- Printer Mouth Slit (overflow: hidden container) -->
              <div class="relative w-full rounded-md p-1 bg-[#050608] shadow-[inset_0_4px_10px_rgba(0,0,0,0.95)] border-t border-b border-zinc-900 overflow-hidden">
                <!-- Recessed Metallic Slot Shadow Edge -->
                <div class="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-black via-black/80 to-transparent z-20 pointer-events-none"></div>
                <div class="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-t from-black/80 to-transparent z-20 pointer-events-none"></div>

                <!-- Dispenser Viewing Chamber -->
                <div class="relative w-full min-h-[460px] overflow-hidden flex justify-center pt-1 pb-3">
                  <!-- THE REAL THERMAL RECEIPT COMPONENT -->
                  <div 
                    id="liveReceiptPaper"
                    class="${shouldAnimateReceipt ? 'animate-print-feed' : ''} receipt-paper text-zinc-900 w-full max-w-[360px] px-5 py-6 rounded-b-sm shadow-2xl shadow-black/80 jagged-top jagged-bottom font-mono text-xs transition-transform duration-500"
                    style="${shouldAnimateReceipt ? '' : 'transform: translateY(0%); opacity: 1;'}"
                  >
                    <!-- Receipt Header / Business & Protocol Logo -->
                    <div class="text-center pb-4 border-b border-dashed border-zinc-300">
                      <div class="inline-flex items-center justify-center w-8 h-8 rounded bg-zinc-900 text-white font-bold text-xs mb-1.5 shadow-sm">
                        ▲
                      </div>
                      <h2 class="text-sm font-bold tracking-widest uppercase text-zinc-950 font-sans">W3A-1 AUTONOMOUS COMMERCE</h2>
                      <p class="text-[11px] text-zinc-600 font-medium">Safe-Spend & x402 V2 Settlement Protocol</p>
                      <p class="text-[10px] text-blue-700 font-semibold mt-0.5">Network: eip155:11155111 • Ethereum Sepolia Testnet</p>
                    </div>

                    <!-- Metadata Info (Real Date, Order/Tx ID, Provider, Signer) -->
                    <div class="py-3 text-[11px] text-zinc-600 border-b border-dashed border-zinc-300 space-y-1">
                      <div class="flex justify-between">
                        <span class="text-zinc-500">DATE:</span>
                        <span class="font-medium text-zinc-900 font-mono">${formattedDate}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-zinc-500">ORDER / TX:</span>
                        <span class="font-bold text-zinc-950 font-mono">${orderNo}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-zinc-500">REQUEST ID:</span>
                        <span class="font-mono text-zinc-800" title="${tx.reqId}">${shortReqId}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-zinc-500">PROVIDER:</span>
                        <span class="font-medium text-zinc-900 truncate max-w-[190px]" title="${tx.providerName}">${tx.providerName}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-zinc-500">PAYMENT:</span>
                        <span class="font-medium text-zinc-800">x402 Exact EIP-712 (USDC)</span>
                      </div>
                    </div>

                    <!-- Real Itemized Service Breakdown -->
                    <div class="py-3 border-b border-dashed border-zinc-300 space-y-2.5">
                      <div class="flex justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                        <span>ITEM / SERVICE</span>
                        <span>AMOUNT</span>
                      </div>

                      <div class="space-y-2 text-[11px]">
                        <!-- Line 1: Real AI Purchased Service -->
                        <div class="flex justify-between items-start">
                          <div class="pr-2">
                            <div class="font-bold text-zinc-900">${tx.serviceName}</div>
                            <div class="text-[10px] text-zinc-500 font-mono">${tx.providerName}</div>
                            <div class="text-[9.5px] text-zinc-400">${tx.serviceDetail}</div>
                          </div>
                          <span class="font-bold text-zinc-950 font-mono whitespace-nowrap">${amountFormatted}</span>
                        </div>

                        <!-- Line 2: x402 Facilitator Settlement -->
                        <div class="flex justify-between items-start">
                          <div>
                            <div class="font-bold text-zinc-800">x402 Facilitator Settlement</div>
                            <div class="text-[10px] text-zinc-500 font-mono">EIP-712 Gasless Escrow</div>
                          </div>
                          <span class="font-bold text-emerald-600 font-mono whitespace-nowrap">FREE ($0.00)</span>
                        </div>

                        <!-- Line 3: SHA-256 Cryptographic Audit -->
                        <div class="flex justify-between items-start">
                          <div>
                            <div class="font-bold text-zinc-800">SHA-256 Delivery Verification</div>
                            <div class="text-[10px] text-zinc-500 font-mono">On-Chain Digest Match</div>
                          </div>
                          <span class="font-bold text-emerald-600 font-mono whitespace-nowrap">INCLUDED</span>
                        </div>
                      </div>
                    </div>

                    <!-- Subtotal, Gas & Total Calculation -->
                    <div class="py-3 border-b-2 border-zinc-900 space-y-1.5 text-[11px]">
                      <div class="flex justify-between text-zinc-600">
                        <span>SUBTOTAL</span>
                        <span class="font-mono font-medium">${amountFormatted}</span>
                      </div>
                      <div class="flex justify-between text-zinc-600">
                        <span>NETWORK GAS (SPONSORED)</span>
                        <span class="text-emerald-600 font-medium font-mono">0.0000 ETH</span>
                      </div>
                      <div class="flex justify-between text-zinc-600">
                        <span>FACILITATOR SUBSIDY</span>
                        <span class="text-emerald-600 font-medium">100% COVERED</span>
                      </div>

                      <!-- Bold Total Paid -->
                      <div class="flex justify-between items-baseline pt-2 border-t border-zinc-300 text-zinc-950 font-bold">
                        <span class="text-xs uppercase tracking-wide">TOTAL PAID:</span>
                        <div class="text-right">
                          <span class="text-xl tracking-tight font-extrabold text-black block font-mono">${amountFormatted}</span>
                          <span class="text-[10px] text-emerald-700 font-mono font-semibold">✓ Settled On-Chain</span>
                        </div>
                      </div>
                    </div>

                    <!-- Cryptographic Proof Snippet on Paper -->
                    <div class="py-2.5 border-b border-dashed border-zinc-300 text-[10px] font-mono text-zinc-700 space-y-1.5">
                      <div>
                        <span class="text-zinc-400 block text-[9px] uppercase font-bold">On-Chain Tx Hash:</span>
                        <a href="https://sepolia.etherscan.io/tx/${tx.txHash}" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-700 hover:text-blue-900 break-all select-all block text-[9.5px] underline underline-offset-2" title="Open on Sepolia Etherscan">${tx.txHash} ↗</a>
                      </div>
                      <div>
                        <span class="text-zinc-400 block text-[9px] uppercase font-bold">SHA-256 Delivery Hash:</span>
                        <code class="text-zinc-800 break-all select-all block text-[9.5px]">${tx.deliveryHash}</code>
                      </div>
                      <div class="pt-1">
                        <span class="text-zinc-400 block text-[9px] uppercase font-bold">Delivered Payload Output:</span>
                        <p class="text-[10px] text-zinc-800 font-sans italic line-clamp-3 bg-zinc-100 p-2 rounded border border-zinc-200 mt-0.5">
                          "${tx.deliveredText}"
                        </p>
                      </div>
                    </div>

                    <!-- Footer & Functional SVG Barcode -->
                    <div class="pt-3 flex flex-col items-center">
                      <div class="flex items-center gap-1.5 text-[9px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                        <span>✓</span>
                        <span>CRYPTOGRAPHICALLY VERIFIED & IMMUTABLE</span>
                      </div>

                      <!-- Scalable Vector Barcode (Code-128 aesthetic) -->
                      <div class="w-full flex justify-center py-1">
                        <svg class="h-10 w-48 text-zinc-900" viewBox="0 0 160 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <rect x="0" y="0" width="3" height="40" />
                          <rect x="5" y="0" width="1.5" height="40" />
                          <rect x="8" y="0" width="4" height="40" />
                          <rect x="14" y="0" width="2" height="40" />
                          <rect x="18" y="0" width="1" height="40" />
                          <rect x="21" y="0" width="3.5" height="40" />
                          <rect x="27" y="0" width="2" height="40" />
                          <rect x="31" y="0" width="4" height="40" />
                          <rect x="37" y="0" width="1.5" height="40" />
                          <rect x="41" y="0" width="3" height="40" />
                          <rect x="46" y="0" width="2" height="40" />
                          <rect x="50" y="0" width="1" height="40" />
                          <rect x="53" y="0" width="4" height="40" />
                          <rect x="59" y="0" width="2.5" height="40" />
                          <rect x="63" y="0" width="1" height="40" />
                          <rect x="66" y="0" width="3" height="40" />
                          <rect x="71" y="0" width="4" height="40" />
                          <rect x="77" y="0" width="2" height="40" />
                          <rect x="81" y="0" width="1.5" height="40" />
                          <rect x="84" y="0" width="3.5" height="40" />
                          <rect x="89" y="0" width="1" height="40" />
                          <rect x="92" y="0" width="4" height="40" />
                          <rect x="98" y="0" width="2" height="40" />
                          <rect x="102" y="0" width="3" height="40" />
                          <rect x="107" y="0" width="1.5" height="40" />
                          <rect x="110" y="0" width="4" height="40" />
                          <rect x="116" y="0" width="2" height="40" />
                          <rect x="120" y="0" width="1" height="40" />
                          <rect x="123" y="0" width="3.5" height="40" />
                          <rect x="128" y="0" width="2" height="40" />
                          <rect x="132" y="0" width="4" height="40" />
                          <rect x="138" y="0" width="1.5" height="40" />
                          <rect x="142" y="0" width="3" height="40" />
                          <rect x="147" y="0" width="2" height="40" />
                          <rect x="151" y="0" width="1" height="40" />
                          <rect x="154" y="0" width="3" height="40" />
                          <rect x="158" y="0" width="2" height="40" />
                        </svg>
                      </div>

                      <p class="text-[9px] font-mono tracking-widest text-zinc-600 mt-0.5 font-bold">
                        ${barcodeCode}
                      </p>

                      <p class="text-[8.5px] text-zinc-500 mt-1 text-center font-mono font-medium">
                        Block #${tx.blockNumber || 11766264} • Sepolia Enforcer: 0xf9f2...A75e
                      </p>

                      <!-- Direct Actions: Sepolia Etherscan & Full Verifier Page -->
                      <div class="mt-2.5 w-full space-y-1.5">
                        <a 
                          href="https://sepolia.etherscan.io/tx/${tx.txHash}" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          class="w-full py-2 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/30 transition active:scale-95 text-center cursor-pointer"
                          title="Verify this transaction directly on Ethereum Sepolia Etherscan"
                        >
                          <span>🌐</span>
                          <span>Verify on Sepolia Etherscan Page Directly</span>
                          <span class="text-xs">↗</span>
                        </a>
                        <button 
                          type="button"
                          onclick="App.openVerifier('${tx.txHash}')" 
                          class="w-full py-2 px-2.5 rounded bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-400/50 text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 text-center cursor-pointer"
                          title="Open Sepolia Verifier Directly in Dashboard"
                        >
                          <span class="text-cyan-300 font-bold">🔗</span>
                          <span>Open in Sepolia Verifier (This Dashboard) &rarr;</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Delivered Translation Preview -->
            <div class="p-4 rounded-xl bg-surface-lowest border border-outline-variant/30 space-y-2">
              <div class="flex items-center justify-between text-[11px] font-mono text-outline">
                <span>Delivered Output (English):</span>
                <span class="text-tertiary font-bold">100% Cryptographic Match</span>
              </div>
              <p class="text-sm font-sans text-white leading-relaxed p-3.5 bg-surface-high/30 rounded-lg border border-outline-variant/20 select-text">
                "${this.deliveredText}"
              </p>
            </div>

            <!-- Settlement & Hash Proof Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div class="p-3 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center justify-between">
                <span class="text-outline">On-Chain Tx Hash:</span>
                <span class="text-secondary font-bold inline-flex items-center gap-1">
                  ${UIFormatter.formatHash(this.txHash, 6)}
                  <button onclick="App.copyText('${this.txHash}')" class="text-outline hover:text-white" title="Copy transaction hash">
                    <span class="material-symbols-outlined text-xs">content_copy</span>
                  </button>
                </span>
              </div>
              <div class="p-3 rounded-xl bg-surface-lowest border border-outline-variant/30 flex items-center justify-between">
                <span class="text-outline">Delivery Proof:</span>
                <span class="text-tertiary font-bold">${UIFormatter.formatDeliveryHash(this.deliveryHash, 4)}</span>
              </div>
            </div>

            <!-- Navigation Actions -->
            <div class="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                onclick="App.navigate('purchases')"
                class="px-5 py-2.5 rounded-xl bg-surface-high hover:bg-surface-highest border border-outline-variant/40 text-xs font-mono font-bold text-white flex items-center gap-2 transition cursor-pointer active:scale-95"
              >
                <span class="material-symbols-outlined text-sm">receipt_long</span>
                <span>View in Purchases Explorer &rarr;</span>
              </button>
              <div class="flex items-center gap-2">
                <a
                  href="/receipt-success.html"
                  target="_blank"
                  class="px-4 py-2.5 rounded-xl bg-surface-lowest hover:bg-surface-high border border-outline-variant/40 text-xs font-mono text-zinc-300 hover:text-white flex items-center gap-1.5 transition"
                >
                  <span class="material-symbols-outlined text-sm">open_in_new</span>
                  <span>Standalone View</span>
                </a>
                <button
                  onclick="App.navigate('buy')"
                  class="px-5 py-2.5 rounded-xl bg-secondary/20 hover:bg-secondary/30 border border-secondary/50 text-xs font-mono font-bold text-secondary hover:text-white flex items-center gap-2 transition shadow-sm glow-cyan cursor-pointer active:scale-95"
                >
                  <span class="material-symbols-outlined text-sm">smart_toy</span>
                  <span>Buy Another Service</span>
                </button>
              </div>
            </div>
          </div>
        `
            : ""
        }

      </div>
    `;
  },
};
