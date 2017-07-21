const utils = require('./utils');

export let config = {
  _debug: false,

  get debug() {
    // this is deprecated but may still be used during deprecation window
    // `debug` is equivalent to legacy `pbjs.logging` property
    if ($$PREBID_GLOBAL$$.logging || $$PREBID_GLOBAL$$.logging == false) {
      return $$PREBID_GLOBAL$$.logging;
    }

    return this._debug;
  },

  set debug(val) {
    this._debug = val;
  },
};

export function setConfig(options) {
  if (typeof options !== 'object') {
    utils.logError('setConfig options must be an object');
  }

  // if (options.bidderTimeout) {
  //   $$PREBID_GLOBAL$$.bidderTimeout = options.bidderTimeout;
  // }

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
