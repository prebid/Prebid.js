pbjsChunk([53],{

/***/ 143:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(144);


/***/ }),

/***/ 144:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _adapter = __webpack_require__(7);

var _adapter2 = _interopRequireDefault(_adapter);

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _ajax = __webpack_require__(6);

var _constants = __webpack_require__(4);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var ENDPOINT = '//bidder.komoona.com/v1/GetSBids';

function KomoonaAdapter() {
  var baseAdapter = new _adapter2['default']('komoona');
  var bidRequests = {};

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function (bidRequest) {
    var bids = bidRequest.bids || [];
    var tags = bids.filter((function (bid) {
      return valid(bid);
    })).map((function (bid) {
      // map request id to bid object to retrieve adUnit code in callback
      bidRequests[bid.bidId] = bid;

      var tag = {};
      tag.sizes = bid.sizes;
      tag.uuid = bid.bidId;
      tag.placementid = bid.params.placementId;
      tag.hbid = bid.params.hbid;

      return tag;
    }));

    if (!utils.isEmpty(tags)) {
      var payload = JSON.stringify({ bids: [].concat(_toConsumableArray(tags)) });

      (0, _ajax.ajax)(ENDPOINT, handleResponse, payload, {
        contentType: 'text/plain',
        withCredentials: true
      });
    }
  };

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    var parsed = void 0;

    try {
      parsed = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!parsed || parsed.error) {
      var errorMessage = 'in response for ' + baseAdapter.getBidderCode() + ' adapter';
      if (parsed && parsed.error) {
        errorMessage += ': ' + parsed.error;
      }
      utils.logError(errorMessage);

      // signal this response is complete
      Object.keys(bidRequests).map((function (bidId) {
        return bidRequests[bidId].placementCode;
      })).forEach((function (placementCode) {
        _bidmanager2['default'].addBidResponse(placementCode, createBid(_constants.STATUS.NO_BID));
      }));

      return;
    }

    parsed.bids.forEach((function (tag) {
      var status = void 0;
      if (tag.cpm > 0 && tag.creative) {
        status = _constants.STATUS.GOOD;
      } else {
        status = _constants.STATUS.NO_BID;
      }

      tag.bidId = tag.uuid; // bidfactory looks for bidId on requested bid
      var bid = createBid(status, tag);
      var placement = bidRequests[bid.adId].placementCode;

      _bidmanager2['default'].addBidResponse(placement, bid);
    }));
  }

  /* Check that a bid has required paramters */
  function valid(bid) {
    if (bid.params.placementId && bid.params.hbid) {
      return bid;
    } else {
      utils.logError('bid requires placementId and hbid params');
    }
  }

  /* Create and return a bid object based on status and tag */
  function createBid(status, tag) {
    var bid = _bidfactory2['default'].createBid(status, tag);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = baseAdapter.getBidderCode();

    if (status === _constants.STATUS.GOOD) {
      bid.cpm = tag.cpm;
      bid.width = tag.width;
      bid.height = tag.height;
      bid.ad = tag.creative;
    }

    return bid;
  }

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  });
}

_adaptermanager2['default'].registerBidAdapter(new KomoonaAdapter(), 'komoona');

module.exports = KomoonaAdapter;

/***/ })

},[143]);