import { version } from '../package.json';
import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';
import {
  parseQueryStringParameters,
  parseSizesInput,
  getTopWindowLocation
} from 'src/utils';

const BIDDER_CODE = 'widespace';
const WS_ADAPTER_VERSION = '2.0.0';
const DEMO_DATA_PARAMS = ['gender', 'country', 'region', 'postal', 'city', 'yob'];
const REFERRER = getTopWindowLocation().href;
const LOCAL_STORAGE_AVAILABLE = window.localStorage || 0;
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
    const ENDPOINT_URL = location.protocol + '//' + 'engine.widespace.com/map/engine/dynadreq';
    const PERF_DATA = getData(LS_KEYS.PERF_DATA);
    const BID_INFO = getData(LS_KEYS.BID_INFO);
    const CUST_DATA = getData(LS_KEYS.CUST_DATA);
    const LC_UID = getData(LS_KEYS.LC_UID, false)[0] || storeData(generateLcuid(), LS_KEYS.LC_UID, false) || '';

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
        'ver': '5.0.0', // remove
        'tagType': 'dyn', // remove
        'a': 'application/json', // remove
        'forceAdId': '23456', // remove
        'hb.callback': 'dummy', // remove
        'screenWidthPx': screen && screen.width,
        'screenHeightPx': screen && screen.height,
        'windowWidth': isInHostileIframe ? window.innerWidth : window.top.innerWidth,
        'windowHeight': isInHostileIframe ? window.innerHeight : window.top.innerHeight,
        'referer': REFERRER,
        'sid': bid.params.sid,
        'lcuid': LC_UID,
        'hb': '1',
        'hb.wbi': BID_INFO[i] ? encodeURIComponent(JSON.stringify(BID_INFO[i])) : '',
        'hb.cd': CUST_DATA[i] ? encodeURIComponent(JSON.stringify(CUST_DATA[i])) : '',
        'hb.floor': bid.bidfloor || '',
        'hb.spb': i === 0 ? pixelSyncPossibility() : -1,
        'hb.ver': WS_ADAPTER_VERSION,
        'hb.name': `prebidjs-${version}`,
        'hb.callbackUid': bid.bidId,
        'hb.bidId': bid.bidId,
        'hb.sizes': parseSizesInput(bid.sizes).join(','),
        'hb.currency': bid.params.cur || bid.params.currency || ''
      };

      if (bid.params.demo) {
        DEMO_DATA_PARAMS.forEach((key) => {
          if (bid.params.demo[key]) {
            data[`hb.demo.${key}`] = bid.params.demo[key];
          }
        });
      }

      if (PERF_DATA[i]) {
        Object.keys(PERF_DATA[i]).forEach((perfDataKey) => {
          data[perfDataKey] = PERF_DATA[i][perfDataKey];
        });
      }

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
          ttl: bid.ttl || config.getConfig('_bidderTimeout'),
          referrer: REFERRER,
          ad: bid.code
        });
      }
    });

    return bidResponses
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    // return serverResponses.reduce((allSyncPixels, response) => {
    //   return response.body[0].syncPixels.forEach((url) => {
    //     allSyncPixels.push({type: 'image', url});
    //   });
    //   return allSyncPixels;
    // }, []);
  }
};

function storeData(data, name, stringify = true) {
  if (LOCAL_STORAGE_AVAILABLE) {
    localStorage.setItem(name, stringify ? JSON.stringify(data) : data);
    return localStorage.getItem(name);
  }
}

function getData(name, remove = true) {
  let data = [];
  if (LOCAL_STORAGE_AVAILABLE) {
    Object.keys(localStorage).filter((key) => {
      if (key.includes(name)) {
        data.push(JSON.parse(localStorage.getItem(key)));
        if (remove) {
          localStorage.removeItem(key);
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

function generateLcuid() {
  return (String(4) + new Date().getTime() + String(Math.floor(Math.random() * 1000000000))).substring(0, 18);
}

PBJS.onEvent('bidWon', function(bid) {
  const adUnitCodes = Object.keys(adUnitInfo).map(val => adUnitInfo[val]['adUnitCode']);
  if (adUnitCodes.includes(bid.adUnitCode) && bid.bidderCode !== BIDDER_CODE) {
    const reqId = Object.keys(adUnitInfo).reduce((rid, key) => {
      rid = adUnitInfo[key]['adUnitCode'] === bid.adUnitCode ? adUnitInfo[key]['reqId'] : rid;
      return rid
    }, '');
    storeData({'bidder': bid.bidder,
      'reqId': reqId,
      'cpm': bid.cpm,
      'cur': bid.currency,
      'netRev': bid.netRevenue
    }, `${LS_KEYS.BID_INFO}${reqId}`);
  }
});

registerBidder(spec);
