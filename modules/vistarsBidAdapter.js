import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { deepSetValue, replaceAuctionPrice, deepClone, deepAccess } from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'vistars';
const DEFAULT_ENDPOINT = 'ex-asr.vistarsagency.com';
const SYNC_ENDPOINT = 'sync.vistarsagency.com';
const ADOMAIN = 'vistarsagency.com';
const TIME_TO_LIVE = 360;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    deepSetValue(request, 'ext.prebid', true);

    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    bidResponse.adm = replaceAuctionPrice(bidResponse.adm, bidResponse.price);
    bidResponse.burl = replaceAuctionPrice(bidResponse.burl, bidResponse.price);
    bidResponse.nurl = replaceAuctionPrice(bidResponse.nurl, bidResponse.price);

    return bidResponse;
  }
});

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    let valid = bid.params.source;

    return !!valid;
  },

  buildRequests: function(bids, bidderRequest) {
    return bids.map((bid) => {
      let endpoint = bid.params.endpoint || DEFAULT_ENDPOINT;
      return {
        method: 'POST',
        url: `https://${endpoint}/bid?source=${bid.params.source}`,
        data: converter.toORTB({
          bidRequests: [bid],
          bidderRequest: deepClone(bidderRequest),
          context: {
            mediaType: deepAccess(bid, 'mediaTypes.video') ? VIDEO : BANNER
          },
        }),
      };
    });
  },

  interpretResponse: function(response, request) {
    if (!response?.body) {
      return [];
    }

    const bids = converter.fromORTB({response: response.body, request: request.data}).bids;
    bids.forEach((bid) => {
      bid.meta = bid.meta || {};
      bid.meta.advertiserDomains = bid.meta.advertiserDomains || [];
      if (bid.meta.advertiserDomains.length == 0) {
        bid.meta.advertiserDomains.push(ADOMAIN);
      }

      bid.ttl = bid.ttl || TIME_TO_LIVE;
    });

    return bids;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []

    if (!hasPurpose1Consent(gdprConsent)) {
      return syncs;
    }

    let params = `us_privacy=${uspConsent || ''}&gdpr_consent=${gdprConsent?.consentString ? gdprConsent.consentString : ''}`;
    if (typeof gdprConsent?.gdprApplies === 'boolean') {
      params += `&gdpr=${Number(gdprConsent.gdprApplies)}`;
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: `//${SYNC_ENDPOINT}/match/sp.ifr?${params}`
      });
    }

    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: `//${SYNC_ENDPOINT}/match/sp?${params}`
      });
    }

    return syncs;
  },

  supportedMediaTypes: [ BANNER, VIDEO ]
}

registerBidder(spec);
