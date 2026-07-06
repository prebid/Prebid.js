/**
 * gulp serve --modules=mediagoBidAdapter,pubCommonId --nolint   --notest
 */

import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { getPageTitle, getPageDescription, getPageKeywords, getConnectionDownLink, getReferrer } from '../libraries/fpdUtils/pageInfo.js';
import { getDevice } from '../libraries/fpdUtils/deviceInfo.js';
import { getBidFloor } from '../libraries/currencyUtils/floor.js';
import { transformSizesOrtb, normalAdSize } from '../libraries/sizeUtils/tranformSize.js';
import { getHLen } from '../libraries/navigatorData/navigatorData.js';
import { getOsInfo } from '../libraries/nexverseUtils/index.js';
import { cookieSync } from '../libraries/cookieSync/cookieSync.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').mediaType} mediaType
 */

const BIDDER_CODE = 'mediago';
const TIME_TO_LIVE = 500;
const GVLID = 1020;

const BIDDER_ENDPOINTS = {
  mediago: {
    bidUrl: 'https://gbid.mediago.io/api/bid?tn=',
    cookieOrigin: 'https://cdn.mediago.io',
    cookieSyncUrl: 'https://cdn.mediago.io/js/cookieSync.html',
  },
  mgtechnology: {
    bidUrl: 'https://gbid.mediagotechnology.com/api/bid?tn=',
    cookieOrigin: 'https://static.mediagotechnology.com',
    cookieSyncUrl: 'https://static.mediagotechnology.com/js/mediagotechnology/cookieSync.html',
  },
};

function getEndpointConfig(bidderCode) {
  return BIDDER_ENDPOINTS[bidderCode] || BIDDER_ENDPOINTS[BIDDER_CODE];
}

export const THIRD_PARTY_COOKIE_ORIGIN = BIDDER_ENDPOINTS[BIDDER_CODE].cookieOrigin;

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
const globals = {};

/**
 * Extract uid from eids array by source
 *
 * @param  {Array}  eids   userIdAsEids array
 * @param  {string} source eid source domain
 * @return {string|undefined}
 */
function getEidUid(eids, source) {
  if (!Array.isArray(eids)) return;
  const eid = eids.find(e => e && e.source === source);
  return eid && eid.uids && eid.uids[0] && eid.uids[0].id;
}

export const COOKIE_KEY_MGUID = '__mguid_';
const COOKIE_KEY_PMGUID = '__pmguid_';
const COOKIE_RETENTION_TIME = 365 * 24 * 60 * 60 * 1000; // 1 year
let reqTimes = 0;

/**
 * Get or generate pmg uid
 *
 * @return {string}
 */
export const getPmgUID = () => {
  if (!storage.cookiesAreEnabled()) return;

  let pmgUid = storage.getCookie(COOKIE_KEY_PMGUID);
  if (!pmgUid) {
    pmgUid = utils.generateUUID();
    try {
      storage.setCookie(COOKIE_KEY_PMGUID, pmgUid, getCurrentTimeToUTCString());
    } catch (e) {}
  }
  return pmgUid;
};

/* ----- pmguid:end ------ */

/**
 * Get a nested property value from object, return empty string if not found
 *
 * @param  {Object}    obj  object
 * @param  {...string} keys key path
 * @return {any}
 */
function getProperty(obj, ...keys) {
  let o = obj;

  for (const key of keys) {
    // console.log(key, o);
    if (o && o[key]) {
      o = o[key];
    } else {
      return '';
    }
  }
  return o;
}

/**
 * Retrieve device platform/OS, priority order: userAgentData.platform > navigator.platform > UA parsing
 * @returns {string}
 */
function getDeviceOs() {
  if (navigator.userAgentData?.platform) {
    return navigator.userAgentData.platform;
  }
  if (navigator.platform) {
    return navigator.platform;
  }
  return getOsInfo().os || '';
}

/**
 * Get bid floor
 * @param {*} bid
 * @param {*} mediaType
 * @param {*} sizes
 * @returns
 */
// function getBidFloor(bid, mediaType, sizes) {
//   var floor;
//   var size = sizes.length === 1 ? sizes[0] : '*';
//   if (typeof bid.getFloor === 'function') {
//     const floorInfo = bid.getFloor({ currency: 'USD', mediaType, size });
//     if (
//       typeof floorInfo === 'object' &&
//       floorInfo.currency === 'USD' &&
//       !isNaN(parseFloat(floorInfo.floor))
//     ) {
//       floor = parseFloat(floorInfo.floor);
//     }
//   }
//   return floor;
// }

// Supported ad sizes
const mediagoAdSize = normalAdSize;

/**
 * Get ad slot config
 * @param {Array}  validBidRequests an an array of bids
 * @param {Object} bidderRequest  The master bidRequest object
 * @return {Object}
 */
function getItems(validBidRequests, bidderRequest) {
  let items;
  items = validBidRequests.map((req, i) => {
    let ret = {};
    const mediaTypes = getProperty(req, 'mediaTypes');

    const bidFloor = getBidFloor(req);
    const gpid =
      utils.deepAccess(req, 'ortb2Imp.ext.gpid') ||
      utils.deepAccess(req, 'params.placementId', '');

    const gdprConsent = {};
    if (bidderRequest && bidderRequest.gdprConsent) {
      gdprConsent.consent = bidderRequest.gdprConsent.consentString;
      gdprConsent.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }

    const id = getProperty(req, 'bidId') || ('' + (i + 1) + Math.random().toString(36).substring(2, 15));
    const ext = {
      adUnitCode: req.adUnitCode,
      referrer: getReferrer(req, bidderRequest),
      ortb2Imp: utils.deepAccess(req, 'ortb2Imp'),
      gpid: gpid + '',
      adslot: utils.deepAccess(req, 'ortb2Imp.ext.data.adserver.adslot', '', ''),
      publisher: req.params.publisher || '',
      transactionId: utils.deepAccess(req, 'ortb2Imp.ext.tid') || req.transactionId || '',
      ...gdprConsent
    };

    if (mediaTypes.banner) {
      let sizes = transformSizesOrtb(getProperty(req, 'sizes'));
      let matchSize;

      for (let size of sizes) {
        matchSize = mediagoAdSize.find(item => size.w === item.w && size.h === item.h);
        if (matchSize) {
          break;
        }
      }
      if (!matchSize) {
        matchSize = sizes[0] ? { h: sizes[0].h || 0, w: sizes[0].w || 0 } : { h: 0, w: 0 };
      }

      ret = {
        id: id,
        bidfloor: bidFloor,
        banner: {
          h: matchSize.h,
          w: matchSize.w,
          pos: 1,
          format: sizes
        },
        ext: ext,
        tagid: req.params && req.params.tagid
      };
    } else if (mediaTypes.native) {
      const nativeOrtbRequest = req.nativeOrtbRequest;
      if (nativeOrtbRequest) {
        ret = {
          id: id,
          bidfloor: bidFloor,
          native: {
            request: JSON.stringify(nativeOrtbRequest),
            ver: '1.2'
          },
          ext: ext,
          tagid: req.params && req.params.tagid
        };
      }
    }

    return ret;
  });
  return items;
}

/**
 * get current time to UTC string
 * @returns utc string
 */
export function getCurrentTimeToUTCString() {
  const date = new Date();
  date.setTime(date.getTime() + COOKIE_RETENTION_TIME);
  return date.toUTCString();
}

/**
 * Get RTB request params
 *
 * @param {Array}  validBidRequests an an array of bids
 * @param {Object} bidderRequest  The master bidRequest object
 * @return {Object}
 */
function getParam(validBidRequests, bidderRequest) {
  const bidsUserIdAsEids = validBidRequests[0].userIdAsEids;
  const eids = bidsUserIdAsEids;

  const pubcid = utils.deepAccess(validBidRequests[0], 'crumbs.pubcid') ||
    getEidUid(eids, 'pubcid.org') ||
    getEidUid(eids, 'sharedid.org');
  const content = utils.deepAccess(bidderRequest, 'ortb2.site.content');
  const cat = utils.deepAccess(bidderRequest, 'ortb2.site.cat');
  reqTimes += 1;

  const isMobile = getDevice() ? 1 : 0;
  // input test status by Publisher. more frequently for test true req
  const isTest = validBidRequests[0].params.test || 0;
  const bidderRequestId = getProperty(bidderRequest, 'bidderRequestId');
  const items = getItems(validBidRequests, bidderRequest);

  const domain = utils.deepAccess(bidderRequest, 'refererInfo.domain') || document.domain;
  const location = utils.deepAccess(bidderRequest, 'refererInfo.location');
  const page = utils.deepAccess(bidderRequest, 'refererInfo.page');
  const referer = utils.deepAccess(bidderRequest, 'refererInfo.ref');

  const timeout = bidderRequest.timeout || 2000;
  const firstPartyData = bidderRequest.ortb2;
  const title = getPageTitle();
  const desc = getPageDescription();
  const keywords = getPageKeywords();

  if (items && items.length) {
    const pmguid = getPmgUID();
    const c = {
      id: 'mgprebidjs_' + bidderRequestId,
      test: +isTest,
      at: 1,
      cur: ['USD'],
      device: {
        connectiontype: 0,
        js: 1,
        os: getDeviceOs(),
        ua: navigator.userAgent,
        language: /en/.test(navigator.language) ? 'en' : navigator.language
      },
      ext: {
        pbjsversion: '$prebid.version$',
        eids,
        bidsUserIdAsEids,
        firstPartyData,
        content,
        cat,
        reqTimes,
        pmguid: pmguid,
        page: {
          title: title ? title.slice(0, 100) : undefined,
          desc: desc ? desc.slice(0, 300) : undefined,
          keywords: keywords ? keywords.slice(0, 100) : undefined,
          hLen: getHLen(),
        },
        device: {
          nbw: getConnectionDownLink(),
        },
      },
      user: {
        buyeruid: storage.getCookie(COOKIE_KEY_MGUID) || undefined,
        id: pubcid,
      },
      eids,
      site: {
        name: domain,
        domain: domain,
        page: page || location,
        ref: referer,
        mobile: isMobile,
        cat: [], // todo
        publisher: {
          id: globals['publisher']
        }
      },
      imp: items,
      tmax: timeout
    };
    return c;
  } else {
    return null;
  }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [{ code: 'mgtechnology', gvlid: 1575, skipPbsAliasing: true }],
  supportedMediaTypes: [BANNER, NATIVE],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    if (bid.params.token) {
      globals['token'] = bid.params.token;
    }
    if (bid.params.publisher) {
      globals['publisher'] = bid.params.publisher;
    }
    return !!bid.params.token;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Array}  validBidRequests an an array of bids
   * @param {Object} bidderRequest  The master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const payload = getParam(validBidRequests, bidderRequest);

    const mediaTypeMap = {};
    validBidRequests.forEach((req) => {
      const bidId = getProperty(req, 'bidId');
      if (req.mediaTypes && req.mediaTypes.banner) {
        mediaTypeMap[bidId] = BANNER;
      } else if (req.mediaTypes && req.mediaTypes.native) {
        mediaTypeMap[bidId] = NATIVE;
      } else {
        mediaTypeMap[bidId] = BANNER;
      }
    });

    const endpointConfig = getEndpointConfig(bidderRequest.bidderCode);
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: endpointConfig.bidUrl + globals['token'],
      data: payloadString,
      _mediaTypeMap: mediaTypeMap,
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bids = getProperty(serverResponse, 'body', 'seatbid', 0, 'bid');
    const cur = getProperty(serverResponse, 'body', 'cur');
    const mediaTypeMap = (bidRequest && bidRequest._mediaTypeMap) || {};

    const bidResponses = [];
    for (const bid of bids) {
      const impid = getProperty(bid, 'impid');
      if (impid) {
        const mediaType = mediaTypeMap[impid] || BANNER;
        const bidResponse = {
          requestId: impid,
          cpm: getProperty(bid, 'price'),
          creativeId: getProperty(bid, 'crid'),
          dealId: '',
          currency: cur,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
          nurl: getProperty(bid, 'nurl'),
          meta: {
            advertiserDomains: getProperty(bid, 'adomain') || []
          }
        };

        if (mediaType === NATIVE) {
          bidResponse.mediaType = NATIVE;
          try {
            const admObj = JSON.parse(bid.adm);
            const nativeObj = admObj.native || admObj;
            bidResponse.native = { ortb: nativeObj };
          } catch (e) {
            continue;
          }
          bidResponse.width = 1;
          bidResponse.height = 1;
        } else {
          bidResponse.mediaType = BANNER;
          bidResponse.ad = getProperty(bid, 'adm');
          bidResponse.width = getProperty(bid, 'w');
          bidResponse.height = getProperty(bid, 'h');
        }

        bidResponses.push(bidResponse);
      }
    }

    return bidResponses;
  },

  getUserSyncs: function (syncOptions, serverResponse, gdprConsent, uspConsent, gppConsent) {
    const bidderCode = this.code || BIDDER_CODE;
    const endpointConfig = getEndpointConfig(bidderCode);
    return cookieSync(syncOptions, gdprConsent, uspConsent, bidderCode, endpointConfig.cookieOrigin, endpointConfig.cookieSyncUrl, getCurrentTimeToUTCString());
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Object} bid The bid that won the auction
   */
  onBidWon: function (bid) {
    if (bid['nurl']) {
      utils.triggerPixel(bid['nurl']);
    }
  }
};
registerBidder(spec);
