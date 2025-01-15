import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { _each, replaceMacros, deepAccess, deepSetValue, logError } from '../src/utils.js';

const BIDDER_CODE = 'mobkoi';
/**
 * !IMPORTANT: This value must match the value in mobkoiAnalyticsAdapter.js
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

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30,
  },
  request(buildRequest, imps, bidderRequest, context) {
    const ortbRequest = buildRequest(imps, bidderRequest, context);
    const prebidBidRequest = context.bidRequests[0];

    ortbRequest.id = utils.getOrtbId(prebidBidRequest);

    return ortbRequest;
  },
  bidResponse(buildPrebidBidResponse, ortbBidResponse, context) {
    utils.replaceAllMacrosInPlace(ortbBidResponse, context);

    const prebidBid = buildPrebidBidResponse(ortbBidResponse, context);
    utils.addCustomFieldsToPrebidBidResponse(prebidBid, ortbBidResponse);
    return prebidBid;
  },
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid(bid) {
    if (!deepAccess(bid, 'ortb2.site.publisher.id')) {
      logError('The "ortb2.site.publisher.id" field is required in the bid request.' +
        'Please set it via the "config.ortb2.site.publisher.id" field with pbjs.setBidderConfig.'
      );
      return false;
    }

    return true;
  },

  buildRequests(prebidBidRequests, prebidBidderRequest) {
    const adServerEndpoint = utils.getAdServerEndpointBaseUrl(prebidBidderRequest) + '/bid';

    return {
      method: 'POST',
      url: adServerEndpoint,
      options: {
        contentType: 'application/json',
      },
      data: converter.toORTB({
        bidRequests: prebidBidRequests,
        bidderRequest: prebidBidderRequest
      }),
    };
  },

  interpretResponse(serverResponse, customBidRequest) {
    if (!serverResponse.body) return [];

    const responseBody = {...serverResponse.body, seatbid: serverResponse.body.seatbid};
    const prebidBidResponse = converter.fromORTB({
      request: customBidRequest.data,
      response: responseBody,
    });
    return prebidBidResponse.bids;
  },
};

registerBidder(spec);

export const utils = {

  /**
   * !IMPORTANT: Make sure the implementation of this function matches getAdServerEndpointBaseUrl
   * in both adapters.
   * Obtain the Ad Server Base URL from the given Prebid object.
   * @param {*} bid Prebid Bidder Request Object or Prebid Bid Response/Request
   * or ORTB Request/Response Object
   * @returns {string} The Ad Server Base URL
   * @throws {Error} If the ORTB ID cannot be found in the given
   */
  getAdServerEndpointBaseUrl (bid) {
    const ortbPath = `site.publisher.ext.${PARAM_NAME_AD_SERVER_BASE_URL}`;
    const prebidPath = `ortb2.${ortbPath}`;

    const adServerBaseUrl =
      deepAccess(bid, prebidPath) ||
      deepAccess(bid, ortbPath);

    if (!adServerBaseUrl) {
      throw new Error('Failed to find the Ad Server Base URL in the given object. ' +
        `Please set it via the "${prebidPath}" field with pbjs.setBidderConfig.\n` +
        'Given Object:\n' +
        JSON.stringify(bid, null, 2)
      );
    }

    return adServerBaseUrl;
  },

  /**
   * !IMPORTANT: Make sure the implementation of this function matches utils.getPublisherId in
   * both adapters.
   * Extract the publisher ID from the given object.
   * @param {*} prebidBidRequestOrOrtbBidRequest
   * @returns string
   * @throws {Error} If the publisher ID is not found in the given object.
   */
  getPublisherId: function (prebidBidRequestOrOrtbBidRequest) {
    const ortbPath = 'site.publisher.id';
    const prebidPath = `ortb2.${ortbPath}`;

    const publisherId =
      deepAccess(prebidBidRequestOrOrtbBidRequest, prebidPath) ||
      deepAccess(prebidBidRequestOrOrtbBidRequest, ortbPath);

    if (!publisherId) {
      throw new Error(
        'Failed to obtain publisher ID from the given object. ' +
        `Please set it via the "${prebidPath}" field with pbjs.setBidderConfig.\n` +
        'Given object:\n' +
        JSON.stringify(prebidBidRequestOrOrtbBidRequest, null, 2)
      );
    }

    return publisherId;
  },

  /**
   * !IMPORTANT: Make sure the implementation of this function matches utils.getOrtbId in
   * mobkoiAnalyticsAdapter.js.
   * We use the bidderRequestId as the ortbId. We could do so because we only
   * make one ORTB request per Prebid Bidder Request.
   * The ID field named differently when the value passed on to different contexts.
   * @param {*} bid Prebid Bidder Request Object or Prebid Bid Response/Request
   * or ORTB Request/Response Object
   * @returns {string} The ORTB ID
   * @throws {Error} If the ORTB ID cannot be found in the given object.
   */
  getOrtbId(bid) {
    const ortbId =
      // called bidderRequestId in Prebid Request
      bid.bidderRequestId ||
      // called seatBidId in Prebid Bid Response Object
      bid.seatBidId ||
      // called ortbId in Interpreted Prebid Response Object
      bid.ortbId ||
      // called id in ORTB object
      (Object.hasOwn(bid, 'imp') && bid.id);

    if (!ortbId) {
      throw new Error('Unable to find the ORTB ID in the bid object. Given Object:\n' +
        JSON.stringify(bid, null, 2)
      );
    }

    return ortbId;
  },

  /**
   * Append custom fields to the prebid bid response. so that they can be accessed
   * in various event handlers.
   * @param {*} prebidBidResponse
   * @param {*} ortbBidResponse
   */
  addCustomFieldsToPrebidBidResponse(prebidBidResponse, ortbBidResponse) {
    prebidBidResponse.ortbBidResponse = ortbBidResponse;
    prebidBidResponse.ortbId = ortbBidResponse.id;
  },

  replaceAllMacrosInPlace(ortbBidResponse, context) {
    const macros = {
      // ORTB macros
      AUCTION_PRICE: ortbBidResponse.price,
      AUCTION_IMP_ID: ortbBidResponse.impid,
      AUCTION_CURRENCY: ortbBidResponse.cur,
      AUCTION_BID_ID: context.bidderRequest.auctionId,

      // Custom macros
      BIDDING_API_BASE_URL: utils.getAdServerEndpointBaseUrl(context.bidderRequest),
      CREATIVE_ID: ortbBidResponse.crid,
      CAMPAIGN_ID: ortbBidResponse.cid,
      ORTB_ID: ortbBidResponse.id,
      PUBLISHER_ID: deepAccess(context, 'bidRequest.ortb2.site.publisher.id') || deepAccess(context, 'bidderRequest.ortb2.site.publisher.id')
    };

    _each(ORTB_RESPONSE_FIELDS_SUPPORT_MACROS, ortbField => {
      deepSetValue(
        ortbBidResponse,
        ortbField,
        replaceMacros(deepAccess(ortbBidResponse, ortbField), macros)
      );
    });
  },
}
