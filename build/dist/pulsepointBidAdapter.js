pbjsChunk([38],{

/***/ 179:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(180);


/***/ }),

/***/ 180:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var utils = __webpack_require__(0);
var adaptermanager = __webpack_require__(1);

var PulsePointAdapter = function PulsePointAdapter() {
  var getJsStaticUrl = window.location.protocol + '//tag-st.contextweb.com/getjs.static.js';
  var bidUrl = window.location.protocol + '//bid.contextweb.com/header/tag';

  function _callBids(params) {
    if (typeof window.pp === 'undefined') {
      adloader.loadScript(getJsStaticUrl, (function () {
        bid(params);
      }), true);
    } else {
      bid(params);
    }
  }

  function bid(params) {
    var bids = params.bids;
    for (var i = 0; i < bids.length; i++) {
      var bidRequest = bids[i];
      requestBid(bidRequest);
    }
  }

  function requestBid(bidRequest) {
    try {
      var ppBidRequest = new window.pp.Ad(bidRequestOptions(bidRequest));
      ppBidRequest.display();
    } catch (e) {
      // register passback on any exceptions while attempting to fetch response.
      utils.logError('pulsepoint.requestBid', 'ERROR', e);
      bidResponseAvailable(bidRequest);
    }
  }

  function bidRequestOptions(bidRequest) {
    var callback = bidResponseCallback(bidRequest);
    var options = {
      cn: 1,
      ca: window.pp.requestActions.BID,
      cu: bidUrl,
      adUnitId: bidRequest.placementCode,
      callback: callback
    };
    for (var param in bidRequest.params) {
      if (bidRequest.params.hasOwnProperty(param)) {
        options[param] = bidRequest.params[param];
      }
    }
    return options;
  }

  function bidResponseCallback(bid) {
    return function (bidResponse) {
      bidResponseAvailable(bid, bidResponse);
    };
  }

  function bidResponseAvailable(bidRequest, bidResponse) {
    if (bidResponse) {
      var adSize = bidRequest.params.cf.toUpperCase().split('X');
      var bid = bidfactory.createBid(1, bidRequest);
      bid.bidderCode = bidRequest.bidder;
      bid.cpm = bidResponse.bidCpm;
      bid.ad = bidResponse.html;
      bid.width = adSize[0];
      bid.height = adSize[1];
      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    } else {
      var passback = bidfactory.createBid(2, bidRequest);
      passback.bidderCode = bidRequest.bidder;
      bidmanager.addBidResponse(bidRequest.placementCode, passback);
    }
  }

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new PulsePointAdapter(), 'pulsepoint');

module.exports = PulsePointAdapter;

/***/ })

},[179]);