/* eslint-disable camelcase */

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { isArray, logError, logWarn, logInfo } from '../src/utils.js';

const BIDDER_CODE = 'nexverse';
const ENDPOINT_URL = 'https://rtb.nexverse.ai/';
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO, NATIVE];

const LOG_WARN_PREFIX = '[Nexverse warn]: ';
const LOG_ERROR_PREFIX = '[Nexverse error]: ';
const LOG_INFO_PREFIX = '[Nexverse info]: ';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  /**
   * Validates the bid request to ensure all required parameters are present.
   * @param {Object} bid - The bid request object.
   * @returns {boolean} True if the bid request is valid, false otherwise.
   */
  isBidRequestValid(bid) {
    const isValid = !!(bid.params && bid.params.uid && bid.params.pub_id && bid.params.pub_epid);

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
    const requests = validBidRequests.map((bid) => {
      const { uid, pub_id, pub_epid } = bid.params;

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
        logError(`${LOG_ERROR_PREFIX} Payload could not be built.`);
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
    });

    return requests.filter((request) => request !== null); // Remove null entries
  },

  /**
   * Interprets the server's response and extracts bid information.
   *
   * @param {Object} serverResponse - The response from the server.
   * @param {Object} request - The original server request.
   * @returns {Array} Array of bids to be passed to the auction.
   */
  interpretResponse(serverResponse, request) {
    if (serverResponse && serverResponse.status === 204) {
      logInfo(`${LOG_INFO_PREFIX} No ad available (204 response).`);
      return [];
    }

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
 * Builds the OpenRTB 2.5 request payload.
 *
 * @param {Object} bid - The bid request object.
 * @param {Object} bidderRequest - The bidder request object.
 * @returns {Object|null} The OpenRTB 2.5 request payload or null if missing mandatory parameters.
 */
function buildOpenRtbRequest(bid, bidderRequest) {
  if (!bid || !bidderRequest) {
    logError(`${LOG_ERROR_PREFIX} Missing required parameters for OpenRTB request.`);
    return null;
  }

  const imp = [];

  // Handle different media types (Banner, Video, Native)
  if (bid.mediaTypes.banner) {
    imp.push({
      id: bid.bidId,
      banner: {
        format: bid.sizes.map(size => ({ w: size[0], h: size[1] })), // List of size objects
        w: bid.sizes[0][0],
        h: bid.sizes[0][1],
      },
      bidfloor: bid.params.bidfloor || 0, // Handle bid floor if specified
      secure: isSecureRequest() ? 1 : 0, // Indicates whether the request is secure (HTTPS)
    });
  }

  if (bid.mediaTypes.video) {
    imp.push({
      id: bid.bidId,
      video: {
        w: bid.sizes[0][0],
        h: bid.sizes[0][1],
        mimes: bid.mediaTypes.video.mimes || ['video/mp4'], // Default to video/mp4 if not specified
        protocols: bid.mediaTypes.video.protocols || [2, 3, 5, 6], // RTB video ad serving protocols
        maxduration: bid.mediaTypes.video.maxduration || 30,
        linearity: bid.mediaTypes.video.linearity || 1,
        playbackmethod: bid.mediaTypes.video.playbackmethod || [2],
      },
      bidfloor: bid.params.bidfloor || 0,
      secure: isSecureRequest() ? 1 : 0, // Indicates whether the request is secure (HTTPS)
    });
  }

  if (bid.mediaTypes.native) {
    imp.push({
      id: bid.bidId,
      native: {
        request: JSON.stringify(bid.mediaTypes.native), // Convert native request to JSON string
      },
      bidfloor: bid.params.bidfloor || 0,
      secure: isSecureRequest() ? 1 : 0, // Indicates whether the request is secure (HTTPS)
    });
  }

  // Construct the OpenRTB request object
  const openRtbRequest = {
    id: bidderRequest.auctionId,
    imp: imp,
    site: {
      page: bidderRequest.refererInfo.page,
      domain: bidderRequest.refererInfo.domain,
      ref: bidderRequest.refererInfo.ref || '', // Referrer URL
    },
    device: {
      ua: navigator.userAgent,
      ip: bidderRequest.ip || '123.123.123.123', // IP address (replace with actual)
      devicetype: getDeviceType(), // 1 = Mobile/Tablet, 2 = Desktop
      os: getDeviceOS(),
      osv: getDeviceOSVersion(),
      make: navigator.vendor || '',
      model: getDeviceModel(),
      connectiontype: getConnectionType(), // Include connection type
      geo: {
        lat: bid.params.geoLat || 0,
        lon: bid.params.geoLon || 0,
      },
      language: navigator.language || 'en',
      dnt: navigator.doNotTrack === '1' ? 1 : 0, // Do Not Track flag
    },
    user: {
      id: bid.userId || 'anonymous',
      buyeruid: bidderRequest.userId || '', // User ID or Buyer ID
      ext: {
        consent: bidderRequest.gdprConsent ? bidderRequest.gdprConsent.consentString : null, // GDPR consent string
      },
    },
    regs: {
      ext: {
        gdpr: bidderRequest.gdprConsent ? (bidderRequest.gdprConsent.gdprApplies ? 1 : 0) : 0,
      },
    },
    ext: {
      prebid: {
        auctiontimestamp: bidderRequest.auctionStart,
      },
    },
  };

  // Add app object if the request comes from a mobile app
  if (bidderRequest.app) {
    openRtbRequest.app = {
      id: bidderRequest.app.id,
      name: bidderRequest.app.name,
      bundle: bidderRequest.app.bundle,
      domain: bidderRequest.app.domain,
      storeurl: bidderRequest.app.storeUrl,
      cat: bidderRequest.app.cat || [],
    };
  }

  // Add additional fields related to GDPR, US Privacy, CCPA
  if (bidderRequest.uspConsent) {
    openRtbRequest.regs.ext.us_privacy = bidderRequest.uspConsent;
  }

  return openRtbRequest;
}

/**
 * Checks if the request is made over a secure connection (HTTPS).
 * @returns {boolean} True if the connection is secure (HTTPS), false otherwise.
 */
function isSecureRequest() {
  return location.protocol === 'https:';
}

/**
 * Determines the device connection type.
 * @returns {number} The connection type based on OpenRTB 2.5 spec.
 */
function getConnectionType() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection) {
    const type = connection.effectiveType || connection.type;
    switch (type) {
      case 'ethernet':
        return 1; // Ethernet
      case 'wifi':
      case 'wimax':
        return 2; // WiFi
      case 'cellular':
        return getCellularConnectionType(connection);
      default:
        return 0; // Unknown
    }
  }
  return 0; // Unknown
}

/**
 * Determines the cellular connection type based on OpenRTB 2.5 spec.
 * @param {Object} connection - The connection object from the browser.
 * @returns {number} The cellular connection type.
 */
function getCellularConnectionType(connection) {
  const gen = connection.effectiveType;
  switch (gen) {
    case '2g':
      return 4; // Cellular (2G)
    case '3g':
      return 5; // Cellular (3G)
    case '4g':
      return 6; // Cellular (4G)
    case '5g':
      return 7; // Cellular (5G)
    default:
      return 3; // Cellular (Unknown Generation)
  }
}

/**
 * Determines the device type (1 = Mobile/Tablet, 2 = Desktop).
 * @returns {number} The device type.
 */
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPad/i.test(ua)) {
    return 1; // Mobile/Tablet
  }
  return 2; // Desktop
}

/**
 * Determines the device operating system.
 * @returns {string} The OS name.
 */
function getDeviceOS() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) {
    return 'Android';
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'iOS';
  } else if (/Windows/i.test(ua)) {
    return 'Windows';
  } else if (/Mac OS/i.test(ua)) {
    return 'Mac OS';
  }
  return 'Other';
}

/**
 * Determines the device operating system version.
 * @returns {string} The OS version.
 */
function getDeviceOSVersion() {
  const ua = navigator.userAgent;
  let osVersion = 'unknown';

  if (/Android/i.test(ua)) {
    const match = ua.match(/Android\s([0-9\.]+)/);
    if (match) {
      osVersion = match[1];
    }
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/OS\s([0-9_]+)/);
    if (match) {
      osVersion = match[1].replace(/_/g, '.');
    }
  }
  return osVersion;
}

/**
 * Determines the device model (if possible).
 * @returns {string} The device model.
 */
function getDeviceModel() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) {
    return 'iPhone';
  } else if (/iPad/i.test(ua)) {
    return 'iPad';
  } else if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*;\s([a-zA-Z0-9\s]+)\sBuild/);
    return match ? match[1].trim() : '';
  }
  return '';
}

/**
 * Parses the native response from the server into Prebid's native format.
 *
 * @param {string} adm - The adm field from the bid response (JSON string).
 * @returns {Object} The parsed native response object.
 */
function parseNativeResponse(adm) {
  try {
    const admObj = JSON.parse(adm);
    return admObj.native;
  } catch (e) {
    logError(`${LOG_ERROR_PREFIX} Error parsing native response: `, e);
    return {};
  }
}

registerBidder(spec);
