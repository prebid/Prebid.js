import * as utils from 'src/utils';
import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'adlive';
const ENDPOINT_URL = 'https://api.publishers.adlive.io/get'

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    return !!(bid.params.hashes && utils.isArray(bid.params.hashes));
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    let requests = []
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
        })
      });
    })

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    const response = serverResponse.body;

    const bidResponses = [];
    const bidResponse = {
      requestId: bidRequest.bidId,
      cpm: response.price,
      width: response.size[0],
      height: response.size[1],
      creativeId: CREATIVE_ID,
      dealId: DEAL_ID,
      currency: CURRENCY,
      netRevenue: true,
      ttl: TIME_TO_LIVE,
      referrer: REFERER,
      ad: response.content
    };

    bidResponses.push(bidResponse);
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  onTimeout: function(data) {
    // Bidder specifc code
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function(bid) {
    // Bidder specific code
  }
}
registerBidder(spec);
