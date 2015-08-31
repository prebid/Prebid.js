/** @module adaptermanger */

var RubiconAdapter = require('./adapters/rubicon.js');
var AppNexusAdapter = require('./adapters/appnexus.js');
var OpenxAdapter = require('./adapters/openx');
var PubmaticAdapter = require('./adapters/pubmatic.js');
var CriteoAdapter = require('./adapters/criteo');
var AmazonAdapter = require('./adapters/amazon');
var YieldbotAdapter = require('./adapters/yieldbot');
var bidmanager = require('./bidmanager.js');
var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');

var _bidderRegistry = {};



exports.callBids = function(bidderArr) {
	for (var i = 0; i < bidderArr.length; i++) {
		//use the bidder code to identify which function to call
		var bidder = bidderArr[i];
		if (bidder.bidderCode && _bidderRegistry[bidder.bidderCode]) {
			utils.logMessage('CALLING BIDDER ======= ' + bidder.bidderCode);
			var currentBidder = _bidderRegistry[bidder.bidderCode];
			currentBidder.callBids(bidder);

			if (currentBidder.defaultBidderSettings) {
				bidmanager.registerDefaultBidderSetting(bidder.bidderCode, currentBidder.defaultBidderSettings);
			}
		}
	}
};


function registerBidAdapter(bidAdaptor, bidderCode) {
	if (bidAdaptor && bidderCode) {
		if (typeof bidAdaptor.callBids === CONSTANTS.objectType_function) {
			_bidderRegistry[bidderCode] = bidAdaptor;
		} else {
			utils.logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
		}
	} else {
		utils.logError('bidAdaptor or bidderCode not specified');
	}
}

// Register the bid adaptors here
registerBidAdapter(RubiconAdapter(), 'rubicon');
registerBidAdapter(AppNexusAdapter(), 'appnexus');
registerBidAdapter(OpenxAdapter(), 'openx');
registerBidAdapter(PubmaticAdapter(), 'pubmatic');
registerBidAdapter(CriteoAdapter(), 'criteo');
registerBidAdapter(AmazonAdapter(), 'amazon');
registerBidAdapter(YieldbotAdapter(), 'yieldbot');
