import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {deepAccess} from '../src/utils.js';
import {hasPurpose1Consent} from '../src/utils/gpdr.js';
import {bidderSettings} from '../src/bidderSettings.js';

const BIDDER_CODE = 'snigel';
const GVLID = 1076;
const DEFAULT_URL = 'https://adserv.snigelweb.com/bp/v1/prebid';
const DEFAULT_TTL = 60;
const DEFAULT_CURRENCIES = ['USD'];

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bidRequest) {
    return !!bidRequest.params.placement;
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const gdprApplies = deepAccess(bidderRequest, 'gdprConsent.gdprApplies');
    return {
      method: 'POST',
      url: getEndpoint(),
      data: JSON.stringify({
        id: bidderRequest.bidderRequestId,
        cur: getCurrencies(),
        test: getTestFlag(),
        gdprApplies: gdprApplies,
        gdprConsentString: gdprApplies === true ? deepAccess(bidderRequest, 'gdprConsent.consentString') : undefined,
        uspConsent: deepAccess(bidderRequest, 'uspConsent'),
        coppa: config.getConfig('coppa'),
        page: getPage(bidderRequest),
        placements: bidRequests.map((r) => {
          return {
            uuid: r.bidId,
            name: r.params.placement,
            sizes: r.sizes,
          };
        }),
      }),
      bidderRequest,
    };
  },

  interpretResponse: function (serverResponse) {
    if (!serverResponse.body || !serverResponse.body.bids) {
      return [];
    }

    return serverResponse.body.bids.map((bid) => {
      return {
        requestId: bid.uuid,
        cpm: bid.price,
        creativeId: bid.crid,
        currency: serverResponse.body.cur,
        width: bid.width,
        height: bid.height,
        ad: bid.ad,
        netRevenue: true,
        ttl: bid.ttl || DEFAULT_TTL,
        meta: bid.meta,
      };
    });
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent, uspConsent) {
    const syncUrl = getSyncUrl(responses || []);
    if (syncUrl && syncOptions.iframeEnabled && hasSyncConsent(gdprConsent, uspConsent)) {
      return [{type: 'iframe', url: getSyncEndpoint(syncUrl, gdprConsent)}];
    }
  },
};

registerBidder(spec);

function getPage(bidderRequest) {
  return (
    bidderSettings.get(BIDDER_CODE, 'page') ||
    deepAccess(bidderRequest, 'refererInfo.canonicalUrl') ||
    window.location.href
  );
}

function getEndpoint() {
  return bidderSettings.get(BIDDER_CODE, 'url') || DEFAULT_URL;
}

function getTestFlag() {
  return bidderSettings.get(BIDDER_CODE, 'test') === true;
}

function getCurrencies() {
  return bidderSettings.get(BIDDER_CODE, 'cur') || DEFAULT_CURRENCIES;
}

function hasSyncConsent(gdprConsent, uspConsent) {
  if (gdprConsent?.gdprApplies && !hasPurpose1Consent(gdprConsent)) {
    return false;
  } else if (uspConsent && uspConsent[1] === 'Y' && uspConsent[2] === 'Y') {
    return false;
  } else {
    return true;
  }
}

function getSyncUrl(responses) {
  return bidderSettings.get(BIDDER_CODE, 'syncUrl') || deepAccess(responses[0], 'body.syncUrl');
}

function getSyncEndpoint(url, gdprConsent) {
  return `${url}?gdpr=${gdprConsent?.gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(
    gdprConsent?.consentString || ''
  )}`;
}
