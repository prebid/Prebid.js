import { uniques } from './utils';

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
exports.getTimedOutBidders = function () {
  return $$PREBID_GLOBAL$$._bidsRequested
    .map(getBidderCode)
    .filter(uniques)
    .filter(bidder => $$PREBID_GLOBAL$$._bidsReceived
      .map(getBidders)
      .filter(uniques)
      .indexOf(bidder) < 0);
};

function timestamp() { return new Date().getTime(); }

function getBidderCode(bidSet) {
  return bidSet.bidderCode;
}

function getBidders(bid) {
  return bid.bidder;
}

function bidsBackAdUnit(adUnitCode) {
  let requested = $$PREBID_GLOBAL$$.adUnits.find(unit => unit.code === adUnitCode);
  if (requested) {requested = requested.bids.length;}
  const received = $$PREBID_GLOBAL$$._bidsReceived.filter(bid => bid.adUnitCode === adUnitCode).length;
  return requested === received;
}

function add(a, b) {
  return a + b;
}

function bidsBackAll() {
  const requested = $$PREBID_GLOBAL$$._bidsRequested.map(bidSet => bidSet.bids.length).reduce(add, 0);
  const received = $$PREBID_GLOBAL$$._bidsReceived.length;
  return requested === received;
}

exports.bidsBackAll = function() {
  return bidsBackAll();
};

function getBidSetForBidder(bidder) {
  return $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === bidder) || { start: null, requestId: null };
}

/*
 *   This function should be called to by the bidder adapter to register a bid response
 */
exports.addBidResponse = function (adUnitCode, bid) {
  if (bid) {

    Object.assign(bid, {
      requestId: getBidSetForBidder(bid.bidderCode).requestId,
      responseTimestamp: timestamp(),
      requestTimestamp: getBidSetForBidder(bid.bidderCode).start,
      cpm: bid.cpm || 0,
      bidder: bid.bidderCode,
      adUnitCode
    });

    bid.timeToRespond = bid.responseTimestamp - bid.requestTimestamp;

    if (bid.timeToRespond > $$PREBID_GLOBAL$$.cbTimeout + $$PREBID_GLOBAL$$.timeoutBuffer) {
      const timedOut = true;

      this.executeCallback(timedOut);
    }

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

    $$PREBID_GLOBAL$$._bidsReceived.push(bid);
  }

  if (bid && bid.adUnitCode && bidsBackAdUnit(bid.adUnitCode)) {
    triggerAdUnitCallbacks(bid.adUnitCode);
  }

  if (bidsBackAll()) {
    this.executeCallback();
  }
};

function getKeyValueTargetingPairs(bidderCode, custBidObj) {
  var keyValues = {};
  var bidder_settings = $$PREBID_GLOBAL$$.bidderSettings;

  //1) set the keys from "standard" setting or from prebid defaults
  if (custBidObj && bidder_settings) {
    //initialize default if not set
    const standardSettings = getStandardBidderSettings();
    setKeys(keyValues, standardSettings, custBidObj);
  }

  //2) set keys from specific bidder setting override if they exist
  if (bidderCode && custBidObj && bidder_settings && bidder_settings[bidderCode] && bidder_settings[bidderCode][CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING]) {
    setKeys(keyValues, bidder_settings[bidderCode], custBidObj);
    custBidObj.alwaysUseBid = bidder_settings[bidderCode].alwaysUseBid;
    filterIfSendStandardTargeting(bidder_settings[bidderCode]);
  }

  //2) set keys from standard setting. NOTE: this API doesn't seem to be in use by any Adapter
  else if (defaultBidderSettingsMap[bidderCode]) {
    setKeys(keyValues, defaultBidderSettingsMap[bidderCode], custBidObj);
    custBidObj.alwaysUseBid = defaultBidderSettingsMap[bidderCode].alwaysUseBid;
    filterIfSendStandardTargeting(defaultBidderSettingsMap[bidderCode]);
  }

  function filterIfSendStandardTargeting(bidderSettings) {
    if (typeof bidderSettings.sendStandardTargeting !== "undefined" && bidder_settings[bidderCode].sendStandardTargeting === false) {
      for(var key in keyValues) {
        if(CONSTANTS.TARGETING_KEYS.indexOf(key) !== -1) {
          delete keyValues[key];
        }
      }
    }
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
        value = value(custBidObj);
      } catch (e) {
        utils.logError('bidmanager', 'ERROR', e);
      }
    }

    if (
      typeof bidderSettings.suppressEmptyKeys !== "undefined" && bidderSettings.suppressEmptyKeys === true &&
      (
        utils.isEmptyStr(value) ||
        value === null ||
        value === undefined
      )
    ) {
      utils.logInfo("suppressing empty key '" + key + "' from adserver targeting");
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

exports.executeCallback = function (timedOut) {
  if (externalCallbackArr.called !== true) {
    processCallbacks(externalCallbackArr);
    externalCallbackArr.called = true;

    if (timedOut) {
      const timedOutBidders = this.getTimedOutBidders();

      if (timedOutBidders.length) {
        events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, timedOutBidders);
      }
    }
  }

  //execute one time callback
  if (externalOneTimeCallback) {
    try {
      processCallbacks([externalOneTimeCallback]);
    }
    finally {
      externalOneTimeCallback = null;
      $$PREBID_GLOBAL$$.clearAuction();
    }
  }
};

function triggerAdUnitCallbacks(adUnitCode) {
  //todo : get bid responses and send in args
  var params = [adUnitCode];
  processCallbacks(externalCallbackByAdUnitArr, params);
}

function processCallbacks(callbackQueue) {
  var i;
  if (utils.isArray(callbackQueue)) {
    for (i = 0; i < callbackQueue.length; i++) {
      var func = callbackQueue[i];
      func.call($$PREBID_GLOBAL$$, $$PREBID_GLOBAL$$._bidsReceived.reduce(groupByPlacement, {}));
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
  if (code && $$PREBID_GLOBAL$$.bidderSettings && $$PREBID_GLOBAL$$.bidderSettings[code]) {
    if (typeof $$PREBID_GLOBAL$$.bidderSettings[code].bidCpmAdjustment === objectType_function) {
      try {
        bidPriceAdjusted = $$PREBID_GLOBAL$$.bidderSettings[code].bidCpmAdjustment.call(null, bid.cpm, utils.extend({}, bid));
      }
      catch (e) {
        utils.logError('Error during bid adjustment', 'bidmanager.js', e);
      }
    }
  }

  if (bidPriceAdjusted >= 0) {
    bid.cpm = bidPriceAdjusted;
  }
}

exports.adjustBids = function() {
  return adjustBids(...arguments);
};

function getStandardBidderSettings() {
  let bidder_settings = $$PREBID_GLOBAL$$.bidderSettings;
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
  return bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD];
}

function getStandardBidderAdServerTargeting() {
  return getStandardBidderSettings()[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
}

exports.getStandardBidderAdServerTargeting = getStandardBidderAdServerTargeting;

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
