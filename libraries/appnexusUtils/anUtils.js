/**
 * Converts a string value in camel-case to underscore eg 'placementId' becomes 'placement_id'
 * @param {string} value string value to convert
 */
import { deepClone, isArray, isArrayOfNums, isPlainObject } from '../../src/utils.js';
import { BANNER, NATIVE, VIDEO } from '../../src/mediaTypes.js';
import { transformSizes } from '../sizeUtils/tranformSize.js';

export function convertCamelToUnderscore(value) {
  return value.replace(/(?:^|\.?)([A-Z])/g, function (x, y) {
    return '_' + y.toLowerCase();
  }).replace(/^_/, '');
}

export const appnexusAliases = [
  { code: 'appnexusAst', gvlid: 32 },
  { code: 'pagescience', gvlid: 32 },
  { code: 'gourmetads', gvlid: 32 },
  { code: 'newdream', gvlid: 32 },
  { code: 'matomy', gvlid: 32 },
  { code: 'featureforward', gvlid: 32 },
  { code: 'adasta', gvlid: 1205 },
  { code: 'beintoo', gvlid: 618 },
  { code: 'stailamedia', gvlid: 32 },
  { code: 'uol', gvlid: 32 },
  { code: 'adzymic', gvlid: 723 },
];

/**
 * Creates an array of n length and fills each item with the given value
 */
export function fill(value, length) {
  const newArray = [];

  for (let i = 0; i < length; i++) {
    const valueToPush = isPlainObject(value) ? deepClone(value) : value;
    newArray.push(valueToPush);
  }

  return newArray;
}

/**
 * Whether the bid's `member` param is set (a non-zero number).
 */
export function hasMemberId(bid) {
  return !!parseInt(bid.params.member, 10);
}

/**
 * The first ad in a /ut response tag that has an RTB bid, if any.
 */
export function getRtbBid(tag) {
  return tag && tag.ads && tag.ads.length && ((tag.ads) || []).find(ad => ad.rtb);
}

/**
 * The Prebid media type of an RTB bid from a /ut response, from its `ad_type`.
 */
export function parseMediaType(rtbBid) {
  const adType = rtbBid.ad_type;
  if (adType === VIDEO) {
    return VIDEO;
  } else if (adType === NATIVE) {
    return NATIVE;
  } else {
    return BANNER;
  }
}

/**
 * Passes an event from the AppNexus outstream renderer (ANOutstreamVideo) on to the bid's renderer.
 */
export function handleOutstreamRendererEvents(bid, id, eventName) {
  bid.renderer.handleVideoEvent({ id, eventName });
}

/**
 * Prebid's native asset names that /ut names differently. A mapping is either the /ut name, or
 * `{serverName, requiredParams}` with params that are always sent for the asset.
 */
export const NATIVE_MAPPING = {
  body: 'description',
  body2: 'desc2',
  cta: 'ctatext',
  image: {
    serverName: 'main_image',
    requiredParams: { required: true }
  },
  icon: {
    serverName: 'icon',
    requiredParams: { required: true }
  },
  sponsoredBy: 'sponsored_by',
  privacyLink: 'privacy_link',
  salePrice: 'saleprice',
  displayUrl: 'displayurl'
};

/**
 * The /ut native request for an ad unit's native params.
 */
export function buildNativeRequest(params) {
  const request = {};

  // map standard prebid native asset identifier to /ut parameters
  // e.g., tag specifies `body` but /ut only knows `description`.
  // mapping may be in form {tag: '<server name>'} or
  // {tag: {serverName: '<server name>', requiredParams: {...}}}
  Object.keys(params).forEach(key => {
    // check if one of the <server name> forms is used, otherwise
    // a mapping wasn't specified so pass the key straight through
    const requestKey =
      (NATIVE_MAPPING[key] && NATIVE_MAPPING[key].serverName) ||
      NATIVE_MAPPING[key] ||
      key;

    // required params are always passed on request
    const requiredParams = NATIVE_MAPPING[key] && NATIVE_MAPPING[key].requiredParams;
    request[requestKey] = Object.assign({}, requiredParams, params[key]);

    // convert the sizes of image/icon assets to proper format (if needed)
    const isImageAsset = !!(requestKey === NATIVE_MAPPING.image.serverName || requestKey === NATIVE_MAPPING.icon.serverName);
    if (isImageAsset && request[requestKey].sizes) {
      const sizes = request[requestKey].sizes;
      if (isArrayOfNums(sizes) || (isArray(sizes) && sizes.length > 0 && sizes.every(sz => isArrayOfNums(sz)))) {
        request[requestKey].sizes = transformSizes(request[requestKey].sizes);
      }
    }

    if (requestKey === NATIVE_MAPPING.privacyLink) {
      request.privacy_supported = true;
    }
  });

  return request;
}
