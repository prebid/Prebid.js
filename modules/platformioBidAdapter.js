var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');
var utils = require('../utils.js');
var CONSTANTS = require('../constants.json');

var PlatformIOAdapter = function PlatformIOAdapter() {
  function _callBids(params) {
    var bidURL, bids = params.bids || [], requestURL = window.location.protocol + '//adx1js.s3.amazonaws.com/pb_ortb.js?cb=' + new Date().getTime() + '&ver=1&';

    for (var i = 0; i < bids.length; i++) {
      var requestParams = {}, bid = bids[i];

      requestParams.pub_id = bid.params.pubId;
      requestParams.placement_id = bid.params.placementId;
      requestParams.site_id = bid.params.siteId;

      var parseSized = utils.parseSizesInput(bid.sizes), arrSize = parseSized[0].split('x');

      requestParams.width = arrSize[0];
      requestParams.height = arrSize[1];
      requestParams.callback = 'pbjs._doPlatformIOCallback';
      requestParams.callback_uid = bid.bidId;
      bidURL = requestURL + utils.parseQueryStringParameters(requestParams);

      utils.logMessage('PlatformIO.prebid, Bid ID: ' + bid.bidId + ', Pub ID: ' + bid.params.pubId);
      adloader.loadScript(bidURL);
    }
  }

  pbjs._doPlatformIOCallback = function (response) {
    var bidObject, bidRequest, callbackID;
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
      utils.logMessage('No Bid response from Admachine request: ' + callbackID);
    }
    bidmanager.addBidResponse(bidRequest.placementCode, bidObject);
  };

  return {
    callBids: _callBids
  };
};

module.exports = PlatformIOAdapter;
