import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

const ENDPOINT = '//reachms.bfmio.com/bid.json?exchange_id=';

function BeachfrontAdapter() {
  var baseAdapter = Adapter.createNew('beachfront');

  baseAdapter.callBids = function (bidRequests) {
    const bids = bidRequests.bids || [];
    bids.forEach(function(bid) {
      var bidRequest = getBidRequest(bid);
      var RTBDataParams = prepareAndSaveRTBRequestParams(bid);
      if (!RTBDataParams) {
        var error = 'No bid params';
        utils.logError(error);
        if (bid && bid.placementCode) {
          bidmanager.addBidResponse(bid.placementCode, createBid(bid, STATUS.NO_BID));
        }
        return;
      }
      var BID_URL = ENDPOINT + RTBDataParams.appId;
      ajax(BID_URL, handleResponse(bidRequest), JSON.stringify(RTBDataParams), {
        contentType: 'text/plain',
        withCredentials: true
      });
    });
  };

  function getBidRequest(bid) {
    if (!bid || !bid.params || !bid.params.appId) {
      return;
    }

    var bidRequest = bid;
    bidRequest.width = parseInt(bid.sizes[0], 10) || undefined;
    bidRequest.height = parseInt(bid.sizes[1], 10) || undefined;
    return bidRequest;
  }

  function prepareAndSaveRTBRequestParams(bid) {
    if (!bid || !bid.params || !bid.params.appId || !bid.params.bidfloor) {
      return;
    }

    function fetchDeviceType() {
      return ((/(ios|ipod|ipad|iphone|android)/i).test(global.navigator.userAgent) ? 1 : ((/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(global.navigator.userAgent) ? 1 : 2));
    }

    var bidRequestObject = {
      isPrebid: true,
      appId: bid.params.appId,
      domain: document.location.hostname,
      imp: [{
        video: {
          w: bid.width,
          h: bid.height
        },
        bidfloor: bid.params.bidfloor
      }],
      site: {
        page: utils.getTopWindowLocation().host
      },
      device: {
        ua: navigator.userAgent,
        devicetype: fetchDeviceType()
      },
      cur: ['USD']
    };
    return bidRequestObject;
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(bidRequest) {
    return function(response) {
      var parsed;
      if (response) {
        try {
          parsed = JSON.parse(response);
        } catch (error) {
          utils.logError(error);
        }
      } else {
        utils.logWarn('No bid response');
      }

      if (!parsed || parsed.error || !parsed.url || !parsed.bidPrice) {
        utils.logWarn('No Valid Bid');
        bidmanager.addBidResponse(bidRequest.placementCode, createBid(bidRequest, STATUS.NO_BID));
        return;
      }

      var newBid = {};
      newBid.price = parsed.bidPrice;
      newBid.url = parsed.url;
      newBid.bidId = bidRequest.bidId;
      bidmanager.addBidResponse(bidRequest.placementCode, createBid(bidRequest, STATUS.GOOD, newBid));
    };
  }

  function createBid(bidRequest, status, tag) {
    var bid = bidfactory.createBid(status, tag);
    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = bidRequest.bidder;
    if (!tag || status !== STATUS.GOOD) {
      return bid;
    }

    bid.cpm = tag.price;
    bid.creative_id = tag.cmpId;
    bid.width = bidRequest.width;
    bid.height = bidRequest.height;
    bid.descriptionUrl = tag.url;
    bid.vastUrl = tag.url;
    bid.mediaType = 'video';

    return bid;
  }

  return {
    createNew: BeachfrontAdapter.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  };
}

BeachfrontAdapter.createNew = function () {
  return new BeachfrontAdapter();
};

module.exports = BeachfrontAdapter;
