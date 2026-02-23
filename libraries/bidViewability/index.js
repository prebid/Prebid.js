import { triggerPixel } from '../../src/utils.js';
import { gdprParams } from '../dfpUtils/dfpUtils.js';
import { uspDataHandler, gppDataHandler } from '../../src/adapterManager.js';
import { parseEventTrackers, EVENT_TYPE_VIEWABLE, TRACKER_METHOD_IMG } from '../../src/eventTrackers.js';

/**
 * Collects viewable tracking URLs from bid.eventTrackers for EVENT_TYPE_VIEWABLE and TRACKER_METHOD_IMG only.
 * @param {Object} bid - bid object that may have eventTrackers array
 * @returns {string[]} array of URLs to fire
 */
function getViewabilityUrlsFromBid(bid) {
  const eventTrackers = bid?.eventtrackers;
  if (!eventTrackers || !Array.isArray(eventTrackers)) return [];
  const parsed = parseEventTrackers(eventTrackers);
  const viewableTrackers = parsed[EVENT_TYPE_VIEWABLE];
  if (!viewableTrackers || typeof viewableTrackers !== 'object') return [];
  const imgUrls = viewableTrackers[TRACKER_METHOD_IMG];
  return Array.isArray(imgUrls) ? imgUrls : [];
}

/**
 * Fires viewability pixels for a bid. URLs from bid.eventTrackers (EVENT_TYPE_VIEWABLE, TRACKER_METHOD_IMG only).
 * @param {Object} bid - bid with eventTrackers
 * @param {boolean} [appendQueryParams=false] - if true, append gdpr/usp/gpp query params to each URL
 */
export function fireViewabilityPixels(bid, appendQueryParams = false) {
  const urls = getViewabilityUrlsFromBid(bid);
  if (urls.length === 0) return;

  let queryParams = {};
  if (appendQueryParams) {
    queryParams = Object.assign({}, gdprParams());
    const uspConsent = uspDataHandler.getConsentData();
    if (uspConsent) queryParams.us_privacy = uspConsent;
    const gppConsent = gppDataHandler.getConsentData();
    if (gppConsent) {
      // TODO - set gpp query params when known
    }
  }

  urls.forEach(url => {
    let targetUrl = url;
    if (Object.keys(queryParams).length > 0) {
      if (targetUrl.indexOf('?') === -1) targetUrl += '?';
      targetUrl += Object.keys(queryParams).reduce((prev, key) => {
        prev += `&${key}=${encodeURIComponent(queryParams[key])}`;
        return prev;
      }, '');
    }
    triggerPixel(targetUrl);
  });
}
