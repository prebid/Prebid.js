var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

var defaultPlacementForBadBid = null;

/**
 * Adapter for requesting bids from NginAd
 */
var NginAdAdapter = function NginAdAdapter() {

  var rtbServerDomain = 'placeholder.for.nginad.server.com';

  function _callBids(params) {
    var nginadBids = params.bids || [];

    // De-dupe by tagid then issue single bid request for all bids
    _requestBids(_getUniqueTagids(nginadBids));
  }

  // filter bids to de-dupe them?
  function _getUniqueTagids(bids) {
    var key;
    var map = {};
    var PubZoneIds = [];

    for (key in bids) {
      map[utils.getBidIdParamater('pzoneid', bids[key].params)] = bids[key];
    }

    for (key in map) {
      if (map.hasOwnProperty(key)) {
        PubZoneIds.push(map[key]);
      }
    }

    return PubZoneIds;
  }

  function getWidthAndHeight(bid) {

    var adW = null;
    var adH = null;

    var sizeArrayLength = bid.sizes.length;
    if (sizeArrayLength === 2 && typeof bid.sizes[0] === 'number' && typeof bid.sizes[1] === 'number') {
      adW = bid.sizes[0];
      adH = bid.sizes[1];
    } else {
      adW = bid.sizes[0][0];
      adH = bid.sizes[0][1];
    }

    return [adW, adH];
  }

  function _requestBids(bidReqs) {
    // build bid request object
    var domain = window.location.host;
    var page = window.location.pathname + location.search + location.hash;

    var nginadImps = [];

    //assign the first adUnit (placement) for bad bids;
    defaultPlacementForBadBid = bidReqs[0].placementCode;


    //build impression array for nginad
    utils._each(bidReqs, function(bid) {
      var tagId = utils.getBidIdParamater('pzoneid', bid.params);
      var bidFloor = utils.getBidIdParamater('bidfloor', bid.params);

      var whArr = getWidthAndHeight(bid);

      var imp = {
        id: bid.bidId,
        banner: {
          w: whArr[0],
          h: whArr[1]
        },
        tagid: tagId,
        bidfloor: bidFloor
      };

      nginadImps.push(imp);
      //bidmanager.pbCallbackMap[imp.id] = bid;

      rtbServerDomain = bid.params.nginadDomain;

    });

    // build bid request with impressions
    var nginadBidReq = {
      id: utils.getUniqueIdentifierStr(),
      imp: nginadImps,
      site: {
        domain: domain,
        page: page
      }
    };

    var scriptUrl = window.location.protocol + '//' + rtbServerDomain + '/bid/rtb?callback=window.$$PREBID_GLOBAL$$.nginadResponse' +
      '&br=' + encodeURIComponent(JSON.stringify(nginadBidReq));

    adloader.loadScript(scriptUrl, null);
  }

  function handleErrorResponse(bidReqs, defaultPlacementForBadBid) {
    //no response data
    if (defaultPlacementForBadBid === null) {
      // no id with which to create an dummy bid
      return;
    }

    var bid = bidfactory.createBid(2);
    bid.bidderCode = 'nginad';
    bidmanager.addBidResponse(defaultPlacementForBadBid, bid);
  }

  //expose the callback to the global object:
  $$PREBID_GLOBAL$$.nginadResponse = function(nginadResponseObj) {
    var bid = {};
    var key;

    // valid object?
    if (!nginadResponseObj || !nginadResponseObj.id) {
      return handleErrorResponse(nginadResponseObj, defaultPlacementForBadBid);
    }

    if (!nginadResponseObj.seatbid || nginadResponseObj.seatbid.length === 0 || !nginadResponseObj.seatbid[0].bid || nginadResponseObj.seatbid[0].bid.length === 0) {
      return handleErrorResponse(nginadResponseObj, defaultPlacementForBadBid);
    }

    for (key in nginadResponseObj.seatbid[0].bid) {

      var nginadBid = nginadResponseObj.seatbid[0].bid[key];

      var responseCPM;
      var placementCode = '';
      var id = nginadBid.impid;

      // try to fetch the bid request we sent NginAd
      var bidObj = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === 'nginad').bids
        .find(bid => bid.bidId === id);
      if (!bidObj) {
        return handleErrorResponse(nginadBid, defaultPlacementForBadBid);
      }

      placementCode = bidObj.placementCode;
      bidObj.status = CONSTANTS.STATUS.GOOD;

      //place ad response on bidmanager._adResponsesByBidderId
      responseCPM = parseFloat(nginadBid.price);

      if (responseCPM === 0) {
        handleErrorResponse(nginadBid, id);
      }

      nginadBid.placementCode = placementCode;
      nginadBid.size = bidObj.sizes;
      var responseAd = nginadBid.adm;

      //store bid response
      //bid status is good (indicating 1)
      bid = bidfactory.createBid(1);
      bid.creative_id = nginadBid.Id;
      bid.bidderCode = 'nginad';
      bid.cpm = responseCPM;

      //The bid is a mock bid, the true bidding process happens after the publisher tag is called
      bid.ad = decodeURIComponent(responseAd);

      var whArr = getWidthAndHeight(bidObj);
      bid.width = whArr[0];
      bid.height = whArr[1];

      bidmanager.addBidResponse(placementCode, bid);

    }

  }; // nginadResponse

  return {
    callBids: _callBids
  };
};

module.exports = NginAdAdapter;
