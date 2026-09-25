"use strict";

const { RestAdapter } = require("../rest/rest-adapter");
const { ConfigManager } = require("../../configuration");

class IpStackAdapter extends RestAdapter {
  constructor() {
    super({
      providerId: "ipstack-geo",
      serviceId: "ipstack-lookup",
      adapterType: "REST",
      defaultEndpoint: "http://api.ipstack.com",
      authType: "QUERY_PARAM",
    });
  }

  async callLiveApi(request = {}) {
    const key = ConfigManager.getApiKey(this.providerId);
    if (!key) throw new Error("IPStack API key not configured");

    const targetIp = (request.ip || request.query || "134.201.250.155").trim();
    const url = `http://api.ipstack.com/${encodeURIComponent(targetIp)}`;

    const res = await this.makeHttpRequest({
      url,
      method: "GET",
      params: { access_key: key },
    });

    if (res.data && res.data.success === false) {
      throw new Error(`IPStack Error: ${res.data.error?.info || "Unknown error"}`);
    }

    return res;
  }

  callLocalSimulation(request = {}) {
    const targetIp = (request.ip || request.query || "134.201.250.155").trim();
    return {
      ip: targetIp,
      type: targetIp.includes(":") ? "ipv6" : "ipv4",
      continent_code: "NA",
      continent_name: "North America",
      country_code: "US",
      country_name: "United States",
      region_code: "CA",
      region_name: "California",
      city: "Los Angeles",
      zip: "90013",
      latitude: 34.0453,
      longitude: -118.2413,
      location: {
        geoname_id: 5368361,
        capital: "Washington D.C.",
        languages: [{ code: "en", name: "English", native: "English" }],
        country_flag: "https://assets.ipstack.com/flags/us.svg",
        country_flag_emoji: "🇺🇸",
      },
      simulated: true,
    };
  }
}

module.exports = { IpStackAdapter };
