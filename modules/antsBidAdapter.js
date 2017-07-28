import adaptermanager from 'src/adaptermanager';

var utils = require('src/utils.js');
var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader');
var CONSTANTS = require('src/constants.json');

var AntsAdapter = function AntsAdapter() {
  function _callBids(params) {
    var bids;
    var zoneId;
    var ref = utils.getTopWindowUrl();
    bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      zoneId = utils.getBidIdParameter('zoneId', bid.params);

      var scriptUrl = '//d.ants.vn/hb/' + zoneId + '.json?url=' + ref + '&callback=window.$$PREBID_GLOBAL$$.antsResponse&callback_uid=' + bid.bidId;

      adloader.loadScript(scriptUrl);
    }
  }

  $$PREBID_GLOBAL$$.antsResponse = function (antsResponseObj) {
    var bidCode;

    if (antsResponseObj && antsResponseObj.callback_uid) {
      var id = antsResponseObj.callback_uid;
      var placementCode = '';
      var bidObj = utils.getBidRequest(id);
      if (bidObj) {
        bidCode = bidObj.bidder;

        placementCode = bidObj.placementCode;

        bidObj.status = CONSTANTS.STATUS.GOOD;
      }

      utils.logMessage('JSONP callback function called for zone ID: ' + id);

      var bid = [];
      if (antsResponseObj.result && antsResponseObj.result.cpm && antsResponseObj.result.cpm !== 0) {
        var adId = antsResponseObj.result.creative_id;
        bid = bidfactory.createBid(1, bidObj);
        bid.creative_id = adId;
        bid.bidderCode = bidCode;
        bid.cpm = antsResponseObj.result.cpm;
        bid.ad = antsResponseObj.result.ad;
        bid.width = antsResponseObj.result.width;
        bid.height = antsResponseObj.result.height;

        bidmanager.addBidResponse(placementCode, bid);
      } else {
        utils.logMessage('No prebid response from AppNexus for placement code ' + placementCode);

        bid = bidfactory.createBid(2, bidObj);
        bid.bidderCode = bidCode;
        bidmanager.addBidResponse(placementCode, bid);
      }
    } else {
      utils.logMessage('No prebid response for placement %%PLACEMENT%%');
    }
  };

  return {
    callBids: _callBids
  };
};

module.exports = AntsAdapter;

adaptermanager.registerBidAdapter(new AntsAdapter, 'ants');
