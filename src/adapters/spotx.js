import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
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
  }

  function loadDSDK()
  {
    var channelId = bidReq.params.video.channel_id;
    var tag = document.createElement('script');
    tag.src = '//js.spotx.tv/directsdk/v1/' + channelId + '.js';
    tag.async = true;
    tag.type = 'text/javascript';
    tag.onload = initDSDK;
    document.head.appendChild(tag);
  }

  function initDSDK()
  {
    var options = bidReq.params.video;
    options.slot = document.getElementById(bidReq.params.video.slot);
    options.video_slot = document.getElementById(bidReq.params.video.video_slot);

    var directAdOS = new SpotX.DirectAdOS(options);

    directAdOS.getAdServerKVPs().then(function(adServerKVPs) {
      var resp = {};
      resp.bids = [];
      var obj = {};

      obj.cmpID = bidReq.params.video.channel_id;
      obj.cpm = adServerKVPs.spotx_bid;
      obj.url = adServerKVPs.spotx_ad_key;
      obj.cur = 'USD';
      obj.bidderCode = 'spotx';
      obj.height = bidReq.sizes[0][1];
      obj.width = bidReq.sizes[0][0];
      resp.bids.push(obj);
      KVP_Object = adServerKVPs;
      handleResponse(resp);
    },function(error){
      handleResponse()
    });
  }

  function createBid(status, tag)
  {
    var bidRequest = utils.getBidRequest(bidReq.bidId);

    var bid = bidfactory.createBid(status, bidRequest);
    var url = '//search.spotxchange.com/ad/vast.html?key=' + KVP_Object.spotx_ad_key;
    bid.code = bidReq.bidder;
    bid.bidderCode = bidReq.bidder;
    bid.mediaType = 'video';

    bid.cpm = KVP_Object.spotx_bid;
    bid.vastUrl = url;
    bid.descriptionUrl = url;
    bid.ad = url;

    bid.width = bidReq.sizes[0][0];
    bid.height = bidReq.sizes[0][1];

    bid.placementCode = bidReq.placementCode;
    bid.requestId = bidReq.requestId;
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
    setBidderCode: baseAdapter.setBidderCode,
  };
}

Spotx.createNew = function() {
  return new Spotx();
};

module.exports = Spotx;
