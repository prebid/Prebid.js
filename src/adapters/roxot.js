var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

var RoxotAdapter = function RoxotAdapter() {
  var roxotUrl = 'r.rxthdr.com';

  $$PREBID_GLOBAL$$.roxotResponseHandler = roxotResponseHandler;

  return {
    callBids: _callBids
  };

  function _callBids(bidReqs) {
    utils.logInfo('callBids roxot adapter invoking');

    var domain = window.location.host;
    var page = window.location.pathname + location.search + location.hash;

    var roxotBidReqs = {
      id: utils.getUniqueIdentifierStr(),
      bids: bidReqs,
      site: {
        domain: domain,
        page: page
      }
    };

    var scriptUrl = '//' + roxotUrl + '?callback=$$PREBID_GLOBAL$$.roxotResponseHandler' +
      '&src=' + CONSTANTS.REPO_AND_VERSION +
      '&br=' + encodeURIComponent(JSON.stringify(roxotBidReqs));

    adloader.loadScript(scriptUrl);
  }

  function roxotResponseHandler(roxotResponseObject) {
    utils.logInfo('roxotResponseHandler invoking');
    var placements = [];

    if (isResponseInvalid()) {
      return fillPlacementEmptyBid();
    }

    roxotResponseObject.bids.forEach(pushRoxotBid);
    var allBidResponse = fillPlacementEmptyBid(placements);
    utils.logInfo('roxotResponse handler finish');

    return allBidResponse;

    function isResponseInvalid() {
      return !roxotResponseObject || !roxotResponseObject.bids || !Array.isArray(roxotResponseObject.bids) || roxotResponseObject.bids.length <= 0;
    }

    function pushRoxotBid(roxotBid) {
      var placementCode = '';

      var bidReq = $$PREBID_GLOBAL$$
          ._bidsRequested.find(bidSet => bidSet.bidderCode === 'roxot')
          .bids.find(bid => bid.bidId === roxotBid.bidId);

      if (!bidReq) {
        return pushErrorBid(placementCode);
      }

      bidReq.status = CONSTANTS.STATUS.GOOD;

      placementCode = bidReq.placementCode;
      placements.push(placementCode);

      var cpm = roxotBid.cpm;
      var responseNurl = '<img src="' + roxotBid.nurl + '">';

      if (!cpm) {
        return pushErrorBid(placementCode);
      }

      var bid = bidfactory.createBid(1, bidReq);

      bid.creative_id = roxotBid.id;
      bid.bidderCode = 'roxot';
      bid.cpm = cpm;
      bid.ad = decodeURIComponent(roxotBid.adm + responseNurl);
      bid.width = parseInt(roxotBid.w);
      bid.height = parseInt(roxotBid.h);

      bidmanager.addBidResponse(placementCode, bid);
    }

    function fillPlacementEmptyBid(places) {
      $$PREBID_GLOBAL$$
        ._bidsRequested.find(bidSet => bidSet.bidderCode === 'roxot')
        .bids.forEach(fillIfNotFilled);

      function fillIfNotFilled(bid) {
        if (utils.contains(places, bid.placementCode)) {
          return null;
        }

        pushErrorBid(bid);
      }
    }

    function pushErrorBid(bidRequest) {
      var bid = bidfactory.createBid(2, bidRequest);
      bid.bidderCode = 'roxot';
      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    }
  }
};

module.exports = RoxotAdapter;
