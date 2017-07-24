/*
 * Module for getting and setting Prebid configuration.
 *
 * Prebid previously defined these properties directly on the global object:
 * pbjs.logging = true;
 *
 * Defining and access properties in this way is now deprecated, but these will
 * continue to work during a deprecation window.
 */
const utils = require('./utils');

const DEFAULT_DEBUG = false;
const DEFAULT_BIDDER_TIMEOUT = 3000;

let config = {
  _debug: DEFAULT_DEBUG,
  get debug() {
    // `debug` is equivalent to legacy `pbjs.logging` property
    if ($$PREBID_GLOBAL$$.logging || $$PREBID_GLOBAL$$.logging == false) {
      return $$PREBID_GLOBAL$$.logging;
    }
    return this._debug;
  },
  set debug(val) {
    this._debug = val;
  },

  _bidderTimeout: DEFAULT_BIDDER_TIMEOUT,
  get bidderTimeout() {
    if ($$PREBID_GLOBAL$$.bidderTimeout) {
      return $$PREBID_GLOBAL$$.bidderTimeout;
    }
    return this._bidderTimeout;
  },
  set bidderTimeout(val) {
    this._bidderTimeout = val;
  },
};

export function getConfig(option) {
  return option ? config[option] : config;
}

export function setConfig(options) {
  if (typeof options !== 'object') {
    utils.logError('setConfig options must be an object');
  }

  // codebase conversion:
  // [x] $$PREBID_GLOBAL$$.bidderTimeout
  // [x] $$PREBID_GLOBAL$$.logging (renamed `debug`)
  // [ ] $$PREBID_GLOBAL$$.publisherDomain
  // [ ] $$PREBID_GLOBAL$$.cookieSyncDelay
  // [ ] $$PREBID_GLOBAL$$.setPriceGranularity (function(granularity), `priceGranularity`)
  // [ ] $$PREBID_GLOBAL$$.enableSendAllBids (function)
  // [ ] $$PREBID_GLOBAL$$.setBidderSequence (function(order), `bidderSequence`)
  // [ ] $$PREBID_GLOBAL$$.setS2SConfig (function(options), `s2sConfig`)

  Object.assign(config, options);
}
