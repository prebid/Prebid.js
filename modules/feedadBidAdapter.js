import {deepAccess, isArray, logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {ajax} from '../src/ajax.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 * @typedef {import('../src/adapters/bidderFactory.js').MediaType} MediaType
 */

/**
 * Version of the FeedAd bid adapter
 * @type {string}
 */
const VERSION = '1.0.6';

/**
 * @typedef {object} FeedAdUserSync
 * @inner
 *
 * @property {string} type
 * @property {string} url
 */

/**
 * @typedef {object} FeedAdBidExtension
 * @inner
 *
 * @property {FeedAdUserSync[]} pixels
 * @property {FeedAdUserSync[]} iframes
 */

/**
 * @typedef {object} FeedAdApiBidRequest
 * @inner
 *
 * @property {number} ad_type
 * @property {string} client_token
 * @property {string} placement_id
 * @property {string} prebid_adapter_version
 * @property {string} prebid_sdk_version
 * @property {boolean} app_hybrid
 *
 * @property {string} [app_bundle_id]
 * @property {string} [app_name]
 * @property {object} [custom_params]
 * @property {number} [connectivity]
 * @property {string} [device_adid]
 * @property {string} [device_platform]
 */

/**
 * @typedef {object} FeedAdApiBidResponse
 * @inner
 *
 * @property {string} [ad] - Ad HTML payload
 * @property {number} cpm - number / float
 * @property {string} creativeId - ID of creative for tracking
 * @property {string} currency - 3-letter ISO 4217 currency-code
 * @property {number} height - Height of creative returned in [].ad
 * @property {boolean} netRevenue - Is the CPM net (true) or gross (false)?
 * @property {string} requestId - bids[].bidId
 * @property {number} ttl - Time to live for this ad
 * @property {number} width - Width of creative returned in [].ad
 * @property {FeedAdBidExtension} [ext] - an extension object
 */

/**
 * @typedef {object} FeedAdApiTrackingParams
 * @inner
 *
 * @property app_hybrid {boolean}
 * @property client_token {string}
 * @property klass {'prebid_bidWon'|'prebid_bidTimeout'}
 * @property placement_id {string}
 * @property prebid_auction_id {string}
 * @property prebid_bid_id {string}
 * @property prebid_transaction_id {string}
 * @property referer {string}
 * @property sdk_version {string}
 * @property [app_bundle_id] {string}
 * @property [app_name] {string}
 * @property [device_adid] {string}
 * @property [device_platform] {1|2|3} 1 - Android | 2 - iOS | 3 - Windows
 */

/**
 * @typedef {object} FeedAdServerResponse
 * @extends ServerResponse
 * @inner
 *
 * @property {FeedAdApiBidResponse[]} body - the body of a FeedAd server response
 */

/**
 * The IAB TCF 2.0 vendor ID for the FeedAd GmbH
 */
const TCF_VENDOR_ID = 781;

/**
 * Bidder network identity code
 * @type {string}
 */
const BIDDER_CODE = 'feedad';

/**
 * The media types supported by FeedAd
 * @type {MediaType[]}
 */
const MEDIA_TYPES = [BANNER];

/**
 * Tag for logging
 * @type {string}
 */
const TAG = '[FeedAd]';

/**
 * Pattern for valid placement IDs
 * @type {RegExp}
 */
const PLACEMENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]+[a-z0-9]$/;

const API_ENDPOINT = 'https://api.feedad.com';
const API_PATH_BID_REQUEST = '/1/prebid/web/bids';
const API_PATH_TRACK_REQUEST = '/1/prebid/web/events';

/**
 * Stores temporary auction metadata
 * @type {Object.<string, {referer: string, transactionId: string}>}
 */
const BID_METADATA = {};

/**
 * Checks if the bid is compatible with FeedAd.
 *
 * @param {BidRequest} bid - the bid to check
 * @return {boolean} true if the bid is valid
 */
function isBidRequestValid(bid) {
  const clientToken = deepAccess(bid, 'params.clientToken');
  if (!clientToken || !isValidClientToken(clientToken)) {
    logWarn(TAG, "missing or invalid parameter 'clientToken'. found value:", clientToken);
    return false;
  }

  const placementId = deepAccess(bid, 'params.placementId');
  if (!placementId || !isValidPlacementId(placementId)) {
    logWarn(TAG, "missing or invalid parameter 'placementId'. found value:", placementId);
    return false;
  }

  return true;
}

/**
 * Checks if a client token is valid
 * @param {string} clientToken - the client token
 * @return {boolean} true if the token is valid
 */
function isValidClientToken(clientToken) {
  return typeof clientToken === 'string' && clientToken.length > 0;
}

/**
 * Checks if the given placement id is of a correct format.
 * Valid IDs are words of lowercase letters from a to z and numbers from 0 to 9.
 * The words can be separated by hyphens or underscores.
 * Multiple separators must not follow each other.
 * The whole placement ID must not be larger than 256 characters.
 *
 * @param placementId - the placement id to verify
 * @returns if the placement ID is valid.
 */
function isValidPlacementId(placementId) {
  return typeof placementId === 'string' &&
    placementId.length > 0 &&
    placementId.length <= 256 &&
    PLACEMENT_ID_PATTERN.test(placementId);
}

/**
 * Checks if the given media types contain unsupported settings
 * @param {MediaTypes} mediaTypes - the media types to check
 * @return {MediaTypes} the unsupported settings, empty when all types are supported
 */
function filterSupportedMediaTypes(mediaTypes) {
  return {
    banner: mediaTypes.banner,
    video: mediaTypes.video && mediaTypes.video.context === 'outstream' ? mediaTypes.video : undefined,
    native: undefined
  };
}

/**
 * Checks if the given media types are empty
 * @param {MediaTypes} mediaTypes - the types to check
 * @return {boolean} true if the types are empty
 */
function isMediaTypesEmpty(mediaTypes) {
  return Object.keys(mediaTypes).every(type => mediaTypes[type] === undefined);
}

/**
 * Creates the bid request params the api expects from the prebid bid request
 * @param {BidRequest} request - the validated prebid bid request
 * @return {FeedAdApiBidRequest}
 */
function createApiBidRParams(request) {
  return Object.assign({}, request.params, {
    ad_type: 0,
    client_token: request.params.clientToken,
    placement_id: request.params.placementId,
    prebid_adapter_version: VERSION,
    prebid_sdk_version: '$prebid.version$',
    app_hybrid: false,
  });
}

/**
 * Builds the bid request to the FeedAd Server
 * @param {BidRequest[]} validBidRequests - all validated bid requests
 * @param {object} bidderRequest - meta information
 * @return {ServerRequest|ServerRequest[]}
 */
function buildRequests(validBidRequests, bidderRequest) {
  if (!bidderRequest) {
    return [];
  }
  let acceptableRequests = validBidRequests.filter(request => !isMediaTypesEmpty(filterSupportedMediaTypes(request.mediaTypes)));
  if (acceptableRequests.length === 0) {
    return [];
  }
  let data = Object.assign({}, bidderRequest, {
    bids: acceptableRequests.map(req => {
      req.params = createApiBidRParams(req);
      return req;
    })
  });
  data.bids.forEach(bid => BID_METADATA[bid.bidId] = {
    referer: data.refererInfo.page,
    transactionId: bid.ortb2Imp?.ext?.tid,
  });
  if (bidderRequest.gdprConsent) {
    data.consentIabTcf = bidderRequest.gdprConsent.consentString;
    data.gdprApplies = bidderRequest.gdprConsent.gdprApplies;
  }
  return {
    method: 'POST',
    url: `${API_ENDPOINT}${API_PATH_BID_REQUEST}`,
    data,
    options: {
      contentType: 'application/json'
    }
  };
}

/**
 * Adapts the FeedAd server response to Prebid format
 * @param {FeedAdServerResponse} serverResponse - the FeedAd server response
 * @param {BidRequest} request - the initial bid request
 * @returns {Bid[]} the FeedAd bids
 */
function interpretResponse(serverResponse, request) {
  const response = typeof serverResponse.body === 'string' ? JSON.parse(serverResponse.body) : serverResponse.body;
  if (!isArray(response)) {
    return [];
  }
  return response.filter(bid => Object.prototype.hasOwnProperty.call(bid, 'ad'))
    .map(bid => {
      const copy = Object.assign({}, bid);
      delete copy.ext;
      return copy;
    });
}

/**
 * Creates the parameters for the FeedAd tracking call
 * @param {object} data - prebid data
 * @param {'prebid_bidWon'|'prebid_bidTimeout'} klass - type of tracking call
 * @return {FeedAdApiTrackingParams|null}
 */
function createTrackingParams(data, klass) {
  const bidId = data.bidId || data.requestId;
  if (!BID_METADATA.hasOwnProperty(bidId)) {
    return null;
  }
  const {referer, transactionId} = BID_METADATA[bidId];
  delete BID_METADATA[bidId];
  return {
    app_hybrid: false,
    client_token: data.params[0].clientToken,
    placement_id: data.params[0].placementId,
    klass,
    prebid_auction_id: data.auctionId,
    prebid_bid_id: bidId,
    prebid_transaction_id: transactionId,
    referer,
    prebid_adapter_version: VERSION,
    prebid_sdk_version: '$prebid.version$',
  };
}

/**
 * Creates a tracking handler for the given event type
 * @param klass - the event type
 * @return {Function} the tracking handler function
 */
function trackingHandlerFactory(klass) {
  return (data) => {
    if (!data) {
      return;
    }
    let params = createTrackingParams(data, klass);
    if (params) {
      ajax(`${API_ENDPOINT}${API_PATH_TRACK_REQUEST}`, null, JSON.stringify(params), {
        withCredentials: true,
        method: 'POST',
        contentType: 'application/json'
      });
    }
  }
}

/**
 * Reads the user syncs off the server responses and converts them into Prebid.JS format
 * @param {SyncOptions} syncOptions
 * @param {FeedAdServerResponse[]} serverResponses
 * @param gdprConsent
 * @param uspConsent
 */
function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  return serverResponses.flatMap(response => {
    // merge all response bodies into one
    const body = response.body;
    return isArray(body) ? body : [];
  })
    .flatMap(/** @param {FeedAdApiBidResponse} bidResponse */ bidResponse => {
      // extract user syncs from extension
      const pixels = (syncOptions.pixelEnabled && bidResponse?.ext?.pixels) ? bidResponse.ext.pixels : [];
      const iframes = (syncOptions.iframeEnabled && bidResponse?.ext?.iframes) ? bidResponse.ext.iframes : [];
      return pixels.concat(...iframes);
    })
    .reduce((syncs, sync) => {
      // remove duplicates
      if (!syncs.find(it => it.type === sync.type && it.url === sync.url)) {
        syncs.push(sync);
      }
      return syncs;
    }, []);
}

/**
 * @type {BidderSpec}
 */
export const spec = {
  code: BIDDER_CODE,
  gvlid: TCF_VENDOR_ID,
  supportedMediaTypes: MEDIA_TYPES,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onTimeout: trackingHandlerFactory('prebid_bidTimeout'),
  onBidWon: trackingHandlerFactory('prebid_bidWon'),
  getUserSyncs
};

registerBidder(spec);
