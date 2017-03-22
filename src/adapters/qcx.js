const utils = require('../utils.js');
const bidfactory = require('../bidfactory.js');
const bidmanager = require('../bidmanager.js');
const ajax = require('../ajax.js');
const QCX_CALLBACK_URL = 'http://qcx.rtb.quantserve.com:8080/qcx';

var QCXAdapter = function QCXAdapter() {

  const BIDDER_CODE = 'qcx';

  const DEFAULT_BID_FLOOR = 0.0000000001;
  // The following 2 constants are adopted from bidfactory.js codes
  const BID_STATUS_CODE_AVAILABLE = 1;
  const BID_STATUS_CODE_EMPTY = 2;
  let bidRequests = {};

  let returnEmptyBid = function() {
      var bidsRequested = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === BIDDER_CODE).bids;
      if (bidsRequested.length > 0) {
        let bid = bidfactory.createBid(BID_STATUS_CODE_EMPTY);
        bid.bidderCode = BIDDER_CODE;
        bidmanager.addBidResponse(bidsRequested[0].placementCode, bid);
      }
      return;
  };

  //expose the callback to the global object:
  $$PREBID_GLOBAL$$.handleQcxCB = function (responseText) {
    if(utils.isEmpty(responseText)) {
      return;
    }
    let response = JSON.parse(responseText);
    if(typeof(response) === 'undefined' || !response.hasOwnProperty('bids') || utils.isEmpty(response.bids)) {
      return returnEmptyBid();
    }

    for(let i = 0; i < response.bids.length; i++) {
      let seatbid = response.bids[i];
      let key = seatbid.placementCode + "-" + seatbid.width + 'x' + seatbid.height;
      var request = bidRequests[key];
      if(request == null) {
         return returnEmptyBid();
      }
      // This line is required since this is the field
      // that bidfactory.createBid looks for
      request.bidId = request.imp[0].placementCode;
      let responseBid = bidfactory.createBid(BID_STATUS_CODE_AVAILABLE, request);

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
        // make sure the "sizes" are an array of arrays
        if (!(bid.sizes[0] instanceof Array)) {
          bid.sizes = [bid.sizes];
        }
        utils._each(bid.sizes, function(size) {
          let key = bid.placementCode + "-" + size[0] + 'x' + size[1];
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
          ajax.ajax(QCX_CALLBACK_URL, $$PREBID_GLOBAL$$.handleQcxCB, JSON.stringify(bidRequest), {
            method : 'POST'
          });
        });
      });
    }


  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: callBids,
    QCX_CALLBACK_URL: QCX_CALLBACK_URL
  };
};

exports.createNew = function() {
  return new QCXAdapter();
};


module.exports = QCXAdapter;
