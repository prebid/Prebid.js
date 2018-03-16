import * as utils from 'src/utils'
import { config } from 'src/config'
import { registerBidder } from 'src/adapters/bidderFactory'

const BIDDER_CODE = 'contentignite'

export const spec = {
  code: BIDDER_CODE,
  pageID: Math.floor(Math.random() * 10e6),

  isBidRequestValid: function(bid) {
    return !!(bid.params.accountID && bid.params.zoneID)
  },

  buildRequests: function(validBidRequests) {
    var i
    var zoneID
    var bidRequest
    var accountID
    var keyword
    var requestURI
    var serverRequests = []
    var zoneCounters = {}

    for (i = 0; i < validBidRequests.length; i++) {
      bidRequest = validBidRequests[i]
      zoneID = utils.getBidIdParameter('zoneID', bidRequest.params)
      accountID = utils.getBidIdParameter('accountID', bidRequest.params)
      keyword = utils.getBidIdParameter('keyword', bidRequest.params)

      if (!(zoneID in zoneCounters)) {
        zoneCounters[zoneID] = 0
      }

      requestURI =
        location.protocol + '//serve.connectignite.com/adserve/;type=hbr;'
      requestURI += 'ID=' + encodeURIComponent(accountID) + ';'
      requestURI += 'setID=' + encodeURIComponent(zoneID) + ';'
      requestURI += 'pid=' + encodeURIComponent(spec.pageID) + ';'
      requestURI += 'place=' + encodeURIComponent(zoneCounters[zoneID]) + ';'

      // append the keyword for targeting if one was passed in
      if (keyword !== '') {
        requestURI += 'kw=' + encodeURIComponent(keyword) + ';'
      }

      zoneCounters[zoneID]++
      serverRequests.push({
        method: 'GET',
        url: requestURI,
        data: {},
        bidRequest: bidRequest
      })
    }
    return serverRequests
  },

  interpretResponse: function(serverResponse, bidRequest) {
    var bidObj = bidRequest.bidRequest
    var bidResponses = []
    var bidResponse = {}
    var isCorrectSize = false
    var isCorrectCPM = true
    var cpm
    var minCPM
    var maxCPM
    var width
    var height

    serverResponse = serverResponse.body
    if (serverResponse && serverResponse.status === 'SUCCESS' && bidObj) {
      cpm = serverResponse.cpm
      minCPM = utils.getBidIdParameter('minCPM', bidObj.params)
      maxCPM = utils.getBidIdParameter('maxCPM', bidObj.params)
      width = parseInt(serverResponse.width)
      height = parseInt(serverResponse.height)

      // Ensure response CPM is within the given bounds
      if (minCPM !== '' && cpm < parseFloat(minCPM)) {
        isCorrectCPM = false
      } else if (maxCPM !== '' && cpm > parseFloat(maxCPM)) {
        isCorrectCPM = false
      }

      // Ensure that response ad matches one of the placement sizes.
      utils._each(bidObj.sizes, function(size) {
        if (width === size[0] && height === size[1]) {
          isCorrectSize = true
        }
      })
      if (isCorrectCPM && isCorrectSize) {
        bidResponse.requestId = bidObj.bidId
        bidResponse.creativeId = serverResponse.placement_id
        bidResponse.cpm = cpm
        bidResponse.width = width
        bidResponse.height = height
        bidResponse.ad = serverResponse.ad_code
        bidResponse.currency = 'USD'
        bidResponse.netRevenue = true
        bidResponse.ttl = config.getConfig('_bidderTimeout')
        bidResponse.referrer = utils.getTopWindowUrl()
        bidResponses.push(bidResponse)
      } else if (!isCorrectCPM) {
        utils.logWarn('CPM did not meet minCPM/maxCPM requirements.')
      } else {
        utils.logWarn('Returned ad is of a different size to that requested.')
      }
    }
    return bidResponses
  }
}
registerBidder(spec)
