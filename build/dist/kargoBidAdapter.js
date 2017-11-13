pbjsChunk([11],{

/***/ 162:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(163);
module.exports = __webpack_require__(164);


/***/ }),

/***/ 163:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spec = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _config = __webpack_require__(8);

var _bidderFactory = __webpack_require__(9);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var BIDDER_CODE = 'kargo';
var HOST = 'https://krk.kargo.com';
var spec = exports.spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function isBidRequestValid(bid) {
    if (!bid || !bid.params) {
      return false;
    }
    return !!bid.params.placementId;
  },
  buildRequests: function buildRequests(validBidRequests, bidderRequest) {
    var currency = _config.config.getConfig('currency');
    var transformedParams = _extends({}, {
      timeout: bidderRequest.timeout,
      currency: currency,
      cpmGranularity: 1,
      cpmRange: {
        floor: 0,
        ceil: 20
      },
      adSlotIds: utils._map(validBidRequests, (function (bid) {
        return bid.params.placementId;
      }))
    }, spec._getAllMetadata());
    var encodedParams = encodeURIComponent(JSON.stringify(transformedParams));
    return _extends({}, bidderRequest, {
      method: 'GET',
      url: HOST + '/api/v1/bid',
      data: 'json=' + encodedParams,
      currency: currency
    });
  },
  interpretResponse: function interpretResponse(response, bidRequest) {
    var adUnits = response.body;
    var bids = {};
    utils._each(bidRequest.bids, (function (bid) {
      return bids[bid.params.placementId] = bid;
    }));
    var bidResponses = [];
    for (var adUnitId in adUnits) {
      var adUnit = adUnits[adUnitId];
      bidResponses.push({
        requestId: bids[adUnitId].bidId,
        cpm: Number(adUnit.cpm),
        width: adUnit.width,
        height: adUnit.height,
        ad: adUnit.adm,
        ttl: 300,
        creativeId: adUnitId,
        netRevenue: true,
        currency: bidRequest.currency
      });
    }
    return bidResponses;
  },

  // PRIVATE
  _readCookie: function _readCookie(name) {
    var nameEquals = name + '=';
    var cookies = document.cookie.split(';');

    for (var key in cookies) {
      var cookie = cookies[key];
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1, cookie.length);
      }

      if (cookie.indexOf(nameEquals) === 0) {
        return cookie.substring(nameEquals.length, cookie.length);
      }
    }

    return null;
  },
  _getCrbIds: function _getCrbIds() {
    try {
      var crb = JSON.parse(decodeURIComponent(spec._readCookie('krg_crb')));
      var syncIds = {};

      if (crb && crb.v) {
        var vParsed = JSON.parse(atob(crb.v));

        if (vParsed && vParsed.syncIds) {
          syncIds = vParsed.syncIds;
        }
      }

      return syncIds;
    } catch (e) {
      return {};
    }
  },
  _getUid: function _getUid() {
    try {
      var uid = JSON.parse(decodeURIComponent(spec._readCookie('krg_uid')));
      var vData = {};

      if (uid && uid.v) {
        vData = uid.v;
      }

      return vData;
    } catch (e) {
      return {};
    }
  },
  _getKruxUserId: function _getKruxUserId() {
    return spec._getLocalStorageSafely('kxkar_user');
  },
  _getKruxSegments: function _getKruxSegments() {
    return spec._getLocalStorageSafely('kxkar_segs');
  },
  _getKrux: function _getKrux() {
    var segmentsStr = spec._getKruxSegments();
    var segments = [];

    if (segmentsStr) {
      segments = segmentsStr.split(',');
    }

    return {
      userID: spec._getKruxUserId(),
      segments: segments
    };
  },
  _getLocalStorageSafely: function _getLocalStorageSafely(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  _getUserIds: function _getUserIds() {
    var uid = spec._getUid();
    var crbIds = spec._getCrbIds();

    return {
      kargoID: uid.userId,
      clientID: uid.clientId,
      crbIDs: crbIds,
      optOut: uid.optOut
    };
  },
  _getAllMetadata: function _getAllMetadata() {
    return {
      userIDs: spec._getUserIds(),
      krux: spec._getKrux(),
      pageURL: window.location.href,
      rawCRB: spec._readCookie('krg_crb')
    };
  }
};
(0, _bidderFactory.registerBidder)(spec);

/***/ }),

/***/ 164:
/***/ (function(module, exports) {



/***/ })

},[162]);