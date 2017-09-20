pbjsChunk([12],{

/***/ 235:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(236);


/***/ }),

/***/ 236:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var CONSTANTS = __webpack_require__(4);
var utils = __webpack_require__(0);
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var adaptermanager = __webpack_require__(1);

function VertozAdapter() {
  var BASE_URI = '//hb.vrtzads.com/vzhbidder/bid?';
  var BIDDER_NAME = 'vertoz';
  var QUERY_PARAM_KEY = 'q';

  function _callBids(params) {
    var bids = params.bids || [];

    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      var slotBidId = utils.getValue(bid, 'bidId');
      var cb = Math.round(new Date().getTime() / 1000);
      var vzEndPoint = BASE_URI;
      var reqParams = bid.params || {};
      var placementId = utils.getValue(reqParams, 'placementId');
      var cpm = utils.getValue(reqParams, 'cpmFloor');

      if (utils.isEmptyStr(placementId)) {
        utils.logError('missing params:', BIDDER_NAME, 'Enter valid vzPlacementId');
        return;
      }

      var reqSrc = utils.getTopWindowLocation().href;
      var vzReq = {
        _vzPlacementId: placementId,
        _rqsrc: reqSrc,
        _cb: cb,
        _slotBidId: slotBidId,
        _cpm: cpm
      };

      var queryParamValue = JSON.stringify(vzReq);
      vzEndPoint = utils.tryAppendQueryString(vzEndPoint, QUERY_PARAM_KEY, queryParamValue);
      adloader.loadScript(vzEndPoint);
    }
  }

  pbjs.vzResponse = function (vertozResponse) {
    var bidRespObj = vertozResponse;
    var bidObject;
    var reqBidObj = utils.getBidRequest(bidRespObj.slotBidId);

    if (bidRespObj.cpm) {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD, reqBidObj);
      bidObject.cpm = Number(bidRespObj.cpm);
      bidObject.ad = bidRespObj.ad + utils.createTrackPixelHtml(decodeURIComponent(bidRespObj.nurl));
      bidObject.width = bidRespObj.adWidth;
      bidObject.height = bidRespObj.adHeight;
    } else {
      var respStatusText = bidRespObj.statusText;
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, reqBidObj);
      utils.logMessage(respStatusText);
    }

    var adSpaceId = reqBidObj.placementCode;
    bidObject.bidderCode = BIDDER_NAME;
    bidmanager.addBidResponse(adSpaceId, bidObject);
  };
  return { callBids: _callBids };
}

adaptermanager.registerBidAdapter(new VertozAdapter(), 'vertoz');

module.exports = VertozAdapter;

/***/ })

},[235]);