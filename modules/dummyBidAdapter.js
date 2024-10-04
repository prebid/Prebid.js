import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

/**
 * Example ShowHeroes AdSource prebid config
 *
 *
    {
        "bidder": "dummy",
        "params": {
            "vastUrl": "https://video-library.showheroes.com/demo_vast/nivea_vast.xml",
            "supplyId": "1381604",
            "cpm": "10",
            "endpointURL": "https://httpstat.us/200"
        }
    }
 *
 */

export const spec = {
  code: 'dummy',
  gvlid: 424242,
  supportedMediaTypes: [VIDEO, BANNER, NATIVE],

  isBidRequestValid: function (bid) {
    return !bid.params.invalid;
  },
  buildRequests: function(validBidRequests) {

    const payloadString = JSON.stringify(validBidRequests);
    return {
      method: 'POST',
      url: validBidRequests[0].params.endpointURL,
      data: payloadString,
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    console.warn(serverResponse);
    console.warn(bidRequest)
    const bid = JSON.parse(bidRequest.data)?.[0];
    console.warn(bid)
    if (bid.params.nobid) {
      return []
    }
    const bidResponses = [];
    const bidResponse = {
      requestId: bid.bidId,
      cpm: bid.params.cpm,
      vastUrl: bid.params.vastUrl,
      ttl: 360,
      currency: 'EUR',
      width: bid.sizes[0][0],
      height: bid.sizes[0][1],
      creativeId: 11123,
      netRevenue: true,
    };
    bidResponses.push(bidResponse);
    return bidResponses;
  },

  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent
  ) {
    const syncs = [];
    return syncs;
  },
  onTimeout: function (data) {},
  onBidWon: function (bid) {},

  onSetTargeting: function (bid) {},

  onBidderError: function () {},
};

registerBidder(spec);
