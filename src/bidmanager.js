import { uniques } from './utils';

var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');
var events = require('./events');
var bidfactory = require('./bidfactory.js');
var bidmanager = require('./bidmanager.js');

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

function getAdUnit(adUnitCode) {
  return $$PREBID_GLOBAL$$.adUnits.find(unit => unit.code === adUnitCode);
}
function updateLastModified(adUnitCode) {
  var adUnit = getAdUnit(adUnitCode);
  if (adUnit) {
    //introduce a new property here for now.
    //we could use the bidResponses to figure this value out
    //this value will be used in the cleanup handler
    adUnit._lastModified = timestamp();
  }
}

function bidsBackAdUnit(adUnitCode) {
  const requested = $$PREBID_GLOBAL$$.adUnits.find(unit => unit.code === adUnitCode).bids.length;
  const received = $$PREBID_GLOBAL$$._bidsReceived.filter(bid => bid.adUnitCode === adUnitCode).length;
  return requested === received;
}

function add(a, b) {
  return a + b;
}

function bidsBackAll() {
  const requested = $$PREBID_GLOBAL$$._bidsRequested.map(bidSet => bidSet.bids.length).reduce(add);
  const received = $$PREBID_GLOBAL$$._bidsReceived.length;
  return requested === received
    || received > requested;//late receivers from previous requestBids after a new requestBids 
}

exports.bidsBackAll = function() {
  return bidsBackAll();
};

function getGlobalBidResponse(request) {
  var resp = $$PREBID_GLOBAL$$._bidsReceived.find(bidSet => request.bidId === bidSet.adId);
  if (!resp) {
    resp = $$PREBID_GLOBAL$$._allReceivedBids.find(bidSet => request.bidId === bidSet.adId);
    //debugger;
  }
  return resp;
}

function getBidSetForBidder(bidder) {
  return $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === bidder) || { start: null, requestId: null };
}
function getBidSetForBidderGlobal(bidder, adUnitCode) {
  var bidRequest;
  var bidderObj = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === bidder);
  if (bidderObj && bidderObj.bids) {
    bidRequest = bidderObj.bids.find(bidRequest => bidRequest.placementCode === adUnitCode);
    if (bidRequest) {
      return { bidSet: bidderObj, request: bidRequest, response: getGlobalBidResponse(bidRequest) };
    }
  }
  for (var i = 0; i < $$PREBID_GLOBAL$$._allRequestedBids.length; i++) {
    bidderObj = $$PREBID_GLOBAL$$._allRequestedBids[i];
    if (bidderObj.bidderCode === bidder) {
      for (var j in bidderObj.bids) {
        bidRequest = bidderObj.bids[j];
        if (bidderObj.bids[j].placementCode === adUnitCode) {
          //debugger;
          if (bidRequest) {
            return { bidSet: bidderObj, request: bidRequest, response: getGlobalBidResponse(bidRequest) };
          }
        }
      }
    }
  }
  return { bidSet: { start: null, requestId: null }, request: null, response: null };
}
/*
 *   This function should be called to by the bidder adapter to register a bid response
 */
exports.addBidResponse = function (adUnitCode, bid) {
  if (bid) {
    //first lookup bid request and assign it back the bidId if it matches the adUnitCode
    let bidRequest = getBidSetForBidderGlobal(bid.bidderCode, adUnitCode);
    var origBid;
    if (bidRequest.response) {
      if (bidRequest.response.getStatusCode() === 3 && bid.getStatusCode() !== 1) {
        //bid already timed out, and new bid doesn't add value
        //debugger;
        return;
      }
      //if reached here, the bid was timed out before, but received a valid responsive after this time
      //keeping the books complete, but we won't trigger the callbacks
      //debugger;
      origBid = bid;
      bid = bidRequest.response;
      var bidClone = Object.assign({}, bid);
      Object.assign(bid, origBid);
      Object.assign(bid, {
        statusMessage: bidClone.statusMessage,
      });
    }
    if (bidRequest.request && bidRequest.request.bidId) {
      bid.adId = bidRequest.request.bidId;
    }
    Object.assign(bid, {
      requestId: bidRequest.bidSet.requestId,
      responseTimestamp: timestamp(),
      requestTimestamp: bidRequest.bidSet.start,
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
    //don't add if a response already exists
    if (!bidRequest.response)
      $$PREBID_GLOBAL$$._bidsReceived.push(bid);

    if (bidRequest.response) {
      //abort, these callbacks are already been called, due to timeout conditions
      return;
    }
    if (bidsBackAdUnit(bid.adUnitCode)) {
      console.log("callback adunit complete: " + bid.adUnitCode);
      triggerAdUnitCallbacks(bid.adUnitCode);
      updateLastModified(bid.adUnitCode);
    } else {
      //debugger;
      bidsBackAdUnit(bid.adUnitCode);
      console.log("adunit not complete yet: " + bid.adUnitCode);
    }
  }

  if (bidsBackAll()) {
    this.executeCallback();
  }

  if (bid.timeToRespond > $$PREBID_GLOBAL$$.bidderTimeout) {

    events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, this.getTimedOutBidders());
    this.executeCallback();
  }
};

function getKeyValueTargetingPairs(bidderCode, custBidObj) {
  var keyValues = {};
  var bidder_settings = $$PREBID_GLOBAL$$.bidderSettings || {};

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
              } else  if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.DENSE) {
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

exports.executeCallback = function () {
  /*if (this !== bidmanager) {
    debugger; 
  }*/
  //if (this !== bidmanager) {

  //handling timed out bids
  //basically find all bid requests, which don't have a corresponding bidresponse
  //for each occurance add a dummy responsose with status=3 (time out)
  //please note that this purposely allow late bids still to arrive and still trigger the events (see addBidResponse), but not the callbacks.
  //the stutus of the bid currently remains status=3, even for late arravals, but will be updated with the most recent data (maybe add status=5, timeout but arrived late and is renderable or a seperate boolean, rendable)
  //in a nuttshell this also needed to trigger the adUnitsBidsBack callback, as that will only trigger if the requested amount matches the responded amount
  //hence we need fake/timed out responses  
  var resultIds = $$PREBID_GLOBAL$$._bidsReceived.map(bid => bid.adId);

  var timedoutBids = $$PREBID_GLOBAL$$._bidsRequested.reduce((arr, val) => { arr.push.apply(arr, val.bids.filter(bid => resultIds.indexOf(bid.bidId) === -1)); return arr; }, []);//.filter(bid => !resultIds.find(bid.bidId));  
  timedoutBids.map(bid => {
    //      debugger;
    var bidObj = bidfactory.createBid(3);
    bidObj.bidderCode = bid.bidder;
    bidmanager.addBidResponse(bid.placementCode, bidObj);
  });
  //if (timedoutBids.length > 0)
  //  debugger;
  //}
  if (externalCallbackArr.called !== true) {
    processCallbacks(externalCallbackArr);
    externalCallbackArr.called = true;
  }

  //execute one time callback
  if (externalOneTimeCallback) {
    processCallbacks([externalOneTimeCallback]);
    externalOneTimeCallback = null;
  }

  $$PREBID_GLOBAL$$.clearAuction();
};

function triggerAdUnitCallbacks(adUnitCode) {
  //todo : get bid responses and send in args
  var params = [adUnitCode];
  processCallbacks(externalCallbackByAdUnitArr, params);
}

function processCallbacks(callbackQueue, ...params) {
  var i;
  if (utils.isArray(callbackQueue)) {
    for (i = 0; i < callbackQueue.length; i++) {
      var func = callbackQueue[i];
      if (params.length > 0) {//etc.......
        //simple workaround if `triggerAdUnitCallbacks` passes the ad-unit code, the callback should receive the complete adunit-code
        //todo: refactor global/adunit-callbacks? or use apply?
        //debugger; 
        var x = $$PREBID_GLOBAL$$._bidsReceived.reduce(groupByPlacement, {});
        if (!(params[0] in x)) {
          debugger;//shouldn't happen, otherwise the request might already live in _allReceivedBids
        }
        func.call($$PREBID_GLOBAL$$, $$PREBID_GLOBAL$$._bidsReceived.reduce(groupByPlacement, {}), params[0]);
      } else
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

exports.removeCallback = function (id, callback, cbEvent) {
  var arr = [];
  if (CONSTANTS.CB.TYPE.ALL_BIDS_BACK === cbEvent) {
    arr = externalCallbackArr;
  } else if (CONSTANTS.CB.TYPE.AD_UNIT_BIDS_BACK === cbEvent) {
    arr = externalCallbackByAdUnitArr;
  }  
  for (var i = 0; i < arr.length; i++) {
    //id method never seems to be invoked, so it remains a function reference, ignore the id for now
    if (/*arr[i].id === id ||*/ arr[i] === callback) {
      arr.splice(i, 1);
      break;//assume only 1 occurance
    }
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
        bidPriceAdjusted = $$PREBID_GLOBAL$$.bidderSettings[code].bidCpmAdjustment.call(null, bid.cpm);
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
