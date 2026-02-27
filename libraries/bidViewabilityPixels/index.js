import { EVENT_TYPE_VIEWABLE, parseEventTrackers, TRACKER_METHOD_IMG } from '../../src/eventTrackers.js';
import { triggerPixel } from '../../src/utils.js';

/**
 * Collects viewable tracking URLs from bid.eventtrackers for EVENT_TYPE_VIEWABLE and TRACKER_METHOD_IMG only.
 * @param {Object} bid - bid object that may have eventtrackers array
 * @returns {string[]} array of URLs to fire
 */
export function getViewabilityUrlsFromBid(bid) {
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
 * @param {Object} bid - bid with eventtrackers
 */
export function fireViewabilityPixels(bid) {
  const urls = getViewabilityUrlsFromBid(bid);
  if (urls.length === 0) return;
  urls.forEach(triggerPixel);
}
