import { uniques, findBidderRequestByBidId } from './utils';

var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');
var events = require('./events');

var objectType_function = 'function';

var externalCallbackByAdUnitArr = [];
var externalCallbackArr = [];
var externalOneTimeCallback = null;
var _granularity = CONSTANTS.GRANULARITY_OPTIONS.MEDIUM;
var defaultBidderSettingsMap = {};

const _lgPriceCap = 5.00;
const _mgPriceCap = 20.00;
const _hgPriceCap = 20.00;

/**
 * Returns a list of bidders that we haven't received a response yet
 * @return {array} [description]
 */
exports.getTimedOutBidders = function (auction) {
  return auction.getBidderRequests()
    .map(getBidderCode)
    .filter(uniques)
    .filter(bidder => auction.getBidsReceived()
      .map(getBidders)
      .filter(uniques)
      .indexOf(bidder) < 0);
};

function timestamp() { return new Date().getTime(); }

function getBidderCode(bidderRequest) {
  return bidderRequest.bidderCode;
}

function getBidders(bid) {
  return bid.bidder;
}

function bidsBackForAdUnit(adUnitCode, auction) {
  const requested = auction.getAdUnits().find(unit => unit.code === adUnitCode).bids.length;
  const received = auction.getBidsReceived().filter(bid => bid.adUnitCode === adUnitCode).length;
  return requested === received;
}

function sum(a, b) {
  return a + b;
}

function bidsBackAll(auction) {
  const requested = auction.getBidderRequests().map(bidderRequest => bidderRequest.bids.length).reduce(sum);
  const received = auction.getBidsReceived().length;
  return requested === received;
}

// exports object

exports.bidsBackForAdUnit = function() {
  return bidsBackForAdUnit(...arguments);
};

/*
 *   This function should be called to by the bidder adapter to register a bid response
 */
exports.addBidResponse = function (adUnitCode, bid) {
  var auction;

  if (bid && bid.bidId) {
    auction = pbjs.auctionManager.findAuctionByBidId(bid.bidId);
    auction = auction || pbjs.auctionManager.getSingleAuction();

    Object.assign(bid, {
      responseTimestamp: timestamp(),
      requestTimestamp: findBidderRequestByBidId(bid).start,
      cpm: bid.cpm || 0,
      bidder: bid.bidderCode,
      adUnitCode
    });
    bid.timeToRespond = bid.responseTimestamp - bid.requestTimestamp;

    //emit the bidAdjustment event before bidResponse, so bid response has the adjusted bid value
    events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, bid);

    //emit the bidResponse event
    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, bid);

    //append price strings
    const priceStringsObj = getPriceBucketString(bid.cpm, bid.height, bid.width);
    bid.pbLg = priceStringsObj.low;
    bid.pbMg = priceStringsObj.med;
    bid.pbHg = priceStringsObj.high;
    bid.pbAg = priceStringsObj.auto;
    bid.pbDg = priceStringsObj.dense;

    //if there is any key value pairs to map do here
    var keyValues = {};
    if (bid.bidderCode && bid.cpm !== 0) {
      keyValues = getKeyValueTargetingPairs(bid.bidderCode, bid);

      if (bid.dealId) {
        keyValues[`hb_deal_${bid.bidderCode}`] = bid.dealId;
      }

      bid.adserverTargeting = keyValues;
    }

    auction.getBidsReceived().push(bid);
  }

  if (bidsBackForAdUnit(bid.adUnitCode, auction)) {
    triggerAdUnitCallbacks(bid.adUnitCode, auction);
  }

  if (bidsBackAll(auction)) {
    this.executeCallback(auction);
  }

  if (bid.timeToRespond > pbjs.bidderTimeout) {

    events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, this.getTimedOutBidders(auction));
    this.executeCallback(auction);
  }
};

function getKeyValueTargetingPairs(bidderCode, custBidObj) {
  var keyValues = {};
  var bidder_settings = pbjs.bidderSettings || {};

  //1) set the keys from "standard" setting or from prebid defaults
  if (custBidObj && bidder_settings) {
    if (!bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD]) {
      bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD] = {
        adserverTargeting: [
          {
            key: 'hb_bidder',
            val: function (bidResponse) {
              return bidResponse.bidderCode;
            }
          }, {
            key: 'hb_adid',
            val: function (bidResponse) {
              return bidResponse.adId;
            }
          }, {
            key: 'hb_pb',
            val: function (bidResponse) {
              if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.AUTO) {
                return bidResponse.pbAg;
              } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.DENSE) {
                return bidResponse.pbDg;
              } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.LOW) {
                return bidResponse.pbLg;
              } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.MEDIUM) {
                return bidResponse.pbMg;
              } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.HIGH) {
                return bidResponse.pbHg;
              }
            }
          }, {
            key: 'hb_size',
            val: function (bidResponse) {
              return bidResponse.size;

            }
          }
        ]
      };
    }

    setKeys(keyValues, bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD], custBidObj);
  }

  //2) set keys from specific bidder setting override if they exist
  if (bidderCode && custBidObj && bidder_settings && bidder_settings[bidderCode] && bidder_settings[bidderCode][CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING]) {
    setKeys(keyValues, bidder_settings[bidderCode], custBidObj);
    custBidObj.alwaysUseBid = bidder_settings[bidderCode].alwaysUseBid;
  }

  //2) set keys from standard setting. NOTE: this API doesn't seem to be in use by any Adapter
  else if (defaultBidderSettingsMap[bidderCode]) {
    setKeys(keyValues, defaultBidderSettingsMap[bidderCode], custBidObj);
    custBidObj.alwaysUseBid = defaultBidderSettingsMap[bidderCode].alwaysUseBid;
  }

  return keyValues;
}

exports.getKeyValueTargetingPairs = function() {
  return getKeyValueTargetingPairs(...arguments);
};

function setKeys(keyValues, bidderSettings, custBidObj) {
  var targeting = bidderSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
  custBidObj.size = custBidObj.getSize();

  utils._each(targeting, function (kvPair) {
    var key = kvPair.key;
    var value = kvPair.val;

    if (keyValues[key]) {
      utils.logWarn('The key: ' + key + ' is getting ovewritten');
    }

    if (utils.isFn(value)) {
      try {
        keyValues[key] = value(custBidObj);
      } catch (e) {
        utils.logError('bidmanager', 'ERROR', e);
      }
    } else {
      keyValues[key] = value;
    }
  });

  return keyValues;
}

exports.setPriceGranularity = function setPriceGranularity(granularity) {
  var granularityOptions = CONSTANTS.GRANULARITY_OPTIONS;
  if (Object.keys(granularityOptions).filter(option => granularity === granularityOptions[option])) {
    _granularity = granularity;
  } else {
    utils.logWarn('Prebid Warning: setPriceGranularity was called with invalid setting, using' +
      ' `medium` as default.');
    _granularity = CONSTANTS.GRANULARITY_OPTIONS.MEDIUM;
  }
};

exports.registerDefaultBidderSetting = function (bidderCode, defaultSetting) {
  defaultBidderSettingsMap[bidderCode] = defaultSetting;
};

exports.executeCallback = function (auction) {
  if (externalCallbackArr.called !== true) {
    processCallbacks(externalCallbackArr, auction);
    externalCallbackArr.called = true;
  }

  //execute one time callback
  if (externalOneTimeCallback) {
    processCallbacks([externalOneTimeCallback], auction);
    externalOneTimeCallback = null;
  }

  pbjs.clearAuction();
};

function triggerAdUnitCallbacks(adUnitCode, auction) {
  processCallbacks(externalCallbackByAdUnitArr, auction);
}

function processCallbacks(callbackQueue, auction) {
  var i;
  if (utils.isArray(callbackQueue)) {
    for (i = 0; i < callbackQueue.length; i++) {
      var func = callbackQueue[i];
      func.call(pbjs, auction.getBidsReceived().reduce(groupByPlacement, {}));
    }
  }
}

/**
 * groupByPlacement is a reduce function that converts an array of Bid objects
 * to an object with placement codes as keys, with each key representing an object
 * with an array of `Bid` objects for that placement
 * @param prev previous value as accumulator object
 * @param item current array item
 * @param idx current index
 * @param arr the array being reduced
 * @returns {*} as { [adUnitCode]: { bids: [Bid, Bid, Bid] } }
 */
function groupByPlacement(prev, item, idx, arr) {
  // this uses a standard "array to map" operation that could be abstracted further
  if (item.adUnitCode in Object.keys(prev)) {
    // if the adUnitCode key is present in the accumulator object, continue
    return prev;
  } else {
    // otherwise add the adUnitCode key to the accumulator object and set to an object with an
    // array of Bids for that adUnitCode
    prev[item.adUnitCode] = {
      bids: arr.filter(bid => bid.adUnitCode === item.adUnitCode)
    };
    return prev;
  }
}

/**
 * Add a one time callback, that is discarded after it is called
 * @param {Function} callback [description]
 */
exports.addOneTimeCallback = function (callback) {
  externalOneTimeCallback = callback;
};

exports.addCallback = function (id, callback, cbEvent) {
  callback.id = id;
  if (CONSTANTS.CB.TYPE.ALL_BIDS_BACK === cbEvent) {
    externalCallbackArr.push(callback);
  } else if (CONSTANTS.CB.TYPE.AD_UNIT_BIDS_BACK === cbEvent) {
    externalCallbackByAdUnitArr.push(callback);
  }
};

//register event for bid adjustment
events.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, function (bid) {
  adjustBids(bid);
});

function adjustBids(bid) {
  var code = bid.bidderCode;
  var bidPriceAdjusted = bid.cpm;
  if (code && pbjs.bidderSettings && pbjs.bidderSettings[code]) {
    if (typeof pbjs.bidderSettings[code].bidCpmAdjustment === objectType_function) {
      try {
        bidPriceAdjusted = pbjs.bidderSettings[code].bidCpmAdjustment.call(null, bid.cpm);
      }
      catch (e) {
        utils.logError('Error during bid adjustment', 'bidmanager.js', e);
      }
    }
  }

  if (bidPriceAdjusted !== 0) {
    bid.cpm = bidPriceAdjusted;
  }
}

function getPriceBucketString(cpm) {
  var cpmFloat = 0;
  var returnObj = {
    low: '',
    med: '',
    high: '',
    auto: '',
    dense: ''
  };
  try {
    cpmFloat = parseFloat(cpm);
    if (cpmFloat) {
      //round to closest .5
      if (cpmFloat > _lgPriceCap) {
        returnObj.low = _lgPriceCap.toFixed(2);
      } else {
        returnObj.low = (Math.floor(cpm * 2) / 2).toFixed(2);
      }

      //round to closest .1
      if (cpmFloat > _mgPriceCap) {
        returnObj.med = _mgPriceCap.toFixed(2);
      } else {
        returnObj.med = (Math.floor(cpm * 10) / 10).toFixed(2);
      }

      //round to closest .01
      if (cpmFloat > _hgPriceCap) {
        returnObj.high = _hgPriceCap.toFixed(2);
      } else {
        returnObj.high = (Math.floor(cpm * 100) / 100).toFixed(2);
      }

      // round auto default sliding scale
      if (cpmFloat <= 5) {
        // round to closest .05
        returnObj.auto = (Math.floor(cpm * 20) / 20).toFixed(2);
      } else if (cpmFloat <= 10) {
        // round to closest .10
        returnObj.auto = (Math.floor(cpm * 10) / 10).toFixed(2);
      } else if (cpmFloat <= 20) {
        // round to closest .50
        returnObj.auto = (Math.floor(cpm * 2) / 2).toFixed(2);
      } else {
        // cap at 20.00
        returnObj.auto = '20.00';
      }

      // dense mode
      if (cpmFloat <= 3) {
        // round to closest .01
        returnObj.dense = (Math.floor(cpm * 100) / 100).toFixed(2);
      } else if (cpmFloat <= 8) {
        // round to closest .05
        returnObj.dense = (Math.floor(cpm * 20) / 20).toFixed(2);
      } else if (cpmFloat <= 20) {
        // round to closest .50
        returnObj.dense = (Math.floor(cpm * 2) / 2).toFixed(2);
      } else {
        // cap at 20.00
        returnObj.dense = '20.00';
      }
    }
  } catch (e) {
    this.logError('Exception parsing CPM :' + e.message);
  }

  return returnObj;
}
