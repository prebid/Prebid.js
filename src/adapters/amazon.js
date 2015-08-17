var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from Amazon.
 *
 * @returns {{callBids: _callBids, _defaultBidderSettings: _defaultBidderSettings}}
 * @constructor
 */
var AmazonAdapter = function AmazonAdapter() {
	var _defaultBidderSettings = {
		adserverTargeting: [{
			key: "amznslots",
			val: function(bidResponse) {
				return bidResponse.keys;
			}
		}]
	};
	var bids;

	function _callBids(params) {
		bids = params.bids || [];
		adloader.loadScript('//c.amazon-adsystem.com/aax2/amzn_ads.js', function() {
			_requestBids();
		});
	}


	function _requestBids() {
		if (amznads) {

			var adIds = bids.map(function(bid) {
				return bid.params.aid;
			});

			amznads.getAdsCallback(adIds, function() {
				var adResponse;
				var placementCode = bids[0].placementCode;
				var keys = amznads.getKeys();

				if (keys.length) {
					adResponse = bidfactory.createBid(1);
					adResponse.bidderCode = 'amazon';
					adResponse.keys = keys;

					bidmanager.addBidResponse(placementCode, adResponse);

				} else {
					// Indicate an ad was not returned
					adResponse = bidfactory.createBid(2);
					adResponse.bidderCode = 'amazon';
					bidmanager.addBidResponse(placementCode, adResponse);
				}
			});
		}
	}
	/*
	function _defaultBidderSettings() {
		return {
			adserverTargeting: [
				{
					key: "amznslots",
					val: function (bidResponse) {
						return bidResponse.keys;
					}
				}
			]
		};
	}
	*/

	return {
		callBids: _callBids,
		defaultBidderSettings: _defaultBidderSettings
	};
};

module.exports = AmazonAdapter;