var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

//Version: 1.2

var KomoonaAdapter = function KomoonaAdapter() {
  var DATA_VER = '0.1';
  var KOMOONA_URL = "//s.komoona.com/kb/{DATA_VER}/kmn_sa_kb_c.{hbid}.js";

  var KOMOONA_BIDDER_NAME = 'komoona';
  var _bidsMap = {};

  function _callBids(params) {
    var kbConf = {
      ts_as: new Date().getTime(),
      hb_placements: [],
      kb_callback: _bid_arrived
    };

    var bids = params.bids || [];
    if (!bids || !bids.length) {
      return;
    }

    var dataVersion = DATA_VER;
    
    for(var i in bids) {
      var currentBid = bids[i];
      _bidsMap[currentBid.params.placementId] = currentBid;
      kbConf.hdbdid = kbConf.hdbdid || currentBid.params.hbid;
      kbConf.encode_bid = kbConf.encode_bid || currentBid.params.encode_bid;
      kbConf.hb_placements.push(currentBid.params.placementId);
      if (currentBid.params.dataVersion)
        dataVersion = currentBid.params.dataVersion;
    }

    var scriptUrl = KOMOONA_URL.replace('{DATA_VER}', dataVersion).replace('{hbid}', kbConf.hdbdid);

    adloader.loadScript(scriptUrl, function() {
      /*global KmnKB */
      if (typeof KmnKB === 'function') {
        KmnKB.start(kbConf);
      }
    });
  }

  function _bid_arrived(bid) {
    var bidToRegister = parseBid(bid);
    var placementCode = getPlacementCode(bid);
    bidmanager.addBidResponse(placementCode, bidToRegister);
  }

  function parseBid(bid) {
    var bidResponse = bidfactory.createBid(1);
    bidResponse.bidderCode = KOMOONA_BIDDER_NAME;
    bidResponse.ad = bid.creative;
    bidResponse.cpm = bid.cpm;
    bidResponse.width = parseInt(bid.width);
    bidResponse.height = parseInt(bid.height);

    return bidResponse;
  }

  function getPlacementCode(bid) {
    return _bidsMap[bid.placementid].placementCode;
  }
  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out bid requests.
  return {
    callBids: _callBids,
  };
};

module.exports = KomoonaAdapter;
