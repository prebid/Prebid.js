import * as utils from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { BANNER } from '../src/mediaTypes.js'
import { loadExternalScript } from '../src/adloader.js'

const RTB_URL = 'https://bidder.videonow.ru/prebid'

const BIDDER_CODE = 'videonow'
const TTL_SECONDS = 60 * 5

function isBidRequestValid(bid) {
  return !!(bid && bid.params && bid.params.pId)
}

function buildRequest(bid, bidderRequest) {
  const { refererInfo } = bidderRequest
  const { ext, bidId, params, code, sizes } = bid
  const { pId, bidFloor, cur, placementId, url: rtbUrl } = params || {}

  let url = rtbUrl || RTB_URL
  url = `${url}${~url.indexOf('?') ? '&' : '?'}profile_id=${pId}`

  const dto = {
    method: 'POST',
    url,
    data: {
      id: bidId,
      cpm: bidFloor,
      code,
      sizes,
      cur: cur || 'RUB',
      placementId,
      ref: refererInfo && refererInfo.referer,
    },
  }

  ext && Object.keys(ext).forEach(key => {
    dto.data[`ext_${key}`] = ext[key]
  })

  return dto
}

function buildRequests(validBidRequests, bidderRequest) {
  utils.logInfo(`${BIDDER_CODE}. buildRequests`)
  const requests = []
  validBidRequests.forEach(validBidRequest => {
    const request = buildRequest(validBidRequest, bidderRequest)
    request && requests.push(request)
  })
  return requests
}

function interpretResponse(serverResponse, bidRequest) {
  if (!serverResponse || !serverResponse.body) {
    return []
  }
  const { id: bidId } = (bidRequest && bidRequest.data) || {}
  if (!bidId) return []

  const { seatbid, cur, ext } = serverResponse.body
  if (!seatbid || !seatbid.length) return []

  const { placementId } = ext || {}
  if (!placementId) return []

  const bids = []
  seatbid.forEach(sb => {
    const { bid } = sb
    bid && bid.length && bid.forEach(b => {
      const res = createResponseBid(b, bidId, cur, placementId)
      res && bids.push(res)
    })
  })

  return bids
}

function createResponseBid(bidInfo, bidId, cur, placementId) {
  const { id, nurl, code, price, crid, ext, ttl, netRevenue, w, h, adm } = bidInfo

  if (!id || !price || !adm) {
    return null
  }

  const { init: initPath, module, format } = ext || {}
  if (!initPath) {
    utils.logError(`vnInitModulePath is not defined`)
    return null
  }

  const { log, min } = module || {}

  if (!min && !log) {
    utils.logError('module\'s paths are not defined')
    return null
  }

  return {
    requestId: bidId,
    cpm: price,
    width: w,
    height: h,
    creativeId: crid,
    currency: cur || 'RUB',
    netRevenue: netRevenue !== undefined ? netRevenue : true,
    ttl: ttl || TTL_SECONDS,
    ad: code,
    nurl,
    renderer: {
      url: min || log,
      render: function() {
        const d = window.document
        const el = placementId && d.getElementById(placementId)
        if (el) {
          const pId = 1
          // prepare data for vn_init script
          const profileData = {
            module,
            dataXml: adm,
          }

          format && (profileData.format = format)

          // add init data for vn_init on the page
          const videonow = window.videonow = window.videonow || {}
          const init = videonow.init = window.videonow.init || {}
          init[pId] = profileData

          // add vn_init js on the page
          loadExternalScript(`${initPath}${~initPath.indexOf('?') ? '&' : '?'}profileId=${pId}`, 'outstream')
        } else {
          utils.logError(`bidAdapter ${BIDDER_CODE}: ${placementId} not found`)
        }
      }
    }
  }
}

function getUserSyncs(syncOptions, serverResponses) {
  const syncs = []

  if (!serverResponses || !serverResponses.length) return syncs

  serverResponses.forEach(response => {
    const { ext } = (response && response.body) || {}
    const { pixels, iframes } = ext || {}

    if (syncOptions.iframeEnabled && iframes && iframes.length) {
      iframes.forEach(i => syncs.push({
        type: 'iframe',
        url: i,
      }),
      )
    }

    if (syncOptions.pixelEnabled && pixels && pixels.length) {
      pixels.forEach(p => syncs.push({
        type: 'image',
        url: p,
      }),
      )
    }
  })

  utils.logInfo(`${BIDDER_CODE} getUserSyncs() syncs=${syncs.length}`)
  return syncs
}

function onBidWon(bid) {
  const { nurl } = bid || {}
  if (nurl) {
    utils.triggerPixel(utils.replaceAuctionPrice(nurl, bid.cpm));
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon
}

registerBidder(spec)
