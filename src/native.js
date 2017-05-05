import { getBidRequest, logError } from './utils';
// import { nativeAdapters } from './adaptermanager';
const nativeAdapters = ['appnexusAst'];

export const NATIVE_KEYS = {
  title: 'hb_native_title',
  body: 'hb_native_body',
  sponsored_by: 'hb_native_brand',
  image: 'hb_native_image',
  icon: 'hb_native_icon',
  click_url: 'hb_native_linkurl',
};

export const NATIVE_TARGETING_KEYS = Object.keys(NATIVE_KEYS).map(
  key => NATIVE_KEYS[key]
);

const IMAGE = {
  image: {required: true},
  title: {required: true},
  sponsored_by: {required: true},
  click_url: {required: true},
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
export default function processNativeAdUnitParams(params) {
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
const nonNativeBidder = bid => !nativeAdapters.includes(bid.bidder);
export const hasNonNativeBidder = adUnit => adUnit.bids.filter(nonNativeBidder).length;

/*
 * Validate that the native assets on this bid contain all assets that were
 * marked as required in the adUnit configuration.
 */
export function nativeBidIsValid(bid) {
  const bidRequest = getBidRequest(bid.adId);
  if (!bidRequest) {return false;}

  const requestedAssets = bidRequest.nativeParams;
  if (!requestedAssets) {return true;}

  const requiredAssets = Object.keys(requestedAssets).filter(
    key => requestedAssets[key].required
  );
  const returnedAssets = Object.keys(bid.native);

  return requiredAssets.every(asset => returnedAssets.includes(asset));
}

/*
 * Native responses may have impression trackers. This retrieves the
 * impression tracker urls for the given ad object and fires them.
 */
export function fireNativeImpressions(adObject) {
  const impressionTrackers = adObject.native &&
    adObject.native.impression_trackers;

  (impressionTrackers || []).forEach(tracker => {
    const pixel = createImpressionPixel(tracker);
    attachPixel(pixel);
  });
}

/*
 * Create an invisible pixel
 */
function createImpressionPixel(src) {
  const img = new Image();

  img.src = src;
  img.height = 0;
  img.width = 0;
  img.style.display = 'none';
  img.onload = () => {
    try {this.parentNode.removeChild(this);}
    catch (error) {logError(`error creating pixel with ${src}`);}
  };

  return img;
}

/*
 * Append to head
 */
function attachPixel(pixel) {
  let elements = document.getElementsByTagName('head');

  try {
    elements = elements.length ? elements : document.getElementsByTagName('body');

    if (elements.length) {
      const element = elements[0];
      element.insertBefore(pixel, element.firstChild);
    }
  }
  catch (error) {
    logError(`error attaching pixel: ${error.message}`);
  }
}
