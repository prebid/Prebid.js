import { getWindowLocation, deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'trafficgate';
const URL = 'https://[HOST].bc-plugin.com/?c=o&m=multi'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: function (bid) {
    return !!(bid.bidId && bid.params && parseInt(bid.params.placementId) && bid.params.host)
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests) {
    if (validBidRequests && validBidRequests.length === 0) return [];

    const location = getWindowLocation()
    const placements = []

    validBidRequests.forEach((bidReq) => {
      placements.push({
        placementId: bidReq.params.placementId,
        bidId: bidReq.bidId,
        traffic: getMediatype(bidReq)
      })
    })

    return {
      method: 'POST',
      url: URL.replace('[HOST]', validBidRequests[0].params.host),
      data: {
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

function getMediatype(bidRequest) {
  if (deepAccess(bidRequest, 'mediaTypes.banner')) {
    return BANNER;
  }
  if (deepAccess(bidRequest, 'mediaTypes.video')) {
    return VIDEO;
  }
  if (deepAccess(bidRequest, 'mediaTypes.native')) {
    return NATIVE;
  }
}
