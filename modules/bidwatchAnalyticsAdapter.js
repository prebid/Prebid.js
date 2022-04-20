import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';

const analyticsType = 'endpoint';
const url = 'URL_TO_SERVER_ENDPOINT';

const {
  EVENTS: {
    AUCTION_END,
    BID_WON,
  }
} = CONSTANTS;

let allEvents = {}
let initOptions = {}
let endpoint = 'https://default'
let objectToSearchForBidderCode = ['bidderRequests', 'bidsReceived', 'noBids']

function getAdapterNameForAlias(aliasName) {
  return adapterManager.aliasRegistry[aliasName] || aliasName;
}

function setOriginalBidder(arg) {
  Object.keys(arg).forEach(key => {
    arg[key]['originalBidder'] = getAdapterNameForAlias(arg[key]['bidderCode']);
    if (typeof arg[key]['creativeId'] == 'number') { arg[key]['creativeId'] = arg[key]['creativeId'].toString(); }
  });
  return arg
}

function checkBidderCode(args) {
  if (typeof args == 'object') {
    for (let i = 0; i < objectToSearchForBidderCode.length; i++) {
      if (typeof args[objectToSearchForBidderCode[i]] == 'object') { args[objectToSearchForBidderCode[i]] = setOriginalBidder(args[objectToSearchForBidderCode[i]]) }
    }
  }
  if (typeof args['bidderCode'] == 'string') { args['originalBidder'] = getAdapterNameForAlias(args['bidderCode']); } else if (typeof args['bidder'] == 'string') { args['originalBidder'] = getAdapterNameForAlias(args['bidder']); }
  if (typeof args['creativeId'] == 'number') { args['creativeId'] = args['creativeId'].toString(); }
  return args
}

function addEvent(eventType, args) {
  if (allEvents[eventType] == undefined) { allEvents[eventType] = [] }
  if (eventType && args) { args = checkBidderCode(args); }
  allEvents[eventType].push(args);
}

function handleBidWon(args) {
  if (typeof allEvents.bidRequested == 'object' && allEvents.bidRequested.length > 0 && allEvents.bidRequested[0].gdprConsent) { args.gdpr = allEvents.bidRequested[0].gdprConsent; }
  ajax(endpoint + '.bidwatch.io/analytics/bid_won', null, JSON.stringify(args), {method: 'POST', withCredentials: true});
}

function handleAuctionEnd() {
  ajax(endpoint + '.bidwatch.io/analytics/auctions', null, JSON.stringify(allEvents), {method: 'POST', withCredentials: true});
}

let bidwatchAnalytics = Object.assign(adapter({url, analyticsType}), {
  track({
    eventType,
    args
  }) {
    addEvent(eventType, args);
    switch (eventType) {
      case AUCTION_END:
        handleAuctionEnd();
        break;
      case BID_WON:
        handleBidWon(args);
        break;
    }
  }});

// save the base class function
bidwatchAnalytics.originEnableAnalytics = bidwatchAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
bidwatchAnalytics.enableAnalytics = function (config) {
  bidwatchAnalytics.originEnableAnalytics(config); // call the base class function
  initOptions = config.options;
  if (initOptions.domain) { endpoint = 'https://' + initOptions.domain; }
};

adapterManager.registerAnalyticsAdapter({
  adapter: bidwatchAnalytics,
  code: 'bidwatch'
});

export default bidwatchAnalytics;
