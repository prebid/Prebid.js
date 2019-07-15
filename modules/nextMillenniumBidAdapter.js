import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';

const BIDDER_CODE = 'nextMillennium';
const HOST = 'https://brainlyads.com';
const CURRENCY = 'USD';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function(bid) {
    return !!(
      bid.params.placement_id && utils.isNumber(bid.params.placement_id)
    );
  },

  buildRequests: function(validBidRequests) {
    let requests = [];

    utils._each(validBidRequests, function(bid) {
      requests.push({
        method: 'POST',
        url: HOST + '/hb/s2s',
        options: {
          contentType: 'application/json',
          withCredentials: true
        },
        data: JSON.stringify({
          placement_id: utils.getBidIdParameter('placement_id', bid.params)
        }),
        bidId: bid.bidId
      });
    });

    return requests;
  },

  interpretResponse: function(serverResponse, bidRequest) {
    try {
      const bidResponse = serverResponse.body;
      const bidResponses = [];

      if (Number(bidResponse.cpm) > 0) {
        bidResponses.push({
          requestId: bidRequest.bidId,
          cpm: bidResponse.cpm,
          width: bidResponse.width,
          height: bidResponse.height,
          creativeId: bidResponse.creativeId,
          currency: CURRENCY,
          netRevenue: false,
          ttl: TIME_TO_LIVE,
          ad: bidResponse.ad
        });
      }

      return bidResponses;
    } catch (err) {
      utils.logError(err);
      return [];
    }
  },

  getUserSyncs: function(syncOptions) {
    const syncs = []
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: HOST + '/hb/s2s/matching'
      });
    }

    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: HOST + '/hb/s2s/matching'
      });
    }
    return syncs;
  }
};
registerBidder(spec);
