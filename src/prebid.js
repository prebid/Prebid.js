/** @module $$PREBID_GLOBAL$$ */

import { flatten, uniques, getKeys, isGptPubadsDefined, getHighestCpm } from './utils';
import 'polyfill';

// if $$PREBID_GLOBAL$$ already exists in global document scope, use it, if not, create the object
window.$$PREBID_GLOBAL$$ = (window.$$PREBID_GLOBAL$$ || {});
window.$$PREBID_GLOBAL$$.que = window.$$PREBID_GLOBAL$$.que || [];
var $$PREBID_GLOBAL$$ = window.$$PREBID_GLOBAL$$;
var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');
var bidmanager = require('./bidmanager.js');
var adaptermanager = require('./adaptermanager');
var bidfactory = require('./bidfactory');
var adloader = require('./adloader');
var events = require('./events');

/* private variables */

var objectType_function = 'function';
var objectType_undefined = 'undefined';
var objectType_object = 'object';
var BID_WON = CONSTANTS.EVENTS.BID_WON;
var BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
var AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;

var pb_bidsTimedOut = false;
var auctionRunning = false;
var presetTargeting = [];
var pbTargetingKeys = [];

var eventValidators = {
  bidWon: checkDefinedPlacement
};

/* Public vars */

$$PREBID_GLOBAL$$._bidsRequested = [];
$$PREBID_GLOBAL$$._bidsReceived = [];
$$PREBID_GLOBAL$$._adsReceived = [];
$$PREBID_GLOBAL$$._sendAllBids = false;

//default timeout for all bids
$$PREBID_GLOBAL$$.bidderTimeout = $$PREBID_GLOBAL$$.bidderTimeout || 3000;
$$PREBID_GLOBAL$$.logging = $$PREBID_GLOBAL$$.logging || false;

//let the world know we are loaded
$$PREBID_GLOBAL$$.libLoaded = true;

//version auto generated from build
utils.logInfo('Prebid.js v$prebid.version$ loaded');

//create adUnit array
$$PREBID_GLOBAL$$.adUnits = $$PREBID_GLOBAL$$.adUnits || [];

/**
 * Command queue that functions will execute once prebid.js is loaded
 * @param  {function} cmd Annoymous function to execute
 * @alias module:$$PREBID_GLOBAL$$.que.push
 */
$$PREBID_GLOBAL$$.que.push = function (cmd) {
  if (typeof cmd === objectType_function) {
    try {
      cmd.call();
    } catch (e) {
      utils.logError('Error processing command :' + e.message);
    }
  } else {
    utils.logError('Commands written into $$PREBID_GLOBAL$$.que.push must wrapped in a function');
  }
};

function processQue() {
  for (var i = 0; i < $$PREBID_GLOBAL$$.que.length; i++) {
    if (typeof $$PREBID_GLOBAL$$.que[i].called === objectType_undefined) {
      try {
        $$PREBID_GLOBAL$$.que[i].call();
        $$PREBID_GLOBAL$$.que[i].called = true;
      }
      catch (e) {
        utils.logError('Error processing command :', 'prebid.js', e);
      }
    }
  }
}

function timeOutBidders() {
  if (!pb_bidsTimedOut) {
    pb_bidsTimedOut = true;
    var timedOutBidders = bidmanager.getTimedOutBidders();
    events.emit(BID_TIMEOUT, timedOutBidders);
  }
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

function resetPresetTargeting() {
  if (isGptPubadsDefined()) {
    window.googletag.pubads().getSlots().forEach(slot => {
      pbTargetingKeys.forEach(function(key){
        slot.setTargeting(key,null);
      });
    });
  }
}

function setTargeting(targetingConfig) {
  window.googletag.pubads().getSlots().forEach(slot => {
    targetingConfig.filter(targeting => Object.keys(targeting)[0] === slot.getAdUnitPath() ||
      Object.keys(targeting)[0] === slot.getSlotElementId())
      .forEach(targeting => targeting[Object.keys(targeting)[0]]
        .forEach(key => {
          key[Object.keys(key)[0]]
            .map((value) => {
              utils.logMessage(`Attempting to set key value for slot: ${slot.getSlotElementId()} key: ${Object.keys(key)[0]} value: ${value}`);
              return value;
            })
            .forEach(value => {
              slot.setTargeting(Object.keys(key)[0], value);
            });
        }));
  });
}

function isNotSetByPb(key) {
  return pbTargetingKeys.indexOf(key) === -1;
}

function getPresetTargeting() {
  if (isGptPubadsDefined()) {
    presetTargeting = (function getPresetTargeting() {
      return window.googletag.pubads().getSlots().map(slot => {
        return {
          [slot.getAdUnitPath()]: slot.getTargetingKeys().filter(isNotSetByPb).map(key => {
            return { [key]: slot.getTargeting(key) };
          })
        };
      });
    })();
  }
}

function getWinningBidTargeting() {
  let winners = $$PREBID_GLOBAL$$._bidsReceived.map(bid => bid.adUnitCode)
    .filter(uniques)
    .map(adUnitCode => $$PREBID_GLOBAL$$._bidsReceived
      .filter(bid => bid.adUnitCode === adUnitCode ? bid : null)
      .reduce(getHighestCpm,
        {
          adUnitCode: adUnitCode,
          cpm: 0,
          adserverTargeting: {},
          timeToRespond: 0
        }));

  // winning bids with deals need an hb_deal targeting key
  winners
    .filter(bid => bid.dealId)
    .map(bid => bid.adserverTargeting.hb_deal = bid.dealId);

  winners = winners.map(winner => {
    return {
      [winner.adUnitCode]: Object.keys(winner.adserverTargeting, key => key)
        .map(key => {
          return { [key.substring(0, 20)]: [winner.adserverTargeting[key]] };
        })
    };
  });

  return winners;
}

function getDealTargeting() {
  return $$PREBID_GLOBAL$$._bidsReceived.filter(bid => bid.dealId).map(bid => {
    const dealKey = `hb_deal_${bid.bidderCode}`;
    return {
      [bid.adUnitCode]: CONSTANTS.TARGETING_KEYS.map(key => {
        return {
          [`${key}_${bid.bidderCode}`.substring(0, 20)]: [bid.adserverTargeting[key]]
        };
      })
      .concat({ [dealKey]: [bid.adserverTargeting[dealKey]] })
    };
  });
}

/**
 * Get custom targeting keys for bids that have `alwaysUseBid=true`.
 */
function getAlwaysUseBidTargeting() {
  return $$PREBID_GLOBAL$$._bidsReceived.map(bid => {
    if (bid.alwaysUseBid) {
      const standardKeys = CONSTANTS.TARGETING_KEYS;
      return {
        [bid.adUnitCode]: Object.keys(bid.adserverTargeting, key => key).map(key => {
          // Get only the non-standard keys of the losing bids, since we
          // don't want to override the standard keys of the winning bid.
          if (standardKeys.indexOf(key) > -1) {
            return;
          }

          return { [key.substring(0, 20)]: [bid.adserverTargeting[key]] };

        }).filter(key => key) // remove empty elements
      };
    }
  }).filter(bid => bid); // removes empty elements in array;
}

function getBidLandscapeTargeting() {
  const standardKeys = CONSTANTS.TARGETING_KEYS;

  return $$PREBID_GLOBAL$$._bidsReceived.map(bid => {
    if (bid.adserverTargeting) {
      return {
        [bid.adUnitCode]: standardKeys.map(key => {
          return {
            [`${key}_${bid.bidderCode}`.substring(0, 20)]: [bid.adserverTargeting[key]]
          };
        })
      };
    }
  }).filter(bid => bid); // removes empty elements in array
}

function getAllTargeting() {
  // Get targeting for the winning bid. Add targeting for any bids that have
  // `alwaysUseBid=true`. If sending all bids is enabled, add targeting for losing bids.
  var targeting = getDealTargeting()
    .concat(getWinningBidTargeting())
    .concat(getAlwaysUseBidTargeting())
    .concat($$PREBID_GLOBAL$$._sendAllBids ? getBidLandscapeTargeting() : []);

  //store a reference of the targeting keys
  targeting.map(adUnitCode => {
    Object.keys(adUnitCode).map(key => {
      adUnitCode[key].map(targetKey => {
        if(pbTargetingKeys.indexOf(Object.keys(targetKey)[0]) === -1) {
          pbTargetingKeys = Object.keys(targetKey).concat(pbTargetingKeys);
        }
      });
    });
  });
  return targeting;
}

//////////////////////////////////
//                              //
//    Start Public APIs         //
//                              //
//////////////////////////////////

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
$$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCode = function (adUnitCode) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCode', arguments);

  return getAllTargeting().filter(targeting => getKeys(targeting)[0] === adUnitCode)
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
    }, {})[adUnitCode];
};

/**
 * returns all ad server targeting for all ad units
 * @return {object} Map of adUnitCodes and targeting values []
 * @alias module:$$PREBID_GLOBAL$$.getAdserverTargeting
 */

$$PREBID_GLOBAL$$.getAdserverTargeting = function () {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.getAdserverTargeting', arguments);
  return getAllTargeting()
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

  return $$PREBID_GLOBAL$$._bidsReceived.map(bid => bid.adUnitCode)
    .filter(uniques).map(adUnitCode => $$PREBID_GLOBAL$$._bidsReceived
      .filter(bid => bid.adUnitCode === adUnitCode))
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
 * Set query string targeting on all GPT ad units.
 * @alias module:$$PREBID_GLOBAL$$.setTargetingForGPTAsync
 */
$$PREBID_GLOBAL$$.setTargetingForGPTAsync = function () {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.setTargetingForGPTAsync', arguments);
  if (!isGptPubadsDefined()) {
    utils.logError('window.googletag is not defined on the page');
    return;
  }

  //first reset any old targeting
  getPresetTargeting();
  resetPresetTargeting();
  //now set new targeting keys
  setTargeting(getAllTargeting());
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
 * This function will render the ad (based on params) in the given iframe document passed through. Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchrounsly
 * @param  {object} doc document
 * @param  {string} id bid id to locate the ad
 * @alias module:$$PREBID_GLOBAL$$.renderAd
 */
$$PREBID_GLOBAL$$.renderAd = function (doc, id) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.renderAd', arguments);
  utils.logMessage('Calling renderAd with adId :' + id);
  if (doc && id) {
    try {
      //lookup ad by ad Id
      var adObject = $$PREBID_GLOBAL$$._bidsReceived.find(bid => bid.adId === id);
      if (adObject) {
        //emit 'bid won' event here
        events.emit(BID_WON, adObject);
        var height = adObject.height;
        var width = adObject.width;
        var url = adObject.adUrl;
        var ad = adObject.ad;

        if (ad) {
          doc.write(ad);
          doc.close();
          if (doc.defaultView && doc.defaultView.frameElement) {
            doc.defaultView.frameElement.width = width;
            doc.defaultView.frameElement.height = height;
          }
        }

        //doc.body.style.width = width;
        //doc.body.style.height = height;
        else if (url) {
          doc.write('<IFRAME SRC="' + url + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" WIDTH="' + width + '" HEIGHT="' + height + '"></IFRAME>');
          doc.close();

          if (doc.defaultView && doc.defaultView.frameElement) {
            doc.defaultView.frameElement.width = width;
            doc.defaultView.frameElement.height = height;
          }

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
  utils.logMessage('Prebid auction cleared');
  events.emit(AUCTION_END);
};

/**
 *
 * @param bidsBackHandler
 * @param timeout
 * @param adUnits
 * @param adUnitCodes
 */
$$PREBID_GLOBAL$$.requestBids = function ({ bidsBackHandler, timeout, adUnits, adUnitCodes }) {
  if (auctionRunning) {
    utils.logError('Prebid Error: `$$PREBID_GLOBAL$$.requestBids` was called while a previous auction was' +
      ' still running. Resubmit this request.');
    return;
  } else {
    auctionRunning = true;
    $$PREBID_GLOBAL$$._bidsRequested = [];
    $$PREBID_GLOBAL$$._bidsReceived = [];
  }

  const cbTimeout = timeout || $$PREBID_GLOBAL$$.bidderTimeout;

  // use adUnits provided or from $$PREBID_GLOBAL$$ global
  adUnits = adUnits || $$PREBID_GLOBAL$$.adUnits;

  // if specific adUnitCodes filter adUnits for those codes
  if (adUnitCodes && adUnitCodes.length) {
    adUnits = adUnits.filter(adUnit => adUnitCodes.includes(adUnit.code));
  }

  if (typeof bidsBackHandler === objectType_function) {
    bidmanager.addOneTimeCallback(bidsBackHandler);
  }

  utils.logInfo('Invoking $$PREBID_GLOBAL$$.requestBids', arguments);

  if (!adUnits || adUnits.length === 0) {
    utils.logMessage('No adUnits configured. No bids requested.');
    bidmanager.executeCallback();
    return;
  }

  //set timeout for all bids
  setTimeout(bidmanager.executeCallback, cbTimeout);

  adaptermanager.callBids({ adUnits, adUnitCodes, cbTimeout });
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
    //append array to existing
    $$PREBID_GLOBAL$$.adUnits.push.apply($$PREBID_GLOBAL$$.adUnits, adUnitArr);
  } else if (typeof adUnitArr === objectType_object) {
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
 * @param {Function} func  function to execute. Paramaters passed into the function: (bidResObj), [adUnitCode]);
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
  //todo
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
  adloader.loadScript(tagSrc, callback, useCache);
};

/**
 * Will enable sendinga prebid.js to data provider specified
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

/**
 * This will tell analytics that all bids received after are "timed out"
 */
$$PREBID_GLOBAL$$.sendTimeoutEvent = function () {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.sendTimeoutEvent', arguments);
  timeOutBidders();
};

$$PREBID_GLOBAL$$.aliasBidder = function (bidderCode, alias) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.aliasBidder', arguments);
  if (bidderCode && alias) {
    adaptermanager.aliasBidAdapter(bidderCode, alias);
  } else {
    utils.logError('bidderCode and alias must be passed as arguments', '$$PREBID_GLOBAL$$.aliasBidder');
  }
};

$$PREBID_GLOBAL$$.setPriceGranularity = function (granularity) {
  utils.logInfo('Invoking $$PREBID_GLOBAL$$.setPriceGranularity', arguments);
  if (!granularity) {
    utils.logError('Prebid Error: no value passed to `setPriceGranularity()`');
  } else {
    bidmanager.setPriceGranularity(granularity);
  }
};

$$PREBID_GLOBAL$$.enableSendAllBids = function () {
  $$PREBID_GLOBAL$$._sendAllBids = true;
};

processQue();
