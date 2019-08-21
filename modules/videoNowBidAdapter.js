import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes'

const RTB_URL = 'https://bidder.videonow.ru/prebid'

const BIDDER_CODE = 'videonow'
const TTL_SECONDS = 60 * 5;

function isBidRequestValid(bid) {
  const { params } = bid || {}
  return !!(params.pId);
}

function buildRequest(bid, bidderRequest) {
  const { refererInfo } = bidderRequest
  const { ext, bidId, params, code, sizes } = bid;
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
      ref: refererInfo && refererInfo.referer
    }
  }

  ext && Object.keys(ext).forEach(key => {
    dto[`ext_${key}`] = ext.key
  })

  return dto;
}

function buildRequests(validBidRequests, bidderRequest) {
  utils.logInfo(`${BIDDER_CODE}. buildRequests`)
  const requests = [];
  validBidRequests.forEach(validBidRequest => {
    const request = buildRequest(validBidRequest, bidderRequest);
    request && requests.push(request);
  });
  return requests;
}

function interpretResponse(serverResponse, bidRequest) {
  if (!serverResponse || !serverResponse.body) {
    return [];
  }
  const { id: bidId } = (bidRequest && bidRequest.data) || {}
  if (!bidId) return []

  const { seatbid, cur, ext } = serverResponse.body;
  if (!seatbid || !seatbid.length) return []

  const { placementId } = ext || {}
  if (!placementId) return []

  const bids = []
  seatbid.forEach(sb => {
    const { bid } = sb
    if (bid && bid.length) {
      bid.forEach(b => {
        const res = createResponseBid(b, bidId, cur, placementId)
        res && bids.push(res)
      })
    }
  })

  return bids
}

function createResponseBid(bidInfo, bidId, cur, placementId) {
  const { id, nurl, code, price, crid, adm, ttl, netRevenue, w, h } = bidInfo

  if (!id || !price) {
    return null;
  }

  if (!adm) {
    utils.logError(`${BIDDER_CODE}. adm not exists in the response`)
    return null
  }

  try {
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
        url: nurl,
        render: function() {
          const d = window.document
          const el = placementId && d.getElementById(placementId)
          if (!el) {
            console.error(`bidAdapter ${BIDDER_CODE}: ${placementId} not found`)
          }

          el.innerHTML = adm
          reInitScripts(el)
        }
      }
    }
  } catch (e) {
    return null
  }
}

function getUserSyncs(syncOptions, serverResponses) {
  const syncs = []

  if (!serverResponses || !serverResponses.length) return syncs

  serverResponses.forEach(response => {
    const {ext} = (response && response.body) || {}
    const {pixels, iframes} = ext || {}

    if (syncOptions.iframeEnabled && iframes && iframes.length) {
      iframes.forEach(i => syncs.push({
        type: 'iframe',
        url: i
      })
      )
    }

    if (syncOptions.pixelEnabled && pixels && pixels.length) {
      pixels.forEach(p => syncs.push({
        type: 'image',
        url: p
      })
      )
    }
  })

  utils.logInfo(`${BIDDER_CODE} getUserSyncs() syncs=${syncs.length}`)
  return syncs
}

function onBidWon(bid) {
  const { nurl } = bid
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
  onTimeout: function(timeoutData) {},
  onBidWon
}

registerBidder(spec);

function reInitScripts(container, shouldReInitInlineScripts = true, delay = 10) {
  const oldScripts = container.querySelectorAll('script')
  const innerScriptsInsertActions = []

  oldScripts && oldScripts.length && Array.from(oldScripts).forEach(oldScr => {
    const { parentNode } = oldScr
    const scriptElement = document.createElement('script')
    oldScr.attributes && Array.from(oldScr.attributes).forEach(attr => {
      scriptElement.setAttribute(attr.name, attr.value)
    })

    if (oldScr.src) {
      innerScriptsInsertActions.push(() => {
        ((function(parent, scriptElm, src) {
          scriptElm.src = src
          parent.appendChild(scriptElm)
        })(parentNode, scriptElement, oldScr.src))
      })
    }

    if (oldScr.innerHTML && shouldReInitInlineScripts) {
      innerScriptsInsertActions.push(() => {
        ((function(parent, scriptElm, scriptText) {
          scriptElm.innerHTML = scriptText
          parent.appendChild(scriptElm)
        })(parentNode, scriptElement, oldScr.innerHTML))
      })
    }
    parentNode.removeChild(oldScr)
  })

  innerScriptsInsertActions.length && setTimeout(() => {
    innerScriptsInsertActions.forEach(si => si())
  }, delay)
}
