import { isStr, _each, getBidIdParameter } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'nextMillennium';
const ENDPOINT = 'https://pbs.nextmillmedia.com/openrtb2/auction';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    return !!(
      bid.params.placement_id && isStr(bid.params.placement_id)
    );
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const requests = [];

    _each(validBidRequests, function(bid) {
      const postBody = {
        'id': bid.auctionId,
        'ext': {
          'prebid': {
            'storedrequest': {
              'id': getBidIdParameter('placement_id', bid.params)
            }
          }
        }
      }

      const gdprConsent = bidderRequest && bidderRequest.gdprConsent;
      const uspConsent = bidderRequest && bidderRequest.uspConsent

      if (gdprConsent || uspConsent) {
        postBody.regs = { ext: {} }

        if (uspConsent) {
          postBody.regs.ext.us_privacy = uspConsent;
        }
        if (typeof gdprConsent.gdprApplies !== 'undefined') {
          postBody.regs.ext.gdpr = gdprConsent.gdprApplies ? 1 : 0;
        }
        if (typeof gdprConsent.consentString !== 'undefined') {
          postBody.user = {
            ext: { consent: gdprConsent.consentString }
          }
        }
      }

      requests.push({
        method: 'POST',
        url: ENDPOINT,
        data: JSON.stringify(postBody),
        options: {
          contentType: 'application/json',
          withCredentials: true
        },
        bidId: bid.bidId
      });
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    const response = serverResponse.body;
    const bidResponses = [];

    _each(response.seatbid, (resp) => {
      _each(resp.bid, (bid) => {
        bidResponses.push({
          requestId: bidRequest.bidId,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          creativeId: bid.adid,
          currency: response.cur,
          netRevenue: false,
          ttl: TIME_TO_LIVE,
          meta: {
            advertiserDomains: bid.adomain || []
          },
          ad: bid.adm
        });
      });
    });

    return bidResponses;
  }
};

registerBidder(spec);
