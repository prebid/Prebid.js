import {registerBidder} from '../src/adapters/bidderFactory.js';
import {find} from '../src/polyfill.js';
import {BANNER} from '../src/mediaTypes.js';

const ENDPOINT = 'https://prebid.mes.glomex.cloud/request-bid'
const BIDDER_CODE = 'glomex'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    if (bid && bid.params && bid.params.integrationId) {
      return true
    }
    return false
  },

  buildRequests: function (validBidRequests, bidderRequest = {}) {
    const refererInfo = bidderRequest.refererInfo || {};
    const gdprConsent = bidderRequest.gdprConsent || {};

    return {
      method: 'POST',
      url: `${ENDPOINT}`,
      data: {
        auctionId: bidderRequest.auctionId,
        refererInfo: {
          // TODO: this collects everything it finds, except for canonicalUrl
          isAmp: refererInfo.isAmp,
          numIframes: refererInfo.numIframes,
          reachedTop: refererInfo.reachedTop,
          referer: refererInfo.topmostLocation,
        },
        gdprConsent: {
          consentString: gdprConsent.consentString,
          gdprApplies: gdprConsent.gdprApplies
        },
        bidRequests: validBidRequests.map(({ params, sizes, bidId, adUnitCode }) => ({
          bidId,
          adUnitCode,
          params,
          sizes
        }))
      },
      options: {
        withCredentials: false,
        contentType: 'application/json'
      },
      validBidRequests: validBidRequests,
    }
  },

  interpretResponse: function (serverResponse, originalBidRequest) {
    const bidResponses = []

    originalBidRequest.validBidRequests.forEach(function (bidRequest) {
      if (!serverResponse.body) {
        return
      }

      const matchedBid = find(serverResponse.body.bids, function (bid) {
        return String(bidRequest.bidId) === String(bid.id)
      })

      if (matchedBid) {
        const bidResponse = {
          requestId: bidRequest.bidId,
          cpm: matchedBid.cpm,
          width: matchedBid.width,
          height: matchedBid.height,
          creativeId: matchedBid.creativeId,
          dealId: matchedBid.dealId,
          currency: matchedBid.currency,
          netRevenue: matchedBid.netRevenue,
          ttl: matchedBid.ttl,
          ad: matchedBid.ad,
          meta: {
            advertiserDomains: matchedBid.adomain ? matchedBid.adomain : []
          }
        }

        bidResponses.push(bidResponse)
      }
    })
    return bidResponses
  }
};

registerBidder(spec)
