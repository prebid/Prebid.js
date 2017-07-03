import {ajax} from 'src/ajax';
import adapter from 'AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';

const utils = require('../../utils');

const url = '//pa.rxthdr.com/analytic';
const analyticsType = 'endpoint';
const userSyncUrl = '//pa.rxthdr.com/user_sync';

let auctionInitConst = CONSTANTS.EVENTS.AUCTION_INIT;
let auctionEndConst = CONSTANTS.EVENTS.AUCTION_END;
let bidWonConst = CONSTANTS.EVENTS.BID_WON;
let setS2sConfig = CONSTANTS.EVENTS.SET_S2S_CONFIG;

let initOptions = {publisherIds: []};
let bidWon = {options: {}, events: []};
let eventStack = {options: {}, events: []};
let s2sConfig = {};

let auctionStatus = 'not_started';

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

  ajax(
    fullUrl,
    (result) => utils.logInfo('Event ' + eventType + ' sent ' + sendDataType + ' to roxot prebid analytic with result' + result),
    JSON.stringify(data)
  );
}

function pushEvent(eventType, args) {
  eventStack.events.push({eventType, args});
}

function flushEvents() {
  eventStack.events = [];
}

function setS2sBidderCode() {
  eventStack.events.forEach(function (event) {
    if (Object.keys(s2sConfig).length) {
      if (s2sConfig.bidders.includes(event.args.bidderCode)) {
        event.args.bidderCode += '(s2s)';
      }
    }
  });
}

function setIframe(src) {
  let iframe = document.createElement('IFRAME');
  iframe.setAttribute('src', src);
  iframe.setAttribute('style', 'display:none');
  iframe.setAttribute('width', '0');
  iframe.setAttribute('height', '0');
  iframe.setAttribute('frameborder', '0');
  document.body.appendChild(iframe);
}

function setBidWonS2sBidderCode() {
  bidWon.events.forEach(function (event) {
    if (Object.keys(s2sConfig).length) {
      if (s2sConfig.bidders.includes(event.args.bidderCode)) {
        event.args.bidderCode += '(s2s)';
      }
    }
  });
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
        setBidWonS2sBidderCode();
        send(eventType, bidWon, 'bidWon');
        return;
      }

      if (eventType === auctionEndConst) {
        buildEventStack(eventType);
        setS2sBidderCode();
        send(eventType, eventStack, 'eventStack');
        flushEvents();
        auctionStatus = 'not_started';
      } else {
        pushEvent(eventType, info);
      }

      if (eventType === setS2sConfig) {
        s2sConfig = args.s2sConfig;
      }
    }
  });

roxotAdapter.originEnableAnalytics = roxotAdapter.enableAnalytics;

roxotAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  utils.logInfo('Roxot Analytics enabled with config', initOptions);
  roxotAdapter.originEnableAnalytics(config);
  setIframe(userSyncUrl);
};

export default roxotAdapter;
