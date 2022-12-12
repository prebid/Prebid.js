import {registerBidder} from '../src/adapters/bidderFactory.js';
import {buildUrl} from '../src/utils.js'

const BIDDER_CODE = 'smartytech';
export const ENDPOINT_PROTOCOL = 'https';
export const ENDPOINT_DOMAIN = 'server.smartytech.io';
export const ENDPOINT_PATH = '/hb/bidder';

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function (bidRequest) {
    return !!parseInt(bidRequest.params.endpointId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const referer = bidderRequest?.refererInfo?.page || window.location.href;

    const bidRequests = validBidRequests.map((validBidRequest) => {
      return {
        endpointId: validBidRequest.params.endpointId,
        adUnitCode: validBidRequest.adUnitCode,
        sizes: validBidRequest.sizes,
        bidId: validBidRequest.bidId,
        referer: referer
      };
    });

    let adPartnerRequestUrl = buildUrl({
      protocol: ENDPOINT_PROTOCOL,
      hostname: ENDPOINT_DOMAIN,
      pathname: ENDPOINT_PATH,
    });

    return {
      method: 'POST',
      url: adPartnerRequestUrl,
      data: bidRequests
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (typeof serverResponse.body === 'undefined') {
      return [];
    }

    const validBids = bidRequest.data;
    const keys = Object.keys(serverResponse.body)
    const responseBody = serverResponse.body;

    return keys.filter(key => {
      return responseBody[key].ad
    }).map(key => {
      return {
        bid: validBids.find(b => b.adUnitCode === key),
        response: responseBody[key]
      }
    }).map(item => spec.adResponse(item.bid.bidId, item.response));
  },

  adResponse: function (requestId, response) {
    const bidObject = {
      requestId,
      ad: response.ad,
      cpm: response.cpm,
      width: response.width,
      height: response.height,
      ttl: 60,
      creativeId: response.creativeId,
      netRevenue: true,
      currency: response.currency,
    }
    return bidObject;
  },

}

registerBidder(spec);
