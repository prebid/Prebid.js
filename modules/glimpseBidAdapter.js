import { BANNER } from '../src/mediaTypes.js'
import { config } from '../src/config.js'
import { getStorageManager } from '../src/storageManager.js'
import { isArray } from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'

const GVLID = 1012
const BIDDER_CODE = 'glimpse'
const storageManager = getStorageManager({bidderCode: BIDDER_CODE})
const ENDPOINT = 'https://api.glimpsevault.io/ads/serving/public/v1/prebid'
const LOCAL_STORAGE_KEY = {
  vault: {
    jwt: 'gp_vault_jwt',
  },
}

export const spec = {
  gvlid: GVLID,
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid
   * @param bid {BidRequest} The bid to validate
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    return (
      hasValue(bid) &&
      hasValue(bid.params) &&
      hasStringValue(bid.params.placementId)
    )
  },

  /**
   * Builds http request for Glimpse bids
   * @param validBidRequests {BidRequest[]}
   * @param bidderRequest {BidderRequest}
   * @returns {ServerRequest}
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const auth = getVaultJwt()
    const referer = getReferer(bidderRequest)
    const gdprConsent = getGdprConsentChoice(bidderRequest)
    const bidRequests = validBidRequests.map(processBidRequest)
    const firstPartyData = getFirstPartyData()

    const data = {
      auth,
      data: {
        referer,
        gdprConsent,
        bidRequests,
        site: firstPartyData.site,
        user: firstPartyData.user,
        bidderCode: spec.code,
      }
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(data),
      options: {},
    }
  },

  /**
   * Parse response from Glimpse server
   * @param bidResponse {ServerResponse}
   * @returns {Bid[]}
   */
  interpretResponse: (bidResponse) => {
    const isValidResponse = isValidBidResponse(bidResponse)

    if (isValidResponse) {
      const {auth, data} = bidResponse.body
      setVaultJwt(auth)
      return data.bids
    }

    return []
  },
}

function setVaultJwt(auth) {
  storageManager.setDataInLocalStorage(LOCAL_STORAGE_KEY.vault.jwt, auth)
}

function getVaultJwt() {
  return storageManager.getDataFromLocalStorage(LOCAL_STORAGE_KEY.vault.jwt) || ''
}

function getReferer(bidderRequest) {
  const hasReferer =
    hasValue(bidderRequest) &&
    hasValue(bidderRequest.refererInfo) &&
    hasStringValue(bidderRequest.refererInfo.referer)

  if (hasReferer) {
    return bidderRequest.refererInfo.referer
  }

  return ''
}

function getGdprConsentChoice(bidderRequest) {
  const hasGdprConsent =
    hasValue(bidderRequest) &&
    hasValue(bidderRequest.gdprConsent)

  if (hasGdprConsent) {
    const gdprConsent = bidderRequest.gdprConsent
    const hasGdprApplies = hasBooleanValue(gdprConsent.gdprApplies)

    return {
      consentString: gdprConsent.consentString || '',
      vendorData: gdprConsent.vendorData || {},
      gdprApplies: hasGdprApplies ? gdprConsent.gdprApplies : true,
    }
  }

  return {
    consentString: '',
    vendorData: {},
    gdprApplies: false,
  }
}

function processBidRequest(bidRequest) {
  const demand = bidRequest.params.demand || 'glimpse'
  const sizes = normalizeSizes(bidRequest.sizes)
  const keywords = bidRequest.params.keywords || {}

  return {
    demand,
    sizes,
    keywords,
    bidId: bidRequest.bidId,
    placementId: bidRequest.params.placementId,
    unitCode: bidRequest.adUnitCode,
  }
}

function normalizeSizes(sizes) {
  const isSingleSize =
    isArray(sizes) &&
    sizes.length === 2 &&
    !isArray(sizes[0]) &&
    !isArray(sizes[1])

  if (isSingleSize) {
    return [sizes]
  }

  return sizes
}

function getFirstPartyData() {
  const siteKeywords = parseGlobalKeywords('site')
  const userKeywords = parseGlobalKeywords('user')

  const siteAttributes = getConfig('ortb2.site.ext.data', {})
  const userAttributes = getConfig('ortb2.user.ext.data', {})

  return {
    site: {
      keywords: siteKeywords,
      attributes: siteAttributes,
    },
    user: {
      keywords: userKeywords,
      attributes: userAttributes,
    },
  }
}

function parseGlobalKeywords(scope) {
  const keywords = getConfig(`ortb2.${scope}.keywords`, '')

  return keywords
    .split(', ')
    .filter((keyword) => keyword !== '')
}

function getConfig(path, defaultValue) {
  return config.getConfig(path) || defaultValue
}

function isValidBidResponse(bidResponse) {
  return (
    hasValue(bidResponse) &&
    hasValue(bidResponse.body) &&
    hasValue(bidResponse.body.data) &&
    hasArrayValue(bidResponse.body.data.bids) &&
    hasStringValue(bidResponse.body.auth)
  )
}

function hasValue(value) {
  return (
    value !== undefined &&
    value !== null
  )
}

function hasBooleanValue(value) {
  return (
    hasValue(value) &&
    typeof value === 'boolean'
  )
}

function hasStringValue(value) {
  return (
    hasValue(value) &&
    typeof value === 'string' &&
    value.length > 0
  )
}

function hasArrayValue(value) {
  return (
    hasValue(value) &&
    isArray(value) &&
    value.length > 0
  )
}

registerBidder(spec)
