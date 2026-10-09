import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepSetValue, triggerPixel } from '../src/utils.js';

const BIDDER_CODE = 'pigeoon';
const BASE_URL = 'https://pbjs.pigeoon.com';
const ENDPOINT_URL = `${BASE_URL}/bid`;
const SYNC_URL = `${BASE_URL}/sync`;

/**
 * @typedef {object} BidParams
 * @property {string} networkId - Publisher network ID provided by Pigeoon
 * @property {string} placementId - Placement ID provided by Pigeoon
 */

/**
 * OpenRTB request/response conversion.
 * Device, site, user IDs (eids), GPID, interstitial flag, floors, consent and tmax
 * are filled automatically by Prebid from first-party data and enabled modules.
 */
const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: 'TRY'
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = String(bidRequest.params.placementId);
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const networkId = context.bidRequests?.[0]?.params?.networkId;
    if (networkId) {
      deepSetValue(request, 'site.publisher.id', String(networkId));
    }
    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = BANNER;
    // nurl is not used: win is counted by the render page only when the creative actually renders.
    const bidResponse = buildBidResponse({ ...bid, nurl: undefined }, context);
    // adm carries the render URL, not markup.
    bidResponse.adUrl = bid.adm;
    delete bidResponse.ad;
    // Pigeoon returns the line item id in adid; Prebid requires creativeId.
    bidResponse.creativeId = bid.crid || bid.adid;
    return bidResponse;
  }
});

/**
 * @param {object} bid
 * @returns {object|undefined}
 */
function getParams(bid) {
  return Array.isArray(bid?.params) ? bid.params[0] : bid?.params;
}

/**
 * Pigeoon bid id is carried in the render URL.
 * @param {object} bid
 * @returns {string|null}
 */
function getPigeoonBidId(bid) {
  try {
    return new URL(bid.adUrl).searchParams.get('bidId');
  } catch (e) {
    return null;
  }
}

/**
 * @param {string} path
 * @param {object} bid
 */
function fireBidEvent(path, bid) {
  const params = getParams(bid);
  const bidId = getPigeoonBidId(bid);
  if (!params?.networkId || !params?.placementId || !bidId || !bid.creativeId) return;

  const qs = new URLSearchParams({
    bidId,
    nid: String(params.networkId),
    pid: String(params.placementId),
    li: String(bid.creativeId)
  });
  triggerPixel(`${BASE_URL}/${path}?${qs.toString()}`);
}

/**
 * @type {import('../src/adapters/bidderFactory.js').BidderSpec}
 */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * @param {object} bid
   * @returns {boolean}
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.networkId && bid.params.placementId);
  },

  /**
   * @param {object[]} validBidRequests
   * @param {object} bidderRequest
   * @returns {object}
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data,
      options: {
        contentType: 'text/plain'
      }
    };
  },

  /**
   * @param {object} serverResponse
   * @param {object} request
   * @returns {object[]}
   */
  interpretResponse: function (serverResponse, request) {
    if (!serverResponse?.body?.seatbid?.length) return [];
    return converter.fromORTB({ response: serverResponse.body, request: request.data }).bids;
  },

  /**
   * @param {object} syncOptions
   * @param {object[]} serverResponses
   * @param {object} gdprConsent
   * @returns {object[]}
   */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent) {
    if (!syncOptions.iframeEnabled) return [];

    const qs = new URLSearchParams();
    if (gdprConsent?.gdprApplies === true) {
      qs.set('gdpr', '1');
      qs.set('gdpr_consent', gdprConsent.consentString || '');
    }
    const query = qs.toString();

    return [{
      type: 'iframe',
      url: query ? `${SYNC_URL}?${query}` : SYNC_URL
    }];
  },

  /**
   * Our bid did not reach the auction in time.
   * @param {object[]} timeoutData
   */
  onTimeout: function (timeoutData) {
    (timeoutData || []).forEach(function (t) {
      const pid = getParams(t)?.placementId;
      if (pid) {
        triggerPixel(`${BASE_URL}/timeout?pid=${encodeURIComponent(String(pid))}`);
      }
    });
  },

  /**
   * Our bid also won in the publisher's ad server.
   * @param {object} bid
   */
  onBidWon: function (bid) {
    fireBidEvent('prebidwon', bid);
  },

  /**
   * Our impression became viewable (requires the bidViewability module).
   * @param {object} bid
   */
  onBidViewable: function (bid) {
    fireBidEvent('viewable', bid);
  }
};

registerBidder(spec);
