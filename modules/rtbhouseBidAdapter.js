import {deepAccess, deepClone, isArray, logError, mergeDeep, isEmpty, isPlainObject, isNumber, isStr, deepSetValue} from '../src/utils.js';
import {getOrigin} from '../libraries/getOrigin/index.js';
import {BANNER, NATIVE} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

import {convertOrtbRequestToProprietaryNative} from '../src/native.js';
import { interpretNativeBid, OPENRTB } from '../libraries/precisoUtils/bidNativeUtils.js';

const BIDDER_CODE = 'rtbhouse';
const REGIONS = ['prebid-eu', 'prebid-us', 'prebid-asia'];
const ENDPOINT_URL = 'creativecdn.com/bidder/prebid/bids';

const DEFAULT_CURRENCY_ARR = ['USD']; // NOTE - USD is the only supported currency right now; Hardcoded for bids
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE];
const TTL = 55;
const GVLID = 16;

const DSA_ATTRIBUTES = [
  { name: 'dsarequired', 'min': 0, 'max': 3 },
  { name: 'pubrender', 'min': 0, 'max': 2 },
  { name: 'datatopub', 'min': 0, 'max': 2 }
];

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: function (bid) {
    return !!(REGIONS.includes(bid.params.region) && bid.params.publisherId);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const request = {
      id: bidderRequest.bidderRequestId,
      imp: validBidRequests.map(slot => mapImpression(slot, bidderRequest)),
      site: mapSite(validBidRequests, bidderRequest),
      cur: DEFAULT_CURRENCY_ARR,
      test: validBidRequests[0].params.test || 0,
      source: mapSource(validBidRequests[0], bidderRequest),
    };

    if (bidderRequest && bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies) {
      const consentStr = (bidderRequest.gdprConsent.consentString)
        ? bidderRequest.gdprConsent.consentString.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : '';
      const gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      request.regs = {ext: {gdpr: gdpr}};
      request.user = {ext: {consent: consentStr}};
    }
    const bidSchain = validBidRequests[0]?.ortb2?.source?.ext?.schain;
    if (bidSchain) {
      const schain = mapSchain(bidSchain);
      if (schain) {
        request.ext = {
          schain: schain,
        };
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

    const ortb2Params = bidderRequest?.ortb2 || {};
    ['site', 'user', 'device', 'bcat', 'badv'].forEach(entry => {
      const ortb2Param = ortb2Params[entry];
      if (ortb2Param) {
        mergeDeep(request, { [entry]: ortb2Param });
      }
    });

    const dsa = deepAccess(ortb2Params, 'regs.ext.dsa');
    if (validateDSA(dsa)) {
      mergeDeep(request, {
        regs: {
          ext: {
            dsa
          }
        }
      });
    }

    if (bidderRequest.gppConsent?.gppString) {
      deepSetValue(request, 'regs.gpp', bidderRequest.gppConsent.gppString);
      deepSetValue(request, 'regs.gpp_sid', bidderRequest.gppConsent.applicableSections);
    } else if (ortb2Params.regs?.gpp) {
      deepSetValue(request, 'regs.gpp', ortb2Params.regs.gpp);
      deepSetValue(request, 'regs.gpp_sid', ortb2Params.regs.gpp_sid);
    }

    const computedEndpointUrl = ENDPOINT_URL;

    return {
      method: 'POST',
      url: 'https://' + validBidRequests[0].params.region + '.' + computedEndpointUrl,
      data: JSON.stringify(request)
    };
  },
  interpretOrtbResponse: function (serverResponse, originalRequest) {
    const responseBody = serverResponse.body;
    if (!isArray(responseBody)) {
      return [];
    }

    const bids = [];
    responseBody.forEach(serverBid => {
      if (!serverBid.price) { // price may exist and is === 0 or there's no price prop at all (fledge req case)
        return;
      }

      let interpretedBid;

      // try...catch would be risky cause JSON.parse throws SyntaxError
      if (serverBid.adm.indexOf('{') === 0) {
        interpretedBid = interpretNativeBid(serverBid);
      } else {
        interpretedBid = interpretBannerBid(serverBid);
      }

      if (serverBid.ext) {
        interpretedBid.ext = deepClone(serverBid.ext);
        if (serverBid.ext.dsa) {
          interpretedBid.meta = Object.assign({}, interpretedBid.meta, { dsa: serverBid.ext.dsa });
        }
      }

      bids.push(interpretedBid);
    });
    return bids;
  },
  interpretResponse: function (serverResponse, originalRequest) {
    return this.interpretOrtbResponse(serverResponse, originalRequest);
  }
};
registerBidder(spec);

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {number} floor by imp type
 */
function applyFloor(slot) {
  const floors = [];
  if (typeof slot.getFloor === 'function') {
    Object.keys(slot.mediaTypes).forEach(type => {
      if (SUPPORTED_MEDIA_TYPES.includes(type)) {
        floors.push(slot.getFloor({ currency: DEFAULT_CURRENCY_ARR[0], mediaType: type, size: slot.sizes || '*' })?.floor);
      }
    });
  }
  return floors.length > 0 ? Math.max(...floors) : parseFloat(slot.params.bidfloor);
}

/**
 * @param {object} slot Ad Unit Params by Prebid
 * @returns {object} Imp by OpenRTB 2.5 §3.2.4
 */
function mapImpression(slot, bidderRequest) {
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

  const ext = deepAccess(slot, 'ortb2Imp.ext');
  if (ext) {
    imp.ext = deepClone(ext);
    if (imp.ext.ae) {
      delete imp.ext.ae;
    }
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
  const siteData = {
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
function mapSource(slot, bidderRequest) {
  const source = {
    tid: bidderRequest?.auctionId || '',
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
 * @returns {Array} Request Assets by OpenRTB Native Ads 1.1 §4.2
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
 * @param {number} type Image or icon code
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
 * https://github.com/InteractiveAdvertisingBureau/openrtb/blob/main/extensions/community_extensions/dsa_transparency.md
 *
 * @param {object} dsa
 * @returns {boolean} whether dsa object contains valid attributes values
 */
function validateDSA(dsa) {
  if (isEmpty(dsa) || !isPlainObject(dsa)) return false;

  return DSA_ATTRIBUTES.reduce((prev, attr) => {
    const dsaEntry = dsa[attr.name];
    return prev && (
      !dsa.hasOwnProperty(attr.name) ||
      (isNumber(dsaEntry) && dsaEntry >= attr.min && dsaEntry <= attr.max)
    )
  }, true) &&
    (!dsa.hasOwnProperty('transparency') ||
      (isArray(dsa.transparency) && dsa.transparency.every(
        v => isPlainObject(v) && isStr(v.domain) && v.domain && isArray(v.dsaparams) &&
          v.dsaparams.every(x => isNumber(x))
      ))
    )
}
