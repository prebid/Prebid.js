import {buildUrl, deepAccess, isArray, generateUUID} from '../src/utils.js'
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';
import {chunk} from '../libraries/chunk/chunk.js';
import {getStorageManager} from '../src/storageManager.js';
import {findRootDomain} from '../src/fpd/rootDomain.js';

const BIDDER_CODE = 'smartytech';
export const ENDPOINT_PROTOCOL = 'https';
export const ENDPOINT_DOMAIN = 'server.smartytech.io';
export const ENDPOINT_PATH = '/hb/v2/bidder';

// Alias User ID constants
const AUID_COOKIE_NAME = '_smartytech_auid';
const AUID_COOKIE_EXPIRATION_DAYS = 1825; // 5 years

// Storage manager for cookies
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

/**
 * Get or generate Alias User ID (auId)
 * - Checks if auId exists in cookie
 * - If not, generates new UUID and stores it in cookie on root domain
 * @returns {string|null} The alias user ID or null if cookies are not enabled
 */
export function getAliasUserId() {
  if (!storage.cookiesAreEnabled()) {
    return null;
  }

  let auId = storage.getCookie(AUID_COOKIE_NAME);

  if (auId && auId.length > 0) {
    return auId;
  }

  auId = generateUUID();

  const expirationDate = new Date();
  expirationDate.setTime(expirationDate.getTime() + (AUID_COOKIE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000));
  const expires = expirationDate.toUTCString();

  storage.setCookie(AUID_COOKIE_NAME, auId, expires, 'Lax', findRootDomain());

  return auId;
}

export const spec = {
  supportedMediaTypes: [ BANNER, VIDEO ],
  code: BIDDER_CODE,

  isBidRequestValid: function (bidRequest) {
    return (
      !!parseInt(bidRequest.params.endpointId) &&
      spec._validateBanner(bidRequest) &&
      spec._validateVideo(bidRequest)
    );
  },

  _validateBanner: function(bidRequest) {
    const bannerAdUnit = deepAccess(bidRequest, 'mediaTypes.banner');

    if (bannerAdUnit === undefined) {
      return true;
    }

    if (!Array.isArray(bannerAdUnit.sizes)) {
      return false;
    }

    return true;
  },

  _validateVideo: function(bidRequest) {
    const videoAdUnit = deepAccess(bidRequest, 'mediaTypes.video');

    if (videoAdUnit === undefined) {
      return true;
    }

    if (!Array.isArray(videoAdUnit.playerSize)) {
      return false;
    }

    if (!videoAdUnit.context) {
      return false;
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const referer = bidderRequest?.refererInfo?.page || window.location.href;

    const auId = getAliasUserId();

    const bidRequests = validBidRequests.map((validBidRequest) => {
      const video = deepAccess(validBidRequest, 'mediaTypes.video', false);
      const banner = deepAccess(validBidRequest, 'mediaTypes.banner', false);
      const sizes = validBidRequest.params.sizes;

      const oneRequest = {
        endpointId: validBidRequest.params.endpointId,
        adUnitCode: validBidRequest.adUnitCode,
        referer: referer,
        bidId: validBidRequest.bidId
      };

      if (auId) {
        oneRequest.auId = auId;
      }

      if (video) {
        oneRequest.video = video;

        if (sizes) {
          oneRequest.video.sizes = sizes;
        }
      } else if (banner) {
        oneRequest.banner = banner;

        if (sizes) {
          oneRequest.banner.sizes = sizes;
        }
      }

      // Add user IDs if available
      const userIds = deepAccess(validBidRequest, 'userIdAsEids');
      if (userIds && isArray(userIds) && userIds.length > 0) {
        oneRequest.userIds = userIds;
      }

      // Add GDPR consent if available
      if (bidderRequest && bidderRequest.gdprConsent) {
        oneRequest.gdprConsent = {
          consentString: bidderRequest.gdprConsent.consentString || ''
        };

        if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') {
          oneRequest.gdprConsent.gdprApplies = bidderRequest.gdprConsent.gdprApplies;
        }

        if (bidderRequest.gdprConsent.addtlConsent) {
          oneRequest.gdprConsent.addtlConsent = bidderRequest.gdprConsent.addtlConsent;
        }
      }

      // Add CCPA/USP consent if available
      if (bidderRequest && bidderRequest.uspConsent) {
        oneRequest.uspConsent = bidderRequest.uspConsent;
      }

      // Add COPPA flag if configured
      const coppa = config.getConfig('coppa');
      if (coppa) {
        oneRequest.coppa = coppa;
      }

      return oneRequest
    });

    const smartytechRequestUrl = buildUrl({
      protocol: ENDPOINT_PROTOCOL,
      hostname: ENDPOINT_DOMAIN,
      pathname: ENDPOINT_PATH,
    });

    // Get chunk size from adapter configuration
    const adapterSettings = config.getConfig(BIDDER_CODE) || {};
    const chunkSize = deepAccess(adapterSettings, 'chunkSize', 10);

    // Split bid requests into chunks
    const bidChunks = chunk(bidRequests, chunkSize);

    // Return array of request objects, one for each chunk
    return bidChunks.map(bidChunk => ({
      method: 'POST',
      url: smartytechRequestUrl,
      data: bidChunk
    }));
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (typeof serverResponse.body === 'undefined') {
      return [];
    }

    const validBids = bidRequest.data;
    const keys = Object.keys(serverResponse.body)
    const responseBody = serverResponse.body;

    return keys.filter(key => {
      return responseBody[key].ad
    }).map(key => {
      return {
        bid: validBids.find(b => b.adUnitCode === key),
        response: responseBody[key]
      }
    }).map(item => spec._adResponse(item.bid, item.response));
  },

  _adResponse: function (request, response) {
    const bidObject = {
      requestId: request.bidId,
      adUnitCode: request.adUnitCode,
      ad: response.ad,
      cpm: response.cpm,
      width: response.width,
      height: response.height,
      ttl: 60,
      creativeId: response.creativeId,
      netRevenue: true,
      currency: response.currency,
      mediaType: BANNER,
      meta: {}
    };

    if (response.mediaType === VIDEO) {
      bidObject.vastXml = response.ad;
      bidObject.mediaType = VIDEO;
    }

    if (response.meta) {
      bidObject.meta = response.meta;
    }

    return bidObject;
  },

}

registerBidder(spec);
