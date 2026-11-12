import { updateVast } from '../../src/videoCache.js';
import { VIDEO } from '../../src/mediaTypes.js';
import { mergeVastTrackers } from '../../src/utils/vast.js';
import { isActivityAllowed } from '../../src/activities/rules.js';
import { ACTIVITY_REPORT_ANALYTICS } from '../../src/activities/activities.js';
import { activityParams } from '../../src/activities/activityParams.js';
import { auctionManager } from '../../src/auctionManager.js';

/**
 * VAST Trackers Structure:
 * {
 *   impression: string[],           // Array of impression pixel URLs
 *   error: string[],                // Array of error pixel URLs
 *   trackingEvents: Array<{         // Array of video playback tracking events
 *     event: string,                // Event name (e.g., 'start', 'firstQuartile', 'midpoint', 'thirdQuartile', 'complete')
 *     url: string                   // Tracking pixel URL
 *   }>
 * }
 */

const vastTrackers = [];
let enabled = false;

export function reset() {
  vastTrackers.length = 0;
}

export function enable() {
  if (!enabled) {
    updateVast.before(addTrackersToResponse);
    enabled = true;
  }
}

export function disable() {
  if (enabled) {
    updateVast.getHooks({ hook: addTrackersToResponse }).remove();
    enabled = false;
  }
}

export function updateVastHook({ index = auctionManager.index } = {}) {
  return function addTrackersToResponse(next, bidResponse) {
    if (FEATURES.VIDEO && bidResponse.mediaType === VIDEO) {
      const vastTrackers = getVastTrackers(bidResponse, { index });
      if (vastTrackers) {
        bidResponse.vastTrackers = vastTrackers;
      }
    }
    next(bidResponse);
  };
}

const addTrackersToResponse = updateVastHook();
enable();

export function registerVastTrackers(moduleType, moduleName, trackerFn) {
  if (typeof trackerFn === 'function') {
    vastTrackers.push({ 'moduleType': moduleType, 'moduleName': moduleName, 'trackerFn': trackerFn });
  }
}

/**
 * Merges the trackers registered by modules with the bid's own `vastTrackers`.
 * Core inserts the result into the bid's VAST.
 */
export function getVastTrackers(bid, { index = auctionManager.index }) {
  const moduleTrackers = vastTrackers.filter(
    ({ moduleType, moduleName }) => isActivityAllowed(ACTIVITY_REPORT_ANALYTICS, activityParams(moduleType, moduleName))
  ).map(({ trackerFn }) => {
    const auction = index.getAuction(bid).getProperties();
    const bidRequest = index.getBidRequest(bid);
    return trackerFn(bid, { auction, bidRequest });
  });
  const merged = mergeVastTrackers(...moduleTrackers, bid.vastTrackers);
  const hasTrackers = merged.impression.length || merged.error.length || merged.trackingEvents.length;
  return hasTrackers ? merged : null;
}
