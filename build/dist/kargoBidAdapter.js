pbjsChunk([54],{

/***/ 141:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(142);


/***/ }),

/***/ 142:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var utils = __webpack_require__(0);
var adaptermanager = __webpack_require__(1);
var CONSTANTS = __webpack_require__(4);
var HOST = pbjs.kargo_kraken_host || 'https://krk.kargo.com';

var KargoAdapter = function KargoAdapter() {
  function _handleBid(bids) {
    return function wrappedHandleBid(adUnits) {
      utils._map(bids, (function (bid) {
        var adUnit = adUnits[bid.params.placementId];

        if (adUnit) {
          bidmanager.addBidResponse(bid.placementCode, _createBid(adUnit));

          if (adUnit.receivedTracker) {
            var el = document.createElement('img');
            el.src = adUnit.receivedTracker;
            document.body.appendChild(el);
          }
        }
      }));
    };
  }

  function _createBid(adUnit) {
    var bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
    bidObject.bidderCode = 'kargo';
    bidObject.cpm = Number(adUnit.cpm);
    bidObject.ad = adUnit.adm;
    bidObject.width = adUnit.width;
    bidObject.height = adUnit.height;
    return bidObject;
  }

  function _callBids(params) {
    var transformedParams = _extends({}, {
      timeout: params.timeout,
      currency: 'USD',
      cpmGranularity: 1,
      cpmRange: {
        floor: 0,
        ceil: 20
      },
      adSlotIds: utils._map(params.bids, (function (bid) {
        return bid.params.placementId;
      }))
    }, _getAllMetadata());
    var encodedParams = encodeURIComponent(JSON.stringify(transformedParams));
    var callbackName = 'kargo_prebid_' + params.requestId.replace(/-/g, '_');

    window.pbjs[callbackName] = _handleBid(params.bids);

    adloader.loadScript(HOST + '/api/v1/bid?json=' + encodedParams + '&cb=window.pbjs.' + callbackName);
  }

  function _readCookie(name) {
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
  }

  function _getCrbIds() {
    try {
      var crb = JSON.parse(decodeURIComponent(_readCookie('krg_crb')));
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
  }

  function _getUid() {
    try {
      var uid = JSON.parse(decodeURIComponent(_readCookie('krg_uid')));
      var vData = {};

      if (uid && uid.v) {
        vData = uid.v;
      }

      return vData;
    } catch (e) {
      return {};
    }
  }

  function _getKruxUserId() {
    return _getLocalStorageSafely('kxkar_user');
  }

  function _getKruxSegments() {
    return _getLocalStorageSafely('kxkar_segs');
  }

  function _getKrux() {
    var segmentsStr = _getKruxSegments();
    var segments = [];

    if (segmentsStr) {
      segments = segmentsStr.split(',');
    }

    return {
      userID: _getKruxUserId(),
      segments: segments
    };
  }

  function _getLocalStorageSafely(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function _getUserIds() {
    var uid = _getUid();
    var crbIds = _getCrbIds();

    return {
      kargoID: uid.userId,
      clientID: uid.clientId,
      crbIDs: crbIds,
      optOut: uid.optOut
    };
  }

  function _getAllMetadata() {
    return {
      userIDs: _getUserIds(),
      krux: _getKrux(),
      pageURL: window.location.href
    };
  }

  // Export the callBids function, so that prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new KargoAdapter(), 'kargo');

module.exports = KargoAdapter;

/***/ })

},[141]);