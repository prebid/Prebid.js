import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {convertCamelToUnderscore, isArray, isNumber, isPlainObject, isStr, replaceAuctionPrice} from '../src/utils.js';
import {find} from '../src/polyfill.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BID_METHOD = 'POST';
const BIDDER_URL = 'https://ad.ventesavenues.in/va/ad';

function groupBy(values, key) {
  const groups = values.reduce((acc, value) => {
    const groupId = value[key];

    if (!acc[groupId]) acc[groupId] = [];
    acc[groupId].push(value);

    return acc;
  }, {});

  return Object
    .keys(groups)
    .map(id => ({
      id,
      key,
      values: groups[id]
    }));
}

function validateMediaTypes(mediaTypes, allowedMediaTypes) {
  if (!isPlainObject(mediaTypes)) return false;
  if (!allowedMediaTypes.some(mediaType => mediaType in mediaTypes)) return false;

  if (isBanner(mediaTypes)) {
    if (!validateBanner(mediaTypes.banner)) return false;
  }
  return true;
}

function isBanner(mediaTypes) {
  return isPlainObject(mediaTypes) && isPlainObject(mediaTypes.banner);
}

function validateBanner(banner) {
  return isPlainObject(banner) &&
      isArray(banner.sizes) &&
      (banner.sizes.length > 0) &&
      banner.sizes.every(validateMediaSizes);
}

function validateMediaSizes(mediaSize) {
  return isArray(mediaSize) &&
      (mediaSize.length === 2) &&
      mediaSize.every(size => (isNumber(size) && size >= 0));
}

function hasUserInfo(bid) {
  return !!bid.params.user;
}

function validateParameters(parameters) {
  if (!(parameters.placementId)) {
    return false;
  }
  if (!(parameters.publisherId)) {
    return false;
  }

  return true;
}

function generateSiteFromAdUnitContext(bidRequests, adUnitContext) {
  if (!adUnitContext || !adUnitContext.refererInfo) return null;

  const domain = adUnitContext.refererInfo.domain;
  const publisherId = bidRequests[0].params.publisherId;

  if (!domain) return null;

  return {
    page: adUnitContext.refererInfo.page,
    domain: domain,
    name: domain,
    publisher: {
      id: publisherId
    }
  };
}

function validateServerRequest(serverRequest) {
  return isPlainObject(serverRequest) &&
      isPlainObject(serverRequest.data) &&
      isArray(serverRequest.data.imp)
}

function createServerRequestFromAdUnits(adUnits, bidRequestId, adUnitContext) {
  return {
    method: BID_METHOD,
    url: BIDDER_URL,
    data: generateBidRequestsFromAdUnits(adUnits, bidRequestId, adUnitContext),
    options: {
      contentType: 'application/json',
      withCredentials: false,
    }
  }
}

function generateBidRequestsFromAdUnits(bidRequests, bidRequestId, adUnitContext) {
  const userObjBid = find(bidRequests, hasUserInfo);
  let userObj = {};
  if (userObjBid) {
    Object.keys(userObjBid.params.user)
      .forEach((param) => {
        let uparam = convertCamelToUnderscore(param);
        if (param === 'segments' && isArray(userObjBid.params.user[param])) {
          let segs = [];
          userObjBid.params.user[param].forEach(val => {
            if (isNumber(val)) {
              segs.push({
                'id': val
              });
            } else if (isPlainObject(val)) {
              segs.push(val);
            }
          });
          userObj[uparam] = segs;
        } else if (param !== 'segments') {
          userObj[uparam] = userObjBid.params.user[param];
        }
      });
  }

  const deviceObjBid = find(bidRequests, hasDeviceInfo);
  let deviceObj;
  if (deviceObjBid && deviceObjBid.params && deviceObjBid.params.device) {
    deviceObj = {};
    Object.keys(deviceObjBid.params.device)
      .forEach(param => deviceObj[param] = deviceObjBid.params.device[param]);
    if (!deviceObjBid.hasOwnProperty('ua')) {
      deviceObj.ua = navigator.userAgent;
    }
    if (!deviceObjBid.hasOwnProperty('language')) {
      deviceObj.language = navigator.language;
    }
  } else {
    deviceObj = {};
    deviceObj.ua = navigator.userAgent;
    deviceObj.language = navigator.language;
  }

  const payload = {}
  payload.id = bidRequestId
  payload.at = 1
  payload.cur = ['USD']
  payload.imp = bidRequests.reduce(generateImpressionsFromAdUnit, [])
  const appDeviceObjBid = find(bidRequests, hasAppInfo);
  if (!appDeviceObjBid) {
    payload.site = generateSiteFromAdUnitContext(bidRequests, adUnitContext)
  } else {
    let appIdObj;
    if (appDeviceObjBid && appDeviceObjBid.params && appDeviceObjBid.params.app && appDeviceObjBid.params.app.id) {
      appIdObj = {};
      Object.keys(appDeviceObjBid.params.app)
        .forEach(param => appIdObj[param] = appDeviceObjBid.params.app[param]);
    }
    payload.app = appIdObj;
  }
  payload.device = deviceObj;
  payload.user = userObj
  return payload
}

function generateImpressionsFromAdUnit(acc, adUnit) {
  const {
    bidId,
    mediaTypes,
    params
  } = adUnit;
  const {
    placementId
  } = params;
  const pmp = {};

  if (placementId) pmp.deals = [{ id: placementId }]

  const imps = Object
    .keys(mediaTypes)
    .reduce((acc, mediaType) => {
      const data = mediaTypes[mediaType];
      const impId = `${bidId}`;

      if (mediaType === 'banner') return acc.concat(generateBannerFromAdUnit(impId, data, params));
    }, []);

  return acc.concat(imps);
}

function generateBannerFromAdUnit(impId, data, params) {
  const {
    position,
    placementId
  } = params;
  const pos = position || 0;
  const pmp = {};
  const ext = {
    placementId
  };

  if (placementId) pmp.deals = [{ id: placementId }]

  return data.sizes.map(([w, h]) => ({
    id: `${impId}`,
    banner: {
      format: [{
        w,
        h
      }],
      w,
      h,
      pos
    },
    pmp,
    ext,
    tagid: placementId
  }));
}

function validateServerResponse(serverResponse) {
  return isPlainObject(serverResponse) &&
      isPlainObject(serverResponse.body) &&
      isStr(serverResponse.body.cur) &&
      isArray(serverResponse.body.seatbid);
}

function seatBidsToAds(seatBid, bidResponse, serverRequest) {
  return seatBid.bid
    .filter(bid => validateBids(bid))
    .map(bid => generateAdFromBid(bid, bidResponse));
}

function validateBids(bid) {
  if (!isPlainObject(bid)) return false;
  if (!isStr(bid.impid)) return false;
  if (!isStr(bid.crid)) return false;
  if (!isNumber(bid.price)) return false;
  if (!isNumber(bid.w)) return false;
  if (!isNumber(bid.h)) return false;
  if (!bid.adm) return false;
  if (bid.adm) {
    if (!isStr(bid.adm)) return false;
  }
  return true;
}

function getMediaType(adm) {
  const videoRegex = new RegExp(/VAST\s+version/);

  if (videoRegex.test(adm)) {
    return VIDEO;
  }

  const markup = safeJSONparse(adm.replace(/\\/g, ''));

  if (markup && isPlainObject(markup.native)) {
    return NATIVE;
  }

  return BANNER;
}

function safeJSONparse(...args) {
  try {
    return JSON.parse(...args);
  } catch (_) {
    return undefined;
  }
}

function generateAdFromBid(bid, bidResponse) {
  const mediaType = getMediaType(bid.adm);
  const base = {
    requestId: bid.impid,
    cpm: bid.price,
    currency: bidResponse.cur,
    ttl: 10,
    creativeId: bid.crid,
    mediaType: mediaType,
    netRevenue: true
  };

  if (bid.adomain) {
    base.meta = {
      advertiserDomains: bid.adomain
    };
  }

  const size = getSizeFromBid(bid);
  const creative = getCreativeFromBid(bid);

  return {
    ...base,
    height: size.height,
    width: size.width,
    ad: creative.markup,
    adUrl: creative.markupUrl,
    renderer: creative.renderer
  };
}

function getSizeFromBid(bid) {
  if (isNumber(bid.w) && isNumber(bid.h)) {
    return {
      width: bid.w,
      height: bid.h
    };
  }
  return {
    width: null,
    height: null
  };
}

function getCreativeFromBid(bid) {
  const shouldUseAdMarkup = !!bid.adm;
  const price = bid.price;
  return {
    markup: shouldUseAdMarkup ? replaceAuctionPrice(bid.adm, price) : null,
    markupUrl: !shouldUseAdMarkup ? replaceAuctionPrice(bid.nurl, price) : null
  };
}

function hasDeviceInfo(bid) {
  if (bid.params) {
    return !!bid.params.device
  }
}

function hasAppInfo(bid) {
  if (bid.params) {
    return !!bid.params.app
  }
}

const venavenBidderSpec = {
  code: 'ventes',
  supportedMediaTypes: [BANNER],
  isBidRequestValid(adUnit) {
    const allowedBidderCodes = [this.code];

    return isPlainObject(adUnit) &&
          allowedBidderCodes.indexOf(adUnit.bidder) !== -1 &&
          isStr(adUnit.adUnitCode) &&
          isStr(adUnit.bidderRequestId) &&
          isStr(adUnit.bidId) &&
          validateMediaTypes(adUnit.mediaTypes, this.supportedMediaTypes) &&
          validateParameters(adUnit.params);
  },
  buildRequests(bidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    bidRequests = convertOrtbRequestToProprietaryNative(bidRequests);

    if (!bidRequests) return null;

    return groupBy(bidRequests, 'bidderRequestId').map(group => {
      const bidRequestId = group.id;
      const adUnits = groupBy(group.values, 'bidId').map((group) => {
        const length = group.values.length;
        return length > 0 && group.values[length - 1]
      });

      return createServerRequestFromAdUnits(adUnits, bidRequestId, bidderRequest)
    });
  },
  interpretResponse(serverResponse, serverRequest) {
    if (!validateServerRequest(serverRequest)) return [];
    if (!validateServerResponse(serverResponse)) return [];

    const bidResponse = serverResponse.body;

    return bidResponse.seatbid
      .filter(seatBid => isPlainObject(seatBid) && isArray(seatBid.bid))
      .reduce((acc, seatBid) => acc.concat(seatBidsToAds(seatBid, bidResponse, serverRequest)), []);
  }
};

registerBidder(venavenBidderSpec);

export {
  venavenBidderSpec as spec
};
