pbjsChunk([14],{

/***/ 231:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(232);


/***/ }),

/***/ 232:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _ajax = __webpack_require__(6);

var _bidfactory = __webpack_require__(3);

var _bidfactory2 = _interopRequireDefault(_bidfactory);

var _bidmanager = __webpack_require__(2);

var _bidmanager2 = _interopRequireDefault(_bidmanager);

var _utils = __webpack_require__(0);

var utils = _interopRequireWildcard(_utils);

var _constants = __webpack_require__(4);

var _Renderer = __webpack_require__(17);

var _adaptermanager = __webpack_require__(1);

var _adaptermanager2 = _interopRequireDefault(_adaptermanager);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function createRenderHandler(_ref) {
  var bidResponseBid = _ref.bidResponseBid,
      rendererConfig = _ref.rendererConfig;

  function createApi() {
    parent.window.unruly.native.prebid = parent.window.unruly.native.prebid || {};
    parent.window.unruly.native.prebid.uq = parent.window.unruly.native.prebid.uq || [];

    return {
      render: function render(bidResponseBid) {
        parent.window.unruly.native.prebid.uq.push(['render', bidResponseBid]);
      },
      onLoaded: function onLoaded(bidResponseBid) {}
    };
  }

  parent.window.unruly = parent.window.unruly || {};
  parent.window.unruly.native = parent.window.unruly.native || {};
  parent.window.unruly.native.siteId = parent.window.unruly.native.siteId || rendererConfig.siteId;

  var api = createApi();
  return {
    render: function render() {
      api.render(bidResponseBid);
    },
    onRendererLoad: function onRendererLoad() {
      api.onLoaded(bidResponseBid);
    }
  };
}

function createBidResponseHandler(bidRequestBids) {
  return {
    onBidResponse: function onBidResponse(responseBody) {
      try {
        var exchangeResponse = JSON.parse(responseBody);
        exchangeResponse.bids.forEach((function (exchangeBid) {
          var bidResponseBid = _bidfactory2['default'].createBid(exchangeBid.ext.statusCode, exchangeBid);

          _extends(bidResponseBid, exchangeBid);

          if (exchangeBid.ext.renderer) {
            var rendererParams = exchangeBid.ext.renderer;
            var renderHandler = createRenderHandler({
              bidResponseBid: bidResponseBid,
              rendererConfig: rendererParams.config
            });

            bidResponseBid.renderer = _Renderer.Renderer.install(_extends({}, rendererParams, { callback: function callback() {
                return renderHandler.onRendererLoad();
              } }));
            bidResponseBid.renderer.setRender((function () {
              return renderHandler.render();
            }));
          }

          _bidmanager2['default'].addBidResponse(exchangeBid.ext.placementCode, bidResponseBid);
        }));
      } catch (error) {
        utils.logError(error);
        bidRequestBids.forEach((function (bidRequestBid) {
          var bidResponseBid = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID);
          _bidmanager2['default'].addBidResponse(bidRequestBid.placementCode, bidResponseBid);
        }));
      }
    }
  };
}

function UnrulyAdapter() {
  var adapter = {
    exchangeUrl: 'https://targeting.unrulymedia.com/prebid',
    callBids: function callBids(_ref2) {
      var bidRequestBids = _ref2.bids;

      if (!bidRequestBids || bidRequestBids.length === 0) {
        return;
      }

      var payload = {
        bidRequests: bidRequestBids
      };

      var bidResponseHandler = createBidResponseHandler(bidRequestBids);

      (0, _ajax.ajax)(adapter.exchangeUrl, bidResponseHandler.onBidResponse, JSON.stringify(payload), {
        contentType: 'application/json',
        withCredentials: true
      });
    }
  };

  return adapter;
}

_adaptermanager2['default'].registerBidAdapter(new UnrulyAdapter(), 'unruly');

module.exports = UnrulyAdapter;

/***/ })

},[231]);