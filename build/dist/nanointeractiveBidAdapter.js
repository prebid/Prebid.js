pbjsChunk([9],{

/***/ 183:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(184);
module.exports = __webpack_require__(185);


/***/ }),

/***/ 184:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spec = exports.CATEGORY = exports.NQ_NAME = exports.NQ = exports.ALG = exports.DATA_PARTNER_PIXEL_ID = exports.DATA_PARTNER_ID = exports.SECURITY = exports.ENGINE_BASE_URL = exports.BIDDER_CODE = undefined;

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _bidderFactory = __webpack_require__(9);

var _mediaTypes = __webpack_require__(13);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var BIDDER_CODE = exports.BIDDER_CODE = 'nanointeractive';
var ENGINE_BASE_URL = exports.ENGINE_BASE_URL = 'http://tmp.audiencemanager.de/hb';

var SECURITY = exports.SECURITY = 'sec';
var DATA_PARTNER_ID = exports.DATA_PARTNER_ID = 'dpid';
var DATA_PARTNER_PIXEL_ID = exports.DATA_PARTNER_PIXEL_ID = 'pid';
var ALG = exports.ALG = 'alg';
var NQ = exports.NQ = 'nq';
var NQ_NAME = exports.NQ_NAME = 'name';
var CATEGORY = exports.CATEGORY = 'category';

var DEFAULT_ALG = 'ihr';

var spec = exports.spec = {

  code: BIDDER_CODE,
  supportedMediaTypes: [_mediaTypes.BANNER],

  isBidRequestValid: function isBidRequestValid(bid) {
    var sec = bid.params[SECURITY];
    var dpid = bid.params[DATA_PARTNER_ID];
    var pid = bid.params[DATA_PARTNER_PIXEL_ID];
    return !!(sec && dpid && pid);
  },
  buildRequests: function buildRequests(bidRequests) {
    var payload = [];
    bidRequests.forEach((function (bid) {
      return payload.push(createSingleBidRequest(bid));
    }));
    return {
      method: 'POST',
      url: ENGINE_BASE_URL,
      data: JSON.stringify(payload)
    };
  },
  interpretResponse: function interpretResponse(serverResponse) {
    var bids = [];
    serverResponse.forEach((function (serverBid) {
      if (isEngineResponseValid(serverBid)) {
        bids.push(createSingleBidResponse(serverBid));
      }
    }));
    return bids;
  }
};

function createSingleBidRequest(bid) {
  var _ref;

  return _ref = {}, _defineProperty(_ref, SECURITY, bid.params[SECURITY]), _defineProperty(_ref, DATA_PARTNER_ID, bid.params[DATA_PARTNER_ID]), _defineProperty(_ref, DATA_PARTNER_PIXEL_ID, bid.params[DATA_PARTNER_PIXEL_ID]), _defineProperty(_ref, ALG, bid.params[ALG] || DEFAULT_ALG), _defineProperty(_ref, NQ, [createNqParam(bid), createCategoryParam(bid)]), _defineProperty(_ref, 'sizes', bid.sizes.map((function (value) {
    return value[0] + 'x' + value[1];
  }))), _defineProperty(_ref, 'bidId', bid.bidId), _defineProperty(_ref, 'cors', location.origin), _ref;
}

function createSingleBidResponse(serverBid) {
  return {
    requestId: serverBid.id,
    cpm: serverBid.cpm,
    width: serverBid.width,
    height: serverBid.height,
    ad: serverBid.ad,
    ttl: serverBid.ttl,
    creativeId: serverBid.creativeId,
    netRevenue: serverBid.netRevenue || true,
    currency: serverBid.currency
  };
}

function createNqParam(bid) {
  return bid.params[NQ_NAME] ? utils.getParameterByName(bid.params[NQ_NAME]) : bid.params[NQ] || null;
}

function createCategoryParam(bid) {
  return bid.params[CATEGORY] || null;
}

function isEngineResponseValid(response) {
  return !!response.cpm && !!response.ad;
}

(0, _bidderFactory.registerBidder)(spec);

/***/ }),

/***/ 185:
/***/ (function(module, exports) {



/***/ })

},[183]);