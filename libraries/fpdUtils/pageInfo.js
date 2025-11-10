/**
 * get page title
 * @returns {string}
 */
export function getPageTitle(win = window) {
  try {
    const ogTitle = win.top.document.querySelector('meta[property="og:title"]');
    return win.top.document.title || (ogTitle && ogTitle.content) || '';
  } catch (e) {
    const ogTitle = document.querySelector('meta[property="og:title"]');
    return document.title || (ogTitle && ogTitle.content) || '';
  }
}

/**
 * get page description
 * @returns {string}
 */
export function getPageDescription(win = window) {
  let element;

  try {
    element = win.top.document.querySelector('meta[name="description"]') ||
      win.top.document.querySelector('meta[property="og:description"]')
  } catch (e) {
    element = document.querySelector('meta[name="description"]') ||
      document.querySelector('meta[property="og:description"]')
  }

  return (element && element.content) || '';
}

/**
 * get page keywords
 * @returns {string}
 */
export function getPageKeywords(win = window) {
  let element;

  try {
    element = win.top.document.querySelector('meta[name="keywords"]');
  } catch (e) {
    element = document.querySelector('meta[name="keywords"]');
  }

  return (element && element.content) || '';
}

/**
 * get connection downlink
 * @returns {number}
 */
export function getConnectionDownLink(win = window) {
  const nav = win.navigator || {};
  return nav && nav.connection && nav.connection.downlink >= 0 ? nav.connection.downlink.toString() : undefined;
}

/**
 * @param bidRequest
 * @param bidderRequest
 * @returns {string}
 */
export function getReferrer(bidRequest = {}, bidderRequest = {}) {
  let pageUrl;
  if (bidRequest.params && bidRequest.params.referrer) {
    pageUrl = bidRequest.params.referrer;
  } else {
    pageUrl = bidderRequest?.refererInfo?.page;
  }
  return pageUrl;
}

/**
 * get the document complexity
 * @param document
 * @returns {*|number}
 */
export function getDomComplexity(document) {
  return document?.querySelectorAll('*')?.length ?? -1;
}
