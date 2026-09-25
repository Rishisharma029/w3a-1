"use strict";

const { computeContentHash } = require("../shared/types");

const SERVICES = {
  "weather-report": {
    id: "weather-report",
    name: "Mock Weather Report",
    price: 4,
    description: "Returns a deterministic mock weather report.",
    generate(reqId) {
      return {
        service:     "weather-report",
        reqId,
        temperature: 22,
        condition:   "Partly Cloudy",
        humidity:    55,
        wind_kmh:    12,
        location:    "MockCity",
        generated_at: new Date().toISOString(),
      };
    },
  },

  "market-data": {
    id: "market-data",
    name: "Mock Market Data",
    price: 6,
    description: "Returns a deterministic mock asset price snapshot.",
    generate(reqId) {
      return {
        service: "market-data",
        reqId,
        assets: [
          { symbol: "ETH",  price_usd: 3500.00 },
          { symbol: "BTC",  price_usd: 67000.00 },
        ],
        generated_at: new Date().toISOString(),
      };
    },
  },

  "news-summary": {
    id: "news-summary",
    name: "Mock News Summary",
    price: 3,
    description: "Returns a mock news headline summary.",
    generate(reqId) {
      return {
        service:   "news-summary",
        reqId,
        headlines: [
          "AI agents now purchase services autonomously on-chain.",
          "Blockchain payment rails enable machine-to-machine commerce.",
        ],
        generated_at: new Date().toISOString(),
      };
    },
  },
};

/**
 * Look up a service by id.
 * @param {string} serviceId
 * @returns {object | undefined}
 */
function getService(serviceId) {
  return SERVICES[serviceId];
}

/**
 * List all available services (for provider info endpoint).
 * @returns {object[]}
 */
function listServices() {
  return Object.values(SERVICES).map(({ id, name, price, description }) => ({
    id, name, price, description,
  }));
}

module.exports = { getService, listServices };
