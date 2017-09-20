pbjsChunk([72],{

/***/ 105:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(106);


/***/ }),

/***/ 106:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adLoader = __webpack_require__(5);
var adaptermanager = __webpack_require__(1);

var DistrictmAdaptor = function districtmAdaptor() {
  var _this = this;

  var districtmUrl = window.location.protocol + '//prebid.districtm.ca/lib.js';
  this.callBids = function (params) {
    if (!window.hb_dmx_res) {
      adLoader.loadScript(districtmUrl, (function () {
        _this.sendBids(params);
      }));
    } else {
      _this.sendBids(params);
    }
    return params;
  };

  this.handlerRes = function (response, bidObject) {
    var bid = void 0;
    if (parseFloat(response.result.cpm) > 0) {
      bid = bidfactory.createBid(1);
      bid.bidderCode = bidObject.bidder;
      bid.cpm = response.result.cpm;
      bid.width = response.result.width;
      bid.height = response.result.height;
      bid.ad = response.result.banner;
      bidmanager.addBidResponse(bidObject.placementCode, bid);
    } else {
      bid = bidfactory.createBid(2);
      bid.bidderCode = bidObject.bidder;
      bidmanager.addBidResponse(bidObject.placementCode, bid);
    }

    return bid;
  };

  this.sendBids = function (params) {
    var bids = params.bids;
    for (var i = 0; i < bids.length; i++) {
      bids[i].params.sizes = window.hb_dmx_res.auction.fixSize(bids[i].sizes);
    }
    window.hb_dmx_res.auction.run(window.hb_dmx_res.ssp, bids, this.handlerRes);
    return bids;
  };

  return {
    callBids: this.callBids,
    sendBids: this.sendBids,
    handlerRes: this.handlerRes
  };
};

adaptermanager.registerBidAdapter(new DistrictmAdaptor(), 'districtmDMX');

module.exports = DistrictmAdaptor;

/***/ })

},[105]);