import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { isArray, isNumber, generateUUID, getWinDimensions } from '../src/utils.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import {getConnectionType} from '../libraries/connectionInfo/connectionUtils.js'
import { getDeviceType, getOS } from '../libraries/userAgentUtils/index.js';
import { getDeviceModel, buildEndpointUrl, isBidRequestValid, parseNativeResponse, printLog, getUid } from '../libraries/nexverseUtils/index.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';
import { getUserSyncs } from '../libraries/teqblazeUtils/bidderUtils.js';
import { getOsVersion } from '../libraries/advangUtils/index.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'nexverse';
const BIDDER_ENDPOINT = 'https://rtb.nexverse.ai';
const SUPPORTED_MEDIA_TYPES = [BANNER, VIDEO, NATIVE];
const DEFAULT_CURRENCY = 'USD';
const BID_TTL = 300;
const DEFAULT_LANG = 'en';

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: BIDDER_CODE});

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
      // Build the endpoint URL with query parameters
      const endpointUrl = buildEndpointUrl(BIDDER_ENDPOINT, bid);

      // Build the OpenRTB payload
      const payload = buildOpenRtbRequest(bid, bidderRequest);

      if (!payload) {
        printLog('error', 'Payload could not be built.');
        return null; // Skip this bid
      }

      // Return the server request
      return {
        method: 'POST',
        url: endpointUrl,
        data: JSON.stringify(payload),
        bidRequest: bid,
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
      printLog('info', 'No ad available (204 response).');
      return [];
    }

    const bidResponses = [];
    const response = serverResponse.body;

    if (!response || !response.seatbid || !isArray(response.seatbid)) {
      printLog('warning', 'No valid bids in the response.');
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
          bidResponse.meta.advertiserDomains = bid.bundle;
        }
        if (bid.attr && isArray(bid.attr)) {
          bidResponse.meta.attr = bid.attr;
        } else {
          bidResponse.meta.attr = [];
        }
        bidResponse.meta.primaryCatId = bid.cat;
        bidResponse.meta.secondaryCatIds = bid.cat.slice(1);

        // Include 'nurl' if provided
        if (bid.nurl) {
          bidResponse.nurl = bid.nurl;
        }

        bidResponses.push(bidResponse);
      });
    });
    return bidResponses;
  },
  getUserSyncs: getUserSyncs(BIDDER_ENDPOINT),
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
    printLog('error', 'Missing required parameters for OpenRTB request.');
    return null;
  }

  const imps = [];

  let bidFloor = bid.params.bidFloor || 0
  bidFloor = parseFloat(bid.params.bidFloor)

  // Handle different media types (Banner, Video, Native)
  if (bid.mediaTypes.banner) {
    let imp = {
      id: bid.bidId,
      banner: {
        format: bid.sizes.map(size => ({ w: size[0], h: size[1] })), // List of size objects
        w: bid.sizes[0][0],
        h: bid.sizes[0][1],
      },
      secure: window.location.protocol === 'https:' ? 1 : 0, // Indicates whether the request is secure (HTTPS)
    };
    if (isNumber(bidFloor) && bidFloor !== 0) {
      imp.bidFloor = bidFloor
    }
    imps.push(imp);
  }
  if (bid.mediaTypes.video) {
    let imp = {
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
      secure: window.location.protocol === 'https:' ? 1 : 0, // Indicates whether the request is secure (HTTPS)
    };
    if (isNumber(bidFloor) && bidFloor !== 0) {
      imp.bidFloor = bidFloor
    }
    imps.push(imp);
  }
  if (bid.mediaTypes.native) {
     let imp = {
      id: bid.bidId,
      native: {
        request: JSON.stringify(bid.mediaTypes.native), // Convert native request to JSON string
      },
      secure: window.location.protocol === 'https:' ? 1 : 0, // Indicates whether the request is secure (HTTPS)
    };
    if (isNumber(bidFloor) && bidFloor !== 0) {
      imp.bidFloor = bidFloor
    }
    imps.push(imp);
  }

  // Calculate viewability percentage for the ad unit
  const adUnitElement = document.getElementById(bid.adUnitCode);
  let viewabilityPercentage = 0;
  if (adUnitElement) {
    const rect = getBoundingClientRect(adUnitElement);
    const { innerWidth, innerHeight } = getWinDimensions();
    if (rect && innerWidth && innerHeight) {
      // Calculate how much of the element is in view
      const visibleHeight = Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0);
      const visibleWidth = Math.min(rect.right, innerHeight) - Math.max(rect.left, 0);
      if (visibleHeight > 0 && visibleWidth > 0) {
        const totalArea = rect.width * rect.height;
        const visibleArea = visibleHeight * visibleWidth;
        viewabilityPercentage = Math.round((visibleArea / totalArea) * 100);
      }
    }
  }

  // Construct the OpenRTB request object
  const openRtbRequest = {
    id: bidderRequest.auctionId ?? generateUUID(),
    imp: imps,
    site: {
      page: bidderRequest.refererInfo.page,
      domain: bidderRequest.refererInfo.domain,
      ref: bidderRequest.refererInfo.ref || '', // Referrer URL
    },
    device: {
      ua: navigator.userAgent,
      devicetype: getDeviceType(), // 1 = Mobile/Tablet, 2 = Desktop
      os: getOS(),
      osv: getOsVersion(),
      make: navigator.vendor || '',
      model: getDeviceModel(),
      connectiontype: getConnectionType(), // Include connection type
      geo: {
        lat: bid.params.geoLat || 0,
        lon: bid.params.geoLon || 0,
      },
      language: navigator.language || DEFAULT_LANG,
      dnt: navigator.doNotTrack === '1' ? 1 : 0, // Do Not Track flag
    },
    user: {
      id: getUid(storage),
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
      viewabilityPercentage
    },
    test: config.getConfig('debug') ? 1 : 0,
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

registerBidder(spec);
