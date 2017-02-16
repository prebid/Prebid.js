import { logError } from './utils';

export const NATIVE_KEYS = {
  title: 'hb_native_title',
  description: 'hb_native_body',
  sponsored_by: 'hb_native_brand',
  image: 'hb_native_image',
  click_url: 'hb_native_linkurl',
};

const IMAGE = {
  image: {
    required: true,
  },
  title: {
    required: true,
    len: 80,
  },
  brand: {
    required: true,
  },
  url: {
    required: true,
  },
  body: {
    required: true,
  },
  icon: {
    required: true,
  },
};

const SUPPORTED_TYPES = {
  image: IMAGE
};

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
 * Recieves nativeParams from an adUnit. If the params were not of type 'type',
 * passes them on directly. If they were of type 'type', translate
 * them into the predefined specific asset requests for that type of native ad.
 */
export default function(input) {
  if (input && input.type && typeIsSupported(input.type)) {
    return SUPPORTED_TYPES[input.type];
  }

  return input;
}
