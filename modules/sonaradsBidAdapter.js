import {deepSetValue, isFn, logWarn} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {tryAppendQueryString} from '../libraries/urlUtils/urlUtils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').TimedOutBid} TimedOutBid
 */

export const ADAPTER_VERSION = 1.0;
export const BIDDER_CODE = 'sonarads';
export const GVLID = 1300;
export const DEFAULT_CUR = 'USD';
// export const SERVER_PATH_US1_BID = 'http://localhost:8000/analyze_request/bids';
// export const SERVER_PATH_US1_EVENTS = 'http://localhost:8000/analyze_request/events';
// export const SERVER_PATH_US1_SYNC = 'http://localhost:8000/analyze_request/sync';
export const SERVER_PATH_US1_BID = 'https://prebidjs-bids-us1.sonar-ads.com/analyze_request/bids';
export const SERVER_PATH_US1_EVENTS = 'https://prebidjs-events-us1.sonar-ads.com/events';
export const SERVER_PATH_US1_SYNC = 'https://prebidjs-sync-us1.sonar-ads.com/sync';

/**
 * Bridgeupp : Report events for analytics and debuging.
 */
function reportEvents(eventType, eventData) {
  if (!eventData || spec?.reportEventsEnabled !== true) {
    return;
  }

  const payload = JSON.stringify({
    domain: location.hostname,
    prebidVersion: '$prebid.version$',
    eventType: eventType,
    eventPayload: eventData
  });

  fetch(`${SERVER_PATH_US1_EVENTS}`, {
    body: payload,
    keepalive: true,
    credentials: 'include',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }).catch((_e) => {
    // ignore errors for now
  });
}

/**
 * Bridgeupp : Defines the core oRTB converter inherited from converter library and all customization functions.
 */
const CONVERTER = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: DEFAULT_CUR
  },
  imp,
  request,
  bidResponse,
  response
});

/**
 * Bridgeupp : Builds an impression object for oRTB requests based on the bid request.
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
    floorInfo = bidRequest.getFloor();
  }

  // if floor price module is not set reading from bidRequest.params or default
  if (!imp.bidfloor) {
    imp.bidfloor = bidRequest.params.bidfloor || 0.001;
    imp.bidfloorcur = DEFAULT_CUR;
  }

  imp.secure = bidRequest.ortb2Imp?.secure ?? 1;
  deepSetValue(imp, 'ext', {
    ...imp.ext,
    params: bidRequest.params,
    bidder: {
      siteId: params?.siteId,
    },
    floorInfo: floorInfo
  });

  return imp;
}

/**
 * Bridgeupp: Constructs the request object.
 *
 * @param {function} buildRequest - Function to build the request.
 * @param {Array} imps - Array of impression objects.
 * @param {Object} bidderRequest - Object containing bidder request information.
 * @param {Object} context - Additional context.
 * @returns {Object} The complete oRTB request object.
 */
function request(buildRequest, imps, bidderRequest, context) {
  const request = buildRequest(imps, bidderRequest, context);
  const siteId = context.bidRequests[0]?.params?.siteId;

  deepSetValue(request, 'auctionStart', bidderRequest.auctionStart);
  deepSetValue(request, 'ext.prebid.channel', {
    name: 'pbjs_bridgeupp',
    pbjsversion: '$prebid.version$',
    adapterversion: ADAPTER_VERSION,
    siteId: siteId
  });

  return request;
}

function bidResponse(buildBidResponse, bid, context) {
  return buildBidResponse(bid, context);
}

/**
 * Bridgeupp bid response
 *
 * @param {function} buildResponse - Function to build the response.
 * @param {Array} bidResponses - List of bid responses.
 * @param {Object} ortbResponse - Original oRTB response data.
 * @param {Object} context - Additional context.
 * @returns {Object} Prebid.js compatible bid response.
 */
function response(buildResponse, bidResponses, ortbResponse, context) {
  return buildResponse(bidResponses, ortbResponse, context);
}

export const spec = {
  reportEventsEnabled: false,
  code: BIDDER_CODE,
  aliases: ['bridgeupp'],
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  /**
   * Bridgeupp : Determines whether the given bid request is valid.
   *
   * @param {Object} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    if (!bid || !bid.params.siteId) {
      logWarn('Bridgeupp - bid is not valid, reach out to support@bridgeupp.com');
      return false;
    }
    return true;
  },

  /**
   * Bridgeupp: Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param {Object} bidderRequest - Additional request details.
   * @return {ServerRequest} Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const data = CONVERTER.toORTB({ bidderRequest: bidderRequest, bidRequests: validBidRequests, });

    if (data) {
      return {
        method: 'POST',
        url: SERVER_PATH_US1_BID,
        data: data,
        options: {
          contentType: 'application/json',
          crossOrigin: true,
          withCredentials: true
        }
      };
    }
  },

  /**
   * Bridgeupp: Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {ServerRequest} bidRequest - Original bid request.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    if (typeof serverResponse?.body === 'undefined') {
      return [];
    }

    // reportEventsEnabled is returned from the server default false
    spec.reportEventsEnabled = serverResponse.headers.get('reportEventsEnabled') > 0

    const interpretedResponse = CONVERTER.fromORTB({ response: serverResponse.body, request: bidRequest.data });
    return interpretedResponse.bids || [];
  },

  /**
   * Bridgeupp : User sync options based on consent, support only iframe for now.
   */
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      logWarn('Bridgeupp - Bidder ConnectAd: No User-Matching allowed');
      return [];
    }

    const pixelType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    let syncUrl = SERVER_PATH_US1_SYNC + '?';

    syncUrl = gdprConsent ? tryAppendQueryString(syncUrl, 'gdpr', gdprConsent.gdprApplies ? 1 : 0) : syncUrl;
    syncUrl = gdprConsent?.consentString ? tryAppendQueryString(syncUrl, 'gdpr_consent', gdprConsent.consentString) : syncUrl;
    syncUrl = uspConsent ? tryAppendQueryString(syncUrl, 'us_privacy', uspConsent) : syncUrl;
    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      syncUrl = tryAppendQueryString(syncUrl, 'gpp', gppConsent.gppString);
      syncUrl = tryAppendQueryString(syncUrl, 'gpp_sid', gppConsent.applicableSections.join(','));
    }

    if ((syncUrl.slice(-1) === '&') || (syncUrl.slice(-1) === '?')) {
      syncUrl = syncUrl.slice(0, -1);
    }

    return [{
      type: pixelType,
      url: syncUrl
    }];
  },

  /**
   * Bridgeupp: Callback to report timeout event.
   *
   * @param {TimedOutBid[]} timeoutData - Array of timeout details.
   */
  onTimeout: (timeoutData) => {
    reportEvents('onTimeout', timeoutData);
  },

  /**
   * Bridgeupp: Callback to report targeting event.
   *
   * @param {Bid} bid - The bid object
   */
  onSetTargeting: (bid) => {
    reportEvents('onSetTargeting', bid);
  },

  /**
   * Bridgeupp: Callback to report successful ad render event.
   *
   * @param {Bid} bid - The bid that successfully rendered.
   */
  onAdRenderSucceeded: (bid) => {
    reportEvents('onAdRenderSucceeded', bid);
  },

  /**
   * Bridgeupp: Callback to report bidder error event.
   *
   * @param {Object} errorData - Details about the error.
   */
  onBidderError: (errorData) => {
    reportEvents('onBidderError', errorData);
  },

  /**
   * Bridgeupp: Callback to report bid won event.
   *
   * @param {Bid} bid - The bid that won the auction.
   */
  onBidWon: (bid) => {
    reportEvents('onBidWon', bid);
  }

};

registerBidder(spec);
