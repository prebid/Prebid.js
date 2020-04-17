import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'ringieraxelspringer';
const ENDPOINT_URL = 'https://csr.onet.pl/_s/csr-006/csr.json?';

function buildQueryParamsFromObject(bid) {
  console.log('bid: ', bid);
  let { params } = bid;
  params = {
    slot0: params.slot,
    nid: params.network,
    site: params.site,
    area: params.area,
    cre_format: 'html',
    systems: 'das',
    is_ems: 1,
    bid_rate: 1,
    kvIR: bid.bidId
  };
  return Object.keys(params).map((key) => key + '=' + encodeURIComponent(params[key])).join('&');
}

const buildBid = (response) => (ad) => {
  if (ad.type === 'empty') {
    return {}
  }
  return {
    requestId: response.ir,
    cpm: ad.bid_rate.toFixed(2),
    adId: ad.adid,
    width: ad.width,
    height: ad.height,
    ttl: 300,
    creativeId: parseInt(ad.adid.split(',')[2], 10),
    netRevenue: true,
    currency: ad.currency || 'USD',
    dealId: ad.id_3 || 0,
    mediaType: BANNER,
    ad: ad.html
  };
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bidRequest) {
    console.log('bidRequest: ', bidRequest);
    if (!bidRequest || !bidRequest.params || typeof bidRequest.params !== 'object') {
      return;
    }
    const { params } = bidRequest;
    return Boolean(params.network && params.site && params.area);
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const requestsQuery = bidRequests.map(buildQueryParamsFromObject);
    console.log('requestsQuery: ', requestsQuery);
    return requestsQuery.map((query) => ({
      method: 'POST',
      url: ENDPOINT_URL + query
    }));
  },

  interpretResponse: function (serverResponse, bidRequest) {
    let response = serverResponse.body;
    if (!response || !response.ads || response.ads.length === 0) {
      return [];
    }
    if (response.debug) {
      utils.logInfo(`CSR DEBUG: serverResponse -> ${serverResponse}`);
      utils.logInfo(`CSR DEBUG: bidRequest -> ${bidRequest}`);
      utils.logInfo(`CSR DEBUG: interpretResponse -> ${response.ads.map(buildBid(response))}`)
    }
    console.log('response.ads.map(buildBid(response))', response.ads.map(buildBid(response)));
    return response.ads.map(buildBid(response));
  },

  getUserSyncs: function (syncOptions, serverResponses) {
    return [];
  },
  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  onTimeout: function (data) {
    console.log('onTimeout: ', data)
    // Bidder specifc code
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function (bid) {
    console.log('onBidWon: ', bid);
  },

  /**
   * Register bidder specific code, which will execute when the adserver targeting has been set for a bid from this bidder
   * @param {Bid} The bid of which the targeting has been set
   */
  onSetTargeting: function (bid) {
    console.log('onSetTargeting: ', bid);
  }
};

registerBidder(spec);
