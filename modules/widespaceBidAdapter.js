import { config } from 'src/config';
import { registerBidder } from 'src/adapters/bidderFactory';
import {
  parseQueryStringParameters,
  parseSizesInput,
  getTopWindowReferrer
} from 'src/utils';

const BIDDER_CODE = 'widespace';
const WS_ADAPTER_VERSION = '2.0.0';
const DEFAULT_CURRENCY = 'EUR';
const REQUIRED_PARAMS = ['sid', 'currency'];
const DEMO_DATA_PARAMS = ['gender', 'country', 'region', 'postal', 'city', 'yob'];

export const spec = {
  code: BIDDER_CODE,

  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function(bid) {
    return true
    //return bid.params && REQUIRED_PARAMS.every(p => Object.keys(bid.params).includes(p));
  },

  buildRequests: function(validBidRequests) {
    let data = {};
    let serverRequests = [];
    let ENDPOINT_URL = location.protocol + '//' + 'engine.widespace.com/map/engine/dynadreq';

    validBidRequests.forEach( (bid) => {
      data = {
        'ver': '5.0.0',
        'tagType': 'dyn',
        'a': 'application/json',
        'forceAdId': '23456',
        'hb.callback': 'dummy',
        'referer': getTopWindowReferrer(),
        'sid': bid.params.sid,
        'hb': '1',
        'hb.ver': WS_ADAPTER_VERSION,
        'hb.name': 'prebidjs',
        'hb.callbackUid': bid.bidId,
        'hb.sizes': parseSizesInput(bid.sizes).join(','),
        'hb.currency': bid.params.cur || bid.params.currency || DEFAULT_CURRENCY
      };

      if (bid.params.demo) {
        DEMO_DATA_PARAMS.forEach((key) => {
          if (bid.params.demo[key]) {
            data[`hb.demo.${key}`] = bid.params.demo[key];
          }
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

    return serverRequests;
  },

  interpretResponse: function(serverResponse, request) {
    top.serverResponse = serverResponse;
    top.request = request;

    const successBids = serverResponse && serverResponse.body || [];
    let bidResponses = [];

    successBids.forEach((bid)=> {
      if (bid.status === 'ad') {
        bidResponses.push({
          requestId: bid.reqId,
          cpm: Math.floor(bid.cpm),
          width: bid.width,
          height: bid.height,
          creativeId: bid.adId,
          currency: bid.currency,
          netRevenue: true,
          ttl: bid.ttl || config.getConfig('_bidderTimeout'),
          referrer: getTopWindowReferrer(),
          ad: bid.code
        });
      }
    });
    console.log(bidResponses);
    return bidResponses
  }//,
  //
  // getUserSyncs: function(syncOptions, serverResponses) {
  //   console.log('syncOptions', syncOptions);
  //   console.log('serverResponses', serverResponses);
  //   return [];
  // }
};
registerBidder(spec);
