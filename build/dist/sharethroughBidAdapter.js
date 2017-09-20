pbjsChunk([30],{

/***/ 199:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(200);


/***/ }),

/***/ 200:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(0);
var bidmanager = __webpack_require__(2);
var bidfactory = __webpack_require__(3);
var ajax = __webpack_require__(6).ajax;
var adaptermanager = __webpack_require__(1);

var STR_BIDDER_CODE = 'sharethrough';
var STR_VERSION = '1.2.0';

var SharethroughAdapter = function SharethroughAdapter() {
  var str = {};
  str.STR_BTLR_HOST = document.location.protocol + '//btlr.sharethrough.com';
  str.STR_BEACON_HOST = document.location.protocol + '//b.sharethrough.com/butler?';
  str.placementCodeSet = {};
  str.ajax = ajax;

  function _callBids(params) {
    var bids = params.bids;

    // cycle through bids
    for (var i = 0; i < bids.length; i += 1) {
      var bidRequest = bids[i];
      str.placementCodeSet[bidRequest.placementCode] = bidRequest;
      var scriptUrl = _buildSharethroughCall(bidRequest);
      str.ajax(scriptUrl, _createCallback(bidRequest), undefined, { withCredentials: true });
    }
  }

  function _createCallback(bidRequest) {
    return function (bidResponse) {
      _strcallback(bidRequest, bidResponse);
    };
  }

  function _buildSharethroughCall(bid) {
    var pkey = utils.getBidIdParameter('pkey', bid.params);

    var host = str.STR_BTLR_HOST;

    var url = host + '/header-bid/v1?';
    url = utils.tryAppendQueryString(url, 'bidId', bid.bidId);
    url = utils.tryAppendQueryString(url, 'placement_key', pkey);
    url = appendEnvFields(url);

    return url;
  }

  function _strcallback(bidObj, bidResponse) {
    try {
      bidResponse = JSON.parse(bidResponse);
    } catch (e) {
      _handleInvalidBid(bidObj);
      return;
    }

    if (bidResponse.creatives && bidResponse.creatives.length > 0) {
      _handleBid(bidObj, bidResponse);
    } else {
      _handleInvalidBid(bidObj);
    }
  }

  function _handleBid(bidObj, bidResponse) {
    try {
      var bidId = bidResponse.bidId;
      var bid = bidfactory.createBid(1, bidObj);
      bid.bidderCode = STR_BIDDER_CODE;
      bid.cpm = bidResponse.creatives[0].cpm;
      var size = bidObj.sizes[0];
      bid.width = size[0];
      bid.height = size[1];
      bid.adserverRequestId = bidResponse.adserverRequestId;
      str.placementCodeSet[bidObj.placementCode].adserverRequestId = bidResponse.adserverRequestId;

      bid.pkey = utils.getBidIdParameter('pkey', bidObj.params);

      var windowLocation = 'str_response_' + bidId;
      var bidJsonString = JSON.stringify(bidResponse);
      bid.ad = '<div data-str-native-key="' + bid.pkey + '" data-stx-response-name=\'' + windowLocation + '\'>\n                </div>\n                <script>var ' + windowLocation + ' = ' + bidJsonString + '</script>\n                <script src="//native.sharethrough.com/assets/sfp-set-targeting.js"></script>';
      if (!(window.STR && window.STR.Tag) && !(window.top.STR && window.top.STR.Tag)) {
        var sfpScriptTag = '\n          <script>\n          (function() {\n            const sfp_js = document.createElement(\'script\');\n            sfp_js.src = "//native.sharethrough.com/assets/sfp.js";\n            sfp_js.type = \'text/javascript\';\n            sfp_js.charset = \'utf-8\';\n            try {\n                window.top.document.getElementsByTagName(\'body\')[0].appendChild(sfp_js);\n            } catch (e) {\n              console.log(e);\n            }\n          })()\n          </script>';
        bid.ad += sfpScriptTag;
      }
      bidmanager.addBidResponse(bidObj.placementCode, bid);
    } catch (e) {
      _handleInvalidBid(bidObj);
    }
  }

  function _handleInvalidBid(bidObj) {
    var bid = bidfactory.createBid(2, bidObj);
    bid.bidderCode = STR_BIDDER_CODE;
    bidmanager.addBidResponse(bidObj.placementCode, bid);
  }

  function appendEnvFields(url) {
    url = utils.tryAppendQueryString(url, 'hbVersion', '0.29.0-pre');
    url = utils.tryAppendQueryString(url, 'strVersion', STR_VERSION);
    url = utils.tryAppendQueryString(url, 'hbSource', 'prebid');

    return url;
  }

  return {
    callBids: _callBids,
    str: str
  };
};

adaptermanager.registerBidAdapter(new SharethroughAdapter(), 'sharethrough');

module.exports = SharethroughAdapter;

/***/ })

},[199]);