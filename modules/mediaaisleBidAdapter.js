import * as utils from '../src/utils.js';
import { registerBidder } from 'src/adapters/bidderFactory';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
const BIDDER_CODE = 'mediaaisle';
const baseUrl =  'https://prometheus-ix.ecdrsvc.com/prometheus/bid';
export const spec = {
    code: BIDDER_CODE,
    gvlid: none,
    isBidRequestValid: function(bid) {
      if (bid.BIDDER_CODE !== BIDDER_CODE || typeof bid.params === 'undefined') {
        return false;
      }
      return !!bid.params.ppid
    },
    buildRequests: function(validBidRequests, bidderRequest) {
      const referer = bidderRequest.refererInfo.referer || '';
      const fpd = config.getConfig('ortb2');

      return validBidRequests.map((bidRequest) => {
        let req = {
          url: baseUrl,
          method: 'POST',
          data: {
            v: $$PREBID_GLOBAL$$.version,
            referer: referer,
            bidId: bidRequest.bidId,
            auctionId: bidRequest.auctionId,
            transactionId: bidRequest.transactionId,
            adUnitCode: bidRequest.adUnitCode,
            bidRequestCount: bidRequest.bidRequestCount,
            params: bidRequest.params,
            sizes: bidRequest.sizes,
            mediaTypes: bidRequest.mediaTypes,
            fpd: fpd ? JSON.stringify(fpd) : JSON.stringify({})
          }
        };
        return req;
      });
    },
    interpretResponse: function(serverResponse, request) {
      const bidResponses = [];
      if (serverResponse.body) {
        const body = serverResponse.body;
        const bidResponse = {
          requestId: body.requestId,
          cpm: body.cpm,
          width: body.width,
          height: body.height,
          ad: '<div>' + body.creative + '</div>'
        }
        bidResponses.push(bidResponse);
      }
      return bidResponses;
    },
    getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {},
    onTimeout: function(timeoutData) {},
    onBidWon: function(bid) {},
    onSetTargeting: function(bid) {},
    onBidderError: function({ error, bidderRequest }) {},
    supportedMediaTypes: [BANNER]
}
registerBidder(spec);