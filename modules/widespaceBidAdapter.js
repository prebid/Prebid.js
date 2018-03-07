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

let preReqTime = 0;

export const spec = {
  code: BIDDER_CODE,

  supportedMediaTypes: ['banner'],

  isBidRequestValid: function(bid) {
    return bid.params && String(bid.params.sid).length > 9;
  },

  buildRequests: function(validBidRequests) {
    top.validBidRequests = validBidRequests;
    top.config = config;
    let data = {};
    let serverRequests = [];
    const ENDPOINT_URL = location.protocol + '//' + 'engine.widespace.com/map/engine/dynadreq';
    const PERF_DATA = getPerfData();

    let isInHostileIframe = false;
    try {
      isInHostileIframe = window.top.innerWidth < 0;
    } catch (e) {
      isInHostileIframe = true;
    }

    validBidRequests.forEach((bid, i) => {
      data = {
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
        'hb.floor': bid.bidfloor || '',
        'hb.spb': pixelSyncPossibility(),
        'hb.ver': WS_ADAPTER_VERSION,
        'hb.name': `prebidjs-${version}`,
        'hb.callbackUid': bid.bidId,
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
    pbjs.getAllWinningBid()
    top.serverResponse = serverResponse;
    top.request = request;
    const responseTime = Date.now() - preReqTime;
    const successBids = serverResponse.body || [];
    let bidResponses = [];
    successBids.forEach((bid) => {
      setPerfData(bid.reqId, responseTime);
      if (bid.status === 'ad') {
        bidResponses.push({
          requestId: bid.callbackUid,
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
    top.syncOptions = syncOptions;
    top.serverResponses = serverResponses;
    return [/*{
      type: 'image',
      url: 'http://playground.widespace.com/usman/resources/ws300x300.jpg'
    }*/];
  }
};

function setPerfData(reqId, time) {
  if (preReqTime && LOCAL_STORAGE_AVAILABLE) {
    const perfString = JSON.stringify({
      'perf_status': 'OK',
      'perf_reqid': reqId,
      'perf_ms': time
    });
    localStorage.setItem('wsPerfData' + reqId, perfString);
    return perfString;
  }
}

function getPerfData() {
  let data = [];
  if (LOCAL_STORAGE_AVAILABLE) {
    Object.keys(localStorage).filter((key) => {
      if (key.indexOf('wsPerfData') > -1) {
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

registerBidder(spec);
