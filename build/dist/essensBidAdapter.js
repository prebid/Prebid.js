pbjsChunk([70],{

/***/ 109:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(110);


/***/ }),

/***/ 110:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var CONSTANTS = __webpack_require__(4);
var utils = __webpack_require__(0);
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var Adapter = __webpack_require__(7)['default'];
var adaptermanager = __webpack_require__(1);

// Essens Prebid Adapter
function EssensAdapter() {
  var baseAdapter = new Adapter('essens');

  var ENDPOINT = 'bid.essrtb.com/bid/prebid_call';

  var receivedBidRequests = {};

  baseAdapter.callBids = function (bidRequest) {
    if (!bidRequest) {
      utils.logError('empty bid request received');
      return;
    }
    receivedBidRequests = bidRequest;

    var bids = bidRequest.bids || [];

    var essensBids = bids.filter((function (bid) {
      return isPlacementBidComplete(bid);
    })).map((function (bid) {
      var essensBid = {};
      essensBid.impressionId = bid.bidId;
      essensBid.sizes = utils.parseSizesInput(bid.sizes);
      essensBid.placementId = bid.params.placementId;

      if (bid.params.dealId) {
        essensBid.deal = bid.params.dealId;
      }

      if (bid.params.floorPrice) {
        essensBid.floorPrice = bid.params.floorPrice;
      }

      return essensBid;
    }));

    var bidderRequestId = bidRequest.bidderRequestId;
    var cur = ['USD'];
    var urlParam = utils.getTopWindowUrl();
    var uaParam = getUa();

    if (!utils.isEmpty(essensBids)) {
      var payloadJson = { bidderRequestId: bidderRequestId, cur: cur, url: urlParam, ua: uaParam, imp: essensBids };

      var scriptUrl = '//' + ENDPOINT + '?callback=pbjs.essensResponseHandler' + '&bid=' + encodeURIComponent(JSON.stringify(payloadJson));
      adloader.loadScript(scriptUrl);
    } else {
      sendEmptyResponseForAllPlacement();
    }

    function isPlacementBidComplete(bid) {
      if (bid.bidId && bid.params && bid.params.placementId) {
        return true;
      } else {
        utils.logError('bid requires missing essential params for essens');
      }
    }

    function getUa() {
      return window.navigator.userAgent;
    }
  };

  function sendEmptyResponseForAllPlacement() {
    if (receivedBidRequests && receivedBidRequests.bids) {
      receivedBidRequests.bids.forEach(registerEmptyResponse);
    }
  }

  function registerEmptyResponse(bidRequest) {
    var bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequest);
    bid.bidderCode = 'essens';
    bidmanager.addBidResponse(bidRequest.placementCode, bid);
  }

  pbjs.essensResponseHandler = function (essensResponse) {
    utils.logInfo('received bid request from Essens');
    if (!isValidResponse(essensResponse)) {
      sendEmptyResponseForAllPlacement();
      return;
    }

    registerBids(essensResponse);

    function isValidResponse(essensResponse) {
      return !!(essensResponse && essensResponse.id && essensResponse.seatbid);
    }

    function registerBids(essensResponses) {
      var requestHasResponse = [];

      if (essensResponses.seatbid.length > 0) {
        essensResponses.seatbid.filter(isValidSeat).forEach((function (seat) {
          return seat.bid.forEach(sendResponse);
        }));
      }

      receivedBidRequests.bids.filter((function (request) {
        return !hasResponse(request);
      })).forEach(registerEmptyResponse);

      function sendResponse(bidCandidate) {
        var bidRequest = getBidRequest(bidCandidate.impid);

        var bidsToBeRegister = getBid(bidRequest, bidCandidate);

        if (bidsToBeRegister) {
          requestHasResponse.push(bidRequest);
          bidmanager.addBidResponse(bidRequest.placementCode, bidsToBeRegister);
        }
      }

      function hasResponse(request) {
        return utils.contains(requestHasResponse, request);
      }

      function isValidSeat(seatbid) {
        return seatbid.bid && seatbid.bid.length !== 0;
      }

      function getBidRequest(id) {
        return receivedBidRequests.bids.find((function (bid) {
          return bid.bidId === id;
        }));
      }
    }

    function getBid(pbBidReq, bidCandidate) {
      if (!validBid(bidCandidate)) {
        return;
      }
      var bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, pbBidReq);

      bid.creative_id = bidCandidate.crid;
      bid.adUrl = bidCandidate.ext.adUrl;
      bid.bidderCode = 'essens';
      bid.cpm = parseFloat(bidCandidate.price);
      bid.width = parseInt(bidCandidate.w);
      bid.height = parseInt(bidCandidate.h);

      if (bidCandidate.dealid) {
        bid.dealId = bidCandidate.dealid;
      }
      return bid;
    }

    function validBid(bid) {
      return !!(bid.price && bid.crid && bid.ext && bid.ext.adUrl && bid.w && bid.h && bid.impid);
    }
  };

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    getBidderCode: baseAdapter.getBidderCode
  });
}

adaptermanager.registerBidAdapter(new EssensAdapter(), 'essens');

module.exports = EssensAdapter;

/***/ })

},[109]);