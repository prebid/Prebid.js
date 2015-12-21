/* Prebid.js v0.4.0 
Updated : 2015-12-21 */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/** @module adaptermanger */

var RubiconAdapter = require('./adapters/rubicon.js');
var AppNexusAdapter = require('./adapters/appnexus.js');
var OpenxAdapter = require('./adapters/openx');
var PubmaticAdapter = require('./adapters/pubmatic.js');
var CriteoAdapter = require('./adapters/criteo');
var YieldbotAdapter = require('./adapters/yieldbot');
var IndexExchange = require('./adapters/indexExchange');
var AdformAdapter = require('./adapters/adform');
var Aol = require('./adapters/aol');
var bidmanager = require('./bidmanager.js');
var utils = require('./utils.js');
var CONSTANTS = require('./constants.json');

var _bidderRegistry = {};
exports.bidderRegistry = _bidderRegistry;


exports.callBids = function(bidderArr) {
	for (var i = 0; i < bidderArr.length; i++) {
		//use the bidder code to identify which function to call
		var bidder = bidderArr[i];
		if (bidder.bidderCode && _bidderRegistry[bidder.bidderCode]) {
			utils.logMessage('CALLING BIDDER ======= ' + bidder.bidderCode);
			var currentBidder = _bidderRegistry[bidder.bidderCode];
			currentBidder.callBids(bidder);
			var currentTime = new Date().getTime();
			bidmanager.registerBidRequestTime(bidder.bidderCode, currentTime);

			if (currentBidder.defaultBidderSettings) {
				bidmanager.registerDefaultBidderSetting(bidder.bidderCode, currentBidder.defaultBidderSettings);
			}
		}
	}
};


exports.registerBidAdapter = function(bidAdaptor, bidderCode) {
	if (bidAdaptor && bidderCode) {
		if (typeof bidAdaptor.callBids === CONSTANTS.objectType_function) {
			_bidderRegistry[bidderCode] = bidAdaptor;
		} else {
			utils.logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
		}
	} else {
		utils.logError('bidAdaptor or bidderCode not specified');
	}
};

// Register the bid adaptors here
this.registerBidAdapter(RubiconAdapter(), 'rubicon');
this.registerBidAdapter(AppNexusAdapter(), 'appnexus');
this.registerBidAdapter(OpenxAdapter(), 'openx');
this.registerBidAdapter(PubmaticAdapter(), 'pubmatic');
this.registerBidAdapter(CriteoAdapter(), 'criteo');
this.registerBidAdapter(YieldbotAdapter(), 'yieldbot');
this.registerBidAdapter(IndexExchange(), 'indexExchange');
this.registerBidAdapter(Aol(), 'aol');
this.registerBidAdapter(AdformAdapter(), 'adform');

},{"./adapters/adform":2,"./adapters/aol":3,"./adapters/appnexus.js":4,"./adapters/criteo":5,"./adapters/indexExchange":6,"./adapters/openx":7,"./adapters/pubmatic.js":8,"./adapters/rubicon.js":9,"./adapters/yieldbot":10,"./bidmanager.js":13,"./constants.json":14,"./utils.js":16}],2:[function(require,module,exports){
var utils = require('../utils.js');
var adloader = require('../adloader.js');
var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');

function AdformAdapter() {

    return {
        callBids: _callBids
    };

    function _callBids(params) {
        var callbackName = '_adf_' + utils.getUniqueIdentifierStr(), bid, noDomain = true;
        var bids = params.bids;
        var request = [];

        for (var i = 0, l = bids.length; i < l; i++) {
            bid = bids[i];
            if (bid.adxDomain && noDomain) {
                noDomain = false;
                request.unshift('//' + bid.adxDomain + '/adx/?rp=4');
            }
            request.push(formRequestUrl(bid.params));
        }

        if (noDomain) {
            request.unshift('//adx.adform.net/adx/?rp=4');
        }

        pbjs[callbackName] = handleCallback(bids);
        request.push('callback=pbjs.' + callbackName);

        adloader.loadScript(request.join('&'));
    }

    function formRequestUrl(reqData) {
        var key;
        var url = [];

        var validProps = [
            'mid', 'inv', 'pdom', 'mname', 'mkw', 'mkv', 'cat', 'bcat', 'bcatrt', 'adv', 'advt', 'cntr', 'cntrt', 'maxp',
            'minp', 'sminp', 'w', 'h', 'pb', 'pos', 'cturl', 'iturl', 'cttype', 'hidedomain', 'cdims', 'test'
        ];

        for (var i = 0, l = validProps.length; i < l; i++) {
            key = validProps[i];
            if (reqData.hasOwnProperty(key))
                url.push(key, '=', reqData[key], '&');
        }

        return encode64(url.join(''));
    }

    function handleCallback(bids) {
        return function handleResponse(adItems) {
            var bidObject, bidder = 'adform', adItem, bid;
            for(var i = 0, l = adItems.length; i < l; i++){
                adItem = adItems[i];
                bid = bids[i];
                if (adItem && adItem.response == 'banner') {
                    bidObject = bidfactory.createBid(1);
                    bidObject.bidderCode = bidder;
                    bidObject.cpm = parseInt(adItem.win_bid, 10);
                    bidObject.cur = adItem.win_cur;
                    bidObject.ad = adItem.banner;
                    bidObject.width = adItem.width;
                    bidObject.height = adItem.height;
                    bidmanager.addBidResponse(bid.placementCode, bidObject);
                } else {
                    bidObject = bidfactory.createBid(2);
                    bidObject.bidderCode = bidder;
                    bidmanager.addBidResponse(bid.placementCode, bidObject);
                }
            }
        };
    }

    function encode64(input) {
        var out = [];
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
        var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=";

        input = utf8_encode(input);

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            out.push(_keyStr.charAt(enc1), _keyStr.charAt(enc2));
            if (enc3 != 64)
                out.push(_keyStr.charAt(enc3));
            if (enc4 != 64)
                out.push(_keyStr.charAt(enc4));
        }

        return out.join('');
    }

    function utf8_encode(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }

        return utftext;
    }

}

module.exports = AdformAdapter;

},{"../adloader.js":11,"../bidfactory.js":12,"../bidmanager.js":13,"../utils.js":16}],3:[function(require,module,exports){
var utils = require('../utils.js'),
    bidfactory = require('../bidfactory.js'),
    bidmanager = require('../bidmanager.js'),
    adloader = require('../adloader');

var AolAdapter = function AolAdapter() {
  var bids,
      bidsMap = {},
      ADTECH_URI = '//aka-cdn.adtechus.com/dt/common/DAC.js',
      d = window.document,
      h = d.getElementsByTagName('HEAD')[0],
      dummyUnitIdCount = 0;


  // aol expects the ad unit
  // to be on the page when request
  // the bid, and will document.write() it in
  // if you don't have it :/
  function _dummyUnit(id) {
    var div = d.createElement('DIV');

    if (!id || !id.length) {
      id = 'ad-placeholder-' + (++dummyUnitIdCount);
    }

    div.id = id + '-head-unit';
    h.appendChild(div);
    return div.id;
  }

  function _addBid(response, context) {
    var bid = bidsMap[context.alias || context.placement],
        cpm;

    if (!bid) {
      utils.logError('AOL', 'ERROR', 'mismatched bid: ' + context.placement);
      return;
    }

    cpm = response.getCPM();
    if (cpm == null) {
      return _addErrorBid(response, context);
    }

    var bidResponse = bidfactory.createBid(1);
    bidResponse.bidderCode = 'aol';
    bidResponse.ad = response.getCreative() + response.getPixels();
    bidResponse.cpm = cpm;
    bidResponse.width = response.getAdWidth();
    bidResponse.height = response.getAdHeight();
    bidResponse.creativeId = response.getCreativeId();

    // add it to the bid manager
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  function _addErrorBid(response, context) {
    var bid = bidsMap[context.alias || context.placement];
    if (!bid) {
      utils.logError('AOL', 'ERROR', 'mismatched bid: ' + context.placement);
      return;
    }

    var bidResponse = bidfactory.createBid(2);
    bidResponse.bidderCode = 'aol';
    bidResponse.reason = response.getNbr();
    bidResponse.raw = response.getResponse();
    bidmanager.addBidResponse(bid.placementCode, bidResponse);
  }

  var _pubApiConfig = {
    pixelsDivId: 'pixelsDiv',
    defaultKey: 'aolBid',
    roundingConfig: [
      {from: 0, to: 999, roundFunction: 'tenCentsRound'},
      {from: 1000, to: -1, roundValue: 1000}
    ],
    pubApiOK: _addBid,
    pubApiER: _addErrorBid
  };

  function _mapUnit(bid) {
    // save the bid
    bidsMap[bid.params.alias || bid.params.placement] = bid;

    return {
      adContainerId: _dummyUnit(bid.params.adContainerId),
      server: bid.params.server, // By default, DAC.js will use the US region endpoint (adserver.adtechus.com)
      sizeid: bid.params.sizeId,
      pageid: bid.params.pageId,
      secure: false,
      serviceType: 'pubapi',
      performScreenDetection: false,
      alias: bid.params.alias,
      network: bid.params.network,
      placement: bid.params.placement,
      gpt: {
        adUnitPath: bid.params.adUnitPath || bid.placementCode,
        size: bid.params.size || (bid.sizes || [])[0]
      },
      params: {
        cors: 'yes',
        cmd: 'bid'
      },
      pubApiConfig: _pubApiConfig,
      placementCode: bid.placementCode
    };
  }

  function _reqBids() {
    if (!window.ADTECH) {
      utils.logError('AOL', 'ERROR', 'adtech is not present!');
      return;
    }

    // get the bids
    utils._each(bids, function (bid) {
      var bidreq = _mapUnit(bid);
      ADTECH.loadAd(bidreq);
    });
  }

  function _callBids(params) {
    bids = params.bids;
    if (!bids || !bids.length) return;
    adloader.loadScript(ADTECH_URI, _reqBids);
  }

  return {
    callBids: _callBids
  };
};

module.exports = AolAdapter;

},{"../adloader":11,"../bidfactory.js":12,"../bidmanager.js":13,"../utils.js":16}],4:[function(require,module,exports){
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

			utils.logMessage('latency for placement code : ' + placementCode + ' : ' + timeDiff + ' ms.' + ' Tracking URL Fired : ' + trackingUrl);
		}
	}


	function buildJPTCall(bid, callbackId) {

		//determine tag params
		var placementId = utils.getBidIdParamater('placementId', bid.params);
		var memberId = utils.getBidIdParamater('memberId', bid.params);
		var inventoryCode = utils.getBidIdParamater('invCode', bid.params);
		var query = utils.getBidIdParamater('query', bid.params);

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
},{"../adloader.js":11,"../bidfactory.js":12,"../bidmanager.js":13,"../constants.json":14,"../utils.js":16}],5:[function(require,module,exports){
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

	function _getUniqueNids(bids) {
		var key;
		var map = {};
		var nids = [];
		bids.forEach(function(bid) {
			map[bid.params.nid] = bid;
		});
		for (key in map) {
			if (map.hasOwnProperty(key)) {
				nids.push(map[key]);
			}
		}
		return nids;
	}

	function _requestBid(bid) {
		var varname = 'crtg_varname_' + bid.params.nid;
		var scriptUrl = '//rtax.criteo.com/delivery/rta/rta.js?netId=' + encodeURI(bid.params.nid) +
			'&cookieName=' + encodeURI(bid.params.cookiename) +
			'&rnd=' + Math.floor(Math.random() * 99999999999) +
			'&varName=' + encodeURI(varname);

		adloader.loadScript(scriptUrl, function(response) {
			var adResponse;
			var content = window[varname];

			// Add a response for each bid matching the "nid"
			bids.forEach(function(existingBid) {
				if (existingBid.params.nid === bid.params.nid) {
					if (content) {
						adResponse = bidfactory.createBid(1);
						adResponse.bidderCode = 'criteo';

						adResponse.keys = content.split(';');
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
},{"../adloader":11,"../bidfactory.js":12,"../bidmanager.js":13,"../constants.json":14,"../utils.js":16}],6:[function(require,module,exports){
//Factory for creating the bidderAdaptor
var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var ADAPTER_NAME = 'INDEXEXCHANGE';
var ADAPTER_CODE = 'indexExchange';

var IndexExchangeAdapter = function IndexExchangeAdapter() {
	var slotIdMap = {};
	var requiredParams = [
		/* 0 */
		'slotId',
		/* 1 */
		'indexUrl'
	];
	var firstAdUnitCode = '';

	function _callBids(request) {
		var bidArr = request.bids;

		//validate first bid request with all required params.
		if (!utils.hasValidBidRequest(bidArr[0].params, requiredParams, ADAPTER_NAME)) {
			return;
		}
		for (var i = 0; i < bidArr.length; i++) {
			var bid = bidArr[i];
			//only validate 1st param on rest of bids
			if (utils.hasValidBidRequest(bid.params, requiredParams.slice(0, 1), ADAPTER_NAME)) {
				firstAdUnitCode = bid.placementCode;
				var slotId = bid.params[requiredParams[0]];
				slotIdMap[slotId] = bid;
			}
		}

		var adUrl = bidArr[0].params[requiredParams[1]];
		var iframeContents = createRequestContent(adUrl);
		var iframe = buildIframeContainer();
		var iframeId = iframe.id;
		//attach to onload event of iframe to ensure script is ready
		utils.addEventHandler(iframe, 'load', function() {
			try {
				var iframeObj = window.frames[iframeId];
				var indexObj = iframeObj.contentWindow._IndexRequestData.targetIDToBid;
				var lookupObj = iframeObj.contentWindow.cygnus_index_args;

				if (utils.isEmpty(indexObj)) {
					//no bid response
					var bid = bidfactory.createBid(2);
					bid.bidderCode = ADAPTER_CODE;
					logErrorBidResponse();
					return;
				}

				utils._each(indexObj, function(adContents, cpmAndSlotId) {

					utils._each(slotIdMap, function(bid, adSlotId) {
						var obj = cpmAndSlotId.split('_');
						var currentId = obj[0];
						var currentCPM = obj[1];
						if (currentId === adSlotId) {
							var bidObj = slotIdMap[adSlotId];
							var adUnitCode = bidObj.placementCode;
							var slotObj = getSlotObj(lookupObj, adSlotId);
							bid = bidfactory.createBid(1);
							bid.cpm = (currentCPM / 100);
							bid.ad = adContents;
							bid.ad_id = adSlotId;
							bid.bidderCode = ADAPTER_CODE;
							bid.width = slotObj.width;
							bid.height = slotObj.height;
							bid.siteID = slotObj.siteID;
							bidmanager.addBidResponse(adUnitCode, bid);
						}
					});
				});

			} catch (e) {
				utils.logError('Error calling index adapter', ADAPTER_NAME, e);
				logErrorBidResponse();
			}
		});

		var iframeDoc = iframe.contentWindow.document;
		iframeDoc.write(iframeContents);
		iframeDoc.close();
	}

	function getSlotObj(obj, id) {
		var arr = obj.slots;
		var returnObj = {};
		utils._each(arr, function(value) {
			if (value.id === id) {
				returnObj = value;
			}
		});
		return returnObj;
	}

	function logErrorBidResponse() {
		//no bid response
		var bid = bidfactory.createBid(2);
		bid.bidderCode = ADAPTER_CODE;
		//log error to first add unit
		bidmanager.addBidResponse(firstAdUnitCode, bid);
	}

	function buildIframeContainer() {
		var iframe = utils.createInvisibleIframe();
		var elToAppend = document.getElementsByTagName('head')[0];
		//insert the iframe into document
		elToAppend.insertBefore(iframe, elToAppend.firstChild);
		return iframe;

	}

	function createRequestContent(url) {
		var content = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"><html><head><base target="_top" /><scr' + 'ipt>inDapIF=true;</scr' + 'ipt></head>';
		content += '<body>';
		content += '<scr' + 'ipt src="' + url + '"></scr' + 'ipt>';
		content += '</body></html>';
		return content;
	}


	return {
		callBids: _callBids
	};
	//end of Rubicon bid adaptor
};

module.exports = IndexExchangeAdapter;
},{"../bidfactory.js":12,"../bidmanager.js":13,"../constants.json":14,"../utils.js":16}],7:[function(require,module,exports){
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
			if (bid.params.pageURL) {
				opts.pageURL = bid.params.pageURL;
			}
			if (bid.params.refererURL) {
				opts.refererURL = bid.params.refererURL;
			}
			if (bid.params.jstag_url) {
				scriptUrl = bid.params.jstag_url;
			}
			if (bid.params.pgid) {
				opts.pgid = bid.params.pgid;
			}
		}
		_requestBids();
	}

	function _requestBids() {

		if (scriptUrl) {
			adloader.loadScript(scriptUrl, function() {
				var i;
				var POX = OX();

				POX.setPageURL(opts.pageURL);
				POX.setRefererURL(opts.refererURL);
				POX.addPage(opts.pgid);

				// Add each ad unit ID
				for (i = 0; i < bids.length; i++) {
					POX.addAdUnit(bids[i].params.unit);
				}

				POX.addHook(function(response) {
					var i;
					var bid;
					var adUnit;
					var adResponse;

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
},{"../adloader":11,"../bidfactory.js":12,"../bidmanager.js":13,"../constants.json":14,"../utils.js":16}],8:[function(require,module,exports){
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
		map['PM_OPTIMIZE_ADSLOTS'] = _pm_optimize_adslots.map(function(adSlot) {
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

		for (i = 0; i < bids.length; i++) {
			var adResponse;
			bid = bids[i].params;

			adUnit = bidResponseMap[bid.adSlot] || {};

			// adUnitInfo example: bidstatus=0;bid=0.0000;bidid=39620189@320x50;wdeal=
			adUnitInfo = (bidInfoMap[bid.adSlot] || '').split(';').reduce(function(result, pair) {
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
},{"../adloader":11,"../bidfactory.js":12,"../bidmanager.js":13,"../constants.json":14,"../utils.js":16}],9:[function(require,module,exports){
//Factory for creating the bidderAdaptor
var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var RubiconAdapter = function RubiconAdapter() {
	// Map size dimensions to size 'ID'
	var sizeMap = {};

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
	function getBidId(bid) {
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
			'window.rp_fastlane = true;' +
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

	window.pbjs = window.pbjs || {que: []};
	window.pbjs.handleRubiconCallback = function(response) {
		var placementCode = '';
	
		var bid = {};
		if (response && response.status === 'ok') {
			try {
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
					if (rubiconObj && rubiconObj.AdSizes) {
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

			} catch (e) {
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

	};

	return {
		callBids: callBids

	};
	//end of Rubicon bid adaptor
};

module.exports = RubiconAdapter;

},{"../bidfactory.js":12,"../bidmanager.js":13,"../constants.json":14,"../utils.js":16}],10:[function(require,module,exports){
/**
 * @overview Yieldbot sponsored Prebid.js adapter.
 * @author elljoh
 */
var adloader = require('../adloader');
var bidfactory = require('../bidfactory');
var bidmanager = require('../bidmanager');
var utils = require('../utils');

/**
 * Adapter for requesting bids from Yieldbot.
 *
 * @returns {Object} Object containing implementation for invocation in {@link module:adaptermanger.callBids}
 * @class
 */
var YieldbotAdapter = function YieldbotAdapter() {

    window.ybotq = window.ybotq || [];

    var ybotlib = {
        BID_STATUS: {
            PENDING: 0,
            AVAILABLE: 1,
            EMPTY: 2
        },
        definedSlots: [],
        pageLevelOption: false,
        /**
         * Builds the Yieldbot creative tag.
         *
         * @param {String} slot - The slot name to bid for
         * @param {String} size - The dimenstions of the slot
         * @private
         */
        buildCreative: function(slot, size) {
            return '<script type="text/javascript" src="//cdn.yldbt.com/js/yieldbot.intent.js"></script>' +
                '<script type="text/javascript">var ybotq = ybotq || [];' +
                'ybotq.push(function () {yieldbot.renderAd(\'' + slot.toLowerCase() + ':' + size + '\');});</script>';
        },
        /**
         * Bid response builder.
         *
         * @param {Object} slotCriteria  - Yieldbot bid criteria
         * @private
         */
        buildBid: function(slotCriteria) {
            var bid = {};

            if (slotCriteria && slotCriteria.ybot_ad && slotCriteria.ybot_ad !== 'n') {

                bid = bidfactory.createBid(ybotlib.BID_STATUS.AVAILABLE);

                bid.cpm = parseInt(slotCriteria.ybot_cpm) / 100.0 || 0; // Yieldbot CPM bids are in cents

                var szArr = slotCriteria.ybot_size ? slotCriteria.ybot_size.split('x') : [0,0],
                    slot = slotCriteria.ybot_slot || '',
                    sizeStr = slotCriteria.ybot_size || ''; // Creative template needs the dimensions string

                bid.width = szArr[0] || 0;
                bid.height = szArr[1] || 0;

                bid.ad = ybotlib.buildCreative(slot, sizeStr);

                // Add Yieldbot parameters to allow publisher bidderSettings.yieldbot specific targeting
                for (var k in slotCriteria) {
                    bid[k] = slotCriteria[k];
                }

            } else {
                bid = bidfactory.createBid(ybotlib.BID_STATUS.EMPTY);
            }

            bid.bidderCode = 'yieldbot';
            return bid;
        },
        /**
         * Yieldbot implementation of {@link module:adaptermanger.callBids}
         * @param {Object} params - Adapter bid configuration object
         * @private
         */
        callBids: function(params) {

	    var bids = params.bids || [],
                ybotq = window.ybotq || [];

            ybotlib.pageLevelOption = false;

            ybotq.push(function () {
                var yieldbot = window.yieldbot;

                utils._each(bids, function(v) {
	            var bid = v,
	                psn = bid.params && bid.params.psn || 'ERROR_DEFINE_YB_PSN',
	                slot = bid.params && bid.params.slot || 'ERROR_DEFINE_YB_SLOT';

                    yieldbot.pub(psn);
                    yieldbot.defineSlot(slot, {sizes: bid.sizes || []});

                    var cbId = utils.getUniqueIdentifierStr();
                    bidmanager.pbCallbackMap[cbId] = bid;
                    ybotlib.definedSlots.push(cbId);
                });

                yieldbot.enableAsync();
                yieldbot.go();
            });

            ybotq.push(function () {
                ybotlib.handleUpdateState();
            });

            adloader.loadScript('//cdn.yldbt.com/js/yieldbot.intent.js');
        },
        /**
         * Yieldbot bid request callback handler.
         *
         * @see {@link YieldbotAdapter~_callBids}
         * @private
         */
        handleUpdateState: function() {
            var yieldbot = window.yieldbot;

            utils._each(ybotlib.definedSlots, function(v) {
                var slot,
                    criteria,
                    placementCode,
                    adapterConfig;

                adapterConfig = bidmanager.getPlacementIdByCBIdentifer(v) || {};
                slot = adapterConfig.params.slot || '';
                criteria = yieldbot.getSlotCriteria(slot);

                placementCode = adapterConfig.placementCode || 'ERROR_YB_NO_PLACEMENT';
                var bid = ybotlib.buildBid(criteria);

                bidmanager.addBidResponse(placementCode, bid);

            });
        }
    }
    return {
        callBids: ybotlib.callBids
    };
};

module.exports = YieldbotAdapter;

},{"../adloader":11,"../bidfactory":12,"../bidmanager":13,"../utils":16}],11:[function(require,module,exports){
//add a script tag to the page, used to add /jpt call to page
exports.loadScript = function(tagSrc, callback) {
	//create a script tag for the jpt call
	var jptScript = document.createElement('script');
	jptScript.type = 'text/javascript';
	jptScript.async = true;


	// Execute a callback if necessary
	if (callback && typeof callback === "function") {
		if (jptScript.readyState) {
			jptScript.onreadystatechange = function() {
				if (jptScript.readyState == "loaded" || jptScript.readyState == "complete") {
					jptScript.onreadystatechange = null;
					callback();
				}
			};
		} else {
			jptScript.onload = function() {
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
},{}],12:[function(require,module,exports){
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
	this.getStatusCode = function() {
		return _statusCode;
	};

	function _setStatusCode(status) {
		this._statusCode = status;
		//update status msg
		this._statusMessage = this._getStatus();
	}
	//returns the size of the bid creative. Concatenation of width and height by ‘x’.
	this.getSize = function() {
		return this.width + 'x' + this.height;
	};

}

// Bid factory function.
exports.createBid = function(statusCde) {
	return new Bid(statusCde);
};

//module.exports = Bid;
},{"./utils.js":16}],13:[function(require,module,exports){
var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');
var adaptermanager = require('./adaptermanager');

var objectType_function = 'function';
var objectType_undefined = 'undefined';

var externalCallbackByAdUnitArr = [];
var externalCallbackArr = [];
var externalOneTimeCallback = null;
var biddersByPlacementMap = {};

var pbCallbackMap = {};
exports.pbCallbackMap = pbCallbackMap;

var pbBidResponseByPlacement = {};
exports.pbBidResponseByPlacement = pbBidResponseByPlacement;

//this is used to look up the bid by bid ID later
var _adResponsesByBidderId = {};
exports._adResponsesByBidderId = _adResponsesByBidderId;

var bidResponseReceivedCount = {};
exports.bidResponseReceivedCount = bidResponseReceivedCount;

var _allBidsAvailable = false;

var _callbackExecuted = false;

var defaultBidderSettingsMap = {};
var bidderStartTimes = {};

exports.getPlacementIdByCBIdentifer = function(id) {
	return pbCallbackMap[id];
};


exports.getBidResponseByAdUnit = function(adUnitCode) {
	return pbBidResponseByPlacement;

};


exports.clearAllBidResponses = function(adUnitCode) {
	_allBidsAvailable = false;
	_callbackExecuted = false;

	//init bid response received count
	initbidResponseReceivedCount();
	//clear the callback handler flag
	externalCallbackArr.called = false;

	for (var prop in this.pbBidResponseByPlacement) {
		delete this.pbBidResponseByPlacement[prop];
	}
};

function initbidResponseReceivedCount(){

	bidResponseReceivedCount = {};
	
	for(var i=0; i<pbjs.adUnits.length; i++){
		var bids = pbjs.adUnits[i].bids;
		for(var j=0; j<bids.length; j++){
			var bidder = bids[j].bidder;
			bidResponseReceivedCount[bidder] = 0;
		}
	}
}

exports.increaseBidResponseReceivedCount = function(bidderCode){
	increaseBidResponseReceivedCount(bidderCode);
};

function increaseBidResponseReceivedCount(bidderCode){
	if(typeof bidResponseReceivedCount[bidderCode] === objectType_undefined){
		bidResponseReceivedCount[bidderCode] = 1;
	}else{
		bidResponseReceivedCount[bidderCode]++;
	}
}

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
		//record bid request and resposne time
		bid.requestTimestamp = bidderStartTimes[bid.bidderCode];
		bid.responseTimestamp = new Date().getTime();
		bid.timeToRespond = bid.responseTimestamp - bid.requestTimestamp;

		//increment the bid count
		increaseBidResponseReceivedCount(bid.bidderCode);
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

	    // alias the bidderCode to bidder;
	    // NOTE: this is to match documentation
	    // on custom k-v targeting
	    bid.bidder = bid.bidderCode;

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
			utils.logError('Internal error in bidmanager.addBidResponse. Params: ' + adUnitCode + ' & ' + bid );
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
		custBidObj.alwaysUseBid = bidder_settings[bidderCode].alwaysUseBid;
	}
	//next try with defaultBidderSettings
	else if (defaultBidderSettingsMap[bidderCode]) {
		setKeys(keyValues, defaultBidderSettingsMap[bidderCode], custBidObj);
		custBidObj.alwaysUseBid = defaultBidderSettingsMap[bidderCode].alwaysUseBid;
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
		}
		setKeys(keyValues, bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD], custBidObj);
	}

	return keyValues;
}

function setKeys(keyValues, bidderSettings, custBidObj) {
	var targeting = bidderSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
	custBidObj.size = custBidObj.getSize();

	utils._each(targeting, function (kvPair) {
		var key = kvPair.key,
		value = kvPair.val;

		if (utils.isFn(value)) {
			try {
				keyValues[key] = value(custBidObj);
			} catch (e) {
				utils.logError("bidmanager", "ERROR", e);
			}
		} else {
			keyValues[key] = value;
		}
	});

  	return keyValues;
}

exports.registerDefaultBidderSetting = function(bidderCode, defaultSetting) {
	defaultBidderSettingsMap[bidderCode] = defaultSetting;
};

exports.registerBidRequestTime = function(bidderCode, time){
	bidderStartTimes[bidderCode] = time;
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

	//execute one time callback
	if(externalOneTimeCallback){
		var params = [];
		var responseObj = pbjs.getBidResponses();
		params.push(responseObj);

		processCallbacks(externalOneTimeCallback,params);
		externalOneTimeCallback = null;
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
	if(utils.isArray(callbackQueue)){
		for(i = 0; i < callbackQueue.length; i++){
			var func = callbackQueue[i];
			callFunction(func, params);
		}
	}
	else{
		callFunction(callbackQueue, params);
	}

}

function callFunction(func, args){
	if(typeof func === 'function'){
		try{
			func.apply(pbjs, args);
			//func.executed = true;
		}
		catch(e){
			utils.logError('Error executing callback function: ' + e.message);
		}
	}
}

function checkBidsBackByAdUnit(adUnitCode){
	for(var i = 0; i < pbjs.adUnits.length; i++){
		var adUnit = pbjs.adUnits[i];
		if(adUnit.code === adUnitCode){
			var bidsBack = pbBidResponseByPlacement[adUnitCode].bidsReceivedCount;
			//all bids back for ad unit
			if(bidsBack === adUnit.bids.length){
				triggerAdUnitCallbacks(adUnitCode);

			}
		}
	}
}

exports.setBidderMap = function(bidderMap){
	biddersByPlacementMap = bidderMap;
};

/*
 *   This method checks if all bids have a response (bid, no bid, timeout) and will execute callback method if all bids are in
 *   TODO: Need to track bids by placement as well
 */

exports.checkIfAllBidsAreIn = function(adUnitCode) {

	_allBidsAvailable = checkAllBidsResponseReceived();

	//check by ad units
	checkBidsBackByAdUnit(adUnitCode);


	if (_allBidsAvailable) {
		//execute our calback method if it exists && pbjs.initAdserverSet !== true
		this.executeCallback();
	}
};

// check all bids response received by bidder
function checkAllBidsResponseReceived(){
	var available = true;
	
	utils._each(bidResponseReceivedCount,function(count,bidderCode){
		if(count<1){
			available = false;
		}
	});

	return available;
}

/**
 * Add a one time callback, that is discarded after it is called
 * @param {Function} callback [description]
 */
exports.addOneTimeCallback = function(callback){
	externalOneTimeCallback = callback;
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

},{"./adaptermanager":1,"./constants.json":14,"./utils.js":16}],14:[function(require,module,exports){
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
	},
	"CB" : {
		"TYPE" : {
			"ALL_BIDS_BACK" : "allRequestedBidsBack",
			"AD_UNIT_BIDS_BACK" : "adUnitBidsBack"
		}
	},
	"objectType_function" : "function",
	"objectType_undefined" : "undefined",
	"objectType_object" : "object",
	"objectType_string" : "string",
	"objectType_number" : "number"
}

},{}],15:[function(require,module,exports){
/** @module pbjs */
// if pbjs already exists in global dodcument scope, use it, if not, create the object
window.pbjs = (window.pbjs || {});
window.pbjs.que = window.pbjs.que || [];
var pbjs = window.pbjs;
var CONSTANTS = require('./constants.json');
var utils = require('./utils.js');
var bidmanager = require('./bidmanager.js');
var adaptermanager = require('./adaptermanager');
var bidfactory = require('./bidfactory');
var adloader = require('./adloader');

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
					pb_placements.push(pbjs.adUnits[i]);
				}
			}
		}
		loadPreBidders();
		sortAndCallBids();
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


function setGPTAsyncTargeting(code, slot) {
	//get the targeting that is already configured
	var keyStrings = getTargetingfromGPTIdentifier(slot);
	slot.clearTargeting();
	for (var key in keyStrings) {
		if (keyStrings.hasOwnProperty(key)) {
			try {
				utils.logMessage('Attempting to set key value for slot: ' + slot.getSlotElementId() + ' key: ' + key + ' value: ' + encodeURIComponent(keyStrings[key]));
				slot.setTargeting(key, encodeURIComponent(keyStrings[key]));

			} catch (e) {
				utils.logMessage('Problem setting key value pairs in slot: ' + e.message);
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
		return returnObj;
	} 
	else {
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
	if (bidArray && bidArray[0] && bidArray[0].adUnitCode) {
		// init the pb_targetingMap for the adUnitCode
		adUnitCode = bidArray[0] && bidArray[0].adUnitCode;
		pb_targetingMap[adUnitCode] = {};
		for (var i = 0; i < bidArray.length; i++) {
			var bid = bidArray[i];
			//clone by json parse. This also gets rid of unwanted function properties
			bidClone = getCloneBid(bid);

			if (bid.alwaysUseBid && bidClone.adserverTargeting) { // add the bid if alwaysUse and bid has returned
				// push key into targeting
				pb_targetingMap[bidClone.adUnitCode] = utils.extend(pb_targetingMap[bidClone.adUnitCode], bidClone.adserverTargeting);
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
		pb_targetingMap[adUnitCode] = utils.extend(pb_targetingMap[adUnitCode], keyValues);
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
	pb_placements = [];
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
	if(adunitCode){
		var res = pbjs.getAdserverTargetingForAdUnitCode(adunitCode);
		return utils.transformAdServerTargetingObj(res);
	}
	else{
		utils.logMessage('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode');
	}
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
	if (!window.googletag || !utils.isFn(window.googletag.pubads) || !utils.isFn(window.googletag.pubads().getSlots)) {
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

				if (slots[k].getSlotElementId() === code || slots[k].getAdUnitPath() === code) {
					placementBids = getBidResponsesByAdUnit(code);
					setGPTAsyncTargeting(code, slots[k]);
				}
			}
		}
	} else {
		//get all the slots from google tag
		var slots = window.googletag.pubads().getSlots();
		for (i = 0; i < slots.length; i++) {
			var adUnitCode = slots[i].getSlotElementId();
			if (adUnitCode) {
				//placementBids = getBidsFromGTPIdentifier(slots[i]);
				setGPTAsyncTargeting(adUnitCode, slots[i]);
			}
		}
	}

};
/**
 * Returns a string identifier (either DivId or adUnitPath)
 * @param  {[type]} slot [description]
 * @return {[type]}      [description]
 */
function getTargetingfromGPTIdentifier(slot){
	var targeting = null;
	if(slot){
		//first get by elementId
		targeting =  pbjs.getAdserverTargetingForAdUnitCode(slot.getSlotElementId());
		//if not available, try by adUnitPath
		if(!targeting){
			targeting = pbjs.getAdserverTargetingForAdUnitCode(slot.getAdUnitPath());
		}
	}
	return targeting;
}

/**


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
				pbjs.adUnits.splice(i, 1);
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

/**
 * Wrapper to register bidderAdapter externally (adaptermanager.registerBidAdapter())
 * @param  {[type]} bidderAdaptor [description]
 * @param  {[type]} bidderCode    [description]
 * @return {[type]}               [description]
 */
pbjs.registerBidAdapter = function(bidderAdaptor, bidderCode){
	try{
		adaptermanager.registerBidAdapter(bidderAdaptor(), bidderCode);
	}
	catch(e){
		utils.logError('Error registering bidder adapter : ' + e.message);
	}
};

/**
 *
 */
 pbjs.bidsAvailableForAdapter = function(bidderCode){

	//TODO getAd
	var bids = pb_bidderMap[bidderCode].bids;

	for (var i = 0; i < bids.length; i++) {
		var adunitCode = bids[i].placementCode;
		var responseObj = bidmanager.pbBidResponseByPlacement[adunitCode];

		var bid = bidfactory.createBid(1);
		// bid.creative_id = adId;
		bid.bidderCode = bidderCode;
		bid.adUnitCode = adunitCode;
		bid.bidder = bidderCode;
		// bid.cpm = responseCPM;
		// bid.adUrl = jptResponseObj.result.ad;
		// bid.width = jptResponseObj.result.width;
		// bid.height = jptResponseObj.result.height;
		// bid.dealId = jptResponseObj.result.deal_id;

		responseObj.bids.push(bid);
		responseObj.bidsReceivedCount++;
		bidmanager.pbBidResponseByPlacement[adunitCode] = responseObj;
	};

	bidmanager.increaseBidResponseReceivedCount(bidderCode);
}

/**
 * Wrapper to bidfactory.createBid()
 * @param  {[type]} statusCode [description]
 * @return {[type]}            [description]
 */
pbjs.createBid = function(statusCode){
	return bidfactory.createBid(statusCode);
};

/**
 * Wrapper to bidmanager.addBidResponse
 * @param {[type]} adUnitCode [description]
 * @param {[type]} bid        [description]
 */
pbjs.addBidResponse = function(adUnitCode, bid){
	bidmanager.addBidResponse(adUnitCode, bid);
};

/**
 * Wrapper to adloader.loadScript
 * @param  {[type]}   tagSrc   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
pbjs.loadScript = function(tagSrc, callback){
	adloader.loadScript(tagSrc, callback);
};

processQue();


//only for test
pbjs_testonly = {};

pbjs_testonly.getAdUnits = function() {
    return pbjs.adUnits;
};
},{"./adaptermanager":1,"./adloader":11,"./bidfactory":12,"./bidmanager.js":13,"./constants.json":14,"./utils.js":16}],16:[function(require,module,exports){
var CONSTANTS = require('./constants.json');
var objectType_function = 'function';
var objectType_undefined = 'undefined';
var objectType_object = 'object';
var objectType_string = 'string';
var objectType_number = 'number';

var _loggingChecked = false;

var _lgPriceCap = 5.00;
var _mgPriceCap = 20.00;
var _hgPriceCap = 20.00;

var t_Arr = 'Array',
    t_Str = 'String',
    t_Fn = 'Function',
    toString = Object.prototype.toString,
    hasOwnProperty = Object.prototype.hasOwnProperty,
    slice = Array.prototype.slice;

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
  this._each(map, function (value, key) {
    value = (value === undefined) ? '' : value;

    var keyString = token + key.toUpperCase() + token,
        re = new RegExp(keyString, 'g');

    str = str.replace(re, value);
  });
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


//parse a query string object passed in bid params
//bid params should be an object such as {key: "value", key1 : "value1"}
exports.parseQueryStringParameters = function(queryObj) {
	var result = "";
	for (var k in queryObj){
		if (queryObj.hasOwnProperty(k))
			result += k + "=" + encodeURIComponent(queryObj[k]) + "&";
	}
	return result;
};


//transform an AdServer targeting bids into a query string to send to the adserver
//bid params should be an object such as {key: "value", key1 : "value1"}
exports.transformAdServerTargetingObj = function(adServerTargeting) {
	var result = "";
	if (!adServerTargeting)
		return "";
	for (var k in adServerTargeting)
		if (adServerTargeting.hasOwnProperty(k))
			result += k + "=" + encodeURIComponent(adServerTargeting[k]) + "&";
	return result;
};

//Copy all of the properties in the source objects over to the target object
//return the target object.
exports.extend = function(target, source){
	target = target || {};

	this._each(source,function(value,prop){    
		if (typeof source[prop] === objectType_object) {
			target[prop] = extend(target[prop], source[prop]);
		} else {
			target[prop] = source[prop];
		}
	});
	return target;
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
				parsedSizes.push(this.parseGPTSingleSizeArray(sizeObj));
			} else {
				//otherwise, we must be a MultiSize array
				for (var i = 0; i < sizeArrayLength; i++) {
					parsedSizes.push(this.parseGPTSingleSizeArray(sizeObj[i]));
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
exports.parseGPTSingleSizeArray = function(singleSize) {
	//if we aren't exactly 2 items in this array, it is invalid
  if (this.isArray(singleSize) && singleSize.length === 2 && (!isNaN(singleSize[0]) && !isNaN(singleSize[1]))) {
		return singleSize[0] + 'x' + singleSize[1];
	}
};

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

function hasConsoleLogger() {
	return (window.console && window.console.log);
}
exports.hasConsoleLogger = hasConsoleLogger;

var errLogFn = (function (hasLogger) {
  if (!hasLogger) return '';
  return window.console.error ? 'error' : 'log';
}(hasConsoleLogger()));

var debugTurnedOn = function() {
	if (pbjs.logging === false && _loggingChecked === false) {
		pbjs.logging = getParameterByName(CONSTANTS.DEBUG_MODE).toUpperCase() === 'TRUE';
		_loggingChecked = true;
	}

	if (pbjs.logging) {
		return true;
	}
	return false;

};
exports.debugTurnedOn = debugTurnedOn;

exports.logError = function(msg, code, exception) {
	var errCode = code || 'ERROR';
	if (debugTurnedOn() && hasConsoleLogger()) {
    console[errLogFn].call(console, errCode + ': ' + msg, exception || '');
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
			if (cpmFloat > _lgPriceCap) {
				returnObj.low = _lgPriceCap.toFixed(2);
			} else {
				returnObj.low = (Math.floor(cpm * 2) / 2).toFixed(2);
			}

			//round to closet .1
			if (cpmFloat > _mgPriceCap) {
				returnObj.med = _mgPriceCap.toFixed(2);
			} else {
				returnObj.med = (Math.floor(cpm * 10) / 10).toFixed(2);
			}

			//round to closet .01
			if (cpmFloat > _hgPriceCap) {
				returnObj.high = _hgPriceCap.toFixed(2);
			} else {
				returnObj.high = (Math.floor(cpm * 100) / 100).toFixed(2);
			}

		}

	} catch (e) {
		this.logError('Exception parsing CPM :' + e.message);
	}
	return returnObj;

};

/**
 * This function validates paramaters.
 * @param  {object[string]} paramObj          [description]
 * @param  {string[]} requiredParamsArr [description]
 * @return {bool}                   Bool if paramaters are valid
 */
exports.hasValidBidRequest = function(paramObj, requiredParamsArr, adapter){

	for(var i = 0; i < requiredParamsArr.length; i++){
		var found = false;

    this._each(paramObj, function (value, key) {
      if (key === requiredParamsArr[i]) {
        found = true;
      }
    });

		if(!found){
			this.logError('Params are missing for bid request. One of these required paramaters are missing: ' + requiredParamsArr, adapter);
			return false;
		}
	}

	return true;
};

// Handle addEventListener gracefully in older browsers
exports.addEventHandler = function(element, event, func) {
		if (element.addEventListener) {
			element.addEventListener(event, func, true);
		} else if (element.attachEvent) {
			element.attachEvent('on' + event, func);
		}
	};
  /**
   * Return if the object is of the
   * given type.
   * @param {*} object to test
   * @param {String} _t type string (e.g., Array)
   * @return {Boolean} if object is of type _t
   */
exports.isA = function(object, _t) {
    return toString.call(object) === '[object ' + _t + ']';
};

exports.isFn = function (object) {
  return this.isA(object, t_Fn);
};

exports.isStr = function (object) {
  return this.isA(object, t_Str);
};

exports.isArray = function (object) {
  return this.isA(object, t_Arr);
};

/**
 * Return if the object is "empty";
 * this includes falsey, no keys, or no items at indices
 * @param {*} object object to test
 * @return {Boolean} if object is empty
 */
exports.isEmpty = function(object) {
    if (!object) return true;
    if (this.isArray(object) || this.isStr(object)) return !(object.length > 0);
    for (var k in object) {
      if (hasOwnProperty.call(object, k)) return false;
    }
    return true;
  };

  /**
   * Iterate object with the function
   * falls back to es5 `forEach`
   * @param {Array|Object} object
   * @param {Function(value, key, object)} fn
   */
exports._each = function(object, fn) {
    if (this.isEmpty(object)) return;
    if (this.isFn(object.forEach)) return object.forEach(fn);

    var k = 0,
        l = object.length;

    if (l > 0) {
      for (; k < l; k++) fn(object[k], k, object);
    } else {
      for (k in object) {
        if (hasOwnProperty.call(object, k)) fn(object[k], k, object);
      }
    }
  };

},{"./constants.json":14}]},{},[15])