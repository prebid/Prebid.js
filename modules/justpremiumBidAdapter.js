import { registerBidder } from 'src/adapters/bidderFactory'
import { getTopWindowLocation } from 'src/utils'

const BIDDER_CODE = 'justpremium'
const ENDPOINT_URL = getTopWindowLocation().protocol + '//pre.ads.justpremium.com/v/2.1/t/xhr'
const pixels = []

export const spec = {
  code: BIDDER_CODE,
  time: 60000,

  isBidRequestValid: (bid) => {
    return !!(bid && bid.params && bid.params.zone)
  },

  buildRequests: (validBidRequests) => {
    let bidIab = []
    let bidRest = []
    let reqTab = []
    validBidRequests.forEach(el => {
      if (el.params.adType && el.params.adType === 'iab') {
        bidIab.push(el)
      } else {
        bidRest.push(el)
      }
    })
    if (bidIab.length > 0) {
      reqTab.push(createBid(bidIab))
    }
    if (bidRest.length > 0) {
      reqTab.push(createBid(bidRest))
    }
    return reqTab
  },

  interpretResponse: (serverResponse, bidRequests) => {
    const body = serverResponse.body
    let bidResponses = []
    bidRequests.bids.forEach(adUnit => {
      let bid = findBid(adUnit, body)
      if (bid) {
        let size = (adUnit.sizes && adUnit.sizes.length && adUnit.sizes[0]) || []
        let width = bid.adType === 'iab' ? bid.width : (size[0] || bid.width)
        let height = bid.adType === 'iab' ? bid.height : (size[1] || bid.height)
        let bidResponse = {
          requestId: bid.rid,
          creativeId: bid.id,
          width: width,
          height: height,
          ad: bid.adm,
          cpm: bid.price,
          netRevenue: true,
          currency: bid.currency || 'USD',
          ttl: bid.ttl || spec.time
        }
        bidResponses.push(bidResponse)
      }
    })

    return bidResponses
  },

  getUserSyncs: (syncOptions) => {
    if (syncOptions.iframeEnabled) {
      pixels.push({
        type: 'iframe',
        src: '//us-u.openx.net/w/1.0/pd?plm=10&ph=26e53f82-d199-49df-9eca-7b350c0f9646'
      })
    }
    return pixels
  }
}

function createBid (validBidRequests) {
  const json = prepareJSON(validBidRequests)
  const dim = getWebsiteDim()
  const payload = {
    hostname: getTopWindowLocation().hostname,
    protocol: getTopWindowLocation().protocol.replace(':', ''),
    sw: dim.screenWidth,
    sh: dim.screenHeight,
    ww: dim.innerWidth,
    wh: dim.innerHeight,
    json: json
  }
  const payloadString = JSON.stringify(payload)

  return {
    method: 'POST',
    url: ENDPOINT_URL + '?i=' + (+new Date()),
    data: payloadString,
    bids: validBidRequests
  }
}

function prepareJSON (requests) {
  let requestCondition = []
  requests.forEach((request) => {
    let req = {
      zone: request.params.zone,
      reqId: request.bidId,
      adType: request.params.adType,
      sizes: request.sizes,
      transactionId: request.transactionId
    }
    if (request.params.exclude) {
      req.exclude = request.params.exclude
    }
    if (request.params.allow) {
      req.allow = request.params.allow
    }
    requestCondition.push(req)
  })
  return requestCondition
}

function findBid (adUnit, bids) {
  let params = adUnit.params
  let len = bids.length
  while (len--) {
    const bid = bids[len]
    if (bid.adType === 'iab') {
      if (adUnit.bidId === bid.rid) {
        return bids.splice(len, 1).pop()
      }
    } else {
      if (passCond(params, bid)) {
        return bids.splice(len, 1).pop()
      }
    }
  }

  return false
}

function passCond (params, bid) {
  const format = bid.format

  if (params.allow && params.allow.length) {
    return params.allow.indexOf(format) > -1
  }

  if (params.exclude && params.exclude.length) {
    return params.exclude.indexOf(format) < 0
  }

  return true
}

function getWebsiteDim () {
  let top
  try {
    top = window.top
  } catch (e) {
    top = window
  }

  return {
    screenWidth: top.screen.width,
    screenHeight: top.screen.height,
    innerWidth: top.innerWidth,
    innerHeight: top.innerHeight
  }
}

registerBidder(spec)
