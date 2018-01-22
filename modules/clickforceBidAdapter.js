var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader.js');
var utils = require('src/utils.js');
var adaptermanager = require('src/adaptermanager');
var CONSTANTS = require('src/constants.json');

var ClickforceAdapter = function ClickforceAdapter() {
  function _callBids(params) {
    var bids = params.bids;
    for (var i = 0; i < bids.length; i++) {
      var bidServer = window.location.protocol + '//ad.doublemax.net/adserver/prebid.json?cb=' + new Date().getTime() + '&hb=1&';
      var bid = bids[i], bidParams = {};
      if (typeof (bid.params.bidServer) !== 'undefined') {
        bidServer = bid.params.bidServer;
      }
      bidParams.z = bid.params.zone;
      bidParams.bidId = bid.bidId;
      bidParams.rf = utils.getTopWindowUrl();
      var bidURL = bidServer + utils.parseQueryStringParameters(bidParams);
      utils.logMessage('CLICKFORCE : ' + bidURL);
      adloader.loadScript(bidURL);
    }
  }

  $$PREBID_GLOBAL$$.clickforceCallBack = function(response) {
    var bidObject, bidRequest, callbackID;
    callbackID = response.callback_uid;
    bidRequest = utils.getBidRequest(callbackID);
    if (response.tag.length > 0) {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidRequest);
      bidObject.bidderCode = 'clickforce';
      bidObject.cpm = parseFloat(response.cpm);
      bidObject.ad = response.tag;
      bidObject.statusMessage = response.type;
      bidObject.width = response.width;
      bidObject.height = response.height;
    } else {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequest);
      bidObject.bidderCode = 'clickforce';
      utils.logMessage('No Bid response from request: ' + callbackID);
    }
    bidmanager.addBidResponse(bidRequest.placementCode, bidObject);
  };

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new ClickforceAdapter(), 'clickforce');
module.exports = ClickforceAdapter;
