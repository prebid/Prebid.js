import {
  deepAccess,
  deepSetValue, getBidIdParameter,
  isStr,
  logMessage,
  triggerPixel,
} from '../src/utils.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';
import {BANNER} from '../src/mediaTypes.js';

import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'holid'
const GVLID = 1177
const ENDPOINT = 'https://helloworld.holid.io/openrtb2/auction'
const COOKIE_SYNC_ENDPOINT = 'https://null.holid.io/sync.html'
const TIME_TO_LIVE = 300
const TMAX = 500
let wurlMap = {}

events.on(EVENTS.BID_WON, bidWonHandler)

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return !!bid.params.adUnitID
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map((bid) => {
      const requestData = {
        ...bid.ortb2,
        source: {schain: bid.schain},
        id: bidderRequest.bidderRequestId,
        imp: [getImp(bid)],
        tmax: TMAX,
        ...buildStoredRequest(bid)
      }

      if (bid.userIdAsEids) {
        deepSetValue(requestData, 'user.ext.eids', bid.userIdAsEids)
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

        addWurl(requestId, wurl)

        bidResponses.push(bidResponse)
      })
    })

    return bidResponses
  },

  getUserSyncs(optionsType, serverResponse, gdprConsent, uspConsent) {
    const syncs = [{
      type: 'image',
      url: 'https://track.adform.net/Serving/TrackPoint/?pm=2992097&lid=132720821'
    }]

    if (!serverResponse || serverResponse.length === 0) {
      return syncs
    }

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
    }

    return syncs
  },
}

function getImp(bid) {
  const imp = buildStoredRequest(bid)
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

function buildStoredRequest(bid) {
  return {
    ext: {
      prebid: {
        storedrequest: {
          id: getBidIdParameter('adUnitID', bid.params),
        },
      },
    },
  }
}

function getBidders(serverResponse) {
  const bidders = serverResponse
    .map((res) => Object.keys(res.body.ext.responsetimemillis || []))
    .flat(1)

  if (bidders.length) {
    return encodeURIComponent(JSON.stringify([...new Set(bidders)]))
  }
}

function addWurl(requestId, wurl) {
  if (isStr(requestId)) {
    wurlMap[requestId] = wurl
  }
}

function removeWurl(requestId) {
  delete wurlMap[requestId]
}

function getWurl(requestId) {
  if (isStr(requestId)) {
    return wurlMap[requestId]
  }
}

function bidWonHandler(bid) {
  const wurl = getWurl(bid.requestId)
  if (wurl) {
    logMessage(`Invoking image pixel for wurl on BID_WIN: "${wurl}"`)
    triggerPixel(wurl)
    removeWurl(bid.requestId)
  }
}

registerBidder(spec)
