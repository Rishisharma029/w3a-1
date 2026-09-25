"use strict";

const { ConfigManager } = require("../configuration");
const { getAdapterByProvider, ADAPTERS } = require("../adapters");

class HealthChecker {
  /**
   * Check health of a specific provider.
   * Returns: { status, latencyMs, lastVerified, message, authType, isConfigured }
   */
  static async checkProviderHealth(providerId) {
    const configStatus = ConfigManager.getSanitizedStatus(providerId);
    const adapter = getAdapterByProvider(providerId);

    if (!adapter) {
      return {
        providerId,
        status: "UNAVAILABLE",
        latencyMs: 0,
        lastVerified: new Date().toISOString(),
        message: "No adapter registered for provider",
        isConfigured: false,
      };
    }

    // If API requires a credential that is not configured, return REQUIRES_CONFIGURATION immediately
    if (!configStatus.isConfigured) {
      return {
        providerId,
        status: "REQUIRES_CONFIGURATION",
        latencyMs: 0,
        lastVerified: new Date().toISOString(),
        message: "Requires provider configuration (API key missing)",
        authType: configStatus.authType,
        isConfigured: false,
      };
    }

    // If offline mode is explicitly requested, indicate DEGRADED / LOCAL SIMULATION
    if (process.env.OFFLINE_MODE === "true") {
      return {
        providerId,
        status: "DEGRADED",
        latencyMs: 1,
        lastVerified: new Date().toISOString(),
        message: "Offline mode active — using local provider simulation",
        authType: configStatus.authType,
        isConfigured: true,
      };
    }

    // Perform lightweight probe
    const startTime = Date.now();
    try {
      const probeResult = await adapter.execute({ forceSimulation: false }, {});
      const latencyMs = Date.now() - startTime;

      if (probeResult.mode === "LIVE") {
        return {
          providerId,
          status: "AVAILABLE",
          latencyMs,
          lastVerified: new Date().toISOString(),
          message: "API endpoint accessible and verified live",
          authType: configStatus.authType,
          isConfigured: true,
        };
      } else {
        return {
          providerId,
          status: "DEGRADED",
          latencyMs,
          lastVerified: new Date().toISOString(),
          message: "Live API unavailable or offline — fallback simulation verified",
          authType: configStatus.authType,
          isConfigured: true,
        };
      }
    } catch (err) {
      return {
        providerId,
        status: "UNAVAILABLE",
        latencyMs: Date.now() - startTime,
        lastVerified: new Date().toISOString(),
        message: `Health probe failed: ${err.message}`,
        authType: configStatus.authType,
        isConfigured: true,
      };
    }
  }

  /**
   * Check all known providers and return health dashboard map.
   */
  static async checkAllProviders() {
    const providerIds = Object.keys(ADAPTERS);
    const checks = await Promise.all(
      providerIds.map(async (providerId) => {
        const health = await this.checkProviderHealth(providerId);
        return [providerId, health];
      })
    );
    return Object.fromEntries(checks);
  }
}

module.exports = { HealthChecker };
