import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'nextMillennium';
const ENDPOINT = 'https://pbs.nextmillmedia.com/openrtb2/auction';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    return !!(
      bid.params.placement_id && utils.isStr(bid.params.placement_id)
    );
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const requests = [];

    utils._each(validBidRequests, function(bid) {
      const postBody = {
        'id': bid.auctionId,
        'ext': {
          'prebid': {
            'storedrequest': {
              'id': utils.getBidIdParameter('placement_id', bid.params)
            }
          }
        }
      }
      const gdprConsent = bidderRequest && bidderRequest.gdprConsent;

      if (gdprConsent) {
        if (typeof gdprConsent.gdprApplies !== 'undefined') {
          postBody.gdprApplies = !!gdprConsent.gdprApplies;
        }
        if (typeof gdprConsent.consentString !== 'undefined') {
          postBody.consentString = gdprConsent.consentString;
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

    utils._each(response.seatbid, (resp) => {
      utils._each(resp.bid, (bid) => {
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
