'use strict';
import { deepAccess, deepSetValue, getWinDimensions, isPlainObject, getWindowTop } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { ajax } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import { isViewabilityMeasurable, getViewability } from '../libraries/percentInView/percentInView.js';

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
const AUCTION_URI = '/bidder';
const COOKIE_SYNC_URI = '/static/cookie_sync.html';
const GVL_ID = 606;
const GET_CONFIG = config.getConfig;
export const STORAGE = getStorageManager({ gvlid: GVL_ID, bidderCode: BIDDER_CODE });
export const STORAGE_KEY = '_im_str';
const VIDEO_PARAMS = [
  'minduration',
  'maxduration',
  'api',
  'mimes',
  'placement',
  'plcmt',
  'protocols',
  'playbackmethod',
  'pos',
  'startdelay',
  'skip',
  'skipmin',
  'skipafter',
  'minbitrate',
  'maxbitrate'
];

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
    const render = {};

    if (typeof bid.params.format === 'string') {
      ext.impactify.format = bid.params.format;
    }

    if (typeof bid.params.style === 'string') {
      ext.impactify.style = bid.params.style;
    }

    if (typeof bid.params.size === 'string') {
      ext.impactify.size = bid.params.size;
    }

    const viewability = this.getViewability(bid);
    ext.impactify.viewability = viewability;

    if (isPlainObject(bid.params.render)) {
      if (typeof bid.params.render.top === 'number') {
        render.top = bid.params.render.top;
      }

      if (typeof bid.params.render.bottom === 'number') {
        render.bottom = bid.params.render.bottom;
      }

      if (typeof bid.params.render.align === 'string') {
        render.align = bid.params.render.align;
      }

      if (typeof bid.params.render.container === 'string') {
        render.container = bid.params.render.container;
      }

      if (typeof bid.params.render.expandAd === 'boolean') {
        render.expandAd = bid.params.render.expandAd;
      }

      if (typeof bid.params.render.location === 'string') {
        render.location = bid.params.render.location;
      }

      if (typeof bid.params.render.onAdEventName === 'string') {
        render.onAdEventName = bid.params.render.onAdEventName;
      }

      if (typeof bid.params.render.onNoAdEventName === 'string') {
        render.onNoAdEventName = bid.params.render.onNoAdEventName;
      }

      if (Object.keys(render).length > 0) {
        ext.impactify.render = render;
      }
    }

    return ext;
  },

  pickDefined(obj, keys) {
    return keys.reduce((acc, key) => {
      if (obj[key] !== undefined) {
        acc[key] = obj[key];
      }
      return acc;
    }, {});
  },

  getViewability(bid) {
    try {
      let elementSize;
      if (bid.mediaTypes?.banner?.sizes?.[0]) {
        elementSize = bid.mediaTypes?.banner?.sizes?.[0];
      }
      if (bid.mediaTypes?.video?.playerSize?.[0]) {
        elementSize = bid.mediaTypes?.video?.playerSize?.[0];
      }
      if (!elementSize) { elementSize = [0, 0]; }

      const size = { w: elementSize[0], h: elementSize[1] };
      const element = document.getElementById(bid.adUnitCode);

      if (!element) return;

      const viewabilityAmount = isViewabilityMeasurable(element)
        ? getViewability(element, getWindowTop(), size)
        : 'na';

      return isNaN(viewabilityAmount) ? viewabilityAmount : Math.round(viewabilityAmount);
    } catch (e) {
      return 'na';
    }
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

  createOrtbImpBannerObj(bid, bannerObj) {
    const format = [];
    const sizes = bannerObj?.sizes;

    if (Array.isArray(sizes)) {
      sizes.forEach((size) => {
        if (Array.isArray(size) && size.length >= 2) {
          format.push({ w: size[0], h: size[1] });
        }
      });
    }

    return {
      id: 'banner-' + (bid?.bidId || ''),
      format
    };
  },

  createOrtbImpVideoObj(bid) {
    const video = deepAccess(bid, 'mediaTypes.video');
    if (!video) return;

    const playerSize = video.playerSize || bid.sizes?.[0];
    const resolvedPlayerSize = playerSize && playerSize.length === 2
      ? playerSize
      : [DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT];

    return {
      playerSize: resolvedPlayerSize,
      context: video.context === 'instream' ? 'instream' : 'outstream',
      ...helpers.pickDefined(video, VIDEO_PARAMS)
    };
  },

  getFloor(bid) {
    try {
      const floorInfo = bid.getFloor({
        currency: DEFAULT_CURRENCY,
        mediaType: '*',
        size: '*'
      });
      if (isPlainObject(floorInfo) && floorInfo.currency === DEFAULT_CURRENCY && !isNaN(parseFloat(floorInfo.floor))) {
        return parseFloat(floorInfo.floor);
      }
    } catch (e) {}
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
    id: bidderRequest?.bidderRequestId,
    validBidRequests,
    cur: [DEFAULT_CURRENCY],
    imp: [],
    source: { tid: bidderRequest?.ortb2?.source?.tid },
    ext: {
      impactify: {
        integration: 'pbjs',
        storage: helpers.getImStrFromLocalStorage()
      }
    }
  };

  // Get the url parameters
  const queryString = window?.location?.search;
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
    ua: navigator?.userAgent,
    js: 1,
    dnt: 0,
    language: ((navigator?.language || navigator?.userLanguage || '').split('-'))[0] || 'en',
  };
  const pageUrl = deepAccess(bidderRequest, 'refererInfo.page');
  const accountId = deepAccess(validBidRequests?.[0], 'params.accountId');
  deepSetValue(request, 'site.page', pageUrl);
  deepSetValue(request, 'site.publisher.id', accountId);

  // Handle privacy settings for GDPR/CCPA/COPPA
  let gdprApplies = 0;
  if (bidderRequest?.gdprConsent) {
    if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') gdprApplies = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
  }
  deepSetValue(request, 'regs.ext.gdpr', gdprApplies);

  if (GET_CONFIG('coppa') === true) deepSetValue(request, 'regs.coppa', 1);

  if (bidderRequest?.uspConsent) {
    deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  // Create imps with bids
  validBidRequests.forEach((bid) => {
    const bannerObj = deepAccess(bid.mediaTypes, `banner`);
    const videoObj = deepAccess(bid.mediaTypes, `video`);

    const imp = {
      id: bid.bidId,
      bidfloor: bid.params.bidfloor ? bid.params.bidfloor : 0,
      ext: helpers.getExtParamsFromBid(bid)
    };

    if (bannerObj) {
      imp.banner = {
        ...helpers.createOrtbImpBannerObj(bid, bannerObj)
      }
    } else if (videoObj) {
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
    if (typeof bid.params.style !== 'string' || !bid.params.style) {
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
    const options = {}

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

    let ortbRequest = {};
    try {
      ortbRequest = JSON.parse(bidRequest?.data || '{}');
    } catch (e) { }

    const impMap = {};
    (ortbRequest.imp || []).forEach((imp) => {
      impMap[imp.id] = imp;
    });

    serverBody.seatbid.forEach((seatbid) => {
      if (seatbid?.bid?.length) {
        bidResponses.push(
          ...seatbid.bid
            .filter((bid) => bid.price > 0)
            .map((bid) => {
              const isPlayer = impMap[bid.impid]?.ext?.impactify?.format === 'player';
              return {
                id: bid.id,
                requestId: bid.impid,
                cpm: bid.price,
                currency: serverBody.cur || DEFAULT_CURRENCY,
                netRevenue: true,
                width: bid.w || 0,
                height: bid.h || 0,
                ttl: 300,
                creativeId: bid.crid || 0,
                meta: {
                  advertiserDomains:
                    bid.adomain && bid.adomain.length ? bid.adomain : [],
                },

                ...(isPlayer
                  ? {
                      mediaType: "video",
                      vastUrl: bid.ext?.vast_url,
                      vastXml: bid.adm,
                    }
                  : {
                      ad: bid.adm,
                    }),
              };
            }),
        );
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

    if (document?.location?.search?.match(/pbs_debug=true/)) params += `&pbs_debug=true`;

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
};
registerBidder(spec);
