pbjsChunk([12],{

/***/ 157:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(158);
module.exports = __webpack_require__(159);


/***/ }),

/***/ 158:
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

var BIDDER_CODE = 'jcm';
var URL = '//media.adfrontiers.com/pq';

var spec = exports.spec = {
  code: BIDDER_CODE,
  aliases: ['jcarter'],
  isBidRequestValid: function isBidRequestValid(bid) {
    return !!(bid.params && bid.params.siteId && bid.bidId);
  },

  buildRequests: function buildRequests(validBidRequests) {
    var BidRequestStr = {
      bids: []
    };

    for (var i = 0; i < validBidRequests.length; i++) {
      var adSizes = '';
      var bid = validBidRequests[i];
      for (var x = 0; x < bid.sizes.length; x++) {
        adSizes += utils.parseGPTSingleSizeArray(bid.sizes[x]);
        if (x !== bid.sizes.length - 1) {
          adSizes += ',';
        }
      }

      BidRequestStr.bids.push({
        'callbackId': bid.bidId,
        'siteId': bid.params.siteId,
        'adSizes': adSizes
      });
    }

    var JSONStr = JSON.stringify(BidRequestStr);
    var dataStr = 't=hb&ver=1.0&compact=true&bids=' + encodeURIComponent(JSONStr);

    return {
      method: 'GET',
      url: URL,
      data: dataStr
    };
  },

  interpretResponse: function interpretResponse(serverResponse) {
    var bidResponses = [];
    serverResponse = serverResponse.body;
    // loop through serverResponses
    if (serverResponse) {
      if (serverResponse.bids) {
        var bids = serverResponse.bids;
        for (var i = 0; i < bids.length; i++) {
          var bid = bids[i];
          var bidResponse = {
            requestId: bid.callbackId,
            bidderCode: spec.code,
            cpm: bid.cpm,
            width: bid.width,
            height: bid.height,
            creativeId: bid.creativeId,
            currency: 'USD',
            netRevenue: bid.netRevenue,
            ttl: bid.ttl,
            ad: decodeURIComponent(bid.ad.replace(/\+/g, '%20'))
          };
          bidResponses.push(bidResponse);
        };
      };
    }
    return bidResponses;
  },

  getUserSyncs: function getUserSyncs(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: '//media.adfrontiers.com/hb/jcm_usersync.html'
      }];
    }
    if (syncOptions.image) {
      return [{
        type: 'image',
        url: '//media.adfrontiers.com/hb/jcm_usersync.png'
      }];
    }
  }
};

(0, _bidderFactory.registerBidder)(spec);

/***/ }),

/***/ 159:
/***/ (function(module, exports) {



/***/ })

},[157]);