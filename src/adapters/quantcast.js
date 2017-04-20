const utils = require('../utils.js');
const bidfactory = require('../bidfactory.js');
const bidmanager = require('../bidmanager.js');
const ajax = require('../ajax.js');
const CONSTANTS = require('../constants.json');
const QUANTCAST_CALLBACK_URL = 'http://global.qc.rtb.quantserve.com:8080/qchb';

var QuantcastAdapter = function QuantcastAdapter() {

  const BIDDER_CODE = 'quantcast';

  const DEFAULT_BID_FLOOR = 0.0000000001;
  let bidRequests = {};

  let returnEmptyBid = function() {
      var bidsRequested = utils.getBidRequest(BIDDER_CODE);
      if (!utils.isEmpty(bidsRequested) && bidsRequested.length > 0) {
        let bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidsRequested[0]);
        bid.bidderCode = BIDDER_CODE;
        bidmanager.addBidResponse(bidsRequested[0].placementCode, bid);
      }
      return;
    };

  //expose the callback to the global object:
  $$PREBID_GLOBAL$$.handleQuantcastCB = function (responseText) {
    if(utils.isEmpty(responseText)) {
      return;
    }
    let response = null;
    try {
      response = JSON.parse(responseText);
    } catch(e) {
      // Malformed JSON
      utils.logError("Malformed JSON received from server ");
      return returnEmptyBid();
    }

    if(typeof(response) === 'undefined' || !response.hasOwnProperty('bids') || utils.isEmpty(response.bids)) {
      return returnEmptyBid();
    }

    for(let i = 0; i < response.bids.length; i++) {
      let seatbid = response.bids[i];
      let key = seatbid.placementCode + "-" + seatbid.width + 'x' + seatbid.height;
      var request = bidRequests[key];
      if(request === null) {
        return returnEmptyBid();
      }
      // This line is required since this is the field
      // that bidfactory.createBid looks for
      request.bidId = request.imp[0].placementCode;
      let responseBid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, request);

      responseBid.cpm = seatbid.cpm;
      responseBid.ad = seatbid.ad;
      responseBid.height = seatbid.height;
      responseBid.width = seatbid.width;
      responseBid.bidderCode = response.bidderCode;

      bidmanager.addBidResponse(request.bidId, responseBid);
    }

  };

  function callBids(params) {
    let bids = params.bids || [];
    if (bids.length === 0) {
      return;
    }

    let referrer = utils.getTopWindowUrl();
    let loc = utils.getTopWindowLocation();
    let domain = loc.hostname;
    let publisherId = 0;

    publisherId = '' + bids[0].params.publisherId;
    utils._each(bids, function(bid) {
      let bidSizes = utils.parseSizesInput(bid.sizes);
      utils._each(bidSizes, function(bidSizeStr) {
        let key = bid.placementCode + "-" + bidSizeStr;
        let size = bidSizeStr.split('x');
        bidRequests[key] = bidRequests[key] || {
          'publisherId' : publisherId,
          'requestId' : params.requestId,
          'site' : {
            'page' : loc.href,
            'referrer' : referrer,
            'domain' : domain,
          },
          'imp' : [{

            'banner' : {
              'battr' : bid.params.battr,
              'width' : size[0],
              'height' : size[1],
            },
            'placementCode' : bid.placementCode,
            'bidFloor' : bid.params.bidFloor || DEFAULT_BID_FLOOR,
          }]
        };
      });

      utils._each(bidRequests, function (bidRequest) {
        ajax.ajax(QUANTCAST_CALLBACK_URL, $$PREBID_GLOBAL$$.handleQuantcastCB, JSON.stringify(bidRequest), {
          method : 'POST'
        });
      });
    });
  }


  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: callBids,
    QUANTCAST_CALLBACK_URL: QUANTCAST_CALLBACK_URL
  };
};

exports.createNew = function() {
  return new QuantcastAdapter();
};


module.exports = QuantcastAdapter;
