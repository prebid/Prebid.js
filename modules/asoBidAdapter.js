import { deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'aso';
const BIDDER_GVLID = 1621;
const DEFAULT_SERVER_URL = 'https://srv.aso1.net';
const DEFAULT_SERVER_PATH = '/prebid/bidder';
const DEFAULT_CURRENCY = 'USD';
const VERSION = '$prebid.version$_2.0';
const TTL = 300;

export const spec = {

  code: BIDDER_CODE,
  gvlid: BIDDER_GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  aliases: [
    { code: 'bcmint' },
    { code: 'bidgency', gvlid: 1403 },
    { code: 'kuantyx', gvlid: 1374 },
    { code: 'cordless' },
    { code: 'adklip' }
  ],

  isBidRequestValid: bid => {
    return !!bid.params && !!bid.params.zone;
  },

  buildRequests: (bidRequests, bidderRequest) => {
    const requests = [];

    bidRequests.forEach(bid => {
      const data = converter.toORTB({ bidRequests: [bid], bidderRequest });
      requests.push({
        method: 'POST',
        url: getEndpoint(bid),
        data,
        options: {
          withCredentials: true,
          crossOrigin: true
        },
        bidderRequest
      });
    });
    return requests;
  },

  interpretResponse: (response, request) => {
    if (response.body) {
      return converter.fromORTB({ response: response.body, request: request.data }).bids;
    }
    return [];
  },

  getUserSyncs: function (syncOptions, serverResponses) {
    const urls = [];

    if (serverResponses && serverResponses.length !== 0) {
      serverResponses.forEach(resp => {
        const userSyncs = deepAccess(resp, 'body.ext.user_syncs');
        if (!userSyncs) {
          return;
        }

        userSyncs.forEach(us => {
          let url = us.url;

          urls.push({
            type: us.type,
            url: url
          });
        });
      });
    }

    return urls;
  }
};

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: TTL
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    imp.tagid = bidRequest.adUnitCode;
    imp.secure = bidRequest.ortb2Imp?.secure ?? 1;
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    if (!request.cur) {
      request.cur = [DEFAULT_CURRENCY];
    }

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = deepAccess(bid, 'ext.prebid.type');
    return buildBidResponse(bid, context);
  }
});

function getEndpoint(bidRequest) {
  const serverUrl = bidRequest.params.server || DEFAULT_SERVER_URL;
  return serverUrl + DEFAULT_SERVER_PATH + '?zid=' + bidRequest.params.zone + '&pbjs=' + VERSION;
}

registerBidder(spec);
