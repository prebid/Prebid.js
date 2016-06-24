var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');

module.exports = function() {
  var req_url_base = 'https://rex.adequant.com/rex/c2s_prebid?';

  function _callBids(params) {
    var req_url = [];
    var publisher_id = null;
    var sizes = [];
    var cats = null;
    var replies = [];
    var placements = {};

    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var bid_request = bids[i];
      var br_params = bid_request.params || {};
      placements[bid_request.placementCode] = true;

      publisher_id = br_params.publisher_id.toString()    || publisher_id;
      var bidfloor = br_params.bidfloor                   || 0.01;
      cats         = br_params.cats                       || cats;
      if (typeof(cats) === 'string') { cats = cats.split(' '); }
      for (var j = 0; j < bid_request.sizes.length; j++) {
        sizes.push(bid_request.sizes[j].join('x')+'_'+bidfloor);
        replies.push(bid_request.placementCode);
      }
    }
    // send out 1 bid request for all bids
    if (publisher_id) { req_url.push('a='+publisher_id); }
    if (cats)         { req_url.push('c='+cats.join('+')); }
    if (sizes)        { req_url.push('s='+sizes.join('+')); }
    
    adloader.loadScript(req_url_base+req_url.join('&'), function() { process_bids(replies, placements, bids); });
  }

  function process_bids(replies, placements, bids) {
    var placement_code, bid, adequant_creatives = window.adequant_creatives;
    if (adequant_creatives && adequant_creatives.seatbid) {
      for (var i=0; i<adequant_creatives.seatbid.length; i++) {
        var bid_response = adequant_creatives.seatbid[i].bid[0];
        placement_code = replies[parseInt(bid_response.impid,10)-1];
        if (!placement_code || !placements[placement_code]) { continue; }
        const bidRequestId = bids.find(bid => bid.placementCode === placement_code).bidId;
        bid = bidfactory.createBid(1, bidRequestId);
        bid.bidderCode = 'adequant';
        bid.cpm = bid_response.price;
        bid.ad = bid_response.adm;
        bid.width = bid_response.w;
        bid.height = bid_response.h;
        bidmanager.addBidResponse(placement_code, bid);
        placements[placement_code] = false;
      }
    }
    for (placement_code in placements) {
      const bidRequestId = bids.find(bid => bid.placementCode === placement_code).bidId;
      if (placements[placement_code]) {
        bid = bidfactory.createBid(2, bidRequestId);
        bid.bidderCode = 'adequant';
        bidmanager.addBidResponse(placement_code, bid);
      }
    }
  }
  
  return {
    callBids: _callBids
  };
};
