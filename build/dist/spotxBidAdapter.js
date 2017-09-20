pbjsChunk([25],{

/***/ 209:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(210);


/***/ }),

/***/ 210:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _adapter = __webpack_require__(7);

var _adapter2 = _interopRequireDefault(_adapter);

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _adloader = __webpack_require__(5);

var _adloader2 = _interopRequireDefault(_adloader);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _constants = __webpack_require__(4);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function Spotx() {
  var baseAdapter = new _adapter2['default']('Spotx');
  var bidReq = void 0;
  var KVP_Object = void 0;

  baseAdapter.callBids = function (bidRequest) {
    if (!bidRequest || !bidRequest.bids || bidRequest.bids.length === 0) {
      return;
    }
    bidReq = bidRequest.bids[0] || [];

    if (!validateParams(bidReq)) {
      console.log('Bid Request does not contain valid parameters.');
      return;
    }

    loadDSDK();
  };

  // Load the SpotX Direct AdOS SDK onto the page
  function loadDSDK() {
    var channelId = bidReq.params.video.channel_id;
    _adloader2['default'].loadScript('//js.spotx.tv/directsdk/v1/' + channelId + '.js', initDSDK, true);
  }

  // We have a Direct AdOS SDK! Set options and initialize it!
  function initDSDK() {
    var options = bidReq.params.video;

    // If we are passed a id string set the slot and video slot to the element using that id.
    if (typeof options.slot === 'string') {
      options.slot = document.getElementById(bidReq.params.video.slot);
    }
    if (typeof options.video_slot === 'string') {
      options.video_slot = document.getElementById(bidReq.params.video.video_slot);
    }

    var directAdOS = new SpotX.DirectAdOS(options);

    directAdOS.getAdServerKVPs().then((function (adServerKVPs) {
      // Got an ad back. Build a successful response.
      var resp = {
        bids: []
      };
      var bid = {};

      bid.cmpID = bidReq.params.video.channel_id;
      bid.cpm = adServerKVPs.spotx_bid;
      bid.url = adServerKVPs.spotx_ad_key;
      bid.cur = 'USD';
      bid.bidderCode = 'spotx';
      var sizes = utils.isArray(bidReq.sizes[0]) ? bidReq.sizes[0] : bidReq.sizes;
      bid.height = sizes[1];
      bid.width = sizes[0];
      resp.bids.push(bid);
      KVP_Object = adServerKVPs;
      handleResponse(resp);
    }), (function () {
      // No ad...
      handleResponse();
    }));
  }

  function createBid(status) {
    var bid = _bidfactory2['default'].createBid(status, utils.getBidRequest(bidReq.bidId));

    // Stuff we have no matter what
    bid.bidderCode = bidReq.bidder;
    bid.placementCode = bidReq.placementCode;
    bid.requestId = bidReq.requestId;
    bid.code = bidReq.bidder;

    // Stuff we only get with a successful response
    if (status === _constants.STATUS.GOOD && KVP_Object) {
      var url = '//search.spotxchange.com/ad/vast.html?key=' + KVP_Object.spotx_ad_key;
      bid.mediaType = 'video';

      bid.cpm = KVP_Object.spotx_bid;
      bid.vastUrl = url;
      bid.ad = url;

      var sizes = utils.isArray(bidReq.sizes[0]) ? bidReq.sizes[0] : bidReq.sizes;
      bid.height = sizes[1];
      bid.width = sizes[0];
    }

    return bid;
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    if (!response || !response.bids || !response.bids.length) {
      _bidmanager2['default'].addBidResponse(bidReq.placementCode, createBid(_constants.STATUS.NO_BID));
    } else {
      _bidmanager2['default'].addBidResponse(bidReq.placementCode, createBid(_constants.STATUS.GOOD, response.bids[0]));
    }
  }

  function validateParams(request) {
    if (_typeof(request.params) !== 'object' && _typeof(request.params.video) !== 'object') {
      return false;
    }

    // Check that all of our required parameters are defined.
    if (bidReq.params.video.channel_id === undefined || bidReq.params.video.slot === undefined || bidReq.params.video.video_slot === undefined) {
      return false;
    }
    return true;
  }

  return _extends(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  });
}

_adaptermanager2['default'].registerBidAdapter(new Spotx(), 'spotx', {
  supportedMediaTypes: ['video']
});

module.exports = Spotx;

/***/ })

},[209]);