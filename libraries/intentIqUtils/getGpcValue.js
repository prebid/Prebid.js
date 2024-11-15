import { getWindowTop, getWindowSelf } from '../../src/utils.js';

/**
 * Retrieves the Global Privacy Control (GPC) signal from the browser.
 * This function attempts to access the `globalPrivacyControl` property from both the top-level and self-level window objects' `navigator`.
 * If the GPC signal is available, it returns its value; otherwise, it returns `null`.
 * This ensures compatibility with various browser contexts and handles potential errors.
 *
 * @return {boolean|null} The GPC signal:
 * - `true` if GPC is enabled,
 * - `false` if GPC is explicitly disabled,
 * - `null` if GPC is not supported or cannot be determined.
 */
export function getGpcSignal() {
  try {
    const topWindow = getWindowTop();
    const selfWindow = getWindowSelf();
    if (topWindow?.navigator?.globalPrivacyControl !== undefined) {
      return topWindow.navigator.globalPrivacyControl;
    }
    if (selfWindow?.navigator?.globalPrivacyControl !== undefined) {
      return selfWindow.navigator.globalPrivacyControl;
    }
    return null;
  } catch (e) {
    return null;
  }
}
