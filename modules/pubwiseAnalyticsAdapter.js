import {ajax} from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { getStorageManager } from '../src/storageManager.js';
const utils = require('../src/utils.js');
const storage = getStorageManager();

/****
 * PubWise.io Analytics
 * Contact: support@pubwise.io
 * Developer: Stephen Johnston
 *
 * For testing:
 *
 pbjs.enableAnalytics({
  provider: 'pubwise',
  options: {
    site: 'b1ccf317-a6fc-428d-ba69-0c9c208aa61c'
  }
 });

Changes in 4.0 Version
4.0.1 - Initial Version for Prebid 4.x, adds activationId, adds additiona testing, removes prebid global in favor of a prebid.version const
4.0.2 - Updates to include dedicated default site to keep everything from getting rate limited

*/

const analyticsType = 'endpoint';
const analyticsName = 'PubWise:';
const prebidVersion = '$prebid.version$';
let pubwiseVersion = '4.0.1';
let configOptions = {site: '', endpoint: 'https://api.pubwise.io/api/v5/event/add/', debug: null};
let pwAnalyticsEnabled = false;
let utmKeys = {utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: ''};
let sessionData = {sessionId: '', activationId: ''};
let pwNamespace = 'pubwise';
let pwEvents = [];
let metaData = {};
let auctionEnded = false;
let sessTimeout = 60 * 30 * 1000; // 30 minutes, G Analytics default session length
let sessName = 'sess_id';
let sessTimeoutName = 'sess_timeout';

function enrichWithSessionInfo(dataBag) {
  try {
    // eslint-disable-next-line
    // console.log(sessionData);
    dataBag['session_id'] = sessionData.sessionId;
    dataBag['activation_id'] = sessionData.activationId;
  } catch (e) {
    dataBag['error_sess'] = 1;
  }

  return dataBag;
}

function enrichWithMetrics(dataBag) {
  try {
    if (window.PREBID_TIMEOUT) {
      dataBag['target_timeout'] = window.PREBID_TIMEOUT;
    } else {
      dataBag['target_timeout'] = 'NA';
    }
    dataBag['pw_version'] = pubwiseVersion;
    dataBag['pbjs_version'] = prebidVersion;
    dataBag['debug'] = configOptions.debug;
  } catch (e) {
    dataBag['error_metric'] = 1;
  }

  return dataBag;
}

function enrichWithUTM(dataBag) {
  let newUtm = false;
  try {
    for (let prop in utmKeys) {
      utmKeys[prop] = utils.getParameterByName(prop);
      if (utmKeys[prop]) {
        newUtm = true;
        dataBag[prop] = utmKeys[prop];
      }
    }

    if (newUtm === false) {
      for (let prop in utmKeys) {
        let itemValue = storage.getDataFromLocalStorage(setNamespace(prop));
        if (itemValue !== null && typeof itemValue !== 'undefined' && itemValue.length !== 0) {
          dataBag[prop] = itemValue;
        }
      }
    } else {
      for (let prop in utmKeys) {
        storage.setDataInLocalStorage(setNamespace(prop), utmKeys[prop]);
      }
    }
  } catch (e) {
    pwInfo(`Error`, e);
    dataBag['error_utm'] = 1;
  }
  return dataBag;
}

function expireUtmData() {
  pwInfo(`Session Expiring UTM Data`);
  for (let prop in utmKeys) {
    storage.removeDataFromLocalStorage(setNamespace(prop));
  }
}

function enrichWithCustomSegments(dataBag) {
  // c_script_type: '', c_slot1: '', c_slot2: '', c_slot3: '', c_slot4: ''
  if (configOptions.custom) {
    if (configOptions.custom.c_script_type) {
      dataBag['c_script_type'] = configOptions.custom.c_script_type;
    }

    if (configOptions.custom.c_host) {
      dataBag['c_host'] = configOptions.custom.c_host;
    }

    if (configOptions.custom.c_slot1) {
      dataBag['c_slot1'] = configOptions.custom.c_slot1;
    }

    if (configOptions.custom.c_slot2) {
      dataBag['c_slot2'] = configOptions.custom.c_slot2;
    }

    if (configOptions.custom.c_slot3) {
      dataBag['c_slot3'] = configOptions.custom.c_slot3;
    }

    if (configOptions.custom.c_slot4) {
      dataBag['c_slot4'] = configOptions.custom.c_slot4;
    }
  }

  return dataBag;
}

function setNamespace(itemText) {
  return pwNamespace.concat('_' + itemText);
}

function localStorageSessTimeoutName() {
  return setNamespace(sessTimeoutName);
}

function localStorageSessName() {
  return setNamespace(sessName);
}

function extendUserSessionTimeout() {
  storage.setDataInLocalStorage(localStorageSessTimeoutName(), Date.now().toString());
}

function userSessionID() {
  return storage.getDataFromLocalStorage(localStorageSessName()) ? localStorage.getItem(localStorageSessName()) : '';
}

function sessionExpired() {
  let sessLastTime = storage.getDataFromLocalStorage(localStorageSessTimeoutName());
  return (Date.now() - parseInt(sessLastTime)) > sessTimeout;
}

function flushEvents() {
  if (pwEvents.length > 0) {
    let dataBag = {metaData: metaData, eventList: pwEvents.splice(0)}; // put all the events together with the metadata and send
    ajax(configOptions.endpoint, (result) => pwInfo(`Result`, result), JSON.stringify(dataBag));
  }
}

function isIngestedEvent(eventType) {
  const ingested = [
    CONSTANTS.EVENTS.AUCTION_INIT,
    CONSTANTS.EVENTS.BID_REQUESTED,
    CONSTANTS.EVENTS.BID_RESPONSE,
    CONSTANTS.EVENTS.BID_WON,
    CONSTANTS.EVENTS.BID_TIMEOUT,
    CONSTANTS.EVENTS.AD_RENDER_FAILED,
    CONSTANTS.EVENTS.TCF2_ENFORCEMENT
  ];
  return ingested.indexOf(eventType) !== -1;
}

function markEnabled() {
  pwInfo(`Enabled`, configOptions);
  pwAnalyticsEnabled = true;
  setInterval(flushEvents, 100);
}

function pwInfo(info, context) {
  utils.logInfo(`${analyticsName} ` + info, context);
}

function filterBidResponse(data) {
  let modified = Object.assign({}, data);
  // clean up some properties we don't track in public version
  if (typeof modified.ad !== 'undefined') {
    modified.ad = '';
  }
  if (typeof modified.adUrl !== 'undefined') {
    modified.adUrl = '';
  }
  if (typeof modified.adserverTargeting !== 'undefined') {
    modified.adserverTargeting = '';
  }
  if (typeof modified.ts !== 'undefined') {
    modified.ts = '';
  }
  // clean up a property to make simpler
  if (typeof modified.statusMessage !== 'undefined' && modified.statusMessage === 'Bid returned empty or error response') {
    modified.statusMessage = 'eoe';
  }
  modified.auctionEnded = auctionEnded;
  return modified;
}

function filterAuctionInit(data) {
  let modified = Object.assign({}, data);

  modified.refererInfo = {};
  // handle clean referrer, we only need one
  if (typeof modified.bidderRequests !== 'undefined' && typeof modified.bidderRequests[0] !== 'undefined' && typeof modified.bidderRequests[0].refererInfo !== 'undefined') {
    modified.refererInfo = modified.bidderRequests[0].refererInfo;
  }

  if (typeof modified.adUnitCodes !== 'undefined') {
    delete modified.adUnitCodes;
  }
  if (typeof modified.adUnits !== 'undefined') {
    delete modified.adUnits;
  }
  if (typeof modified.bidderRequests !== 'undefined') {
    delete modified.bidderRequests;
  }
  if (typeof modified.bidsReceived !== 'undefined') {
    delete modified.bidsReceived;
  }
  if (typeof modified.config !== 'undefined') {
    delete modified.config;
  }
  if (typeof modified.noBids !== 'undefined') {
    delete modified.noBids;
  }
  if (typeof modified.winningBids !== 'undefined') {
    delete modified.winningBids;
  }

  return modified;
}

let pubwiseAnalytics = Object.assign(adapter({analyticsType}), {
  // Override AnalyticsAdapter functions by supplying custom methods
  track({eventType, args}) {
    this.handleEvent(eventType, args);
  }
});

pubwiseAnalytics.handleEvent = function(eventType, data) {
  // we log most events, but some are information
  if (isIngestedEvent(eventType)) {
    pwInfo(`Emitting Event ${eventType} ${pwAnalyticsEnabled}`, data);

    // record metadata
    metaData = {
      target_site: configOptions.site,
      debug: configOptions.debug ? 1 : 0,
    };
    metaData = enrichWithSessionInfo(metaData);
    metaData = enrichWithMetrics(metaData);
    metaData = enrichWithUTM(metaData);
    metaData = enrichWithCustomSegments(metaData);

    // add data on init to the metadata container
    if (eventType === CONSTANTS.EVENTS.AUCTION_INIT) {
      data = filterAuctionInit(data);
    } else if (eventType === CONSTANTS.EVENTS.BID_RESPONSE) {
      data = filterBidResponse(data);
    }

    // add all ingested events
    pwEvents.push({
      eventType: eventType,
      args: data
    });
  } else {
    pwInfo(`Skipping Event ${eventType} ${pwAnalyticsEnabled}`, data);
  }

  // once the auction ends, or the event is a bid won send events
  if (eventType === CONSTANTS.EVENTS.AUCTION_END || eventType === CONSTANTS.EVENTS.BID_WON) {
    flushEvents();
  }
}

pubwiseAnalytics.storeSessionID = function (userSessID) {
  storage.setDataInLocalStorage(localStorageSessName(), userSessID);
  pwInfo(`New Session Generated`, userSessID);
};

// ensure a session exists, if not make one, always store it
pubwiseAnalytics.ensureSession = function () {
  if (sessionExpired() === true || userSessionID() === null || userSessionID() === '') {
    let generatedId = utils.generateUUID();
    expireUtmData();
    this.storeSessionID(generatedId);
    sessionData.sessionId = generatedId;
  }
  // eslint-disable-next-line
  // console.log('ensured session');
  extendUserSessionTimeout();
};

pubwiseAnalytics.adapterEnableAnalytics = pubwiseAnalytics.enableAnalytics;

pubwiseAnalytics.enableAnalytics = function (config) {
  configOptions = Object.assign(configOptions, config.options);
  // take the PBJS debug for our debug setting if no PW debug is defined
  if (configOptions.debug === null) {
    configOptions.debug = utils.debugTurnedOn();
  }
  markEnabled();
  sessionData.activationId = utils.generateUUID();
  this.ensureSession();
  pubwiseAnalytics.adapterEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: pubwiseAnalytics,
  code: 'pubwise',
  gvlid: 842
});

export default pubwiseAnalytics;
