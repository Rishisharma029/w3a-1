"use strict";

const { IpStackAdapter } = require("./ipstack/ipstack-adapter");
const { CurrencyLayerAdapter } = require("./currencylayer/currencylayer-adapter");
const { GiphyAdapter } = require("./giphy/giphy-adapter");
const { ApiFlashAdapter } = require("./apiflash/apiflash-adapter");
const { AmazonScraperAdapter } = require("./amazon-scraper/amazon-scraper-adapter");
const { BlitappAdapter } = require("./blitapp/blitapp-adapter");
const { ApiTemplateAdapter } = require("./apitemplate/apitemplate-adapter");
const { WeatherAdapter } = require("./weather/weather-adapter");

const ADAPTERS = {
  "ipstack-geo": new IpStackAdapter(),
  "currencylayer-fx": new CurrencyLayerAdapter(),
  "giphy-media": new GiphyAdapter(),
  "apiflash-render": new ApiFlashAdapter(),
  "amazon-scraper": new AmazonScraperAdapter(),
  "blitapp-cloud": new BlitappAdapter(),
  "apitemplate-docs": new ApiTemplateAdapter(),
  "open-meteo": new WeatherAdapter(),
};

// Also index by serviceId for direct execution lookup
const SERVICE_TO_ADAPTER = {
  "ipstack-lookup": ADAPTERS["ipstack-geo"],
  "currencylayer-live": ADAPTERS["currencylayer-fx"],
  "giphy-search": ADAPTERS["giphy-media"],
  "apiflash-capture": ADAPTERS["apiflash-render"],
  "amazon-product-data": ADAPTERS["amazon-scraper"],
  "blitapp-snapshot": ADAPTERS["blitapp-cloud"],
  "apitemplate-pdf": ADAPTERS["apitemplate-docs"],
  "open-meteo-weather": ADAPTERS["open-meteo"],
};

function getAdapterByProvider(providerId) {
  return ADAPTERS[providerId] || null;
}

function getAdapterByService(serviceId) {
  return SERVICE_TO_ADAPTER[serviceId] || null;
}

function registerCustomAdapter(providerId, serviceId, adapterInstance) {
  ADAPTERS[providerId] = adapterInstance;
  if (serviceId) {
    SERVICE_TO_ADAPTER[serviceId] = adapterInstance;
  }
}

module.exports = {
  ADAPTERS,
  SERVICE_TO_ADAPTER,
  getAdapterByProvider,
  getAdapterByService,
  registerCustomAdapter,
};
