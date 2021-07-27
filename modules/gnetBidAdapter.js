import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'gnet';
const ENDPOINT = 'https://adserver.gnetproject.com/prebid.php';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.websiteId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const bidRequests = [];
    const referer = bidderRequest.refererInfo.referer;

    utils._each(validBidRequests, (request) => {
      const data = {};

      data.referer = referer;
      data.adUnitCode = request.adUnitCode;
      data.bidId = request.bidId;
      data.transactionId = request.transactionId;

      data.sizes = utils.parseSizesInput(request.sizes);

      data.params = request.params;

      const payloadString = JSON.stringify(data);

      bidRequests.push({
        method: 'POST',
        url: ENDPOINT,
        mode: 'no-cors',
        options: {
          withCredentials: false,
        },
        data: payloadString
      });
    });

    return bidRequests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, requests) {
    if (typeof serverResponse !== 'object') {
      return [];
    }

    const res = serverResponse && serverResponse.body;

    if (utils.isEmpty(res)) {
      return [];
    }

    if (res.bids) {
      const bids = [];
      utils._each(res.bids, (bidData) => {
        const bid = {
          requestId: bidData.bidId,
          cpm: bidData.cpm,
          currency: bidData.currency,
          width: bidData.width,
          height: bidData.height,
          ad: bidData.ad,
          ttl: 300,
          meta: {
            advertiserDomains: bidData.adomain ? bidData.adomain : []
          },
          creativeId: bidData.creativeId,
          netRevenue: true,
        };
        bids.push(bid);
      });

      return bids;
    }

    return [];
  },
};

registerBidder(spec);
