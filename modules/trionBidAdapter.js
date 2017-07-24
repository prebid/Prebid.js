var CONSTANTS = require('src/constants.json');
var utils = require('src/utils.js');
var adloader = require('src/adloader.js');
var bidmanager = require('src/bidmanager.js');
var bidfactory = require('src/bidfactory.js');
var Adapter = require('src/adapter.js');
var adaptermanager = require('src/adaptermanager');

const BID_REQUEST_BASE_URL = 'https://in-appadvertising.com/api/bidRequest?';
const USER_SYNC_URL = 'https://in-appadvertising.com/api/userSync.js';

function TrionAdapter() {
  var baseAdapter = Adapter.createNew('trion');
  var userTag = null;

  baseAdapter.callBids = function (params) {
    var bids = params.bids || [];

    if (!bids.length) {
      return;
    }

    if (!window.TRION_INT) {
      adloader.loadScript(USER_SYNC_URL, function () {
        userTag = window.TRION_INT || {};
        userTag.pubId = utils.getBidIdParameter('pubId', bids[0].params);
        userTag.sectionId = utils.getBidIdParameter('sectionId', bids[0].params);
        if (!userTag.to) {
          getBids(bids);
        }
        else {
          setTimeout(function () {
            getBids(bids);
          }, userTag.to);
        }
      }, true);
    } else {
      userTag = window.TRION_INT;
      getBids(bids);
    }
  };

  function getBids(bids) {
    if (!userTag.int_t) {
      userTag.int_t = window.TR_INT_T || -1;
    }

    for (var i = 0; i < bids.length; i++) {
      var bidRequest = bids[i];
      var bidId = bidRequest.bidId;
      adloader.loadScript(buildTrionUrl(bidRequest, bidId));
    }
  }

  function buildTrionUrl(bid, bidId) {
    var pubId = utils.getBidIdParameter('pubId', bid.params);
    var sectionId = utils.getBidIdParameter('sectionId', bid.params);
    var re = utils.getBidIdParameter('re', bid.params);
    var url = utils.getTopWindowUrl();
    var sizes = utils.parseSizesInput(bid.sizes).join(',');

    var trionUrl = BID_REQUEST_BASE_URL;

    trionUrl = utils.tryAppendQueryString(trionUrl, 'callback', '$$PREBID_GLOBAL$$.handleTrionCB');
    trionUrl = utils.tryAppendQueryString(trionUrl, 'bidId', bidId);
    trionUrl = utils.tryAppendQueryString(trionUrl, 'pubId', pubId);
    trionUrl = utils.tryAppendQueryString(trionUrl, 'sectionId', sectionId);
    trionUrl = utils.tryAppendQueryString(trionUrl, 're', re);
    trionUrl = utils.tryAppendQueryString(trionUrl, 'slot', bid.placementCode);
    if (url) {
      trionUrl += 'url=' + url + '&';
    }
    if (sizes) {
      trionUrl += 'sizes=' + sizes + '&';
    }
    if (userTag) {
      trionUrl += 'tag=' + encodeURIComponent(JSON.stringify(userTag)) + '&';
    }

    // remove the trailing "&"
    if (trionUrl.lastIndexOf('&') === trionUrl.length - 1) {
      trionUrl = trionUrl.substring(0, trionUrl.length - 1);
    }

    return trionUrl;
  }

  // expose the callback to the global object:
  $$PREBID_GLOBAL$$.handleTrionCB = function (trionResponseObj) {
    var bid;
    var bidObj = {};
    var placementCode = '';

    if (trionResponseObj && trionResponseObj.bidId) {
      var bidCode;
      var bidId = trionResponseObj.bidId;
      var result = trionResponseObj && trionResponseObj.result;

      bidObj = utils.getBidRequest(bidId);
      if (bidObj) {
        bidCode = bidObj.bidder;
        placementCode = bidObj.placementCode;
      }

      if (result && result.cpm && result.placeBid && result.ad) {
        var cpm = parseInt(result.cpm, 10) / 100;
        bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidObj);
        bid.bidderCode = bidCode;
        bid.cpm = cpm;
        bid.ad = result.ad;
        bid.width = result.width;
        bid.height = result.height;
      }
    }
    if (!bid) {
      bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidObj);
    }
    bidmanager.addBidResponse(placementCode, bid);
  };

  return {
    callBids: baseAdapter.callBids,
    setBidderCode: baseAdapter.setBidderCode,
    createNew: TrionAdapter.createNew,
    buildTrionUrl: buildTrionUrl
  };
};

TrionAdapter.createNew = function () {
  return new TrionAdapter();
};

adaptermanager.registerBidAdapter(new TrionAdapter(), 'trion');

module.exports = TrionAdapter;
