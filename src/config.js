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

export let config = {
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

export function setConfig(options) {
  if (typeof options !== 'object') {
    utils.logError('setConfig options must be an object');
  }

  if (options.bidderTimeout) {
    config.bidderTimeout = options.bidderTimeout;
  }

  if (options.debug) {
    config.debug = options.debug;
  }

  // if (options.publisherDomain) {
  //   $$PREBID_GLOBAL$$.publisherDomain = options.publisherDomain;
  // }

  // if (options.cookieSyncDelay) {
  //   $$PREBID_GLOBAL$$.cookieSyncDelay = options.cookieSyncDelay;
  // }

  // if (options.priceGranularity) {
  //   $$PREBID_GLOBAL$$.setPriceGranularity(options.priceGranularity);
  // }

  // if (options.enableSendAllBids) {
  //   $$PREBID_GLOBAL$$.enableSendAllBids();
  // }

  // if (options.bidderSequence) {
  //   $$PREBID_GLOBAL$$.setBidderSequence(options.bidderSequence);
  // }

  // if (options.s2sConfig) {
  //   $$PREBID_GLOBAL$$.setS2SConfig(options.s2sConfig);
  // }
}
