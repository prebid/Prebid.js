var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');
var utils = require('../utils.js');
var CONSTANTS = require('../constants.json');

var InnityAdapter = function InnityAdapter() {

  function _callBids(params) {
    var bidURL, bids = params.bids || [], requestURL = window.location.protocol + '//as.innity.com/synd/?cb=' + new Date().getTime() + '&ver=2&hb=1&output=js&';    
    for (var i = 0; i < bids.length; i++) {
      var requestParams = {}, bid = bids[i];
      requestParams.pub = bid.params.pub;
      requestParams.zone = bid.params.zone;
      // Page URL
      requestParams.url = utils.getTopWindowUrl();
      // Sizes
      var parseSized = utils.parseSizesInput(bid.sizes), arrSize = parseSized[0].split('x');
      requestParams.width = arrSize[0];
      requestParams.height = arrSize[1];
      // Callback function
      requestParams.callback = "$$PREBID_GLOBAL$$._doInnityCallback";
      // Callback ID
      requestParams.callback_uid = bid.bidId;
      // Load Bidder URL
      bidURL = requestURL + utils.parseQueryStringParameters(requestParams);
      utils.logMessage('Innity.prebid, Bid ID: ' + bid.bidId + ', Pub ID: ' + bid.params.pub + ', Zone ID: ' + bid.params.zone + ', URL: ' + bidURL);
      adloader.loadScript(bidURL);
    }
  }
	
  $$PREBID_GLOBAL$$._doInnityCallback = function(response) {
    var bidObject, bidRequest, callbackID, libURL = window.location.protocol + "//cdn.innity.net/frame_util.js";
    callbackID = response.callback_uid;
    bidRequest = utils.getBidRequest(callbackID);
    if (response.cpm > 0) {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidRequest);
      bidObject.bidderCode = 'innity';
      bidObject.cpm = parseFloat(response.cpm) / 100;
      bidObject.ad = '<script src="' + libURL + '"></script>' + response.tag;
      bidObject.width = response.width;
      bidObject.height = response.height;
    } else {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequest);
      bidObject.bidderCode = 'innity';
      utils.logMessage('No Bid response from Innity request: ' + callbackID);
    }
    bidmanager.addBidResponse(bidRequest.placementCode, bidObject);
  };

  return {
    callBids: _callBids
  };
};

module.exports = InnityAdapter;