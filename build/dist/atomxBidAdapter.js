pbjsChunk([84],{

/***/ 78:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(79);


/***/ }),

/***/ 79:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var CONSTANTS = __webpack_require__(4);
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var Ajax = __webpack_require__(6);
var utils = __webpack_require__(0);
var adaptermanager = __webpack_require__(1);

/**
 * Adapter for requesting bids from Atomx.
 *
 * @returns {{callBids: _callBids, responseCallback: _responseCallback}}
 */
var AtomxAdapter = function AtomxAdapter() {
  function _callBids(data) {
    if (!window.atomx_prebid) {
      adloader.loadScript(window.location.protocol + '//s.ato.mx/b.js', (function () {
        _bid(data);
      }), true);
    } else {
      _bid(data);
    }
  }

  function _bid(data) {
    var url = window.atomx_prebid();
    var bids = data.bids || [];
    for (var i = 0, ln = bids.length; i < ln; i++) {
      var bid = bids[i];
      if (bid.params && bid.params.id) {
        var sizes = utils.parseSizesInput(bid.sizes);
        for (var j = 0; j < sizes.length; j++) {
          Ajax.ajax(url, _responseCallback.bind(this, bid), {
            id: bid.params.id,
            size: sizes[j],
            prebid: bid.placementCode
          }, { method: 'GET', noDecodeWholeURL: true });
        }
      } else {
        var bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bid);
        bidObject.bidderCode = 'atomx';
        bidmanager.addBidResponse(bid.placementCode, bidObject);
      }
    }
  }

  function _responseCallback(bid, data) {
    var bidObject;
    try {
      data = JSON.parse(data);

      if (data.cpm && data.cpm > 0) {
        bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bid);
        bidObject.bidderCode = 'atomx';
        bidObject.cpm = data.cpm * 1000;
        if (data.adm) {
          bidObject.ad = data.adm;
        } else {
          bidObject.adUrl = data.url;
        }
        bidObject.width = data.width;
        bidObject.height = data.height;
        bidmanager.addBidResponse(bid.placementCode, bidObject);
        return;
      }
    } catch (_error) {
      utils.logError(_error);
    }

    bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bid);
    bidObject.bidderCode = 'atomx';
    bidmanager.addBidResponse(bid.placementCode, bidObject);
  }

  return {
    callBids: _callBids,
    responseCallback: _responseCallback
  };
};

adaptermanager.registerBidAdapter(new AtomxAdapter(), 'atomx');

module.exports = AtomxAdapter;

/***/ })

},[78]);