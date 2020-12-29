import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js'

const BIDDER_CODE = 'adtrue';
const ADTRUE_CURRENCY = 'USD';
const ADTRUE_TTL = 120;
const ENDPOINT_URL = 'https://hb.adtrue.com/prebid/auction';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    return !!(bid.params.zoneId);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let bids = JSON.parse(JSON.stringify(validBidRequests))
    const payload = {};

    payload.device = {};
    payload.device.ua = navigator.userAgent;
    payload.device.w = screen.width;
    payload.device.h = screen.height;
    payload.device.lang = navigator.language;

    payload.site = {};
    payload.site.zoneId = bids[0].params.zoneId;
    payload.site.referrer = extractTopWindowReferrerFromBidRequest(bidderRequest);
    payload.site.pageUrl = extractTopWindowUrlFromBidRequest(bidderRequest);

    payload.gdpr =  extractGdprFromBidderRequest(bidderRequest);
    payload.size = extractSizesFromBidRequest(bidRequest);

    payload.bids = bids;

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payload,
      bidderRequests: bids
    };
  },
  interpretResponse: function (serverResponses, bidderRequest) {
    const bidResponses = [];
    utils._each(serverResponses.body, function (response) {
      if (response.cpm > 0) {
        const bidResponse = {
          requestId: response.id,
          creativeId: response.id,
          adId: response.id,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          currency: ADTRUE_CURRENCY,
          netRevenue: true,
          ttl: ADTRUE_TTL,
          ad: response.ad
        };
        bidResponses.push(bidResponse);
      }
    });
    return bidResponses;
  },

  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: 'https://hb.adtrue.com/prebid/usersync_async'
      });
    }

    if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      syncs.push({
        type: 'image',
        url: 'https://hb.adtrue.com/prebid/usersync_pixel'
      });
    }
    return syncs;
  }
};

export function extractSizesFromBidRequest(bidRequest) {
  // since pbjs 3.0
  if (bidRequest && utils.deepAccess(bidRequest, 'mediaTypes.banner.sizes')) {
    return bidRequest.mediaTypes.banner.sizes;

    // for backward compatibility
  } else if (bidRequest && bidRequest.sizes) {
    return bidRequest.sizes;

    // fallback
  } else {
    return [];
  }
}

/**
 * Extracts the GDPR information from given bidder request
 *
 * @param {*} bidderRequest
 * @returns {*}
 */
export function extractGdprFromBidderRequest(bidderRequest) {
  let gdpr = null;

  if (bidderRequest && bidderRequest.gdprConsent) {
    gdpr = {
      consentString: bidderRequest.gdprConsent.consentString,
      consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
    };
  }

  return gdpr;
}

/**
 * Extracts the page url from given bid request or use the (top) window location as fallback
 *
 * @param {*} bidRequest
 * @returns {string}
 */
export function extractTopWindowUrlFromBidRequest(bidRequest) {
  if (bidRequest && utils.deepAccess(bidRequest, 'refererInfo.canonicalUrl')) {
    return bidRequest.refererInfo.canonicalUrl;
  }

  try {
    return window.top.location.href;
  } catch (e) {
    return window.location.href;
  }
}

/**
 * Extracts the referrer from given bid request or use the (top) document referrer as fallback
 *
 * @param {*} bidRequest
 * @returns {string}
 */
export function extractTopWindowReferrerFromBidRequest(bidRequest) {
  if (bidRequest && utils.deepAccess(bidRequest, 'refererInfo.referer')) {
    return bidRequest.refererInfo.referer;
  }

  try {
    return window.top.document.referrer;
  } catch (e) {
    return window.document.referrer;
  }
}


registerBidder(spec);
