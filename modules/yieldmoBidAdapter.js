var utils = require('src/utils.js');
var adloader = require('src/adloader.js');
var bidmanager = require('src/bidmanager.js');
var bidfactory = require('src/bidfactory.js');
var adaptermanager = require('src/adaptermanager');
var callback_id; //TODO remove this and use it coming back in the responseObj

/**
 * Adapter for requesting bids from Yieldmo.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */

var YieldmoAdapter = function YieldmoAdapter() {
  function _callBids(params) {
    var bids = params.bids;
    adloader.loadScript(buildYieldmoCall(bids));
  }

  function buildYieldmoCall(bids) {
    // build our base tag, based on if we are http or https
    var ymURI = '//ads.yieldmo.com/ads?';
    var ymCall = document.location.protocol + ymURI;

    // Placement specific information
    ymCall = _appendPlacementInformation(ymCall, bids);
    
    // General impression params
    ymCall = _appendImpressionInformation(ymCall);

    // remove the trailing "&"
    if (ymCall.lastIndexOf('&') === ymCall.length - 1) {
      ymCall = ymCall.substring(0, ymCall.length - 1);
    }

    // @if NODE_ENV='debug'
    console.log('ymCall request built: ' + ymCall);
    utils.logMessage('ymCall request built: ' + ymCall);
    // @endif

    // append a timer here to track latency
    bid.startTime = new Date().getTime();

    return ymCall;
  }

  function _appendPlacementInformation (url, bids) {
    var placements = [];
    var placement;
    var bid;

    for (var i = 0; i < bids.length; i++) {
      bid = bids[i];

      placement = {};
      placement.callbackId = bid.bidId;
      placement.placementId = bid.placementCode;
      placement.sizes = bid.sizes;

      placements.push(placement);
    }

    url = utils.tryAppendQueryString(url, 'p', JSON.stringify(placements));
    return url;
  }

  function _appendImpressionInformation (url) {
    var page_url = document.location; // page url
    var pr = document.referrer || ''; // page's referrer
    var dnt = (navigator.doNotTrack || false).toString(); // true if user enabled dnt (false by default)
    var _s = document.location.protocol === 'https:' ? 1 : 0; // 1 if page is secure
    var description = _getPageDescription();
    var title = document.title || ''; // Value of the title from the publisher's page. 
    var e = 4; // 0 (COP) or 4 (DFP) for now -- ad server should reject other environments (TODO: validate that it will always be the case)
    var bust = new Date().getTime().toString(); // cache buster
    var scrd = window.devicePixelRatio || 0; // screen pixel density
    var ae = 0; // prebid adapter version

    url = utils.tryAppendQueryString(url, 'callback', '$$PREBID_GLOBAL$$.YMCB');
    url = utils.tryAppendQueryString(url, 'page_url', page_url);
    url = utils.tryAppendQueryString(url, 'pr', pr);
    url = utils.tryAppendQueryString(url, 'bust', bust);
    url = utils.tryAppendQueryString(url, '_s', _s);
    url = utils.tryAppendQueryString(url, 'scrd', scrd);
    url = utils.tryAppendQueryString(url, 'dnt', dnt);
    url = utils.tryAppendQueryString(url, 'ae', ae);
    url = utils.tryAppendQueryString(url, 'description', description);
    url = utils.tryAppendQueryString(url, 'title', title);

    return url;
  }

  function _getPageDescription () {
    if (document.querySelector('meta[name="description"]')) {
      return document.querySelector('meta[name="description"]').getAttribute('content'); // Value of the description metadata from the publisher's page.  
    } else {
      return '';
    }
  }

  // expose the callback to the global object:
  $$PREBID_GLOBAL$$.YMCB = function(ymResponseObj) {


    // ymResponseObj = {
    //    "cpm": 3.45455, // bid price
    //    "width": 300, // the creative width that we're targeting
    //    "height": 250, // the creative height that we're targeting
    //    "callback_id": callback_id, 
    //    "ad": "<html><head></head><body>HELLO YIELDMO AD <img src='http://i.imgur.com/ZAheYBK.gif' /></body></html>" // the actual creative with GEX tag
    // };


    console.log('CALLED BACK!', ymResponseObj);
    if (ymResponseObj) {
      var bidObj = utils.getBidRequest(ymResponseObj.callback_id);
      var placementCode = bidObj && bidObj.placementCode;
      // var placementCode = ymResponseObj.placementCode;


      // @if NODE_ENV='debug'
      // if (bidObj) { utils.logMessage('JSONP callback function called for inventory code: ' + bidObj.params.inventoryCode); }
      // @endif


      var bid = [];
      if (ymResponseObj && ymResponseObj.cpm && ymResponseObj.cpm !== 0) {
        bid = bidfactory.createBid(1, bidObj);
        bid.bidderCode = 'yieldmo';
        bid.cpm = ymResponseObj.cpm;
        bid.ad = ymResponseObj.ad;
        bid.width = ymResponseObj.width;
        bid.height = ymResponseObj.height;
        // bid.dealId = ymResponseObj.deal_id;
        bidmanager.addBidResponse(placementCode, bid);
        console.log('bid', bid);
        console.log("BID ADDED");
      } else {
        // no response data
        // @if NODE_ENV='debug'
        if (bidObj) { utils.logMessage('No prebid response from yieldmo for placementCode: ' + bidObj.placementCode); }
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
