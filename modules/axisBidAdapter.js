import { deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { config } from '../src/config.js';
import {
  isBidRequestValid,
  buildRequestsBase,
  interpretResponse,
  buildPlacementProcessingFunction,
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'axis';
const AD_URL = 'https://prebid.axis-marketplace.com/pbjs';
const SYNC_URL = 'https://cs.axis-marketplace.com';

const addPlacementType = (bid, bidderRequest, placement) => {
  placement.integration = bid.params.integration;
  placement.token = bid.params.token;
};

const addCustomFieldsToPlacement = (bid, bidderRequest, placement) => {
  const { mediaTypes } = bid;

  if (placement.adFormat === BANNER) {
    placement.pos = mediaTypes[BANNER].pos;
  } else if (placement.adFormat === VIDEO) {
    placement.pos = mediaTypes[VIDEO].pos;
    placement.context = mediaTypes[VIDEO].context;
  }
};

const placementProcessingFunction = buildPlacementProcessingFunction({ addPlacementType, addCustomFieldsToPlacement });

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  const request = buildRequestsBase({ adUrl: AD_URL, validBidRequests, bidderRequest, placementProcessingFunction });

  request.data.iabCat = deepAccess(bidderRequest, 'ortb2.site.cat');

  return request;
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(['integration', 'token'], 'every'),
  buildRequests,
  interpretResponse,

  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
    let syncType = syncOptions.iframeEnabled ? 'iframe' : 'image';
    let syncUrl = SYNC_URL + `/${syncType}?pbjs=1`;
    if (gdprConsent && gdprConsent.consentString) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        syncUrl += `&gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        syncUrl += `&gdpr=0&gdpr_consent=${gdprConsent.consentString}`;
      }
    }
    if (uspConsent && uspConsent.consentString) {
      syncUrl += `&ccpa=${uspConsent.consentString}`;
    }

    if (gppConsent?.gppString && gppConsent?.applicableSections?.length) {
      syncUrl += '&gpp=' + gppConsent.gppString;
      syncUrl += '&gpp_sid=' + gppConsent.applicableSections.join(',');
    }

    const coppa = config.getConfig('coppa') ? 1 : 0;
    syncUrl += `&coppa=${coppa}`;

    return [{
      type: syncType,
      url: syncUrl
    }];
  }
}

registerBidder(spec);
