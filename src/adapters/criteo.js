var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from Criteo.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
var CriteoAdapter = function CriteoAdapter() {
	var bids;

	function _callBids(params) {
		bids = params.bids || [];

		// Only make one request per "nid"
		_getUniqueNids(bids).forEach(_requestBid);
	}

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
		return nids;
	}

	function _requestBid(bid) {
		var varname = bid.params.varname;
		var scriptUrl = '//rtax.criteo.com/delivery/rta/rta.js?netId=' + encodeURI(bid.params.nid) +
			'&cookieName=' + encodeURI(bid.params.cookiename) +
			'&rnd=' + Math.floor(Math.random() * 99999999999) +
			'&varName=' + encodeURI(varname);

		adloader.loadScript(scriptUrl, function(response) {
			var adResponse;
			var content = window[varname];

			var zoneNamesWithPositiveResponse = [];
			if (content) {
				zoneNamesWithPositiveResponse = content.split(';').filter(function(x){return x.length > 0});
			}

			var responseHasAds = false;
			if (content && zoneNamesWithPositiveResponse.length > 0) {
				responseHasAds = true;
			}

			// Add a response for each bid matching the "nid"
			bids.forEach(function(existingBid) {
				if (existingBid.params.nid === bid.params.nid) {
					// If this bid object declares that it is linked to a specific zone, only add an adResponse if the zone got a positive response
					var addedBidResponse = false;
					if (existingBid.params.zone) {
						var zoneObject = existingBid.params.zone;
						if(utils.contains(zoneNamesWithPositiveResponse, zoneObject.name)) {
							adResponse = bidfactory.createBid(1);
							adResponse.bidderCode = 'criteo';
							adResponse.keys = [zoneObject.name];
							if(zoneObject.cpm != undefined){
								adResponse.cpm = zoneObject.cpm;
							}
							if(zoneObject.id != undefined){
								adResponse.ad = _getAdCodeHtmlForZoneIdAndClickUrl(zoneObject.id, zoneObject.click_url);
							}
							if(zoneObject.width){
								adResponse.width = zoneObject.width;
							}
							if(zoneObject.height){
								adResponse.height = zoneObject.height;
							}
							bidmanager.addBidResponse(existingBid.placementCode, adResponse);
							addedBidResponse = true;
						}
					} else {
						// Bid is not linked to a zone
						if (responseHasAds) {
							adResponse = bidfactory.createBid(1);
							adResponse.bidderCode = 'criteo';

							adResponse.keys = zoneNamesWithPositiveResponse;
							bidmanager.addBidResponse(existingBid.placementCode, adResponse);
							addedBidResponse = true;
						}
					}
					if ( ! addedBidResponse) {
						// Indicate an ad was not returned
						adResponse = bidfactory.createBid(2);
						adResponse.bidderCode = 'criteo';
						bidmanager.addBidResponse(existingBid.placementCode, adResponse);
						addedBidResponse = true;
					}
				}
			});

		});
	}

	function _getAdCodeHtmlForZoneIdAndClickUrl(zone_id, click_url){
		return "<script type='text/javascript'>\n"+
		"<!--//<![CDATA[\n"+
		"document.MAX_ct0 ='"+click_url+"';\n"+
		"var m3_u = (location.protocol=='https:'?'https://cas.criteo.com/delivery/ajs.php?':'http://cas.criteo.com/delivery/ajs.php?');\n"+
		"var m3_r = Math.floor(Math.random()*99999999999);\n"+
		"document.write (\"<scr\"+\"ipt type='text/javascript' src='\"+m3_u);\n"+
		"document.write (\"zoneid="+zone_id+"\");\n"+
		"document.write ('&amp;cb=' + m3_r);\n"+
		"if (document.MAX_used != ',') document.write (\"&amp;exclude=\" + document.MAX_used); document.write (document.charset ? '&amp;charset='+document.charset : (document.characterSet ?\n"+
		"'&amp;charset='+document.characterSet : ''));\n"+
		"document.write (\"&amp;loc=\" + escape(window.location).substring(0,1600));\n"+
		"if (document.context) document.write (\"&context=\" + escape(document.context));\n"+
		"if ((typeof(document.MAX_ct0) != 'undefined') && (document.MAX_ct0.substring(0,4) == 'http')) {\n"+
		"document.write (\"&amp;ct0=\" + escape(document.MAX_ct0)); }\n"+
		"if (document.mmm_fo) document.write (\"&amp;mmm_fo=1\");\n"+
		"document.write (\"'></scr\"+\"ipt>\");\n"+
		"//]]>--></script>";
	}

	return {
		callBids: _callBids
	};
};

module.exports = CriteoAdapter;
