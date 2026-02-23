import {isFingerprintingApiDisabled} from '../fingerprinting/fingerprinting.js';
import {getFallbackWindow} from '../../src/utils.js';

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
