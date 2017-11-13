pbjsChunk([7],{

/***/ 199:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(200);


/***/ }),

/***/ 200:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

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

var _cookie = __webpack_require__(201);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

var _config = __webpack_require__(8);

var _mediaTypes = __webpack_require__(13);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var getConfig = _config.config.getConfig;

var TYPE = _constants.S2S.SRC;
var cookieSetUrl = 'https://acdn.adnxs.com/cookieset/cs.js';
var _synced = false;

/**
 * Try to convert a value to a type.
 * If it can't be done, the value will be returned.
 *
 * @param {string} typeToConvert The target type. e.g. "string", "number", etc.
 * @param {*} value The value to be converted into typeToConvert.
 */
function tryConvertType(typeToConvert, value) {
  if (typeToConvert === 'string') {
    return value && value.toString();
  } else if (typeToConvert === 'number') {
    return Number(value);
  } else {
    return value;
  }
}

var tryConvertString = tryConvertType.bind(null, 'string');
var tryConvertNumber = tryConvertType.bind(null, 'number');

var paramTypes = {
  'appnexus': {
    'member': tryConvertString,
    'invCode': tryConvertString,
    'placementId': tryConvertNumber
  },
  'rubicon': {
    'accountId': tryConvertNumber,
    'siteId': tryConvertNumber,
    'zoneId': tryConvertNumber
  },
  'indexExchange': {
    'siteID': tryConvertNumber
  },
  'audienceNetwork': {
    'placementId': tryConvertString
  },
  'pubmatic': {
    'publisherId': tryConvertString,
    'adSlot': tryConvertString
  },
  'districtm': {
    'member': tryConvertString,
    'invCode': tryConvertString,
    'placementId': tryConvertNumber
  },
  'pulsepoint': {
    'cf': tryConvertString,
    'cp': tryConvertNumber,
    'ct': tryConvertNumber
  }
};

var _cookiesQueued = false;

/**
 * Bidder adapter for Prebid Server
 */
function PrebidServer() {
  var baseAdapter = new _adapter2['default']('prebidServer');
  var config = void 0;

  baseAdapter.setConfig = function (s2sconfig) {
    config = s2sconfig;
  };

  function convertTypes(adUnits) {
    adUnits.forEach((function (adUnit) {
      adUnit.bids.forEach((function (bid) {
        var types = paramTypes[bid.bidder] || [];
        Object.keys(types).forEach((function (key) {
          if (bid.params[key]) {
            var converted = types[key](bid.params[key]);
            if (converted !== bid.params[key]) {
              utils.logMessage('Mismatched type for Prebid Server : ' + bid.bidder + ' : ' + key + '. Required Type:' + types[key]);
            }
            bid.params[key] = converted;

            // don't send invalid values
            if (isNaN(bid.params[key])) {
              delete bid.params.key;
            }
          }
        }));
      }));
    }));
  }

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function (bidRequest) {
    var isDebug = !!getConfig('debug');
    var adUnits = utils.cloneJson(bidRequest.ad_units);
    adUnits.forEach((function (adUnit) {
      var videoMediaType = utils.deepAccess(adUnit, 'mediaTypes.video');
      if (videoMediaType) {
        // pbs expects a ad_unit.video attribute if the imp is video
        adUnit.video = _extends({}, videoMediaType);
        delete adUnit.mediaTypes;
        // default is assumed to be 'banner' so if there is a video type we assume video only until PBS can support multi format auction.
        adUnit.media_types = [_mediaTypes.VIDEO];
      }
    }));
    convertTypes(adUnits);
    var requestJson = {
      account_id: config.accountId,
      tid: bidRequest.tid,
      max_bids: config.maxBids,
      timeout_millis: config.timeout,
      secure: config.secure,
      url: utils.getTopWindowUrl(),
      prebid_version: '0.32.0',
      ad_units: adUnits.filter(hasSizes),
      is_debug: isDebug
    };

    // in case config.bidders contains invalid bidders, we only process those we sent requests for.
    var requestedBidders = requestJson.ad_units.map((function (adUnit) {
      return adUnit.bids.map((function (bid) {
        return bid.bidder;
      })).filter(utils.uniques);
    })).reduce(utils.flatten).filter(utils.uniques);
    function processResponse(response) {
      handleResponse(response, requestedBidders);
    }
    var payload = JSON.stringify(requestJson);
    (0, _ajax.ajax)(config.endpoint, processResponse, payload, {
      contentType: 'text/plain',
      withCredentials: true
    });
  };

  // at this point ad units should have a size array either directly or mapped so filter for that
  function hasSizes(unit) {
    return unit.sizes && unit.sizes.length;
  }

  /**
   * Run a cookie sync for the given type, url, and bidder
   *
   * @param {string} type the type of sync, "image", "redirect", "iframe"
   * @param {string} url the url to sync
   * @param {string} bidder name of bidder doing sync for
   */
  function doBidderSync(type, url, bidder) {
    if (!url) {
      utils.logError('No sync url for bidder "' + bidder + '": ' + url);
    } else if (type === 'image' || type === 'redirect') {
      utils.logMessage('Invoking image pixel user sync for bidder: "' + bidder + '"');
      utils.triggerPixel(url);
    } else if (type == 'iframe') {
      utils.logMessage('Invoking iframe user sync for bidder: "' + bidder + '"');
      utils.insertUserSyncIframe(url);
    } else {
      utils.logError('User sync type "' + type + '" not supported for bidder: "' + bidder + '"');
    }
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response, requestedBidders) {
    var result = void 0;
    try {
      result = JSON.parse(response);

      if (result.status === 'OK' || result.status === 'no_cookie') {
        if (result.bidder_status) {
          result.bidder_status.forEach((function (bidder) {
            if (bidder.no_cookie && !_cookiesQueued) {
              doBidderSync(bidder.usersync.type, bidder.usersync.url, bidder.bidder);
            }
          }));
        }

        // do client-side syncs if available
        requestedBidders.forEach((function (bidder) {
          var clientAdapter = _adaptermanager2['default'].getBidAdapter(bidder);
          if (clientAdapter && clientAdapter.registerSyncs) {
            clientAdapter.registerSyncs();
          }
        }));

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
            // From ORTB see section 4.2.3: adm Optional means of conveying ad markup in case the bid wins; supersedes the win notice if markup is included in both.
            if (bidObj.media_type === _mediaTypes.VIDEO) {
              bidObject.mediaType = _mediaTypes.VIDEO;
              if (bidObj.adm) {
                bidObject.vastXml = bidObj.adm;
              }
              if (bidObj.nurl) {
                bidObject.vastUrl = bidObj.nurl;
              }
            } else {
              if (bidObj.adm && bidObj.nurl) {
                bidObject.ad = bidObj.adm;
                bidObject.ad += utils.createTrackPixelHtml(decodeURIComponent(bidObj.nurl));
              } else if (bidObj.adm) {
                bidObject.ad = bidObj.adm;
              } else if (bidObj.nurl) {
                bidObject.adUrl = bidObj.nurl;
              }
            }

            bidObject.width = bidObj.width;
            bidObject.height = bidObj.height;
            bidObject.adserverTargeting = bidObj.ad_server_targeting;
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
        requestedBidders.forEach((function (bidder) {
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

    if (_synced) {
      return;
    }
    _synced = true;
    var payload = JSON.stringify({
      uuid: utils.generateUUID(),
      bidders: bidderCodes
    });
    (0, _ajax.ajax)(config.syncEndpoint, (function (response) {
      try {
        response = JSON.parse(response);
        response.bidder_status.forEach((function (bidder) {
          return doBidderSync(bidder.usersync.type, bidder.usersync.url, bidder.bidder);
        }));
      } catch (e) {
        utils.logError(e);
      }
    }), payload, {
      contentType: 'text/plain',
      withCredentials: true
    });
  };

  return _extends(this, {
    queueSync: baseAdapter.queueSync,
    setConfig: baseAdapter.setConfig,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    type: TYPE
  });
}

_adaptermanager2['default'].registerBidAdapter(new PrebidServer(), 'prebidServer');

module.exports = PrebidServer;

/***/ }),

/***/ 201:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _adloader = __webpack_require__(5);

var _adloader2 = _interopRequireDefault(_adloader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var cookie = exports;

cookie.cookieSet = function (cookieSetUrl) {
  if (!utils.isSafariBrowser()) {
    return;
  }
  _adloader2['default'].loadScript(cookieSetUrl, null, true);
};

/***/ })

},[199]);