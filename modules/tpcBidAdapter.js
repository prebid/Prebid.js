import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { pbsExtensions } from '../libraries/pbsExtensions/pbsExtensions.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, deepClone, logWarn, logError, triggerPixel, isEmpty, shuffle } from '../src/utils.js';

const BIDDER_CODE = 'tpc';
const PBS_ENDPOINT = 'https://pbs.tpcsrv.com/openrtb2/auction';
const USER_SYNC_ENDPOINT = 'https://pbs.tpcsrv.com/cookie_sync';
const MAX_SYNC_COUNT = 10;

const converter = ortbConverter({
  processors: pbsExtensions,
  context: {
    netRevenue: true,
    ttl: 300,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { placementId, bidder } = bidRequest.params;
    if (placementId) {
      deepSetValue(imp, 'ext.prebid.bidder.tpc.placementId', placementId);
    }
    if (bidder) {
      deepSetValue(imp, 'ext.prebid.bidder.tpc.bidder', bidder);
    }
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
  },
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  aliases: [],

  isBidRequestValid(bid) {
    if (!deepAccess(bid, 'params.accountId')) {
      logWarn(`${BIDDER_CODE}: bid missing required params.accountId`, bid);
      return false;
    }
    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    const { bidder } = validBidRequests[0];
    const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
    const accountId = deepAccess(validBidRequests[0], 'params.accountId');
    if (accountId) {
      deepSetValue(data, 'site.publisher.id', accountId);
    }
    data.ext.prebid.passthrough = {
      ...data.ext.prebid.passthrough,
      tpc: { bidder },
    };
    data.tmax = (bidderRequest.timeout || 1500) - 100;
    return {
      method: 'POST',
      url: PBS_ENDPOINT,
      data,
    };
  },

  interpretResponse(serverResponse, request) {
    if (!serverResponse?.body) return [];
    const resp = deepClone(serverResponse.body);
    const { bidder } = request.data.ext.prebid.passthrough.tpc;
    const modifiers = {
      responsetimemillis: (values) => Math.max(...values),
      errors: (values) => [].concat(...values),
    };
    Object.entries(modifiers).forEach(([field, combineFn]) => {
      const obj = resp.ext?.[field];
      if (!isEmpty(obj)) {
        resp.ext[field] = { [bidder]: combineFn(Object.values(obj)) };
      }
    });
    return converter.fromORTB({ response: resp, request: request.data }).bids;
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) return [];

    let bidders = [];
    serverResponses.forEach(({ body }) => {
      Object.keys(body?.ext?.responsetimemillis || {}).forEach(b => {
        if (!bidders.includes(b)) bidders.push(b);
      });
    });

    if (!bidders.length) return [];

    bidders = shuffle(bidders).slice(0, MAX_SYNC_COUNT);

    const params = new URLSearchParams();
    params.set('bidders', bidders.join(','));
    params.set('max_sync_count', MAX_SYNC_COUNT);

    if (gdprConsent) {
      params.set('gdpr', gdprConsent.gdprApplies ? '1' : '0');
      if (gdprConsent.consentString) {
        params.set('gdpr_consent', gdprConsent.consentString);
      }
    }
    if (uspConsent) {
      params.set('us_privacy', uspConsent);
    }
    if (gppConsent?.gppString) {
      params.set('gpp', gppConsent.gppString);
    }
    if (Array.isArray(gppConsent?.applicableSections)) {
      params.set('gpp_sid', gppConsent.applicableSections.join(','));
    }

    const syncUrl = `${USER_SYNC_ENDPOINT}?${params.toString()}`;
    if (syncOptions.iframeEnabled) {
      return [{ type: 'iframe', url: syncUrl }];
    }
    return [{ type: 'image', url: syncUrl }];
  },

  onBidWon(bid) {
    if (bid.pbsWurl) triggerPixel(bid.pbsWurl);
    if (bid.burl) triggerPixel(bid.burl);
  },

  onBidderError({ error }) {
    if (error.status === 400 && error.responseText) {
      const match = error.responseText.match(/found for id: (.*)/);
      if (match?.[1]) {
        logError(`${BIDDER_CODE}: account '${match[1]}' not found. Please verify your accountId.`, error);
        return;
      }
    }
    logError(`${BIDDER_CODE} bidder error`, error);
  },
};

registerBidder(spec);
