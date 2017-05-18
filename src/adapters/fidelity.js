var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');
var STATUS = require('../constants').STATUS;

var FidelityAdapter = function FidelityAdapter() {
  var FIDELITY_BIDDER_NAME = 'fidelity';
  var FIDELITY_SERVER_NAME = 'x.fidelity-media.com';

  function _callBids(params) {
    var bids = params.bids || [];
    bids.forEach(function (currentBid) {
      var server = currentBid.params.server || FIDELITY_SERVER_NAME;
      var m3_u = window.location.protocol + '//' + server + '/delivery/hb.php?';
      m3_u += 'callback=window.$$PREBID_GLOBAL$$.fidelityResponse';
      m3_u += '&requestid=' + utils.getUniqueIdentifierStr();
      m3_u += '&impid=' + currentBid.bidId;
      m3_u += '&zoneid=' + currentBid.params.zoneid;
      m3_u += '&cb=' + Math.floor(Math.random() * 99999999999);
      m3_u += document.charset ? '&charset=' + document.charset : (document.characterSet ? '&charset=' + document.characterSet : '');

      var loc;
      try {
        loc = window.top !== window ? document.referrer : window.location.href;
      } catch (e) {
        loc = document.referrer;
      }
      loc = currentBid.params.loc || loc;
      m3_u += '&loc=' + encodeURIComponent(loc);

      var subid = currentBid.params.subid || 'hb';
      m3_u += '&subid=' + subid;
      if (document.referrer) m3_u += '&referer=' + encodeURIComponent(document.referrer);
      if (currentBid.params.click) m3_u += '&ct0=' + encodeURIComponent(currentBid.params.click);
      m3_u += '&flashver=' + encodeURIComponent(getFlashVersion());

      adloader.loadScript(m3_u);
    });
  }

  function getFlashVersion() {
    var plugins, plugin, result;

    if (navigator.plugins && navigator.plugins.length > 0) {
      plugins = navigator.plugins;
      for (var i = 0; i < plugins.length && !result; i++) {
        plugin = plugins[i];
        if (plugin.name.indexOf('Shockwave Flash') > -1) {
          result = plugin.description.split('Shockwave Flash ')[1];
        }
      }
    }
    return result || '';
  }

  function addBlankBidResponses(placementsWithBidsBack) {
    var allFidelityBidRequests = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === FIDELITY_BIDDER_NAME);

    if (allFidelityBidRequests && allFidelityBidRequests.bids) {
      utils._each(allFidelityBidRequests.bids, function (fidelityBid) {
        if (!utils.contains(placementsWithBidsBack, fidelityBid.placementCode)) {
          // Add a no-bid response for this placement.
          var bid = bidfactory.createBid(STATUS.NO_BID, fidelityBid);
          bid.bidderCode = FIDELITY_BIDDER_NAME;
          bidmanager.addBidResponse(fidelityBid.placementCode, bid);
        }
      });
    }
  }

  $$PREBID_GLOBAL$$.fidelityResponse = function(responseObj) {
    if (!responseObj || !responseObj.seatbid || responseObj.seatbid.length === 0 || !responseObj.seatbid[0].bid || responseObj.seatbid[0].bid.length === 0) {
      addBlankBidResponses([]);
      return;
    }

    var bid = responseObj.seatbid[0].bid[0];
    var status = bid.adm ? STATUS.GOOD : STATUS.NO_BID;
    var requestObj = utils.getBidRequest(bid.impid);

    var bidResponse = bidfactory.createBid(status);
    bidResponse.bidderCode = FIDELITY_BIDDER_NAME;
    if (status === STATUS.GOOD) {
      bidResponse.cpm = parseFloat(bid.price);
      bidResponse.ad = bid.adm;
      bidResponse.width = parseInt(bid.width);
      bidResponse.height = parseInt(bid.height);
    }
    var placementCode = requestObj && requestObj.placementCode;
    bidmanager.addBidResponse(placementCode, bidResponse);
  };

  return {
    callBids: _callBids
  };
};

module.exports = FidelityAdapter;
