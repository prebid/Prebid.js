import { deepAccess, getKeyByValue, insertHtmlIntoIframe, logError, triggerPixel } from './utils.js';
import {includes} from './polyfill.js';
import {auctionManager} from './auctionManager.js';
import CONSTANTS from './constants.json';

export const nativeAdapters = [];

export const NATIVE_TARGETING_KEYS = Object.keys(CONSTANTS.NATIVE_KEYS).map(
  key => CONSTANTS.NATIVE_KEYS[key]
);

const IMAGE = {
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

/**
 * Recieves nativeParams from an adUnit. If the params were not of type 'type',
 * passes them on directly. If they were of type 'type', translate
 * them into the predefined specific asset requests for that type of native ad.
 */
export function processNativeAdUnitParams(params) {
  if (params && params.type && typeIsSupported(params.type)) {
    return SUPPORTED_TYPES[params.type];
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
  // all native bid responses must define a landing page url
  if (!deepAccess(bid, 'native.clickUrl')) {
    return false;
  }

  const requestedAssets = index.getAdUnit(bid).nativeParams;
  if (!requestedAssets) {
    return true;
  }

  const requiredAssets = Object.keys(requestedAssets).filter(
    key => requestedAssets[key].required
  );
  const returnedAssets = Object.keys(bid['native']).filter(
    key => bid['native'][key]
  );

  return requiredAssets.every(asset => includes(returnedAssets, asset));
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
    assets: []
  };

  Object.keys(adObject.native).forEach(function(key, index) {
    if (key === 'adTemplate' && adObject.native[key]) {
      message.adTemplate = getAssetValue(adObject.native[key]);
    } else if (key === 'rendererUrl' && adObject.native[key]) {
      message.rendererUrl = getAssetValue(adObject.native[key]);
    } else if (key === 'ext') {
      Object.keys(adObject.native[key]).forEach(extKey => {
        if (adObject.native[key][extKey]) {
          const value = getAssetValue(adObject.native[key][extKey]);
          message.assets.push({ key: extKey, value });
        }
      })
    } else if (adObject.native[key] && CONSTANTS.NATIVE_KEYS.hasOwnProperty(key)) {
      const value = getAssetValue(adObject.native[key]);

      message.assets.push({ key, value });
    }
  });

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
