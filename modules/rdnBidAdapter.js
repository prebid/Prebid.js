import { registerBidder } from 'src/adapters/bidderFactory'
import * as utils from 'src/utils'

const BIDDER_CODE = 'rdn'
const ENDPOINT = ''

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
          a: params.adSpotId,
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
    const bidResponses = []
    response.body.forEach(sb => {
      const bidResponse = {
        requestId: sb.RequestId,
        cpm: sb.CPM * 1000 || 0,
        width: sb.Width || 0,
        height: sb.Height || 0,
        creativeId: sb.CreativeId || 0,
        dealId: sb.DealId || '',
        currency: sb.Currency || 'JPY',
        netRevenue: sb.NetRevenue,
        ttl: sb.TTL,
        referrer: utils.getTopWindowUrl(),
        ad: sb.ad
      }
      bidResponses.push(bidResponse)
    })

    return bidResponses
  }
}

registerBidder(spec)
