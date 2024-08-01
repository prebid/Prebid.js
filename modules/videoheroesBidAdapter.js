import { isEmpty, parseUrl, isPlainObject, isArray, isArrayOfNums, isFn, isStr, triggerPixel } from '../src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'videoheroes';
const MEDIA_TYPES = [BANNER, VIDEO, NATIVE];
const DEF_FLOOR = 0.05;
const CUR = 'USD';
const TTL = 1200;
const ENDPOINT_URL = `https://point.contextualadv.com/?t=2&partner=`;

const NATIVE_ASSETS_IDS = { 1: 'title', 2: 'icon', 3: 'image', 4: 'sponsoredBy', 5: 'body', 6: 'rating', 7: 'downloads', 8: 'cta' };

const NATIVE_ASSETS_TYPES = {
  title: {id: 1, title: {len: 25}},
  icon: {id: 2, img: {type: 1}},
  image: {id: 3, img: {type: 3}},
  sponsoredBy: {id: 4, data: {type: 1, len: 30}},
  body: {id: 5, data: {type: 2, len: 100}},
  rating: {id: 6, data: {type: 3, len: 25}},
  downloads: {id: 7, data: {type: 5, len: 25}},
  cta: {id: 8, data: {type: 12, len: 25}}
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: MEDIA_TYPES,

  isBidRequestValid: (bid) => {
    const { params, mediaTypes } = bid;

    if (isStr(params.placementId) && params.placementId.length === 32 && mediaTypes) {
      if (
        (mediaTypes[BANNER] && mediaTypes[BANNER].sizes) ||
        (mediaTypes[VIDEO] && mediaTypes[VIDEO].playerSize) ||
        (mediaTypes[NATIVE])
      ) { return true; }
    }

    return false;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    if (bidderRequest == undefined || validBidRequests[0] == undefined) { return []; }

    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    let data = {̉̉
      id: bidderRequest.bidderRequestId,
      imp: validBidRequests.map(adUnit => prepareImpression(adUnit)),
      site: prepareSite(validBidRequests[0], bidderRequest),
      device: bidderRequest.ortb2?.device || prepareDevice(),
      tmax: bidderRequest.timeout,
      cur: [ CUR ],
      user: { ext: {} },
      regs: { ext: {}, coppa: config.getConfig('coppa') == true ? 1 : 0 },
      source: { ext: { schain: validBidRequests[0].schain } }
    };

    prepareConsents(data, bidderRequest);
    prepareEids(data, validBidRequests[0]);

    return {
      method: 'POST',
      url: ENDPOINT_URL + validBidRequests[0].params.placementId,
      data: data
    };
  },

  interpretResponse: (serverResponse) => {
    if (!serverResponse || isEmpty(serverResponse.body)) {
      return [];
    }

    const bidsArray = serverResponse.body.seatbid[0].bid.map((bidItem) => {
      let bidObject = {
        requestId: bidItem.impid,
        cpm: bidItem.price,
        width: bidItem.w,
        height: bidItem.h,
        ttl: TTL,
        currency: CUR,
        mediaType: bidItem?.ext?.mediaType ? bidItem.ext.mediaType : BANNER,
        nurl: bidItem.nurl,
        dealId: bidItem.dealid || null,
        creativeId: bidItem.crid,
        netRevenue: true
      }

      if (bidObject.mediaType === VIDEO) {
        bidObject.vastXml = bidItem.adm;
      } else if (bidObject.mediaType === NATIVE) {
        bidObject.native = prepareNativeAd(bidItem.adm);
      } else {
        bidObject.ad = bidItem.adm;
      }

      return bidObject;
    });

    return bidsArray;
  },

  onBidWon: (bid) => {
    if (isStr(bid.nurl)) {
      triggerPixel(bid.nurl);
    }
  }
};

registerBidder(spec);

const getMediaTypeValues = {
  [BANNER]: (adUnit) => {
    let [w, h] = [300, 250];
    let format = [];

    if (isArrayOfNums(adUnit.mediaTypes.banner.sizes)) {
      [w, h] = adUnit.mediaTypes.banner.sizes;
    } else if (isArray(adUnit.mediaTypes.banner.sizes)) {
      [w, h] = adUnit.mediaTypes.banner.sizes[0];
      if (adUnit.mediaTypes.banner.sizes.length > 1) { format = adUnit.mediaTypes.banner.sizes.map((size) => ({ w: size[0], h: size[1] })); }
    }

    return {
      w,
      h,
      format
    }
  },
  [NATIVE]: (adUnit) => {
    let req = {
      assets: []
    };

    let assets = Object.keys(adUnit.mediaTypes.native);

    for (let asset of assets) {
      if (NATIVE_ASSETS_TYPES[asset]) {
        const assetItem = { ...NATIVE_ASSETS_TYPES[asset] };
        let assetName = NATIVE_ASSETS_IDS[assetItem.id];
        assetItem[assetName] = {...NATIVE_ASSETS_TYPES[asset][assetName]};

        assetItem[assetName].required = adUnit.mediaTypes.native[asset].required ? 1 : 0;
        if (adUnit.mediaTypes.native[asset].len) { assetItem[assetName].len = adUnit.mediaTypes.native[asset].len; }
        if (adUnit.mediaTypes.native[asset].sizes) {
          const size = Array.isArray(adUnit.mediaTypes.native[asset].sizes[0]) ? adUnit.mediaTypes.native[asset].sizes[0] : adUnit.mediaTypes.native[asset].sizes;
          assetItem[assetName].w = size[0];
          assetItem[assetName].h = size[1];
        }

        req.assets.push(assetItem);
      }
    }

    return {
      ver: '1.2',
      request: req
    }
  },
  [VIDEO]: (adUnit) => {
    let videoObj = {...adUnit.mediaTypes.video};

    if (videoObj.playerSize) {
      const size = Array.isArray(videoObj.playerSize[0]) ? videoObj.playerSize[0] : videoObj.playerSize;
      videoObj.w = size[0];
      videoObj.h = size[1];
    } else {
      videoObj.w = 640;
      videoObj.h = 480;
    }

    return videoObj;
  }
}

function getFloor(adUnit, mediaType) {
  let floor = DEF_FLOOR;

  if (!isFn(adUnit.getFloor)) {
    return floor;
  }

  let floorObj = adUnit.getFloor({
    currency: DEF_FLOOR,
    mediaType,
    size: '*'
  });

  if (isPlainObject(floorObj) && !isNaN(parseFloat(floorObj.floor))) {
    floor = parseFloat(floorObj.floor) || floor;
  }

  return floor;
}

function prepareImpression(adUnit) {
  let mediaType = Object.keys(adUnit.mediaTypes)[0];

  const impObj = {
    id: adUnit.bidId,
    secure: window.location.protocol.indexOf('https') !== -1 ? 1 : 0,
    bidfloor: getFloor(adUnit, mediaType)
  };

  impObj[mediaType] = getMediaTypeValues[mediaType](adUnit);
}

function prepareSite(adUnit, request) {
  let siteObj = {};

  siteObj.publisher = {
    id: adUnit.params.placementId.toString()
  };

  siteObj.domain = parseUrl(request.refererInfo.page || request.refererInfo.topmostLocation).hostname;
  siteObj.page = request.refererInfo.page || request.refererInfo.topmostLocation;

  if (request.refererInfo.ref) {
    siteObj.site.ref = request.refererInfo.ref;
  }

  return siteObj;
}

function prepareConsents(data, request) {
  if (request.gdprConsent !== undefined) {
    data.regs.ext.gdpr = request.gdprConsent.gdprApplies ? 1 : 0;
    data.user.ext.consent = request.gdprConsent.consentString ? request.gdprConsent.consentString : '';
  }

  if (request.uspConsent !== undefined) {
    data.regs.ext.us_privacy = request.uspConsent;
  }

  return true;
}

function prepareEids(data, adUnit) {
  if (adUnit.userIdAsEids !== undefined) {
    data.user.ext.eids = adUnit.userIdAsEids;
  }

  return true;
}

function prepareNativeAd(adm) {
  const nativeObj = JSON.parse(adm).native;

  let native = {
    impressionTrackers: nativeObj.imptrackers || [],
    jstracker: nativeObj.jstracker || []
  };

  if (nativeObj.link) {
    native.clickUrl = nativeObj.link.url || '';
    native.clickTrackers = nativeObj.link.clicktrackers || [];
  }

  nativeObj.assets.forEach(asset => {
    let kind = NATIVE_ASSETS_IDS[asset.id];

    if (asset.title != undefined) {
      native[kind] = asset.title.text;
    } else if (asset.img != undefined) {
      native[kind] = {url: asset.img.url, width: asset.img.w, height: asset.img.h};
    } else if (asset.data != undefined) {
      native[kind] = asset.data.value;
    }
  });

  return native;
}
