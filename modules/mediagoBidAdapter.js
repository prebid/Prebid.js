/**
 * gulp serve --modules=mediagoBidAdapter,pubCommonId --nolint   --notest
 */

import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
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
const COOKY_SYNC_IFRAME_URL = 'https://cdn.mediago.io/js/cookieSync.html';
export const THIRD_PARTY_COOKIE_ORIGIN = 'https://cdn.mediago.io';

const TIME_TO_LIVE = 500;
const GVLID = 1020;
// const ENDPOINT_URL = '/api/bid?tn=';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
let globals = {};
let itemMaps = {};

/* ----- mguid:start ------ */
export const COOKIE_KEY_MGUID = '__mguid_';
const COOKIE_KEY_PMGUID = '__pmguid_';
const COOKIE_RETENTION_TIME = 365 * 24 * 60 * 60 * 1000; // 1 year
let reqTimes = 0;
/**
 * get page title
 * @returns {string}
 */

export function getPageTitle(win = window) {
  try {
    const ogTitle = win.top.document.querySelector('meta[property="og:title"]')
    return win.top.document.title || (ogTitle && ogTitle.content) || '';
  } catch (e) {
    const ogTitle = document.querySelector('meta[property="og:title"]')
    return document.title || (ogTitle && ogTitle.content) || '';
  }
}

/**
 * get page description
 *
 * @returns {string}
 */
export function getPageDescription(win = window) {
  let element;

  try {
    element = win.top.document.querySelector('meta[name="description"]') ||
        win.top.document.querySelector('meta[property="og:description"]')
  } catch (e) {
    element = document.querySelector('meta[name="description"]') ||
        document.querySelector('meta[property="og:description"]')
  }

  return (element && element.content) || '';
}

/**
 * get page keywords
 * @returns {string}
 */
export function getPageKeywords(win = window) {
  let element;

  try {
    element = win.top.document.querySelector('meta[name="keywords"]');
  } catch (e) {
    element = document.querySelector('meta[name="keywords"]');
  }

  return (element && element.content) || '';
}

/**
 * get connection downlink
 * @returns {number}
 */
export function getConnectionDownLink(win = window) {
  const nav = win.navigator || {};
  return nav && nav.connection && nav.connection.downlink >= 0 ? nav.connection.downlink.toString() : undefined;
}

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

  for (let key of keys) {
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
 * 是不是移动设备或者平板
 * @return {boolean}
 */
function isMobileAndTablet() {
  let check = false;
  (function (a) {
    let reg1 = new RegExp(
      [
        '(android|bbd+|meego)',
        '.+mobile|avantgo|bada/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)',
        '|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone',
        '|p(ixi|re)/|plucker|pocket|psp|series(4|6)0|symbian|treo|up.(browser|link)|vodafone|wap',
        '|windows ce|xda|xiino|android|ipad|playbook|silk'
      ].join(''),
      'i'
    );
    let reg2 = new RegExp(
      [
        '1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)',
        '|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|-m|r |s )',
        '|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw-(n|u)|c55/|capi|ccwa|cdm-|cell',
        '|chtm|cldc|cmd-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc-s|devi|dica|dmob|do(c|p)o|ds(12|-d)',
        '|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(-|_)|g1 u|g560|gene',
        '|gf-5|g-mo|go(.w|od)|gr(ad|un)|haie|hcit|hd-(m|p|t)|hei-|hi(pt|ta)|hp( i|ip)|hs-c',
        '|ht(c(-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i-(20|go|ma)|i230|iac( |-|/)|ibro|idea|ig01|ikom',
        '|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |/)|klon|kpt |kwc-|kyo(c|k)',
        '|le(no|xi)|lg( g|/(k|l|u)|50|54|-[a-w])|libw|lynx|m1-w|m3ga|m50/|ma(te|ui|xo)|mc(01|21|ca)',
        '|m-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]',
        '|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)',
        '|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|-([1-8]|c))|phil|pire|pl(ay|uc)|pn-2|po(ck|rt|se)|prox|psio',
        '|pt-g|qa-a|qc(07|12|21|32|60|-[2-7]|i-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55/|sa(ge|ma|mm|ms',
        '|ny|va)|sc(01|h-|oo|p-)|sdk/|se(c(-|0|1)|47|mc|nd|ri)|sgh-|shar|sie(-|m)|sk-0|sl(45|id)|sm(al',
        '|ar|b3|it|t5)|so(ft|ny)|sp(01|h-|v-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl-|tdg-|tel(i|m)',
        '|tim-|t-mo|to(pl|sh)|ts(70|m-|m3|m5)|tx-9|up(.b|g1|si)|utst|',
        'v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|-v)',
        '|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas-',
        '|your|zeto|zte-'
      ].join(''),
      'i'
    );
    if (reg1.test(a) || reg2.test(a.substr(0, 4))) {
      check = true;
    }
  })(navigator.userAgent || navigator.vendor || window.opera);
  return check;
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
function getBidFloor(bid) {
  if (!utils.isFn(bid.getFloor)) {
    return utils.deepAccess(bid, 'params.bidfloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: 'USD',
      mediaType: '*',
      size: '*'
    });
    return bidFloor.floor;
  } catch (_) {
    return 0;
  }
}

/**
 * 将尺寸转为RTB识别的尺寸
 *
 * @param  {Array|Object} requestSizes 配置尺寸
 * @return {Object}
 */
function transformSizes(requestSizes) {
  let sizes = [];
  let sizeObj = {};

  if (utils.isArray(requestSizes) && requestSizes.length === 2 && !utils.isArray(requestSizes[0])) {
    sizeObj.width = parseInt(requestSizes[0], 10);
    sizeObj.height = parseInt(requestSizes[1], 10);
    sizes.push(sizeObj);
  } else if (typeof requestSizes === 'object') {
    for (let i = 0; i < requestSizes.length; i++) {
      let size = requestSizes[i];
      sizeObj = {};
      sizeObj.width = parseInt(size[0], 10);
      sizeObj.height = parseInt(size[1], 10);
      sizes.push(sizeObj);
    }
  }

  return sizes;
}

// 支持的广告尺寸
const mediagoAdSize = [
  { w: 300, h: 250 },
  { w: 300, h: 600 },
  { w: 728, h: 90 },
  { w: 970, h: 250 },
  { w: 320, h: 50 },
  { w: 160, h: 600 },
  { w: 320, h: 180 },
  { w: 320, h: 100 },
  { w: 336, h: 280 }
];

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
    let mediaTypes = getProperty(req, 'mediaTypes');

    let sizes = transformSizes(getProperty(req, 'sizes'));
    let matchSize;

    // 确认尺寸是否符合我们要求
    for (let size of sizes) {
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
      utils.deepAccess(req, 'ortb2Imp.ext.data.pbadslot') ||
      utils.deepAccess(req, 'params.placementId', 0);

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
      let id = '' + (i + 1);
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
          ...gdprConsent // gdpr
        },
        tagid: req.params && req.params.tagid
      };
      itemMaps[id] = {
        req,
        ret
      };
    }

    return ret;
  });
  return items;
}

/**
 * @param {BidRequest} bidRequest
 * @param bidderRequest
 * @returns {string}
 */
function getReferrer(bidRequest = {}, bidderRequest = {}) {
  let pageUrl;
  if (bidRequest.params && bidRequest.params.referrer) {
    pageUrl = bidRequest.params.referrer;
  } else {
    pageUrl = utils.deepAccess(bidderRequest, 'refererInfo.page');
  }
  return pageUrl;
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
  const sharedid =
    utils.deepAccess(validBidRequests[0], 'userId.sharedid.id') ||
    utils.deepAccess(validBidRequests[0], 'userId.pubcid');

  const bidsUserIdAsEids = validBidRequests[0].userIdAsEids;
  const bidsUserid = validBidRequests[0].userId;
  const eids = bidsUserIdAsEids || bidsUserid;
  const ppuid = bidsUserid && bidsUserid.pubProvidedId;
  const content = utils.deepAccess(bidderRequest, 'ortb2.site.content');
  const cat = utils.deepAccess(bidderRequest, 'ortb2.site.cat');
  reqTimes += 1;

  let isMobile = isMobileAndTablet() ? 1 : 0;
  // input test status by Publisher. more frequently for test true req
  let isTest = validBidRequests[0].params.test || 0;
  let auctionId = getProperty(bidderRequest, 'auctionId');
  let items = getItems(validBidRequests, bidderRequest);

  const domain = utils.deepAccess(bidderRequest, 'refererInfo.domain') || document.domain;
  const location = utils.deepAccess(bidderRequest, 'refererInfo.location');
  const page = utils.deepAccess(bidderRequest, 'refererInfo.page');
  const referer = utils.deepAccess(bidderRequest, 'refererInfo.ref');

  const timeout = bidderRequest.timeout || 2000;
  const firstPartyData = bidderRequest.ortb2;
  const topWindow = window.top;
  const title = getPageTitle();
  const desc = getPageDescription();
  const keywords = getPageKeywords();

  if (items && items.length) {
    let c = {
      // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
      id: 'mgprebidjs_' + auctionId,
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
        bidsUserid,
        ppuid,
        firstPartyData,
        content,
        cat,
        reqTimes,
        pmguid: getPmgUID(),
        page: {
          title: title ? title.slice(0, 100) : undefined,
          desc: desc ? desc.slice(0, 300) : undefined,
          keywords: keywords ? keywords.slice(0, 100) : undefined,
          hLen: topWindow.history?.length || undefined,
        },
        device: {
          nbw: getConnectionDownLink(),
          hc: topWindow.navigator?.hardwareConcurrency || undefined,
          dm: topWindow.navigator?.deviceMemory || undefined,
        }
      },
      user: {
        buyeruid: storage.getCookie(COOKIE_KEY_MGUID) || undefined,
        id: sharedid || pubcid,
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
          // todo
          id: domain,
          name: domain
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
  // aliases: ['ex'], // short code
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
    let payload = getParam(validBidRequests, bidderRequest);

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
    for (let bid of bids) {
      let impid = getProperty(bid, 'impid');
      if (itemMaps[impid]) {
        let bidId = getProperty(itemMaps[impid], 'req', 'bidId');
        const bidResponse = {
          requestId: bidId,
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
    const origin = encodeURIComponent(location.origin || `https://${location.host}`);
    let syncParamUrl = `dm=${origin}`;

    if (gdprConsent && gdprConsent.consentString) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        syncParamUrl += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        syncParamUrl += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
      }
    }
    if (uspConsent && uspConsent.consentString) {
      syncParamUrl += `&ccpa_consent=${uspConsent.consentString}`;
    }

    if (syncOptions.iframeEnabled) {
      window.addEventListener('message', function handler(event) {
        if (!event.data || event.origin != THIRD_PARTY_COOKIE_ORIGIN) {
          return;
        }

        this.removeEventListener('message', handler);

        event.stopImmediatePropagation();

        const response = event.data;
        if (!response.optout && response.mguid) {
          storage.setCookie(COOKIE_KEY_MGUID, response.mguid, getCurrentTimeToUTCString());
        }
      }, true);
      return [
        {
          type: 'iframe',
          url: `${COOKY_SYNC_IFRAME_URL}?${syncParamUrl}`
        }
      ];
    }
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  //   onTimeout: function (data) {
  //     // console.log('onTimeout', data);
  //     // Bidder specifc code
  //   },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
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
