var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from Sovrn
 */
var SovrnAdapter = function SovrnAdapter() {
  var sovrnUrl = 'ap.lijit.com/rtb/bid';

  function _callBids(params) {
    var sovrnBids = params.bids || [];

    _requestBids(sovrnBids);
  }

  function _requestBids(bidReqs) {
    // build bid request object
    var domain = window.location.host;
    var page = window.location.pathname + location.search + location.hash;

    var sovrnImps = [];

    //build impression array for sovrn
    utils._each(bidReqs, function (bid) {
      var tagId = utils.getBidIdParamater('tagid', bid.params);
      var bidFloor = utils.getBidIdParamater('bidfloor', bid.params);
      var adW = 0;
      var adH = 0;

      //sovrn supports only one size per tagid, so we just take the first size if there are more
      //if we are a 2 item array of 2 numbers, we must be a SingleSize array
      var bidSizes = Array.isArray(bid.params.sizes) ? bid.params.sizes : bid.sizes;
      var sizeArrayLength = bidSizes.length;
      if (sizeArrayLength === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
        adW = bidSizes[0];
        adH = bidSizes[1];
      } else {
        adW = bidSizes[0][0];
        adH = bidSizes[0][1];
      }

      var imp =
      {
        id: bid.bidId,
        banner: {
          w: adW,
          h: adH
        },
        tagid: tagId,
        bidfloor: bidFloor
      };
      sovrnImps.push(imp);
    });

    // build bid request with impressions
    var sovrnBidReq = {
      id: utils.getUniqueIdentifierStr(),
      imp: sovrnImps,
      site: {
        domain: domain,
        page: page
      }
    };

    var scriptUrl = '//' + sovrnUrl + '?callback=window.$$PREBID_GLOBAL$$.sovrnResponse' +
      '&src=' + CONSTANTS.REPO_AND_VERSION +
      '&br=' + encodeURIComponent(JSON.stringify(sovrnBidReq));
    adloader.loadScript(scriptUrl);
  }

  function addBlankBidResponses(impidsWithBidBack) {
    var missing = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === 'sovrn').bids
      .filter(bid => impidsWithBidBack.indexOf(bid.bidId) < 0);

    missing.forEach(function (bidRequest) {
      // Add a no-bid response for this bid request.
      var bid = {};
      bid = bidfactory.createBid(2, bidRequest);
      bid.bidderCode = 'sovrn';
      bidmanager.addBidResponse(bidRequest.placementCode, bid);
    });
  }

  //expose the callback to the global object:
  $$PREBID_GLOBAL$$.sovrnResponse = function (sovrnResponseObj) {
    // valid object?
    if (sovrnResponseObj && sovrnResponseObj.id) {
      // valid object w/ bid responses?
      if (sovrnResponseObj.seatbid && sovrnResponseObj.seatbid.length !== 0 && sovrnResponseObj.seatbid[0].bid && sovrnResponseObj.seatbid[0].bid.length !== 0) {
        var impidsWithBidBack = [];
        sovrnResponseObj.seatbid[0].bid.forEach(function (sovrnBid) {

          var responseCPM;
          var placementCode = '';
          var id = sovrnBid.impid;
          var bid = {};

          // try to fetch the bid request we sent Sovrn
          var bidObj = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === 'sovrn').bids
          .find(bid => bid.bidId === id);

          if (bidObj) {
            placementCode = bidObj.placementCode;
            bidObj.status = CONSTANTS.STATUS.GOOD;

            //place ad response on bidmanager._adResponsesByBidderId
            responseCPM = parseFloat(sovrnBid.price);

            if (responseCPM !== 0) {
              sovrnBid.placementCode = placementCode;
              sovrnBid.size = bidObj.sizes;
              var responseAd = sovrnBid.adm;

              // build impression url from response
              var responseNurl = '<img src="' + sovrnBid.nurl + '">';

              //store bid response
              //bid status is good (indicating 1)
              bid = bidfactory.createBid(1, bidObj);
              bid.creative_id = sovrnBid.id;
              bid.bidderCode = 'sovrn';
              bid.cpm = responseCPM;

              //set ad content + impression url
              // sovrn returns <script> block, so use bid.ad, not bid.adurl
              bid.ad = decodeURIComponent(responseAd + responseNurl);

              // Set width and height from response now
              bid.width = parseInt(sovrnBid.w);
              bid.height = parseInt(sovrnBid.h);

              bidmanager.addBidResponse(placementCode, bid);
              impidsWithBidBack.push(id);
            }
          }
        });

        addBlankBidResponses(impidsWithBidBack);
      } else {
        //no response data for all requests
        addBlankBidResponses([]);
      }
    } else {
      //no response data for all requests
      addBlankBidResponses([]);
    }

  }; // sovrnResponse

  return {
    callBids: _callBids
  };
};

module.exports = SovrnAdapter;
