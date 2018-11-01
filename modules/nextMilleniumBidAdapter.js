import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER } from 'src/mediaTypes';

const BIDDER_CODE = 'nextMillenium';
const ENDPOINT_URL = 'https://brainlyads.com/hb/s2s';
const CURRENCY = 'USD';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    return !!(bid.params.placement_id && utils.isNumber(bid.params.placement_id));
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
          placement_id: utils.getBidIdParameter('placement_id', bid.params)
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
