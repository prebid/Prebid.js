import { registerBidder } from 'src/adapters/bidderFactory'
import * as utils from 'src/utils'
import { BANNER } from 'src/mediaTypes'

const BIDDER_CODE = 'rdn'
// TODO
const ENDPOINT = 'http://localhost:5000/h'

export const spec = {
  code: BIDDER_CODE,
  aliases: ['rdn'],
  isBidRequestValid: bid => !!bid.params.adSpotId,
  buildRequests: validBidRequests => {
    const bidRequests = []
    validBidRequests.forEach(bid => {
      const params = bid.params
      bidRequests.push({
        method: 'GET',
        url: ENDPOINT,
        data: {
          bi: bid.bidId,
          t: params.adSpotId,
          s: document.location.protocol,
          ua: navigator.userAgent,
          l:
            navigator.browserLanguage ||
            navigator.language ||
            navigator.userLanguage,
          d: document.domain,
          tp: encodeURIComponent(utils.getTopWindowUrl()),
          pp: encodeURIComponent(utils.getTopWindowReferrer())
        }
      })
    })
    return bidRequests
  },
  interpretResponse: (response, request) => {
    const sb = response.body
    const bidResponses = []
    bidResponses.push({
      requestId: sb.bid_id,
      cpm: sb.cpm || 0,
      width: sb.width || 0,
      height: sb.height || 0,
      creativeId: sb.creative_id || 0,
      dealId: sb.deal_id || '',
      currency: sb.currency || 'JPY',
      netRevenue: (sb.net_revenue === undefined) ? true : sb.net_revenue,
      mediaType: BANNER,
      ttl: sb.ttl,
      referrer: utils.getTopWindowUrl(),
      ad: sb.ad
    })

    return bidResponses
  }
}

registerBidder(spec)
