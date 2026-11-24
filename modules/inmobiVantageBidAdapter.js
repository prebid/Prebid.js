import { deepSetValue, logError, triggerPixel } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ajax } from '../src/ajax.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { insertUserSyncIframe } from '../src/userSync.js';
import { parseUntrustedJSON } from '../src/utils/untrustedJson.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { ortb25Translator } from '../libraries/ortb2.5Translator/translator.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 */

const GVLID = 333;
export const ADAPTER_VERSION = 1.0;
const BIDDER_CODE = 'inmobiVantage';
const BID_ENDPOINT = 'https://pbs.inmobi.com/openrtb2/auction/pbjs';
export const COOKIE_SYNC_ENDPOINT = 'https://pbs.inmobi.com/cookie_sync';

// The build binds this module's imports to local copies, so tests stub these instead
export const dep = {
  ajax,
  triggerPixel,
  insertUserSyncIframe
};
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
  response
});

/**
 * Builds an impression object for oRTB 2.5 requests based on the bid request.
 *
 * @param {function} buildImp - Function to build the imp object.
 * @param {Object} bidRequest - The request containing bid details.
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
  context.mtype = bid?.mtype;
  if (context.mtype === 4) {
    const admJson = JSON.parse(bid.adm);
    bid.adm = JSON.stringify(admJson.native);
  }
  const bidResponse = buildBidResponse(bid, context);

  if (typeof bid?.ext !== 'undefined') {
    deepSetValue(bidResponse, 'meta', {
      ...bidResponse.meta,
      ...bid.ext,
    });
  }

  return bidResponse;
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
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return [];
    }
    runCookieSync(syncOptions, responses, gdprConsent, uspConsent, gppConsent);
    // Syncs are fired from the /cookie_sync response instead of Prebid's sync queue,
    // because the per-bidder sync URLs are only known once Prebid Server answers.
    return [];
  },

  /**
   * Validates if a bid request contains the required parameters for InMobi.
   *
   * @param {Object} bid - Bid request to validate.
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
   * @param {BidRequest[]} bidRequests - Array of bid requests.
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
 * Collects the bidders Prebid Server ran for this page, from the seats it returned.
 */
function biddersFromResponses(responses) {
  const bidders = new Set();
  (responses || []).forEach(resp => {
    (resp?.body?.seatbid || []).forEach(seatbid => {
      if (seatbid?.seat) {
        bidders.add(seatbid.seat);
      }
    });
  });
  return [...bidders];
}

/**
 * Calls Prebid Server's /cookie_sync and fires the sync URL of every bidder that has no id yet.
 * Each bidder redirects back to Prebid Server's /setuid, which stores the id in the uids cookie.
 */
function runCookieSync(syncOptions, responses, gdprConsent, uspConsent, gppConsent) {
  const payload = {
    bidders: biddersFromResponses(responses),
    coopSync: true,
    filterSettings: {
      iframe: { bidders: '*', filter: syncOptions.iframeEnabled ? 'include' : 'exclude' },
      image: { bidders: '*', filter: syncOptions.pixelEnabled ? 'include' : 'exclude' }
    }
  };
  if (gdprConsent) {
    payload.gdpr = gdprConsent.gdprApplies ? 1 : 0;
    if (gdprConsent.gdprApplies !== false && typeof gdprConsent.consentString === 'string') {
      payload.gdpr_consent = gdprConsent.consentString;
    }
  }
  if (uspConsent) {
    payload.us_privacy = uspConsent;
  }
  if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
    payload.gpp = gppConsent.gppString;
    payload.gpp_sid = gppConsent.applicableSections.join(',');
  }

  dep.ajax(COOKIE_SYNC_ENDPOINT, {
    success: (body) => {
      try {
        fireSyncs(parseUntrustedJSON(body)?.bidder_status, syncOptions);
      } catch (e) {
        logError('inmobiVantage: invalid /cookie_sync response', e);
      }
    },
    error: (e) => logError('inmobiVantage: /cookie_sync failed', e)
  }, JSON.stringify(payload), {
    method: POST_METHOD,
    contentType: PLAIN_CONTENT_TYPE,
    withCredentials: true
  });
}

function fireSyncs(bidderStatus, syncOptions) {
  (bidderStatus || []).forEach(status => {
    const url = status?.usersync?.url;
    if (!status?.no_cookie || !url) {
      return;
    }
    const type = status.usersync.type;
    if (type === 'iframe' && syncOptions.iframeEnabled) {
      dep.insertUserSyncIframe(url);
    } else if ((type === 'redirect' || type === 'image') && syncOptions.pixelEnabled) {
      dep.triggerPixel(url);
    }
  });
}

registerBidder(spec);
