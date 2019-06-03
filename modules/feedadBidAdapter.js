import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {BANNER, VIDEO} from '../src/mediaTypes';
import {ajax} from '../src/ajax';

/**
 * Version of the FeedAd bid adapter
 * @type {string}
 */
const VERSION = "1.0.0";

/**
 * @typedef {object} FeedAdApiBidRequest
 * @inner
 *
 * @property {number} ad_type
 * @property {string} client_token
 * @property {string} placement_id
 * @property {string} sdk_version
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
 * Bidder network identity code
 * @type {string}
 */
const BIDDER_CODE = 'feedad';

/**
 * The media types supported by FeedAd
 * @type {MediaType[]}
 */
const MEDIA_TYPES = [VIDEO, BANNER];

/**
 * Tag for logging
 * @type {string}
 */
const TAG = '[FeedAd]';

/**
 * Pattern for valid placement IDs
 * @type {RegExp}
 */
const PLACEMENT_ID_PATTERN = /^(([a-z0-9])+[-_]?)+$/;

const API_ENDPOINT = 'https://feedad-backend-dev.appspot.com';
const API_PATH_BID_REQUEST = '/1/prebid/web/bids';

/**
 * Checks if the bid is compatible with FeedAd.
 *
 * @param {BidRequest} bid - the bid to check
 * @return {boolean} true if the bid is valid
 */
function isBidRequestValid(bid) {
  const clientToken = utils.deepAccess(bid, 'params.clientToken');
  if (!clientToken || !isValidClientToken(clientToken)) {
    utils.logWarn(TAG, "missing or invalid parameter 'clientToken'. found value:", clientToken);
    return false;
  }

  const placementId = utils.deepAccess(bid, 'params.placementId');
  if (!placementId || !isValidPlacementId(placementId)) {
    utils.logWarn(TAG, "missing or invalid parameter 'placementId'. found value:", placementId);
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
  return {
    ad_type: 0,
    client_token: request.params.clientToken,
    placement_id: request.params.placementId,
    sdk_version: `prebid_${VERSION}`,
    app_hybrid: false,
  };
}

/**
 * Builds the bid request to the FeedAd Server
 * @param {BidRequest[]} validBidRequests - all validated bid requests
 * @param {object} bidderRequest - meta information
 * @return {ServerRequest|ServerRequest[]}
 */
function buildRequests(validBidRequests, bidderRequest) {
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
 * @param {ServerResponse} serverResponse - the FeedAd server response
 * @param {BidRequest} request - the initial bid request
 * @returns {Bid[]} the FeedAd bids
 */
function interpretResponse(serverResponse, request) {
  const body = typeof serverResponse.body === 'string' ? JSON.parse(serverResponse.body) : serverResponse.body;
  return body.requests.map((req, idx) => ({
    requestId: req.bidId,
    cpm: 0.5,
    width: req.sizes[0][0],
    height: req.sizes[0][1],
    ad: createAdHTML(req),
    ttl: 60,
    creativeId: `feedad-${body.id}-${idx}`,
    netRevenue: true,
    currency: 'EUR'
  }));
}

/**
 * Creates the HTML content for a FeedAd creative
 * @param {object} req - the server response body
 * @return {string} the HTML string
 */
function createAdHTML(req) {
  return `<html><body>
<script type="text/javascript" src="https://web.feedad.com/loader/feedad-iframe-loader.js"></script>
<script type="text/javascript">
    feedad.loadFeedAd({
        clientToken: '${req.params.clientToken}',
        placementId: '${req.params.placementId}',
        adOptions: {scaleMode: "parent_width"},
        beforeAttach: (el, wrp) => {
          wrp = document.createElement("div");
          wrp.style.width = '${req.sizes[0][0]}px';
          wrp.style.height = '${req.sizes[0][1]}px';
          el.appendChild(wrp);
          return wrp;
        }
    });
</script>
</body></html>`;
}

/**
 * @type {BidderSpec}
 */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: MEDIA_TYPES,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs: function (syncOptions, serverResponses) {
  },
  onTimeout: function (timeoutData, xhr) {
    if (!timeoutData) {
      return;
    }
    xhr = typeof xhr === 'function' ? xhr : ajax;
    xhr('http://localhost:3000/onTimeout', null, JSON.stringify(timeoutData), {
      withCredentials: true,
      method: 'POST',
      contentType: 'application/json'
    })
  },
  onBidWon: function (bid, xhr) {
    if (!bid) {
      return;
    }
    xhr = typeof xhr === "function" ? xhr : ajax;
    xhr('http://localhost:3000/onBidWon', null, JSON.stringify(bid), {
      withCredentials: true,
      method: 'POST',
      contentType: 'application/json'
    })
  },
  onSetTargeting: function (bid) {
    console.log('onSetTargeting', bid);
  }
};

registerBidder(spec);
