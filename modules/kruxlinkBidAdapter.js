var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader.js');
var adaptermanager = require('src/adaptermanager');

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
    if (response.seatbid !== undefined) {
      for (var i = 0; i < response.seatbid.length; i++) {
        var seatbid = response.seatbid[i];
        if (seatbid.bid !== undefined) {
          for (var j = 0; j < seatbid.bid.length; j++) {
            var bid = seatbid.bid[j];
            if (bid.impid !== undefined) {
              _makeBidResponse(placements[bid.impid], bid);
              delete placements[bid.impid];
            }
          }
        }
      }
    }

    // Add any no-bids remaining
    for (var impid in placements) {
      if (placements.hasOwnProperty(impid)) {
        _makeBidResponse(placements[impid]);
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

function KruxAdapter() {
  return {
    callBids: _callBids
  };
}

adaptermanager.registerBidAdapter(new KruxAdapter, 'kruxlink');

module.exports = KruxAdapter;
