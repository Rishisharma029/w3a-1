"use strict";

const { RestAdapter } = require("../rest/rest-adapter");
const { ConfigManager } = require("../../configuration");

class CurrencyLayerAdapter extends RestAdapter {
  constructor() {
    super({
      providerId: "currencylayer-fx",
      serviceId: "currencylayer-live",
      adapterType: "REST",
      defaultEndpoint: "http://api.currencylayer.com/live",
      authType: "QUERY_PARAM",
    });
  }

  async callLiveApi(request = {}) {
    const key = ConfigManager.getApiKey(this.providerId);
    if (!key) throw new Error("CurrencyLayer API key not configured");

    const currencies = request.currencies || "EUR,GBP,JPY,CAD,AUD,INR";
    const url = "http://api.currencylayer.com/live";

    const res = await this.makeHttpRequest({
      url,
      method: "GET",
      params: {
        access_key: key,
        currencies,
        source: request.source || "USD",
      },
    });

    if (res.data && res.data.success === false) {
      throw new Error(`CurrencyLayer Error: ${res.data.error?.info || "Unknown error"}`);
    }

    return res;
  }

  callLocalSimulation(request = {}) {
    return {
      success: true,
      terms: "https://currencylayer.com/terms",
      privacy: "https://currencylayer.com/privacy",
      timestamp: Math.floor(Date.now() / 1000),
      source: request.source || "USD",
      quotes: {
        USDEUR: 0.9234,
        USDGBP: 0.7891,
        USDJPY: 154.21,
        USDCAD: 1.3654,
        USDAUD: 1.5122,
        USDINR: 83.45,
      },
      simulated: true,
    };
  }
}

module.exports = { CurrencyLayerAdapter };
