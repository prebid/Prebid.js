/* Sigmoid Analytics Adapter for prebid.js v1.1.0-pre
Updated : 2018-03-28 */
import {includes} from '../src/polyfill.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import {getStorageManager} from '../src/storageManager.js';
import {generateUUID, logError, logInfo} from '../src/utils.js';
import {MODULE_TYPE_ANALYTICS} from '../src/activities/modules.js';

const MODULE_CODE = 'sigmoid';
const storage = getStorageManager({moduleType: MODULE_TYPE_ANALYTICS, moduleName: MODULE_CODE});

const url = 'https://kinesis.us-east-1.amazonaws.com/';
const analyticsType = 'endpoint';

const auctionInitConst = EVENTS.AUCTION_INIT;
const auctionEndConst = EVENTS.AUCTION_END;
const bidWonConst = EVENTS.BID_WON;
const bidRequestConst = EVENTS.BID_REQUESTED;
const bidAdjustmentConst = EVENTS.BID_ADJUSTMENT;
const bidResponseConst = EVENTS.BID_RESPONSE;

let initOptions = { publisherIds: [], utmTagData: [], adUnits: [] };
let bidWon = {options: {}, events: []};
let eventStack = {options: {}, events: []};

let auctionStatus = 'not_started';

let localStoragePrefix = 'sigmoid_analytics_';
let utmTags = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
let utmTimeoutKey = 'utm_timeout';
let utmTimeout = 60 * 60 * 1000;
let sessionTimeout = 60 * 60 * 1000;
let sessionIdStorageKey = 'session_id';
let sessionTimeoutKey = 'session_timeout';

function getParameterByName(param) {
  let vars = {};
  window.location.href.replace(location.hash, '').replace(
    /[?&]+([^=&]+)=?([^&]*)?/gi,
    function(m, key, value) {
      vars[key] = value !== undefined ? value : '';
    }
  );

  return vars[param] ? vars[param] : '';
}

function buildSessionIdLocalStorageKey() {
  return localStoragePrefix.concat(sessionIdStorageKey);
}

function buildSessionIdTimeoutLocalStorageKey() {
  return localStoragePrefix.concat(sessionTimeoutKey);
}

function updateSessionId() {
  if (isSessionIdTimeoutExpired()) {
    let newSessionId = generateUUID();
    storage.setDataInLocalStorage(buildSessionIdLocalStorageKey(), newSessionId);
  }
  initOptions.sessionId = getSessionId();
  updateSessionIdTimeout();
}

function updateSessionIdTimeout() {
  storage.setDataInLocalStorage(buildSessionIdTimeoutLocalStorageKey(), Date.now());
}

function isSessionIdTimeoutExpired() {
  let cpmSessionTimestamp = storage.getDataFromLocalStorage(buildSessionIdTimeoutLocalStorageKey());
  return Date.now() - cpmSessionTimestamp > sessionTimeout;
}

function getSessionId() {
  return storage.getDataFromLocalStorage(buildSessionIdLocalStorageKey()) ? storage.getDataFromLocalStorage(buildSessionIdLocalStorageKey()) : '';
}

function updateUtmTimeout() {
  storage.setDataInLocalStorage(buildUtmLocalStorageTimeoutKey(), Date.now());
}

function isUtmTimeoutExpired() {
  let utmTimestamp = storage.getDataFromLocalStorage(buildUtmLocalStorageTimeoutKey());
  return (Date.now() - utmTimestamp) > utmTimeout;
}

function buildUtmLocalStorageTimeoutKey() {
  return localStoragePrefix.concat(utmTimeoutKey);
}

function buildUtmLocalStorageKey(utmMarkKey) {
  return localStoragePrefix.concat(utmMarkKey);
}

function checkOptions() {
  if (typeof initOptions.publisherIds === 'undefined') {
    return false;
  }

  return initOptions.publisherIds.length > 0;
}

function checkAdUnitConfig() {
  if (typeof initOptions.adUnits === 'undefined') {
    return false;
  }

  return initOptions.adUnits.length > 0;
}

function buildBidWon(eventType, args) {
  bidWon.options = initOptions;
  if (checkAdUnitConfig()) {
    if (includes(initOptions.adUnits, args.adUnitCode)) {
      bidWon.events = [{ args: args, eventType: eventType }];
    }
  } else {
    bidWon.events = [{ args: args, eventType: eventType }];
  }
}

function buildEventStack() {
  eventStack.options = initOptions;
}

function filterBidsByAdUnit(bids) {
  var filteredBids = [];
  bids.forEach(function (bid) {
    if (includes(initOptions.adUnits, bid.placementCode)) {
      filteredBids.push(bid);
    }
  });
  return filteredBids;
}

function isValidEvent(eventType, adUnitCode) {
  if (checkAdUnitConfig()) {
    let validationEvents = [bidAdjustmentConst, bidResponseConst, bidWonConst];
    if (!includes(initOptions.adUnits, adUnitCode) && includes(validationEvents, eventType)) {
      return false;
    }
  }
  return true;
}

function isValidEventStack() {
  if (eventStack.events.length > 0) {
    return eventStack.events.some(function(event) {
      return bidRequestConst === event.eventType || bidWonConst === event.eventType;
    });
  }
  return false;
}

function isValidBidWon() {
  return bidWon.events.length > 0;
}

function flushEventStack() {
  eventStack.events = [];
}

let sigmoidAdapter = Object.assign(adapter({url, analyticsType}),
  {
    track({eventType, args}) {
      if (!checkOptions()) {
        return;
      }

      let info = Object.assign({}, args);

      if (info && info.ad) {
        info.ad = '';
      }

      if (eventType === auctionInitConst) {
        auctionStatus = 'started';
      }

      if (eventType === bidWonConst && auctionStatus === 'not_started') {
        updateSessionId();
        buildBidWon(eventType, info);
        if (isValidBidWon()) {
          send(eventType, bidWon, 'bidWon');
        }
        return;
      }

      if (eventType === auctionEndConst) {
        updateSessionId();
        buildEventStack();
        if (isValidEventStack()) {
          send(eventType, eventStack, 'eventStack');
        }
        auctionStatus = 'not_started';
      } else {
        pushEvent(eventType, info);
      }
    },

  });

sigmoidAdapter.originEnableAnalytics = sigmoidAdapter.enableAnalytics;

sigmoidAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  initOptions.utmTagData = this.buildUtmTagData();
  logInfo('Sigmoid Analytics enabled with config', initOptions);
  sigmoidAdapter.originEnableAnalytics(config);
};

sigmoidAdapter.buildUtmTagData = function () {
  let utmTagData = {};
  let utmTagsDetected = false;
  utmTags.forEach(function(utmTagKey) {
    let utmTagValue = getParameterByName(utmTagKey);
    if (utmTagValue !== '') {
      utmTagsDetected = true;
    }
    utmTagData[utmTagKey] = utmTagValue;
  });
  utmTags.forEach(function(utmTagKey) {
    if (utmTagsDetected) {
      storage.setDataInLocalStorage(buildUtmLocalStorageKey(utmTagKey), utmTagData[utmTagKey]);
      updateUtmTimeout();
    } else {
      if (!isUtmTimeoutExpired()) {
        utmTagData[utmTagKey] = storage.getDataFromLocalStorage(buildUtmLocalStorageKey(utmTagKey)) ? storage.getDataFromLocalStorage(buildUtmLocalStorageKey(utmTagKey)) : '';
        updateUtmTimeout();
      }
    }
  });
  return utmTagData;
};

function send(eventType, data, sendDataType) {
  // eslint-disable-next-line no-undef
  AWS.config.credentials = new AWS.Credentials({
    accessKeyId: 'accesskey', secretAccessKey: 'secretkey'
  });

  // eslint-disable-next-line no-undef
  AWS.config.region = 'us-east-1';
  // eslint-disable-next-line no-undef
  AWS.config.credentials.get(function(err) {
    // attach event listener
    if (err) {
      logError(err);
      return;
    }
    // create kinesis service object
    // eslint-disable-next-line no-undef
    var kinesis = new AWS.Kinesis({
      apiVersion: '2013-12-02'
    });
    var dataList = [];
    var jsonData = {};
    jsonData['Data'] = JSON.stringify(data) + '\n';
    jsonData['PartitionKey'] = 'partition-' + Math.random().toString(36).substring(7);
    dataList.push(jsonData);
    kinesis.putRecords({
      Records: dataList,
      StreamName: 'sample-stream'
    });
    if (sendDataType === 'eventStack') {
      flushEventStack();
    }
  });
};

function pushEvent(eventType, args) {
  if (eventType === bidRequestConst) {
    if (checkAdUnitConfig()) {
      args.bids = filterBidsByAdUnit(args.bids);
    }
    if (args.bids.length > 0) {
      eventStack.events.push({ eventType: eventType, args: args });
    }
  } else {
    if (isValidEvent(eventType, args.adUnitCode)) {
      eventStack.events.push({ eventType: eventType, args: args });
    }
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: sigmoidAdapter,
  code: MODULE_CODE,
});

export default sigmoidAdapter;
