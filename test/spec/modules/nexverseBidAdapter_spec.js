/* eslint-disable camelcase */

import { registerBidder } from '../../../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../../../src/mediaTypes.js';
import { isArray, logError, logWarn } from '../../../src/utils.js';
import { buildEndpointUrl, isBidRequestValid, parseNativeResponse, printLog } from '../../../libraries/nexverseUtils/index.js';

const BIDDER_CODE = 'nexverse';
const ENDPOINT_URL = 'https://rtb.nexverse.ai/'; // Changed to HTTPS for security reasons
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO, NATIVE];
const DEFAULT_CURRENCY = 'USD';
const BID_TTL = 300;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  isBidRequestValid,

  /**
   * Builds the OpenRTB server request from the list of valid bid requests.
   *
   * @param {Array} validBidRequests - Array of valid bid requests.
   * @param {Object} bidderRequest - The bidder request object containing additional data.
   * @returns {Array} Array of server requests to be sent to the endpoint.
   */
  buildRequests(validBidRequests, bidderRequest) {
    const requests = validBidRequests.map((bid) => {
      const uid = bid.params.uid;
      const pubId = bid.params.pubId;
      const pubEpid = bid.params.pubEpid;

      if (!uid || !pubId || !pubEpid) {
        printLog('error', 'Missing required endpoint URL parameters: ', bid.params);
        return null; // Skip this bid
      }

      // Ensure sizes are valid
      if (!bid.sizes || !isArray(bid.sizes) || !bid.sizes[0] || bid.sizes[0].length < 2) {
        printLog('error', ' Invalid sizes for bid request', bid.sizes);
        return null;
      }

      // Build the endpoint URL with query parameters
      const endpointUrl = buildEndpointUrl(BIDDER_ENDPOINT, bid);

      // Build the OpenRTB payload
      const payload = buildOpenRtbRequest(bid, bidderRequest);

      if (!payload) {
        printLog('error', ' Failed to build OpenRTB payload for bid.');
        return null; // Skip this bid
      }

      return {
        method: 'POST',
        url: endpointUrl,
        data: JSON.stringify(payload),
        bidRequest: bid,
        options: {
          contentType: 'application/json',
          withCredentials: true,
        },
      };
    }).filter(request => request !== null); // Remove null entries

    return requests;
  },

  /**
   * Interprets the server's response and extracts bid information.
   *
   * @param {Object} serverResponse - The response from the server.
   * @param {Object} request - The original server request.
   * @returns {Array} Array of bids to be passed to the auction.
   */
  interpretResponse(serverResponse, request) {
    const bidResponses = [];
    const response = serverResponse.body;

    if (!response || !response.seatbid || !isArray(response.seatbid)) {
      printLog('warning', ' No valid bids in the response.', serverResponse);
      return bidResponses;
    }

    response.seatbid.forEach((seatbid) => {
      seatbid.bid.forEach((bid) => {
        const bidResponse = {
          requestId: bid.impid,
          cpm: bid.price,
          currency: response.cur || DEFAULT_CURRENCY,
          width: bid.w || 0,
          height: bid.h || 0,
          creativeId: bid.crid || bid.id,
          ttl: BID_TTL,
          netRevenue: true,
          meta: {
            advertiserDomains: isArray(bid.adomain) ? bid.adomain : []
          }
        };

        // Determine media type and assign the ad content
        const mediaType = determineMediaType(bid);
        bidResponse.mediaType = mediaType;

        if (mediaType === VIDEO) {
          bidResponse.vastXml = bid.adm;
        } else if (mediaType === NATIVE) {
          bidResponse.native = parseNativeResponse(bid.adm);
        } else {
          bidResponse.ad = bid.adm || '';
        }

        // Add nurl if present
        if (bid.nurl) {
          bidResponse.nurl = bid.nurl;
        }

        bidResponses.push(bidResponse);
      });
    });

    return bidResponses;
  },

  /**
   * Registers user sync pixels.
   *
   * @param {Object} syncOptions - Configuration specifying which user syncs are allowed.
   * @param {Array} serverResponses - Array of server responses.
   * @param {Object} gdprConsent - GDPR consent information.
   * @param {string} uspConsent - US Privacy consent string.
   * @returns {Array} Array of user syncs to be executed.
   */
  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];

    if (syncOptions.iframeEnabled) {
      let syncUrl = `${ENDPOINT_URL}/sync`;
      const params = [];

      // GDPR
      if (gdprConsent) {
        params.push(`gdpr=${gdprConsent.gdprApplies ? 1 : 0}`);
        params.push(`gdpr_consent=${encodeURIComponent(gdprConsent.consentString || '')}`);
      }

      // CCPA
      if (uspConsent) {
        params.push(`us_privacy=${encodeURIComponent(uspConsent)}`);
      }

      // Cache Buster
      const cacheBuster = new Date().getTime();
      params.push(`cb=${cacheBuster}`);

      if (params.length > 0) {
        syncUrl += '?' + params.join('&');
      }

      syncs.push({
        type: 'iframe',
        url: syncUrl,
      });
    }

    return syncs;
  },
};

/**
 * Determines the media type for the bid response.
 * @param {Object} bid - The bid response object.
 * @returns {string} The media type of the bid.
 */
function determineMediaType(bid) {
  if (bid.ext && bid.ext.mediaType) {
    return bid.ext.mediaType;
  } else if (bid.adm && bid.adm.indexOf('<VAST') !== -1) {
    return VIDEO;
  } else if (bid.adm && bid.adm.indexOf('"native"') !== -1) {
    return NATIVE;
  }
  return BANNER;
}

/**
 * Builds the OpenRTB request payload.
 *
 * @param {Object} bid - The bid request object.
 * @param {Object} bidderRequest - The bidder request object.
 * @returns {Object|null} The OpenRTB request payload or null if missing mandatory parameters.
 */
function buildOpenRtbRequest(bid, bidderRequest) {
  if (!bid.sizes || !isArray(bid.sizes) || !bid.sizes[0]) {
    printLog('error', ' Missing or invalid sizes in the bid request.');
    return null;
  }

  return {
    id: bid.auctionId,
    imp: [
      {
        id: bid.bidId,
        banner: {
          w: bid.sizes[0][0],
          h: bid.sizes[0][1],
        },
      },
    ],
    site: {
      page: bidderRequest.refererInfo.page,
    },
  };
}

registerBidder(spec);
