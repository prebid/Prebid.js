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
	
	var AST_URL = 'http://acdn.adnxs.com/ast/alpha/ast.js';
	var bids;

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

		bids = params.bids;
		if (!bids || !bids.length) return;

		if(!window.apntag){
			adloader.loadScript(AST_URL,requestAST);
		}else{
			requestAST();
		}
	}

	function requestAST(){
		if(!window.apntag){
      		utils.logError('appnexus', 'ERROR', 'apntag is not present!');
		}else{
			utils._each(bids,function(bid){

				//init ast request
				window.apntag = window.apntag || {};
    			apntag.anq = apntag.anq || [];

    			if(pbjs.logging){
    				apntag.anq.push(function(){
    					apntag.enableDebug();
    				});
    			}else{
    				apntag.anq.push(function(){
	    				apntag.disableDebug();
	    			});
    			}

				apntag.anq.push(function(){
    				apntag.clearRequest();
    			});

    			//build tag
    			var astTag = buildTag(bid);
				bid.startTime = new Date().getTime();

    			bidmanager.pbCallbackMap[astTag.targetId] = bid;

    			apntag.anq.push(function(){

    		        var requestTag = apntag.defineTag(astTag);
    		        requestTag.on('adAvailable',function(){
			        	pbjs.handleCB(astTag.targetId);
			        });

			        requestTag.on('adRequestFailure',function(){
						utils.logMessage('No prebid response for placement');
			        });

			        requestTag.on('adError',function(){
			        	utils.logMessage('No prebid response for placement');
			        });

        			apntag.loadTags();
    			});

			});
		}
	}

	pbjs.handleCB = function(targetId){
		var placementCode = '';

		//get response data
		var data = apntag.getAdData(targetId);

		if(data){

			var bidObj = bidmanager.getPlacementIdByCBIdentifer(targetId);

			if(bidObj){
				bidObj.status = CONSTANTS.STATUS.GOOD;
				placementCode = bidObj.placementCode;

				try {
					processAndTrackLatency(bidObj.startTime, new Date().getTime(), placementCode);
				} catch (e) {}
			}

			utils.logMessage('Callback function called for ad ID: ' + targetId);

			var bid = [];
			if( data.ads[0] && data.ads[0].cpm && data.ads[0].cpm !==0 ){
				var ad = data.ads[0];
				var contentSource = ad.content_source;
				var adType = ad.ad_type;

				bid = bidfactory.createBid(1);
				bid.creative_id = ad.creative_id;
				bid.cpm = ad.cpm;

				bid.ad = ad[contentSource][adType].content;
				bid.width = ad[contentSource][adType].width;
				bid.height = ad[contentSource][adType].height;
			}else{
				utils.logMessage('No prebid response from AppNexus for placement code ' + placementCode);
				//indicate that there is no bid for this placement
				bid = bidfactory.createBid(2);
			}
			bid.bidderCode = 'appnexus';
			bidmanager.addBidResponse(placementCode,bid);

		}else{
			utils.logMessage('No prebid response for placement');
		}
	}

	//set ast tag 
	function buildTag(bid){
		var tag = {};
		var uuid = utils.getUniqueIdentifierStr();

		//clone bid.params to tag
		var jsonBid = JSON.stringify(bid.params);
		tag = JSON.parse(jsonBid);

		//add tag value
		//use uuid as a targetId to identify response
		tag.targetId = uuid;

		if(!tag.prebid)
			tag.prebid = true;

		if(!tag.sizes)
			tag.sizes = bid.sizes;

		return tag;
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

	return {
		callBids: callBids
	};
};
module.exports = AppNexusAdapter;