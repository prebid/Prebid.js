import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
// import { config } from '../src/config.js';

const analyticsType = 'endpoint';
const defaultUrl = '';
const VERSION = '3.0';
var auctionTracker = {};
var bidTimeouts = [];
var auctionEndStorage = null;
var platformURL;
var bidderAnalyticsDomain;
var publisherId;
let fallbackSaver = {};

export const auctionInit = function (eventType, args) {
  var auctionId = args.auctionId;
  auctionTracker[auctionId] = {};
  // For each of the ad units, create the needed objects in auctionTracker
  args.adUnitCodes.forEach(
    adUnitId => auctionTracker[auctionId][adUnitId] = {
      req: {},
      res: {},
      nob: {}
    }
  );
}

const bidRequested = function (eventType, args) {
}

const bidResponse = function (eventType, args) {
}

export const bidWon = function (eventType, args) {
  let relevantBidsData = [];
  let responses = auctionTracker[args.auctionId][args.adUnitCode].res;
  let nonResponses = auctionTracker[args.auctionId][args.adUnitCode].nob;
  let bidResponders = Object.keys(responses);
  let noBidResponders = Object.keys(nonResponses);

  let bidResponsesRaw = auctionTracker[args.auctionId][args.adUnitCode].res
  let winningBid = {};
  let winningBidData = auctionEndStorage.bidsReceived.filter(
    bid => bid.bidderCode === args.bidderCode && bid.adUnitCode === args.adUnitCode
  )[0]

  winningBid.adTagId = args.adUnitCode;
  winningBid.bid = true;
  winningBid.language = window.navigator.language || '';
  winningBid.userAgent = window.navigator.userAgent || '';
  if (navigator.userAgentData && navigator.userAgentData.platform) {
    winningBid.platform = navigator.userAgentData.platform;
  } else {
    winningBid.platform = navigator.platform;
  }
  winningBid.timeZone = new Date().getTimezoneOffset() / 60;
  winningBid.width = winningBidData.width ? winningBidData.width : undefined;
  winningBid.height = winningBidData.height ? winningBidData.height : undefined;
  winningBid.screenWidth = screen.width;
  winningBid.screenHeight = screen.height;
  winningBid.size = winningBid.width && winningBid.height ? `${winningBidData.width}x${winningBidData.height}` : '';
  winningBid.win = true;

  winningBid.cost = args.cpm / 1000;
  winningBid.currency = args.currency;
  winningBid.delay = args.timeToRespond;
  winningBid.domain = auctionTracker.domain;
  winningBid.ssp = args.bidder;

  relevantBidsData.push(winningBid);
  for (let bidder of bidResponders) {
    if (bidResponsesRaw[bidder].ssp !== winningBid.ssp) {
      relevantBidsData.push(bidResponsesRaw[bidder]);
    }
  }

  for (let bidder of noBidResponders) {
    relevantBidsData.push(nonResponses[bidder]);
  }

  // Send the JSON-stringified array to server
  let payload = JSON.stringify(relevantBidsData);
  let platformUrlMatch = platformURL.match(/.+(?=protocol\.php)/)
  let fullPlatformURL = (platformUrlMatch ? platformUrlMatch[0] : platformURL) + 'data.php?type=pbstats';

  ajax(fullPlatformURL, null, payload);
  if (bidderAnalyticsDomain && publisherId) {
    let optionalForwardSlash = bidderAnalyticsDomain.match(/\/$/) ? '' : '/';
    let bidderAnalyticsURL = `${bidderAnalyticsDomain}${optionalForwardSlash}protocol.php?action=prebid_impression&version=${VERSION}`

    let bidderPayload = JSON.stringify(
      {
        platform: publisherId,
        data: relevantBidsData
      }
    );
    ajax(bidderAnalyticsURL, null, bidderPayload);
  }
}

export const bidTimeout = function (eventType, args) {
  bidTimeouts = args;
}

export const auctionEnd = function (eventType, args) {
  auctionEndStorage = args;
  var adUnitsHaveBids = {};
  var adUnitsHaveAdhashFallback = {};
  var adUnitsHaveOtherFallbacks = {};
  for (let adUnit of args.adUnitCodes) {
    adUnitsHaveBids[adUnit] = false;
    adUnitsHaveAdhashFallback[adUnit] = false;
    adUnitsHaveOtherFallbacks[adUnit] = false;
  }

  // adding domain here:
  if (!auctionTracker.domain) {
    try {
      auctionTracker.domain = window.top.location.host;
    } catch (e) {
      auctionTracker.domain = '';
    }
  }

  // Populate Request info
  args.bidderRequests.forEach(req => {
    for (var bid of req.bids) {
      auctionTracker[req.auctionId][bid.adUnitCode].req[req.bidderCode] = {
        ssp: req.bidderCode,
        domain: auctionTracker.domain,
        delay: null,
        bid: false,
        win: false,
        timeout: false,
        cost: null
      }
    }
  })

  // Populate Response info
  args.bidsReceived.forEach(res => {
    var unitAuction = auctionTracker[res.auctionId][res.adUnitCode];
    unitAuction.res[res.bidderCode] = {
      ssp: res.bidderCode,
      domain: auctionTracker.domain,
      delay: res.timeToRespond,
      bid: true,
      win: false,
      timeout: false,
      cost: res.cpm / 1000,
      currency: res.currency
    }
    if (res.width && res.height) {
      unitAuction.res[res.bidderCode]['width'] = res.width;
      unitAuction.res[res.bidderCode]['height'] = res.height;
    }
    adUnitsHaveBids[res.adUnitCode] = true;
  })

  args.noBids.forEach(res => {
    var unitAuction = auctionTracker[res.auctionId][res.adUnitCode];

    var nobObj = unitAuction.nob;
    nobObj[res.bidder] = {
      ssp: res.bidder,
      domain: auctionTracker.domain,
      delay: null,
      bid: false,
      win: false,
      timeout: false,
      cost: 0.0,
    }
    if (res.bidder === 'adhash') {
      adUnitsHaveAdhashFallback[res.adUnitCode] = true;
    } else {
      adUnitsHaveOtherFallbacks[res.adUnitCode] = true;
    }
  })

  bidTimeouts.forEach(req => {
    var unitAuction = auctionTracker[req.auctionId][req.adUnitCode];
    var noBidObject = unitAuction.nob;
    if (!noBidObject[req.bidder]) {
      noBidObject[req.bidder] = {
        ssp: req.bidder,
        domain: auctionTracker.domain,
        bid: false,
        win: false,
        timeout: true,
        cost: 0.0,
      }
    } else {
      noBidObject[req.bidder].timeout = true;
    }
  })

  // Send fallback data for each ad unit
  for (let adUnit of args.adUnitCodes) {
    if (adUnitsHaveBids[adUnit]) {
      continue;
    }
    let fallbackData = {};
    fallbackData.adTagId = adUnit;
    fallbackData.pageURL = window.location.href;
    if (navigator.userAgentData && navigator.userAgentData.platform) {
      fallbackData.platform = navigator.userAgentData.platform;
    } else {
      fallbackData.platform = navigator.platform;
    }
    fallbackData.language = window.navigator.language || '';
    fallbackData.userAgent = window.navigator.userAgent || '';
    fallbackData.screenWidth = screen.width;
    fallbackData.screenHeight = screen.height;
    fallbackData.timeZone = new Date().getTimezoneOffset() / 60;
    fallbackData.hasAdhashFallback = adUnitsHaveAdhashFallback[adUnit];
    fallbackData.hasOtherFallbacks = adUnitsHaveOtherFallbacks[adUnit];
    fallbackSaver = fallbackData;

    let payload = JSON.stringify(fallbackData);
    let platformUrlMatch = platformURL.match(/.+(?=protocol\.php)/);
    let fullPlatformURL = (platformUrlMatch ? platformUrlMatch[0] : platformURL) + 'data.php?type=pbfallback';

    ajax(fullPlatformURL, null, payload);
  }
}

export const noBid = function (eventType, args) {
  var auctionId = args.auctionId;
  var adUnitCode = args.adUnitCode;
  var bidder = args.bidder;
  auctionTracker[auctionId][adUnitCode].nob[bidder] = {
    bid: false,
    cost: 0,
    domain: auctionTracker.domain,
    ssp: bidder,
    timeout: false,
    win: false
  }
}

const {
  EVENTS: {
    AUCTION_INIT,
    BID_REQUESTED,
    BID_TIMEOUT,
    BID_RESPONSE,
    BID_WON,
    AUCTION_END,
    NO_BID
  }
} = CONSTANTS;

let adhashAdapter = Object.assign(adapter({ defaultUrl, analyticsType }), {
  track({ eventType, args }) {
    switch (eventType) {
      case AUCTION_INIT:
        auctionInit(eventType, args);
        break;
      case BID_REQUESTED:
        bidRequested(eventType, args);
        break;
      case BID_RESPONSE:
        bidResponse(eventType, args);
        break;
      case BID_WON:
        bidWon(eventType, args); // Send the data here.
        break;
      case BID_TIMEOUT:
        bidTimeout(eventType, args);
        break;
      case AUCTION_END:
        auctionEnd(eventType, args);
        break;
      case NO_BID:
        noBid(eventType, args);
        break;
      default:
        break;
    }
  }
});
adhashAdapter.context = {};

adhashAdapter.originEnableAnalytics = adhashAdapter.enableAnalytics;
adhashAdapter.enableAnalytics = (config) => {
  adhashAdapter.initOptions = config.options;
  platformURL = adhashAdapter.initOptions.platformURL;
  bidderAnalyticsDomain = adhashAdapter.initOptions.bidderURL;
  publisherId = adhashAdapter.initOptions.publisherId;

  adhashAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: adhashAdapter,
  code: 'adhash'
});

// Functions needed for unit testing
export function getAuctionTracker () {
  return auctionTracker;
}

export function getTimeouts() {
  return bidTimeouts;
}

export function getSavedFallbackData() {
  return fallbackSaver;
}

export function clearSavedFallbackData() {
  fallbackSaver = {};
}

export default adhashAdapter;
