pbjsChunk([57],{

/***/ 135:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(136);


/***/ }),

/***/ 136:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var utils = __webpack_require__(0);
var CONSTANTS = __webpack_require__(4);
var adaptermanager = __webpack_require__(1);

var InnityAdapter = function InnityAdapter() {
  function _callBids(params) {
    var bidURL;
    var bids = params.bids || [];
    var requestURL = window.location.protocol + '//as.innity.com/synd/?cb=' + new Date().getTime() + '&ver=2&hb=1&output=js&';
    for (var i = 0; i < bids.length; i++) {
      var requestParams = {};
      var bid = bids[i];
      requestParams.pub = bid.params.pub;
      requestParams.zone = bid.params.zone;
      // Page URL
      requestParams.url = utils.getTopWindowUrl();
      // Sizes
      var parseSized = utils.parseSizesInput(bid.sizes);
      var arrSize = parseSized[0].split('x');
      requestParams.width = arrSize[0];
      requestParams.height = arrSize[1];
      // Callback function
      requestParams.callback = 'pbjs._doInnityCallback';
      // Callback ID
      requestParams.callback_uid = bid.bidId;
      // Load Bidder URL
      bidURL = requestURL + utils.parseQueryStringParameters(requestParams);
      utils.logMessage('Innity.prebid, Bid ID: ' + bid.bidId + ', Pub ID: ' + bid.params.pub + ', Zone ID: ' + bid.params.zone + ', URL: ' + bidURL);
      adloader.loadScript(bidURL);
    }
  }

  pbjs._doInnityCallback = function (response) {
    var bidObject;
    var bidRequest;
    var callbackID;
    var libURL = window.location.protocol + '//cdn.innity.net/frame_util.js';
    callbackID = response.callback_uid;
    bidRequest = utils.getBidRequest(callbackID);
    if (response.cpm > 0) {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidRequest);
      bidObject.bidderCode = 'innity';
      bidObject.cpm = parseFloat(response.cpm) / 100;
      bidObject.ad = '<script src="' + libURL + '"></script>' + response.tag;
      bidObject.width = response.width;
      bidObject.height = response.height;
    } else {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequest);
      bidObject.bidderCode = 'innity';
      utils.logMessage('No Bid response from Innity request: ' + callbackID);
    }
    bidmanager.addBidResponse(bidRequest.placementCode, bidObject);
  };

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new InnityAdapter(), 'innity');

module.exports = InnityAdapter;

/***/ })

},[135]);