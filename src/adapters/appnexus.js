var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');

/* AppNexus bidder factory function
 *  Use to create a AppNexusAdapter object
 */
 

var AppNexusAdapter = function AppNexusAdapter() {
	var isCalled = false;

	//time tracking buckets, to be used to track latency within script
	//array index is timeslice in ms, value passed to buildTrackingTag() is impbus tracker id
	var timeTrackingBuckets = [];
	timeTrackingBuckets[100] = buildTrackingTag(21139);
	timeTrackingBuckets[200] = buildTrackingTag(21140);
	timeTrackingBuckets[300] = buildTrackingTag(21141);
	timeTrackingBuckets[400] = buildTrackingTag(21142);
	timeTrackingBuckets[500] = buildTrackingTag(21143);
	timeTrackingBuckets[600] = buildTrackingTag(21144);
	timeTrackingBuckets[700] = buildTrackingTag(21145);
	timeTrackingBuckets[800] = buildTrackingTag(21146);
	timeTrackingBuckets[1000] = buildTrackingTag(21147);
	timeTrackingBuckets[1300] = buildTrackingTag(21148);
	timeTrackingBuckets[1600] = buildTrackingTag(21149);
	timeTrackingBuckets[2000] = buildTrackingTag(21150);
	timeTrackingBuckets[5000] = buildTrackingTag(21151);
	timeTrackingBuckets[10000] = buildTrackingTag(21152);

	//over 10.000 tracker
	var timeTrackerOverMaxBucket = buildTrackingTag(21154);
	//var timeTrackerBidTimeout = buildTrackingTag(19432);

	//generic bid requeted tracker
	var timeTrackerBidRequested = buildTrackingTag(21153);

	// var timeTrackerBidRequested = buildTrackingTag(19435);

	//helper function to construct impbus trackers
	function buildTrackingTag(id) {
		return 'https://secure.adnxs.com/imptr?id=' + id + '&t=2';
	}


	function callBids(params) {
		//console.log(params);
		var anArr = params.bids;
		var bidsCount = anArr.length;

		//set expected bids count for callback execution
		bidmanager.setExpectedBidsCount('appnexus',bidsCount);

		for (var i = 0; i < bidsCount; i++) {
			var bidReqeust = anArr[i];
			var callbackId = utils.getUniqueIdentifierStr();
			adloader.loadScript(buildJPTCall(bidReqeust, callbackId));
			//store a reference to the bidRequest from the callback id
			bidmanager.pbCallbackMap[callbackId] = bidReqeust;
		}

	}
	//given a starttime and an end time, hit the correct impression tracker
	function processAndTrackLatency(startTime, endTime, placementCode) {

		if (startTime && endTime) {
			//get the difference between times
			var timeDiff = endTime - startTime;
			var trackingPixelFound = false;
			var trackingUrl = '';
			for (var curTrackerItem in timeTrackingBuckets) {
				//find the closest upper bound of defined tracking times
				if (timeDiff <= curTrackerItem) {
					trackingPixelFound = true;
					trackingUrl = timeTrackingBuckets[curTrackerItem];
					adloader.trackPixel(trackingUrl);
					break;
				}
			}
			//if we didn't find a bucket, assume use the catch-all time over bucket
			if (!trackingPixelFound) {
				trackingUrl = timeTrackerOverMaxBucket;
				adloader.trackPixel(trackingUrl);
			}

			utils.logMessage('latency for placement code : ' + placementCode + ' : ' + timeDiff + ' ms.' + ' Tracking URL Fired : ' + trackingUrl);
		}
	}


	function buildJPTCall(bid, callbackId) {

		//determine tag params
		var placementId = utils.getBidIdParamater('placementId', bid.params);
		var memberId = utils.getBidIdParamater('memberId', bid.params);
		var inventoryCode = utils.getBidIdParamater('invCode', bid.params);
		var query = utils.getBidIdParamater('query', bid.params);
		var referrer = utils.getBidIdParamater('referrer', bid.params);
		var altReferrer = utils.getBidIdParamater('alt_referrer', bid.params);


		//build our base tag, based on if we are http or https

		var jptCall = 'http' + ('https:' === document.location.protocol ? 's://secure.adnxs.com/jpt?' : '://ib.adnxs.com/jpt?');

		//var combinedTargetingParamsList = combineTargetingParams(bidOpts);

		//callback is the callback function to call, this should be hard-coded to pbjs.handleCb once AL-107 is released
		jptCall = utils.tryAppendQueryString(jptCall, 'callback', 'pbjs.handleCB');
		jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);

		//disable PSAs here, as per RAD-503
		jptCall = utils.tryAppendQueryString(jptCall, 'psa', '0');
		jptCall = utils.tryAppendQueryString(jptCall, 'id', placementId);
		jptCall = utils.tryAppendQueryString(jptCall, 'member_id', memberId);
		jptCall = utils.tryAppendQueryString(jptCall, 'code', inventoryCode);



		//sizes takes a bit more logic
		var sizeQueryString = utils.parseSizesInput(bid.sizes);
		if (sizeQueryString) {
			jptCall += sizeQueryString + '&';
		}
		//console.log(jptCall);

		var targetingParams = utils.parseQueryStringParameters(query);

		if (targetingParams) {
			//don't append a & here, we have already done it in parseQueryStringParameters
			jptCall += targetingParams;
		}

		//append referrer
		if(referrer===''){
			referrer = utils.getTopWindowUrl();
		}
		
		jptCall = utils.tryAppendQueryString(jptCall, 'referrer', referrer);
		jptCall = utils.tryAppendQueryString(jptCall, 'alt_referrer', altReferrer);
		
		//remove the trailing "&"
		if (jptCall.lastIndexOf('&') === jptCall.length - 1) {
			jptCall = jptCall.substring(0, jptCall.length - 1);
		}

		// @if NODE_ENV='debug'
		utils.logMessage('jpt request built: ' + jptCall);
		// @endif

		//append a timer here to track latency
		bid.startTime = new Date().getTime();

		//track initial request
		//adloader.trackPixel(timeTrackerBidRequested); //TODO add this back in and figure out where it goes and what it does

		return jptCall;

	}

	//expose the callback to the global object:
	pbjs.handleCB = function(jptResponseObj) {

		if (jptResponseObj && jptResponseObj.callback_uid) {

			var error;
			var responseCPM;
			var id = jptResponseObj.callback_uid,
				placementCode = '',
				//retrieve bid object by callback ID
				bidObj = bidmanager.getPlacementIdByCBIdentifer(id);
			if (bidObj) {
				placementCode = bidObj.placementCode;
				//set the status
				bidObj.status = CONSTANTS.STATUS.GOOD;
				//track latency
				try {
					processAndTrackLatency(bidObj.startTime, new Date().getTime(), placementCode);
				} catch (e) {}

				//place ad response on bidmanager._adResponsesByBidderId

			}

			// @if NODE_ENV='debug'
			utils.logMessage('JSONP callback function called for ad ID: ' + id);
			// @endif
			var bid = [];
			if (jptResponseObj.result && jptResponseObj.result.cpm && jptResponseObj.result.cpm !== 0) {
				responseCPM = parseInt(jptResponseObj.result.cpm, 10);

				//CPM response from /jpt is dollar/cent multiplied by 10000
				//in order to avoid using floats
				//switch CPM to "dollar/cent"
				responseCPM = responseCPM / 10000;
				var responseAd = jptResponseObj.result.ad;
				//store bid response
				//bid status is good (indicating 1)
				//TODO refactor to pass a Bid object instead of multiple params
				//bidmanager.addBidResponse(statusCode, placementCode, bidderCode, custObj, cpm, ad, width, height, dealId, isDeal, tier, adId )
				var adId = jptResponseObj.result.creative_id;
				bid = bidfactory.createBid(1);
				//bid.adId = adId;
				bid.creative_id = adId;
				bid.bidderCode = 'appnexus';
				bid.cpm = responseCPM;
				bid.adUrl = jptResponseObj.result.ad;
				bid.width = jptResponseObj.result.width;
				bid.height = jptResponseObj.result.height;
				bid.dealId = jptResponseObj.result.deal_id;

				//bidmanager.addBidResponse(1, placementCode, 'appnexus', jptResponseObj, responseCPM, jptResponseObj.result.ad, jptResponseObj.result.width, jptResponseObj.result.height, '', false, '',  jptResponseObj.result.creative_id );
				bidmanager.addBidResponse(placementCode, bid);


			} else {
				//no response data
				// @if NODE_ENV='debug'
				utils.logMessage('No prebid response from AppNexus for placement code ' + placementCode);
				// @endif
				//indicate that there is no bid for this placement
				bid = bidfactory.createBid(2);
				bid.bidderCode = 'appnexus';
				bidmanager.addBidResponse(placementCode, bid);
			}



		} else {
			//no response data
			// @if NODE_ENV='debug'
			utils.logMessage('No prebid response for placement %%PLACEMENT%%');
			// @endif

		}

	};

	return {
		callBids: callBids

	};
};
module.exports = AppNexusAdapter;