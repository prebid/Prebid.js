import { getBidRequest } from '../utils.js';

var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');
var utils = require('../utils.js');

var JCMAdapter = function JCMAdapter() {

  pbjs.processJCMResponse = function(JCMResponse) {

    if (JCMResponse) {
      var JCMRespObj = JSON.parse(JCMResponse);
      if (JCMRespObj) {
        var bids = JCMRespObj.bids;
        for (var i = 0; i < bids.length; i++) {
          var bid = bids[i];
          var bidObject;
          if (bid.cpm > 0) {
            bidObject = bidfactory.createBid(1);
            bidObject.bidderCode = 'jcm';
            bidObject.cpm = bid.cpm;
            bidObject.ad = decodeURIComponent(bid.ad.replace(/\+/g, '%20'));
            bidObject.width = bid.width;
            bidObject.height = bid.height;
            bidmanager.addBidResponse(getBidRequest(bid.callbackId).placementCode, bidObject);
          } 
          else {
            bidObject = bidfactory.createBid(2);
            bidObject.bidderCode = 'jcm';
            bidmanager.addBidResponse(getBidRequest(bid.callbackId).placementCode, bidObject);
          } 
        }
      }
    }
  };

  function _callBids(params) {
        
    var BidRequest = {
      bids: []	
    };

    for (var i = 0; i < params.bids.length; i++) {

      var adSizes = "";
      var bid = params.bids[i];
      for (var x = 0; x < bid.sizes.length; x++) {
        adSizes += utils.parseGPTSingleSizeArray(bid.sizes[x]);
        if (x !== (bid.sizes.length - 1)) {
          adSizes += ',';
        }
      }

      //var bidId = utils.getUniqueIdentifierStr();
      //bidmanager.pbCallbackMap[bidId] = bid;

      BidRequest.bids.push({ 
        "callbackId"   : bid.bidId,
        "siteId"       : bid.params.siteId,
        "adSizes"	   : adSizes
      });
    }

    var JSONStr = JSON.stringify(BidRequest);
    var reqURL = document.location.protocol+"//media.adfrontiers.com/pq?t=hb&bids=" + encodeURIComponent(JSONStr);
    //var reqURL = "https://media.adfrontiers.com/pq?t=j2&s=1384&ac=19&at=4&xvk=44314728.02199851";
    adloader.loadScript(reqURL);
  }

  return {
    callBids: _callBids
  };

};

module.exports = JCMAdapter;
