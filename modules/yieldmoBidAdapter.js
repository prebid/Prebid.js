var utils = require('src/utils.js');
var adloader = require('src/adloader.js');
var bidmanager = require('src/bidmanager.js');
var bidfactory = require('src/bidfactory.js');
var adaptermanager = require('src/adaptermanager');

/**
 * Adapter for requesting bids from Yieldmo.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
console.log('CALLED2');

var YieldmoAdapter = function YieldmoAdapter() {
  function _callBids(params) {
    
    console.log('CALLED');



    var bids = params.bids;

    for (var i = 0; i < bids.length; i++) {
      var bidRequest = bids[i];
      var callbackId = bidRequest.bidId;
      adloader.loadScript(buildYieldmoCall(bidRequest, callbackId));
    }
  }

  function buildYieldmoCall(bid, callbackId) {
    // determine tag params
    var inventoryCode = utils.getBidIdParameter('inventoryCode', bid.params);
    var floor = utils.getBidIdParameter('floor', bid.params);

    // build our base tag, based on if we are http or https
    var ymURI = '//ads.yieldmo.com/ads?';
    var ymCall = document.location.protocol + ymURI;

    ymCall = utils.tryAppendQueryString(ymCall, 'callback', '$$PREBID_GLOBAL$$.TLCB');
    ymCall = utils.tryAppendQueryString(ymCall, 'lib', 'prebid');
    ymCall = utils.tryAppendQueryString(ymCall, 'v', '$prebid.version$');
    ymCall = utils.tryAppendQueryString(ymCall, 'callback_id', callbackId);
    ymCall = utils.tryAppendQueryString(ymCall, 'inv_code', inventoryCode);
    ymCall = utils.tryAppendQueryString(ymCall, 'floor', floor);


    console.log('CALLED');
    // sizes takes a bit more logic
    // var sizeQueryString = utils.parseSizesInput(bid.sizes);
    // if (sizeQueryString) {
    //   ymCall += 'size=' + sizeQueryString + '&';
    // }

    // append referrer
    var referrer = utils.getTopWindowUrl();
    ymCall = utils.tryAppendQueryString(ymCall, 'referrer', referrer);

    // remove the trailing "&"
    if (ymCall.lastIndexOf('&') === ymCall.length - 1) {
      ymCall = ymCall.substring(0, ymCall.length - 1);
    }

    // @if NODE_ENV='debug'
    utils.logMessage('ymCall request built: ' + ymCall);
    // @endif

    // append a timer here to track latency
    // bid.startTime = new Date().getTime();

    return ymCall;
  }

  // expose the callback to the global object:
  $$PREBID_GLOBAL$$.TLCB = function(tlResponseObj) {
    if (tlResponseObj && tlResponseObj.callback_id) {
      var bidObj = utils.getBidRequest(tlResponseObj.callback_id);
      var placementCode = bidObj && bidObj.placementCode;

      // @if NODE_ENV='debug'
      if (bidObj) { utils.logMessage('JSONP callback function called for inventory code: ' + bidObj.params.inventoryCode); }
      // @endif

      var bid = [];
      if (tlResponseObj && tlResponseObj.cpm && tlResponseObj.cpm !== 0) {
        bid = bidfactory.createBid(1, bidObj);
        bid.bidderCode = 'yieldmo';
        bid.cpm = tlResponseObj.cpm;
        bid.ad = tlResponseObj.ad;
        bid.width = tlResponseObj.width;
        bid.height = tlResponseObj.height;
        bid.dealId = tlResponseObj.deal_id;
        bidmanager.addBidResponse(placementCode, bid);
      } else {
        // no response data
        // @if NODE_ENV='debug'
        if (bidObj) { utils.logMessage('No prebid response from yieldmo for inventory code: ' + bidObj.params.inventoryCode); }
        // @endif
        bid = bidfactory.createBid(2, bidObj);
        bid.bidderCode = 'yieldmo';
        bidmanager.addBidResponse(placementCode, bid);
      }
    } else {
      // no response data
      // @if NODE_ENV='debug'
      utils.logMessage('No prebid response for placement %%PLACEMENT%%');
      // @endif
    }
  };

  return {
    callBids: _callBids

  };
};

adaptermanager.registerBidAdapter(new YieldmoAdapter, 'yieldmo');

module.exports = YieldmoAdapter;
