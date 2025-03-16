import { logMessage, getWindowLocation } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js'
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'bidscube'
const URL = 'https://supply.bidscube.com/?c=o&m=multi'
const URL_SYNC = 'https://supply.bidscube.com/?c=o&m=cookie'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: function (opts) {
    return Boolean(opts.bidId && opts.params && !isNaN(parseInt(opts.params.placementId)))
  },

  buildRequests: function (validBidRequests) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    validBidRequests = validBidRequests || []
    let winTop = window
    try {
      window.top.location.toString()
      winTop = window.top
    } catch (e) { logMessage(e) }

    const location = getWindowLocation()
    const placements = []

    for (let i = 0; i < validBidRequests.length; i++) {
      const p = validBidRequests[i]

      placements.push({
        placementId: p.params.placementId,
        bidId: p.bidId,
        traffic: p.params.traffic || BANNER,
        allParams: JSON.stringify(p)
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
        host: location.hostname,
        page: location.pathname,
        placements: placements
      }
    }
  },

  interpretResponse: function (opts) {
    const body = opts.body
    const response = []

    for (let i = 0; i < body.length; i++) {
      const item = body[i]
      if (isBidResponseValid(item)) {
        response.push(item)
      }
    }

    return response
  },

  getUserSyncs: function (syncOptions, serverResponses) {
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
