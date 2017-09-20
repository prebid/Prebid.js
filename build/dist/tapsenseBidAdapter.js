pbjsChunk([22],{

/***/ 215:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(216);


/***/ }),

/***/ 216:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


// v0.0.1

var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var utils = __webpack_require__(0);
var adaptermanager = __webpack_require__(1);

var TapSenseAdapter = function TapSenseAdapter() {
  var version = '0.0.1';
  var creativeSizes = ['320x50'];
  var validParams = ['ufid', 'refer', 'ad_unit_id', // required
  'device_id', 'lat', 'long', 'user', // required
  'price_floor', 'test'];
  var SCRIPT_URL = 'https://ads04.tapsense.com/ads/headerad';
  var bids = void 0;
  pbjs.tapsense = {};
  function _callBids(params) {
    bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      var isValidSize = false;
      if (!bid.sizes || !bid.params.user || !bid.params.ad_unit_id) {
        return;
      }
      var parsedSizes = utils.parseSizesInput(bid.sizes);
      for (var k = 0; k < parsedSizes.length; k++) {
        if (creativeSizes.indexOf(parsedSizes[k]) > -1) {
          isValidSize = true;
          break;
        }
      }
      if (isValidSize) {
        var queryString = '?price=true&jsonp=1&callback=pbjs.tapsense.callback_with_price_' + bid.bidId + '&version=' + version + '&';
        pbjs.tapsense['callback_with_price_' + bid.bidId] = generateCallback(bid.bidId);
        var keys = Object.keys(bid.params);
        for (var j = 0; j < keys.length; j++) {
          if (validParams.indexOf(keys[j]) < 0) continue;
          queryString += encodeURIComponent(keys[j]) + '=' + encodeURIComponent(bid.params[keys[j]]) + '&';
        }
        _requestBids(SCRIPT_URL + queryString);
      }
    }
  }

  function generateCallback(bidId) {
    return function tapsenseCallback(response, price) {
      var bidObj = void 0;
      if (response && price) {
        var bidReq = utils.getBidRequest(bidId);
        if (response.status.value === 'ok' && response.count_ad_units > 0) {
          bidObj = bidfactory.createBid(1, bidObj);
          bidObj.cpm = price;
          bidObj.width = response.width;
          bidObj.height = response.height;
          bidObj.ad = response.ad_units[0].html;
        } else {
          bidObj = bidfactory.createBid(2, bidObj);
        }
        bidObj.bidderCode = bidReq.bidder;
        bidmanager.addBidResponse(bidReq.placementCode, bidObj);
      } else {
        utils.logMessage('No prebid response');
      }
    };
  }

  function _requestBids(scriptURL) {
    adloader.loadScript(scriptURL);
  }

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new TapSenseAdapter(), 'tapsense');

module.exports = TapSenseAdapter;

/***/ })

},[215]);