import { getDNT } from '../libraries/navigatorData/dnt.js';
import {
  _each,
  deepAccess,
  isPlainObject,
  isArray,
  isStr,
  logInfo,
  parseUrl,
  isEmpty,
  triggerPixel,
  triggerNurlWithCpm,
  logWarn,
  isFn,
  isNumber,
  isBoolean,
  extractDomainFromHost,
  isInteger, deepSetValue, getBidIdParameter, setOnAny,
  getWinDimensions
} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { getUserSyncs } from '../libraries/mgidUtils/mgidUtils.js'
import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js'

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const GVLID = 358;
const DEFAULT_CUR = 'USD';
const BIDDER_CODE = 'mgid';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
const ENDPOINT_URL = 'https://prebid.mgid.com/prebid/';
const LOG_WARN_PREFIX = '[MGID warn]: ';
const LOG_INFO_PREFIX = '[MGID info]: ';
const NATIVE_ASSETS = {
  'TITLE': { ID: 1, KEY: 'title', TYPE: 0 },
  'IMAGE': { ID: 2, KEY: 'image', TYPE: 0 },
  'ICON': { ID: 3, KEY: 'icon', TYPE: 0 },
  'SPONSOREDBY': { ID: 4, KEY: 'sponsoredBy', TYPE: 1 }, // please note that type of SPONSORED is also 1
  'DESC': { ID: 5, KEY: 'data', TYPE: 2 }, // please note that type of BODY is also set to 2
  'PRICE': { ID: 6, KEY: 'price', TYPE: 6 },
  'SALEPRICE': { ID: 7, KEY: 'saleprice', TYPE: 7 },
  'DISPLAYURL': { ID: 8, KEY: 'displayurl', TYPE: 11 },
  'CTA': { ID: 9, KEY: 'cta', TYPE: 12 },
  'BODY': { ID: 10, KEY: 'body', TYPE: 2 }, // please note that type of DESC is also set to 2
  'SPONSORED': { ID: 11, KEY: 'sponsored', TYPE: 1 }, // please note that type of SPONSOREDBY is also set to 1
};
const NATIVE_ASSET_IMAGE_TYPE = {
  'ICON': 1,
  'IMAGE': 3
};
const DEFAULT_IMAGE_WIDTH = 492;
const DEFAULT_IMAGE_HEIGHT = 328;
const DEFAULT_ICON_WIDTH = 50;
const DEFAULT_ICON_HEIGHT = 50;
const DEFAULT_TITLE_LENGTH = 80;

let isInvalidNativeRequest = false;

// check if title, image can be added with mandatory field default values
const NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS = [
  {
    id: NATIVE_ASSETS.SPONSOREDBY.ID,
    required: true,
    data: {
      type: 1
    }
  },
  {
    id: NATIVE_ASSETS.TITLE.ID,
    required: true,
  },
  {
    id: NATIVE_ASSETS.IMAGE.ID,
    required: true,
  }
];
const _NATIVE_ASSET_ID_TO_KEY_MAP = {};
const _NATIVE_ASSET_KEY_TO_ASSET_MAP = {};

// loading _NATIVE_ASSET_ID_TO_KEY_MAP
_each(NATIVE_ASSETS, anAsset => { _NATIVE_ASSET_ID_TO_KEY_MAP[anAsset.ID] = anAsset.KEY });
// loading _NATIVE_ASSET_KEY_TO_ASSET_MAP
_each(NATIVE_ASSETS, anAsset => { _NATIVE_ASSET_KEY_TO_ASSET_MAP[anAsset.KEY] = anAsset });

export const spec = {
  VERSION: '1.8',
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, NATIVE],
  reId: /^[1-9][0-9]*$/,
  NATIVE_ASSET_ID_TO_KEY_MAP: _NATIVE_ASSET_ID_TO_KEY_MAP,
  NATIVE_ASSET_KEY_TO_ASSET_MAP: _NATIVE_ASSET_KEY_TO_ASSET_MAP,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    const banner = deepAccess(bid, 'mediaTypes.banner');
    const native = deepAccess(bid, 'mediaTypes.native');
    let nativeOk = isPlainObject(native);
    if (nativeOk) {
      const nativeParams = deepAccess(bid, 'nativeParams');
      let assetsCount = 0;
      if (isPlainObject(nativeParams)) {
        for (const k in nativeParams) {
          const v = nativeParams[k];
          const supportProp = spec.NATIVE_ASSET_KEY_TO_ASSET_MAP.hasOwnProperty(k);
          if (supportProp) {
            assetsCount++;
          }
          if (!isPlainObject(v) || (!supportProp && deepAccess(v, 'required'))) {
            nativeOk = false;
            break;
          }
        }
      }
      nativeOk = nativeOk && (assetsCount > 0);
    }
    let bannerOk = isPlainObject(banner);
    if (bannerOk) {
      const sizes = deepAccess(banner, 'sizes');
      bannerOk = isArray(sizes) && sizes.length > 0;
      for (let f = 0; bannerOk && f < sizes.length; f++) {
        bannerOk = sizes[f].length === 2;
      }
    }
    const acc = Number(bid.params.accountId);
    const plcmt = Number(bid.params.placementId);
    return (bannerOk || nativeOk) && isPlainObject(bid.params) && !!bid.adUnitCode && isStr(bid.adUnitCode) && (plcmt > 0 ? bid.params.placementId.toString().search(spec.reId) === 0 : true) &&
      !!acc && acc > 0 && bid.params.accountId.toString().search(spec.reId) === 0;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    const [bidRequest] = validBidRequests;
    logInfo(LOG_INFO_PREFIX + `buildRequests`);
    if (validBidRequests.length === 0) {
      return;
    }
    const info = pageInfo();
    const accountId = setOnAny(validBidRequests, 'params.accountId');
    const muid = getLocalStorageSafely('mgMuidn');
    let url = (setOnAny(validBidRequests, 'params.bidUrl') || ENDPOINT_URL) + accountId;
    if (isStr(muid) && muid.length > 0) {
      url += '?muid=' + muid;
    }
    const cur = setOnAny(validBidRequests, 'params.currency') || setOnAny(validBidRequests, 'params.cur') || getCurrencyFromBidderRequest(bidderRequest) || DEFAULT_CUR;
    const secure = window.location.protocol === 'https:' ? 1 : 0;
    const imp = [];
    validBidRequests.forEach(bid => {
      let tagid = deepAccess(bid, 'params.placementId') || 0;
      tagid = !tagid ? bid.adUnitCode : tagid + '/' + bid.adUnitCode;
      const impObj = {
        id: bid.bidId,
        tagid,
        secure,
      };
      const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid');
      gpid && isStr(gpid) && deepSetValue(impObj, `ext.gpid`, gpid);
      const floorData = getBidFloor(bid, cur);
      if (floorData.floor) {
        impObj.bidfloor = floorData.floor;
      }
      if (floorData.cur) {
        impObj.bidfloorcur = floorData.cur;
      }
      for (const mediaTypes in bid.mediaTypes) {
        switch (mediaTypes) {
          case BANNER:
            impObj.banner = createBannerRequest(bid);
            imp.push(impObj);
            break;
          case NATIVE:
            const native = createNativeRequest(bid.nativeParams);
            if (!isInvalidNativeRequest) {
              impObj.native = {
                'request': native
              };
              imp.push(impObj);
            }
            break;
        }
      }
    });

    if (imp.length === 0) {
      return;
    }

    const ortb2Data = bidderRequest?.ortb2 || {};

    const request = {
      id: deepAccess(bidderRequest, 'bidderRequestId'),
      site: ortb2Data?.site || {},
      cur: [cur],
      geo: {utcoffset: info.timeOffset},
      device: ortb2Data?.device || {},
      ext: {
        mgid_ver: spec.VERSION,
        prebid_ver: '$prebid.version$',
      },
      imp,
      tmax: bidderRequest?.timeout || config.getConfig('bidderTimeout') || 500,
    };
    // request level
    const bcat = ortb2Data?.bcat || bidRequest?.params?.bcat || [];
    const badv = ortb2Data?.badv || bidRequest?.params?.badv || [];
    const wlang = ortb2Data?.wlang || bidRequest?.params?.wlang || [];
    if (bcat.length > 0) {
      request.bcat = bcat;
    }
    if (badv.length > 0) {
      request.badv = badv;
    }
    if (wlang.length > 0) {
      request.wlang = wlang;
    }
    // site level
    const page = deepAccess(bidderRequest, 'refererInfo.page') || info.location
    if (!isStr(deepAccess(request.site, 'domain'))) {
      const hostname = parseUrl(page).hostname;
      request.site.domain = extractDomainFromHostExceptLocalhost(hostname) || hostname
    }
    if (!isStr(deepAccess(request.site, 'page'))) {
      request.site.page = page
    }
    if (!isStr(deepAccess(request.site, 'ref'))) {
      const ref = deepAccess(bidderRequest, 'refererInfo.ref') || info.referrer;
      if (ref) {
        request.site.ref = ref
      }
    }
    // device level
    if (!isStr(deepAccess(request.device, 'ua'))) {
      request.device.ua = navigator.userAgent;
    }
    request.device.js = 1;
    if (!isInteger(deepAccess(request.device, 'dnt'))) {
      request.device.dnt = getDNT() ? 1 : 0;
    }
    if (!isInteger(deepAccess(request.device, 'h'))) {
      request.device.h = screen.height;
    }
    if (!isInteger(deepAccess(request.device, 'w'))) {
      request.device.w = screen.width;
    }
    if (!isStr(deepAccess(request.device, 'language'))) {
      request.device.language = getLanguage();
    }
    // user & regs & privacy
    if (isPlainObject(ortb2Data?.user)) {
      request.user = ortb2Data.user;
    }
    if (isPlainObject(ortb2Data?.regs)) {
      request.regs = ortb2Data.regs;
    }
    if (bidderRequest && isPlainObject(bidderRequest.gdprConsent)) {
      if (!isStr(deepAccess(request.user, 'ext.consent'))) {
        deepSetValue(request, 'user.ext.consent', bidderRequest.gdprConsent?.consentString);
      }
      if (!isBoolean(deepAccess(request.regs, 'ext.gdpr'))) {
        deepSetValue(request, 'regs.ext.gdpr', bidderRequest.gdprConsent?.gdprApplies ? 1 : 0);
      }
    }
    const userId = deepAccess(bidderRequest, 'userId')
    if (isStr(userId)) {
      deepSetValue(request, 'user.id', userId);
    }
    const eids = setOnAny(validBidRequests, 'userIdAsEids')
    if (eids && eids.length > 0) {
      deepSetValue(request, 'user.ext.eids', eids);
    }
    if (bidderRequest && isStr(bidderRequest.uspConsent)) {
      if (!isBoolean(deepAccess(request.regs, 'ext.us_privacy'))) {
        deepSetValue(request, 'regs.ext.us_privacy', bidderRequest.uspConsent);
      }
    }
    if (bidderRequest && isPlainObject(bidderRequest.gppConsent)) {
      if (!isStr(deepAccess(request.regs, 'gpp'))) {
        deepSetValue(request, 'regs.gpp', bidderRequest.gppConsent?.gppString);
      }
      if (!isArray(deepAccess(request.regs, 'gpp_sid'))) {
        deepSetValue(request, 'regs.gpp_sid', bidderRequest.gppConsent?.applicableSections);
      }
    }
    if (config.getConfig('coppa')) {
      if (!isInteger(deepAccess(request.regs, 'coppa'))) {
        deepSetValue(request, 'regs.coppa', 1);
      }
    }
    const schain = setOnAny(validBidRequests, 'ortb2.source.ext.schain');
    if (schain) {
      deepSetValue(request, 'source.ext.schain', schain);
    }

    logInfo(LOG_INFO_PREFIX + `buildRequest:`, request);
    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(request),
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidRequests
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse, bidRequests) => {
    logInfo(LOG_INFO_PREFIX + `interpretResponse`, serverResponse);
    if (serverResponse == null || serverResponse.body == null || serverResponse.body === '' || !isArray(serverResponse.body.seatbid) || !serverResponse.body.seatbid.length) {
      return;
    }
    const returnedBids = [];
    const muidn = deepAccess(serverResponse.body, 'ext.muidn')
    if (isStr(muidn) && muidn.length > 0) {
      setLocalStorageSafely('mgMuidn', muidn)
    }
    serverResponse.body.seatbid.forEach((bids) => {
      bids.bid.forEach((bid) => {
        const pbid = prebidBid(bid, serverResponse.body.cur);
        if (pbid.mediaType === NATIVE && isEmpty(pbid.native)) {
          return;
        }
        returnedBids.push(pbid);
      })
    });

    logInfo(LOG_INFO_PREFIX + `interpretedResponse`, returnedBids);
    return returnedBids;
  },
  onBidWon: (bid) => {
    const cpm = deepAccess(bid, 'adserverTargeting.hb_pb') || '';
    triggerNurlWithCpm(bid, cpm)
    if (bid.isBurl) {
      if (bid.mediaType === BANNER) {
        bid.ad = bid.ad.replace(
          /\${AUCTION_PRICE}/,
          cpm
        )
      } else {
        bid.burl = bid.burl.replace(
          /\${AUCTION_PRICE}/,
          cpm
        );
        triggerPixel(bid.burl);
      }
    }
    logInfo(LOG_INFO_PREFIX + `onBidWon`);
  },
  getUserSyncs: getUserSyncs,
};

registerBidder(spec);

/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @param cur
 * @return Bid
 */
function prebidBid(serverBid, cur) {
  if (!isStr(cur) || cur === '') {
    cur = DEFAULT_CUR;
  }
  const bid = {
    requestId: serverBid.impid,
    ad: serverBid.adm,
    cpm: serverBid.price,
    creativeId: serverBid.adid,
    currency: cur,
    dealId: serverBid.dealid || '',
    width: serverBid.w,
    height: serverBid.h,
    mediaType: 'banner',
    netRevenue: true,
    ttl: serverBid.ttl || 300,
    nurl: serverBid.nurl || '',
    burl: serverBid.burl || '',
    isBurl: isStr(serverBid.burl) && serverBid.burl.length > 0,
    meta: { advertiserDomains: (isArray(serverBid.adomain) && serverBid.adomain.length > 0 ? serverBid.adomain : []) },
  };
  setMediaType(serverBid, bid);
  switch (bid.mediaType) {
    case BANNER:
      break;
    case NATIVE:
      parseNativeResponse(serverBid, bid);
      break;
  }
  return bid;
}

function setMediaType(bid, newBid) {
  if (deepAccess(bid, 'ext.crtype') === 'native') {
    newBid.mediaType = NATIVE;
  } else {
    newBid.mediaType = BANNER;
  }
}

function extractDomainFromHostExceptLocalhost(pageHost) {
  if (pageHost === 'localhost') {
    return 'localhost'
  }
  return extractDomainFromHost(pageHost)
}

function getLanguage() {
  const language = navigator.language ? 'language' : 'userLanguage';
  const lang2 = navigator[language].split('-')[0];
  if (lang2.length === 2 || lang2.length === 3) {
    return lang2;
  }
  return '';
}

function getLocalStorageSafely(key) {
  try {
    return storage.getDataFromLocalStorage(key);
  } catch (e) {
    return null;
  }
}

function setLocalStorageSafely(key, val) {
  try {
    return storage.setDataInLocalStorage(key, val);
  } catch (e) {
    return null;
  }
}

function createBannerRequest(bid) {
  const sizes = deepAccess(bid, 'mediaTypes.banner.sizes');
  const format = [];
  if (sizes.length > 1) {
    for (let f = 0; f < sizes.length; f++) {
      if (sizes[f].length === 2) {
        format.push({w: sizes[f][0], h: sizes[f][1]});
      }
    }
  }
  const r = {
    w: sizes && sizes[0][0],
    h: sizes && sizes[0][1],
  };
  if (format.length) {
    r.format = format
  }
  const pos = deepAccess(bid, 'mediaTypes.banner.pos') || 0
  if (pos) {
    r.pos = pos
  }
  return r
}

function createNativeRequest(params) {
  const nativeRequestObject = {
    plcmtcnt: 1,
    assets: []
  };
  for (const key in params) {
    let assetObj = {};
    if (params.hasOwnProperty(key)) {
      if (!(nativeRequestObject.assets && nativeRequestObject.assets.length > 0 && nativeRequestObject.assets.hasOwnProperty(key))) {
        switch (key) {
          case NATIVE_ASSETS.TITLE.KEY:
            assetObj = {
              id: NATIVE_ASSETS.TITLE.ID,
              required: params[key].required ? 1 : 0,
              title: {
                len: params[key].len || params[key].length || DEFAULT_TITLE_LENGTH
              }
            };
            break;
          case NATIVE_ASSETS.IMAGE.KEY:
            const wmin = params[key].wmin || params[key].minimumWidth || (isArray(params[key].minsizes) && params[key].minsizes.length > 0 ? params[key].minsizes[0] : 0);
            const hmin = params[key].hmin || params[key].minimumHeight || (isArray(params[key].minsizes) && params[key].minsizes.length > 1 ? params[key].minsizes[1] : 0);
            assetObj = {
              id: NATIVE_ASSETS.IMAGE.ID,
              required: params[key].required ? 1 : 0,
              img: {
                type: NATIVE_ASSET_IMAGE_TYPE.IMAGE,
                w: params[key].w || params[key].width || (isArray(params[key].sizes) && params[key].sizes.length > 0 ? params[key].sizes[0] : 0),
                h: params[key].h || params[key].height || (isArray(params[key].sizes) && params[key].sizes.length > 1 ? params[key].sizes[1] : 0),
                mimes: params[key].mimes,
                ext: params[key].ext,
              }
            };
            if (wmin > 0) {
              assetObj.img.wmin = wmin;
            }
            if (hmin > 0) {
              assetObj.img.hmin = hmin;
            }
            if (!assetObj.img.w) {
              assetObj.img.w = DEFAULT_IMAGE_WIDTH;
            }
            if (!assetObj.img.h) {
              assetObj.img.h = DEFAULT_IMAGE_HEIGHT;
            }
            break;
          case NATIVE_ASSETS.ICON.KEY:
            assetObj = {
              id: NATIVE_ASSETS.ICON.ID,
              required: params[key].required ? 1 : 0,
              img: {
                type: NATIVE_ASSET_IMAGE_TYPE.ICON,
                w: params[key].w || params[key].width || (isArray(params[key].sizes) && params[key].sizes.length > 0 ? params[key].sizes[0] : 0),
                h: params[key].h || params[key].height || (isArray(params[key].sizes) && params[key].sizes.length > 0 ? params[key].sizes[1] : 0),
              }
            };
            if (!assetObj.img.w) {
              assetObj.img.w = DEFAULT_ICON_WIDTH;
            }
            if (!assetObj.img.h) {
              assetObj.img.h = DEFAULT_ICON_HEIGHT;
            }
            break;
          case NATIVE_ASSETS.SPONSORED.KEY:
          case NATIVE_ASSETS.SPONSOREDBY.KEY:
          case NATIVE_ASSETS.PRICE.KEY:
          case NATIVE_ASSETS.SALEPRICE.KEY:
          case NATIVE_ASSETS.DESC.KEY:
          case NATIVE_ASSETS.BODY.KEY:
          case NATIVE_ASSETS.DISPLAYURL.KEY:
          case NATIVE_ASSETS.CTA.KEY:
            assetObj = commonNativeRequestObject(spec.NATIVE_ASSET_KEY_TO_ASSET_MAP[key], params);
            break;
          default:
            if (params[key].required) {
              isInvalidNativeRequest = true;
              return;
            }
        }
      }
    }
    if (assetObj.id) {
      nativeRequestObject.assets[nativeRequestObject.assets.length] = assetObj;
    }
  }

  // for native image adtype prebid has to have few required assests i.e. title,sponsoredBy, image
  // if any of these are missing from the request then request will not be sent
  const requiredAssetCount = NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS.length;
  let presentrequiredAssetCount = 0;
  NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS.forEach(ele => {
    const lengthOfExistingAssets = nativeRequestObject.assets.length;
    for (let i = 0; i < lengthOfExistingAssets; i++) {
      if (ele.id === nativeRequestObject.assets[i].id) {
        presentrequiredAssetCount++;
        break;
      } else {
        if (ele.id === 4 && nativeRequestObject.assets[i].id === 11) {
          if (deepAccess(nativeRequestObject.assets[i], 'data.type') === ele.data.type) {
            presentrequiredAssetCount++;
            break;
          }
        }
      }
    }
  });
  isInvalidNativeRequest = requiredAssetCount !== presentrequiredAssetCount;
  return nativeRequestObject;
}

function commonNativeRequestObject(nativeAsset, params) {
  const key = nativeAsset.KEY;
  return {
    id: nativeAsset.ID,
    required: params[key].required ? 1 : 0,
    data: {
      type: nativeAsset.TYPE,
      len: params[key].len,
      ext: params[key].ext
    }
  };
}

function parseNativeResponse(bid, newBid) {
  newBid.native = {};
  if (bid.hasOwnProperty('adm')) {
    let nativeAdm = '';
    try {
      nativeAdm = JSON.parse(bid.adm);
    } catch (ex) {
      logWarn(LOG_WARN_PREFIX + 'Error: Cannot parse native response for ad response: ' + newBid.adm);
      return;
    }
    if (nativeAdm && nativeAdm.native && nativeAdm.native.assets && nativeAdm.native.assets.length > 0) {
      newBid.mediaType = NATIVE;
      for (let i = 0, len = nativeAdm.native.assets.length; i < len; i++) {
        switch (nativeAdm.native.assets[i].id) {
          case NATIVE_ASSETS.TITLE.ID:
            newBid.native.title = nativeAdm.native.assets[i].title && nativeAdm.native.assets[i].title.text;
            break;
          case NATIVE_ASSETS.IMAGE.ID:
            newBid.native.image = copyFromAdmAsset(nativeAdm.native.assets[i]);
            break;
          case NATIVE_ASSETS.ICON.ID:
            newBid.native.icon = copyFromAdmAsset(nativeAdm.native.assets[i]);
            break;
          case NATIVE_ASSETS.SPONSOREDBY.ID:
          case NATIVE_ASSETS.SPONSORED.ID:
          case NATIVE_ASSETS.PRICE:
          case NATIVE_ASSETS.SALEPRICE.ID:
          case NATIVE_ASSETS.DESC.ID:
          case NATIVE_ASSETS.BODY.ID:
          case NATIVE_ASSETS.DISPLAYURL.ID:
          case NATIVE_ASSETS.CTA.ID:
            newBid.native[spec.NATIVE_ASSET_ID_TO_KEY_MAP[nativeAdm.native.assets[i].id]] = nativeAdm.native.assets[i].data && nativeAdm.native.assets[i].data.value;
            break;
        }
      }
      newBid.native.clickUrl = nativeAdm.native.link && nativeAdm.native.link.url;
      newBid.native.clickTrackers = (nativeAdm.native.link && nativeAdm.native.link.clicktrackers) || [];
      newBid.native.impressionTrackers = nativeAdm.native.imptrackers || [];
      newBid.native.jstracker = nativeAdm.native.jstracker || [];
      newBid.width = 0;
      newBid.height = 0;
    }
  }
}

function pageInfo() {
  var w, d, l, r, m, p, t;
  for (w = window, d = w.document, l = d.location.href, r = d.referrer, m = 0, t = new Date(); w !== w.parent;) {
    try {
      p = w.parent; l = p.location.href; r = p.document.referrer; w = p;
    } catch (e) {
      m = top !== w.parent ? 2 : 1;
      break
    }
  }
  return {
    location: l,
    referrer: r || '',
    masked: m,
    wWidth: getWinDimensions().innerWidth,
    wHeight: getWinDimensions().innerHeight,
    date: t.toUTCString(),
    timeOffset: t.getTimezoneOffset()
  };
}

/**
 * Get the floor price from bid.params for backward compatibility.
 * If not found, then check floor module.
 * @param bid A valid bid object
 * @param cur
 * @returns {*|number} floor price
 */
function getBidFloor(bid, cur) {
  let bidFloor = getBidIdParameter('bidfloor', bid.params) || getBidIdParameter('bidFloor', bid.params) || 0;
  const reqCur = cur

  if (!bidFloor && isFn(bid.getFloor)) {
    const floorObj = bid.getFloor({
      currency: '*',
      mediaType: '*',
      size: '*'
    });
    if (isPlainObject(floorObj) && isNumber(floorObj.floor)) {
      if (!floorObj.currency && reqCur !== DEFAULT_CUR) {
        floorObj.currency = DEFAULT_CUR
      }
      if (floorObj.currency && reqCur !== floorObj.currency) {
        cur = floorObj.currency
      }
      bidFloor = floorObj.floor;
    }
  }
  if (reqCur === cur) {
    cur = ''
  }
  return {floor: bidFloor, cur: cur}
}

function copyFromAdmAsset(asset) {
  return {
    url: asset.img && asset.img.url,
    height: asset.img && asset.img.h,
    width: asset.img && asset.img.w,
  }
}
