import {isFingerprintingApiDisabled, getFallbackWindow} from '../fingerprinting/fingerprinting.js';

export function getDevicePixelRatio(win) {
  if (isFingerprintingApiDisabled('devicepixelratio')) {
    return 1;
  }
  try {
    return getFallbackWindow(win).devicePixelRatio;
  } catch (e) {
  }
  return 1;
}
