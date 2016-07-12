var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from Brightcom
 */
var BrightcomAdapter = function BrightcomAdapter() {
    
  // Set Brightcom Bidder URL
  var brightcomUrl = 'hb.iselephant.com/auc/ortb';

  // Define the bidder code
  var brightcomBidderCode = 'brightcom';

  // Define the callback function
  var brightcomCallbackFunction = 'window.$$PREBID_GLOBAL$$=window.$$PREBID_GLOBAL$$||window.parent.$$PREBID_GLOBAL$$||window.top.$$PREBID_GLOBAL$$;window.$$PREBID_GLOBAL$$.brightcomResponse';

  // Manage the requested and received ad units' codes, to know which are invalid (didn't return)
  var reqAdUnitsCode = [],
      resAdUnitsCode = [];

  function _callBids(params) {

    var bidRequests = params.bids || [];

    // Get page data
    var siteDomain = window.location.host;
    var sitePage = window.location.href;

    // Prepare impressions object
    var brightcomImps = [];

    // Prepare a variable for publisher id
    var pubId = '';

    // Go through the requests and build array of impressions
    utils._each(bidRequests, function(bid) {

      // Get impression details
      var tagId = utils.getBidIdParamater('tagId', bid.params);
      var ref = utils.getBidIdParamater('ref', bid.params);
      var adWidth=0;
      var adHeight=0;

      // If no publisher id is set, use the current
      if (pubId === '') {
        // Get the current publisher id (if it doesn't exist, it'll return '')
        pubId = utils.getBidIdParamater('pubId', bid.params);
      }

      // Brightcom supports only 1 size per impression
      // Check if the array contains 1 size or array of sizes
      if (bid.sizes.length === 2 && typeof bid.sizes[0] === 'number' && typeof bid.sizes[1] === 'number') {
        // The array contains 1 size (the items are the values)
        adWidth = bid.sizes[0];
        adHeight = bid.sizes[1];
      } else {
        // The array contains array of sizes, use the first size
        adWidth = bid.sizes[0][0];
        adHeight = bid.sizes[0][1];
      }

      // Build the impression
      var imp = {
        id: utils.getUniqueIdentifierStr(),
        banner: {
          w: adWidth,
          h: adHeight
        },
        tagid: tagId
      };

      // If ref exists, create it (in the "ext" object)
      if (ref !== '') {
        imp.ext = {
          refoverride: ref
        };
      }

      // Add current impression to collection
      brightcomImps.push(imp);
      // Add mapping to current bid via impression id
      //bidmanager.pbCallbackMap[imp.id] = bid;

      // Add current ad unit's code to tracking
      reqAdUnitsCode.push(bid.placementCode);

    });

    // Build the bid request
    var brightcomBidReq = {
      id: utils.getUniqueIdentifierStr(),
      imp: brightcomImps,
      site:{
        publisher: {
          id: pubId
        },
        domain: siteDomain,
        page: sitePage
      }
    };

    // Add timeout data, if available
    var PREBID_TIMEOUT = PREBID_TIMEOUT || 0;
    var curTimeout = PREBID_TIMEOUT;
    if (curTimeout > 0) {
      brightcomBidReq.tmax = curTimeout;
    }

    // Define the bid request call URL
    var bidRequestCallUrl = 'https://' + brightcomUrl +
        '?callback=' + brightcomCallbackFunction +
        '&request=' + encodeURIComponent(JSON.stringify(brightcomBidReq));

    // Add the call to get the bid
    adloader.loadScript(bidRequestCallUrl, null);
    
  }

  //expose the callback to the global object:
  $$PREBID_GLOBAL$$.brightcomResponse = function(brightcomResponseObj) {
        
    var bid = {};
        
    // Make sure response is valid
    if (
        (brightcomResponseObj) && (brightcomResponseObj.id) &&
        (brightcomResponseObj.seatbid) && (brightcomResponseObj.seatbid.length !== 0) &&
        (brightcomResponseObj.seatbid[0].bid) && (brightcomResponseObj.seatbid[0].bid.length !== 0)
    ) {

      // Go through the received bids
      brightcomResponseObj.seatbid[0].bid.forEach( function(curBid) {

        // Get the bid request data
        var bidRequest = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === 'brightcom').bids[0]; // this assumes a single request only

        // Make sure the bid exists
        if (bidRequest) {
                    
          var placementCode = bidRequest.placementCode;
          bidRequest.status = CONSTANTS.STATUS.GOOD;

          curBid.placementCode = placementCode;
          curBid.size = bidRequest.sizes;
                    
          // Get the creative
          var responseCreative = curBid.adm;
          // Build the NURL element
          var responseNurl = '<img src="' + curBid.nurl + '" width="1" height="1" style="display:none" />';
          // Build the ad to display:
          var responseAd = decodeURIComponent(responseCreative + responseNurl);

          // Create a valid bid
          bid = bidfactory.createBid(1);

          // Set the bid data
          bid.creative_id = curBid.Id;
          bid.bidderCode = brightcomBidderCode;
          bid.cpm = parseFloat(curBid.price);

          // Brightcom tag is in <script> block, so use bid.ad, not bid.adurl
          bid.ad = responseAd;

          // Since Brightcom currently supports only 1 size, if multiple sizes are provided - take the first
          var adWidth, adHeight;
          if ((bidRequest.sizes.length === 2) && (typeof bidRequest.sizes[0] === 'number') && (typeof bidRequest.sizes[1] === 'number')) {
            // Only one size is provided
            adWidth = bidRequest.sizes[0];
            adHeight = bidRequest.sizes[1];
          } else {
            // And array of sizes is provided. Take the first.
            adWidth = bidRequest.sizes[0][0];
            adHeight = bidRequest.sizes[0][1];
          }

          // Set the ad's width and height
          bid.width = adWidth;
          bid.height = adHeight;

          // Add the bid
          bidmanager.addBidResponse(placementCode, bid);

          // Add current ad unit's code to tracking
          resAdUnitsCode.push(placementCode);

        }
      });
            
    }

    // Define all unreceived ad unit codes as invalid (if Brightcom don't want to bid on an impression, it won't include it in the response)
    for (var i = 0; i < reqAdUnitsCode.length; i++) {
      var adUnitCode = reqAdUnitsCode[i];
      // Check if current ad unit code was NOT received
      if (resAdUnitsCode.indexOf(adUnitCode) === -1) {
        // Current ad unit wasn't returned. Define it as invalid.
        bid = bidfactory.createBid(2);
        bid.bidderCode = brightcomBidderCode;
        bidmanager.addBidResponse(adUnitCode, bid);
      }
    }

  };

  return {
    callBids: _callBids
  };
};

module.exports = BrightcomAdapter;
