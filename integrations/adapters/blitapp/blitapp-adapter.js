"use strict";

const { RestAdapter } = require("../rest/rest-adapter");
const { ConfigManager } = require("../../configuration");

class BlitappAdapter extends RestAdapter {
  constructor() {
    super({
      providerId: "blitapp-cloud",
      serviceId: "blitapp-snapshot",
      adapterType: "REST",
      defaultEndpoint: "https://blitapp.com/api/scheduledcapture",
      authType: "HEADER",
    });
  }

  async callLiveApi(request = {}) {
    const key = ConfigManager.getApiKey(this.providerId);
    if (!key) throw new Error("Blitapp API key not configured");

    const url = "https://blitapp.com/api/scheduledcapture";

    const res = await this.makeHttpRequest({
      url,
      method: "GET",
      headers: {
        "API-Key": key,
        "Accept": "application/json",
      },
    });

    return res;
  }

  callLocalSimulation(request = {}) {
    const targetUrl = request.targetUrl || request.url || "https://ethereum.org";
    return {
      capture_id: `blit_${Date.now()}`,
      status: "COMPLETED",
      target_url: targetUrl,
      image_url: `https://storage.blitapp.com/captures/w3a1-${Date.now()}.png`,
      format: "png",
      dimensions: { width: 1440, height: 900 },
      captured_at: new Date().toISOString(),
      simulated: true,
    };
  }
}

module.exports = { BlitappAdapter };
