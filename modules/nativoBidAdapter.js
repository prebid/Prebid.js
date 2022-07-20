import { deepAccess, isEmpty } from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { BANNER } from '../src/mediaTypes.js'
// import { config } from 'src/config'

const BIDDER_CODE = 'nativo'
const BIDDER_ENDPOINT = 'https://exchange.postrelease.com/prebid'

const GVLID = 263

const TIME_TO_LIVE = 360

const SUPPORTED_AD_TYPES = [BANNER]

/**
 * Keep track of bid data by keys
 * @returns {Object} - Map of bid data that can be referenced by multiple keys
 */
export const BidDataMap = () => {
  const referenceMap = {}
  const bids = []

  /**
   * Add a refence to the index by key value
   * @param {String} key - The key to store the index reference
   * @param {Integer} index - The index value of the bidData
   */
  function addKeyReference(key, index) {
    if (!referenceMap.hasOwnProperty(key)) {
      referenceMap[key] = index
    }
  }

  /**
   * Adds a bid to the map
   * @param {Object} bid - Bid data
   * @param {Array/String} keys - Keys to reference the index value
   */
  function addBidData(bid, keys) {
    const index = bids.length
    bids.push(bid)

    if (Array.isArray(keys)) {
      keys.forEach((key) => {
        addKeyReference(String(key), index)
      })
      return
    }

    addKeyReference(String(keys), index)
  }

  /**
   * Get's the bid data refrerenced by the key
   * @param {String} key - The key value to find the bid data by
   * @returns {Object} - The bid data
   */
  function getBidData(key) {
    const stringKey = String(key)
    if (referenceMap.hasOwnProperty(stringKey)) {
      return bids[referenceMap[stringKey]]
    }
  }

  // Return API
  return {
    addBidData,
    getBidData,
  }
}

const bidRequestMap = {}
const adUnitsRequested = {}
const extData = {}

// Filtering
const adsToFilter = new Set()
const advertisersToFilter = new Set()
const campaignsToFilter = new Set()

// Prebid adapter referrence doc: https://docs.prebid.org/dev-docs/bidder-adaptor.html

// Validity checks for optionsl paramters
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
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    // We don't need any specific parameters to make a bid request
    // If not parameters are supplied just verify it's the correct bidder code
    if (!bid.params) return bid.bidder === BIDDER_CODE

    // Check if any supplied parameters are invalid
    const hasInvalidParameters = Object.keys(bid.params).some((key) => {
      const value = bid.params[key]
      const validityCheck = validParameter[key]

      // We don't have a test for this so it's not a paramter we care about
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
    const placementIds = new Set()
    const bidDataMap = BidDataMap()
    const placementSizes = { length: 0 }
    let placementId, pageUrl
    validBidRequests.forEach((request) => {
      pageUrl = deepAccess(
        request,
        'params.url',
        bidderRequest.refererInfo.page
      )
      placementId = deepAccess(request, 'params.placementId')

      const bidDataKeys = [request.adUnitCode]

      if (placementId && !placementIds.has(placementId)) {
        placementIds.add(placementId)
        bidDataKeys.push(placementId)

        placementSizes[placementId] = request.sizes
        placementSizes.length++
      }

      const bidData = {
        bidId: request.bidId,
        size: getLargestSize(request.sizes),
      }
      bidDataMap.addBidData(bidData, bidDataKeys)
    })
    bidRequestMap[bidderRequest.bidderRequestId] = bidDataMap

    // Build adUnit data
    const adUnitData = {
      adUnits: validBidRequests.map((adUnit) => {
        // Track if we've already requested for this ad unit code
        adUnitsRequested[adUnit.adUnitCode] =
          adUnitsRequested[adUnit.adUnitCode] !== undefined
            ? adUnitsRequested[adUnit.adUnitCode] + 1
            : 0
        return {
          adUnitCode: adUnit.adUnitCode,
          mediaTypes: adUnit.mediaTypes,
        }
      }),
    }

    // Build QS Params
    let params = [
      { key: 'ntv_pb_rid', value: bidderRequest.bidderRequestId },
      {
        key: 'ntv_ppc',
        value: btoa(JSON.stringify(adUnitData)), // Convert to Base 64
      },
      {
        key: 'ntv_dbr',
        value: btoa(JSON.stringify(adUnitsRequested)),
      },
      {
        key: 'ntv_url',
        value: encodeURIComponent(pageUrl),
      },
    ]

    // Add filtering
    if (adsToFilter.size > 0) {
      params.unshift({ key: 'ntv_atf', value: Array.from(adsToFilter).join(',') })
    }

    if (advertisersToFilter.size > 0) {
      params.unshift({ key: 'ntv_avtf', value: Array.from(advertisersToFilter).join(',') })
    }

    if (campaignsToFilter.size > 0) {
      params.unshift({ key: 'ntv_ctf', value: Array.from(campaignsToFilter).join(',') })
    }

    // Placement Sizes
    if (placementSizes.length) {
      params.unshift({ key: 'ntv_pas', value: btoa(JSON.stringify(placementSizes)) })
    }

    // Add placement IDs
    if (placementIds.size > 0) {
      // Convert Set to Array (IE 11 Safe)
      const placements = []
      placementIds.forEach((value) => placements.push(value))
      // Append to query string paramters
      params.unshift({ key: 'ntv_ptd', value: placements.join(',') })
    }

    // Add GDPR params
    if (bidderRequest.gdprConsent) {
      // Put on the beginning of the qs param array
      params.unshift({
        key: 'ntv_gdpr_consent',
        value: bidderRequest.gdprConsent.consentString,
      })
    }

    // Add USP params
    if (bidderRequest.uspConsent) {
      // Put on the beginning of the qs param array
      params.unshift({ key: 'us_privacy', value: bidderRequest.uspConsent })
    }

    let serverRequest = {
      method: 'GET',
      url: BIDDER_ENDPOINT + arrayToQS(params),
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
      const body =
        typeof response.body === 'string'
          ? JSON.parse(response.body)
          : response.body

      const bidResponses = []
      const seatbids = body.seatbid

      // Step through and grab pertinent data
      let bidResponse, adUnit
      seatbids.forEach((seatbid) => {
        seatbid.bid.forEach((bid) => {
          adUnit = this.getAdUnitData(body.id, bid)
          bidResponse = {
            requestId: adUnit.bidId,
            cpm: bid.price,
            currency: body.cur,
            width: bid.w || adUnit.size[0],
            height: bid.h || adUnit.size[1],
            creativeId: bid.crid,
            dealId: bid.id,
            netRevenue: true,
            ttl: bid.ttl || TIME_TO_LIVE,
            ad: bid.adm,
            meta: {
              advertiserDomains: bid.adomain,
            },
          }

          if (bid.ext) extData[bid.id] = bid.ext

          bidResponses.push(bidResponse)
        })
      })

      // Don't need the map anymore as it was unique for one request/response
      delete bidRequestMap[body.id]

      return bidResponses
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

      body =
        typeof response.body === 'string'
          ? JSON.parse(response.body)
          : response.body

      // Make sure we have valid content
      if (!body || !body.seatbid || body.seatbid.length === 0) return

      body.seatbid.forEach((seatbid) => {
        // Grab the syncs for each seatbid
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
      })
    })

    return syncs
  },

  /**
   * Will be called when an adpater timed out for an auction.
   * Adapter can fire a ajax or pixel call to register a timeout at thier end.
   * @param {Object} timeoutData - Timeout specific data
   */
  onTimeout: function (timeoutData) {},

  /**
   * Will be called when a bid from the adapter won the auction.
   * @param {Object} bid - The bid that won the auction
   */
  onBidWon: function (bid) {
    const ext = extData[bid.dealId]

    if (!ext) return

    appendFilterData(adsToFilter, ext.adsToFilter)
    appendFilterData(advertisersToFilter, ext.advertisersToFilter)
    appendFilterData(campaignsToFilter, ext.campaignsToFilter)
  },

  /**
   * Will be called when the adserver targeting has been set for a bid from the adapter.
   * @param {Object} bidder - The bid of which the targeting has been set
   */
  onSetTargeting: function (bid) {},

  /**
   * Maps Prebid's bidId to Nativo's placementId values per unique bidderRequestId
   * @param {String} bidderRequestId - The unique ID value associated with the bidderRequest
   * @param {Object} bid - The placement ID value from Nativo
   * @returns {String} - The bidId value associated with the corresponding placementId
   */
  getAdUnitData: function (bidderRequestId, bid) {
    const bidDataMap = bidRequestMap[bidderRequestId]

    const placementId = bid.impid
    const adUnitCode = deepAccess(bid, 'ext.ad_unit_id')

    return (
      bidDataMap.getBidData(adUnitCode) || bidDataMap.getBidData(placementId)
    )
  },
}
registerBidder(spec)

// Utils
/**
 * Append QS param to existing string
 * @param {String} str - String to append to
 * @param {String} key - Key to append
 * @param {String} value - Value to append
 * @returns
 */
function appendQSParamString(str, key, value) {
  return str + `${str.length ? '&' : ''}${key}=${value}`
}

/**
 * Convert an object to query string parameters
 * @param {Object} obj - Object to convert
 * @returns
 */
function arrayToQS(arr) {
  return (
    '?' +
    arr.reduce((value, obj) => {
      return appendQSParamString(value, obj.key, obj.value)
    }, '')
  )
}

/**
 * Get the largest size array
 * @param {Array} sizes - Array of size arrays
 * @returns Size array with the largest area
 */
function getLargestSize(sizes, method = area) {
  if (!sizes || sizes.length === 0) return []
  if (sizes.length === 1) return sizes[0]

  return sizes.reduce((prev, current) => {
    if (method(current) > method(prev)) {
      return current
    } else {
      return prev
    }
  })
}

/**
 * Calculate the area
 * @param {Array} size - [width, height]
 * @returns The calculated area
 */
const area = (size) => size[0] * size[1]

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
