import {ajax} from '../src/ajax';
import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants.json';
const utils = require('../src/utils');

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
    site: 'test-test-test-test',
    endpoint: 'https://api.pubwise.io/api/v4/event/add/',
  }
 });
*/

const analyticsType = 'endpoint';
const analyticsName = 'PubWise:';
let defaultUrl = 'https://api.pubwise.io/api/v5/event/default/';
let pubwiseVersion = '3.0.90';
let configOptions = {site: '', endpoint: defaultUrl, debug: ''};
let pwAnalyticsEnabled = false;
let utmKeys = {utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: ''};
let sessionData = {sessionId: ''};
let pwNamespace = 'pubwise';
let pwEvents = [];
let metaData = {};
let auctionEnded = false;
let sessTimeout = 60 * 30 * 1000; // 30 minutes, G Analytics default session length
let sessName = 'sess_id';
let sessTimeoutName = 'sess_timeout';

function enrichWithSessionInfo(dataBag) {
  try {
    dataBag['session_id'] = sessionData.sessId;
  } catch (e) {
    dataBag['error_sess'] = 1;
  }

  return dataBag;
}

function enrichWithMetrics(dataBag) {
  try {
    if (typeof PREBID_TIMEOUT !== 'undefined') {
      dataBag['target_timeout'] = PREBID_TIMEOUT;
    } else {
      dataBag['target_timeout'] = 'NA';
    }
    dataBag['pw_version'] = pubwiseVersion;
    dataBag['pbjs_version'] = $$PREBID_GLOBAL$$.version;
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
        let itemValue = localStorage.getItem(setNamespace(prop));
        if (itemValue !== null && typeof itemValue !== 'undefined' && itemValue.length !== 0) {
          dataBag[prop] = itemValue;
        }
      }
    } else {
      for (let prop in utmKeys) {
        localStorage.setItem(setNamespace(prop), utmKeys[prop]);
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
    localStorage.removeItem(setNamespace(prop));
  }
}

function enrichWithCustomSegments(dataBag) {
  // c_site: '', c_script_type: '', c_slot1: '', c_slot2: '', c_slot3: '', c_slot4: ''
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
  localStorage.setItem(localStorageSessTimeoutName(), Date.now().toString());
}

function userSessionID() {
  return localStorage.getItem(localStorageSessName()) ? localStorage.getItem(localStorageSessName()) : '';
}

function sessionExpired() {
  let sessLastTime = localStorage.getItem(localStorageSessTimeoutName());
  return (Date.now() - parseInt(sessLastTime)) > sessTimeout;
}

function flushEvents() {
  if (pwEvents.length > 0) {
    let dataBag = {metaData: metaData, eventList: pwEvents.splice(0)}; // put all the events together with the metadata and send
    ajax(configOptions.endpoint, (result) => pwInfo(`Result`, result), JSON.stringify(dataBag));
  }
}

function isIngestedEvent(eventType) {
  const ingested = [CONSTANTS.EVENTS.AUCTION_INIT, CONSTANTS.EVENTS.BID_REQUESTED, CONSTANTS.EVENTS.BID_RESPONSE, CONSTANTS.EVENTS.BID_WON, CONSTANTS.EVENTS.BID_TIMEOUT];
  return ingested.includes(eventType);
}

function markEnabled() {
  pwInfo(`Enabled`, configOptions);
  pwAnalyticsEnabled = true;
  setInterval(flushEvents, 400);
}

function pwInfo(info, context) {
  utils.logInfo(`${analyticsName} ` + info, context);
}

/*
  // unused currently
  function filterNoBid(data) {
    let newNoBidData = {};

    newNoBidData.auctionId = data.auctionId;
    newNoBidData.bidId = data.bidId;
    newNoBidData.bidderRequestId = data.bidderRequestId;
    newNoBidData.transactionId = data.transactionId;

    return newNoBidData;
  }
*/

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
  if (typeof modified.bidderRequests !== 'undefined') {
    if (typeof modified.bidderRequests[0] !== 'undefined') {
      if (typeof modified.bidderRequests[0].refererInfo !== 'undefined') {
        modified.refererInfo = modified.bidderRequests[0].refererInfo;
      }
    }
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

let pubwiseAnalytics = Object.assign(adapter({defaultUrl, analyticsType}), {
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

  // if (eventType == CONSTANTS.EVENTS.AUCTION_END) {
  //  auctionEnded = true;
  // }

  // if (eventType == CONSTANTS.EVENTS.AUCTION_END || eventType == CONSTANTS.EVENTS.BID_WON || auctionEnded === true) {
  //  // we consider auction_end to to be the end of the auction
  //  flushEvents();
  // }

  // once the auction ends, or the event is a bid won send events
  if (eventType === CONSTANTS.EVENTS.AUCTION_END || eventType === CONSTANTS.EVENTS.BID_WON) {
    flushEvents();
  }
}

pubwiseAnalytics.storeSessionID = function (userSessID) {
  localStorage.setItem(localStorageSessName(), userSessID);
  pwInfo(`New Session Generated`, userSessID);
};

// ensure a session exists, if not make one, always store it
pubwiseAnalytics.ensureSession = function () {
  if (sessionExpired() === true || userSessionID() === null || userSessionID() === '') {
    expireUtmData();
    this.storeSessionID(utils.generateUUID());
  }
  extendUserSessionTimeout();
  sessionData.sessId = userSessionID();
};

pubwiseAnalytics.adapterEnableAnalytics = pubwiseAnalytics.enableAnalytics;

pubwiseAnalytics.enableAnalytics = function (config) {
  configOptions = config.options;
  if (configOptions.debug === undefined) {
    configOptions.debug = utils.debugTurnedOn();
  }
  markEnabled();
  this.ensureSession();
  pubwiseAnalytics.adapterEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: pubwiseAnalytics,
  code: 'pubwise'
});

export default pubwiseAnalytics;
