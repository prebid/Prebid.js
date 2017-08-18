import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';

const utils = require('src/utils');

const url = '//pa.rxthdr.com/analytic';
const analyticsType = 'endpoint';

let auctionInitConst = CONSTANTS.EVENTS.AUCTION_INIT;
let auctionEndConst = CONSTANTS.EVENTS.AUCTION_END;
let bidWonConst = CONSTANTS.EVENTS.BID_WON;
let bidRequestConst = CONSTANTS.EVENTS.BID_REQUESTED;
let bidAdjustmentConst = CONSTANTS.EVENTS.BID_ADJUSTMENT;
let bidResponseConst = CONSTANTS.EVENTS.BID_RESPONSE;

let initOptions = { publisherIds: [], utmTagData: [], adUnits: [] };
let bidWon = {options: {}, events: []};
let eventStack = {options: {}, events: []};

let auctionStatus = 'not_started';

let localStoragePrefix = 'roxot_analytics_';
let utmTags = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
let utmTimeoutKey = 'utm_timeout';
let utmTimeout = 60 * 60 * 1000;

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

function updateUtmTimeout() {
  localStorage.setItem(buildUtmLocalStorageTimeoutKey(), Date.now());
}

function isUtmTimeoutExpired() {
  let utmTimestamp = localStorage.getItem(buildUtmLocalStorageTimeoutKey());
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
    if (initOptions.adUnits.includes(args.adUnitCode)) {
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
    if (initOptions.adUnits.includes(bid.placementCode)) {
      filteredBids.push(bid);
    }
  });
  return filteredBids;
}

function isValidEvent(eventType, adUnitCode) {
  if (checkAdUnitConfig()) {
    let validationEvents = [bidAdjustmentConst, bidResponseConst, bidWonConst];
    if (!initOptions.adUnits.includes(adUnitCode) && validationEvents.includes(eventType)) {
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

function flushBidWon() {
  bidWon.events = [];
}

let roxotAdapter = Object.assign(adapter({url, analyticsType}),
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
        flushEventStack();
      }

      if (eventType === bidWonConst && auctionStatus === 'not_started') {
        buildBidWon(eventType, info);
        if (isValidBidWon()) {
          send(eventType, bidWon, 'bidWon');
        }
        flushBidWon();
        return;
      }

      if (eventType === auctionEndConst) {
        buildEventStack(eventType);
        if (isValidEventStack()) {
          send(eventType, eventStack, 'eventStack');
        }
        flushEventStack();
        auctionStatus = 'not_started';
      } else {
        pushEvent(eventType, info);
      }
    },

  });

roxotAdapter.originEnableAnalytics = roxotAdapter.enableAnalytics;

roxotAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  initOptions.utmTagData = this.buildUtmTagData();
  utils.logInfo('Roxot Analytics enabled with config', initOptions);
  roxotAdapter.originEnableAnalytics(config);
};

roxotAdapter.buildUtmTagData = function () {
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
      localStorage.setItem(buildUtmLocalStorageKey(utmTagKey), utmTagData[utmTagKey]);
      updateUtmTimeout();
    } else {
      if (!isUtmTimeoutExpired()) {
        utmTagData[utmTagKey] = localStorage.getItem(buildUtmLocalStorageKey(utmTagKey)) ? localStorage.getItem(buildUtmLocalStorageKey(utmTagKey)) : '';
        updateUtmTimeout();
      }
    }
  });
  return utmTagData;
};

function send(eventType, data, sendDataType) {
  let fullUrl = url + '?publisherIds[]=' + initOptions.publisherIds.join('&publisherIds[]=') + '&host=' + window.location.hostname;
  let xhr = new XMLHttpRequest();
  xhr.open('POST', fullUrl, true);
  xhr.setRequestHeader('Content-Type', 'text/plain');
  xhr.withCredentials = true;
  xhr.onreadystatechange = function(result) {
    if (this.readyState != 4) return;

    utils.logInfo('Event ' + eventType + ' sent ' + sendDataType + ' to roxot prebid analytic with result' + result);
  }
  xhr.send(JSON.stringify(data));
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

adaptermanager.registerAnalyticsAdapter({
  adapter: roxotAdapter,
  code: 'roxot'
});

export default roxotAdapter;
