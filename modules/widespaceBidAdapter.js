import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {parseQueryStringParameters, parseSizesInput} from '../src/utils.js';
import {find, includes} from '../src/polyfill.js';
import {getStorageManager} from '../src/storageManager.js';

const BIDDER_CODE = 'widespace';
const WS_ADAPTER_VERSION = '2.0.1';
const LS_KEYS = {
  PERF_DATA: 'wsPerfData',
  LC_UID: 'wsLcuid',
  CUST_DATA: 'wsCustomData'
};
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

let preReqTime = 0;

export const spec = {
  code: BIDDER_CODE,

  supportedMediaTypes: ['banner'],

  isBidRequestValid: function (bid) {
    if (bid.params && bid.params.sid) {
      return true;
    }
    return false;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    let serverRequests = [];
    const REQUEST_SERVER_URL = getEngineUrl();
    const DEMO_DATA_PARAMS = ['gender', 'country', 'region', 'postal', 'city', 'yob'];
    const PERF_DATA = getData(LS_KEYS.PERF_DATA).map(perfData => JSON.parse(perfData));
    const CUST_DATA = getData(LS_KEYS.CUST_DATA, false)[0];
    const LC_UID = getLcuid();

    let isInHostileIframe = false;
    try {
      window.top.location.toString();
      isInHostileIframe = false;
    } catch (e) {
      isInHostileIframe = true;
    }

    validBidRequests.forEach((bid, i) => {
      let data = {
        'screenWidthPx': screen && screen.width,
        'screenHeightPx': screen && screen.height,
        'adSpaceHttpRefUrl': getTopWindowReferrer(),
        'referer': (isInHostileIframe ? window : window.top).location.href.split('#')[0],
        'inFrame': 1,
        'sid': bid.params.sid,
        'lcuid': LC_UID,
        'vol': isInHostileIframe ? '' : visibleOnLoad(document.getElementById(bid.adUnitCode)),
        'gdprCmp': bidderRequest && bidderRequest.gdprConsent ? 1 : 0,
        'hb': '1',
        'hb.cd': CUST_DATA ? encodedParamValue(CUST_DATA) : '',
        'hb.floor': '',
        'hb.spb': i === 0 ? pixelSyncPossibility() : -1,
        'hb.ver': WS_ADAPTER_VERSION,
        'hb.name': 'prebidjs-$prebid.version$',
        'hb.bidId': bid.bidId,
        'hb.sizes': parseSizesInput(bid.sizes).join(','),
        'hb.currency': bid.params.cur || bid.params.currency || ''
      };

      // Include demo data
      if (bid.params.demo) {
        DEMO_DATA_PARAMS.forEach((key) => {
          if (bid.params.demo[key]) {
            data[key] = bid.params.demo[key];
          }
        });
      }

      // Include performance data
      if (PERF_DATA[i]) {
        Object.keys(PERF_DATA[i]).forEach((perfDataKey) => {
          data[perfDataKey] = PERF_DATA[i][perfDataKey];
        });
      }

      // Include connection info if available
      const CONNECTION = navigator.connection || navigator.webkitConnection;
      if (CONNECTION && CONNECTION.type && CONNECTION.downlinkMax) {
        data['netinfo.type'] = CONNECTION.type;
        data['netinfo.downlinkMax'] = CONNECTION.downlinkMax;
      }

      // Include debug data when available
      if (!isInHostileIframe) {
        data.forceAdId = (find(window.top.location.hash.split('&'),
          val => includes(val, 'WS_DEBUG_FORCEADID')
        ) || '').split('=')[1];
      }

      // GDPR Consent info
      if (data.gdprCmp) {
        const {gdprApplies, consentString, vendorData} = bidderRequest.gdprConsent;
        const hasGlobalScope = vendorData && vendorData.hasGlobalScope;
        data.gdprApplies = gdprApplies ? 1 : gdprApplies === undefined ? '' : 0;
        data.gdprConsentData = consentString;
        data.gdprHasGlobalScope = hasGlobalScope ? 1 : hasGlobalScope === undefined ? '' : 0;
      }

      // Remove empty params
      Object.keys(data).forEach((key) => {
        if (data[key] === '' || data[key] === undefined) {
          delete data[key];
        }
      });

      serverRequests.push({
        method: 'POST',
        options: {
          contentType: 'application/x-www-form-urlencoded'
        },
        url: REQUEST_SERVER_URL,
        data: parseQueryStringParameters(data)
      });
    });
    preReqTime = Date.now();
    return serverRequests;
  },

  interpretResponse: function (serverResponse, request) {
    const responseTime = Date.now() - preReqTime;
    const successBids = serverResponse.body || [];
    let bidResponses = [];
    successBids.forEach((bid) => {
      storeData({
        'perf_status': 'OK',
        'perf_reqid': bid.reqId,
        'perf_ms': responseTime
      }, `${LS_KEYS.PERF_DATA}${bid.reqId}`);
      if (bid.status === 'ad') {
        bidResponses.push({
          requestId: bid.bidId,
          cpm: bid.cpm,
          width: bid.width,
          height: bid.height,
          creativeId: bid.adId,
          currency: bid.currency,
          netRevenue: Boolean(bid.netRev),
          ttl: bid.ttl,
          referrer: getTopWindowReferrer(),
          ad: bid.code,
          meta: {
            advertiserDomains: bid.adomain || []
          }
        });
      }
    });

    return bidResponses
  },

  getUserSyncs: function (syncOptions, serverResponses = []) {
    let userSyncs = [];
    userSyncs = serverResponses.reduce((allSyncPixels, response) => {
      if (response && response.body && response.body[0]) {
        (response.body[0].syncPixels || []).forEach((url) => {
          allSyncPixels.push({type: 'image', url});
        });
      }
      return allSyncPixels;
    }, []);
    return userSyncs;
  }
};

function storeData(data, name, stringify = true) {
  const value = stringify ? JSON.stringify(data) : data;
  if (storage.hasLocalStorage()) {
    storage.setDataInLocalStorage(name, value);
    return true;
  } else if (storage.cookiesAreEnabled()) {
    const theDate = new Date();
    const expDate = new Date(theDate.setMonth(theDate.getMonth() + 12)).toGMTString();
    storage.setCookie(name, value, expDate);
    return true;
  }
}

function getData(name, remove = true) {
  let data = [];
  if (storage.hasLocalStorage()) {
    Object.keys(localStorage).filter((key) => {
      if (key.indexOf(name) > -1) {
        data.push(storage.getDataFromLocalStorage(key));
        if (remove) {
          storage.removeDataFromLocalStorage(key);
        }
      }
    });
  }

  if (storage.cookiesAreEnabled()) {
    document.cookie.split(';').forEach((item) => {
      let value = item.split('=');
      if (value[0].indexOf(name) > -1) {
        data.push(value[1]);
        if (remove) {
          storage.setCookie(value[0], '', 'Thu, 01 Jan 1970 00:00:01 GMT');
        }
      }
    });
  }
  return data;
}

function pixelSyncPossibility() {
  const userSync = config.getConfig('userSync');
  return userSync && userSync.pixelEnabled && userSync.syncEnabled ? userSync.syncsPerBidder : -1;
}

function visibleOnLoad(element) {
  if (element && element.getBoundingClientRect) {
    const topPos = element.getBoundingClientRect().top;
    return topPos < screen.height && topPos >= window.top.pageYOffset ? 1 : 0;
  }
  return '';
}

function getLcuid() {
  let lcuid = getData(LS_KEYS.LC_UID, false)[0];
  if (!lcuid) {
    const random = ('4' + new Date().getTime() + String(Math.floor(Math.random() * 1000000000))).substring(0, 18);
    storeData(random, LS_KEYS.LC_UID, false);
    lcuid = getData(LS_KEYS.LC_UID, false)[0];
  }
  return lcuid;
}

function encodedParamValue(value) {
  const requiredStringify = typeof JSON.parse(JSON.stringify(value)) === 'object';
  return encodeURIComponent(requiredStringify ? JSON.stringify(value) : value);
}

function getEngineUrl() {
  const ENGINE_URL = 'https://engine.widespace.com/map/engine/dynadreq';
  return window.wisp && window.wisp.ENGINE_URL ? window.wisp.ENGINE_URL : ENGINE_URL;
}

function getTopWindowReferrer() {
  try {
    return window.top.document.referrer;
  } catch (e) {
    return '';
  }
}

registerBidder(spec);
