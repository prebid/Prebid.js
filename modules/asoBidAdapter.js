import {deepAccess, deepSetValue} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {tryAppendQueryString} from '../libraries/urlUtils/urlUtils.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';

const BIDDER_CODE = 'aso';
const DEFAULT_SERVER_URL = 'https://srv.aso1.net';
const DEFAULT_SERVER_PATH = '/prebid/bidder';
const DEFAULT_CURRENCY = 'USD';
const VERSION = '$prebid.version$_2.0';
const TTL = 300;

export const spec = {

  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  aliases: [
    {code: 'bcmint'},
    {code: 'bidgency'}
  ],

  isBidRequestValid: bid => {
    return !!bid.params && !!bid.params.zone;
  },

  buildRequests: (bidRequests, bidderRequest) => {
    let requests = [];

    bidRequests.forEach(bid => {
      const data = converter.toORTB({bidRequests: [bid], bidderRequest});
      requests.push({
        method: 'POST',
        url: getEndpoint(bid),
        data,
        options: {
          withCredentials: true,
          crossOrigin: true
        },
        bidderRequest
      })
    });
    return requests;
  },

  interpretResponse: (response, request) => {
    if (response.body) {
      return converter.fromORTB({response: response.body, request: request.data}).bids;
    }
    return [];
  },

  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const urls = [];

    if (serverResponses && serverResponses.length !== 0) {
      let query = '';
      if (gdprConsent) {
        query = tryAppendQueryString(query, 'gdpr', (gdprConsent.gdprApplies ? 1 : 0));
        query = tryAppendQueryString(query, 'consents_str', gdprConsent.consentString);
        const consentsIds = getConsentsIds(gdprConsent);
        if (consentsIds) {
          query = tryAppendQueryString(query, 'consents', consentsIds);
        }
      }

      if (uspConsent) {
        query = tryAppendQueryString(query, 'us_privacy', uspConsent);
      }

      if (query.slice(-1) === '&') {
        query = query.slice(0, -1);
      }

      serverResponses.forEach(resp => {
        const userSyncs = deepAccess(resp, 'body.ext.user_syncs');
        if (!userSyncs) {
          return;
        }

        userSyncs.forEach(us => {
          let url = us.url;
          if (query) {
            url = url + (url.indexOf('?') === -1 ? '?' : '&') + query;
          }

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
    imp.secure = Number(window.location.protocol === 'https:');
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);

    if (bidderRequest.gdprConsent) {
      const consentsIds = getConsentsIds(bidderRequest.gdprConsent);
      if (consentsIds) {
        deepSetValue(request, 'user.ext.consents', consentsIds);
      }
    }

    if (!request.cur) {
      request.cur = [DEFAULT_CURRENCY];
    }

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    context.mediaType = deepAccess(bid, 'ext.prebid.type');
    return buildBidResponse(bid, context);
  },

  overrides: {
    request: {
      // We don't need extra data
      gdprAddtlConsent(setAddtlConsent, ortbRequest, bidderRequest) {
      }
    }
  }
});

function getEndpoint(bidRequest) {
  const serverUrl = bidRequest.params.server || DEFAULT_SERVER_URL;
  return serverUrl + DEFAULT_SERVER_PATH + '?zid=' + bidRequest.params.zone + '&pbjs=' + VERSION;
}

function getConsentsIds(gdprConsent) {
  const consents = deepAccess(gdprConsent, 'vendorData.purpose.consents', []);
  let consentsIds = [];

  Object.keys(consents).forEach(key => {
    if (consents[key] === true) {
      consentsIds.push(key);
    }
  });

  return consentsIds.join(',');
}

registerBidder(spec);
