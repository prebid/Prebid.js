pbjsChunk([42],{

/***/ 167:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(168);


/***/ }),

/***/ 168:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _adloader = __webpack_require__(5);

var _adloader2 = _interopRequireDefault(_adloader);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

var _constants = __webpack_require__(4);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// Prebid adapter for Pollux header bidding client
function PolluxBidAdapter() {
  function _callBids(params) {
    var bidderUrl = window.location.protocol + '//adn.plxnt.com/prebid';
    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var request_obj = {};
      var bid = bids[i];
      // check params
      if (bid.params.zone) {
        var domain = utils.getParameterByName('domain');
        var tracker2 = utils.getParameterByName('tracker2');
        if (domain) {
          request_obj.domain = domain;
        } else {
          request_obj.domain = window.location.host;
        }
        if (tracker2) {
          request_obj.tracker2 = tracker2;
        }
        request_obj.zone = bid.params.zone;
      } else {
        utils.logError('required param "zone" is missing', 'polluxHandler');
        continue;
      }
      var parsedSizes = utils.parseSizesInput(bid.sizes);
      var parsedSizesLength = parsedSizes.length;
      if (parsedSizesLength > 0) {
        // first value should be "size"
        request_obj.size = parsedSizes[0];
        if (parsedSizesLength > 1) {
          // any subsequent values should be "promo_sizes"
          var promo_sizes = [];
          for (var j = 1; j < parsedSizesLength; j++) {
            promo_sizes.push(parsedSizes[j]);
          }
          request_obj.promo_sizes = promo_sizes.join(',');
        }
      }
      // detect urls
      request_obj.callback_id = bid.bidId;
      // set a different url bidder
      if (bid.bidderUrl) {
        bidderUrl = bid.bidderUrl;
      }
      var prebidUrl = bidderUrl + '?' + utils.parseQueryStringParameters(request_obj);
      utils.logMessage('Pollux request built: ' + prebidUrl);
      _adloader2['default'].loadScript(prebidUrl, null, true);
    }
  }

  // expose the callback to global object
  function _polluxHandler(response) {
    // pollux handler
    var bidObject = {};
    var callback_id = response.callback_id;
    var placementCode = '';
    var bidObj = utils.getBidRequest(callback_id);
    if (bidObj) {
      placementCode = bidObj.placementCode;
    }
    if (bidObj && response.cpm > 0 && !!response.ad) {
      bidObject = _bidfactory2['default'].createBid(_constants.STATUS.GOOD, bidObj);
      bidObject.bidderCode = bidObj.bidder;
      bidObject.mediaType = response.mediaType;
      bidObject.cpm = parseFloat(response.cpm);
      if (response.ad_type === 'url') {
        bidObject.adUrl = response.ad;
      } else {
        bidObject.ad = response.ad;
      }
      bidObject.width = response.width;
      bidObject.height = response.height;
    } else {
      bidObject = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bidObj);
      bidObject.bidderCode = 'pollux';
      utils.logMessage('No prebid response from polluxHandler for placement code ' + placementCode);
    }
    _bidmanager2['default'].addBidResponse(placementCode, bidObject);
  };
  pbjs.polluxHandler = _polluxHandler;
  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: _callBids,
    polluxHandler: _polluxHandler
  };
};
_adaptermanager2['default'].registerBidAdapter(new PolluxBidAdapter(), 'pollux');
module.exports = PolluxBidAdapter;

/***/ })

},[167]);