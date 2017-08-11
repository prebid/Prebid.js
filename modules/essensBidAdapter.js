const CONSTANTS = require('src/constants.json')
const utils = require('src/utils.js')
const bidfactory = require('src/bidfactory.js')
const bidmanager = require('src/bidmanager.js')
const adloader = require('src/adloader')
const Adapter = require('src/adapter.js').default
const adaptermanager = require('src/adaptermanager')

// Essens Prebid Adapter
function EssensAdapter () {
  let baseAdapter = new Adapter('essens')

  const ENDPOINT = 'bid.essrtb.com/bid/prebid_call'

  let receivedBidRequests = {}

  baseAdapter.callBids = function (bidRequest) {
    if (!bidRequest) {
      utils.logError('empty bid request received')
      return
    }
    receivedBidRequests = bidRequest

    const bids = bidRequest.bids || []

    const essensBids = bids
      .filter(bid => isPlacementBidComplete(bid))
      .map(bid => {
        let essensBid = {}
        essensBid.impressionId = bid.bidId
        essensBid.sizes = utils.parseSizesInput(bid.sizes)
        essensBid.placementId = bid.params.placementId

        if (bid.params.dealId) {
          essensBid.deal = bid.params.dealId
        }

        if (bid.params.floorPrice) {
          essensBid.floorPrice = bid.params.floorPrice
        }

        return essensBid
      })

    const bidderRequestId = bidRequest.bidderRequestId
    const cur = ['USD']
    const urlParam = utils.getTopWindowUrl()
    const uaParam = getUa()

    if (!utils.isEmpty(essensBids)) {
      const payloadJson = {bidderRequestId: bidderRequestId, cur: cur, url: urlParam, ua: uaParam, imp: essensBids}

      const scriptUrl = '//' + ENDPOINT + '?callback=$$PREBID_GLOBAL$$.essensResponseHandler' +
        '&bid=' + encodeURIComponent(JSON.stringify(payloadJson))
      adloader.loadScript(scriptUrl)
    } else {
      sendEmptyResponseForAllPlacement()
    }

    function isPlacementBidComplete (bid) {
      if (bid.bidId && bid.params && bid.params.placementId) {
        return true
      } else {
        utils.logError('bid requires missing essential params for essens')
      }
    }

    function getUa () {
      return window.navigator.userAgent
    }
  }

  function sendEmptyResponseForAllPlacement () {
    if (receivedBidRequests && receivedBidRequests.bids) {
      receivedBidRequests.bids.forEach(registerEmptyResponse)
    }
  }

  function registerEmptyResponse (bidRequest) {
    const bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequest)
    bid.bidderCode = 'essens'
    bidmanager.addBidResponse(bidRequest.placementCode, bid)
  }

  $$PREBID_GLOBAL$$.essensResponseHandler = function (essensResponse) {
    utils.logInfo('received bid request from Essens')
    if (!isValidResponse(essensResponse)) {
      sendEmptyResponseForAllPlacement()
      return
    }

    registerBids(essensResponse)

    function isValidResponse (essensResponse) {
      return !!(essensResponse && essensResponse.id && essensResponse.seatbid)
    }

    function registerBids (essensResponses) {
      const requestHasResponse = []

      if (essensResponses.seatbid.length > 0) {
        essensResponses.seatbid.filter(isValidSeat).forEach(
          seat => seat.bid.forEach(sendResponse))
      }

      receivedBidRequests.bids.filter(request => !hasResponse(request))
        .forEach(registerEmptyResponse)

      function sendResponse (bidCandidate) {
        const bidRequest = getBidRequest(bidCandidate.impid)

        const bidsToBeRegister = getBid(bidRequest, bidCandidate)

        if (bidsToBeRegister) {
          requestHasResponse.push(bidRequest)
          bidmanager.addBidResponse(bidRequest.placementCode, bidsToBeRegister)
        }
      }

      function hasResponse (request) {
        return utils.contains(requestHasResponse, request)
      }

      function isValidSeat (seatbid) {
        return ((seatbid.bid && seatbid.bid.length !== 0))
      }

      function getBidRequest (id) {
        return receivedBidRequests.bids.find(bid => bid.bidId === id)
      }
    }

    function getBid (pbBidReq, bidCandidate) {
      if (!validBid(bidCandidate)) {
        return
      }
      const bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, pbBidReq)

      bid.creative_id = bidCandidate.crid
      bid.adUrl = bidCandidate.ext.adUrl
      bid.bidderCode = 'essens'
      bid.cpm = parseFloat(bidCandidate.price)
      bid.width = parseInt(bidCandidate.w)
      bid.height = parseInt(bidCandidate.h)

      if (bidCandidate.dealid) {
        bid.dealId = bidCandidate.dealid
      }
      return bid
    }

    function validBid (bid) {
      return !!((bid.price &&
      bid.crid && bid.ext && bid.ext.adUrl &&
      bid.w &&
      bid.h &&
      bid.impid))
    }
  }

  return Object.assign(this, {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    getBidderCode: baseAdapter.getBidderCode
  })
}

adaptermanager.registerBidAdapter(new EssensAdapter(), 'essens')

module.exports = EssensAdapter
