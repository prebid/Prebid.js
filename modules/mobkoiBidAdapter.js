import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'mobkoi';
const DEFAULT_AD_SERVER_BASE_URL = 'https://adserver.mobkoi.com';
/**
 * The name of the parameter that the publisher can use to specify the ad server endpoint.
 */
const PARAM_NAME_AD_SERVER_BASE_URL = 'adServerBaseUrl';

const getBidServerEndpointBase = (prebidBidRequest) => {
  return prebidBidRequest.params[PARAM_NAME_AD_SERVER_BASE_URL] || DEFAULT_AD_SERVER_BASE_URL;
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30,
  },
  imp(buildImp, bidRequest, context) {
    return buildImp(bidRequest, context);
  },
  bidResponse(buildPrebidBidResponse, ortbBidResponse, context) {
    return buildPrebidBidResponse(ortbBidResponse, context);
  },
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid(bid) {
    return true;
  },

  buildRequests(prebidBidRequests, prebidBidderRequest) {
    return prebidBidRequests.map(currentPrebidBidRequest => {
      return {
        method: 'POST',
        url: getBidServerEndpointBase(currentPrebidBidRequest) + '/bid',
        options: {
          contentType: 'application/json',
        },
        data: {
          ortb: converter.toORTB({ bidRequests: [currentPrebidBidRequest], bidderRequest: prebidBidderRequest }),
          publisherBidParams: currentPrebidBidRequest.params,
        },
      };
    });
  },

  interpretResponse(serverResponse, customBidRequest) {
    if (!serverResponse.body) return [];

    const responseBody = {...serverResponse.body, seatbid: serverResponse.body.seatbid};
    const prebidBidResponse = converter.fromORTB({
      request: customBidRequest.data.ortb,
      response: responseBody,
    });

    return prebidBidResponse.bids;
  },
};

registerBidder(spec);
