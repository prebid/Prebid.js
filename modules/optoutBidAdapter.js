import * as utils from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'optout';

function getDomain(bidderRequest) {
  return utils.deepAccess(bidderRequest, 'refererInfo.canonicalUrl') || utils.deepAccess(window, 'location.href');
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

function hasPurpose1Consent(bidderRequest) {
  let result = false;
  if (bidderRequest && bidderRequest.gdprConsent) {
    if (bidderRequest.gdprConsent.apiVersion === 2) {
      result = !!(utils.deepAccess(bidderRequest.gdprConsent, 'vendorData.purpose.consents.1') === true);
    }
  }
  return result;
}

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    return !!bid.params.publisher && !!bid.params.adslot;
  },

  buildRequests: function(validBidRequests) {
    return validBidRequests.map(bidRequest => {
      let endPoint = 'https://adscience-nocookie.nl/prebid/display';
      let consentString = '';
      if (bidRequest.gdprConsent) {
        consentString = bidRequest.gdprConsent.consentString;
        if (!bidRequest.gdprConsent.gdprApplies || hasPurpose1Consent(bidRequest)) {
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
          ortb2: config.getConfig('ortb2'),
          consent: consentString

        },
      };
    });
  },

  interpretResponse: function (serverResponse, bidRequest) {
    return serverResponse.body;
  },

  getUserSyncs: function (syncOptions, responses, gdprConsent) {
    var gdprParams;
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        gdprParams = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        gdprParams = `gdpr_consent=${gdprConsent.consentString}`;
      }
      if (syncOptions.iframeEnabled && (gdprConsent.gdprApplies || hasPurpose1Consent({gdprConsent}))) {
        return [{
          type: 'iframe',
          url: 'https://umframe.adscience.nl/matching/iframe?' + gdprParams
        }];
      }
    }
  },
};
registerBidder(spec);
