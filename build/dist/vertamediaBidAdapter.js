pbjsChunk([13],{

/***/ 233:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(234);


/***/ }),

/***/ 234:
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

var ENDPOINT = '//rtb.vertamedia.com/hb/';

function VertamediaAdapter() {
  var baseAdapter = new _adapter2['default']('vertamedia');
  var bidRequest = void 0;

  baseAdapter.callBids = function (bidRequests) {
    if (!bidRequests || !bidRequests.bids || bidRequests.bids.length === 0) {
      return;
    }

    var RTBDataParams = prepareAndSaveRTBRequestParams(bidRequests.bids[0]);

    if (!RTBDataParams) {
      return;
    }

    (0, _ajax.ajax)(ENDPOINT, handleResponse, RTBDataParams, {
      contentType: 'text/plain',
      withCredentials: true,
      method: 'GET'
    });
  };

  function prepareAndSaveRTBRequestParams(bid) {
    if (!bid || !bid.params || !bid.params.aid || !bid.placementCode) {
      return;
    }

    bidRequest = bid;

    var size = getSize(bid.sizes);

    bidRequest.width = size.width;
    bidRequest.height = size.height;

    return {
      aid: bid.params.aid,
      w: size.width,
      h: size.height,
      domain: document.location.hostname
    };
  }

  function getSize(requestSizes) {
    var parsed = {};
    var size = utils.parseSizesInput(requestSizes)[0];

    if (typeof size !== 'string') {
      return parsed;
    }

    var parsedSize = size.toUpperCase().split('X');

    return {
      width: parseInt(parsedSize[0], 10) || undefined,
      height: parseInt(parsedSize[1], 10) || undefined
    };
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    var parsed;

    try {
      parsed = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!parsed || parsed.error || !parsed.bids || !parsed.bids.length) {
      _bidmanager2['default'].addBidResponse(bidRequest.placementCode, createBid(_constants.STATUS.NO_BID));

      return;
    }

    _bidmanager2['default'].addBidResponse(bidRequest.placementCode, createBid(_constants.STATUS.GOOD, parsed.bids[0]));
  }

  function createBid(status, tag) {
    var bid = _bidfactory2['default'].createBid(status, tag);

    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = bidRequest.bidder;

    if (!tag || status !== _constants.STATUS.GOOD) {
      return bid;
    }

    bid.mediaType = 'video';
    bid.cpm = tag.cpm;
    bid.creative_id = tag.cmpId;
    bid.width = bidRequest.width;
    bid.height = bidRequest.height;
    bid.descriptionUrl = tag.url;
    bid.vastUrl = tag.url;

    return bid;
  }

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  });
}

_adaptermanager2['default'].registerBidAdapter(new VertamediaAdapter(), 'vertamedia', {
  supportedMediaTypes: ['video']
});

module.exports = VertamediaAdapter;

/***/ })

},[233]);