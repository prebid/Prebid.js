/** @module pbjs */

import {getGlobal} from './prebidGlobal.js';
import {
  deepAccess,
  deepClone,
  deepSetValue,
  flatten,
  generateUUID,
  isArray,
  isArrayOfNums,
  isEmpty,
  isFn,
  isGptPubadsDefined,
  isNumber,
  logError,
  logInfo,
  logMessage,
  logWarn,
  mergeDeep,
  transformAdServerTargetingObj,
  uniques,
  unsupportedBidderMessage
} from './utils.js';
import {listenMessagesFromCreative} from './secureCreatives.js';
import {userSync} from './userSync.js';
import {config} from './config.js';
import {auctionManager} from './auctionManager.js';
import {isBidUsable, targeting} from './targeting.js';
import {hook, wrapHook} from './hook.js';
import {loadSession} from './debugging.js';
import {includes} from './polyfill.js';
import {createBid} from './bidfactory.js';
import {storageCallbacks} from './storageManager.js';
import {default as adapterManager, getS2SBidderSet} from './adapterManager.js';
import { BID_STATUS, EVENTS, NATIVE_KEYS } from './constants.js';
import * as events from './events.js';
import {newMetrics, useMetrics} from './utils/perfMetrics.js';
import {defer, GreedyPromise} from './utils/promise.js';
import {enrichFPD} from './fpd/enrichment.js';
import {allConsent} from './consentHandler.js';
import {renderAdDirect} from './adRendering.js';
import {getHighestCpm} from './utils/reducers.js';
import {fillVideoDefaults} from './video.js';

const pbjsInstance = getGlobal();
const { triggerUserSyncs } = userSync;

/* private variables */
const { ADD_AD_UNITS, REQUEST_BIDS, SET_TARGETING } = EVENTS;

const eventValidators = {
  bidWon: checkDefinedPlacement
};

// initialize existing debugging sessions if present
loadSession();

/* Public vars */
pbjsInstance.bidderSettings = pbjsInstance.bidderSettings || {};

// let the world know we are loaded
pbjsInstance.libLoaded = true;

// version auto generated from build
pbjsInstance.version = 'v$prebid.version$';
logInfo('Prebid.js v$prebid.version$ loaded');

pbjsInstance.installedModules = pbjsInstance.installedModules || [];

// create adUnit array
pbjsInstance.adUnits = pbjsInstance.adUnits || [];

// Allow publishers who enable user sync override to trigger their sync
pbjsInstance.triggerUserSyncs = triggerUserSyncs;

function checkDefinedPlacement(id) {
  var adUnitCodes = auctionManager.getBidsRequested().map(bidSet => bidSet.bids.map(bid => bid.adUnitCode))
    .reduce(flatten)
    .filter(uniques);

  if (!adUnitCodes.includes(id)) {
    logError('The "' + id + '" placement is not defined.');
    return;
  }

  return true;
}

function validateSizes(sizes, targLength) {
  let cleanSizes = [];
  if (isArray(sizes) && ((targLength) ? sizes.length === targLength : sizes.length > 0)) {
    // check if an array of arrays or array of numbers
    if (sizes.every(sz => isArrayOfNums(sz, 2))) {
      cleanSizes = sizes;
    } else if (isArrayOfNums(sizes, 2)) {
      cleanSizes.push(sizes);
    }
  }
  return cleanSizes;
}

function validateBannerMediaType(adUnit) {
  const validatedAdUnit = deepClone(adUnit);
  const banner = validatedAdUnit.mediaTypes.banner;
  const bannerSizes = validateSizes(banner.sizes);
  if (bannerSizes.length > 0) {
    banner.sizes = bannerSizes;
    // Deprecation Warning: This property will be deprecated in next release in favor of adUnit.mediaTypes.banner.sizes
    validatedAdUnit.sizes = bannerSizes;
  } else {
    logError('Detected a mediaTypes.banner object without a proper sizes field.  Please ensure the sizes are listed like: [[300, 250], ...].  Removing invalid mediaTypes.banner object from request.');
    delete validatedAdUnit.mediaTypes.banner
  }
  return validatedAdUnit;
}

function validateVideoMediaType(adUnit) {
  const validatedAdUnit = deepClone(adUnit);
  const video = validatedAdUnit.mediaTypes.video;
  if (video.playerSize) {
    let tarPlayerSizeLen = (typeof video.playerSize[0] === 'number') ? 2 : 1;

    const videoSizes = validateSizes(video.playerSize, tarPlayerSizeLen);
    if (videoSizes.length > 0) {
      if (tarPlayerSizeLen === 2) {
        logInfo('Transforming video.playerSize from [640,480] to [[640,480]] so it\'s in the proper format.');
      }
      video.playerSize = videoSizes;
      // Deprecation Warning: This property will be deprecated in next release in favor of adUnit.mediaTypes.video.playerSize
      validatedAdUnit.sizes = videoSizes;
    } else {
      logError('Detected incorrect configuration of mediaTypes.video.playerSize.  Please specify only one set of dimensions in a format like: [[640, 480]]. Removing invalid mediaTypes.video.playerSize property from request.');
      delete validatedAdUnit.mediaTypes.video.playerSize;
    }
  }
  return validatedAdUnit;
}

function validateNativeMediaType(adUnit) {
  const validatedAdUnit = deepClone(adUnit);
  const native = validatedAdUnit.mediaTypes.native;
  // if native assets are specified in OpenRTB format, remove legacy assets and print a warn.
  if (native.ortb) {
    const legacyNativeKeys = Object.keys(NATIVE_KEYS).filter(key => NATIVE_KEYS[key].includes('hb_native_'));
    const nativeKeys = Object.keys(native);
    const intersection = nativeKeys.filter(nativeKey => legacyNativeKeys.includes(nativeKey));
    if (intersection.length > 0) {
      logError(`when using native OpenRTB format, you cannot use legacy native properties. Deleting ${intersection} keys from request.`);
      intersection.forEach(legacyKey => delete validatedAdUnit.mediaTypes.native[legacyKey]);
    }
  }
  if (native.image && native.image.sizes && !Array.isArray(native.image.sizes)) {
    logError('Please use an array of sizes for native.image.sizes field.  Removing invalid mediaTypes.native.image.sizes property from request.');
    delete validatedAdUnit.mediaTypes.native.image.sizes;
  }
  if (native.image && native.image.aspect_ratios && !Array.isArray(native.image.aspect_ratios)) {
    logError('Please use an array of sizes for native.image.aspect_ratios field.  Removing invalid mediaTypes.native.image.aspect_ratios property from request.');
    delete validatedAdUnit.mediaTypes.native.image.aspect_ratios;
  }
  if (native.icon && native.icon.sizes && !Array.isArray(native.icon.sizes)) {
    logError('Please use an array of sizes for native.icon.sizes field.  Removing invalid mediaTypes.native.icon.sizes property from request.');
    delete validatedAdUnit.mediaTypes.native.icon.sizes;
  }
  return validatedAdUnit;
}

function validateAdUnitPos(adUnit, mediaType) {
  let pos = deepAccess(adUnit, `mediaTypes.${mediaType}.pos`);

  if (!isNumber(pos) || isNaN(pos) || !isFinite(pos)) {
    let warning = `Value of property 'pos' on ad unit ${adUnit.code} should be of type: Number`;

    logWarn(warning);
    events.emit(EVENTS.AUCTION_DEBUG, { type: 'WARNING', arguments: warning });
    delete adUnit.mediaTypes[mediaType].pos;
  }

  return adUnit
}

function validateAdUnit(adUnit) {
  const msg = (msg) => `adUnit.code '${adUnit.code}' ${msg}`;

  const mediaTypes = adUnit.mediaTypes;
  const bids = adUnit.bids;

  if (bids != null && !isArray(bids)) {
    logError(msg(`defines 'adUnit.bids' that is not an array. Removing adUnit from auction`));
    return null;
  }
  if (bids == null && adUnit.ortb2Imp == null) {
    logError(msg(`has no 'adUnit.bids' and no 'adUnit.ortb2Imp'. Removing adUnit from auction`));
    return null;
  }
  if (!mediaTypes || Object.keys(mediaTypes).length === 0) {
    logError(msg(`does not define a 'mediaTypes' object.  This is a required field for the auction, so this adUnit has been removed.`));
    return null;
  }
  if (adUnit.ortb2Imp != null && (bids == null || bids.length === 0)) {
    adUnit.bids = [{bidder: null}]; // the 'null' bidder is treated as an s2s-only placeholder by adapterManager
    logMessage(msg(`defines 'adUnit.ortb2Imp' with no 'adUnit.bids'; it will be seen only by S2S adapters`));
  }

  return adUnit;
}

export const adUnitSetupChecks = {
  validateAdUnit,
  validateBannerMediaType,
  validateSizes
};

if (FEATURES.NATIVE) {
  Object.assign(adUnitSetupChecks, {validateNativeMediaType});
}

if (FEATURES.VIDEO) {
  Object.assign(adUnitSetupChecks, { validateVideoMediaType });
}

export const checkAdUnitSetup = hook('sync', function (adUnits) {
  const validatedAdUnits = [];

  adUnits.forEach(adUnit => {
    adUnit = validateAdUnit(adUnit);
    if (adUnit == null) return;

    const mediaTypes = adUnit.mediaTypes;
    let validatedBanner, validatedVideo, validatedNative;

    if (mediaTypes.banner) {
      validatedBanner = validateBannerMediaType(adUnit);
      if (mediaTypes.banner.hasOwnProperty('pos')) validatedBanner = validateAdUnitPos(validatedBanner, 'banner');
    }

    if (FEATURES.VIDEO && mediaTypes.video) {
      validatedVideo = validatedBanner ? validateVideoMediaType(validatedBanner) : validateVideoMediaType(adUnit);
      if (mediaTypes.video.hasOwnProperty('pos')) validatedVideo = validateAdUnitPos(validatedVideo, 'video');
    }

    if (FEATURES.NATIVE && mediaTypes.native) {
      validatedNative = validatedVideo ? validateNativeMediaType(validatedVideo) : validatedBanner ? validateNativeMediaType(validatedBanner) : validateNativeMediaType(adUnit);
    }

    const validatedAdUnit = Object.assign({}, validatedBanner, validatedVideo, validatedNative);

    validatedAdUnits.push(validatedAdUnit);
  });

  return validatedAdUnits;
}, 'checkAdUnitSetup');

function fillAdUnitDefaults(adUnits) {
  if (FEATURES.VIDEO) {
    adUnits.forEach(au => fillVideoDefaults(au))
  }
}

/// ///////////////////////////////
//                              //
//    Start Public APIs         //
//                              //
/// ///////////////////////////////

/**
 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
 * @param  {string} [adunitCode] adUnitCode to get the bid responses for
 * @alias module:pbjs.getAdserverTargetingForAdUnitCodeStr
 * @return {Array}  returnObj return bids array
 */
pbjsInstance.getAdserverTargetingForAdUnitCodeStr = function (adunitCode) {
  logInfo('Invoking $$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCodeStr', arguments);

  // call to retrieve bids array
  if (adunitCode) {
    var res = pbjsInstance.getAdserverTargetingForAdUnitCode(adunitCode);
    return transformAdServerTargetingObj(res);
  } else {
    logMessage('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode');
  }
};

/**
 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
 * @param adunitCode {string} adUnitCode to get the bid responses for
 * @alias module:pbjs.getHighestUnusedBidResponseForAdUnitCode
 * @returns {Object}  returnObj return bid
 */
pbjsInstance.getHighestUnusedBidResponseForAdUnitCode = function (adunitCode) {
  if (adunitCode) {
    const bid = auctionManager.getAllBidsForAdUnitCode(adunitCode)
      .filter(isBidUsable)

    return bid.length ? bid.reduce(getHighestCpm) : {}
  } else {
    logMessage('Need to call getHighestUnusedBidResponseForAdUnitCode with adunitCode');
  }
};

/**
 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
 * @param adUnitCode {string} adUnitCode to get the bid responses for
 * @alias module:pbjs.getAdserverTargetingForAdUnitCode
 * @returns {Object}  returnObj return bids
 */
pbjsInstance.getAdserverTargetingForAdUnitCode = function (adUnitCode) {
  return pbjsInstance.getAdserverTargeting(adUnitCode)[adUnitCode];
};

/**
 * returns all ad server targeting for all ad units
 * @return {Object} Map of adUnitCodes and targeting values []
 * @alias module:pbjs.getAdserverTargeting
 */

pbjsInstance.getAdserverTargeting = function (adUnitCode) {
  logInfo('Invoking $$PREBID_GLOBAL$$.getAdserverTargeting', arguments);
  return targeting.getAllTargeting(adUnitCode);
};

pbjsInstance.getConsentMetadata = function () {
  logInfo('Invoking $$PREBID_GLOBAL$$.getConsentMetadata');
  return allConsent.getConsentMeta()
};

function getBids(type) {
  const responses = auctionManager[type]()
    .filter(bid => auctionManager.getAdUnitCodes().includes(bid.adUnitCode))

  // find the last auction id to get responses for most recent auction only
  const currentAuctionId = auctionManager.getLastAuctionId();

  return responses
    .map(bid => bid.adUnitCode)
    .filter(uniques).map(adUnitCode => responses
      .filter(bid => bid.auctionId === currentAuctionId && bid.adUnitCode === adUnitCode))
    .filter(bids => bids && bids[0] && bids[0].adUnitCode)
    .map(bids => {
      return {
        [bids[0].adUnitCode]: { bids }
      };
    })
    .reduce((a, b) => Object.assign(a, b), {});
}

/**
 * This function returns the bids requests involved in an auction but not bid on
 * @alias module:pbjs.getNoBids
 * @return {Object}            map | object that contains the bidRequests
 */

pbjsInstance.getNoBids = function () {
  logInfo('Invoking $$PREBID_GLOBAL$$.getNoBids', arguments);
  return getBids('getNoBids');
};

/**
 * This function returns the bids requests involved in an auction but not bid on or the specified adUnitCode
 * @param  {string} adUnitCode adUnitCode
 * @alias module:pbjs.getNoBidsForAdUnitCode
 * @return {Object}           bidResponse object
 */

pbjsInstance.getNoBidsForAdUnitCode = function (adUnitCode) {
  const bids = auctionManager.getNoBids().filter(bid => bid.adUnitCode === adUnitCode);
  return { bids };
};

/**
 * This function returns the bid responses at the given moment.
 * @alias module:pbjs.getBidResponses
 * @return {Object}            map | object that contains the bidResponses
 */

pbjsInstance.getBidResponses = function () {
  logInfo('Invoking $$PREBID_GLOBAL$$.getBidResponses', arguments);
  return getBids('getBidsReceived');
};

/**
 * Returns bidResponses for the specified adUnitCode
 * @param  {string} adUnitCode adUnitCode
 * @alias module:pbjs.getBidResponsesForAdUnitCode
 * @return {Object}            bidResponse object
 */

pbjsInstance.getBidResponsesForAdUnitCode = function (adUnitCode) {
  const bids = auctionManager.getBidsReceived().filter(bid => bid.adUnitCode === adUnitCode);
  return { bids };
};

/**
 * Set query string targeting on one or more GPT ad units.
 * @param {(string|string[])} adUnit a single `adUnit.code` or multiple.
 * @param {function(object): function(string): boolean} customSlotMatching gets a GoogleTag slot and returns a filter function for adUnitCode, so you can decide to match on either eg. return slot => { return adUnitCode => { return slot.getSlotElementId() === 'myFavoriteDivId'; } };
 * @alias module:pbjs.setTargetingForGPTAsync
 */
pbjsInstance.setTargetingForGPTAsync = function (adUnit, customSlotMatching) {
  logInfo('Invoking $$PREBID_GLOBAL$$.setTargetingForGPTAsync', arguments);
  if (!isGptPubadsDefined()) {
    logError('window.googletag is not defined on the page');
    return;
  }

  // get our ad unit codes
  let targetingSet = targeting.getAllTargeting(adUnit);

  // first reset any old targeting
  targeting.resetPresetTargeting(adUnit, customSlotMatching);

  // now set new targeting keys
  targeting.setTargetingForGPT(targetingSet, customSlotMatching);

  Object.keys(targetingSet).forEach((adUnitCode) => {
    Object.keys(targetingSet[adUnitCode]).forEach((targetingKey) => {
      if (targetingKey === 'hb_adid') {
        auctionManager.setStatusForBids(targetingSet[adUnitCode][targetingKey], BID_STATUS.BID_TARGETING_SET);
      }
    });
  });

  // emit event
  events.emit(SET_TARGETING, targetingSet);
};

/**
 * Set query string targeting on all AST (AppNexus Seller Tag) ad units. Note that this function has to be called after all ad units on page are defined. For working example code, see [Using Prebid.js with AppNexus Publisher Ad Server](http://prebid.org/dev-docs/examples/use-prebid-with-appnexus-ad-server.html).
 * @param  {(string|string[])} adUnitCodes adUnitCode or array of adUnitCodes
 * @alias module:pbjs.setTargetingForAst
 */
pbjsInstance.setTargetingForAst = function (adUnitCodes) {
  logInfo('Invoking $$PREBID_GLOBAL$$.setTargetingForAn', arguments);
  if (!targeting.isApntagDefined()) {
    logError('window.apntag is not defined on the page');
    return;
  }

  targeting.setTargetingForAst(adUnitCodes);

  // emit event
  events.emit(SET_TARGETING, targeting.getAllTargeting());
};

/**
 * This function will render the ad (based on params) in the given iframe document passed through.
 * Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchronously
 * @param  {Document} doc document
 * @param  {string} id bid id to locate the ad
 * @alias module:pbjs.renderAd
 */
pbjsInstance.renderAd = hook('async', function (doc, id, options) {
  logInfo('Invoking $$PREBID_GLOBAL$$.renderAd', arguments);
  logMessage('Calling renderAd with adId :' + id);
  renderAdDirect(doc, id, options);
});

/**
 * Remove adUnit from the $$PREBID_GLOBAL$$ configuration, if there are no addUnitCode(s) it will remove all
 * @param  {string| Array} adUnitCode the adUnitCode(s) to remove
 * @alias module:pbjs.removeAdUnit
 */
pbjsInstance.removeAdUnit = function (adUnitCode) {
  logInfo('Invoking $$PREBID_GLOBAL$$.removeAdUnit', arguments);

  if (!adUnitCode) {
    pbjsInstance.adUnits = [];
    return;
  }

  let adUnitCodes;

  if (isArray(adUnitCode)) {
    adUnitCodes = adUnitCode;
  } else {
    adUnitCodes = [adUnitCode];
  }

  adUnitCodes.forEach((adUnitCode) => {
    for (let i = pbjsInstance.adUnits.length - 1; i >= 0; i--) {
      if (pbjsInstance.adUnits[i].code === adUnitCode) {
        pbjsInstance.adUnits.splice(i, 1);
      }
    }
  });
};

/**
 * @param {Object} requestOptions
 * @param {function} requestOptions.bidsBackHandler
 * @param {number} requestOptions.timeout
 * @param {Array} requestOptions.adUnits
 * @param {Array} requestOptions.adUnitCodes
 * @param {Array} requestOptions.labels
 * @param {String} requestOptions.auctionId
 * @alias module:pbjs.requestBids
 */
pbjsInstance.requestBids = (function() {
  const delegate = hook('async', function ({ bidsBackHandler, timeout, adUnits, adUnitCodes, labels, auctionId, ttlBuffer, ortb2, metrics, defer } = {}) {
    events.emit(REQUEST_BIDS);
    const cbTimeout = timeout || config.getConfig('bidderTimeout');
    logInfo('Invoking $$PREBID_GLOBAL$$.requestBids', arguments);
    if (adUnitCodes && adUnitCodes.length) {
      // if specific adUnitCodes supplied filter adUnits for those codes
      adUnits = adUnits.filter(unit => includes(adUnitCodes, unit.code));
    } else {
      // otherwise derive adUnitCodes from adUnits
      adUnitCodes = adUnits && adUnits.map(unit => unit.code);
    }
    const ortb2Fragments = {
      global: mergeDeep({}, config.getAnyConfig('ortb2') || {}, ortb2 || {}),
      bidder: Object.fromEntries(Object.entries(config.getBidderConfig()).map(([bidder, cfg]) => [bidder, cfg.ortb2]).filter(([_, ortb2]) => ortb2 != null))
    }
    return enrichFPD(GreedyPromise.resolve(ortb2Fragments.global)).then(global => {
      ortb2Fragments.global = global;
      return startAuction({bidsBackHandler, timeout: cbTimeout, adUnits, adUnitCodes, labels, auctionId, ttlBuffer, ortb2Fragments, metrics, defer});
    })
  }, 'requestBids');

  return wrapHook(delegate, function requestBids(req = {}) {
    // unlike the main body of `delegate`, this runs before any other hook has a chance to;
    // it's also not restricted in its return value in the way `async` hooks are.

    // if the request does not specify adUnits, clone the global adUnit array;
    // otherwise, if the caller goes on to use addAdUnits/removeAdUnits, any asynchronous logic
    // in any hook might see their effects.
    let adUnits = req.adUnits || pbjsInstance.adUnits;
    req.adUnits = (isArray(adUnits) ? adUnits.slice() : [adUnits]);

    req.metrics = newMetrics();
    req.metrics.checkpoint('requestBids');
    req.defer = defer({promiseFactory: (r) => new Promise(r)})
    delegate.call(this, req);
    return req.defer.promise;
  });
})();

export const startAuction = hook('async', function ({ bidsBackHandler, timeout: cbTimeout, adUnits, ttlBuffer, adUnitCodes, labels, auctionId, ortb2Fragments, metrics, defer } = {}) {
  const s2sBidders = getS2SBidderSet(config.getConfig('s2sConfig') || []);
  fillAdUnitDefaults(adUnits);
  adUnits = useMetrics(metrics).measureTime('requestBids.validate', () => checkAdUnitSetup(adUnits));

  function auctionDone(bids, timedOut, auctionId) {
    if (typeof bidsBackHandler === 'function') {
      try {
        bidsBackHandler(bids, timedOut, auctionId);
      } catch (e) {
        logError('Error executing bidsBackHandler', null, e);
      }
    }
    defer.resolve({bids, timedOut, auctionId})
  }

  const tids = {};

  /*
   * for a given adunit which supports a set of mediaTypes
   * and a given bidder which supports a set of mediaTypes
   * a bidder is eligible to participate on the adunit
   * if it supports at least one of the mediaTypes on the adunit
   */
  adUnits.forEach(adUnit => {
    // get the adunit's mediaTypes, defaulting to banner if mediaTypes isn't present
    const adUnitMediaTypes = Object.keys(adUnit.mediaTypes || { 'banner': 'banner' });

    // get the bidder's mediaTypes
    const allBidders = adUnit.bids.map(bid => bid.bidder);
    const bidderRegistry = adapterManager.bidderRegistry;

    const bidders = allBidders.filter(bidder => !s2sBidders.has(bidder));
    adUnit.adUnitId = generateUUID();
    const tid = adUnit.ortb2Imp?.ext?.tid;
    if (tid) {
      if (tids.hasOwnProperty(adUnit.code)) {
        logWarn(`Multiple distinct ortb2Imp.ext.tid were provided for twin ad units '${adUnit.code}'`)
      } else {
        tids[adUnit.code] = tid;
      }
    }
    if (ttlBuffer != null && !adUnit.hasOwnProperty('ttlBuffer')) {
      adUnit.ttlBuffer = ttlBuffer;
    }
    bidders.forEach(bidder => {
      const adapter = bidderRegistry[bidder];
      const spec = adapter && adapter.getSpec && adapter.getSpec();
      // banner is default if not specified in spec
      const bidderMediaTypes = (spec && spec.supportedMediaTypes) || ['banner'];

      // check if the bidder's mediaTypes are not in the adUnit's mediaTypes
      const bidderEligible = adUnitMediaTypes.some(type => includes(bidderMediaTypes, type));
      if (!bidderEligible) {
        // drop the bidder from the ad unit if it's not compatible
        logWarn(unsupportedBidderMessage(adUnit, bidder));
        adUnit.bids = adUnit.bids.filter(bid => bid.bidder !== bidder);
      }
    });
  });
  if (!adUnits || adUnits.length === 0) {
    logMessage('No adUnits configured. No bids requested.');
    auctionDone();
  } else {
    adUnits.forEach(au => {
      const tid = au.ortb2Imp?.ext?.tid || tids[au.code] || generateUUID();
      if (!tids.hasOwnProperty(au.code)) {
        tids[au.code] = tid;
      }
      au.transactionId = tid;
      deepSetValue(au, 'ortb2Imp.ext.tid', tid);
    });
    const auction = auctionManager.createAuction({
      adUnits,
      adUnitCodes,
      callback: auctionDone,
      cbTimeout,
      labels,
      auctionId,
      ortb2Fragments,
      metrics,
    });

    let adUnitsLen = adUnits.length;
    if (adUnitsLen > 15) {
      logInfo(`Current auction ${auction.getAuctionId()} contains ${adUnitsLen} adUnits.`, adUnits);
    }

    adUnitCodes.forEach(code => targeting.setLatestAuctionForAdUnit(code, auction.getAuctionId()));
    auction.callBids();
  }
}, 'startAuction');

export function executeCallbacks(fn, reqBidsConfigObj) {
  runAll(storageCallbacks);
  runAll(enableAnalyticsCallbacks);
  fn.call(this, reqBidsConfigObj);

  function runAll(queue) {
    var queued;
    while ((queued = queue.shift())) {
      queued();
    }
  }
}

// This hook will execute all storage callbacks which were registered before gdpr enforcement hook was added. Some bidders, user id modules use storage functions when module is parsed but gdpr enforcement hook is not added at that stage as setConfig callbacks are yet to be called. Hence for such calls we execute all the stored callbacks just before requestBids. At this hook point we will know for sure that gdprEnforcement module is added or not
pbjsInstance.requestBids.before(executeCallbacks, 49);

/**
 *
 * Add adunit(s)
 * @param {Array|Object} adUnitArr Array of adUnits or single adUnit Object.
 * @alias module:pbjs.addAdUnits
 */
pbjsInstance.addAdUnits = function (adUnitArr) {
  logInfo('Invoking $$PREBID_GLOBAL$$.addAdUnits', arguments);
  pbjsInstance.adUnits.push.apply(pbjsInstance.adUnits, isArray(adUnitArr) ? adUnitArr : [adUnitArr]);
  // emit event
  events.emit(ADD_AD_UNITS);
};

/**
 * @param {string} event the name of the event
 * @param {Function} handler a callback to set on event
 * @param {string} id an identifier in the context of the event
 * @alias module:pbjs.onEvent
 *
 * This API call allows you to register a callback to handle a Prebid.js event.
 * An optional `id` parameter provides more finely-grained event callback registration.
 * This makes it possible to register callback events for a specific item in the
 * event context. For example, `bidWon` events will accept an `id` for ad unit code.
 * `bidWon` callbacks registered with an ad unit code id will be called when a bid
 * for that ad unit code wins the auction. Without an `id` this method registers the
 * callback for every `bidWon` event.
 *
 * Currently `bidWon` is the only event that accepts an `id` parameter.
 */
pbjsInstance.onEvent = function (event, handler, id) {
  logInfo('Invoking $$PREBID_GLOBAL$$.onEvent', arguments);
  if (!isFn(handler)) {
    logError('The event handler provided is not a function and was not set on event "' + event + '".');
    return;
  }

  if (id && !eventValidators[event].call(null, id)) {
    logError('The id provided is not valid for event "' + event + '" and no handler was set.');
    return;
  }

  events.on(event, handler, id);
};

/**
 * @param {string} event the name of the event
 * @param {Function} handler a callback to remove from the event
 * @param {string} id an identifier in the context of the event (see `$$PREBID_GLOBAL$$.onEvent`)
 * @alias module:pbjs.offEvent
 */
pbjsInstance.offEvent = function (event, handler, id) {
  logInfo('Invoking $$PREBID_GLOBAL$$.offEvent', arguments);
  if (id && !eventValidators[event].call(null, id)) {
    return;
  }

  events.off(event, handler, id);
};

/**
 * Return a copy of all events emitted
 *
 * @alias module:pbjs.getEvents
 */
pbjsInstance.getEvents = function () {
  logInfo('Invoking $$PREBID_GLOBAL$$.getEvents');
  return events.getEvents();
};

/*
 * Wrapper to register bidderAdapter externally (adapterManager.registerBidAdapter())
 * @param  {Function} bidderAdaptor [description]
 * @param  {string} bidderCode [description]
 * @alias module:pbjs.registerBidAdapter
 */
pbjsInstance.registerBidAdapter = function (bidderAdaptor, bidderCode) {
  logInfo('Invoking $$PREBID_GLOBAL$$.registerBidAdapter', arguments);
  try {
    adapterManager.registerBidAdapter(bidderAdaptor(), bidderCode);
  } catch (e) {
    logError('Error registering bidder adapter : ' + e.message);
  }
};

/**
 * Wrapper to register analyticsAdapter externally (adapterManager.registerAnalyticsAdapter())
 * @param  {Object} options [description]
 * @alias module:pbjs.registerAnalyticsAdapter
 */
pbjsInstance.registerAnalyticsAdapter = function (options) {
  logInfo('Invoking $$PREBID_GLOBAL$$.registerAnalyticsAdapter', arguments);
  try {
    adapterManager.registerAnalyticsAdapter(options);
  } catch (e) {
    logError('Error registering analytics adapter : ' + e.message);
  }
};

/**
 * Wrapper to bidfactory.createBid()
 * @param  {string} statusCode [description]
 * @alias module:pbjs.createBid
 * @return {Object} bidResponse [description]
 */
pbjsInstance.createBid = function (statusCode) {
  logInfo('Invoking $$PREBID_GLOBAL$$.createBid', arguments);
  return createBid(statusCode);
};

/**
 * Enable sending analytics data to the analytics provider of your
 * choice.
 *
 * For usage, see [Integrate with the Prebid Analytics
 * API](http://prebid.org/dev-docs/integrate-with-the-prebid-analytics-api.html).
 *
 * For a list of analytics adapters, see [Analytics for
 * Prebid](http://prebid.org/overview/analytics.html).
 * @param  {Object} config
 * @param {string} config.provider The name of the provider, e.g., `"ga"` for Google Analytics.
 * @param {Object} config.options The options for this particular analytics adapter.  This will likely vary between adapters.
 * @alias module:pbjs.enableAnalytics
 */

// Stores 'enableAnalytics' callbacks for later execution.
const enableAnalyticsCallbacks = [];

const enableAnalyticsCb = hook('async', function (config) {
  if (config && !isEmpty(config)) {
    logInfo('Invoking $$PREBID_GLOBAL$$.enableAnalytics for: ', config);
    adapterManager.enableAnalytics(config);
  } else {
    logError('$$PREBID_GLOBAL$$.enableAnalytics should be called with option {}');
  }
}, 'enableAnalyticsCb');

pbjsInstance.enableAnalytics = function (config) {
  enableAnalyticsCallbacks.push(enableAnalyticsCb.bind(this, config));
};

/**
 * @alias module:pbjs.aliasBidder
 */
pbjsInstance.aliasBidder = function (bidderCode, alias, options) {
  logInfo('Invoking $$PREBID_GLOBAL$$.aliasBidder', arguments);
  if (bidderCode && alias) {
    adapterManager.aliasBidAdapter(bidderCode, alias, options);
  } else {
    logError('bidderCode and alias must be passed as arguments', '$$PREBID_GLOBAL$$.aliasBidder');
  }
};

/**
 * @alias module:pbjs.aliasRegistry
 */
pbjsInstance.aliasRegistry = adapterManager.aliasRegistry;
config.getConfig('aliasRegistry', config => {
  if (config.aliasRegistry === 'private') delete pbjsInstance.aliasRegistry;
});

/**
 * The bid response object returned by an external bidder adapter during the auction.
 * @typedef {Object} AdapterBidResponse
 * @property {string} pbAg Auto granularity price bucket; CPM <= 5 ? increment = 0.05 : CPM > 5 && CPM <= 10 ? increment = 0.10 : CPM > 10 && CPM <= 20 ? increment = 0.50 : CPM > 20 ? priceCap = 20.00.  Example: `"0.80"`.
 * @property {string} pbCg Custom price bucket.  For example setup, see {@link setPriceGranularity}.  Example: `"0.84"`.
 * @property {string} pbDg Dense granularity price bucket; CPM <= 3 ? increment = 0.01 : CPM > 3 && CPM <= 8 ? increment = 0.05 : CPM > 8 && CPM <= 20 ? increment = 0.50 : CPM > 20? priceCap = 20.00.  Example: `"0.84"`.
 * @property {string} pbLg Low granularity price bucket; $0.50 increment, capped at $5, floored to two decimal places.  Example: `"0.50"`.
 * @property {string} pbMg Medium granularity price bucket; $0.10 increment, capped at $20, floored to two decimal places.  Example: `"0.80"`.
 * @property {string} pbHg High granularity price bucket; $0.01 increment, capped at $20, floored to two decimal places.  Example: `"0.84"`.
 *
 * @property {string} bidder The string name of the bidder.  This *may* be the same as the `bidderCode`.  For For a list of all bidders and their codes, see [Bidders' Params](http://prebid.org/dev-docs/bidders.html).
 * @property {string} bidderCode The unique string that identifies this bidder.  For a list of all bidders and their codes, see [Bidders' Params](http://prebid.org/dev-docs/bidders.html).
 *
 * @property {string} requestId The [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) representing the bid request.
 * @property {number} requestTimestamp The time at which the bid request was sent out, expressed in milliseconds.
 * @property {number} responseTimestamp The time at which the bid response was received, expressed in milliseconds.
 * @property {number} timeToRespond How long it took for the bidder to respond with this bid, expressed in milliseconds.
 *
 * @property {string} size The size of the ad creative, expressed in `"AxB"` format, where A and B are numbers of pixels.  Example: `"320x50"`.
 * @property {string} width The width of the ad creative in pixels.  Example: `"320"`.
 * @property {string} height The height of the ad creative in pixels.  Example: `"50"`.
 *
 * @property {string} ad The actual ad creative content, often HTML with CSS, JavaScript, and/or links to additional content.  Example: `"<div id='beacon_-YQbipJtdxmMCgEPHExLhmqzEm' style='position: absolute; left: 0px; top: 0px; visibility: hidden;'><img src='http://aplus-...'/></div><iframe src=\"http://aax-us-east.amazon-adsystem.com/e/is/8dcfcd..." width=\"728\" height=\"90\" frameborder=\"0\" ...></iframe>",`.
 * @property {number} ad_id The ad ID of the creative, as understood by the bidder's system.  Used by the line item's [creative in the ad server](http://prebid.org/adops/send-all-bids-adops.html#step-3-add-a-creative).
 * @property {string} adUnitCode The code used to uniquely identify the ad unit on the publisher's page.
 *
 * @property {string} statusMessage The status of the bid.  Allowed values: `"Bid available"` or `"Bid returned empty or error response"`.
 * @property {number} cpm The exact bid price from the bidder, expressed to the thousandths place.  Example: `"0.849"`.
 *
 * @property {Object} adserverTargeting An object whose values represent the ad server's targeting on the bid.
 * @property {string} adserverTargeting.hb_adid The ad ID of the creative, as understood by the ad server.
 * @property {string} adserverTargeting.hb_pb The price paid to show the creative, as logged in the ad server.
 * @property {string} adserverTargeting.hb_bidder The winning bidder whose ad creative will be served by the ad server.
 */

/**
 * Get all of the bids that have been rendered.  Useful for [troubleshooting your integration](http://prebid.org/dev-docs/prebid-troubleshooting-guide.html).
 * @return {Array<AdapterBidResponse>} A list of bids that have been rendered.
 */
pbjsInstance.getAllWinningBids = function () {
  return auctionManager.getAllWinningBids();
};

/**
 * Get all of the bids that have won their respective auctions.
 * @return {Array<AdapterBidResponse>} A list of bids that have won their respective auctions.
 */
pbjsInstance.getAllPrebidWinningBids = function () {
  return auctionManager.getBidsReceived()
    .filter(bid => bid.status === BID_STATUS.BID_TARGETING_SET);
};

/**
 * Get array of highest cpm bids for all adUnits, or highest cpm bid
 * object for the given adUnit
 * @param {string} adUnitCode - optional ad unit code
 * @alias module:pbjs.getHighestCpmBids
 * @return {Array} array containing highest cpm bid object(s)
 */
pbjsInstance.getHighestCpmBids = function (adUnitCode) {
  return targeting.getWinningBids(adUnitCode);
};

if (FEATURES.VIDEO) {
  /**
   * Mark the winning bid as used, should only be used in conjunction with video
   * @typedef {Object} MarkBidRequest
   * @property {string} adUnitCode The ad unit code
   * @property {string} adId The id representing the ad we want to mark
   *
   * @alias module:pbjs.markWinningBidAsUsed
   */
  pbjsInstance.markWinningBidAsUsed = function (markBidRequest) {
    const bids = fetchReceivedBids(markBidRequest, 'Improper use of markWinningBidAsUsed. It needs an adUnitCode or an adId to function.');

    if (bids.length > 0) {
      auctionManager.addWinningBid(bids[0]);
    }
  }
}

const fetchReceivedBids = (bidRequest, warningMessage) => {
  let bids = [];

  if (bidRequest.adUnitCode && bidRequest.adId) {
    bids = auctionManager.getBidsReceived()
      .filter(bid => bid.adId === bidRequest.adId && bid.adUnitCode === bidRequest.adUnitCode);
  } else if (bidRequest.adUnitCode) {
    bids = targeting.getWinningBids(bidRequest.adUnitCode);
  } else if (bidRequest.adId) {
    bids = auctionManager.getBidsReceived().filter(bid => bid.adId === bidRequest.adId);
  } else {
    logWarn(warningMessage);
  }

  return bids;
};

/**
 * Get Prebid config options
 * @param {Object} options
 * @alias module:pbjs.getConfig
 */
pbjsInstance.getConfig = config.getAnyConfig;
pbjsInstance.readConfig = config.readAnyConfig;
pbjsInstance.mergeConfig = config.mergeConfig;
pbjsInstance.mergeBidderConfig = config.mergeBidderConfig;

/**
 * Set Prebid config options.
 * See https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html
 *
 * @param {Object} options Global Prebid configuration object. Must be JSON - no JavaScript functions are allowed.
 */
pbjsInstance.setConfig = config.setConfig;
pbjsInstance.setBidderConfig = config.setBidderConfig;

pbjsInstance.que.push(() => listenMessagesFromCreative());

/**
 * This queue lets users load Prebid asynchronously, but run functions the same way regardless of whether it gets loaded
 * before or after their script executes. For example, given the code:
 *
 * <script src="url/to/Prebid.js" async></script>
 * <script>
 *   var pbjs = pbjs || {};
 *   pbjs.cmd = pbjs.cmd || [];
 *   pbjs.cmd.push(functionToExecuteOncePrebidLoads);
 * </script>
 *
 * If the page's script runs before prebid loads, then their function gets added to the queue, and executed
 * by prebid once it's done loading. If it runs after prebid loads, then this monkey-patch causes their
 * function to execute immediately.
 *
 * @memberof pbjs
 * @param  {function} command A function which takes no arguments. This is guaranteed to run exactly once, and only after
 *                            the Prebid script has been fully loaded.
 * @alias module:pbjs.cmd.push
 */
pbjsInstance.cmd.push = function (command) {
  if (typeof command === 'function') {
    try {
      command.call();
    } catch (e) {
      logError('Error processing command :', e.message, e.stack);
    }
  } else {
    logError('Commands written into $$PREBID_GLOBAL$$.cmd.push must be wrapped in a function');
  }
};

pbjsInstance.que.push = pbjsInstance.cmd.push;

function processQueue(queue) {
  queue.forEach(function (cmd) {
    if (typeof cmd.called === 'undefined') {
      try {
        cmd.call();
        cmd.called = true;
      } catch (e) {
        logError('Error processing command :', 'prebid.js', e);
      }
    }
  });
}

/**
 * @alias module:pbjs.processQueue
 */
pbjsInstance.processQueue = function () {
  hook.ready();
  processQueue(pbjsInstance.que);
  processQueue(pbjsInstance.cmd);
};

/**
 * @alias module:pbjs.triggerBilling
 */
pbjsInstance.triggerBilling = (winningBid) => {
  const bids = fetchReceivedBids(winningBid, 'Improper use of triggerBilling. It requires a bid with at least an adUnitCode or an adId to function.');
  const triggerBillingBid = bids.find(bid => bid.requestId === winningBid.requestId) || bids[0];

  if (bids.length > 0 && triggerBillingBid) {
    try {
      adapterManager.callBidBillableBidder(triggerBillingBid);
    } catch (e) {
      logError('Error when triggering billing :', e);
    }
  } else {
    logWarn('The bid provided to triggerBilling did not match any bids received.');
  }
};

export default pbjsInstance;
