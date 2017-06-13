/**
 * @overview AdButler Prebid.js adapter.
 * @author dkharton
 */

'use strict';

var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');

var AdButlerAdapter = function AdButlerAdapter() {
  function _callBids(params) {
    var bids = params.bids || [],
      callbackData = {},
      zoneCount = {},
      pageID = Math.floor(Math.random() * 10e6);

    // Build and send bid requests
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i],
        zoneID = utils.getBidIdParameter('zoneID', bid.params),
        callbackID;

      if (!(zoneID in zoneCount)) {
        zoneCount[zoneID] = 0;
      }

      // build callbackID to get placementCode later
      callbackID = zoneID + '_' + zoneCount[zoneID];

      callbackData[callbackID] = {};
      callbackData[callbackID].bidId = bid.bidId;

      var adRequest = buildRequest(bid, zoneCount[zoneID], pageID);
      zoneCount[zoneID]++;

      adloader.loadScript(adRequest);
    }

    // Define callback function for bid responses
    $$PREBID_GLOBAL$$.adbutlerCB = function(aBResponseObject) {
      var bidResponse = {},
        callbackID = aBResponseObject.zone_id + '_' + aBResponseObject.place,
        width = parseInt(aBResponseObject.width),
        height = parseInt(aBResponseObject.height),
        isCorrectSize = false,
        isCorrectCPM = true,
        CPM, minCPM, maxCPM,
        bidObj = callbackData[callbackID] ? utils.getBidRequest(callbackData[callbackID].bidId) : null;

      if (bidObj) {
        if (aBResponseObject.status === 'SUCCESS') {
          CPM = aBResponseObject.cpm;
          minCPM = utils.getBidIdParameter('minCPM', bidObj.params);
          maxCPM = utils.getBidIdParameter('maxCPM', bidObj.params);

          // Ensure response CPM is within the given bounds
          if (minCPM !== '' && CPM < parseFloat(minCPM)) {
            isCorrectCPM = false;
          }
          if (maxCPM !== '' && CPM > parseFloat(maxCPM)) {
            isCorrectCPM = false;
          }

          // Ensure that response ad matches one of the placement sizes.
          utils._each(bidObj.sizes, function(size) {
            if (width === size[0] && height === size[1]) {
              isCorrectSize = true;
            }
          });

          if (isCorrectCPM && isCorrectSize) {
            bidResponse = bidfactory.createBid(1, bidObj);
            bidResponse.bidderCode = 'adbutler';
            bidResponse.cpm = CPM;
            bidResponse.width = width;
            bidResponse.height = height;
            bidResponse.ad = aBResponseObject.ad_code;
            bidResponse.ad += addTrackingPixels(aBResponseObject.tracking_pixels);
          } else {
            bidResponse = bidfactory.createBid(2, bidObj);
            bidResponse.bidderCode = 'adbutler';
          }
        } else {
          bidResponse = bidfactory.createBid(2, bidObj);
          bidResponse.bidderCode = 'adbutler';
        }

        bidmanager.addBidResponse(bidObj.placementCode, bidResponse);
      }
    };
  }

  function buildRequest(bid, adIndex, pageID) {
    var accountID = utils.getBidIdParameter('accountID', bid.params),
      zoneID = utils.getBidIdParameter('zoneID', bid.params),
      keyword = utils.getBidIdParameter('keyword', bid.params),
      domain = utils.getBidIdParameter('domain', bid.params);

    if (typeof domain === 'undefined' || domain.length === 0) {
      domain = 'servedbyadbutler.com';
    }

    var requestURI = location.protocol + '//' + domain + '/adserve/;type=hbr;';
    requestURI += 'ID=' + encodeURIComponent(accountID) + ';';
    requestURI += 'setID=' + encodeURIComponent(zoneID) + ';';
    requestURI += 'pid=' + encodeURIComponent(pageID) + ';';
    requestURI += 'place=' + encodeURIComponent(adIndex) + ';';

    // append the keyword for targeting if one was passed in
    if (keyword !== '') {
      requestURI += 'kw=' + encodeURIComponent(keyword) + ';';
    }
    requestURI += 'jsonpfunc=$$PREBID_GLOBAL$$.adbutlerCB;';
    requestURI += 'click=CLICK_MACRO_PLACEHOLDER';

    return requestURI;
  }

  function addTrackingPixels(trackingPixels) {
    var trackingPixelMarkup = '';
    utils._each(trackingPixels, function(pixelURL) {
      var trackingPixel = '<img height="0" width="0" border="0" style="display:none;" src="';
      trackingPixel += pixelURL;
      trackingPixel += '">';

      trackingPixelMarkup += trackingPixel;
    });
    return trackingPixelMarkup;
  }

  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
};

module.exports = AdButlerAdapter;
