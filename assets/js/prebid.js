/* Prebid.js v0.1.1 
Updated : 2015-08-07 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
	var bids;

	function _callBids(params) {
		bids = params.bids || [];
		adloader.loadScript('//c.amazon-adsystem.com/aax2/amzn_ads.js', function () {
			_requestBids();
		});
	}


	function _requestBids() {
		if (amznads) {

			var adIds = bids.map(function (bid) {
				return bid.params.aid;
			});

			amznads.getAdsCallback(adIds, function () {
				var adResponse;
				var placementCode = bids[0].placementCode;
				var keys = amznads.getKeys();

				pbjs.bidderRawBidsBack('amazon');

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

	return {
		callBids: _callBids,
		defaultBidderSettings: _defaultBidderSettings
	};
};

module.exports = AmazonAdapter;

},{"../adloader":7,"../bidfactory.js":8,"../bidmanager.js":9,"../constants.json":10,"../utils.js":12}],2:[function(require,module,exports){
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
		for (var i = 0; i < anArr.length; i++) {
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

			utils.logMessage('latency for placmeent code : ' + placementCode + ' : ' + timeDiff + ' ms.' + ' Tracking URL Fired : ' + trackingUrl);
		}
	}


	function buildJPTCall(bid, callbackId) {

		//determine tag params
		var placementId = utils.getBidIdParamater('placementId', bid.params);
		var memberId = utils.getBidIdParamater('memberId', bid.params);
		var inventoryCode = utils.getBidIdParamater('invCode', bid.params);

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

		var targetingParams = '';

		if (targetingParams) {
			//don't append a & here, we have already done it at the end of the loop
			jptCall += targetingParams;
		}

		//append referrer
		jptCall = utils.tryAppendQueryString(jptCall, 'referrer', utils.getTopWindowUrl());


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
		
		pbjs.bidderRawBidsBack('appnexus');

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

		bidmanager.checkIfAllBidsAreIn();

	};

	return {
		callBids: callBids

	};
};
module.exports = AppNexusAdapter;
},{"../adloader.js":7,"../bidfactory.js":8,"../bidmanager.js":9,"../constants.json":10,"../utils.js":12}],3:[function(require,module,exports){
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

	function _getUniqueNids(bids){
		var key;
		var map = {};
		var nids = [];
		bids.forEach(function(bid){
			map[bid.params.nid] = bid;
		});
		for (key in map){
			if (map.hasOwnProperty(key)){
				nids.push(map[key]);
			}
		}
		return nids;
	}

	function _requestBid(bid) {
		var varname = 'crtg_varname_' + bid.params.nid;
		var scriptUrl = '//rtax.criteo.com/delivery/rta/rta.js?netId=' + encodeURI(bid.params.nid) +
			'&cookieName=' + encodeURI (bid.params.cookiename) +
			'&rnd=' + Math.floor(Math.random() * 99999999999) +
			'&varName=' + encodeURI (varname);

		adloader.loadScript(scriptUrl, function(response){
			var adResponse;
			var content = window[varname];

			pbjs.bidderRawBidsBack('criteo');

			// Add a response for each bid matching the "nid"
			bids.forEach(function(existingBid){
				if (existingBid.params.nid === bid.params.nid) {
					if (content) {
						adResponse = bidfactory.createBid(1);
						adResponse.bidderCode = 'criteo';

						adResponse.keys = content.split(';');

						bidmanager.addBidResponse(existingBid.placementCode, adResponse);
					} else {
						// Indicate an ad was not returned
						adResponse = bidfactory.createBid(2);
						adResponse.bidderCode = 'criteo';
					}

					bidmanager.addBidResponse(existingBid.placementCode, adResponse);
				}
			});
		});
	}

	return {
		callBids: _callBids
	};
};

module.exports = CriteoAdapter;

},{"../adloader":7,"../bidfactory.js":8,"../bidmanager.js":9,"../constants.json":10,"../utils.js":12}],4:[function(require,module,exports){
var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from OpenX.
 *
 * @param {Object} options - Configuration options for OpenX
 * @param {string} options.pageURL - Current page URL to send with bid request
 * @param {string} options.refererURL - Referer URL to send with bid request
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
var OpenxAdapter = function OpenxAdapter(options) {

	var opts = options || {};
	var scriptUrl;
	var bids;

	function _callBids(params) {
		bids = params.bids || [];
		for (var i = 0; i < bids.length; i++) {
			var bid = bids[i];
			//load page options from bid request
			if(bid.params.pageURL){
				opts.pageURL = bid.params.pageURL;
			}
			if(bid.params.refererURL){
				opts.refererURL = bid.params.refererURL;
			}
			if (bid.params.jstag_url) {
				scriptUrl = bid.params.jstag_url;
			}
			if(bid.params.pgid){
				opts.pgid = bid.params.pgid;
			}
		}
		_requestBids();
	}

	function _requestBids() {

		if (scriptUrl) {
			adloader.loadScript(scriptUrl, function () {
				var i;
				var POX = OX();

				POX.setPageURL(opts.pageURL);
				POX.setRefererURL(opts.refererURL);
				POX.addPage(opts.pgid);

				// Add each ad unit ID
				for (i = 0; i < bids.length; i++) {
					POX.addAdUnit(bids[i].params.unit);
				}

				POX.addHook(function (response) {
					var i;
					var bid;
					var adUnit;
					var adResponse;

					pbjs.bidderRawBidsBack('openx');

					// Map each bid to its response
					for (i = 0; i < bids.length; i++) {
						bid = bids[i];

						// Get ad response
						adUnit = response.getOrCreateAdUnit(bid.params.unit);

						// If 'pub_rev' (CPM) isn't returned we got an empty response
						if (adUnit.get('pub_rev')) {
							adResponse = adResponse = bidfactory.createBid(1);

							adResponse.bidderCode = 'openx';
							adResponse.ad_id = adUnit.get('ad_id');
							adResponse.cpm = Number(adUnit.get('pub_rev')) / 1000;
							adResponse.ad = adUnit.get('html');
							adResponse.adUrl = adUnit.get('ad_url');
							adResponse.width = adUnit.get('width');
							adResponse.height = adUnit.get('height');

							bidmanager.addBidResponse(bid.placementCode, adResponse);
						} else {
							// Indicate an ad was not returned
							adResponse = bidfactory.createBid(2);
							adResponse.bidderCode = 'openx';
							bidmanager.addBidResponse(bid.placementCode, adResponse);
						}
					}
				}, OX.Hooks.ON_AD_RESPONSE);

				// Make request
				POX.load();
			});
		}
	}

	return {
		callBids: _callBids
	};
};

module.exports = OpenxAdapter;

},{"../adloader":7,"../bidfactory.js":8,"../bidmanager.js":9,"../constants.json":10,"../utils.js":12}],5:[function(require,module,exports){
var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from Pubmatic.
 *
 * @returns {{callBids: _callBids}}
 * @constructor
 */
var PubmaticAdapter = function PubmaticAdapter() {

	var bids;
	var _pm_pub_id;
	var _pm_optimize_adslots = [];

	function _callBids(params) {
		bids = params.bids;
		for (var i = 0; i < bids.length; i++) {
			var bid = bids[i];
			bidmanager.pbCallbackMap['' + bid.params.adSlot] = bid;
			_pm_pub_id = _pm_pub_id || bid.params.publisherId;
			_pm_optimize_adslots.push(bid.params.adSlot);
		}

		// Load pubmatic script in an iframe, because they call document.write
		_getBids();
	}

	function _getBids() {

		// required variables for pubmatic pre-bid call
		window.pm_pub_id = _pm_pub_id;
		window.pm_optimize_adslots = _pm_optimize_adslots;

		//create the iframe
		var iframe = utils.createInvisibleIframe();
		var elToAppend = document.getElementsByTagName('head')[0];
		//insert the iframe into document
		elToAppend.insertBefore(iframe, elToAppend.firstChild);
		//todo make this more browser friendly
		var iframeDoc = iframe.contentWindow.document;
		iframeDoc.write(_createRequestContent());
		iframeDoc.close();
	}

	function _createRequestContent() {
		var content = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"><html><head><base target="_top" /><scr' + 'ipt>inDapIF=true;</scr' + 'ipt></head>';
		content += '<body>';
		content += '<scr' + 'ipt>';
		content += '' +
			'window.pm_pub_id  = "%%PM_PUB_ID%%";' +
			'window.pm_optimize_adslots     = [%%PM_OPTIMIZE_ADSLOTS%%];';
		content += '</scr' + 'ipt>';

		var map = {};
		map['PM_PUB_ID'] = _pm_pub_id;
		map['PM_OPTIMIZE_ADSLOTS'] = _pm_optimize_adslots.map( function(adSlot) {
			return "'" + adSlot + "'";
		}).join(',');

		content += '<scr' + 'ipt src="//ads.pubmatic.com/AdServer/js/gshowad.js"></scr' + 'ipt>';
		content += '<scr' + 'ipt>';
		content += 'window.parent.pbjs.handlePubmaticCallback({progKeyValueMap: progKeyValueMap, bidDetailsMap: bidDetailsMap})';
		content += '</scr' + 'ipt>';
		content += '</body></html>';
		content = utils.replaceTokenInString(content, map, '%%');

		return content;
	}

	pbjs.handlePubmaticCallback = function(response) {
		var i;
		var adUnit;
		var adUnitInfo;
		var bid;
		var bidResponseMap = (response && response.bidDetailsMap) || {};
		var bidInfoMap = (response && response.progKeyValueMap) || {};
		var dimensions;

		pbjs.bidderRawBidsBack('pubmatic');

		for(i = 0; i < bids.length; i++) {
			var adResponse;
			bid = bids[i].params;

			adUnit = bidResponseMap[bid.adSlot] || {};

			// adUnitInfo example: bidstatus=0;bid=0.0000;bidid=39620189@320x50;wdeal=
			adUnitInfo = (bidInfoMap[bid.adSlot] || '').split(';').reduce(function(result, pair){
				var parts = pair.split('=');
				result[parts[0]] = parts[1];
				return result;
			}, {});

			if (adUnitInfo.bidstatus === '1') {
				dimensions = adUnitInfo.bidid.split('@')[1].split('x');
				adResponse = bidfactory.createBid(1);
				adResponse.bidderCode = 'pubmatic';
				adResponse.adSlot = bid.adSlot;
				adResponse.cpm = Number(adUnitInfo.bid);
				adResponse.ad = unescape(adUnit.creative_tag);
				adResponse.adUrl = unescape(adUnit.tracking_url);
				adResponse.width = dimensions[0];
				adResponse.height = dimensions[1];
				adResponse.dealId = adUnitInfo.wdeal;

				bidmanager.addBidResponse(bids[i].placementCode, adResponse);
			} else {
				// Indicate an ad was not returned
				adResponse = bidfactory.createBid(2);
				adResponse.bidderCode = 'pubmatic';
				bidmanager.addBidResponse(bids[i].placementCode, adResponse);
			}
		}
	};

	return {
		callBids: _callBids
	};

};

module.exports = PubmaticAdapter;

},{"../adloader":7,"../bidfactory.js":8,"../bidmanager.js":9,"../constants.json":10,"../utils.js":12}],6:[function(require,module,exports){
//Factory for creating the bidderAdaptor
var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var RubiconAdapter = function RubiconAdapter() {

	// Map size dimensions to size 'ID'
	var sizeMap = {};

	//var bidResponse =
	//callback when all bids are in

	/* 1. must define a callBids method that will take params and handle all logic handling request
	 *
	params = {
		bids: [{
				bidder: 'appnexus',
				adUnitCode: 'ad_unit_code',
				sizes: [
					[300, 250],
					[300, 600]
				],
				params: {
					key: value,
					key: value
				}
			}, {
				bidder: 'appnexus',
				adUnitCode: 'ad_unit_code',
				sizes: [
					[300, 250],
					[300, 600]
				],
				params: {
					key: value,
					key: value
				}
			}

		]
	}
	 */
	function callBids(params) {
		var bidArr = params.bids;
		for (var i = 0; i < bidArr.length; i++) {
			var bid = bidArr[i];
			//get the first size in the array
			//TODO validation
			var width = bid.sizes[0][0];
			var height = bid.sizes[0][1];
			var iframeContents = createRequestContent(bid, 'window.parent.pbjs.handleRubiconCallback', width, height);
			var iframeId = loadIframeContent(iframeContents);
			bid.iframeId = iframeId;
			bidmanager.pbCallbackMap[getBidId(bid)] = bid;
		}

	}

	// Build an ID that can be used to identify the response to the bid request.  There
	// may be an identifier we can send that gets sent back to us.
	function getBidId(bid){
		return (bid.params ? [bid.params.rp_account, bid.params.rp_site, bid.params.rp_zonesize] :
						   	[bid.account_id, bid.site_id, bid.zone_id, bid.size_id]).join('-');

	}

	function loadIframeContent(content, callback) {
		//create the iframe
		var iframe = utils.createInvisibleIframe();
		var elToAppend = document.getElementsByTagName('head')[0];
		//insert the iframe into document
		elToAppend.insertBefore(iframe, elToAppend.firstChild);
		//todo make this more browser friendly
		var iframeDoc = iframe.contentWindow.document;
		iframeDoc.write(content);
		iframeDoc.close();

		return iframe.id;

	}

	function createRequestContent(bidOptions, callback, width, height) {
		/* //this is the what the tag on page looks like.
		//need to build this HTML content to insert into iframe
		<script>
		window.rp_account = '9707';
		window.rp_site = '17955';
		window.rp_zonesize = '50983-15';
		window.rp_tracking = "affiliate-1701207318";
		window.rp_visitor = {
			gender: "",
			genre: ""
		};

		window.rp_width = 300;
		window.rp_height = 250;
		window.rp_adtype = 'jsonp';
		window.rp_inventory = ({
			deals: "mobv3_excl,atf,demo1849,csm1834,znexcl1,exunisite,exmars,extargt,ldacomp,ent19116,rn14858,ukent,g03070,qc12170,qc2690,qc2695,qc1988,asov1,qc12172,qc12169,qc27434,rn24858,ent29116,lngen,cntq,cntauto,anthea,smg_blklist,amnetctr,ntflxblk,amtblk,zentend,nortb,deschoeff,js,excltop,"
		});
		window.rp_floor = 0.1;
		window.rp_callback = window.parent.foo;
		</script>

		<script src="http://ads.rubiconproject.com/ad/9707.js"></script>


*/

		// Map the size 'ID' to the dimensions
		sizeMap[bidOptions.params.rp_zonesize.split('-')[1]] = {
			width: width,
			height: height
		};

		var content = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"><html><head><base target="_top" /><scr' + 'ipt>inDapIF=true;</scr' + 'ipt></head>';
		content += '<body>';
		content += '<scr' + 'ipt>';


		content += '' +
			'window.rp_account  = "%%RP_ACCOUNT%%";' +
			'window.rp_site     = "%%RP_SITE%%";' +
			'window.rp_zonesize = "%%RP_ZONESIZE%%";' +
			'window.rp_tracking = "%%RP_TRACKING%%";' +
			'window.rp_visitor =  %%RP_VISITOR%%;' +
			'window.rp_width =  %%RP_WIDTH%%;' +
			'window.rp_height =  %%RP_HEIGHT%%;' +
			'window.rp_adtype   = "jsonp";' +
			'window.rp_inventory = %%RP_INVENTORY%% ;' +
			'window.rp_floor=%%RP_FLOOR%%;' +
			'window.rp_callback = ' + callback + ';';


		var map = {};
		map['RP_ACCOUNT'] = bidOptions.params.rp_account;
		map['RP_SITE'] = bidOptions.params.rp_site;
		map['RP_ZONESIZE'] = bidOptions.params.rp_zonesize;
		map['RP_TRACKING'] = (bidOptions.params.rp_tracking) ? bidOptions.params.rp_tracking : '';
		map['RP_VISITOR'] = bidOptions.params.rp_visitor ? bidOptions.params.rp_visitor : '{}';
		map['RP_WIDTH'] = width;
		map['RP_HEIGHT'] = height;
		map['RP_INVENTORY'] = bidOptions.params.rp_inventory || '{}';
		map['RP_FLOOR'] = bidOptions.params.rp_floor ? bidOptions.params.rp_floor : '0.00';

		content += '</scr' + 'ipt>';
		content += '<scr' + 'ipt src="http://ads.rubiconproject.com/ad/%%RP_ACCOUNT%%.js"></scr' + 'ipt>';
		content += '</body></html>';

		content = utils.replaceTokenInString(content, map, '%%');

		//console.log(content);

		return content;

	}

	//This function is specific to AppNexus adaptor

	//This function is specific to AppNexus adaptor - expose the callback to the global pbjs object:
	pbjs.handleRubiconCallback = function(response) {
		var placementCode = '';
		//log the response object
		//console.log(response);
		//TODO need to identify the size by 'size_id'
		/*
			response object
			{
				account_id: 'id',
				ads: [{
					ad_id: '',
					advertiser: 1234,
					cpm: 10,
					creative_id: 123456,
					deal: 98877,
					impression_id: '',
					network: 1325,
					script: 'ad_tag',
					size_id: '15',
					type: 'script'
				}],
				inventory: {},
				site_id: 123213,
				size_id: 15,
				status: 'ok',
				tracking: 'affiliate-17232',
				zone_id: 50983
			}
			*/

		//TODO - need to send the bid back and track responses
		pbjs.bidderRawBidsBack('rubicon');

		var bid = {};
		if (response && response.status === 'ok') {
			try{
				var iframeId = '';
				var bidObj = bidmanager.getPlacementIdByCBIdentifer(getBidId(response));
				if (bidObj) {
					placementCode = bidObj.placementCode;
					bidObj.status = CONSTANTS.STATUS.GOOD;
					iframeId = bidObj.iframeId;
				}

				bid = bidfactory.createBid(1);

				if (response.ads && response.ads[0]) {
					var rubiconAd = response.ads[0];
					var size = sizeMap[rubiconAd.size_id];
					var width = 0;
					var height = 0;

					var iframeObj = window.frames[iframeId];
					var rubiconObj = iframeObj.contentWindow.RubiconAdServing;
					if(rubiconObj && rubiconObj.AdSizes){
						/* should return
						    1: {
	       					 dim: "468x60"
	   						 },
						*/
						size = rubiconObj.AdSizes[rubiconAd.size_id];
						var sizeArray = size.dim.split('x');
						width = sizeArray[0];
						height = sizeArray[1];
					}

					bid.cpm = rubiconAd.cpm;
					bid.ad = '<script>' + rubiconAd.script + '</script>';
					bid.ad_id = rubiconAd.ad_id;
					bid.bidderCode = 'rubicon';
					bid.sizeId = rubiconAd.size_id;
					bid.width = width;
					bid.height = height;
				}

			}
			catch(e){
				utils.logError('Error parsing rubicon response bid: ' + e.message);
			}
			
		} else {
			//set bid response code to 2 = no response or error
			bid = bidfactory.createBid(2);
			bid.bidderCode = 'rubicon';
			var bidObj = bidmanager.getPlacementIdByCBIdentifer(getBidId(response));
			if (bidObj) {
				placementCode = bidObj.placementCode;
			}

		}

		//add the bid response here
		bidmanager.addBidResponse(placementCode, bid);

		//3. let us know when all bids are in (need to check if they are all here first)
		//bidsAreAllIn(bidderCode);

	};

	return {
		callBids: callBids

	};
	//end of Rubicon bid adaptor
};

module.exports = RubiconAdapter;

},{"../bidfactory.js":8,"../bidmanager.js":9,"../constants.json":10,"../utils.js":12}],7:[function(require,module,exports){
//add a script tag to the page, used to add /jpt call to page
exports.loadScript = function(tagSrc, callback) {
	//create a script tag for the jpt call
	var jptScript = document.createElement('script');
	jptScript.type = 'text/javascript';
	jptScript.async = true;


	// Execute a callback if necessary
	if (callback && typeof callback === "function") {
		if (jptScript.readyState) {
			jptScript.onreadystatechange = function () {
				if (jptScript.readyState == "loaded" || jptScript.readyState == "complete") {
					jptScript.onreadystatechange = null;
					callback();
				}
			};
		} else {
			jptScript.onload = function () {
				callback();
			};
		}
	}

	//call function to build the JPT call
	jptScript.src = tagSrc;

	//add the new script tag to the page
	var elToAppend = document.getElementsByTagName('head');
	elToAppend = elToAppend.length ? elToAppend : document.getElementsByTagName('body');
	if (elToAppend.length) {
		elToAppend = elToAppend[0];
		elToAppend.insertBefore(jptScript, elToAppend.firstChild);
	}
};

exports.trackPixel = function(pixelUrl) {
	//track a impbus tracking pixel

	//TODO: Decide of tracking via AJAX is sufficent, or do we need to
	//run impression trackers via page pixels?
	try {

		//add a cachebuster so we don't end up dropping any impressions
		pixelUrl += '&rnd=' + Math.random();

		if (pixelUrl) {
			var img = document.createElement('img');
			img.src = pixelUrl;
		}


	} catch (e) {

	}
};

},{}],8:[function(require,module,exports){
var utils = require('./utils.js');

/**
	Required paramaters
		bidderCode,
		height,
		width,
		statusCode
	Optional paramaters
		adId,
		cpm,
		ad,
		adUrl,
		dealId,
		priceKeyString;
 */
function Bid(statusCode) {
	var _bidId = utils.getUniqueIdentifierStr(),
	_statusCode = statusCode || 0;
	this.bidderCode = '';
	this.width = 0;
	this.height = 0;
	this.statusMessage = _getStatus();
	this.adId = _bidId;

	function _getStatus() {
		switch (_statusCode) {
			case 0:
				return 'Pending';
			case 1:
				return 'Bid available';
			case 2:
				return 'Bid returned empty or error response';
			case 3:
				return 'Bid timed out';
		}
	}
	this.getStatusCode = function(){
		return _statusCode;
	};

	function _setStatusCode(status) {
		this._statusCode = status;
		//update status msg
		this._statusMessage = this._getStatus();
	}
	//returns the size of the bid creative. Concatenation of width and height by â€˜xâ€™.
	this.getSize = function (){
		return this.width + 'x' + this.height;
	};

}

 // Bid factory function.
exports.createBid = function(statusCde){
	return new Bid(statusCde);
};

//module.exports = Bid;

},{"./utils.js":12}],9:[function(require,module,exports){
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

		bid.responseTime = new Date().getTime(); // HYANG ADDED! TODO!!

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
		bidResponseObj = this.createEmptyBidResponseObj();
	}

	//store the bidResponse in a map
	pbBidResponseByPlacement[adUnitCode] = bidResponseObj;

	this.checkIfAllBidsAreIn();

	//TODO: check if all bids are in
};

exports.createEmptyBidResponseObj = function(){
	return {
			bids: [],
			allBidsAvailable: false
		};
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
},{"./constants.json":10,"./utils.js":12}],10:[function(require,module,exports){
module.exports={
	"JSON_MAPPING": {
		"PL_CODE": "code",
		"PL_SIZE": "sizes",
		"PL_BIDS": "bids",
		"BD_BIDDER": "bidder",
		"BD_ID": "paramsd",
		"BD_PL_ID": "placementId",
		"ADSERVER_TARGETING": "adserverTargeting",
		"BD_SETTING_STANDARD" : "standard"
	},
	"DEBUG_MODE": "pbjs_debug",
	"STATUS": {
		"GOOD": "good",
		"TIMEOUT": "timed out"
	}
}

},{}],11:[function(require,module,exports){
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
//default timeout for all bids
pbjs.bidderTimeout = pbjs.bidderTimeout || 3000;
pbjs.logging = pbjs.logging || false;

//let the world know we are loaded
pbjs.libLoaded = true;

//if pbjs.anq command queue already exists, use it, if not create it
pbjs.anq = pbjs.anq || [];

/*
 *   Main method entry point method
 */
function init(adUnitCode) {
	//set timeout for all bids
	setTimeout(bidmanager.executeCallback, pbjs.bidderTimeout);
	//parse settings into internal vars
	if (adUnitCode) {
		if (pbjs.adUnits) {
			for (var i = 0; i < pbjs.adUnits.length; i++) {
				if (pbjs.adUnits[i].code === adUnitCode) {
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

function sortAndCallBids(sortFunc) {
	//Translate the bidder map into array so we can sort later if wanted
	var pbArr = Object.keys(pb_bidderMap).map(function(key) {
		return pb_bidderMap[key];
	});
	if (typeof sortFunc === objectType_function) {
		pbArr.sort(sortFunc);
	}
	callBids(pbArr);
}


function callBids(bidderArr) {
	for (var i = 0; i < bidderArr.length; i++) {
		//use the bidder code to identify which function to call
		var bidder = bidderArr[i];
		if (bidder.bidderCode && _bidderRegistry[bidder.bidderCode]) {

			pbjs.beforeCallBidder(bidder.bidderCode); // HYANG ADDED! TODO!!

			utils.logMessage('CALLING BIDDER ======= ' + bidder.bidderCode);
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
	var returnObj = {};
	if (adunitCode) {
		returnObj = bidmanager.pbBidResponseByPlacement[adunitCode];
		if(returnObj){
			return returnObj;
		}
		else{
			return bidmanager.createEmptyBidResponseObj();
		}
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

/*
*	This function will refresh the bid requests for all adUnits or for specified adUnitCode
*/
pbjs.requestBidsForAdUnit = function(adUnitCode) {
	bidmanager.clearAllBidResponses();
	pb_bidderMap = {};
	init(adUnitCode);

};

// Register the bid adaptors here
registerBidAdapter(RubiconAdapter(), 'rubicon');
registerBidAdapter(AppNexusAdapter(), 'appnexus');
registerBidAdapter(OpenxAdapter(), 'openx');
registerBidAdapter(PubmaticAdapter(), 'pubmatic');
registerBidAdapter(CriteoAdapter(), 'criteo');
registerBidAdapter(AmazonAdapter(), 'amazon');

init();
},{"./adapters/amazon":1,"./adapters/appnexus.js":2,"./adapters/criteo":3,"./adapters/openx":4,"./adapters/pubmatic.js":5,"./adapters/rubicon.js":6,"./bidmanager.js":9,"./constants.json":10,"./utils.js":12}],12:[function(require,module,exports){
var CONSTANTS = require('./constants.json');
var objectType_function = 'function';
var objectType_undefined = 'undefined';
var objectType_object = 'object';
var objectType_string = 'string';
var objectType_number = 'number';

var _loggingChecked = false;

var _lgPriceCap = 5.00;
var _mgPriceCap = 10.00;
var _hgPriceCap = 20.00;

/*
 *   Substitues into a string from a given map using the token
 *   Usage
 *   var str = 'text %%REPLACE%% this text with %%SOMETHING%%';
 *   var map = {};
 *   map['replace'] = 'it was subbed';
 *   map['something'] = 'something else';
 *   console.log(replaceTokenInString(str, map, '%%')); => "text it was subbed this text with something else"
 */
exports.replaceTokenInString = function(str, map, token) {
	for (var key in map) {
		if (map.hasOwnProperty(key)) {
			var keyString = token + key.toUpperCase() + token;
			if (typeof map[key] === objectType_undefined) {
				map[key] = '';
			}
			var re = new RegExp(keyString, 'g');
			str = str.replace(re, map[key]);
		}
	}
	return str;
};

/* utility method to get incremental integer starting from 1 */
var getIncrementalInteger = (function() {
	var count = 0;
	return function() {
		count++;
		return count;
	};
})();

function _getUniqueIdentifierStr() {
	return getIncrementalInteger() + Math.random().toString(16).substr(2);
}

//generate a random string (to be used as a dynamic JSONP callback)
exports.getUniqueIdentifierStr = _getUniqueIdentifierStr;

exports.getBidIdParamater = function(key, paramsObj) {
	if (paramsObj && paramsObj[key]) {
		return paramsObj[key];
	}
	return '';
};

exports.tryAppendQueryString = function(existingUrl, key, value) {
	if (value) {
		return existingUrl += key + '=' + encodeURIComponent(value) + '&';
	}
	return existingUrl;
};

//parse a GPT-Style General Size Array or a string like "300x250" into a format
//suitable for passing to a GPT tag, may include size and/or promo sizes
exports.parseSizesInput = function(sizeObj) {
	var sizeQueryString;
	var parsedSizes = [];

	//if a string for now we can assume it is a single size, like "300x250"
	if (typeof sizeObj === objectType_string) {
		//multiple sizes will be comma-separated
		var sizes = sizeObj.split(',');
		//regular expression to match strigns like 300x250
		//start of line, at least 1 number, an "x" , then at least 1 number, and the then end of the line
		var sizeRegex = /^(\d)+x(\d)+$/i;
		if (sizes) {
			for (var curSizePos in sizes) {
				if (hasOwn(sizes, curSizePos) && sizes[curSizePos].match(sizeRegex)) {
					parsedSizes.push(sizes[curSizePos]);
				}
			}
		}
	} else if (typeof sizeObj === objectType_object) {
		var sizeArrayLength = sizeObj.length;
		//don't process empty array
		if (sizeArrayLength > 0) {
			//if we are a 2 item array of 2 numbers, we must be a SingleSize array
			if (sizeArrayLength === 2 && typeof sizeObj[0] === objectType_number && typeof sizeObj[1] === objectType_number) {
				parsedSizes.push(parseGPTSingleSizeArray(sizeObj));
			} else {
				//otherwise, we must be a MultiSize array
				for (var i = 0; i < sizeArrayLength; i++) {
					parsedSizes.push(parseGPTSingleSizeArray(sizeObj[i]));
				}

			}
		}
	}


	//combine string into proper querystring for impbus
	var parsedSizesLength = parsedSizes.length;
	if (parsedSizesLength > 0) {
		//first value should be "size"
		sizeQueryString = 'size=' + parsedSizes[0];
		if (parsedSizesLength > 1) {
			//any subsequent values should be "promo_sizes"
			sizeQueryString += '&promo_sizes=';
			for (var j = 1; j < parsedSizesLength; j++) {
				sizeQueryString += parsedSizes[j] += ',';
			}
			//remove trailing comma
			if (sizeQueryString && sizeQueryString.charAt(sizeQueryString.length - 1) === ',') {
				sizeQueryString = sizeQueryString.slice(0, sizeQueryString.length - 1);
			}
		}
	}

	return sizeQueryString;

};

//parse a GPT style sigle size array, (i.e [300,250])
//into an AppNexus style string, (i.e. 300x250)
function parseGPTSingleSizeArray(singleSize) {
	//if we aren't exactly 2 items in this array, it is invalid
	if (typeof singleSize === objectType_object && singleSize.length === 2 && !isNaN(singleSize[0]) && !isNaN(singleSize[1])) {
		return singleSize[0] + 'x' + singleSize[1];
	}

}
exports.parseGPTSingleSizeArray = parseGPTSingleSizeArray;

exports.getTopWindowUrl = function() {
	try {
		return window.top.location.href;
	} catch (e) {
		return window.location.href;
	}
};

exports.logMessage = function(msg) {

	if (debugTurnedOn() && hasConsoleLogger()) {
		console.log('MESSAGE: ' + msg);
	}
};
var hasConsoleLogger = function() {
	return (window.console && window.console.log);
};
exports.hasConsoleLogger = hasConsoleLogger;

function hasConsoleLogger() {
	return (window.console && window.console.log);
}

var debugTurnedOn = function() {
	if (pbjs.logging === false && _loggingChecked === false) {
		pbjs.logging = !!getParameterByName(CONSTANTS.DEBUG_MODE);
		_loggingChecked = true;
	}

	if (pbjs.logging) {
		return true;
	}
	return false;

};
exports.debugTurnedOn = debugTurnedOn;

exports.logError = function(msg, code) {
	var errCode = code || 'ERROR';
	if (debugTurnedOn() && hasConsoleLogger()) {
		if(console.error){
			console.error(errCode + ': ' + msg);
		}
		else{
			console.log(errCode + ': ' + msg);
		}
		
	}
};

exports.createInvisibleIframe = function _createInvisibleIframe() {
	var f = document.createElement('iframe');
	f.id = _getUniqueIdentifierStr();
	f.height = 0;
	f.width = 0;
	f.border = '0px';
	f.hspace = '0';
	f.vspace = '0';
	f.marginWidth = '0';
	f.marginHeight = '0';
	f.style.border = '0';
	f.scrolling = 'no';
	f.frameBorder = '0';
	f.src = 'about:self';
	f.style = 'display:none';
	return f;
};

/*
 *   Check if a given paramater name exists in query string
 *   and if it does return the value
 */
var getParameterByName = function(name) {
	var regexS = '[\\?&]' + name + '=([^&#]*)',
		regex = new RegExp(regexS),
		results = regex.exec(window.location.search);
	if (results === null) {
		return '';
	}
	return decodeURIComponent(results[1].replace(/\+/g, ' '));
};

exports.getPriceBucketString = function(cpm) {
	var low = '',
		med = '',
		high = '',
		cpmFloat = 0,
		returnObj = {
			low: low,
			med: med,
			high: high
		};
	try {
		cpmFloat = parseFloat(cpm);
		if (cpmFloat) {
			//round to closet .5
			if(cpmFloat > _lgPriceCap){
				returnObj.low = _lgPriceCap;
			}
			else{
				returnObj.low = (Math.floor(cpm * 2) / 2).toFixed(2);
			}
			
			//round to closet .1
			if(cpmFloat > _mgPriceCap){
				returnObj.low = _mgPriceCap;
			}
			else{
				returnObj.med =  (Math.floor(cpm * 10) / 10).toFixed(2);
			}
			
			//round to closet .01
			if(cpmFloat > _lgPriceCap){
				returnObj.low = _lgPriceCap;
			}
			else{
				returnObj.high = (Math.floor(cpm * 100) / 100).toFixed(2);
			}
			
		}

	} catch (e) {
		this.logError('Exception parsing CPM :' + e.message);
	}
	return returnObj;

};

},{"./constants.json":10}]},{},[11])