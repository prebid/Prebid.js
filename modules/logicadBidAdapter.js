import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';

const BIDDER_CODE = 'logicad';
const ENDPOINT_URL = 'https://pb.ladsp.com/adrequest/prebid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.tid);
  },
  buildRequests: function (bidRequests, bidderRequest) {
    const requests = [];
    for (let i = 0, len = bidRequests.length; i < len; i++) {
      const request = {
        method: 'POST',
        url: ENDPOINT_URL,
        data: JSON.stringify(newBidRequest(bidRequests[i], bidderRequest)),
        options: {},
        bidderRequest
      };
      requests.push(request);
    }
    return requests;
  },
  interpretResponse: function (serverResponse, bidderRequest) {
    serverResponse = serverResponse.body;
    const bids = [];
    if (!serverResponse || serverResponse.error) {
      return bids;
    }
    serverResponse.seatbid.forEach(function (seatbid) {
      bids.push(seatbid.bid);
    })
    return bids;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    if (serverResponses.length > 0 && serverResponses[0].body.userSync &&
      syncOptions.pixelEnabled && serverResponses[0].body.userSync.type == 'image') {
      return [{
        type: 'image',
        url: serverResponses[0].body.userSync.url
      }];
    }
    return [];
  },
};

function newBidRequest(bid, bidderRequest) {
  return {
    auctionId: bid.auctionId,
    bidderRequestId: bid.bidderRequestId,
    bids: [{
      adUnitCode: bid.adUnitCode,
      bidId: bid.bidId,
      transactionId: bid.transactionId,
      sizes: bid.sizes,
      params: bid.params,
      mediaTypes: bid.mediaTypes
    }],
    prebidJsVersion: '$prebid.version$',
    // TODO: is 'page' the right value here?
    referrer: bidderRequest.refererInfo.page,
    auctionStartTime: bidderRequest.auctionStart,
    eids: bid.userIdAsEids,
  };
}

registerBidder(spec);
