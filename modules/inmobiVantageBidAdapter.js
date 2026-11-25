import { deepSetValue, isPlainObject } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { parseUntrustedJSON } from '../src/utils/untrustedJson.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { ortb25Translator } from '../libraries/ortb2.5Translator/translator.js';
import { extPrebidMediaType } from '../libraries/pbsExtensions/processors/mediaType.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('./inmobiVantageBidAdapter.d.ts').InmobiVantageBidderParams} InmobiVantageBidderParams
 * @typedef {BidRequest & { params: InmobiVantageBidderParams }} InmobiVantageBidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 */

const GVLID = 333;
export const ADAPTER_VERSION = 1.0;
const BIDDER_CODE = 'inmobiVantage';
const BID_ENDPOINT = 'https://pbs.inmobi.com/openrtb2/auction/pbjs';
// Prebid Server page that calls /cookie_sync and fires the sync of each partner without a user id
export const COOKIE_SYNC_LOADER = 'https://pbs.inmobi.com/static/load-cookie.html';
const TRANSLATOR = ortb25Translator();
const CURRENCY = 'USD';
const POST_METHOD = 'POST';
const PLAIN_CONTENT_TYPE = 'text/plain';

/**
 * Defines the core oRTB converter inherited from converter library and all customization functions.
 */
const CONVERTER = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 3600,
    currency: CURRENCY
  },
  imp,
  request,
  bidResponse,
  response,
  overrides: {
    bidResponse: {
      // PBS may send the media type in ext.prebid.type instead of the ORTB 2.6 mtype
      mediaType(orig, bidResponse, bid, context) {
        extPrebidMediaType(bidResponse, bid, context);
      }
    }
  }
});

/**
 * Builds an impression object for oRTB 2.5 requests based on the bid request.
 *
 * @param {function} buildImp - Function to build the imp object.
 * @param {InmobiVantageBidRequest} bidRequest - The request containing bid details.
 * @param {Object} context - Context for the impression.
 * @returns {Object} The constructed impression object.
 */
function imp(buildImp, bidRequest, context) {
  const imp = buildImp(bidRequest, context);
  const tagId = bidRequest.params.tagID;

  imp.tagid = tagId;

  // if floor price module is not set reading from bidRequest.params
  if (!imp.bidfloor && bidRequest.params.bidfloor) {
    imp.bidfloor = bidRequest.params.bidfloor;
    imp.bidfloorcur = CURRENCY;
  }

  // Prebid Server treats unknown imp.ext keys as bidder names, so params are not sent; only standard ext fields (gpid, ...) stay
  deepSetValue(imp, 'ext.prebid.storedrequest.id', tagId);
  imp.secure = Number(window.location.protocol === 'https:');

  return imp;
}

/**
 * Constructs the oRTB 2.5 request object.
 *
 * @param {function} buildRequest - Function to build the request.
 * @param {Array} imps - Array of impression objects.
 * @param {Object} bidderRequest - Object containing bidder request information.
 * @param {Object} context - Additional context.
 * @returns {Object} The complete oRTB request object.
 */
function request(buildRequest, imps, bidderRequest, context) {
  let request = buildRequest(imps, bidderRequest, context);

  const siteId = context.bidRequests?.find(bidRequest => bidRequest.params?.siteID)?.params.siteID;
  if (siteId) {
    deepSetValue(request, 'ext.prebid.storedrequest.id', siteId);
  }
  deepSetValue(request, 'ext.prebid.channel.name', 'pbjs_Vantage');
  deepSetValue(request, 'ext.prebid.channel.pbjsversion', '$prebid.version$');
  deepSetValue(request, 'ext.prebid.channel.adapterversion', ADAPTER_VERSION);

  request = TRANSLATOR(request);
  return request;
}

/**
 * Transforms an oRTB 2.5 bid into a bid response format for Prebid.js.
 *
 * @param {function} buildBidResponse - Function to build a bid response.
 * @param {Object} bid - The bid to be transformed.
 * @param {Object} context - Context for the bid.
 * @returns {Object} Formatted bid response.
 */
function bidResponse(buildBidResponse, bid, context) {
  if (isNativeBid(bid) && typeof bid.adm === 'string') {
    const admJson = parseUntrustedJSON(bid.adm);
    // unwrap the legacy {"native": {...}} envelope; Native 1.2 payloads with root-level assets stay as they are
    if (isPlainObject(admJson?.native)) {
      bid.adm = JSON.stringify(admJson.native);
    }
  }
  const bidResponse = buildBidResponse(bid, context);

  if (typeof bid?.ext !== 'undefined') {
    deepSetValue(bidResponse, 'meta', {
      ...bidResponse.meta,
      ...bid.ext,
      // PBS metadata (networkName, ...) goes to the top level, where core reads it (e.g. hb_dsp)
      ...bid.ext?.prebid?.meta,
    });
  }

  return bidResponse;
}

function isNativeBid(bid) {
  return bid?.mtype === 4 || (bid?.mtype == null && bid?.ext?.prebid?.type === NATIVE);
}

/**
 * Converts the oRTB 2.5 bid response into the format required by Prebid.js.
 *
 * @param {function} buildResponse - Function to build the response.
 * @param {Array} bidResponses - List of bid responses.
 * @param {Object} ortbResponse - Original oRTB response data.
 * @param {Object} context - Additional context.
 * @returns {Object} Prebid.js compatible bid response.
 */
function response(buildResponse, bidResponses, ortbResponse, context) {
  const response = buildResponse(bidResponses, ortbResponse, context);

  return response;
}

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Determines user sync options based on consent and supported sync types.
   *
   * @param {Object} syncOptions - Options for user syncing (iframe, pixel).
   * @param {Array} responses - List of bid responses.
   * @param {Object} gdprConsent - GDPR consent details.
   * @param {Object} uspConsent - CCPA consent details.
   * @param {Object} gppConsent - GPP consent details.
   * @returns {Array} List of user sync URLs.
   */
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent, gppConsent) => {
    // The loader page runs /cookie_sync and fires the partner syncs, so it can only be sent as an iframe
    if (!syncOptions.iframeEnabled) {
      return [];
    }
    const bidders = biddersFromResponses(responses);
    if (!bidders.length) {
      return [];
    }
    // coop_sync and account are not sent: Prebid Server applies its host default cookie-sync config
    const params = {
      bidders: bidders.join(','),
      image: syncOptions.pixelEnabled ? 1 : 0
    };
    if (gdprConsent) {
      params.gdpr = gdprConsent.gdprApplies ? 1 : 0;
      if (gdprConsent.gdprApplies !== false && typeof gdprConsent.consentString === 'string') {
        params.gdpr_consent = gdprConsent.consentString;
      }
    }
    if (uspConsent) {
      params.us_privacy = uspConsent;
    }
    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      params.gpp = gppConsent.gppString;
      params.gpp_sid = gppConsent.applicableSections.join(',');
    }
    // Returned to Prebid's sync queue, so syncEnabled, activity controls, syncDelay and limits apply
    const qs = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    return [{ type: 'iframe', url: `${COOKIE_SYNC_LOADER}?${qs}` }];
  },

  /**
   * Validates if a bid request contains the required parameters for InMobi.
   *
   * @param {InmobiVantageBidRequest} bid - Bid request to validate.
   * @returns {boolean} True if the bid request is valid, otherwise false.
   */
  isBidRequestValid: (bid) => {
    if (!(bid && bid.params && bid.params.tagID && bid.params.siteID)) {
      return false;
    }

    return true;
  },

  /**
   * Builds the server request from bid requests for InMobi.
   *
   * @param {InmobiVantageBidRequest[]} bidRequests - Array of bid requests.
   * @param {Object} bidderRequest - Additional request details.
   * @returns {ServerRequest} The server request for bidding.
   */
  buildRequests: (bidRequests, bidderRequest) => {
    const data = CONVERTER.toORTB({ bidderRequest, bidRequests });

    if (data) {
      const requestPayload = {
        method: POST_METHOD,
        url: BID_ENDPOINT,
        data: data,
        options: {
          contentType: PLAIN_CONTENT_TYPE,
          crossOrigin: true,
          withCredentials: true
        }
      };
      return requestPayload;
    }
  },

  /**
   * Interprets the server response and formats it into bids.
   *
   * @param {Object} response - Response from the server.
   * @param {ServerRequest} request - Original bid request.
   * @returns {Bid[]} Parsed bids or configurations.
   */
  interpretResponse: (response, request) => {
    if (typeof response?.body === 'undefined') {
      return [];
    }

    const interpretedResponse = CONVERTER.fromORTB({ response: response.body, request: request.data });
    const bids = interpretedResponse.bids || [];

    return bids;
  }

};

/**
 * Collects every bidder Prebid Server called for this page, including the ones that lost or did not bid,
 * from ext.responsetimemillis.
 */
function biddersFromResponses(responses) {
  const bidders = new Set();
  (responses || []).forEach(resp => {
    Object.keys(resp?.body?.ext?.responsetimemillis || {}).forEach(bidder => bidders.add(bidder));
  });
  return [...bidders];
}

registerBidder(spec);
