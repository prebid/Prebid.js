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
 * @return {string[]} the unsupported settings, empty when all types are supported
 */
function checkMediaTypes(mediaTypes) {
  const errors = [];
  if (mediaTypes.native) {
    errors.push("'native' ads are not supported");
  }
  if (mediaTypes.video && mediaTypes.video.any(video => video.context !== 'outstream')) {
    errors.push("only 'outstream' video context's are supported");
  }
  return errors;
}

/**
 * @type {BidderSpec}
 */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: MEDIA_TYPES,
  isBidRequestValid,
  buildRequests: function (validBidRequests, bidderRequest) {
    utils.logMessage('buildRequests', JSON.stringify(validBidRequests), JSON.stringify(bidderRequest));
  },
  interpretResponse: function (serverResponse, request) {
  },
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
