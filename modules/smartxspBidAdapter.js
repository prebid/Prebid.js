import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {find} from '../src/polyfill.js';

const SMARTXSP_CONFIG = {
  bidRequestUrl: 'https://tag.smartxsp.io/pbjs/bid',
  method: 'POST'
}

const BIDDER_CODE = 'smartxsp';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && bid.params.token && bid.params.placementId);
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    var i
    var j
    var bid
    var bidParam
    var bidParams = []
    var sizes
    var frameWidth = Math.round(window.screen.width)
    var frameHeight = Math.round(window.screen.height)
    for (i = 0; i < validBidRequests.length; i++) {
      bid = validBidRequests[i]
      if (bid.sizes) {
        sizes = bid.sizes
      } else if (typeof (BANNER) != 'undefined' && bid.mediaTypes && bid.mediaTypes[BANNER] && bid.mediaTypes[BANNER].sizes) {
        sizes = bid.mediaTypes[BANNER].sizes
      } else if (frameWidth && frameHeight) {
        sizes = [[frameWidth, frameHeight]]
      } else {
        sizes = []
      }
      for (j = 0; j < sizes.length; j++) {
        bidParam = {
          token: bid.params.token || '',
          bidId: bid.bidId,
          'banner-format-width': sizes[j][0],
          'banner-format-height': sizes[j][1]
        }
        if (bid.params.bannerFormat) {
          bidParam['banner-format'] = bid.params.bannerFormat
        }
        if (bid.params.language) {
          bidParam.language = bid.params.language
        }
        if (bid.params.region) {
          bidParam.region = bid.params.region
        }
        if (bid.params.regions && (bid.params.regions instanceof String || (bid.params.regions instanceof Array && bid.params.regions.length))) {
          bidParam.regions = bid.params.regions
          if (bidParam.regions instanceof Array) {
            bidParam.regions = bidParam.regions.join(',')
          }
        }
        bidParams.push(bidParam)
      }
    }

    var ServerRequestObjects = {
      method: SMARTXSP_CONFIG.method,
      url: SMARTXSP_CONFIG.bidRequestUrl,
      bids: validBidRequests,
      data: {bidParams: bidParams, auctionId: bidderRequest.auctionId}
    }
    return ServerRequestObjects;
  },
  interpretResponse: function (serverResponse, bidRequest) {
    var i
    var bid
    var bidObject
    var url
    var html
    var ad
    var ads
    var token
    var language
    var scriptId
    var bidResponses = []
    ads = serverResponse.body
    for (i = 0; i < ads.length; i++) {
      ad = ads[i]
      bid = find(bidRequest.bids, bid => bid.bidId === ad.bidId)
      if (bid) {
        
        bidObject = {
          requestId: bid.bidId,
          cpm: ad.cpm,
          width: parseInt(ad.bannerFormatWidth),
          height: parseInt(ad.bannerFormatHeight),
          creativeId: ad.id,
          netRevenue: !!ad.netRevenue,
          currency: ad.currency,
          ttl: ad.ttl,
          ad: ad.ad,
          meta: {
            advertiserDomains: ad.domains,
            advertiserName: ad.title
          }
        }
        bidResponses.push(bidObject);
      }
    }
    return bidResponses;
  }
}
registerBidder(spec)
