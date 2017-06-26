const utils = require('./utils');

/**
 * Methods for managing Prebid configuration
 */

let setConfigApi;
let debug;

export function getDebugStatus() {
  // if debug not set, pub might still be using pbjs.logging, which may still
  // be used until deprecation
  if (!setConfigApi) { return $$PREBID_GLOBAL$$.logging; }

  return debug;
}

export function setDebugStatus(_debug) {
  debug = _debug;
}

export function setConfig(options) {
  if (typeof options !== 'object') {
    utils.logError('setConfig options must be an object');
  }

  // while old config properties/methods are in depecration window, set this
  // to signal to getter/setter methods where to check state
  setConfigApi = true;

  // TODO: fill out remaning config options
  // if (options.bidderTimeout) {
  //   $$PREBID_GLOBAL$$.bidderTimeout = options.bidderTimeout;
  // }

  // `debug` is equivalent to previous `pbjs.logging` property
  if (options.debug) {
    setDebugStatus(options.debug);
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
