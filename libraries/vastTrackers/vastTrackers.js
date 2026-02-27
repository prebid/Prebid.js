import {callPrebidCache} from '../../src/auction.js';
import {VIDEO} from '../../src/mediaTypes.js';
import {logError, logWarn, isEmptyStr} from '../../src/utils.js';
import {isArray, isPlainObject, isStr} from '../../src/utils/objects.js';
import {isActivityAllowed} from '../../src/activities/rules.js';
import {ACTIVITY_REPORT_ANALYTICS} from '../../src/activities/activities.js';
import {activityParams} from '../../src/activities/activityParams.js';
import {auctionManager} from '../../src/auctionManager.js';

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
    callPrebidCache.before(addTrackersToResponse);
    enabled = true;
  }
}

export function disable() {
  if (enabled) {
    callPrebidCache.getHooks({hook: addTrackersToResponse}).remove();
    enabled = false;
  }
}

export function cacheVideoBidHook({index = auctionManager.index} = {}) {
  return function addTrackersToResponse(next, auctionInstance, bidResponse, afterBidAdded, videoMediaType) {
    if (FEATURES.VIDEO && bidResponse.mediaType === VIDEO) {
      const vastTrackers = getVastTrackers(bidResponse, {index});
      if (vastTrackers) {
        bidResponse.vastXml = insertVastTrackers(vastTrackers, bidResponse.vastXml);
        bidResponse.vastTrackers = vastTrackers;
      }
    }
    next(auctionInstance, bidResponse, afterBidAdded, videoMediaType);
  }
}

const addTrackersToResponse = cacheVideoBidHook();
enable();

export function registerVastTrackers(moduleType, moduleName, trackerFn) {
  if (typeof trackerFn === 'function') {
    vastTrackers.push({'moduleType': moduleType, 'moduleName': moduleName, 'trackerFn': trackerFn});
  }
}

export function insertVastTrackers(trackers, vastXml) {
  const doc = new DOMParser().parseFromString(vastXml, 'text/xml');
  const wrappers = doc.querySelectorAll('VAST Ad Wrapper, VAST Ad InLine');
  try {
    if (wrappers.length) {
      wrappers.forEach(wrapper => {
        if (isArray(trackers.impression) && trackers.impression.length) {
          trackers.impression.forEach(trackingUrl => {
            const impression = doc.createElement('Impression');
            impression.appendChild(doc.createCDATASection(trackingUrl));
            wrapper.appendChild(impression);
          });
        }

        if (isArray(trackers.error) && trackers.error.length) {
          trackers.error.forEach(trackingUrl => {
            const errorElement = doc.createElement('Error');
            errorElement.appendChild(doc.createCDATASection(trackingUrl));
            wrapper.appendChild(errorElement);
          });
        }

        if (isArray(trackers.trackingEvents) && trackers.trackingEvents.length) {
          insertLinearTrackingEvents(doc, wrapper, trackers.trackingEvents);
        }
      });
      vastXml = new XMLSerializer().serializeToString(doc);
    }
  } catch (error) {
    logError('an error happened trying to insert trackers in vastXml');
  }
  return vastXml;
}

/**
 * Inserts tracking events into <TrackingEvents> under <Linear> elements.
 * If <TrackingEvents> doesn't exist, it will be created.
 * @param {Document} doc - The parsed VAST XML document
 * @param {Element} wrapper - The Wrapper or InLine element
 * @param {Array<{event: string, url: string}>} trackers - Array of tracking event objects
 */
function insertLinearTrackingEvents(doc, wrapper, trackers) {
  const linearElements = wrapper.querySelectorAll('Creatives Creative Linear');

  if (linearElements.length > 0) {
    linearElements.forEach(linear => {
      let trackingEvents = linear.querySelector('TrackingEvents');
      if (!trackingEvents) {
        trackingEvents = doc.createElement('TrackingEvents');
        linear.appendChild(trackingEvents);
      }
      appendTrackingElements(doc, trackingEvents, trackers);
    });
  } else {
    let creatives = wrapper.querySelector('Creatives');
    if (!creatives) {
      creatives = doc.createElement('Creatives');
      wrapper.appendChild(creatives);
    }

    const creative = doc.createElement('Creative');
    const linear = doc.createElement('Linear');
    const trackingEvents = doc.createElement('TrackingEvents');

    appendTrackingElements(doc, trackingEvents, trackers);
    linear.appendChild(trackingEvents);
    creative.appendChild(linear);
    creatives.appendChild(creative);
  }
}

/**
 * Appends Tracking elements to a TrackingEvents element
 * @param {Document} doc - The parsed VAST XML document
 * @param {Element} trackingEvents - The TrackingEvents element to append to
 * @param {Array<{event: string, url: string}>} trackers - Array of tracking event objects
 */
function appendTrackingElements(doc, trackingEvents, trackers) {
  trackers.forEach(({event, url}) => {
    const trackingElement = doc.createElement('Tracking');
    trackingElement.setAttribute('event', event);
    trackingElement.appendChild(doc.createCDATASection(url));
    trackingEvents.appendChild(trackingElement);
  });
}

export function getVastTrackers(bid, {index = auctionManager.index}) {
  const mergedTrackers = {
    impression: [],
    error: [],
    trackingEvents: []
  };

  vastTrackers.filter(
    ({
      moduleType,
      moduleName,
      trackerFn
    }) => isActivityAllowed(ACTIVITY_REPORT_ANALYTICS, activityParams(moduleType, moduleName))
  ).forEach(({trackerFn}) => {
    const auction = index.getAuction(bid).getProperties();
    const bidRequest = index.getBidRequest(bid);
    const trackersToAdd = trackerFn(bid, {auction, bidRequest});
    mergeTrackersInto(mergedTrackers, trackersToAdd);
  });

  // Include trackers from bidResponse (vastTrackers and vastImpUrl)
  mergeTrackersInto(mergedTrackers, getTrackersFromBidResponse(bid));

  const hasTrackers = mergedTrackers.impression.length ||
                      mergedTrackers.error.length ||
                      mergedTrackers.trackingEvents.length;

  return hasTrackers ? mergedTrackers : null;
}

/**
 * Merges source trackers into the target trackers object with validation
 * @param {Object} target - The target trackers object to merge into
 * @param {Object} source - The source trackers object to merge from
 */
function mergeTrackersInto(target, source) {
  if (!source || !isPlainObject(source)) return;

  if (isArray(source.impression)) {
    source.impression.forEach(url => {
      if (isStr(url) && !isEmptyStr(url)) {
        target.impression.push(url);
      }
    });
  }

  if (isArray(source.error)) {
    source.error.forEach(url => {
      if (isStr(url) && !isEmptyStr(url)) {
        target.error.push(url);
      }
    });
  }

  if (isArray(source.trackingEvents)) {
    source.trackingEvents.forEach(tracker => {
      if (isValidTrackingEvent(tracker)) {
        target.trackingEvents.push(tracker);
      }
    });
  }
}

/**
 * Extracts trackers from bid response (both vastTrackers and vastImpUrl)
 * Expected vastTrackers format: { impression: string[], error: string[], trackingEvents: Array<{event: string, url: string}> }
 * @param {Object} bid - The bid response object
 * @returns {Object|null} - Normalized trackers object or null if nothing present
 */
export function getTrackersFromBidResponse(bid) {
  const trackers = {
    impression: [],
    error: [],
    trackingEvents: []
  };

  // Extract from bid.vastTrackers if present
  if (bid.vastTrackers && isPlainObject(bid.vastTrackers)) {
    if (isArray(bid.vastTrackers.impression)) {
      trackers.impression = bid.vastTrackers.impression;
    }
    if (isArray(bid.vastTrackers.error)) {
      trackers.error = bid.vastTrackers.error;
    }
    if (isArray(bid.vastTrackers.trackingEvents)) {
      trackers.trackingEvents = bid.vastTrackers.trackingEvents;
    }
  }

  // Extract from bid.vastImpUrl (legacy fallback)
  if (bid.vastImpUrl) {
    logWarn('vastImpUrl is deprecated; use vastTrackers.impression instead');
    const impUrls = isArray(bid.vastImpUrl) ? bid.vastImpUrl : [bid.vastImpUrl];
    trackers.impression = trackers.impression.concat(impUrls);
  }

  const hasTrackers = trackers.impression.length ||
                      trackers.error.length ||
                      trackers.trackingEvents.length;

  return hasTrackers ? trackers : null;
}

/**
 * Validates a tracking event object
 * @param {Object} tracker - The tracker object to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidTrackingEvent(tracker) {
  return isPlainObject(tracker) &&
         isStr(tracker.event) && !isEmptyStr(tracker.event) &&
         isStr(tracker.url) && !isEmptyStr(tracker.url);
}
