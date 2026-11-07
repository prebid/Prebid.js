// This shared helper was written by the Codex bot on behalf of @patmmccann.
import { isArray, isBoolean, isNumber, isStr, inIframe } from '../../src/utils.js';
import { BANNER, NATIVE } from '../../src/mediaTypes.js';

export const DATA_TYPES = {
  'NUMBER': 'number',
  'STRING': 'string',
  'BOOLEAN': 'boolean',
  'ARRAY': 'array',
  'OBJECT': 'object'
};

export const VIDEO_CUSTOM_PARAMS = {
  'mimes': DATA_TYPES.ARRAY,
  'minduration': DATA_TYPES.NUMBER,
  'maxduration': DATA_TYPES.NUMBER,
  'startdelay': DATA_TYPES.NUMBER,
  'playbackmethod': DATA_TYPES.ARRAY,
  'api': DATA_TYPES.ARRAY,
  'protocols': DATA_TYPES.ARRAY,
  'w': DATA_TYPES.NUMBER,
  'h': DATA_TYPES.NUMBER,
  'battr': DATA_TYPES.ARRAY,
  'linearity': DATA_TYPES.NUMBER,
  'placement': DATA_TYPES.NUMBER,
  'plcmt': DATA_TYPES.NUMBER,
  'minbitrate': DATA_TYPES.NUMBER,
  'maxbitrate': DATA_TYPES.NUMBER
};

export const NATIVE_ASSETS = {
  'TITLE': { ID: 1, KEY: 'title', TYPE: 0 },
  'IMAGE': { ID: 2, KEY: 'image', TYPE: 0 },
  'ICON': { ID: 3, KEY: 'icon', TYPE: 0 },
  'SPONSOREDBY': { ID: 4, KEY: 'sponsoredBy', TYPE: 1 }, // please note that type of SPONSORED is also 1
  'BODY': { ID: 5, KEY: 'body', TYPE: 2 }, // please note that type of DESC is also set to 2
  'CLICKURL': { ID: 6, KEY: 'clickUrl', TYPE: 0 },
  'VIDEO': { ID: 7, KEY: 'video', TYPE: 0 },
  'EXT': { ID: 8, KEY: 'ext', TYPE: 0 },
  'DATA': { ID: 9, KEY: 'data', TYPE: 0 },
  'LOGO': { ID: 10, KEY: 'logo', TYPE: 0 },
  'SPONSORED': { ID: 11, KEY: 'sponsored', TYPE: 1 }, // please note that type of SPONSOREDBY is also set to 1
  'DESC': { ID: 12, KEY: 'data', TYPE: 2 }, // please note that type of BODY is also set to 2
  'RATING': { ID: 13, KEY: 'rating', TYPE: 3 },
  'LIKES': { ID: 14, KEY: 'likes', TYPE: 4 },
  'DOWNLOADS': { ID: 15, KEY: 'downloads', TYPE: 5 },
  'PRICE': { ID: 16, KEY: 'price', TYPE: 6 },
  'SALEPRICE': { ID: 17, KEY: 'saleprice', TYPE: 7 },
  'PHONE': { ID: 18, KEY: 'phone', TYPE: 8 },
  'ADDRESS': { ID: 19, KEY: 'address', TYPE: 9 },
  'DESC2': { ID: 20, KEY: 'desc2', TYPE: 10 },
  'DISPLAYURL': { ID: 21, KEY: 'displayurl', TYPE: 11 },
  'CTA': { ID: 22, KEY: 'cta', TYPE: 12 }
};

/**
 * @param {string} url
 * @returns {string} hostname, resolved relative to the current document
 */
export function getDomainFromURL(url) {
  const anchor = document.createElement('a');
  anchor.href = url;
  return anchor.hostname;
}

/**
 * Mutates the adapter's cloned bid, moving its first non-fluid size to params.
 * @param {Object} bid
 */
export function parseBannerSizes(bid) {
  bid.params.width = 0;
  bid.params.height = 0;
  if (bid.hasOwnProperty('mediaTypes') &&
    bid.mediaTypes.hasOwnProperty(BANNER) &&
    bid.mediaTypes.banner.hasOwnProperty('sizes')) {
    var i = 0;
    var sizeArray = [];
    for (; i < bid.mediaTypes.banner.sizes.length; i++) {
      if (bid.mediaTypes.banner.sizes[i].length === 2) { // sizes[i].length will not be 2 in case where size is set as fluid, we want to skip that entry
        sizeArray.push(bid.mediaTypes.banner.sizes[i]);
      }
    }
    bid.mediaTypes.banner.sizes = sizeArray;
    if (bid.mediaTypes.banner.sizes.length >= 1) {
      // set the first size in sizes array in bid.params.width and bid.params.height. These will be sent as primary size.
      // The rest of the sizes will be sent in format array.
      bid.params.width = bid.mediaTypes.banner.sizes[0][0];
      bid.params.height = bid.mediaTypes.banner.sizes[0][1];
      bid.mediaTypes.banner.sizes = bid.mediaTypes.banner.sizes.splice(1, bid.mediaTypes.banner.sizes.length - 1);
    }
  }
}

/**
 * @param {Object} bid
 * @param {function(string): void} logWarning
 * @returns {Object|undefined} OpenRTB banner
 */
export function createBannerRequest(bid, logWarning) {
  var sizes = bid.mediaTypes.banner.sizes;
  var format = [];
  var bannerObj;
  if (sizes !== undefined && isArray(sizes)) {
    bannerObj = {};
    if (!bid.params.width && !bid.params.height) {
      if (sizes.length === 0) {
        // i.e. since bid.params does not have width or height, and length of sizes is 0, need to ignore this banner imp
        bannerObj = undefined;
        logWarning('Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
        return bannerObj;
      } else {
        bannerObj.w = parseInt(sizes[0][0], 10);
        bannerObj.h = parseInt(sizes[0][1], 10);
        sizes = sizes.splice(1, sizes.length - 1);
      }
    } else {
      bannerObj.w = bid.params.width;
      bannerObj.h = bid.params.height;
    }
    if (sizes.length > 0) {
      format = [];
      sizes.forEach(function (size) {
        if (size.length > 1) {
          format.push({ w: size[0], h: size[1] });
        }
      });
      if (format.length > 0) {
        bannerObj.format = format;
      }
    }
    bannerObj.pos = 0;
    bannerObj.topframe = inIframe() ? 0 : 1;
  } else {
    logWarning('Error: mediaTypes.banner.size missing for adunit: ' + bid.params.adUnit + '. Ignoring the banner impression in the adunit.');
    bannerObj = undefined;
  }
  return bannerObj;
}

function checkParamDataType(key, value, datatype, logWarning) {
  var errMsg = 'Ignoring param key: ' + key + ', expects ' + datatype + ', found ' + typeof value;
  var functionToExecute;
  switch (datatype) {
    case DATA_TYPES.BOOLEAN:
      functionToExecute = isBoolean;
      break;
    case DATA_TYPES.NUMBER:
      functionToExecute = isNumber;
      break;
    case DATA_TYPES.STRING:
      functionToExecute = isStr;
      break;
    case DATA_TYPES.ARRAY:
      functionToExecute = isArray;
      break;
  }
  if (functionToExecute(value)) {
    return value;
  }
  logWarning(errMsg, key);
  return undefined;
}

/**
 * The caller chooses the video params and allowlist; playerSize wins over w/h.
 * @param {Object} videoData
 * @param {Array} playerSize
 * @param {Object<string, string>} customParams
 * @param {function(string, string): void} logWarning
 * @returns {Object} OpenRTB video
 */
export function createVideoRequest(videoData, playerSize, customParams, logWarning) {
  const video = {};
  for (const key in customParams) {
    if (videoData.hasOwnProperty(key)) {
      video[key] = checkParamDataType(key, videoData[key], customParams[key], logWarning);
    }
  }
  // Both adapters give playerSize precedence over w and h in the video params.
  if (isArray(playerSize[0])) {
    video.w = parseInt(playerSize[0][0], 10);
    video.h = parseInt(playerSize[0][1], 10);
  } else if (isNumber(playerSize[0])) {
    video.w = parseInt(playerSize[0], 10);
    video.h = parseInt(playerSize[1], 10);
  }
  return video;
}

/**
 * The caller unwraps the native response and decides where to put its trackers.
 * @param {Object[]} assets
 * @param {Object} newBid bid response with an initialized native object
 * @param {Object<number, string>} assetIdToKeyMap adapter-specific data asset keys
 */
export function parseNativeAssets(assets, newBid, assetIdToKeyMap) {
  newBid.mediaType = NATIVE;
  for (let i = 0, len = assets.length; i < len; i++) {
    switch (assets[i].id) {
      case NATIVE_ASSETS.TITLE.ID:
        newBid.native.title = assets[i].title && assets[i].title.text;
        break;
      case NATIVE_ASSETS.IMAGE.ID:
        newBid.native.image = {
          url: assets[i].img && assets[i].img.url,
          height: assets[i].img && assets[i].img.h,
          width: assets[i].img && assets[i].img.w,
        };
        break;
      case NATIVE_ASSETS.ICON.ID:
        newBid.native.icon = {
          url: assets[i].img && assets[i].img.url,
          height: assets[i].img && assets[i].img.h,
          width: assets[i].img && assets[i].img.w,
        };
        break;
      case NATIVE_ASSETS.SPONSOREDBY.ID:
      case NATIVE_ASSETS.BODY.ID:
      case NATIVE_ASSETS.LIKES.ID:
      case NATIVE_ASSETS.DOWNLOADS.ID:
      case NATIVE_ASSETS.PRICE:
      case NATIVE_ASSETS.SALEPRICE.ID:
      case NATIVE_ASSETS.PHONE.ID:
      case NATIVE_ASSETS.ADDRESS.ID:
      case NATIVE_ASSETS.DESC2.ID:
      case NATIVE_ASSETS.CTA.ID:
      case NATIVE_ASSETS.RATING.ID:
      case NATIVE_ASSETS.DISPLAYURL.ID:
        newBid.native[assetIdToKeyMap[assets[i].id]] = assets[i].data && assets[i].data.value;
        break;
    }
  }
  if (!newBid.width) {
    newBid.width = 0;
  }
  if (!newBid.height) {
    newBid.height = 0;
  }
}

/**
 * @param {Object} bid OpenRTB bid
 * @returns {Object} Prebid bidder metadata
 */
export function getResponseMeta(bid) {
  const meta = {};
  if (bid.ext && bid.ext.dspid) {
    meta.networkId = bid.ext.dspid;
  }
  if (bid.ext && bid.ext.advid) {
    meta.buyerId = bid.ext.advid;
  }
  if (bid.adomain && bid.adomain.length > 0) {
    meta.advertiserDomains = bid.adomain;
    meta.clickUrl = bid.adomain[0];
  }
  return meta;
}
