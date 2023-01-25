import {
  deepAccess,
  getBidIdParameter,
  isStr,
  logMessage,
  triggerPixel,
} from '../src/utils.js'
import * as events from '../src/events.js'
import CONSTANTS from '../src/constants.json'
import { BANNER } from '../src/mediaTypes.js'

import { registerBidder } from '../src/adapters/bidderFactory.js'

const BIDDER_CODE = 'holid'
const GVLID = 1177
const ENDPOINT = 'https://helloworld.holid.io/openrtb2/auction'
const COOKIE_SYNC_ENDPOINT = 'https://null.holid.io/sync.html'
const TIME_TO_LIVE = 300
let wurlMap = {}

events.on(CONSTANTS.EVENTS.BID_WON, bidWonHandler)

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return !!bid.params.adUnitID
  },

  buildRequests: function (validBidRequests, _bidderRequest) {
    return validBidRequests.map((bid) => {
      const requestData = {
        ...bid.ortb2,
        id: bid.auctionId,
        imp: [getImp(bid)],
      }

      return {
        method: 'POST',
        url: ENDPOINT,
        data: JSON.stringify(requestData),
        bidId: bid.bidId,
      }
    })
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = []

    if (!serverResponse.body.seatbid) {
      return []
    }

    serverResponse.body.seatbid.map((response) => {
      response.bid.map((bid) => {
        const requestId = bidRequest.bidId
        const auctionId = bidRequest.auctionId
        const wurl = deepAccess(bid, 'ext.prebid.events.win')
        const bidResponse = {
          requestId,
          cpm: bid.price,
          width: bid.w,
          height: bid.h,
          ad: bid.adm,
          creativeId: bid.crid,
          currency: serverResponse.body.cur,
          netRevenue: true,
          ttl: TIME_TO_LIVE,
        }

        addWurl({ auctionId, requestId, wurl })

        bidResponses.push(bidResponse)
      })
    })

    return bidResponses
  },

  getUserSyncs(optionsType, serverResponse, gdprConsent, uspConsent) {
    if (!serverResponse || serverResponse.length === 0) {
      return []
    }

    const syncs = []
    const bidders = getBidders(serverResponse)

    if (optionsType.iframeEnabled && bidders) {
      const queryParams = []

      queryParams.push('bidders=' + bidders)
      queryParams.push('gdpr=' + +gdprConsent.gdprApplies)
      queryParams.push('gdpr_consent=' + gdprConsent.consentString)
      queryParams.push('usp_consent=' + (uspConsent || ''))

      let strQueryParams = queryParams.join('&')

      if (strQueryParams.length > 0) {
        strQueryParams = '?' + strQueryParams
      }

      syncs.push({
        type: 'iframe',
        url: COOKIE_SYNC_ENDPOINT + strQueryParams + '&type=iframe',
      })

      return syncs
    }

    return []
  },
}

function getImp(bid) {
  const imp = {
    ext: {
      prebid: {
        storedrequest: {
          id: getBidIdParameter('adUnitID', bid.params),
        },
      },
    },
  }
  const sizes =
    bid.sizes && !Array.isArray(bid.sizes[0]) ? [bid.sizes] : bid.sizes

  if (deepAccess(bid, 'mediaTypes.banner')) {
    imp.banner = {
      format: sizes.map((size) => {
        return { w: size[0], h: size[1] }
      }),
    }
  }

  return imp
}

function getBidders(serverResponse) {
  const bidders = serverResponse
    .map((res) => Object.keys(res.body.ext.responsetimemillis || []))
    .flat(1)

  if (bidders.length) {
    return encodeURIComponent(JSON.stringify([...new Set(bidders)]))
  }
}

function addWurl(auctionId, adId, wurl) {
  if ([auctionId, adId].every(isStr)) {
    wurlMap[`${auctionId}${adId}`] = wurl
  }
}

function removeWurl(auctionId, adId) {
  delete wurlMap[`${auctionId}${adId}`]
}

function getWurl(auctionId, adId) {
  if ([auctionId, adId].every(isStr)) {
    return wurlMap[`${auctionId}${adId}`]
  }
}

function bidWonHandler(bid) {
  const wurl = getWurl(bid.auctionId, bid.adId)
  if (wurl) {
    logMessage(`Invoking image pixel for wurl on BID_WIN: "${wurl}"`)
    triggerPixel(wurl)
    removeWurl(bid.auctionId, bid.adId)
  }
}

registerBidder(spec)
