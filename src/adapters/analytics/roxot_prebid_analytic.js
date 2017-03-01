import {ajax} from 'src/ajax';
import adapter from 'AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';

const utils = require('../../utils');

const url = '//d.prebid-analytic.com/analytics';
const analyticsType = 'endpoint';

let auctionInitConst = CONSTANTS.EVENTS.AUCTION_INIT;
let auctionEndConst = CONSTANTS.EVENTS.AUCTION_END;
let bidWonConst = CONSTANTS.EVENTS.BID_WON;

let initOptions = {publisherIds: []};
let bidWon = {options: {}, events: []};
let eventStack = {options: {}, events: []};

function checkOptions() {
  if (typeof initOptions.publisherIds === 'undefined') {
    return false;
  }

  return initOptions.publisherIds.length > 0;
}

function buildBidWon(eventType, args) {
  bidWon.options = initOptions;
  bidWon.events.push({args: args, eventType: eventType});
}

function buildEventStack() {
  eventStack.options = initOptions;
}

function send(eventType, data, sendDataType) {
  ajax(
    url,
    (result) => utils.logInfo('Event ' + eventType + ' sent ' + sendDataType + ' to roxot prebid analityc with result' + result),
    JSON.stringify(data)
  );
}

function pushEvent(eventType, args) {
  eventStack.events.push({eventType, args});
}

function flushEvents() {
  eventStack.events = [];
}

export default utils.extend(adapter({url, analyticsType}),
  {
    track({eventType, args}) {
      if (eventType === auctionInitConst) {
        initOptions = args.config;
      }

      if (!checkOptions()) {
        return;
      }

      if (eventType === bidWonConst) {
        buildBidWon(eventType, args);
        send(eventType, bidWon, 'bidWon');
      }

      if (eventType === auctionEndConst) {
        buildEventStack(eventType);
        send(eventType, eventStack, 'eventStack');
        flushEvents();
      } else {
        pushEvent(eventType, args);
      }
    }
  });
