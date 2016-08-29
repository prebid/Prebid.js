/*jshint loopfunc: true */

var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');

var GetIntentAdapter = function GetIntentAdapter() {
  var headerBiddingStaticJS = window.location.protocol + '//cdn.adhigh.net/adserver/hb.js';

  function _callBids(params) {
    if (typeof window.gi_hb === 'undefined') {
      adloader.loadScript(headerBiddingStaticJS, function() {
        bid(params);
      }, true);
    } else {
      bid(params);
    }
  }

  function bid(params) {
    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var bidRequest = bids[i];
      window.gi_hb.makeBid({
        pid: bidRequest.params.pid, // required
        tid: bidRequest.params.tid, // required
        cur: bidRequest.params.cur, // optional
        floor: bidRequest.params.floor, // optional
        known: bidRequest.params.known || 1, // optional
        size: bidRequest.sizes[0].join("x"),
      }, function(bidResponse) {
        if (bidResponse.no_bid === 1) {
          var nobid = bidfactory.createBid(2);
          nobid.bidderCode = bidRequest.bidder;
          bidmanager.addBidResponse(bidRequest.placementCode, nobid);
        } else {
          var size = bidResponse.size.split('x');
          var bid = bidfactory.createBid(1);
          bid.bidderCode = bidRequest.bidder;
          bid.cpm = bidResponse.cpm;
          bid.ad = bidResponse.ad;
          bid.width = size[0];
          bid.height = size[1];
          bidmanager.addBidResponse(bidRequest.placementCode, bid);
        }
      });
    }
  }

  return {
    callBids: _callBids
  };
};

module.exports = GetIntentAdapter;