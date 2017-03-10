const bidfactory = require('../bidfactory.js');
const bidmanager = require('../bidmanager.js');
const ajax = require('../ajax.js');
const utils = require('../utils.js');

var QCXAdapter = function QCXAdapter() {

  const BIDDER_CODE 			= 'qcx';
  const QCX_CALLBACK_URL 		= 'http://head.quantcast.com?';
  const DEFAULT_BID_FLOOR 	= 0.0000000001;


  //expose the callback to the global object:
  $$PREBID_GLOBAL$$.handleQcxCB = function (response) {
    if(typeof(response) === 'undefined' || !response.hasOwnProperty('bids') || utils.isEmpty(response.bids)) {
      var bidsRequested = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === BIDDER_CODE).bids;
      if (bidsRequested.length > 0) {
        let bid = bidfactory.createBid(2);
        bid.bidderCode = BIDDER_CODE;
        bidmanager.addBidResponse(bidsRequested[0].placementCode, bid);
      }

      return;
    }

    for(let i = 0; i < response.bids.length; i++) {
      let seatbid = response.bids[i];
      var request = utils.getBidRequest(seatbid.impid);
      let bid = utils.extend(bidfactory.createBid(1), seatbid);
      bidmanager.addBidResponse(request.placementCode, bid);
    }

  };

  function _callBids(params) {
      let bids 		= params.bids || [];
      let referrer 	= utils.getTopWindowUrl();
      let loc 		= utils.getTopWindowLocation();
      let domain      = loc.hostname;
      let publisherId   = 0;
      let bidRequests = {};

      if (bids.length === 0) {
        return;
      }
      publisherId = '' + bids[0].params.publisherId;
      utils._each(bids, function(bid) {
        // make sure the "sizes" are an array of arrays
        if (!(bid.sizes[0] instanceof Array)) {
          bid.sizes = [bid.sizes];
        }
        utils._each(bid.sizes, function(size) {
          let key = size[0] + 'x' + size[1];
          bidRequests[key] = bidRequests[key] || {
            'publisherId'   : publisherId,
            'id'            : params.requestId,
            'site'          : {
              'page' 		: loc.href,
              'referrer' 	: referrer,
              'domain'	: domain,
            },
            'imp' 		: [{

              'banner'	: {
                'battr' : bid.params.battr,
                'w'		: size[0],
                'h'		: size[1],
              },
              'id' 		: bid.params.id,
              'bidfloor'	: bid.params.bidFloor || DEFAULT_BID_FLOOR,
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
    callBids: _callBids
  };
};

exports.createNew = function() {
  return new QCXAdapter();
};


module.exports = QCXAdapter;
