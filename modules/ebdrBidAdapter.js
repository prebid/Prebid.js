var CONSTANTS = require('src/constants.json');
var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader');
var adaptermanager = require('src/adaptermanager');

var defaultPlacementForBadBid = null;

/**
 * Adapter for requesting bids from Ebdr
 */
var EbdrAdapter = function EbdrAdapter() {
  var rtbServerDomain = 'dsp.bnmla.com';
  var zoneid;
  function _callBids(params) {
    var ebdrBids = params.bids || [];
    _requestBids(_getTags(ebdrBids));
  }

  // filter bids to de-dupe them?
  function _getTags(bids) {
    var key;
    // var map = {};
    var PubZoneIds = [];

    for (key in bids) {
      PubZoneIds.push(bids[key]);
      zoneid = utils.getBidIdParameter('zoneid', bids[key].params);
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

    var ebdrImps = [];
    var ebdrParams = {};
    // assign the first adUnit (placement) for bad bids;
    defaultPlacementForBadBid = bidReqs[0].placementCode;
    var bidderequestId = bidReqs[0].bidId;
    // build impression array for ebdr
    utils._each(bidReqs, function(bid) {
      var bidFloor = utils.getBidIdParameter('bidfloor', bid.params);

      var whArr = getWidthAndHeight(bid);
      ebdrParams['latitude'] = utils.getBidIdParameter('latitude', bid.params);
      ebdrParams['longitude'] = utils.getBidIdParameter('longitude', bid.params);
      ebdrParams['ifa'] = (utils.getBidIdParameter('IDFA', bid.params).length > utils.getBidIdParameter('ADID', bid.params).length) ? utils.getBidIdParameter('IDFA', bid.params) : utils.getBidIdParameter('ADID', bid.params);
      var imp = {
        id: bid.bidId,
        banner: {
          w: whArr[0],
          h: whArr[1]
        },
        // tagid: tagId,
        bidfloor: bidFloor
      };

      ebdrImps.push(imp);
      if (bid.params.ebdrDomain != undefined) {
        rtbServerDomain = bid.params.ebdrDomain;
      }
    });

    // build bid request with impressions
    var ebdrBidReq = {
      id: bidderequestId,
      imp: ebdrImps,
      site: {
        domain: domain,
        page: page
      },
      device: {
        geo: {
          lat: ebdrParams.latitude,
          log: ebdrParams.longitude
        },
        ifa: ebdrParams.ifa
      }
    };

    var scriptUrl = window.location.protocol + '//' + rtbServerDomain + '/hb?callback=window.$$PREBID_GLOBAL$$.ebdrResponse' +
       '&zoneid=' + zoneid + '&br=' + encodeURIComponent(JSON.stringify(ebdrBidReq));

    adloader.loadScript(scriptUrl);
  }

  function noBidResponse(bidReqs) {
    // no response data
    if (!bidReqs.zoneId) {
      // no id with which to create an dummy bid
      return;
    }

    var bid = bidfactory.createBid(2);
    bid.bidderCode = 'ebdr';
    bidmanager.addBidResponse(defaultPlacementForBadBid, bid);
  }

  // expose the callback to the global object:
  $$PREBID_GLOBAL$$.ebdrResponse = function(ebdrResponseObj) {
    var bid = {};
    var key;
    // valid object?
    if (!ebdrResponseObj || !ebdrResponseObj.id) {
      return noBidResponse(ebdrResponseObj);
    }

    if (!ebdrResponseObj.seatbid || ebdrResponseObj.seatbid.length === 0 || !ebdrResponseObj.seatbid[0].bid || ebdrResponseObj.seatbid[0].bid.length === 0) {
      return noBidResponse(ebdrResponseObj);
    }

    for (key in ebdrResponseObj.seatbid[0].bid) {
      var ebdrBid = ebdrResponseObj.seatbid[0].bid[key];

      var responseCPM;
      var placementCode = '';
      var id = ebdrBid.impid;
      // try to fetch the bid request we sent Ebdr
      var bidObj = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === 'ebdr').bids.find(bid => bid.bidId === id);
      if (!bidObj) {
        return noBidResponse(ebdrBid);
      }

      placementCode = bidObj.placementCode;
      bidObj.status = CONSTANTS.STATUS.GOOD;

      // place ad response on bidmanager._adResponsesByBidderId
      responseCPM = parseFloat(ebdrBid.price);

      if (responseCPM === 0) {
        noBidResponse(ebdrBid);
      }

      ebdrBid.placementCode = placementCode;
      ebdrBid.size = bidObj.sizes;
      var responseAd = ebdrBid.adm;

      // store bid response
      // bid status is good (indicating 1)
      bid = bidfactory.createBid(1);
      bid.creative_id = ebdrBid.Id;
      bid.bidderCode = 'ebdr';
      bid.cpm = responseCPM;

      // The bid is a mock bid, the true bidding process happens after the publisher tag is called
      bid.ad = decodeURIComponent(responseAd);

      var whArr = getWidthAndHeight(bidObj);
      bid.width = whArr[0];
      bid.height = whArr[1];

      bidmanager.addBidResponse(placementCode, bid);
    }
  }; // ebdrResponse
  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new EbdrAdapter(), 'ebdr');

module.exports = EbdrAdapter;
