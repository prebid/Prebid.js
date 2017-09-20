pbjsChunk([82],{

/***/ 82:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(83);


/***/ }),

/***/ 83:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {

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

var ENDPOINT = '//reachms.bfmio.com/bid.json?exchange_id=';

function BeachfrontAdapter() {
  var baseAdapter = new _adapter2['default']('beachfront');

  baseAdapter.callBids = function (bidRequests) {
    var bids = bidRequests.bids || [];
    bids.forEach((function (bid) {
      var bidRequest = getBidRequest(bid);
      var RTBDataParams = prepareAndSaveRTBRequestParams(bid);
      if (!RTBDataParams) {
        var error = 'No bid params';
        utils.logError(error);
        if (bid && bid.placementCode) {
          _bidmanager2['default'].addBidResponse(bid.placementCode, createBid(bid, _constants.STATUS.NO_BID));
        }
        return;
      }
      var BID_URL = ENDPOINT + RTBDataParams.appId;
      (0, _ajax.ajax)(BID_URL, handleResponse(bidRequest), JSON.stringify(RTBDataParams), {
        contentType: 'text/plain',
        withCredentials: true
      });
    }));
  };

  function getBidRequest(bid) {
    if (!bid || !bid.params || !bid.params.appId) {
      return;
    }

    var bidRequest = bid;
    bidRequest.width = parseInt(bid.sizes[0], 10) || undefined;
    bidRequest.height = parseInt(bid.sizes[1], 10) || undefined;
    return bidRequest;
  }

  function prepareAndSaveRTBRequestParams(bid) {
    if (!bid || !bid.params || !bid.params.appId || !bid.params.bidfloor) {
      return;
    }

    function fetchDeviceType() {
      return (/(ios|ipod|ipad|iphone|android)/i.test(global.navigator.userAgent) ? 1 : /(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i.test(global.navigator.userAgent) ? 1 : 2
      );
    }

    var bidRequestObject = {
      isPrebid: true,
      appId: bid.params.appId,
      domain: document.location.hostname,
      imp: [{
        video: {
          w: bid.width,
          h: bid.height
        },
        bidfloor: bid.params.bidfloor
      }],
      site: {
        page: utils.getTopWindowLocation().host
      },
      device: {
        ua: navigator.userAgent,
        devicetype: fetchDeviceType()
      },
      cur: ['USD']
    };
    return bidRequestObject;
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(bidRequest) {
    return function (response) {
      var parsed;
      if (response) {
        try {
          parsed = JSON.parse(response);
        } catch (error) {
          utils.logError(error);
        }
      } else {
        utils.logWarn('No bid response');
      }

      if (!parsed || parsed.error || !parsed.url || !parsed.bidPrice) {
        utils.logWarn('No Valid Bid');
        _bidmanager2['default'].addBidResponse(bidRequest.placementCode, createBid(bidRequest, _constants.STATUS.NO_BID));
        return;
      }

      var newBid = {};
      newBid.price = parsed.bidPrice;
      newBid.url = parsed.url;
      newBid.bidId = bidRequest.bidId;
      _bidmanager2['default'].addBidResponse(bidRequest.placementCode, createBid(bidRequest, _constants.STATUS.GOOD, newBid));
    };
  }

  function createBid(bidRequest, status, tag) {
    var bid = _bidfactory2['default'].createBid(status, tag);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = bidRequest.bidder;
    if (!tag || status !== _constants.STATUS.GOOD) {
      return bid;
    }

    bid.cpm = tag.price;
    bid.creative_id = tag.cmpId;
    bid.width = bidRequest.width;
    bid.height = bidRequest.height;
    bid.descriptionUrl = tag.url;
    bid.vastUrl = tag.url;
    bid.mediaType = 'video';

    return bid;
  }

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  });
}

_adaptermanager2['default'].registerBidAdapter(new BeachfrontAdapter(), 'beachfront', {
  supportedMediaTypes: ['video']
});

module.exports = BeachfrontAdapter;
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(27)))

/***/ })

},[82]);