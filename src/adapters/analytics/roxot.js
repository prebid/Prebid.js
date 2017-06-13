import {ajax} from 'src/ajax';
import adapter from 'AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';

const utils = require('../../utils');

const url = '//pa.rxthdr.com/analytic';
const analyticsType = 'endpoint';

let auctionInitConst = CONSTANTS.EVENTS.AUCTION_INIT;
let auctionEndConst = CONSTANTS.EVENTS.AUCTION_END;
let bidWonConst = CONSTANTS.EVENTS.BID_WON;

let initOptions = {publisherIds: []};
let bidWon = {options: {}, events: []};
let eventStack = {options: {}, events: []};

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
  utils.logInfo('Roxot Analytics enabled with config', initOptions);
  roxotAdapter.originEnableAnalytics(config);
};

export default roxotAdapter;
