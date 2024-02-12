"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.checkAdUnitSetup = exports.adUnitSetupChecks = void 0;
exports.executeCallbacks = executeCallbacks;
exports.startAuction = void 0;
var _prebidGlobal = require("./prebidGlobal.js");
var _utils = require("./utils.js");
var _secureCreatives = require("./secureCreatives.js");
var _userSync = require("./userSync.js");
var _config = require("./config.js");
var _auctionManager = require("./auctionManager.js");
var _targeting = require("./targeting.js");
var _hook = require("./hook.js");
var _debugging = require("./debugging.js");
var _polyfill = require("./polyfill.js");
var _adUnits = require("./adUnits.js");
var _bidfactory = require("./bidfactory.js");
var _storageManager = require("./storageManager.js");
var _adapterManager = _interopRequireWildcard(require("./adapterManager.js"));
var _constants = _interopRequireDefault(require("./constants.json"));
var events = _interopRequireWildcard(require("./events.js"));
var _perfMetrics = require("./utils/perfMetrics.js");
var _promise = require("./utils/promise.js");
var _enrichment = require("./fpd/enrichment.js");
var _consentHandler = require("./consentHandler.js");
var _direct = require("../libraries/creativeRender/direct.js");
var _reducers = require("./utils/reducers.js");
var _video = require("./video.js");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && Object.prototype.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/** @module pbjs */

const pbjsInstance = (0, _prebidGlobal.getGlobal)();
const {
  triggerUserSyncs
} = _userSync.userSync;

/* private variables */
const {
  ADD_AD_UNITS,
  REQUEST_BIDS,
  SET_TARGETING
} = _constants.default.EVENTS;
const eventValidators = {
  bidWon: checkDefinedPlacement
};

// initialize existing debugging sessions if present
(0, _debugging.loadSession)();

/* Public vars */
pbjsInstance.bidderSettings = pbjsInstance.bidderSettings || {};

// let the world know we are loaded
pbjsInstance.libLoaded = true;

// version auto generated from build
pbjsInstance.version = "v8.37.0-pre";
(0, _utils.logInfo)("Prebid.js v8.37.0-pre loaded");
pbjsInstance.installedModules = pbjsInstance.installedModules || [];

// create adUnit array
pbjsInstance.adUnits = pbjsInstance.adUnits || [];

// Allow publishers who enable user sync override to trigger their sync
pbjsInstance.triggerUserSyncs = triggerUserSyncs;
function checkDefinedPlacement(id) {
  var adUnitCodes = _auctionManager.auctionManager.getBidsRequested().map(bidSet => bidSet.bids.map(bid => bid.adUnitCode)).reduce(_utils.flatten).filter(_utils.uniques);
  if (!adUnitCodes.includes(id)) {
    (0, _utils.logError)('The "' + id + '" placement is not defined.');
    return;
  }
  return true;
}
function validateSizes(sizes, targLength) {
  let cleanSizes = [];
  if ((0, _utils.isArray)(sizes) && (targLength ? sizes.length === targLength : sizes.length > 0)) {
    // check if an array of arrays or array of numbers
    if (sizes.every(sz => (0, _utils.isArrayOfNums)(sz, 2))) {
      cleanSizes = sizes;
    } else if ((0, _utils.isArrayOfNums)(sizes, 2)) {
      cleanSizes.push(sizes);
    }
  }
  return cleanSizes;
}
function validateBannerMediaType(adUnit) {
  const validatedAdUnit = (0, _utils.deepClone)(adUnit);
  const banner = validatedAdUnit.mediaTypes.banner;
  const bannerSizes = validateSizes(banner.sizes);
  if (bannerSizes.length > 0) {
    banner.sizes = bannerSizes;
    // Deprecation Warning: This property will be deprecated in next release in favor of adUnit.mediaTypes.banner.sizes
    validatedAdUnit.sizes = bannerSizes;
  } else {
    (0, _utils.logError)('Detected a mediaTypes.banner object without a proper sizes field.  Please ensure the sizes are listed like: [[300, 250], ...].  Removing invalid mediaTypes.banner object from request.');
    delete validatedAdUnit.mediaTypes.banner;
  }
  return validatedAdUnit;
}
function validateVideoMediaType(adUnit) {
  const validatedAdUnit = (0, _utils.deepClone)(adUnit);
  const video = validatedAdUnit.mediaTypes.video;
  if (video.playerSize) {
    let tarPlayerSizeLen = typeof video.playerSize[0] === 'number' ? 2 : 1;
    const videoSizes = validateSizes(video.playerSize, tarPlayerSizeLen);
    if (videoSizes.length > 0) {
      if (tarPlayerSizeLen === 2) {
        (0, _utils.logInfo)('Transforming video.playerSize from [640,480] to [[640,480]] so it\'s in the proper format.');
      }
      video.playerSize = videoSizes;
      // Deprecation Warning: This property will be deprecated in next release in favor of adUnit.mediaTypes.video.playerSize
      validatedAdUnit.sizes = videoSizes;
    } else {
      (0, _utils.logError)('Detected incorrect configuration of mediaTypes.video.playerSize.  Please specify only one set of dimensions in a format like: [[640, 480]]. Removing invalid mediaTypes.video.playerSize property from request.');
      delete validatedAdUnit.mediaTypes.video.playerSize;
    }
  }
  return validatedAdUnit;
}
function validateNativeMediaType(adUnit) {
  const validatedAdUnit = (0, _utils.deepClone)(adUnit);
  const native = validatedAdUnit.mediaTypes.native;
  // if native assets are specified in OpenRTB format, remove legacy assets and print a warn.
  if (native.ortb) {
    const legacyNativeKeys = Object.keys(_constants.default.NATIVE_KEYS).filter(key => _constants.default.NATIVE_KEYS[key].includes('hb_native_'));
    const nativeKeys = Object.keys(native);
    const intersection = nativeKeys.filter(nativeKey => legacyNativeKeys.includes(nativeKey));
    if (intersection.length > 0) {
      (0, _utils.logError)("when using native OpenRTB format, you cannot use legacy native properties. Deleting ".concat(intersection, " keys from request."));
      intersection.forEach(legacyKey => delete validatedAdUnit.mediaTypes.native[legacyKey]);
    }
  }
  if (native.image && native.image.sizes && !Array.isArray(native.image.sizes)) {
    (0, _utils.logError)('Please use an array of sizes for native.image.sizes field.  Removing invalid mediaTypes.native.image.sizes property from request.');
    delete validatedAdUnit.mediaTypes.native.image.sizes;
  }
  if (native.image && native.image.aspect_ratios && !Array.isArray(native.image.aspect_ratios)) {
    (0, _utils.logError)('Please use an array of sizes for native.image.aspect_ratios field.  Removing invalid mediaTypes.native.image.aspect_ratios property from request.');
    delete validatedAdUnit.mediaTypes.native.image.aspect_ratios;
  }
  if (native.icon && native.icon.sizes && !Array.isArray(native.icon.sizes)) {
    (0, _utils.logError)('Please use an array of sizes for native.icon.sizes field.  Removing invalid mediaTypes.native.icon.sizes property from request.');
    delete validatedAdUnit.mediaTypes.native.icon.sizes;
  }
  return validatedAdUnit;
}
function validateAdUnitPos(adUnit, mediaType) {
  let pos = (0, _utils.deepAccess)(adUnit, "mediaTypes.".concat(mediaType, ".pos"));
  if (!(0, _utils.isNumber)(pos) || isNaN(pos) || !isFinite(pos)) {
    let warning = "Value of property 'pos' on ad unit ".concat(adUnit.code, " should be of type: Number");
    (0, _utils.logWarn)(warning);
    events.emit(_constants.default.EVENTS.AUCTION_DEBUG, {
      type: 'WARNING',
      arguments: warning
    });
    delete adUnit.mediaTypes[mediaType].pos;
  }
  return adUnit;
}
function validateAdUnit(adUnit) {
  const msg = msg => "adUnit.code '".concat(adUnit.code, "' ").concat(msg);
  const mediaTypes = adUnit.mediaTypes;
  const bids = adUnit.bids;
  if (bids != null && !(0, _utils.isArray)(bids)) {
    (0, _utils.logError)(msg("defines 'adUnit.bids' that is not an array. Removing adUnit from auction"));
    return null;
  }
  if (bids == null && adUnit.ortb2Imp == null) {
    (0, _utils.logError)(msg("has no 'adUnit.bids' and no 'adUnit.ortb2Imp'. Removing adUnit from auction"));
    return null;
  }
  if (!mediaTypes || Object.keys(mediaTypes).length === 0) {
    (0, _utils.logError)(msg("does not define a 'mediaTypes' object.  This is a required field for the auction, so this adUnit has been removed."));
    return null;
  }
  if (adUnit.ortb2Imp != null && (bids == null || bids.length === 0)) {
    adUnit.bids = [{
      bidder: null
    }]; // the 'null' bidder is treated as an s2s-only placeholder by adapterManager
    (0, _utils.logMessage)(msg("defines 'adUnit.ortb2Imp' with no 'adUnit.bids'; it will be seen only by S2S adapters"));
  }
  return adUnit;
}
const adUnitSetupChecks = exports.adUnitSetupChecks = {
  validateAdUnit,
  validateBannerMediaType,
  validateSizes
};
if (true) {
  Object.assign(adUnitSetupChecks, {
    validateNativeMediaType
  });
}
if (true) {
  Object.assign(adUnitSetupChecks, {
    validateVideoMediaType
  });
}
const checkAdUnitSetup = exports.checkAdUnitSetup = (0, _hook.hook)('sync', function (adUnits) {
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
    if (true && mediaTypes.video) {
      validatedVideo = validatedBanner ? validateVideoMediaType(validatedBanner) : validateVideoMediaType(adUnit);
      if (mediaTypes.video.hasOwnProperty('pos')) validatedVideo = validateAdUnitPos(validatedVideo, 'video');
    }
    if (true && mediaTypes.native) {
      validatedNative = validatedVideo ? validateNativeMediaType(validatedVideo) : validatedBanner ? validateNativeMediaType(validatedBanner) : validateNativeMediaType(adUnit);
    }
    const validatedAdUnit = Object.assign({}, validatedBanner, validatedVideo, validatedNative);
    validatedAdUnits.push(validatedAdUnit);
  });
  return validatedAdUnits;
}, 'checkAdUnitSetup');
function fillAdUnitDefaults(adUnits) {
  if (true) {
    adUnits.forEach(au => (0, _video.fillVideoDefaults)(au));
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
  (0, _utils.logInfo)("Invoking pbjs.getAdserverTargetingForAdUnitCodeStr", arguments);

  // call to retrieve bids array
  if (adunitCode) {
    var res = pbjsInstance.getAdserverTargetingForAdUnitCode(adunitCode);
    return (0, _utils.transformAdServerTargetingObj)(res);
  } else {
    (0, _utils.logMessage)('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode');
  }
};

/**
 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
 * @param adUnitCode {string} adUnitCode to get the bid responses for
 * @alias module:pbjs.getHighestUnusedBidResponseForAdUnitCode
 * @returns {Object}  returnObj return bid
 */
pbjsInstance.getHighestUnusedBidResponseForAdUnitCode = function (adunitCode) {
  if (adunitCode) {
    const bid = _auctionManager.auctionManager.getAllBidsForAdUnitCode(adunitCode).filter(_targeting.isBidUsable);
    return bid.length ? bid.reduce(_reducers.getHighestCpm) : {};
  } else {
    (0, _utils.logMessage)('Need to call getHighestUnusedBidResponseForAdUnitCode with adunitCode');
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
  (0, _utils.logInfo)("Invoking pbjs.getAdserverTargeting", arguments);
  return _targeting.targeting.getAllTargeting(adUnitCode);
};
pbjsInstance.getConsentMetadata = function () {
  (0, _utils.logInfo)("Invoking pbjs.getConsentMetadata");
  return _consentHandler.allConsent.getConsentMeta();
};
function getBids(type) {
  const responses = _auctionManager.auctionManager[type]().filter(bid => _auctionManager.auctionManager.getAdUnitCodes().includes(bid.adUnitCode));

  // find the last auction id to get responses for most recent auction only
  const currentAuctionId = _auctionManager.auctionManager.getLastAuctionId();
  return responses.map(bid => bid.adUnitCode).filter(_utils.uniques).map(adUnitCode => responses.filter(bid => bid.auctionId === currentAuctionId && bid.adUnitCode === adUnitCode)).filter(bids => bids && bids[0] && bids[0].adUnitCode).map(bids => {
    return {
      [bids[0].adUnitCode]: {
        bids
      }
    };
  }).reduce((a, b) => Object.assign(a, b), {});
}

/**
 * This function returns the bids requests involved in an auction but not bid on
 * @alias module:pbjs.getNoBids
 * @return {Object}            map | object that contains the bidRequests
 */

pbjsInstance.getNoBids = function () {
  (0, _utils.logInfo)("Invoking pbjs.getNoBids", arguments);
  return getBids('getNoBids');
};

/**
 * This function returns the bids requests involved in an auction but not bid on or the specified adUnitCode
 * @param  {string} adUnitCode adUnitCode
 * @alias module:pbjs.getNoBidsForAdUnitCode
 * @return {Object}           bidResponse object
 */

pbjsInstance.getNoBidsForAdUnitCode = function (adUnitCode) {
  const bids = _auctionManager.auctionManager.getNoBids().filter(bid => bid.adUnitCode === adUnitCode);
  return {
    bids
  };
};

/**
 * This function returns the bid responses at the given moment.
 * @alias module:pbjs.getBidResponses
 * @return {Object}            map | object that contains the bidResponses
 */

pbjsInstance.getBidResponses = function () {
  (0, _utils.logInfo)("Invoking pbjs.getBidResponses", arguments);
  return getBids('getBidsReceived');
};

/**
 * Returns bidResponses for the specified adUnitCode
 * @param  {string} adUnitCode adUnitCode
 * @alias module:pbjs.getBidResponsesForAdUnitCode
 * @return {Object}            bidResponse object
 */

pbjsInstance.getBidResponsesForAdUnitCode = function (adUnitCode) {
  const bids = _auctionManager.auctionManager.getBidsReceived().filter(bid => bid.adUnitCode === adUnitCode);
  return {
    bids
  };
};

/**
 * Set query string targeting on one or more GPT ad units.
 * @param {(string|string[])} adUnit a single `adUnit.code` or multiple.
 * @param {function(object)} customSlotMatching gets a GoogleTag slot and returns a filter function for adUnitCode, so you can decide to match on either eg. return slot => { return adUnitCode => { return slot.getSlotElementId() === 'myFavoriteDivId'; } };
 * @alias module:pbjs.setTargetingForGPTAsync
 */
pbjsInstance.setTargetingForGPTAsync = function (adUnit, customSlotMatching) {
  (0, _utils.logInfo)("Invoking pbjs.setTargetingForGPTAsync", arguments);
  if (!(0, _utils.isGptPubadsDefined)()) {
    (0, _utils.logError)('window.googletag is not defined on the page');
    return;
  }

  // get our ad unit codes
  let targetingSet = _targeting.targeting.getAllTargeting(adUnit);

  // first reset any old targeting
  _targeting.targeting.resetPresetTargeting(adUnit, customSlotMatching);

  // now set new targeting keys
  _targeting.targeting.setTargetingForGPT(targetingSet, customSlotMatching);
  Object.keys(targetingSet).forEach(adUnitCode => {
    Object.keys(targetingSet[adUnitCode]).forEach(targetingKey => {
      if (targetingKey === 'hb_adid') {
        _auctionManager.auctionManager.setStatusForBids(targetingSet[adUnitCode][targetingKey], _constants.default.BID_STATUS.BID_TARGETING_SET);
      }
    });
  });

  // emit event
  events.emit(SET_TARGETING, targetingSet);
};

/**
 * Set query string targeting on all AST (AppNexus Seller Tag) ad units. Note that this function has to be called after all ad units on page are defined. For working example code, see [Using Prebid.js with AppNexus Publisher Ad Server](http://prebid.org/dev-docs/examples/use-prebid-with-appnexus-ad-server.html).
 * @param  {(string|string[])} adUnitCode adUnitCode or array of adUnitCodes
 * @alias module:pbjs.setTargetingForAst
 */
pbjsInstance.setTargetingForAst = function (adUnitCodes) {
  (0, _utils.logInfo)("Invoking pbjs.setTargetingForAn", arguments);
  if (!_targeting.targeting.isApntagDefined()) {
    (0, _utils.logError)('window.apntag is not defined on the page');
    return;
  }
  _targeting.targeting.setTargetingForAst(adUnitCodes);

  // emit event
  events.emit(SET_TARGETING, _targeting.targeting.getAllTargeting());
};

/**
 * This function will render the ad (based on params) in the given iframe document passed through.
 * Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchronously
 * @param  {Document} doc document
 * @param  {string} id bid id to locate the ad
 * @alias module:pbjs.renderAd
 */
pbjsInstance.renderAd = (0, _hook.hook)('async', function (doc, id, options) {
  (0, _utils.logInfo)("Invoking pbjs.renderAd", arguments);
  (0, _utils.logMessage)('Calling renderAd with adId :' + id);
  (0, _direct.renderAdDirect)(doc, id, options);
});

/**
 * Remove adUnit from the $$PREBID_GLOBAL$$ configuration, if there are no addUnitCode(s) it will remove all
 * @param  {string| Array} adUnitCode the adUnitCode(s) to remove
 * @alias module:pbjs.removeAdUnit
 */
pbjsInstance.removeAdUnit = function (adUnitCode) {
  (0, _utils.logInfo)("Invoking pbjs.removeAdUnit", arguments);
  if (!adUnitCode) {
    pbjsInstance.adUnits = [];
    return;
  }
  let adUnitCodes;
  if ((0, _utils.isArray)(adUnitCode)) {
    adUnitCodes = adUnitCode;
  } else {
    adUnitCodes = [adUnitCode];
  }
  adUnitCodes.forEach(adUnitCode => {
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
pbjsInstance.requestBids = function () {
  const delegate = (0, _hook.hook)('async', function () {
    let {
      bidsBackHandler,
      timeout,
      adUnits,
      adUnitCodes,
      labels,
      auctionId,
      ttlBuffer,
      ortb2,
      metrics,
      defer
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    events.emit(REQUEST_BIDS);
    const cbTimeout = timeout || _config.config.getConfig('bidderTimeout');
    (0, _utils.logInfo)("Invoking pbjs.requestBids", arguments);
    if (adUnitCodes && adUnitCodes.length) {
      // if specific adUnitCodes supplied filter adUnits for those codes
      adUnits = adUnits.filter(unit => (0, _polyfill.includes)(adUnitCodes, unit.code));
    } else {
      // otherwise derive adUnitCodes from adUnits
      adUnitCodes = adUnits && adUnits.map(unit => unit.code);
    }
    const ortb2Fragments = {
      global: (0, _utils.mergeDeep)({}, _config.config.getAnyConfig('ortb2') || {}, ortb2 || {}),
      bidder: Object.fromEntries(Object.entries(_config.config.getBidderConfig()).map(_ref => {
        let [bidder, cfg] = _ref;
        return [bidder, cfg.ortb2];
      }).filter(_ref2 => {
        let [_, ortb2] = _ref2;
        return ortb2 != null;
      }))
    };
    return (0, _enrichment.enrichFPD)(_promise.GreedyPromise.resolve(ortb2Fragments.global)).then(global => {
      ortb2Fragments.global = global;
      return startAuction({
        bidsBackHandler,
        timeout: cbTimeout,
        adUnits,
        adUnitCodes,
        labels,
        auctionId,
        ttlBuffer,
        ortb2Fragments,
        metrics,
        defer
      });
    });
  }, 'requestBids');
  return (0, _hook.wrapHook)(delegate, function requestBids() {
    let req = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    // unlike the main body of `delegate`, this runs before any other hook has a chance to;
    // it's also not restricted in its return value in the way `async` hooks are.

    // if the request does not specify adUnits, clone the global adUnit array;
    // otherwise, if the caller goes on to use addAdUnits/removeAdUnits, any asynchronous logic
    // in any hook might see their effects.
    let adUnits = req.adUnits || pbjsInstance.adUnits;
    req.adUnits = (0, _utils.isArray)(adUnits) ? adUnits.slice() : [adUnits];
    req.metrics = (0, _perfMetrics.newMetrics)();
    req.metrics.checkpoint('requestBids');
    req.defer = (0, _promise.defer)({
      promiseFactory: r => new Promise(r)
    });
    delegate.call(this, req);
    return req.defer.promise;
  });
}();
const startAuction = exports.startAuction = (0, _hook.hook)('async', function () {
  let {
    bidsBackHandler,
    timeout: cbTimeout,
    adUnits,
    ttlBuffer,
    adUnitCodes,
    labels,
    auctionId,
    ortb2Fragments,
    metrics,
    defer
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  const s2sBidders = (0, _adapterManager.getS2SBidderSet)(_config.config.getConfig('s2sConfig') || []);
  fillAdUnitDefaults(adUnits);
  adUnits = (0, _perfMetrics.useMetrics)(metrics).measureTime('requestBids.validate', () => checkAdUnitSetup(adUnits));
  function auctionDone(bids, timedOut, auctionId) {
    if (typeof bidsBackHandler === 'function') {
      try {
        bidsBackHandler(bids, timedOut, auctionId);
      } catch (e) {
        (0, _utils.logError)('Error executing bidsBackHandler', null, e);
      }
    }
    defer.resolve({
      bids,
      timedOut,
      auctionId
    });
  }
  const tids = {};

  /*
   * for a given adunit which supports a set of mediaTypes
   * and a given bidder which supports a set of mediaTypes
   * a bidder is eligible to participate on the adunit
   * if it supports at least one of the mediaTypes on the adunit
   */
  adUnits.forEach(adUnit => {
    var _adUnit$ortb2Imp;
    // get the adunit's mediaTypes, defaulting to banner if mediaTypes isn't present
    const adUnitMediaTypes = Object.keys(adUnit.mediaTypes || {
      'banner': 'banner'
    });

    // get the bidder's mediaTypes
    const allBidders = adUnit.bids.map(bid => bid.bidder);
    const bidderRegistry = _adapterManager.default.bidderRegistry;
    const bidders = allBidders.filter(bidder => !s2sBidders.has(bidder));
    adUnit.adUnitId = (0, _utils.generateUUID)();
    const tid = (_adUnit$ortb2Imp = adUnit.ortb2Imp) === null || _adUnit$ortb2Imp === void 0 || (_adUnit$ortb2Imp = _adUnit$ortb2Imp.ext) === null || _adUnit$ortb2Imp === void 0 ? void 0 : _adUnit$ortb2Imp.tid;
    if (tid) {
      if (tids.hasOwnProperty(adUnit.code)) {
        (0, _utils.logWarn)("Multiple distinct ortb2Imp.ext.tid were provided for twin ad units '".concat(adUnit.code, "'"));
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
      const bidderMediaTypes = spec && spec.supportedMediaTypes || ['banner'];

      // check if the bidder's mediaTypes are not in the adUnit's mediaTypes
      const bidderEligible = adUnitMediaTypes.some(type => (0, _polyfill.includes)(bidderMediaTypes, type));
      if (!bidderEligible) {
        // drop the bidder from the ad unit if it's not compatible
        (0, _utils.logWarn)((0, _utils.unsupportedBidderMessage)(adUnit, bidder));
        adUnit.bids = adUnit.bids.filter(bid => bid.bidder !== bidder);
      } else {
        _adUnits.adunitCounter.incrementBidderRequestsCounter(adUnit.code, bidder);
      }
    });
    _adUnits.adunitCounter.incrementRequestsCounter(adUnit.code);
  });
  if (!adUnits || adUnits.length === 0) {
    (0, _utils.logMessage)('No adUnits configured. No bids requested.');
    auctionDone();
  } else {
    adUnits.forEach(au => {
      var _au$ortb2Imp;
      const tid = ((_au$ortb2Imp = au.ortb2Imp) === null || _au$ortb2Imp === void 0 || (_au$ortb2Imp = _au$ortb2Imp.ext) === null || _au$ortb2Imp === void 0 ? void 0 : _au$ortb2Imp.tid) || tids[au.code] || (0, _utils.generateUUID)();
      if (!tids.hasOwnProperty(au.code)) {
        tids[au.code] = tid;
      }
      au.transactionId = tid;
      (0, _utils.deepSetValue)(au, 'ortb2Imp.ext.tid', tid);
    });
    const auction = _auctionManager.auctionManager.createAuction({
      adUnits,
      adUnitCodes,
      callback: auctionDone,
      cbTimeout,
      labels,
      auctionId,
      ortb2Fragments,
      metrics
    });
    let adUnitsLen = adUnits.length;
    if (adUnitsLen > 15) {
      (0, _utils.logInfo)("Current auction ".concat(auction.getAuctionId(), " contains ").concat(adUnitsLen, " adUnits."), adUnits);
    }
    adUnitCodes.forEach(code => _targeting.targeting.setLatestAuctionForAdUnit(code, auction.getAuctionId()));
    auction.callBids();
  }
}, 'startAuction');
function executeCallbacks(fn, reqBidsConfigObj) {
  runAll(_storageManager.storageCallbacks);
  runAll(enableAnalyticsCallbacks);
  fn.call(this, reqBidsConfigObj);
  function runAll(queue) {
    var queued;
    while (queued = queue.shift()) {
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
  (0, _utils.logInfo)("Invoking pbjs.addAdUnits", arguments);
  pbjsInstance.adUnits.push.apply(pbjsInstance.adUnits, (0, _utils.isArray)(adUnitArr) ? adUnitArr : [adUnitArr]);
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
  (0, _utils.logInfo)("Invoking pbjs.onEvent", arguments);
  if (!(0, _utils.isFn)(handler)) {
    (0, _utils.logError)('The event handler provided is not a function and was not set on event "' + event + '".');
    return;
  }
  if (id && !eventValidators[event].call(null, id)) {
    (0, _utils.logError)('The id provided is not valid for event "' + event + '" and no handler was set.');
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
  (0, _utils.logInfo)("Invoking pbjs.offEvent", arguments);
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
  (0, _utils.logInfo)("Invoking pbjs.getEvents");
  return events.getEvents();
};

/*
 * Wrapper to register bidderAdapter externally (adapterManager.registerBidAdapter())
 * @param  {Function} bidderAdaptor [description]
 * @param  {string} bidderCode [description]
 * @alias module:pbjs.registerBidAdapter
 */
pbjsInstance.registerBidAdapter = function (bidderAdaptor, bidderCode) {
  (0, _utils.logInfo)("Invoking pbjs.registerBidAdapter", arguments);
  try {
    _adapterManager.default.registerBidAdapter(bidderAdaptor(), bidderCode);
  } catch (e) {
    (0, _utils.logError)('Error registering bidder adapter : ' + e.message);
  }
};

/**
 * Wrapper to register analyticsAdapter externally (adapterManager.registerAnalyticsAdapter())
 * @param  {Object} options [description]
 * @alias module:pbjs.registerAnalyticsAdapter
 */
pbjsInstance.registerAnalyticsAdapter = function (options) {
  (0, _utils.logInfo)("Invoking pbjs.registerAnalyticsAdapter", arguments);
  try {
    _adapterManager.default.registerAnalyticsAdapter(options);
  } catch (e) {
    (0, _utils.logError)('Error registering analytics adapter : ' + e.message);
  }
};

/**
 * Wrapper to bidfactory.createBid()
 * @param  {string} statusCode [description]
 * @alias module:pbjs.createBid
 * @return {Object} bidResponse [description]
 */
pbjsInstance.createBid = function (statusCode) {
  (0, _utils.logInfo)("Invoking pbjs.createBid", arguments);
  return (0, _bidfactory.createBid)(statusCode);
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
const enableAnalyticsCb = (0, _hook.hook)('async', function (config) {
  if (config && !(0, _utils.isEmpty)(config)) {
    (0, _utils.logInfo)("Invoking pbjs.enableAnalytics for: ", config);
    _adapterManager.default.enableAnalytics(config);
  } else {
    (0, _utils.logError)("pbjs.enableAnalytics should be called with option {}");
  }
}, 'enableAnalyticsCb');
pbjsInstance.enableAnalytics = function (config) {
  enableAnalyticsCallbacks.push(enableAnalyticsCb.bind(this, config));
};

/**
 * @alias module:pbjs.aliasBidder
 */
pbjsInstance.aliasBidder = function (bidderCode, alias, options) {
  (0, _utils.logInfo)("Invoking pbjs.aliasBidder", arguments);
  if (bidderCode && alias) {
    _adapterManager.default.aliasBidAdapter(bidderCode, alias, options);
  } else {
    (0, _utils.logError)('bidderCode and alias must be passed as arguments', "pbjs.aliasBidder");
  }
};

/**
 * @alias module:pbjs.aliasRegistry
 */
pbjsInstance.aliasRegistry = _adapterManager.default.aliasRegistry;
_config.config.getConfig('aliasRegistry', config => {
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
  return _auctionManager.auctionManager.getAllWinningBids();
};

/**
 * Get all of the bids that have won their respective auctions.
 * @return {Array<AdapterBidResponse>} A list of bids that have won their respective auctions.
 */
pbjsInstance.getAllPrebidWinningBids = function () {
  return _auctionManager.auctionManager.getBidsReceived().filter(bid => bid.status === _constants.default.BID_STATUS.BID_TARGETING_SET);
};

/**
 * Get array of highest cpm bids for all adUnits, or highest cpm bid
 * object for the given adUnit
 * @param {string} adUnitCode - optional ad unit code
 * @alias module:pbjs.getHighestCpmBids
 * @return {Array} array containing highest cpm bid object(s)
 */
pbjsInstance.getHighestCpmBids = function (adUnitCode) {
  return _targeting.targeting.getWinningBids(adUnitCode);
};
if (true) {
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
      _auctionManager.auctionManager.addWinningBid(bids[0]);
    }
  };
}
const fetchReceivedBids = (bidRequest, warningMessage) => {
  let bids = [];
  if (bidRequest.adUnitCode && bidRequest.adId) {
    bids = _auctionManager.auctionManager.getBidsReceived().filter(bid => bid.adId === bidRequest.adId && bid.adUnitCode === bidRequest.adUnitCode);
  } else if (bidRequest.adUnitCode) {
    bids = _targeting.targeting.getWinningBids(bidRequest.adUnitCode);
  } else if (bidRequest.adId) {
    bids = _auctionManager.auctionManager.getBidsReceived().filter(bid => bid.adId === bidRequest.adId);
  } else {
    (0, _utils.logWarn)(warningMessage);
  }
  return bids;
};

/**
 * Get Prebid config options
 * @param {Object} options
 * @alias module:pbjs.getConfig
 */
pbjsInstance.getConfig = _config.config.getAnyConfig;
pbjsInstance.readConfig = _config.config.readAnyConfig;
pbjsInstance.mergeConfig = _config.config.mergeConfig;
pbjsInstance.mergeBidderConfig = _config.config.mergeBidderConfig;

/**
 * Set Prebid config options.
 * See https://docs.prebid.org/dev-docs/publisher-api-reference/setConfig.html
 *
 * @param {Object} options Global Prebid configuration object. Must be JSON - no JavaScript functions are allowed.
 */
pbjsInstance.setConfig = _config.config.setConfig;
pbjsInstance.setBidderConfig = _config.config.setBidderConfig;
pbjsInstance.que.push(() => (0, _secureCreatives.listenMessagesFromCreative)());

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
      (0, _utils.logError)('Error processing command :', e.message, e.stack);
    }
  } else {
    (0, _utils.logError)("Commands written into pbjs.cmd.push must be wrapped in a function");
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
        (0, _utils.logError)('Error processing command :', 'prebid.js', e);
      }
    }
  });
}

/**
 * @alias module:pbjs.processQueue
 */
pbjsInstance.processQueue = function () {
  _hook.hook.ready();
  processQueue(pbjsInstance.que);
  processQueue(pbjsInstance.cmd);
};

/**
 * @alias module:pbjs.triggerBilling
 */
pbjsInstance.triggerBilling = winningBid => {
  const bids = fetchReceivedBids(winningBid, 'Improper use of triggerBilling. It requires a bid with at least an adUnitCode or an adId to function.');
  const triggerBillingBid = bids.find(bid => bid.requestId === winningBid.requestId) || bids[0];
  if (bids.length > 0 && triggerBillingBid) {
    try {
      _adapterManager.default.callBidBillableBidder(triggerBillingBid);
    } catch (e) {
      (0, _utils.logError)('Error when triggering billing :', e);
    }
  } else {
    (0, _utils.logWarn)('The bid provided to triggerBilling did not match any bids received.');
  }
};
var _default = exports.default = pbjsInstance;