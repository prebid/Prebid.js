pbjsChunk([81],{

/***/ 84:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(85);


/***/ }),

/***/ 85:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var bidmanager = __webpack_require__(2);
var bidfactory = __webpack_require__(3);
var utils = __webpack_require__(0);
var adloader = __webpack_require__(5);
var adaptermanager = __webpack_require__(1);

var BidfluenceAdapter = function BidfluenceAdapter() {
  var scriptUrl = '//cdn.bidfluence.com/forge.js';

  pbjs.bfPbjsCB = function (bfr) {
    var bidRequest = utils.getBidRequest(bfr.cbID);
    var bidObject = null;
    if (bfr.cpm > 0) {
      bidObject = bidfactory.createBid(1, bidRequest);
      bidObject.bidderCode = 'bidfluence';
      bidObject.cpm = bfr.cpm;
      bidObject.ad = bfr.ad;
      bidObject.width = bfr.width;
      bidObject.height = bfr.height;
    } else {
      bidObject = bidfactory.createBid(2, bidRequest);
      bidObject.bidderCode = 'bidfluence';
    }

    bidmanager.addBidResponse(bfr.placementCode, bidObject);
  };

  function _callBids(params) {
    var bfbids = params.bids || [];
    for (var i = 0; i < bfbids.length; i++) {
      var bid = bfbids[i];
      call(bid);
    }
  }
  function call(bid) {
    var adunitId = utils.getBidIdParameter('adunitId', bid.params);
    var publisherId = utils.getBidIdParameter('pubId', bid.params);
    var reservePrice = utils.getBidIdParameter('reservePrice', bid.params);
    var pbjsBfobj = {
      placementCode: bid.placementCode,
      cbID: bid.bidId
    };

    var cb = function cb() {
      /* globals FORGE */
      FORGE.init([adunitId, publisherId, pbjsBfobj, reservePrice]);
    };

    adloader.loadScript(scriptUrl, cb);
  }
  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new BidfluenceAdapter(), 'bidfluence');

module.exports = BidfluenceAdapter;

/***/ })

},[84]);