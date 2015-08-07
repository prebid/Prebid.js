var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');

var objectType_function = 'function';
var objectType_undefined = 'undefined';

var pbCallbackMap = {};
exports.pbCallbackMap = pbCallbackMap;

var pbBidResponseByPlacement = {};
exports.pbBidResponseByPlacement = pbBidResponseByPlacement;

//this is used to look up the bid by bid ID later
var _adResponsesByBidderId = {};
exports._adResponsesByBidderId = _adResponsesByBidderId;

var bidRequestCount = 0;
exports.bidRequestCount = bidRequestCount;

var bidResponseRecievedCount = 0;
exports.bidResponseRecievedCount = bidResponseRecievedCount;

var _allBidsAvailable = false;
exports._allBidsAvailable = _allBidsAvailable;

var _callbackExecuted = false;

exports.getPlacementIdByCBIdentifer = function(id) {
	return pbCallbackMap[id];
};

exports.incrementBidCount = function() {
	bidRequestCount++;
};

exports.getBidResponseByAdUnit = function(adUnitCode) {
	return pbBidResponseByPlacement;

};


exports.clearAllBidResponses = function(adUnitCode) {
	_allBidsAvailable = false;
	_callbackExecuted = false;
	bidRequestCount = 0;
	bidResponseRecievedCount = 0;

	for (var prop in this.pbBidResponseByPlacement) {
		delete this.pbBidResponseByPlacement[prop];
	}
};

/*
 *   This function should be called to by the BidderObject to register a new bid is in
 */
exports.addBidResponse = function(adUnitCode, bid) {
	var bidResponseObj = {},
		statusPending = {
			code: 0,
			msg: 'Pending'
		},
		statusBidsAvail = {
			code: 1,
			msg: 'Bid available'
		},
		statusNoResponse = {
			code: 2,
			msg: 'Bid returned empty or error response'
		};

	if (bid) {
		//increment the bid count
		bidResponseRecievedCount++;
		//get price settings here
		if (bid.getStatusCode() === 2) {
			bid.cpm = 0;
		}
		var priceStringsObj = utils.getPriceBucketString(bid.cpm, bid.height, bid.width);
		//append price strings
		bid.pbLg = priceStringsObj.low;
		bid.pbMg = priceStringsObj.med;
		bid.pbHg = priceStringsObj.high;

		//put adUnitCode into bid
		bid.adUnitCode = adUnitCode;

		/*
		//if we have enough info to create the bid response - create here
		if (bid.getStatusCode() && placementCode && bid.GetBidderCode()) {
			bidResponse = {
				bidderCode: bidderCode,
				cpm: cpm,
				adUrl: ad,
				adId: adId,
				width: width,
				height: height,
				dealId: dealId,
				isDeal: isDeal,
				tier: tier,
				custObj: custObj,
				status: statusCode,
				keyLg: priceStringsObj.low,
				keyMg: priceStringsObj.med,
				keyHg: priceStringsObj.high
			};
		}
		*/

		//if there is any key value pairs to map do here
		var keyValues = {};
		if (bid.bidderCode && bid.cpm !== 0) {
			keyValues = getKeyValueTargetingPairs(bid.bidderCode, bid);
			bid.keyStringPairs = keyValues;
		}

		//store a reference to the bidResponse by adId
		if (bid.adId) {
			_adResponsesByBidderId[bid.adId] = bid;
		}

		//store by placement ID
		if (adUnitCode && pbBidResponseByPlacement[adUnitCode]) {
			//update bid response object
			bidResponseObj = pbBidResponseByPlacement[adUnitCode];
			//bidResponseObj.status = statusCode;
			bidResponseObj.bids.push(bid);

		} else {
			//create an empty bid bid response object
			bidResponseObj = {
				//status: statusPending,
				bids: [],
				allBidsAvailable: false
			};
			//bidResponseObj.status = statusBidsAvail;
			bidResponseObj.bids.push(bid);
		}


	} else {
		//create an empty bid bid response object
		bidResponseObj = {
			//status: statusPending,
			bids: [],
			allBidsAvailable: false
		};
	}

	//store the bidResponse in a map
	pbBidResponseByPlacement[adUnitCode] = bidResponseObj;

	this.checkIfAllBidsAreIn();

	//TODO: check if all bids are in
};

function getKeyValueTargetingPairs(bidderCode, custBidObj) {
	//retrive key value settings
	var keyValues = {};
	var bidder_settings = pbjs.bidderSettings;
	if (bidder_settings) {
		//first try to add based on bidderCode configuration
		if (bidderCode && custBidObj && bidder_settings && bidder_settings[bidderCode]) {
			//
			setKeys(keyValues, bidder_settings[bidderCode], custBidObj);
		}
		//now try with "generic" settings
		else if (custBidObj && bidder_settings && bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD]) {
			custBidObj.usesGenericKeys = true;
			setKeys(keyValues, bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD], custBidObj);
		}
	}

	return keyValues;

}

function setKeys(keyValues, bidderSettings, custBidObj) {
	var targeting = bidderSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
	for (var i = 0; i < targeting.length; i++) {
		var key = targeting[i].key;
		var value = targeting[i].val;
		if (typeof value === objectType_function) {
			try {
				keyValues[key] = value(custBidObj);
			} catch (e) {
				utils.logError('Exception trying to parse value. Check bidderSettings configuration : ' + e.message);
			}
		} else {
			keyValues[key] = value;
		}
	}
}

exports.executeCallback = function(){

	if (typeof pbjs.registerBidCallbackHandler === objectType_function && !_callbackExecuted) {
		try {
			pbjs.registerBidCallbackHandler();
			_callbackExecuted = true;
		} catch (e) {
			_callbackExecuted = true;
			utils.logError('Exception trying to execute callback handler registered : ' + e.message);
		}
	}
};

/*
 *   This method checks if all bids have a response (bid, no bid, timeout) and will execute callback method if all bids are in
 *   TODO: Need to track bids by placement as well
 */

exports.checkIfAllBidsAreIn = function() {
	if (bidRequestCount === bidResponseRecievedCount) {
		_allBidsAvailable = true;
	}

	if (_allBidsAvailable) {
		//execute our calback method if it exists && pbjs.initAdserverSet !== true
		this.executeCallback();
	}

	return _allBidsAvailable;
};