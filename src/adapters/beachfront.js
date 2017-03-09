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

  // take bid requests and send them out to get bid responses.
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
        // XXX if this is anything other than 1, no ad is returned
        devicetype:2
      },
      cur:["USD"]
    };

    console.log("bid params:");
    console.log(bid.params);

    console.log("Bidfloor is $" + bid.params.bidfloor);

    if (bidRequestObject.appId.length !== 36) {
      console.error("Bid request failed. Ensure your appId is accurate.");
      return bidRequestObject;
    } else if (!bid.params.bidfloor){
      console.error("Bid request failed. No bid floor specified.");
      return bidRequestObject;
    } else {
      console.log("Bid request is successful: ");
      console.log(bidRequest);
      console.log(bidRequestObject);
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

    console.log("Parsed object is: ");
    console.log(parsed);

    if (!parsed || parsed.error || !parsed.url || !parsed.bidPrice) {
      bidmanager.addBidResponse(bidRequest.placementCode, createBid(STATUS.NO_BID));
      console.log("Status is no bid. Check yourself.");
      return;
    }

    var newBid = {};
    newBid.price = parsed.bidPrice;
    newBid.url = parsed.url;
    console.log("Winning bid has a CPM of $" + newBid.price);

    bidmanager.addBidResponse(bidRequest.placementCode, createBid(STATUS.GOOD, newBid));
    console.log("Status is good! Bid accepted!");
  }

  function createBid(status, tag) {
    var bid = bidfactory.createBid(status, tag);

    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = bidRequest.bidder;

    if (!tag || status !== STATUS.GOOD) {
      console.log("Failing: " + tag + status);
      return bid;
    }

    bid.cpm = tag.price;
    bid.creative_id = tag.cmpId;
    bid.width = bidRequest.width;
    bid.height = bidRequest.height;
    bid.descriptionUrl = tag.url;
    bid.vastUrl = tag.url;

    bid.mediaType = 'video';


    console.log("Bid object is ");
    console.log(bid);

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
