var CONSTANTS = require('./constants.json');
var RubiconAdapter = require('./adapters/rubicon.js');
var AppNexusAdapter = require('./adapters/appnexus.js');
var OpenxAdapter = require('./adapters/openx');
var PubmaticAdapter = require('./adapters/pubmatic.js');
var CriteoAdapter = require('./adapters/criteo');
var AmazonAdapter = require('./adapters/amazon');
var utils = require('./utils.js');
var bidmanager = require('./bidmanager.js');

/* private variables */

var objectType_function = 'function';
var objectType_undefined = 'undefined';
var objectType_object = 'object';
var objectType_string = 'string';
var objectType_number = 'number';

//if pbjs already exists in global dodcument scope, use it, if not, create the object
pbjs = typeof pbjs !== objectType_undefined ? pbjs : {};

var pb_preBidders = [],
	pb_placements = [],
	pb_bidderMap = {},
	pb_targetingMap = {},
	_bidderRegistry = {};

/* Public vars */

pbjs.pageTimeout = pbjs.pageTimeout || 1000;
pbjs.logging = pbjs.logging || false;

//let the world know we are loaded
pbjs.libLoaded = true;

//if pbjs.anq command queue already exists, use it, if not create it
pbjs.anq = pbjs.anq || [];

/*
 *   Main method entry point method
 */
function init() {
	//parse settings into internal vars
	//TODO here for parsing a URL to retrieve settings
	pb_placements = pbjs.adUnits;
	//Aggregrate prebidders by their codes
	loadPreBidders();
	//Translate the bidder map into array so we can sort later if wanted
	var pbArr = Object.keys(pb_bidderMap).map(function(key) {
		return pb_bidderMap[key];
	});
	//TODO sort pbArr here to call in desired order
	//call each pre bidder using the registry
	callBids(pbArr);

}


function callBids(bidderArr) {
	for (var i = 0; i < bidderArr.length; i++) {
		//use the bidder code to identify which function to call
		var bidder = bidderArr[i];
		if (bidder.bidderCode && _bidderRegistry[bidder.bidderCode]) {
			var currentBidder = _bidderRegistry[bidder.bidderCode];
			currentBidder.callBids(bidder);
		}
	}
}

function registerBidAdapter(bidAdaptor, bidderCode) {
	if (bidAdaptor && bidderCode) {
		if (typeof bidAdaptor.callBids === objectType_function) {
			_bidderRegistry[bidderCode] = bidAdaptor;
		} else {
			utils.logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
		}
	} else {
		utils.logError('bidAdaptor or bidderCode not specified');
	}
}



function loadPreBidders() {

	for (var i = 0; i < pb_placements.length; i++) {
		var bids = pb_placements[i][CONSTANTS.JSON_MAPPING.PL_BIDS];
		var placementCode = pb_placements[i][CONSTANTS.JSON_MAPPING.PL_CODE];
		storeBidRequestByBidder(pb_placements[i][CONSTANTS.JSON_MAPPING.PL_CODE], pb_placements[i][CONSTANTS.JSON_MAPPING.PL_SIZE], bids);
		//store pending response by placement
		bidmanager.addBidResponse(placementCode);
	}

	for (i = 0; i < pb_preBidders.length; i++) {
		pb_preBidders[i].loadPreBid();
	}
}

function storeBidRequestByBidder(placementCode, sizes, bids) {
	for (var i = 0; i < bids.length; i++) {
		//increment request count
		bidmanager.incrementBidCount();
		var currentBid = bids[i];
		//console.log(currentBid);
		currentBid.placementCode = placementCode;
		currentBid.sizes = sizes;

		//look up bidder on map
		var bidderName = bids[i][CONSTANTS.JSON_MAPPING.BD_BIDDER];
		var bidderObj = pb_bidderMap[bidderName];
		if (typeof bidderObj === objectType_undefined) {
			//bid not found
			var partnerBids = {
				bidderCode: bidderName,
				bids: []
			};
			partnerBids.bids.push(currentBid);
			//put bidder on map with bids
			pb_bidderMap[bidderName] = partnerBids;
		} else {
			bidderObj.bids.push(currentBid);
		}

	}
}

//use in place of hasOwnPropery - as opposed to a polyfill
function hasOwn(o, p) {
	if (o.hasOwnProperty) {
		return o.hasOwnProperty(p);
	} else {
		return (typeof o[p] !== objectType_undefined) && (o.constructor.prototype[p] !== o[p]);
	}
}

function isEmptyObject(obj) {
	var name;
	for (name in obj) {
		return false;
	}
	return true;
}

function getWinningBid(bidArray) {
	var winningBid = {};
	if (bidArray && bidArray.length !== 0) {
		bidArray.sort(function(a, b) {
			//put the highest CPM first
			return b.cpm - a.cpm;
		});
		//the first item has the highest cpm
		winningBid = bidArray[0];
	}
	return winningBid.bid;

}


function setGPTAsyncTargeting(code, slot, adUnitBids) {
	var bidArrayTargeting = [];
	if (adUnitBids.bids.length !== 0) {
		//TODO: how to determine which bid to put into targeting?
		for (var i = 0; i < adUnitBids.bids.length; i++) {
			var bid = adUnitBids.bids[i];
			//if use the generic key push into array with CPM for sorting
			if (bid.usesGenericKeys) {
				bidArrayTargeting.push({
					cpm: bid.cpm,
					bid: bid
				});
			} else {
				var keyStrings = adUnitBids.bids[i].keyStringPairs;
				for (var key in keyStrings) {
					if (keyStrings.hasOwnProperty(key)) {
						try {
							utils.logMessage('Attempting to set key value for placement code: ' + code + ' slot: ' + slot + ' key: ' + key + ' value: ' + encodeURIComponent(keyStrings[key]));
							slot.setTargeting(key, encodeURIComponent(keyStrings[key]));

						} catch (e) {
							utils.logMessage('Problem setting key value pairs in slot: ' + e.message);
						}
					}
				}
			}


		}

	} else {
		utils.logMessage('No bids eligble for placement code : ' + code);
	}
	//set generic key targeting here
	if (bidArrayTargeting.length !== 0) {

		var winningBid = getWinningBid(bidArrayTargeting);
		var keyValues = winningBid.keyStringPairs;
		for (var key in keyValues) {
			if (keyValues.hasOwnProperty(key)) {
				try {
					utils.logMessage('Attempting to set key value for placement code: ' + code + ' slot: ' + slot + ' key: ' + key + ' value: ' + encodeURIComponent(keyValues[key]));
					slot.setTargeting(key, encodeURIComponent(keyValues[key]));

				} catch (e) {
					utils.logMessage('Problem setting key value pairs in slot: ' + e.message);
				}
			}
		}

	}
}
/*
 *   This function returns the object map of placemnts or
 *   if placement code is specified return just 1 placement bids
 */
function getBidResponsesByAdUnit(adunitCode) {
	//bidmanager.pbBidResponseByPlacement.allBidsAvailable = pbjs.allBidsAvailable();
	if (adunitCode) {
		//console.log(json.stringify(bidmanager.pbBidResponseByPlacement[placementCode]));
		return bidmanager.pbBidResponseByPlacement[adunitCode];
	} else {
		return bidmanager.pbBidResponseByPlacement;
	}
}

/*
 *   This function returns a "cleaned up" version of the bid response targeting paramasters in JSON form
 */
pbjs.getAdserverTargetingParamsForAdUnit = function(adunitCode) {
	// call to populate pb_targetingMap
	pbjs.getBidResponses(adunitCode);

	if (adunitCode) {
		return JSON.stringify(pb_targetingMap[adunitCode]);
	}
	return JSON.stringify(pb_targetingMap);


};
/*
 *	Copies bids into a bidArray response
 */
function buildBidResponse(bidArray) {
	var bidResponseArray = [];
	//temp array to hold auction for bids
	var bidArrayTargeting = [];
	var bidClone = {};
	if (bidArray) {
		for (var i = 0; i < bidArray.length; i++) {
			var bid = bidArray[i];
			//clone by json parse. This also gets rid of unwanted function properties
			bidClone = getCloneBid(bid);

			if (!bid.usesGenericKeys) {
				//put unique key into targeting
				pb_targetingMap[bidClone.adUnitCode] = bidClone.keyStringPairs;
			} else {
				//else put into auction array
				bidArrayTargeting.push({
					cpm: bid.cpm,
					bid: bid
				});
			}
			//put all bids into bidArray by default
			bidResponseArray.push(bidClone);
		}
	}

	if (bidArrayTargeting.length !== 0) {
		var winningBid = getWinningBid(bidArrayTargeting);
		var keyValues = winningBid.keyStringPairs;
		pb_targetingMap[bidClone.adUnitCode] = keyValues;
	}

	return bidResponseArray;
}

function getCloneBid(bid) {
	var bidClone = {};
	//clone by json parse. This also gets rid of unwanted function properties
	if (bid) {
		var jsonBid = JSON.stringify(bid);
		bidClone = JSON.parse(jsonBid);

		//clean up bid clone
		delete bidClone.pbLg;
		delete bidClone.pbMg;
		delete bidClone.pbHg;
	}
	return bidClone;
}

/*
 *   This function returns a "cleaned up" version of the bid response in JSON form
 */
pbjs.getBidResponses = function(adunitCode) {
	var bidArrayTargeting = [];
	var response = {};
	var bidArray = [];
	var returnObj = {};

	if (adunitCode) {
		response = getBidResponsesByAdUnit(adunitCode);
		bidArray = [];
		if (response && response.bids) {
			bidArray = buildBidResponse(response.bids);
		}

		returnObj = {
			bids: bidArray
		};

	} else {
		response = getBidResponsesByAdUnit();
		for (var adUnit in response) {
			if (response.hasOwnProperty(adUnit)) {
				if (response && response[adUnit] && response[adUnit].bids) {
					bidArray = buildBidResponse(response[adUnit].bids);
				}


				returnObj[adUnit] = {
					bids: bidArray
				};

			}

		}
	}

	return JSON.stringify(returnObj, null, '\t');

};
/*
 *   This function sets targeting keys as defined by bid response into the GPT slot object
 */
pbjs.setTargetingForGPTAsync = function(code, slot) {
	var placementBids = {};
	if (code && slot) {
		placementBids = getBidResponsesByAdUnit(code);
		setGPTAsyncTargeting(code, slot, placementBids);
	} else {
		//get all the slots from google tag
		if (window.googletag && window.googletag.pubads() && window.googletag.pubads().getSlots()) {
			var slots = window.googletag.pubads().getSlots();
			for (var i = 0; i < slots.length; i++) {
				var adUnitCode = slots[i].getAdUnitPath();
				if (adUnitCode) {
					placementBids = getBidResponsesByAdUnit(adUnitCode);
					setGPTAsyncTargeting(adUnitCode, slots[i], placementBids);
				}
			}
		} else {
			utils.logError('Cannot set targeting into googletag ');
		}

	}

};

pbjs.allBidsAvailable = function() {
	return bidmanager.checkIfAllBidsAreIn();
};

/*
 *   This function will render the ad (based on params) in the given iframe document passed through
 *   Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchrounsly
 */
pbjs.renderAd = function(doc, params) {
	utils.logMessage('Calling renderAd with adId :' + params);
	if (doc && params) {
		try {
			//lookup ad by ad Id
			var adObject = bidmanager._adResponsesByBidderId[params];
			if (adObject) {
				var height = adObject.height;
				var width = adObject.width;
				var url = adObject.adUrl;
				var ad = adObject.ad;

				if (ad) {
					doc.write(ad);
					doc.close();
					if (doc.defaultView && doc.defaultView.frameElement) {
						doc.defaultView.frameElement.width = width;
						doc.defaultView.frameElement.height = height;
					}
				}
				//doc.body.style.width = width;
				//doc.body.style.height = height;
				else if (url) {
					doc.write('<IFRAME SRC="' + url + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" WIDTH="' + width + '" HEIGHT="' + height + '"></IFRAME>');
					doc.close();

					if (doc.defaultView && doc.defaultView.frameElement) {
						doc.defaultView.frameElement.width = width;
						doc.defaultView.frameElement.height = height;
					}

				} else {
					utils.logError('Error trying to write ad. No ad for bid response id: ' + params);
				}

			} else {
				utils.logError('Error trying to write ad. Cannot find ad by given id : ' + params);
			}

		} catch (e) {
			utils.logError('Error trying to write ad Id :' + params + ' to the page:' + e.message);
		}
	} else {
		utils.logError('Error trying to write ad Id :' + params + ' to the page. Missing document or adId');
	}

};

this.requestBidsForAdUnit = function(adUnitCode) {
	//todo

};

// Register the bid adaptors here
registerBidAdapter(RubiconAdapter(), 'rubicon');
registerBidAdapter(AppNexusAdapter(), 'appnexus');
registerBidAdapter(OpenxAdapter(), 'openx');
registerBidAdapter(PubmaticAdapter(), 'pubmatic');
registerBidAdapter(CriteoAdapter(), 'criteo');
registerBidAdapter(AmazonAdapter(), 'amazon');

init();