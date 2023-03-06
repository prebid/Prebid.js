import { logInfo } from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js'
import {BANNER} from '../src/mediaTypes.js'
import {ajax} from '../src/ajax.js'

const BIDDER = 'automatad'

const ENDPOINT_URL = 'https://bid.atmtd.com'

const DEFAULT_BID_TTL = 30
const DEFAULT_CURRENCY = 'USD'
const DEFAULT_NET_REVENUE = true

export const spec = {
  code: BIDDER,
  aliases: ['atd'],
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    // will receive request bid. check if have necessary params for bidding
    return (bid && bid.hasOwnProperty('params') && bid.params.hasOwnProperty('siteId') && bid.params.siteId != null && bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty('banner') && typeof bid.mediaTypes.banner == 'object')
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    if (!validBidRequests || !bidderRequest) {
      return
    }

    const siteId = validBidRequests[0].params.siteId

    const impressions = validBidRequests.map(bidRequest => {
      if (bidRequest.params.hasOwnProperty('placementId')) {
        return {
          id: bidRequest.bidId,
          adUnitCode: bidRequest.adUnitCode,
          placement: bidRequest.params.placementId,
          banner: {
            format: bidRequest.sizes.map(sizeArr => ({
              w: sizeArr[0],
              h: sizeArr[1],
            }))
          },
        }
      } else {
        return {
          id: bidRequest.bidId,
          adUnitCode: bidRequest.adUnitCode,
          banner: {
            format: bidRequest.sizes.map(sizeArr => ({
              w: sizeArr[0],
              h: sizeArr[1],
            }))
          },
        }
      }
    })

    // params from bid request
    const openrtbRequest = {
      id: validBidRequests[0].auctionId,
      imp: impressions,
      site: {
        id: siteId,
        domain: window.location.hostname,
        page: window.location.href,
        ref: bidderRequest.refererInfo ? bidderRequest.refererInfo.referer || null : null,
      },
    }

    const payloadString = JSON.stringify(openrtbRequest)
    return {
      method: 'POST',
      url: ENDPOINT_URL + '/request',
      data: payloadString,
      options: {
        contentType: 'application/json',
        withCredentials: true,
        crossOrigin: true,
      },
    }
  },

  interpretResponse: function (serverResponse, request) {
    const bidResponses = []
    const response = (serverResponse || {}).body

    if (response && response.seatbid && response.seatbid[0].bid && response.seatbid[0].bid.length) {
      var bidid = response.bidid
      response.seatbid.forEach(bidObj => {
        bidObj.bid.forEach(bid => {
          bidResponses.push({
            requestId: bid.impid,
            cpm: bid.price,
            ad: bid.adm,
            meta: {
              advertiserDomains: bid.adomain
            },
            currency: DEFAULT_CURRENCY,
            ttl: DEFAULT_BID_TTL,
            creativeId: bid.crid,
            width: bid.w,
            height: bid.h,
            netRevenue: DEFAULT_NET_REVENUE,
            nurl: bid.nurl,
            bidId: bidid
          })
        })
      })
    } else {
      logInfo('automatad :: no valid responses to interpret')
    }

    return bidResponses
  },
  onTimeout: function(timeoutData) {
    const timeoutUrl = ENDPOINT_URL + '/timeout'
    spec.ajaxCall(timeoutUrl, null, JSON.stringify(timeoutData), {method: 'POST', withCredentials: true})
  },
  onBidWon: function(bid) {
    if (!bid.nurl) { return }
    const winCpm = (bid.hasOwnProperty('originalCpm')) ? bid.originalCpm : bid.cpm
    const winCurr = (bid.hasOwnProperty('originalCurrency') && bid.hasOwnProperty('originalCpm')) ? bid.originalCurrency : bid.currency
    const winUrl = bid.nurl.replace(
      /\$\{AUCTION_PRICE\}/,
      winCpm
    ).replace(
      /\$\{AUCTION_IMP_ID\}/,
      bid.requestId
    ).replace(
      /\$\{AUCTION_CURRENCY\}/,
      winCurr
    ).replace(
      /\$\{AUCTON_BID_ID\}/,
      bid.bidId
    ).replace(
      /\$\{AUCTION_ID\}/,
      bid.auctionId
    )
    spec.ajaxCall(winUrl, null, null, {method: 'GET', withCredentials: true})
    return true
  },

  ajaxCall: function(endpoint, callback, data, options = {}) {
    if (data) {
      options.contentType = 'application/json'
    }
    ajax(endpoint, callback, data, options)
  },

}
registerBidder(spec)
