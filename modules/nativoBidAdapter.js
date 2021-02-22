import * as utils from '../src/utils.js'
import { registerBidder } from '../src/adapters/bidderFactory.js'
import { BANNER } from '../src/mediaTypes.js'
// import { config } from 'src/config'

const BIDDER_CODE = 'nativo'
const BIDDER_ENDPOINT = 'http://www.testlocalbidrequest.com:3000/requestBid/' // test local endpoint
const USER_SYNC_URL_IFRAME = 'http://www.testlocalbidrequest.com:3000/'
const USER_SYNC_URL_IMAGE = 'http://www.testlocalbidrequest.com:3000/'

const TIME_TO_LIVE = 360

const SUPPORTED_AD_TYPES = [BANNER]

// Prebid adapter referrence doc: https://docs.prebid.org/dev-docs/bidder-adaptor.html

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ntv'], // short code
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.adUnitCode)
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
    const payload = {
      selector: validBidRequests[0].adUnitCode,
      id: validBidRequests[0].bidId
    }
    const payloadString = JSON.stringify(payload);

    let serverRequest = {
      method: 'POST',
      url: BIDDER_ENDPOINT,
      data: payloadString
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
    if (!response || !response.body || utils.isEmpty(response.body)) return []

    try {
      // Parse the response and return a bidResponses array
      const body = response.body
      // const headerValue = response.headers.get('some-response-header')
      const bidResponses = []

      let seatbids = body.seatbid
      // Step through and grab pertinent data
      let bidResponse
      seatbids.forEach((seatbid) => {
        seatbid.bid.forEach((bid) => {
          bidResponse = {
            requestId: body.id,
            cpm: bid.price,
            currency: body.cur,
            width: bid.w,
            height: bid.h,
            creativeId: bid.crid,
            dealId: bid.id,
            netRevenue: true,
            ttl: bid.ttl || TIME_TO_LIVE,
            ad: bid.adm,
            meta: {
              advertiserDomains: bid.adomain,
              // cat: bid.cat,
              // impid: bid.impid,
              // networkId: NETWORK_ID,
              // networkName: NETWORK_NAME,
              // agencyId: AGENCY_ID,
              // agencyName: AGENCY_NAME,
              // advertiserId: ADVERTISER_ID,
              // advertiserName: ADVERTISER_NAME,
              // advertiserDomains: [ARRAY_OF_ADVERTISER_DOMAINS],
              // brandId: BRAND_ID,
              // brandName: BRAND_NAME,
              // primaryCatId: IAB_CATEGORY,
              // secondaryCatIds: [ARRAY_OF_IAB_CATEGORIES],
              // mediaType: MEDIA_TYPE
            },
          }

          bidResponses.push(bidResponse)
        })
      })

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
    // console.log('syncOptions', syncOptions) // eslint-disable-line no-console
    // console.log('serverResponses', serverResponses) // eslint-disable-line no-console
    // console.log('gdprConsent', gdprConsent) // eslint-disable-line no-console
    // console.log('uspConsent', uspConsent) // eslint-disable-line no-console

    const syncs = []

    let params = ''

    // GDPR
    if (gdprConsent) {
      params += '&gdpr=' + (gdprConsent.gdprApplies ? 1 : 0)
      params +=
        '&gdpr_consent=' + encodeURIComponent(gdprConsent.consentString || '')
    }

    // CCPA
    if (uspConsent) {
      params += '&us_privacy=' + encodeURIComponent(uspConsent)
    }

    // TODO: We need to determine how we're including sync urls
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: USER_SYNC_URL_IFRAME + params,
      })
    }
    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: USER_SYNC_URL_IMAGE + params,
      })
    }

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
  onBidWon: function (bid) {},

  /**
   * Will be called when the adserver targeting has been set for a bid from the adapter.
   * @param {Object} bidder - The bid of which the targeting has been set
   */
  onSetTargeting: function (bid) {},
}
registerBidder(spec)
