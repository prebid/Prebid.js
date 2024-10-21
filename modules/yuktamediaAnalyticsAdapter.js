import {buildUrl, generateUUID, getWindowLocation, logError, logInfo, parseSizesInput, parseUrl} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS, STATUS } from '../src/constants.js';
import {getStorageManager} from '../src/storageManager.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {includes as strIncludes} from '../src/polyfill.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {MODULE_TYPE_ANALYTICS} from '../src/activities/modules.js';

const MODULE_CODE = 'yuktamedia';
const storage = getStorageManager({moduleType: MODULE_TYPE_ANALYTICS, moduleName: MODULE_CODE});
const yuktamediaAnalyticsVersion = 'v3.1.0';

let initOptions;

const events = {
  auctions: {}
};
const localStoragePrefix = 'yuktamediaAnalytics_';
const utmTags = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const location = getWindowLocation();
// TODO: is 'page' the right value here?
const referer = getRefererInfo().page;
const _pageInfo = {
  userAgent: window.navigator.userAgent,
  timezoneOffset: new Date().getTimezoneOffset(),
  language: window.navigator.language,
  screenWidth: window.screen.width,
  screenHeight: window.screen.height,
  pageViewId: generateUUID(),
  host: location.host,
  path: location.pathname,
  search: location.search,
  hash: location.hash,
  referer: referer,
  refererDomain: parseUrl(referer).host,
  yuktamediaAnalyticsVersion: yuktamediaAnalyticsVersion,
  prebidVersion: getGlobal().version
};

function getParameterByName(param) {
  let vars = {};
  window.location.href.replace(location.hash, '').replace(
    /[?&]+([^=&]+)=?([^&]*)?/gi,
    function (m, key, value) {
      vars[key] = value !== undefined ? value : '';
    }
  );
  return vars[param] ? vars[param] : '';
}

function isNavigatorSendBeaconSupported() {
  return ('navigator' in window) && ('sendBeacon' in window.navigator);
}

function updateSessionId() {
  if (isSessionIdTimeoutExpired()) {
    let newSessionId = generateUUID();
    storage.setDataInLocalStorage(localStoragePrefix.concat('session_id'), newSessionId);
  }
  initOptions.sessionId = getSessionId();
  updateSessionIdTimeout();
}

function updateSessionIdTimeout() {
  storage.setDataInLocalStorage(localStoragePrefix.concat('session_timeout'), Date.now());
}

function isSessionIdTimeoutExpired() {
  let cpmSessionTimestamp = storage.getDataFromLocalStorage(localStoragePrefix.concat('session_timeout'));
  return Date.now() - cpmSessionTimestamp > 3600000;
}

function getSessionId() {
  return storage.getDataFromLocalStorage(localStoragePrefix.concat('session_id')) ? storage.getDataFromLocalStorage(localStoragePrefix.concat('session_id')) : '';
}

function isUtmTimeoutExpired() {
  let utmTimestamp = storage.getDataFromLocalStorage(localStoragePrefix.concat('utm_timeout'));
  return (Date.now() - utmTimestamp) > 3600000;
}

function send(data, status) {
  data.initOptions = Object.assign(_pageInfo, initOptions);
  const yuktamediaAnalyticsRequestUrl = buildUrl({
    protocol: 'https',
    hostname: 'analytics-prebid.yuktamedia.com',
    pathname: '/api/bids'
  });
  if (isNavigatorSendBeaconSupported()) {
    window.navigator.sendBeacon(yuktamediaAnalyticsRequestUrl, JSON.stringify(data));
  } else {
    ajax(yuktamediaAnalyticsRequestUrl, undefined, JSON.stringify(data), { method: 'POST', contentType: 'text/plain' });
  }
}

var yuktamediaAnalyticsAdapter = Object.assign(adapter({ analyticsType: 'endpoint' }), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined') {
      switch (eventType) {
        case EVENTS.AUCTION_INIT:
          logInfo(localStoragePrefix + 'AUCTION_INIT:', JSON.stringify(args));
          if (typeof args.auctionId !== 'undefined' && args.auctionId.length) {
            events.auctions[args.auctionId] = { bids: {} };
          }
          break;
        case EVENTS.BID_REQUESTED:
          logInfo(localStoragePrefix + 'BID_REQUESTED:', JSON.stringify(args));
          if (typeof args.auctionId !== 'undefined' && args.auctionId.length) {
            if (typeof events.auctions[args.auctionId] === 'undefined') {
              events.auctions[args.auctionId] = { bids: {} };
            }
            events.auctions[args.auctionId]['timeStamp'] = args.start;
            args.bids.forEach(function (bidRequest) {
              events.auctions[args.auctionId]['bids'][bidRequest.bidId] = {
                bidder: bidRequest.bidder,
                adUnit: bidRequest.adUnitCode,
                sizes: parseSizesInput(bidRequest.sizes).toString(),
                isBid: false,
                won: false,
                timeout: false,
                renderStatus: 'bid-requested',
                bidId: bidRequest.bidId,
                auctionId: args.auctionId
              }
              if (typeof initOptions.enableUserIdCollection !== 'undefined' && initOptions.enableUserIdCollection && typeof bidRequest['userId'] !== 'undefined') {
                for (let [userIdProvider, userId] in Object.entries(bidRequest['userId'])) {
                  userIdProvider = typeof userIdProvider !== 'string' ? JSON.stringify(userIdProvider) : userIdProvider;
                  userId = typeof userId !== 'string' ? JSON.stringify(userId) : userId;
                  events.auctions[args.auctionId]['bids'][bidRequest.bidId]['userID-'.concat(userIdProvider)] = userId;
                }
              }
            });
          }
          break;
        case EVENTS.BID_RESPONSE:
          logInfo(localStoragePrefix + 'BID_RESPONSE:', JSON.stringify(args));
          if (typeof args.auctionId !== 'undefined' && args.auctionId.length) {
            if (typeof events.auctions[args.auctionId] === 'undefined') {
              events.auctions[args.auctionId] = { bids: {} };
            } else if (Object.keys(events.auctions[args.auctionId]['bids']).length) {
              let bidResponse = events.auctions[args.auctionId]['bids'][args.requestId];
              bidResponse.isBid = args.getStatusCode() === STATUS.GOOD;
              bidResponse.cpm = args.cpm;
              bidResponse.currency = args.currency;
              bidResponse.netRevenue = args.netRevenue;
              bidResponse.dealId = typeof args.dealId !== 'undefined' ? args.dealId : '';
              bidResponse.mediaType = args.mediaType;
              if (bidResponse.mediaType === 'native') {
                bidResponse.nativeTitle = typeof args['native']['title'] !== 'undefined' ? args['native']['title'] : '';
                bidResponse.nativeSponsoredBy = typeof args['native']['sponsoredBy'] !== 'undefined' ? args['native']['sponsoredBy'] : '';
              }
              bidResponse.timeToRespond = args.timeToRespond;
              bidResponse.requestTimestamp = args.requestTimestamp;
              bidResponse.responseTimestamp = args.responseTimestamp;
              bidResponse.bidForSize = args.size;
              for (const [adserverTargetingKey, adserverTargetingValue] of Object.entries(args.adserverTargeting)) {
                if (['body', 'icon', 'image', 'linkurl', 'host', 'path'].every((ele) => !strIncludes(adserverTargetingKey, ele))) {
                  bidResponse['adserverTargeting-' + adserverTargetingKey] = adserverTargetingValue;
                }
              }
              bidResponse.renderStatus = 'bid-response-received';
            }
          }
          break;
        case EVENTS.NO_BID:
          logInfo(localStoragePrefix + 'NO_BID:', JSON.stringify(args));
          if (typeof args.auctionId !== 'undefined' && args.auctionId.length) {
            if (typeof events.auctions[args.auctionId] === 'undefined') {
              events.auctions[args.auctionId] = { bids: {} };
            } else if (Object.keys(events.auctions[args.auctionId]['bids']).length) {
              const noBid = events.auctions[args.auctionId]['bids'][args.bidId];
              noBid.renderStatus = 'no-bid';
            }
          }
          break;
        case EVENTS.BID_WON:
          logInfo(localStoragePrefix + 'BID_WON:', JSON.stringify(args));
          if (typeof initOptions.enableSession !== 'undefined' && initOptions.enableSession) {
            updateSessionId();
          }
          if (typeof args.auctionId !== 'undefined' && args.auctionId.length) {
            if (typeof events.auctions[args.auctionId] === 'undefined') {
              events.auctions[args.auctionId] = { bids: {} };
            } else if (Object.keys(events.auctions[args.auctionId]['bids']).length) {
              const wonBid = events.auctions[args.auctionId]['bids'][args.requestId];
              wonBid.won = true;
              wonBid.renderStatus = 'bid-won';
              send({ 'bids': [wonBid] }, 'won');
            }
          }
          break;
        case EVENTS.BID_TIMEOUT:
          logInfo(localStoragePrefix + 'BID_TIMEOUT:', JSON.stringify(args));
          if (args.length) {
            args.forEach(timeout => {
              if (typeof timeout !== 'undefined' && typeof timeout.auctionId !== 'undefined' && timeout.auctionId.length) {
                if (typeof events.auctions[args.auctionId] === 'undefined') {
                  events.auctions[args.auctionId] = { bids: {} };
                } else if (Object.keys(events.auctions[args.auctionId]['bids']).length) {
                  const timeoutBid = events.auctions[timeout.auctionId].bids[timeout.bidId];
                  timeoutBid.timeout = true;
                  timeoutBid.renderStatus = 'bid-timedout';
                }
              }
            });
          }
          break;
        case EVENTS.AUCTION_END:
          logInfo(localStoragePrefix + 'AUCTION_END:', JSON.stringify(args));
          if (typeof initOptions.enableSession !== 'undefined' && initOptions.enableSession) {
            updateSessionId();
          }
          if (typeof args.auctionId !== 'undefined' && args.auctionId.length) {
            const bids = Object.values(events.auctions[args.auctionId]['bids']);
            send({ 'bids': bids }, 'auctionEnd');
          }
          break;
      }
    }
  }
});

yuktamediaAnalyticsAdapter.buildUtmTagData = function (options) {
  let utmTagData = {};
  let utmTagsDetected = false;
  if (typeof options.enableUTMCollection !== 'undefined' && options.enableUTMCollection) {
    utmTags.forEach(function (utmTagKey) {
      let utmTagValue = getParameterByName(utmTagKey);
      if (utmTagValue !== '') {
        utmTagsDetected = true;
      }
      utmTagData[utmTagKey] = utmTagValue;
    });
    utmTags.forEach(function (utmTagKey) {
      if (utmTagsDetected) {
        storage.setDataInLocalStorage(localStoragePrefix.concat(utmTagKey), utmTagData[utmTagKey]);
        storage.setDataInLocalStorage(localStoragePrefix.concat('utm_timeout'), Date.now());
      } else {
        if (!isUtmTimeoutExpired()) {
          utmTagData[utmTagKey] = storage.getDataFromLocalStorage(localStoragePrefix.concat(utmTagKey)) ? storage.getDataFromLocalStorage(localStoragePrefix.concat(utmTagKey)) : '';
          storage.setDataInLocalStorage(localStoragePrefix.concat('utm_timeout'), Date.now());
        }
      }
    });
  }
  return utmTagData;
};

yuktamediaAnalyticsAdapter.originEnableAnalytics = yuktamediaAnalyticsAdapter.enableAnalytics;
yuktamediaAnalyticsAdapter.enableAnalytics = function (config) {
  if (config && config.options) {
    if (typeof config.options.pubId === 'undefined' || typeof config.options.pubKey === 'undefined') {
      logError('Need pubId and pubKey to log auction results. Please contact a YuktaMedia representative if you do not know your pubId and pubKey.');
      return;
    }
  }
  initOptions = Object.assign({}, config.options, this.buildUtmTagData(config.options));
  yuktamediaAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: yuktamediaAnalyticsAdapter,
  code: MODULE_CODE,
});

export default yuktamediaAnalyticsAdapter;
