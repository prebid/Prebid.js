import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';

var ServerBidAdapter = function ServerBidAdapter() {

  var baseAdapter = Adapter.createNew('serverbid');

  var BASE_URI = '//e.serverbid.com/api/v2';

  var sizeMap = [null,
    "120x90",
    "120x90",
    "468x60",
    "728x90",
    "300x250",
    "160x600",
    "120x600",
    "300x100",
    "180x150",
    "336x280",
    "240x400",
    "234x60",
    "88x31",
    "120x60",
    "120x240",
    "125x125",
    "220x250",
    "250x250",
    "250x90",
    "0x0",
    "200x90",
    "300x50",
    "320x50",
    "320x480",
    "185x185",
    "620x45",
    "300x125",
    "800x250"
  ];

  baseAdapter.callBids = function(params) {

    if (params && params.bids && utils.isArray(params.bids) && params.bids.length) {

      var data = {
        placements: [],
        time: Date.now(),
        user: {},
        url: document.location.href,
        referrer: document.referrer,
        enableBotFiltering: true
      };

      var bids = params.bids || [];
      for (var i = 0; i < bids.length; i++) {

        var bid = bids[i];

        var bid_data = {
          networkId: bid.params.networkId,
          siteId: bid.params.siteId,
          zoneIds: bid.params.zoneIds,
          campaignId: bid.params.campaignId,
          flightId: bid.params.flightId,
          adId: bid.params.adId,
          divName: bid.bidId,
          adTypes: getSize(bid.sizes),
          includePricingData: true
        };

        if (bid_data.networkId && bid_data.siteId) {
          data.placements.push(bid_data);
        }

      }

      if (data.placements.length) {
        ajax(BASE_URI, _responseCallback, JSON.stringify(data), { method: 'POST', withCredentials: false, contentType: 'application/json' });
      }

    }

  };

  function _responseCallback(result) {

    result = JSON.parse(result);

    if (result && result.decisions) {

      for (var key in result.decisions) {

        var bid;
        var bidCode;
        var placementCode;
        var bidObj = utils.getBidRequest(key);
        var decision = result.decisions[key];
        var price = decision.pricing && decision.pricing.clearPrice || Math.floor(Math.random() * 10) + 1;

        if (bidObj) {

          console.log(bidObj);

          if (price && price > 0) {

            bid = bidfactory.createBid(1, bidObj);
            bidCode = bidObj.bidder;
            placementCode = bidObj.placementCode;

            bid.bidderCode = bidCode;
            bid.cpm = price;
            bid.width = decision.width;
            bid.height = decision.height;
            bid.ad = retrieveAd(decision);

            bidmanager.addBidResponse(placementCode, bid);

          } else {

            //send a no bid response.
            bid = bidfactory.createBid(2, bidObj);
            bid.bidderCode = bidCode;

            bidmanager.addBidResponse(placementCode, bid);

          }

        }

      }

    }

  }

  function retrieveAd(decision) {
    return decision.contents && decision.contents[0] && decision.contents[0].body + utils.createTrackPixelHtml(decision.impressionUrl);
  }

  function getSize(sizes) {
    var result = [];
    sizes.forEach(function(size) {
      result.push(sizeMap.indexOf(size[0] + "x" + size[1]));
    });
    return result;
  }

  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: baseAdapter.callBids
  };

};

ServerBidAdapter.createNew = function() {
  return new ServerBidAdapter();
};

module.exports = ServerBidAdapter;