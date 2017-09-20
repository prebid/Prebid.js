pbjsChunk([100],{

/***/ 42:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(43);


/***/ }),

/***/ 43:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

/*
 * Adapter for requesting bids from RTK Aardvark
 * To request an RTK Aardvark Header bidding account
 * or for additional integration support please contact sales@rtk.io
 */

var utils = __webpack_require__(0);
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var Adapter = __webpack_require__(7)['default'];
var constants = __webpack_require__(4);
var adaptermanager = __webpack_require__(1);

var AARDVARK_CALLBACK_NAME = 'aardvarkResponse';
var AARDVARK_REQUESTS_MAP = 'aardvarkRequests';
var AARDVARK_BIDDER_CODE = 'aardvark';
var DEFAULT_REFERRER = 'thor.rtk.io';
var DEFAULT_ENDPOINT = 'thor.rtk.io';

var endpoint = DEFAULT_ENDPOINT;

function requestBids(bidderCode, callbackName, bidReqs) {
  var ref = utils.getTopWindowLocation();
  var ai = '';
  var scs = [];
  var bidIds = [];

  ref = ref ? ref.host : DEFAULT_REFERRER;

  for (var i = 0, l = bidReqs.length, bid, _ai, _sc, _endpoint; i < l; i += 1) {
    bid = bidReqs[i];
    _ai = utils.getBidIdParameter('ai', bid.params);
    _sc = utils.getBidIdParameter('sc', bid.params);
    if (!_ai || !_ai.length || !_sc || !_sc.length) {
      continue;
    }

    _endpoint = utils.getBidIdParameter('host', bid.params);
    if (_endpoint) {
      endpoint = _endpoint;
    }

    if (!ai.length) {
      ai = _ai;
    }
    if (_sc) {
      scs.push(_sc);
    }

    bidIds.push(_sc + '=' + bid.bidId);

    // Create the bidIdsMap for easier mapping back later
    pbjs[AARDVARK_REQUESTS_MAP][bidderCode][bid.bidId] = bid;
  }

  if (!ai.length || !scs.length) {
    return utils.logWarn('Bad bid request params given for adapter $' + bidderCode + ' (' + AARDVARK_BIDDER_CODE + ')');
  }

  adloader.loadScript(['//' + endpoint + '/', ai, '/', scs.join('_'), '/aardvark/?jsonp=pbjs.', callbackName, '&rtkreferer=', ref, '&', bidIds.join('&')].join(''));
}

function registerBidResponse(bidderCode, rawBidResponse) {
  if (rawBidResponse.error) {
    return utils.logWarn('Aardvark bid received with an error, ignoring... [' + rawBidResponse.error + ']');
  }

  if (!rawBidResponse.cid) {
    return utils.logWarn('Aardvark bid received without a callback id, ignoring...');
  }

  var bidObj = pbjs[AARDVARK_REQUESTS_MAP][bidderCode][rawBidResponse.cid];
  if (!bidObj) {
    return utils.logWarn('Aardvark request not found: ' + rawBidResponse.cid);
  }

  if (bidObj.params.sc !== rawBidResponse.id) {
    return utils.logWarn('Aardvark bid received with a non matching shortcode ' + rawBidResponse.id + ' instead of ' + bidObj.params.sc);
  }

  var bidResponse = bidfactory.createBid(constants.STATUS.GOOD, bidObj);
  bidResponse.bidderCode = bidObj.bidder;
  bidResponse.cpm = rawBidResponse.cpm;
  bidResponse.ad = rawBidResponse.adm + utils.createTrackPixelHtml(decodeURIComponent(rawBidResponse.nurl));
  bidResponse.width = bidObj.sizes[0][0];
  bidResponse.height = bidObj.sizes[0][1];

  bidmanager.addBidResponse(bidObj.placementCode, bidResponse);
  pbjs[AARDVARK_REQUESTS_MAP][bidderCode][rawBidResponse.cid].responded = true;
}

function registerAardvarkCallback(bidderCode, callbackName) {
  pbjs[callbackName] = function (rtkResponseObj) {
    rtkResponseObj.forEach((function (bidResponse) {
      registerBidResponse(bidderCode, bidResponse);
    }));

    for (var bidRequestId in pbjs[AARDVARK_REQUESTS_MAP][bidderCode]) {
      if (pbjs[AARDVARK_REQUESTS_MAP][bidderCode].hasOwnProperty(bidRequestId)) {
        var bidRequest = pbjs[AARDVARK_REQUESTS_MAP][bidderCode][bidRequestId];
        if (!bidRequest.responded) {
          var bidResponse = bidfactory.createBid(constants.STATUS.NO_BID, bidRequest);
          bidResponse.bidderCode = bidRequest.bidder;
          bidmanager.addBidResponse(bidRequest.placementCode, bidResponse);
        }
      }
    }
  };
}

var AardvarkAdapter = function AardvarkAdapter() {
  var baseAdapter = new Adapter(AARDVARK_BIDDER_CODE);

  pbjs[AARDVARK_REQUESTS_MAP] = pbjs[AARDVARK_REQUESTS_MAP] || {};

  baseAdapter.callBids = function (params) {
    var bidderCode = baseAdapter.getBidderCode();
    var callbackName = AARDVARK_CALLBACK_NAME;

    if (bidderCode !== AARDVARK_BIDDER_CODE) {
      callbackName = [AARDVARK_CALLBACK_NAME, bidderCode].join('_');
    }

    pbjs[AARDVARK_REQUESTS_MAP][bidderCode] = {};

    registerAardvarkCallback(bidderCode, callbackName);

    return requestBids(bidderCode, callbackName, params.bids || []);
  };

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  });
};

adaptermanager.registerBidAdapter(new AardvarkAdapter(), 'aardvark');

module.exports = AardvarkAdapter;

/***/ })

},[42]);