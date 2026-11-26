/**
 * Returns the origin
 */
export function getOrigin() {
  // IE10 does not have this property. https://gist.github.com/hbogs/7908703
  if (!window.location.origin) {
    return window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
  } else {
    return window.location.origin;
  }
}

/**
 * Reduces a URL to its origin (scheme + host + port), dropping path, query and fragment.
 * @param {string|null|undefined} url
 * @returns {string|null} origin, or null when url is empty, unparseable or has an opaque origin (e.g. about:blank)
 */
export function toOrigin(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  try {
    const origin = new URL(url).origin;
    return origin && origin !== 'null' ? origin : null;
  } catch (e) {
    return null;
  }
}
