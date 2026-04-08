import { getDNT } from '../libraries/dnt/index.js';
import { getUserSyncs } from '../libraries/mgidUtils/mgidUtils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { getDevicePixelRatio } from '../libraries/devicePixelRatio/devicePixelRatio.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { toOrtbNativeRequest } from '../src/native.js';
import { NATIVE_ASSET_TYPES, NATIVE_IMAGE_TYPES } from '../src/constants.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  deepAccess,
  deepSetValue,
  getBidIdParameter,
  isArray,
  isEmpty,
  isFn,
  isInteger,
  isNumber,
  isPlainObject,
  isStr,
  logInfo,
  logWarn,
  setOnAny,
  triggerNurlWithCpm,
  triggerPixel,
} from '../src/utils.js';

/**
 * @typedef {import('../src/adapterManager.js').BidRequest} BidRequest
 * @typedef {import('../src/bidfactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const GVLID = 358;
const DEFAULT_CUR = 'USD';
const BIDDER_CODE = 'mgid';
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
const ENDPOINT_URL = 'https://prebid.mgid.com/prebid/';
const LOG_WARN_PREFIX = '[MGID warn]: ';
const LOG_INFO_PREFIX = '[MGID info]: ';
const DEFAULT_IMAGE_WIDTH = 492;
const DEFAULT_IMAGE_HEIGHT = 328;
const DEFAULT_ICON_WIDTH = 50;
const DEFAULT_ICON_HEIGHT = 50;

// Supported native asset keys for isBidRequestValid
const SUPPORTED_NATIVE_KEYS = new Set([
  'title', 'image', 'icon', 'sponsoredBy', 'data', 'price',
  'saleprice', 'displayurl', 'cta', 'body', 'sponsored',
]);

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 1800,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = bidRequest.adUnitCode;
    imp.secure = window.location.protocol === 'https:' ? 1 : 0;
    imp.displaymanager = 'Prebid.js';
    imp.displaymanagerver = '$prebid.version$';

    const floorData = getBidFloor(bidRequest, context.currency || DEFAULT_CUR);
    if (floorData.floor) {
      imp.bidfloor = floorData.floor;
      if (floorData.cur) {
        imp.bidfloorcur = floorData.cur;
      } else {
        delete imp.bidfloorcur;
      }
    }
    const nativeReq = bidRequest.nativeOrtbRequest || toOrtbNativeRequest(bidRequest.nativeParams || deepAccess(bidRequest, 'mediaTypes.native'));
    if (nativeReq) {
      try {
        populateNativeImp(imp, nativeReq);
      } catch (e) {
        logWarn(LOG_WARN_PREFIX + `populateNativeImp failed: ${e.message}`);
        return null;
      }
    }

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const validImps = imps.filter(imp => imp != null);
    if (validImps.length === 0) {
      return;
    }
    const request = buildRequest(validImps, bidderRequest, context);

    populateRequest(request, context);

    logInfo(LOG_INFO_PREFIX + `buildRequest:`, request);
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    if (bid.mtype === 4 || deepAccess(bid, 'ext.crtype') === 'native') {
      context.mediaType = NATIVE;
    } else if (bid.mtype === 1 || !bid.mtype) {
      context.mediaType = BANNER;
    }

    const bidResponse = buildBidResponse(bid, context);

    bidResponse.nurl = bid.nurl || '';
    bidResponse.burl = bid.burl || '';
    bidResponse.isBurl = isStr(bid.burl) && bid.burl.length > 0;

    if (bid.exp) {
      bidResponse.ttl = bid.exp;
    } else if (bid.ttl) {
      bidResponse.ttl = bid.ttl;
    }

    const { seatbid } = context;
    if (isStr(seatbid?.seat)) {
      bidResponse.meta = bidResponse.meta || {};
      bidResponse.meta.seat = seatbid.seat;
    }
    if (bidResponse.mediaType === NATIVE && isEmpty(deepAccess(bidResponse, 'native.ortb.assets'))) {
      return;
    }

    return bidResponse;
  },
  response(buildResponse, bidResponses, ortbResponse, context) {
    const muidn = deepAccess(ortbResponse, 'ext.muidn');
    if (isStr(muidn) && muidn.length > 0) {
      setLocalStorageSafely('mgMuidn', muidn);
    }
    return buildResponse(bidResponses, ortbResponse, context);
  },
});

export const spec = {
  VERSION: '2.0',
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, NATIVE],
  reId: /^[1-9][0-9]*$/,
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
          const supportProp = SUPPORTED_NATIVE_KEYS.has(k);
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
    return (bannerOk || nativeOk) && isPlainObject(bid.params) && !!bid.adUnitCode && isStr(bid.adUnitCode) && !!acc && acc > 0 && bid.params.accountId.toString().search(spec.reId) === 0;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    logInfo(LOG_INFO_PREFIX + `buildRequests`);
    if (validBidRequests.length === 0) {
      return;
    }

    const accountId = setOnAny(validBidRequests, 'params.accountId');
    const muid = getLocalStorageSafely('mgMuidn');
    let url = (setOnAny(validBidRequests, 'params.bidUrl') || ENDPOINT_URL) + accountId;
    if (isStr(muid) && muid.length > 0) {
      url += '?muid=' + muid;
    }

    const currency = setOnAny(validBidRequests, 'params.currency') ||
      setOnAny(validBidRequests, 'params.cur') ||
      deepAccess(bidderRequest, 'ortb2.ext.prebid.adServerCurrency') ||
      DEFAULT_CUR;
    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest, context: { currency } });
    if (!data) {
      return;
    }

    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(data),
      ortbRequest: data,
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param request
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse, request) => {
    logInfo(LOG_INFO_PREFIX + `interpretResponse`, serverResponse);
    if (!serverResponse?.body?.seatbid?.length) {
      return [];
    }

    const { bids } = converter.fromORTB({ response: serverResponse.body, request: request.ortbRequest });

    logInfo(LOG_INFO_PREFIX + `interpretedResponse`, bids);
    return bids;
  },

  onBidWon: (bid) => {
    const cpm = deepAccess(bid, 'adserverTargeting.hb_pb') || '';
    triggerNurlWithCpm(bid, cpm);
    if (bid.isBurl) {
      if (bid.mediaType === BANNER) {
        bid.ad = bid.ad.replace(/\${AUCTION_PRICE}/, cpm);
      } else {
        bid.burl = bid.burl.replace(/\${AUCTION_PRICE}/, cpm);
        triggerPixel(bid.burl);
      }
    }
    logInfo(LOG_INFO_PREFIX + `onBidWon`);
  },

  getUserSyncs: getUserSyncs,
};

registerBidder(spec);

function populateNativeImp(imp, nativeReq) {
  if (!nativeReq) {
    return;
  }
  nativeReq.context = nativeReq.context || 1;
  nativeReq.plcmttype = nativeReq.plcmttype || 11;
  nativeReq.plcmtcnt = nativeReq.plcmtcnt || 1;
  nativeReq.privacy = nativeReq.privacy || 1;
  if (!nativeReq.eventtrackers) {
    nativeReq.eventtrackers = [{ event: 1, methods: [1, 2] }];
  }
  let hasTitle = false;
  let hasImage = false;
  let hasSponsor = false;
  if (isArray(nativeReq.assets)) {
    nativeReq.assets.forEach(asset => {
      if (asset.title) {
        hasTitle = true;
      }
      if (asset.img) {
        const isIcon = asset.img.type === NATIVE_IMAGE_TYPES.ICON;
        if (!isIcon) {
          hasImage = true;
        }
        if (!asset.img.w) {
          asset.img.w = isIcon ? DEFAULT_ICON_WIDTH : DEFAULT_IMAGE_WIDTH;
        }
        if (!asset.img.h) {
          asset.img.h = isIcon ? DEFAULT_ICON_HEIGHT : DEFAULT_IMAGE_HEIGHT;
        }
      }
      if (asset.data && asset.data.type === NATIVE_ASSET_TYPES.sponsored) {
        hasSponsor = true;
      }
    });
  }
  if (!hasTitle || !hasImage || !hasSponsor) {
    logWarn(LOG_WARN_PREFIX + 'Native request missing required assets (title, image, sponsoredBy)');
    throw new Error('Native request missing required assets (title, image, sponsoredBy)');
  }
  imp.native = {
    ver: '1.2',
    request: JSON.stringify(nativeReq),
  };
}

function populateRequest(request, context) {
  deepSetValue(request, 'ext.mgid_ver', spec.VERSION);

  if (!request.cur) {
    request.cur = [context.currency];
  }

  if (!isInteger(deepAccess(request, 'source.fd'))) {
    deepSetValue(request, 'source.fd', 1);
  }

  if (!request.device) {
    request.device = {};
  }
  if (!isInteger(deepAccess(request.device, 'dnt'))) {
    request.device.dnt = getDNT() ? 1 : 0;
  }
  if (!isInteger(deepAccess(request.device, 'js'))) {
    request.device.js = 1;
  }
  if (!isNumber(deepAccess(request.device, 'pxratio'))) {
    deepSetValue(request, 'device.pxratio', getDevicePixelRatio(window.top));
  }
  if (!isInteger(deepAccess(request.device, 'devicetype'))) {
    deepSetValue(request, 'device.devicetype', getDeviceType());
  }
  if (!isPlainObject(deepAccess(request.device, 'sua'))) {
    const sua = getSUA();
    if (sua) {
      deepSetValue(request, 'device.sua', sua);
    }
  }
  if (!isInteger(deepAccess(request.device, 'geo.utcoffset'))) {
    const existingGeo = deepAccess(request.device, 'geo') || {};
    deepSetValue(request, 'device.geo', { ...existingGeo, utcoffset: new Date().getTimezoneOffset() * -1 + 0 });
  }

  const accountId = setOnAny(context.bidRequests, 'params.accountId');
  if (!isStr(deepAccess(request, 'site.publisher.id'))) {
    deepSetValue(request, 'site.publisher.id', String(accountId));
  }
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return 5;
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 4;
  }
  return 2;
}

function getSUA() {
  if (!navigator.userAgentData) {
    return null;
  }
  const uad = navigator.userAgentData;
  const sua = { mobile: uad.mobile ? 1 : 0 };
  if (isArray(uad.brands) && uad.brands.length > 0) {
    sua.browsers = uad.brands.map(b => ({ brand: b.brand, version: [b.version] }));
  }
  if (isStr(uad.platform)) {
    sua.platform = { brand: uad.platform };
  }
  return sua;
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

function getBidFloor(bid, reqCur) {
  let bidFloor = getBidIdParameter('bidfloor', bid.params) || getBidIdParameter('bidFloor', bid.params) || 0;
  let cur = '';
  if (!bidFloor && isFn(bid.getFloor)) {
    const floorObj = bid.getFloor({ currency: '*', mediaType: '*', size: '*' });
    if (isPlainObject(floorObj) && !isNaN(floorObj.floor)) {
      bidFloor = floorObj.floor;
      const floorCur = isStr(floorObj.currency) ? floorObj.currency : DEFAULT_CUR;
      if (floorCur !== reqCur) {
        cur = floorCur;
      }
    }
  }
  return { floor: bidFloor, cur: cur };
}
