import {
  deepClone,
  getDefinedParams,
  insertHtmlIntoIframe,
  isArray,
  isBoolean,
  isInteger,
  isNumber,
  isPlainObject,
  logError,
  pick,
  triggerPixel
} from './utils.js';

import {auctionManager} from './auctionManager.js';
import {
  NATIVE_ASSET_TYPES,
  NATIVE_IMAGE_TYPES,
  NATIVE_KEYS,
  NATIVE_KEYS_THAT_ARE_NOT_ASSETS,
  PREBID_NATIVE_DATA_KEYS_TO_ORTB
} from './constants.js';
import {NATIVE} from './mediaTypes.js';
import {getRenderingData} from './adRendering.js';
import {getCreativeRendererSource, PUC_MIN_VERSION} from './creativeRenderers.js';
import {EVENT_TYPE_IMPRESSION, parseEventTrackers, TRACKER_METHOD_IMG, TRACKER_METHOD_JS} from './eventTrackers.js';
import type {Link, NativeRequest, NativeResponse} from "./types/ortb/native.d.ts";
import type {Size} from "./types/common.d.ts";
import type {Ext} from "./types/ortb/common.d.ts";
import type {BidResponse, NativeBidResponse} from "./bidfactory.ts";
import type {AdUnit} from "./adUnits.ts";

type LegacyAssets = Omit<{[K in keyof (typeof NATIVE_KEYS)]: unknown}, (typeof NATIVE_KEYS_THAT_ARE_NOT_ASSETS)[number]>;
type LegacyImageAssets = { icon: unknown, image: unknown };

type LegacyImageAssetResponse = {
  url: string;
  width: number;
  height: number;
}

export type LegacyNativeAssetsResponse = {
  [K in keyof Omit<LegacyAssets, keyof LegacyImageAssets>]?: string;
} & {
  [K in keyof LegacyImageAssets]?: LegacyImageAssetResponse
};

export type LegacyNativeResponse = LegacyNativeAssetsResponse & {
  clickUrl?: string;
  privacyLink?: string;
  clickTrackers?: string | string[];
  impressionTrackers?: string | string[];
  javascriptTrackers?: string | string[];
};

declare module './bidfactory' {
  interface NativeBidResponseProperties {
    native: LegacyNativeResponse & { ortb?: NativeResponse };
  }

  // core will always provide ortb for native responses

  interface NativeBidProperties {
    native: LegacyNativeResponse & { ortb: NativeResponse };
  }
}

type LegacyAssetRequest = {
  required?: boolean;
}

export type LegacyNativeRequest = {
  privacyLink?: LegacyAssetRequest;
  clickUrl?: LegacyAssetRequest;
  title?: LegacyAssetRequest & {
    len?: number;
  };
  ext?: Ext;
} & {
  [K in keyof typeof PREBID_NATIVE_DATA_KEYS_TO_ORTB]?: LegacyAssetRequest & {
    len?: number;
  }
} & {
  [K in keyof LegacyImageAssets]?: LegacyAssetRequest & {
    sizes?: Size | Size[];
    aspect_ratios?: {
      min_width: number;
      min_height: number;
      ratio_width: number;
      ratio_height: number;
    }[];
  }
}

export interface NativeMediaType extends LegacyNativeRequest {
  /**
   * `type: 'image'` acts as a shortcut for a native request for five assets:
   * image, title, "sponsored by" data, description (optional), and icon (optional).
   */
  type?: keyof typeof SUPPORTED_TYPES
  ortb?: NativeRequest;
}

export const nativeAdapters = [];

export const IMAGE: NativeMediaType = {
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
} as const;

// inverse native maps useful for converting to legacy
const PREBID_NATIVE_DATA_KEYS_TO_ORTB_INVERSE = inverse(PREBID_NATIVE_DATA_KEYS_TO_ORTB);
const NATIVE_ASSET_TYPES_INVERSE = inverse(NATIVE_ASSET_TYPES);

export function isNativeResponse(bidResponse: BidResponse): bidResponse is NativeBidResponse {
  // check for native data and not mediaType; it's possible
  // to treat banner responses as native
  return (bidResponse as NativeBidResponse).native != null && typeof (bidResponse as NativeBidResponse).native === 'object';
}

/**
 * Recieves nativeParams from an adUnit. If the params were not of type 'type',
 * passes them on directly. If they were of type 'type', translate
 * them into the predefined specific asset requests for that type of native ad.
 */
export function processNativeAdUnitParams(params: NativeMediaType): NativeMediaType {
  if (params && params.type && typeIsSupported(params.type)) {
    params = SUPPORTED_TYPES[params.type];
  }

  if (params && params.ortb && !isOpenRTBBidRequestValid(params.ortb)) {
    return;
  }
  return params;
}

declare module './adUnits' {
  interface AdUnit {
    nativeParams?: NativeMediaType;
    nativeOrtbRequest?: NativeRequest;
  }
}

export function decorateAdUnitsWithNativeParams(adUnits: AdUnit[]) {
  adUnits.forEach(adUnit => {
    const nativeParams =
      adUnit.nativeParams || adUnit?.mediaTypes?.native;
    if (nativeParams) {
      adUnit.nativeParams = processNativeAdUnitParams(nativeParams);
    }
    if (adUnit.nativeParams) {
      adUnit.nativeOrtbRequest = adUnit.nativeParams.ortb || toOrtbNativeRequest(adUnit.nativeParams);
    }
  });
}
export function isOpenRTBBidRequestValid(ortb: NativeRequest) {
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

function isOpenRTBAssetValid(asset: NativeRequest['assets'][0]) {
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
  if (!(type && Object.keys(SUPPORTED_TYPES).includes(type))) {
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
  const mediaTypes = adUnit?.mediaTypes?.native;
  return mediaType || mediaTypes;
}
export const nativeBidder = bid => nativeAdapters.includes(bid.bidder);
export const hasNonNativeBidder = adUnit =>
  adUnit.bids.filter(bid => !nativeBidder(bid)).length;

/**
 * Validate that the native assets on this bid contain all assets that were
 * marked as required in the adUnit configuration.
 * bid Native bid to validate
 * @return {Boolean} If object is valid
 */
export function nativeBidIsValid(bid, {index = auctionManager.index} = {}) {
  const adUnit = index.getAdUnit(bid);
  if (!adUnit) { return false; }
  const ortbRequest = adUnit.nativeOrtbRequest
  const ortbResponse = bid.native?.ortb || toOrtbNativeResponse(bid.native, ortbRequest);
  return isNativeOpenRTBBidValid(ortbResponse, ortbRequest);
}

export function isNativeOpenRTBBidValid(bidORTB, bidRequestORTB) {
  if (!bidORTB?.link?.url) {
    logError(`native response doesn't have 'link' property. Ortb response: `, bidORTB);
    return false;
  }

  const requiredAssetIds = bidRequestORTB.assets.filter(asset => asset.required === 1).map(a => a.id);
  const returnedAssetIds = bidORTB.assets.map(asset => asset.id);

  const match = requiredAssetIds.every(assetId => returnedAssetIds.includes(assetId));
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
export function fireNativeTrackers(message, bidResponse) {
  const nativeResponse = bidResponse.native.ortb || legacyPropertiesToOrtbNative(bidResponse.native);

  if (message.action === 'click') {
    fireClickTrackers(nativeResponse, message?.assetId);
  } else {
    fireImpressionTrackers(nativeResponse);
  }
  return message.action;
}

export function fireImpressionTrackers(nativeResponse, {runMarkup = (mkup) => insertHtmlIntoIframe(mkup), fetchURL = triggerPixel} = {}) {
  let {[TRACKER_METHOD_IMG]: img = [], [TRACKER_METHOD_JS]: js = []} = parseEventTrackers(
    nativeResponse.eventtrackers || []
  )[EVENT_TYPE_IMPRESSION] || {};

  if (nativeResponse.imptrackers) {
    img = img.concat(nativeResponse.imptrackers);
  }
  img.forEach(url => fetchURL(url));

  js = js.map(url => `<script async src="${url}"></script>`);
  if (nativeResponse.jstracker) {
    // jstracker is already HTML markup
    js = js.concat([nativeResponse.jstracker]);
  }
  if (js.length) {
    runMarkup(js.join('\n'));
  }
}

export function fireClickTrackers(nativeResponse, assetId = null, {fetchURL = triggerPixel} = {}) {
  // legacy click tracker
  if (!assetId) {
    (nativeResponse.link?.clicktrackers || []).forEach(url => fetchURL(url));
  } else {
    // ortb click tracker. This will try to call the clicktracker associated with the asset;
    // will fallback to the link if none is found.
    const assetIdLinkMap = (nativeResponse.assets || [])
      .filter(a => a.link)
      .reduce((map, asset) => {
        map[asset.id] = asset.link;
        return map
      }, {});
    const masterClickTrackers = nativeResponse.link?.clicktrackers || [];
    const assetLink = assetIdLinkMap[assetId];
    let clickTrackers = masterClickTrackers;
    if (assetLink) {
      clickTrackers = assetLink.clicktrackers || [];
    }
    clickTrackers.forEach(url => fetchURL(url));
  }
}

export function setNativeResponseProperties(bid, adUnit) {
  const nativeOrtbRequest = adUnit?.nativeOrtbRequest;
  const nativeOrtbResponse = bid.native?.ortb;

  if (nativeOrtbRequest && nativeOrtbResponse) {
    const legacyResponse = toLegacyResponse(nativeOrtbResponse, nativeOrtbRequest);
    Object.assign(bid.native, legacyResponse);
  }

  ['rendererUrl', 'adTemplate'].forEach(prop => {
    const val = adUnit?.nativeParams?.[prop];
    if (val) {
      bid.native[prop] = getAssetValue(val);
    }
  });
}

function getNativeAssets(nativeProps, keys, ext = false) {
  const assets = [];
  Object.entries(nativeProps)
    .filter(([k, v]) => v && ((ext === false && k === 'ext') || keys == null || keys.includes(k)))
    .forEach(([key, value]) => {
      if (ext === false && key === 'ext') {
        assets.push(...getNativeAssets(value, keys, true));
      } else if (ext || NATIVE_KEYS.hasOwnProperty(key)) {
        assets.push({key, value: getAssetValue(value)});
      }
    });
  return assets;
}

export function getNativeRenderingData(bid, adUnit, keys) {
  const data: any = {
    ...getDefinedParams(bid.native, ['rendererUrl', 'adTemplate']),
    assets: getNativeAssets(bid.native, keys),
    nativeKeys: NATIVE_KEYS
  };
  if (bid.native.ortb) {
    data.ortb = bid.native.ortb;
  } else if (adUnit.mediaTypes?.native?.ortb) {
    data.ortb = toOrtbNativeResponse(bid.native, adUnit.nativeOrtbRequest);
  }
  return data;
}

function assetsMessage(data, adObject, keys, {index = auctionManager.index} = {}) {
  const msg: any = {
    message: 'assetResponse',
    adId: data.adId,
  };
  let renderData = getRenderingData(adObject).native;
  if (renderData) {
    // if we have native rendering data (set up by the nativeRendering module)
    // include it in full ("all assets") together with the renderer.
    // this is to allow PUC to use dynamic renderers without requiring changes in creative setup
    msg.native = Object.assign({}, renderData);
    msg.renderer = getCreativeRendererSource(adObject);
    msg.rendererVersion = PUC_MIN_VERSION;
    if (keys != null) {
      renderData.assets = renderData.assets.filter(({key}) => keys.includes(key))
    }
  } else {
    renderData = getNativeRenderingData(adObject, index.getAdUnit(adObject), keys);
  }
  return Object.assign(msg, renderData);
}

const NATIVE_KEYS_INVERTED = Object.fromEntries(Object.entries(NATIVE_KEYS).map(([k, v]) => [v, k]));

/**
 * Constructs a message object containing asset values for each of the
 * requested data keys.
 */
export function getAssetMessage(data, adObject) {
  const keys = data.assets.map((k) => NATIVE_KEYS_INVERTED[k]);
  return assetsMessage(data, adObject, keys);
}

export function getAllAssetsMessage(data, adObject) {
  return assetsMessage(data, adObject, null);
}

/**
 * Native assets can be a string or an object with a url prop. Returns the value
 * appropriate for sending in adserver targeting or placeholder replacement.
 */
function getAssetValue(value) {
  return value?.url || value;
}
/**
 * converts Prebid legacy native assets request to OpenRTB format
 * @param {object} legacyNativeAssets an object that describes a native bid request in Prebid proprietary format
 * @returns an OpenRTB format of the same bid request
 */
export function toOrtbNativeRequest(legacyNativeAssets: LegacyNativeRequest): NativeRequest {
  if (!legacyNativeAssets && !isPlainObject(legacyNativeAssets)) {
    logError('Native assets object is empty or not an object: ', legacyNativeAssets);
    return;
  }
  const ortb: NativeRequest = {
    ver: '1.2',
    assets: []
  };
  for (const key in legacyNativeAssets) {
    // skip conversion for non-asset keys
    if (NATIVE_KEYS_THAT_ARE_NOT_ASSETS.includes(key as any)) continue;
    if (!NATIVE_KEYS.hasOwnProperty(key)) {
      logError(`Unrecognized native asset code: ${key}. Asset will be ignored.`);
      continue;
    }

    if (key === 'privacyLink') {
      ortb.privacy = 1;
      continue;
    }

    const asset = legacyNativeAssets[key];
    let required = 0;
    if (asset.required && isBoolean(asset.required)) {
      required = Number(asset.required);
    }
    const ortbAsset: any = {
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
        } else if (!asset.aspect_ratios.length) {
          logError("image.aspect_ratios was passed, but it's empty:", asset.aspect_ratios);
        } else {
          const { min_width: minWidth, min_height: minHeight } = asset.aspect_ratios[0];
          if (!isInteger(minWidth) || !isInteger(minHeight)) {
            logError('image.aspect_ratios min_width or min_height are invalid: ', minWidth, minHeight);
          } else {
            ortbAsset.img.wmin = minWidth;
            ortbAsset.img.hmin = minHeight;
          }
          const aspectRatios = asset.aspect_ratios
            .filter((ar) => ar.ratio_width && ar.ratio_height)
            .map(ratio => `${ratio.ratio_width}:${ratio.ratio_height}`);
          if (aspectRatios.length > 0) {
            ortbAsset.img.ext = {
              aspectratios: aspectRatios
            }
          }
        }
      }

      // if asset.sizes exist, by OpenRTB spec we should remove wmin and hmin
      if (asset.sizes) {
        if (asset.sizes.length !== 2 || !isInteger(asset.sizes[0]) || !isInteger(asset.sizes[1])) {
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
      ortbAsset.ext = asset;
      // in `ext` case, required field is not needed
      delete ortbAsset.required;
    }
    ortb.assets.push(ortbAsset);
  }
  return ortb;
}

/**
 * Greatest common divisor between two positive integers
 * https://en.wikipedia.org/wiki/Euclidean_algorithm
 */
function gcd(a, b) {
  while (a && b && a !== b) {
    if (a > b) {
      a = a - b;
    } else {
      b = b - a;
    }
  }
  return a || b;
}

/**
 * This function converts an OpenRTB native request object to Prebid proprietary
 * format. The purpose of this function is to help adapters to handle the
 * transition phase where publishers may be using OpenRTB objects but the
 *  bidder does not yet support it.
 * @param {object} openRTBRequest an OpenRTB v1.2 request object
 * @returns a Prebid legacy native format request
 */
export function fromOrtbNativeRequest(openRTBRequest: NativeRequest) {
  if (!isOpenRTBBidRequestValid(openRTBRequest)) {
    return;
  }

  const oldNativeObject: any = {};
  for (const asset of openRTBRequest.assets) {
    if (asset.title) {
      const title = {
        required: asset.required ? Boolean(asset.required) : false,
        len: asset.title.len
      }
      oldNativeObject.title = title;
    } else if (asset.img) {
      const image: any = {
        required: asset.required ? Boolean(asset.required) : false,
      }
      if (asset.img.w && asset.img.h) {
        image.sizes = [asset.img.w, asset.img.h];
      } else if (asset.img.wmin && asset.img.hmin) {
        const scale = gcd(asset.img.wmin, asset.img.hmin)
        image.aspect_ratios = [{
          min_width: asset.img.wmin,
          min_height: asset.img.hmin,
          ratio_width: asset.img.wmin / scale,
          ratio_height: asset.img.hmin / scale
        }]
      }

      if (asset.img.type === NATIVE_IMAGE_TYPES.MAIN) {
        oldNativeObject.image = image;
      } else {
        oldNativeObject.icon = image;
      }
    } else if (asset.data) {
      const assetType = Object.keys(NATIVE_ASSET_TYPES).find(k => NATIVE_ASSET_TYPES[k] === asset.data.type);
      const prebidAssetName = Object.keys(PREBID_NATIVE_DATA_KEYS_TO_ORTB).find(k => PREBID_NATIVE_DATA_KEYS_TO_ORTB[k] === assetType);
      oldNativeObject[prebidAssetName] = {
        required: asset.required ? Boolean(asset.required) : false,
      }
      if (asset.data.len) {
        oldNativeObject[prebidAssetName].len = asset.data.len;
      }
    }
    if (openRTBRequest.privacy) {
      oldNativeObject.privacyLink = { required: false };
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
 * @param bidRequests an array of valid bid requests
 * @returns an array of valid bid requests where the openRTB bids are converted to proprietary format.
 */
export function convertOrtbRequestToProprietaryNative(bidRequests) {
  if (FEATURES.NATIVE) {
    if (!bidRequests || !isArray(bidRequests)) return bidRequests;
    // check if a conversion is needed
    if (!bidRequests.some(bidRequest => (bidRequest?.mediaTypes || {})[NATIVE]?.ortb)) {
      return bidRequests;
    }
    const bidRequestsCopy = deepClone(bidRequests);
    // convert Native ORTB definition to old-style prebid native definition
    for (const bidRequest of bidRequestsCopy) {
      if (bidRequest.mediaTypes && bidRequest.mediaTypes[NATIVE] && bidRequest.mediaTypes[NATIVE].ortb) {
        bidRequest.mediaTypes[NATIVE] = Object.assign(
          pick(bidRequest.mediaTypes[NATIVE], NATIVE_KEYS_THAT_ARE_NOT_ASSETS),
          fromOrtbNativeRequest(bidRequest.mediaTypes[NATIVE].ortb)
        );
        bidRequest.nativeParams = processNativeAdUnitParams(bidRequest.mediaTypes[NATIVE]);
      }
    }
    return bidRequestsCopy;
  }
  return bidRequests;
}

/**
 * convert PBJS proprietary native properties that are *not* assets to the ORTB native format.
 *
 * @param legacyNative `bidResponse.native` object as returned by adapters
 */
export function legacyPropertiesToOrtbNative(legacyNative: LegacyNativeResponse): Partial<NativeResponse> {
  const response: NativeResponse = {
    link: {} as Link,
    eventtrackers: []
  }
  Object.entries(legacyNative).forEach(([key, value]) => {
    switch (key) {
      case 'clickUrl':
        response.link.url = value as string;
        break;
      case 'clickTrackers':
        response.link.clicktrackers = (Array.isArray(value) ? value : [value]) as string[];
        break;
      case 'impressionTrackers':
        (Array.isArray(value) ? value : [value]).forEach((url: string) => {
          response.eventtrackers.push({
            event: EVENT_TYPE_IMPRESSION,
            method: TRACKER_METHOD_IMG,
            url
          });
        });
        break;
      case 'javascriptTrackers':
        // jstracker is deprecated, but we need to use it here since 'javascriptTrackers' is markup, not an url
        // TODO: at the time of writing this, core expected javascriptTrackers to be a string (despite the name),
        // but many adapters are passing an array. It's possible that some of them are, in fact, passing URLs and not markup
        // in general, native trackers seem to be neglected and/or broken
        response.jstracker = Array.isArray(value) ? value.join('') : value as string;
        break;
      case 'privacyLink':
        response.privacy = value as string;
        break;
    }
  });
  return response;
}

export function toOrtbNativeResponse(legacyResponse: LegacyNativeResponse, ortbRequest): NativeResponse {
  const ortbResponse = {
    ...legacyPropertiesToOrtbNative(legacyResponse),
    assets: []
  } as NativeResponse;

  function useRequestAsset(predicate, fn) {
    let asset = ortbRequest.assets.find(predicate);
    if (asset != null) {
      asset = deepClone(asset);
      fn(asset);
      ortbResponse.assets.push(asset);
    }
  }

  Object.keys(legacyResponse).filter(key => !!legacyResponse[key]).forEach(key => {
    const value = getAssetValue(legacyResponse[key]);
    switch (key) {
      // process titles
      case 'title':
        useRequestAsset(asset => asset.title != null, titleAsset => {
          titleAsset.title = {
            text: value
          };
        })
        break;
      case 'image':
      case 'icon':
        const imageType = key === 'image' ? NATIVE_IMAGE_TYPES.MAIN : NATIVE_IMAGE_TYPES.ICON;
        useRequestAsset(asset => asset.img != null && asset.img.type === imageType, imageAsset => {
          imageAsset.img = {
            url: value
          };
        })
        break;
      default:
        if (key in PREBID_NATIVE_DATA_KEYS_TO_ORTB) {
          useRequestAsset(asset => asset.data != null && asset.data.type === NATIVE_ASSET_TYPES[PREBID_NATIVE_DATA_KEYS_TO_ORTB[key]], dataAsset => {
            dataAsset.data = {
              value
            };
          })
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
export function toLegacyResponse(ortbResponse: NativeResponse, ortbRequest: NativeRequest) {
  const legacyResponse = {} as LegacyNativeResponse;
  const requestAssets = ortbRequest?.assets || [];
  legacyResponse.clickUrl = ortbResponse.link?.url;
  legacyResponse.privacyLink = ortbResponse.privacy;
  for (const asset of ortbResponse?.assets || []) {
    const requestAsset = requestAssets.find(reqAsset => asset.id === reqAsset.id);
    if (asset.title) {
      legacyResponse.title = asset.title.text;
    } else if (asset.img) {
      legacyResponse[requestAsset?.img?.type === NATIVE_IMAGE_TYPES.MAIN ? 'image' : 'icon'] = {
        url: asset.img.url,
        width: asset.img.w,
        height: asset.img.h
      };
    } else if (asset.data) {
      legacyResponse[PREBID_NATIVE_DATA_KEYS_TO_ORTB_INVERSE[NATIVE_ASSET_TYPES_INVERSE[requestAsset?.data?.type]]] = asset.data.value;
    }
  }

  // Handle trackers
  legacyResponse.impressionTrackers = [];
  let jsTrackers = [];

  if (ortbResponse.imptrackers) {
    legacyResponse.impressionTrackers.push(...ortbResponse.imptrackers);
  }
  for (const eventTracker of ortbResponse?.eventtrackers || []) {
    if (eventTracker.event === EVENT_TYPE_IMPRESSION && eventTracker.method === TRACKER_METHOD_IMG) {
      legacyResponse.impressionTrackers.push(eventTracker.url);
    }
    if (eventTracker.event === EVENT_TYPE_IMPRESSION && eventTracker.method === TRACKER_METHOD_JS) {
      jsTrackers.push(eventTracker.url);
    }
  }

  jsTrackers = jsTrackers.map(url => `<script async src="${url}"></script>`);
  if (ortbResponse?.jstracker) { jsTrackers.push(ortbResponse.jstracker); }
  if (jsTrackers.length) {
    legacyResponse.javascriptTrackers = jsTrackers.join('\n');
  }

  return legacyResponse;
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
