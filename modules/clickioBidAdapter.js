import {deepSetValue} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'clickio';

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'ext.params', bidRequest.params);
    return imp;
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  buildRequests(bidRequests, bidderRequest) {
    const data = converter.toORTB({bidRequests, bidderRequest})
    return [{
      method: 'POST',
      url: 'https://o.clickiocdn.com/bids',
      data
    }]
  },
  isBidRequestValid(bid) {
    return true;
  },
  interpretResponse(response, request) {
    const bids = converter.fromORTB({response: response.body, request: request.data}).bids;
    return bids;
  },
  getUserSyncs(syncOptions, _, gdprConsent, uspConsent, gppConsent = {}) {
    const { gppString = '', applicableSections = [] } = gppConsent;
    const queryParams = [];

    if (gdprConsent) {
      if (gdprConsent.gdprApplies !== undefined) {
        queryParams.push(`gdpr=${gdprConsent.gdprApplies ? 1 : 0}`);
      }
      if (gdprConsent.consentString) {
        queryParams.push(`gdpr_consent=${gdprConsent.consentString}`);
      }
    }
    if (uspConsent) {
      queryParams.push(`us_privacy=${uspConsent}`);
    }
    queryParams.push(`gpp=${gppString}`);
    if (Array.isArray(applicableSections)) {
      for (const applicableSection of applicableSections) {
        queryParams.push(`gpp_sid=${applicableSection}`);
      }
    }
    if (syncOptions.iframeEnabled) {
      return [
        {
          type: 'iframe',
          url: `https://o.clickiocdn.com/cookie_sync_html?${queryParams.join('&')}`
        }
      ];
    } else {
      return [];
    }
  }
};

registerBidder(spec);
