import { getBidRequest } from '../utils.js';
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');
var utils = require('../utils.js');
var CONSTANTS = require('../constants.json');

/**
 * Adapter for requesting bids from AdMedia.
 *
 */
var AdmediaAdapter = function AdmediaAdapter() {

  var ext_url = (window.location.protocol) + "//b.admedia.com/banner/prebid/bidder/ext/?";

  function _callBids(params){
    if(typeof window.AdmediaPBJS === 'undefined'){
      var aid = params.bids[0].params.aid;
      var request_obj = {};
      request_obj.aid = aid;
      request_obj.siteDomain = window.location.host;
      request_obj.sitePage = window.location.href;
      request_obj.siteRef = document.referrer;
      request_obj.topUrl = utils.getTopWindowUrl();

      var endpoint = ext_url+utils.parseQueryStringParameters(request_obj);

      adloader.loadScript(endpoint, function(){ _processBids(params); });
    }
    else{
      _processBids(params);
    }
  }

  function _processBids(params){
    var bids = params.bids || [];
    for (var i = 0; i < bids.length; i++) {
      var request_obj = {};
      var bid = bids[i];

      if (bid.params.aid) {
        request_obj.aid = bid.params.aid;
      }
      else{
        utils.logError('required param aid is missing', "admedia");
        continue;
      }

      //optional page_url macro
      if (bid.params.page_url) {
        request_obj.page_url = bid.params.page_url;
      }

      //if set, return a test ad for all aids
      if (bid.params.test_ad === 1) {
        request_obj.test_ad = 1;
      }

      var parsedSizes = utils.parseSizesInput(bid.sizes);
      var parsedSizesLength = parsedSizes.length;
      if (parsedSizesLength > 0) {
        //first value should be "size"
        request_obj.size = parsedSizes[0];

        if (parsedSizesLength > 1) {
          //any subsequent values should be "promo_sizes"
          var promo_sizes = [];
          for (var j = 1; j < parsedSizesLength; j++) {
            promo_sizes.push(parsedSizes[j]);
          }

          var psizes = promo_sizes.join(",");

          request_obj.promo_sizes = psizes;

        }
      }


      //detect urls
      request_obj.siteDomain = window.location.host;
      request_obj.sitePage = window.location.href;
      request_obj.siteRef = document.referrer;
      request_obj.topUrl = utils.getTopWindowUrl();

      request_obj.callbackId = bid.bidId;

      var callback = responseCallback(bid);
      var admedia_pbjs = new window.AdmediaPBJS (request_obj, callback);
      admedia_pbjs.callBids();
    }
  }

  function responseCallback(bid) {
    return function(response) {
      $$PREBID_GLOBAL$$.admediaHandler(response, bid);
    };
  }

  //expose the callback to global object
  $$PREBID_GLOBAL$$.admediaHandler = function(response,bidRequest){
    var bidObject = {}, bidObj, placementCode = '';
    if(bidRequest){
      bidObj = bidRequest;
    }
    else{
      bidObj = getBidRequest(response.callback_id);
    }

    if (bidObj) {
      placementCode = bidObj.placementCode;
    }

    if(bidObj && response.cpm>0 && (!!response.ad || !!response.adUrl)){
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
      bidObject.bidderCode = bidObj.bidder;
      bidObject.cpm = parseFloat(response.cpm);
      if(response.adUrl)
        bidObject.adUrl = response.adUrl;
      else
        bidObject.ad = response.ad;
      bidObject.width = response.width;
      bidObject.height = response.height;
    }
    else{
      bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
      bidObject.bidderCode = bidObj.bidder;
    }

    bidmanager.addBidResponse(placementCode, bidObject);

  };


  // Export the callBids function, so that prebid.js can execute this function
  // when the page asks to send out bid requests.
  return {
    callBids: _callBids
  };
};

module.exports = AdmediaAdapter;
