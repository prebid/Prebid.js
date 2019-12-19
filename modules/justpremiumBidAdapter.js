import { registerBidder } from '../src/adapters/bidderFactory'
import { deepAccess } from '../src/utils';

const BIDDER_CODE = 'justpremium'
const ENDPOINT_URL = 'https://pre.ads.justpremium.com/v/2.0/t/xhr'
const JP_ADAPTER_VERSION = '1.7'
const pixels = []

export const spec = {
  code: BIDDER_CODE,
  time: 60000,

  isBidRequestValid: (bid) => {
    return !!(bid && bid.params && bid.params.zone)
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    const c = preparePubCond(validBidRequests)
    const dim = getWebsiteDim()
    const payload = {
      zone: validBidRequests.map(b => {
        return parseInt(b.params.zone)
      }).filter((value, index, self) => {
        return self.indexOf(value) === index
      }),
      referer: bidderRequest.refererInfo.referer,
      sw: dim.screenWidth,
      sh: dim.screenHeight,
      ww: dim.innerWidth,
      wh: dim.innerHeight,
      c: c,
      id: validBidRequests[0].params.zone,
      sizes: {}
    }
    validBidRequests.forEach(b => {
      const zone = b.params.zone
      const sizes = payload.sizes
      sizes[zone] = sizes[zone] || []
      sizes[zone].push.apply(sizes[zone], b.mediaTypes && b.mediaTypes.banner && b.mediaTypes.banner.sizes)
    })

    if (deepAccess(validBidRequests[0], 'userId.pubcid')) {
      payload.pubcid = deepAccess(validBidRequests[0], 'userId.pubcid')
    } else if (deepAccess(validBidRequests[0], 'crumbs.pubcid')) {
      payload.pubcid = deepAccess(validBidRequests[0], 'crumbs.pubcid')
    }

    payload.uids = validBidRequests[0].userId

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr_consent = {
        consent_string: bidderRequest.gdprConsent.consentString,
        consent_required: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
      }
    }

    if (bidderRequest && bidderRequest.uspConsent) {
      payload.us_privacy = bidderRequest.uspConsent
    }

    payload.version = {
      prebid: '$prebid.version$',
      jp_adapter: JP_ADAPTER_VERSION
    }

    const payloadString = JSON.stringify(payload)

    return {
      method: 'POST',
      url: ENDPOINT_URL + '?i=' + (+new Date()),
      data: payloadString,
      bids: validBidRequests
    }
  },

  interpretResponse: (serverResponse, bidRequests) => {
    const body = serverResponse.body
    let bidResponses = []
    bidRequests.bids.forEach(adUnit => {
      let bid = findBid(adUnit.params, body.bid)
      if (bid) {
        let size = (adUnit.mediaTypes && adUnit.mediaTypes.banner && adUnit.mediaTypes.banner.sizes && adUnit.mediaTypes.banner.sizes.length && adUnit.mediaTypes.banner.sizes[0]) || []
        let bidResponse = {
          requestId: adUnit.bidId,
          creativeId: bid.id,
          width: size[0] || bid.width,
          height: size[1] || bid.height,
          ad: bid.adm,
          cpm: bid.price,
          netRevenue: true,
          currency: bid.currency || 'USD',
          ttl: bid.ttl || spec.time,
          format: bid.format
        }
        bidResponses.push(bidResponse)
      }
    })
    return bidResponses
  },

  getUserSyncs: function getUserSyncs(syncOptions, responses, gdprConsent, uspConsent) {
    let url = 'https://pre.ads.justpremium.com/v/1.0/t/sync' + '?_c=' + 'a' + Math.random().toString(36).substring(7) + Date.now();
    if (gdprConsent && (typeof gdprConsent.gdprApplies === 'boolean')) {
      url = url + '&consentString=' + encodeURIComponent(gdprConsent.consentString)
    }
    if (uspConsent) {
      url = url + '&usPrivacy=' + encodeURIComponent(uspConsent)
    }
    if (syncOptions.iframeEnabled) {
      pixels.push({
        type: 'iframe',
        url: url
      })
    }
    return pixels
  },
}

function findBid (params, bids) {
  const tagId = params.zone
  if (bids[tagId]) {
    let len = bids[tagId].length
    while (len--) {
      if (passCond(params, bids[tagId][len])) {
        return bids[tagId].splice(len, 1).pop()
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

function preparePubCond (bids) {
  const cond = {}
  const count = {}

  bids.forEach((bid) => {
    const params = bid.params
    const zone = params.zone

    if (cond[zone] === 1) {
      return
    }

    const allow = params.allow || params.formats || []
    const exclude = params.exclude || []

    if (allow.length === 0 && exclude.length === 0) {
      return cond[params.zone] = 1
    }

    cond[zone] = cond[zone] || [[], {}]
    cond[zone][0] = arrayUnique(cond[zone][0].concat(allow))
    exclude.forEach((e) => {
      if (!cond[zone][1][e]) {
        cond[zone][1][e] = 1
      } else {
        cond[zone][1][e]++
      }
    })

    count[zone] = count[zone] || 0
    if (exclude.length) {
      count[zone]++
    }
  })

  Object.keys(count).forEach((zone) => {
    if (cond[zone] === 1) return

    const exclude = []
    Object.keys(cond[zone][1]).forEach((format) => {
      if (cond[zone][1][format] === count[zone]) {
        exclude.push(format)
      }
    })
    cond[zone][1] = exclude
  })

  Object.keys(cond).forEach((zone) => {
    if (cond[zone] !== 1 && cond[zone][1].length) {
      cond[zone][0].forEach((r) => {
        let idx = cond[zone][1].indexOf(r)
        if (idx > -1) {
          cond[zone][1].splice(idx, 1)
        }
      })
      cond[zone][0].length = 0
    }

    if (cond[zone] !== 1 && !cond[zone][0].length && !cond[zone][1].length) {
      cond[zone] = 1
    }
  })

  return cond
}

function arrayUnique (array) {
  const a = array.concat()
  for (let i = 0; i < a.length; ++i) {
    for (let j = i + 1; j < a.length; ++j) {
      if (a[i] === a[j]) {
        a.splice(j--, 1)
      }
    }
  }

  return a
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
