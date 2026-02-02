import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { ajax } from '../src/ajax.js';
import { detectDeviceType, getOsBrowserInfo } from '../libraries/userAgentUtils/detailed.js';
const analyticsType = 'endpoint';
const url = 'https://analytics.wmgroup.us/analytic/collection';
const {
  AUCTION_INIT,
  AUCTION_END,
  BID_REQUESTED,
  BID_WON,
  BID_TIMEOUT,
  NO_BID,
  BID_RESPONSE
} = EVENTS;

let timestampInit = null;

const noBidArray = [];
const noBidObject = {};

const isBidArray = [];
const isBidObject = {};

const bidTimeOutArray = [];
const bidTimeOutObject = {};

const bidWonArray = [];
const bidWonObject = {};

let initOptions = {};

function postAjax(url, data) {
  ajax(url, function () {}, data, {contentType: 'application/json', method: 'POST'});
}

function handleInitSizes(adUnits) {
  return adUnits.map(function (adUnit) {
    return adUnit.sizes.toString() || ''
  });
}

function handleInitTypes(adUnits) {
  return adUnits.map(function (adUnit) {
    return Object.keys(adUnit.mediaTypes).toString();
  });
}

function detectDevice() {
  const type = detectDeviceType();
  if (type === 5) return "tablet";
  if (type === 4) return "mobile";
  return "desktop";
}

function detectOsAndBrowser() {
  const info = getOsBrowserInfo();
  return {
    os: info.os.name + " " + info.os.version,
    browser: info.browser.name + " " + info.browser.version
  };
}
function handleAuctionInit(eventType, args) {
  initOptions.c_timeout = args.timeout;
  initOptions.ad_unit_size = handleInitSizes(args.adUnits);
  initOptions.ad_unit_type = handleInitTypes(args.adUnits);
  initOptions.device = detectDevice();
  initOptions.os = detectOsAndBrowser().os;
  initOptions.browser = detectOsAndBrowser().browser;
  timestampInit = args.timestamp;
}

function parseBidType(mediaTypes, mediaType) {
  if (!mediaTypes) {
    return [mediaType];
  } else {
    return Object.keys(mediaTypes) || [''];
  }
}

function parseSizes(sizes, width, height) {
  if (sizes !== undefined) {
    return sizes.map(s => {
      return s.toString();
    });
  } else {
    return [`${width},${height}`];
  }
}

function mapObject({
  bidder,
  adUnitCode,
  auctionId,
  transactionId,
  sizes,
  size,
  mediaTypes,
  mediaType,
  cpm,
  currency,
  originalCpm,
  originalCurrency,
  height,
  width
}) {
  return {
    bidder: bidder,
    auction_id: auctionId,
    ad_unit_code: adUnitCode,
    transaction_id: transactionId || '',
    bid_size: size || sizes || (width && height !== undefined) ? parseSizes(sizes, width, height) : [''],
    bid_type: mediaType || mediaTypes ? parseBidType(mediaTypes, mediaType) : [''],
    time_ms: Date.now() - timestampInit,
    cur: originalCurrency !== undefined ? originalCurrency : (currency || ''),
    price: cpm !== undefined ? cpm.toString().substring(0, 4) : '',
    cur_native: originalCurrency || '',
    price_native: originalCpm !== undefined ? originalCpm.toString().substring(0, 4) : ''
  };
}

function mapUpLevelObject(object, eventType, array) {
  Object.assign(object, {
    status: eventType || '',
    bids: array || []
  });
}

function handleEvent(array, object, eventType, args) {
  array.push(mapObject(args));
  mapUpLevelObject(object, eventType, array);
}

function handleNoBid(eventType, args) {
  handleEvent(noBidArray, noBidObject, eventType, args);
}

function handleBidResponse(eventType, args) {
  handleEvent(isBidArray, isBidObject, eventType, args);
}

function handleBidTimeout(eventType, args) {
  args.forEach(bid => {
    bidTimeOutArray.push(mapObject(bid));
  });
  mapUpLevelObject(bidTimeOutObject, eventType, bidTimeOutArray);
}

function handleBidWon(eventType, args) {
  handleEvent(bidWonArray, bidWonObject, eventType, args);
  sendRequest(bidWonObject);
}

function handleBidRequested(args) {}

function sendRequest(...objects) {
  const obj = {
    publisher_id: initOptions.publisher_id.toString() || '',
    site: initOptions.site || '',
    ad_unit_size: initOptions.ad_unit_size || [''],
    ad_unit_type: initOptions.ad_unit_type || [''],
    device: initOptions.device || '',
    os: initOptions.os || '',
    browser: initOptions.browser || '',
    c_timeout: initOptions.c_timeout || 0,
    events: Object.keys(objects).length ? objects : []
  };
  postAjax(url, JSON.stringify(obj));
}

function handleAuctionEnd() {
  sendRequest(noBidObject, isBidObject, bidTimeOutObject);
}

const adWMGAnalyticsAdapter = Object.assign(adapter({
  url,
  analyticsType
}), {
  track({
    eventType,
    args
  }) {
    switch (eventType) {
      case AUCTION_INIT:
        handleAuctionInit(eventType, args);
        break;
      case BID_REQUESTED:
        handleBidRequested(args);
        break;
      case BID_RESPONSE:
        handleBidResponse(eventType, args);
        break;
      case NO_BID:
        handleNoBid(eventType, args);
        break;
      case BID_TIMEOUT:
        handleBidTimeout(eventType, args);
        break;
      case BID_WON:
        handleBidWon(eventType, args);
        break;
      case AUCTION_END:
        handleAuctionEnd();
    }
  }
});

adWMGAnalyticsAdapter.originEnableAnalytics = adWMGAnalyticsAdapter.enableAnalytics;

adWMGAnalyticsAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  adWMGAnalyticsAdapter.originEnableAnalytics(config);
};
adapterManager.registerAnalyticsAdapter({
  adapter: adWMGAnalyticsAdapter,
  code: 'adWMG'
});
export default adWMGAnalyticsAdapter;
