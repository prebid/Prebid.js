var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');

/* TripleLift bidder factory function
*  Use to create a TripleLiftAdapter object
*/


var TripleLiftAdapter = function TripleLiftAdapter() {

  function _callBids(params) {
    var tlReq = params.bids;
    var bidsCount = tlReq.length;

    //set expected bids count for callback execution
    //bidmanager.setExpectedBidsCount('triplelift',bidsCount);

    for (var i = 0; i < bidsCount; i++) {
      var bidRequest = tlReq[i];
      var callbackId = bidRequest.bidId;
      adloader.loadScript(buildTLCall(bidRequest, callbackId));
      //store a reference to the bidRequest from the callback id
      //bidmanager.pbCallbackMap[callbackId] = bidRequest;
    }

  }


  function buildTLCall(bid, callbackId) {
    //determine tag params
    var inventoryCode = utils.getBidIdParamater('inventoryCode', bid.params);
    var floor = utils.getBidIdParamater('floor', bid.params);


    //build our base tag, based on if we are http or https
    var tlURI = '//tlx.3lift.com/header/auction?';
    var tlCall = document.location.protocol + tlURI;

    tlCall = utils.tryAppendQueryString(tlCall, 'callback', '$$PREBID_GLOBAL$$.TLCB');
    tlCall = utils.tryAppendQueryString(tlCall, 'lib', 'prebid');
    tlCall = utils.tryAppendQueryString(tlCall, 'v', '$prebid.version$');
    tlCall = utils.tryAppendQueryString(tlCall, 'callback_id', callbackId);
    tlCall = utils.tryAppendQueryString(tlCall, 'inv_code', inventoryCode);
    tlCall = utils.tryAppendQueryString(tlCall, 'floor', floor);

    //sizes takes a bit more logic
    var sizeQueryString = utils.parseSizesInput(bid.sizes);
    if (sizeQueryString) {
      tlCall += 'size=' + sizeQueryString + '&';
    }

    //append referrer
    var referrer = utils.getTopWindowUrl();
    tlCall = utils.tryAppendQueryString(tlCall, 'referrer', referrer);

    //remove the trailing "&"
    if (tlCall.lastIndexOf('&') === tlCall.length - 1) {
      tlCall = tlCall.substring(0, tlCall.length - 1);
    }

    // @if NODE_ENV='debug'
    utils.logMessage('tlCall request built: ' + tlCall);
    // @endif

    //append a timer here to track latency
    bid.startTime = new Date().getTime();

    return tlCall;

  }


  //expose the callback to the global object:
  $$PREBID_GLOBAL$$.TLCB = function(tlResponseObj) {
    if (tlResponseObj && tlResponseObj.callback_id) {
      var bidObj = utils.getBidRequest(tlResponseObj.callback_id);
      var placementCode = bidObj && bidObj.placementCode;

      // @if NODE_ENV='debug'
      if (bidObj) {utils.logMessage('JSONP callback function called for inventory code: ' + bidObj.params.inventoryCode);}
      // @endif

      var bid = [];
      if (tlResponseObj && tlResponseObj.cpm && tlResponseObj.cpm !== 0) {

        bid = bidfactory.createBid(1, bidObj);
        bid.bidderCode = 'triplelift';
        bid.cpm = tlResponseObj.cpm;
        bid.ad = tlResponseObj.ad;
        bid.width = tlResponseObj.width;
        bid.height = tlResponseObj.height;
        bid.dealId = tlResponseObj.deal_id;
        bidmanager.addBidResponse(placementCode, bid);

      } else {
        //no response data
        // @if NODE_ENV='debug'
        if (bidObj) {utils.logMessage('No prebid response from TripleLift for inventory code: ' + bidObj.params.inventoryCode);}
        // @endif
        bid = bidfactory.createBid(2, bidObj);
        bid.bidderCode = 'triplelift';
        bidmanager.addBidResponse(placementCode, bid);
      }

    } else {
      //no response data
      // @if NODE_ENV='debug'
      utils.logMessage('No prebid response for placement %%PLACEMENT%%');
      // @endif

    }

  };

  return {
    callBids: _callBids

  };
};
module.exports = TripleLiftAdapter;
