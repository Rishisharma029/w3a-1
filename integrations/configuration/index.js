"use strict";

require("dotenv").config();

/**
 * Central Configuration Manager for Third-Party API Services
 * Strictly prevents credential leakage: keys are kept server-side only.
 */

const KNOWN_CONFIGS = {
  "ipstack-geo": {
    envVar: "IPSTACK_API_KEY",
    altEnvVars: ["IPSTACK_ACCESS_KEY", "IPSTACK_MCP_KEY"],
    name: "IPStack Geolocation API",
    required: true,
    authType: "QUERY_PARAM",
    paramName: "access_key",
  },
  "currencylayer-fx": {
    envVar: "CURRENCY_LAYER_API_KEY",
    altEnvVars: ["CURRENCY_LAYER_ACCESS_KEY"],
    name: "CurrencyLayer Forex Rates API",
    required: true,
    authType: "QUERY_PARAM",
    paramName: "access_key",
  },
  "giphy-media": {
    envVar: "GIPHY_API_KEY",
    name: "Giphy GIF & Media Engine",
    required: true,
    authType: "QUERY_PARAM",
    paramName: "api_key",
  },
  "apiflash-render": {
    envVar: "APIFLASH_ACCESS_KEY",
    altEnvVars: ["APIFLASH_API_KEY"],
    name: "ApiFlash Automated Web Screenshot",
    required: true,
    authType: "QUERY_PARAM",
    paramName: "access_key",
  },
  "amazon-scraper": {
    envVar: "AMAZON_SCRAPER_API_KEY",
    altEnvVars: ["RAPIDAPI_KEY"],
    name: "Amazon E-Commerce Scraper API",
    required: true,
    authType: "QUERY_PARAM",
    paramName: "api_key",
  },
  "blitapp-cloud": {
    envVar: "BLITAPP_API_KEY",
    altEnvVars: ["BLITAPP_API_TOKEN"],
    name: "Blitapp Scheduled Web Snapshot",
    required: true,
    authType: "HEADER",
    headerName: "Authorization",
  },
  "apitemplate-docs": {
    envVar: "APITEMPLATE_API_KEY",
    name: "APITemplate Document Generation",
    required: true,
    authType: "HEADER",
    headerName: "X-API-KEY",
  },
  "open-meteo": {
    envVar: null,
    name: "Open-Meteo Global Weather Service",
    required: false,
    authType: "NONE",
  },
};

// Dynamic registry for user-supplied custom/unknown credentials
const CUSTOM_CONFIGS = new Map();

// Initialize known custom keys if present in env
["CUSTOM_KEY_1", "CUSTOM_KEY_2", "CUSTOM_KEY_3"].forEach((keyName, idx) => {
  if (process.env[keyName]) {
    CUSTOM_CONFIGS.set(`custom-provider-${idx + 1}`, {
      envVar: keyName,
      name: `Custom Extensible Provider #${idx + 1}`,
      configured: true,
    });
  }
});

class ConfigManager {
  /**
   * Retrieves the raw API key for internal server-side use only.
   * NEVER pass this result to frontend clients or include in public responses.
   */
  static getApiKey(providerId) {
    const config = KNOWN_CONFIGS[providerId];
    if (config) {
      if (!config.envVar) return null; // zero-auth API
      let val = process.env[config.envVar];
      if (!val && Array.isArray(config.altEnvVars)) {
        for (const alt of config.altEnvVars) {
          if (process.env[alt]) {
            val = process.env[alt];
            break;
          }
        }
      }
      if (!val && config.altEnvVar && process.env[config.altEnvVar]) {
        val = process.env[config.altEnvVar];
      }
      return val ? String(val).trim() : null;
    }

    const custom = CUSTOM_CONFIGS.get(providerId);
    if (custom && custom.envVar) {
      const val = process.env[custom.envVar];
      return val ? String(val).trim() : null;
    }

    return null;
  }

  /**
   * Returns true if the service has its required credentials set or needs no auth.
   */
  static isConfigured(providerId) {
    const config = KNOWN_CONFIGS[providerId];
    if (config) {
      if (!config.required) return true; // Zero-auth (e.g. Open-Meteo)
      return Boolean(this.getApiKey(providerId));
    }
    const custom = CUSTOM_CONFIGS.get(providerId);
    if (custom) {
      return Boolean(this.getApiKey(providerId));
    }
    return false;
  }

  /**
   * Safe status object suitable for frontend serialization.
   * Redacts sensitive key details and returns only presence flags.
   */
  static getSanitizedStatus(providerId) {
    const config = KNOWN_CONFIGS[providerId];
    if (!config) {
      const custom = CUSTOM_CONFIGS.get(providerId);
      if (custom) {
        return {
          providerId,
          name: custom.name,
          authType: "CUSTOM",
          isConfigured: Boolean(this.getApiKey(providerId)),
          status: this.getApiKey(providerId) ? "AVAILABLE" : "REQUIRES_CONFIGURATION",
        };
      }
      return {
        providerId,
        authType: "UNKNOWN",
        isConfigured: false,
        status: "UNAVAILABLE",
      };
    }

    const hasKey = !config.required || Boolean(this.getApiKey(providerId));
    return {
      providerId,
      name: config.name,
      authType: config.authType,
      isConfigured: hasKey,
      status: hasKey ? "AVAILABLE" : "REQUIRES_CONFIGURATION",
      configurationHint: hasKey ? "Configured in server environment" : `Set ${config.envVar} in server environment`,
    };
  }

  /**
   * Return safe summaries for all registered third-party providers.
   */
  static getAllProviderStatuses() {
    const list = [];
    for (const id of Object.keys(KNOWN_CONFIGS)) {
      list.push(this.getSanitizedStatus(id));
    }
    for (const id of CUSTOM_CONFIGS.keys()) {
      list.push(this.getSanitizedStatus(id));
    }
    return list;
  }

  /**
   * Dynamically register an additional provider configuration.
   */
  static registerCustomConfig(providerId, envVarName, displayName = "Custom Provider") {
    CUSTOM_CONFIGS.set(providerId, {
      envVar: envVarName,
      name: displayName,
      configured: Boolean(process.env[envVarName]),
    });
  }
}

module.exports = {
  ConfigManager,
  KNOWN_CONFIGS,
  CUSTOM_CONFIGS,
};
