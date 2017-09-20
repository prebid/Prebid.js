pbjsChunk([29],{

/***/ 201:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(202);


/***/ }),

/***/ 202:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(0);
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var url = __webpack_require__(11);
var adaptermanager = __webpack_require__(1);

var SmartAdServer = function SmartAdServer() {
  var generateCallback = function generateCallback(bid) {
    var callbackId = 'sas_' + utils.getUniqueIdentifierStr();
    pbjs[callbackId] = function (adUnit) {
      var bidObject;
      if (adUnit) {
        utils.logMessage('[SmartAdServer] bid response for placementCode ' + bid.placementCode);
        bidObject = bidfactory.createBid(1);
        bidObject.bidderCode = 'smartadserver';
        bidObject.cpm = adUnit.cpm;
        bidObject.currency = adUnit.currency;
        bidObject.ad = adUnit.ad;
        bidObject.width = adUnit.width;
        bidObject.height = adUnit.height;
        bidObject.dealId = adUnit.dealId;
        bidmanager.addBidResponse(bid.placementCode, bidObject);
      } else {
        utils.logMessage('[SmartAdServer] no bid response for placementCode ' + bid.placementCode);
        bidObject = bidfactory.createBid(2);
        bidObject.bidderCode = 'smartadserver';
        bidmanager.addBidResponse(bid.placementCode, bidObject);
      }
    };
    return callbackId;
  };

  return {
    callBids: function callBids(params) {
      for (var i = 0; i < params.bids.length; i++) {
        var bid = params.bids[i];
        var adCall = url.parse(bid.params.domain);
        adCall.pathname = '/prebid';
        adCall.search = {
          'pbjscbk': 'pbjs.' + generateCallback(bid),
          'siteid': bid.params.siteId,
          'pgid': bid.params.pageId,
          'fmtid': bid.params.formatId,
          'ccy': bid.params.currency || 'USD',
          'bidfloor': bid.params.bidfloor || 0.0,
          'tgt': encodeURIComponent(bid.params.target || ''),
          'tag': bid.placementCode,
          'sizes': bid.sizes.map((function (size) {
            return size[0] + 'x' + size[1];
          })).join(','),
          'async': 1
        };
        adloader.loadScript(url.format(adCall));
      }
    }
  };
};

adaptermanager.registerBidAdapter(new SmartAdServer(), 'smartadserver');

module.exports = SmartAdServer;

/***/ })

},[201]);