pbjsChunk([32],{

/***/ 193:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(194);


/***/ }),

/***/ 194:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _utils = __webpack_require__(0);

var _config = __webpack_require__(8);

var CONSTANTS = __webpack_require__(4);
var utils = __webpack_require__(0);
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var adaptermanager = __webpack_require__(1);

function SekindoUMAdapter() {
  function _callBids(params) {
    var bids = params.bids;
    var bidsCount = bids.length;

    var pubUrl = null;
    if (parent !== window) {
      pubUrl = document.referrer;
    } else {
      pubUrl = window.location.href;
    }

    for (var i = 0; i < bidsCount; i++) {
      var bidReqeust = bids[i];
      var callbackId = bidReqeust.bidId;
      _requestBids(bidReqeust, callbackId, pubUrl);
      // store a reference to the bidRequest from the callback id
      // bidmanager.pbCallbackMap[callbackId] = bidReqeust;
    }
  }

  pbjs.sekindoCB = function (callbackId, response) {
    var bidObj = (0, _utils.getBidRequest)(callbackId);
    if (typeof response !== 'undefined' && typeof response.cpm !== 'undefined') {
      var bid = [];
      if (bidObj) {
        var bidCode = bidObj.bidder;
        var placementCode = bidObj.placementCode;

        if (response.cpm !== undefined && response.cpm > 0) {
          bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
          bid.callback_uid = callbackId;
          bid.bidderCode = bidCode;
          bid.creative_id = response.adId;
          bid.cpm = parseFloat(response.cpm);
          bid.ad = response.ad;
          bid.width = response.width;
          bid.height = response.height;

          bidmanager.addBidResponse(placementCode, bid);
        } else {
          bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
          bid.callback_uid = callbackId;
          bid.bidderCode = bidCode;
          bidmanager.addBidResponse(placementCode, bid);
        }
      }
    } else {
      if (bidObj) {
        utils.logMessage('No prebid response for placement ' + bidObj.placementCode);
      } else {
        utils.logMessage('sekindoUM callback general error');
      }
    }
  };

  function _requestBids(bid, callbackId, pubUrl) {
    // determine tag params
    var spaceId = utils.getBidIdParameter('spaceId', bid.params);
    var subId = utils.getBidIdParameter('subId', bid.params);
    var bidfloor = utils.getBidIdParameter('bidfloor', bid.params);
    var protocol = document.location.protocol === 'https:' ? 's' : '';
    var scriptSrc = 'http' + protocol + '://hb.sekindo.com/live/liveView.php?';

    scriptSrc = utils.tryAppendQueryString(scriptSrc, 's', spaceId);
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'subId', subId);
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'pubUrl', pubUrl);
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'hbcb', callbackId);
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'hbver', '3');
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'hbobj', 'pbjs');
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'dcpmflr', bidfloor);
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'hbto', _config.config.getConfig('bidderTimeout'));
    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'protocol', protocol);

    adloader.loadScript(scriptSrc);
  }

  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new SekindoUMAdapter(), 'sekindoUM');

module.exports = SekindoUMAdapter;

/***/ })

},[193]);