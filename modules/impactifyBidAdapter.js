'use strict';

import { deepAccess, deepSetValue, generateUUID } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import {ajax} from '../src/ajax.js';
import { createEidsArray } from './userId/eids.js';

const BIDDER_CODE = 'impactify';
const BIDDER_ALIAS = ['imp'];
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_VIDEO_WIDTH = 640;
const DEFAULT_VIDEO_HEIGHT = 360;
const ORIGIN = 'http://prebid.local:8000';
const LOGGER_URI = 'https://logger.impactify.media';
const AUCTIONURI = '/bidder';
const COOKIESYNCURI = '/static/cookie_sync.html';
const GVLID = 606;
const GETCONFIG = config.getConfig;

/**
 * Helpers object
 * @type {{getExtParamsFromBid(*): {impactify: {appId}}, createOrtbImpVideoObj(*): {context: string, playerSize: [number,number], id: string, mimes: [string]}, getDeviceType(): (number), createOrtbImpBannerObj(*, *): {format: [], id: string}}}
 */
const helpers = {
  getExtParamsFromBid(bid) {
    let ext = {
      impactify: {
        appId: bid.params.appId
      },
    };

    if (typeof bid.params.format == 'string') {
      ext.impactify.format = bid.params.format;
    }

    if (typeof bid.params.style == 'string') {
      ext.impactify.style = bid.params.style;
    }

    if (typeof bid.params.container == 'string') {
      ext.impactify.container = bid.params.container;
    }

    if (typeof bid.params.size == 'string') {
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
    let format = [];
    format.push(size.split('x'));

    return {
      id: 'banner-' + bid.bidId,
      format
    }
  },
  createOrtbImpVideoObj(bid) {
    return {
      id: 'video-' + bid.bidId,
      playerSize: [DEFAULT_VIDEO_WIDTH, DEFAULT_VIDEO_HEIGHT],
      context: 'outstream',
      mimes: ['video/mp4'],
    }
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
  let request = {
    id: bidderRequest.auctionId,
    validBidRequests,
    cur: [DEFAULT_CURRENCY],
    imp: [],
    source: {tid: bidderRequest.auctionId}
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
  let schain = deepAccess(validBidRequests, '0.schain');
  if (schain) request.source.ext = { schain: schain };

  // Set Eids
  let bidUserId = deepAccess(validBidRequests, '0.userId');
  let eids = createEidsArray(bidUserId);
  if (eids.length) {
    deepSetValue(request, 'user.ext.eids', eids);
  }

  // Set device/user/site
  if (!request.device) request.device = {};
  if (!request.site) request.site = {};
  request.device = {
    w: window.innerWidth,
    h: window.innerHeight,
    devicetype: helpers.getDeviceType(),
    ua: navigator.userAgent,
    js: 1,
    dnt: (navigator.doNotTrack == 'yes' || navigator.doNotTrack == '1' || navigator.msDoNotTrack == '1') ? 1 : 0,
    language: ((navigator.language || navigator.userLanguage || '').split('-'))[0] || 'en',
  };
  request.site = {page: bidderRequest.refererInfo.page};

  // Handle privacy settings for GDPR/CCPA/COPPA
  let gdprApplies = 0;
  if (bidderRequest.gdprConsent) {
    if (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') gdprApplies = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent.consentString);
  }
  deepSetValue(request, 'regs.ext.gdpr', gdprApplies);

  if (bidderRequest.uspConsent) {
    deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
    this.syncStore.uspConsent = bidderRequest.uspConsent;
  }

  if (GETCONFIG('coppa') == true) deepSetValue(request, 'regs.coppa', 1);

  if (bidderRequest.uspConsent) {
    deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
  }

  // Set buyer uid
  deepSetValue(request, 'user.buyeruid', generateUUID());

  // Create imps with bids
  validBidRequests.forEach((bid) => {
    let bannerObj = deepAccess(bid.mediaTypes, `banner`);
    let videoObj = deepAccess(bid.mediaTypes, `video`);

    let imp = {
      id: bid.bidId,
      bidfloor: bid.params.bidfloor ? bid.params.bidfloor : 0,
      ext: helpers.getExtParamsFromBid(bid)
    };

    if (videoObj) {
      imp.video = {
        ...helpers.createOrtbImpVideoObj(bid)
      }
    }
    if (bannerObj && typeof imp.ext.size == 'string') {
      imp.banner = {
        ...helpers.createOrtbImpBannerObj(bid, imp.ext.size)
      }
    }

    // eslint-disable-next-line no-console
    console.log(imp);

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
  gvlid: GVLID,
  supportedMediaTypes: ['video', 'banner'],
  aliases: BIDDER_ALIAS,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    let isBanner = deepAccess(bid.mediaTypes, `banner`);

    if (typeof bid.params.appId != 'string' || !bid.params.appId) {
      return false;
    }
    if (typeof bid.params.format != 'string' || typeof bid.params.style != 'string' || !bid.params.format || !bid.params.style) {
      return false;
    }
    if (typeof bid.params.format != 'string' || bid.params.format !== 'screen' || bid.params.format !== 'display') {
      return false;
    }
    if (typeof bid.params.style != 'string' || bid.params.style !== 'inline' || bid.params.style !== 'impact' || bid.params.style !== 'static') {
      return false;
    }
    if (isBanner && (typeof bid.params.size != 'string' || !bid.params.size.includes('x') || bid.params.size.split('x').length != 2)) {
      return false;
    }

    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @param {bidderRequest} - the bidding request
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    // Create a clean openRTB request
    let request = createOpenRtbRequest(validBidRequests, bidderRequest);

    return {
      method: 'POST',
      url: ORIGIN + AUCTIONURI,
      data: JSON.stringify(request),
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
      url: ORIGIN + COOKIESYNCURI + params
    }];
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
  */
  onBidWon: function(bid) {
    ajax(`${LOGGER_URI}/log/bidder/won`, null, JSON.stringify(bid), {
      method: 'POST',
      contentType: 'application/json'
    });

    return true;
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
  */
  onTimeout: function(data) {
    ajax(`${LOGGER_URI}/log/bidder/timeout`, null, JSON.stringify(data[0]), {
      method: 'POST',
      contentType: 'application/json'
    });

    return true;
  }
};
registerBidder(spec);
