import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { _each, replaceMacros, deepAccess, deepSetValue } from '../src/utils.js';

const BIDDER_CODE = 'mobkoi';
/**
 * The name of the parameter that the publisher can use to specify the ad server endpoint.
 */
const PARAM_NAME_AD_SERVER_BASE_URL = 'adServerBaseUrl';
/**
 * The list of ORTB response fields that are used in the macros. Field
 * replacement is self-implemented in the adapter. Use dot-notated path for
 * nested fields. For example, 'ad.ext.adomain'. For more information, visit
 * https://www.npmjs.com/package/dset and https://www.npmjs.com/package/dlv.
 */
const ORTB_RESPONSE_FIELDS_SUPPORT_MACROS = ['adm', 'nurl', 'lurl'];

const getBidServerEndpointBase = (prebidBidRequest) => {
  const adServerBaseUrl = prebidBidRequest.params[PARAM_NAME_AD_SERVER_BASE_URL];

  if (!adServerBaseUrl) {
    throw new Error(`The "${PARAM_NAME_AD_SERVER_BASE_URL}" parameter is required in Ad unit bid params.`);
  }
  return adServerBaseUrl;
}

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30,
  },
  imp(buildImp, bidRequest, context) {
    context[PARAM_NAME_AD_SERVER_BASE_URL] = getBidServerEndpointBase(bidRequest);
    return buildImp(bidRequest, context);
  },
  bidResponse(buildPrebidBidResponse, ortbBidResponse, context) {
    const macros = {
      // ORTB macros
      AUCTION_PRICE: ortbBidResponse.price,
      AUCTION_IMP_ID: ortbBidResponse.impid,
      AUCTION_CURRENCY: ortbBidResponse.cur,
      AUCTION_BID_ID: context.bidderRequest.auctionId,

      // Custom macros
      BIDDING_API_BASE_URL: context[PARAM_NAME_AD_SERVER_BASE_URL],
      CREATIVE_ID: ortbBidResponse.crid,
      CAMPAIGN_ID: ortbBidResponse.cid,
    };

    _each(ORTB_RESPONSE_FIELDS_SUPPORT_MACROS, ortbField => {
      deepSetValue(
        ortbBidResponse,
        ortbField,
        replaceMacros(deepAccess(ortbBidResponse, ortbField), macros)
      );
    });

    const prebidBid = buildPrebidBidResponse(ortbBidResponse, context);
    // Save the ORTB response for later use in the other parts of the adapter as
    // well as the within the analytics adapter.
    prebidBid.ortbBid = ortbBidResponse;
    return prebidBid;
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
