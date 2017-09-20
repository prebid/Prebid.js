pbjsChunk([10],{

/***/ 239:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(240);


/***/ }),

/***/ 240:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(0);
var adloader = __webpack_require__(5);
var bidmanager = __webpack_require__(2);
var bidfactory = __webpack_require__(3);
var adaptermanager = __webpack_require__(1);
var WS_ADAPTER_VERSION = '1.0.3';

function WidespaceAdapter() {
  var useSSL = document.location.protocol === 'https:';
  var baseURL = (useSSL ? 'https:' : 'http:') + '//engine.widespace.com/map/engine/hb/dynamic?';
  var callbackName = 'pbjs.widespaceHandleCB';

  function _callBids(params) {
    var bids = params && params.bids || [];

    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      var callbackUid = bid.bidId;
      var sid = bid.params.sid;
      var currency = bid.params.cur || bid.params.currency;

      // Handle Sizes string
      var sizeQueryString = '';
      var parsedSizes = utils.parseSizesInput(bid.sizes);

      sizeQueryString = parsedSizes.reduce((function (prev, curr) {
        return prev ? prev + ',' + curr : curr;
      }), sizeQueryString);

      var requestURL = baseURL;
      requestURL = utils.tryAppendQueryString(requestURL, 'hb.ver', WS_ADAPTER_VERSION);

      var _params = {
        'hb': '1',
        'hb.name': 'prebidjs',
        'hb.callback': callbackName,
        'hb.callbackUid': callbackUid,
        'hb.sizes': sizeQueryString,
        'hb.currency': currency,
        'sid': sid
      };

      if (bid.params.demo) {
        var demoFields = ['gender', 'country', 'region', 'postal', 'city', 'yob'];
        for (var _i = 0; _i < demoFields.length; _i++) {
          if (!bid.params.demo[demoFields[_i]]) {
            continue;
          }
          _params['hb.demo.' + demoFields[_i]] = bid.params.demo[demoFields[_i]];
        }
      }

      requestURL += '#';

      var paramKeys = Object.keys(_params);

      for (var k = 0; k < paramKeys.length; k++) {
        var key = paramKeys[k];
        requestURL += key + '=' + _params[key] + '&';
      }

      // Expose the callback
      pbjs.widespaceHandleCB = window[callbackName] = handleCallback;

      adloader.loadScript(requestURL);
    }
  }

  // Handle our callback
  var handleCallback = function handleCallback(bidsArray) {
    if (!bidsArray) {
      return;
    }

    var bidObject = void 0;
    var bidCode = 'widespace';

    for (var i = 0, l = bidsArray.length; i < l; i++) {
      var bid = bidsArray[i];
      var placementCode = '';
      var validSizes = [];

      bid.sizes = { height: bid.height, width: bid.width };

      var inBid = utils.getBidRequest(bid.callbackUid);

      if (inBid) {
        bidCode = inBid.bidder;
        placementCode = inBid.placementCode;
        validSizes = inBid.sizes;
      }

      if (bid && bid.callbackUid && bid.status !== 'noad' && verifySize(bid.sizes, validSizes)) {
        bidObject = bidfactory.createBid(1);
        bidObject.bidderCode = bidCode;
        bidObject.cpm = bid.cpm;
        bidObject.cur = bid.currency;
        bidObject.creative_id = bid.adId;
        bidObject.ad = bid.code;
        bidObject.width = bid.width;
        bidObject.height = bid.height;
        bidmanager.addBidResponse(placementCode, bidObject);
      } else {
        bidObject = bidfactory.createBid(2);
        bidObject.bidderCode = bidCode;
        bidmanager.addBidResponse(placementCode, bidObject);
      }
    }

    function verifySize(bid, validSizes) {
      for (var j = 0, k = validSizes.length; j < k; j++) {
        if (bid.width === validSizes[j][0] && bid.height === validSizes[j][1]) {
          return true;
        }
      }
      return false;
    }
  };

  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new WidespaceAdapter(), 'widespace');

module.exports = WidespaceAdapter;

/***/ })

},[239]);