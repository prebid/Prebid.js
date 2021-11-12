import { BANNER } from '../src/mediaTypes.js'
import { config } from '../src/config.js'
import { getStorageManager } from '../src/storageManager.js'
import { isArray } from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'

const storageManager = getStorageManager()

const GVLID = 1012
const BIDDER_CODE = 'glimpse'
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
    const demo = config.getConfig('glimpse.demo') || false
    const account = config.getConfig('glimpse.account') || -1
    const demand = config.getConfig('glimpse.demand') || 'glimpse'
    const keywords = config.getConfig('glimpse.keywords') || {}

    const auth = getVaultJwt()
    const referer = getReferer(bidderRequest)
    const gdprConsent = getGdprConsentChoice(bidderRequest)
    const bids = validBidRequests.map((bidRequest) => {
      return processBidRequest(bidRequest, keywords)
    })

    const data = {
      auth,
      data: {
        bidderCode: spec.code,
        demo,
        account,
        demand,
        referer,
        gdprConsent,
        bids,
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

function processBidRequest(bidRequest, globalKeywords) {
  const sizes = normalizeSizes(bidRequest.sizes)
  const bidKeywords = bidRequest.params.keywords || {}
  const keywords = {
    ...globalKeywords,
    ...bidKeywords,
  }

  return {
    unitCode: bidRequest.adUnitCode,
    bidId: bidRequest.bidId,
    placementId: bidRequest.params.placementId,
    keywords,
    sizes,
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
    hasValue(bidderRequest.gdprConsent) &&
    hasStringValue(bidderRequest.gdprConsent.consentString)

  if (hasGdprConsent) {
    return bidderRequest.gdprConsent
  }

  return {
    consentString: '',
    vendorData: {},
    gdprApplies: false,
  }
}

function setVaultJwt(auth) {
  storageManager.setDataInLocalStorage(LOCAL_STORAGE_KEY.vault.jwt, auth)
}

function getVaultJwt() {
  return storageManager.getDataFromLocalStorage(LOCAL_STORAGE_KEY.vault.jwt) || ''
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
