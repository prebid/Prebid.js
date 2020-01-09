import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes'
import * as utils from '../src/utils';

export const BIDDER_CODE = 'aduptech';
export const PUBLISHER_PLACEHOLDER = '{PUBLISHER}';
export const ENDPOINT_URL = 'https://rtb.d.adup-tech.com/prebid/' + PUBLISHER_PLACEHOLDER + '_bid';
export const ENDPOINT_METHOD = 'POST';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Validate given bid request
   *
   * @param {*} bidRequest
   * @returns {boolean}
   */
  isBidRequestValid: (bidRequest) => {
    if (!bidRequest) {
      return false;
    }

    const sizes = extractSizesFromBidRequest(bidRequest);
    if (!sizes || sizes.length === 0) {
      return false;
    }

    const params = extractParamsFromBidRequest(bidRequest);
    if (!params || !params.publisher || !params.placement) {
      return false;
    }

    return true;
  },

  /**
   * Build real bid requests
   *
   * @param {*} validBidRequests
   * @param {*} bidderRequest
   * @returns {*[]}
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const bidRequests = [];
    const gdpr = extractGdprFromBidderRequest(bidderRequest);

    validBidRequests.forEach((bidRequest) => {
      bidRequests.push({
        url: ENDPOINT_URL.replace(PUBLISHER_PLACEHOLDER, encodeURIComponent(bidRequest.params.publisher)),
        method: ENDPOINT_METHOD,
        data: {
          bidId: bidRequest.bidId,
          auctionId: bidRequest.auctionId,
          transactionId: bidRequest.transactionId,
          adUnitCode: bidRequest.adUnitCode,
          pageUrl: extractTopWindowUrlFromBidRequest(bidRequest),
          referrer: extractTopWindowReferrerFromBidRequest(bidRequest),
          sizes: extractSizesFromBidRequest(bidRequest),
          params: extractParamsFromBidRequest(bidRequest),
          gdpr: gdpr
        }
      });
    });

    return bidRequests;
  },

  /**
   * Handle bid response
   *
   * @param {*} response
   * @returns {*[]}
   */
  interpretResponse: (response) => {
    const bidResponses = [];

    if (!response.body || !response.body.bid || !response.body.creative) {
      return bidResponses;
    }

    bidResponses.push({
      requestId: response.body.bid.bidId,
      cpm: response.body.bid.price,
      netRevenue: response.body.bid.net,
      currency: response.body.bid.currency,
      ttl: response.body.bid.ttl,
      creativeId: response.body.creative.id,
      width: response.body.creative.width,
      height: response.body.creative.height,
      ad: response.body.creative.html
    });

    return bidResponses;
  }
};

/**
 * Extracts the possible ad unit sizes from given bid request
 *
 * @param {*} bidRequest
 * @returns {number[]}
 */
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
 * Extracts the custom params from given bid request
 *
 * @param {*} bidRequest
 * @returns {*}
 */
export function extractParamsFromBidRequest(bidRequest) {
  if (bidRequest && bidRequest.params) {
    return bidRequest.params
  } else {
    return null;
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
