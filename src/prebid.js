/** @module pbjs */
// if pbjs already exists in global dodcument scope, use it, if not, create the object
window.pbjs = (window.pbjs || {});
window.pbjs.que = window.pbjs.que || [];
var pbjs = window.pbjs;
var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');
var bidmanager = require('./bidmanager.js');
var adaptermanager = require('./adaptermanager');

/* private variables */

var objectType_function = 'function';
var objectType_undefined = 'undefined';
var objectType_object = 'object';
var objectType_string = 'string';
var objectType_number = 'number';

var pb_preBidders = [],
	pb_placements = [],
	pb_bidderMap = {},
	pb_targetingMap = {};


/* Public vars */
//default timeout for all bids
pbjs.bidderTimeout = pbjs.bidderTimeout || 3000;
pbjs.logging = pbjs.logging || false;

//let the world know we are loaded
pbjs.libLoaded = true;

//create adUnit array
pbjs.adUnits = pbjs.adUnits || [];

/**
 * Command queue that functions will execute once prebid.js is loaded
 * @param  {function} cmd Annoymous function to execute
 * @alias module:pbjs.que.push
 */
pbjs.que.push = function(cmd) {
	if (typeof cmd === objectType_function) {
		try {
			cmd.call();
		} catch (e) {
			utils.logError('Error processing command :' + e.message);
		}
	} else {
		utils.logError('Commands written into pbjs.que.push must wrapped in a function');
	}
};

function processQue() {
	for (var i = 0; i < pbjs.que.length; i++) {
		if (typeof pbjs.que[i].called === objectType_undefined) {
			pbjs.que[i].call();
			pbjs.que[i].called = true;
		}
	}
}

/*
 *   Main method entry point method
 */
function init(timeout, adUnitCodeArr) {
	var cbTimeout = 0;
	if(typeof timeout === objectType_undefined || timeout === null){
		cbTimeout = pbjs.bidderTimeout;
	}
	else{
		cbTimeout = timeout;
	}

	if (!isValidAdUnitSetting()) {
		utils.logMessage('No adUnits configured. No bids requested.');
		return;
	}
	//set timeout for all bids
	setTimeout(bidmanager.executeCallback, cbTimeout);
	//parse settings into internal vars
	if (adUnitCodeArr && utils.isArray(adUnitCodeArr)) {
		for (var k = 0; k < adUnitCodeArr.length; k++) {
			for (var i = 0; i < pbjs.adUnits.length; i++) {
				if (pbjs.adUnits[i].code === adUnitCodeArr[k]) {
					pb_placements = [pbjs.adUnits[i]];
				}
			}
			loadPreBidders();
			sortAndCallBids();
		}
	} else {
		pb_placements = pbjs.adUnits;
		//Aggregrate prebidders by their codes
		loadPreBidders();
		//sort and call // default no sort
		sortAndCallBids();
	}

}

function isValidAdUnitSetting() {
	if (pbjs.adUnits && pbjs.adUnits.length !== 0) {
		return true;
	}
	return false;
}

function sortAndCallBids(sortFunc) {
	//Translate the bidder map into array so we can sort later if wanted
	var pbArr = Object.keys(pb_bidderMap).map(function(key) {
		return pb_bidderMap[key];
	});
	if (typeof sortFunc === objectType_function) {
		pbArr.sort(sortFunc);
	}
	adaptermanager.callBids(pbArr);
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
	//send a reference to bidmanager
	bidmanager.setBidderMap(pb_bidderMap);
}

function storeBidRequestByBidder(placementCode, sizes, bids) {
	for (var i = 0; i < bids.length; i++) {
		//increment request count
		bidmanager.incrementBidCount();
		var currentBid = bids[i];
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
		//TODO : if winning bid CPM === 0 - we need to indicate no targeting should be set
	}
	return winningBid.bid;

}


function setGPTAsyncTargeting(code, slot, adUnitBids) {
	var bidArrayTargeting = [];
	if (adUnitBids.bids.length !== 0) {
		for (var i = 0; i < adUnitBids.bids.length; i++) {
			var bid = adUnitBids.bids[i];
			//if use the generic key push into array with CPM for sorting
			if (!bid.alwaysUseBid) {
				bidArrayTargeting.push({
					cpm: bid.cpm,
					bid: bid
				});
			}
			// alwaysUseBid = true - send the bid anyway
			else {
				var keyStrings = adUnitBids.bids[i].adserverTargeting;
				for (var key in keyStrings) {
					if (keyStrings.hasOwnProperty(key)) {
						try {
							utils.logMessage('Attempting to set key value for placement code: ' + code + ' slot: ' + slot + ' key: ' + key + ' value: ' + encodeURIComponent(keyStrings[key]));
							//clear gpt targeting for slot then set
							googletag.pubads().clearTargeting(code);
							slot.setTargeting(key, encodeURIComponent(keyStrings[key]));

						} catch (e) {
							utils.logMessage('Problem setting key value pairs in slot: ' + e.message);
						}
					}
				}
			}


		}

	} else {
		utils.logMessage('No bids eligble for adUnit code : ' + code);
	}
	//set generic key targeting here
	if (bidArrayTargeting.length !== 0) {

		var winningBid = getWinningBid(bidArrayTargeting);
		var keyValues = winningBid.adserverTargeting;
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
	var returnObj = {};
	if (adunitCode) {
		returnObj = bidmanager.pbBidResponseByPlacement[adunitCode];
		if (returnObj) {
			return returnObj;
		} else {
			return bidmanager.createEmptyBidResponseObj();
		}
	} else {
		return bidmanager.pbBidResponseByPlacement;
	}
}


/*
 *	Copies bids into a bidArray response
 */
function buildBidResponse(bidArray) {
	var bidResponseArray = [];
	var adUnitCode = '';
	//temp array to hold auction for bids
	var bidArrayTargeting = [];
	var bidClone = {};
	if (bidArray) {
		// init the pb_targetingMap for the adUnitCode
		adUnitCode = bidArray[0] && bidArray[0].adUnitCode;
		pb_targetingMap[adUnitCode] = {};
		for (var i = 0; i < bidArray.length; i++) {
			var bid = bidArray[i];
			//clone by json parse. This also gets rid of unwanted function properties
			bidClone = getCloneBid(bid);

			if (bid.alwaysUseBid && bidClone.adserverTargeting) { // add the bid if alwaysUse and bid has returned
				// push key into targeting
				pb_targetingMap[bidClone.adUnitCode] = utils.merge_options(pb_targetingMap[bidClone.adUnitCode], bidClone.adserverTargeting);
			} else if (bid.cpm && bid.cpm > 0){
				//else put into auction array if cpm > 0
				bidArrayTargeting.push({
					cpm: bid.cpm,
					bid: bid
				});
			}
			//put all bids into bidArray by default
			bidResponseArray.push(bidClone);
		}
	}

	// push the winning bid into targeting map
	if (adUnitCode && bidArrayTargeting.length !== 0) {
		var winningBid = getWinningBid(bidArrayTargeting);
		var keyValues = winningBid.adserverTargeting;
		pb_targetingMap[adUnitCode] = utils.merge_options(pb_targetingMap[adUnitCode], keyValues);
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

function resetBids() {
	bidmanager.clearAllBidResponses();
	pb_bidderMap = {};
}

function requestAllBids(tmout){
	var timeout = tmout;
	resetBids();
	init(timeout);
}


//////////////////////////////////
//								//
//		Start Public APIs		//
// 								//
//////////////////////////////////
/**
 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
 * @param  {string} [adunitCode] adUnitCode to get the bid responses for
 * @alias module:pbjs.getAdserverTargetingForAdUnitCodeStr
 * @return {array}	returnObj return bids array
 */
pbjs.getAdserverTargetingForAdUnitCodeStr = function(adunitCode) {
	// call to retrieve bids array
	var res = pbjs.getAdserverTargetingForAdUnitCode(adunitCode);
	return utils.transformAdServerTargetingObj(res);

};
/**
 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
 * @param  {string} [adunitCode] adUnitCode to get the bid responses for
 * @alias module:pbjs.getAdserverTargetingForAdUnitCode
 * @return {object}	returnObj return bids
 */
pbjs.getAdserverTargetingForAdUnitCode = function(adunitCode) {
	// call to populate pb_targetingMap
	pbjs.getBidResponses(adunitCode);

	if (adunitCode) {
		return pb_targetingMap[adunitCode];
	}
	return pb_targetingMap;


};
/**
 * returns all ad server targeting for all ad units
 * @return {object} Map of adUnitCodes and targeting values []
 * @alias module:pbjs.getAdserverTargeting
 */
pbjs.getAdserverTargeting = function() {
	return pbjs.getAdserverTargetingForAdUnitCode();
};

/**
 * This function returns the bid responses at the given moment.
 * @param  {string} [adunitCode] adunitCode adUnitCode to get the bid responses for
 * @alias module:pbjs.getBidResponses
 * @return {object}            map | object that contains the bidResponses
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

	return returnObj;

};
/**
 * Returns bidResponses for the specified adUnitCode
 * @param  {String} adUnitCode adUnitCode
 * @alias module:pbjs.getBidResponsesForAdUnitCode
 * @return {Object}            bidResponse object
 */
pbjs.getBidResponsesForAdUnitCode = function(adUnitCode) {
	return pbjs.getBidResponses(adUnitCode);
};
/**
 * Set query string targeting on adUnits specified. The logic for deciding query strings is described in the section Configure AdServer Targeting. Note that this function has to be called after all ad units on page are defined.
 * @param {array} [codeArr] an array of adUnitodes to set targeting for.
 * @alias module:pbjs.setTargetingForAdUnitsGPTAsync
 */
pbjs.setTargetingForAdUnitsGPTAsync = function(codeArr) {
	if (!window.googletag || !window.googletag.pubads() || !window.googletag.pubads().getSlots()) {
		utils.logError('window.googletag is not defined on the page');
		return;
	}

	var adUnitCodesArr = codeArr;

	if (typeof codeArr === objectType_string) {
		 adUnitCodesArr = [codeArr];
	} else if (typeof codeArr === objectType_object) {
		adUnitCodesArr = codeArr;
	}

	var placementBids = {},
		i = 0;
	if (adUnitCodesArr) {
		for (i = 0; i < adUnitCodesArr.length; i++) {
			var code = adUnitCodesArr[i];
			//get all the slots from google tag
			var slots = window.googletag.pubads().getSlots();
			for (var k = 0; k < slots.length; k++) {
				if (slots[k].getAdUnitPath() === code) {
					placementBids = getBidResponsesByAdUnit(code);
					setGPTAsyncTargeting(code, slots[k], placementBids);
				}
			}
		}
	} else {
		//get all the slots from google tag
		var slots = window.googletag.pubads().getSlots();
		for (i = 0; i < slots.length; i++) {
			var adUnitCode = slots[i].getAdUnitPath();
			if (adUnitCode) {
				placementBids = getBidResponsesByAdUnit(adUnitCode);
				setGPTAsyncTargeting(adUnitCode, slots[i], placementBids);
			}
		}
	}

};

/**
 * Set query string targeting on all GPT ad units.
 * @alias module:pbjs.setTargetingForGPTAsync
 */
pbjs.setTargetingForGPTAsync = function() {
	pbjs.setTargetingForAdUnitsGPTAsync();
};

/**
 * Returns a bool if all the bids have returned or timed out
 * @alias module:pbjs.allBidsAvailable
 * @return {bool} all bids available
 */
pbjs.allBidsAvailable = function() {
	return bidmanager.allBidsBack();
};

/**
 * This function will render the ad (based on params) in the given iframe document passed through. Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchrounsly
 * @param  {object} doc document
 * @param  {string} id bid id to locate the ad
 * @alias module:pbjs.renderAd
 */
pbjs.renderAd = function(doc, id) {
	utils.logMessage('Calling renderAd with adId :' + id);
	if (doc && id) {
		try {
			//lookup ad by ad Id
			var adObject = bidmanager._adResponsesByBidderId[id];
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
					utils.logError('Error trying to write ad. No ad for bid response id: ' + id);
				}

			} else {
				utils.logError('Error trying to write ad. Cannot find ad by given id : ' + id);
			}

		} catch (e) {
			utils.logError('Error trying to write ad Id :' + id + ' to the page:' + e.message);
		}
	} else {
		utils.logError('Error trying to write ad Id :' + id + ' to the page. Missing document or adId');
	}

};


/*
 *	This function will refresh the bid requests for all adUnits or for specified adUnitCode
 */
pbjs.requestBidsForAdUnit = function(adUnitCode) {
	resetBids();
	init(adUnitCode);

};

/**
 * Request bids for adUnits passed into function
 */
pbjs.requestBidsForAdUnits = function(adUnitsObj) {
	if (!adUnitsObj || adUnitsObj.constructor !== Array) {
		utils.logError('requestBidsForAdUnits must pass an array of adUnits');
		return;
	}
	resetBids();
	var adUnitBackup = pbjs.adUnits.slice(0);
	pbjs.adUnits = adUnitsObj;
	init();
	pbjs.adUnits = adUnitBackup;

};

/**
 * Remove adUnit from the pbjs configuration
 * @param  {String} adUnitCode the adUnitCode to remove
 * @alias module:pbjs.removeAdUnit
 */
pbjs.removeAdUnit = function(adUnitCode) {
	if (adUnitCode) {
		for (var i = 0; i < pbjs.adUnits.length; i++) {
			if (pbjs.adUnits[i].code === adUnitCode) {
				pbjs.adUnits = pbjs.adUnits.splice(i, 1);
			}
		}
	}
};


/**
 * Request bids ad-hoc. This function does not add or remove adUnits already configured.
 * @param  {Object} requestObj
 * @param {string[]} requestObj.adUnitCodes  adUnit codes to request. Use this or requestObj.adUnits
 * @param {object[]} requestObj.adUnits AdUnitObjects to request. Use this or requestObj.adUnitCodes
 * @param {number} [requestObj.timeout] Timeout for requesting the bids specified in milliseconds
 * @param {function} [requestObj.bidsBackHandler] Callback to execute when all the bid responses are back or the timeout hits.
 * @alias module:pbjs.requestBids
 */
pbjs.requestBids = function(requestObj) {
	if (!requestObj) {
		//utils.logMessage('requesting all bids');

		requestAllBids();

	}
	else{
		var adUnitCodes = requestObj.adUnitCodes;
		var adUnits = requestObj.adUnits;
		var timeout = requestObj.timeout;
		var bidsBackHandler = requestObj.bidsBackHandler;
		var adUnitBackup = pbjs.adUnits.slice(0);

		if (typeof bidsBackHandler === objectType_function) {
			bidmanager.addOneTimeCallback(bidsBackHandler);
		}

		if (adUnitCodes && utils.isArray(adUnitCodes)) {
			resetBids();
			init(timeout, adUnitCodes);

		} else if (adUnits && utils.isArray(adUnits)) {
			resetBids();
			pbjs.adUnits = adUnits;
			init(timeout);
		} else {
			//request all ads
			requestAllBids(timeout);
		}

		pbjs.adUnits = adUnitBackup;
	}

};

/**
 *
 * Add adunit(s)
 * @param {(string|string[])} Array of adUnits or single adUnit Object.
 * @alias module:pbjs.addAdUnits
 */
pbjs.addAdUnits = function(adUnitArr) {
	if (utils.isArray(adUnitArr)) {
		//append array to existing
		pbjs.adUnits.push.apply(pbjs.adUnits, adUnitArr);
	} else if (typeof adUnitArr === objectType_object) {
		pbjs.adUnits.push(adUnitArr);
	}
};


/**
 * Add a callback event
 * @param {String} event event to attach callback to Options: "allRequestedBidsBack" | "adUnitBidsBack"
 * @param {Function} func  function to execute. Paramaters passed into the function: (bidResObj), [adUnitCode]);
 * @alias module:pbjs.addCallback
 * @returns {String} id for callback
 */
pbjs.addCallback = function(eventStr, func) {
	var id = null;
	if (!eventStr || !func || typeof func !== objectType_function) {
		utils.logError('error registering callback. Check method signature');
		return id;
	}

	id = utils.getUniqueIdentifierStr;
	bidmanager.addCallback(id, func, eventStr);
	return id;
};

/**
 * Remove a callback event
 * @param {string} cbId id of the callback to remove
 * @alias module:pbjs.removeCallback
 * @returns {String} id for callback
 */
pbjs.removeCallback = function(cbId) {
	//todo
};

processQue();
