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

		// Create a zero latency bid based on the Criteo cookie (if available)
		_processBid(bid, _getCookieValue(bid.params.cookiename));

		adloader.loadScript(scriptUrl, function(response) {
			// Create bid based on Criteo response
			_processBid(bid, window[varname]);
		});
	}

	function _processBid(bid, content) {
		var adResponse;
		// Add a response for each bid matching the "nid"
		bids.forEach(function(existingBid) {
			if (existingBid.params.nid === bid.params.nid) {
				if (content) {
					adResponse = bidfactory.createBid(1);
					adResponse.bidderCode = 'criteo';

					adResponse.keys = content.replace(/\;$/, '').split(';');;
				} else {
					// Indicate an ad was not returned
					adResponse = bidfactory.createBid(2);
					adResponse.bidderCode = 'criteo';
				}

				bidmanager.addBidResponse(existingBid.placementCode, adResponse);
			}
		});
	}

	function _getCookieValue(cookieName) {
		var cookieValue = document.cookie.match('(^|;)\\s*' + cookieName + '\\s*=\\s*([^;]+)');
		return cookieValue ? unescape(cookieValue.pop()) : '';
	}

	return {
		callBids: _callBids
	};
};

module.exports = CriteoAdapter;
