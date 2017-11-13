pbjsChunk([18],{

/***/ 97:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(98);
module.exports = __webpack_require__(99);


/***/ }),

/***/ 98:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spec = exports.ENDPOINT = undefined;

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _bidderFactory = __webpack_require__(9);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var ENDPOINT = exports.ENDPOINT = '//reachms.bfmio.com/bid.json?exchange_id=';

var spec = exports.spec = {
  code: 'beachfront',
  supportedMediaTypes: ['video'],

  isBidRequestValid: function isBidRequestValid(bid) {
    return !!(bid && bid.params && bid.params.appId && bid.params.bidfloor);
  },
  buildRequests: function buildRequests(bids) {
    return bids.map((function (bid) {
      return {
        method: 'POST',
        url: ENDPOINT + bid.params.appId,
        data: createRequestParams(bid),
        bidRequest: bid
      };
    }));
  },
  interpretResponse: function interpretResponse(response, _ref) {
    var bidRequest = _ref.bidRequest;

    response = response.body;
    if (!response || !response.url || !response.bidPrice) {
      utils.logWarn('No valid bids from ' + spec.code + ' bidder');
      return [];
    }
    var size = getSize(bidRequest.sizes);
    return {
      requestId: bidRequest.bidId,
      bidderCode: spec.code,
      cpm: response.bidPrice,
      creativeId: response.cmpId,
      vastUrl: response.url,
      width: size.width,
      height: size.height,
      mediaType: 'video',
      currency: 'USD',
      ttl: 300,
      netRevenue: true
    };
  }
};

function getSize(sizes) {
  var parsedSizes = utils.parseSizesInput(sizes);

  var _ref2 = parsedSizes.length ? parsedSizes[0].split('x') : [],
      _ref3 = _slicedToArray(_ref2, 2),
      width = _ref3[0],
      height = _ref3[1];

  return {
    width: parseInt(width, 10) || undefined,
    height: parseInt(height, 10) || undefined
  };
}

function isMobile() {
  return (/(ios|ipod|ipad|iphone|android)/i.test(global.navigator.userAgent)
  );
}

function isConnectedTV() {
  return (/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i.test(global.navigator.userAgent)
  );
}

function createRequestParams(bid) {
  var size = getSize(bid.sizes);
  return {
    isPrebid: true,
    appId: bid.params.appId,
    domain: document.location.hostname,
    imp: [{
      video: {
        w: size.width,
        h: size.height
      },
      bidfloor: bid.params.bidfloor
    }],
    site: {
      page: utils.getTopWindowLocation().host
    },
    device: {
      ua: global.navigator.userAgent,
      devicetype: isMobile() ? 1 : isConnectedTV() ? 3 : 2
    },
    cur: ['USD']
  };
}

(0, _bidderFactory.registerBidder)(spec);
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(30)))

/***/ }),

/***/ 99:
/***/ (function(module, exports) {



/***/ })

},[97]);