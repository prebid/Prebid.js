import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {BANNER, VIDEO} from '../src/mediaTypes';

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
 * Checks if the placement id is a valid FeedAd placement ID
 *
 * @param {string} placementId - the placement id
 * @return {boolean} if the id is valid
 */
function isValidPlacementId(placementId) {
  return placementId.length > 0; // TODO: add placement ID regex or convert any string to valid ID?
}

/**
 * Checks if the given media types contain unsupported settings
 * @param {MediaTypes} mediaTypes - the media types to check
 * @return {MediaTypes} the unsupported settings, empty when all types are supported
 */
function filterSupportedMediaTypes(mediaTypes) {
  return {
    banner: mediaTypes.banner,
    video: mediaTypes.video && mediaTypes.video.filter(video => video.context !== 'outstream'),
    native: []
  };
}

/**
 * Checks if the given media types are empty
 * @param {MediaTypes} mediaTypes - the types to check
 * @return {boolean} true if the types are empty
 */
function isMediaTypesEmpty(mediaTypes) {
  return Object.keys(mediaTypes).every(type => mediaTypes[type].length === 0);
}

/**
 * Builds the bid request to the FeedAd Server
 * @param {BidRequest[]} validBidRequests - all validated bid requests
 * @param {object} bidderRequest - meta information
 * @return {ServerRequest|ServerRequest[]}
 */
function buildRequests(validBidRequests, bidderRequest) {
  let acceptableRequests = validBidRequests.filter(request => !isMediaTypesEmpty(filterSupportedMediaTypes(request.mediaTypes)));
  return {
    method: 'POST',
    url: 'http://localhost:3000/bidRequests',
    data: {
      requests: acceptableRequests
    },
    options: {
      contentType: 'application/json'
    }
  }
}

/**
 * Adapts the FeedAd server response to Prebid format
 * @param {ServerResponse} serverResponse - the FeedAd server response
 * @param {BidRequest} request - the initial bid request
 * @returns {Bid[]} the FeedAd bids
 */
function interpretResponse(serverResponse, request) {
  const body = typeof serverResponse.body === "string" ? JSON.parse(serverResponse.body) : serverResponse.body;
  return body.requests.map((req, idx) => ({
    requestId: req.bidId,
    cpm: 0.5,
    width: req.sizes[0][0],
    height: req.sizes[0][1],
    ad: createAdHTML(req),
    ttl: 60,
    creativeId: `feedad-${body.id}-${idx}`,
    netRevenue: true,
    currency: "EUR"
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
  onTimeout: function (timeoutData) {
  },
  onBidWon: function (bid) {
  },
  onSetTargeting: function (bid) {
  }
};

registerBidder(spec);
