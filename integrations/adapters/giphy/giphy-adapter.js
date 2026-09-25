"use strict";

const { RestAdapter } = require("../rest/rest-adapter");
const { ConfigManager } = require("../../configuration");

class GiphyAdapter extends RestAdapter {
  constructor() {
    super({
      providerId: "giphy-media",
      serviceId: "giphy-search",
      adapterType: "REST",
      defaultEndpoint: "https://api.giphy.com/v1/gifs/search",
      authType: "QUERY_PARAM",
    });
  }

  async callLiveApi(request = {}) {
    const key = ConfigManager.getApiKey(this.providerId);
    if (!key) throw new Error("Giphy API key not configured");

    const query = request.query || request.q || "autonomous agent machine payment";
    const limit = Math.min(parseInt(request.limit || "5", 10), 10);
    const url = "https://api.giphy.com/v1/gifs/search";

    const res = await this.makeHttpRequest({
      url,
      method: "GET",
      params: {
        api_key: key,
        q: query,
        limit,
        rating: "g",
      },
    });

    return res;
  }

  callLocalSimulation(request = {}) {
    const query = request.query || request.q || "autonomous agent";
    return {
      data: [
        {
          id: "3o7TKTDnU76v2VjvHi",
          type: "gif",
          title: `Autonomous Agent ${query} GIF`,
          url: "https://giphy.com/gifs/3o7TKTDnU76v2VjvHi",
          embed_url: "https://giphy.com/embed/3o7TKTDnU76v2VjvHi",
          rating: "g",
          images: {
            original: {
              url: "https://media.giphy.com/media/3o7TKTDnU76v2VjvHi/giphy.gif",
              width: "480",
              height: "270",
            },
            downsized_medium: {
              url: "https://media.giphy.com/media/3o7TKTDnU76v2VjvHi/200w.gif",
            },
          },
        },
      ],
      pagination: { total_count: 1, count: 1, offset: 0 },
      meta: { status: 200, msg: "OK" },
      simulated: true,
    };
  }
}

module.exports = { GiphyAdapter };
