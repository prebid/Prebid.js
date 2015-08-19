var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');

var objectType_function = 'function';
var objectType_undefined = 'undefined';

var externalCallbackByAdUnitArr = [];
var externalCallbackArr = [];
var biddersByPlacementMap = {};

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

var _callbackExecuted = false;

var defaultBidderSettingsMap = {};

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
			bid.adserverTargeting = keyValues;
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
			//increment bid response by placement
			bidResponseObj.bidsReceivedCount++;

		} else {
			//should never reach this code
			utils.logError('Internal error');
		}


	} else {
		//create an empty bid bid response object
		bidResponseObj = this.createEmptyBidResponseObj();
	}

	//store the bidResponse in a map
	pbBidResponseByPlacement[adUnitCode] = bidResponseObj;

	this.checkIfAllBidsAreIn(adUnitCode);

	//TODO: check if all bids are in
};

exports.createEmptyBidResponseObj = function() {
	return {
		bids: [],
		allBidsAvailable: false,
		bidsReceivedCount : 0
	};
};

function getKeyValueTargetingPairs(bidderCode, custBidObj) {
	//retrive key value settings
	var keyValues = {};
	var bidder_settings = pbjs.bidderSettings || {};
	//first try to add based on bidderCode configuration
	if (bidderCode && custBidObj && bidder_settings && bidder_settings[bidderCode]) {
		//
		setKeys(keyValues, bidder_settings[bidderCode], custBidObj);
	}
	//next try with defaultBidderSettings
	else if (defaultBidderSettingsMap[bidderCode]) {
		setKeys(keyValues, defaultBidderSettingsMap[bidderCode], custBidObj);
	}
	//now try with "generic" settings
	else if (custBidObj && bidder_settings) {
		if (!bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD]) {
			bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD] = {
				adserverTargeting: [{
					key: 'hb_bidder',
					val: function(bidResponse) {
						return bidResponse.bidderCode;
					}
				}, {
					key: 'hb_adid',
					val: function(bidResponse) {
						return bidResponse.adId;
					}
				}, {
					key: 'hb_pb',
					val: function(bidResponse) {
						return bidResponse.pbMg;
					}
				}, {
					key: 'hb_size',
					val: function(bidResponse) {
						return bidResponse.size;

					}
				}]
			};

			//set default settings 

		}
		custBidObj.usesGenericKeys = true;
		setKeys(keyValues, bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD], custBidObj);
	}

	return keyValues;

}

function setKeys(keyValues, bidderSettings, custBidObj) {
	var targeting = bidderSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
	custBidObj['size'] = custBidObj.getSize();
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

exports.registerDefaultBidderSetting = function(bidderCode, defaultSetting) {
	defaultBidderSettingsMap[bidderCode] = defaultSetting;
};


exports.executeCallback = function() {

	//this pbjs.registerBidCallbackHandler will be deprecated soon
	if (typeof pbjs.registerBidCallbackHandler === objectType_function && !_callbackExecuted) {
		try {
			pbjs.registerBidCallbackHandler();
			_callbackExecuted = true;
		} catch (e) {
			_callbackExecuted = true;
			utils.logError('Exception trying to execute callback handler registered : ' + e.message);
		}
	}

	//trigger allBidsBack handler
	//todo: get args
	if(externalCallbackArr.called !== true){
		var params = [];
		processCallbacks(externalCallbackArr, params);
		externalCallbackArr.called = true;
	}
	
	

};

exports.allBidsBack = function() {
	return _allBidsAvailable;
};

function triggerAdUnitCallbacks(adUnitCode){
	//todo : get bid responses and send in args
	var params = [adUnitCode];
	processCallbacks(externalCallbackByAdUnitArr, params);
}

function processCallbacks(callbackQueue, params){
		var i;
		for(i = 0; i < callbackQueue.length; i++){
			var func = callbackQueue[i];
			if(typeof func === 'function'){
				try{
					func.apply(pbjs, params);
					//func.executed = true;
				}
				catch(e){
					utils.logError('Error executing callback function: ' + e.message);
				}
			}
				
		}
		
	}

function checkBidsBackByAdUnit(adUnitCode){
	for(var i = 0; i < pbjs.adUnits.length; i++){
		var adUnit = pbjs.adUnits[i];
		if(adUnit.code === adUnitCode){
			var bidsBack = pbBidResponseByPlacement[adUnitCode].bidsReceivedCount;
			console.log('bids back :' + bidsBack);
			//all bids back for ad unit
			if(bidsBack === adUnit.bids.length){
				triggerAdUnitCallbacks(adUnitCode);
				
			}
		}
	}
	/*
	utils.mapForEach(biddersByPlacementMap, function(value, key){
		console.log('key: '+ key);
		console.log(value);
		if(key === adUnitCode){
			var val = pbBidResponseByPlacement[adUnitCode];
			alert('we have a winner: ' + val.bidsReceivedCount );
		}

	});
	*/
}

exports.setBidderMap = function(bidderMap){
	biddersByPlacementMap = bidderMap;
};

/*
 *   This method checks if all bids have a response (bid, no bid, timeout) and will execute callback method if all bids are in
 *   TODO: Need to track bids by placement as well
 */

exports.checkIfAllBidsAreIn = function(adUnitCode) {
	if (bidRequestCount !== 0 && bidRequestCount === bidResponseRecievedCount) {
		_allBidsAvailable = true;
	}

	//check by ad units
	checkBidsBackByAdUnit(adUnitCode);
	

	if (_allBidsAvailable) {
		//execute our calback method if it exists && pbjs.initAdserverSet !== true
		this.executeCallback();
		
	}
};

exports.addCallback = function(id, callback, cbEvent){
	callback['id'] = id;
	if(CONSTANTS.CB.TYPE.ALL_BIDS_BACK === cbEvent){
		externalCallbackArr.push(callback);
	}
	else if(CONSTANTS.CB.TYPE.AD_UNIT_BIDS_BACK === cbEvent){
		externalCallbackByAdUnitArr.push(callback);
	}

	
};