pbjsChunk([20],{

/***/ 219:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(220);


/***/ }),

/***/ 220:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /*
                                                                                                                                                                                                                                                                              * Tremor Video bid Adapter for prebid.js
                                                                                                                                                                                                                                                                              * */

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

var ENDPOINT = '.ads.tremorhub.com/ad/tag';

var OPTIONAL_PARAMS = ['mediaId', 'mediaUrl', 'mediaTitle', 'contentLength', 'floor', 'efloor', 'custom', 'categories', 'keywords', 'blockDomains', 'c2', 'c3', 'c4', 'skip', 'skipmin', 'skipafter', 'delivery', 'placement', 'videoMinBitrate', 'videoMaxBitrate'];

/**
 * Bidder adapter Tremor Video. Given the list of all ad unit tag IDs,
 * sends out a bid request. When a bid response is back, registers the bid
 * to Prebid.js.
 * Steps:
 * - Format and send the bid request
 * - Evaluate and handle the response
 * - Store potential VAST markup
 * - Send request to ad server
 * - intercept ad server response
 * - Check if the vast wrapper URL is http://cdn.tremorhub.com/static/dummy.xml
 * - If yes: then render the locally stored VAST markup by directly passing it to your player
 * - Else: give the player the VAST wrapper from your ad server
 */
function TremorAdapter() {
  var baseAdapter = new _adapter2['default']('tremor');

  /* Prebid executes this function when the page asks to send out bid requests */
  baseAdapter.callBids = function (bidRequest) {
    var bids = bidRequest.bids || [];
    bids.filter((function (bid) {
      return valid(bid);
    })).map((function (bid) {
      var url = generateUrl(bid);
      if (url) {
        (0, _ajax.ajax)(url, (function (response) {
          handleResponse(bid, response);
        }), null, { method: 'GET', withCredentials: true });
      }
    }));
  };

  /**
   * Generates the url based on the parameters given. Sizes are required.
   * The format is: [L,W] or [[L1,W1],...]
   * @param bid
   * @returns {string}
   */
  function generateUrl(bid) {
    // get the sizes
    var width = void 0,
        height = void 0;
    if (utils.isArray(bid.sizes) && bid.sizes.length === 2 && !isNaN(bid.sizes[0]) && !isNaN(bid.sizes[1])) {
      width = bid.sizes[0];
      height = bid.sizes[1];
    } else if (_typeof(bid.sizes) === 'object') {
      // take the primary (first) size from the array
      width = bid.sizes[0][0];
      height = bid.sizes[0][1];
    }
    if (width && height) {
      var scheme = (document.location.protocol === 'https:' ? 'https' : 'http') + '://';
      var url = scheme + bid.params.supplyCode + ENDPOINT + '?adCode=' + bid.params.adCode;

      url += '&playerWidth=' + width;
      url += '&playerHeight=' + height;
      url += '&srcPageUrl=' + encodeURIComponent(document.location.href);

      OPTIONAL_PARAMS.forEach((function (param) {
        if (bid.params[param]) {
          url += '&' + param + '=' + bid.params[param];
        }
      }));

      url = url + '&fmt=json';

      return url;
    }
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(bidReq, response) {
    var bidResult = void 0;

    try {
      bidResult = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!bidResult || bidResult.error) {
      var errorMessage = 'in response for ' + baseAdapter.getBidderCode() + ' adapter';
      if (bidResult && bidResult.error) {
        errorMessage += ': ' + bidResult.error;
      }
      utils.logError(errorMessage);

      // signal this response is complete
      _bidmanager2['default'].addBidResponse(bidReq.placementCode, createBid(_constants.STATUS.NO_BID));
    }

    if (bidResult.seatbid && bidResult.seatbid.length > 0) {
      bidResult.seatbid[0].bid.forEach((function (tag) {
        var status = _constants.STATUS.GOOD;
        var bid = createBid(status, bidReq, tag);
        _bidmanager2['default'].addBidResponse(bidReq.placementCode, bid);
      }));
    } else {
      // signal this response is complete with no bid
      _bidmanager2['default'].addBidResponse(bidReq.placementCode, createBid(_constants.STATUS.NO_BID));
    }
  }

  /**
   * We require the ad code and the supply code to generate a tag url
   * @param bid
   * @returns {*}
   */
  function valid(bid) {
    if (bid.params.adCode && bid.params.supplyCode) {
      return bid;
    } else {
      utils.logError('missing bid params');
    }
  }

  /**
   * Create and return a bid object based on status and tag
   * @param status
   * @param reqBid
   * @param response
   */
  function createBid(status, reqBid, response) {
    var bid = _bidfactory2['default'].createBid(status, reqBid);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = baseAdapter.getBidderCode();

    if (response) {
      bid.cpm = response.price;
      bid.crid = response.crid;
      bid.vastXml = response.adm;
      bid.mediaType = 'video';
    }

    return bid;
  }

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  });
}

_adaptermanager2['default'].registerBidAdapter(new TremorAdapter(), 'tremor', {
  supportedMediaTypes: ['video']
});

module.exports = TremorAdapter;

/***/ })

},[219]);