pbjsChunk([36],{

/***/ 183:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(184);


/***/ }),

/***/ 184:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(0);
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var ajax = __webpack_require__(6);
var CONSTANTS = __webpack_require__(4);
var adaptermanager = __webpack_require__(1);
var QUANTCAST_CALLBACK_URL = 'http://global.qc.rtb.quantserve.com:8080/qchb';

var QuantcastAdapter = function QuantcastAdapter() {
  var BIDDER_CODE = 'quantcast';

  var DEFAULT_BID_FLOOR = 0.0000000001;
  var bidRequests = {};

  var returnEmptyBid = function returnEmptyBid(bidId) {
    var bidRequested = utils.getBidRequest(bidId);
    if (!utils.isEmpty(bidRequested)) {
      var bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequested);
      bid.bidderCode = BIDDER_CODE;
      bidmanager.addBidResponse(bidRequested.placementCode, bid);
    }
  };

  // expose the callback to the global object:
  pbjs.handleQuantcastCB = function (responseText) {
    if (utils.isEmpty(responseText)) {
      return;
    }
    var response = null;
    try {
      response = JSON.parse(responseText);
    } catch (e) {
      // Malformed JSON
      utils.logError("Malformed JSON received from server - can't do anything here");
      return;
    }

    if (response === null || !response.hasOwnProperty('bids') || utils.isEmpty(response.bids)) {
      utils.logError("Sub-optimal JSON received from server - can't do anything here");
      return;
    }

    for (var i = 0; i < response.bids.length; i++) {
      var seatbid = response.bids[i];
      var key = seatbid.placementCode;
      var request = bidRequests[key];
      if (request === null || request === undefined) {
        return returnEmptyBid(seatbid.placementCode);
      }
      // This line is required since this is the field
      // that bidfactory.createBid looks for
      request.bidId = request.imp[0].placementCode;
      var responseBid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, request);

      responseBid.cpm = seatbid.cpm;
      responseBid.ad = seatbid.ad;
      responseBid.height = seatbid.height;
      responseBid.width = seatbid.width;
      responseBid.bidderCode = response.bidderCode;
      responseBid.requestId = request.requestId;
      responseBid.bidderCode = BIDDER_CODE;

      bidmanager.addBidResponse(request.bidId, responseBid);
    }
  };

  function callBids(params) {
    var bids = params.bids || [];
    if (bids.length === 0) {
      return;
    }

    var referrer = utils.getTopWindowUrl();
    var loc = utils.getTopWindowLocation();
    var domain = loc.hostname;
    var publisherId = 0;

    publisherId = '' + bids[0].params.publisherId;
    utils._each(bids, (function (bid) {
      var key = bid.placementCode;
      var bidSizes = [];
      utils._each(bid.sizes, (function (size) {
        bidSizes.push({
          'width': size[0],
          'height': size[1]
        });
      }));

      bidRequests[key] = bidRequests[key] || {
        'publisherId': publisherId,
        'requestId': bid.bidId,
        'bidId': bid.bidId,
        'site': {
          'page': loc.href,
          'referrer': referrer,
          'domain': domain
        },
        'imp': [{

          'banner': {
            'battr': bid.params.battr,
            'sizes': bidSizes
          },
          'placementCode': bid.placementCode,
          'bidFloor': bid.params.bidFloor || DEFAULT_BID_FLOOR
        }]
      };
    }));

    utils._each(bidRequests, (function (bidRequest) {
      ajax.ajax(QUANTCAST_CALLBACK_URL, pbjs.handleQuantcastCB, JSON.stringify(bidRequest), {
        method: 'POST',
        withCredentials: true
      });
    }));
  }

  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: callBids,
    QUANTCAST_CALLBACK_URL: QUANTCAST_CALLBACK_URL
  };
};

adaptermanager.registerBidAdapter(new QuantcastAdapter(), 'quantcast');

module.exports = QuantcastAdapter;

/***/ })

},[183]);