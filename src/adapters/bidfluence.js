var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');
var utils = require('../utils.js');

var BidderNameAdapter = function BidderNameAdapter() {

  var bfPbjsCB = [];
  window.bfPbjsCB = function (bfr) {
    bfPbjsCB["" + bfr.cbID](bfr);
  };

 //Callback
  var bidfluenceCB = function (bfr) {
    var bidObject = null;

    if (bfr.cpm > 0) {
      bidObject = bidfactory.createBid(1);
      bidObject.bidderCode = 'bidfluence';
      bidObject.cpm = bfr.cpm;
      bidObject.ad = bfr.ad;
      bidObject.width = bfr.width;
      bidObject.height = bfr.height;
    } else {
      bidObject = bidfactory.createBid(2);
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

    var cbID = utils.getUniqueIdentifierStr();
    var adunitId = utils.getBidIdParameter('adunitId', bid.params);
    /* jshint ignore:start */
    var publisherId = utils.getBidIdParameter('pubId', bid.params);
    var reservePrice = utils.getBidIdParameter('reservePrice', bid.params);//This is optional. For dynamic reserve price only.
    var pbjsBfobj = {
      cbID: cbID,
      placementCode: bid.placementCode
    };
    /* jshint ignore:end */
    var s = document.createElement('script');
    s.async = true;
    s.id = adunitId;
    s.onload = function () {
      /* jshint ignore:start */
      FORGE.init([adunitId, publisherId, pbjsBfobj, reservePrice]);
      FORGE.fire();
      /* jshint ignore:end */
    };
    s.src = "//bidfluence.azureedge.net/forge.js"; 0

    var b = document.getElementsByTagName('head')[0];
    b.parentNode.insertBefore(s, b);

    bfPbjsCB[cbID] = bidfluenceCB;
  }

  return {
    callBids: _callBids
  };
};

module.exports = BidderNameAdapter;