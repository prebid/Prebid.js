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

  var _bidMaker = function(params) {
    var bidReq = params.bidReq;
    var bidResp = params.bidResp;
    if (bidResp.no_bid === 1) {
      var nobid = bidfactory.createBid(2);
      nobid.bidderCode = bidReq.bidder;
      bidmanager.addBidResponse(bidReq.placementCode, nobid);
    } else {
      var size = bidResp.size.split('x');
      var bid = bidfactory.createBid(1);
      bid.bidderCode = bidReq.bidder;
      bid.cpm = bidResp.cpm;
      bid.ad = bidResp.ad;
      bid.width = size[0];
      bid.height = size[1];
      bidmanager.addBidResponse(bidReq.placementCode, bid);
    }
  };

  function bidMaker(bidReq) {
    return function(bidResp) {
      _bidMaker({
        bidReq : bidReq,
        bidResp : bidResp
      });
    };
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
      }, bidMaker(bidRequest));
    } 
  }

  return {  
    callBids: _callBids 
  };
};

module.exports = GetIntentAdapter;