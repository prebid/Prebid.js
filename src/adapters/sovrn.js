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

  function _callBids(params, requestContext) {
    var sovrnBids = params.bids || [];

    _requestBids(sovrnBids, requestContext);
  }

  function _requestBids(bidReqs, requestContext) {
    // build bid request object
    var domain = window.location.host;
    var page = window.location.pathname + location.search + location.hash;

    var sovrnImps = [];
    requestContext.sovrn_allPlacementCodes = [];

    //build impression array for sovrn
    utils._each(bidReqs, function (bid) {
      var tagId = utils.getBidIdParamater('tagid', bid.params);
      var bidFloor = utils.getBidIdParamater('bidfloor', bid.params);
      var adW = 0;
      var adH = 0;

      //sovrn supports only one size per tagid, so we just take the first size if there are more
      //if we are a 2 item array of 2 numbers, we must be a SingleSize array
      var sizeArrayLength = bid.sizes.length;
      if (sizeArrayLength === 2 && typeof bid.sizes[0] === 'number' && typeof bid.sizes[1] === 'number') {
        adW = bid.sizes[0];
        adH = bid.sizes[1];
      } else {
        adW = bid.sizes[0][0];
        adH = bid.sizes[0][1];
      }

      var imp =
      {
        id: utils.getUniqueIdentifierStr(),
        banner: {
          w: adW,
          h: adH
        },
        tagid: tagId,
        bidfloor: bidFloor
      };
      sovrnImps.push(imp);
      bidmanager.pbCallbackMap[imp.id] = bid;
      requestContext.sovrn_allPlacementCodes.push(bid.placementCode);
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

    bidmanager.pbCallbackMap[sovrnBidReq.id] = requestContext;

    var scriptUrl = '//' + sovrnUrl + '?callback=window.pbjs.sovrnResponse' +
      '&br=' + encodeURIComponent(JSON.stringify(sovrnBidReq));
    adloader.loadScript(scriptUrl, null);
  }

  function addBlankBidResponsesForAllPlacementsExceptThese(requestContext, placementsWithBidsBack) {
    utils._each(requestContext.sovrn_allPlacementCodes, function (placementCode) {
      if (utils.contains(placementsWithBidsBack, placementCode)) {
        // A bid was returned for this placement already
        return null;
      } else {
        // Add a no-bid response for this placement.
        var bid = {};
        bid = bidfactory.createBid(2);
        bid.bidderCode = 'sovrn';
        bidmanager.addBidResponse(requestContext, placementCode, bid);
      }
    });
  }

  //expose the callback to the global object:
  pbjs.sovrnResponse = function (sovrnResponseObj) {
    // valid object?
    if (sovrnResponseObj && sovrnResponseObj.id) {
      var requestContext = bidmanager.getPlacementIdByCBIdentifer(sovrnResponseObj.id);

      // valid object w/ bid responses?
      if (sovrnResponseObj.seatbid && sovrnResponseObj.seatbid.length !== 0 && sovrnResponseObj.seatbid[0].bid && sovrnResponseObj.seatbid[0].bid.length !== 0) {
        var placementsWithBidsBack = [];
        sovrnResponseObj.seatbid[0].bid.forEach(function (sovrnBid) {

          var responseCPM;
          var placementCode = '';
          var id = sovrnBid.impid;
          var bid = {};

          // try to fetch the bid request we sent Sovrn
          var bidObj = bidmanager.getPlacementIdByCBIdentifer(id);
          if (bidObj) {
            placementCode = bidObj.placementCode;
            placementsWithBidsBack.push(placementCode);
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
              bid = bidfactory.createBid(1);
              bid.creative_id = sovrnBid.id;
              bid.bidderCode = 'sovrn';
              bid.cpm = responseCPM;

              //set ad content + impression url
              // sovrn returns <script> block, so use bid.ad, not bid.adurl
              bid.ad = decodeURIComponent(responseAd + responseNurl);

              // Set width and height from response now
              bid.width = parseInt(sovrnBid.w);
              bid.height = parseInt(sovrnBid.h);

              bidmanager.addBidResponse(requestContext, placementCode, bid);

            } else {
              //0 price bid
              //indicate that there is no bid for this placement
              bid = bidfactory.createBid(2);
              bid.bidderCode = 'sovrn';
              bidmanager.addBidResponse(requestContext, placementCode, bid);

            }
          } else { // bid not found, we never asked for this?
            //no response data
            bid = bidfactory.createBid(2);
            bid.bidderCode = 'sovrn';
            bidmanager.addBidResponse(requestContext, placementCode, bid);
          }
        });

        addBlankBidResponsesForAllPlacementsExceptThese(requestContext, placementsWithBidsBack);
      } else {
        //no response data for any placements
        addBlankBidResponsesForAllPlacementsExceptThese(requestContext, []);
      }
    } else {
      //no response data for any placements
      addBlankBidResponsesForAllPlacementsExceptThese(null, []);
    }

  }; // sovrnResponse

  return {
    callBids: _callBids
  };
};

module.exports = SovrnAdapter;
