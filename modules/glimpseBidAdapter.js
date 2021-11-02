import { BANNER } from '../src/mediaTypes.js'
import { getStorageManager } from '../src/storageManager.js'
import { isArray } from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'

const storageManager = getStorageManager()

const BIDDER_CODE = 'glimpse'
const ENDPOINT = 'https://api.glimpsevault.io/ads/serving/public/v1/prebid'
const LOCAL_STORAGE_KEY = {
  glimpse: {
    jwt: 'gp_vault_jwt',
  },
}

export const spec = {
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
    const networkId = window.networkId || -1
    const bids = validBidRequests.map(processBidRequest)
    const referer = getReferer(bidderRequest)
    const gdprConsent = getGdprConsentChoice(bidderRequest)
    const jwt = getVaultJwt()

    const data = {
      auth: jwt,
      data: {
        bidderCode: spec.code,
        networkId,
        bids,
        referer,
        gdprConsent,
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
   * @param bidRequest {BidRequest}
   * @returns {Bid[]}
   */
  interpretResponse: (bidResponse, bidRequest) => {
    const isValidResponse = isValidBidResponse(bidResponse)

    if (isValidResponse) {
      const {auth, data} = bidResponse.body
      setVaultJwt(auth)
      return data.bids
    }

    return []
  },
}

function processBidRequest(bidRequest) {
  const sizes = normalizeSizes(bidRequest.sizes)
  const keywords = bidRequest.params.keywords || []

  return {
    bidId: bidRequest.bidId,
    placementId: bidRequest.params.placementId,
    unitCode: bidRequest.adUnitCode,
    sizes,
    keywords,
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
    hasValue(bidderRequest.gdprConsent)

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
  storageManager.setDataInLocalStorage(LOCAL_STORAGE_KEY.glimpse.jwt, auth)
}

function getVaultJwt() {
  return storageManager.getDataFromLocalStorage(LOCAL_STORAGE_KEY.glimpse.jwt) || ''
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
