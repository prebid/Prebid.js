import { version } from '../package.json';
import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';
import {
  cookiesAreEnabled,
  parseQueryStringParameters,
  parseSizesInput,
  getTopWindowReferrer,
  getTopWindowUrl
} from 'src/utils';

const BIDDER_CODE = 'widespace';
const WS_ADAPTER_VERSION = '2.0.0';
const LOCAL_STORAGE_AVAILABLE = window.localStorage || 0;
const COOKIE_ENABLED = cookiesAreEnabled();
const PBJS = window['$$PREBID_GLOBAL$$'];
const LS_KEYS = {
  PERF_DATA: 'wsPerfData',
  BID_INFO: 'wsBidInfo',
  LC_UID: 'wsLcuid',
  CUST_DATA: 'wsCustomData'
};

let preReqTime = 0;
let adUnitInfo = {};

export const spec = {
  code: BIDDER_CODE,

  supportedMediaTypes: ['banner'],

  isBidRequestValid: function(bid) {
    return bid.params && String(bid.params.sid).length > 9;
  },

  buildRequests: function(validBidRequests) {
    let serverRequests = [];
    const ENDPOINT_URL = `${location.protocol}//nova-dev-engine.widespace.com/map/engine/dynadreq`;
    const DEMO_DATA_PARAMS = ['gender', 'country', 'region', 'postal', 'city', 'yob'];
    const PERF_DATA = getData(LS_KEYS.PERF_DATA).map(perf_data => JSON.parse(perf_data));
    const BID_INFO = getData(LS_KEYS.BID_INFO);
    const CUST_DATA = getData(LS_KEYS.CUST_DATA, false)[0];
    const LC_UID = getLcuid();

    let isInHostileIframe = false;
    try {
      isInHostileIframe = window.top.innerWidth < 0;
    } catch (e) {
      isInHostileIframe = true;
    }

    validBidRequests.forEach((bid, i) => {
      adUnitInfo[bid.bidId] = {
        'adUnitCode': bid.adUnitCode,
      };
      let data = {
        'forceAdId': '47696',
        'screenWidthPx': screen && screen.width,
        'screenHeightPx': screen && screen.height,
        'adSpaceHttpRefUrl': getTopWindowReferrer(),
        'referer': getTopWindowUrl(),
        'inFrame': 1,
        'sid': bid.params.sid,
        'lcuid': LC_UID || -1,
        'vol': isInHostileIframe ? '' : visibleOnLoad(document.getElementById(bid.adUnitCode)),
        'hb': '1',
        'hb.wbi': BID_INFO[i] ? encodedParamValue(BID_INFO[i]) : '',
        'hb.cd': CUST_DATA ? encodedParamValue(CUST_DATA) : '',
        'hb.floor': bid.bidfloor || '',
        'hb.spb': i === 0 ? pixelSyncPossibility() : -1,
        'hb.ver': WS_ADAPTER_VERSION,
        'hb.name': `prebidjs-${version}`,
        'hb.bidId': bid.bidId,
        'hb.sizes': parseSizesInput(bid.sizes).join(','),
        'hb.currency': bid.params.cur || bid.params.currency || ''
      };

      // Include demo data
      if (bid.params.demo) {
        DEMO_DATA_PARAMS.forEach((key) => {
          if (bid.params.demo[key]) {
            data[`hb.demo.${key}`] = bid.params.demo[key];
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
        url: ENDPOINT_URL,
        data: parseQueryStringParameters(data)
      });
    });
    preReqTime = Date.now();
    return serverRequests;
  },

  interpretResponse: function(serverResponse, request) {
    const responseTime = Date.now() - preReqTime;
    const successBids = serverResponse.body || [];
    let bidResponses = [];
    successBids.forEach((bid) => {
      const bidId = bid.bidId || bid.callbackUid;
      adUnitInfo[bidId]['reqId'] = bid.reqId;
      storeData({
        'perf_status': 'OK',
        'perf_reqid': bid.reqId,
        'perf_ms': responseTime
      }, `${LS_KEYS.PERF_DATA}${bid.reqId}`);
      if (bid.status === 'ad') {
        bidResponses.push({
          requestId: bidId,
          cpm: bid.cpm,
          width: bid.width,
          height: bid.height,
          creativeId: bid.adId,
          currency: bid.currency,
          netRevenue: Boolean(bid.netRev),
          ttl: bid.ttl,
          referrer: getTopWindowReferrer(),
          ad: bid.code
        });
      }
    });

    return bidResponses
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    let userSyncs = [];
    if (serverResponses) {
      userSyncs = serverResponses.reduce((allSyncPixels, response) => {
        (response.body[0].syncPixels || []).forEach((url) => {
          allSyncPixels.push({type: 'image', url});
        });
        return allSyncPixels;
      }, []);
    }
    return userSyncs;
  }
};

function storeData(data, name, stringify = true) {
  const value = stringify ? JSON.stringify(data) : data;
  if (LOCAL_STORAGE_AVAILABLE) {
    localStorage.setItem(name, value);
    return true;
  } else if (COOKIE_ENABLED) {
    const theDate = new Date();
    const expDate = new Date(theDate.setMonth(theDate.getMonth() + 12)).toGMTString();
    window.document.cookie = `${name}=${value};path=/;expires=${expDate}`;
    return true;
  }
}

function getData(name, remove = true) {
  let data = [];
  if (LOCAL_STORAGE_AVAILABLE) {
    Object.keys(localStorage).filter((key) => {
      if (key.includes(name)) {
        data.push(localStorage.getItem(key));
        if (remove) {
          localStorage.removeItem(key);
        }
      }
    });
  } else if (COOKIE_ENABLED) {
    document.cookie.split(';').forEach((item) => {
      let value = item.split('=');
      if (value[0].includes(name)) {
        data.push(value[1]);
        if (remove) {
          document.cookie = `${value[0]}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        }
      }
    });
  }
  return data;
}

function pixelSyncPossibility() {
  const userSync = config.getConfig('userSync');
  return userSync.pixelEnabled && userSync.syncEnabled ? userSync.syncsPerBidder : -1;
}

function visibleOnLoad(element) {
  if (element && element.getBoundingClientRect) {
    const topPos = element.getBoundingClientRect().top;
    return topPos < screen.height && topPos >= window.top.pageYOffset ? 1 : 0;
  };
  return '';
}

function getLcuid() {
  let lcuid = getData(LS_KEYS.LC_UID, false)[0];
  if (!lcuid) {
    const random = ('4' + new Date().getTime() + String(Math.floor(Math.random() * 1000000000))).substring(0, 18);
    storeData(random, LS_KEYS.LC_UID, false, false);
    lcuid = getData(LS_KEYS.LC_UID, false)[0];
  }
  return lcuid;
}

function encodedParamValue(value) {
  const requiredStringify = typeof JSON.parse(JSON.stringify(value)) === 'object';
  return encodeURIComponent(requiredStringify ? JSON.stringify(value) : value);
}

PBJS.onEvent('bidWon', function(bid) {
  const adUnitCodes = Object.keys(adUnitInfo).map(val => adUnitInfo[val]['adUnitCode']);
  if (adUnitCodes.includes(bid.adUnitCode) && bid.bidderCode !== BIDDER_CODE) {
    const reqId = Object.keys(adUnitInfo).reduce((rid, key) => {
      rid = adUnitInfo[key]['adUnitCode'] === bid.adUnitCode ? adUnitInfo[key]['reqId'] : rid;
      return rid
    }, '');
    storeData({
      'reqId': reqId,
      'cpm': bid.cpm,
      'cur': bid.currency,
      'netRev': bid.netRevenue
    }, `${LS_KEYS.BID_INFO}${reqId}`);
  }
});

registerBidder(spec);
