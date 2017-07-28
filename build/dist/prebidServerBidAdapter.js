pbjsChunk([38],{

/***/ 141:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(142);


/***/ }),

/***/ 142:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _adapter = __webpack_require__(7);

var _adapter2 = _interopRequireDefault(_adapter);

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _ajax = __webpack_require__(6);

var _constants = __webpack_require__(4);

var _cookie = __webpack_require__(27);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var TYPE = _constants.S2S.SRC;
var cookieSetUrl = 'https://acdn.adnxs.com/cookieset/cs.js';

var paramTypes = {
  'appnexus': {
    'member': 'string',
    'invCode': 'string',
    'placementId': 'number'
  },
  'rubicon': {
    'accountId': 'number',
    'siteId': 'number',
    'zoneId': 'number'
  },
  'indexExchange': {
    'siteID': 'number'
  },
  'audienceNetwork': {
    'placementId': 'string'
  },
  'pubmatic': {
    'publisherId': 'string',
    'adSlot': 'string'
  }
};

var _cookiesQueued = false;

/**
 * Bidder adapter for Prebid Server
 */
function PrebidServer() {
  var baseAdapter = _adapter2['default'].createNew('prebidServer');
  var config = void 0;

  baseAdapter.setConfig = function (s2sconfig) {
    config = s2sconfig;
  };

  function convertTypes(adUnits) {
    adUnits.forEach((function (adUnit) {
      adUnit.bids.forEach((function (bid) {
        var types = paramTypes[bid.bidder] || [];
        Object.keys(types).forEach((function (key) {
          if (bid.params[key] && _typeof(bid.params[key]) !== types[key]) {
            // mismatch type. Try to fix
            utils.logMessage('Mismatched type for Prebid Server : ' + bid.bidder + ' : ' + key + '. Required Type:' + types[key]);
            bid.params[key] = tryConvertType(types[key], bid.params[key]);
            // don't send invalid values
            if (isNaN(bid.params[key])) {
              delete bid.params.key;
            }
          }
        }));
      }));
    }));
  }

  function tryConvertType(typeToConvert, value) {
    if (typeToConvert === 'string') {
      return value && value.toString();
    }
    if (typeToConvert === 'number') {
      return Number(value);
    }
  }

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function (bidRequest) {
    var isDebug = !!pbjs.logging;
    convertTypes(bidRequest.ad_units);
    var requestJson = {
      account_id: config.accountId,
      tid: bidRequest.tid,
      max_bids: config.maxBids,
      timeout_millis: config.timeout,
      url: utils.getTopWindowUrl(),
      prebid_version: '0.27.0-pre',
      ad_units: bidRequest.ad_units.filter(hasSizes),
      is_debug: isDebug
    };

    var payload = JSON.stringify(requestJson);
    (0, _ajax.ajax)(config.endpoint, handleResponse, payload, {
      contentType: 'text/plain',
      withCredentials: true
    });
  };

  // at this point ad units should have a size array either directly or mapped so filter for that
  function hasSizes(unit) {
    return unit.sizes && unit.sizes.length;
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    var result = void 0;
    try {
      result = JSON.parse(response);

      if (result.status === 'OK' || result.status === 'no_cookie') {
        if (result.bidder_status) {
          result.bidder_status.forEach((function (bidder) {
            if (bidder.no_cookie && !_cookiesQueued) {
              (0, _cookie.queueSync)({ bidder: bidder.bidder, url: bidder.usersync.url, type: bidder.usersync.type });
            }
          }));
        }

        if (result.bids) {
          result.bids.forEach((function (bidObj) {
            var bidRequest = utils.getBidRequest(bidObj.bid_id);
            var cpm = bidObj.price;
            var status = void 0;
            if (cpm !== 0) {
              status = _constants.STATUS.GOOD;
            } else {
              status = _constants.STATUS.NO_BID;
            }

            var bidObject = _bidfactory2['default'].createBid(status, bidRequest);
            bidObject.source = TYPE;
            bidObject.creative_id = bidObj.creative_id;
            bidObject.bidderCode = bidObj.bidder;
            bidObject.cpm = cpm;
            bidObject.ad = bidObj.adm;
            bidObject.width = bidObj.width;
            bidObject.height = bidObj.height;
            if (bidObj.deal_id) {
              bidObject.dealId = bidObj.deal_id;
            }

            _bidmanager2['default'].addBidResponse(bidObj.code, bidObject);
          }));
        }

        var receivedBidIds = result.bids ? result.bids.map((function (bidObj) {
          return bidObj.bid_id;
        })) : [];

        // issue a no-bid response for every bid request that can not be matched with received bids
        config.bidders.forEach((function (bidder) {
          utils.getBidderRequestAllAdUnits(bidder).bids.filter((function (bidRequest) {
            return !receivedBidIds.includes(bidRequest.bidId);
          })).forEach((function (bidRequest) {
            var bidObject = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bidRequest);
            bidObject.source = TYPE;
            bidObject.adUnitCode = bidRequest.placementCode;
            bidObject.bidderCode = bidRequest.bidder;

            _bidmanager2['default'].addBidResponse(bidObject.adUnitCode, bidObject);
          }));
        }));
      }
      if (result.status === 'no_cookie' && config.cookieSet) {
        // cookie sync
        (0, _cookie.cookieSet)(cookieSetUrl);
      }
    } catch (error) {
      utils.logError(error);
    }

    if (!result || result.status && result.status.includes('Error')) {
      utils.logError('error parsing response: ', result.status);
    }
  }
  /**
   * @param  {} {bidders} list of bidders to request user syncs for.
   */
  baseAdapter.queueSync = function (_ref) {
    var bidderCodes = _ref.bidderCodes;

    if (!_cookiesQueued) {
      _cookiesQueued = true;
      var payload = JSON.stringify({
        uuid: utils.generateUUID(),
        bidders: bidderCodes
      });
      (0, _ajax.ajax)(config.syncEndpoint, (function (response) {
        try {
          response = JSON.parse(response);
          response.bidder_status.forEach((function (bidder) {
            return (0, _cookie.queueSync)({ bidder: bidder.bidder, url: bidder.usersync.url, type: bidder.usersync.type });
          }));
        } catch (e) {
          utils.logError(e);
        }
      }), payload, {
        contentType: 'text/plain',
        withCredentials: true
      });
    }
  };

  return {
    queueSync: baseAdapter.queueSync,
    setConfig: baseAdapter.setConfig,
    createNew: PrebidServer.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type: TYPE
  };
}

PrebidServer.createNew = function () {
  return new PrebidServer();
};

_adaptermanager2['default'].registerBidAdapter(new PrebidServer(), 'prebidServer');

module.exports = PrebidServer;

/***/ })

},[141]);