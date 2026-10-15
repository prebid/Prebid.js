import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepSetValue, getWinDimensions } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { getAdUnitElement } from '../src/utils/adUnits.js';

const BIDDER_CODE = 'pigeoon';
const BASE_URL = 'https://pbjs.pigeoon.com';
const ENDPOINT_URL = `${BASE_URL}/bid`;
const SYNC_URL = `${BASE_URL}/sync`;

/**
 * Prebid bidId -> Pigeoon placementId.
 * Kept so onTimeout can report the placement that belongs to the timed-out bid,
 * even when an ad unit configures Pigeoon more than once.
 */
const placementByBidId = new Map();
const MAX_TRACKED_BIDS = 500;

/**
 * @typedef {import('./pigeoonBidAdapter.d.ts').PigeoonBidderParams} PigeoonBidderParams
 */

/**
 * @param {string} bidId
 * @param {string} placementId
 */
function rememberPlacement(bidId, placementId) {
  if (!bidId) return;
  if (placementByBidId.size >= MAX_TRACKED_BIDS) {
    placementByBidId.clear();
  }
  placementByBidId.set(bidId, placementId);
}

/**
 * @param {Object<string, string>} params
 * @returns {string}
 */
function buildQuery(params) {
  return Object.keys(params)
    .map(function (key) {
      return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
    })
    .join('&');
}

/**
 * Reads a query parameter without relying on URL/URLSearchParams.
 * @param {string} url
 * @param {string} name
 * @returns {string|null}
 */
function getQueryParam(url, name) {
  if (typeof url !== 'string') return null;
  const qIndex = url.indexOf('?');
  if (qIndex < 0) return null;

  const pairs = url.slice(qIndex + 1).split('#')[0].split('&');
  for (let i = 0; i < pairs.length; i++) {
    const eq = pairs[i].indexOf('=');
    try {
      const key = decodeURIComponent(eq < 0 ? pairs[i] : pairs[i].slice(0, eq));
      if (key === name) {
        return eq < 0 ? '' : decodeURIComponent(pairs[i].slice(eq + 1).replace(/\+/g, ' '));
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Callbacks may receive params as a single object or as an array of every
 * Pigeoon config on the ad unit.
 * @param {object} bid
 * @returns {object[]}
 */
function getParamsList(bid) {
  if (Array.isArray(bid?.params)) return bid.params;
  return bid?.params ? [bid.params] : [];
}

/**
 * Low-priority notification that survives page navigation.
 * @param {string} path
 * @param {Object<string, string>} params
 */
function notify(path, params) {
  ajax(`${BASE_URL}/${path}?${buildQuery(params)}`, null, undefined, {
    method: 'GET',
    keepalive: true
  });
}

/**
 * Placement and line item come from the render URL of this exact bid, so the
 * event is attributed correctly even if the ad unit has several Pigeoon configs.
 * Bids that carry creative markup have no render URL; their markup reports its own events.
 * @param {string} path
 * @param {object} bid
 */
function notifyBidEvent(path, bid) {
  const bidId = getQueryParam(bid?.adUrl, 'bidId');
  const placementId = getQueryParam(bid?.adUrl, 'placementId');
  const lineItemId = getQueryParam(bid?.adUrl, 'lineItemId') || bid?.creativeId;

  const config = getParamsList(bid).find(function (p) {
    return String(p?.placementId) === placementId;
  });

  if (!bidId || !placementId || !lineItemId || !config?.networkId) return;

  notify(path, {
    bidId,
    nid: String(config.networkId),
    pid: placementId,
    li: String(lineItemId)
  });
}

/**
 * Position of the ad slot relative to the viewport at request time, used server-side to skip
 * impressions that are unlikely to be seen: y = distance of the slot's top from the top of the viewport
 * (negative when scrolled past), h = slot height, vh = viewport height.
 * Undefined when the slot element cannot be found or the viewport size is unknown.
 * @param {object} bidRequest
 * @returns {{y: number, h: number, vh: number}|undefined}
 */
function getSlotPosition(bidRequest) {
  try {
    const element = getAdUnitElement(bidRequest);
    if (!element) return undefined;
    const rect = getBoundingClientRect(element);
    const vh = getWinDimensions().innerHeight;
    if (!vh) return undefined;
    return { y: Math.round(rect.top), h: Math.round(rect.height), vh: Math.round(vh) };
  } catch (e) {
    return undefined;
  }
}

/**
 * True when adm holds creative markup rather than a render URL.
 * @param {*} adm
 * @returns {boolean}
 */
function isMarkup(adm) {
  return typeof adm === 'string' && adm.trim().charAt(0) === '<';
}

/**
 * OpenRTB request/response conversion.
 * Device, site/app, user IDs (eids), GPID, interstitial flag, floors, consent and tmax
 * are filled by Prebid from first-party data and enabled modules.
 */
const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 300,
    currency: 'TRY',
    mediaType: BANNER
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = String(bidRequest.params.placementId);
    rememberPlacement(bidRequest.bidId, imp.tagid);
    const position = getSlotPosition(bidRequest);
    if (position) {
      deepSetValue(imp, 'ext.pigeoon.pos', position);
    }
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const networkId = context.bidRequests?.[0]?.params?.networkId;
    if (networkId) {
      // Write to whichever client section Prebid kept (site, app or dooh).
      const section = ['site', 'app', 'dooh'].find(function (s) { return request[s]; }) || 'site';
      deepSetValue(request, `${section}.publisher.id`, String(networkId));
    }
    // Page visibility at request time (visible / hidden / prerender): impressions in a background tab are not seen.
    if (typeof document.visibilityState === 'string') {
      deepSetValue(request, 'ext.pigeoon.vis', document.visibilityState);
    }
    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = BANNER;
    // nurl is not used: impressions are counted server-side only when the creative actually renders.
    const bidResponse = buildBidResponse({ ...bid, nurl: undefined }, context);
    // adm carries either a render URL (opened in an iframe) or the creative markup (rendered as is).
    if (!isMarkup(bid.adm)) {
      bidResponse.adUrl = bid.adm;
      delete bidResponse.ad;
    }
    // Pigeoon returns its line item id in adid; crid is only a fallback.
    bidResponse.creativeId = bid.adid || bid.crid;
    return bidResponse;
  }
});

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
    (request?.data?.imp || []).forEach(function (imp) {
      placementByBidId.delete(imp.id);
    });
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

    const query = gdprConsent?.gdprApplies === true
      ? buildQuery({ gdpr: '1', gdpr_consent: gdprConsent.consentString || '' })
      : '';

    return [{
      type: 'iframe',
      url: query ? `${SYNC_URL}?${query}` : SYNC_URL
    }];
  },

  /**
   * Our bid did not reach the auction in time.
   * Reported per ad unit (bid request); the auction's timeout setting is included so that timeouts caused by
   * very short auction timeouts on the publisher side can be told apart from slow responses.
   * @param {object[]} timeoutData
   */
  onTimeout: function (timeoutData) {
    (timeoutData || []).forEach(function (t) {
      const remembered = placementByBidId.get(t?.bidId);
      placementByBidId.delete(t?.bidId);

      const params = getParamsList(t);
      const pid = remembered || (params.length === 1 ? params[0]?.placementId : null);
      if (!pid) return;

      const query = { pid: String(pid) };
      if (t?.bidId) query.bid = String(t.bidId);
      if (t?.auctionId) query.aid = String(t.auctionId);
      if (typeof t?.timeout === 'number' && t.timeout > 0) query.to = String(Math.round(t.timeout));
      notify('timeout', query);
    });
  },

  /**
   * Our bid also won in the publisher's ad server.
   * Viewability is measured inside the rendered creative, so no onBidViewable handler is needed.
   * @param {object} bid
   */
  onBidWon: function (bid) {
    notifyBidEvent('prebidwon', bid);
  }
};

registerBidder(spec);
