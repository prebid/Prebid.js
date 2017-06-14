/** @module $$PREBID_GLOBAL$$ */

import { getGlobal } from './prebidGlobal';
import { flatten, uniques, isGptPubadsDefined, adUnitsFilter } from './utils';
import { videoAdUnit, hasNonVideoBidder } from './video';
import { nativeAdUnit, nativeBidder, hasNonNativeBidder } from './native';
import 'polyfill';
import { parse as parseURL, format as formatURL } from './url';
import { isValidePriceConfig } from './cpmBucketManager';
import { listenMessagesFromCreative } from './secureCreatives';
import { syncCookies } from 'src/cookie.js';
import { loadScript } from './adloader';
import { setAjaxTimeout } from './ajax';


var $$PREBID_GLOBAL$$ = getGlobal();
var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');
var bidmanager = require('./bidmanager.js');
var adaptermanager = require('./adaptermanager');
var bidfactory = require('./bidfactory');
var events = require('./events');
var adserver = require('./adserver.js');
var targeting = require('./targeting.js');

/* private variables */

var objectType_function = 'function';
var objectType_undefined = 'undefined';
var objectType_object = 'object';
var BID_WON = CONSTANTS.EVENTS.BID_WON;
var SET_TARGETING = CONSTANTS.EVENTS.SET_TARGETING;

var auctionRunning = false;
var bidRequestQueue = [];

var eventValidators = {
  bidWon: checkDefinedPlacement
};

/* Public vars */

$$PREBID_GLOBAL$$._bidsRequested = [];
$$PREBID_GLOBAL$$._bidsReceived = [];
// _adUnitCodes stores the current filter to use for adUnits as an array of adUnitCodes
$$PREBID_GLOBAL$$._adUnitCodes = [];
$$PREBID_GLOBAL$$._winningBids = [];
$$PREBID_GLOBAL$$._adsReceived = [];
$$PREBID_GLOBAL$$._sendAllBids = false;

$$PREBID_GLOBAL$$.bidderSettings = $$PREBID_GLOBAL$$.bidderSettings || {};

// default timeout for all bids
$$PREBID_GLOBAL$$.bidderTimeout = $$PREBID_GLOBAL$$.bidderTimeout || 3000;

// current timeout set in `requestBids` or to default `bidderTimeout`
$$PREBID_GLOBAL$$.cbTimeout = $$PREBID_GLOBAL$$.cbTimeout || 200;

// timeout buffer to adjust for bidder CDN latency
$$PREBID_GLOBAL$$.timeoutBuffer = 200;

$$PREBID_GLOBAL$$.logging = $$PREBID_GLOBAL$$.logging || false;

// domain where prebid is running for cross domain iframe communication
$$PREBID_GLOBAL$$.publisherDomain = $$PREBID_GLOBAL$$.publisherDomain || window.location.origin;

// let the world know we are loaded
$$PREBID_GLOBAL$$.libLoaded = true;

// version auto generated from build
$$PREBID_GLOBAL$$.version = 'v$prebid.version$';
utils.logInfo('Prebid.js v$prebid.version$ loaded');

// create adUnit array
$$PREBID_GLOBAL$$.adUnits = $$PREBID_GLOBAL$$.adUnits || [];

// delay to request cookie sync to stay out of critical path
$$PREBID_GLOBAL$$.cookieSyncDelay = $$PREBID_GLOBAL$$.cookieSyncDelay || 100;


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
 * @param  {function} cmd A function which takes no arguments. This is guaranteed to run exactly once, and only after
 *                        the Prebid script has been fully loaded.
 * @alias module:$$PREBID_GLOBAL$$.cmd.push
 */
$$PREBID_GLOBAL$$.cmd.push = function(cmd) {
  if (typeof cmd === objectType_function) {
    try {
      cmd.call();
    } catch (e) {
      utils.logError('Error processing command :' + e.message);
    }
  } else {
    utils.logError('Commands written into $$PREBID_GLOBAL$$.cmd.push must be wrapped in a function');
  }
};

$$PREBID_GLOBAL$$.que.push = $$PREBID_GLOBAL$$.cmd.push;

function processQueue(queue) {
  queue.forEach(function(cmd) {
    if (typeof cmd.called === objectType_undefined) {
      try {
        cmd.call();
        cmd.called = true;
      }
      catch (e) {
        utils.logError('Error processing command :', 'prebid.js', e);
      }
    }
  });
}

function checkDefinedPlacement(id) {
  var placementCodes = $$PREBID_GLOBAL$$._bidsRequested.map(bidSet => bidSet.bids.map(bid => bid.placementCode))
    .reduce(flatten)
    .filter(uniques);

  if (!utils.contains(placementCodes, id)) {
    utils.logError('The "' + id + '" placement is not defined.');
    return;
  }

  return true;
}

/**
 * When a request for bids is made any stale bids remaining will be cleared for
 * a placement included in the outgoing bid request.
 */
function clearPlacements() {
  $$PREBID_GLOBAL$$._bidsRequested = [];

  // leave bids received for ad slots not in this bid request
  $$PREBID_GLOBAL$$._bidsReceived = $$PREBID_GLOBAL$$._bidsReceived
    .filter(bid => !$$PREBID_GLOBAL$$._adUnitCodes.includes(bid.adUnitCode));
}

function setRenderSize(doc, width, height) {
  if (doc.defaultView && doc.defaultView.frameElement) {
    doc.defaultView.frameElement.width = width;
    doc.defaultView.frameElement.height = height;
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
 * @alias module:$$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCodeStr
 * @return {array}  returnObj return bids array
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
 * @returns {object}  returnObj return bids
 */
$$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCode = function(adUnitCode) {
  return $$PREBID_GLOBAL$$.getAdserverTargeting(adUnitCode)[adUnitCode];
};

/**
 * returns all ad server targeting for all ad units
 * @return {object} Map of adUnitCodes and targeting values []
 * @alias module:$$PREBID_GLOBAL$$.getAdserverTargeting
 */

$$PREBID_GLOBAL$$.getAdserverTargeting = function (adUnitCode) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.getAdserverTargeting', arguments);
  return targeting.getAllTargeting(adUnitCode)
    .map(targeting => {
      return {
        [Object.keys(targeting)[0]]: targeting[Object.keys(targeting)[0]]
          .map(target => {
            return {
              [Object.keys(target)[0]]: target[Object.keys(target)[0]].join(', ')
            };
          }).reduce((p, c) => Object.assign(c, p), {})
      };
    })
    .reduce(function (accumulator, targeting) {
      var key = Object.keys(targeting)[0];
      accumulator[key] = Object.assign({}, accumulator[key], targeting[key]);
      return accumulator;
    }, {});
};

/**
 * This function returns the bid responses at the given moment.
 * @alias module:$$PREBID_GLOBAL$$.getBidResponses
 * @return {object}            map | object that contains the bidResponses
 */

$$PREBID_GLOBAL$$.getBidResponses = function () {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.getBidResponses', arguments);
  const responses = $$PREBID_GLOBAL$$._bidsReceived
    .filter(adUnitsFilter.bind(this, $$PREBID_GLOBAL$$._adUnitCodes));

  // find the last requested id to get responses for most recent auction only
  const currentRequestId = responses && responses.length && responses[responses.length - 1].requestId;

  return responses.map(bid => bid.adUnitCode)
    .filter(uniques).map(adUnitCode => responses
      .filter(bid => bid.requestId === currentRequestId && bid.adUnitCode === adUnitCode))
    .filter(bids => bids && bids[0] && bids[0].adUnitCode)
    .map(bids => {
      return {
        [bids[0].adUnitCode]: { bids: bids }
      };
    })
    .reduce((a, b) => Object.assign(a, b), {});
};

/**
 * Returns bidResponses for the specified adUnitCode
 * @param  {String} adUnitCode adUnitCode
 * @alias module:$$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode
 * @return {Object}            bidResponse object
 */

$$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode = function (adUnitCode) {
  const bids = $$PREBID_GLOBAL$$._bidsReceived.filter(bid => bid.adUnitCode === adUnitCode);
  return {
    bids: bids
  };
};

/**
 * Set query string targeting on one or more GPT ad units.
 * @param {(string|string[])} adUnit a single `adUnit.code` or multiple.
 * @alias module:$$PREBID_GLOBAL$$.setTargetingForGPTAsync
 */
$$PREBID_GLOBAL$$.setTargetingForGPTAsync = function (adUnit) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.setTargetingForGPTAsync', arguments);
  if (!isGptPubadsDefined()) {
    utils.logError('window.googletag is not defined on the page');
    return;
  }

  // get our ad unit codes
  var targetingSet = targeting.getAllTargeting(adUnit);

  // first reset any old targeting
  targeting.resetPresetTargeting(adUnit);

  // now set new targeting keys
  targeting.setTargeting(targetingSet);


  // emit event
  events.emit(SET_TARGETING);
};

$$PREBID_GLOBAL$$.setTargetingForAst = function() {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.setTargetingForAn', arguments);
  if (!targeting.isApntagDefined()) {
    utils.logError('window.apntag is not defined on the page');
    return;
  }

  targeting.setTargetingForAst();

  // emit event
  events.emit(SET_TARGETING);
};

/**
 * Returns a bool if all the bids have returned or timed out
 * @alias module:$$PREBID_GLOBAL$$.allBidsAvailable
 * @return {bool} all bids available
 */
$$PREBID_GLOBAL$$.allBidsAvailable = function () {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.allBidsAvailable', arguments);
  return bidmanager.bidsBackAll();
};

/**
 * This function will render the ad (based on params) in the given iframe document passed through.
 * Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchronously
 * @param  {HTMLDocument} doc document
 * @param  {string} id bid id to locate the ad
 * @alias module:$$PREBID_GLOBAL$$.renderAd
 */
$$PREBID_GLOBAL$$.renderAd = function (doc, id) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.renderAd', arguments);
  utils.logMessage('Calling renderAd with adId :' + id);
  if (doc && id) {
    try {
      // lookup ad by ad Id
      const bid = $$PREBID_GLOBAL$$._bidsReceived.find(bid => bid.adId === id);
      if (bid) {
        // replace macros according to openRTB with price paid = bid.cpm
        bid.ad = utils.replaceAuctionPrice(bid.ad, bid.cpm);
        bid.url = utils.replaceAuctionPrice(bid.url, bid.cpm);
        // save winning bids
        $$PREBID_GLOBAL$$._winningBids.push(bid);

        // emit 'bid won' event here
        events.emit(BID_WON, bid);

        const { height, width, ad, mediaType, adUrl: url, renderer } = bid;

        if (renderer && renderer.url) {
          renderer.render(bid);
        } else if ((doc === document && !utils.inIframe()) || mediaType === 'video') {
          utils.logError(`Error trying to write ad. Ad render call ad id ${id} was prevented from writing to the main document.`);
        } else if (ad) {
          doc.write(ad);
          doc.close();
          setRenderSize(doc, width, height);
        } else if (url) {
          const iframe = utils.createInvisibleIframe();
          iframe.height = height;
          iframe.width = width;
          iframe.style.display = 'inline';
          iframe.style.overflow = 'hidden';
          iframe.src = url;

          utils.insertElement(iframe, doc, 'body');
          setRenderSize(doc, width, height);
        } else {
          utils.logError('Error trying to write ad. No ad for bid response id: ' + id);
        }
      } else {
        utils.logError('Error trying to write ad. Cannot find ad by given id : ' + id);
      }
    } catch (e) {
      utils.logError('Error trying to write ad Id :' + id + ' to the page:' + e.message);
    }
  } else {
    utils.logError('Error trying to write ad Id :' + id + ' to the page. Missing document or adId');
  }
};

/**
 * Remove adUnit from the $$PREBID_GLOBAL$$ configuration
 * @param  {String} adUnitCode the adUnitCode to remove
 * @alias module:$$PREBID_GLOBAL$$.removeAdUnit
 */
$$PREBID_GLOBAL$$.removeAdUnit = function (adUnitCode) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.removeAdUnit', arguments);
  if (adUnitCode) {
    for (var i = 0; i < $$PREBID_GLOBAL$$.adUnits.length; i++) {
      if ($$PREBID_GLOBAL$$.adUnits[i].code === adUnitCode) {
        $$PREBID_GLOBAL$$.adUnits.splice(i, 1);
      }
    }
  }
};

$$PREBID_GLOBAL$$.clearAuction = function() {
  auctionRunning = false;
  syncCookies($$PREBID_GLOBAL$$.cookieSyncDelay);
  utils.logMessage('Prebid auction cleared');
  if (bidRequestQueue.length) {
    bidRequestQueue.shift()();
  }
};

/**
 *
 * @param bidsBackHandler
 * @param timeout
 * @param adUnits
 * @param adUnitCodes
 */
$$PREBID_GLOBAL$$.requestBids = function ({ bidsBackHandler, timeout, adUnits, adUnitCodes } = {}) {
  events.emit('requestBids');
  const cbTimeout = $$PREBID_GLOBAL$$.cbTimeout = timeout || $$PREBID_GLOBAL$$.bidderTimeout;
  adUnits = adUnits || $$PREBID_GLOBAL$$.adUnits;

  utils.logInfo('Invoking $$PREBID_GLOBAL$$.requestBids', arguments);

  if (adUnitCodes && adUnitCodes.length) {
    // if specific adUnitCodes supplied filter adUnits for those codes
    adUnits = adUnits.filter(unit => adUnitCodes.includes(unit.code));
  } else {
    // otherwise derive adUnitCodes from adUnits
    adUnitCodes = adUnits && adUnits.map(unit => unit.code);
  }

  // for video-enabled adUnits, only request bids if all bidders support video
  const invalidVideoAdUnits = adUnits.filter(videoAdUnit).filter(hasNonVideoBidder);
  invalidVideoAdUnits.forEach(adUnit => {
    utils.logError(`adUnit ${adUnit.code} has 'mediaType' set to 'video' but contains a bidder that doesn't support video. No Prebid demand requests will be triggered for this adUnit.`);
    for (let i = 0; i < adUnits.length; i++) {
      if (adUnits[i].code === adUnit.code) { adUnits.splice(i, 1); }
    }
  });

  // for native-enabled adUnits, only request bids for bidders that support native
  adUnits.filter(nativeAdUnit).filter(hasNonNativeBidder).forEach(adUnit => {
    const nonNativeBidders = adUnit.bids
      .filter(bid => !nativeBidder(bid))
      .map(bid => bid.bidder)
      .join(', ');

    utils.logError(`adUnit ${adUnit.code} has 'mediaType' set to 'native' but contains non-native bidder(s) ${nonNativeBidders}. No Prebid demand requests will be triggered for those bidders.`);
    adUnit.bids = adUnit.bids.filter(nativeBidder);
  });

  if (auctionRunning) {
    bidRequestQueue.push(() => {
      $$PREBID_GLOBAL$$.requestBids({ bidsBackHandler, timeout: cbTimeout, adUnits, adUnitCodes });
    });
    return;
  }

  auctionRunning = true;

  // we will use adUnitCodes for filtering the current auction
  $$PREBID_GLOBAL$$._adUnitCodes = adUnitCodes;

  bidmanager.externalCallbackReset();
  clearPlacements();

  if (!adUnits || adUnits.length === 0) {
    utils.logMessage('No adUnits configured. No bids requested.');
    if (typeof bidsBackHandler === objectType_function) {
      bidmanager.addOneTimeCallback(bidsBackHandler, false);
    }
    bidmanager.executeCallback();
    return;
  }

  // set timeout for all bids
  const timedOut = true;
  const timeoutCallback = bidmanager.executeCallback.bind(bidmanager, timedOut);
  const timer = setTimeout(timeoutCallback, cbTimeout);
  setAjaxTimeout(cbTimeout);
  if (typeof bidsBackHandler === objectType_function) {
    bidmanager.addOneTimeCallback(bidsBackHandler, timer);
  }

  adaptermanager.callBids({ adUnits, adUnitCodes, cbTimeout });
  if ($$PREBID_GLOBAL$$._bidsRequested.length === 0) {
    bidmanager.executeCallback();
  }
};

/**
 *
 * Add adunit(s)
 * @param {Array|String} adUnitArr Array of adUnits or single adUnit Object.
 * @alias module:$$PREBID_GLOBAL$$.addAdUnits
 */
$$PREBID_GLOBAL$$.addAdUnits = function (adUnitArr) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.addAdUnits', arguments);
  if (utils.isArray(adUnitArr)) {
    // generate transactionid for each new adUnits
    // Append array to existing
    adUnitArr.forEach(adUnit => adUnit.transactionId = utils.generateUUID());
    $$PREBID_GLOBAL$$.adUnits.push.apply($$PREBID_GLOBAL$$.adUnits, adUnitArr);
  } else if (typeof adUnitArr === objectType_object) {
    // Generate the transaction id for the adunit
    adUnitArr.transactionId = utils.generateUUID();
    $$PREBID_GLOBAL$$.adUnits.push(adUnitArr);
  }
};

/**
 * @param {String} event the name of the event
 * @param {Function} handler a callback to set on event
 * @param {String} id an identifier in the context of the event
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
 * @param {String} event the name of the event
 * @param {Function} handler a callback to remove from the event
 * @param {String} id an identifier in the context of the event (see `$$PREBID_GLOBAL$$.onEvent`)
 */
$$PREBID_GLOBAL$$.offEvent = function (event, handler, id) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.offEvent', arguments);
  if (id && !eventValidators[event].call(null, id)) {
    return;
  }

  events.off(event, handler, id);
};

/**
 * Add a callback event
 * @param {String} eventStr event to attach callback to Options: "allRequestedBidsBack" | "adUnitBidsBack"
 * @param {Function} func  function to execute. Parameters passed into the function: (bidResObj), [adUnitCode]);
 * @alias module:$$PREBID_GLOBAL$$.addCallback
 * @returns {String} id for callback
 */
$$PREBID_GLOBAL$$.addCallback = function (eventStr, func) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.addCallback', arguments);
  var id = null;
  if (!eventStr || !func || typeof func !== objectType_function) {
    utils.logError('error registering callback. Check method signature');
    return id;
  }

  id = utils.getUniqueIdentifierStr;
  bidmanager.addCallback(id, func, eventStr);
  return id;
};

/**
 * Remove a callback event
 * //@param {string} cbId id of the callback to remove
 * @alias module:$$PREBID_GLOBAL$$.removeCallback
 * @returns {String} id for callback
 */
$$PREBID_GLOBAL$$.removeCallback = function (/* cbId */) {
  // todo
  return null;
};

/**
 * Wrapper to register bidderAdapter externally (adaptermanager.registerBidAdapter())
 * @param  {[type]} bidderAdaptor [description]
 * @param  {[type]} bidderCode    [description]
 * @return {[type]}               [description]
 */
$$PREBID_GLOBAL$$.registerBidAdapter = function (bidderAdaptor, bidderCode) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.registerBidAdapter', arguments);
  try {
    adaptermanager.registerBidAdapter(bidderAdaptor(), bidderCode);
  }
  catch (e) {
    utils.logError('Error registering bidder adapter : ' + e.message);
  }
};

/**
 * Wrapper to register analyticsAdapter externally (adaptermanager.registerAnalyticsAdapter())
 * @param  {[type]} options [description]
 */
$$PREBID_GLOBAL$$.registerAnalyticsAdapter = function (options) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.registerAnalyticsAdapter', arguments);
  try {
    adaptermanager.registerAnalyticsAdapter(options);
  }
  catch (e) {
    utils.logError('Error registering analytics adapter : ' + e.message);
  }
};

$$PREBID_GLOBAL$$.bidsAvailableForAdapter = function (bidderCode) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.bidsAvailableForAdapter', arguments);

  $$PREBID_GLOBAL$$._bidsRequested.find(bidderRequest => bidderRequest.bidderCode === bidderCode).bids
    .map(bid => {
      return Object.assign(bid, bidfactory.createBid(1), {
        bidderCode,
        adUnitCode: bid.placementCode
      });
    })
    .map(bid => $$PREBID_GLOBAL$$._bidsReceived.push(bid));
};

/**
 * Wrapper to bidfactory.createBid()
 * @param  {[type]} statusCode [description]
 * @return {[type]}            [description]
 */
$$PREBID_GLOBAL$$.createBid = function (statusCode) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.createBid', arguments);
  return bidfactory.createBid(statusCode);
};

/**
 * Wrapper to bidmanager.addBidResponse
 * @param {[type]} adUnitCode [description]
 * @param {[type]} bid        [description]
 */
$$PREBID_GLOBAL$$.addBidResponse = function (adUnitCode, bid) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.addBidResponse', arguments);
  bidmanager.addBidResponse(adUnitCode, bid);
};

/**
 * Wrapper to adloader.loadScript
 * @param  {[type]}   tagSrc   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
$$PREBID_GLOBAL$$.loadScript = function (tagSrc, callback, useCache) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.loadScript', arguments);
  loadScript(tagSrc, callback, useCache);
};

/**
 * Will enable sending a prebid.js to data provider specified
 * @param  {object} config object {provider : 'string', options : {}}
 */
$$PREBID_GLOBAL$$.enableAnalytics = function (config) {
  if (config && !utils.isEmpty(config)) {
    utils.logInfo('Invoking $$PREBID_GLOBAL$$.enableAnalytics for: ', config);
    adaptermanager.enableAnalytics(config);
  } else {
    utils.logError('$$PREBID_GLOBAL$$.enableAnalytics should be called with option {}');
  }
};

$$PREBID_GLOBAL$$.aliasBidder = function (bidderCode, alias) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.aliasBidder', arguments);
  if (bidderCode && alias) {
    adaptermanager.aliasBidAdapter(bidderCode, alias);
  } else {
    utils.logError('bidderCode and alias must be passed as arguments', '$$PREBID_GLOBAL$$.aliasBidder');
  }
};

/**
 * Sets a default price granularity scheme.
 * @param {String|Object} granularity - the granularity scheme.
 * "low": $0.50 increments, capped at $5 CPM
 * "medium": $0.10 increments, capped at $20 CPM (the default)
 * "high": $0.01 increments, capped at $20 CPM
 * "auto": Applies a sliding scale to determine granularity
 * "dense": Like "auto", but the bid price granularity uses smaller increments, especially at lower CPMs
 *
 * Alternatively a custom object can be specified:
 * { "buckets" : [{"min" : 0,"max" : 20,"increment" : 0.1,"cap" : true}]};
 * See http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.setPriceGranularity for more details
 */
$$PREBID_GLOBAL$$.setPriceGranularity = function (granularity) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.setPriceGranularity', arguments);
  if (!granularity) {
    utils.logError('Prebid Error: no value passed to `setPriceGranularity()`');
    return;
  }
  if (typeof granularity === 'string') {
    bidmanager.setPriceGranularity(granularity);
  }
  else if (typeof granularity === 'object') {
    if (!isValidePriceConfig(granularity)) {
      utils.logError('Invalid custom price value passed to `setPriceGranularity()`');
      return;
    }
    bidmanager.setCustomPriceBucket(granularity);
    bidmanager.setPriceGranularity(CONSTANTS.GRANULARITY_OPTIONS.CUSTOM);
    utils.logMessage('Using custom price granularity');
  }
};

$$PREBID_GLOBAL$$.enableSendAllBids = function () {
  $$PREBID_GLOBAL$$._sendAllBids = true;
};

$$PREBID_GLOBAL$$.getAllWinningBids = function () {
  return $$PREBID_GLOBAL$$._winningBids;
};

/**
 * Build master video tag from publishers adserver tag
 * @param {string} adserverTag default url
 * @param {object} options options for video tag
 */
$$PREBID_GLOBAL$$.buildMasterVideoTagFromAdserverTag = function (adserverTag, options) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.buildMasterVideoTagFromAdserverTag', arguments);
  var urlComponents = parseURL(adserverTag);

  // return original adserverTag if no bids received
  if ($$PREBID_GLOBAL$$._bidsReceived.length === 0) {
    return adserverTag;
  }

  var masterTag = '';
  if (options.adserver.toLowerCase() === 'dfp') {
    var dfpAdserverObj = adserver.dfpAdserver(options, urlComponents);
    if (!dfpAdserverObj.verifyAdserverTag()) {
      utils.logError('Invalid adserverTag, required google params are missing in query string');
    }
    dfpAdserverObj.appendQueryParams();
    masterTag = formatURL(dfpAdserverObj.urlComponents);
  } else {
    utils.logError('Only DFP adserver is supported');
    return;
  }
  return masterTag;
};

/**
 * Set the order bidders are called in. If not set, the bidders are called in
 * the order they are defined within the adUnit.bids array
 * @param {string} order - Order to call bidders in. Currently the only possible value
 * is 'random', which randomly shuffles the order
 */
$$PREBID_GLOBAL$$.setBidderSequence = function (order) {
  if (order === CONSTANTS.ORDER.RANDOM) {
    adaptermanager.setBidderSequence(CONSTANTS.ORDER.RANDOM);
  }
};

/**
 * Get array of highest cpm bids for all adUnits, or highest cpm bid
 * object for the given adUnit
 * @param {string} adUnitCode - optional ad unit code
 * @return {array} array containing highest cpm bid object(s)
 */
$$PREBID_GLOBAL$$.getHighestCpmBids = function (adUnitCode) {
  return targeting.getWinningBids(adUnitCode);
};

/**
 * Set config for server to server header bidding
 * @param {object} options - config object for s2s
 */
$$PREBID_GLOBAL$$.setS2SConfig = function(options) {
  if (!utils.contains(Object.keys(options), 'accountId')) {
    utils.logError('accountId missing in Server to Server config');
    return;
  }

  if (!utils.contains(Object.keys(options), 'bidders')) {
    utils.logError('bidders missing in Server to Server config');
    return;
  }

  const config = Object.assign({
    enabled: false,
    endpoint: CONSTANTS.S2S.DEFAULT_ENDPOINT,
    timeout: 1000,
    maxBids: 1,
    adapter: 'prebidServer'
  }, options);
  adaptermanager.setS2SConfig(config);
};

$$PREBID_GLOBAL$$.cmd.push(() => listenMessagesFromCreative());
processQueue($$PREBID_GLOBAL$$.cmd);
processQueue($$PREBID_GLOBAL$$.que);
