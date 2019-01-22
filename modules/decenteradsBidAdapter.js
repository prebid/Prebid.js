import { registerBidder } from '../src/adapters/bidderFactory'
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes'
import * as utils from '../src/utils'

const BIDDER_CODE = 'decenterads'
const URL = '//supply.decenterads.com/?c=o&m=multi'
const URL_SYNC = '//supply.decenterads.com/?c=o&m=cookie'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid ({ bidId, params }) {
    return Boolean(bidId && params && !isNaN(params.placementId))
  },

  buildRequests (validBidRequests = []) {
    let winTop = window
    try {
      window.top.location.toString()
      winTop = window.top
    }
    catch (e) { utils.logMessage(e) }

    const location = utils.getTopWindowLocation()
    const placements = []

    for (const { bidId, params } of validBidRequests) {
      placements.push({
        placementId: params.placementId,
        bidId: bidId,
        traffic: params.traffic || BANNER
      })
    }

    return {
      method: 'POST',
      url: URL,
      data: {
        deviceWidth: winTop.screen.width,
        deviceHeight: winTop.screen.height,
        language: (navigator && navigator.language) ? navigator.language : '',
        secure: +(location.protocol === 'https:'),
        host: location.host,
        page: location.pathname,
        placements: placements
      }
    }
  },

  interpretResponse ({ body }) {
    const response = []

    for (const item of body) {
      if (isBidResponseValid(item)) {
        delete item.mediaType
        response.push(item)
      }
    }

    return response
  },

  getUserSyncs (syncOptions, serverResponses) {
    return [{ type: 'image', url: URL_SYNC }]
  }

}

registerBidder(spec)

function isBidResponseValid (bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId ||
    !bid.ttl || !bid.currency) {
    return false
  }
  switch (bid['mediaType']) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad)
    case VIDEO:
      return Boolean(bid.vastUrl)
    case NATIVE:
      return Boolean(bid.title && bid.image && bid.impressionTrackers)
    default:
      return false
  }
}
