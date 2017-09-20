pbjsChunk([64],{

/***/ 121:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(122);


/***/ }),

/***/ 122:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var utils = __webpack_require__(0);
var adloader = __webpack_require__(5);
var adaptermanager = __webpack_require__(1);

var BIDDER_CODE = 'gumgum';
var CALLBACKS = {};

var GumgumAdapter = function GumgumAdapter() {
  var bidEndpoint = 'https://g2.gumgum.com/hbid/imp';

  var topWindow = void 0;
  var topScreen = void 0;
  var pageViewId = void 0;
  var requestCache = {};
  var throttleTable = {};
  var defaultThrottle = 3e4;
  var dtCredentials = { member: 'YcXr87z2lpbB' };

  try {
    topWindow = global.top;
    topScreen = topWindow.screen;
  } catch (error) {
    return utils.logError(error);
  }

  function _getTimeStamp() {
    return new Date().getTime();
  }

  function _getDigiTrustQueryParams() {
    function getDigiTrustId() {
      var digiTrustUser = window.DigiTrust && window.DigiTrust.getUser ? window.DigiTrust.getUser(dtCredentials) : {};
      return digiTrustUser && digiTrustUser.success && digiTrustUser.identity || '';
    };

    var digiTrustId = getDigiTrustId();
    // Verify there is an ID and this user has not opted out
    if (!digiTrustId || digiTrustId.privacy && digiTrustId.privacy.optout) {
      return {};
    }
    return {
      'dt': digiTrustId.id
    };
  }

  function _callBids(_ref) {
    var bids = _ref.bids;

    var browserParams = {
      vw: topWindow.innerWidth,
      vh: topWindow.innerHeight,
      sw: topScreen.width,
      sh: topScreen.height,
      pu: topWindow.location.href,
      ce: navigator.cookieEnabled,
      dpr: topWindow.devicePixelRatio || 1
    };

    utils._each(bids, (function (bidRequest) {
      var bidId = bidRequest.bidId,
          _bidRequest$params = bidRequest.params,
          params = _bidRequest$params === undefined ? {} : _bidRequest$params,
          placementCode = bidRequest.placementCode;

      var timestamp = _getTimeStamp();
      var trackingId = params.inScreen;
      var nativeId = params.native;
      var slotId = params.inSlot;
      var bid = { tmax: pbjs.cbTimeout };

      /* slot/native ads need the placement id */
      switch (true) {
        case !!params.inImage:
          bid.pi = 1;break;
        case !!params.inScreen:
          bid.pi = 2;break;
        case !!params.inSlot:
          bid.pi = 3;break;
        case !!params.native:
          bid.pi = 5;break;
        default:
          return utils.logWarn('[GumGum] No product selected for the placement ' + placementCode + ', please check your implementation.');
      }

      /* throttle based on the latest request for this product */
      var productId = bid.pi;
      var requestKey = productId + '|' + placementCode;
      var throttle = throttleTable[productId];
      var latestRequest = requestCache[requestKey];
      if (latestRequest && throttle && timestamp - latestRequest < throttle) {
        return utils.logWarn('[GumGum] The refreshes for "' + placementCode + '" with the params ' + (JSON.stringify(params) + ' should be at least ' + throttle / 1e3 + 's apart.'));
      }
      /* update the last request */
      requestCache[requestKey] = timestamp;

      /* tracking id is required for in-image and in-screen */
      if (trackingId) bid.t = trackingId;
      /* native ads require a native placement id */
      if (nativeId) bid.ni = nativeId;
      /* slot ads require a slot id */
      if (slotId) bid.si = slotId;

      /* include the pageViewId, if any */
      if (pageViewId) bid.pv = pageViewId;

      var cachedBid = _extends({
        placementCode: placementCode,
        id: bidId
      }, bid);

      var callback = { jsonp: 'pbjs.handleGumGumCB[\'' + bidId + '\']' };
      CALLBACKS[bidId] = _handleGumGumResponse(cachedBid);
      var query = _extends(callback, browserParams, bid, _getDigiTrustQueryParams());
      var bidCall = bidEndpoint + '?' + utils.parseQueryStringParameters(query);
      adloader.loadScript(bidCall);
    }));
  }

  var _handleGumGumResponse = function _handleGumGumResponse(cachedBidRequest) {
    return function () {
      var bidResponse = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var productId = cachedBidRequest.pi;
      var _bidResponse$ad = bidResponse.ad,
          ad = _bidResponse$ad === undefined ? {} : _bidResponse$ad,
          _bidResponse$pag = bidResponse.pag,
          pag = _bidResponse$pag === undefined ? {} : _bidResponse$pag,
          throttle = bidResponse.thms;
      /* cache the pageViewId */

      if (pag && pag.pvid) pageViewId = pag.pvid;
      if (ad && ad.id) {
        /* set the new throttle */
        throttleTable[productId] = throttle || defaultThrottle;
        /* create the bid */
        var bid = bidfactory.createBid(1);
        var trackingId = pag.t;

        bidResponse.request = cachedBidRequest;
        var encodedResponse = encodeURIComponent(JSON.stringify(bidResponse));
        var gumgumAdLoader = '<script>\n        (function (context, topWindow, d, s, G) {\n          G = topWindow.GUMGUM;\n          d = topWindow.document;\n          function loadAd() {\n            topWindow.GUMGUM.pbjs("' + trackingId + '", ' + productId + ', "' + encodedResponse + '" , context);\n          }\n          if (G) {\n            loadAd();\n          } else {\n            topWindow.pbjs.loadScript("https://js.gumgum.com/services.js", loadAd);\n          }\n        }(window, top));\n      </script>';
        _extends(bid, {
          cpm: ad.price,
          ad: gumgumAdLoader,
          width: ad.width,
          height: ad.height,
          bidderCode: BIDDER_CODE
        });
        bidmanager.addBidResponse(cachedBidRequest.placementCode, bid);
      } else {
        var noBid = bidfactory.createBid(2);
        noBid.bidderCode = BIDDER_CODE;
        bidmanager.addBidResponse(cachedBidRequest.placementCode, noBid);
      }
      delete CALLBACKS[cachedBidRequest.id];
    };
  };

  window.pbjs.handleGumGumCB = CALLBACKS;

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new GumgumAdapter(), 'gumgum');

module.exports = GumgumAdapter;
/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(27)))

/***/ })

},[121]);