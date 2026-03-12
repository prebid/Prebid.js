import { EVENT_TYPE_VIEWABLE, parseEventTrackers, TRACKER_METHOD_IMG, TRACKER_METHOD_JS } from '../../src/eventTrackers.js';
import { filterEventTrackers, legacyPropertiesToOrtbNative } from '../../src/native.js';
import { triggerPixel, insertHtmlIntoIframe } from '../../src/utils.js';
import * as events from '../../src/events.js';
import { EVENTS } from '../../src/constants.js';
import adapterManager from '../../src/adapterManager.js';

/**
 * Collects viewable tracking URLs from bid.eventtrackers for EVENT_TYPE_VIEWABLE (IMG and JS methods).
 * @param {Object} bid - bid object that may have eventtrackers array
 * @returns {{ img: string[], js: string[] }} img and js URLs to fire
 */
export function getViewabilityTrackersFromBid(bid) {
  const eventTrackers = bid?.eventtrackers;
  if (!eventTrackers || !Array.isArray(eventTrackers)) return { img: [], js: [] };
  const parsed = parseEventTrackers(eventTrackers);
  const viewableTrackers = parsed[EVENT_TYPE_VIEWABLE];
  if (!viewableTrackers || typeof viewableTrackers !== 'object') return { img: [], js: [] };
  const img = viewableTrackers[TRACKER_METHOD_IMG];
  const js = viewableTrackers[TRACKER_METHOD_JS];
  return {
    img: Array.isArray(img) ? img : [],
    js: Array.isArray(js) ? js : []
  };
}

/**
 * Fires viewability trackers for a bid. IMG URLs via triggerPixel, JS URLs via insertHtmlIntoIframe (script tag).
 * Uses EVENT_TYPE_VIEWABLE trackers only (both TRACKER_METHOD_IMG and TRACKER_METHOD_JS).
 * @param {Object} bid - bid with eventtrackers
 */
export function fireViewabilityPixels(bid) {
  let { img, js } = getViewabilityTrackersFromBid(bid);

  const nativeResponse = bid.native && (bid?.native?.ortb || legacyPropertiesToOrtbNative(bid.native));
  if (nativeResponse && nativeResponse.eventtrackers) {
    const filteredEventTrackers = filterEventTrackers(nativeResponse, bid);
    const { [TRACKER_METHOD_IMG]: nativeImg = [], [TRACKER_METHOD_JS]: nativeJs = [] } = parseEventTrackers(
      filteredEventTrackers || []
    )[EVENT_TYPE_VIEWABLE] || {};
    img = img.concat(Array.isArray(nativeImg) ? nativeImg : []);
    js = js.concat(Array.isArray(nativeJs) ? nativeJs : []);
  }

  img.forEach(triggerPixel);
  if (js.length > 0) {
    const markup = js.map(url => `<script async src="${url}"></script>`).join('\n');
    insertHtmlIntoIframe(markup);
  }
}

export function triggerBidViewable(bid) {
  fireViewabilityPixels(bid);
  // trigger respective bidder's onBidViewable handler
  adapterManager.callBidViewableBidder(bid.adapterCode || bid.bidder, bid);
  if (bid.deferBilling) {
    adapterManager.triggerBilling(bid);
  }
  events.emit(EVENTS.BID_VIEWABLE, bid);
}
