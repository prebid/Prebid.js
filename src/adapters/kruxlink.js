var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');

function _qs(key, value) {
  return encodeURIComponent(key) + '=' + encodeURIComponent(value);
}

function _makeBidResponse(placementCode, bid) {
  var bidResponse = bidfactory.createBid(bid !== undefined ? 1 : 2);
  bidResponse.bidderCode = 'kruxlink';
  if (bid !== undefined) {
    bidResponse.cpm = bid.price;
    bidResponse.ad = bid.adm;
    bidResponse.width = bid.w;
    bidResponse.height = bid.h;
  }
  bidmanager.addBidResponse(placementCode, bidResponse);
}

function _makeCallback(id, placements) {
  var callback = '_kruxlink_' + id;
  $$PREBID_GLOBAL$$[callback] = function(response) {
    // Clean up our callback
    delete $$PREBID_GLOBAL$$[callback];

    // Add in the bid respones
    for (var i = 0; i < response.seatbid.length; i++) {
      var seatbid = response.seatbid[i];
      for (var j = 0; j < seatbid.bid.length; j++) {
        var bid = seatbid.bid[j];
        _makeBidResponse(placements[bid.impid], bid);
        delete placements[bid.impid];
      }
    }

    // Add any no-bids remaining
    for (var placementCode in placements) {
      if (placements.hasOwnProperty(placementCode)) {
        _makeBidResponse(placementCode);
      }
    }
  };

  return '$$PREBID_GLOBAL$$.' + callback;
}

function _callBids(params) {
  var impids = [];
  var placements = {};

  var bids = params.bids || [];
  for (var i = 0; i < bids.length; i++) {
    var bidRequest = bids[i];
    var bidRequestParams = bidRequest.params || {};
    var impid = bidRequestParams.impid;
    placements[impid] = bidRequest.placementCode;

    impids.push(impid);
  }

  var callback = _makeCallback(params.bidderRequestId, placements);
  var qs = [
    _qs('id', params.bidderRequestId),
    _qs('u', window.location.href),
    _qs('impid', impids.join(',')),
    _qs('calltype', 'pbd'),
    _qs('callback', callback)
  ];
  var url = 'https://link.krxd.net/hb?' + qs.join('&');

  adloader.loadScript(url);
}

module.exports = function KruxAdapter() {
  return {
    callBids: _callBids
  };
};
