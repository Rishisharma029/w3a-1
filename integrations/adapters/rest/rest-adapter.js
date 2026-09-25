"use strict";

const { BaseAdapter } = require("../base/base-adapter");
const { ConfigManager } = require("../../configuration");

class RestAdapter extends BaseAdapter {
  constructor(options) {
    super(options);
    this.httpMethod = options.httpMethod || "GET";
  }

  canExecuteLive(config = {}) {
    if (this.authType === "NONE") return true;
    return ConfigManager.isConfigured(this.providerId);
  }
}

module.exports = { RestAdapter };
