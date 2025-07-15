import { NATIVE_ASSETS, NATIVE_ASSETS_IDS } from './nativeAssets.js';
import { isPlainObject, isArray, isArrayOfNums, parseUrl, isFn } from '../../src/utils.js';

/**
 * Builds a native request object based on the bid request
 * @param {object} br - The bid request
 * @returns {object} The native request object
 */
export function createNativeRequest(br) {
  const impObject = {
    ver: '1.2',
    assets: []
  };

  Object.keys(br.mediaTypes.native).forEach((key) => {
    const props = NATIVE_ASSETS[key];
    if (props) {
      const asset = {
        required: br.mediaTypes.native[key].required ? 1 : 0,
        id: props.id,
        [props.name]: {}
      };

      if (props.type) asset[props.name]['type'] = props.type;
      if (br.mediaTypes.native[key].len) asset[props.name]['len'] = br.mediaTypes.native[key].len;
      if (br.mediaTypes.native[key].sizes && br.mediaTypes.native[key].sizes[0]) {
        asset[props.name]['w'] = br.mediaTypes.native[key].sizes[0];
        asset[props.name]['h'] = br.mediaTypes.native[key].sizes[1];
      }

      impObject.assets.push(asset);
    }
  });

  return impObject;
}

/**
 * Builds a banner request object based on the bid request
 * @param {object} br - The bid request
 * @returns {object} The banner request object
 */
export function createBannerRequest(br) {
  let [w, h] = [300, 250];
  let format = [];

  if (isArrayOfNums(br.mediaTypes.banner.sizes)) {
    [w, h] = br.mediaTypes.banner.sizes;
    format.push({ w, h });
  } else if (isArray(br.mediaTypes.banner.sizes)) {
    [w, h] = br.mediaTypes.banner.sizes[0];
    if (br.mediaTypes.banner.sizes.length > 1) { format = br.mediaTypes.banner.sizes.map((size) => ({ w: size[0], h: size[1] })); }
  }

  return {
    w,
    h,
    format,
    id: br.transactionId
  }
}

/**
 * Builds a video request object based on the bid request
 * @param {object} br - The bid request
 * @returns {object} The video request object
 */
export function createVideoRequest(br) {
  const videoObj = {...br.mediaTypes.video, id: br.transactionId};

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
/**
 * Parses the native ad response
 * @param {object} adm - The native ad response
 * @returns {object} Parsed native ad object
 */
export function parseNative(adm) {
  const bid = {
    clickUrl: adm.native.link?.url,
    impressionTrackers: adm.native.imptrackers || [],
    clickTrackers: adm.native.link?.clicktrackers || [],
    jstracker: adm.native.jstracker || []
  };
  adm.native.assets.forEach((asset) => {
    const kind = NATIVE_ASSETS_IDS[asset.id];
    const content = kind && asset[NATIVE_ASSETS[kind].name];
    if (content) {
      bid[kind] = content.text || content.value || { url: content.url, width: content.w, height: content.h };
    }
  });

  return bid;
}

/**
 * Prepare Bid Floor for request
 * @param {object} br - The bid request
 * @param {string} mediaType - tyoe of media in request
 * @param {string} defaultCur - currency which support bidder
 * @returns {number} Parsed float bid floor price
 */
export function getFloor(br, mediaType, defaultCur) {
  let floor = 0.05;

  if (!isFn(br.getFloor)) {
    return floor;
  }

  const floorObj = br.getFloor({
    currency: defaultCur,
    mediaType,
    size: '*'
  });

  if (isPlainObject(floorObj) && !isNaN(parseFloat(floorObj.floor))) {
    floor = parseFloat(floorObj.floor) || floor;
  }

  return floor;
}

/**
 * Builds site object
 * @param {object} br - The bid request, request - bidderRequest data
 * @param {object} request - bidderRequest data
 * @returns {object} The site request object
 */
export function prepareSite(br, request) {
  const siteObj = {};

  siteObj.publisher = {
    id: br.params.placementId.toString()
  };

  siteObj.domain = parseUrl(request.refererInfo.page || request.refererInfo.topmostLocation).hostname;
  siteObj.page = request.refererInfo.page || request.refererInfo.topmostLocation;

  if (request.refererInfo.ref) {
    siteObj.ref = request.refererInfo.ref;
  }

  return siteObj;
}

/**
 * Adds privacy data to request object
 * @param {object} data - The request object to bidder
 * @param {object} request - bidderRequest data
 * @returns {boolean} Response with true once finish
 */
export function prepareConsents(data, request) {
  if (request.gdprConsent !== undefined) {
    data.regs.ext.gdpr = request.gdprConsent.gdprApplies ? 1 : 0;
    data.user.ext.consent = request.gdprConsent.consentString ? request.gdprConsent.consentString : '';
  }

  if (request.uspConsent !== undefined) {
    data.regs.ext.us_privacy = request.uspConsent;
  }

  return true;
}

/**
 * Adds Eids object to request object
 * @param {object} data - The request object to bidder
 * @param {object} br - The bid request
 * @returns {boolean} Response with true once finish
 */
export function prepareEids(data, br) {
  if (br.userIdAsEids !== undefined) {
    data.user.ext.eids = br.userIdAsEids;
  }

  return true;
}
