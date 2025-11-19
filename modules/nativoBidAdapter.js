import { deepAccess, isEmpty } from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js'
import { getGlobal } from '../src/prebidGlobal.js'
import { ortbConverter } from '../libraries/ortbConverter/converter.js'

const converter = ortbConverter({
  context: {
    // `netRevenue` and `ttl` are required properties of bid responses - provide a default for them
    netRevenue: true, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: 30, // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context)
    imp.tagid = bidRequest.adUnitCode
    if (!imp.ext) imp.ext = {}
    if (bidRequest.params.placementId) {
      imp.ext.placementId = bidRequest.params.placementId
    }

    return imp
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context)

    // Add Nativo-specific extensions
    if (!request.ext) request.ext = {}
    request.ext.nativo = {
      prebid: {
        version: localPbjsRef.version || '0.0.0'
      },
      duplicateRequests: adUnitsRequested,
      filtering: {
        adFilterIds: Array.from(adsToFilter),
        advertiserFilterIds: Array.from(advertisersToFilter),
        campaignFilterIds: Array.from(campaignsToFilter)
      }
    }

    return request
  }
})

const BIDDER_CODE = 'nativo'
const BIDDER_ENDPOINT = 'https://exchange.postrelease.com/prebid'

const GVLID = 263

const SUPPORTED_AD_TYPES = [BANNER, VIDEO, NATIVE]

const localPbjsRef = getGlobal()

const adUnitsRequested = {}
const extData = {}

// Filtering
const adsToFilter = new Set()
const advertisersToFilter = new Set()
const campaignsToFilter = new Set()

// Prebid adapter referrence doc: https://docs.prebid.org/dev-docs/bidder-adaptor.html

// Validity checks for optional parameters
const validParameter = {
  url: (value) => typeof value === 'string',
  placementId: (value) => {
    const isString = typeof value === 'string'
    const isNumber = typeof value === 'number'
    return isString || isNumber
  },
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ['ntv'], // short code
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {Object} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    // We don't need any specific parameters to make a bid request
    if (!bid.params) return true

    // Check if any supplied parameters are invalid
    const hasInvalidParameters = Object.keys(bid.params).some((key) => {
      const value = bid.params[key]
      const validityCheck = validParameter[key]

      // We don't have a test for this so it's not a parameter we care about
      if (!validityCheck) return false

      // Return if the check is not passed
      return !validityCheck(value)
    })

    return !hasInvalidParameters
  },

  /**
   * Called when the page asks Prebid.js for bids
   * Make a server request from the list of BidRequests
   *
   * @param {Array} validBidRequests - An array of bidRequest objects, one for each AdUnit that your module is involved in. This array has been processed for special features like sizeConfig, so it’s the list that you should be looping through
   * @param {Object} bidderRequest - The master bidRequest object. This object is useful because it carries a couple of bid parameters that are global to all the bids.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    // Track duplicate ad unit requests
    validBidRequests.forEach((bidRequest) => {
      adUnitsRequested[bidRequest.adUnitCode] =
        adUnitsRequested[bidRequest.adUnitCode] !== undefined
          ? adUnitsRequested[bidRequest.adUnitCode] + 1
          : 0
    })

    // Generate OpenRTB request
    const openRTBData = converter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
    })

    const serverRequest = {
      method: 'POST',
      url: BIDDER_ENDPOINT,
      data: openRTBData,
      bidderRequest: bidderRequest,
    }

    return serverRequest
  },

  /**
   * Will be called when the browser has received the response from your server.
   * The function will parse the response and create a bidResponse object containing one or more bids.
   * The adapter should indicate no valid bids by returning an empty array.
   *
   * @param {Object} response - Data returned from the bidding server request endpoint
   * @param {Object} request - The request object used to call the server request endpoint
   * @return {Array} An array of bids which were nested inside the server.
   */
  interpretResponse: function (response, request) {
    // If the bid response was empty, return []
    if (!response || !response.body || isEmpty(response.body)) return []

    try {
      // Normalize the response body
      const body = typeof response.body === 'string'
        ? JSON.parse(response.body)
        : response.body

      // Store extension data for onBidWon filtering BEFORE converting
      // Store by both bid.id and bid.impid to handle different converter mappings
      body.seatbid?.forEach(seatbid => {
        seatbid.bid?.forEach(bid => {
          if (bid.ext) {
            extData[bid.id] = bid.ext
            extData[bid.impid] = bid.ext
          }
        })
      })

      // Use ortbConverter to parse the response
      const bids = converter.fromORTB({
        response: body,
        request: request.data
      }).bids

      return bids
    } catch (error) {
      // If there is an error, return []
      return []
    }
  },

  /**
   * All user ID sync activity should be done using the getUserSyncs callback of the BaseAdapter model.
   * Given an array of all the responses from the server, getUserSyncs is used to determine which user syncs should occur.
   * The order of syncs in the serverResponses array matters. The most important ones should come first, since publishers may limit how many are dropped on their page.
   * @param {Object} syncOptions - Which user syncs are allowed?
   * @param {Array} serverResponses - Array of server's responses
   * @param {Object} gdprConsent - GDPR consent data
   * @param {Object} uspConsent - USP consent data
   * @return {Array} The user syncs which should be dropped.
   */
  getUserSyncs: function (
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent
  ) {
    // Generate consent qs string
    let params = ''
    // GDPR
    if (gdprConsent) {
      params = appendQSParamString(
        params,
        'gdpr',
        gdprConsent.gdprApplies ? 1 : 0
      )
      params = appendQSParamString(
        params,
        'gdpr_consent',
        encodeURIComponent(gdprConsent.consentString || '')
      )
    }
    // CCPA
    if (uspConsent) {
      params = appendQSParamString(
        params,
        'us_privacy',
        encodeURIComponent(uspConsent.uspConsent)
      )
    }

    // Get sync urls from the respnse and inject cinbsent params
    const types = {
      iframe: syncOptions.iframeEnabled,
      image: syncOptions.pixelEnabled,
    }
    const syncs = []

    let body
    serverResponses.forEach((response) => {
      // If the bid response was empty, return []
      if (!response || !response.body || isEmpty(response.body)) {
        return syncs
      }

      try {
        body =
          typeof response.body === 'string'
            ? JSON.parse(response.body)
            : response.body
      } catch (err) {
        return
      }

      // Make sure we have valid content
      if (!body || !body.seatbid || body.seatbid.length === 0) return

      body.seatbid.forEach((seatbid) => {
        // Grab the syncs for each seatbid
        if (seatbid.syncUrls) {
          seatbid.syncUrls.forEach((sync) => {
            if (types[sync.type]) {
              if (sync.url.trim() !== '') {
                syncs.push({
                  type: sync.type,
                  url: sync.url.replace('{GDPR_params}', params),
                })
              }
            }
          })
        }
      })
    })

    return syncs
  },

  /**
   * Will be called when a bid from the adapter won the auction.
   * @param {Object} bid - The bid that won the auction
   */
  onBidWon: function (bid) {
    // Try multiple keys to find the ext data
    const ext = extData[bid.dealId] || extData[bid.requestId] || extData[bid.bidId]

    if (!ext) return

    appendFilterData(adsToFilter, ext.adsToFilter)
    appendFilterData(advertisersToFilter, ext.advertisersToFilter)
    appendFilterData(campaignsToFilter, ext.campaignsToFilter)
  },
}
registerBidder(spec)

// Utils

/**
 * Append QS param to existing string
 * @param {String} str - String to append to
 * @param {String} key - Key to append
 * @param {String} value - Value to append
 * @returns {String} Updated query string
 */
function appendQSParamString(str, key, value) {
  return str + `${str.length ? '&' : ''}${key}=${value}`
}

/**
 * Save any filter data from winning bid requests for subsequent requests
 * @param {Array} filter - The filter data bucket currently stored
 * @param {Array} filterData - The filter data to add
 */
function appendFilterData(filter, filterData) {
  if (filterData && Array.isArray(filterData) && filterData.length) {
    filterData.forEach((ad) => filter.add(ad))
  }
}

export function getPageUrlFromBidRequest(bidRequest) {
  let paramPageUrl = deepAccess(bidRequest, 'params.url')

  if (paramPageUrl === undefined) return

  if (hasProtocol(paramPageUrl)) return paramPageUrl

  paramPageUrl = addProtocol(paramPageUrl)

  try {
    const url = new URL(paramPageUrl)
    return url.href
  } catch (err) {}
}

export function hasProtocol(url) {
  const protocolRegexp = /^http[s]?:/
  return protocolRegexp.test(url)
}

export function addProtocol(url) {
  if (hasProtocol(url)) {
    return url
  }

  let protocolPrefix = 'https:'

  if (url.indexOf('//') !== 0) {
    protocolPrefix += '//'
  }

  return `${protocolPrefix}${url}`
}
