import { deepAccess } from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {hasPurpose1Consent} from '../src/utils/gpdr.js';

const BIDDER_CODE = 'optout';

function getDomain(bidderRequest) {
  return deepAccess(bidderRequest, 'refererInfo.canonicalUrl') || deepAccess(window, 'location.href');
}

function getCurrency() {
  let cur = config.getConfig('currency');
  if (cur === undefined) {
    cur = {
      adServerCurrency: 'EUR',
      granularityMultiplier: 1
    };
  }
  return cur;
}

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    return !!bid.params.publisher && !!bid.params.adslot;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      let endPoint = 'https://adscience-nocookie.nl/prebid/display';
      let consentString = '';
      let gdpr = 0;
      if (bidRequest.gdprConsent) {
        gdpr = (typeof bidRequest.gdprConsent.gdprApplies === 'boolean') ? Number(bidRequest.gdprConsent.gdprApplies) : 0;
        consentString = bidRequest.gdprConsent.consentString;
        if (!gdpr || hasPurpose1Consent(bidRequest.gdprConsent)) {
          endPoint = 'https://prebid.adscience.nl/prebid/display';
        }
      }
      return {
        method: 'POST',
        url: endPoint,
        data: {
          requestId: bidRequest.bidId,
          publisher: bidRequest.params.publisher,
          adSlot: bidRequest.params.adslot,
          cur: getCurrency(),
          url: getDomain(bidRequest),
          ortb2: bidderRequest.ortb2,
          consent: consentString,
          gdpr: gdpr

        },
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    return serverResponse.body;
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent) {
    if (gdprConsent) {
      let gdpr = (typeof gdprConsent.gdprApplies === 'boolean') ? Number(gdprConsent.gdprApplies) : 0;
      if (syncOptions.iframeEnabled && (!gdprConsent.gdprApplies || hasPurpose1Consent(gdprConsent))) {
        return [{
          type: 'iframe',
          url: 'https://umframe.adscience.nl/matching/iframe?gdpr=' + gdpr + '&gdpr_consent=' + gdprConsent.consentString
        }];
      }
    }
  },
};
registerBidder(spec);
