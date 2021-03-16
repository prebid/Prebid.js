import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'adlive';
const ENDPOINT_URL = 'https://api.publishers.adlive.io/get?pbjs=1';

const CURRENCY = 'USD';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    return !!(bid.params.hashes && utils.isArray(bid.params.hashes));
  },

  buildRequests: function(validBidRequests) {
    let requests = [];

    utils._each(validBidRequests, function(bid) {
      requests.push({
        method: 'POST',
        url: ENDPOINT_URL,
        options: {
          contentType: 'application/json',
          withCredentials: true
        },
        data: JSON.stringify({
          transaction_id: bid.bidId,
          hashes: utils.getBidIdParameter('hashes', bid.params)
        }),
        bidId: bid.bidId
      });
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    try {
      const response = serverResponse.body;
      const bidResponses = [];

      utils._each(response, function(bidResponse) {
        if (!bidResponse.is_passback) {
          bidResponses.push({
            requestId: bidRequest.bidId,
            cpm: bidResponse.price,
            width: bidResponse.size[0],
            height: bidResponse.size[1],
            creativeId: bidResponse.hash,
            currency: CURRENCY,
            netRevenue: false,
            ttl: TIME_TO_LIVE,
            ad: bidResponse.content
          });
        }
      });

      return bidResponses;
    } catch (err) {
      utils.logError(err);
      return [];
    }
  }
};
registerBidder(spec);
