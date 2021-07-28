import * as utils from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {config} from '../src/config.js';

const BIDDER_CODE = 'zeta_global_ssp';
const ENDPOINT_URL = 'https://ssp.disqus.com/bid';
const USER_SYNC_URL_IFRAME = 'https://ssp.disqus.com/sync?type=iframe';
const USER_SYNC_URL_IMAGE = 'https://ssp.disqus.com/sync?type=image';
const DEFAULT_CUR = 'USD';
const TTL = 200;
const NET_REV = true;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    // check for all required bid fields
    if (!(bid &&
      bid.bidId &&
      bid.params)) {
      utils.logWarn('Invalid bid request - missing required bid data');
      return false;
    }
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Bids[]} validBidRequests - an array of bidRequest objects
   * @param {BidderRequest} bidderRequest - master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const secure = 1; // treat all requests as secure
    const request = validBidRequests[0];
    const params = request.params;
    const impData = {
      id: request.bidId,
      secure: secure,
      banner: buildBanner(request)
    };
    const fpd = config.getLegacyFpd(config.getConfig('ortb2')) || {};
    let payload = {
      id: bidderRequest.auctionId,
      cur: [DEFAULT_CUR],
      imp: [impData],
      site: params.site ? params.site : {},
      device: {...fpd.device, ...params.device},
      user: params.user ? params.user : {},
      app: params.app ? params.app : {},
      ext: {
        tags: params.tags ? params.tags : {},
        sid: params.sid ? params.sid : undefined
      }
    };
    const rInfo = bidderRequest.refererInfo;
    payload.site.page = config.getConfig('pageUrl') || ((rInfo && rInfo.referer) ? rInfo.referer.trim() : window.location.href);
    payload.site.domain = config.getConfig('publisherDomain') || getDomainFromURL(payload.site.page);

    payload.device.ua = navigator.userAgent;
    payload.device.devicetype = isMobile() ? 1 : isConnectedTV() ? 3 : 2;
    payload.site.mobile = payload.device.devicetype === 1 ? 1 : 0;

    if (params.test) {
      payload.test = params.test;
    }
    if (request.gdprConsent) {
      payload.regs = {
        ext: {
          gdpr: request.gdprConsent.gdprApplies === true ? 1 : 0
        }
      };
      if (request.gdprConsent.gdprApplies && request.gdprConsent.consentString) {
        payload.user.ext = {
          ...payload.user.ext,
          consent: request.gdprConsent.consentString
        }
      }
    }
    provideEids(request, payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(payload),
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidRequest The payload from the server's response.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    let bidResponses = [];
    const response = (serverResponse || {}).body;
    if (response && response.seatbid && response.seatbid[0].bid && response.seatbid[0].bid.length) {
      response.seatbid.forEach(zetaSeatbid => {
        zetaSeatbid.bid.forEach(zetaBid => {
          let bid = {
            requestId: zetaBid.impid,
            cpm: zetaBid.price,
            currency: response.cur,
            width: zetaBid.w,
            height: zetaBid.h,
            ad: zetaBid.adm,
            ttl: TTL,
            creativeId: zetaBid.crid,
            netRevenue: NET_REV,
          };
          if (zetaBid.adomain && zetaBid.adomain.length) {
            bid.meta = {
              advertiserDomains: zetaBid.adomain
            };
          }
          bidResponses.push(bid);
        })
      })
    }
    return bidResponses;
  },

  /**
   * Register User Sync.
   */
  getUserSyncs: (syncOptions, responses, gdprConsent, uspConsent) => {
    let syncurl = '';

    // Attaching GDPR Consent Params in UserSync url
    if (gdprConsent) {
      syncurl += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0);
      syncurl += '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '');
    }

    // CCPA
    if (uspConsent) {
      syncurl += '&us_privacy=' + encodeURIComponent(uspConsent);
    }

    // coppa compliance
    if (config.getConfig('coppa') === true) {
      syncurl += '&coppa=1';
    }

    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: USER_SYNC_URL_IFRAME + syncurl
      }];
    } else {
      return [{
        type: 'image',
        url: USER_SYNC_URL_IMAGE + syncurl
      }];
    }
  }
}

function buildBanner(request) {
  let sizes = request.sizes;
  if (request.mediaTypes &&
    request.mediaTypes.banner &&
    request.mediaTypes.banner.sizes) {
    sizes = request.mediaTypes.banner.sizes;
  }
  return {
    w: sizes[0][0],
    h: sizes[0][1]
  };
}

function provideEids(request, payload) {
  if (Array.isArray(request.userIdAsEids) && request.userIdAsEids.length > 0) {
    utils.deepSetValue(payload, 'user.ext.eids', request.userIdAsEids);
  }
}

function getDomainFromURL(url) {
  let anchor = document.createElement('a');
  anchor.href = url;
  let hostname = anchor.hostname;
  if (hostname.indexOf('www.') === 0) {
    return hostname.substring(4);
  }
  return hostname;
}

function isMobile() {
  return /(ios|ipod|ipad|iphone|android)/i.test(navigator.userAgent);
}

function isConnectedTV() {
  return /(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i.test(navigator.userAgent);
}

registerBidder(spec);
