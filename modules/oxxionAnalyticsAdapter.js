import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { ajax } from '../src/ajax.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { deepClone } from '../src/utils.js';

const analyticsType = 'endpoint';
const url = 'URL_TO_SERVER_ENDPOINT';

const {
  AUCTION_END,
  BID_WON,
  BID_RESPONSE,
  BID_REQUESTED,
  BID_TIMEOUT,
} = EVENTS;

const saveEvents = {}
let allEvents = {}
let auctionEnd = {}
let initOptions = {}
let mode = {};
let endpoint = 'https://default'
const requestsAttributes = ['adUnitCode', 'auctionId', 'bidder', 'bidderCode', 'bidId', 'cpm', 'creativeId', 'currency', 'width', 'height', 'mediaType', 'netRevenue', 'originalCpm', 'originalCurrency', 'requestId', 'size', 'source', 'status', 'timeToRespond', 'transactionId', 'ttl', 'sizes', 'mediaTypes', 'src', 'params', 'userId', 'labelAny', 'bids', 'adId', 'ova'];

function getAdapterNameForAlias(aliasName) {
  return adapterManager.aliasRegistry[aliasName] || aliasName;
}

function filterAttributes(arg, removead) {
  const response = {};
  if (typeof arg === 'object') {
    if (typeof arg['bidderCode'] === 'string') {
      response['originalBidder'] = getAdapterNameForAlias(arg['bidderCode']);
    } else if (typeof arg['bidder'] === 'string') {
      response['originalBidder'] = getAdapterNameForAlias(arg['bidder']);
    }
    if (!removead && typeof arg['ad'] !== 'undefined') {
      response['ad'] = arg['ad'];
    }
    if (typeof arg['gdprConsent'] !== 'undefined') {
      response['gdprConsent'] = {};
      if (typeof arg['gdprConsent']['consentString'] !== 'undefined') {
        response['gdprConsent']['consentString'] = arg['gdprConsent']['consentString'];
      }
    }
    if (typeof arg['meta'] === 'object') {
      response['meta'] = {};
      if (typeof arg['meta']['advertiserDomains'] !== 'undefined') {
        response['meta']['advertiserDomains'] = arg['meta']['advertiserDomains'];
      }
      if (typeof arg['meta']['demandSource'] === 'string') {
        response['meta']['demandSource'] = arg['meta']['demandSource'];
      }
    }
    requestsAttributes.forEach((attr) => {
      if (typeof arg[attr] !== 'undefined') { response[attr] = arg[attr]; }
    });
    if (typeof response['creativeId'] === 'number') {
      response['creativeId'] = response['creativeId'].toString();
    }
  }
  response['oxxionMode'] = mode;
  return response;
}

function cleanAuctionEnd(args) {
  const response = {};
  let filteredObj;
  const objects = ['bidderRequests', 'bidsReceived', 'noBids', 'adUnits'];
  objects.forEach((attr) => {
    if (Array.isArray(args[attr])) {
      response[attr] = [];
      args[attr].forEach((obj) => {
        filteredObj = filterAttributes(obj, true);
        if (typeof obj['bids'] === 'object') {
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
  const stringArgs = JSON.parse(dereferenceWithoutRenderer(args));
  return filterAttributes(stringArgs, false);
}

function enhanceMediaType(arg) {
  saveEvents['bidRequested'].forEach((bidRequested) => {
    if (bidRequested['auctionId'] === arg['auctionId'] && Array.isArray(bidRequested['bids'])) {
      bidRequested['bids'].forEach((bid) => {
        if (bid['transactionId'] === arg['transactionId'] && bid['bidId'] === arg['requestId']) { arg['mediaTypes'] = bid['mediaTypes']; }
      });
    }
  });
  return arg;
}

function addBidResponse(args) {
  const eventType = BID_RESPONSE;
  const argsCleaned = cleanCreatives(args); ;
  if (allEvents[eventType] === undefined) { allEvents[eventType] = [] }
  allEvents[eventType].push(argsCleaned);
}

function addBidRequested(args) {
  const eventType = BID_REQUESTED;
  const argsCleaned = filterAttributes(args, true);
  if (saveEvents[eventType] === undefined) { saveEvents[eventType] = [] }
  saveEvents[eventType].push(argsCleaned);
}

function addTimeout(args) {
  const eventType = BID_TIMEOUT;
  if (saveEvents[eventType] === undefined) { saveEvents[eventType] = [] }
  saveEvents[eventType].push(args);
  const argsCleaned = [];
  let argsDereferenced = {};
  const stringArgs = JSON.parse(dereferenceWithoutRenderer(args));
  argsDereferenced = stringArgs;
  argsDereferenced.forEach((attr) => {
    argsCleaned.push(filterAttributes(deepClone(attr), false));
  });
  if (auctionEnd[eventType] === undefined) { auctionEnd[eventType] = [] }
  auctionEnd[eventType].push(argsCleaned);
}

export const dereferenceWithoutRenderer = function(args) {
  if (args.renderer) {
    const tmp = args.renderer;
    delete args.renderer;
    const stringified = JSON.stringify(args);
    args['renderer'] = tmp;
    return stringified;
  }
  if (args.bidsReceived) {
    const tmp = {}
    for (const key in args.bidsReceived) {
      if (args.bidsReceived[key].renderer) {
        tmp[key] = args.bidsReceived[key].renderer;
        delete args.bidsReceived[key].renderer;
      }
    }
    const stringified = JSON.stringify(args);
    for (const key in tmp) {
      args.bidsReceived[key].renderer = tmp[key];
    }
    return stringified;
  }
  return JSON.stringify(args);
}

function addAuctionEnd(args) {
  const eventType = AUCTION_END;
  if (saveEvents[eventType] === undefined) { saveEvents[eventType] = [] }
  saveEvents[eventType].push(args);
  const argsCleaned = cleanAuctionEnd(JSON.parse(dereferenceWithoutRenderer(args)));
  if (auctionEnd[eventType] === undefined) { auctionEnd[eventType] = [] }
  auctionEnd[eventType].push(argsCleaned);
}

function handleBidWon(args) {
  args = enhanceMediaType(filterAttributes(JSON.parse(dereferenceWithoutRenderer(args)), true));
  let increment = args['cpm'];
  if (typeof saveEvents['auctionEnd'] === 'object') {
    saveEvents['auctionEnd'].forEach((auction) => {
      if (auction['auctionId'] === args['auctionId'] && typeof auction['bidsReceived'] === 'object') {
        auction['bidsReceived'].forEach((bid) => {
          if (bid['transactionId'] === args['transactionId'] && bid['adId'] !== args['adId']) {
            if (args['cpm'] < bid['cpm']) {
              increment = 0;
            } else if (increment > args['cpm'] - bid['cpm']) {
              increment = args['cpm'] - bid['cpm'];
            }
          }
        });
      }
      if (auction['auctionId'] === args['auctionId'] && typeof auction['bidderRequests'] === 'object') {
        auction['bidderRequests'].forEach((req) => {
          req.bids.forEach((bid) => {
            if (bid['bidId'] === args['requestId'] && bid['transactionId'] === args['transactionId']) {
              args['ova'] = bid['ova'];
            }
          });
        });
      }
    });
  }
  args['cpmIncrement'] = increment;
  args['referer'] = encodeURIComponent(getRefererInfo().page || getRefererInfo().topmostLocation);
  if (typeof saveEvents.bidRequested === 'object' && saveEvents.bidRequested.length > 0 && saveEvents.bidRequested[0].gdprConsent) { args.gdpr = saveEvents.bidRequested[0].gdprConsent; }
  ajax(endpoint + '.oxxion.io/analytics/bid_won', null, JSON.stringify(args), {method: 'POST', withCredentials: true});
}

function handleAuctionEnd() {
  ajax(endpoint + '.oxxion.io/analytics/auctions', function (data) {
    const list = JSON.parse(data);
    if (Array.isArray(list) && typeof allEvents['bidResponse'] !== 'undefined') {
      const alreadyCalled = [];
      allEvents['bidResponse'].forEach((bidResponse) => {
        const tmpId = bidResponse['originalBidder'] + '_' + bidResponse['creativeId'];
        if (list.includes(tmpId) && !alreadyCalled.includes(tmpId)) {
          alreadyCalled.push(tmpId);
          ajax(endpoint + '.oxxion.io/analytics/creatives', null, JSON.stringify(bidResponse), {method: 'POST', withCredentials: true});
        }
      });
    }
    allEvents = {};
  }, JSON.stringify(auctionEnd), {method: 'POST', withCredentials: true});
  auctionEnd = {};
}

const oxxionAnalytics = Object.assign(adapter({url, analyticsType}), {
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
  }
});

// save the base class function
oxxionAnalytics.originEnableAnalytics = oxxionAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
oxxionAnalytics.enableAnalytics = function (config) {
  oxxionAnalytics.originEnableAnalytics(config); // call the base class function
  initOptions = config.options;
  if (initOptions.domain) {
    endpoint = 'https://' + initOptions.domain;
  }
  if (window.OXXION_MODE) {
    mode = window.OXXION_MODE;
  }
};

adapterManager.registerAnalyticsAdapter({
  adapter: oxxionAnalytics,
  code: 'oxxion'
});

export default oxxionAnalytics;
