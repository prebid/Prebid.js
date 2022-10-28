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
    BID_TIMEOUT,
  }
} = CONSTANTS;

let saveEvents = {}
let allEvents = {}
let auctionEnd = {}
let initOptions = {}
let endpoint = 'https://default'
let requestsAttributes = ['adUnitCode', 'auctionId', 'bidder', 'bidderCode', 'bidId', 'cpm', 'creativeId', 'currency', 'width', 'height', 'mediaType', 'netRevenue', 'originalCpm', 'originalCurrency', 'requestId', 'size', 'source', 'status', 'timeToRespond', 'transactionId', 'ttl', 'sizes', 'mediaTypes', 'src', 'params', 'userId', 'labelAny', 'bids', 'adId'];

function getAdapterNameForAlias(aliasName) {
  return adapterManager.aliasRegistry[aliasName] || aliasName;
}

function filterAttributes(arg, removead) {
  let response = {};
  if (typeof arg == 'object') {
    if (typeof arg['bidderCode'] == 'string') {
      response['originalBidder'] = getAdapterNameForAlias(arg['bidderCode']);
    } else if (typeof arg['bidder'] == 'string') {
      response['originalBidder'] = getAdapterNameForAlias(arg['bidder']);
    }
    if (!removead && typeof arg['ad'] != 'undefined') {
      response['ad'] = arg['ad'];
    }
    if (typeof arg['gdprConsent'] != 'undefined') {
      response['gdprConsent'] = {};
      if (typeof arg['gdprConsent']['consentString'] != 'undefined') { response['gdprConsent']['consentString'] = arg['gdprConsent']['consentString']; }
    }
    if (typeof arg['meta'] == 'object' && typeof arg['meta']['advertiserDomains'] != 'undefined') {
      response['meta'] = {'advertiserDomains': arg['meta']['advertiserDomains']};
    }
    requestsAttributes.forEach((attr) => {
      if (typeof arg[attr] != 'undefined') { response[attr] = arg[attr]; }
    });
    if (typeof response['creativeId'] == 'number') { response['creativeId'] = response['creativeId'].toString(); }
  }
  return response;
}

function cleanAuctionEnd(args) {
  let response = {};
  let filteredObj;
  let objects = ['bidderRequests', 'bidsReceived', 'noBids', 'adUnits'];
  objects.forEach((attr) => {
    if (Array.isArray(args[attr])) {
      response[attr] = [];
      args[attr].forEach((obj) => {
        filteredObj = filterAttributes(obj, true);
        if (typeof obj['bids'] == 'object') {
          filteredObj['bids'] = [];
          obj['bids'].forEach((bid) => {
            filteredObj['bids'].push(filterAttributes(bid, true));
          });
        }
        response[attr].push(filteredObj);
      });
    }
  });
  return response;
}

function cleanCreatives(args) {
  return filterAttributes(args, false);
}

function enhanceMediaType(arg) {
  saveEvents['bidRequested'].forEach((bidRequested) => {
    if (bidRequested['auctionId'] == arg['auctionId'] && Array.isArray(bidRequested['bids'])) {
      bidRequested['bids'].forEach((bid) => {
        if (bid['transactionId'] == arg['transactionId'] && bid['bidId'] == arg['requestId']) { arg['mediaTypes'] = bid['mediaTypes']; }
      });
    }
  });
  return arg;
}

function addBidResponse(args) {
  let eventType = BID_RESPONSE;
  let argsCleaned = cleanCreatives(JSON.parse(JSON.stringify(args))); ;
  if (allEvents[eventType] == undefined) { allEvents[eventType] = [] }
  allEvents[eventType].push(argsCleaned);
}

function addBidRequested(args) {
  let eventType = BID_REQUESTED;
  let argsCleaned = filterAttributes(args, true);
  if (saveEvents[eventType] == undefined) { saveEvents[eventType] = [] }
  saveEvents[eventType].push(argsCleaned);
}

function addTimeout(args) {
  let eventType = BID_TIMEOUT;
  if (saveEvents[eventType] == undefined) { saveEvents[eventType] = [] }
  saveEvents[eventType].push(args);
  let argsCleaned = [];
  let argsDereferenced = JSON.parse(JSON.stringify(args));
  argsDereferenced.forEach((attr) => {
    argsCleaned.push(filterAttributes(JSON.parse(JSON.stringify(attr)), false));
  });
  if (auctionEnd[eventType] == undefined) { auctionEnd[eventType] = [] }
  auctionEnd[eventType].push(argsCleaned);
}

function addAuctionEnd(args) {
  let eventType = AUCTION_END;
  if (saveEvents[eventType] == undefined) { saveEvents[eventType] = [] }
  saveEvents[eventType].push(args);
  let argsCleaned = cleanAuctionEnd(JSON.parse(JSON.stringify(args)));
  if (auctionEnd[eventType] == undefined) { auctionEnd[eventType] = [] }
  auctionEnd[eventType].push(argsCleaned);
}

function handleBidWon(args) {
  args = enhanceMediaType(filterAttributes(JSON.parse(JSON.stringify(args)), true));
  let increment = args['cpm'];
  if (typeof saveEvents['auctionEnd'] == 'object') {
    saveEvents['auctionEnd'].forEach((auction) => {
      if (auction['auctionId'] == args['auctionId'] && typeof auction['bidsReceived'] == 'object') {
        auction['bidsReceived'].forEach((bid) => {
          if (bid['transactionId'] == args['transactionId'] && bid['adId'] != args['adId']) {
            if (args['cpm'] < bid['cpm']) {
              increment = 0;
            } else if (increment > args['cpm'] - bid['cpm']) {
              increment = args['cpm'] - bid['cpm'];
            }
          }
        });
      }
    });
  }
  args['cpmIncrement'] = increment;
  if (typeof saveEvents.bidRequested == 'object' && saveEvents.bidRequested.length > 0 && saveEvents.bidRequested[0].gdprConsent) { args.gdpr = saveEvents.bidRequested[0].gdprConsent; }
  ajax(endpoint + '.bidwatch.io/analytics/bid_won', null, JSON.stringify(args), {method: 'POST', withCredentials: true});
}

function handleAuctionEnd() {
  ajax(endpoint + '.bidwatch.io/analytics/auctions', function (data) {
    let list = JSON.parse(data);
    if (Array.isArray(list) && typeof allEvents['bidResponse'] != 'undefined') {
      let alreadyCalled = [];
      allEvents['bidResponse'].forEach((bidResponse) => {
        let tmpId = bidResponse['originalBidder'] + '_' + bidResponse['creativeId'];
        if (list.includes(tmpId) && !alreadyCalled.includes(tmpId)) {
          alreadyCalled.push(tmpId);
          ajax(endpoint + '.bidwatch.io/analytics/creatives', null, JSON.stringify(bidResponse), {method: 'POST', withCredentials: true});
        }
      });
    }
    allEvents = {};
  }, JSON.stringify(auctionEnd), {method: 'POST', withCredentials: true});
  auctionEnd = {};
}

let bidwatchAnalytics = Object.assign(adapter({url, analyticsType}), {
  track({
    eventType,
    args
  }) {
    switch (eventType) {
      case AUCTION_END:
        addAuctionEnd(args);
        handleAuctionEnd();
        break;
      case BID_WON:
        handleBidWon(args);
        break;
      case BID_RESPONSE:
        addBidResponse(args);
        break;
      case BID_REQUESTED:
        addBidRequested(args);
        break;
      case BID_TIMEOUT:
        addTimeout(args);
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
