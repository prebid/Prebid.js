var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');

var PulsePointAdapter = function PulsePointAdapter() {

  var getJsStaticUrl = window.location.protocol + '//tag.contextweb.com/getjs.static.js';
  var bidUrl = window.location.protocol + '//bid.contextweb.com/header/tag';

  function _callBids(params) {
    if (typeof window.pp === 'undefined') {
      adloader.loadScript(getJsStaticUrl, function () { bid(params); }, true);
    } else {
      bid(params);
    }
  }

  function bid(params) {
    var bids = params.bids;
    for (var i = 0; i < bids.length; i++) {
      var bidRequest = bids[i];
      var callback = bidResponseCallback(bidRequest);
      var ppBidRequest = new window.pp.Ad({
        cf: bidRequest.params.cf,
        cp: bidRequest.params.cp,
        ct: bidRequest.params.ct,
        cn: 1,
        ca: window.pp.requestActions.BID,
        cu: bidUrl,
        adUnitId: bidRequest.placementCode,
        callback: callback
      });
      ppBidRequest.display();
    }
  }

  function bidResponseCallback(bid) {
    return function (bidResponse) {
      bidResponseAvailable(bid, bidResponse);
    };
  }

  function bidResponseAvailable(bidRequest, bidResponse) {
    if (bidResponse) {
      var adSize = bidRequest.params.cf.toUpperCase().split('X');
      var bid = bidfactory.createBid(1);
      bid.bidderCode = bidRequest.bidder;
      bid.cpm = bidResponse.bidCpm;
      bid.ad = bidResponse.html;
      bid.width = adSize[0];
      bid.height = adSize[1];
      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    } else {
      var passback = bidfactory.createBid(2);
      passback.bidderCode = bidRequest.bidder;
      bidmanager.addBidResponse(bidRequest.placementCode, passback);
    }
  }

  return {
    callBids: _callBids
  };

};

module.exports = PulsePointAdapter;
