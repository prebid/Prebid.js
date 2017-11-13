pbjsChunk([15],{

/***/ 134:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(135);
module.exports = __webpack_require__(136);


/***/ }),

/***/ 135:
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

var BIDDER_CODE = 'fidelity';
var BIDDER_SERVER = 'x.fidelity-media.com';
var spec = exports.spec = {
  code: BIDDER_CODE,
  isBidRequestValid: function isBidRequestValid(bid) {
    return !!(bid && bid.params && bid.params.zoneid);
  },
  buildRequests: function buildRequests(validBidRequests, bidderRequest) {
    return validBidRequests.map((function (bidRequest) {
      var server = bidRequest.params.server || BIDDER_SERVER;

      var payload = {
        from: 'hb',
        v: '1.0',
        requestid: bidRequest.bidderRequestId,
        impid: bidRequest.bidId,
        zoneid: bidRequest.params.zoneid,
        floor: parseFloat(bidRequest.params.floor) > 0 ? bidRequest.params.floor : 0,
        charset: document.charSet || document.characterSet,
        defloc: utils.getTopWindowUrl(),
        altloc: window.location.href,
        subid: 'hb',
        flashver: getFlashVersion(),
        tmax: bidderRequest.timeout
      };
      if (document.referrer) {
        payload.referrer = document.referrer;
      }

      return {
        method: 'GET',
        url: '//' + server + '/delivery/hb.php',
        data: payload
      };
    }));
  },
  interpretResponse: function interpretResponse(serverResponse) {
    serverResponse = serverResponse.body;
    var bidResponses = [];
    if (serverResponse && serverResponse.seatbid) {
      serverResponse.seatbid.forEach((function (seatBid) {
        return seatBid.bid.forEach((function (bid) {
          var bidResponse = {
            requestId: bid.impid,
            creativeId: bid.impid,
            cpm: bid.price,
            width: bid.width,
            height: bid.height,
            ad: bid.adm,
            netRevenue: bid.netRevenue,
            currency: bid.cur,
            ttl: bid.ttl
          };

          bidResponses.push(bidResponse);
        }));
      }));
    }
    return bidResponses;
  },
  getUserSyncs: function getUserSyncs(syncOptions) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: '//' + BIDDER_SERVER + '/delivery/matches.php?type=iframe'
      }];
    }
  }
};

function getFlashVersion() {
  var plugins, plugin, result;

  if (navigator.plugins && navigator.plugins.length > 0) {
    plugins = navigator.plugins;
    for (var i = 0; i < plugins.length && !result; i++) {
      plugin = plugins[i];
      if (plugin.name.indexOf('Shockwave Flash') > -1) {
        result = plugin.description.split('Shockwave Flash ')[1];
      }
    }
  }
  return result || '';
}

(0, _bidderFactory.registerBidder)(spec);

/***/ }),

/***/ 136:
/***/ (function(module, exports) {



/***/ })

},[134]);