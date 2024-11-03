import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';

/**
 * RoundhouseAds adapter configurations
 */

const BIDDER_CODE = 'roundhouseads';
const BIDADAPTERVERSION = 'RHA-PREBID-2024.10.01';
const USER_SYNC_ENDPOINT = 'https://roundhouseads.com/sync';

const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const ENDPOINT_URL = isLocalhost
  ? 'http://localhost:3000/bid'
  : 'https://Rhapbjsv3-env.eba-aqkfquti.us-east-1.elasticbeanstalk.com/bid';

/**
 * Validates a bid request for required parameters.
 * @param {Object} bid - The bid object from Prebid.
 * @returns {boolean} - True if the bid has required parameters, false otherwise.
 */
function isBidRequestValid(bid) {
  return !!(bid.params && bid.params.publisherId && typeof bid.params.publisherId === 'string');
}

/**
 * Constructs the bid request to send to the endpoint.
 * @param {Array} validBidRequests - Validated bid requests.
 * @param {Object} bidderRequest - Prebid's bidder request.
 * @returns {Array} - Array of request objects.
 */
function buildRequests(validBidRequests, bidderRequest) {
  return validBidRequests.map(bid => {
    const data = {
      id: bid.bidId,
      publisherId: bid.params.publisherId,
      placementId: bid.params.placementId || '',
      currency: bid.params.currency || 'USD',
      referer: bidderRequest.refererInfo?.page,
      sizes: bid.mediaTypes?.banner?.sizes,
      video: bid.mediaTypes?.video || null,
      native: bid.mediaTypes?.native || null,
      ext: {
        ver: BIDADAPTERVERSION,
      }
    };

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data,
    };
  });
}

/**
 * Interprets the server response for Prebid.
 * @param {Object} serverResponse - Server response from the bidder.
 * @param {Object} request - The original request.
 * @returns {Array} - Array of bid responses.
 */
function interpretResponse(serverResponse, request) {
  const bidResponses = [];
  const response = serverResponse.body;

  if (response && response.bids && Array.isArray(response.bids)) {
    response.bids.forEach(bid => {
      const bidResponse = {
        requestId: bid.requestId,
        cpm: bid.cpm || 0,
        width: bid.width || 300,
        height: bid.height || 250,
        creativeId: bid.creativeId || 'defaultCreative',
        currency: bid.currency || 'USD',
        netRevenue: true,
        ttl: bid.ttl || 360,
        ad: bid.ad || '<div>Test Ad</div>',
        mediaType: bid.mediaType || BANNER,
      };

      if (bid.mediaType === VIDEO) {
        bidResponse.vastUrl = bid.vastUrl;
      } else if (bid.mediaType === NATIVE) {
        bidResponse.native = bid.native;
      }

      bidResponses.push(bidResponse);
    });
  }

  return bidResponses;
}

/**
 * Provides user sync URL based on available sync options.
 * @param {Object} syncOptions - Sync options.
 * @param {Array} serverResponses - Server responses.
 * @param {Object} gdprConsent - GDPR consent data.
 * @param {string} uspConsent - USP consent data.
 * @returns {Array} - Array of user syncs.
 */
function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  const syncs = [];
  const gdprParams = gdprConsent
    ? `&gdpr=${gdprConsent.gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`
    : '';
  const uspParam = uspConsent ? `&us_privacy=${encodeURIComponent(uspConsent)}` : '';

  if (syncOptions.iframeEnabled) {
    syncs.push({ type: 'iframe', url: `${USER_SYNC_ENDPOINT}?${gdprParams}${uspParam}` });
  } else if (syncOptions.pixelEnabled) {
    syncs.push({ type: 'image', url: `${USER_SYNC_ENDPOINT}?${gdprParams}${uspParam}` });
  }

  return syncs;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
