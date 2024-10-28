import { logError } from '../../src/utils.js';

/**
 * Detects the browser using either userAgent or userAgentData
 * @return {string} The name of the detected browser or 'unknown' if unable to detect
 */
export function detectBrowser() {
  try {
    if (navigator.userAgent) {
      return detectBrowserFromUserAgent(navigator.userAgent);
    } else if (navigator.userAgentData) {
      return detectBrowserFromUserAgentData(navigator.userAgentData);
    }
  } catch (error) {
    logError('Error detecting browser:', error);
  }
  return 'unknown';
}

/**
 * Detects the browser from the user agent string
 * @param {string} userAgent - The user agent string from the browser
 * @return {string} The name of the detected browser or 'unknown' if unable to detect
 */
export function detectBrowserFromUserAgent(userAgent) {
  const browserRegexPatterns = {
    opera: /Opera|OPR/,
    edge: /Edg/,
    chrome: /Chrome|CriOS/,
    safari: /Safari/,
    firefox: /Firefox/,
    ie: /MSIE|Trident/,
  };

  // Check for Chrome first to avoid confusion with Safari
  if (browserRegexPatterns.chrome.test(userAgent)) {
    return 'chrome';
  }

  // Now we can safely check for Safari
  if (browserRegexPatterns.safari.test(userAgent) && !browserRegexPatterns.chrome.test(userAgent)) {
    return 'safari';
  }

  // Check other browsers
  for (const browser in browserRegexPatterns) {
    if (browserRegexPatterns[browser].test(userAgent)) {
      return browser;
    }
  }

  return 'unknown';
}

/**
 * Detects the browser from the NavigatorUAData object
 * @param {NavigatorUAData} userAgentData - The user agent data object from the browser
 * @return {string} The name of the detected browser or 'unknown' if unable to detect
 */
export function detectBrowserFromUserAgentData(userAgentData) {
  const brandNames = userAgentData.brands.map(brand => brand.brand);

  if (brandNames.includes('Microsoft Edge')) {
    return 'edge';
  } else if (brandNames.includes('Opera')) {
    return 'opera';
  } else if (brandNames.some(brand => brand === 'Chromium' || brand === 'Google Chrome')) {
    return 'chrome';
  }

  return 'unknown';
}
