var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/******
 * PubWise.io Bid Simulator Adapter
 * Contact: support@pubwise.io
 * Developer: Stephen Johnston
 ***/

var PubwiseSimAdapter = function PubwiseSimAdapter() {
  var pubwiseUrl = "adtest.pubwise.io/api/v1/bid/get";

  $$PREBID_GLOBAL$$.pubwiseSimResponseHandler = pubwiseSimResponseHandler;

  return {
    callBids: _callBids
  };

  function _callBids(bidReqs) {
    utils.logInfo('pubwise callBids adapter beginning');

    var domain = window.location.host;
    var page = window.location.pathname + location.search + location.hash;

    var pubwiseBidReqs = {
      id: utils.getUniqueIdentifierStr(),
      bids: bidReqs,
      site: {
        domain: domain,
        page: page
      }
    };

    var scriptUrl = '//' + pubwiseUrl + '?callback=$$PREBID_GLOBAL$$.pubwiseSimResponseHandler' +
      '&src=' + CONSTANTS.REPO_AND_VERSION +
      '&bidpayload=' + encodeURIComponent(JSON.stringify(pubwiseBidReqs));

    adloader.loadScript(scriptUrl);
    utils.logInfo('pubwise callBids complete');
  }

  function pubwiseSimResponseHandler(pubwiseResponseObject) {
    utils.logInfo('pubwiseSim ResponseHandler beginning');
    utils.logInfo('Response Object', pubwiseResponseObject);
    var placements = [];

    if (isInvalidResponse()) {
      utils.logInfo('invalid response');
      return fillEmptyBidReturns();
    }

    pubwiseResponseObject.bids.forEach(addPubwiseBidResponse);
    var allBidResponse = fillEmptyBidReturns(placements);
    utils.logInfo('pubwise Response handler complete');

    return allBidResponse;

    function addPubwiseBidResponse(pubwiseBid) {
      utils.logInfo('pubwiseSim Bid', pubwiseBid);
      utils.logInfo('pubwiseSim Reqs', $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === 'pubwiseSim'));
      var placementCode = '';

      var bidReq = $$PREBID_GLOBAL$$
        ._bidsRequested.find(bidSet => bidSet.bidderCode === 'pubwiseSim')
        .bids.find(bid => bid.bidId === pubwiseBid.bidId);

      if (!bidReq) {
        utils.logMessage('pubwiseSim No bidReq');
        return addErrorBidResponse(placementCode);
      }

      bidReq.status = CONSTANTS.STATUS.GOOD;
      utils.logInfo('Bid Request', bidReq);
      placementCode = bidReq.placementCode;
      placements.push(placementCode);

      var cpm = pubwiseBid.cpm;

      if (!cpm) {
        utils.logMessage('pubwiseSim No CPM');
        return addErrorBidResponse(placementCode);
      }

      var bid = bidfactory.createBid(1, bidReq);

      bid.creative_id = pubwiseBid.id;
      bid.bidderCode = 'pubwiseSim';
      bid.cpm = cpm;
      bid.ad = decodeURIComponent(pubwiseBid.adm);
      bid.width = parseInt(pubwiseBid.w);
      bid.height = parseInt(pubwiseBid.h);
      utils.logInfo('adding pubwiseSim bid');
      bidmanager.addBidResponse(placementCode, bid);
    }

    function fillEmptyBidReturns(placements) {
      utils.logInfo('Fill Placement Bids', placements);
      $$PREBID_GLOBAL$$
        ._bidsRequested.find(bidSet => bidSet.bidderCode === 'pubwiseSim')
        .bids.forEach(fillEmpty);

      function fillEmpty(bid) {
        if (utils.contains(placements, bid.placementCode)) {
          return null;
        }

        addErrorBidResponse(bid);
      }
    }

    function addErrorBidResponse(bidRequest) {
      var bid = bidfactory.createBid(2, bidRequest);
      bid.bidderCode = 'pubwiseSim';
      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    }

    function isInvalidResponse() {
      return !pubwiseResponseObject || !pubwiseResponseObject.bids || !Array.isArray(pubwiseResponseObject.bids) || pubwiseResponseObject.bids.length <= 0;
    }
  }
};

module.exports = PubwiseSimAdapter;