import * as utils from '../src/utils'
import { registerBidder } from '../src/adapters/bidderFactory'
import find from 'core-js/library/fn/array/find'
import { VIDEO, BANNER } from '../src/mediaTypes'

const ENDPOINT = 'https://ad.yieldlab.net'
const BIDDER_CODE = 'yieldlab'
const BID_RESPONSE_TTL_SEC = 300
const CURRENCY_CODE = 'EUR'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO, BANNER],

  isBidRequestValid: function (bid) {
    if (bid && bid.params && bid.params.adslotId && bid.params.supplyId) {
      return true
    }
    return false
  },

  /**
   * This method should build correct URL
   * @param validBidRequests
   * @returns {{method: string, url: string}}
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const adslotIds = []
    const timestamp = Date.now()
    const query = {
      ts: timestamp,
      json: true
    }

    utils._each(validBidRequests, function (bid) {
      adslotIds.push(bid.params.adslotId)
      if (bid.params.targeting) {
        query.t = createQueryString(bid.params.targeting)
      }
    })

    if (bidderRequest && bidderRequest.gdprConsent) {
      query.gdpr = (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
      if (query.gdpr) {
        query.consent = bidderRequest.gdprConsent.consentString
      }
    }

    const adslots = adslotIds.join(',')
    const queryString = createQueryString(query)

    return {
      method: 'GET',
      url: `${ENDPOINT}/yp/${adslots}?${queryString}`,
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
        const primarysize = bidRequest.sizes.length === 2 && !utils.isArray(bidRequest.sizes[0]) ? bidRequest.sizes : bidRequest.sizes[0]
        const customsize = bidRequest.params.adSize !== undefined ? parseSize(bidRequest.params.adSize) : primarysize
        const extId = bidRequest.params.extId !== undefined ? '&id=' + bidRequest.params.extId : ''
        const bidResponse = {
          requestId: bidRequest.bidId,
          cpm: matchedBid.price / 100,
          width: bidRequest.params.useSlotSize !== undefined ? primarysize[0] : customsize[0],
          height: bidRequest.params.useSlotSize !== undefined ? primarysize[1] : customsize[1],
          creativeId: '' + matchedBid.id,
          dealId: (matchedBid['c.dealid']) ? matchedBid['c.dealid'] : matchedBid.pid,
          currency: CURRENCY_CODE,
          netRevenue: false,
          ttl: BID_RESPONSE_TTL_SEC,
          referrer: '',
          ad: `<script src="${ENDPOINT}/d/${matchedBid.id}/${bidRequest.params.supplyId}/${customsize[0]}x${customsize[1]}?ts=${timestamp}${extId}"></script>`
        }

        if (isVideo(bidRequest)) {
          bidResponse.mediaType = VIDEO
          bidResponse.vastUrl = `${ENDPOINT}/d/${matchedBid.id}/${bidRequest.params.supplyId}/${customsize[0]}x${customsize[1]}?ts=${timestamp}${extId}`
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

/**
 * Creates a querystring out of an object with key-values
 * @param {Object} obj
 * @returns {String}
 */
function createQueryString (obj) {
  let str = []
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]))
    }
  }
  return str.join('&')
}

registerBidder(spec)
