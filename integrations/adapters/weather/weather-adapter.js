"use strict";

const { RestAdapter } = require("../rest/rest-adapter");

// City coordinate registry for natural language queries (e.g. "Delhi", "Tokyo", "London", "New York")
const CITY_COORDINATES = {
  delhi:     { lat: 28.6139, lon: 77.2090, name: "Delhi, India" },
  newyork:   { lat: 40.7128, lon: -74.0060, name: "New York, USA" },
  london:    { lat: 51.5074, lon: -0.1278, name: "London, UK" },
  tokyo:     { lat: 35.6762, lon: 139.6503, name: "Tokyo, Japan" },
  paris:     { lat: 48.8566, lon: 2.3522, name: "Paris, France" },
  berlin:    { lat: 52.5200, lon: 13.4050, name: "Berlin, Germany" },
  singapore: { lat: 1.3521, lon: 103.8198, name: "Singapore" },
  sydney:    { lat: -33.8688, lon: 151.2093, name: "Sydney, Australia" },
  mumbai:    { lat: 19.0760, lon: 72.8777, name: "Mumbai, India" },
};

class WeatherAdapter extends RestAdapter {
  constructor() {
    super({
      providerId: "open-meteo",
      serviceId: "open-meteo-weather",
      adapterType: "REST",
      defaultEndpoint: "https://api.open-meteo.com/v1/forecast",
      authType: "NONE",
    });
  }

  resolveCoordinates(request = {}) {
    const rawCity = String(request.city || request.location || request.query || "delhi").toLowerCase().replace(/[^a-z]/g, "");
    for (const [key, coords] of Object.entries(CITY_COORDINATES)) {
      if (rawCity.includes(key)) return coords;
    }
    const lat = typeof request.latitude === "number" ? request.latitude : 28.6139;
    const lon = typeof request.longitude === "number" ? request.longitude : 77.2090;
    return { lat, lon, name: request.city || "Delhi, India" };
  }

  async callLiveApi(request = {}) {
    const coords = this.resolveCoordinates(request);
    const url = "https://api.open-meteo.com/v1/forecast";

    const res = await this.makeHttpRequest({
      url,
      method: "GET",
      params: {
        latitude: coords.lat,
        longitude: coords.lon,
        current_weather: true,
        timezone: "auto",
      },
    });

    if (res.data && res.data.current_weather) {
      res.data.location_name = coords.name;
    }

    return res;
  }

  callLocalSimulation(request = {}) {
    const coords = this.resolveCoordinates(request);
    return {
      latitude: coords.lat,
      longitude: coords.lon,
      location_name: coords.name,
      elevation: 216.0,
      generationtime_ms: 0.12,
      utc_offset_seconds: 19800,
      timezone: "Asia/Kolkata",
      timezone_abbreviation: "IST",
      current_weather: {
        temperature: 28.4,
        windspeed: 11.2,
        winddirection: 290,
        weathercode: 1,
        is_day: 1,
        time: new Date().toISOString(),
      },
      simulated: true,
    };
  }
}

module.exports = { WeatherAdapter, CITY_COORDINATES };
