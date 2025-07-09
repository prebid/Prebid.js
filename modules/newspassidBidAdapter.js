import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import { deepSetValue } from '../src/utils.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 */

const BIDDER_CODE = 'newspassid';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;
const DEFAULT_TTL = 300;
const ENDPOINT_URL = 'https://npid.amspbs.com/v0/bid/request';
const GVL_ID = 1317;
const SYNC_URL = 'https://npid.amspbs.com/v0/user/sync';

const converter = ortbConverter({
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'ext.newspassid', {
      publisher: resolveNewpassidPublisherId(bidRequest),
      placementId: bidRequest.params.placementId,
    })
    return imp;
  },
  context: {
    ttl: DEFAULT_TTL,
    netRevenue: DEFAULT_NET_REVENUE
  }
});

/**
 * Helper function to add params to url
 * @param {string} url
 * @param {object} params
 * @returns {string}
 */
const addParamsToUrl = (url, params) => {
  const urlObj = new URL(url);
  Object.entries(params).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });
  return urlObj.toString();
};

/**
 * Get the global publisherId for the newspassid bidder
 * @returns {string|null}
 */
const getGlobalPublisherIdOrNull = () => {
  const globalPublisherId = config.getConfig('newspassid.publisherId');
  if (globalPublisherId) return globalPublisherId;
  return null;
};

/**
 * Resolve the publisherId for the newspassid bidder
 * @param {BidRequest|undefined} bidRequest
 * @returns {string|null}
 */
export const resolveNewpassidPublisherId = (bidRequest) => {
  if (typeof bidRequest !== 'object') return getGlobalPublisherIdOrNull();

  // get publisherId from bidRequest params
  const { params } = bidRequest;
  if (params?.publisherId) return params?.publisherId;

  return getGlobalPublisherIdOrNull();
};

/**
 * @type {BidderSpec}
 */
export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],

  isBidRequestValid: function(bidRequest) {
    const publisherId = resolveNewpassidPublisherId(bidRequest);
    return !!(bidRequest.params && publisherId && bidRequest.params.placementId);
  },

  buildRequests: function(bidRequests, bidderRequest) {
    // convert to ortb using the converter utility
    const data = converter.toORTB({ bidRequests, bidderRequest });

    return [
      {
        method: 'POST',
        url: ENDPOINT_URL,
        data: data,
        options: {
          withCredentials: true
        }
      }
    ];
  },

  interpretResponse: function(serverResponse, bidRequest) {
    const response = serverResponse.body;
    const bidResponses = [];

    if (!response || !response.seatbid || !response.seatbid[0].bid) {
      return bidResponses;
    }

    response.seatbid[0].bid.forEach(bid => {
      bidResponses.push({
        requestId: bid.impid,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid || bid.id,
        currency: response.cur || DEFAULT_CURRENCY,
        netRevenue: true,
        ttl: DEFAULT_TTL,
        ad: bid.adm,
        meta: {
          advertiserDomains: bid.adomain || [],
        }
      });
    });

    return bidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    if (!syncOptions.iframeEnabled) return []; // disable if iframe sync is disabled
    if (!hasPurpose1Consent(gdprConsent)) return []; // disable if no purpose1 consent
    if (config.getConfig('coppa') === true) return []; // disable syncs for coppa

    const params = {
      gdpr: gdprConsent?.gdprApplies ? 1 : 0,
      gdpr_consent: gdprConsent?.gdprApplies
        ? encodeURIComponent(gdprConsent?.consentString || '')
        : '',
      gpp: encodeURIComponent(gppConsent?.gppString || ''),
      gpp_sid: encodeURIComponent(gppConsent?.applicableSections || ''),
      us_privacy: encodeURIComponent(uspConsent || ''),
    };

    const globalPublisherId = resolveNewpassidPublisherId({});
    if (globalPublisherId) {
      // "publisher" is a convention on the server side
      params.publisher = globalPublisherId;
    }

    let syncs = [];

    // iframe sync
    syncs.push({
      type: 'iframe',
      url: addParamsToUrl(SYNC_URL, params),
    });

    return syncs;
  }
};

registerBidder(spec);
