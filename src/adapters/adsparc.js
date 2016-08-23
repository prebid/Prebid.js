var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');
/**
 * Adapter for requesting bids from Pubmatic.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
var AdsparcAdapter = function AdsparcAdapter() {
	
    function _callBids(params) {
        bids = params.bids || [];
        for (var i = 0; i < bids.length; i++) {
            var bid = bids[i];
		
        _requestBid(bid);

        }
        // Only make one request per "nid"

    }
	
		var getJSON = function(url, successHandler, errorHandler) {
			var xhr = typeof XMLHttpRequest != 'undefined'
				? new XMLHttpRequest()
				: new ActiveXObject('Microsoft.XMLHTTP');
			xhr.open('get', url, true);
			xhr.onreadystatechange = function() {
				var status;
				var data;
				if (xhr.readyState == 4) { // `DONE`
					status = xhr.status;
					if (status == 200) {
						data = JSON.parse(xhr.responseText);
						successHandler && successHandler(data);
					} else {
						errorHandler && errorHandler(status);
					}
				}
			};
			xhr.send();
		};


    function _getUniqueNids(bids) {
        var key;
        var map = {};
        var nids = [];
        bids.forEach(function(bid) {
            map[bid.params.nid] = bid;
        });
        for (key in map) {
            if (map.hasOwnProperty(key)) {
                nids.push(map[key]);
            }
        }
		console.log(nids);
        return nids;
    }

    function _requestBid(bid) {
		var placementCode = '';
		var bids;
		var scriptUrl = 'http://pubs.adsparc.net/bid/ad.json';
		var size;
		var pubId;
		var siteUrl;
		var refUrl;
        var content = bid.params.unit;
        var adUnit;
        var adData;
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
           	getJSON(Url, function(data) {
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
