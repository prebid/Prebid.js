import { getWindowLocation, getWindowTop, logError } from '../../src/utils.js';

/**
 * Generate the vrref value without appending it to a URL
 * @return {string} The encoded vrref value
 */
export function generateVrrefValue() {
  try {
    const fullUrl = getWindowTop()?.location.href;
    const domainName = getWindowLocation()?.hostname;

    if (!fullUrl && !domainName) {
      logError('Error: Unable to retrieve fullUrl or domainName.');
      return '';
    }

    return getRelevantRefferer(domainName, fullUrl);
  } catch (error) {
    logError(`Error generating vrref value: ${error}`);
    return '';
  }
}

/**
 * Append vrref and fui parameters to the URL
 * @param {string} url The URL to append parameters to
 * @return {string} The URL with appended vrref or fui parameters
 */
export function appendVrrefAndFui(url) {
  try {
    const fullUrl = getWindowTop()?.location.href;
    const domainName = getWindowLocation()?.hostname;

    if (!fullUrl && !domainName) {
      logError('Error: Unable to retrieve fullUrl or domainName.');
      return url;
    }

    url += '&vrref=' + getRelevantRefferer(domainName, fullUrl);

    if (!fullUrl) url += '&fui=1';
  } catch (error) {
    logError(`Error appending vrref and fui to URL: ${error}`);
  }
  return url;
}

/**
 * Get the relevant referrer based on full URL and domain
 * @param {string} domainName The domain name to compare
 * @param {string} fullUrl The full URL to analyze
 * @return {string} The relevant referrer
 */
export function getRelevantRefferer(domainName, fullUrl) {
  try {
    return encodeURIComponent(
      domainName && isDomainIncluded(fullUrl, domainName) ? fullUrl : domainName || fullUrl
    );
  } catch (error) {
    logError('Error getting relevant referrer: ', error);
    return '';
  }
}

/**
 * Check if the domain is included in the full URL
 * @param {string} fullUrl The full URL to analyze
 * @param {string} domainName The domain name to compare
 * @return {boolean} True if the domain is included, false otherwise
 */
export function isDomainIncluded(fullUrl, domainName) {
  try {
    const url = new URL(fullUrl);
    return url.hostname === domainName;
  } catch (error) {
    logError(`Invalid URL provided: ${error}`);
    return false;
  }
}
