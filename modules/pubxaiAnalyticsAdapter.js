import { deepAccess, getGptSlotInfoForAdUnitCode, parseSizesInput, getWindowLocation, buildUrl } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import adapter from '../src/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';

const emptyUrl = '';
const analyticsType = 'endpoint';
const pubxaiAnalyticsVersion = 'v1.1.0';
const defaultHost = 'api.pbxai.com';
const auctionPath = '/analytics/auction';
const winningBidPath = '/analytics/bidwon';

let initOptions;
let auctionTimestamp;
let auctionCache = [];
let events = {
  bids: [],
  floorDetail: {},
  pageDetail: {},
  deviceDetail: {}
};

function getStorage() {
  try {
    return window.top['sessionStorage'];
  } catch (e) {
    return null;
  }
}

var pubxaiAnalyticsAdapter = Object.assign(adapter(
  {
    emptyUrl,
    analyticsType
  }), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined') {
      if (eventType === CONSTANTS.EVENTS.BID_TIMEOUT) {
        args.forEach(item => { mapBidResponse(item, 'timeout'); });
      } else if (eventType === CONSTANTS.EVENTS.AUCTION_INIT) {
        events.auctionInit = args;
        events.floorDetail = {};
        events.bids = [];
        const floorData = deepAccess(args, 'bidderRequests.0.bids.0.floorData');
        if (typeof floorData !== 'undefined') {
          Object.assign(events.floorDetail, floorData);
        }
        auctionTimestamp = args.timestamp;
      } else if (eventType === CONSTANTS.EVENTS.BID_RESPONSE) {
        mapBidResponse(args, 'response');
      } else if (eventType === CONSTANTS.EVENTS.BID_WON) {
        send({
          winningBid: mapBidResponse(args, 'bidwon')
        }, 'bidwon');
      }
    }
    if (eventType === CONSTANTS.EVENTS.AUCTION_END) {
      send(events, 'auctionEnd');
    }
  }
});

function mapBidResponse(bidResponse, status) {
  if (typeof bidResponse !== 'undefined') {
    let bid = {
      adUnitCode: bidResponse.adUnitCode,
      gptSlotCode: getGptSlotInfoForAdUnitCode(bidResponse.adUnitCode).gptSlot || null,
      auctionId: bidResponse.auctionId,
      bidderCode: bidResponse.bidder,
      cpm: bidResponse.cpm,
      creativeId: bidResponse.creativeId,
      currency: bidResponse.currency,
      floorData: bidResponse.floorData,
      mediaType: bidResponse.mediaType,
      netRevenue: bidResponse.netRevenue,
      requestTimestamp: bidResponse.requestTimestamp,
      responseTimestamp: bidResponse.responseTimestamp,
      status: bidResponse.status,
      statusMessage: bidResponse.statusMessage,
      timeToRespond: bidResponse.timeToRespond,
      transactionId: bidResponse.transactionId
    };
    if (status !== 'bidwon') {
      Object.assign(bid, {
        bidId: status === 'timeout' ? bidResponse.bidId : bidResponse.requestId,
        renderStatus: status === 'timeout' ? 3 : 2,
        sizes: parseSizesInput(bidResponse.size).toString(),
      });
      events.bids.push(bid);
    } else {
      Object.assign(bid, {
        bidId: bidResponse.requestId,
        floorProvider: events.floorDetail?.floorProvider || null,
        floorFetchStatus: events.floorDetail?.fetchStatus || null,
        floorLocation: events.floorDetail?.location || null,
        floorModelVersion: events.floorDetail?.modelVersion || null,
        floorSkipRate: events.floorDetail?.skipRate || 0,
        isFloorSkipped: events.floorDetail?.skipped || false,
        isWinningBid: true,
        placementId: bidResponse.params ? deepAccess(bidResponse, 'params.0.placementId') : null,
        renderedSize: bidResponse.size,
        renderStatus: 4
      });
      return bid;
    }
  }
}

export function getDeviceType() {
  if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
    return 'tablet';
  }
  if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
    return 'mobile';
  }
  return 'desktop';
}

export function getBrowser() {
  if (/Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)) return 'Chrome';
  else if (navigator.userAgent.match('CriOS')) return 'Chrome';
  else if (/Firefox/.test(navigator.userAgent)) return 'Firefox';
  else if (/Edg/.test(navigator.userAgent)) return 'Microsoft Edge';
  else if (/Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)) return 'Safari';
  else if (/Trident/.test(navigator.userAgent) || /MSIE/.test(navigator.userAgent)) return 'Internet Explorer';
  else return 'Others';
}

export function getOS() {
  if (navigator.userAgent.indexOf('Android') != -1) return 'Android';
  if (navigator.userAgent.indexOf('like Mac') != -1) return 'iOS';
  if (navigator.userAgent.indexOf('Win') != -1) return 'Windows';
  if (navigator.userAgent.indexOf('Mac') != -1) return 'Macintosh';
  if (navigator.userAgent.indexOf('Linux') != -1) return 'Linux';
  if (navigator.appVersion.indexOf('X11') != -1) return 'Unix';
  return 'Others';
}

// add sampling rate
pubxaiAnalyticsAdapter.shouldFireEventRequest = function (samplingRate = 1) {
  return (Math.floor((Math.random() * samplingRate + 1)) === parseInt(samplingRate));
}

function send(data, status) {
  if (pubxaiAnalyticsAdapter.shouldFireEventRequest(initOptions.samplingRate)) {
    let location = getWindowLocation();
    const storage = getStorage();
    data.initOptions = initOptions;
    data.pageDetail = {};
    Object.assign(data.pageDetail, {
      host: location.host,
      path: location.pathname,
      search: location.search
    });
    if (typeof data !== 'undefined' && typeof data.auctionInit !== 'undefined') {
      data.pageDetail.adUnitCount = data.auctionInit.adUnitCodes ? data.auctionInit.adUnitCodes.length : null;
      data.initOptions.auctionId = data.auctionInit.auctionId;
      delete data.auctionInit;

      data.pmcDetail = {}
      Object.assign(data.pmcDetail, {
        bidDensity: storage ? storage.getItem('pbx:dpbid') : null,
        maxBid: storage ? storage.getItem('pbx:mxbid') : null,
        auctionId: storage ? storage.getItem('pbx:aucid') : null,
      });
    }
    data.deviceDetail = {};
    Object.assign(data.deviceDetail, {
      platform: navigator.platform,
      deviceType: getDeviceType(),
      deviceOS: getOS(),
      browser: getBrowser()
    });

    let pubxaiAnalyticsRequestUrl = buildUrl({
      protocol: 'https',
      hostname: (initOptions && initOptions.hostName) || defaultHost,
      pathname: status == 'bidwon' ? winningBidPath : auctionPath,
      search: {
        auctionTimestamp: auctionTimestamp,
        pubxaiAnalyticsVersion: pubxaiAnalyticsVersion,
        prebidVersion: $$PREBID_GLOBAL$$.version
      }
    });
    if (status == 'bidwon') {
      ajax(pubxaiAnalyticsRequestUrl, undefined, JSON.stringify(data), { method: 'POST', contentType: 'text/json' });
    } else if (status == 'auctionEnd' && auctionCache.indexOf(data.initOptions.auctionId) === -1) {
      ajax(pubxaiAnalyticsRequestUrl, undefined, JSON.stringify(data), { method: 'POST', contentType: 'text/json' });
      auctionCache.push(data.initOptions.auctionId);
    }
  }
}

pubxaiAnalyticsAdapter.originEnableAnalytics = pubxaiAnalyticsAdapter.enableAnalytics;
pubxaiAnalyticsAdapter.enableAnalytics = function (config) {
  initOptions = config.options;
  pubxaiAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: pubxaiAnalyticsAdapter,
  code: 'pubxai'
});

export default pubxaiAnalyticsAdapter;
