import {isFingerprintingApiDisabled} from '../fingerprinting/fingerprinting.js';

export function getTimeZone() {
  if (isFingerprintingApiDisabled('resolvedoptions')) {
    return '';
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
