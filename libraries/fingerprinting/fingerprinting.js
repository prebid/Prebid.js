import {config} from '../../src/config.js';

/**
 * Returns true if the given fingerprinting API is disabled via setConfig({ disableFingerprintingApis: [...] }).
 * Comparison is case-insensitive. Use for 'devicepixelratio', 'webdriver', 'resolvedoptions', 'screen'.
 * @param {string} apiName
 * @returns {boolean}
 */
export function isFingerprintingApiDisabled(apiName) {
  const list = config.getConfig('disableFingerprintingApis');
  return Array.isArray(list) && list.some((item) => String(item).toLowerCase() === apiName.toLowerCase());
}
