pbjsChunk([56],{

/***/ 137:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(138);


/***/ }),

/***/ 138:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var utils = __webpack_require__(0);
var adaptermanager = __webpack_require__(1);

var JCMAdapter = function JCMAdapter() {
  window.pbjs = window.pbjs || {};
  window.pbjs.processJCMResponse = function (JCMResponse) {
    if (JCMResponse) {
      var JCMRespObj = JSON.parse(JCMResponse);
      if (JCMRespObj) {
        var bids = JCMRespObj.bids;
        for (var i = 0; i < bids.length; i++) {
          var bid = bids[i];
          var bidObject;
          if (bid.cpm > 0) {
            bidObject = bidfactory.createBid(1);
            bidObject.bidderCode = 'jcm';
            bidObject.cpm = bid.cpm;
            bidObject.ad = decodeURIComponent(bid.ad.replace(/\+/g, '%20'));
            bidObject.width = bid.width;
            bidObject.height = bid.height;
            bidmanager.addBidResponse(utils.getBidRequest(bid.callbackId).placementCode, bidObject);
          } else {
            bidObject = bidfactory.createBid(2);
            bidObject.bidderCode = 'jcm';
            bidmanager.addBidResponse(utils.getBidRequest(bid.callbackId).placementCode, bidObject);
          }
        }
      }
    }
  };

  function _callBids(params) {
    var BidRequest = {
      bids: []
    };

    for (var i = 0; i < params.bids.length; i++) {
      var adSizes = '';
      var bid = params.bids[i];
      for (var x = 0; x < bid.sizes.length; x++) {
        adSizes += utils.parseGPTSingleSizeArray(bid.sizes[x]);
        if (x !== bid.sizes.length - 1) {
          adSizes += ',';
        }
      }

      BidRequest.bids.push({
        'callbackId': bid.bidId,
        'siteId': bid.params.siteId,
        'adSizes': adSizes
      });
    }

    var JSONStr = JSON.stringify(BidRequest);
    var reqURL = document.location.protocol + '//media.adfrontiers.com/pq?t=hb&bids=' + encodeURIComponent(JSONStr);
    adloader.loadScript(reqURL);
  }

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new JCMAdapter(), 'jcm');

module.exports = JCMAdapter;

/***/ })

},[137]);