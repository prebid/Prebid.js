import {deepSetValue, deepAccess, triggerPixel, deepClone, isEmpty, logError, shuffle} from '../src/utils.js';
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
        const useSourceBidderCode = deepAccess(bidRequest, 'params.useSourceBidderCode', false);
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
    const account = deepAccess(bidRequests[0], 'params.account', null);
    const subAccount = deepAccess(bidRequests[0], 'params.subAccount', null);
    deepSetValue(data, 'site.publisher.id', account);
    deepSetValue(data, 'ext.prebid.storedrequest.id', subAccount || account);
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
    let bidders = [];
    serverResponses.forEach(({ body }) => {
      const newBidders = Object.keys(body.ext?.responsetimemillis || {});
      newBidders.forEach(s => {
        if (bidders.indexOf(s) === -1) {
          bidders.push(s);
        }
      });
    });
    bidders = shuffle(bidders).slice(0, MAX_SYNC_COUNT);
    if (!bidders.length) {
      return;
    }
    const params = {
      endpoint: COOKIE_SYNC_ENDPOINT,
      max_sync_count: MAX_SYNC_COUNT,
      gdpr: gdprApplies ? 1 : 0,
      gdpr_consent: consentString,
      us_privacy: uspConsent,
      bidders: bidders.join(','),
      coop_sync: 0
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
    if (error.responseText && error.status) {
      const id = error.responseText.match(/found for id: (.*)/);
      if (Array.isArray(id) && id.length > 1 && error.status === 400) {
        logError(`Placement: ${id[1]} not found on ${BIDDER_CODE} server. Please contact your account manager or email prebid@teal.works`, error);
        return;
      }
    }
    logError(`${BIDDER_CODE} bidder error`, error);
  }
}
registerBidder(spec);
