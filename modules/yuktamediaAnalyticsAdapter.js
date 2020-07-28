import { ajax } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import * as utils from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();

const emptyUrl = '';
const analyticsType = 'endpoint';
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

var yuktamediaAnalyticsAdapter = Object.assign(adapter(
  {
    emptyUrl,
    analyticsType
  }), {
  track({ eventType, args }) {
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        utils.logInfo(localStoragePrefix + 'AUCTION_INIT:', JSON.stringify(args));
        events.auctions[args.auctionId] = { bids: {} };
        auctionTimestamp = args.timestamp;
        break;
      case CONSTANTS.EVENTS.BID_REQUESTED:
        utils.logInfo(localStoragePrefix + 'BID_REQUESTED:', JSON.stringify(args));
        events.auctions[args.auctionId].timeStamp = args.start;

        args.bids.forEach(function (bidRequest) {
          events.auctions[args.auctionId].bids[bidRequest.bidId] = {
            bidder: bidRequest.bidder,
            adUnit: bidRequest.adUnitCode,
            sizes: utils.parseSizesInput(bidRequest.mediaTypes.banner.sizes).toString(),
            isBid: false,
            won: false,
            timeout: false,
            renderStatus: 'bid-requested'
          }
          if (typeof initOptions.enableUserIdCollection !== 'undefined' && initOptions.enableUserIdCollection && typeof bidRequest['userId'] !== 'undefined') {
            for (let [userIdProvider, userId] in Object.entries(bidRequest['userId'])) {
              userIdProvider = typeof userIdProvider !== 'string' ? JSON.stringify(userIdProvider) : userIdProvider;
              userId = typeof userId !== 'string' ? JSON.stringify(userId) : userId;
              events.auctions[args.auctionId].bids[bidRequest.bidId]['userID-'.concat(userIdProvider)] = userId;
            }
          }
        });
        break;
      case CONSTANTS.EVENTS.BID_RESPONSE:
        utils.logInfo(localStoragePrefix + 'BID_RESPONSE:', JSON.stringify(args));

        let bidResponse = events.auctions[args.auctionId].bids[args.requestId];
        bidResponse.isBid = args.getStatusCode() === CONSTANTS.STATUS.GOOD;
        bidResponse.cpm = args.cpm;
        bidResponse.currency = args.currency;
        bidResponse.netRevenue = args.netRevenue;
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
        break;
      case CONSTANTS.EVENTS.NO_BID:
        utils.logInfo(localStoragePrefix + 'NO_BID:', JSON.stringify(args));
        const noBid = events.auctions[args.auctionId].bids[args.bidId];
        noBid.renderStatus = 'no-bid';
        break;
      case CONSTANTS.EVENTS.BID_WON:
        utils.logInfo(localStoragePrefix + 'BID_WON:', JSON.stringify(args));
        if (typeof initOptions.enableSession !== 'undefined' && initOptions.enableSession) {
          updateSessionId();
        }
        const wonBid = events.auctions[args.auctionId].bids[args.requestId];
        wonBid.won = true;
        wonBid.renderStatus = 'bid-won';
        send({'bids': [ wonBid ]}, 'won');
        break;
      case CONSTANTS.EVENTS.BID_TIMEOUT:
        utils.logInfo(localStoragePrefix + 'BID_TIMEOUT:', JSON.stringify(args));
        args.forEach(timeout => {
          const timeoutBid = events.auctions[timeout.auctionId].bids[timeout.bidId];
          timeoutBid.timeout = true;
          timeoutBid.renderStatus = 'bid-timedout';
        });
        break;
      case CONSTANTS.EVENTS.AUCTION_END:
        utils.logInfo(localStoragePrefix + 'AUCTION_END:', JSON.stringify(args));
        if (typeof initOptions.enableSession !== 'undefined' && initOptions.enableSession) {
          updateSessionId();
        }
        const bids = Object.values(events.auctions[args.auctionId].bids);
        send({'bids': bids}, 'auctionEnd');
        break;
    }
  }
});

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

function detectBrowserAndOS() {
  const nAgt = navigator.userAgent;
  let browserName = navigator.appName;
  let fullVersion = '' + parseFloat(navigator.appVersion);
  let nameOffset, verOffset, ix;
  let OSName = 'Unknown OS';
  if (navigator.appVersion.indexOf('Win') != -1) { OSName = 'Windows'; }
  if (navigator.appVersion.indexOf('Mac') != -1) { OSName = 'MacOS'; }
  if (navigator.appVersion.indexOf('X11') != -1) { OSName = 'UNIX'; }
  if (navigator.appVersion.indexOf('Linux') != -1) { OSName = 'Linux'; }

  if ((verOffset = nAgt.indexOf('Opera')) != -1) {
    browserName = 'Opera';
    fullVersion = nAgt.substring(verOffset + 6);
    if ((verOffset = nAgt.indexOf('Version')) != -1) {
      fullVersion = nAgt.substring(verOffset + 8);
    }
  } else if ((verOffset = nAgt.indexOf('MSIE')) != -1) {
    browserName = 'Microsoft Internet Explorer';
    fullVersion = nAgt.substring(verOffset + 5);
  } else if ((verOffset = nAgt.indexOf('Chrome')) != -1) {
    browserName = 'Chrome';
    fullVersion = nAgt.substring(verOffset + 7);
  } else if ((verOffset = nAgt.indexOf('Safari')) != -1) {
    browserName = 'Safari';
    fullVersion = nAgt.substring(verOffset + 7);
    if ((verOffset = nAgt.indexOf('Version')) != -1) {
      fullVersion = nAgt.substring(verOffset + 8);
    }
  } else if ((verOffset = nAgt.indexOf('Firefox')) != -1) {
    browserName = 'Firefox';
    fullVersion = nAgt.substring(verOffset + 8);
  } else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) <
    (verOffset = nAgt.lastIndexOf('/'))) {
    browserName = nAgt.substring(nameOffset, verOffset);
    fullVersion = nAgt.substring(verOffset + 1);
    if (browserName.toLowerCase() == browserName.toUpperCase()) {
      browserName = navigator.appName;
    }
  }
  // trim the fullVersion string at semicolon/space if present
  if ((ix = fullVersion.indexOf(';')) != -1) {
    fullVersion = fullVersion.substring(0, ix);
  }
  if ((ix = fullVersion.indexOf(' ')) != -1) {
    fullVersion = fullVersion.substring(0, ix);
  }

  const majorVersion = parseInt('' + fullVersion, 10);
  if (isNaN(majorVersion)) {
    fullVersion = '' + parseFloat(navigator.appVersion);
  }
  return {
    browserName,
    fullVersion,
    OSName
  }
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
  data.initOptions = Object.assign({ host: location.host, path: location.pathname, search: location.search }, initOptions, detectBrowserAndOS());

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
  initOptions = Object.assign({}, config.options, this.buildUtmTagData(config.options));
  yuktamediaAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: yuktamediaAnalyticsAdapter,
  code: 'yuktamedia'
});

export default yuktamediaAnalyticsAdapter;
