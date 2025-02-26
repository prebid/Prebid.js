import { getWindowTop, logError, getWindowLocation, getWindowSelf } from '../../src/utils.js';

/**
 * Determines if the script is running inside an iframe and retrieves the URL.
 * @return {string} The encoded vrref value representing the relevant URL.
 */
export function getReferrer() {
  try {
    if (getWindowSelf() === getWindowTop()) {
      return encodeURIComponent(getWindowLocation().href);
    } else {
      return encodeURIComponent(getWindowTop().location.href);
    }
  } catch (error) {
    logError(`Error accessing location: ${error}`);
    return '';
  }
}

/**
 * Appends `vrref` and `fui` parameters to the provided URL.
 * If the referrer URL is available, it appends `vrref` with the relevant referrer value based on the domain.
 * Otherwise, it appends `fui=1`. If a domain name is provided, it may also append `vrref` with the domain.
 * @param {string} url - The URL to append parameters to.
 * @param {string} domainName - The domain name used to determine the relevant referrer.
 * @return {string} The modified URL with appended `vrref` or `fui` parameters.
 */
export function appendVrrefAndFui(url, domainName) {
  const fullUrl = getReferrer();
  if (fullUrl) {
    return (url += '&vrref=' + getRelevantRefferer(domainName, fullUrl));
  }
  url += '&fui=1'; // Full Url Issue
  url += '&vrref=' + encodeURIComponent(domainName || '');
  return url;
}

/**
 * Get the relevant referrer based on full URL and domain
 * @param {string} domainName The domain name to compare
 * @param {string} fullUrl The full URL to analyze
 * @return {string} The relevant referrer
 */
export function getRelevantRefferer(domainName, fullUrl) {
  if (domainName && isDomainIncluded(fullUrl, domainName)) {
    return fullUrl;
  }
  return domainName ? encodeURIComponent(domainName) : fullUrl;
}

/**
 * Checks if the provided domain name is included in the full URL.
 * @param {string} fullUrl - The full URL to check.
 * @param {string} domainName - The domain name to search for within the URL.
 * @return {boolean} `True` if the domain name is found in the URL, `false` otherwise.
 */
export function isDomainIncluded(fullUrl, domainName) {
  try {
    return fullUrl.includes(domainName);
  } catch (error) {
    logError(`Invalid URL provided: ${error}`);
    return false;
  }
}
