var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
/**
 * Adapter for requesting bids from Adsparc.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
var AdsparcAdapter = function AdsparcAdapter() {
    var bids;
    function _callBids(params) {
      bids = params.bids || [];
      for (var i = 0; i < bids.length; i++) {
        var bid = bids[i];

        _requestBid(bid);

      }
      // Only make one request per "nid"

    }
	
    var getJSON = function(url,callback) {
      var xhr = new XMLHttpRequest();
      xhr.open('get', url, true);
      xhr.responseType = 'json';
      xhr.onload = function() {
        var status = xhr.status;
        if (status === 200) {
          return callback(xhr.response);

        }else {
          return callback(status);
        }
      };
      xhr.send();
    };


    function _requestBid(bid) {
      var placementCode = '';
      var scriptUrl = 'http://pubs.adsparc.net/bid/ad.json';
      var size;
      var pubId;
      var siteUrl;
      var refUrl;
      var adResponse;
      placementCode = bid.placementCode;
      //load page options from bid request
      if (bid.params.pubId) {
        pubId = bid.params.pubId;

      }
      if (bid.params.size) {
        size = bid.params.size;		


      }
      if (bid.params.pageUrl) {
        siteUrl = bid.params.pageUrl;

      }
      if (bid.params.refUrl) {
        refUrl =bid.params.refUrl;

      }
      var sizes = size.split("x");
      var Url = scriptUrl +'?type=1&p='+ pubId + '&sz=' + size + '&pageUrl=' + siteUrl + '&refUrl=' + refUrl;
      var response;
      getJSON(Url,function(data) {
        response = data;				
        // Add a response for each bid matching the "nid"
        if (response) {
          var timestamp = Number(new Date());
          adResponse = bidfactory.createBid(1);
          adResponse.bidderCode = 'adsparc';
          adResponse.cpm = Number(response.eCpm);
          var replaceArray = ['[CACHEBUSTER]', '{RANDOM}'];
          var adcode = response.adCode;
          for(var i = 0; i < replaceArray.length; i++) {
            adcode = adcode.replace(replaceArray[i],timestamp);
          }
          adResponse.ad =adcode;
          adResponse.width = sizes[0];
          adResponse.height = sizes[1];
        } else {
          // Indicate an ad was not returned
          adResponse = bidfactory.createBid(2);
          adResponse.bidderCode = 'adsparc';
        }
        bidmanager.addBidResponse(bid.placementCode, adResponse);

      },"json");


    }

    return {
        callBids: _callBids
      };
  };

module.exports = AdsparcAdapter;
