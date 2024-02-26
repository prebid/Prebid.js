import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepSetValue, isPlainObject, logWarn } from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'blockthrough';
const GVLID = 815;
const ENDPOINT_URL = 'https://pbs.btloader.com/openrtb2/auction';
const SYNC_URL = 'https://cdn.btloader.com/user_sync.html';

const CONVERTER = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 60,
  },
  imp,
  request,
  bidResponse,
});

/**
 * Builds an impression object for the ORTB 2.5 request.
 *
 * @param {function} buildImp - The function for building an imp object.
 * @param {Object} bidRequest - The bid request object.
 * @param {Object} context - The context object.
 * @returns {Object} The ORTB 2.5 imp object.
 */
function imp(buildImp, bidRequest, context) {
  const imp = buildImp(bidRequest, context);
  const { params, ortb2Imp } = bidRequest;

  if (params) {
    deepSetValue(imp, 'ext', params);
  }
  if (ortb2Imp?.ext?.gpid) {
    deepSetValue(imp, 'ext.gpid', ortb2Imp.ext.gpid);
  }

  return imp;
}

/**
 * Builds a request object for the ORTB 2.5 request.
 *
 * @param {function} buildRequest - The function for building a request object.
 * @param {Array} imps - An array of ORTB 2.5 impression objects.
 * @param {Object} bidderRequest - The bidder request object.
 * @param {Object} context - The context object.
 * @returns {Object} The ORTB 2.5 request object.
 */
function request(buildRequest, imps, bidderRequest, context) {
  const request = buildRequest(imps, bidderRequest, context);
  deepSetValue(request, 'ext.prebid.channel', {
    name: 'pbjs',
    version: '$prebid.version$',
  });

  if (window.location.href.includes('btServerTest=true')) {
    request.test = 1;
  }

  return request;
}

/**
 * Processes a bid response using the provided build function, bid, and context.
 *
 * @param {Function} buildBidResponse - The function to build the bid response.
 * @param {Object} bid - The bid object to include in the bid response.
 * @param {Object} context - The context object containing additional information.
 * @returns {Object} - The processed bid response.
 */
function bidResponse(buildBidResponse, bid, context) {
  const bidResponse = buildBidResponse(bid, context);
  const { seat } = context.seatbid || {};
  bidResponse.btBidderCode = seat;

  return bidResponse;
}

/**
 * Checks if a bid request is valid.
 *
 * @param {Object} bid - The bid request object.
 * @returns {boolean} True if the bid request is valid, false otherwise.
 */
function isBidRequestValid(bid) {
  if (!isPlainObject(bid.params) || !Object.keys(bid.params).length) {
    logWarn('BT Bid Adapter: bid params must be provided.');
    return false;
  }

  return true;
}

/**
 * Builds the bid requests for the BT Service.
 *
 * @param {Array} validBidRequests - An array of valid bid request objects.
 * @param {Object} bidderRequest - The bidder request object.
 * @returns {Array} An array of BT Service bid requests.
 */
function buildRequests(validBidRequests, bidderRequest) {
  const data = CONVERTER.toORTB({
    bidRequests: validBidRequests,
    bidderRequest,
  });

  return [
    {
      method: 'POST',
      url: ENDPOINT_URL,
      data,
      bids: validBidRequests,
    },
  ];
}

/**
 * Interprets the server response and maps it to bids.
 *
 * @param {Object} serverResponse - The server response object.
 * @param {Object} request - The request object.
 * @returns {Array} An array of bid objects.
 */
function interpretResponse(serverResponse, request) {
  if (!serverResponse || !request) {
    return [];
  }

  return CONVERTER.fromORTB({
    response: serverResponse.body,
    request: request.data,
  }).bids;
}

/**
 * Generates user synchronization data based on provided options and consents.
 *
 * @param {Object} syncOptions - Synchronization options.
 * @param {Object[]} serverResponses - An array of server responses.
 * @param {Object} gdprConsent - GDPR consent information.
 * @param {string} uspConsent - US Privacy consent string.
 * @param {Object} gppConsent - Google Publisher Policies (GPP) consent information.
 * @returns {Object[]} An array of user synchronization objects.
 */
function getUserSyncs(
  syncOptions,
  serverResponses,
  gdprConsent,
  uspConsent,
  gppConsent
) {
  if (!syncOptions.iframeEnabled || !serverResponses?.length) {
    return [];
  }

  const bidderCodes = new Set();
  serverResponses.forEach((serverResponse) => {
    if (serverResponse?.body?.ext?.responsetimemillis) {
      Object.keys(serverResponse.body.ext.responsetimemillis).forEach(
        bidderCodes.add,
        bidderCodes
      );
    }
  });

  if (!bidderCodes.size) {
    return [];
  }

  const syncs = [];
  const syncUrl = new URL(SYNC_URL);
  syncUrl.searchParams.set('bidders', [...bidderCodes].join(','));

  if (gdprConsent) {
    syncUrl.searchParams.set('gdpr', Number(gdprConsent.gdprApplies));
    syncUrl.searchParams.set('gdpr_consent', gdprConsent.consentString);
  }
  if (gppConsent) {
    syncUrl.searchParams.set('gpp', gppConsent.gppString);
    syncUrl.searchParams.set('gpp_sid', gppConsent.applicableSections);
  }
  if (uspConsent) {
    syncUrl.searchParams.set('us_privacy', uspConsent);
  }

  syncs.push({ type: 'iframe', url: syncUrl.href });

  return syncs;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
