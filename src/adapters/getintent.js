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
      var callback = bidResponseCallback(bidRequest);   
      window.gi_hb.makeBid({
        pid: bidRequest.params.pid,
        tid: bidRequest.params.tid,
        cur: bidRequest.params.cur,
        size: bidRequest.params.size,
        floor: bidRequest.params.floor,
        known: 0
      }, callback);  
    } 
  }

   
  function bidResponseCallback(bid) {  
    return function(bidResponse) {   
      bidResponseAvailable(bid, bidResponse);  
    }; 
  }

  function bidResponseAvailable(bidRequest, bidResponse) {
    if (bidResponse.no_bid === 1) {
      var passback = bidfactory.createBid(2);
      passback.bidderCode = bidRequest.bidder;
      bidmanager.addBidResponse(bidRequest.placementCode, passback);
    } else {
      var adSize = bidRequest.params.size.toUpperCase().split('X');
      var bid = bidfactory.createBid(1);
      bid.bidderCode = bidRequest.bidder;
      bid.cpm = bidResponse.cpm;
      bid.ad = bidResponse.ad;
      bid.width = adSize[0];
      bid.height = adSize[1];
      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    }
  }

   
  return {  
    callBids: _callBids 
  };
};

module.exports = GetIntentAdapter;
