var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader.js');

var EPlanningAdapter = function EPlanningAdapter() {

  var ISV_DEFAULT = "aklc.img.e-planning.net";

  window.pbjs = window.pbjs || {};
  window.pbjs.processEPlanningResponse = function(response) {
    var bids, bidObject, i;
    if (response) {
      bids = response.bids;
      for (i = 0; i < bids.length; i++) {
        if (bids[i].ad) {
          bidObject = getBidObject(bids[i]);
          bidmanager.addBidResponse(bids[i].placementCode, bidObject);
        } else {
          bidObject = bidfactory.createBid(2);
          bidObject.bidderCode = 'eplanning';
          bidmanager.addBidResponse(bids[i].placementCode, bidObject);
        }
      }
    }
  };

  function getBidObject(bid) {
    var bidObject = bidfactory.createBid(1), i;
    bidObject.bidderCode = 'eplanning';
    for (i in bid.ad) {
      if (bid.ad.hasOwnProperty(i)) {
        bidObject[i] = bid.ad[i];
      }
    }
    return bidObject;
  }

  function _callBids(params) {
    var scriptURL = "http://" + ((params && params.bids && params.bids.length && params.bids[0].params && params.bids[0].params.isv) ? params.bids[0].params.isv : ISV_DEFAULT) + "/layers/hbpb.js";
    adloader.loadScript(scriptURL, function() {
      if (window.hpbp) {
        window.hbpb.call(params);
      }
    }, true);
  }

  return {
    callBids: _callBids
  };

};

module.exports = EPlanningAdapter;
