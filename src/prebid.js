/** @module pbjs */

import { getGlobal } from './prebidGlobal.js';
import { flatten, uniques, isGptPubadsDefined, adUnitsFilter, isArrayOfNums } from './utils.js';
import { listenMessagesFromCreative } from './secureCreatives.js';
import { userSync } from './userSync.js';
import { config } from './config.js';
import { auctionManager } from './auctionManager.js';
import { targeting } from './targeting.js';
import { hook } from './hook.js';
import { sessionLoader } from './debugging.js';
import includes from 'core-js-pure/features/array/includes.js';
import { adunitCounter } from './adUnits.js';
import { isRendererRequired, executeRenderer } from './Renderer.js';
import { createBid } from './bidfactory.js';
import { storageCallbacks } from './storageManager.js';

const $$PREBID_GLOBAL$$ = getGlobal();
const CONSTANTS = require('./constants.json');
const utils = require('./utils.js');
const adapterManager = require('./adapterManager.js').default;
const events = require('./events.js');
const { triggerUserSyncs } = userSync;

/* private variables */
const { ADD_AD_UNITS, BID_WON, REQUEST_BIDS, SET_TARGETING, AD_RENDER_FAILED } = CONSTANTS.EVENTS;
const { PREVENT_WRITING_ON_MAIN_DOCUMENT, NO_AD, EXCEPTION, CANNOT_FIND_AD, MISSING_DOC_OR_ADID } = CONSTANTS.AD_RENDER_FAILED_REASON;

const eventValidators = {
  bidWon: checkDefinedPlacement
};

// initialize existing debugging sessions if present
sessionLoader();

/* Public vars */
$$PREBID_GLOBAL$$.bidderSettings = $$PREBID_GLOBAL$$.bidderSettings || {};

// let the world know we are loaded
$$PREBID_GLOBAL$$.libLoaded = true;

// version auto generated from build
$$PREBID_GLOBAL$$.version = 'v$prebid.version$';
utils.logInfo('Prebid.js v$prebid.version$ loaded');

// create adUnit array
$$PREBID_GLOBAL$$.adUnits = $$PREBID_GLOBAL$$.adUnits || [];

// Allow publishers who enable user sync override to trigger their sync
$$PREBID_GLOBAL$$.triggerUserSyncs = triggerUserSyncs;

function checkDefinedPlacement(id) {
  var adUnitCodes = auctionManager.getBidsRequested().map(bidSet => bidSet.bids.map(bid => bid.adUnitCode))
    .reduce(flatten)
    .filter(uniques);

  if (!utils.contains(adUnitCodes, id)) {
    utils.logError('The "' + id + '" placement is not defined.');
    return;
  }

  return true;
}

function setRenderSize(doc, width, height) {
  if (doc.defaultView && doc.defaultView.frameElement) {
    doc.defaultView.frameElement.width = width;
    doc.defaultView.frameElement.height = height;
  }
}

function validateSizes(sizes, targLength) {
  let cleanSizes = [];
  if (utils.isArray(sizes) && ((targLength) ? sizes.length === targLength : sizes.length > 0)) {
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
  const banner = adUnit.mediaTypes.banner;
  const bannerSizes = validateSizes(banner.sizes);
  if (bannerSizes.length > 0) {
    banner.sizes = bannerSizes;
    // Deprecation Warning: This property will be deprecated in next release in favor of adUnit.mediaTypes.banner.sizes
    adUnit.sizes = bannerSizes;
  } else {
    utils.logError('Detected a mediaTypes.banner object without a proper sizes field.  Please ensure the sizes are listed like: [[300, 250], ...].  Removing invalid mediaTypes.banner object from request.');
    delete adUnit.mediaTypes.banner
  }
}

function validateVideoMediaType(adUnit) {
  const video = adUnit.mediaTypes.video;
  let tarPlayerSizeLen = (typeof video.playerSize[0] === 'number') ? 2 : 1;

  const videoSizes = validateSizes(video.playerSize, tarPlayerSizeLen);
  if (videoSizes.length > 0) {
    if (tarPlayerSizeLen === 2) {
      utils.logInfo('Transforming video.playerSize from [640,480] to [[640,480]] so it\'s in the proper format.');
    }
    video.playerSize = videoSizes;
    // Deprecation Warning: This property will be deprecated in next release in favor of adUnit.mediaTypes.video.playerSize
    adUnit.sizes = videoSizes;
  } else {
    utils.logError('Detected incorrect configuration of mediaTypes.video.playerSize.  Please specify only one set of dimensions in a format like: [[640, 480]]. Removing invalid mediaTypes.video.playerSize property from request.');
    delete adUnit.mediaTypes.video.playerSize;
  }
}

function validateNativeMediaType(adUnit) {
  const native = adUnit.mediaTypes.native;
  if (native.image && native.image.sizes && !Array.isArray(native.image.sizes)) {
    utils.logError('Please use an array of sizes for native.image.sizes field.  Removing invalid mediaTypes.native.image.sizes property from request.');
    delete adUnit.mediaTypes.native.image.sizes;
  }
  if (native.image && native.image.aspect_ratios && !Array.isArray(native.image.aspect_ratios)) {
    utils.logError('Please use an array of sizes for native.image.aspect_ratios field.  Removing invalid mediaTypes.native.image.aspect_ratios property from request.');
    delete adUnit.mediaTypes.native.image.aspect_ratios;
  }
  if (native.icon && native.icon.sizes && !Array.isArray(native.icon.sizes)) {
    utils.logError('Please use an array of sizes for native.icon.sizes field.  Removing invalid mediaTypes.native.icon.sizes property from request.');
    delete adUnit.mediaTypes.native.icon.sizes;
  }
}

export const adUnitSetupChecks = {
  validateBannerMediaType,
  validateVideoMediaType,
  validateNativeMediaType,
  validateSizes
};

export const checkAdUnitSetup = hook('sync', function (adUnits) {
  return adUnits.filter(adUnit => {
    const mediaTypes = adUnit.mediaTypes;
    if (!mediaTypes || Object.keys(mediaTypes).length === 0) {
      utils.logError(`Detected adUnit.code '${adUnit.code}' did not have a 'mediaTypes' object defined.  This is a required field for the auction, so this adUnit has been removed.`);
      return false;
    }

    if (mediaTypes.banner) {
      validateBannerMediaType(adUnit);
    }

    if (mediaTypes.video) {
      const video = mediaTypes.video;
      if (video.playerSize) {
        validateVideoMediaType(adUnit);
      }
    }

    if (mediaTypes.native) {
      validateNativeMediaType(adUnit);
    }
    return true;
  });
}, 'checkAdUnitSetup');

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
$$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCodeStr = function (adunitCode) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCodeStr', arguments);

  // call to retrieve bids array
  if (adunitCode) {
    var res = $$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCode(adunitCode);
    return utils.transformAdServerTargetingObj(res);
  } else {
    utils.logMessage('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode');
  }
};

/**
 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
 * @param adUnitCode {string} adUnitCode to get the bid responses for
 * @alias module:pbjs.getAdserverTargetingForAdUnitCode
 * @returns {Object}  returnObj return bids
 */
$$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCode = function(adUnitCode) {
  return $$PREBID_GLOBAL$$.getAdserverTargeting(adUnitCode)[adUnitCode];
};

/**
 * returns all ad server targeting for all ad units
 * @return {Object} Map of adUnitCodes and targeting values []
 * @alias module:pbjs.getAdserverTargeting
 */

$$PREBID_GLOBAL$$.getAdserverTargeting = function (adUnitCode) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.getAdserverTargeting', arguments);
  return targeting.getAllTargeting(adUnitCode);
};

function getBids(type) {
  const responses = auctionManager[type]()
    .filter(utils.bind.call(adUnitsFilter, this, auctionManager.getAdUnitCodes()));

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

$$PREBID_GLOBAL$$.getNoBids = function () {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.getNoBids', arguments);
  return getBids('getNoBids');
};

/**
 * This function returns the bid responses at the given moment.
 * @alias module:pbjs.getBidResponses
 * @return {Object}            map | object that contains the bidResponses
 */

$$PREBID_GLOBAL$$.getBidResponses = function () {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.getBidResponses', arguments);
  return getBids('getBidsReceived');
};

/**
 * Returns bidResponses for the specified adUnitCode
 * @param  {string} adUnitCode adUnitCode
 * @alias module:pbjs.getBidResponsesForAdUnitCode
 * @return {Object}            bidResponse object
 */

$$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode = function (adUnitCode) {
  const bids = auctionManager.getBidsReceived().filter(bid => bid.adUnitCode === adUnitCode);
  return { bids };
};

/**
 * Set query string targeting on one or more GPT ad units.
 * @param {(string|string[])} adUnit a single `adUnit.code` or multiple.
 * @param {function(object)} customSlotMatching gets a GoogleTag slot and returns a filter function for adUnitCode, so you can decide to match on either eg. return slot => { return adUnitCode => { return slot.getSlotElementId() === 'myFavoriteDivId'; } };
 * @alias module:pbjs.setTargetingForGPTAsync
 */
$$PREBID_GLOBAL$$.setTargetingForGPTAsync = function (adUnit, customSlotMatching) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.setTargetingForGPTAsync', arguments);
  if (!isGptPubadsDefined()) {
    utils.logError('window.googletag is not defined on the page');
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
        auctionManager.setStatusForBids(targetingSet[adUnitCode][targetingKey], CONSTANTS.BID_STATUS.BID_TARGETING_SET);
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
$$PREBID_GLOBAL$$.setTargetingForAst = function(adUnitCodes) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.setTargetingForAn', arguments);
  if (!targeting.isApntagDefined()) {
    utils.logError('window.apntag is not defined on the page');
    return;
  }

  targeting.setTargetingForAst(adUnitCodes);

  // emit event
  events.emit(SET_TARGETING, targeting.getAllTargeting());
};

function emitAdRenderFail({ reason, message, bid, id }) {
  const data = { reason, message };
  if (bid) data.bid = bid;
  if (id) data.adId = id;

  utils.logError(message);
  events.emit(AD_RENDER_FAILED, data);
}

/**
 * This function will render the ad (based on params) in the given iframe document passed through.
 * Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchronously
 * @param  {HTMLDocument} doc document
 * @param  {string} id bid id to locate the ad
 * @alias module:pbjs.renderAd
 */
$$PREBID_GLOBAL$$.renderAd = function (doc, id) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.renderAd', arguments);
  utils.logMessage('Calling renderAd with adId :' + id);

  if (doc && id) {
    try {
      // lookup ad by ad Id
      const bid = auctionManager.findBidByAdId(id);
      if (bid) {
        // replace macros according to openRTB with price paid = bid.cpm
        bid.ad = utils.replaceAuctionPrice(bid.ad, bid.cpm);
        bid.adUrl = utils.replaceAuctionPrice(bid.adUrl, bid.cpm);
        // save winning bids
        auctionManager.addWinningBid(bid);

        // emit 'bid won' event here
        events.emit(BID_WON, bid);

        const { height, width, ad, mediaType, adUrl, renderer } = bid;

        const creativeComment = document.createComment(`Creative ${bid.creativeId} served by ${bid.bidder} Prebid.js Header Bidding`);
        utils.insertElement(creativeComment, doc, 'body');

        if (isRendererRequired(renderer)) {
          executeRenderer(renderer, bid);
        } else if ((doc === document && !utils.inIframe()) || mediaType === 'video') {
          const message = `Error trying to write ad. Ad render call ad id ${id} was prevented from writing to the main document.`;
          emitAdRenderFail({ reason: PREVENT_WRITING_ON_MAIN_DOCUMENT, message, bid, id });
        } else if (ad) {
          // will check if browser is firefox and below version 67, if so execute special doc.open()
          // for details see: https://github.com/prebid/Prebid.js/pull/3524
          // TODO remove this browser specific code at later date (when Firefox < 67 usage is mostly gone)
          if (navigator.userAgent && navigator.userAgent.toLowerCase().indexOf('firefox/') > -1) {
            const firefoxVerRegx = /firefox\/([\d\.]+)/;
            let firefoxVer = navigator.userAgent.toLowerCase().match(firefoxVerRegx)[1]; // grabs the text in the 1st matching group
            if (firefoxVer && parseInt(firefoxVer, 10) < 67) {
              doc.open('text/html', 'replace');
            }
          }
          doc.write(ad);
          doc.close();
          setRenderSize(doc, width, height);
          utils.callBurl(bid);
        } else if (adUrl) {
          const iframe = utils.createInvisibleIframe();
          iframe.height = height;
          iframe.width = width;
          iframe.style.display = 'inline';
          iframe.style.overflow = 'hidden';
          iframe.src = adUrl;

          utils.insertElement(iframe, doc, 'body');
          setRenderSize(doc, width, height);
          utils.callBurl(bid);
        } else {
          const message = `Error trying to write ad. No ad for bid response id: ${id}`;
          emitAdRenderFail({ reason: NO_AD, message, bid, id });
        }
      } else {
        const message = `Error trying to write ad. Cannot find ad by given id : ${id}`;
        emitAdRenderFail({ reason: CANNOT_FIND_AD, message, id });
      }
    } catch (e) {
      const message = `Error trying to write ad Id :${id} to the page:${e.message}`;
      emitAdRenderFail({ reason: EXCEPTION, message, id });
    }
  } else {
    const message = `Error trying to write ad Id :${id} to the page. Missing document or adId`;
    emitAdRenderFail({ reason: MISSING_DOC_OR_ADID, message, id });
  }
};

/**
 * Remove adUnit from the $$PREBID_GLOBAL$$ configuration, if there are no addUnitCode(s) it will remove all
 * @param  {string| Array} adUnitCode the adUnitCode(s) to remove
 * @alias module:pbjs.removeAdUnit
 */
$$PREBID_GLOBAL$$.removeAdUnit = function (adUnitCode) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.removeAdUnit', arguments);

  if (!adUnitCode) {
    $$PREBID_GLOBAL$$.adUnits = [];
    return;
  }

  let adUnitCodes;

  if (utils.isArray(adUnitCode)) {
    adUnitCodes = adUnitCode;
  } else {
    adUnitCodes = [adUnitCode];
  }

  adUnitCodes.forEach((adUnitCode) => {
    for (let i = $$PREBID_GLOBAL$$.adUnits.length - 1; i >= 0; i--) {
      if ($$PREBID_GLOBAL$$.adUnits[i].code === adUnitCode) {
        $$PREBID_GLOBAL$$.adUnits.splice(i, 1);
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
$$PREBID_GLOBAL$$.requestBids = hook('async', function ({ bidsBackHandler, timeout, adUnits, adUnitCodes, labels, auctionId } = {}) {
  events.emit(REQUEST_BIDS);
  const cbTimeout = timeout || config.getConfig('bidderTimeout');
  adUnits = adUnits || $$PREBID_GLOBAL$$.adUnits;

  utils.logInfo('Invoking $$PREBID_GLOBAL$$.requestBids', arguments);

  if (adUnitCodes && adUnitCodes.length) {
    // if specific adUnitCodes supplied filter adUnits for those codes
    adUnits = adUnits.filter(unit => includes(adUnitCodes, unit.code));
  } else {
    // otherwise derive adUnitCodes from adUnits
    adUnitCodes = adUnits && adUnits.map(unit => unit.code);
  }

  adUnits = checkAdUnitSetup(adUnits);

  /*
   * for a given adunit which supports a set of mediaTypes
   * and a given bidder which supports a set of mediaTypes
   * a bidder is eligible to participate on the adunit
   * if it supports at least one of the mediaTypes on the adunit
   */
  adUnits.forEach(adUnit => {
    // get the adunit's mediaTypes, defaulting to banner if mediaTypes isn't present
    const adUnitMediaTypes = Object.keys(adUnit.mediaTypes || {'banner': 'banner'});

    // get the bidder's mediaTypes
    const allBidders = adUnit.bids.map(bid => bid.bidder);
    const bidderRegistry = adapterManager.bidderRegistry;

    const s2sConfig = config.getConfig('s2sConfig');
    const s2sBidders = s2sConfig && s2sConfig.bidders;
    const bidders = (s2sBidders) ? allBidders.filter(bidder => {
      return !includes(s2sBidders, bidder);
    }) : allBidders;

    adUnit.transactionId = utils.generateUUID();

    bidders.forEach(bidder => {
      const adapter = bidderRegistry[bidder];
      const spec = adapter && adapter.getSpec && adapter.getSpec();
      // banner is default if not specified in spec
      const bidderMediaTypes = (spec && spec.supportedMediaTypes) || ['banner'];

      // check if the bidder's mediaTypes are not in the adUnit's mediaTypes
      const bidderEligible = adUnitMediaTypes.some(type => includes(bidderMediaTypes, type));
      if (!bidderEligible) {
        // drop the bidder from the ad unit if it's not compatible
        utils.logWarn(utils.unsupportedBidderMessage(adUnit, bidder));
        adUnit.bids = adUnit.bids.filter(bid => bid.bidder !== bidder);
      } else {
        adunitCounter.incrementBidderRequestsCounter(adUnit.code, bidder);
      }
    });
    adunitCounter.incrementRequestsCounter(adUnit.code);
  });

  if (!adUnits || adUnits.length === 0) {
    utils.logMessage('No adUnits configured. No bids requested.');
    if (typeof bidsBackHandler === 'function') {
      // executeCallback, this will only be called in case of first request
      try {
        bidsBackHandler();
      } catch (e) {
        utils.logError('Error executing bidsBackHandler', null, e);
      }
    }
    return;
  }

  const auction = auctionManager.createAuction({adUnits, adUnitCodes, callback: bidsBackHandler, cbTimeout, labels, auctionId});

  let adUnitsLen = adUnits.length;
  if (adUnitsLen > 15) {
    utils.logInfo(`Current auction ${auction.getAuctionId()} contains ${adUnitsLen} adUnits.`, adUnits);
  }

  adUnitCodes.forEach(code => targeting.setLatestAuctionForAdUnit(code, auction.getAuctionId()));
  auction.callBids();
});

export function executeStorageCallbacks(fn, reqBidsConfigObj) {
  runAll(storageCallbacks);
  fn.call(this, reqBidsConfigObj);
  function runAll(queue) {
    var queued;
    while ((queued = queue.shift())) {
      queued();
    }
  }
}

// This hook will execute all storage callbacks which were registered before gdpr enforcement hook was added. Some bidders, user id modules use storage functions when module is parsed but gdpr enforcement hook is not added at that stage as setConfig callbacks are yet to be called. Hence for such calls we execute all the stored callbacks just before requestBids. At this hook point we will know for sure that gdprEnforcement module is added or not
$$PREBID_GLOBAL$$.requestBids.before(executeStorageCallbacks, 49);

/**
 *
 * Add adunit(s)
 * @param {Array|Object} adUnitArr Array of adUnits or single adUnit Object.
 * @alias module:pbjs.addAdUnits
 */
$$PREBID_GLOBAL$$.addAdUnits = function (adUnitArr) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.addAdUnits', arguments);
  if (utils.isArray(adUnitArr)) {
    $$PREBID_GLOBAL$$.adUnits.push.apply($$PREBID_GLOBAL$$.adUnits, adUnitArr);
  } else if (typeof adUnitArr === 'object') {
    $$PREBID_GLOBAL$$.adUnits.push(adUnitArr);
  }
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
$$PREBID_GLOBAL$$.onEvent = function (event, handler, id) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.onEvent', arguments);
  if (!utils.isFn(handler)) {
    utils.logError('The event handler provided is not a function and was not set on event "' + event + '".');
    return;
  }

  if (id && !eventValidators[event].call(null, id)) {
    utils.logError('The id provided is not valid for event "' + event + '" and no handler was set.');
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
$$PREBID_GLOBAL$$.offEvent = function (event, handler, id) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.offEvent', arguments);
  if (id && !eventValidators[event].call(null, id)) {
    return;
  }

  events.off(event, handler, id);
};

/*
 * Wrapper to register bidderAdapter externally (adapterManager.registerBidAdapter())
 * @param  {Function} bidderAdaptor [description]
 * @param  {string} bidderCode [description]
 * @alias module:pbjs.registerBidAdapter
 */
$$PREBID_GLOBAL$$.registerBidAdapter = function (bidderAdaptor, bidderCode) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.registerBidAdapter', arguments);
  try {
    adapterManager.registerBidAdapter(bidderAdaptor(), bidderCode);
  } catch (e) {
    utils.logError('Error registering bidder adapter : ' + e.message);
  }
};

/**
 * Wrapper to register analyticsAdapter externally (adapterManager.registerAnalyticsAdapter())
 * @param  {Object} options [description]
 * @alias module:pbjs.registerAnalyticsAdapter
 */
$$PREBID_GLOBAL$$.registerAnalyticsAdapter = function (options) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.registerAnalyticsAdapter', arguments);
  try {
    adapterManager.registerAnalyticsAdapter(options);
  } catch (e) {
    utils.logError('Error registering analytics adapter : ' + e.message);
  }
};

/**
 * Wrapper to bidfactory.createBid()
 * @param  {string} statusCode [description]
 * @alias module:pbjs.createBid
 * @return {Object} bidResponse [description]
 */
$$PREBID_GLOBAL$$.createBid = function (statusCode) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.createBid', arguments);
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
$$PREBID_GLOBAL$$.enableAnalytics = function (config) {
  if (config && !utils.isEmpty(config)) {
    utils.logInfo('Invoking $$PREBID_GLOBAL$$.enableAnalytics for: ', config);
    adapterManager.enableAnalytics(config);
  } else {
    utils.logError('$$PREBID_GLOBAL$$.enableAnalytics should be called with option {}');
  }
};

/**
 * @alias module:pbjs.aliasBidder
 */
$$PREBID_GLOBAL$$.aliasBidder = function (bidderCode, alias) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.aliasBidder', arguments);
  if (bidderCode && alias) {
    adapterManager.aliasBidAdapter(bidderCode, alias);
  } else {
    utils.logError('bidderCode and alias must be passed as arguments', '$$PREBID_GLOBAL$$.aliasBidder');
  }
};

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
$$PREBID_GLOBAL$$.getAllWinningBids = function () {
  return auctionManager.getAllWinningBids();
};

/**
 * Get all of the bids that have won their respective auctions.
 * @return {Array<AdapterBidResponse>} A list of bids that have won their respective auctions.
 */
$$PREBID_GLOBAL$$.getAllPrebidWinningBids = function () {
  return auctionManager.getBidsReceived()
    .filter(bid => bid.status === CONSTANTS.BID_STATUS.BID_TARGETING_SET);
};

/**
 * Get array of highest cpm bids for all adUnits, or highest cpm bid
 * object for the given adUnit
 * @param {string} adUnitCode - optional ad unit code
 * @alias module:pbjs.getHighestCpmBids
 * @return {Array} array containing highest cpm bid object(s)
 */
$$PREBID_GLOBAL$$.getHighestCpmBids = function (adUnitCode) {
  return targeting.getWinningBids(adUnitCode);
};

/**
 * Mark the winning bid as used, should only be used in conjunction with video
 * @typedef {Object} MarkBidRequest
 * @property {string} adUnitCode The ad unit code
 * @property {string} adId The id representing the ad we want to mark
 *
 * @alias module:pbjs.markWinningBidAsUsed
*/
$$PREBID_GLOBAL$$.markWinningBidAsUsed = function (markBidRequest) {
  let bids = [];

  if (markBidRequest.adUnitCode && markBidRequest.adId) {
    bids = auctionManager.getBidsReceived()
      .filter(bid => bid.adId === markBidRequest.adId && bid.adUnitCode === markBidRequest.adUnitCode);
  } else if (markBidRequest.adUnitCode) {
    bids = targeting.getWinningBids(markBidRequest.adUnitCode);
  } else if (markBidRequest.adId) {
    bids = auctionManager.getBidsReceived().filter(bid => bid.adId === markBidRequest.adId);
  } else {
    utils.logWarn('Inproper usage of markWinningBidAsUsed. It\'ll need an adUnitCode and/or adId to function.');
  }

  if (bids.length > 0) {
    bids[0].status = CONSTANTS.BID_STATUS.RENDERED;
  }
};

/**
 * Get Prebid config options
 * @param {Object} options
 * @alias module:pbjs.getConfig
 */
$$PREBID_GLOBAL$$.getConfig = config.getConfig;

/**
 * Set Prebid config options.
 * (Added in version 0.27.0).
 *
 * `setConfig` is designed to allow for advanced configuration while
 * reducing the surface area of the public API.  For more information
 * about the move to `setConfig` (and the resulting deprecations of
 * some other public methods), see [the Prebid 1.0 public API
 * proposal](https://gist.github.com/mkendall07/51ee5f6b9f2df01a89162cf6de7fe5b6).
 *
 * #### Troubleshooting your configuration
 *
 * If you call `pbjs.setConfig` without an object, e.g.,
 *
 * `pbjs.setConfig('debug', 'true'))`
 *
 * then Prebid.js will print an error to the console that says:
 *
 * ```
 * ERROR: setConfig options must be an object
 * ```
 *
 * If you don't see that message, you can assume the config object is valid.
 *
 * @param {Object} options Global Prebid configuration object. Must be JSON - no JavaScript functions are allowed.
 * @param {string} options.bidderSequence The order in which bidders are called.  Example: `pbjs.setConfig({ bidderSequence: "fixed" })`.  Allowed values: `"fixed"` (order defined in `adUnit.bids` array on page), `"random"`.
 * @param {boolean} options.debug Turn debug logging on/off. Example: `pbjs.setConfig({ debug: true })`.
 * @param {string} options.priceGranularity The bid price granularity to use.  Example: `pbjs.setConfig({ priceGranularity: "medium" })`. Allowed values: `"low"` ($0.50), `"medium"` ($0.10), `"high"` ($0.01), `"auto"` (sliding scale), `"dense"` (like `"auto"`, with smaller increments at lower CPMs), or a custom price bucket object, e.g., `{ "buckets" : [{"min" : 0,"max" : 20,"increment" : 0.1,"cap" : true}]}`.
 * @param {boolean} options.enableSendAllBids Turn "send all bids" mode on/off.  Example: `pbjs.setConfig({ enableSendAllBids: true })`.
 * @param {number} options.bidderTimeout Set a global bidder timeout, in milliseconds.  Example: `pbjs.setConfig({ bidderTimeout: 3000 })`.  Note that it's still possible for a bid to get into the auction that responds after this timeout. This is due to how [`setTimeout`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout) works in JS: it queues the callback in the event loop in an approximate location that should execute after this time but it is not guaranteed.  For more information about the asynchronous event loop and `setTimeout`, see [How JavaScript Timers Work](https://johnresig.com/blog/how-javascript-timers-work/).
 * @param {string} options.publisherDomain The publisher's domain where Prebid is running, for cross-domain iFrame communication.  Example: `pbjs.setConfig({ publisherDomain: "https://www.theverge.com" })`.
 * @param {Object} options.s2sConfig The configuration object for [server-to-server header bidding](http://prebid.org/dev-docs/get-started-with-prebid-server.html).  Example:
 * @alias module:pbjs.setConfig
 * ```
 * pbjs.setConfig({
 *     s2sConfig: {
 *         accountId: '1',
 *         enabled: true,
 *         bidders: ['appnexus', 'pubmatic'],
 *         timeout: 1000,
 *         adapter: 'prebidServer',
 *         endpoint: 'https://prebid.adnxs.com/pbs/v1/auction'
 *     }
 * })
 * ```
 */
$$PREBID_GLOBAL$$.setConfig = config.setConfig;
$$PREBID_GLOBAL$$.setBidderConfig = config.setBidderConfig;

$$PREBID_GLOBAL$$.que.push(() => listenMessagesFromCreative());

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
$$PREBID_GLOBAL$$.cmd.push = function(command) {
  if (typeof command === 'function') {
    try {
      command.call();
    } catch (e) {
      utils.logError('Error processing command :', e.message, e.stack);
    }
  } else {
    utils.logError('Commands written into $$PREBID_GLOBAL$$.cmd.push must be wrapped in a function');
  }
};

$$PREBID_GLOBAL$$.que.push = $$PREBID_GLOBAL$$.cmd.push;

function processQueue(queue) {
  queue.forEach(function(cmd) {
    if (typeof cmd.called === 'undefined') {
      try {
        cmd.call();
        cmd.called = true;
      } catch (e) {
        utils.logError('Error processing command :', 'prebid.js', e);
      }
    }
  });
}

/**
 * @alias module:pbjs.processQueue
 */
$$PREBID_GLOBAL$$.processQueue = function() {
  hook.ready();
  processQueue($$PREBID_GLOBAL$$.que);
  processQueue($$PREBID_GLOBAL$$.cmd);
};

export default $$PREBID_GLOBAL$$;
