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
const DEFAULT_PUBLISHER_DOMAIN = window.location.origin;
const DEFAULT_COOKIESYNC_DELAY = 100;

let config = {
  // `debug` is equivalent to legacy `pbjs.logging` property
  _debug: DEFAULT_DEBUG,
  get debug() {
    if ($$PREBID_GLOBAL$$.logging || $$PREBID_GLOBAL$$.logging == false) {
      return $$PREBID_GLOBAL$$.logging;
    }
    return this._debug;
  },
  set debug(val) {
    this._debug = val;
  },

  // default timeout for all bids
  _bidderTimeout: DEFAULT_BIDDER_TIMEOUT,
  get bidderTimeout() {
    return $$PREBID_GLOBAL$$.bidderTimeout || this._bidderTimeout;
  },
  set bidderTimeout(val) {
    this._bidderTimeout = val;
  },

  // domain where prebid is running for cross domain iframe communication
  _publisherDomain: DEFAULT_PUBLISHER_DOMAIN,
  get publisherDomain() {
    return $$PREBID_GLOBAL$$.publisherDomain || this._publisherDomain;
  },
  set publisherDomain(val) {
    this._publisherDomain = val;
  },

  // delay to request cookie sync to stay out of critical path
  _cookieSyncDelay: DEFAULT_COOKIESYNC_DELAY,
  get cookieSyncDelay() {
    return $$PREBID_GLOBAL$$.cookieSyncDelay || this._cookieSyncDelay;
  },
  set cookieSyncDelay(val) {
    this._cookieSyncDelay = val;
  },

  set priceGranularity(val) {
    $$PREBID_GLOBAL$$.setPriceGranularity(val);
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
  // [x] $$PREBID_GLOBAL$$.publisherDomain
  // [x] $$PREBID_GLOBAL$$.cookieSyncDelay
  // [x] $$PREBID_GLOBAL$$.setPriceGranularity (function(granularity), `priceGranularity`)
  // [ ] $$PREBID_GLOBAL$$.enableSendAllBids (function)
  // [ ] $$PREBID_GLOBAL$$.setBidderSequence (function(order), `bidderSequence`)
  // [ ] $$PREBID_GLOBAL$$.setS2SConfig (function(options), `s2sConfig`)

  Object.assign(config, options);
}
