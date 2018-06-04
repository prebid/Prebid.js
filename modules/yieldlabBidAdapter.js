import * as utils from 'src/utils'
import { registerBidder } from 'src/adapters/bidderFactory'
import find from 'core-js/library/fn/array/find'
import { VIDEO, BANNER } from 'src/mediaTypes'

const ENDPOINT = 'https://ad.yieldlab.net'
const BIDDER_CODE = 'yieldlab'
const BID_RESPONSE_TTL_SEC = 300
const CURRENCY_CODE = 'EUR'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: function (bid) {
    if (bid && bid.params && bid.params.adslotId && bid.params.adSize) {
      return true
    }
    return false
  },

  /**
   * This method should build correct URL
   * @param validBidRequests
   * @returns {{method: string, url: string}}
   */
  buildRequests: function (validBidRequests) {
    const adslotIds = []
    const timestamp = Date.now()

    utils._each(validBidRequests, function (bid) {
      adslotIds.push(bid.params.adslotId)
    })

    const adslots = adslotIds.join(',')

    return {
      method: 'GET',
      url: `${ENDPOINT}/yp/${adslots}?ts=${timestamp}&json=true`,
      validBidRequests: validBidRequests
    }
  },

  /**
   * Map ad values and pricing and stuff
   * @param serverResponse
   * @param originalBidRequest
   */
  interpretResponse: function (serverResponse, originalBidRequest) {
    const bidResponses = []
    const timestamp = Date.now()

    originalBidRequest.validBidRequests.forEach(function (bidRequest) {
      if (!serverResponse.body) {
        return
      }

      let matchedBid = find(serverResponse.body, function (bidResponse) {
        return bidRequest.params.adslotId == bidResponse.id
      })

      if (matchedBid) {
        const sizes = parseSize(bidRequest.params.adSize)
        const bidResponse = {
          requestId: bidRequest.bidId,
          cpm: matchedBid.price / 100,
          width: sizes[0],
          height: sizes[1],
          creativeId: '' + matchedBid.id,
          dealId: matchedBid.pid,
          currency: CURRENCY_CODE,
          netRevenue: false,
          ttl: BID_RESPONSE_TTL_SEC,
          referrer: '',
          ad: `<script src="${ENDPOINT}/d/${matchedBid.id}/${bidRequest.params.supplyId}/${sizes[0]}x${sizes[1]}?ts=${timestamp}"></script>`
        }
        if (isVideo(bidRequest)) {
          bidResponse.mediaType = VIDEO
          bidResponse.vastUrl = `${ENDPOINT}/d/${matchedBid.id}/${bidRequest.params.supplyId}/${sizes[0]}x${sizes[1]}?ts=${timestamp}`
        }

        bidResponses.push(bidResponse)
      }
    })
    return bidResponses
  }
};

/**
 * Is this a video format?
 * @param {String} format
 * @returns {Boolean}
 */
function isVideo (format) {
  return utils.deepAccess(format, 'mediaTypes.video')
}

/**
 * Expands a 'WxH' string as a 2-element [W, H] array
 * @param {String} size
 * @returns {Array}
 */
function parseSize (size) {
  return size.split('x').map(Number)
}

registerBidder(spec)
