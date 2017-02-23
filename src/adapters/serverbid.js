import { getBidRequest } from '../utils.js';

var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var Ajax = require('../ajax');

var BidderNameAdapter = function BidderNameAdapter() {

  const BASE_URI = '//e.serverbid.com/api/v2';

  var timestamp = Date.now();

  function _callBids(params) {

    var data = {
      placements: [],
      time: timestamp,
      user: {}
    };

    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {

      var bid = bids[i];

      var bid_data = {
        networkId: bid.params.networkId,
        siteId: bid.params.siteId,
        divName: bid.bidId,
        adTypes: bid.params.adTypes,
        includePricingData: true
      };

      // data.user.key = readCookie('azk');
      // console.log(data.user.key);

      data.placements.push(bid_data);
    }

    Ajax.ajax(BASE_URI, _responseCallback, JSON.stringify(data), { method: 'POST', withCredentials: false, contentType: 'application/json' });

  }

  function _responseCallback(result) {

    result = JSON.parse(result);

    if (result && result.decisions) {
      for (var key in result.decisions) {

        var bidObj = getBidRequest(key);
        var decision = result.decisions[key];
        var bidCode;
        var placementCode;

        if (bidObj) {

          var bid = bidfactory.createBid(1, bidObj);

          bidCode = bidObj.bidder;
          placementCode = bidObj.placementCode;

          bid.bidderCode = bidCode;
          bid.cpm = decision.pricing && decision.pricing.clearPrice || Math.floor(Math.random() * 10);
          bid.width = decision.width;
          bid.height = decision.height;

          console.log(bid);

          bidmanager.addBidResponse(placementCode, bid);

        }
      }
    }
  }

  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };

};

module.exports = BidderNameAdapter;