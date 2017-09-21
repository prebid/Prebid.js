pbjsChunk([55],{

/***/ 150:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(151);


/***/ }),

/***/ 151:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var utils = __webpack_require__(0);
var CONSTANTS = __webpack_require__(4);
var adaptermanager = __webpack_require__(1);

var KummaAdapter = function KummaAdapter() {
  function _callBids(params) {
    var bidURL;
    var bids = params.bids || [];
    var requestURL = window.location.protocol + '//cdn.kumma.com/pb_ortb.js?cb=' + new Date().getTime() + '&ver=1&';

    for (var i = 0; i < bids.length; i++) {
      var requestParams = {};
      var bid = bids[i];

      requestParams.pub_id = bid.params.pubId;
      requestParams.site_id = bid.params.siteId;
      requestParams.placement_id = bid.placementCode;

      var parseSized = utils.parseSizesInput(bid.sizes);
      var arrSize = parseSized[0].split('x');

      requestParams.width = arrSize[0];
      requestParams.height = arrSize[1];
      requestParams.callback = 'pbjs._doKummaCallback';
      requestParams.callback_uid = bid.bidId;
      bidURL = requestURL + utils.parseQueryStringParameters(requestParams);

      utils.logMessage('Kumma.prebid, Bid ID: ' + bid.bidId + ', Pub ID: ' + bid.params.pubId);
      adloader.loadScript(bidURL);
    }
  }

  pbjs._doKummaCallback = function (response) {
    var bidObject;
    var bidRequest;
    var callbackID;
    callbackID = response.callback_uid;
    bidRequest = utils.getBidRequest(callbackID);
    if (response.cpm > 0) {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidRequest);
      bidObject.bidderCode = 'kumma';
      bidObject.cpm = response.cpm;
      bidObject.ad = response.tag;
      bidObject.width = response.width;
      bidObject.height = response.height;
    } else {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequest);
      bidObject.bidderCode = 'kumma';
      utils.logMessage('No Bid response from Kumma request: ' + callbackID);
    }
    bidmanager.addBidResponse(bidRequest.placementCode, bidObject);
  };

  return {
    callBids: _callBids
  };
};
adaptermanager.registerBidAdapter(new KummaAdapter(), 'kumma');

module.exports = KummaAdapter;

/***/ })

},[150]);