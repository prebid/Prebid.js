/**
 * Retrieves the referrer information from the bidder request.
 *
 * @param {Object} bidderRequest - The bidder request object.
 * @param {Object} [bidderRequest.refererInfo] - The referer information object.
 * @param {string} [bidderRequest.refererInfo.page] - The page URL of the referer.
 * @returns {string} The referrer URL if available, otherwise an empty string.
 */
export function getReferrerInfo(bidderRequest) {
  let ref = '';
  if (bidderRequest && bidderRequest.refererInfo && bidderRequest.refererInfo.page) {
    ref = bidderRequest.refererInfo.page;
  }
  return ref;
}

/**
 * Retrieves the title of the current web page.
 *
 * This function attempts to get the title from the top-level window's document.
 * If an error occurs (e.g., due to cross-origin restrictions), it falls back to the current document.
 * It first tries to get the title from the `og:title` meta tag, and if that is not available, it uses the document's title.
 *
 * @returns {string} The title of the current web page, or an empty string if no title is found.
 */
export function getPageTitle() {
  try {
    const ogTitle = window.top.document.querySelector('meta[property="og:title"]');
    return window.top.document.title || (ogTitle && ogTitle.content) || '';
  } catch (e) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    return document.title || (ogTitle && ogTitle.content) || '';
  }
}

/**
 * Retrieves the content of the page description meta tag.
 *
 * This function attempts to get the description from the top-level window's document.
 * If it fails (e.g., due to cross-origin restrictions), it falls back to the current document.
 * It looks for meta tags with either the name "description" or the property "og:description".
 *
 * @returns {string} The content of the description meta tag, or an empty string if not found.
 */
export function getPageDescription() {
  try {
    const element = window.top.document.querySelector('meta[name="description"]') ||
        window.top.document.querySelector('meta[property="og:description"]');
    return (element && element.content) || '';
  } catch (e) {
    const element = document.querySelector('meta[name="description"]') ||
        document.querySelector('meta[property="og:description"]');
    return (element && element.content) || '';
  }
}

/**
 * Retrieves the downlink speed of the user's network connection.
 *
 * @param {object} nav - The navigator object, typically `window.navigator`.
 * @returns {string} The downlink speed as a string if available, otherwise an empty string.
 */
export function getConnectionDownLink(nav) {
  return nav && nav.connection && nav.connection.downlink >= 0 ? nav.connection.downlink.toString() : '';
}
