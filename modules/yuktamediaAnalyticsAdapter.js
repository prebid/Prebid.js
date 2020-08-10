import { ajax } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();
const yuktamediaAnalyticsVersion = 'v3.0.0';

let initOptions;
let auctionTimestamp;

const events = {
  auctions: {}
};
const localStoragePrefix = 'yuktamediaAnalytics_';
const utmTags = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

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
    let newSessionId = utils.generateUUID();
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
  const location = utils.getWindowLocation();
  data.initOptions = Object.assign({ host: location.host, path: location.pathname, search: location.search }, initOptions);

  const yuktamediaAnalyticsRequestUrl = utils.buildUrl({
    protocol: 'https',
    hostname: 'analytics-prebid.yuktamedia.com',
    pathname: '/api/bids',
    search: {
      auctionTimestamp: auctionTimestamp,
      yuktamediaAnalyticsVersion: yuktamediaAnalyticsVersion,
      prebidVersion: $$PREBID_GLOBAL$$.version
    }
  });

  if (isNavigatorSendBeaconSupported()) {
    window.navigator.sendBeacon(yuktamediaAnalyticsRequestUrl, JSON.stringify(data));
  } else {
    ajax(yuktamediaAnalyticsRequestUrl, undefined, JSON.stringify(data), { method: 'POST', contentType: 'text/plain' });
  }
}

var yuktamediaAnalyticsAdapter = Object.assign(adapter({analyticsType: 'endpoint'}), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined') {
      switch (eventType) {
        case CONSTANTS.EVENTS.AUCTION_INIT:
          utils.logInfo(localStoragePrefix + 'AUCTION_INIT:', JSON.stringify(args));
          if (typeof args.auctionId !== 'undefined' && args.auctionId.length) {
            events.auctions[args.auctionId] = { bids: {} };
            auctionTimestamp = args.timestamp;
          }
          break;
        case CONSTANTS.EVENTS.BID_REQUESTED:
          utils.logInfo(localStoragePrefix + 'BID_REQUESTED:', JSON.stringify(args));
          if (typeof args.auctionId !== 'undefined' && args.auctionId.length) {
            if (typeof events.auctions[args.auctionId] === 'undefined') {
              events.auctions[args.auctionId] = { bids: {} };
            }
            events.auctions[args.auctionId]['timeStamp'] = args.start;
            args.bids.forEach(function (bidRequest) {
              events.auctions[args.auctionId]['bids'][bidRequest.bidId] = {
                bidder: bidRequest.bidder,
                adUnit: bidRequest.adUnitCode,
                sizes: utils.parseSizesInput(bidRequest.sizes).toString(),
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
        case CONSTANTS.EVENTS.BID_RESPONSE:
          utils.logInfo(localStoragePrefix + 'BID_RESPONSE:', JSON.stringify(args));
          if (typeof args.auctionId !== 'undefined' && args.auctionId.length) {
            if (typeof events.auctions[args.auctionId] === 'undefined') {
              events.auctions[args.auctionId] = { bids: {} };
            } else if (Object.keys(events.auctions[args.auctionId]['bids']).length) {
              let bidResponse = events.auctions[args.auctionId]['bids'][args.requestId];
              bidResponse.isBid = args.getStatusCode() === CONSTANTS.STATUS.GOOD;
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
                if (['body', 'icon', 'image', 'linkurl', 'host', 'path'].every((ele) => !adserverTargetingKey.includes(ele))) {
                  bidResponse['adserverTargeting-' + adserverTargetingKey] = adserverTargetingValue;
                }
              }
              bidResponse.renderStatus = 'bid-response-received';
            }
          }
          break;
        case CONSTANTS.EVENTS.NO_BID:
          utils.logInfo(localStoragePrefix + 'NO_BID:', JSON.stringify(args));
          if (typeof args.auctionId !== 'undefined' && args.auctionId.length) {
            if (typeof events.auctions[args.auctionId] === 'undefined') {
              events.auctions[args.auctionId] = { bids: {} };
            } else if (Object.keys(events.auctions[args.auctionId]['bids']).length) {
              const noBid = events.auctions[args.auctionId]['bids'][args.bidId];
              noBid.renderStatus = 'no-bid';
            }
          }
          break;
        case CONSTANTS.EVENTS.BID_WON:
          utils.logInfo(localStoragePrefix + 'BID_WON:', JSON.stringify(args));
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
        case CONSTANTS.EVENTS.BID_TIMEOUT:
          utils.logInfo(localStoragePrefix + 'BID_TIMEOUT:', JSON.stringify(args));
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
        case CONSTANTS.EVENTS.AUCTION_END:
          utils.logInfo(localStoragePrefix + 'AUCTION_END:', JSON.stringify(args));
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
      utils.logError('Need pubId and pubKey to log auction results. Please contact a YuktaMedia representative if you do not know your pubId and pubKey.');
      return;
    }
  }
  initOptions = Object.assign({}, config.options, this.buildUtmTagData(config.options));
  yuktamediaAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: yuktamediaAnalyticsAdapter,
  code: 'yuktamedia'
});

export default yuktamediaAnalyticsAdapter;
