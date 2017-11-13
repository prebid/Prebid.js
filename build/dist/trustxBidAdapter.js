pbjsChunk([0],{

/***/ 262:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(263);
module.exports = __webpack_require__(264);


/***/ }),

/***/ 263:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.spec = undefined;

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _bidderFactory = __webpack_require__(9);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var BIDDER_CODE = 'trustx';
var ENDPOINT_URL = '//sofia.trustx.org/hb';
var TIME_TO_LIVE = 360;
var ADAPTER_SYNC_URL = '//sofia.trustx.org/push_sync';
var LOG_ERROR_MESS = {
  noAuid: 'Bid from response has no auid parameter - ',
  noAdm: 'Bid from response has no adm parameter - ',
  noBid: 'Array of bid objects is empty',
  noPlacementCode: 'Can\'t find in requested bids the bid with auid - ',
  emptyUids: 'Uids should be not empty',
  emptySeatbid: 'Seatbid array from response has empty item',
  emptyResponse: 'Response is empty',
  hasEmptySeatbidArray: 'Response has empty seatbid array',
  hasNoArrayOfBids: 'Seatbid from response has no array of bid objects - '
};
var spec = exports.spec = {
  code: BIDDER_CODE,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function isBidRequestValid(bid) {
    return !!bid.params.uid;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function buildRequests(validBidRequests) {
    var auids = [];
    var bidsMap = {};
    var bids = validBidRequests || [];
    var priceType = 'net';

    bids.forEach((function (bid) {
      if (bid.params.priceType === 'gross') {
        priceType = 'gross';
      }
      if (!bidsMap[bid.params.uid]) {
        bidsMap[bid.params.uid] = [bid];
        auids.push(bid.params.uid);
      } else {
        bidsMap[bid.params.uid].push(bid);
      }
    }));

    var payload = {
      u: utils.getTopWindowUrl(),
      pt: priceType,
      auids: auids.join(',')
    };

    return {
      method: 'GET',
      url: ENDPOINT_URL,
      data: payload,
      bidsMap: bidsMap
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function interpretResponse(serverResponse, bidRequest) {
    serverResponse = serverResponse && serverResponse.body;
    var bidResponses = [];
    var bidsMap = bidRequest.bidsMap;
    var priceType = bidRequest.data.pt;

    var errorMessage = void 0;

    if (!serverResponse) errorMessage = LOG_ERROR_MESS.emptyResponse;else if (serverResponse.seatbid && !serverResponse.seatbid.length) {
      errorMessage = LOG_ERROR_MESS.hasEmptySeatbidArray;
    }

    if (!errorMessage && serverResponse.seatbid) {
      serverResponse.seatbid.forEach((function (respItem) {
        _addBidResponse(_getBidFromResponse(respItem), bidsMap, priceType, bidResponses);
      }));
    }
    if (errorMessage) utils.logError(errorMessage);
    return bidResponses;
  },
  getUserSyncs: function getUserSyncs(syncOptions) {
    if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: ADAPTER_SYNC_URL
      }];
    }
  }
};

function _getBidFromResponse(respItem) {
  if (!respItem) {
    utils.logError(LOG_ERROR_MESS.emptySeatbid);
  } else if (!respItem.bid) {
    utils.logError(LOG_ERROR_MESS.hasNoArrayOfBids + JSON.stringify(respItem));
  } else if (!respItem.bid[0]) {
    utils.logError(LOG_ERROR_MESS.noBid);
  }
  return respItem && respItem.bid && respItem.bid[0];
}

function _addBidResponse(serverBid, bidsMap, priceType, bidResponses) {
  if (!serverBid) return;
  var errorMessage = void 0;
  if (!serverBid.auid) errorMessage = LOG_ERROR_MESS.noAuid + JSON.stringify(serverBid);
  if (!serverBid.adm) errorMessage = LOG_ERROR_MESS.noAdm + JSON.stringify(serverBid);else {
    var awaitingBids = bidsMap[serverBid.auid];
    if (awaitingBids) {
      awaitingBids.forEach((function (bid) {
        var bidResponse = {
          requestId: bid.bidId, // bid.bidderRequestId,
          bidderCode: spec.code,
          cpm: serverBid.price,
          width: serverBid.w,
          height: serverBid.h,
          creativeId: serverBid.auid, // bid.bidId,
          currency: 'USD',
          netRevenue: priceType !== 'gross',
          ttl: TIME_TO_LIVE,
          ad: serverBid.adm,
          dealId: serverBid.dealid
        };
        bidResponses.push(bidResponse);
      }));
    } else {
      errorMessage = LOG_ERROR_MESS.noPlacementCode + serverBid.auid;
    }
  }
  if (errorMessage) {
    utils.logError(errorMessage);
  }
}

(0, _bidderFactory.registerBidder)(spec);

/***/ }),

/***/ 264:
/***/ (function(module, exports) {



/***/ })

},[262]);