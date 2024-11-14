import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { getPageTitle, getPageDescription, getPageKeywords, getConnectionDownLink, getReferrer } from '../libraries/fpdUtils/pageInfo.js';
import { getDevice, getScreenSize } from '../libraries/fpdUtils/deviceInfo.js';
import { getBidFloor } from '../libraries/currencyUtils/floor.js';
import { transformSizes, normalAdSize } from '../libraries/sizeUtils/tranformSize.js';
import { getHLen } from '../libraries/navigatorData/navigatorData.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const BIDDER_CODE = 'discovery';
const ENDPOINT_URL = 'https://rtb-jp.mediago.io/api/bid?tn=';
const TIME_TO_LIVE = 500;
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
let globals = {};
let itemMaps = {};
const MEDIATYPE = [BANNER, NATIVE];

/* ----- _ss_pp_id:start ------ */
const COOKIE_KEY_SSPPID = '_ss_pp_id';
export const COOKIE_KEY_MGUID = '__mguid_';
const COOKIE_KEY_PMGUID = '__pmguid_';
const COOKIE_KEY_PBUID = 'pub_pp_tag';
const STORAGE_KEY_FTUID = 'fluct_ppUUIDv4';
const STORAGE_KEY_IMUID = '__im_ppid';
const COOKIE_RETENTION_TIME = 365 * 24 * 60 * 60 * 1000; // 1 year
const COOKY_SYNC_IFRAME_URL = 'https://asset.popin.cc/js/cookieSync.html';
export const THIRD_PARTY_COOKIE_ORIGIN = 'https://asset.popin.cc';

const UTM_KEY = '_ss_pp_utm';
let UTMValue = {};

const NATIVERET = {
  id: 'id',
  bidfloor: 0,
  // TODO Dynamic parameters
  native: {
    ver: '1.2',
    plcmtcnt: 1,
    assets: [
      {
        id: 1,
        required: 1,
        img: {
          type: 3,
          w: 300,
          wmin: 300,
          h: 174,
          hmin: 174,
        },
      },
      {
        id: 2,
        required: 1,
        title: {
          len: 75,
        },
      },
    ],
    plcmttype: 1,
    privacy: 1,
    eventtrackers: [
      {
        event: 1,
        methods: [1, 2],
      },
    ],
  },
  ext: {},
};

/**
 * get pmg uid
 * 获取并生成用户的id
 * @return {string}
 */
export const getPmgUID = () => {
  if (!storage.cookiesAreEnabled()) return;

  let pmgUid = storage.getCookie(COOKIE_KEY_PMGUID);
  if (!pmgUid) {
    pmgUid = utils.generateUUID();
  }
  // Extend the expiration time of pmguid
  try {
    storage.setCookie(COOKIE_KEY_PMGUID, pmgUid, getCookieTimeToUTCString());
  } catch (e) {}
  return pmgUid;
};

/* ----- _ss_pp_id:end ------ */

/**
 * get object key -> value
 * @param  {Object}    obj  对象
 * @param  {...string} keys 键名
 * @return {any}
 */
function getKv(obj, ...keys) {
  let o = obj;

  for (let key of keys) {
    if (o && o[key]) {
      o = o[key];
    } else {
      return '';
    }
  }
  return o;
}

// Support sizes
const popInAdSize = normalAdSize;

/**
 * get cookie time to UTC string
 * @returns utc string
 */
export function getCookieTimeToUTCString() {
  const date = new Date();
  date.setTime(date.getTime() + COOKIE_RETENTION_TIME);
  return date.toUTCString();
}

/**
 * format imp ad test ext params
 *
 * @param validBidRequest sigleBidRequest
 * @param bidderRequest
 */
function addImpExtParams(bidRequest = {}, bidderRequest = {}) {
  const { deepAccess } = utils;
  const { params = {}, adUnitCode, bidId } = bidRequest;
  const ext = {
    bidId: bidId || '',
    adUnitCode: adUnitCode || '',
    token: params.token || '',
    siteId: params.siteId || '',
    zoneId: params.zoneId || '',
    publisher: params.publisher || '',
    p_pos: params.position || '',
    screenSize: getScreenSize(),
    referrer: getReferrer(bidRequest, bidderRequest),
    stack: deepAccess(bidRequest, 'refererInfo.stack', []),
    b_pos: deepAccess(bidRequest, 'mediaTypes.banner.pos', '', ''),
    ortbUser: deepAccess(bidRequest, 'ortb2.user', {}, {}),
    ortbSite: deepAccess(bidRequest, 'ortb2.site', {}, {}),
    tid: deepAccess(bidRequest, 'ortb2Imp.ext.tid', '', ''),
    browsiViewability: deepAccess(bidRequest, 'ortb2Imp.ext.data.browsi.browsiViewability', '', ''),
    adserverName: deepAccess(bidRequest, 'ortb2Imp.ext.data.adserver.name', '', ''),
    adslot: deepAccess(bidRequest, 'ortb2Imp.ext.data.adserver.adslot', '', ''),
    keywords: deepAccess(bidRequest, 'ortb2Imp.ext.data.keywords', '', ''),
    gpid: deepAccess(bidRequest, 'ortb2Imp.ext.gpid', '', ''),
    pbadslot: deepAccess(bidRequest, 'ortb2Imp.ext.data.pbadslot', '', ''),
  };
  return ext;
}

/**
 * get aditem setting
 * @param {Array}  validBidRequests an an array of bids
 * @param {Object} bidderRequest  The master bidRequest object
 * @return {Object}
 */
function getItems(validBidRequests, bidderRequest) {
  let items = [];
  items = validBidRequests.map((req, i) => {
    let ret = {};
    // eslint-disable-next-line no-debugger
    let mediaTypes = getKv(req, 'mediaTypes');

    const bidFloor = getBidFloor(req);
    let id = '' + (i + 1);

    if (mediaTypes.native) {
      ret = { ...NATIVERET, ...{ id, bidFloor } };
    }
    // banner
    if (mediaTypes.banner) {
      let sizes = transformSizes(getKv(req, 'sizes'));
      let matchSize;

      for (let size of sizes) {
        matchSize = popInAdSize.find(
          (item) => size.width === item.w && size.height === item.h
        );
        if (matchSize) {
          break;
        }
      }
      if (!matchSize) {
        const { height = 0, width = 0 } = sizes[0] || {};
        matchSize = { h: height, w: width };
      }
      ret = {
        id: id,
        bidfloor: bidFloor,
        banner: {
          h: matchSize.h,
          w: matchSize.w,
          pos: 1,
          format: sizes,
        },
        ext: {},
        tagid: req.params && req.params.tagid
      };
    }

    try {
      ret.ext = addImpExtParams(req, bidderRequest);
    } catch (e) {}

    itemMaps[id] = {
      req,
      ret,
    };
    return ret;
  });
  return items;
}

export const buildUTMTagData = (url) => {
  if (!storage.cookiesAreEnabled()) return;
  const urlParams = utils.parseUrl(url).search || {};
  const UTMParams = {};
  Object.keys(urlParams).forEach(key => {
    if (/^utm_/.test(key)) {
      UTMParams[key] = urlParams[key];
    }
  });
  UTMValue = JSON.parse(storage.getCookie(UTM_KEY) || '{}');
  Object.assign(UTMValue, UTMParams);
  storage.setCookie(UTM_KEY, JSON.stringify(UTMValue), getCookieTimeToUTCString());
}

/**
 * get rtb qequest params
 *
 * @param {Array}  validBidRequests an an array of bids
 * @param {Object} bidderRequest  The master bidRequest object
 * @return {Object}
 */
function getParam(validBidRequests, bidderRequest) {
  const sharedid =
    utils.deepAccess(validBidRequests[0], 'userId.sharedid.id') ||
    utils.deepAccess(validBidRequests[0], 'userId.pubcid') ||
    utils.deepAccess(validBidRequests[0], 'crumbs.pubcid');
  const eids = validBidRequests[0].userIdAsEids || validBidRequests[0].userId;

  let isMobile = getDevice() ? 1 : 0;
  // input test status by Publisher. more frequently for test true req
  let isTest = validBidRequests[0].params.test || 0;
  let auctionId = getKv(bidderRequest, 'auctionId');
  let items = getItems(validBidRequests, bidderRequest);

  const timeout = bidderRequest.timeout || 2000;

  const domain =
    utils.deepAccess(bidderRequest, 'refererInfo.domain') || document.domain;
  const location = utils.deepAccess(bidderRequest, 'refererInfo.referer');
  const page = utils.deepAccess(bidderRequest, 'refererInfo.page');
  const referer = utils.deepAccess(bidderRequest, 'refererInfo.ref');
  const firstPartyData = bidderRequest.ortb2;
  const tpData = utils.deepAccess(bidderRequest, 'ortb2.user.data') || undefined;
  const title = getPageTitle();
  const desc = getPageDescription();
  const keywords = getPageKeywords();
  let ext = {};
  try {
    ext = {
      eids,
      firstPartyData,
      ssppid: storage.getCookie(COOKIE_KEY_SSPPID) || undefined,
      pmguid: getPmgUID(),
      ssftUid: storage.getDataFromLocalStorage(STORAGE_KEY_FTUID) || undefined,
      ssimUid: storage.getDataFromLocalStorage(STORAGE_KEY_IMUID) || undefined,
      sspbid: storage.getCookie(COOKIE_KEY_PBUID) || undefined,
      tpData,
      utm: storage.getCookie(UTM_KEY),
      page: {
        title: title ? title.slice(0, 150) : undefined,
        desc: desc ? desc.slice(0, 300) : undefined,
        keywords: keywords ? keywords.slice(0, 100) : undefined,
        hLen: getHLen(),
      },
      device: {
        nbw: getConnectionDownLink(),
      }
    }
  } catch (error) {}
  try {
    buildUTMTagData(page);
  } catch (error) { }

  if (items && items.length) {
    let c = {
      // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
      id: 'pp_hbjs_' + auctionId,
      test: +isTest,
      at: 1,
      bcat: globals['bcat'],
      badv: globals['adv'],
      cur: ['USD'],
      device: {
        connectiontype: 0,
        js: 1,
        os: navigator.platform || '',
        ua: navigator.userAgent,
        language: /en/.test(navigator.language) ? 'en' : navigator.language,
      },
      ext,
      user: {
        buyeruid: storage.getCookie(COOKIE_KEY_MGUID) || undefined,
        id: sharedid,
      },
      tmax: timeout,
      site: {
        name: domain,
        domain: domain,
        page: page || location,
        ref: referer,
        mobile: isMobile,
        cat: [], // todo
        publisher: {
          id: globals['publisher'],
          // todo
          // name: xxx
        },
      },
      imp: items,
    };
    return c;
  } else {
    return null;
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: MEDIATYPE,
  // aliases: ['ex'], // short code
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
    if (bid.params.tagid) {
      globals['tagid'] = bid.params.tagid;
    }
    if (bid.params.bcat) {
      globals['bcat'] = Array.isArray(bid.params.bcat) ? bid.params.bcat : [];
    }
    if (bid.params.badv) {
      globals['badv'] = Array.isArray(bid.params.badv) ? bid.params.badv : [];
    }
    return true;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {Array}  validBidRequests an an array of bids
   * @param {Object} bidderRequest  The master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const pbToken = globals['token'];
    if (!pbToken) return;

    let payload = getParam(validBidRequests, bidderRequest);
    const payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: `${ENDPOINT_URL}${pbToken}`,
      data: payloadString,
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bids = getKv(serverResponse, 'body', 'seatbid', 0, 'bid');
    const cur = getKv(serverResponse, 'body', 'cur');
    const bidResponses = [];
    for (let bid of bids) {
      let impid = getKv(bid, 'impid');
      if (itemMaps[impid]) {
        let bidId = getKv(itemMaps[impid], 'req', 'bidId');
        const mediaType = getKv(bid, 'w') ? 'banner' : 'native';
        let bidResponse = {
          requestId: bidId,
          cpm: getKv(bid, 'price'),
          creativeId: getKv(bid, 'cid'),
          mediaType,
          currency: cur,
          netRevenue: true,
          nurl: getKv(bid, 'nurl'),
          ttl: TIME_TO_LIVE,
          meta: {
            advertiserDomains: getKv(bid, 'adomain') || [],
          },
        };
        if (mediaType === 'native') {
          const adm = getKv(bid, 'adm');
          const admObj = JSON.parse(adm);
          var native = {};
          admObj.assets.forEach((asset) => {
            if (asset.title) {
              native.title = asset.title.text;
            } else if (asset.data) {
              native.data = asset.data.value;
            } else if (asset.img) {
              switch (asset.img.type) {
                case 1:
                  native.icon = {
                    url: asset.img.url,
                    width: asset.img.w,
                    height: asset.img.h,
                  };
                  break;
                default:
                  native.image = {
                    url: asset.img.url,
                    width: asset.img.w,
                    height: asset.img.h,
                  };
                  break;
              }
            }
          });
          if (admObj.link) {
            if (admObj.link.url) {
              native.clickUrl = admObj.link.url;
            }
          }
          if (Array.isArray(admObj.eventtrackers)) {
            native.impressionTrackers = [];
            admObj.eventtrackers.forEach((tracker) => {
              if (tracker.event !== 1) {
                return;
              }
              switch (tracker.method) {
                case 1:
                  native.impressionTrackers.push(tracker.url);
                  break;
                // case 2:
                //   native.javascriptTrackers = `<script src=\'${tracker.url}\'></script>`;
                //   break;
              }
            });
          }
          if (admObj.purl) {
            native.purl = admObj.purl;
          }
          bidResponse['native'] = native;
        } else {
          bidResponse['width'] = getKv(bid, 'w');
          bidResponse['height'] = getKv(bid, 'h');
          bidResponse['ad'] = getKv(bid, 'adm');
        }
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
          storage.setCookie(COOKIE_KEY_MGUID, response.mguid, getCookieTimeToUTCString());
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
  onTimeout: function (data) {
    utils.logError('DiscoveryDSP adapter timed out for the auction.');
    // TODO send request timeout to serve, the interface is not ready
  },

  /**
   * Register bidder specific code, which  will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function (bid) {
    if (bid['nurl']) {
      utils.triggerPixel(bid['nurl']);
    }
  },
};
registerBidder(spec);
