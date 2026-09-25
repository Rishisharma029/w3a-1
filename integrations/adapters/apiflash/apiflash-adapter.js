"use strict";

const { RestAdapter } = require("../rest/rest-adapter");
const { ConfigManager } = require("../../configuration");

class ApiFlashAdapter extends RestAdapter {
  constructor() {
    super({
      providerId: "apiflash-render",
      serviceId: "apiflash-capture",
      adapterType: "REST",
      defaultEndpoint: "https://api.apiflash.com/v1/urltoimage",
      authType: "QUERY_PARAM",
    });
  }

  async callLiveApi(request = {}) {
    const key = ConfigManager.getApiKey(this.providerId);
    if (!key) throw new Error("ApiFlash API key not configured");

    const targetUrl = request.targetUrl || request.url || "https://ethereum.org";
    const url = "https://api.apiflash.com/v1/urltoimage";

    const res = await this.makeHttpRequest({
      url,
      method: "GET",
      params: {
        access_key: key,
        url: targetUrl,
        response_type: "json",
        format: "jpeg",
        quality: 85,
        width: 1280,
        height: 800,
        fresh: true,
      },
    });

    return res;
  }

  callLocalSimulation(request = {}) {
    const targetUrl = request.targetUrl || request.url || "https://ethereum.org";
    return {
      url: `https://cdn.apiflash.com/mock-capture-${Buffer.from(targetUrl).toString("base64").slice(0, 16)}.jpeg`,
      target_url: targetUrl,
      width: 1280,
      height: 800,
      format: "jpeg",
      captured_at: new Date().toISOString(),
      simulated: true,
    };
  }
}

module.exports = { ApiFlashAdapter };
