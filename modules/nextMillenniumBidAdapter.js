import * as utils from '../src/utils.js';
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
      bid.params.placement_id && utils.isStr(bid.params.placement_id)
    );
  },

  buildRequests: function(validBidRequests) {
    let requests = [];

    utils._each(validBidRequests, function(bid) {
      requests.push({
        method: 'POST',
        url: ENDPOINT,
        options: {
          contentType: 'application/json',
          withCredentials: true
        },
        data: JSON.stringify({
          'ext': {
            'prebid': {
              'storedrequest': {
                'id': utils.getBidIdParameter('placement_id', bid.params)
              }
            }
          }
        }),
        bidId: bid.bidId
      });
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    const response = serverResponse.body;
    const bidResponses = [];

    try {
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
      })
    } catch (err) {
      utils.logError(err);
    }
    return bidResponses;
  }
};
registerBidder(spec);
