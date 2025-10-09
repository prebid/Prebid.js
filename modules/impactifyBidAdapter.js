'use strict';

import { getDNT } from '../libraries/navigatorData/dnt.js';
import { deepAccess, deepSetValue, generateUUID, getWinDimensions, isPlainObject } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { ajax } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const BIDDER_CODE = 'impactify';
const BIDDER_ALIAS = ['imp'];
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_VIDEO_WIDTH = 640;
const DEFAULT_VIDEO_HEIGHT = 360;
const ORIGIN = 'https://sonic.impactify.media';
const LOGGER_URI = 'https://logger.impactify.media';
const LOGGER_JS_URI = 'https://log.impactify.it'
const AUCTION_URI = '/bidder';
const COOKIE_SYNC_URI = '/static/cookie_sync.html';
const GVL_ID = 606;
const GET_CONFIG = config.getConfig;
export const STORAGE = getStorageManager({ gvlid: GVL_ID, bidderCode: BIDDER_CODE });
export const STORAGE_KEY = '_im_str'

/**
 * Helpers object
 * @type {Object}
 */
const helpers = {
  getExtParamsFromBid(bid) {
    const ext = {
      impactify: {
        appId: bid.params.appId
      },
    };

    if (typeof bid.params.format === 'string') {
      ext.impactify.format = bid.params.format;
    }

    if (typeof bid.params.style === 'string') {
      ext.impactify.style = bid.params.style;
    }

    if (typeof bid.params.container === 'string') {
      ext.impactify.container = bid.params.container;
    }

    if (typeof bid.params.size === 'string') {
      ext.impactify.size = bid.params.size;
    }

    return ext;
  },

  getDeviceType() {
    // OpenRTB Device type
    if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
      return 5;
    }
    if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
      return 4;
    }
    return 2;
  },

  createOrtbImpBannerObj(bid, size) {
    const sizes = size.split('x');

    return {
      id: 'banner-' + bid.bidId,
      format: [{
        w: parseInt(sizes[0]),
        h: parseInt(sizes[1])
      }]
    }
  },

  createOrtbImpVideoObj(bid) {
    return {
      id: 'video-' + bid.bidId,
      playerSize: [DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT],
      context: 'outstream',
      mimes: ['video/mp4'],
    }
  },

  getFloor(bid) {
    const floorInfo = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: '*',
      size: '*'
    });
    if (isPlainObject(floorInfo) && floorInfo.currency === DEFAULT_CURRENCY && !isNaN(parseFloat(floorInfo.floor))) {
      return parseFloat(floorInfo.floor);
    }
    return null;
  },

  getImStrFromLocalStorage() {
    return STORAGE.localStorageIsEnabled(false) ? STORAGE.getDataFromLocalStorage(STORAGE_KEY, false) : '';
  }

}

/**
 * Create an OpenRTB formated object from prebid payload
 * @param validBidRequests
 * @param bidderRequest
 * @returns {{cur: string[], validBidRequests, id, source: {tid}, imp: *[]}}
 */
function createOpenRtbRequest(validBidRequests, bidderRequest) {
  // Create request and set imp bids inside
  const request = {
    id: bidderRequest.bidderRequestId,
    validBidRequests,
    cur: [DEFAULT_CURRENCY],
    imp: [],
    source: { tid: bidderRequest.ortb2?.source?.tid }
  };

  // Get the url parameters
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const checkPrebid = urlParams.get('_checkPrebid');

  // Force impactify debugging parameter if present
  if (checkPrebid != null) {
    request.test = Number(checkPrebid);
  }

  // Set SChain in request
  const schain = deepAccess(validBidRequests, '0.ortb2.source.ext.schain');
  if (schain) request.source.ext = { schain: schain };

  // Set Eids
  const eids = deepAccess(validBidRequests, '0.userIdAsEids');
  if (eids && eids.length) {
    deepSetValue(request, 'user.ext.eids', eids);
  }

  // Set device/user/site
  if (!request.device) request.device = {};
  if (!request.site) request.site = {};
  request.device = {
    w: getWinDimensions().innerWidth,
    h: getWinDimensions().innerHeight,
    devicetype: helpers.getDeviceType(),
    ua: navigator.userAgent,
    js: 1,
    dnt: getDNT() ? 1 : 0,
    language: ((navigator.language || navigator.userLanguage || '').split('-'))[0] || 'en',
  };
  request.site = { page: bidderRequest.refererInfo.page };

  // Handle privacy settings for GDPR/CCPA/COPPA
  let gdprApplies = 0;
  if (bidderRequest.gdprConsent) {
    if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') gdprApplies = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
  }
  deepSetValue(request, 'regs.ext.gdpr', gdprApplies);

  if (GET_CONFIG('coppa') === true) deepSetValue(request, 'regs.coppa', 1);

  if (bidderRequest.uspConsent) {
    deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  // Set buyer uid
  deepSetValue(request, 'user.buyeruid', generateUUID());

  // Create imps with bids
  validBidRequests.forEach((bid) => {
    const bannerObj = deepAccess(bid.mediaTypes, `banner`);

    const imp = {
      id: bid.bidId,
      bidfloor: bid.params.bidfloor ? bid.params.bidfloor : 0,
      ext: helpers.getExtParamsFromBid(bid)
    };

    if (bannerObj && typeof imp.ext.impactify.size === 'string') {
      imp.banner = {
        ...helpers.createOrtbImpBannerObj(bid, imp.ext.impactify.size)
      }
    } else {
      imp.video = {
        ...helpers.createOrtbImpVideoObj(bid)
      }
    }

    if (typeof bid.getFloor === 'function') {
      const floor = helpers.getFloor(bid);
      if (floor) {
        imp.bidfloor = floor;
      }
    }

    request.imp.push(imp);
  });

  return request;
}

/**
 * Export BidderSpec type object and register it to Prebid
 * @type {{supportedMediaTypes: string[], interpretResponse: ((function(ServerResponse, *): Bid[])|*), code: string, aliases: string[], getUserSyncs: ((function(SyncOptions, ServerResponse[], *, *): UserSync[])|*), buildRequests: (function(*, *): {method: string, data: string, url}), onTimeout: (function(*): boolean), gvlid: number, isBidRequestValid: ((function(BidRequest): (boolean))|*), onBidWon: (function(*): boolean)}}
 */
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: ['video', 'banner'],
  aliases: BIDDER_ALIAS,
  storageAllowed: true,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (typeof bid.params.appId !== 'string' || !bid.params.appId) {
      return false;
    }
    if (typeof bid.params.format !== 'string' || typeof bid.params.style !== 'string' || !bid.params.format || !bid.params.style) {
      return false;
    }
    if (bid.params.format !== 'screen' && bid.params.format !== 'display') {
      return false;
    }
    if (bid.params.style !== 'inline' && bid.params.style !== 'impact' && bid.params.style !== 'static') {
      return false;
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Array} validBidRequests - an array of bids
   * @param {Object} bidderRequest - the bidding request
   * @return {Object} Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    // Create a clean openRTB request
    const request = createOpenRtbRequest(validBidRequests, bidderRequest);
    const imStr = helpers.getImStrFromLocalStorage();
    const options = {}

    if (imStr) {
      options.customHeaders = {
        'x-impact': imStr
      };
    }

    return {
      method: 'POST',
      url: ORIGIN + AUCTION_URI,
      data: JSON.stringify(request),
      options
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    let bidResponses = [];

    if (!serverBody) {
      return bidResponses;
    }

    if (!serverBody.seatbid || !serverBody.seatbid.length) {
      return [];
    }

    serverBody.seatbid.forEach((seatbid) => {
      if (seatbid.bid.length) {
        bidResponses = [
          ...bidResponses,
          ...seatbid.bid
            .filter((bid) => bid.price > 0)
            .map((bid) => ({
              id: bid.id,
              requestId: bid.impid,
              cpm: bid.price,
              currency: serverBody.cur,
              netRevenue: true,
              ad: bid.adm,
              width: bid.w || 0,
              height: bid.h || 0,
              ttl: 300,
              creativeId: bid.crid || 0,
              hash: bid.hash,
              expiry: bid.expiry,
              meta: {
                advertiserDomains: bid.adomain && bid.adomain.length ? bid.adomain : []
              }
            })),
        ];
      }
    });

    return bidResponses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent
  ) {
    if (!serverResponses || serverResponses.length === 0) {
      return [];
    }

    if (!syncOptions.iframeEnabled) {
      return [];
    }

    let params = '';
    if (gdprConsent && typeof gdprConsent.consentString === 'string') {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        params += `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        params += `?gdpr_consent=${gdprConsent.consentString}`;
      }
    }

    if (uspConsent) {
      params += `${params ? '&' : '?'}us_privacy=${encodeURIComponent(uspConsent)}`;
    }

    if (document.location.search.match(/pbs_debug=true/)) params += `&pbs_debug=true`;

    return [{
      type: 'iframe',
      url: ORIGIN + COOKIE_SYNC_URI + params
    }];
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Object} bid The bid that won the auction
   */
  onBidWon: function (bid) {
    ajax(`${LOGGER_URI}/prebid/won`, null, JSON.stringify(bid), {
      method: 'POST',
      contentType: 'application/json'
    });

    return true;
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {Object} data Containing timeout specific data
   */
  onTimeout: function (data) {
    ajax(`${LOGGER_URI}/prebid/timeout`, null, JSON.stringify(data[0]), {
      method: 'POST',
      contentType: 'application/json'
    });

    return true;
  },

  /**
   * Register bidder specific code, which will execute if the bid request failed
   * @param {*} param0
   */
  onBidderError: function ({ error, bidderRequest }) {
    ajax(`${LOGGER_JS_URI}/logger`, null, JSON.stringify({ error, bidderRequest }), {
      method: 'POST',
      contentType: 'application/json'
    });

    return true;
  },
};
registerBidder(spec);
