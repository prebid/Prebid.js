import {addBidResponse} from '../../src/auction.js';
import {VIDEO} from '../../src/mediaTypes.js';
import {logError} from '../../src/utils.js';
import {isActivityAllowed} from '../../src/activities/rules.js';
import {ACTIVITY_REPORT_ANALYTICS} from '../../src/activities/activities.js';
import {activityParams} from '../../src/activities/activityParams.js';
import {auctionManager} from '../../src/auctionManager.js';

const vastTrackers = [];
let enabled = false;

export function reset() {
  vastTrackers.length = 0;
}

export function enable() {
  if (!enabled) {
    addBidResponse.before(addTrackersToResponse);
    enabled = true;
  }
}

export function disable() {
  if (enabled) {
    addBidResponse.getHooks({hook: addTrackersToResponse}).remove();
    enabled = false;
  }
}

export function responseHook({index = auctionManager.index} = {}) {
  return function addTrackersToResponse(next, adUnitcode, bidResponse, reject) {
    if (FEATURES.VIDEO && bidResponse.mediaType === VIDEO) {
      const vastTrackers = getVastTrackers(bidResponse, {index});
      if (vastTrackers) {
        bidResponse.vastXml = insertVastTrackers(vastTrackers, bidResponse.vastXml);
        const impTrackers = vastTrackers.get('impressions');
        if (impTrackers) {
          bidResponse.vastImpUrl = [].concat([...impTrackers]).concat(bidResponse.vastImpUrl).filter(t => t);
        }
      }
    }
    next(adUnitcode, bidResponse, reject);
  }
}

const addTrackersToResponse = responseHook();
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
        if (trackers.get('impressions')) {
          trackers.get('impressions').forEach(trackingUrl => {
            const impression = doc.createElement('Impression');
            impression.appendChild(doc.createCDATASection(trackingUrl));
            wrapper.appendChild(impression);
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

export function getVastTrackers(bid, {index = auctionManager.index}) {
  let trackers = [];
  vastTrackers.filter(
    ({
      moduleType,
      moduleName,
      trackerFn
    }) => isActivityAllowed(ACTIVITY_REPORT_ANALYTICS, activityParams(moduleType, moduleName))
  ).forEach(({trackerFn}) => {
    const auction = index.getAuction(bid).getProperties();
    const bidRequest = index.getBidRequest(bid);
    let trackersToAdd = trackerFn(bid, {auction, bidRequest});
    trackersToAdd.forEach(trackerToAdd => {
      if (isValidVastTracker(trackers, trackerToAdd)) {
        trackers.push(trackerToAdd);
      }
    });
  });
  const trackersMap = trackersToMap(trackers);
  return (trackersMap.size ? trackersMap : null);
};

function isValidVastTracker(trackers, trackerToAdd) {
  return trackerToAdd.hasOwnProperty('event') && trackerToAdd.hasOwnProperty('url');
}

function trackersToMap(trackers) {
  return trackers.reduce((map, {url, event}) => {
    !map.has(event) && map.set(event, new Set());
    map.get(event).add(url);
    return map;
  }, new Map());
}

export function addImpUrlToTrackers(bid, trackersMap) {
  if (bid.vastImpUrl) {
    if (!trackersMap) {
      trackersMap = new Map();
    }
    if (!trackersMap.get('impressions')) {
      trackersMap.set('impressions', new Set());
    }
    trackersMap.get('impressions').add(bid.vastImpUrl);
  }
  return trackersMap;
}
