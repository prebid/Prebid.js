import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
import {find} from '../src/polyfill.js';

const SMARTICO_CONFIG = {
  bidRequestUrl: 'https://trmads.eu/preBidRequest',
  widgetUrl: 'https://trmads.eu/get',
  method: 'POST'
}

const BIDDER_CODE = 'smartico';

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
      method: SMARTICO_CONFIG.method,
      url: SMARTICO_CONFIG.bidRequestUrl,
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
        token = bid.params.token || ''

        language = bid.params.language || SMARTICO_CONFIG.language || ''

        scriptId = encodeURIComponent('smartico-widget-' + bid.params.placementId + '-' + i)

        url = SMARTICO_CONFIG.widgetUrl + '?token=' + encodeURIComponent(token) + '&auction-id=' + encodeURIComponent(bid.auctionId) + '&from-auction-buffer=1&own_session=1&ad=' + encodeURIComponent(ad.id) + '&scriptid=' + scriptId + (ad.bannerFormatAlias ? '&banner-format=' + encodeURIComponent(ad.bannerFormatAlias) : '') + (language ? '&language=' + encodeURIComponent(language) : '')

        html = '<script id="' + scriptId + '" async defer type="text/javascript" src="' + url + '"><\/script>'

        bidObject = {
          requestId: bid.bidId,
          cpm: ad.cpm,
          width: parseInt(ad.bannerFormatWidth),
          height: parseInt(ad.bannerFormatHeight),
          creativeId: ad.id,
          netRevenue: !!ad.netRevenue,
          currency: ad.currency,
          ttl: ad.ttl,
          ad: html,
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
