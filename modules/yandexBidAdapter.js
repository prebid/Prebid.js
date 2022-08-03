import {formatQS, deepAccess} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'yandex';
const BIDDER_URL = 'https://bs-metadsp.yandex.ru/metadsp';
const DEFAULT_TTL = 180;
const SSP_ID = 10500;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ya'], // short code

  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.pageId && bid.params.impId);
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const gdprApplies = deepAccess(bidderRequest, 'gdprConsent.gdprApplies');
    const consentString = deepAccess(bidderRequest, 'gdprConsent.consentString');

    let referrer = '';
    if (bidderRequest && bidderRequest.refererInfo) {
      // TODO: is 'domain' the right value here?
      referrer = bidderRequest.refererInfo.domain
    }

    return validBidRequests.map((bidRequest) => {
      const { params } = bidRequest;
      const { pageId, impId, targetRef, withCredentials = true } = params;

      const queryParams = {
        'imp-id': impId,
        'target-ref': targetRef || referrer,
        'ssp-id': SSP_ID,
      };
      if (gdprApplies !== undefined) {
        queryParams['gdpr'] = 1;
        queryParams['tcf-consent'] = consentString;
      }
      const imp = {
        id: impId,
      };

      const bannerParams = deepAccess(bidRequest, 'mediaTypes.banner');
      if (bannerParams) {
        const [ w, h ] = bannerParams.sizes[0];
        imp.banner = {
          w,
          h,
        };
      }

      const queryParamsString = formatQS(queryParams);
      return {
        method: 'POST',
        url: BIDDER_URL + `/${pageId}?${queryParamsString}`,
        data: {
          id: bidRequest.bidId,
          imp: [imp],
          site: {
            page: referrer,
          },
        },
        options: {
          withCredentials,
        },
        bidRequest,
      }
    });
  },

  interpretResponse: function(serverResponse, {bidRequest}) {
    let response = serverResponse.body;
    if (!response.seatbid) {
      return [];
    }

    const { cur, seatbid } = serverResponse.body;
    const rtbBids = seatbid
      .map(seatbid => seatbid.bid)
      .reduce((a, b) => a.concat(b), []);

    return rtbBids.map(rtbBid => {
      let prBid = {
        requestId: bidRequest.bidId,
        cpm: rtbBid.price,
        currency: cur || 'USD',
        width: rtbBid.w,
        height: rtbBid.h,
        creativeId: rtbBid.adid,

        netRevenue: true,
        ttl: DEFAULT_TTL,

        meta: {
          advertiserDomains: rtbBid.adomain && rtbBid.adomain.length > 0 ? rtbBid.adomain : [],
        }
      };

      prBid.ad = rtbBid.adm;

      return prBid;
    });
  },
}

registerBidder(spec);
