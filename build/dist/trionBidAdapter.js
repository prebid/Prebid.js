pbjsChunk([19],{

/***/ 221:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(222);


/***/ }),

/***/ 222:
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

var BID_REQUEST_BASE_URL = 'https://in-appadvertising.com/api/bidRequest?';
var USER_SYNC_URL = 'https://in-appadvertising.com/api/userSync.js';

function TrionAdapter() {
  var baseAdapter = new Adapter('trion');
  var userTag = null;

  baseAdapter.callBids = function (params) {
    var bids = params.bids || [];

    if (!bids.length) {
      return;
    }

    if (!window.TRION_INT) {
      adloader.loadScript(USER_SYNC_URL, (function () {
        userTag = window.TRION_INT || {};
        userTag.pubId = utils.getBidIdParameter('pubId', bids[0].params);
        userTag.sectionId = utils.getBidIdParameter('sectionId', bids[0].params);
        if (!userTag.to) {
          getBids(bids);
        } else {
          setTimeout((function () {
            getBids(bids);
          }), userTag.to);
        }
      }), true);
    } else {
      userTag = window.TRION_INT;
      getBids(bids);
    }
  };

  function getBids(bids) {
    if (!userTag.int_t) {
      userTag.int_t = window.TR_INT_T || -1;
    }

    for (var i = 0; i < bids.length; i++) {
      var bidRequest = bids[i];
      var bidId = bidRequest.bidId;
      adloader.loadScript(buildTrionUrl(bidRequest, bidId));
    }
  }

  function buildTrionUrl(bid, bidId) {
    var pubId = utils.getBidIdParameter('pubId', bid.params);
    var sectionId = utils.getBidIdParameter('sectionId', bid.params);
    var re = utils.getBidIdParameter('re', bid.params);
    var url = utils.getTopWindowUrl();
    var sizes = utils.parseSizesInput(bid.sizes).join(',');

    var trionUrl = BID_REQUEST_BASE_URL;

    trionUrl = utils.tryAppendQueryString(trionUrl, 'callback', 'pbjs.handleTrionCB');
    trionUrl = utils.tryAppendQueryString(trionUrl, 'bidId', bidId);
    trionUrl = utils.tryAppendQueryString(trionUrl, 'pubId', pubId);
    trionUrl = utils.tryAppendQueryString(trionUrl, 'sectionId', sectionId);
    trionUrl = utils.tryAppendQueryString(trionUrl, 're', re);
    trionUrl = utils.tryAppendQueryString(trionUrl, 'slot', bid.placementCode);
    if (url) {
      trionUrl += 'url=' + url + '&';
    }
    if (sizes) {
      trionUrl += 'sizes=' + sizes + '&';
    }
    if (userTag) {
      trionUrl += 'tag=' + encodeURIComponent(JSON.stringify(userTag)) + '&';
    }

    // remove the trailing "&"
    if (trionUrl.lastIndexOf('&') === trionUrl.length - 1) {
      trionUrl = trionUrl.substring(0, trionUrl.length - 1);
    }

    return trionUrl;
  }

  // expose the callback to the global object:
  pbjs.handleTrionCB = function (trionResponseObj) {
    var bid;
    var bidObj = {};
    var placementCode = '';

    if (trionResponseObj && trionResponseObj.bidId) {
      var bidCode;
      var bidId = trionResponseObj.bidId;
      var result = trionResponseObj && trionResponseObj.result;

      bidObj = utils.getBidRequest(bidId);
      if (bidObj) {
        bidCode = bidObj.bidder;
        placementCode = bidObj.placementCode;
      }

      if (result && result.cpm && result.placeBid && result.ad) {
        var cpm = parseInt(result.cpm, 10) / 100;
        bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidObj);
        bid.bidderCode = bidCode;
        bid.cpm = cpm;
        bid.ad = result.ad;
        bid.width = result.width;
        bid.height = result.height;
      }
    }
    if (!bid) {
      bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidObj);
    }
    bidmanager.addBidResponse(placementCode, bid);
  };

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    buildTrionUrl: buildTrionUrl
  });
}

adaptermanager.registerBidAdapter(new TrionAdapter(), 'trion');

module.exports = TrionAdapter;

/***/ })

},[221]);