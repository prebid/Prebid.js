var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');
var utils = require('../utils.js');

var UnderdogMediaAdapter = function UnderdogMediaAdapter() {

  var getJsStaticUrl = window.location.protocol + '//bid.underdog.media/udm_header_lib.js';

  function _callBids(params) {
    if (typeof window.udm_header_lib === 'undefined') {
      adloader.loadScript(getJsStaticUrl, function () { bid(params); });
    } else {
      bid(params);
    }
  }

  function bid(params) {
    var bids = params.bids;
    var mapped_bids = [];
    for (var i = 0; i < bids.length; i++) {
      var bidRequest = bids[i];
      var callback = bidResponseCallback(bidRequest);
      mapped_bids.push({
        sizes: bidRequest.sizes,
        siteId: bidRequest.params.siteId,
        bidfloor: bidRequest.params.bidfloor,
        placementCode: bidRequest.placementCode,
        divId: bidRequest.params.divId,
        subId: bidRequest.params.subId,
        callback: callback
      });
    }
    var udmBidRequest = new window.udm_header_lib.BidRequestArray(mapped_bids);
    udmBidRequest.send();
  }

  function bidResponseCallback(bid) {
    return function (bidResponse) {
      bidResponseAvailable(bid, bidResponse);
    };
  }

  function bidResponseAvailable(bidRequest, bidResponse) {
    if(bidResponse.bids.length > 0){
      for(var i = 0; i < bidResponse.bids.length; i++){
        var udm_bid = bidResponse.bids[i];
        var bid = bidfactory.createBid(1);
        bid.bidderCode = bidRequest.bidder;
        bid.cpm = udm_bid.cpm;
        bid.width = udm_bid.width;
        bid.height = udm_bid.height;

        if(udm_bid.ad_url !== undefined){
          bid.adUrl = udm_bid.ad_url;
        }
        else if(udm_bid.ad_html !== undefined){
          bid.ad = udm_bid.ad_html;
        }else{
          utils.logMessage('Underdogmedia bid is lacking both ad_url and ad_html, skipping bid');
          continue;
        }

        bidmanager.addBidResponse(bidRequest.placementCode, bid);
      }
    }else{
      var nobid = bidfactory.createBid(2);
      nobid.bidderCode = bidRequest.bidder;
      bidmanager.addBidResponse(bidRequest.placementCode, nobid);
    }
  }

  return {
    callBids: _callBids
  };

};

module.exports = UnderdogMediaAdapter;
