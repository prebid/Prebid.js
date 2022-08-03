import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';

const analyticsType = 'endpoint';
const url = 'URL_TO_SERVER_ENDPOINT';

const {
  EVENTS: {
    AUCTION_END,
    BID_WON,
    BID_RESPONSE,
    BID_REQUESTED,
  }
} = CONSTANTS;

let saveEvents = {}
let allEvents = {}
let auctionEnd = {}
let initOptions = {}
let endpoint = 'https://default'
let objectToSearchForBidderCode = ['bidderRequests', 'bidsReceived', 'noBids']

function getAdapterNameForAlias(aliasName) {
  return adapterManager.aliasRegistry[aliasName] || aliasName;
}

function cleanArgObject(arg, removead) {
  if (typeof arg['bidderCode'] == 'string') { arg['originalBidder'] = getAdapterNameForAlias(arg['bidderCode']); }
  if (typeof arg['creativeId'] == 'number') {
    arg['creativeId'] = arg['creativeId'].toString();
  }
  if (removead && typeof arg['ad'] != 'undefined') {
    arg['ad'] = 'emptied';
  }
  if (typeof arg['gdprConsent'] != 'undefined' && typeof arg['gdprConsent']['vendorData'] != 'undefined') {
    arg['gdprConsent']['vendorData'] = 'emptied';
  }
  return arg;
}

function cleanArgs(arg, removead) {
  Object.keys(arg).forEach(key => {
    arg[key] = cleanArgObject(arg[key], removead);
  });
  return arg
}

function checkBidderCode(args, removead) {
  if (typeof args == 'object') {
    for (let i = 0; i < objectToSearchForBidderCode.length; i++) {
      if (typeof args[objectToSearchForBidderCode[i]] == 'object') { args[objectToSearchForBidderCode[i]] = cleanArgs(args[objectToSearchForBidderCode[i]], removead) }
    }
  }
  if (typeof args['bidderCode'] == 'string') { args['originalBidder'] = getAdapterNameForAlias(args['bidderCode']); } else if (typeof args['bidder'] == 'string') { args['originalBidder'] = getAdapterNameForAlias(args['bidder']); }
  if (typeof args['creativeId'] == 'number') { args['creativeId'] = args['creativeId'].toString(); }

  return args
}

function addEvent(eventType, args) {
  let argsCleaned;
  if (eventType && args) {
    if (allEvents[eventType] == undefined) { allEvents[eventType] = [] }
    if (saveEvents[eventType] == undefined) { saveEvents[eventType] = [] }
    argsCleaned = checkBidderCode(JSON.parse(JSON.stringify(args)), false);
    allEvents[eventType].push(argsCleaned);
    saveEvents[eventType].push(argsCleaned);
    argsCleaned = checkBidderCode(JSON.parse(JSON.stringify(args)), true);
    if (['auctionend', 'bidtimeout'].includes(eventType.toLowerCase())) {
      if (auctionEnd[eventType] == undefined) { auctionEnd[eventType] = [] }
      auctionEnd[eventType].push(argsCleaned);
    }
  }
}

function handleBidWon(args) {
  args = cleanArgObject(JSON.parse(JSON.stringify(args)), true);
  let increment = args['cpm'];
  if (typeof saveEvents['auctionEnd'] == 'object') {
    for (let i = 0; i < saveEvents['auctionEnd'].length; i++) {
      let tmpAuction = saveEvents['auctionEnd'][i];
      if (tmpAuction['auctionId'] == args['auctionId'] && typeof tmpAuction['bidsReceived'] == 'object') {
        for (let j = 0; j < tmpAuction['bidsReceived'].length; j++) {
          let tmpBid = tmpAuction['bidsReceived'][j];
          if (tmpBid['transactionId'] == args['transactionId'] && tmpBid['adId'] != args['adId']) {
            if (args['cpm'] < tmpBid['cpm']) {
              increment = 0;
            } else if (increment > args['cpm'] - tmpBid['cpm']) {
              increment = args['cpm'] - tmpBid['cpm'];
            }
          }
        }
      }
    }
  }
  args['cpmIncrement'] = increment;
  if (typeof saveEvents.bidRequested == 'object' && saveEvents.bidRequested.length > 0 && saveEvents.bidRequested[0].gdprConsent) { args.gdpr = saveEvents.bidRequested[0].gdprConsent; }
  ajax(endpoint + '.bidwatch.io/analytics/bid_won', null, JSON.stringify(args), {method: 'POST', withCredentials: true});
}

function handleAuctionEnd() {
  ajax(endpoint + '.bidwatch.io/analytics/auctions', null, JSON.stringify(auctionEnd), {method: 'POST', withCredentials: true});
  auctionEnd = {}
  if (typeof allEvents['bidResponse'] != 'undefined') {
    for (let i = 0; i < allEvents['bidResponse'].length; i++) { ajax(endpoint + '.bidwatch.io/analytics/creatives', null, JSON.stringify(allEvents['bidResponse'][i]), {method: 'POST', withCredentials: true}); }
  }
  allEvents = {}
}

let bidwatchAnalytics = Object.assign(adapter({url, analyticsType}), {
  track({
    eventType,
    args
  }) {
    switch (eventType) {
      case AUCTION_END:
        addEvent(eventType, args);
        handleAuctionEnd();
        break;
      case BID_WON:
        handleBidWon(args);
        break;
      case BID_RESPONSE:
        addEvent(eventType, args);
        break;
      case BID_REQUESTED:
        addEvent(eventType, args);
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
