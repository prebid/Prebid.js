const CONSTANTS = require('src/constants.json')
const utils = require('src/utils.js')
const bidfactory = require('src/bidfactory.js')
const bidmanager = require('src/bidmanager.js')
const adloader = require('src/adloader')
const Adapter = require('src/adapter.js')
const adaptermanager = require('src/adaptermanager');

// Essens Prebid Adapter
function EssensAdapter () {
  let baseAdapter = Adapter.createNew('essens')

  const ENDPOINT = 'bid.essrtb.com/bid/prebid_call'

  baseAdapter.callBids = function (bidRequest) {
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
    }

    function isPlacementBidComplete (bid) {
      if (bid.bidId && bid.params && bid.params.placementId) {
        return true
      } else {
        utils.logError('bid requires missing essential params for essens')
      }
    }
  }


  function getUa () {
    return window.navigator.userAgent
  }

  $$PREBID_GLOBAL$$.essensResponseHandler = function (essensResponse) {
    utils.logInfo('received bid request from Essens')
    if (!isValidResponse(essensResponse)) {
      const allRequests = getEssesnBidRequests()
      allRequests.bids.forEach(registerEmptyResponse)
      return;
    }

    registerBids(essensResponse);

    function getEssesnBidRequests () {
      return $$PREBID_GLOBAL$$
        ._bidsRequested.find(bidSet => bidSet.bidderCode === 'essens')
    }

    function registerEmptyResponse (bidRequest) {
      const bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequest)
      bid.bidderCode = 'essens'
      bidmanager.addBidResponse(bidRequest.placementCode, bid)
    }

    function isValidResponse (essensResponse) {
      return !!(essensResponse && essensResponse.id && essensResponse.seatbid)
    }

    function registerBids (essensResponses) {
      const allRequests = getEssesnBidRequests()
      const requestHasResponse = []

      if (essensResponses.seatbid.length > 0) {
        essensResponses.seatbid.filter(isValidSeat).forEach(
          seat => seat.bid.forEach(sendResponse))
      }

      allRequests.bids.filter(request => !hasResponse(request))
        .forEach(registerEmptyResponse)

      function sendResponse (bidCandidate) {
        const bidRequest = utils.getBidRequest(bidCandidate.impid)

        const bidsToBeRegister = getBid(bidRequest, bidCandidate);

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
      return bid;
    }

    function validBid (bid) {
      return !!((bid.price &&
      bid.crid && bid.ext && bid.ext.adUrl &&
      bid.w &&
      bid.h &&
      bid.impid))
    }
  }

  return {
    createNew: EssensAdapter.createNew,
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
  }
}

EssensAdapter.createNew = function () {
  return new EssensAdapter()
}

adaptermanager.registerBidAdapter(new EssensAdapter(), 'essens');

module.exports = EssensAdapter

