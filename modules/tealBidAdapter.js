import {deepSetValue, deepAccess, triggerPixel, deepClone, isEmpty, logError} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'
import {BANNER} from '../src/mediaTypes.js';
import {pbsExtensions} from '../libraries/pbsExtensions/pbsExtensions.js'
const BIDDER_CODE = 'teal';
const GVLID = 1378;
const DEFAULT_ENDPOINT = 'https://a.bids.ws/openrtb2/auction';
const COOKIE_SYNC_ENDPOINT = 'https://a.bids.ws/cookie_sync';
const COOKIE_SYNC_IFRAME = 'https://bids.ws/load-cookie.html';
const MAX_SYNC_COUNT = 10;

const converter = ortbConverter({
  processors: pbsExtensions,
  context: {
    netRevenue: true,
    ttl: 30
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { placement, testMode } = bidRequest.params;
    if (placement) {
      deepSetValue(imp, 'ext.prebid.storedrequest.id', placement);
    }
    if (testMode) {
      deepSetValue(imp, 'ext.prebid.storedauctionresponse.id', placement);
    }
    delete imp.ext.prebid.bidder;
    return imp;
  },
  overrides: {
    bidResponse: {
      bidderCode(orig, bidResponse, bid, { bidRequest }) {
        let useSourceBidderCode = deepAccess(bidRequest, 'params.useSourceBidderCode', false);
        if (useSourceBidderCode) {
          orig.apply(this, [...arguments].slice(1));
        }
      },
    },
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],
  aliases: [],

  isBidRequestValid: function(bid) {
    return Boolean(bid.params?.account);
  },

  buildRequests: function(bidRequests, bidderRequest) {
    const { bidder } = bidRequests[0];
    const data = converter.toORTB({bidRequests, bidderRequest});
    deepSetValue(data, 'ext.prebid.storedrequest.id', deepAccess(bidRequests[0], 'params.account', null));
    deepSetValue(data, 'site.publisher.id', deepAccess(bidRequests[0], 'params.account', null));
    data.ext.prebid.passthrough = {
      ...data.ext.prebid.passthrough,
      teal: { bidder },
    };
    data.tmax = (bidderRequest.timeout || 1500) - 100;
    return {
      method: 'POST',
      url: deepAccess(bidRequests[0], 'params.endpoint', DEFAULT_ENDPOINT),
      data
    };
  },

  interpretResponse: function(response, request) {
    const resp = deepClone(response.body);
    const { bidder } = request.data.ext.prebid.passthrough.teal;
    const modifiers = {
      responsetimemillis: (values) => Math.max(...values),
      errors: (values) => [].concat(...values),
    };
    Object.entries(modifiers).forEach(([field, combineFn]) => {
      const obj = resp.ext?.[field];
      if (!isEmpty(obj)) {
        resp.ext[field] = {[bidder]: combineFn(Object.values(obj))};
      }
    });
    const bids = converter.fromORTB({response: resp, request: request.data}).bids;
    return bids;
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
    if (!syncOptions.iframeEnabled) {
      return [];
    }
    const syncs = [];
    const { gdprApplies, consentString } = gdprConsent || {};
    const params = {
      endpoint: COOKIE_SYNC_ENDPOINT,
      max_sync_count: MAX_SYNC_COUNT,
      gdpr: gdprApplies ? 1 : 0,
      gdpr_consent: consentString,
      us_privacy: uspConsent
    };
    const qs = Object.entries(params)
      .filter(([k, v]) => ![null, undefined, ''].includes(v))
      .map(([k, v]) => `${k}=${encodeURIComponent(v.toString())}`)
      .join('&');
    syncs.push({ type: 'iframe', url: `${COOKIE_SYNC_IFRAME}?${qs}` });
    return syncs;
  },

  onBidWon: function(bid) {
    if (bid.pbsWurl) {
      triggerPixel(bid.pbsWurl);
    }
    if (bid.burl) {
      triggerPixel(bid.burl);
    }
  },

  onBidderError: function({ error, bidderRequest }) {
    logError(`${BIDDER_CODE} bidder error`, error);
  }
}
registerBidder(spec);
