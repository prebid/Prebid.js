var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adLoader = require('../adloader');

var DistrictmAdaptor = function districtmAdaptor(){
  let districtmUrl = window.location.protocol + '//prebid.districtm.ca/lib.js';
  this.callBids = params =>{
    if(!window.hb_dmx_res){
      adLoader.loadScript(districtmUrl,()=>{
        this.sendBids(params);
      });
    }else{
      this.sendBids(params);
    }
    return params;
  };


  this.handlerRes = function(response, bidObject){
    let bid;
    if(parseFloat(response.result.cpm) > 0){
      bid = bidfactory.createBid(1);
      bid.bidderCode = bidObject.bidder;
      bid.cpm = response.result.cpm;
      bid.width = response.result.width;
      bid.height = response.result.height;
      bid.ad = response.result.banner;
      bidmanager.addBidResponse(bidObject.placementCode, bid);
    }else{
      bid = bidfactory.createBid(2);
      bid.bidderCode = bidObject.bidder;
      bidmanager.addBidResponse(bidObject.placementCode, bid);
    }

    return bid;
  };


  this.sendBids = function(params){
    var bids = params.bids;
    for(var i = 0; i < bids.length; i++){
      bids[i].params.sizes = window.hb_dmx_res.auction.fixSize(bids[i].sizes);
    }
    window.hb_dmx_res.auction.run(window.hb_dmx_res.ssp, bids, this.handlerRes);
    return bids;
  };


  return {
    callBids: this.callBids,
    sendBids: this.sendBids,
    handlerRes: this.handlerRes
  };
};

module.exports = DistrictmAdaptor;
