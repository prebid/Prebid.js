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
const pbjs = window['$$PREBID_GLOBAL$$'];

let preReqTime = 0;
let adUnitCodes = [];

export const spec = {
  code: BIDDER_CODE,

  supportedMediaTypes: ['banner'],

  isBidRequestValid: function(bid) {
    return bid.params && String(bid.params.sid).length > 9;
  },

  buildRequests: function(validBidRequests) {
    let serverRequests = [];
    const ENDPOINT_URL = location.protocol + '//' + 'engine.widespace.com/map/engine/dynadreq';
    const PERF_DATA = getData('wsPerfData');
    const BID_INFO = getData('wsBidInfo');

    let isInHostileIframe = false;
    try {
      isInHostileIframe = window.top.innerWidth < 0;
    } catch (e) {
      isInHostileIframe = true;
    }

    validBidRequests.forEach((bid, i) => {
      adUnitCodes.push(bid.adUnitCode);
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
        'hb': '1',
        'hb.bidInfo': BID_INFO[i] ? encodeURIComponent(JSON.stringify(BID_INFO[i])) : '',
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
      storeData({
        'perf_status': 'OK',
        'perf_reqid': bid.reqId,
        'perf_ms': responseTime
      }, `wsPerfData${bid.reqId}`);
      if (bid.status === 'ad') {
        bidResponses.push({
          requestId: bid.bidId || bid.callbackUid,
          cpm: bid.cpm,
          width: bid.width,
          height: bid.height,
          creativeId: bid.adId,
          currency: bid.currency,
          netRevenue: true,
          ttl: bid.ttl || config.getConfig('_bidderTimeout'),
          referrer: REFERRER,
          ad: bid.code
        });
      }
    });

    return bidResponses
  },

  getUserSyncs: function(syncOptions, serverResponses) {
    return [{
      type: 'image',
      url: 'http://playground.widespace.com/usman/resources/ws300x300.jpg'
    }];
  }
};

function storeData(data, name) {
  if (LOCAL_STORAGE_AVAILABLE) {
    localStorage.setItem(name, JSON.stringify(data));
    return true;
  }
}

function getData(name) {
  let data = [];
  if (LOCAL_STORAGE_AVAILABLE) {
    Object.keys(localStorage).filter((key) => {
      if (key.includes(name)) {
        data.push(JSON.parse(localStorage.getItem(key)));
        localStorage.removeItem(key);
      }
    });
  }
  return data;
}

function pixelSyncPossibility() {
  const userSync = config.getConfig('userSync');
  return userSync.pixelEnabled && userSync.syncEnabled ? userSync.syncsPerBidder : -1;
}

pbjs.onEvent('bidWon', function(bid) {
  if (adUnitCodes.includes(bid.adUnitCode)) {
    storeData({'bidder': bid.bidder,
      'bidId': bid.adId,
      'cmp': bid.cpm,
      'ttr': bid.timeToRespond
    }, `wsBidInfo${bid.adId}`);
  }
});

pbjs.onEvent('auctionEnd', function(bid) {
  console.log('auctionEnd', bid, pbjs.getHighestCpmBids()[0], pbjs.getHighestCpmBids()[1]);
});

registerBidder(spec);
