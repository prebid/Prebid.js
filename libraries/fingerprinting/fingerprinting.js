import {config} from '../../src/config.js';
import {canAccessWindowTop, internal as utilsInternals} from '../../src/utils.js';

/**
 * Returns the window to use for fingerprinting reads: win if provided, otherwise top or self.
 * @param {Window} [win]
 * @returns {Window}
 */
export function getFallbackWindow(win) {
  if (win) {
    return win;
  }
  return canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf();
}

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
