pbjsChunk([36],{

/***/ 269:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(270);


/***/ }),

/***/ 270:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _config = __webpack_require__(8);

var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var utils = __webpack_require__(0);
var adaptermanager = __webpack_require__(1);

function UnderdogMediaAdapter() {
  var UDM_ADAPTER_VERSION = '1.0.0';
  var getJsStaticUrl = window.location.protocol + '//udmserve.net/udm/img.fetch?tid=1;dt=9;callback=pbjs.handleUnderdogMediaCB;';
  var bidParams = {};

  function _callBids(params) {
    bidParams = params;
    var sizes = [];
    var siteId = 0;

    bidParams.bids.forEach((function (bidParam) {
      sizes = utils.flatten(sizes, utils.parseSizesInput(bidParam.sizes));
      siteId = bidParam.params.siteId;
    }));
    adloader.loadScript(getJsStaticUrl + 'sid=' + siteId + ';sizes=' + sizes.join(','), null, false);
  }

  function _callback(response) {
    var mids = response.mids;
    bidParams.bids.forEach((function (bidParam) {
      var filled = false;
      mids.forEach((function (mid) {
        if (mid.useCount > 0) {
          return;
        }
        if (!mid.useCount) {
          mid.useCount = 0;
        }
        var size_not_found = true;
        utils.parseSizesInput(bidParam.sizes).forEach((function (size) {
          if (size === mid.width + 'x' + mid.height) {
            size_not_found = false;
          }
        }));
        if (size_not_found) {
          return;
        }

        var bid = bidfactory.createBid(1, bidParam);
        bid.bidderCode = bidParam.bidder;
        bid.width = mid.width;
        bid.height = mid.height;

        bid.cpm = parseFloat(mid.cpm);
        if (bid.cpm <= 0) {
          return;
        }
        mid.useCount++;
        bid.ad = mid.ad_code_html;
        bid.ad = _makeNotification(bid, mid, bidParam) + bid.ad;
        if (!(bid.ad || bid.adUrl)) {
          return;
        }
        bidmanager.addBidResponse(bidParam.placementCode, bid);
        filled = true;
      }));
      if (!filled) {
        var nobid = bidfactory.createBid(2, bidParam);
        nobid.bidderCode = bidParam.bidder;
        bidmanager.addBidResponse(bidParam.placementCode, nobid);
      }
    }));
  }

  pbjs.handleUnderdogMediaCB = _callback;

  function _makeNotification(bid, mid, bidParam) {
    var url = mid.notification_url;

    url += UDM_ADAPTER_VERSION;
    url += ';cb=' + Math.random();
    url += ';qqq=' + 1 / bid.cpm;
    url += ';hbt=' + _config.config.getConfig('bidderTimeout');
    url += ';style=adapter';
    url += ';vis=' + encodeURIComponent(document.visibilityState);

    url += ';traffic_info=' + encodeURIComponent(JSON.stringify(_getUrlVars()));
    if (bidParam.params.subId) {
      url += ';subid=' + encodeURIComponent(bidParam.params.subId);
    }
    return '<script async src="' + url + '"></script>';
  }

  function _getUrlVars() {
    var vars = {};
    var hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
      hash = hashes[i].split('=');
      if (!hash[0].match(/^utm/)) {
        continue;
      }
      vars[hash[0]] = hash[1].substr(0, 150);
    }
    return vars;
  }

  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new UnderdogMediaAdapter(), 'underdogmedia');

module.exports = UnderdogMediaAdapter;

/***/ })

},[269]);