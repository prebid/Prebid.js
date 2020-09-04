import {registerBidder} from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();
const DEFAULT_CUR = 'USD';
const BIDDER_CODE = 'mgid';
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
let _NATIVE_ASSET_ID_TO_KEY_MAP = {};
let _NATIVE_ASSET_KEY_TO_ASSET_MAP = {};

// loading _NATIVE_ASSET_ID_TO_KEY_MAP
utils._each(NATIVE_ASSETS, anAsset => { _NATIVE_ASSET_ID_TO_KEY_MAP[anAsset.ID] = anAsset.KEY });
// loading _NATIVE_ASSET_KEY_TO_ASSET_MAP
utils._each(NATIVE_ASSETS, anAsset => { _NATIVE_ASSET_KEY_TO_ASSET_MAP[anAsset.KEY] = anAsset });

export const spec = {
  VERSION: '1.4',
  code: BIDDER_CODE,
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
    const banner = utils.deepAccess(bid, 'mediaTypes.banner');
    const native = utils.deepAccess(bid, 'mediaTypes.native');
    let nativeOk = utils.isPlainObject(native);
    if (nativeOk) {
      const nativeParams = utils.deepAccess(bid, 'nativeParams');
      let assetsCount = 0;
      if (utils.isPlainObject(nativeParams)) {
        for (let k in nativeParams) {
          let v = nativeParams[k];
          const supportProp = spec.NATIVE_ASSET_KEY_TO_ASSET_MAP.hasOwnProperty(k);
          if (supportProp) {
            assetsCount++
          }
          if (!utils.isPlainObject(v) || (!supportProp && utils.deepAccess(v, 'required'))) {
            nativeOk = false;
            break;
          }
        }
      }
      nativeOk = nativeOk && (assetsCount > 0);
    }
    let bannerOk = utils.isPlainObject(banner);
    if (bannerOk) {
      const sizes = utils.deepAccess(banner, 'sizes');
      bannerOk = utils.isArray(sizes) && sizes.length > 0;
      for (let f = 0; bannerOk && f < sizes.length; f++) {
        bannerOk = sizes[f].length === 2;
      }
    }
    let acc = Number(bid.params.accountId);
    let plcmt = Number(bid.params.placementId);
    return (bannerOk || nativeOk) && utils.isPlainObject(bid.params) && !!bid.adUnitCode && utils.isStr(bid.adUnitCode) && (plcmt > 0 ? bid.params.placementId.toString().search(spec.reId) === 0 : true) &&
      !!acc && acc > 0 && bid.params.accountId.toString().search(spec.reId) === 0;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    utils.logInfo(LOG_INFO_PREFIX + `buildRequests`);
    if (validBidRequests.length === 0) {
      return;
    }
    const info = pageInfo();
    const page = info.location || utils.deepAccess(bidderRequest, 'refererInfo.referer') || utils.deepAccess(bidderRequest, 'refererInfo.canonicalUrl');
    const hostname = utils.parseUrl(page).hostname;
    let domain = extractDomainFromHost(hostname) || hostname;
    const accountId = setOnAny(validBidRequests, 'params.accountId');
    const muid = getLocalStorageSafely('mgMuidn');
    let url = (setOnAny(validBidRequests, 'params.bidUrl') || ENDPOINT_URL) + accountId;
    if (utils.isStr(muid) && muid.length > 0) {
      url += '?muid=' + muid;
    }
    const cur = [setOnAny(validBidRequests, 'params.currency') || setOnAny(validBidRequests, 'params.cur') || config.getConfig('currency.adServerCurrency') || DEFAULT_CUR];
    const secure = window.location.protocol === 'https:' ? 1 : 0;
    let imp = [];
    validBidRequests.forEach(bid => {
      let tagid = utils.deepAccess(bid, 'params.placementId') || 0;
      tagid = !tagid ? bid.adUnitCode : tagid + '/' + bid.adUnitCode;
      let impObj = {
        id: bid.bidId,
        tagid,
        secure,
      };
      const bidFloor = utils.deepAccess(bid, 'params.bidFloor') || utils.deepAccess(bid, 'params.bidfloor') || 0;
      if (bidFloor && utils.isNumber(bidFloor)) {
        impObj.bidfloor = bidFloor;
      }
      for (let mediaTypes in bid.mediaTypes) {
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

    let request = {
      id: utils.deepAccess(bidderRequest, 'bidderRequestId'),
      site: {domain, page},
      cur: cur,
      geo: {utcoffset: info.timeOffset},
      device: {
        ua: navigator.userAgent,
        js: 1,
        dnt: (navigator.doNotTrack === 'yes' || navigator.doNotTrack === '1' || navigator.msDoNotTrack === '1') ? 1 : 0,
        h: screen.height,
        w: screen.width,
        language: getLanguage()
      },
      ext: {mgid_ver: spec.VERSION, prebid_ver: $$PREBID_GLOBAL$$.version},
      imp
    };
    if (bidderRequest && bidderRequest.gdprConsent) {
      request.user = {ext: {consent: bidderRequest.gdprConsent.consentString}};
      request.regs = {ext: {gdpr: (bidderRequest.gdprConsent.gdprApplies ? 1 : 0)}}
    }
    if (info.referrer) {
      request.site.ref = info.referrer
    }
    utils.logInfo(LOG_INFO_PREFIX + `buildRequest:`, request);
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
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse, bidRequests) => {
    utils.logInfo(LOG_INFO_PREFIX + `interpretResponse`, serverResponse);
    if (serverResponse == null || serverResponse.body == null || serverResponse.body === '' || !utils.isArray(serverResponse.body.seatbid) || !serverResponse.body.seatbid.length) {
      return;
    }
    const returnedBids = [];
    const muidn = utils.deepAccess(serverResponse.body, 'ext.muidn')
    if (utils.isStr(muidn) && muidn.length > 0) {
      setLocalStorageSafely('mgMuidn', muidn)
    }
    serverResponse.body.seatbid.forEach((bids) => {
      bids.bid.forEach((bid) => {
        const pbid = prebidBid(bid, serverResponse.body.cur);
        if (pbid.mediaType === NATIVE && utils.isEmpty(pbid.native)) {
          return;
        }
        returnedBids.push(pbid);
      })
    });

    utils.logInfo(LOG_INFO_PREFIX + `interpretedResponse`, returnedBids);
    return returnedBids;
  },
  onBidWon: (bid) => {
    const cpm = utils.deepAccess(bid, 'adserverTargeting.hb_pb') || '';
    if (utils.isStr(bid.nurl) && bid.nurl !== '') {
      bid.nurl = bid.nurl.replace(
        /\${AUCTION_PRICE}/,
        cpm
      );
      utils.triggerPixel(bid.nurl);
    }
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
        utils.triggerPixel(bid.burl);
      }
    }
    utils.logInfo(LOG_INFO_PREFIX + `onBidWon`);
  },
  getUserSyncs: (syncOptions, serverResponses) => {
    utils.logInfo(LOG_INFO_PREFIX + `getUserSyncs`);
  }
};

registerBidder(spec);

function setOnAny(collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = utils.deepAccess(collection[i], key);
    if (result) {
      return result;
    }
  }
}

/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @return Bid
 */
function prebidBid(serverBid, cur) {
  if (!utils.isStr(cur) || cur === '') {
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
    isBurl: utils.isStr(serverBid.burl) && serverBid.burl.length > 0,
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
  if (utils.deepAccess(bid, 'ext.crtype') === 'native') {
    newBid.mediaType = NATIVE;
  } else {
    newBid.mediaType = BANNER;
  }
}

function extractDomainFromHost(pageHost) {
  if (pageHost == 'localhost') {
    return 'localhost'
  }
  let domain = null;
  try {
    let domains = /[-\w]+\.([-\w]+|[-\w]{3,}|[-\w]{1,3}\.[-\w]{2})$/i.exec(pageHost);
    if (domains != null && domains.length > 0) {
      domain = domains[0];
      for (let i = 1; i < domains.length; i++) {
        if (domains[i].length > domain.length) {
          domain = domains[i];
        }
      }
    }
  } catch (e) {
    domain = null;
  }
  return domain;
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
  const sizes = utils.deepAccess(bid, 'mediaTypes.banner.sizes');
  let format = [];
  if (sizes.length > 1) {
    for (let f = 0; f < sizes.length; f++) {
      if (sizes[f].length === 2) {
        format.push({w: sizes[f][0], h: sizes[f][1]});
      }
    }
  }
  let r = {
    w: sizes && sizes[0][0],
    h: sizes && sizes[0][1],
  };
  if (format.length) {
    r.format = format
  }
  return r
}

function createNativeRequest(params) {
  let nativeRequestObject = {
    plcmtcnt: 1,
    assets: []
  };
  for (let key in params) {
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
            const wmin = params[key].wmin || params[key].minimumWidth || (utils.isArray(params[key].minsizes) && params[key].minsizes.length > 0 ? params[key].minsizes[0] : 0);
            const hmin = params[key].hmin || params[key].minimumHeight || (utils.isArray(params[key].minsizes) && params[key].minsizes.length > 1 ? params[key].minsizes[1] : 0);
            assetObj = {
              id: NATIVE_ASSETS.IMAGE.ID,
              required: params[key].required ? 1 : 0,
              img: {
                type: NATIVE_ASSET_IMAGE_TYPE.IMAGE,
                w: params[key].w || params[key].width || (utils.isArray(params[key].sizes) && params[key].sizes.length > 0 ? params[key].sizes[0] : 0),
                h: params[key].h || params[key].height || (utils.isArray(params[key].sizes) && params[key].sizes.length > 1 ? params[key].sizes[1] : 0),
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
                w: params[key].w || params[key].width || (utils.isArray(params[key].sizes) && params[key].sizes.length > 0 ? params[key].sizes[0] : 0),
                h: params[key].h || params[key].height || (utils.isArray(params[key].sizes) && params[key].sizes.length > 0 ? params[key].sizes[1] : 0),
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
  let requiredAssetCount = NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS.length;
  let presentrequiredAssetCount = 0;
  NATIVE_MINIMUM_REQUIRED_IMAGE_ASSETS.forEach(ele => {
    let lengthOfExistingAssets = nativeRequestObject.assets.length;
    for (let i = 0; i < lengthOfExistingAssets; i++) {
      if (ele.id === nativeRequestObject.assets[i].id) {
        presentrequiredAssetCount++;
        break;
      } else {
        if (ele.id === 4 && nativeRequestObject.assets[i].id === 11) {
          if (utils.deepAccess(nativeRequestObject.assets[i], 'data.type') === ele.data.type) {
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
    let adm = '';
    try {
      adm = JSON.parse(bid.adm);
    } catch (ex) {
      utils.logWarn(LOG_WARN_PREFIX + 'Error: Cannot parse native response for ad response: ' + newBid.adm);
      return;
    }
    if (adm && adm.native && adm.native.assets && adm.native.assets.length > 0) {
      newBid.mediaType = NATIVE;
      for (let i = 0, len = adm.native.assets.length; i < len; i++) {
        switch (adm.native.assets[i].id) {
          case NATIVE_ASSETS.TITLE.ID:
            newBid.native.title = adm.native.assets[i].title && adm.native.assets[i].title.text;
            break;
          case NATIVE_ASSETS.IMAGE.ID:
            newBid.native.image = {
              url: adm.native.assets[i].img && adm.native.assets[i].img.url,
              height: adm.native.assets[i].img && adm.native.assets[i].img.h,
              width: adm.native.assets[i].img && adm.native.assets[i].img.w,
            };
            break;
          case NATIVE_ASSETS.ICON.ID:
            newBid.native.icon = {
              url: adm.native.assets[i].img && adm.native.assets[i].img.url,
              height: adm.native.assets[i].img && adm.native.assets[i].img.h,
              width: adm.native.assets[i].img && adm.native.assets[i].img.w,
            };
            break;
          case NATIVE_ASSETS.SPONSOREDBY.ID:
          case NATIVE_ASSETS.SPONSORED.ID:
          case NATIVE_ASSETS.PRICE:
          case NATIVE_ASSETS.SALEPRICE.ID:
          case NATIVE_ASSETS.DESC.ID:
          case NATIVE_ASSETS.BODY.ID:
          case NATIVE_ASSETS.DISPLAYURL.ID:
          case NATIVE_ASSETS.CTA.ID:
            newBid.native[spec.NATIVE_ASSET_ID_TO_KEY_MAP[adm.native.assets[i].id]] = adm.native.assets[i].data && adm.native.assets[i].data.value;
            break;
        }
      }
      newBid.native.clickUrl = adm.native.link && adm.native.link.url;
      newBid.native.clickTrackers = (adm.native.link && adm.native.link.clicktrackers) || [];
      newBid.native.impressionTrackers = adm.native.imptrackers || [];
      newBid.native.jstracker = adm.native.jstracker || [];
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
    wWidth: w.innerWidth,
    wHeight: w.innerHeight,
    date: t.toUTCString(),
    timeOffset: t.getTimezoneOffset()
  };
}
