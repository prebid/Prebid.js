import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { _each, replaceMacros, deepAccess, deepSetValue, logError } from '../src/utils.js';

const BIDDER_CODE = 'mobkoi';
const GVL_ID = 898;
export const DEFAULT_AD_SERVER_BASE_URL = 'https://adserver.maximus.mobkoi.com';

const PUBLISHER_PARAMS = {
  /**
   * !IMPORTANT: This value must match the value in mobkoiAnalyticsAdapter.js
   * The name of the parameter that the publisher can use to specify the ad server endpoint.
   */
  PARAM_NAME_AD_SERVER_BASE_URL: 'adServerBaseUrl',
  PARAM_NAME_PUBLISHER_ID: 'publisherId',
  PARAM_NAME_PLACEMENT_ID: 'placementId',
}

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
    deepSetValue(ortbRequest, 'site.publisher.id', utils.getPublisherId(prebidBidRequest));
    deepSetValue(ortbRequest, 'site.publisher.ext.adServerBaseUrl', utils.getAdServerEndpointBaseUrl(prebidBidRequest));
    // We only support one impression per request.
    deepSetValue(ortbRequest, 'imp.0.tagid', utils.getPlacementId(prebidBidRequest));
    deepSetValue(ortbRequest, 'user.id', context.bidRequests[0].userId?.mobkoiId || null);

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
  gvlid: GVL_ID,

  /**
   * Determines whether or not the given bid request is valid.
   */
  isBidRequestValid(bid) {
    if (
      !deepAccess(bid, `params.${PUBLISHER_PARAMS.PARAM_NAME_PUBLISHER_ID}`) &&
      !deepAccess(bid, 'ortb2.site.publisher.id')
    ) {
      logError(`The ${PUBLISHER_PARAMS.PARAM_NAME_PUBLISHER_ID} field is required in the bid request. ` +
        'Please follow the setup guideline to set the publisher ID field.'
      );
      return false;
    }

    if (
      !deepAccess(bid, `params.${PUBLISHER_PARAMS.PARAM_NAME_PLACEMENT_ID}`)
    ) {
      logError(`The ${PUBLISHER_PARAMS.PARAM_NAME_PLACEMENT_ID} field is required in the bid request. ` +
        'Please follow the setup guideline to set the placement ID field.')
      return false;
    }

    return true;
  },
  /**
   * Make a server request from the list of BidRequests.
   */
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
  /**
   * Unpack the response from the server into a list of bids.
   */
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
   */
  getAdServerEndpointBaseUrl (bid) {
    // Fields that would be automatically set if the publisher set it via pbjs.setBidderConfig.
    const ortbPath = `site.publisher.ext.${PUBLISHER_PARAMS.PARAM_NAME_AD_SERVER_BASE_URL}`;
    const prebidPath = `ortb2.${ortbPath}`;

    // Fields that would be set by the publisher in the bid
    // configuration object in ad unit.
    const paramPath = `params.${PUBLISHER_PARAMS.PARAM_NAME_AD_SERVER_BASE_URL}`;
    const bidRequestFirstBidParam = `bids.0.${paramPath}`;

    const adServerBaseUrl =
      deepAccess(bid, paramPath) ||
      deepAccess(bid, bidRequestFirstBidParam) ||
      deepAccess(bid, prebidPath) ||
      deepAccess(bid, ortbPath) ||
      DEFAULT_AD_SERVER_BASE_URL;

    return adServerBaseUrl;
  },

  /**
   * Extract the placement ID from the given object.
   * @param {*} prebidBidRequestOrOrtbBidRequest
   * @returns string
   * @throws {Error} If the placement ID is not found in the given object.
   */
  getPlacementId: function (prebidBidRequestOrOrtbBidRequest) {
    // Fields that would be set by the publisher in the bid configuration object in ad unit.
    const paramPath = 'params.placementId';
    const bidRequestFirstBidParam = `bids.0.${paramPath}`;

    // ORTB path for placement ID
    const ortbPath = 'imp.0.tagid';

    const placementId =
      deepAccess(prebidBidRequestOrOrtbBidRequest, paramPath) ||
      deepAccess(prebidBidRequestOrOrtbBidRequest, bidRequestFirstBidParam) ||
      deepAccess(prebidBidRequestOrOrtbBidRequest, ortbPath);

    if (!placementId) {
      throw new Error(
        'Failed to obtain placement ID from the given object. ' +
        `Please set it via the "${paramPath}" field in the bid configuration.\n` +
        'Given object:\n' +
        JSON.stringify({functionParam: prebidBidRequestOrOrtbBidRequest}, null, 3)
      );
    }

    return placementId;
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
    // Fields that would be automatically set if the publisher set it
    // via pbjs.setBidderConfig.
    const ortbPath = 'site.publisher.id';
    const prebidPath = `ortb2.${ortbPath}`;

    // Fields that would be set by the publisher in the bid
    // configuration object in ad unit.
    const paramPath = 'params.publisherId';
    const bidRequestFirstBidParam = `bids.0.${paramPath}`;

    const publisherId =
      deepAccess(prebidBidRequestOrOrtbBidRequest, paramPath) ||
      deepAccess(prebidBidRequestOrOrtbBidRequest, bidRequestFirstBidParam) ||
      deepAccess(prebidBidRequestOrOrtbBidRequest, prebidPath) ||
      deepAccess(prebidBidRequestOrOrtbBidRequest, ortbPath);

    if (!publisherId) {
      throw new Error(
        'Failed to obtain publisher ID from the given object. ' +
        `Please set it via the "${prebidPath}" field with pbjs.setBidderConfig.\n` +
        'Given object:\n' +
        JSON.stringify({functionParam: prebidBidRequestOrOrtbBidRequest}, null, 3)
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
      PUBLISHER_ID: utils.getPublisherId(context.bidderRequest),
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
