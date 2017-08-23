var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var adloader = require('src/adloader.js');
var utils = require('src/utils.js');
var CONSTANTS = require('src/constants.json');
var adaptermanager = require('src/adaptermanager');

var PlatformIOAdapter = function PlatformIOAdapter() {
  function _callBids(params) {
    var bidURL;
    var bids = params.bids || [];
    var requestURL = window.location.protocol + '//adx1js.s3.amazonaws.com/pb_ortb.js?cb=' + new Date().getTime() + '&ver=1&';

    for (var i = 0; i < bids.length; i++) {
      var requestParams = {};
      var bid = bids[i];

      requestParams.pub_id = bid.params.pubId;
      requestParams.site_id = bid.params.siteId;

      var parseSized = utils.parseSizesInput(bid.sizes);
      var arrSize = parseSized[0].split('x');

      requestParams.width = arrSize[0];
      requestParams.height = arrSize[1];
      requestParams.callback = '$$PREBID_GLOBAL$$._doPlatformIOCallback';
      requestParams.callback_uid = bid.bidId;
      bidURL = requestURL + utils.parseQueryStringParameters(requestParams);

      utils.logMessage('PlatformIO.prebid, Bid ID: ' + bid.bidId + ', Pub ID: ' + bid.params.pubId);
      adloader.loadScript(bidURL);
    }
  }

  $$PREBID_GLOBAL$$._doPlatformIOCallback = function (response) {
    var bidObject;
    var bidRequest;
    var callbackID;
    callbackID = response.callback_uid;
    bidRequest = utils.getBidRequest(callbackID);
    if (response.cpm > 0) {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidRequest);
      bidObject.bidderCode = 'platformio';
      bidObject.cpm = response.cpm;
      bidObject.ad = response.tag;
      bidObject.width = response.width;
      bidObject.height = response.height;
    } else {
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, bidRequest);
      bidObject.bidderCode = 'platformio';
      utils.logMessage('No Bid response from Platformio request: ' + callbackID);
    }
    bidmanager.addBidResponse(bidRequest.placementCode, bidObject);
  };

  return {
    callBids: _callBids
  };
};
adaptermanager.registerBidAdapter(new PlatformIOAdapter(), 'platformio');

module.exports = PlatformIOAdapter;
