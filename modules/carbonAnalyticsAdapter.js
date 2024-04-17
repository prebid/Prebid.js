import { deepAccess, generateUUID, logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import {getGlobal} from '../src/prebidGlobal.js';
import adapterManager from '../src/adapterManager.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
const CARBON_GVL_ID = 493;
const ANALYTICS_VERSION = 'v1.0';
const PROFILE_ID_KEY = 'carbon_ccuid';
const PROFILE_ID_COOKIE = 'ccuid';
const SESSION_ID_COOKIE = 'ccsid';
const MODULE_NAME = 'carbon';
const ANALYTICS_TYPE = 'endpoint';
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
export const storage = getStorageManager({gvlid: CARBON_GVL_ID, moduleName: 'carbon'});
let analyticsHost = '';
let pageViewId = '';
let profileId = '';
let sessionId = '';
let parentId = '';
let pageEngagement = {};
let carbonAdapter = Object.assign(adapter({analyticsHost, ANALYTICS_TYPE}), {
  track({eventType, args}) {
    args = args ? JSON.parse(JSON.stringify(args)) : {};
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_END: {
        registerEngagement();
        let event = createBaseEngagementEvent(args);
        sendEngagementEvent(event, 'auction_end');
        break;
      }
      case CONSTANTS.EVENTS.TCF2_ENFORCEMENT: {
        // check for relevant tcf information on the event before recording
        if (args.storageBlocked?.length > 0 || args.biddersBlocked?.length > 0 || args.analyticsBlocked?.length > 0) {
          registerEngagement();
          let event = createBaseEngagementEvent(args);
          event.tcf_events = args;
          sendEngagementEvent(event, 'tcf_enforcement');
        }
        break;
      }
      default: {
        break;
      }
    }
  }
});
// save the base class function
carbonAdapter.originEnableAnalytics = carbonAdapter.enableAnalytics;
// override enableAnalytics so we can get access to the config passed in from the page
carbonAdapter.enableAnalytics = function (config) {
  if (config?.options?.parentId) {
    parentId = config.options.parentId;
  } else {
    logError('required config value "parentId" not provided');
  }
  if (config?.options.endpoint) {
    analyticsHost = config.options.endpoint;
  } else {
    logError('required config value "endpoint" not provided');
  }
  pageViewId = generateUUID();
  profileId = getProfileId();
  sessionId = getSessionId();
  pageEngagement = { // create the initial page engagement event
    ttl: 60, // unit is seconds
    count: 0,
    id: generateUUID(),
    startTime: Date.now(),
    timeLastEngage: Date.now()
  };
  let event = createBaseEngagementEvent()
  sendEngagementEvent(event, 'page_load');
  carbonAdapter.originEnableAnalytics(config); // call the base class function
};
function getProfileId() {
  if (storage.localStorageIsEnabled()) {
    let localStorageId = storage.getDataFromLocalStorage(PROFILE_ID_KEY);
    if (localStorageId && localStorageId != '') {
      if (storage.cookiesAreEnabled()) {
        storage.setCookie(PROFILE_ID_COOKIE, localStorageId, new Date(Date.now() + 89 * DAY_MS), 'Lax');
      }
      return localStorageId;
    }
  }
  if (storage.cookiesAreEnabled()) {
    let cookieId = storage.getCookie(PROFILE_ID_COOKIE);
    if (cookieId && cookieId != '') {
      if (storage.localStorageIsEnabled()) {
        storage.setDataInLocalStorage(PROFILE_ID_KEY, cookieId);
      }
      storage.setCookie(PROFILE_ID_COOKIE, cookieId, new Date(Date.now() + 89 * DAY_MS), 'Lax');
      return cookieId;
    }
  }
  let newId = generateUUID();
  if (storage.localStorageIsEnabled()) {
    storage.setDataInLocalStorage(PROFILE_ID_KEY, newId);
  }
  if (storage.cookiesAreEnabled()) {
    storage.setCookie(PROFILE_ID_COOKIE, newId, new Date(Date.now() + 89 * DAY_MS), 'Lax');
  }
  return newId;
}
function updateProfileId(userData) {
  if (userData?.update && userData?.id != '') {
    profileId = userData.id;
    if (storage.cookiesAreEnabled()) {
      storage.setCookie(PROFILE_ID_COOKIE, userData.id, new Date(Date.now() + 89 * DAY_MS), 'Lax');
    }
    if (storage.localStorageIsEnabled()) {
      storage.setDataInLocalStorage(PROFILE_ID_KEY, userData.id);
    }
  }
}
function getSessionId() {
  if (storage.cookiesAreEnabled()) {
    let cookieId = storage.getCookie(SESSION_ID_COOKIE);
    if (cookieId && cookieId != '') {
      storage.setCookie(SESSION_ID_COOKIE, cookieId, new Date(Date.now() + 5 * MINUTE_MS), 'Lax');
      return cookieId;
    }
    let newId = generateUUID();
    storage.setCookie(SESSION_ID_COOKIE, newId, new Date(Date.now() + 5 * MINUTE_MS), 'Lax');
    return newId;
  }
  return generateUUID();
}
function registerEngagement() {
  let present = Date.now();
  let timediff = (present - pageEngagement.timeLastEngage) / 1000; // convert to seconds
  pageEngagement.timeLastEngage = present;
  if (timediff < pageEngagement.ttl) {
    return;
  }
  pageEngagement.count++;
  pageEngagement.startTime = present;
  pageEngagement.id = generateUUID();
};
function getConsentData(args) { // range through this and get every value
  if (Array.isArray(args?.bidderRequests) && args.bidderRequests.length > 0) {
    let bidderRequest = args.bidderRequests[0];
    let consentData = {
      gdpr_consent: '',
      ccpa_consent: ''
    };
    if (bidderRequest?.gdprConsent?.consentString) {
      consentData.gdpr_consent = bidderRequest.gdprConsent.consentString;
    }
    if (bidderRequest?.uspConsent?.consentString) {
      consentData.ccpa_consent = bidderRequest.uspConsent.consentString;
    }
    if (consentData.gdpr_consent != '' || consentData.ccpa_consent != '') {
      return consentData;
    }
  }
}
function getExternalIds() {
  let externalIds = {};
  if (getGlobal().getUserIdsAsEids && typeof getGlobal().getUserIdsAsEids == 'function') {
    let eids = getGlobal().getUserIdsAsEids();
    if (eids?.length) {
      eids.forEach(eid => {
        if (eid.source && eid?.uids?.length) {
          externalIds[eid.source] = eid.uids.map(uid => uid.id);
        }
      });
      return externalIds;
    }
  }
}
function createBaseEngagementEvent(args) {
  let event = {};
  event.profile_id = profileId;
  event.session_id = sessionId;
  event.pageview_id = pageViewId;
  event.engagement_id = pageEngagement.id;
  event.engagement_count = pageEngagement.count;
  event.engagement_ttl = pageEngagement.ttl;
  event.start_time = pageEngagement.startTime;
  event.end_time = Date.now();
  event.script_id = window.location.host;
  event.url = window.location.href;
  event.referrer = document.referrer || deepAccess(args, 'bidderRequests.0.refererInfo.page') || undefined;
  if (args?.bidderRequests) {
    event.consent = getConsentData(args);
  }
  event.external_ids = getExternalIds(); // TODO check args for EIDs on subsequent auctions
  return event;
}
function sendEngagementEvent(event, eventTrigger) {
  if (analyticsHost != '' && parentId != '') {
    let reqUrl = `${analyticsHost}/${ANALYTICS_VERSION}/parent/${parentId}/engagement/trigger/${eventTrigger}`;
    ajax(reqUrl,
      {
        success: function (response, req) { // update the ID if we find a cross domain cookie
          let userData = {};
          try {
            userData = JSON.parse(response);
            updateProfileId(userData);
          } catch (e) {
            logError('unable to parse API response');
          }
        },
        error: error => {
          if (error !== '') logError(error);
        }
      },
      JSON.stringify(event),
      {
        contentType: 'application/json',
        method: 'POST',
        withCredentials: true,
        crossOrigin: true
      }
    );
  }
};
adapterManager.registerAnalyticsAdapter({
  adapter: carbonAdapter,
  code: MODULE_NAME,
  gvlid: CARBON_GVL_ID
});
export default carbonAdapter;
