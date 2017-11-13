pbjsChunk([25],{

/***/ 67:
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(68);
module.exports = __webpack_require__(69);


/***/ }),

/***/ 68:
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

var BIDDER_CODE = 'adocean';

function buildEndpointUrl(emiter, payload) {
  var payloadString = '';
  utils._each(payload, (function (v, k) {
    if (payloadString.length) {
      payloadString += '&';
    }
    payloadString += k + '=' + encodeURIComponent(v);
  }));

  return 'https://' + emiter + '/ad.json?' + payloadString;
}

function buildRequest(masterBidRequests, masterId) {
  var firstBid = masterBidRequests[0];
  var payload = {
    id: masterId
  };

  var bidIdMap = {};

  utils._each(masterBidRequests, (function (v) {
    bidIdMap[v.params.slaveId] = v.bidId;
  }));

  return {
    method: 'GET',
    url: buildEndpointUrl(firstBid.params.emiter, payload),
    data: {},
    bidIdMap: bidIdMap
  };
}

function assignToMaster(bidRequest, bidRequestsByMaster) {
  var masterId = bidRequest.params.masterId;
  bidRequestsByMaster[masterId] = bidRequestsByMaster[masterId] || [];
  bidRequestsByMaster[masterId].push(bidRequest);
}

function _interpretResponse(placementResponse, bidRequest, bids) {
  if (!placementResponse.error) {
    var adCode = '<script type="application/javascript">(function(){var wu="' + (placementResponse.winUrl || '') + '",su="' + (placementResponse.statsUrl || '') + '".replace(/\\[TIMESTAMP\\]/,(new Date()).getTime());';
    adCode += 'if(navigator.sendBeacon){if(wu){navigator.sendBeacon(wu)||((new Image(1,1)).src=wu)};if(su){navigator.sendBeacon(su)||((new Image(1,1)).src=su)}}';
    adCode += 'else{if(wu){(new Image(1,1)).src=wu;}if(su){(new Image(1,1)).src=su;}}';
    adCode += '})();<\/script>';
    adCode += decodeURIComponent(placementResponse.code);

    var bid = {
      ad: adCode,
      cpm: parseFloat(placementResponse.price),
      currency: placementResponse.currency,
      height: parseInt(placementResponse.height, 10),
      requestId: bidRequest.bidIdMap[placementResponse.id],
      width: parseInt(placementResponse.width, 10),
      netRevenue: false,
      ttl: parseInt(placementResponse.ttl),
      creativeId: placementResponse.crid
    };

    bids.push(bid);
  }
}

var spec = exports.spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function isBidRequestValid(bid) {
    return !!(bid.params.slaveId && bid.params.masterId && bid.params.emiter);
  },

  buildRequests: function buildRequests(validBidRequests) {
    var bidRequestsByMaster = {};
    var requests = [];

    utils._each(validBidRequests, (function (v) {
      assignToMaster(v, bidRequestsByMaster);
    }));
    requests = utils._map(bidRequestsByMaster, (function (v, k) {
      return buildRequest(v, k);
    }));

    return requests;
  },

  interpretResponse: function interpretResponse(serverResponse, bidRequest) {
    var bids = [];

    if (utils.isArray(serverResponse.body)) {
      utils._each(serverResponse.body, (function (placementResponse) {
        _interpretResponse(placementResponse, bidRequest, bids);
      }));
    }

    return bids;
  }
};
(0, _bidderFactory.registerBidder)(spec);

/***/ }),

/***/ 69:
/***/ (function(module, exports) {



/***/ })

},[67]);