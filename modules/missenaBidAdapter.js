import {
  buildUrl,
  deepAccess,
  formatQS,
  generateUUID,
  getWinDimensions,
  isEmpty,
  isFn,
  isStr,
  logInfo,
  safeJSONParse,
  triggerPixel,
} from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';
import { isAutoplayEnabled } from '../libraries/autoplayDetection/autoplay.js';
import { normalizeBannerSizes } from '../libraries/sizeUtils/sizeUtils.js';
import { getViewportSize } from '../libraries/viewport/viewport.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 * @typedef {import('../src/adapters/bidderFactory.js').TimedOutBid} TimedOutBid
 */

const BIDDER_CODE = 'missena';
const ENDPOINT_URL = 'https://bid.missena.io/';
const EVENTS_DOMAIN = 'events.missena.io';
const EVENTS_DOMAIN_DEV = 'events.staging.missena.xyz';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
window.msna_ik = window.msna_ik || generateUUID();

/* Get Floor price information */
function getFloor(bidRequest) {
  if (!isFn(bidRequest.getFloor)) {
    return {};
  }

  const bidFloors = bidRequest.getFloor({
    currency: 'USD',
    mediaType: BANNER,
  });

  if (!isNaN(bidFloors?.floor)) {
    return bidFloors;
  }
}

/* Helper function that converts the prebid data to the payload expected by our servers */
function toPayload(bidRequest, bidderRequest) {
  const payload = {
    adunit: bidRequest.adUnitCode,
    ik: window.msna_ik,
    request_id: bidRequest.bidId,
    timeout: bidderRequest.timeout,
  };

  const baseUrl = bidRequest.params.baseUrl || ENDPOINT_URL;
  payload.params = bidRequest.params;

  payload.userEids = bidRequest.userIdAsEids || [];
  payload.version = 'prebid.js@$prebid.version$';

  const bidFloor = getFloor(bidRequest);
  payload.floor = bidFloor?.floor;
  payload.floor_currency = bidFloor?.currency;
  payload.currency = getCurrencyFromBidderRequest(bidderRequest);
  payload.schain = bidRequest?.ortb2?.source?.ext?.schain;
  payload.autoplay = isAutoplayEnabled() === true ? 1 : 0;
  payload.screen = { height: getWinDimensions().screen.height, width: getWinDimensions().screen.width };
  payload.viewport = getViewportSize();
  payload.sizes = normalizeBannerSizes(bidRequest.mediaTypes.banner.sizes);

  const gpid = deepAccess(bidRequest, 'ortb2Imp.ext.gpid');
  payload.ortb2 = {
    ...(bidderRequest.ortb2 || {}),
    ext: {
      ...(bidderRequest.ortb2?.ext || {}),
      ...(isStr(gpid) && !isEmpty(gpid) ? { gpid } : {}),
    },
  };

  return {
    method: 'POST',
    url: baseUrl + '?' + formatQS({ t: bidRequest.params.apiKey }),
    data: JSON.stringify(payload),
  };
}

export const spec = {
  aliases: ['msna'],
  code: BIDDER_CODE,
  gvlid: 687,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return typeof bid === 'object' && !!bid.params.apiKey;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Array<BidRequest>} validBidRequests
   * @param {BidderRequest} bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const capKey = `missena.missena.capper.remove-bubble.${validBidRequests[0]?.params.apiKey}`;
    const capping = safeJSONParse(storage.getDataFromLocalStorage(capKey));
    const referer = bidderRequest?.refererInfo?.topmostLocation;
    if (
      typeof capping?.expiry === 'number' &&
      new Date().getTime() < capping?.expiry &&
      (!capping?.referer || capping?.referer === referer)
    ) {
      logInfo('Missena - Capped');
      return [];
    }

    this.msnaApiKey = validBidRequests[0]?.params.apiKey;

    return validBidRequests.map((bidRequest) =>
      toPayload(bidRequest, bidderRequest),
    );
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;

    if (response && !response.timeout && !!response.ad) {
      bidResponses.push(response);
    }

    return bidResponses;
  },
  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent = {},
    uspConsent,
  ) {
    if (!syncOptions.iframeEnabled || !this.msnaApiKey) {
      return [];
    }

    const url = new URL('https://sync.missena.io/iframe');
    url.searchParams.append('t', this.msnaApiKey);

    if (typeof gdprConsent.gdprApplies === 'boolean') {
      url.searchParams.append('gdpr', Number(gdprConsent.gdprApplies));
      url.searchParams.append('gdpr_consent', gdprConsent.consentString);
    }
    if (uspConsent) {
      url.searchParams.append('us_privacy', uspConsent);
    }

    return [{ type: 'iframe', url: url.href }];
  },
  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {TimedOutBid} timeoutData - Containing timeout specific data
   */
  onTimeout: function onTimeout(timeoutData) {
    logInfo('Missena - Timeout from adapter', timeoutData);
  },

  /**
   * Register bidder specific code, which@ will execute if a bid from this bidder won the auction
   * @param {Bid} bid - The bid that won the auction
   */
  onBidWon: function (bid) {
    const hostname = bid.params[0].baseUrl ? EVENTS_DOMAIN_DEV : EVENTS_DOMAIN;
    triggerPixel(
      buildUrl({
        protocol: 'https',
        hostname,
        pathname: '/v1/bidsuccess',
        search: {
          t: bid.params[0].apiKey,
          provider: bid.meta?.networkName,
          cpm: bid.originalCpm,
          currency: bid.originalCurrency,
        },
      }),
    );
    logInfo('Missena - Bid won', bid);
  },
};

registerBidder(spec);
