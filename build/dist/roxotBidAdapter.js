pbjsChunk([34],{

/***/ 189:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(190);


/***/ }),

/***/ 190:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var CONSTANTS = __webpack_require__(4);
var utils = __webpack_require__(0);
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var adaptermanager = __webpack_require__(1);

var RoxotAdapter = function RoxotAdapter() {
  var roxotUrl = 'r.rxthdr.com';

  pbjs.roxotResponseHandler = roxotResponseHandler;

  return {
    callBids: _callBids
  };

  function _callBids(bidReqs) {
    utils.logInfo('callBids roxot adapter invoking');

    var domain = window.location.host;
    var page = window.location.pathname + location.search + location.hash;

    var roxotBidReqs = {
      id: utils.getUniqueIdentifierStr(),
      bids: bidReqs,
      site: {
        domain: domain,
        page: page
      }
    };

    var scriptUrl = '//' + roxotUrl + '?callback=pbjs.roxotResponseHandler' + '&src=' + CONSTANTS.REPO_AND_VERSION + '&br=' + encodeURIComponent(JSON.stringify(roxotBidReqs));

    adloader.loadScript(scriptUrl);
  }

  function roxotResponseHandler(roxotResponseObject) {
    utils.logInfo('roxotResponseHandler invoking');
    var placements = [];

    if (isResponseInvalid()) {
      return fillPlacementEmptyBid();
    }

    roxotResponseObject.bids.forEach(pushRoxotBid);
    var allBidResponse = fillPlacementEmptyBid(placements);
    utils.logInfo('roxotResponse handler finish');

    return allBidResponse;

    function isResponseInvalid() {
      return !roxotResponseObject || !roxotResponseObject.bids || !Array.isArray(roxotResponseObject.bids) || roxotResponseObject.bids.length <= 0;
    }

    function pushRoxotBid(roxotBid) {
      var placementCode = '';

      var bidReq = pbjs._bidsRequested.find((function (bidSet) {
        return bidSet.bidderCode === 'roxot';
      })).bids.find((function (bid) {
        return bid.bidId === roxotBid.bidId;
      }));

      if (!bidReq) {
        return pushErrorBid(placementCode);
      }

      bidReq.status = CONSTANTS.STATUS.GOOD;

      placementCode = bidReq.placementCode;
      placements.push(placementCode);

      var cpm = roxotBid.cpm;
      var responseNurl = '<img src="' + roxotBid.nurl + '">';

      if (!cpm) {
        return pushErrorBid(placementCode);
      }

      var bid = bidfactory.createBid(1, bidReq);

      bid.creative_id = roxotBid.id;
      bid.bidderCode = 'roxot';
      bid.cpm = cpm;
      bid.ad = decodeURIComponent(roxotBid.adm + responseNurl);
      bid.width = parseInt(roxotBid.w);
      bid.height = parseInt(roxotBid.h);

      bidmanager.addBidResponse(placementCode, bid);
    }

    function fillPlacementEmptyBid(places) {
      pbjs._bidsRequested.find((function (bidSet) {
        return bidSet.bidderCode === 'roxot';
      })).bids.forEach(fillIfNotFilled);

      function fillIfNotFilled(bid) {
        if (utils.contains(places, bid.placementCode)) {
          return null;
        }

        pushErrorBid(bid);
      }
    }

    function pushErrorBid(bidRequest) {
      var bid = bidfactory.createBid(2, bidRequest);
      bid.bidderCode = 'roxot';
      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    }
  }
};

adaptermanager.registerBidAdapter(new RoxotAdapter(), 'roxot');

module.exports = RoxotAdapter;

/***/ })

},[189]);