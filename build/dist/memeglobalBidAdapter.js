pbjsChunk([48],{

/***/ 155:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(156);


/***/ }),

/***/ 156:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var CONSTANTS = __webpack_require__(4);
var utils = __webpack_require__(0);
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var adaptermanager = __webpack_require__(1);

var bidderName = 'memeglobal';
/**
 * Adapter for requesting bids from Meme Global Media Group
 * OpenRTB compatible
 */
var MemeGlobalAdapter = function MemeGlobalAdapter() {
  var bidder = 'stinger.memeglobal.com/api/v1/services/prebid';

  function _callBids(params) {
    var bids = params.bids;

    if (!bids) return;

    for (var i = 0; i < bids.length; i++) {
      _requestBid(bids[i]);
    }
  }

  function _requestBid(bidReq) {
    // build bid request object
    var domain = window.location.host;
    var page = window.location.host + window.location.pathname + location.search + location.hash;

    var tagId = utils.getBidIdParameter('tagid', bidReq.params);
    var bidFloor = Number(utils.getBidIdParameter('bidfloor', bidReq.params));
    var adW = 0;
    var adH = 0;

    var bidSizes = Array.isArray(bidReq.params.sizes) ? bidReq.params.sizes : bidReq.sizes;
    var sizeArrayLength = bidSizes.length;
    if (sizeArrayLength === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
      adW = bidSizes[0];
      adH = bidSizes[1];
    } else {
      adW = bidSizes[0][0];
      adH = bidSizes[0][1];
    }

    // build bid request with impressions
    var bidRequest = {
      id: utils.getUniqueIdentifierStr(),
      imp: [{
        id: bidReq.bidId,
        banner: {
          w: adW,
          h: adH
        },
        tagid: bidReq.placementCode,
        bidfloor: bidFloor
      }],
      site: {
        domain: domain,
        page: page,
        publisher: {
          id: tagId
        }
      }
    };

    var scriptUrl = '//' + bidder + '?callback=window.pbjs.mgres' + '&src=' + CONSTANTS.REPO_AND_VERSION + '&br=' + encodeURIComponent(JSON.stringify(bidRequest));
    adloader.loadScript(scriptUrl);
  }

  function getBidSetForBidder() {
    return pbjs._bidsRequested.find((function (bidSet) {
      return bidSet.bidderCode === bidderName;
    }));
  }

  // expose the callback to the global object:
  pbjs.mgres = function (bidResp) {
    // valid object?
    if (!bidResp || !bidResp.id || !bidResp.seatbid || bidResp.seatbid.length === 0 || !bidResp.seatbid[0].bid || bidResp.seatbid[0].bid.length === 0) {
      return;
    }

    bidResp.seatbid[0].bid.forEach((function (bidderBid) {
      var responseCPM;
      var placementCode = '';

      var bidSet = getBidSetForBidder();
      var bidRequested = bidSet.bids.find((function (b) {
        return b.bidId === bidderBid.impid;
      }));
      if (bidRequested) {
        var bidResponse = bidfactory.createBid(1);
        placementCode = bidRequested.placementCode;
        bidRequested.status = CONSTANTS.STATUS.GOOD;
        responseCPM = parseFloat(bidderBid.price);
        if (responseCPM === 0) {
          var bid = bidfactory.createBid(2);
          bid.bidderCode = bidderName;
          bidmanager.addBidResponse(placementCode, bid);
          return;
        }
        bidResponse.placementCode = placementCode;
        bidResponse.size = bidRequested.sizes;
        var responseAd = bidderBid.adm;
        var responseNurl = '<img src="' + bidderBid.nurl + '" height="0px" width="0px" style="display: none;">';
        bidResponse.creative_id = bidderBid.id;
        bidResponse.bidderCode = bidderName;
        bidResponse.cpm = responseCPM;
        bidResponse.ad = decodeURIComponent(responseAd + responseNurl);
        bidResponse.width = parseInt(bidderBid.w);
        bidResponse.height = parseInt(bidderBid.h);
        bidmanager.addBidResponse(placementCode, bidResponse);
      }
    }));
  };

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new MemeGlobalAdapter(), 'memeglobal');

module.exports = MemeGlobalAdapter;

/***/ })

},[155]);