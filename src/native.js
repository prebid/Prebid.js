import { getBidRequest, logError, insertPixel } from './utils';

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
  image: {required: true},
  title: {required: true},
  sponsoredBy: {required: true},
  clickUrl: {required: true},
  body: {required: false},
  icon: {required: false},
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
export const nativeAdUnit = adUnit => adUnit.mediaType === 'native';
export const nativeBidder = bid => nativeAdapters.includes(bid.bidder);
export const hasNonNativeBidder = adUnit =>
  adUnit.bids.filter(bid => !nativeBidder(bid)).length;

/*
 * Validate that the native assets on this bid contain all assets that were
 * marked as required in the adUnit configuration.
 */
export function nativeBidIsValid(bid) {
  const bidRequest = getBidRequest(bid.adId);
  if (!bidRequest) { return false; }

  const requestedAssets = bidRequest.nativeParams;
  if (!requestedAssets) { return true; }

  const requiredAssets = Object.keys(requestedAssets).filter(
    key => requestedAssets[key].required
  );
  const returnedAssets = Object.keys(bid.native).filter(key => bid.native[key]);

  return requiredAssets.every(asset => returnedAssets.includes(asset));
}

/*
 * Native responses may have impression trackers. This retrieves the
 * impression tracker urls for the given ad object and fires them.
 */
export function fireNativeImpressions(adObject) {
  const impressionTrackers = adObject.native &&
    adObject.native.impressionTrackers;

  (impressionTrackers || []).forEach(tracker => {
    insertPixel(tracker);
  });
}
