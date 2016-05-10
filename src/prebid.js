/** @module pbjs */

// if pbjs already exists in global document scope, use it, if not, create the object
window.pbjs = (window.pbjs || {});
window.pbjs.que = window.pbjs.que || [];
var pbjs = window.pbjs;
var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');
var bidmanager = require('./bidmanager.js');
var adaptermanager = require('./adaptermanager');
var bidfactory = require('./bidfactory');
var adloader = require('./adloader');
var ga = require('./ga');
var events = require('./events');

/* private variables */

var objectType_function = 'function';
var objectType_undefined = 'undefined';
var objectType_object = 'object';
var objectType_string = 'string';
var BID_WON = CONSTANTS.EVENTS.BID_WON;
var BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;

var pb_placements = [];
var pb_bidderMap = {};
var pb_targetingMap = {};
var pb_keyHistoryMap = {};
var pb_bidsTimedOut = false;
var pb_sendAllBids = false;

var eventValidators = {
  bidWon: checkDefinedPlacement
};

/* Public vars */

//default timeout for all bids
pbjs.bidderTimeout = pbjs.bidderTimeout || 5000;
pbjs.logging = pbjs.logging || false;

//let the world know we are loaded
pbjs.libLoaded = true;

//version auto generated from build
utils.logInfo('Prebid.js v$prebid.version$ loaded');

//create adUnit array
pbjs.adUnits = pbjs.adUnits || [];

/**
 * Command queue that functions will execute once prebid.js is loaded
 * @param  {function} cmd Annoymous function to execute
 * @alias module:pbjs.que.push
 */
pbjs.que.push = function (cmd) {
  if (typeof cmd === objectType_function) {
    try {
      cmd.call();
    } catch (e) {
      utils.logError('Error processing command :' + e.message);
    }
  } else {
    utils.logError('Commands written into pbjs.que.push must wrapped in a function');
  }
};

function processQue() {
  for (var i = 0; i < pbjs.que.length; i++) {
    if (typeof pbjs.que[i].called === objectType_undefined) {
      try {
        pbjs.que[i].call();
        pbjs.que[i].called = true;
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

function getWinningBid(bidArray) {
  if (bidArray && bidArray.length !== 0) {
    bidArray.sort(function (a, b) {
      //put the highest CPM first
      return b.cpm - a.cpm;
    });

    // The first item has the highest cpm
    // If winning bid CPM === 0 - we need to indicate no targeting should be set
    if (bidArray[0].cpm === 0 ) {
      return null;
    }
    return bidArray[0].bid;
  }
}

function setGPTAsyncTargeting(slot) {
  //get the targeting that is already configured
  const keyStrings = getTargetingfromGPTIdentifier(slot);
  const bids = pbjs.getBidResponses(slot.getAdUnitPath());

  //copy keyStrings into pb_keyHistoryMap by code
  if (!pb_keyHistoryMap[code]) {
    pb_keyHistoryMap[code] = keyStrings;
  } else {
    utils.extend(pb_keyHistoryMap[code], keyStrings);
  }

  if (pb_sendAllBids && bids && bids.bids && bids.bids.length) {
    utils.extend(pb_keyHistoryMap[code], getTargetingKeysAsBidder(bids.bids));
  }

  utils._each(pb_keyHistoryMap[code], function (value, key) {
    //since DFP doesn't support deleting a single key, we will set all to empty string
    //This is "clear" for that key
    slot.setTargeting(key, '');

    //utils.logMessage('Attempting to clear the key : ' + key + ' to empty string for code: ' + code);
  });

  for (var key in keyStrings) {
    if (keyStrings.hasOwnProperty(key)) {
      try {
        utils.logMessage('Attempting to set key value for slot: ' + slot.getSlotElementId() + ' key: ' + key + ' value: ' + encodeURIComponent(keyStrings[key]));
        slot.setTargeting(key, keyStrings[key]);
      } catch (e) {
        utils.logMessage('Problem setting key value pairs in slot: ' + e.message);
      }
    }
  }
}
/*
 *   This function returns the object map of placements or
 *   if placement code is specified return just 1 placement bids
 */
function getBidResponsesByAdUnit(adunitCode) {
  var returnObj = {};
  if (adunitCode) {
    returnObj = bidmanager.pbBidResponseByPlacement[adunitCode];
    return returnObj;
  } else {
    return bidmanager.pbBidResponseByPlacement;
  }
}

/*
 *	Copies bids into a bidArray response
 */
function buildBidResponse(bidArray) {
  var bidResponseArray = [];
  var adUnitCode = '';

  //temp array to hold auction for bids
  var bidArrayTargeting = [];
  var bidClone = {};
  if (bidArray && bidArray[0] && bidArray[0].adUnitCode) {
    // init the pb_targetingMap for the adUnitCode
    adUnitCode = bidArray[0] && bidArray[0].adUnitCode;
    pb_targetingMap[adUnitCode] = {};
    for (var i = 0; i < bidArray.length; i++) {
      var bid = bidArray[i];

      //clone by json parse. This also gets rid of unwanted function properties
      bidClone = getCloneBid(bid);

      if (bid.alwaysUseBid && bidClone.adserverTargeting) { // add the bid if alwaysUse and bid has returned
        // push key into targeting
        pb_targetingMap[bidClone.adUnitCode] = utils.extend(pb_targetingMap[bidClone.adUnitCode], bidClone.adserverTargeting);
      }

      if (bid.cpm && bid.cpm > 0) {
        //else put into auction array if cpm > 0
        bidArrayTargeting.push({
          cpm: bid.cpm,
          bid: bid
        });
      }

      //put all bids into bidArray by default
      bidResponseArray.push(bidClone);
    }
  }

  // push the winning bid into targeting map
  if (adUnitCode && bidArrayTargeting.length !== 0) {
    var winningBid = getWinningBid(bidArrayTargeting);
    if (winningBid) {
      var keyValues = winningBid.adserverTargeting;
      pb_targetingMap[adUnitCode] = utils.extend(pb_targetingMap[adUnitCode], keyValues);
    } else {
      utils.logWarn('No winning bids available.');
    }
  }

  return bidResponseArray;
}

function getCloneBid(bid) {
  var bidClone = {};

  //clone by json parse. This also gets rid of unwanted function properties
  if (bid) {
    var jsonBid = JSON.stringify(bid);
    bidClone = JSON.parse(jsonBid);

    //clean up bid clone
    delete bidClone.pbLg;
    delete bidClone.pbMg;
    delete bidClone.pbHg;
  }

  return bidClone;
}

function resetBids() {
  bidmanager.clearAllBidResponses();
  pb_bidderMap = {};
  pb_placements = [];
  pb_targetingMap = {};
  pb_bidsTimedOut = false;
}

function checkDefinedPlacement(id) {
  var placementCodes = pbjs._bidsRequested.map(bidSet => bidSet.bids.map(bid => bid.placementCode))
    .reduce((a, b) => a.concat(b)) // flatten
    .filter((value, index, array) => array.indexOf(value) === index); // uniques

  if (!utils.contains(placementCodes, id)) {
    utils.logError('The "' + id + '" placement is not defined.');
    return;
  }

  return true;
}

//////////////////////////////////
//                              //
//    Start Public APIs         //
//                              //
//////////////////////////////////
/**
 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
 * @param  {string} [adunitCode] adUnitCode to get the bid responses for
 * @alias module:pbjs.getAdserverTargetingForAdUnitCodeStr
 * @return {array}  returnObj return bids array
 */
pbjs.getAdserverTargetingForAdUnitCodeStr = function (adunitCode) {
  utils.logInfo('Invoking pbjs.getAdserverTargetingForAdUnitCodeStr', arguments);
  // call to retrieve bids array
  if (adunitCode) {
    var res = pbjs.getAdserverTargetingForAdUnitCode(adunitCode);
    return utils.transformAdServerTargetingObj(res);
  } else {
    utils.logMessage('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode');
  }
};
/**
 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
 * @param  {string} [adunitCode] adUnitCode to get the bid responses for
 * @alias module:pbjs.getAdserverTargetingForAdUnitCode
 * @return {object}  returnObj return bids
 */
pbjs.getAdserverTargetingForAdUnitCode = function (adunitCode) {
  utils.logInfo('Invoking pbjs.getAdserverTargetingForAdUnitCode', arguments);
  // call to populate pb_targetingMap
  pbjs.getBidResponses(adunitCode);

  if (adunitCode) {
    return pb_targetingMap[adunitCode];
  }

  return pb_targetingMap;
};
/**
 * returns all ad server targeting for all ad units
 * @return {object} Map of adUnitCodes and targeting values []
 * @alias module:pbjs.getAdserverTargeting
 */
pbjs.getAdserverTargeting = function () {
  utils.logInfo('Invoking pbjs.getAdserverTargeting', arguments);
  return pbjs.getAdserverTargetingForAdUnitCode();
};

/**
 * This function returns the bid responses at the given moment.
 * @param  {string} [adunitCode] adunitCode adUnitCode to get the bid responses for
 * @alias module:pbjs.getBidResponses
 * @return {object}            map | object that contains the bidResponses
 */
pbjs.getBidResponses = function (adunitCode) {
  utils.logInfo('Invoking pbjs.getBidResponses', arguments);
  var response = {};
  var bidArray = [];
  var returnObj = {};

  if (adunitCode) {
    response = getBidResponsesByAdUnit(adunitCode);
    bidArray = [];
    if (response && response.bids) {
      bidArray = buildBidResponse(response.bids);
    }

    returnObj = {
      bids: bidArray
    };

  } else {
    response = getBidResponsesByAdUnit();
    for (var adUnit in response) {
      if (response.hasOwnProperty(adUnit)) {
        if (response && response[adUnit] && response[adUnit].bids) {
          bidArray = buildBidResponse(response[adUnit].bids);
        }

        returnObj[adUnit] = {
          bids: bidArray
        };

      }
    }
  }

  return returnObj;

};
/**
 * Returns bidResponses for the specified adUnitCode
 * @param  {String} adUnitCode adUnitCode
 * @alias module:pbjs.getBidResponsesForAdUnitCode
 * @return {Object}            bidResponse object
 */
pbjs.getBidResponsesForAdUnitCode = function (adUnitCode) {
  utils.logInfo('Invoking pbjs.getBidResponsesForAdUnitCode', arguments);
  return pbjs.getBidResponses(adUnitCode);
};
/**
 * Set query string targeting on adUnits specified. The logic for deciding query strings is described in the section Configure AdServer Targeting. Note that this function has to be called after all ad units on page are defined.
 * @param {array} [codeArr] an array of adUnitodes to set targeting for.
 * @alias module:pbjs.setTargetingForAdUnitsGPTAsync
 */
pbjs.setTargetingForAdUnitsGPTAsync = function (codeArr) {
  utils.logInfo('Invoking pbjs.setTargetingForAdUnitsGPTAsync', arguments);
  if (!window.googletag || !utils.isFn(window.googletag.pubads) || !utils.isFn(window.googletag.pubads().getSlots)) {
    utils.logError('window.googletag is not defined on the page');
    return;
  }

  //emit bid timeout event here
  timeOutBidders();

  var adUnitCodesArr = codeArr;

  if (typeof codeArr === objectType_string) {
    adUnitCodesArr = [codeArr];
  } else if (typeof codeArr === objectType_object) {
    adUnitCodesArr = codeArr;
  }

  var placementBids = {};
  var i = 0;
  var slots;

  if (adUnitCodesArr) {
    for (i = 0; i < adUnitCodesArr.length; i++) {
      var code = adUnitCodesArr[i];

      //get all the slots from google tag
      slots = window.googletag.pubads().getSlots();
      for (var k = 0; k < slots.length; k++) {

        if (slots[k].getSlotElementId() === code || slots[k].getAdUnitPath() === code) {
          placementBids = getBidResponsesByAdUnit(code);
          setGPTAsyncTargeting(code, slots[k]);
        }
      }
    }
  } else {
    //get all the slots from google tag
    slots = window.googletag.pubads().getSlots();
    for (i = 0; i < slots.length; i++) {
      const adUnitCode = slots[i].getSlotElementId();
      const adUnitPath = slots[i].getAdUnitPath();
      if (adUnitCode || adUnitPath) {
        //placementBids = getBidsFromGTPIdentifier(slots[i]);
        setGPTAsyncTargeting(slots[i]);
      }
    }
  }

};
/**
 * Returns a string identifier (either DivId or adUnitPath)
 * @param  {[type]} slot [description]
 * @return {[type]}      [description]
 */
function getTargetingfromGPTIdentifier(slot) {
  var targeting = null;
  if (slot) {
    //first get by elementId
    targeting = pbjs.getAdserverTargetingForAdUnitCode(slot.getSlotElementId());

    //if not available, try by adUnitPath
    if (!targeting) {
      targeting = pbjs.getAdserverTargetingForAdUnitCode(slot.getAdUnitPath());
    }
  }

  return targeting;
}

/**
 * returns targeting keys with key name appended with the bidder code
 * @param bidArray an array of current bid objects
 */
function getTargetingKeysAsBidder(bidArray) {
  const standardKeys = CONSTANTS.TARGETING_KEYS;
  let pairs = {};

  // this assumes no key name collisions, which should not be possible,
  // because bidder names are constrained by the adapter filename
  // so uniqueness is enforced by the file system.
  utils._each(bidArray, bid => {
    if (bid.adserverTargeting) {
      utils._each(standardKeys, key => {
        pairs[`${key}_${bid.bidderCode}`] = bid.adserverTargeting[key];
      });
    }
  });

  return pairs;
}

function uniques(value, index, arry) {
  return arry.indexOf(value) === index;
}

exports.uniques = function() {
  return uniques;
};

function getPresetTargeting() {
  return window.googletag.pubads().getSlots().map(slot => {
    return {
      [slot.getAdUnitPath()]: slot.getTargetingKeys().map(key => {
        return { [key]: slot.getTargeting(key) };
      })
    };
  });
}

function getWinningBidTargeting() {
  const winners = pbjs._bidsReceived.map(bid => bid.adUnitCode)
    .filter(uniques)
    .map(adUnitCode => pbjs._bidsReceived
      .filter(bid => bid.adUnitCode === adUnitCode ? bid : null)
      .reduce((prev, curr) => prev.cpm < curr.cpm ? curr : prev,
        {
          adUnitCode: adUnitCode,
          cpm: 0,
          adserverTargeting: {}
        }));
  return winners.map(winner => {
    return { [winner.adUnitCode]: Object.keys(winner.adserverTargeting, key => key)
      .map(key => { return { [key]: [winner.adserverTargeting[key]] }; }) };
  });
}

function getBidLandscapeTargeting() {
  const standardKeys = CONSTANTS.TARGETING_KEYS;

  return pbjs._bidsReceived.map(bid => {
    if (bid.adserverTargeting) {
      return {
        [bid.adUnitCode]: standardKeys.map(key => {
          return {
            [`${key}_${bid.bidderCode}`]: [bid.adserverTargeting[key]]
          };
        })
      };
    }
  }).filter(bid => bid);
}

/**
 * Set query string targeting on all GPT ad units.
 * @alias module:pbjs.setTargetingForGPTAsync
 */
pbjs.setTargetingForGPTAsync = function (codeArr) {
  window.googletag.pubads().getSlots().forEach(slot => slot.setTargeting('pubKey', 'do not remove'));
  const presetTargeting = getPresetTargeting();
  const winningBidTargeting = getWinningBidTargeting();
  const bidLandscapeTargeting = getBidLandscapeTargeting();

  var debug = presetTargeting.concat(winningBidTargeting, bidLandscapeTargeting);
  window.googletag.pubads().getSlots().forEach(slot => {
    debug.filter(targeting => Object.keys(targeting)[0] === slot.getAdUnitPath())
      .forEach(targeting => targeting[Object.keys(targeting)[0]].forEach(key => {
        key[Object.keys(key)[0]].forEach(value => slot.setTargeting(Object.keys(key)[0], value));
      }));
  });

  //var debug = Object.assign(
  //  getPresetTargeting(),
  //  getWinningBidTargeting()
  //);

  utils.logInfo('Invoking pbjs.setTargetingForGPTAsync', arguments);
  //pbjs.setTargetingForAdUnitsGPTAsync(codeArr);
};

/**
 * Returns a bool if all the bids have returned or timed out
 * @alias module:pbjs.allBidsAvailable
 * @return {bool} all bids available
 */
pbjs.allBidsAvailable = function () {
  utils.logInfo('Invoking pbjs.allBidsAvailable', arguments);
  return bidmanager.allBidsBack();
};

/**
 * This function will render the ad (based on params) in the given iframe document passed through. Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchrounsly
 * @param  {object} doc document
 * @param  {string} id bid id to locate the ad
 * @alias module:pbjs.renderAd
 */
pbjs.renderAd = function (doc, id) {
  utils.logInfo('Invoking pbjs.renderAd', arguments);
  utils.logMessage('Calling renderAd with adId :' + id);
  if (doc && id) {
    try {
      //lookup ad by ad Id
      var adObject = pbjs._bidsReceived.find(bid => bid.adId === id);
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
 *  @deprecated - will be removed next release. Use pbjs.requestBids
 */
pbjs.requestBidsForAdUnit = function (adUnitCode) {
  resetBids();
  init(adUnitCode);

};

/**
 * @deprecated - will be removed next release. Use pbjs.requestBids
 */
pbjs.requestBidsForAdUnits = function (adUnitsObj) {
  if (!adUnitsObj || adUnitsObj.constructor !== Array) {
    utils.logError('requestBidsForAdUnits must pass an array of adUnits');
    return;
  }

  resetBids();
  var adUnitBackup = pbjs.adUnits.slice(0);
  pbjs.adUnits = adUnitsObj;
  init();
  pbjs.adUnits = adUnitBackup;

};

/**
 * Remove adUnit from the pbjs configuration
 * @param  {String} adUnitCode the adUnitCode to remove
 * @alias module:pbjs.removeAdUnit
 */
pbjs.removeAdUnit = function (adUnitCode) {
  utils.logInfo('Invoking pbjs.removeAdUnit', arguments);
  if (adUnitCode) {
    for (var i = 0; i < pbjs.adUnits.length; i++) {
      if (pbjs.adUnits[i].code === adUnitCode) {
        pbjs.adUnits.splice(i, 1);
      }
    }
  }
};

/**
 *
 * @param bidsBackHandler
 * @param timeout
 */
pbjs.requestBids = function ({ bidsBackHandler, timeout }) {
  const cbTimeout = timeout || pbjs.bidderTimeout;

  if (typeof bidsBackHandler === objectType_function) {
    bidmanager.addOneTimeCallback(bidsBackHandler);
  }

  utils.logInfo('Invoking pbjs.requestBids', arguments);

  // not sure of this logic
  if (!pbjs.adUnits && pbjs.adUnits.length !== 0) {
    utils.logMessage('No adUnits configured. No bids requested.');
    return;
  }

  //set timeout for all bids
  setTimeout(bidmanager.executeCallback, cbTimeout);

  adaptermanager.callBids();
};

/**
 *
 * Add adunit(s)
 * @param {Array|String} adUnitArr Array of adUnits or single adUnit Object.
 * @alias module:pbjs.addAdUnits
 */
pbjs.addAdUnits = function (adUnitArr) {
  utils.logInfo('Invoking pbjs.addAdUnits', arguments);
  if (utils.isArray(adUnitArr)) {
    //append array to existing
    pbjs.adUnits.push.apply(pbjs.adUnits, adUnitArr);
  } else if (typeof adUnitArr === objectType_object) {
    pbjs.adUnits.push(adUnitArr);
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
pbjs.onEvent = function (event, handler, id) {
  utils.logInfo('Invoking pbjs.onEvent', arguments);
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
 * @param {String} id an identifier in the context of the event (see `pbjs.onEvent`)
 */
pbjs.offEvent = function (event, handler, id) {
  utils.logInfo('Invoking pbjs.offEvent', arguments);
  if (id && !eventValidators[event].call(null, id)) {
    return;
  }

  events.off(event, handler, id);
};

/**
 * Add a callback event
 * @param {String} eventStr event to attach callback to Options: "allRequestedBidsBack" | "adUnitBidsBack"
 * @param {Function} func  function to execute. Paramaters passed into the function: (bidResObj), [adUnitCode]);
 * @alias module:pbjs.addCallback
 * @returns {String} id for callback
 */
pbjs.addCallback = function (eventStr, func) {
  utils.logInfo('Invoking pbjs.addCallback', arguments);
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
 * @alias module:pbjs.removeCallback
 * @returns {String} id for callback
 */
pbjs.removeCallback = function (/* cbId */) {
  //todo
  return null;
};

/**
 * Wrapper to register bidderAdapter externally (adaptermanager.registerBidAdapter())
 * @param  {[type]} bidderAdaptor [description]
 * @param  {[type]} bidderCode    [description]
 * @return {[type]}               [description]
 */
pbjs.registerBidAdapter = function (bidderAdaptor, bidderCode) {
  utils.logInfo('Invoking pbjs.registerBidAdapter', arguments);
  try {
    adaptermanager.registerBidAdapter(bidderAdaptor(), bidderCode);
  }
  catch (e) {
    utils.logError('Error registering bidder adapter : ' + e.message);
  }
};

/**
 *
 */
pbjs.bidsAvailableForAdapter = function (bidderCode) {
  utils.logInfo('Invoking pbjs.bidsAvailableForAdapter', arguments);
  //TODO getAd
  var bids = pb_bidderMap[bidderCode].bids;

  for (var i = 0; i < bids.length; i++) {
    var adunitCode = bids[i].placementCode;
    var responseObj = bidmanager.pbBidResponseByPlacement[adunitCode];

    var bid = bidfactory.createBid(1);

    // bid.creative_id = adId;
    bid.bidderCode = bidderCode;
    bid.adUnitCode = adunitCode;
    bid.bidder = bidderCode;

    // bid.cpm = responseCPM;
    // bid.adUrl = jptResponseObj.result.ad;
    // bid.width = jptResponseObj.result.width;
    // bid.height = jptResponseObj.result.height;
    // bid.dealId = jptResponseObj.result.deal_id;

    responseObj.bids.push(bid);
    responseObj.bidsReceivedCount++;
    bidmanager.pbBidResponseByPlacement[adunitCode] = responseObj;
  }

  bidmanager.increaseBidResponseReceivedCount(bidderCode);
};

/**
 * Wrapper to bidfactory.createBid()
 * @param  {[type]} statusCode [description]
 * @return {[type]}            [description]
 */
pbjs.createBid = function (statusCode) {
  utils.logInfo('Invoking pbjs.createBid', arguments);
  return bidfactory.createBid(statusCode);
};

/**
 * Wrapper to bidmanager.addBidResponse
 * @param {[type]} adUnitCode [description]
 * @param {[type]} bid        [description]
 */
pbjs.addBidResponse = function (adUnitCode, bid) {
  utils.logInfo('Invoking pbjs.addBidResponse', arguments);
  bidmanager.addBidResponse(adUnitCode, bid);
};

/**
 * Wrapper to adloader.loadScript
 * @param  {[type]}   tagSrc   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
pbjs.loadScript = function (tagSrc, callback, useCache) {
  utils.logInfo('Invoking pbjs.loadScript', arguments);
  adloader.loadScript(tagSrc, callback, useCache);
};

/**
 * This isn't ready yet
 * return data for analytics
 * @param  {Function}  [description]
 * @return {[type]}    [description]

 pbjs.getAnalyticsData = function(){
	var returnObj = {};
	var bidResponses = pbjs.getBidResponses();

	//create return obj for all adUnits
	for(var i=0;i<pbjs.adUnits.length;i++){
		var allBids = pbjs.adUnits[i].bids;
		for(var j=0;j<allBids.length;j++){
			var bid = allBids[j];
			if(typeof returnObj[bid.bidder] === objectType_undefined){
				returnObj[bid.bidder] = {};
				returnObj[bid.bidder].bids = [];
			}

			var returnBids = returnObj[bid.bidder].bids;
			var returnBidObj = {};
			returnBidObj.timeout = true;
			returnBids.push(returnBidObj);
		}
	}

	utils._each(bidResponses,function(responseByUnit, adUnitCode){
		var bids = responseByUnit.bids;

		for(var i=0; i<bids.length; i++){

			var bid = bids[i];
			if(bid.bidderCode!==''){
				var returnBids = returnObj[bid.bidderCode].bids;
				var returnIdx = 0;

				for(var j=0;j<returnBids.length;j++){
					if(returnBids[j].timeout)
						returnIdx = j;
				}

				var returnBidObj = {};

				returnBidObj.cpm = bid.cpm;
				returnBidObj.timeToRespond = bid.timeToRespond;

				//check winning
				if(pb_targetingMap[adUnitCode].hb_adid === bid.adId){
					returnBidObj.win = true;
				}else{
					returnBidObj.win = false;
				}

				returnBidObj.timeout = false;
				returnBids[returnIdx] = returnBidObj;
			}
		}
	});

	return returnObj;
};

 */

/**
 * Will enable sendinga prebid.js to data provider specified
 * @param  {object} options object {provider : 'string', options : {}}
 */
pbjs.enableAnalytics = function (options) {
  utils.logInfo('Invoking pbjs.enableAnalytics', arguments);
  if (!options) {
    utils.logError('pbjs.enableAnalytics should be called with option {}', 'prebid.js');
    return;
  }

  if (options.provider === 'ga') {
    try {
      ga.enableAnalytics(typeof options.options === 'undefined' ? {} : options.options);
    }
    catch (e) {
      utils.logError('Error calling GA: ', 'prebid.js', e);
    }
  } else if (options.provider === 'other_provider') {
    //todo
    return null;
  }
};

/**
 * This will tell analytics that all bids received after are "timed out"
 */
pbjs.sendTimeoutEvent = function () {
  utils.logInfo('Invoking pbjs.sendTimeoutEvent', arguments);
  timeOutBidders();
};

pbjs.aliasBidder = function (bidderCode, alias) {
  utils.logInfo('Invoking pbjs.aliasBidder', arguments);
  if (bidderCode && alias) {
    adaptermanager.aliasBidAdapter(bidderCode, alias);
  } else {
    utils.logError('bidderCode and alias must be passed as arguments', 'pbjs.aliasBidder');
  }
};

pbjs.setPriceGranularity = function (granularity) {
  if (!granularity) {
    utils.logError('Prebid Error: no value passed to `setPriceGranularity()`');
  } else {
    bidmanager.setPriceGranularity(granularity);
  }
};

pbjs.enableSendAllBids = function () {
  pb_sendAllBids = true;
};

pbjs.getBidRequest = function (bidId) {
  // look at optimizing this
  return pbjs._bidsRequested.map(bidSet => bidSet.bids.find(bid => bid.bidId === bidId))
    .find(bid => bid)[0];
};

processQue();
