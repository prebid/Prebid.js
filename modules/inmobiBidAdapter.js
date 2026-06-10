import { deepAccess, deepSetValue, isFn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { ortb25Translator } from '../libraries/ortb2.5Translator/translator.js';
import { tryAppendQueryString } from '../libraries/urlUtils/urlUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 * @typedef {import('../src/adapters/bidderFactory.js').TimedOutBid} TimedOutBid
 */

const GVLID = 333;
export const ADAPTER_VERSION = 1.0;
const BIDDER_CODE = 'inmobi';
const BID_ENDPOINT = 'https://api.w.inmobi.com/openrtb/bidder/prebidjs';
export const EVENT_ENDPOINT = 'https://sync.inmobi.com';
export const SYNC_ENDPOINT = 'https://sync.inmobi.com/prebidjs?';
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
  const params = bidRequest.params;

  imp.tagid = bidRequest.adUnitCode;
  let floorInfo = {};

  if (isFn(bidRequest.getFloor)) {
    floorInfo = bidRequest.getFloor({
      currency: CURRENCY,
      size: '*',
      mediaType: '*'
    });
  }

  // if floor price module is not set reading from bidRequest.params
  if (!imp.bidfloor && bidRequest.params.bidfloor) {
    imp.bidfloor = bidRequest.params.bidfloor;
    imp.bidfloorcur = CURRENCY;
  }

  deepSetValue(imp, 'ext', {
    ...imp.ext,
    params: bidRequest.params,
    bidder: {
      plc: params?.plc,
    },
    moduleFloors: floorInfo
  });
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

  deepSetValue(request, 'ext.prebid.channel.name', 'pbjs_InMobi');
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
  context.mtype = deepAccess(bid, 'mtype');
  if (context.mtype === 4) {
    const admJson = JSON.parse(bid.adm);
    bid.adm = JSON.stringify(admJson.native);
  }
  const bidResponse = buildBidResponse(bid, context);

  if (typeof deepAccess(bid, 'ext') !== 'undefined') {
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
    const urls = [];
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return urls;
    }
    const pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';

    let query = '';
    if (gdprConsent) {
      query = tryAppendQueryString(query, 'gdpr', (gdprConsent.gdprApplies ? 1 : 0));
    }
    if (gdprConsent && typeof gdprConsent.consentString === 'string') {
      query = tryAppendQueryString(query, 'gdpr_consent', gdprConsent.consentString);
    }
    if (uspConsent) {
      query = tryAppendQueryString(query, 'us_privacy', uspConsent);
    }
    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      query = tryAppendQueryString(query, 'gpp', gppConsent.gppString);
      query = tryAppendQueryString(query, 'gpp_sid', gppConsent?.applicableSections?.join(','));
    }
    if (query.slice(-1) === '&') {
      query = query.slice(0, -1);
    }

    if (pixelType === 'iframe' || (!responses || responses.length === 0)) {
      return [{
        type: pixelType,
        url: SYNC_ENDPOINT + query
      }];
    } else {
      responses.forEach(resp => {
        const userSyncs = deepAccess(resp, 'body.ext.prebidjs.urls');
        if (!userSyncs) {
          return;
        }

        userSyncs.forEach(us => {
          let url = us.url;
          if (query) {
            url = url + (url.indexOf('?') === -1 ? '?' : '&') + query;
          }

          urls.push({
            type: pixelType,
            url: url
          });
        });
      });
      return urls;
    }
  },

  /**
   * Validates if a bid request contains the required parameters for InMobi.
   *
   * @param {Object} bid - Bid request to validate.
   * @returns {boolean} True if the bid request is valid, otherwise false.
   */
  isBidRequestValid: (bid) => {
    if (!(bid && bid.params && bid.params.plc)) {
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
  },

  /**
   * Callback to report timeout event.
   *
   * @param {TimedOutBid[]} timeoutData - Array of timeout details.
   */
  onTimeout: (timeoutData) => {
    report('onTimeout', timeoutData);
  },

  /**
   * Callback to report targeting event.
   *
   * @param {Bid} bid - The bid object
   */
  onSetTargeting: (bid) => {
    report('onSetTargeting', bid?.meta);
  },

  /**
   * Callback to report successful ad render event.
   *
   * @param {Bid} bid - The bid that successfully rendered.
   */
  onAdRenderSucceeded: (bid) => {
    report('onAdRenderSucceeded', bid?.meta);
  },

  /**
   * Callback to report bidder error event.
   *
   * @param {Object} errorData - Details about the error.
   */
  onBidderError: (errorData) => {
    report('onBidderError', errorData);
  },

  /**
   * Callback to report bid won event.
   *
   * @param {Bid} bid - The bid that won the auction.
   */
  onBidWon: (bid) => {
    report('onBidWon', bid?.meta);
  }

};

function isReportingAllowed(loggingPercentage) {
  return loggingPercentage !== 0;
}

function report(type, data) {
  if (!data) {
    return;
  }
  if (['onBidWon', 'onAdRenderSucceeded', 'onSetTargeting'].includes(type) && !isReportingAllowed(data.loggingPercentage)) {
    return;
  }
  const payload = JSON.stringify({
    domain: location.hostname,
    eventPayload: data
  });

  fetch(`${EVENT_ENDPOINT}/report/${type}`, {
    body: payload,
    keepalive: true,
    credentials: 'include',
    method: POST_METHOD,
    headers: {
      'Content-Type': PLAIN_CONTENT_TYPE
    }
  }).catch((_e) => {
    // do nothing; ignore errors
  });
}

registerBidder(spec);
