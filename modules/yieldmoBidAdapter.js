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

var YieldmoAdapter = function YieldmoAdapter() {
  function _callBids(params) {
    var bids = params.bids;
    adloader.loadScript(buildYieldmoCall(bids));
  }

  function buildYieldmoCall(bids) {
    // build our base tag, based on if we are http or https
    var ymURI = '//bid.yieldmo.com/exchange/prebid?';
    var ymCall = document.location.protocol + ymURI;

    // Placement specific information
    ymCall = _appendPlacementInformation(ymCall, bids);

    // General impression params
    ymCall = _appendImpressionInformation(ymCall);

    // remove the trailing "&"
    if (ymCall.lastIndexOf('&') === ymCall.length - 1) {
      ymCall = ymCall.substring(0, ymCall.length - 1);
    }

    utils.logMessage('ymCall request built: ' + ymCall);

    return ymCall;
  }

  function _appendPlacementInformation(url, bids) {
    var placements = [];
    var placement;
    var bid;

    for (var i = 0; i < bids.length; i++) {
      bid = bids[i];

      placement = {};
      placement.callback_id = bid.bidId;
      placement.placement_id = bid.placementCode;
      placement.sizes = bid.sizes;

      if (bid.params && bid.params.placementId) {
        placement.ym_placement_id = bid.params.placementId;
      }

      placements.push(placement);
    }

    url = utils.tryAppendQueryString(url, 'p', JSON.stringify(placements));
    return url;
  }

  function _appendImpressionInformation(url) {
    var page_url = document.location; // page url
    var pr = document.referrer || ''; // page's referrer
    var dnt = (navigator.doNotTrack || false).toString(); // true if user enabled dnt (false by default)
    var _s = document.location.protocol === 'https:' ? 1 : 0; // 1 if page is secure
    var description = _getPageDescription();
    var title = document.title || ''; // Value of the title from the publisher's page. 
    var bust = new Date().getTime().toString(); // cache buster
    var scrd = window.devicePixelRatio || 0; // screen pixel density

    url = utils.tryAppendQueryString(url, 'callback', '$$PREBID_GLOBAL$$.YMCB');
    url = utils.tryAppendQueryString(url, 'page_url', page_url);
    url = utils.tryAppendQueryString(url, 'pr', pr);
    url = utils.tryAppendQueryString(url, 'bust', bust);
    url = utils.tryAppendQueryString(url, '_s', _s);
    url = utils.tryAppendQueryString(url, 'scrd', scrd);
    url = utils.tryAppendQueryString(url, 'dnt', dnt);
    url = utils.tryAppendQueryString(url, 'description', description);
    url = utils.tryAppendQueryString(url, 'title', title);

    return url;
  }

  function _getPageDescription() {
    if (document.querySelector('meta[name="description"]')) {
      return document.querySelector('meta[name="description"]').getAttribute('content'); // Value of the description metadata from the publisher's page.  
    } else {
      return '';
    }
  }

  // expose the callback to the global object:
  $$PREBID_GLOBAL$$.YMCB = function(ymResponses) {
    if (ymResponses && ymResponses.constructor === Array && ymResponses.length > 0) {
      for (var i = 0; i < ymResponses.length; i++) {
        _registerPlacementBid(ymResponses[i]);
      }
    } else {
      // If an incorrect response is returned, register error bids for all placements
      // to prevent Prebid waiting till timeout for response 
      _registerNoResponseBids();

      utils.logMessage('No prebid response for placement %%PLACEMENT%%');
    }
  };

  function _registerPlacementBid(response) {
    var bidObj = utils.getBidRequest(response.callback_id);
    var placementCode = bidObj && bidObj.placementCode;
    var bid = [];

    if (response && response.cpm && response.cpm !== 0) {
      bid = bidfactory.createBid(1, bidObj);
      bid.bidderCode = 'yieldmo';
      bid.cpm = response.cpm;
      bid.ad = response.ad;
      bid.width = response.width;
      bid.height = response.height;
      bidmanager.addBidResponse(placementCode, bid);
    } else {
      // no response data
      if (bidObj) { utils.logMessage('No prebid response from yieldmo for placementCode: ' + bidObj.placementCode); }
      bid = bidfactory.createBid(2, bidObj);
      bid.bidderCode = 'yieldmo';
      bidmanager.addBidResponse(placementCode, bid);
    }
  }

  function _registerNoResponseBids() {
    var yieldmoBidRequests = $$PREBID_GLOBAL$$._bidsRequested.find(bid => bid.bidderCode === 'yieldmo');

    utils._each(yieldmoBidRequests.bids, function (currentBid) {
      var bid = [];
      bid = bidfactory.createBid(2, currentBid);
      bid.bidderCode = 'yieldmo';
      bidmanager.addBidResponse(currentBid.placementCode, bid);
    });
  }

  return Object.assign(this, {
    callBids: _callBids
  });
};

adaptermanager.registerBidAdapter(new YieldmoAdapter(), 'yieldmo');

module.exports = YieldmoAdapter;
