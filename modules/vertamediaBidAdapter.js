import Adapter from 'src/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';
import adaptermanager from 'src/adaptermanager';

const ENDPOINT = '//rtb.vertamedia.com/hb/';

function VertamediaAdapter() {
  const baseAdapter = new Adapter('vertamedia');
  let bidRequest;

  baseAdapter.callBids = function (bidRequests) {
    if (!bidRequests || !bidRequests.bids || bidRequests.bids.length === 0) {
      return;
    }

    var RTBDataParams = prepareAndSaveRTBRequestParams(bidRequests.bids[0]);

    if (!RTBDataParams) {
      return;
    }

    ajax(ENDPOINT, handleResponse, RTBDataParams, {
      contentType: 'text/plain',
      withCredentials: true,
      method: 'GET'
    });
  };

  function prepareAndSaveRTBRequestParams(bid) {
    if (!bid || !bid.params || !bid.params.aid || !bid.placementCode) {
      return;
    }

    bidRequest = bid;

    let size = getSize(bid.sizes);

    bidRequest.width = size.width;
    bidRequest.height = size.height;

    return {
      aid: bid.params.aid,
      w: size.width,
      h: size.height,
      domain: document.location.hostname
    };
  }

  function getSize(requestSizes) {
    const parsed = {};
    const size = utils.parseSizesInput(requestSizes)[0];

    if (typeof size !== 'string') {
      return parsed;
    }

    let parsedSize = size.toUpperCase().split('X');

    return {
      width: parseInt(parsedSize[0], 10) || undefined,
      height: parseInt(parsedSize[1], 10) || undefined
    };
  }

  /* Notify Prebid of bid responses so bids can get in the auction */
  function handleResponse(response) {
    var parsed;

    try {
      parsed = JSON.parse(response);
    } catch (error) {
      utils.logError(error);
    }

    if (!parsed || parsed.error || !parsed.bids || !parsed.bids.length) {
      bidmanager.addBidResponse(bidRequest.placementCode, createBid(STATUS.NO_BID));

      return;
    }

    bidmanager.addBidResponse(bidRequest.placementCode, createBid(STATUS.GOOD, parsed.bids[0]));
  }

  function createBid(status, tag) {
    var bid = bidfactory.createBid(status, tag);

    bid.code = baseAdapter.getBidderCode();
    bid.bidderCode = bidRequest.bidder;

    if (!tag || status !== STATUS.GOOD) {
      return bid;
    }

    bid.mediaType = 'video';
    bid.cpm = tag.cpm;
    bid.creative_id = tag.cmpId;
    bid.width = bidRequest.width;
    bid.height = bidRequest.height;
    bid.descriptionUrl = tag.url;
    bid.vastUrl = tag.url;

    return bid;
  }

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  });
}

adaptermanager.registerBidAdapter(new VertamediaAdapter(), 'vertamedia', {
  supportedMediaTypes: ['video']
});

module.exports = VertamediaAdapter;
