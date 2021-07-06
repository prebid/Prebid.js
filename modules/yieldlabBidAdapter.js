import * as utils from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import find from 'core-js-pure/features/array/find.js'
import { VIDEO, BANNER } from '../src/mediaTypes.js'
import { Renderer } from '../src/Renderer.js'

const ENDPOINT = 'https://ad.yieldlab.net'
const BIDDER_CODE = 'yieldlab'
const BID_RESPONSE_TTL_SEC = 300
const CURRENCY_CODE = 'EUR'
const OUTSTREAMPLAYER_URL = 'https://ad.adition.com/dynamic.ad?a=o193092&ma_loadEvent=ma-start-event'
const GVLID = 70

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
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
        query.t = createTargetingString(bid.params.targeting)
      }
      if (bid.userIdAsEids && Array.isArray(bid.userIdAsEids)) {
        query.ids = createUserIdString(bid.userIdAsEids)
      }
      if (bid.params.customParams && utils.isPlainObject(bid.params.customParams)) {
        for (let prop in bid.params.customParams) {
          query[prop] = bid.params.customParams[prop]
        }
      }
      if (bid.schain && utils.isPlainObject(bid.schain) && Array.isArray(bid.schain.nodes)) {
        query.schain = createSchainString(bid.schain)
      }
    })

    if (bidderRequest) {
      if (bidderRequest.refererInfo && bidderRequest.refererInfo.referer) {
        query.pubref = bidderRequest.refererInfo.referer
      }

      if (bidderRequest.gdprConsent) {
        query.gdpr = (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
        if (query.gdpr) {
          query.consent = bidderRequest.gdprConsent.consentString
        }
      }
    }

    const adslots = adslotIds.join(',')
    const queryString = createQueryString(query)

    return {
      method: 'GET',
      url: `${ENDPOINT}/yp/${adslots}?${queryString}`,
      validBidRequests: validBidRequests,
      queryParams: query
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
    const reqParams = originalBidRequest.queryParams

    originalBidRequest.validBidRequests.forEach(function (bidRequest) {
      if (!serverResponse.body) {
        return
      }

      let matchedBid = find(serverResponse.body, function (bidResponse) {
        return bidRequest.params.adslotId == bidResponse.id
      })

      if (matchedBid) {
        const adUnitSize = bidRequest.sizes.length === 2 && !utils.isArray(bidRequest.sizes[0]) ? bidRequest.sizes : bidRequest.sizes[0]
        const adSize = bidRequest.params.adSize !== undefined ? parseSize(bidRequest.params.adSize) : (matchedBid.adsize !== undefined) ? parseSize(matchedBid.adsize) : adUnitSize
        const extId = bidRequest.params.extId !== undefined ? '&id=' + bidRequest.params.extId : ''
        const adType = matchedBid.adtype !== undefined ? matchedBid.adtype : ''
        const gdprApplies = reqParams.gdpr ? '&gdpr=' + reqParams.gdpr : ''
        const gdprConsent = reqParams.consent ? '&consent=' + reqParams.consent : ''
        const pvId = matchedBid.pvid !== undefined ? '&pvid=' + matchedBid.pvid : ''

        const bidResponse = {
          requestId: bidRequest.bidId,
          cpm: matchedBid.price / 100,
          width: adSize[0],
          height: adSize[1],
          creativeId: '' + matchedBid.id,
          dealId: (matchedBid['c.dealid']) ? matchedBid['c.dealid'] : matchedBid.pid,
          currency: CURRENCY_CODE,
          netRevenue: false,
          ttl: BID_RESPONSE_TTL_SEC,
          referrer: '',
          ad: `<script src="${ENDPOINT}/d/${matchedBid.id}/${bidRequest.params.supplyId}/?ts=${timestamp}${extId}${gdprApplies}${gdprConsent}${pvId}"></script>`,
          meta: {
            advertiserDomains: (matchedBid.advertiser) ? matchedBid.advertiser : 'n/a'
          }
        }

        if (isVideo(bidRequest, adType)) {
          const playersize = getPlayerSize(bidRequest)
          if (playersize) {
            bidResponse.width = playersize[0]
            bidResponse.height = playersize[1]
          }
          bidResponse.mediaType = VIDEO
          bidResponse.vastUrl = `${ENDPOINT}/d/${matchedBid.id}/${bidRequest.params.supplyId}/?ts=${timestamp}${extId}${gdprApplies}${gdprConsent}${pvId}`
          if (isOutstream(bidRequest)) {
            const renderer = Renderer.install({
              id: bidRequest.bidId,
              url: OUTSTREAMPLAYER_URL,
              loaded: false
            })
            renderer.setRender(outstreamRender)
            bidResponse.renderer = renderer
          }
        }

        bidResponses.push(bidResponse)
      }
    })
    return bidResponses
  }
};

/**
 * Is this a video format?
 * @param {Object} format
 * @param {String} adtype
 * @returns {Boolean}
 */
function isVideo (format, adtype) {
  return utils.deepAccess(format, 'mediaTypes.video') && adtype.toLowerCase() === 'video'
}

/**
 * Is this an outstream context?
 * @param {Object} format
 * @returns {Boolean}
 */
function isOutstream (format) {
  let context = utils.deepAccess(format, 'mediaTypes.video.context')
  return (context === 'outstream')
}

/**
 * Gets optional player size
 * @param {Object} format
 * @returns {Array}
 */
function getPlayerSize (format) {
  let playerSize = utils.deepAccess(format, 'mediaTypes.video.playerSize')
  return (playerSize && utils.isArray(playerSize[0])) ? playerSize[0] : playerSize
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
 * Creates a string out of an array of eids with source and uid
 * @param {Array} eids
 * @returns {String}
 */
function createUserIdString (eids) {
  let str = []
  for (let i = 0; i < eids.length; i++) {
    str.push(eids[i].source + ':' + eids[i].uids[0].id)
  }
  return str.join(',')
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
      let val = obj[p]
      if (p !== 'schain') {
        str.push(encodeURIComponent(p) + '=' + encodeURIComponent(val))
      } else {
        str.push(p + '=' + val)
      }
    }
  }
  return str.join('&')
}

/**
 * Creates an unencoded targeting string out of an object with key-values
 * @param {Object} obj
 * @returns {String}
 */
function createTargetingString (obj) {
  let str = []
  for (var p in obj) {
    if (obj.hasOwnProperty(p)) {
      let key = p
      let val = obj[p]
      str.push(key + '=' + val)
    }
  }
  return str.join('&')
}

/**
 * Creates a string out of a schain object
 * @param {Object} schain
 * @returns {String}
 */
function createSchainString (schain) {
  const ver = schain.ver || ''
  const complete = (schain.complete === 1 || schain.complete === 0) ? schain.complete : ''
  const keys = ['asi', 'sid', 'hp', 'rid', 'name', 'domain', 'ext']
  const nodesString = schain.nodes.reduce((acc, node) => {
    return acc += `!${keys.map(key => node[key] ? encodeURIComponentWithBangIncluded(node[key]) : '').join(',')}`
  }, '')
  return `${ver},${complete}${nodesString}`
}

/**
 * Encodes URI Component with exlamation mark included. Needed for schain object.
 * @param {String} str
 * @returns {String}
 */
function encodeURIComponentWithBangIncluded(str) {
  return encodeURIComponent(str).replace(/!/g, '%21')
}

/**
 * Handles an outstream response after the library is loaded
 * @param {Object} bid
 */
function outstreamRender(bid) {
  bid.renderer.push(() => {
    window.ma_width = bid.width
    window.ma_height = bid.height
    window.ma_vastUrl = bid.vastUrl
    window.ma_container = bid.adUnitCode
    window.document.dispatchEvent(new Event('ma-start-event'))
  });
}

registerBidder(spec)
