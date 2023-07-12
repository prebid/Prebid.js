import adapterManager from './adapterManager.js';
import { deepAccess, logError } from './utils.js';
import { config } from '../src/config.js';
import {includes} from './polyfill.js';
import { hook } from './hook.js';
import {auctionManager} from './auctionManager.js';
import {isActivityAllowed} from './activities/rules.js';
import {activityParams} from './activities/activityParams.js';
import {ACTIVITY_REPORT_ANALYTICS} from './activities/activities.js';

const VIDEO_MEDIA_TYPE = 'video';
export const OUTSTREAM = 'outstream';
export const INSTREAM = 'instream';

/**
 * Helper functions for working with video-enabled adUnits
 */
export const videoAdUnit = adUnit => {
  const mediaType = adUnit.mediaType === VIDEO_MEDIA_TYPE;
  const mediaTypes = deepAccess(adUnit, 'mediaTypes.video');
  return mediaType || mediaTypes;
};
export const videoBidder = bid => includes(adapterManager.videoAdapters, bid.bidder);
export const hasNonVideoBidder = adUnit =>
  adUnit.bids.filter(bid => !videoBidder(bid)).length;

let vastTrackers = [];

/**
 * @typedef {object} VideoBid
 * @property {string} adId id of the bid
 */

/**
 * Validate that the assets required for video context are present on the bid
 * @param {VideoBid} bid Video bid to validate
 * @param index
 * @return {Boolean} If object is valid
 */
export function isValidVideoBid(bid, {index = auctionManager.index} = {}) {
  const videoMediaType = deepAccess(index.getMediaTypes(bid), 'video');
  const context = videoMediaType && deepAccess(videoMediaType, 'context');
  const useCacheKey = videoMediaType && deepAccess(videoMediaType, 'useCacheKey');
  const adUnit = index.getAdUnit(bid);

  // if context not defined assume default 'instream' for video bids
  // instream bids require a vast url or vast xml content
  return checkVideoBidSetup(bid, adUnit, videoMediaType, context, useCacheKey);
}

export const checkVideoBidSetup = hook('sync', function(bid, adUnit, videoMediaType, context, useCacheKey) {
  if (videoMediaType && (useCacheKey || context !== OUTSTREAM)) {
    // xml-only video bids require a prebid cache url
    if (!config.getConfig('cache.url') && bid.vastXml && !bid.vastUrl) {
      logError(`
        This bid contains only vastXml and will not work when a prebid cache url is not specified.
        Try enabling prebid cache with $$PREBID_GLOBAL$$.setConfig({ cache: {url: "..."} });
      `);
      return false;
    }

    return !!(bid.vastUrl || bid.vastXml);
  }

  // outstream bids require a renderer on the bid or pub-defined on adunit
  if (context === OUTSTREAM && !useCacheKey) {
    return !!(bid.renderer || (adUnit && adUnit.renderer) || videoMediaType.renderer);
  }

  return true;
}, 'checkVideoBidSetup');

export function registerVastTrackers(moduleType, moduleName, trackerFn) {
  if (typeof trackerFn == 'function') { vastTrackers.push({'moduleType': moduleType, 'moduleName': moduleName, 'trackerFn': trackerFn}); }
}

export function insertVastTrackers(trackers, vastXml) {
  const doc = new DOMParser().parseFromString(vastXml, 'text/xml');
  const wrappers = doc.querySelectorAll('VAST Ad Wrapper, VAST Ad InLine');
  try {
    if (wrappers.length) {
      wrappers.forEach(wrapper => {
        if (trackers.get('impression')) {
          trackers.get('impression').forEach(trackingUrl => {
            const impression = doc.createElement('Impression');
            impression.appendChild(doc.createCDATASection(trackingUrl));
            wrapper.appendChild(impression)
          });
        }
      });
      vastXml = new XMLSerializer().serializeToString(doc);
    }
  } catch (error) {
    logError('an error happened trying to insert trackers in vastXml');
  }
  return vastXml;
}

export function getVastTrackers(bid) {
  let trackers = [];
  vastTrackers.filter(
    ({moduleType, moduleName, trackerFn}) => isActivityAllowed(ACTIVITY_REPORT_ANALYTICS, activityParams(moduleType, moduleName))
  ).forEach(({trackerFn}) => {
    let trackersToAdd = trackerFn(bid);
    trackersToAdd.forEach(trackerToAdd => {
      if (validVastTracker(trackers, trackerToAdd)) { trackers.push(trackerToAdd); }
    });
  });
  const trackersMap = trackersToMap(trackers);
  return (trackersMap.size ? trackersMap : null);
};

function validVastTracker(trackers, trackerToAdd) {
  if (!trackerToAdd.hasOwnProperty('event') || !trackerToAdd.hasOwnProperty('url')) { return false; }
  trackers.forEach(tracker => {
    if (tracker['event'] == trackerToAdd['event'] && tracker['url'] == trackerToAdd['url']) { return false; }
  });
  return true;
}

function trackersToMap(trackers) {
  let trackersMap = new Map();
  trackers.forEach(tracker => {
    if (!trackersMap.get(tracker['event'])) { trackersMap.set(tracker['event'], [tracker['url']]) } else { trackersMap.get(tracker['event']).push(tracker['url']); }
  });
  return trackersMap;
}
