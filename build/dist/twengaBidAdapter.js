pbjsChunk([17],{

/***/ 225:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(226);


/***/ }),

/***/ 226:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var CONSTANTS = __webpack_require__(4);
var utils = __webpack_require__(0);
var adloader = __webpack_require__(5);
var bidmanager = __webpack_require__(2);
var bidfactory = __webpack_require__(3);
var Adapter = __webpack_require__(7)['default'];
var adaptermanager = __webpack_require__(1);

function TwengaAdapter() {
  var baseAdapter = new Adapter('twenga');

  baseAdapter.callBids = function (params) {
    for (var i = 0; i < params.bids.length; i++) {
      var bidRequest = params.bids[i];
      var callbackId = bidRequest.bidId;
      adloader.loadScript(buildBidCall(bidRequest, callbackId));
    }
  };

  function buildBidCall(bid, callbackId) {
    var bidUrl = '//rtb.t.c4tw.net/Bid?';
    bidUrl = utils.tryAppendQueryString(bidUrl, 's', 'h');
    bidUrl = utils.tryAppendQueryString(bidUrl, 'callback', 'pbjs.handleTwCB');
    bidUrl = utils.tryAppendQueryString(bidUrl, 'callback_uid', callbackId);
    bidUrl = utils.tryAppendQueryString(bidUrl, 'referrer', utils.getTopWindowUrl());
    if (bid.params) {
      for (var key in bid.params) {
        var value = bid.params[key];
        switch (key) {
          case 'placementId':
            key = 'id';break;
          case 'siteId':
            key = 'sid';break;
          case 'publisherId':
            key = 'pid';break;
          case 'currency':
            key = 'cur';break;
          case 'bidFloor':
            key = 'min';break;
          case 'country':
            key = 'gz';break;
        }
        bidUrl = utils.tryAppendQueryString(bidUrl, key, value);
      }
    }

    var sizes = utils.parseSizesInput(bid.sizes);
    if (sizes.length > 0) {
      bidUrl = utils.tryAppendQueryString(bidUrl, 'size', sizes.join(','));
    }

    bidUrl += 'ta=1';

    // @if NODE_ENV='debug'
    utils.logMessage('bid request built: ' + bidUrl);

    // @endif

    // append a timer here to track latency
    bid.startTime = new Date().getTime();

    return bidUrl;
  }

  // expose the callback to the global object:
  pbjs.handleTwCB = function (bidResponseObj) {
    var bidCode;

    if (bidResponseObj && bidResponseObj.callback_uid) {
      var responseCPM;
      var id = bidResponseObj.callback_uid;
      var placementCode = '';
      var bidObj = utils.getBidRequest(id);
      if (bidObj) {
        bidCode = bidObj.bidder;

        placementCode = bidObj.placementCode;

        bidObj.status = CONSTANTS.STATUS.GOOD;
      }

      // @if NODE_ENV='debug'
      utils.logMessage('JSONP callback function called for ad ID: ' + id);

      // @endif
      var bid = [];
      if (bidResponseObj.result && bidResponseObj.result.cpm && bidResponseObj.result.cpm !== 0 && bidResponseObj.result.ad) {
        var result = bidResponseObj.result;

        responseCPM = parseInt(result.cpm, 10);

        // CPM response from /Bid is dollar/cent multiplied by 10000
        // in order to avoid using floats
        // switch CPM to "dollar/cent"
        responseCPM = responseCPM / 10000;

        var ad = result.ad.replace('%%WP%%', result.cpm);

        // store bid response
        // bid status is good (indicating 1)
        bid = bidfactory.createBid(1, bidObj);
        bid.creative_id = result.creative_id;
        bid.bidderCode = bidCode;
        bid.cpm = responseCPM;
        if (ad && (ad.lastIndexOf('http', 0) === 0 || ad.lastIndexOf('//', 0) === 0)) {
          bid.adUrl = ad;
        } else {
          bid.ad = ad;
        }
        bid.width = result.width;
        bid.height = result.height;

        bidmanager.addBidResponse(placementCode, bid);
      } else {
        // no response data
        // @if NODE_ENV='debug'
        utils.logMessage('No prebid response from Twenga for placement code ' + placementCode);

        // @endif
        // indicate that there is no bid for this placement
        bid = bidfactory.createBid(2, bidObj);
        bid.bidderCode = bidCode;
        bidmanager.addBidResponse(placementCode, bid);
      }
    } else {
      // no response data
      // @if NODE_ENV='debug'
      utils.logMessage('No prebid response for placement %%PLACEMENT%%');

      // @endif
    }
  };

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    buildBidCall: buildBidCall
  });
}

adaptermanager.registerBidAdapter(new TwengaAdapter(), 'twenga');

module.exports = TwengaAdapter;

/***/ })

},[225]);