// var bidfactory = require('../bidfactory.js');
// var bidmanager = require('../bidmanager.js');
var Ajax = require('../ajax');

var BidderNameAdapter = function BidderNameAdapter() {

  const BASE_URI = '//e.serverbid.com/ados';

  var timestamp = Date.now();

  var request = {
    Placements: [],
    Keywords: undefined,
    Referrer: "",
    IsAsync: true
  };


  function _callBids(params) {
    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      bid.params.D = bid.bidId;
      request.Placements.push(bid.params);
    }

    var data = {
      t: timestamp,
      request: JSON.stringify(request)
    };

    Ajax.ajax(BASE_URI, _responseCallback, data, { method: 'GET', withCredentials: false });

  }

  function _responseCallback(result) {
    console.log(result);
  }

  // Export the `callBids` function, so that Prebid.js can execute
  // this function when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };


};

module.exports = BidderNameAdapter;