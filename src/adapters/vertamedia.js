import Adapter from 'src/adapters/adapter';
import bidfactory from 'src/bidfactory';
import bidmanager from 'src/bidmanager';
import * as utils from 'src/utils';
import { ajax } from 'src/ajax';
import { STATUS } from 'src/constants';

const ENDPOINT = '//rtb.vertamedia.com/hb/';

function VertamediaAdapter() {
  var baseAdapter = Adapter.createNew('vertamedia'),
      bidRequest;

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

    let size = getSizes(bid.sizes)[0];

    bidRequest.width = size.width;
    bidRequest.height = size.height;

    return {
      aid: bid.params.aid,
      w: size.width,
      h: size.height,
      domain: document.location.hostname
    };
  }

  function getSizes(requestSizes) {
    let sizes = [];
    let sizeObj = {};

    if (utils.isArray(requestSizes) && requestSizes.length === 2 &&
        !utils.isArray(requestSizes[0])) {
      sizeObj.width = parseInt(requestSizes[0], 10);
      sizeObj.height = parseInt(requestSizes[1], 10);
      sizes.push(sizeObj);
    } else if (typeof requestSizes === 'object') {
      for (let i = 0; i < requestSizes.length; i++) {
        let size = requestSizes[i];
        sizeObj = {};
        sizeObj.width = parseInt(size[0], 10);
        sizeObj.height = parseInt(size[1], 10);
        sizes.push(sizeObj);
      }
    }

    return sizes;
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

  return {
    createNew: VertamediaAdapter.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode
  };

}

VertamediaAdapter.createNew = function () {
  return new VertamediaAdapter();
};

module.exports = VertamediaAdapter;
