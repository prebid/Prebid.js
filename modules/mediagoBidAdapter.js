/**
 * gulp serve --modules=mediagoBidAdapter,pubCommonId --nolint   --notest
 */

import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getPageTitle, getPageDescription, getPageKeywords, getConnectionDownLink, getReferrer } from '../libraries/fpdUtils/pageInfo.js';
import { getDevice } from '../libraries/fpdUtils/deviceInfo.js';
import { getBidFloor } from '../libraries/currencyUtils/floor.js';
import { transformSizes, normalAdSize } from '../libraries/sizeUtils/tranformSize.js';
import { getHLen } from '../libraries/navigatorData/navigatorData.js';
import { cookieSync } from '../libraries/cookieSync/cookieSync.js';

// import { config } from '../src/config.js';
// import { isPubcidEnabled } from './pubCommonId.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').mediaType} mediaType
 */

const BIDDER_CODE = 'mediago';
// const PROTOCOL = window.document.location.protocol;
const ENDPOINT_URL = 'https://gbid.mediago.io/api/bid?tn=';
// const COOKY_SYNC_URL = 'https://gtrace.mediago.io/ju/cs/eplist';
export const THIRD_PARTY_COOKIE_ORIGIN = 'https://cdn.mediago.io';

const TIME_TO_LIVE = 500;
const GVLID = 1020;
// const ENDPOINT_URL = '/api/bid?tn=';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
const globals = {};

/* ----- mguid:start ------ */
export const COOKIE_KEY_MGUID = '__mguid_';
const COOKIE_KEY_PMGUID = '__pmguid_';
const COOKIE_RETENTION_TIME = 365 * 24 * 60 * 60 * 1000; // 1 year
const COOKY_SYNC_IFRAME_URL = 'https://cdn.mediago.io/js/cookieSync.html';
let reqTimes = 0;

/**
 * get pmg uid
 * 获取并生成用户的id
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
 * 获取一个对象的某个值，如果没有则返回空字符串
 *
 * @param  {Object}    obj  对象
 * @param  {...string} keys 键名
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
 * 获取底价
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

// 支持的广告尺寸
const mediagoAdSize = normalAdSize;

/**
 * 获取广告位配置
 * @param {Array}  validBidRequests an an array of bids
 * @param {Object} bidderRequest  The master bidRequest object
 * @return {Object}
 */
function getItems(validBidRequests, bidderRequest) {
  let items = [];
  items = validBidRequests.map((req, i) => {
    let ret = {};
    const mediaTypes = getProperty(req, 'mediaTypes');

    const sizes = transformSizes(getProperty(req, 'sizes'));
    let matchSize;

    // 确认尺寸是否符合我们要求
    for (const size of sizes) {
      matchSize = mediagoAdSize.find(item => size.width === item.w && size.height === item.h);
      if (matchSize) {
        break;
      }
    }
    if (!matchSize) {
      matchSize = sizes[0] ? { h: sizes[0].height || 0, w: sizes[0].width || 0 } : { h: 0, w: 0 };
    }

    const bidFloor = getBidFloor(req);
    const gpid =
      utils.deepAccess(req, 'ortb2Imp.ext.gpid') ||
      utils.deepAccess(req, 'params.placementId', '');

    const gdprConsent = {};
    if (bidderRequest && bidderRequest.gdprConsent) {
      gdprConsent.consent = bidderRequest.gdprConsent.consentString;
      gdprConsent.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      // if (bidderRequest.gdprConsent.addtlConsent && bidderRequest.gdprConsent.addtlConsent.indexOf('~') !== -1) {
      //   let ac = bidderRequest.gdprConsent.addtlConsent;
      //   // pull only the ids from the string (after the ~) and convert them to an array of ints
      //   let acStr = ac.substring(ac.indexOf('~') + 1);
      //   gdpr_consent.addtl_consent = acStr.split('.').map(id => parseInt(id, 10));
      // }
    }

    // if (mediaTypes.native) {}
    // banner广告类型
    if (mediaTypes.banner) {
      // fix id is not unique where there are multiple requests in the same page
      const id = getProperty(req, 'bidId') || ('' + (i + 1) + Math.random().toString(36).substring(2, 15));
      ret = {
        id: id,
        bidfloor: bidFloor,
        banner: {
          h: matchSize.h,
          w: matchSize.w,
          pos: 1,
          format: sizes
        },
        ext: {
          adUnitCode: req.adUnitCode,
          referrer: getReferrer(req, bidderRequest),
          ortb2Imp: utils.deepAccess(req, 'ortb2Imp'), // 传入完整对象，分析日志数据
          gpid: gpid, // 加入后无法返回广告
          adslot: utils.deepAccess(req, 'ortb2Imp.ext.data.adserver.adslot', '', ''),
          publisher: req.params.publisher || '',
          ...gdprConsent // gdpr
        },
        tagid: req.params && req.params.tagid
      };
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
 * 获取rtb请求参数
 *
 * @param {Array}  validBidRequests an an array of bids
 * @param {Object} bidderRequest  The master bidRequest object
 * @return {Object}
 */
function getParam(validBidRequests, bidderRequest) {
  const pubcid = utils.deepAccess(validBidRequests[0], 'crumbs.pubcid');

  const bidsUserIdAsEids = validBidRequests[0].userIdAsEids;
  const eids = bidsUserIdAsEids;
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
    const c = {
      id: 'mgprebidjs_' + bidderRequestId,
      test: +isTest,
      at: 1,
      cur: ['USD'],
      device: {
        connectiontype: 0,
        // ip: '98.61.5.0',
        js: 1,
        // language: 'en',
        // os: 'Microsoft Windows',
        // ua: 'Mozilla/5.0 (Linux; Android 12; SM-G970U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Mobile Safari/537.36',
        os: navigator.platform || '',
        ua: navigator.userAgent,
        language: /en/.test(navigator.language) ? 'en' : navigator.language
      },
      ext: {
        eids,
        bidsUserIdAsEids,
        firstPartyData,
        content,
        cat,
        reqTimes,
        pmguid: getPmgUID(),
        page: {
          title: title ? title.slice(0, 100) : undefined,
          desc: desc ? desc.slice(0, 300) : undefined,
          keywords: keywords ? keywords.slice(0, 100) : undefined,
          hLen: getHLen(),
        },
        device: {
          nbw: getConnectionDownLink(),
        }
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
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    // console.log('mediago', {
    //   bid
    // });
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

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL + globals['token'],
      data: payloadString,
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

    const bidResponses = [];
    for (const bid of bids) {
      const impid = getProperty(bid, 'impid');
      if (impid) {
        const bidResponse = {
          requestId: getProperty(bid, 'impid'),
          cpm: getProperty(bid, 'price'),
          width: getProperty(bid, 'w'),
          height: getProperty(bid, 'h'),
          creativeId: getProperty(bid, 'crid'),
          dealId: '',
          currency: cur,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
          // referrer: REFERER,
          ad: getProperty(bid, 'adm'),
          nurl: getProperty(bid, 'nurl')
          //   adserverTargeting: {
          //     granularityMultiplier: 0.1,
          //     priceGranularity: 'pbHg',
          //     pbMg: '0.01',
          //   },
          //   pbMg: '0.01',
          //   granularityMultiplier: 0.1,
          //   priceGranularity: 'pbHg',
        };
        bidResponses.push(bidResponse);
      }
    }

    return bidResponses;
  },

  getUserSyncs: function (syncOptions, serverResponse, gdprConsent, uspConsent, gppConsent) {
    return cookieSync(syncOptions, gdprConsent, uspConsent, BIDDER_CODE, THIRD_PARTY_COOKIE_ORIGIN, COOKY_SYNC_IFRAME_URL, getCurrentTimeToUTCString());
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {Object} data Containing timeout specific data
   */
  //   onTimeout: function (data) {
  //     // console.log('onTimeout', data);
  //     // Bidder specific code
  //   },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Object} bid The bid that won the auction
   */
  onBidWon: function (bid) {
    // console.log('onBidWon： ', bid, config.getConfig('priceGranularity'));
    // Bidder specific code
    if (bid['nurl']) {
      utils.triggerPixel(bid['nurl']);
    }
  }

  /**
   * Register bidder specific code, which will execute when the adserver targeting has been set for a bid from this bidder
   * @param {Bid} The bid of which the targeting has been set
   */
  //   onSetTargeting: function (bid) {
  //     // console.log('onSetTargeting', bid);
  //     // Bidder specific code
  //   },
};
registerBidder(spec);
