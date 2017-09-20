pbjsChunk([68],{

/***/ 113:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(114);


/***/ }),

/***/ 114:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _bidfactory = __webpack_require__(3);

var _bidmanager = __webpack_require__(2);

var _adaptermanager = __webpack_require__(1);

var _utils = __webpack_require__(0);

var _ajax = __webpack_require__(6);

var _constants = __webpack_require__(4);

function FeatureForwardAdapter() {
  var bidUrl = window.location.protocol + '//prmbdr.featureforward.com/newbidder/bidder1_prm.php?';
  var ajaxOptions = {
    method: 'POST',
    withCredentials: true,
    contentType: 'text/plain'
  };

  function _callBids(bidderRequest) {
    var i = 0;
    bidderRequest.bids.forEach((function (bidRequest) {
      try {
        while (bidRequest.sizes[i] !== undefined) {
          var params = _extends({}, environment(), bidRequest.params, { 'size': bidRequest.sizes[i] });
          var postRequest = JSON.stringify(params);
          var url = bidUrl;
          i++;
          (0, _ajax.ajax)(url, (function (bidResponse) {
            bidResponseAvailable(bidRequest, bidResponse);
          }), postRequest, ajaxOptions);
        }
      } catch (e) {
        // register passback on any exceptions while attempting to fetch response.
        (0, _utils.logError)('featureforward.requestBid', 'ERROR', e);
        bidResponseAvailable(bidRequest);
      }
    }));
  }

  function environment() {
    return {
      ca: 'BID',
      'if': 0,
      url: (0, _utils.getTopWindowLocation)().href,
      refurl: referrer(),
      ew: document.documentElement.clientWidth,
      eh: document.documentElement.clientHeight,
      ln: navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage
    };
  }

  function referrer() {
    try {
      return window.top.document.referrer;
    } catch (e) {
      return document.referrer;
    }
  }

  function bidResponseAvailable(bidRequest, rawResponse) {
    if (rawResponse) {
      var bidResponse = parse(rawResponse);
      if (bidResponse) {
        var bid = (0, _bidfactory.createBid)(_constants.STATUS.GOOD, bidRequest);
        bid.bidderCode = bidRequest.bidder;
        bid.cpm = bidResponse.bidCpm;
        bid.ad = bidResponse.html;
        bid.width = bidResponse.width;
        bid.height = bidResponse.height;
        (0, _bidmanager.addBidResponse)(bidRequest.placementCode, bid);
        return;
      }
    }
    var passback = (0, _bidfactory.createBid)(_constants.STATUS.NO_BID, bidRequest);
    passback.bidderCode = bidRequest.bidder;
    (0, _bidmanager.addBidResponse)(bidRequest.placementCode, passback);
  }

  function parse(rawResponse) {
    try {
      return JSON.parse(rawResponse);
    } catch (ex) {
      (0, _utils.logError)('featureforward.safeParse', 'ERROR', ex);
      return null;
    }
  }

  return {
    callBids: _callBids
  };
}

(0, _adaptermanager.registerBidAdapter)(new FeatureForwardAdapter(), 'featureforward');

module.exports = FeatureForwardAdapter;

/***/ })

},[113]);