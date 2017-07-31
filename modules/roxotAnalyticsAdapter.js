import {ajax} from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';

const utils = require('src/utils');

const url = '//pa.rxthdr.com/analytic';
const analyticsType = 'endpoint';

let auctionInitConst = CONSTANTS.EVENTS.AUCTION_INIT;
let auctionEndConst = CONSTANTS.EVENTS.AUCTION_END;
let bidWonConst = CONSTANTS.EVENTS.BID_WON;

let initOptions = {publisherIds: [], utmMarks: []};
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

function buildUtmTagData() {
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

function buildBidWon(eventType, args) {
  bidWon.options = initOptions;
  bidWon.events = [{args: args, eventType: eventType}];
}

function buildEventStack() {
  eventStack.options = initOptions;
}

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
}

function pushEvent(eventType, args) {
  eventStack.events.push({eventType, args});
}

function flushEvents() {
  eventStack.events = [];
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
        flushEvents();
      }

      if ((eventType === bidWonConst) && auctionStatus === 'not_started') {
        buildBidWon(eventType, info);
        send(eventType, bidWon, 'bidWon');
        return;
      }

      if (eventType === auctionEndConst) {
        buildEventStack(eventType);
        send(eventType, eventStack, 'eventStack');
        flushEvents();
        auctionStatus = 'not_started';
      } else {
        pushEvent(eventType, info);
      }
    }
  });

roxotAdapter.originEnableAnalytics = roxotAdapter.enableAnalytics;

roxotAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  initOptions.utmTagData = buildUtmTagData();
  utils.logInfo('Roxot Analytics enabled with config', initOptions);
  roxotAdapter.originEnableAnalytics(config);
};

adaptermanager.registerAnalyticsAdapter({
  adapter: roxotAdapter,
  code: 'roxot'
});

export default roxotAdapter;
