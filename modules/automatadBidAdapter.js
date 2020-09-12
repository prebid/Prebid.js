import {registerBidder} from '../src/adapters/bidderFactory.js'
import * as utils from '../src/utils.js'
import {BANNER} from '../src/mediaTypes.js'
import {ajax} from '../src/ajax.js'

const BIDDER = 'automatad'

const ENDPOINT_URL = 'https://rtb2.automatad.com/ortb2'

const DEFAULT_BID_TTL = 30
const DEFAULT_CURRENCY = 'USD'
const DEFAULT_NET_REVENUE = true

export const spec = {
  code: BIDDER,
  aliases: ['atd'],
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    // will receive request bid. check if have necessary params for bidding
    return (bid && bid.hasOwnProperty('params') && bid.params.hasOwnProperty('siteId') && bid.params.hasOwnProperty('placementId') && bid.hasOwnProperty('mediaTypes') && bid.mediaTypes.hasOwnProperty('banner'))
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    if (!validBidRequests || !bidderRequest) {
      return
    }

    const siteId = validBidRequests[0].params.siteId

    const impressions = validBidRequests.map(bidRequest => {
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
      url: ENDPOINT_URL + '/resp',
      data: payloadString,
      options: {
        contentType: 'application/json',
        withCredentials: false,
        crossOrigin: true,
      },
    }
  },

  interpretResponse: function (serverResponse, request) {
    const bidResponses = []
    const response = (serverResponse || {}).body

    if (response && response.seatbid && response.seatbid[0].bid && response.seatbid[0].bid.length) {
      response.seatbid.forEach(bidObj => {
        bidObj.bid.forEach(bid => {
          bidResponses.push({
            requestId: bid.impid,
            cpm: bid.price,
            ad: bid.adm,
            adDomain: bid.adomain[0],
            currency: DEFAULT_CURRENCY,
            ttl: DEFAULT_BID_TTL,
            creativeId: bid.crid,
            width: bid.w,
            height: bid.h,
            netRevenue: DEFAULT_NET_REVENUE,
            nurl: bid.nurl,
          })
        })
      })
    } else {
      utils.logInfo('automatad :: no valid responses to interpret')
    }

    return bidResponses
  },
  getUserSyncs: function(syncOptions, serverResponse) {
    return [{
      type: 'iframe',
      url: 'https://rtb2.automatad.com/ortb2/async_usersync'
    }]
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
      /\$\{AUCTION_ID\}/,
      bid.auctionId
    )
    spec.ajaxCall(winUrl, null)
    return true
  },
  ajaxCall: function(endpoint, data) {
    ajax(endpoint, data)
  },

}
registerBidder(spec)
