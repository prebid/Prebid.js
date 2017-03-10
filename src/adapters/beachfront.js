import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

const ENDPOINT = '//ads.bf.rebel.ai/bid.json?exchange_id=';

function BeachfrontAdapter() {
  var baseAdapter = Adapter.createNew('beachfront'),
    bidRequest;

  baseAdapter.callBids = function (bidRequests) {
    if (!bidRequests || !bidRequests.bids || bidRequests.bids.length === 0) {
      return;
    }

    var RTBDataParams = prepareAndSaveRTBRequestParams(bidRequests.bids[0]);
    if (!RTBDataParams) {
      return;
    }
    var BID_URL = ENDPOINT + RTBDataParams.appId;

    ajax(BID_URL, handleResponse, JSON.stringify(RTBDataParams), {
      contentType: 'text/plain',
      withCredentials: true
    });
  };

  function prepareAndSaveRTBRequestParams(bid) {
    if (!bid || !bid.params) {
      return;
    }

    bidRequest = bid;
    bidRequest.width = parseInt(bid.sizes[0], 10) || undefined;
    bidRequest.height = parseInt(bid.sizes[1], 10) || undefined;

    var bidRequestObject =  {
      isPrebid: true,
      appId: bid.params.appId || undefined,
      domain: document.location.hostname,
      imp:[{
        video:{},
        bidfloor: bid.params.bidfloor
      }],
      site:{
        page:"http://www.rebelai.com"
      },
      device:{
        ua: navigator.userAgent,
        // XXX need to get IP from device
        ip:"100.6.143.190",
        devicetype:2
      },
      cur:["USD"]
    };
    if (bidRequestObject.appId.length !== 36) {
      return bidRequestObject;
    } else if (!bid.params.bidfloor){
      return bidRequestObject;
    } else {
      return bidRequestObject;
    }
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    var parsed;
    try {
      parsed = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!parsed || parsed.error || !parsed.url || !parsed.bidPrice) {
      bidmanager.addBidResponse(bidRequest.placementCode, createBid(STATUS.NO_BID));
      return;
    }

    var newBid = {};
    newBid.price = parsed.bidPrice;
    newBid.url = parsed.url;


    bidmanager.addBidResponse(bidRequest.placementCode, createBid(STATUS.GOOD, newBid));
  }

  function createBid(status, tag) {
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
