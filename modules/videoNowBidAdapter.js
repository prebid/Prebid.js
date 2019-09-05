import * as utils from '../src/utils'
import { registerBidder } from '../src/adapters/bidderFactory'
import { BANNER } from '../src/mediaTypes'

const RTB_URL = 'https://bidder.videonow.ru/prebid'

const BIDDER_CODE = 'videonow'
const TTL_SECONDS = 60 * 5
const LS_ITEM_NAME = 'VN_DATA'

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

  const { vnInitModule, vnModule, format } = ext || {}

  const vnData = JSON.parse(localStorage.getItem(LS_ITEM_NAME) || '{}')
  let { vnModule: vnModuleCustom, vnInitModule: vnInitModuleCustom } = vnData

  const vnInitModulePath = vnInitModuleCustom || vnInitModule
  if (!vnInitModulePath) {
    utils.logError(`vnInitModulePath is not defined`)
    return null
  }

  const vntModulePath = vnModuleCustom || vnModule
  if (!vntModulePath) {
    utils.logError(`vntModulePath is not defined`)
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
      url: vntModulePath,
      render: function() {
        const d = window.document
        const el = placementId && d.getElementById(placementId)
        if (el) {
          // prepare data for vn_init script
          const profileData = {
            url: vntModulePath,
            dataXml: adm,
          }

          format && (profileData.format = format)

          // add init data for vn_init on the page
          window.videonow = {
            'init': { '1': profileData },
          }

          // add vn_init js on the page
          const scr = document.createElement('script')
          scr.src = `${vnInitModulePath}${~vnInitModulePath.indexOf('?') ? '&' : '?'}profileId=1`
          el && el.appendChild(scr)
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
    const img = document.createElement('img')
    img.src = utils.replaceAuctionPrice(nurl, bid.cpm)
    img.style.cssText = 'display:none !important;'
    document.body.appendChild(img)
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
