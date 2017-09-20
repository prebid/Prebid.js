pbjsChunk([93],{

/***/ 58:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(59);


/***/ }),

/***/ 59:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _utils = __webpack_require__(0);

var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var utils = __webpack_require__(0);
var CONSTANTS = __webpack_require__(4);
var adaptermanager = __webpack_require__(1);

/**
 * Adapter for requesting bids from AdMedia.
 *
 */
var AdmediaAdapter = function AdmediaAdapter() {
  function _callBids(params) {
    var bids;
    var bidderUrl = window.location.protocol + '//b.admedia.com/banner/prebid/bidder/?';
    bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var request_obj = {};
      var bid = bids[i];

      if (bid.params.aid) {
        request_obj.aid = bid.params.aid;
      } else {
        utils.logError('required param aid is missing', 'admedia');
        continue;
      }

      // optional page_url macro
      if (bid.params.page_url) {
        request_obj.page_url = bid.params.page_url;
      }

      // if set, return a test ad for all aids
      if (bid.params.test_ad === 1) {
        request_obj.test_ad = 1;
      }

      var parsedSizes = utils.parseSizesInput(bid.sizes);
      var parsedSizesLength = parsedSizes.length;
      if (parsedSizesLength > 0) {
        // first value should be "size"
        request_obj.size = parsedSizes[0];
        if (parsedSizesLength > 1) {
          // any subsequent values should be "promo_sizes"
          var promo_sizes = [];
          for (var j = 1; j < parsedSizesLength; j++) {
            promo_sizes.push(parsedSizes[j]);
          }

          request_obj.promo_sizes = promo_sizes.join(',');
        }
      }

      // detect urls
      request_obj.siteDomain = window.location.host;
      request_obj.sitePage = window.location.href;
      request_obj.siteRef = document.referrer;
      request_obj.topUrl = utils.getTopWindowUrl();

      request_obj.callback = 'pbjs';
      request_obj.callbackId = bid.bidId;

      var endpoint = bidderUrl + utils.parseQueryStringParameters(request_obj);

      // utils.logMessage('Admedia request built: ' + endpoint);

      adloader.loadScript(endpoint);
    }
  }

  // expose the callback to global object
  pbjs.admediaHandler = function (response) {
    var bidObject = {};
    var callback_id = response.callback_id;
    var placementCode = '';
    var bidObj = (0, _utils.getBidRequest)(callback_id);
    if (bidObj) {
      placementCode = bidObj.placementCode;
    }

    if (bidObj && response.cpm > 0 && !!response.ad) {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
      bidObject.bidderCode = bidObj.bidder;
      bidObject.cpm = parseFloat(response.cpm);
      bidObject.ad = response.ad;
      bidObject.width = response.width;
      bidObject.height = response.height;
    } else {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
      bidObject.bidderCode = bidObj.bidder;
      utils.logMessage('No prebid response from Admedia for placement code ' + placementCode);
    }

    bidmanager.addBidResponse(placementCode, bidObject);
  };

  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new AdmediaAdapter(), 'admedia');

module.exports = AdmediaAdapter;

/***/ })

},[58]);