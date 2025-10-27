import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import {deepAccess, deepClone, replaceAuctionPrice} from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';

const BIDDER_CODE = 'dvgroup';
const DEFAULT_ENDPOINT = 'rtb.dvgroup.com';
const SYNC_ENDPOINT = 'sync.dvgroup.com';
const TIME_TO_LIVE = 360;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 30
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
    const valid = bid.params.sspId;

    return !!valid;
  },

  buildRequests: function(bids, bidderRequest) {
    return bids.map((bid) => {
      const endpoint = bid.params.endpoint || DEFAULT_ENDPOINT;
      const bidMediaType = deepAccess(bid, 'mediaTypes.video');
      return {
        method: 'POST',
        url: `https://${endpoint}/bid?sspuid=${bid.params.sspId}`,
        data: converter.toORTB({
          bidRequests: [bid],
          bidderRequest: deepClone(bidderRequest),
          context: {
            mediaType: bidMediaType ? VIDEO : BANNER
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
      bid.ttl = bid.ttl || TIME_TO_LIVE;
      bid.meta.advertiserDomains = bid.meta.advertiserDomains || [];
      if (bid.meta.advertiserDomains.length === 0) {
        bid.meta.advertiserDomains.push('dvgroup.com');
      }
    });

    return bids;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []

    if (!hasPurpose1Consent(gdprConsent)) {
      return syncs;
    }

    if (syncOptions.pixelEnabled) {
      let params = `us_privacy=${uspConsent || ''}&gdpr_consent=${gdprConsent?.consentString ? gdprConsent.consentString : ''}`;
      if (typeof gdprConsent?.gdprApplies === 'boolean') {
        params += `&gdpr=${Number(gdprConsent.gdprApplies)}`;
      }

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
