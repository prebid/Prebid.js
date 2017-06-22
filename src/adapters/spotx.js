import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import adLoader from 'src/adloader';
import * as utils from 'src/utils';
import { STATUS } from 'src/constants';

function Spotx() {
  let baseAdapter = Adapter.createNew('Spotx');
  let bidReq;
  let KVP_Object;

  baseAdapter.callBids = function(bidRequest) {
    if (!bidRequest || !bidRequest.bids || bidRequest.bids.length === 0) {
      return;
    }
    bidReq = bidRequest.bids[0] || [];
    loadDSDK();
  };

  // Load the SpotX Direct AdOS SDK onto the page
  function loadDSDK()
  {
    var channelId = bidReq.params.video.channel_id;
    adLoader.loadScript('//js.spotx.tv/directsdk/v1/' + channelId + '.js', initDSDK, true);
  }

  // We have a Direct AdOS SDK! Set options and initialize it!
  function initDSDK()
  {
    var options = bidReq.params.video;

    var directAdOS = new SpotX.DirectAdOS(options);

    directAdOS.getAdServerKVPs().then(function(adServerKVPs) {
      // Got an ad back. Build a successful response.
      var resp = {
        bids: []
      };
      var bid = {};

      bid.cmpID = bidReq.params.video.channel_id;
      bid.cpm = adServerKVPs['spotx_bid'];
      bid.url = adServerKVPs['spotx_ad_key'];
      bid.cur = 'USD';
      bid.bidderCode = 'spotx';
      bid.height = bidReq.sizes[0][1];
      bid.width = bidReq.sizes[0][0];
      resp.bids.push(bid);
      KVP_Object = adServerKVPs;
      handleResponse(resp);
    }, function() {
      // No ad...
      handleResponse()
    });
  }

  function createBid(status)
  {
    var bid = bidfactory.createBid(status, utils.getBidRequest(bidReq.bidId));

    // Stuff we have no matter what
    bid.bidderCode = bidReq.bidder;
    bid.placementCode = bidReq.placementCode;
    bid.requestId = bidReq.requestId;
    bid.code = bidReq.bidder;

    // Stuff we only get with a successful response
    if (status === STATUS.GOOD && KVP_Object) {
      let url = '//search.spotxchange.com/ad/vast.html?key=' + KVP_Object.spotx_ad_key;
      bid.mediaType = 'video';

      bid.cpm = KVP_Object.spotx_bid;
      bid.vastUrl = url;
      bid.descriptionUrl = url;
      bid.ad = url;

      bid.width = bidReq.sizes[0][0];
      bid.height = bidReq.sizes[0][1];
    }

    return bid;
  }

    /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    if (!response || !response.bids || !response.bids.length) {
      bidmanager.addBidResponse(bidReq.placementCode, createBid(STATUS.NO_BID));
    }
    else {
      bidmanager.addBidResponse(bidReq.placementCode, createBid(STATUS.GOOD, response.bids[0]));
    }
  }

  return {
    createNew: Spotx.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  };
}

Spotx.createNew = function() {
  return new Spotx();
};

module.exports = Spotx;
