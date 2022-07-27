import { deepAccess, getKeyByValue, insertHtmlIntoIframe, isInteger, isNumber, isPlainObject, logError, triggerPixel, isBoolean, isArray, deepClone } from './utils.js';
import {includes} from './polyfill.js';
import {auctionManager} from './auctionManager.js';
import CONSTANTS from './constants.json';
import { NATIVE } from './mediaTypes.js';
import { filters } from './targeting.js';

export const nativeAdapters = [];

export const NATIVE_TARGETING_KEYS = Object.keys(CONSTANTS.NATIVE_KEYS).map(
  key => CONSTANTS.NATIVE_KEYS[key]
);

const IMAGE = {
  ortb: {
    ver: '1.2',
    assets: [
      {
        required: 1,
        id: 1,
        img: {
          type: 3,
          wmin: 100,
          hmin: 100,
        }
      },
      {
        required: 1,
        id: 2,
        title: {
          len: 140,
        }
      },
      {
        required: 1,
        id: 3,
        data: {
          type: 1,
        }
      },
      {
        required: 0,
        id: 4,
        data: {
          type: 2,
        }
      },
      {
        required: 0,
        id: 5,
        img: {
          type: 1,
          wmin: 20,
          hmin: 20,
        }
      },
    ],
  },
  image: { required: true },
  title: { required: true },
  sponsoredBy: { required: true },
  clickUrl: { required: true },
  body: { required: false },
  icon: { required: false },
};

const SUPPORTED_TYPES = {
  image: IMAGE
};

const { NATIVE_ASSET_TYPES, NATIVE_IMAGE_TYPES, PREBID_NATIVE_DATA_KEYS_TO_ORTB, NATIVE_KEYS_THAT_ARE_NOT_ASSETS } = CONSTANTS;

// inverse native maps useful for converting to legacy
const PREBID_NATIVE_DATA_KEYS_TO_ORTB_INVERSE = inverse(PREBID_NATIVE_DATA_KEYS_TO_ORTB);
const NATIVE_ASSET_TYPES_INVERSE = inverse(NATIVE_ASSET_TYPES);

export const nativeMapper = new Map();
/**
 * Recieves nativeParams from an adUnit. If the params were not of type 'type',
 * passes them on directly. If they were of type 'type', translate
 * them into the predefined specific asset requests for that type of native ad.
 */
export function processNativeAdUnitParams(params) {
  if (params && params.type && typeIsSupported(params.type)) {
    params = SUPPORTED_TYPES[params.type];
  }

  if (params && params.ortb && !isOpenRTBBidRequestValid(params.ortb)) {
    return;
  }
  return params;
}

export function decorateAdUnitsWithNativeParams(adUnits) {
  adUnits.forEach(adUnit => {
    const nativeParams =
      adUnit.nativeParams || deepAccess(adUnit, 'mediaTypes.native');
    if (nativeParams) {
      adUnit.nativeParams = processNativeAdUnitParams(nativeParams);
    }
  });
}
export function isOpenRTBBidRequestValid(ortb) {
  const assets = ortb.assets;
  if (!Array.isArray(assets) || assets.length === 0) {
    logError(`assets in mediaTypes.native.ortb is not an array, or it's empty. Assets: `, assets);
    return false;
  }

  // validate that ids exist, that they are unique and that they are numbers
  const ids = assets.map(asset => asset.id);
  if (assets.length !== new Set(ids).size || ids.some(id => id !== parseInt(id, 10))) {
    logError(`each asset object must have 'id' property, it must be unique and it must be an integer`);
    return false;
  }

  if (ortb.hasOwnProperty('eventtrackers') && !Array.isArray(ortb.eventtrackers)) {
    logError('ortb.eventtrackers is not an array. Eventtrackers: ', ortb.eventtrackers);
    return false;
  }

  return assets.every(asset => isOpenRTBAssetValid(asset))
}

function isOpenRTBAssetValid(asset) {
  if (!isPlainObject(asset)) {
    logError(`asset must be an object. Provided asset: `, asset);
    return false;
  }
  if (asset.img) {
    if (!isNumber(asset.img.w) && !isNumber(asset.img.wmin)) {
      logError(`for img asset there must be 'w' or 'wmin' property`);
      return false;
    }
    if (!isNumber(asset.img.h) && !isNumber(asset.img.hmin)) {
      logError(`for img asset there must be 'h' or 'hmin' property`);
      return false;
    }
  } else if (asset.title) {
    if (!isNumber(asset.title.len)) {
      logError(`for title asset there must be 'len' property defined`);
      return false;
    }
  } else if (asset.data) {
    if (!isNumber(asset.data.type)) {
      logError(`for data asset 'type' property must be a number`);
      return false;
    }
  } else if (asset.video) {
    if (!Array.isArray(asset.video.mimes) || !Array.isArray(asset.video.protocols) ||
      !isNumber(asset.video.minduration) || !isNumber(asset.video.maxduration)) {
      logError('video asset is not properly configured');
      return false;
    }
  }
  return true;
}

/**
 * Check if the native type specified in the adUnit is supported by Prebid.
 */
function typeIsSupported(type) {
  if (!(type && includes(Object.keys(SUPPORTED_TYPES), type))) {
    logError(`${type} nativeParam is not supported`);
    return false;
  }

  return true;
}

/**
 * Helper functions for working with native-enabled adUnits
 * TODO: abstract this and the video helper functions into general
 * adunit validation helper functions
 */
export const nativeAdUnit = adUnit => {
  const mediaType = adUnit.mediaType === 'native';
  const mediaTypes = deepAccess(adUnit, 'mediaTypes.native');
  return mediaType || mediaTypes;
}
export const nativeBidder = bid => includes(nativeAdapters, bid.bidder);
export const hasNonNativeBidder = adUnit =>
  adUnit.bids.filter(bid => !nativeBidder(bid)).length;

/**
 * Validate that the native assets on this bid contain all assets that were
 * marked as required in the adUnit configuration.
 * @param {Bid} bid Native bid to validate
 * @param {BidRequest[]} bidRequests All bid requests for an auction
 * @return {Boolean} If object is valid
 */
export function nativeBidIsValid(bid, {index = auctionManager.index} = {}) {
  const adUnit = index.getAdUnit(bid);
  if (!adUnit) { return false; }
  let ortbRequest =
  adUnit?.nativeParams?.ortb || nativeMapper.get(bid.requestId) || toOrtbNativeRequest(adUnit.nativeParams);
  let ortbResponse =
  bid.native?.ortb || toOrtbNativeResponse(bid.native, ortbRequest);
  return isNativeOpenRTBBidValid(ortbResponse, ortbRequest);
}

export function isNativeOpenRTBBidValid(bidORTB, bidRequestORTB) {
  if (!deepAccess(bidORTB, 'link.url')) {
    logError(`native response doesn't have 'link' property. Ortb response: `, bidORTB);
    return false;
  }

  let requiredAssetIds = bidRequestORTB.assets.filter(asset => asset.required === 1).map(a => a.id);
  let returnedAssetIds = bidORTB.assets.map(asset => asset.id);

  const match = requiredAssetIds.every(assetId => includes(returnedAssetIds, assetId));
  if (!match) {
    logError(`didn't receive a bid with all required assets. Required ids: ${requiredAssetIds}, but received ids in response: ${returnedAssetIds}`);
  }

  return match;
}

/*
 * Native responses may have associated impression or click trackers.
 * This retrieves the appropriate tracker urls for the given ad object and
 * fires them. As a native creatives may be in a cross-origin frame, it may be
 * necessary to invoke this function via postMessage. secureCreatives is
 * configured to fire this function when it receives a `message` of 'Prebid Native'
 * and an `adId` with the value of the `bid.adId`. When a message is posted with
 * these parameters, impression trackers are fired. To fire click trackers, the
 * message should contain an `action` set to 'click'.
 *
 * // Native creative template example usage
 * <a href="%%CLICK_URL_UNESC%%%%PATTERN:hb_native_linkurl%%"
 *    target="_blank"
 *    onclick="fireTrackers('click')">
 *    %%PATTERN:hb_native_title%%
 * </a>
 *
 * <script>
 *   function fireTrackers(action) {
 *     var message = {message: 'Prebid Native', adId: '%%PATTERN:hb_adid%%'};
 *     if (action === 'click') {message.action = 'click';} // fires click trackers
 *     window.parent.postMessage(JSON.stringify(message), '*');
 *   }
 *   fireTrackers(); // fires impressions when creative is loaded
 * </script>
 */
export function fireNativeTrackers(message, adObject) {
  let trackers;
  if (message.action === 'click') {
    trackers = adObject['native'] && adObject['native'].clickTrackers;
  } else {
    trackers = adObject['native'] && adObject['native'].impressionTrackers;

    if (adObject['native'] && adObject['native'].javascriptTrackers) {
      insertHtmlIntoIframe(adObject['native'].javascriptTrackers);
    }
  }

  (trackers || []).forEach(triggerPixel);
  return message.action;
}

/**
 * Gets native targeting key-value pairs
 * @param {Object} bid
 * @return {Object} targeting
 */
export function getNativeTargeting(bid, {index = auctionManager.index} = {}) {
  let keyValues = {};
  const adUnit = index.getAdUnit(bid);
  if (deepAccess(adUnit, 'nativeParams.rendererUrl')) {
    bid['native']['rendererUrl'] = getAssetValue(adUnit.nativeParams['rendererUrl']);
  } else if (deepAccess(adUnit, 'nativeParams.adTemplate')) {
    bid['native']['adTemplate'] = getAssetValue(adUnit.nativeParams['adTemplate']);
  }

  const globalSendTargetingKeys = deepAccess(
    adUnit,
    `nativeParams.sendTargetingKeys`
  ) !== false;

  const nativeKeys = getNativeKeys(adUnit);

  const flatBidNativeKeys = { ...bid.native, ...bid.native.ext };
  delete flatBidNativeKeys.ext;

  Object.keys(flatBidNativeKeys).forEach(asset => {
    const key = nativeKeys[asset];
    let value = getAssetValue(bid.native[asset]) || getAssetValue(deepAccess(bid, `native.ext.${asset}`));

    if (asset === 'adTemplate' || !key || !value) {
      return;
    }

    let sendPlaceholder = deepAccess(adUnit, `nativeParams.${asset}.sendId`);
    if (typeof sendPlaceholder !== 'boolean') {
      sendPlaceholder = deepAccess(adUnit, `nativeParams.ext.${asset}.sendId`);
    }

    if (sendPlaceholder) {
      const placeholder = `${key}:${bid.adId}`;
      value = placeholder;
    }

    let assetSendTargetingKeys = deepAccess(adUnit, `nativeParams.${asset}.sendTargetingKeys`)
    if (typeof assetSendTargetingKeys !== 'boolean') {
      assetSendTargetingKeys = deepAccess(adUnit, `nativeParams.ext.${asset}.sendTargetingKeys`);
    }

    const sendTargeting = typeof assetSendTargetingKeys === 'boolean' ? assetSendTargetingKeys : globalSendTargetingKeys;

    if (sendTargeting) {
      keyValues[key] = value;
    }
  });

  return keyValues;
}

/**
 * Constructs a message object containing asset values for each of the
 * requested data keys.
 */
export function getAssetMessage(data, adObject) {
  const message = {
    message: 'assetResponse',
    adId: data.adId,
    assets: [],
  };

  if (adObject.native.hasOwnProperty('adTemplate')) {
    message.adTemplate = getAssetValue(adObject.native['adTemplate']);
  } if (adObject.native.hasOwnProperty('rendererUrl')) {
    message.rendererUrl = getAssetValue(adObject.native['rendererUrl']);
  }

  data.assets.forEach(asset => {
    const key = getKeyByValue(CONSTANTS.NATIVE_KEYS, asset);
    const value = getAssetValue(adObject.native[key]);

    message.assets.push({ key, value });
  });

  return message;
}

export function getAllAssetsMessage(data, adObject) {
  const message = {
    message: 'assetResponse',
    adId: data.adId,
  };

  // Pass to Prebid Universal Creative all assets, the legacy ones + the ortb ones (under ortb property)
  const ortbRequest = nativeMapper.get(adObject.requestId);
  let nativeReq = adObject.native;
  nativeMapper.delete(adObject.requestId);
  const ortbResponse = adObject.native?.ortb;
  let legacyResponse = {};
  if (ortbRequest && ortbResponse) {
    legacyResponse = toLegacyResponse(ortbResponse, ortbRequest);
    nativeReq = {
      ...adObject.native,
      ...legacyResponse
    };
  }
  if (adObject.native.ortb) {
    message.ortb = adObject.native.ortb;
  }
  message.assets = [];

  Object.keys(nativeReq).forEach(function(key) {
    if (key === 'adTemplate' && nativeReq[key]) {
      message.adTemplate = getAssetValue(nativeReq[key]);
    } else if (key === 'rendererUrl' && nativeReq[key]) {
      message.rendererUrl = getAssetValue(nativeReq[key]);
    } else if (key === 'ext') {
      Object.keys(nativeReq[key]).forEach(extKey => {
        if (nativeReq[key][extKey]) {
          const value = getAssetValue(nativeReq[key][extKey]);
          message.assets.push({ key: extKey, value });
        }
      })
    } else if (nativeReq[key] && CONSTANTS.NATIVE_KEYS.hasOwnProperty(key)) {
      const value = getAssetValue(nativeReq[key]);

      message.assets.push({ key, value });
    }
  });
  removeExpiredBidsFromNativeMapper();
  return message;
}

/**
 * Native assets can be a string or an object with a url prop. Returns the value
 * appropriate for sending in adserver targeting or placeholder replacement.
 */
function getAssetValue(value) {
  if (typeof value === 'object' && value.url) {
    return value.url;
  }

  return value;
}

function getNativeKeys(adUnit) {
  const extraNativeKeys = {}

  if (deepAccess(adUnit, 'nativeParams.ext')) {
    Object.keys(adUnit.nativeParams.ext).forEach(extKey => {
      extraNativeKeys[extKey] = `hb_native_${extKey}`;
    })
  }

  return {
    ...CONSTANTS.NATIVE_KEYS,
    ...extraNativeKeys
  }
}

/**
 * converts Prebid legacy native assets request to OpenRTB format
 * @param {object} legacyNativeAssets an object that describes a native bid request in Prebid proprietary format
 * @returns an OpenRTB format of the same bid request
 */
export function toOrtbNativeRequest(legacyNativeAssets) {
  if (!legacyNativeAssets && !isPlainObject(legacyNativeAssets)) {
    logError('Native assets object is empty or not an object: ', legacyNativeAssets);
    return;
  }
  const ortb = {
    ver: '1.2',
    assets: []
  };
  for (let key in legacyNativeAssets) {
    // skip conversion for non-asset keys
    if (key in NATIVE_KEYS_THAT_ARE_NOT_ASSETS) continue;

    const asset = legacyNativeAssets[key];
    let required = 0;
    if (asset.required && isBoolean(asset.required)) {
      required = Number(asset.required);
    }
    const ortbAsset = {
      id: ortb.assets.length,
      required
    };
    // data cases
    if (key in PREBID_NATIVE_DATA_KEYS_TO_ORTB) {
      ortbAsset.data = {
        type: NATIVE_ASSET_TYPES[PREBID_NATIVE_DATA_KEYS_TO_ORTB[key]]
      }
      if (asset.len) {
        ortbAsset.data.len = asset.len;
      }
    // icon or image case
    } else if (key === 'icon' || key === 'image') {
      ortbAsset.img = {
        type: key === 'icon' ? NATIVE_IMAGE_TYPES.ICON : NATIVE_IMAGE_TYPES.MAIN,
      }
      // if min_width and min_height are defined in aspect_ratio, they are preferred
      if (asset.aspect_ratios) {
        if (!isArray(asset.aspect_ratios)) {
          logError("image.aspect_ratios was passed, but it's not a an array:", asset.aspect_ratios);
        } else if (asset.aspect_ratios.length != 1) {
          logError("image.aspect_ratios was passed, but it's empty:", asset.aspect_ratios);
        } else {
          const { min_width: minWidth, min_height: minHeight } = asset.aspect_ratios[0];
          if (!isInteger(minWidth) || !isInteger(minHeight)) {
            logError('image.aspect_ratios min_width or min_height are invalid: ', minWidth, minHeight);
          } else {
            ortbAsset.img.wmin = minWidth;
            ortbAsset.img.hmin = minHeight;
          }
        }
      }

      // if asset.sizes exist, by OpenRTB spec we should remove wmin and hmin
      if (asset.sizes) {
        if (asset.sizes.length != 2 || !isInteger(asset.sizes[0]) || !isInteger(asset.sizes[1])) {
          logError('image.sizes was passed, but its value is not an array of integers:', asset.sizes);
        } else {
          ortbAsset.img.w = asset.sizes[0];
          ortbAsset.img.h = asset.sizes[1];
          delete ortbAsset.img.hmin;
          delete ortbAsset.img.wmin;
        }
      }
    // title case
    } else if (key === 'title') {
      ortbAsset.title = {
        // in openRTB, len is required for titles, while in legacy prebid was not.
        // for this reason, if len is missing in legacy prebid, we're adding a default value of 140.
        len: asset.len || 140
      }
    // all extensions to the native bid request are passed as is
    } else if (key === 'ext') {
      ortbAsset.ext = {
        asset
      };
      // in `ext` case, required field is not needed
      delete ortbAsset.required;
    }

    ortb.assets.push(ortbAsset);
  }
  return ortb;
}

/**
 * This function converts an OpenRTB native request object to Prebid proprietary
 * format. The purpose of this function is to help adapters to handle the
 * transition phase where publishers may be using OpenRTB objects but the
 *  bidder does not yet support it.
 * @param {object} openRTBRequest an OpenRTB v1.2 request object
 * @returns a Prebid legacy native format request
 */
export function fromOrtbNativeRequest(openRTBRequest) {
  if (!isOpenRTBBidRequestValid(openRTBRequest)) {
    return;
  }

  const oldNativeObject = {};
  for (const asset of openRTBRequest.assets) {
    if (asset.title) {
      const title = {
        required: asset.required ? Boolean(asset.required) : false,
        len: asset.title.len
      }
      oldNativeObject.title = title;
    } else if (asset.img) {
      const image = {
        required: asset.required ? Boolean(asset.required) : false,
      }
      if (asset.img.w && asset.img.h) {
        image.sizes = [asset.img.w, asset.img.h];
      } else if (asset.img.wmin && asset.img.hmin) {
        image.aspect_ratios = {
          min_width: asset.img.wmin,
          min_height: asset.img.hmin,
          ratio_width: asset.img.wmin,
          ratio_height: asset.img.hmin
        }
      }

      if (asset.img.type === NATIVE_IMAGE_TYPES.MAIN) {
        oldNativeObject.image = image;
      } else {
        oldNativeObject.icon = image;
      }
    } else if (asset.data) {
      let assetType = Object.keys(NATIVE_ASSET_TYPES).find(k => NATIVE_ASSET_TYPES[k] === asset.data.type);
      let prebidAssetName = Object.keys(PREBID_NATIVE_DATA_KEYS_TO_ORTB).find(k => PREBID_NATIVE_DATA_KEYS_TO_ORTB[k] === assetType);
      oldNativeObject[prebidAssetName] = {
        required: asset.required ? Boolean(asset.required) : false,
      }
      if (asset.data.len) {
        oldNativeObject[prebidAssetName].len = asset.data.len;
      }
    }
    // video was not supported by old prebid assets
  }
  return oldNativeObject;
}

/**
 * Converts an OpenRTB request to a proprietary Prebid.js format.
 * The proprietary Prebid format has many limitations and will be dropped in
 * the future; adapters are encouraged to stop using it in favour of OpenRTB format.
 * IMPLEMENTATION DETAILS: This function returns the same exact object if no
 * conversion is needed. If a conversion is needed (meaning, at least one
 * bidRequest contains a native.ortb definition), it will return a copy.
 *
 * @param {BidRequest[]} bidRequests an array of valid bid requests
 * @returns an array of valid bid requests where the openRTB bids are converted to proprietary format.
 */
export function convertOrtbRequestToProprietaryNative(bidRequests) {
  let needsToBeCopied = false;
  if (!bidRequests || !isArray(bidRequests)) return bidRequests;
  if (FEATURES.NATIVE) {
    // check if a conversion is needed
    needsToBeCopied = bidRequests.some(bidRequest => bidRequest.mediaTypes && bidRequest.mediaTypes[NATIVE] && bidRequest.mediaTypes[NATIVE].ortb);
    if (!needsToBeCopied) return bidRequests;
    let bidRequestsCopy = deepClone(bidRequests);
    // convert Native ORTB definition to old-style prebid native definition
    for (const bidRequest of bidRequestsCopy) {
      if (bidRequest.mediaTypes && bidRequest.mediaTypes[NATIVE] && bidRequest.mediaTypes[NATIVE].ortb) {
        bidRequest.mediaTypes[NATIVE] = {
          // to keep other keywords like sendTargetingKeys, rendererUrl...
          ...Object.keys(bidRequest.mediaTypes[NATIVE])
            .filter(key => NATIVE_KEYS_THAT_ARE_NOT_ASSETS.includes(key))
            .reduce((obj, key) => ({
              ...obj,
              [key]: bidRequest.mediaTypes[NATIVE][key]
            }), {}),
          ...fromOrtbNativeRequest(bidRequest.mediaTypes[NATIVE].ortb)
        }
        bidRequest.nativeParams = bidRequest.mediaTypes[NATIVE];
        if (bidRequest.nativeParams) {
          processNativeAdUnitParams(bidRequest.nativeParams);
        }
      }
    }
    return bidRequestsCopy;
  }
  return bidRequests;
}

export function toOrtbNativeResponse(legacyResponse, ortbRequest) {
  const ortbResponse = {
    link: {},
    assets: [],
    eventtrackers: []
  };
  Object.keys(legacyResponse).filter(key => !!legacyResponse[key]).forEach(key => {
    const value = legacyResponse[key];
    switch (key) {
      // process titles
      case 'title':
        const titleAsset = ortbRequest.assets.find(asset => asset.title != null);
        titleAsset.title = {
          text: value
        };
        ortbResponse.assets.push(titleAsset);
        break;
      case 'image':
      case 'icon':
        const imageType = key === 'image' ? NATIVE_IMAGE_TYPES.MAIN : NATIVE_IMAGE_TYPES.ICON;
        const imageAsset = ortbRequest.assets.find(asset => asset.img != null && asset.img.type == imageType);
        imageAsset.img = {
          url: value
        };
        ortbResponse.assets.push(imageAsset);
        break;
      case 'clickUrl':
        ortbResponse.link.url = value;
        break;
      case 'clickTrackers':
        ortbResponse.link.clicktrackers = value;
        break;
      case 'impressionTrackers':
      case 'javascriptTrackers':
        ortbResponse.eventtrackers.push({
          event: 1,
          method: key == 'impressionTrackers' ? 1 : 2,
          url: value,
        });
        break;
      default:
        if (key in PREBID_NATIVE_DATA_KEYS_TO_ORTB) {
          const dataAsset = ortbRequest.assets.find(asset => asset.data != null && asset.data.type === NATIVE_ASSET_TYPES[PREBID_NATIVE_DATA_KEYS_TO_ORTB[key]]);
          dataAsset.data = {
            value
          };
          ortbResponse.assets.push(dataAsset);
        }
        break;
    }
  });
  return ortbResponse;
}

/**
 * Generates a legacy response from an ortb response. Useful during the transition period.
 * @param {*} ortbResponse a standard ortb response object
 * @param {*} ortbRequest the ortb request, useful to match ids.
 * @returns an object containing the response in legacy native format: { title: "this is a title", image: ... }
 */
function toLegacyResponse(ortbResponse, ortbRequest) {
  const legacyResponse = {};
  const requestAssets = ortbRequest?.assets || [];
  legacyResponse.clickUrl = ortbResponse.link.url;
  for (const asset of ortbResponse?.assets || []) {
    const requestAsset = requestAssets.find(reqAsset => asset.id === reqAsset.id);
    if (asset.title) {
      legacyResponse.title = asset.title.text;
    } else if (asset.img) {
      legacyResponse[requestAsset.img.type === NATIVE_IMAGE_TYPES.MAIN ? 'image' : 'icon'] = asset.img.url;
    } else if (asset.data) {
      legacyResponse[PREBID_NATIVE_DATA_KEYS_TO_ORTB_INVERSE[NATIVE_ASSET_TYPES_INVERSE[requestAsset.data.type]]] = asset.data.value;
    }
  }
  return legacyResponse;
}

/**
 * Converts a Legacy native request to OpenRTB.
 * The proprietary Prebid format has many limitations and will be dropped in
 * the future; adapters are encouraged to stop using it in favour of OpenRTB format.
 * @param {BidRequest[]} bidRequests an array of valid bid requests
 * @returns an array of valid bid requests where the legacy format is converted to OpenRTB.
 */
export function convertLegacyNativeRequestToOrtb(bidRequests) {
  if (!bidRequests || !isArray(bidRequests)) return bidRequests;
  // convert Native ORTB definition to old-style prebid native definition
  for (const bidRequest of bidRequests) {
    if (bidRequest.mediaTypes && bidRequest.mediaTypes[NATIVE]) {
      if (bidRequest.mediaTypes[NATIVE].ortb) continue;
      // legacy case
      const ortbRequest = toOrtbNativeRequest(bidRequest.mediaTypes[NATIVE]);
      bidRequest.mediaTypes[NATIVE] = {
        ...Object.entries(bidRequest.mediaTypes['native'])
          .filter(([key, value]) => NATIVE_KEYS_THAT_ARE_NOT_ASSETS.includes(key))
          .reduce((acc, curr) => { acc[curr[0]] = curr[1]; return acc }, {}),
        ortb: ortbRequest
      }
      nativeMapper.set(bidRequest.bidId, ortbRequest);
      // to keep other keywords like sendTargetingKeys, rendererUrl...
      bidRequest.nativeParams = bidRequest.mediaTypes[NATIVE];
      if (bidRequest.nativeParams) {
        processNativeAdUnitParams(bidRequest.nativeParams);
      }
    }
  }
  return bidRequests;
}

/**
 * Inverts key-values of an object.
 */
function inverse(obj) {
  var retobj = {};
  for (var key in obj) {
    retobj[obj[key]] = key;
  }
  return retobj;
}

// to avoid memory leaks, this function will try to remove expired bids from the native wrapper.
function removeExpiredBidsFromNativeMapper() {
  const expiredBids = auctionManager.getBidsReceived().filter((bid) => !filters.isBidNotExpired(bid));
  for (const expiredBid of expiredBids) {
    nativeMapper.delete(expiredBid.requestId);
  }
}
