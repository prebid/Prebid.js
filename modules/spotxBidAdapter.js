import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import adLoader from 'src/adloader';
import * as utils from 'src/utils';
import { STATUS } from 'src/constants';
import adaptermanager from 'src/adaptermanager';

function Spotx() {
  let baseAdapter = new Adapter('Spotx');
  let bidReq;
  let KVP_Object;

  baseAdapter.callBids = function(bidRequest) {
    if (!bidRequest || !bidRequest.bids || bidRequest.bids.length === 0) {
      return;
    }
    bidReq = bidRequest.bids[0] || [];

    if (!validateParams(bidReq)) {
      console.log('Bid Request does not contain valid parameters.');
      return;
    }

    loadDSDK();
  };

  // Load the SpotX Direct AdOS SDK onto the page
  function loadDSDK() {
    var channelId = bidReq.params.video.channel_id;
    adLoader.loadScript('//js.spotx.tv/directsdk/v1/' + channelId + '.js', initDSDK, true);
  }

  // We have a Direct AdOS SDK! Set options and initialize it!
  function initDSDK() {
    var options = bidReq.params.video;

    // If we are passed a id string set the slot and video slot to the element using that id.
    if (typeof options.slot === 'string') {
      options.slot = document.getElementById(bidReq.params.video.slot);
    }
    if (typeof options.video_slot === 'string') {
      options.video_slot = document.getElementById(bidReq.params.video.video_slot);
    }

    var directAdOS = new SpotX.DirectAdOS(options);

    directAdOS.getAdServerKVPs().then(function(adServerKVPs) {
      // Got an ad back. Build a successful response.
      var resp = {
        bids: []
      };
      var bid = {};

      bid.cmpID = bidReq.params.video.channel_id;
      bid.cpm = adServerKVPs.spotx_bid;
      bid.url = adServerKVPs.spotx_ad_key;
      bid.cur = 'USD';
      bid.bidderCode = 'spotx';
      var sizes = utils.isArray(bidReq.sizes[0]) ? bidReq.sizes[0] : bidReq.sizes;
      bid.height = sizes[1];
      bid.width = sizes[0];
      resp.bids.push(bid);
      KVP_Object = adServerKVPs;
      handleResponse(resp);
    }, function() {
      // No ad...
      handleResponse()
    });
  }

  function createBid(status) {
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
      bid.ad = url;

      var sizes = utils.isArray(bidReq.sizes[0]) ? bidReq.sizes[0] : bidReq.sizes;
      bid.height = sizes[1];
      bid.width = sizes[0];
    }

    return bid;
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    if (!response || !response.bids || !response.bids.length) {
      bidmanager.addBidResponse(bidReq.placementCode, createBid(STATUS.NO_BID));
    } else {
      bidmanager.addBidResponse(bidReq.placementCode, createBid(STATUS.GOOD, response.bids[0]));
    }
  }

  function validateParams(request) {
    if (typeof request.params !== 'object' && typeof request.params.video !== 'object') {
      return false;
    }

    // Check that all of our required parameters are defined.
    if (bidReq.params.video.channel_id === undefined || bidReq.params.video.slot === undefined || bidReq.params.video.video_slot === undefined) {
      return false;
    }
    return true;
  }

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  });
}

adaptermanager.registerBidAdapter(new Spotx(), 'spotx', {
  supportedMediaTypes: ['video']
});

module.exports = Spotx;
