pbjsChunk([31],{

/***/ 195:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(196);


/***/ }),

/***/ 196:
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

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var ServerBidAdapter = function ServerBidAdapter() {
  var baseAdapter = new _adapter2['default']('serverbid');

  var SERVERBID_BASE_URI = 'https://e.serverbid.com/api/v2';
  var SMARTSYNC_BASE_URI = 'https://s.zkcdn.net/ss';
  var SMARTSYNC_CALLBACK = 'serverbidCallBids';

  var sizeMap = [null, '120x90', '120x90', '468x60', '728x90', '300x250', '160x600', '120x600', '300x100', '180x150', '336x280', '240x400', '234x60', '88x31', '120x60', '120x240', '125x125', '220x250', '250x250', '250x90', '0x0', '200x90', '300x50', '320x50', '320x480', '185x185', '620x45', '300x125', '800x250'];

  var bidIds = [];

  baseAdapter.callBids = function (params) {
    if (params && params.bids && utils.isArray(params.bids) && params.bids.length) {
      if (!window.SMARTSYNC) {
        _callBids(params);
      } else {
        window[SMARTSYNC_CALLBACK] = function () {
          window[SMARTSYNC_CALLBACK] = function () {};
          _callBids(params);
        };

        var siteId = params.bids[0].params.siteId;
        _appendScript(SMARTSYNC_BASE_URI + '/' + siteId + '.js');

        var sstimeout = window.SMARTSYNC_TIMEOUT || (params.timeout || 500) / 2;
        setTimeout((function () {
          var cb = window[SMARTSYNC_CALLBACK];
          window[SMARTSYNC_CALLBACK] = function () {};
          cb();
        }), sstimeout);
      }
    }
  };

  function _appendScript(src) {
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = src;
    document.getElementsByTagName('head')[0].appendChild(script);
  }

  function _callBids(params) {
    var data = {
      placements: [],
      time: Date.now(),
      user: {},
      url: utils.getTopWindowUrl(),
      referrer: document.referrer,
      enableBotFiltering: true,
      includePricingData: true
    };

    var bids = params.bids || [];

    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];

      bidIds.push(bid.bidId);

      var placement = _extends({
        divName: bid.bidId,
        adTypes: bid.adTypes || getSize(bid.sizes)
      }, bid.params);

      if (placement.networkId && placement.siteId) {
        data.placements.push(placement);
      }
    }

    if (data.placements.length) {
      (0, _ajax.ajax)(SERVERBID_BASE_URI, _responseCallback, JSON.stringify(data), { method: 'POST', withCredentials: true, contentType: 'application/json' });
    }
  }

  function _responseCallback(result) {
    var bid = void 0;
    var bidId = void 0;
    var bidObj = void 0;
    var bidCode = void 0;
    var placementCode = void 0;

    try {
      result = JSON.parse(result);
    } catch (error) {
      utils.logError(error);
    }

    for (var i = 0; i < bidIds.length; i++) {
      bidId = bidIds[i];
      bidObj = utils.getBidRequest(bidId);
      bidCode = bidObj.bidder;
      placementCode = bidObj.placementCode;

      if (result) {
        var decision = result.decisions && result.decisions[bidId];
        var price = decision && decision.pricing && decision.pricing.clearPrice;

        if (decision && price) {
          bid = _bidfactory2['default'].createBid(1, bidObj);
          bid.bidderCode = bidCode;
          bid.cpm = price;
          bid.width = decision.width;
          bid.height = decision.height;
          bid.ad = retrieveAd(decision);
        } else {
          bid = _bidfactory2['default'].createBid(2, bidObj);
          bid.bidderCode = bidCode;
        }
      } else {
        bid = _bidfactory2['default'].createBid(2, bidObj);
        bid.bidderCode = bidCode;
      }
      _bidmanager2['default'].addBidResponse(placementCode, bid);
    }
  }

  function retrieveAd(decision) {
    return decision.contents && decision.contents[0] && decision.contents[0].body + utils.createTrackPixelHtml(decision.impressionUrl);
  }

  function getSize(sizes) {
    var result = [];
    sizes.forEach((function (size) {
      var index = sizeMap.indexOf(size[0] + 'x' + size[1]);
      if (index >= 0) {
        result.push(index);
      }
    }));
    return result;
  }

  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: baseAdapter.callBids
  };
};

_adaptermanager2['default'].registerBidAdapter(new ServerBidAdapter(), 'serverbid');

module.exports = ServerBidAdapter;

/***/ })

},[195]);