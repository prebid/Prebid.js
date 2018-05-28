import { deepAccess, getBidRequest, logError, triggerPixel } from './utils';

export const nativeAdapters = [];

export const NATIVE_KEYS = {
  title: 'hb_native_title',
  body: 'hb_native_body',
  sponsoredBy: 'hb_native_brand',
  image: 'hb_native_image',
  icon: 'hb_native_icon',
  clickUrl: 'hb_native_linkurl',
  cta: 'hb_native_cta',
};

export const NATIVE_TARGETING_KEYS = Object.keys(NATIVE_KEYS).map(
  key => NATIVE_KEYS[key]
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
  const mediaTypes = deepAccess(adUnit, 'mediaTypes.native');
  return mediaType || mediaTypes;
}
export const nativeBidder = bid => nativeAdapters.includes(bid.bidder);
export const hasNonNativeBidder = adUnit =>
  adUnit.bids.filter(bid => !nativeBidder(bid)).length;

/*
 * Validate that the native assets on this bid contain all assets that were
 * marked as required in the adUnit configuration.
 */
export function nativeBidIsValid(bid) {
  const bidRequest = getBidRequest(bid.adId);
  if (!bidRequest) {
    return false;
  }

  // all native bid responses must define a landing page url
  if (!deepAccess(bid, 'native.clickUrl')) {
    return false;
  }

  const requestedAssets = bidRequest.nativeParams;
  if (!requestedAssets) {
    return true;
  }

  const requiredAssets = Object.keys(requestedAssets).filter(
    key => requestedAssets[key].required
  );
  const returnedAssets = Object.keys(bid['native']).filter(
    key => bid['native'][key]
  );

  return requiredAssets.every(asset => returnedAssets.includes(asset));
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
  }

  (trackers || []).forEach(triggerPixel);
}

/**
 * Gets native targeting key-value paris
 * @param {Object} bid
 * @return {Object} targeting
 */
export function getNativeTargeting(bid) {
  let keyValues = {};

  Object.keys(bid['native']).forEach(asset => {
    const key = NATIVE_KEYS[asset];
    let value = bid['native'][asset];

    // native image-type assets can be a string or an object with a url prop
    if (typeof value === 'object' && value.url) {
      value = value.url;
    }

    if (key) {
      keyValues[key] = value;
    }
  });

  return keyValues;
}
