/**
 * Checks if a value is a valid, fully-formed absolute HTTP(S) URL with a host.
 * Rejects protocol-relative URLs, malformed URLs, and URLs that require normalization
 * (e.g., "https:tracker.example" normalizes to "https://tracker.example" but the original string is unsafe).
 * @param {*} url
 * @returns {boolean}
 */
function isAbsoluteHttpUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const normalized = new URL(url);
    // Ensure the original string matches the normalized form - reject if URL parser had to fill in missing parts
    if (normalized.href !== url) return false;
    return (normalized.protocol === 'http:' || normalized.protocol === 'https:') && !!normalized.hostname;
  } catch (e) {
    return false;
  }
}

/**
 * Fires viewability trackers for a bid. IMG URLs via triggerPixel, JS URLs via insertHtmlIntoIframe (script tag).
 * Uses EVENT_TYPE_VIEWABLE trackers only (both TRACKER_METHOD_IMG and TRACKER_METHOD_JS).
 * @param {object} bid
 */
export function fireViewabilityPixels(bid) {
  const { img, js } = parseEventTrackers(bid);

  if (!img.length && !js.length) {
    return;
  }

  img.forEach(triggerPixel);
  const safeJs = js.filter(isAbsoluteHttpUrl);
  if (safeJs.length > 0) {
    const markup = safeJs.map(url => `<script async src="${attributeValue(url)}"></script>`).join('\n');
    insertHtmlIntoIframe(markup);
  }
}

export function getViewabilityTrackersFromBid(bid) {
  return parseEventTrackers(bid);
}
