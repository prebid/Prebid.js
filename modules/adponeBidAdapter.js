import {BANNER} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {triggerPixel} from '../src/utils.js';

const ADPONE_CODE = 'adpone';
const ADPONE_ENDPOINT = 'https://rtb.adpone.com/bid-request';
const ADPONE_REQUEST_METHOD = 'POST';
const ADPONE_CURRENCY = 'EUR';

export const spec = {
  code: ADPONE_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: bid => {
    return !!bid.params.placementId && !!bid.bidId && bid.bidder === 'adpone'
  },

  buildRequests: (bidRequests, bidderRequest) => {
    return bidRequests.map(bid => {
      let url = ADPONE_ENDPOINT + '?pid=' + bid.params.placementId;
      const data = {
        at: 1,
        id: bid.bidId,
        imp: bid.sizes.map((size, index) => (
          {
            id: bid.bidId + '_' + index,
            banner: {
              w: size[0],
              h: size[1]
            }
          }))
      };

      const options = {
        withCredentials: true
      };

      if (bidderRequest && bidderRequest.gdprConsent) {
        url += '&gdpr_applies=' + bidderRequest.gdprConsent.gdprApplies;
        url += '&consentString=' + bidderRequest.gdprConsent.consentString;
      }

      return {
        method: ADPONE_REQUEST_METHOD,
        url,
        data,
        options,
      };
    });
  },

  interpretResponse: (serverResponse, bidRequest) => {
    if (!serverResponse || !serverResponse.body) {
      return [];
    }

    let answer = [];

    serverResponse.body.seatbid.forEach(seatbid => {
      if (seatbid.bid.length) {
        answer = [...answer, ...seatbid.bid.filter(bid => bid.price > 0).map(adponeBid => {
          const bid = {
            id: adponeBid.id,
            requestId: bidRequest.data.id,
            cpm: adponeBid.price,
            ad: adponeBid.adm,
            width: adponeBid.w || 0,
            height: adponeBid.h || 0,
            currency: serverResponse.body.cur || ADPONE_CURRENCY,
            netRevenue: true,
            ttl: 300,
            creativeId: adponeBid.crid || 0
          };

          if (adponeBid.meta && adponeBid.meta.adomain && adponeBid.meta.adomain.length > 0) {
            bid.meta = {};
            bid.meta.advertiserDomains = adponeBid.meta.adomain;
          }

          return bid
        })];
      }
    });

    return answer;
  },

  onBidWon: bid => {
    const bidString = JSON.stringify(bid);
    const encodedBuf = window.btoa(bidString);
    triggerPixel(`https://rtb.adpone.com/prebid/analytics?q=${encodedBuf}`);
  },

};

registerBidder(spec);
