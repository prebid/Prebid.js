var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');
var events = require('./events');

var objectType_function = 'function';
var objectType_undefined = 'undefined';

var externalCallbackByAdUnitArr = [];
var externalCallbackArr = [];
var externalOneTimeCallback = null;

const _lgPriceCap = 5.00;
const _mgPriceCap = 20.00;
const _hgPriceCap = 20.00;

//var pbCallbackMap = {};
//exports.pbCallbackMap = pbCallbackMap;

//var pbBidResponseByPlacement = {};
//exports.pbBidResponseByPlacement = pbBidResponseByPlacement;

//this is used to look up the bid by bid ID later
//var _adResponsesByBidderId = {};
//exports._adResponsesByBidderId = _adResponsesByBidderId;

//var bidResponseReceivedCount = {};
//exports.bidResponseReceivedCount = bidResponseReceivedCount;

//var expectedBidsCount = {};
var _allBidsAvailable = false;
var _callbackExecuted = false;
var _granularity = CONSTANTS.GRANULARITY_OPTIONS.MEDIUM;
var defaultBidderSettingsMap = {};

//var bidderStartTimes = {};

//exports.getPlacementIdByCBIdentifer = function (id) {
//  return pbCallbackMap[id];
//};

//exports.getBidResponseByAdUnit = function () {
//  return pbBidResponseByPlacement;
//
//};

//exports.clearAllBidResponses = function () {
//  _allBidsAvailable = false;
//  _callbackExecuted = false;

  //init bid response received count
  //initbidResponseReceivedCount();

  //init expected bids count
  //initExpectedBidsCount();

  //clear the callback handler flag
//  externalCallbackArr.called = false;
//
//  for (var prop in this.pbBidResponseByPlacement) {
//    delete this.pbBidResponseByPlacement[prop];
//  }
//};

/**
 * Returns a list of bidders that we haven't received a response yet
 * @return {array} [description]
 */
exports.getTimedOutBidders = function () {
  return pbjs._bidsRequested
    .map(bid => bid.bidderCode)
    .filter((bidder, index, bidders) => bidders.indexOf(bidder) === index)
    .filter(bidder => pbjs._bidsReceived.map(bid => bid.bidder).indexOf(bidder) < 0);
};

//function initbidResponseReceivedCount() {
//
//  //bidResponseReceivedCount = {};
//  for (var prop in bidResponseReceivedCount) {
//    delete bidResponseReceivedCount[prop];
//  }
//
//  for (var i = 0; i < pbjs.adUnits.length; i++) {
//    var bids = pbjs.adUnits[i].bids;
//    for (var j = 0; j < bids.length; j++) {
//      var bidder = bids[j].bidder;
//      bidResponseReceivedCount[bidder] = 0;
//    }
//  }
//}

//exports.increaseBidResponseReceivedCount = function (bidderCode) {
//  increaseBidResponseReceivedCount(bidderCode);
//};

//function increaseBidResponseReceivedCount(bidderCode) {
//  if (typeof bidResponseReceivedCount[bidderCode] === objectType_undefined) {
//    bidResponseReceivedCount[bidderCode] = 1;
//  } else {
//    bidResponseReceivedCount[bidderCode]++;
//  }
//}
//
//function initExpectedBidsCount() {
//  expectedBidsCount = {};
//}
//
//exports.setExpectedBidsCount = function (bidderCode, count) {
//  expectedBidsCount[bidderCode] = count;
//};
//
//function getExpectedBidsCount(bidderCode) {
//  return expectedBidsCount[bidderCode];
//}
//
//exports.getExpectedBidsCount = getExpectedBidsCount;

function timestamp() { return new Date().getTime(); }

function bidsBackAdUnit(adUnitCode) {
  const requested = pbjs.adUnits.find(unit => unit.code === adUnitCode).bids.length;
  const received = pbjs._bidsReceived.filter(bid => bid.adUnitCode === adUnitCode).length;
  return requested === received;
}

function bidsBackAll() {
  const requested = pbjs.adUnits.map(unit => unit.bids.length).reduce((prev, curr) => curr + prev);
  const received = pbjs._bidsReceived.length;
  return requested === received;
}

/*
 *   This function should be called to by the bidder adapter to register a bid response
 */
exports.addBidResponse = function (adUnitCode, bid) {
  if (bid) {
    Object.assign(bid, {
      responseTimestamp: timestamp(),
      requestTimestamp: pbjs._bidsRequested.find(bidRequest => bidRequest.bidderCode === bid.bidderCode).start,
      cpm: bid.cpm || 0,
      bidder: bid.bidderCode,
      adUnitCode
    });
    bid.timeToRespond = bid.responseTimestamp - bid.requestTimestamp;

    //record bid request and response time
    //bid.requestTimestamp = bidderStartTimes[bid.bidderCode];
    //bid.responseTimestamp = timestamp();
    //bid.timeToRespond = bid.responseTimestamp - bid.requestTimestamp;

    //increment the bid count
    //increaseBidResponseReceivedCount(bid.bidderCode);

    //get price settings here
    //if (bid.getStatusCode() === 2) {
    //  bid.cpm = 0;
    //}

    // alias the bidderCode to bidder;
    // NOTE: this is to match documentation
    // on custom k-v targeting
    //bid.bidder = bid.bidderCode;

    //emit the bidAdjustment event before bidResponse, so bid response has the adjusted bid value
    events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, bid);

    //emit the bidResponse event
    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, adUnitCode, bid);

    const priceStringsObj = getPriceBucketString(bid.cpm, bid.height, bid.width);

    //append price strings
    bid.pbLg = priceStringsObj.low;
    bid.pbMg = priceStringsObj.med;
    bid.pbHg = priceStringsObj.high;
    bid.pbAg = priceStringsObj.auto;

    //put adUnitCode into bid
    //bid.adUnitCode = adUnitCode;

    //if there is any key value pairs to map do here
    var keyValues = {};
    if (bid.bidderCode && bid.cpm !== 0) {
      keyValues = getKeyValueTargetingPairs(bid.bidderCode, bid);
      bid.adserverTargeting = keyValues;
    }

    pbjs._bidsReceived.push(bid);

    //store a reference to the bidResponse by adId
    //if (bid.adId) {
    //  _adResponsesByBidderId[bid.adId] = bid;
    //}

    //store by placement ID
    //if (adUnitCode && pbBidResponseByPlacement[adUnitCode] && !utils.isEmpty(pbBidResponseByPlacement[adUnitCode])) {
    //  //update bid response object
    //  bidResponseObj = pbBidResponseByPlacement[adUnitCode];
    //
    //  //bidResponseObj.status = statusCode;
    //  bidResponseObj.bids.push(bid);
    //
    //  //increment bid response by placement
    //  bidResponseObj.bidsReceivedCount++;
    //
    //} else {
    //  //should never reach this code
    //  utils.logError('Internal error in bidmanager.addBidResponse. Params: ' + adUnitCode + ' & ' + bid);
    //}

  }

  if (bidsBackAdUnit(bid.adUnitCode)) {
    triggerAdUnitCallbacks(bid.adUnitCode);
  }

  if (bidsBackAll()) {
    this.executeCallback();
  }

  if (bid.timeToRespond > pbjs.bidderTimeout) {

    events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, this.getTimedOutBidders());
    this.executeCallback();
  }

  //else {
  //  //create an empty bid bid response object
  //  bidResponseObj = {
  //    bids: [],
  //    allBidsAvailable: false,
  //    bidsReceivedCount: 0
  //  };
  //}

  //store the bidResponse in a map
  //pbBidResponseByPlacement[adUnitCode] = bidResponseObj;

  //this.checkIfAllBidsAreIn(adUnitCode);

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

//exports.registerBidRequestTime = function (bidderCode, time) {
//  bidderStartTimes[bidderCode] = time;
//};

exports.executeCallback = function () {
  //var params = [];

  //this pbjs.registerBidCallbackHandler will be deprecated soon
  //if (typeof pbjs.registerBidCallbackHandler === objectType_function && !_callbackExecuted) {
  //  try {
  //    pbjs.registerBidCallbackHandler();
  //    _callbackExecuted = true;
  //  } catch (e) {
  //    _callbackExecuted = true;
  //    utils.logError('Exception trying to execute callback handler registered : ' + e.message);
  //  }
  //}

  //trigger allBidsBack handler
  //todo: get args
  if (externalCallbackArr.called !== true) {
    processCallbacks(externalCallbackArr);
    externalCallbackArr.called = true;
  }

  //execute one time callback
  if (externalOneTimeCallback) {
    //var responseObj = pbjs.getBidResponses();

    processCallbacks(externalOneTimeCallback);
    externalOneTimeCallback = null;
  }

};

//exports.allBidsBack = function () {
//  return _allBidsAvailable;
//};

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
      func.call(pbjs, pbjs._bidsReceived);
    }
  } else {
    callbackQueue.call(pbjs, pbjs._bidsReceived);
  }

}

function callFunction(func, args) {
  if (typeof func === 'function') {
    try {
      func.apply(pbjs, args);

      //func.executed = true;
    }
    catch (e) {
      utils.logError('Error executing callback function: ' + e.message);
    }
  }
}

//function checkBidsBackByAdUnit(adUnitCode) {
//  for (var i = 0; i < pbjs.adUnits.length; i++) {
//    var adUnit = pbjs.adUnits[i];
//    if (adUnit.code === adUnitCode) {
//      var bidsBack = pbBidResponseByPlacement[adUnitCode].bidsReceivedCount;
//
//      //all bids back for ad unit
//      if (bidsBack === adUnit.bids.length) {
//        triggerAdUnitCallbacks(adUnitCode);
//
//      }
//    }
//  }
//}

/*
 *   This method checks if all bids have a response (bid, no bid, timeout) and will execute callback method if all bids are in
 *   TODO: Need to track bids by placement as well
 */

//exports.checkIfAllBidsAreIn = function (adUnitCode) {
//
//  _allBidsAvailable = checkAllBidsResponseReceived();
//
//  //check by ad units
//  checkBidsBackByAdUnit(adUnitCode);
//
//  if (_allBidsAvailable) {
//    //execute our calback method if it exists && pbjs.initAdserverSet !== true
//    this.executeCallback();
//  }
//};

// check all bids response received by bidder
//function checkAllBidsResponseReceived() {
//  var available = true;
//
//  utils._each(bidResponseReceivedCount, function (count, bidderCode) {
//    var expectedCount = getExpectedBidsCount(bidderCode);
//
//    // expectedCount should be set in the adapter, or it will be set
//    // after we call adapter.callBids()
//    if ((typeof expectedCount === objectType_undefined) || (count < expectedCount)) {
//      available = false;
//    }
//  });
//
//  return available;
//}

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
  //var low = '';
  //var med = '';
  //var high = '';
  //var auto = '';

  var cpmFloat = 0;
  var returnObj = {
    low: '',
    med: '',
    high: '',
    auto: ''
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
    }
  } catch (e) {
    this.logError('Exception parsing CPM :' + e.message);
  }

  return returnObj;

};