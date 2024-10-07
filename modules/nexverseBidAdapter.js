/* eslint-disable camelcase */

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { isArray, logError, logWarn } from '../src/utils.js';
// Removed unused storage and USER_SYNC_URL

const BIDDER_CODE = 'nexverse';
const ENDPOINT_URL = 'http://rtb.nexverse.ai/';

const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO, NATIVE];

const LOG_WARN_PREFIX = '[Nexverse warn]: ';
const LOG_ERROR_PREFIX = '[Nexverse error]: ';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  /**
   * Validates the bid request to ensure all required parameters are present.
   * @param {Object} bid - The bid request object.
   * @returns {boolean} True if the bid request is valid, false otherwise.
   */
  isBidRequestValid(bid) {
    const isValid = !!(
      bid.params &&
      bid.params.uid &&
      bid.params.pub_id &&
      bid.params.pub_epid
    );

    if (!isValid) {
      logError(`${LOG_ERROR_PREFIX} Missing required bid parameters.`);
    }

    return isValid;
  },

  /**
   * Builds the OpenRTB server request from the list of valid bid requests.
   *
   * @param {Array} validBidRequests - Array of valid bid requests.
   * @param {Object} bidderRequest - The bidder request object containing additional data.
   * @returns {Array} Array of server requests to be sent to the endpoint.
   */
  buildRequests(validBidRequests, bidderRequest) {
    const requests = validBidRequests
      .map((bid) => {
        const uid = bid.params.uid;
        const pub_id = bid.params.pub_id;
        const pub_epid = bid.params.pub_epid;

        // Check if endpoint URL parameters are missing
        if (!uid || !pub_id || !pub_epid) {
          logError(`${LOG_ERROR_PREFIX} Missing required endpoint URL parameters.`);
          return null; // Stop processing this bid
        }

        // Build the endpoint URL with query parameters
        const endpointUrl = `${ENDPOINT_URL}?uid=${encodeURIComponent(uid)}&pub_id=${encodeURIComponent(
          pub_id
        )}&pub_epid=${encodeURIComponent(pub_epid)}`;

        // Build the OpenRTB payload
        const payload = buildOpenRtbRequest(bid, bidderRequest);

        if (!payload) {
          // Error has been logged in buildOpenRtbRequest
          return null; // Skip this bid
        }

        // Return the server request
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
      })
      .filter((request) => request !== null); // Remove null entries

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
      logWarn(`${LOG_WARN_PREFIX} No valid bids in the response.`);
      return bidResponses;
    }

    response.seatbid.forEach((seatbid) => {
      seatbid.bid.forEach((bid) => {
        const bidResponse = {
          requestId: bid.impid,
          cpm: bid.price,
          currency: response.cur || 'USD',
          width: bid.w || 0,
          height: bid.h || 0,
          creativeId: bid.crid || bid.id,
          ttl: 300,
          netRevenue: true,
          meta: {},
        };

        // Determine media type and assign the ad content
        if (bid.ext && bid.ext.mediaType) {
          bidResponse.mediaType = bid.ext.mediaType;
        } else if (bid.adm && bid.adm.indexOf('<VAST') !== -1) {
          bidResponse.mediaType = VIDEO;
          bidResponse.vastXml = bid.adm;
        } else if (bid.adm && bid.adm.indexOf('"native"') !== -1) {
          bidResponse.mediaType = NATIVE;
          bidResponse.native = parseNativeResponse(bid.adm);
        } else {
          bidResponse.mediaType = BANNER;
          bidResponse.ad = bid.adm || '';
        }

        // Handle advertiser domains
        if (bid.adomain && isArray(bid.adomain)) {
          bidResponse.meta.advertiserDomains = bid.adomain;
        } else {
          bidResponse.meta.advertiserDomains = [];
        }

        // Include 'nurl' if provided
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
 * Builds the OpenRTB request payload.
 *
 * @param {Object} bid - The bid request object.
 * @param {Object} bidderRequest - The bidder request object.
 * @returns {Object|null} The OpenRTB request payload or null if missing mandatory parameters.
 */
function buildOpenRtbRequest(bid, bidderRequest) {
  // Placeholder function - make sure to implement or import the correct logic
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

/**
 * Parses the native response from the server into Prebid's native format.
 *
 * @param {string} adm - The adm field from the bid response (JSON string).
 * @returns {Object} The parsed native response object.
 */
function parseNativeResponse(adm) {
  // Placeholder function - implement this based on the server response format
  try {
    const admObj = JSON.parse(adm);
    return admObj.native;
  } catch (e) {
    logError(`${LOG_ERROR_PREFIX} Error parsing native response: `, e);
    return {};
  }
}

registerBidder(spec);
