pbjsChunk([67],{

/***/ 115:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(116);


/***/ }),

/***/ 116:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var utils = __webpack_require__(0);
var bidfactory = __webpack_require__(3);
var bidmanager = __webpack_require__(2);
var adloader = __webpack_require__(5);
var STATUS = __webpack_require__(4).STATUS;
var adaptermanager = __webpack_require__(1);

var FidelityAdapter = function FidelityAdapter() {
  var FIDELITY_BIDDER_NAME = 'fidelity';
  var FIDELITY_SERVER_NAME = 'x.fidelity-media.com';

  function _callBids(params) {
    var bids = params.bids || [];
    bids.forEach((function (currentBid) {
      var server = currentBid.params.server || FIDELITY_SERVER_NAME;
      var m3_u = window.location.protocol + '//' + server + '/delivery/hb.php?';
      m3_u += 'callback=window.pbjs.fidelityResponse';
      m3_u += '&requestid=' + utils.getUniqueIdentifierStr();
      m3_u += '&impid=' + currentBid.bidId;
      m3_u += '&zoneid=' + currentBid.params.zoneid;
      m3_u += '&cb=' + Math.floor(Math.random() * 99999999999);
      m3_u += document.charset ? '&charset=' + document.charset : document.characterSet ? '&charset=' + document.characterSet : '';

      var loc;
      try {
        loc = window.top !== window ? document.referrer : window.location.href;
      } catch (e) {
        loc = document.referrer;
      }
      loc = currentBid.params.loc || loc;
      m3_u += '&loc=' + encodeURIComponent(loc);

      var subid = currentBid.params.subid || 'hb';
      m3_u += '&subid=' + subid;
      if (document.referrer) m3_u += '&referer=' + encodeURIComponent(document.referrer);
      if (currentBid.params.click) m3_u += '&ct0=' + encodeURIComponent(currentBid.params.click);
      m3_u += '&flashver=' + encodeURIComponent(getFlashVersion());

      adloader.loadScript(m3_u);
    }));
  }

  function getFlashVersion() {
    var plugins, plugin, result;

    if (navigator.plugins && navigator.plugins.length > 0) {
      plugins = navigator.plugins;
      for (var i = 0; i < plugins.length && !result; i++) {
        plugin = plugins[i];
        if (plugin.name.indexOf('Shockwave Flash') > -1) {
          result = plugin.description.split('Shockwave Flash ')[1];
        }
      }
    }
    return result || '';
  }

  function addBlankBidResponses(placementsWithBidsBack) {
    var allFidelityBidRequests = pbjs._bidsRequested.find((function (bidSet) {
      return bidSet.bidderCode === FIDELITY_BIDDER_NAME;
    }));

    if (allFidelityBidRequests && allFidelityBidRequests.bids) {
      utils._each(allFidelityBidRequests.bids, (function (fidelityBid) {
        if (!utils.contains(placementsWithBidsBack, fidelityBid.placementCode)) {
          // Add a no-bid response for this placement.
          var bid = bidfactory.createBid(STATUS.NO_BID, fidelityBid);
          bid.bidderCode = FIDELITY_BIDDER_NAME;
          bidmanager.addBidResponse(fidelityBid.placementCode, bid);
        }
      }));
    }
  }

  pbjs.fidelityResponse = function (responseObj) {
    if (!responseObj || !responseObj.seatbid || responseObj.seatbid.length === 0 || !responseObj.seatbid[0].bid || responseObj.seatbid[0].bid.length === 0) {
      addBlankBidResponses([]);
      return;
    }

    var bid = responseObj.seatbid[0].bid[0];
    var status = bid.adm ? STATUS.GOOD : STATUS.NO_BID;
    var requestObj = utils.getBidRequest(bid.impid);

    var bidResponse = bidfactory.createBid(status);
    bidResponse.bidderCode = FIDELITY_BIDDER_NAME;
    if (status === STATUS.GOOD) {
      bidResponse.cpm = parseFloat(bid.price);
      bidResponse.ad = bid.adm;
      bidResponse.width = parseInt(bid.width);
      bidResponse.height = parseInt(bid.height);
    }
    var placementCode = requestObj && requestObj.placementCode;
    bidmanager.addBidResponse(placementCode, bidResponse);
  };

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new FidelityAdapter(), 'fidelity');

module.exports = FidelityAdapter;

/***/ })

},[115]);