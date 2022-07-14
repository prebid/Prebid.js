import {deepAccess, isArray, logError} from '../src/utils.js';
import { getOrigin } from '../libraries/getOrigin/index.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {includes} from '../src/polyfill.js';

const BIDDER_CODE = 'rtbhouse';
const REGIONS = ['prebid-eu', 'prebid-us', 'prebid-asia'];
const ENDPOINT_URL = 'creativecdn.com/bidder/prebid/bids';
const DEFAULT_CURRENCY_ARR = ['USD']; // NOTE - USD is the only supported currency right now; Hardcoded for bids
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE];
const TTL = 55;
const GVLID = 16;

// Codes defined by OpenRTB Native Ads 1.1 specification
export const OPENRTB = {
  NATIVE: {
    IMAGE_TYPE: {
      ICON: 1,
      MAIN: 3,
    },
    ASSET_ID: {
      TITLE: 1,
      IMAGE: 2,
      ICON: 3,
      BODY: 4,
      SPONSORED: 5,
      CTA: 6
    },
    DATA_ASSET_TYPE: {
      SPONSORED: 1,
      DESC: 2,
      CTA_TEXT: 12,
    },
  }
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: function (bid) {
    return !!(includes(REGIONS, bid.params.region) && bid.params.publisherId);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const request = {
      id: validBidRequests[0].auctionId,
      imp: validBidRequests.map(slot => mapImpression(slot)),
      site: mapSite(validBidRequests, bidderRequest),
      cur: DEFAULT_CURRENCY_ARR,
      test: validBidRequests[0].params.test || 0,
      source: mapSource(validBidRequests[0]),
    };
    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
      const consentStr = (bidderRequest.gdprConsent.consentString)
        ? bidderRequest.gdprConsent.consentString.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '';
      const gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      request.regs = {ext: {gdpr: gdpr}};
      request.user = {ext: {consent: consentStr}};
    }
    if (validBidRequests[0].schain) {
      const schain = mapSchain(validBidRequests[0].schain);
      if (schain) {
        request.ext = {
          schain: schain,
        }
      }
    }

    if (validBidRequests[0].userIdAsEids) {
      const eids = { eids: validBidRequests[0].userIdAsEids };
      if (request.user && request.user.ext) {
        request.user.ext = { ...request.user.ext, ...eids };
      } else {
        request.user = {ext: eids};
      }
    }

    return {
      method: 'POST',
      url: 'https://' + validBidRequests[0].params.region + '.' + ENDPOINT_URL,
      data: JSON.stringify(request)
    };
  },
  interpretResponse: function (serverResponse, originalRequest) {
    const responseBody = serverResponse.body;
    if (!isArray(responseBody)) {
      return [];
    }

    const bids = [];
    responseBody.forEach(serverBid => {
      if (serverBid.price === 0) {
        return;
      }
      // try...catch would be risky cause JSON.parse throws SyntaxError
      if (serverBid.adm.indexOf('{') === 0) {
        bids.push(interpretNativeBid(serverBid));
      } else {
        bids.push(interpretBannerBid(serverBid));
      }
    });
    return bids;
  }
};
registerBidder(spec);

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {int} floor by imp type
 */
function applyFloor(slot) {
  const floors = [];
  if (typeof slot.getFloor === 'function') {
    Object.keys(slot.mediaTypes).forEach(type => {
      if (includes(SUPPORTED_MEDIA_TYPES, type)) {
        floors.push(slot.getFloor({ currency: DEFAULT_CURRENCY_ARR[0], mediaType: type, size: slot.sizes || '*' }).floor);
      }
    });
  }
  return floors.length > 0 ? Math.max(...floors) : parseFloat(slot.params.bidfloor);
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Imp by OpenRTB 2.5 §3.2.4
 */
function mapImpression(slot) {
  const imp = {
    id: slot.bidId,
    banner: mapBanner(slot),
    native: mapNative(slot),
    tagid: slot.adUnitCode.toString()
  };

  const bidfloor = applyFloor(slot);
  if (bidfloor) {
    imp.bidfloor = bidfloor;
  }

  return imp;
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Banner by OpenRTB 2.5 §3.2.6
 */
function mapBanner(slot) {
  if (slot.mediaType === 'banner' ||
    deepAccess(slot, 'mediaTypes.banner') ||
    (!slot.mediaType && !slot.mediaTypes)) {
    var sizes = slot.sizes || slot.mediaTypes.banner.sizes;
    return {
      w: sizes[0][0],
      h: sizes[0][1],
      format: sizes.map(size => ({
        w: size[0],
        h: size[1]
      }))
    };
  }
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @param {object} bidderRequest by Prebid
 * @returns {object} Site by OpenRTB 2.5 §3.2.13
 */
function mapSite(slot, bidderRequest) {
  let pubId = 'unknown';
  let channel = null;
  if (slot && slot.length > 0) {
    pubId = slot[0].params.publisherId;
    channel = slot[0].params.channel &&
    slot[0].params.channel
      .toString()
      .slice(0, 50);
  }
  let siteData = {
    publisher: {
      id: pubId.toString(),
    },
    page: bidderRequest.refererInfo.page,
    name: getOrigin()
  };
  if (channel) {
    siteData.channel = channel;
  }
  return siteData;
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Source by OpenRTB 2.5 §3.2.2
 */
function mapSource(slot) {
  const source = {
    tid: slot.transactionId,
  };

  return source;
}

/**
 * @param {object} schain object set by Publisher
 * @returns {object} OpenRTB SupplyChain object
 */
function mapSchain(schain) {
  if (!schain) {
    return null;
  }
  if (!validateSchain(schain)) {
    logError('RTB House: required schain params missing');
    return null;
  }
  return schain;
}

/**
 * @param {object} schain object set by Publisher
 * @returns {object} bool
 */
function validateSchain(schain) {
  if (!schain.nodes) {
    return false;
  }
  const requiredFields = ['asi', 'sid', 'hp'];
  return schain.nodes.every(node => {
    return requiredFields.every(field => node[field]);
  });
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Request by OpenRTB Native Ads 1.1 §4
 */
function mapNative(slot) {
  if (slot.mediaType === 'native' || deepAccess(slot, 'mediaTypes.native')) {
    return {
      request: {
        assets: mapNativeAssets(slot)
      },
      ver: '1.1'
    }
  }
}

/**
 * @param {object} slot Slot config by Prebid
 * @returns {array} Request Assets by OpenRTB Native Ads 1.1 §4.2
 */
function mapNativeAssets(slot) {
  const params = slot.nativeParams || deepAccess(slot, 'mediaTypes.native');
  const assets = [];
  if (params.title) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.TITLE,
      required: params.title.required ? 1 : 0,
      title: {
        len: params.title.len || 25
      }
    })
  }
  if (params.image) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.IMAGE,
      required: params.image.required ? 1 : 0,
      img: mapNativeImage(params.image, OPENRTB.NATIVE.IMAGE_TYPE.MAIN)
    })
  }
  if (params.icon) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.ICON,
      required: params.icon.required ? 1 : 0,
      img: mapNativeImage(params.icon, OPENRTB.NATIVE.IMAGE_TYPE.ICON)
    })
  }
  if (params.sponsoredBy) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.SPONSORED,
      required: params.sponsoredBy.required ? 1 : 0,
      data: {
        type: OPENRTB.NATIVE.DATA_ASSET_TYPE.SPONSORED,
        len: params.sponsoredBy.len
      }
    })
  }
  if (params.body) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.BODY,
      required: params.body.request ? 1 : 0,
      data: {
        type: OPENRTB.NATIVE.DATA_ASSET_TYPE.DESC,
        len: params.body.len
      }
    })
  }
  if (params.cta) {
    assets.push({
      id: OPENRTB.NATIVE.ASSET_ID.CTA,
      required: params.cta.required ? 1 : 0,
      data: {
        type: OPENRTB.NATIVE.DATA_ASSET_TYPE.CTA_TEXT,
        len: params.cta.len
      }
    })
  }
  return assets;
}

/**
 * @param {object} image Prebid native.image/icon
 * @param {int} type Image or icon code
 * @returns {object} Request Image by OpenRTB Native Ads 1.1 §4.4
 */
function mapNativeImage(image, type) {
  const img = {type: type};
  if (image.aspect_ratios) {
    const ratio = image.aspect_ratios[0];
    const minWidth = ratio.min_width || 100;
    img.wmin = minWidth;
    img.hmin = (minWidth / ratio.ratio_width * ratio.ratio_height);
  }
  if (image.sizes) {
    const size = Array.isArray(image.sizes[0]) ? image.sizes[0] : image.sizes;
    img.w = size[0];
    img.h = size[1];
  }
  return img
}

/**
 * @param {object} serverBid Bid by OpenRTB 2.5 §4.2.3
 * @returns {object} Prebid banner bidObject
 */
function interpretBannerBid(serverBid) {
  return {
    requestId: serverBid.impid,
    mediaType: BANNER,
    cpm: serverBid.price,
    creativeId: serverBid.adid,
    ad: serverBid.adm,
    width: serverBid.w,
    height: serverBid.h,
    ttl: TTL,
    meta: {
      advertiserDomains: serverBid.adomain
    },
    netRevenue: true,
    currency: 'USD'
  }
}

/**
 * @param {object} serverBid Bid by OpenRTB 2.5 §4.2.3
 * @returns {object} Prebid native bidObject
 */
function interpretNativeBid(serverBid) {
  return {
    requestId: serverBid.impid,
    mediaType: NATIVE,
    cpm: serverBid.price,
    creativeId: serverBid.adid,
    width: 1,
    height: 1,
    ttl: TTL,
    meta: {
      advertiserDomains: serverBid.adomain
    },
    netRevenue: true,
    currency: 'USD',
    native: interpretNativeAd(serverBid.adm),
  }
}

/**
 * @param {string} adm JSON-encoded Request by OpenRTB Native Ads 1.1 §4.1
 * @returns {object} Prebid bidObject.native
 */
function interpretNativeAd(adm) {
  const native = JSON.parse(adm).native;
  const result = {
    clickUrl: encodeURIComponent(native.link.url),
    impressionTrackers: native.imptrackers
  };
  native.assets.forEach(asset => {
    switch (asset.id) {
      case OPENRTB.NATIVE.ASSET_ID.TITLE:
        result.title = asset.title.text;
        break;
      case OPENRTB.NATIVE.ASSET_ID.IMAGE:
        result.image = {
          url: encodeURIComponent(asset.img.url),
          width: asset.img.w,
          height: asset.img.h
        };
        break;
      case OPENRTB.NATIVE.ASSET_ID.ICON:
        result.icon = {
          url: encodeURIComponent(asset.img.url),
          width: asset.img.w,
          height: asset.img.h
        };
        break;
      case OPENRTB.NATIVE.ASSET_ID.BODY:
        result.body = asset.data.value;
        break;
      case OPENRTB.NATIVE.ASSET_ID.SPONSORED:
        result.sponsoredBy = asset.data.value;
        break;
      case OPENRTB.NATIVE.ASSET_ID.CTA:
        result.cta = asset.data.value;
        break;
    }
  });
  return result;
}
