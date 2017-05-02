const bidmanager = require('../bidmanager.js');
const bidfactory = require('../bidfactory.js');
const utils = require('../utils.js');
const adloader = require('../adloader');

var BidfluenceAdapter = function BidfluenceAdapter() {

  const scriptUrl = "//cdn.bidfluence.com/forge.js";

  $$PREBID_GLOBAL$$.bfPbjsCB = function (bfr) {
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

    var cb = function () {
      /* globals FORGE */
      FORGE.init([adunitId, publisherId, pbjsBfobj, reservePrice]);
    };

    adloader.loadScript(scriptUrl, cb);
  }
  return {
    callBids: _callBids
  };
};

module.exports = BidfluenceAdapter;
