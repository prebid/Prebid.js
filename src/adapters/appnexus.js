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
	// var AST_URL = '//acdn.adnxs.com/ast/ast.js';
	var AST_URL ='../../../../resources_apn-seller-tag/dist/ast.js';
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
    				apntag.enableDebug();
    			}else{
    				apntag.disableDebug();
    			}

    			apntag.clearRequest();

    			//build tag
    			var astTag = buildTag(bid);
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

			bidObj = bidmanager.getPlacementIdByCBIdentifer(targetId);

			if(bidObj){
				bidObj.status = CONSTANTS.STATUS.GOOD;
				placementCode = bidObj.placementCode;
			}

			utils.logMessage('Callback function called for ad ID: ' + targetId);

			var bid = [];
			if( data.ad && data.ad.cpm && data.ad.cpm !==0 ){
				bid = bidfactory.createBid(1);

				bid.creative_id = data.ad.creative_id;
				bid.cpm = data.ad.cpm;
				bid.ad = data.ad.banner.content;
				bid.width = data.ad.banner.width;
				bid.height = data.ad.banner.height;
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

	function buildTag(bid){
		var tag = {};
		var uuid = utils.getUniqueIdentifierStr();

		tag.member = bid.params.member;
		tag.invCode = bid.params.invCode;
		if(!tag.prebid)
			tag.prebid = true;

		if(!tag.sizes)
			tag.sizes = bid.sizes;
		tag.targetId = uuid;

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