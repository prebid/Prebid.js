import {BANNER} from '../src/mediaTypes.js'
import {registerBidder} from '../src/adapters/bidderFactory.js'
import {replaceAuctionPrice, generateUUID, isPlainObject, isArray} from '../src/utils.js'

const BIDDER_CODE = 'MediaConsortium'
const SYNC_ENDPOINT = 'https://relay.hubvisor.io/v1/sync/big'
const AUCTION_ENDPOINT = 'https://relay.hubvisor.io/v1/auction/big'
export const OPTIMIZATIONS_STORAGE_KEY = 'media_consortium_optimizations'

const SYNC_TYPES = {
  image: 'image',
  redirect: 'image',
  iframe: 'iframe'
}

export const spec = {
  version: '0.0.1',
  code: BIDDER_CODE,
  gvlid: 1112,
  supportedMediaTypes: [BANNER],
  isBidRequestValid(bid) {
    return true
  },
  buildRequests(bidRequests, bidderRequest) {
    const {
      auctionId,
      bids,
      gdprConsent: {gdprApplies = false, consentString} = {},
      ortb2: {device, site}
    } = bidderRequest
    const currentTimestamp = Date.now()
    const optimizations = getOptimizationsFromLocalStorage()

    const impressions = bids.reduce((acc, bidRequest) => {
      const {bidId, adUnitCode, mediaTypes} = bidRequest
      const optimization = optimizations[adUnitCode]

      if (optimization) {
        const {expiresAt, isEnabled} = optimization

        if (expiresAt >= currentTimestamp && !isEnabled) {
          return acc
        }
      }

      return acc.concat({id: bidId, adUnitCode, mediaTypes})
    }, [])

    if (!impressions.length) {
      return
    }

    const request = {
      id: auctionId ?? generateUUID(),
      impressions,
      device,
      site,
      user: {
        ids: {}
      },
      regulations: {
        gdpr: {
          applies: gdprApplies,
          consentString
        }
      },
      timeout: 3600
    }

    const fpId = getFpIdFromLocalStorage()

    if (fpId) {
      request.user.ids['1plusX'] = fpId
    }

    const syncData = {
      gdpr: gdprApplies,
      ad_unit_codes: impressions.map(({adUnitCode}) => adUnitCode).join(',')
    }

    if (consentString) {
      syncData.gdpr_consent = consentString
    }

    return [
      {
        method: 'GET',
        url: SYNC_ENDPOINT,
        data: syncData
      },
      {
        method: 'POST',
        url: AUCTION_ENDPOINT,
        data: request
      }
    ]
  },
  interpretResponse(serverResponse, params) {
    if (!isValidResponse(serverResponse)) return []

    const {body: {bids, optimizations}} = serverResponse

    if (optimizations && isArray(optimizations)) {
      const currentTimestamp = Date.now()

      const optimizationsToStore = optimizations.reduce((acc, optimization) => {
        const {adUnitCode, isEnabled, ttl} = optimization

        return {
          ...acc,
          [adUnitCode]: {isEnabled, expiresAt: currentTimestamp + ttl}
        }
      }, getOptimizationsFromLocalStorage())

      localStorage.setItem(OPTIMIZATIONS_STORAGE_KEY, JSON.stringify(optimizationsToStore))
    }

    return bids.map((bid) => {
      const {
        impressionId,
        price: {cpm, currency},
        dealId,
        ad: {
          creative: {id, mediaType, size: {width, height}, markup}
        },
        ttl = 360
      } = bid

      const markupWithMacroReplaced = replaceAuctionPrice(markup, cpm)

      return {
        requestId: impressionId,
        cpm,
        currency,
        dealId,
        ttl,
        netRevenue: true,
        creativeId: id,
        mediaType,
        width,
        height,
        ad: markupWithMacroReplaced,
        adUrl: null
      }
    })
  },
  getUserSyncs(syncOptions, serverResponses) {
    if (serverResponses.length !== 2) {
      return
    }

    const [sync] = serverResponses

    return sync.body?.bidders?.reduce((acc, {type, url}) => {
      const syncType = SYNC_TYPES[type]

      if (!syncType || !url) {
        return acc
      }

      return acc.concat({type: syncType, url})
    }, [])
  }
}

registerBidder(spec)

export function getOptimizationsFromLocalStorage() {
  try {
    const storedOptimizations = localStorage.getItem(OPTIMIZATIONS_STORAGE_KEY)

    return storedOptimizations ? JSON.parse(storedOptimizations) : {}
  } catch (err) {
    return {}
  }
}

function getFpIdFromLocalStorage() {
  try {
    return window.localStorage.getItem('ope_fpid')
  } catch (err) {
    return null
  }
}

function isValidResponse(response) {
  return isPlainObject(response) &&
      isPlainObject(response.body) &&
      isArray(response.body.bids)
}
