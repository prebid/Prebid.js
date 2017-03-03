/* prebid.js v0.21.0-pre
Updated : 2017-03-03 */
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /** @module pbjs */

	var _prebidGlobal = __webpack_require__(1);

	var _utils = __webpack_require__(2);

	var _video = __webpack_require__(4);

	__webpack_require__(70);

	var _url = __webpack_require__(22);

	var _cpmBucketManager = __webpack_require__(12);

	var _secureCreatives = __webpack_require__(99);

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	var pbjs = (0, _prebidGlobal.getGlobal)();
	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var bidmanager = __webpack_require__(11);
	var adaptermanager = __webpack_require__(5);
	var bidfactory = __webpack_require__(10);
	var adloader = __webpack_require__(13);
	var events = __webpack_require__(8);
	var adserver = __webpack_require__(100);
	var targeting = __webpack_require__(101);

	/* private variables */

	var objectType_function = 'function';
	var objectType_undefined = 'undefined';
	var objectType_object = 'object';
	var BID_WON = CONSTANTS.EVENTS.BID_WON;
	var SET_TARGETING = CONSTANTS.EVENTS.SET_TARGETING;

	var auctionRunning = false;
	var bidRequestQueue = [];

	var eventValidators = {
	  bidWon: checkDefinedPlacement
	};

	/* Public vars */

	pbjs._bidsRequested = [];
	pbjs._bidsReceived = [];
	// _adUnitCodes stores the current filter to use for adUnits as an array of adUnitCodes
	pbjs._adUnitCodes = [];
	pbjs._winningBids = [];
	pbjs._adsReceived = [];
	pbjs._sendAllBids = false;

	pbjs.bidderSettings = pbjs.bidderSettings || {};

	//default timeout for all bids
	pbjs.bidderTimeout = pbjs.bidderTimeout || 3000;

	// current timeout set in `requestBids` or to default `bidderTimeout`
	pbjs.cbTimeout = pbjs.cbTimeout || 200;

	// timeout buffer to adjust for bidder CDN latency
	pbjs.timeoutBuffer = 200;

	pbjs.logging = pbjs.logging || false;

	// domain where prebid is running for cross domain iframe communication
	pbjs.publisherDomain = pbjs.publisherDomain || window.location.origin;

	//let the world know we are loaded
	pbjs.libLoaded = true;

	//version auto generated from build
	pbjs.version = 'v0.21.0-pre';
	utils.logInfo('Prebid.js v0.21.0-pre loaded');

	//create adUnit array
	pbjs.adUnits = pbjs.adUnits || [];

	/**
	 * Command queue that functions will execute once prebid.js is loaded
	 * @param  {function} cmd Annoymous function to execute
	 * @alias module:pbjs.que.push
	 */
	pbjs.que.push = function (cmd) {
	  if ((typeof cmd === 'undefined' ? 'undefined' : _typeof(cmd)) === objectType_function) {
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
	    if (_typeof(pbjs.que[i].called) === objectType_undefined) {
	      try {
	        pbjs.que[i].call();
	        pbjs.que[i].called = true;
	      } catch (e) {
	        utils.logError('Error processing command :', 'prebid.js', e);
	      }
	    }
	  }
	}

	function checkDefinedPlacement(id) {
	  var placementCodes = pbjs._bidsRequested.map((function (bidSet) {
	    return bidSet.bids.map((function (bid) {
	      return bid.placementCode;
	    }));
	  })).reduce(_utils.flatten).filter(_utils.uniques);

	  if (!utils.contains(placementCodes, id)) {
	    utils.logError('The "' + id + '" placement is not defined.');
	    return;
	  }

	  return true;
	}

	/**
	 * When a request for bids is made any stale bids remaining will be cleared for
	 * a placement included in the outgoing bid request.
	 */
	function clearPlacements() {
	  pbjs._bidsRequested = [];

	  // leave bids received for ad slots not in this bid request
	  pbjs._bidsReceived = pbjs._bidsReceived.filter((function (bid) {
	    return !pbjs._adUnitCodes.includes(bid.adUnitCode);
	  }));
	}

	function setRenderSize(doc, width, height) {
	  if (doc.defaultView && doc.defaultView.frameElement) {
	    doc.defaultView.frameElement.width = width;
	    doc.defaultView.frameElement.height = height;
	  }
	}

	//////////////////////////////////
	//                              //
	//    Start Public APIs         //
	//                              //
	//////////////////////////////////

	/**
	 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
	 * @param  {string} [adunitCode] adUnitCode to get the bid responses for
	 * @alias module:pbjs.getAdserverTargetingForAdUnitCodeStr
	 * @return {array}  returnObj return bids array
	 */
	pbjs.getAdserverTargetingForAdUnitCodeStr = function (adunitCode) {
	  utils.logInfo('Invoking pbjs.getAdserverTargetingForAdUnitCodeStr', arguments);

	  // call to retrieve bids array
	  if (adunitCode) {
	    var res = pbjs.getAdserverTargetingForAdUnitCode(adunitCode);
	    return utils.transformAdServerTargetingObj(res);
	  } else {
	    utils.logMessage('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode');
	  }
	};

	/**
	 * This function returns the query string targeting parameters available at this moment for a given ad unit. Note that some bidder's response may not have been received if you call this function too quickly after the requests are sent.
	 * @param adUnitCode {string} adUnitCode to get the bid responses for
	 * @returns {object}  returnObj return bids
	 */
	pbjs.getAdserverTargetingForAdUnitCode = function (adUnitCode) {
	  return pbjs.getAdserverTargeting(adUnitCode)[adUnitCode];
	};

	/**
	 * returns all ad server targeting for all ad units
	 * @return {object} Map of adUnitCodes and targeting values []
	 * @alias module:pbjs.getAdserverTargeting
	 */

	pbjs.getAdserverTargeting = function (adUnitCode) {
	  utils.logInfo('Invoking pbjs.getAdserverTargeting', arguments);
	  return targeting.getAllTargeting(adUnitCode).map((function (targeting) {
	    return _defineProperty({}, Object.keys(targeting)[0], targeting[Object.keys(targeting)[0]].map((function (target) {
	      return _defineProperty({}, Object.keys(target)[0], target[Object.keys(target)[0]].join(', '));
	    })).reduce((function (p, c) {
	      return _extends(c, p);
	    }), {}));
	  })).reduce((function (accumulator, targeting) {
	    var key = Object.keys(targeting)[0];
	    accumulator[key] = _extends({}, accumulator[key], targeting[key]);
	    return accumulator;
	  }), {});
	};

	/**
	 * This function returns the bid responses at the given moment.
	 * @alias module:pbjs.getBidResponses
	 * @return {object}            map | object that contains the bidResponses
	 */

	pbjs.getBidResponses = function () {
	  utils.logInfo('Invoking pbjs.getBidResponses', arguments);
	  var responses = pbjs._bidsReceived.filter(_utils.adUnitsFilter.bind(this, pbjs._adUnitCodes));

	  // find the last requested id to get responses for most recent auction only
	  var currentRequestId = responses && responses.length && responses[responses.length - 1].requestId;

	  return responses.map((function (bid) {
	    return bid.adUnitCode;
	  })).filter(_utils.uniques).map((function (adUnitCode) {
	    return responses.filter((function (bid) {
	      return bid.requestId === currentRequestId && bid.adUnitCode === adUnitCode;
	    }));
	  })).filter((function (bids) {
	    return bids && bids[0] && bids[0].adUnitCode;
	  })).map((function (bids) {
	    return _defineProperty({}, bids[0].adUnitCode, { bids: bids });
	  })).reduce((function (a, b) {
	    return _extends(a, b);
	  }), {});
	};

	/**
	 * Returns bidResponses for the specified adUnitCode
	 * @param  {String} adUnitCode adUnitCode
	 * @alias module:pbjs.getBidResponsesForAdUnitCode
	 * @return {Object}            bidResponse object
	 */

	pbjs.getBidResponsesForAdUnitCode = function (adUnitCode) {
	  var bids = pbjs._bidsReceived.filter((function (bid) {
	    return bid.adUnitCode === adUnitCode;
	  }));
	  return {
	    bids: bids
	  };
	};

	/**
	 * Set query string targeting on all GPT ad units.
	 * @alias module:pbjs.setTargetingForGPTAsync
	 */
	pbjs.setTargetingForGPTAsync = function () {
	  utils.logInfo('Invoking pbjs.setTargetingForGPTAsync', arguments);
	  if (!(0, _utils.isGptPubadsDefined)()) {
	    utils.logError('window.googletag is not defined on the page');
	    return;
	  }

	  //first reset any old targeting
	  targeting.resetPresetTargeting();

	  //now set new targeting keys
	  targeting.setTargeting(targeting.getAllTargeting());

	  //emit event 
	  events.emit(SET_TARGETING);
	};

	pbjs.setTargetingForAst = function () {
	  utils.logInfo('Invoking pbjs.setTargetingForAn', arguments);
	  if (!targeting.isApntagDefined()) {
	    utils.logError('window.apntag is not defined on the page');
	    return;
	  }

	  targeting.setTargetingForAst();

	  //emit event 
	  events.emit(SET_TARGETING);
	};

	/**
	 * Returns a bool if all the bids have returned or timed out
	 * @alias module:pbjs.allBidsAvailable
	 * @return {bool} all bids available
	 */
	pbjs.allBidsAvailable = function () {
	  utils.logInfo('Invoking pbjs.allBidsAvailable', arguments);
	  return bidmanager.bidsBackAll();
	};

	/**
	 * This function will render the ad (based on params) in the given iframe document passed through. Note that doc SHOULD NOT be the parent document page as we can't doc.write() asynchrounsly
	 * @param  {object} doc document
	 * @param  {string} id bid id to locate the ad
	 * @alias module:pbjs.renderAd
	 */
	pbjs.renderAd = function (doc, id) {
	  utils.logInfo('Invoking pbjs.renderAd', arguments);
	  utils.logMessage('Calling renderAd with adId :' + id);
	  if (doc && id) {
	    try {
	      //lookup ad by ad Id
	      var adObject = pbjs._bidsReceived.find((function (bid) {
	        return bid.adId === id;
	      }));
	      if (adObject) {
	        //save winning bids
	        pbjs._winningBids.push(adObject);
	        //emit 'bid won' event here
	        events.emit(BID_WON, adObject);

	        var height = adObject.height;
	        var width = adObject.width;
	        var url = adObject.adUrl;
	        var ad = adObject.ad;

	        if (doc === document || adObject.mediaType === 'video') {
	          utils.logError('Error trying to write ad. Ad render call ad id ' + id + ' was prevented from writing to the main document.');
	        } else if (ad) {
	          doc.write(ad);
	          doc.close();
	          setRenderSize(doc, width, height);
	        } else if (url) {
	          doc.write('<IFRAME SRC="' + url + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" WIDTH="' + width + '" HEIGHT="' + height + '"></IFRAME>');
	          doc.close();
	          setRenderSize(doc, width, height);
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

	/**
	 * Remove adUnit from the pbjs configuration
	 * @param  {String} adUnitCode the adUnitCode to remove
	 * @alias module:pbjs.removeAdUnit
	 */
	pbjs.removeAdUnit = function (adUnitCode) {
	  utils.logInfo('Invoking pbjs.removeAdUnit', arguments);
	  if (adUnitCode) {
	    for (var i = 0; i < pbjs.adUnits.length; i++) {
	      if (pbjs.adUnits[i].code === adUnitCode) {
	        pbjs.adUnits.splice(i, 1);
	      }
	    }
	  }
	};

	pbjs.clearAuction = function () {
	  auctionRunning = false;
	  utils.logMessage('Prebid auction cleared');
	  if (bidRequestQueue.length) {
	    bidRequestQueue.shift()();
	  }
	};

	/**
	 *
	 * @param bidsBackHandler
	 * @param timeout
	 * @param adUnits
	 * @param adUnitCodes
	 */
	pbjs.requestBids = function (_ref4) {
	  var bidsBackHandler = _ref4.bidsBackHandler,
	      timeout = _ref4.timeout,
	      adUnits = _ref4.adUnits,
	      adUnitCodes = _ref4.adUnitCodes;

	  events.emit('requestBids');
	  var cbTimeout = pbjs.cbTimeout = timeout || pbjs.bidderTimeout;
	  adUnits = adUnits || pbjs.adUnits;

	  utils.logInfo('Invoking pbjs.requestBids', arguments);

	  if (adUnitCodes && adUnitCodes.length) {
	    // if specific adUnitCodes supplied filter adUnits for those codes
	    adUnits = adUnits.filter((function (unit) {
	      return adUnitCodes.includes(unit.code);
	    }));
	  } else {
	    // otherwise derive adUnitCodes from adUnits
	    adUnitCodes = adUnits && adUnits.map((function (unit) {
	      return unit.code;
	    }));
	  }

	  // for video-enabled adUnits, only request bids if all bidders support video
	  var invalidVideoAdUnits = adUnits.filter(_video.videoAdUnit).filter(_video.hasNonVideoBidder);
	  invalidVideoAdUnits.forEach((function (adUnit) {
	    utils.logError('adUnit ' + adUnit.code + ' has \'mediaType\' set to \'video\' but contains a bidder that doesn\'t support video. No Prebid demand requests will be triggered for this adUnit.');
	    for (var i = 0; i < adUnits.length; i++) {
	      if (adUnits[i].code === adUnit.code) {
	        adUnits.splice(i, 1);
	      }
	    }
	  }));

	  if (auctionRunning) {
	    bidRequestQueue.push((function () {
	      pbjs.requestBids({ bidsBackHandler: bidsBackHandler, timeout: cbTimeout, adUnits: adUnits, adUnitCodes: adUnitCodes });
	    }));
	    return;
	  }

	  auctionRunning = true;

	  // we will use adUnitCodes for filtering the current auction
	  pbjs._adUnitCodes = adUnitCodes;

	  bidmanager.externalCallbackReset();
	  clearPlacements();

	  if (!adUnits || adUnits.length === 0) {
	    utils.logMessage('No adUnits configured. No bids requested.');
	    if ((typeof bidsBackHandler === 'undefined' ? 'undefined' : _typeof(bidsBackHandler)) === objectType_function) {
	      bidmanager.addOneTimeCallback(bidsBackHandler, false);
	    }
	    bidmanager.executeCallback();
	    return;
	  }

	  //set timeout for all bids
	  var timedOut = true;
	  var timeoutCallback = bidmanager.executeCallback.bind(bidmanager, timedOut);
	  var timer = setTimeout(timeoutCallback, cbTimeout);
	  if ((typeof bidsBackHandler === 'undefined' ? 'undefined' : _typeof(bidsBackHandler)) === objectType_function) {
	    bidmanager.addOneTimeCallback(bidsBackHandler, timer);
	  }

	  adaptermanager.callBids({ adUnits: adUnits, adUnitCodes: adUnitCodes, cbTimeout: cbTimeout });
	  if (pbjs._bidsRequested.length === 0) {
	    bidmanager.executeCallback();
	  }
	};

	/**
	 *
	 * Add adunit(s)
	 * @param {Array|String} adUnitArr Array of adUnits or single adUnit Object.
	 * @alias module:pbjs.addAdUnits
	 */
	pbjs.addAdUnits = function (adUnitArr) {
	  utils.logInfo('Invoking pbjs.addAdUnits', arguments);
	  if (utils.isArray(adUnitArr)) {
	    //append array to existing
	    pbjs.adUnits.push.apply(pbjs.adUnits, adUnitArr);
	  } else if ((typeof adUnitArr === 'undefined' ? 'undefined' : _typeof(adUnitArr)) === objectType_object) {
	    pbjs.adUnits.push(adUnitArr);
	  }
	};

	/**
	 * @param {String} event the name of the event
	 * @param {Function} handler a callback to set on event
	 * @param {String} id an identifier in the context of the event
	 *
	 * This API call allows you to register a callback to handle a Prebid.js event.
	 * An optional `id` parameter provides more finely-grained event callback registration.
	 * This makes it possible to register callback events for a specific item in the
	 * event context. For example, `bidWon` events will accept an `id` for ad unit code.
	 * `bidWon` callbacks registered with an ad unit code id will be called when a bid
	 * for that ad unit code wins the auction. Without an `id` this method registers the
	 * callback for every `bidWon` event.
	 *
	 * Currently `bidWon` is the only event that accepts an `id` parameter.
	 */
	pbjs.onEvent = function (event, handler, id) {
	  utils.logInfo('Invoking pbjs.onEvent', arguments);
	  if (!utils.isFn(handler)) {
	    utils.logError('The event handler provided is not a function and was not set on event "' + event + '".');
	    return;
	  }

	  if (id && !eventValidators[event].call(null, id)) {
	    utils.logError('The id provided is not valid for event "' + event + '" and no handler was set.');
	    return;
	  }

	  events.on(event, handler, id);
	};

	/**
	 * @param {String} event the name of the event
	 * @param {Function} handler a callback to remove from the event
	 * @param {String} id an identifier in the context of the event (see `pbjs.onEvent`)
	 */
	pbjs.offEvent = function (event, handler, id) {
	  utils.logInfo('Invoking pbjs.offEvent', arguments);
	  if (id && !eventValidators[event].call(null, id)) {
	    return;
	  }

	  events.off(event, handler, id);
	};

	/**
	 * Add a callback event
	 * @param {String} eventStr event to attach callback to Options: "allRequestedBidsBack" | "adUnitBidsBack"
	 * @param {Function} func  function to execute. Paramaters passed into the function: (bidResObj), [adUnitCode]);
	 * @alias module:pbjs.addCallback
	 * @returns {String} id for callback
	 */
	pbjs.addCallback = function (eventStr, func) {
	  utils.logInfo('Invoking pbjs.addCallback', arguments);
	  var id = null;
	  if (!eventStr || !func || (typeof func === 'undefined' ? 'undefined' : _typeof(func)) !== objectType_function) {
	    utils.logError('error registering callback. Check method signature');
	    return id;
	  }

	  id = utils.getUniqueIdentifierStr;
	  bidmanager.addCallback(id, func, eventStr);
	  return id;
	};

	/**
	 * Remove a callback event
	 * //@param {string} cbId id of the callback to remove
	 * @alias module:pbjs.removeCallback
	 * @returns {String} id for callback
	 */
	pbjs.removeCallback = function () /* cbId */{
	  //todo
	  return null;
	};

	/**
	 * Wrapper to register bidderAdapter externally (adaptermanager.registerBidAdapter())
	 * @param  {[type]} bidderAdaptor [description]
	 * @param  {[type]} bidderCode    [description]
	 * @return {[type]}               [description]
	 */
	pbjs.registerBidAdapter = function (bidderAdaptor, bidderCode) {
	  utils.logInfo('Invoking pbjs.registerBidAdapter', arguments);
	  try {
	    adaptermanager.registerBidAdapter(bidderAdaptor(), bidderCode);
	  } catch (e) {
	    utils.logError('Error registering bidder adapter : ' + e.message);
	  }
	};

	/**
	 * Wrapper to register analyticsAdapter externally (adaptermanager.registerAnalyticsAdapter())
	 * @param  {[type]} options [description]
	 */
	pbjs.registerAnalyticsAdapter = function (options) {
	  utils.logInfo('Invoking pbjs.registerAnalyticsAdapter', arguments);
	  try {
	    adaptermanager.registerAnalyticsAdapter(options);
	  } catch (e) {
	    utils.logError('Error registering analytics adapter : ' + e.message);
	  }
	};

	pbjs.bidsAvailableForAdapter = function (bidderCode) {
	  utils.logInfo('Invoking pbjs.bidsAvailableForAdapter', arguments);

	  pbjs._bidsRequested.find((function (bidderRequest) {
	    return bidderRequest.bidderCode === bidderCode;
	  })).bids.map((function (bid) {
	    return _extends(bid, bidfactory.createBid(1), {
	      bidderCode: bidderCode,
	      adUnitCode: bid.placementCode
	    });
	  })).map((function (bid) {
	    return pbjs._bidsReceived.push(bid);
	  }));
	};

	/**
	 * Wrapper to bidfactory.createBid()
	 * @param  {[type]} statusCode [description]
	 * @return {[type]}            [description]
	 */
	pbjs.createBid = function (statusCode) {
	  utils.logInfo('Invoking pbjs.createBid', arguments);
	  return bidfactory.createBid(statusCode);
	};

	/**
	 * Wrapper to bidmanager.addBidResponse
	 * @param {[type]} adUnitCode [description]
	 * @param {[type]} bid        [description]
	 */
	pbjs.addBidResponse = function (adUnitCode, bid) {
	  utils.logInfo('Invoking pbjs.addBidResponse', arguments);
	  bidmanager.addBidResponse(adUnitCode, bid);
	};

	/**
	 * Wrapper to adloader.loadScript
	 * @param  {[type]}   tagSrc   [description]
	 * @param  {Function} callback [description]
	 * @return {[type]}            [description]
	 */
	pbjs.loadScript = function (tagSrc, callback, useCache) {
	  utils.logInfo('Invoking pbjs.loadScript', arguments);
	  adloader.loadScript(tagSrc, callback, useCache);
	};

	/**
	 * Will enable sendinga prebid.js to data provider specified
	 * @param  {object} config object {provider : 'string', options : {}}
	 */
	pbjs.enableAnalytics = function (config) {
	  if (config && !utils.isEmpty(config)) {
	    utils.logInfo('Invoking pbjs.enableAnalytics for: ', config);
	    adaptermanager.enableAnalytics(config);
	  } else {
	    utils.logError('pbjs.enableAnalytics should be called with option {}');
	  }
	};

	pbjs.aliasBidder = function (bidderCode, alias) {
	  utils.logInfo('Invoking pbjs.aliasBidder', arguments);
	  if (bidderCode && alias) {
	    adaptermanager.aliasBidAdapter(bidderCode, alias);
	  } else {
	    utils.logError('bidderCode and alias must be passed as arguments', 'pbjs.aliasBidder');
	  }
	};

	/**
	 * Sets a default price granularity scheme.
	 * @param {String|Object} granularity - the granularity scheme.
	 * "low": $0.50 increments, capped at $5 CPM
	 * "medium": $0.10 increments, capped at $20 CPM (the default)
	 * "high": $0.01 increments, capped at $20 CPM
	 * "auto": Applies a sliding scale to determine granularity
	 * "dense": Like "auto", but the bid price granularity uses smaller increments, especially at lower CPMs
	 *
	 * Alternatively a custom object can be specified:
	 * { "buckets" : [{"min" : 0,"max" : 20,"increment" : 0.1,"cap" : true}]};
	 * See http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.setPriceGranularity for more details
	 */
	pbjs.setPriceGranularity = function (granularity) {
	  utils.logInfo('Invoking pbjs.setPriceGranularity', arguments);
	  if (!granularity) {
	    utils.logError('Prebid Error: no value passed to `setPriceGranularity()`');
	    return;
	  }
	  if (typeof granularity === 'string') {
	    bidmanager.setPriceGranularity(granularity);
	  } else if ((typeof granularity === 'undefined' ? 'undefined' : _typeof(granularity)) === 'object') {
	    if (!(0, _cpmBucketManager.isValidePriceConfig)(granularity)) {
	      utils.logError('Invalid custom price value passed to `setPriceGranularity()`');
	      return;
	    }
	    bidmanager.setCustomPriceBucket(granularity);
	    bidmanager.setPriceGranularity(CONSTANTS.GRANULARITY_OPTIONS.CUSTOM);
	    utils.logMessage('Using custom price granularity');
	  }
	};

	pbjs.enableSendAllBids = function () {
	  pbjs._sendAllBids = true;
	};

	pbjs.getAllWinningBids = function () {
	  return pbjs._winningBids;
	};

	/**
	 * Build master video tag from publishers adserver tag
	 * @param {string} adserverTag default url
	 * @param {object} options options for video tag
	 */
	pbjs.buildMasterVideoTagFromAdserverTag = function (adserverTag, options) {
	  utils.logInfo('Invoking pbjs.buildMasterVideoTagFromAdserverTag', arguments);
	  var urlComponents = (0, _url.parse)(adserverTag);

	  //return original adserverTag if no bids received
	  if (pbjs._bidsReceived.length === 0) {
	    return adserverTag;
	  }

	  var masterTag = '';
	  if (options.adserver.toLowerCase() === 'dfp') {
	    var dfpAdserverObj = adserver.dfpAdserver(options, urlComponents);
	    if (!dfpAdserverObj.verifyAdserverTag()) {
	      utils.logError('Invalid adserverTag, required google params are missing in query string');
	    }
	    dfpAdserverObj.appendQueryParams();
	    masterTag = (0, _url.format)(dfpAdserverObj.urlComponents);
	  } else {
	    utils.logError('Only DFP adserver is supported');
	    return;
	  }
	  return masterTag;
	};

	/**
	 * Set the order bidders are called in. If not set, the bidders are called in
	 * the order they are defined wihin the adUnit.bids array
	 * @param {string} order - Order to call bidders in. Currently the only possible value
	 * is 'random', which randomly shuffles the order
	 */
	pbjs.setBidderSequence = function (order) {
	  if (order === CONSTANTS.ORDER.RANDOM) {
	    adaptermanager.setBidderSequence(CONSTANTS.ORDER.RANDOM);
	  }
	};

	/**
	 * Get array of highest cpm bids for all adUnits, or highest cpm bid
	 * object for the given adUnit
	 * @param {string} adUnitCode - optional ad unit code
	 * @return {array} array containing highest cpm bid object(s)
	 */
	pbjs.getHighestCpmBids = function (adUnitCode) {
	  return targeting.getWinningBids(adUnitCode);
	};

	pbjs.que.push((function () {
	  return (0, _secureCreatives.listenMessagesFromCreative)();
	}));
	processQue();

/***/ }),
/* 1 */
/***/ (function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.getGlobal = getGlobal;
	// if pbjs already exists in global document scope, use it, if not, create the object
	// global defination should happen BEFORE imports to avoid global undefined errors.
	window.pbjs = window.pbjs || {};
	window.pbjs.que = window.pbjs.que || [];

	function getGlobal() {
	  return window.pbjs;
	}

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	exports.uniques = uniques;
	exports.flatten = flatten;
	exports.getBidRequest = getBidRequest;
	exports.getKeys = getKeys;
	exports.getValue = getValue;
	exports.getBidderCodes = getBidderCodes;
	exports.isGptPubadsDefined = isGptPubadsDefined;
	exports.getHighestCpm = getHighestCpm;
	exports.shuffle = shuffle;
	exports.adUnitsFilter = adUnitsFilter;
	var CONSTANTS = __webpack_require__(3);

	var objectType_object = 'object';
	var objectType_string = 'string';
	var objectType_number = 'number';

	var _loggingChecked = false;

	var t_Arr = 'Array';
	var t_Str = 'String';
	var t_Fn = 'Function';
	var t_Numb = 'Number';
	var toString = Object.prototype.toString;
	var infoLogger = null;
	try {
	  infoLogger = console.info.bind(window.console);
	} catch (e) {}

	/*
	 *   Substitutes into a string from a given map using the token
	 *   Usage
	 *   var str = 'text %%REPLACE%% this text with %%SOMETHING%%';
	 *   var map = {};
	 *   map['replace'] = 'it was subbed';
	 *   map['something'] = 'something else';
	 *   console.log(replaceTokenInString(str, map, '%%')); => "text it was subbed this text with something else"
	 */
	exports.replaceTokenInString = function (str, map, token) {
	  this._each(map, (function (value, key) {
	    value = value === undefined ? '' : value;

	    var keyString = token + key.toUpperCase() + token;
	    var re = new RegExp(keyString, 'g');

	    str = str.replace(re, value);
	  }));

	  return str;
	};

	/* utility method to get incremental integer starting from 1 */
	var getIncrementalInteger = (function () {
	  var count = 0;
	  return function () {
	    count++;
	    return count;
	  };
	})();

	function _getUniqueIdentifierStr() {
	  return getIncrementalInteger() + Math.random().toString(16).substr(2);
	}

	//generate a random string (to be used as a dynamic JSONP callback)
	exports.getUniqueIdentifierStr = _getUniqueIdentifierStr;

	/**
	 * Returns a random v4 UUID of the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx,
	 * where each x is replaced with a random hexadecimal digit from 0 to f,
	 * and y is replaced with a random hexadecimal digit from 8 to b.
	 * https://gist.github.com/jed/982883 via node-uuid
	 */
	exports.generateUUID = function generateUUID(placeholder) {
	  return placeholder ? (placeholder ^ Math.random() * 16 >> placeholder / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, generateUUID);
	};

	exports.getBidIdParameter = function (key, paramsObj) {
	  if (paramsObj && paramsObj[key]) {
	    return paramsObj[key];
	  }

	  return '';
	};

	exports.tryAppendQueryString = function (existingUrl, key, value) {
	  if (value) {
	    return existingUrl += key + '=' + encodeURIComponent(value) + '&';
	  }

	  return existingUrl;
	};

	//parse a query string object passed in bid params
	//bid params should be an object such as {key: "value", key1 : "value1"}
	exports.parseQueryStringParameters = function (queryObj) {
	  var result = '';
	  for (var k in queryObj) {
	    if (queryObj.hasOwnProperty(k)) result += k + '=' + encodeURIComponent(queryObj[k]) + '&';
	  }

	  return result;
	};

	//transform an AdServer targeting bids into a query string to send to the adserver
	exports.transformAdServerTargetingObj = function (targeting) {
	  // we expect to receive targeting for a single slot at a time
	  if (targeting && Object.getOwnPropertyNames(targeting).length > 0) {

	    return getKeys(targeting).map((function (key) {
	      return key + '=' + encodeURIComponent(getValue(targeting, key));
	    })).join('&');
	  } else {
	    return '';
	  }
	};

	//Copy all of the properties in the source objects over to the target object
	//return the target object.
	exports.extend = function (target, source) {
	  target = target || {};

	  this._each(source, (function (value, prop) {
	    if (_typeof(source[prop]) === objectType_object) {
	      target[prop] = this.extend(target[prop], source[prop]);
	    } else {
	      target[prop] = source[prop];
	    }
	  }));

	  return target;
	};

	/**
	 * Parse a GPT-Style general size Array like `[[300, 250]]` or `"300x250,970x90"` into an array of sizes `["300x250"]` or '['300x250', '970x90']'
	 * @param  {array[array|number]} sizeObj Input array or double array [300,250] or [[300,250], [728,90]]
	 * @return {array[string]}  Array of strings like `["300x250"]` or `["300x250", "728x90"]`
	 */
	exports.parseSizesInput = function (sizeObj) {
	  var parsedSizes = [];

	  //if a string for now we can assume it is a single size, like "300x250"
	  if ((typeof sizeObj === 'undefined' ? 'undefined' : _typeof(sizeObj)) === objectType_string) {
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
	  } else if ((typeof sizeObj === 'undefined' ? 'undefined' : _typeof(sizeObj)) === objectType_object) {
	    var sizeArrayLength = sizeObj.length;

	    //don't process empty array
	    if (sizeArrayLength > 0) {
	      //if we are a 2 item array of 2 numbers, we must be a SingleSize array
	      if (sizeArrayLength === 2 && _typeof(sizeObj[0]) === objectType_number && _typeof(sizeObj[1]) === objectType_number) {
	        parsedSizes.push(this.parseGPTSingleSizeArray(sizeObj));
	      } else {
	        //otherwise, we must be a MultiSize array
	        for (var i = 0; i < sizeArrayLength; i++) {
	          parsedSizes.push(this.parseGPTSingleSizeArray(sizeObj[i]));
	        }
	      }
	    }
	  }

	  return parsedSizes;
	};

	//parse a GPT style sigle size array, (i.e [300,250])
	//into an AppNexus style string, (i.e. 300x250)
	exports.parseGPTSingleSizeArray = function (singleSize) {
	  //if we aren't exactly 2 items in this array, it is invalid
	  if (this.isArray(singleSize) && singleSize.length === 2 && !isNaN(singleSize[0]) && !isNaN(singleSize[1])) {
	    return singleSize[0] + 'x' + singleSize[1];
	  }
	};

	exports.getTopWindowLocation = function () {
	  var location = void 0;
	  try {
	    location = window.top.location;
	  } catch (e) {
	    location = window.location;
	  }

	  return location;
	};

	exports.getTopWindowUrl = function () {
	  var href = void 0;
	  try {
	    href = this.getTopWindowLocation().href;
	  } catch (e) {
	    href = '';
	  }

	  return href;
	};

	exports.logWarn = function (msg) {
	  if (debugTurnedOn() && console.warn) {
	    console.warn('WARNING: ' + msg);
	  }
	};

	exports.logInfo = function (msg, args) {
	  if (debugTurnedOn() && hasConsoleLogger()) {
	    if (infoLogger) {
	      if (!args || args.length === 0) {
	        args = '';
	      }

	      infoLogger('INFO: ' + msg + (args === '' ? '' : ' : params : '), args);
	    }
	  }
	};

	exports.logMessage = function (msg) {
	  if (debugTurnedOn() && hasConsoleLogger()) {
	    console.log('MESSAGE: ' + msg);
	  }
	};

	function hasConsoleLogger() {
	  return window.console && window.console.log;
	}

	exports.hasConsoleLogger = hasConsoleLogger;

	var errLogFn = (function (hasLogger) {
	  if (!hasLogger) return '';
	  return window.console.error ? 'error' : 'log';
	})(hasConsoleLogger());

	var debugTurnedOn = function debugTurnedOn() {
	  if (pbjs.logging === false && _loggingChecked === false) {
	    pbjs.logging = getParameterByName(CONSTANTS.DEBUG_MODE).toUpperCase() === 'TRUE';
	    _loggingChecked = true;
	  }

	  return !!pbjs.logging;
	};

	exports.debugTurnedOn = debugTurnedOn;

	exports.logError = function (msg, code, exception) {
	  var errCode = code || 'ERROR';
	  if (debugTurnedOn() && hasConsoleLogger()) {
	    console[errLogFn](console, errCode + ': ' + msg, exception || '');
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
	  f.src = 'about:blank';
	  f.style.display = 'none';
	  return f;
	};

	/*
	 *   Check if a given parameter name exists in query string
	 *   and if it does return the value
	 */
	var getParameterByName = function getParameterByName(name) {
	  var regexS = '[\\?&]' + name + '=([^&#]*)';
	  var regex = new RegExp(regexS);
	  var results = regex.exec(window.location.search);
	  if (results === null) {
	    return '';
	  }

	  return decodeURIComponent(results[1].replace(/\+/g, ' '));
	};

	/**
	 * This function validates paramaters.
	 * @param  {object[string]} paramObj          [description]
	 * @param  {string[]} requiredParamsArr [description]
	 * @return {bool}                   Bool if paramaters are valid
	 */
	exports.hasValidBidRequest = function (paramObj, requiredParamsArr, adapter) {
	  var found = false;

	  function findParam(value, key) {
	    if (key === requiredParamsArr[i]) {
	      found = true;
	    }
	  }

	  for (var i = 0; i < requiredParamsArr.length; i++) {
	    found = false;

	    this._each(paramObj, findParam);

	    if (!found) {
	      this.logError('Params are missing for bid request. One of these required paramaters are missing: ' + requiredParamsArr, adapter);
	      return false;
	    }
	  }

	  return true;
	};

	// Handle addEventListener gracefully in older browsers
	exports.addEventHandler = function (element, event, func) {
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
	exports.isA = function (object, _t) {
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

	exports.isNumber = function (object) {
	  return this.isA(object, t_Numb);
	};

	/**
	 * Return if the object is "empty";
	 * this includes falsey, no keys, or no items at indices
	 * @param {*} object object to test
	 * @return {Boolean} if object is empty
	 */
	exports.isEmpty = function (object) {
	  if (!object) return true;
	  if (this.isArray(object) || this.isStr(object)) {
	    return !(object.length > 0); // jshint ignore:line
	  }

	  for (var k in object) {
	    if (hasOwnProperty.call(object, k)) return false;
	  }

	  return true;
	};

	/**
	 * Return if string is empty, null, or undefined
	 * @param str string to test
	 * @returns {boolean} if string is empty
	 */
	exports.isEmptyStr = function (str) {
	  return this.isStr(str) && (!str || 0 === str.length);
	};

	/**
	 * Iterate object with the function
	 * falls back to es5 `forEach`
	 * @param {Array|Object} object
	 * @param {Function(value, key, object)} fn
	 */
	exports._each = function (object, fn) {
	  if (this.isEmpty(object)) return;
	  if (this.isFn(object.forEach)) return object.forEach(fn, this);

	  var k = 0;
	  var l = object.length;

	  if (l > 0) {
	    for (; k < l; k++) {
	      fn(object[k], k, object);
	    }
	  } else {
	    for (k in object) {
	      if (hasOwnProperty.call(object, k)) fn.call(this, object[k], k);
	    }
	  }
	};

	exports.contains = function (a, obj) {
	  if (this.isEmpty(a)) {
	    return false;
	  }

	  if (this.isFn(a.indexOf)) {
	    return a.indexOf(obj) !== -1;
	  }

	  var i = a.length;
	  while (i--) {
	    if (a[i] === obj) {
	      return true;
	    }
	  }

	  return false;
	};

	exports.indexOf = (function () {
	  if (Array.prototype.indexOf) {
	    return Array.prototype.indexOf;
	  }

	  // ie8 no longer supported
	  //return polyfills.indexOf;
	})();

	/**
	 * Map an array or object into another array
	 * given a function
	 * @param {Array|Object} object
	 * @param {Function(value, key, object)} callback
	 * @return {Array}
	 */
	exports._map = function (object, callback) {
	  if (this.isEmpty(object)) return [];
	  if (this.isFn(object.map)) return object.map(callback);
	  var output = [];
	  this._each(object, (function (value, key) {
	    output.push(callback(value, key, object));
	  }));

	  return output;
	};

	var hasOwn = function hasOwn(objectToCheck, propertyToCheckFor) {
	  if (objectToCheck.hasOwnProperty) {
	    return objectToCheck.hasOwnProperty(propertyToCheckFor);
	  } else {
	    return typeof objectToCheck[propertyToCheckFor] !== 'undefined' && objectToCheck.constructor.prototype[propertyToCheckFor] !== objectToCheck[propertyToCheckFor];
	  }
	};
	/**
	 * Creates a snippet of HTML that retrieves the specified `url`
	 * @param  {string} url URL to be requested
	 * @return {string}     HTML snippet that contains the img src = set to `url`
	 */
	exports.createTrackPixelHtml = function (url) {
	  if (!url) {
	    return '';
	  }

	  var escapedUrl = encodeURI(url);
	  var img = '<div style="position:absolute;left:0px;top:0px;visibility:hidden;">';
	  img += '<img src="' + escapedUrl + '"></div>';
	  return img;
	};

	/**
	 * Creates a snippet of Iframe HTML that retrieves the specified `url`
	 * @param  {string} url plain URL to be requested
	 * @return {string}     HTML snippet that contains the iframe src = set to `url`
	 */
	exports.createTrackPixelIframeHtml = function (url) {
	  if (!url) {
	    return '';
	  }

	  return '<iframe frameborder="0" allowtransparency="true" marginheight="0" marginwidth="0" width="0" hspace="0" vspace="0" height="0" style="height:0p;width:0p;display:none;" scrolling="no" src="' + encodeURI(url) + '"></iframe>';
	};

	/**
	 * Returns iframe document in a browser agnostic way
	 * @param  {object} iframe reference
	 * @return {object}        iframe `document` reference
	 */
	exports.getIframeDocument = function (iframe) {
	  if (!iframe) {
	    return;
	  }

	  var doc = void 0;
	  try {
	    if (iframe.contentWindow) {
	      doc = iframe.contentWindow.document;
	    } else if (iframe.contentDocument.document) {
	      doc = iframe.contentDocument.document;
	    } else {
	      doc = iframe.contentDocument;
	    }
	  } catch (e) {
	    this.logError('Cannot get iframe document', e);
	  }

	  return doc;
	};

	exports.getValueString = function (param, val, defaultValue) {
	  if (val === undefined || val === null) {
	    return defaultValue;
	  }
	  if (this.isStr(val)) {
	    return val;
	  }
	  if (this.isNumber(val)) {
	    return val.toString();
	  }
	  this.logWarn('Unsuported type for param: ' + param + ' required type: String');
	};

	function uniques(value, index, arry) {
	  return arry.indexOf(value) === index;
	}

	function flatten(a, b) {
	  return a.concat(b);
	}

	function getBidRequest(id) {
	  return pbjs._bidsRequested.map((function (bidSet) {
	    return bidSet.bids.find((function (bid) {
	      return bid.bidId === id;
	    }));
	  })).find((function (bid) {
	    return bid;
	  }));
	}

	function getKeys(obj) {
	  return Object.keys(obj);
	}

	function getValue(obj, key) {
	  return obj[key];
	}

	function getBidderCodes() {
	  var adUnits = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : pbjs.adUnits;

	  // this could memoize adUnits
	  return adUnits.map((function (unit) {
	    return unit.bids.map((function (bid) {
	      return bid.bidder;
	    })).reduce(flatten, []);
	  })).reduce(flatten).filter(uniques);
	}

	function isGptPubadsDefined() {
	  if (window.googletag && exports.isFn(window.googletag.pubads) && exports.isFn(window.googletag.pubads().getSlots)) {
	    return true;
	  }
	}

	function getHighestCpm(previous, current) {
	  if (previous.cpm === current.cpm) {
	    return previous.timeToRespond > current.timeToRespond ? current : previous;
	  }

	  return previous.cpm < current.cpm ? current : previous;
	}

	/**
	 * Fisher–Yates shuffle
	 * http://stackoverflow.com/a/6274398
	 * https://bost.ocks.org/mike/shuffle/
	 * istanbul ignore next
	 */
	function shuffle(array) {
	  var counter = array.length;

	  // while there are elements in the array
	  while (counter > 0) {
	    // pick a random index
	    var index = Math.floor(Math.random() * counter);

	    // decrease counter by 1
	    counter--;

	    // and swap the last element with it
	    var temp = array[counter];
	    array[counter] = array[index];
	    array[index] = temp;
	  }

	  return array;
	}

	function adUnitsFilter(filter, bid) {
	  return filter.includes(bid && bid.placementCode || bid && bid.adUnitCode);
	}

/***/ }),
/* 3 */
/***/ (function(module, exports) {

	module.exports = {
		"JSON_MAPPING": {
			"PL_CODE": "code",
			"PL_SIZE": "sizes",
			"PL_BIDS": "bids",
			"BD_BIDDER": "bidder",
			"BD_ID": "paramsd",
			"BD_PL_ID": "placementId",
			"ADSERVER_TARGETING": "adserverTargeting",
			"BD_SETTING_STANDARD": "standard"
		},
		"REPO_AND_VERSION": "prebid_prebid_0.21.0-pre",
		"DEBUG_MODE": "pbjs_debug",
		"STATUS": {
			"GOOD": 1,
			"NO_BID": 2
		},
		"CB": {
			"TYPE": {
				"ALL_BIDS_BACK": "allRequestedBidsBack",
				"AD_UNIT_BIDS_BACK": "adUnitBidsBack",
				"BID_WON": "bidWon",
				"REQUEST_BIDS": "requestBids"
			}
		},
		"objectType_function": "function",
		"objectType_undefined": "undefined",
		"objectType_object": "object",
		"objectType_string": "string",
		"objectType_number": "number",
		"EVENTS": {
			"AUCTION_INIT": "auctionInit",
			"AUCTION_END": "auctionEnd",
			"BID_ADJUSTMENT": "bidAdjustment",
			"BID_TIMEOUT": "bidTimeout",
			"BID_REQUESTED": "bidRequested",
			"BID_RESPONSE": "bidResponse",
			"BID_WON": "bidWon",
			"SET_TARGETING": "setTargeting",
			"REQUEST_BIDS": "requestBids"
		},
		"EVENT_ID_PATHS": {
			"bidWon": "adUnitCode"
		},
		"ORDER": {
			"RANDOM": "random"
		},
		"GRANULARITY_OPTIONS": {
			"LOW": "low",
			"MEDIUM": "medium",
			"HIGH": "high",
			"AUTO": "auto",
			"DENSE": "dense",
			"CUSTOM": "custom"
		},
		"TARGETING_KEYS": [
			"hb_bidder",
			"hb_adid",
			"hb_pb",
			"hb_size",
			"hb_deal"
		]
	};

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.hasNonVideoBidder = exports.videoAdUnit = undefined;

	var _adaptermanager = __webpack_require__(5);

	/**
	 * Helper functions for working with video-enabled adUnits
	 */
	var videoAdUnit = exports.videoAdUnit = function videoAdUnit(adUnit) {
	  return adUnit.mediaType === 'video';
	};
	var nonVideoBidder = function nonVideoBidder(bid) {
	  return !_adaptermanager.videoAdapters.includes(bid.bidder);
	};
	var hasNonVideoBidder = exports.hasNonVideoBidder = function hasNonVideoBidder(adUnit) {
	  return adUnit.bids.filter(nonVideoBidder).length;
	};

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; /** @module adaptermanger */

	var _utils = __webpack_require__(2);

	var _sizeMapping = __webpack_require__(6);

	var _baseAdapter = __webpack_require__(7);

	var utils = __webpack_require__(2);
	var CONSTANTS = __webpack_require__(3);
	var events = __webpack_require__(8);


	var _bidderRegistry = {};
	exports.bidderRegistry = _bidderRegistry;

	var _analyticsRegistry = {};
	var _bidderSequence = null;

	function getBids(_ref) {
	    var bidderCode = _ref.bidderCode,
	        requestId = _ref.requestId,
	        bidderRequestId = _ref.bidderRequestId,
	        adUnits = _ref.adUnits;

	    return adUnits.map((function (adUnit) {
	        return adUnit.bids.filter((function (bid) {
	            return bid.bidder === bidderCode;
	        })).map((function (bid) {
	            var sizes = adUnit.sizes;
	            if (adUnit.sizeMapping) {
	                var sizeMapping = (0, _sizeMapping.mapSizes)(adUnit);
	                if (sizeMapping === '') {
	                    return '';
	                }
	                sizes = sizeMapping;
	            }
	            return _extends({}, bid, {
	                placementCode: adUnit.code,
	                mediaType: adUnit.mediaType,
	                sizes: sizes,
	                bidId: utils.getUniqueIdentifierStr(),
	                bidderRequestId: bidderRequestId,
	                requestId: requestId
	            });
	        }));
	    })).reduce(_utils.flatten, []).filter((function (val) {
	        return val !== '';
	    }));
	}

	exports.callBids = function (_ref2) {
	    var adUnits = _ref2.adUnits,
	        cbTimeout = _ref2.cbTimeout;

	    var requestId = utils.generateUUID();
	    var auctionStart = Date.now();

	    var auctionInit = {
	        timestamp: auctionStart,
	        requestId: requestId
	    };
	    events.emit(CONSTANTS.EVENTS.AUCTION_INIT, auctionInit);

	    var bidderCodes = (0, _utils.getBidderCodes)(adUnits);
	    if (_bidderSequence === CONSTANTS.ORDER.RANDOM) {
	        bidderCodes = (0, _utils.shuffle)(bidderCodes);
	    }

	    bidderCodes.forEach((function (bidderCode) {
	        var adapter = _bidderRegistry[bidderCode];
	        if (adapter) {
	            var bidderRequestId = utils.getUniqueIdentifierStr();
	            var bidderRequest = {
	                bidderCode: bidderCode,
	                requestId: requestId,
	                bidderRequestId: bidderRequestId,
	                bids: getBids({ bidderCode: bidderCode, requestId: requestId, bidderRequestId: bidderRequestId, adUnits: adUnits }),
	                start: new Date().getTime(),
	                auctionStart: auctionStart,
	                timeout: cbTimeout
	            };
	            if (bidderRequest.bids && bidderRequest.bids.length !== 0) {
	                utils.logMessage('CALLING BIDDER ======= ' + bidderCode);
	                pbjs._bidsRequested.push(bidderRequest);
	                events.emit(CONSTANTS.EVENTS.BID_REQUESTED, bidderRequest);
	                adapter.callBids(bidderRequest);
	            }
	        } else {
	            utils.logError('Adapter trying to be called which does not exist: ' + bidderCode + ' adaptermanager.callBids');
	        }
	    }));
	};

	exports.registerBidAdapter = function (bidAdaptor, bidderCode) {
	    if (bidAdaptor && bidderCode) {

	        if (_typeof(bidAdaptor.callBids) === CONSTANTS.objectType_function) {
	            _bidderRegistry[bidderCode] = bidAdaptor;
	        } else {
	            utils.logError('Bidder adaptor error for bidder code: ' + bidderCode + 'bidder must implement a callBids() function');
	        }
	    } else {
	        utils.logError('bidAdaptor or bidderCode not specified');
	    }
	};

	exports.aliasBidAdapter = function (bidderCode, alias) {
	    var existingAlias = _bidderRegistry[alias];

	    if ((typeof existingAlias === 'undefined' ? 'undefined' : _typeof(existingAlias)) === CONSTANTS.objectType_undefined) {
	        var bidAdaptor = _bidderRegistry[bidderCode];

	        if ((typeof bidAdaptor === 'undefined' ? 'undefined' : _typeof(bidAdaptor)) === CONSTANTS.objectType_undefined) {
	            utils.logError('bidderCode "' + bidderCode + '" is not an existing bidder.', 'adaptermanager.aliasBidAdapter');
	        } else {
	            try {
	                var newAdapter = null;
	                if (bidAdaptor instanceof _baseAdapter.BaseAdapter) {
	                    //newAdapter = new bidAdaptor.constructor(alias);
	                    utils.logError(bidderCode + ' bidder does not currently support aliasing.', 'adaptermanager.aliasBidAdapter');
	                } else {
	                    newAdapter = bidAdaptor.createNew();
	                    newAdapter.setBidderCode(alias);
	                    this.registerBidAdapter(newAdapter, alias);
	                }
	            } catch (e) {
	                utils.logError(bidderCode + ' bidder does not currently support aliasing.', 'adaptermanager.aliasBidAdapter');
	            }
	        }
	    } else {
	        utils.logMessage('alias name "' + alias + '" has been already specified.');
	    }
	};

	exports.registerAnalyticsAdapter = function (_ref3) {
	    var adapter = _ref3.adapter,
	        code = _ref3.code;

	    if (adapter && code) {

	        if (_typeof(adapter.enableAnalytics) === CONSTANTS.objectType_function) {
	            adapter.code = code;
	            _analyticsRegistry[code] = adapter;
	        } else {
	            utils.logError('Prebid Error: Analytics adaptor error for analytics "' + code + '"\n        analytics adapter must implement an enableAnalytics() function');
	        }
	    } else {
	        utils.logError('Prebid Error: analyticsAdapter or analyticsCode not specified');
	    }
	};

	exports.enableAnalytics = function (config) {
	    if (!utils.isArray(config)) {
	        config = [config];
	    }

	    utils._each(config, (function (adapterConfig) {
	        var adapter = _analyticsRegistry[adapterConfig.provider];
	        if (adapter) {
	            adapter.enableAnalytics(adapterConfig);
	        } else {
	            utils.logError('Prebid Error: no analytics adapter found in registry for\n        ' + adapterConfig.provider + '.');
	        }
	    }));
	};

	exports.setBidderSequence = function (order) {
	    _bidderSequence = order;
	};

	var AardvarkAdapter = __webpack_require__(9);
	exports.registerBidAdapter(new AardvarkAdapter(), 'aardvark');
	var AdbladeAdapter = __webpack_require__(15);
	exports.registerBidAdapter(new AdbladeAdapter(), 'adblade');
	var AdbundAdapter = __webpack_require__(16);
	exports.registerBidAdapter(new AdbundAdapter(), 'adbund');
	var AdbutlerAdapter = __webpack_require__(17);
	exports.registerBidAdapter(new AdbutlerAdapter(), 'adbutler');
	var AdequantAdapter = __webpack_require__(18);
	exports.registerBidAdapter(new AdequantAdapter(), 'adequant');
	var AdformAdapter = __webpack_require__(19);
	exports.registerBidAdapter(new AdformAdapter(), 'adform');
	var AdkernelAdapter = __webpack_require__(20);
	exports.registerBidAdapter(new AdkernelAdapter(), 'adkernel');
	var AdmediaAdapter = __webpack_require__(23);
	exports.registerBidAdapter(new AdmediaAdapter(), 'admedia');
	var VertamediaAdapter = __webpack_require__(24);
	exports.registerBidAdapter(new VertamediaAdapter(), 'vertamedia');
	var AolAdapter = __webpack_require__(25);
	exports.registerBidAdapter(new AolAdapter(), 'aol');
	var AppnexusAdapter = __webpack_require__(26);
	exports.registerBidAdapter(new AppnexusAdapter(), 'appnexus');
	var AppnexusAstAdapter = __webpack_require__(27);
	exports.registerBidAdapter(new AppnexusAstAdapter(), 'appnexusAst');
	var ConversantAdapter = __webpack_require__(28);
	exports.registerBidAdapter(new ConversantAdapter(), 'conversant');
	var DistrictmDMXAdapter = __webpack_require__(29);
	exports.registerBidAdapter(new DistrictmDMXAdapter(), 'districtmDMX');
	var FidelityAdapter = __webpack_require__(30);
	exports.registerBidAdapter(new FidelityAdapter(), 'fidelity');
	var GumgumAdapter = __webpack_require__(31);
	exports.registerBidAdapter(new GumgumAdapter(), 'gumgum');
	var HiromediaAdapter = __webpack_require__(32);
	exports.registerBidAdapter(new HiromediaAdapter(), 'hiromedia');
	var IndexExchangeAdapter = __webpack_require__(33);
	exports.registerBidAdapter(new IndexExchangeAdapter(), 'indexExchange');
	var KruxlinkAdapter = __webpack_require__(34);
	exports.registerBidAdapter(new KruxlinkAdapter(), 'kruxlink');
	var GetintentAdapter = __webpack_require__(35);
	exports.registerBidAdapter(new GetintentAdapter(), 'getintent');
	var KomoonaAdapter = __webpack_require__(36);
	exports.registerBidAdapter(new KomoonaAdapter(), 'komoona');
	var LifestreetAdapter = __webpack_require__(37);
	exports.registerBidAdapter(new LifestreetAdapter(), 'lifestreet');
	var MantisAdapter = __webpack_require__(38);
	exports.registerBidAdapter(new MantisAdapter(), 'mantis');
	var OpenxAdapter = __webpack_require__(39);
	exports.registerBidAdapter(new OpenxAdapter(), 'openx');
	var PiximediaAdapter = __webpack_require__(40);
	exports.registerBidAdapter(new PiximediaAdapter(), 'piximedia');
	var PubmaticAdapter = __webpack_require__(41);
	exports.registerBidAdapter(new PubmaticAdapter(), 'pubmatic');
	var PulsepointAdapter = __webpack_require__(42);
	exports.registerBidAdapter(new PulsepointAdapter(), 'pulsepoint');
	var RhythmoneAdapter = __webpack_require__(43);
	exports.registerBidAdapter(new RhythmoneAdapter(), 'rhythmone');
	var RubiconAdapter = __webpack_require__(44);
	exports.registerBidAdapter(new RubiconAdapter(), 'rubicon');
	var SmartyadsAdapter = __webpack_require__(45);
	exports.registerBidAdapter(new SmartyadsAdapter(), 'smartyads');
	var SmartadserverAdapter = __webpack_require__(46);
	exports.registerBidAdapter(new SmartadserverAdapter(), 'smartadserver');
	var SekindoUMAdapter = __webpack_require__(47);
	exports.registerBidAdapter(new SekindoUMAdapter(), 'sekindoUM');
	var SonobiAdapter = __webpack_require__(48);
	exports.registerBidAdapter(new SonobiAdapter(), 'sonobi');
	var SovrnAdapter = __webpack_require__(49);
	exports.registerBidAdapter(new SovrnAdapter(), 'sovrn');
	var SpringserveAdapter = __webpack_require__(50);
	exports.registerBidAdapter(new SpringserveAdapter(), 'springserve');
	var ThoughtleadrAdapter = __webpack_require__(51);
	exports.registerBidAdapter(new ThoughtleadrAdapter(), 'thoughtleadr');
	var StickyadstvAdapter = __webpack_require__(52);
	exports.registerBidAdapter(new StickyadstvAdapter(), 'stickyadstv');
	var TripleliftAdapter = __webpack_require__(53);
	exports.registerBidAdapter(new TripleliftAdapter(), 'triplelift');
	var TwengaAdapter = __webpack_require__(54);
	exports.registerBidAdapter(new TwengaAdapter(), 'twenga');
	var YieldbotAdapter = __webpack_require__(55);
	exports.registerBidAdapter(new YieldbotAdapter(), 'yieldbot');
	var NginadAdapter = __webpack_require__(56);
	exports.registerBidAdapter(new NginadAdapter(), 'nginad');
	var BrightcomAdapter = __webpack_require__(57);
	exports.registerBidAdapter(new BrightcomAdapter(), 'brightcom');
	var WideorbitAdapter = __webpack_require__(58);
	exports.registerBidAdapter(new WideorbitAdapter(), 'wideorbit');
	var JcmAdapter = __webpack_require__(59);
	exports.registerBidAdapter(new JcmAdapter(), 'jcm');
	var UnderdogmediaAdapter = __webpack_require__(60);
	exports.registerBidAdapter(new UnderdogmediaAdapter(), 'underdogmedia');
	var MemeglobalAdapter = __webpack_require__(61);
	exports.registerBidAdapter(new MemeglobalAdapter(), 'memeglobal');
	var CriteoAdapter = __webpack_require__(62);
	exports.registerBidAdapter(new CriteoAdapter(), 'criteo');
	var CentroAdapter = __webpack_require__(63);
	exports.registerBidAdapter(new CentroAdapter(), 'centro');
	var XhbAdapter = __webpack_require__(64);
	exports.registerBidAdapter(new XhbAdapter(), 'xhb');
	var SharethroughAdapter = __webpack_require__(65);
	exports.registerBidAdapter(new SharethroughAdapter(), 'sharethrough');
	var RoxotAdapter = __webpack_require__(66);
	exports.registerBidAdapter(new RoxotAdapter(), 'roxot');
	var VertozAdapter = __webpack_require__(67);
	exports.registerBidAdapter(new VertozAdapter(), 'vertoz');
	var WidespaceAdapter = __webpack_require__(68);
	exports.registerBidAdapter(new WidespaceAdapter(), 'widespace');
	var AdmixerAdapter = __webpack_require__(69);
	exports.registerBidAdapter(new AdmixerAdapter(), 'admixer');
	exports.aliasBidAdapter('appnexus', 'brealtime');
	exports.aliasBidAdapter('appnexus', 'pagescience');
	exports.aliasBidAdapter('appnexus', 'defymedia');
	exports.aliasBidAdapter('appnexus', 'matomy');
	exports.aliasBidAdapter('rubicon', 'rubiconLite');
	exports.aliasBidAdapter('appnexus', 'featureforward');
	exports.aliasBidAdapter('appnexus', 'oftmedia');
	exports.aliasBidAdapter('adkernel', 'headbidding');
	exports.videoAdapters = ["appnexusAst", "vertamedia", "rubicon", "getintent"];

	null;

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.setWindow = exports.getScreenWidth = exports.mapSizes = undefined;

	var _utils = __webpack_require__(2);

	var utils = _interopRequireWildcard(_utils);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

	var _win = void 0; /**
	                    * @module sizeMapping
	                    */


	function mapSizes(adUnit) {
	  if (!isSizeMappingValid(adUnit.sizeMapping)) {
	    return adUnit.sizes;
	  }
	  var width = getScreenWidth();
	  if (!width) {
	    //size not detected - get largest value set for desktop
	    var _mapping = adUnit.sizeMapping.reduce((function (prev, curr) {
	      return prev.minWidth < curr.minWidth ? curr : prev;
	    }));
	    if (_mapping.sizes) {
	      return _mapping.sizes;
	    }
	    return adUnit.sizes;
	  }
	  var sizes = '';
	  var mapping = adUnit.sizeMapping.find((function (sizeMapping) {
	    return width > sizeMapping.minWidth;
	  }));
	  if (mapping && mapping.sizes) {
	    sizes = mapping.sizes;
	    utils.logMessage('AdUnit : ' + adUnit.code + ' resized based on device width to : ' + sizes);
	  } else {
	    utils.logMessage('AdUnit : ' + adUnit.code + ' not mapped to any sizes for device width. This request will be suppressed.');
	  }
	  return sizes;
	}

	function isSizeMappingValid(sizeMapping) {
	  if (utils.isArray(sizeMapping) && sizeMapping.length > 0) {
	    return true;
	  }
	  utils.logInfo('No size mapping defined');
	  return false;
	}

	function getScreenWidth(win) {
	  var w = win || _win || window;
	  var d = w.document;

	  if (w.innerWidth) {
	    return w.innerWidth;
	  } else if (d.body.clientWidth) {
	    return d.body.clientWidth;
	  } else if (d.documentElement.clientWidth) {
	    return d.documentElement.clientWidth;
	  }
	  return 0;
	}

	function setWindow(win) {
	  _win = win;
	}

	exports.mapSizes = mapSizes;
	exports.getScreenWidth = getScreenWidth;
	exports.setWindow = setWindow;

/***/ }),
/* 7 */
/***/ (function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var BaseAdapter = exports.BaseAdapter = (function () {
	  function BaseAdapter(code) {
	    _classCallCheck(this, BaseAdapter);

	    this.code = code;
	  }

	  _createClass(BaseAdapter, [{
	    key: 'getCode',
	    value: function getCode() {
	      return this.code;
	    }
	  }, {
	    key: 'setCode',
	    value: function setCode(code) {
	      this.code = code;
	    }
	  }, {
	    key: 'callBids',
	    value: function callBids() {
	      throw 'adapter implementation must override callBids method';
	    }
	  }]);

	  return BaseAdapter;
	})();

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * events.js
	 */
	var utils = __webpack_require__(2);
	var CONSTANTS = __webpack_require__(3);
	var slice = Array.prototype.slice;
	var push = Array.prototype.push;

	//define entire events
	//var allEvents = ['bidRequested','bidResponse','bidWon','bidTimeout'];
	var allEvents = utils._map(CONSTANTS.EVENTS, (function (v) {
	  return v;
	}));

	var idPaths = CONSTANTS.EVENT_ID_PATHS;

	//keep a record of all events fired
	var eventsFired = [];

	module.exports = (function () {

	  var _handlers = {};
	  var _public = {};

	  /**
	   *
	   * @param {String} eventString  The name of the event.
	   * @param {Array} args  The payload emitted with the event.
	   * @private
	   */
	  function _dispatch(eventString, args) {
	    utils.logMessage('Emitting event for: ' + eventString);

	    var eventPayload = args[0] || {};
	    var idPath = idPaths[eventString];
	    var key = eventPayload[idPath];
	    var event = _handlers[eventString] || { que: [] };
	    var eventKeys = utils._map(event, (function (v, k) {
	      return k;
	    }));

	    var callbacks = [];

	    //record the event:
	    eventsFired.push({
	      eventType: eventString,
	      args: eventPayload,
	      id: key
	    });

	    /** Push each specific callback to the `callbacks` array.
	     * If the `event` map has a key that matches the value of the
	     * event payload id path, e.g. `eventPayload[idPath]`, then apply
	     * each function in the `que` array as an argument to push to the
	     * `callbacks` array
	     * */
	    if (key && utils.contains(eventKeys, key)) {
	      push.apply(callbacks, event[key].que);
	    }

	    /** Push each general callback to the `callbacks` array. */
	    push.apply(callbacks, event.que);

	    /** call each of the callbacks */
	    utils._each(callbacks, (function (fn) {
	      if (!fn) return;
	      try {
	        fn.apply(null, args);
	      } catch (e) {
	        utils.logError('Error executing handler:', 'events.js', e);
	      }
	    }));
	  }

	  function _checkAvailableEvent(event) {
	    return utils.contains(allEvents, event);
	  }

	  _public.on = function (eventString, handler, id) {

	    //check whether available event or not
	    if (_checkAvailableEvent(eventString)) {
	      var event = _handlers[eventString] || { que: [] };

	      if (id) {
	        event[id] = event[id] || { que: [] };
	        event[id].que.push(handler);
	      } else {
	        event.que.push(handler);
	      }

	      _handlers[eventString] = event;
	    } else {
	      utils.logError('Wrong event name : ' + eventString + ' Valid event names :' + allEvents);
	    }
	  };

	  _public.emit = function (event) {
	    var args = slice.call(arguments, 1);
	    _dispatch(event, args);
	  };

	  _public.off = function (eventString, handler, id) {
	    var event = _handlers[eventString];

	    if (utils.isEmpty(event) || utils.isEmpty(event.que) && utils.isEmpty(event[id])) {
	      return;
	    }

	    if (id && (utils.isEmpty(event[id]) || utils.isEmpty(event[id].que))) {
	      return;
	    }

	    if (id) {
	      utils._each(event[id].que, (function (_handler) {
	        var que = event[id].que;
	        if (_handler === handler) {
	          que.splice(utils.indexOf.call(que, _handler), 1);
	        }
	      }));
	    } else {
	      utils._each(event.que, (function (_handler) {
	        var que = event.que;
	        if (_handler === handler) {
	          que.splice(utils.indexOf.call(que, _handler), 1);
	        }
	      }));
	    }

	    _handlers[eventString] = event;
	  };

	  _public.get = function () {
	    return _handlers;
	  };

	  /**
	   * This method can return a copy of all the events fired
	   * @return {Array} array of events fired
	   */
	  _public.getEvents = function () {
	    var arrayCopy = [];
	    utils._each(eventsFired, (function (value) {
	      var newProp = utils.extend({}, value);
	      arrayCopy.push(newProp);
	    }));

	    return arrayCopy;
	  };

	  return _public;
	})();

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/*
	 * Adapter for requesting bids from RTK Aardvark
	 * To request an RTK Aardvark Header bidding account
	 * or for additional integration support please contact sales@rtk.io
	 */

	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);
	var adapter = __webpack_require__(14);
	var constants = __webpack_require__(3);

	var AARDVARK_CALLBACK_NAME = 'aardvarkResponse',
	    AARDVARK_REQUESTS_MAP = 'aardvarkRequests',
	    AARDVARK_BIDDER_CODE = 'aardvark',
	    DEFAULT_REFERRER = 'thor.rtk.io',
	    DEFAULT_ENDPOINT = 'thor.rtk.io',
	    endpoint = DEFAULT_ENDPOINT,
	    requestBids = function requestBids(bidderCode, callbackName, bidReqs) {
	  var ref = utils.getTopWindowLocation(),
	      ai = '',
	      scs = [],
	      bidIds = [];

	  ref = ref ? ref.host : DEFAULT_REFERRER;

	  for (var i = 0, l = bidReqs.length, bid, _ai, _sc, _endpoint; i < l; i += 1) {
	    bid = bidReqs[i];
	    _ai = utils.getBidIdParameter('ai', bid.params);
	    _sc = utils.getBidIdParameter('sc', bid.params);
	    if (!_ai || !_ai.length || !_sc || !_sc.length) continue;

	    _endpoint = utils.getBidIdParameter('host', bid.params);
	    if (_endpoint) endpoint = _endpoint;

	    if (!ai.length) ai = _ai;
	    if (_sc) scs.push(_sc);

	    bidIds.push(_sc + "=" + bid.bidId);

	    // Create the bidIdsMap for easier mapping back later
	    pbjs[AARDVARK_REQUESTS_MAP][bidderCode][bid.bidId] = bid;
	  }

	  if (!ai.length || !scs.length) return utils.logWarn("Bad bid request params given for adapter $" + bidderCode + " (" + AARDVARK_BIDDER_CODE + ")");

	  adloader.loadScript(['//' + endpoint + '/', ai, '/', scs.join('_'), '/aardvark/?jsonp=pbjs.', callbackName, '&rtkreferer=', ref, '&', bidIds.join('&')].join(''));
	},
	    registerBidResponse = function registerBidResponse(bidderCode, rawBidResponse) {
	  if (rawBidResponse.error) return utils.logWarn("Aardvark bid received with an error, ignoring... [" + rawBidResponse.error + "]");

	  if (!rawBidResponse.cid) return utils.logWarn("Aardvark bid received without a callback id, ignoring...");

	  var bidObj = pbjs[AARDVARK_REQUESTS_MAP][bidderCode][rawBidResponse.cid];
	  if (!bidObj) return utils.logWarn("Aardvark request not found: " + rawBidResponse.cid);

	  if (bidObj.params.sc !== rawBidResponse.id) return utils.logWarn("Aardvark bid received with a non matching shortcode " + rawBidResponse.id + " instead of " + bidObj.params.sc);

	  var bidResponse = bidfactory.createBid(constants.STATUS.GOOD, bidObj);
	  bidResponse.bidderCode = bidObj.bidder;
	  bidResponse.cpm = rawBidResponse.cpm;
	  bidResponse.ad = rawBidResponse.adm + utils.createTrackPixelHtml(decodeURIComponent(rawBidResponse.nurl));
	  bidResponse.width = bidObj.sizes[0][0];
	  bidResponse.height = bidObj.sizes[0][1];

	  bidmanager.addBidResponse(bidObj.placementCode, bidResponse);
	  pbjs[AARDVARK_REQUESTS_MAP][bidderCode][rawBidResponse.cid].responded = true;
	},
	    registerAardvarkCallback = function registerAardvarkCallback(bidderCode, callbackName) {
	  pbjs[callbackName] = function (rtkResponseObj) {

	    rtkResponseObj.forEach((function (bidResponse) {
	      registerBidResponse(bidderCode, bidResponse);
	    }));

	    for (var bidRequestId in pbjs[AARDVARK_REQUESTS_MAP][bidderCode]) {
	      if (pbjs[AARDVARK_REQUESTS_MAP][bidderCode].hasOwnProperty(bidRequestId)) {
	        var bidRequest = pbjs[AARDVARK_REQUESTS_MAP][bidderCode][bidRequestId];
	        if (!bidRequest.responded) {
	          var bidResponse = bidfactory.createBid(constants.STATUS.NO_BID, bidRequest);
	          bidResponse.bidderCode = bidRequest.bidder;
	          bidmanager.addBidResponse(bidRequest.placementCode, bidResponse);
	        }
	      }
	    }
	  };
	},
	    AardvarkAdapter = function AardvarkAdapter() {
	  var baseAdapter = adapter.createNew(AARDVARK_BIDDER_CODE);

	  pbjs[AARDVARK_REQUESTS_MAP] = pbjs[AARDVARK_REQUESTS_MAP] || {};

	  baseAdapter.callBids = function (params) {
	    var bidderCode = baseAdapter.getBidderCode(),
	        callbackName = AARDVARK_CALLBACK_NAME;

	    if (bidderCode !== AARDVARK_BIDDER_CODE) callbackName = [AARDVARK_CALLBACK_NAME, bidderCode].join('_');

	    pbjs[AARDVARK_REQUESTS_MAP][bidderCode] = {};

	    registerAardvarkCallback(bidderCode, callbackName);

	    return requestBids(bidderCode, callbackName, params.bids || []);
	  };

	  return {
	    callBids: baseAdapter.callBids,
	    setBidderCode: baseAdapter.setBidderCode,
	    createNew: exports.createNew
	  };
	};

	exports.createNew = function () {
	  return new AardvarkAdapter();
	};

	module.exports = AardvarkAdapter;

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(2);

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
	function Bid(statusCode, bidRequest) {
	  var _bidId = bidRequest && bidRequest.bidId || utils.getUniqueIdentifierStr();
	  var _statusCode = statusCode || 0;

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

	  this.getStatusCode = function () {
	    return _statusCode;
	  };

	  //returns the size of the bid creative. Concatenation of width and height by ‘x’.
	  this.getSize = function () {
	    return this.width + 'x' + this.height;
	  };
	}

	// Bid factory function.
	exports.createBid = function () {
	  return new (Function.prototype.bind.apply(Bid, [null].concat(Array.prototype.slice.call(arguments))))();
	};

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var _utils = __webpack_require__(2);

	var _cpmBucketManager = __webpack_require__(12);

	var CONSTANTS = __webpack_require__(3);
	var AUCTION_END = CONSTANTS.EVENTS.AUCTION_END;
	var utils = __webpack_require__(2);
	var events = __webpack_require__(8);

	var objectType_function = 'function';

	var externalCallbacks = { byAdUnit: [], all: [], oneTime: null, timer: false };
	var _granularity = CONSTANTS.GRANULARITY_OPTIONS.MEDIUM;
	var _customPriceBucket = void 0;
	var defaultBidderSettingsMap = {};

	exports.setCustomPriceBucket = function (customConfig) {
	  _customPriceBucket = customConfig;
	};

	/**
	 * Returns a list of bidders that we haven't received a response yet
	 * @return {array} [description]
	 */
	exports.getTimedOutBidders = function () {
	  return pbjs._bidsRequested.map(getBidderCode).filter(_utils.uniques).filter((function (bidder) {
	    return pbjs._bidsReceived.map(getBidders).filter(_utils.uniques).indexOf(bidder) < 0;
	  }));
	};

	function timestamp() {
	  return new Date().getTime();
	}

	function getBidderCode(bidSet) {
	  return bidSet.bidderCode;
	}

	function getBidders(bid) {
	  return bid.bidder;
	}

	function bidsBackAdUnit(adUnitCode) {
	  var _this = this;

	  var requested = pbjs._bidsRequested.map((function (request) {
	    return request.bids.filter(_utils.adUnitsFilter.bind(_this, pbjs._adUnitCodes)).filter((function (bid) {
	      return bid.placementCode === adUnitCode;
	    }));
	  })).reduce(_utils.flatten, []).map((function (bid) {
	    return bid.bidder === 'indexExchange' ? bid.sizes.length : 1;
	  })).reduce(add, 0);

	  var received = pbjs._bidsReceived.filter((function (bid) {
	    return bid.adUnitCode === adUnitCode;
	  })).length;
	  return requested === received;
	}

	function add(a, b) {
	  return a + b;
	}

	function bidsBackAll() {
	  var requested = pbjs._bidsRequested.map((function (request) {
	    return request.bids;
	  })).reduce(_utils.flatten, []).filter(_utils.adUnitsFilter.bind(this, pbjs._adUnitCodes)).map((function (bid) {
	    return bid.bidder === 'indexExchange' ? bid.sizes.length : 1;
	  })).reduce((function (a, b) {
	    return a + b;
	  }), 0);

	  var received = pbjs._bidsReceived.filter(_utils.adUnitsFilter.bind(this, pbjs._adUnitCodes)).length;

	  return requested === received;
	}

	exports.bidsBackAll = function () {
	  return bidsBackAll();
	};

	function getBidderRequest(bidder, adUnitCode) {
	  return pbjs._bidsRequested.find((function (request) {
	    return request.bids.filter((function (bid) {
	      return bid.bidder === bidder && bid.placementCode === adUnitCode;
	    })).length > 0;
	  })) || { start: null, requestId: null };
	}

	/*
	 *   This function should be called to by the bidder adapter to register a bid response
	 */
	exports.addBidResponse = function (adUnitCode, bid) {
	  if (!adUnitCode) {
	    utils.logWarn('No adUnitCode supplied to addBidResponse, response discarded');
	    return;
	  }

	  if (bid) {
	    var _getBidderRequest = getBidderRequest(bid.bidderCode, adUnitCode),
	        requestId = _getBidderRequest.requestId,
	        start = _getBidderRequest.start;

	    _extends(bid, {
	      requestId: requestId,
	      responseTimestamp: timestamp(),
	      requestTimestamp: start,
	      cpm: bid.cpm || 0,
	      bidder: bid.bidderCode,
	      adUnitCode: adUnitCode
	    });

	    bid.timeToRespond = bid.responseTimestamp - bid.requestTimestamp;

	    if (bid.timeToRespond > pbjs.cbTimeout + pbjs.timeoutBuffer) {
	      var timedOut = true;

	      exports.executeCallback(timedOut);
	    }

	    //emit the bidAdjustment event before bidResponse, so bid response has the adjusted bid value
	    events.emit(CONSTANTS.EVENTS.BID_ADJUSTMENT, bid);

	    //emit the bidResponse event
	    events.emit(CONSTANTS.EVENTS.BID_RESPONSE, bid);

	    //append price strings
	    var priceStringsObj = (0, _cpmBucketManager.getPriceBucketString)(bid.cpm, _customPriceBucket);
	    bid.pbLg = priceStringsObj.low;
	    bid.pbMg = priceStringsObj.med;
	    bid.pbHg = priceStringsObj.high;
	    bid.pbAg = priceStringsObj.auto;
	    bid.pbDg = priceStringsObj.dense;
	    bid.pbCg = priceStringsObj.custom;

	    //if there is any key value pairs to map do here
	    var keyValues = {};
	    if (bid.bidderCode && (bid.cpm > 0 || bid.dealId)) {
	      keyValues = getKeyValueTargetingPairs(bid.bidderCode, bid);
	    }

	    bid.adserverTargeting = keyValues;
	    pbjs._bidsReceived.push(bid);
	  }

	  if (bid && bid.adUnitCode && bidsBackAdUnit(bid.adUnitCode)) {
	    triggerAdUnitCallbacks(bid.adUnitCode);
	  }

	  if (bidsBackAll()) {
	    exports.executeCallback();
	  }
	};

	function getKeyValueTargetingPairs(bidderCode, custBidObj) {
	  var keyValues = {};
	  var bidder_settings = pbjs.bidderSettings;

	  //1) set the keys from "standard" setting or from prebid defaults
	  if (custBidObj && bidder_settings) {
	    //initialize default if not set
	    var standardSettings = getStandardBidderSettings();
	    setKeys(keyValues, standardSettings, custBidObj);
	  }

	  //2) set keys from specific bidder setting override if they exist
	  if (bidderCode && custBidObj && bidder_settings && bidder_settings[bidderCode] && bidder_settings[bidderCode][CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING]) {
	    setKeys(keyValues, bidder_settings[bidderCode], custBidObj);
	    custBidObj.alwaysUseBid = bidder_settings[bidderCode].alwaysUseBid;
	    custBidObj.sendStandardTargeting = bidder_settings[bidderCode].sendStandardTargeting;
	  }

	  //2) set keys from standard setting. NOTE: this API doesn't seem to be in use by any Adapter
	  else if (defaultBidderSettingsMap[bidderCode]) {
	      setKeys(keyValues, defaultBidderSettingsMap[bidderCode], custBidObj);
	      custBidObj.alwaysUseBid = defaultBidderSettingsMap[bidderCode].alwaysUseBid;
	      custBidObj.sendStandardTargeting = defaultBidderSettingsMap[bidderCode].sendStandardTargeting;
	    }

	  return keyValues;
	}

	exports.getKeyValueTargetingPairs = function () {
	  return getKeyValueTargetingPairs.apply(undefined, arguments);
	};

	function setKeys(keyValues, bidderSettings, custBidObj) {
	  var targeting = bidderSettings[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
	  custBidObj.size = custBidObj.getSize();

	  utils._each(targeting, (function (kvPair) {
	    var key = kvPair.key;
	    var value = kvPair.val;

	    if (keyValues[key]) {
	      utils.logWarn('The key: ' + key + ' is getting ovewritten');
	    }

	    if (utils.isFn(value)) {
	      try {
	        value = value(custBidObj);
	      } catch (e) {
	        utils.logError('bidmanager', 'ERROR', e);
	      }
	    }

	    if ((typeof bidderSettings.suppressEmptyKeys !== "undefined" && bidderSettings.suppressEmptyKeys === true || key === "hb_deal") && ( // hb_deal is suppressed automatically if not set
	    utils.isEmptyStr(value) || value === null || value === undefined)) {
	      utils.logInfo("suppressing empty key '" + key + "' from adserver targeting");
	    } else {
	      keyValues[key] = value;
	    }
	  }));

	  return keyValues;
	}

	exports.setPriceGranularity = function setPriceGranularity(granularity) {
	  var granularityOptions = CONSTANTS.GRANULARITY_OPTIONS;
	  if (Object.keys(granularityOptions).filter((function (option) {
	    return granularity === granularityOptions[option];
	  }))) {
	    _granularity = granularity;
	  } else {
	    utils.logWarn('Prebid Warning: setPriceGranularity was called with invalid setting, using' + ' `medium` as default.');
	    _granularity = CONSTANTS.GRANULARITY_OPTIONS.MEDIUM;
	  }
	};

	exports.registerDefaultBidderSetting = function (bidderCode, defaultSetting) {
	  defaultBidderSettingsMap[bidderCode] = defaultSetting;
	};

	exports.executeCallback = function (timedOut) {
	  // if there's still a timeout running, clear it now
	  if (!timedOut && externalCallbacks.timer) {
	    clearTimeout(externalCallbacks.timer);
	  }

	  if (externalCallbacks.all.called !== true) {
	    processCallbacks(externalCallbacks.all);
	    externalCallbacks.all.called = true;

	    if (timedOut) {
	      var timedOutBidders = exports.getTimedOutBidders();

	      if (timedOutBidders.length) {
	        events.emit(CONSTANTS.EVENTS.BID_TIMEOUT, timedOutBidders);
	      }
	    }
	  }

	  //execute one time callback
	  if (externalCallbacks.oneTime) {
	    events.emit(AUCTION_END);
	    try {
	      processCallbacks([externalCallbacks.oneTime]);
	    } catch (e) {
	      utils.logError('Error executing bidsBackHandler', null, e);
	    } finally {
	      externalCallbacks.oneTime = null;
	      externalCallbacks.timer = false;
	      pbjs.clearAuction();
	    }
	  }
	};

	exports.externalCallbackReset = function () {
	  externalCallbacks.all.called = false;
	};

	function triggerAdUnitCallbacks(adUnitCode) {
	  //todo : get bid responses and send in args
	  var singleAdUnitCode = [adUnitCode];
	  processCallbacks(externalCallbacks.byAdUnit, singleAdUnitCode);
	}

	function processCallbacks(callbackQueue, singleAdUnitCode) {
	  var _this2 = this;

	  if (utils.isArray(callbackQueue)) {
	    callbackQueue.forEach((function (callback) {
	      var adUnitCodes = singleAdUnitCode || pbjs._adUnitCodes;
	      var bids = [pbjs._bidsReceived.filter(_utils.adUnitsFilter.bind(_this2, adUnitCodes)).reduce(groupByPlacement, {})];

	      callback.apply(pbjs, bids);
	    }));
	  }
	}

	/**
	 * groupByPlacement is a reduce function that converts an array of Bid objects
	 * to an object with placement codes as keys, with each key representing an object
	 * with an array of `Bid` objects for that placement
	 * @returns {*} as { [adUnitCode]: { bids: [Bid, Bid, Bid] } }
	 */
	function groupByPlacement(bidsByPlacement, bid) {
	  if (!bidsByPlacement[bid.adUnitCode]) bidsByPlacement[bid.adUnitCode] = { bids: [] };

	  bidsByPlacement[bid.adUnitCode].bids.push(bid);

	  return bidsByPlacement;
	}

	/**
	 * Add a one time callback, that is discarded after it is called
	 * @param {Function} callback
	 * @param timer Timer to clear if callback is triggered before timer time's out
	 */
	exports.addOneTimeCallback = function (callback, timer) {
	  externalCallbacks.oneTime = callback;
	  externalCallbacks.timer = timer;
	};

	exports.addCallback = function (id, callback, cbEvent) {
	  callback.id = id;
	  if (CONSTANTS.CB.TYPE.ALL_BIDS_BACK === cbEvent) {
	    externalCallbacks.all.push(callback);
	  } else if (CONSTANTS.CB.TYPE.AD_UNIT_BIDS_BACK === cbEvent) {
	    externalCallbacks.byAdUnit.push(callback);
	  }
	};

	//register event for bid adjustment
	events.on(CONSTANTS.EVENTS.BID_ADJUSTMENT, (function (bid) {
	  adjustBids(bid);
	}));

	function adjustBids(bid) {
	  var code = bid.bidderCode;
	  var bidPriceAdjusted = bid.cpm;
	  if (code && pbjs.bidderSettings && pbjs.bidderSettings[code]) {
	    if (_typeof(pbjs.bidderSettings[code].bidCpmAdjustment) === objectType_function) {
	      try {
	        bidPriceAdjusted = pbjs.bidderSettings[code].bidCpmAdjustment.call(null, bid.cpm, utils.extend({}, bid));
	      } catch (e) {
	        utils.logError('Error during bid adjustment', 'bidmanager.js', e);
	      }
	    }
	  }

	  if (bidPriceAdjusted >= 0) {
	    bid.cpm = bidPriceAdjusted;
	  }
	}

	exports.adjustBids = function () {
	  return adjustBids.apply(undefined, arguments);
	};

	function getStandardBidderSettings() {
	  var bidder_settings = pbjs.bidderSettings;
	  if (!bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD]) {
	    bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD] = {
	      adserverTargeting: [{
	        key: 'hb_bidder',
	        val: function val(bidResponse) {
	          return bidResponse.bidderCode;
	        }
	      }, {
	        key: 'hb_adid',
	        val: function val(bidResponse) {
	          return bidResponse.adId;
	        }
	      }, {
	        key: 'hb_pb',
	        val: function val(bidResponse) {
	          if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.AUTO) {
	            return bidResponse.pbAg;
	          } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.DENSE) {
	            return bidResponse.pbDg;
	          } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.LOW) {
	            return bidResponse.pbLg;
	          } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.MEDIUM) {
	            return bidResponse.pbMg;
	          } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.HIGH) {
	            return bidResponse.pbHg;
	          } else if (_granularity === CONSTANTS.GRANULARITY_OPTIONS.CUSTOM) {
	            return bidResponse.pbCg;
	          }
	        }
	      }, {
	        key: 'hb_size',
	        val: function val(bidResponse) {
	          return bidResponse.size;
	        }
	      }, {
	        key: 'hb_deal',
	        val: function val(bidResponse) {
	          return bidResponse.dealId;
	        }
	      }]
	    };
	  }
	  return bidder_settings[CONSTANTS.JSON_MAPPING.BD_SETTING_STANDARD];
	}

	function getStandardBidderAdServerTargeting() {
	  return getStandardBidderSettings()[CONSTANTS.JSON_MAPPING.ADSERVER_TARGETING];
	}

	exports.getStandardBidderAdServerTargeting = getStandardBidderAdServerTargeting;

/***/ }),
/* 12 */
/***/ (function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	var _defaultPrecision = 2;
	var _lgPriceConfig = {
	  'buckets': [{
	    'min': 0,
	    'max': 5,
	    'increment': 0.5
	  }]
	};
	var _mgPriceConfig = {
	  'buckets': [{
	    'min': 0,
	    'max': 20,
	    'increment': 0.1
	  }]
	};
	var _hgPriceConfig = {
	  'buckets': [{
	    'min': 0,
	    'max': 20,
	    'increment': 0.01
	  }]
	};
	var _densePriceConfig = {
	  'buckets': [{
	    'min': 0,
	    'max': 3,
	    'increment': 0.01
	  }, {
	    'min': 3,
	    'max': 8,
	    'increment': 0.05
	  }, {
	    'min': 8,
	    'max': 20,
	    'increment': 0.5
	  }]
	};
	var _autoPriceConfig = {
	  'buckets': [{
	    'min': 0,
	    'max': 5,
	    'increment': 0.05
	  }, {
	    'min': 5,
	    'max': 10,
	    'increment': 0.1
	  }, {
	    'min': 10,
	    'max': 20,
	    'increment': 0.5
	  }]
	};

	function getPriceBucketString(cpm, customConfig) {
	  var cpmFloat = 0;
	  cpmFloat = parseFloat(cpm);
	  if (isNaN(cpmFloat)) {
	    cpmFloat = '';
	  }

	  return {
	    low: cpmFloat === '' ? '' : getCpmStringValue(cpm, _lgPriceConfig),
	    med: cpmFloat === '' ? '' : getCpmStringValue(cpm, _mgPriceConfig),
	    high: cpmFloat === '' ? '' : getCpmStringValue(cpm, _hgPriceConfig),
	    auto: cpmFloat === '' ? '' : getCpmStringValue(cpm, _autoPriceConfig),
	    dense: cpmFloat === '' ? '' : getCpmStringValue(cpm, _densePriceConfig),
	    custom: cpmFloat === '' ? '' : getCpmStringValue(cpm, customConfig)
	  };
	}

	function getCpmStringValue(cpm, config) {
	  var cpmStr = '';
	  if (!isValidePriceConfig(config)) {
	    return cpmStr;
	  }
	  var cap = config.buckets.reduce((function (prev, curr) {
	    if (prev.max > curr.max) {
	      return prev;
	    }
	    return curr;
	  }), {
	    'max': 0
	  });
	  var bucket = config.buckets.find((function (bucket) {
	    if (cpm > cap.max) {
	      var precision = bucket.precision || _defaultPrecision;
	      cpmStr = bucket.max.toFixed(precision);
	    } else if (cpm <= bucket.max && cpm >= bucket.min) {
	      return bucket;
	    }
	  }));
	  if (bucket) {
	    cpmStr = getCpmTarget(cpm, bucket.increment, bucket.precision);
	  }
	  return cpmStr;
	}

	function isValidePriceConfig(config) {
	  if (!config || !config.buckets || !Array.isArray(config.buckets)) {
	    return false;
	  }
	  var isValid = true;
	  config.buckets.forEach((function (bucket) {
	    if (typeof bucket.min === 'undefined' || !bucket.max || !bucket.increment) {
	      isValid = false;
	    }
	  }));
	  return isValid;
	}

	function getCpmTarget(cpm, increment, precision) {
	  if (!precision) {
	    precision = _defaultPrecision;
	  }
	  var bucketSize = 1 / increment;
	  return (Math.floor(cpm * bucketSize) / bucketSize).toFixed(precision);
	}

	exports.getPriceBucketString = getPriceBucketString;
	exports.isValidePriceConfig = isValidePriceConfig;

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(2);
	var _requestCache = {};

	//add a script tag to the page, used to add /jpt call to page
	exports.loadScript = function (tagSrc, callback, cacheRequest) {
	  //var noop = () => {};
	  //
	  //callback = callback || noop;
	  if (!tagSrc) {
	    utils.logError('Error attempting to request empty URL', 'adloader.js:loadScript');
	    return;
	  }

	  if (cacheRequest) {
	    if (_requestCache[tagSrc]) {
	      if (callback && typeof callback === 'function') {
	        if (_requestCache[tagSrc].loaded) {
	          //invokeCallbacks immediately
	          callback();
	        } else {
	          //queue the callback
	          _requestCache[tagSrc].callbacks.push(callback);
	        }
	      }
	    } else {
	      _requestCache[tagSrc] = {
	        loaded: false,
	        callbacks: []
	      };
	      if (callback && typeof callback === 'function') {
	        _requestCache[tagSrc].callbacks.push(callback);
	      }

	      requestResource(tagSrc, (function () {
	        _requestCache[tagSrc].loaded = true;
	        try {
	          for (var i = 0; i < _requestCache[tagSrc].callbacks.length; i++) {
	            _requestCache[tagSrc].callbacks[i]();
	          }
	        } catch (e) {
	          utils.logError('Error executing callback', 'adloader.js:loadScript', e);
	        }
	      }));
	    }
	  }

	  //trigger one time request
	  else {
	      requestResource(tagSrc, callback);
	    }
	};

	function requestResource(tagSrc, callback) {
	  var jptScript = document.createElement('script');
	  jptScript.type = 'text/javascript';
	  jptScript.async = true;

	  // Execute a callback if necessary
	  if (callback && typeof callback === 'function') {
	    if (jptScript.readyState) {
	      jptScript.onreadystatechange = function () {
	        if (jptScript.readyState === 'loaded' || jptScript.readyState === 'complete') {
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

	  jptScript.src = tagSrc;

	  //add the new script tag to the page
	  var elToAppend = document.getElementsByTagName('head');
	  elToAppend = elToAppend.length ? elToAppend : document.getElementsByTagName('body');
	  if (elToAppend.length) {
	    elToAppend = elToAppend[0];
	    elToAppend.insertBefore(jptScript, elToAppend.firstChild);
	  }
	}

	//track a impbus tracking pixel
	//TODO: Decide if tracking via AJAX is sufficent, or do we need to
	//run impression trackers via page pixels?
	exports.trackPixel = function (pixelUrl) {
	  var delimiter = void 0;
	  var trackingPixel = void 0;

	  if (!pixelUrl || typeof pixelUrl !== 'string') {
	    utils.logMessage('Missing or invalid pixelUrl.');
	    return;
	  }

	  delimiter = pixelUrl.indexOf('?') > 0 ? '&' : '?';

	  //add a cachebuster so we don't end up dropping any impressions
	  trackingPixel = pixelUrl + delimiter + 'rnd=' + Math.floor(Math.random() * 1E7);
	  new Image().src = trackingPixel;
	  return trackingPixel;
	};

/***/ }),
/* 14 */
/***/ (function(module, exports) {

	"use strict";

	function Adapter(code) {
	  var bidderCode = code;

	  function setBidderCode(code) {
	    bidderCode = code;
	  }

	  function getBidderCode() {
	    return bidderCode;
	  }

	  function callBids() {}

	  return {
	    callBids: callBids,
	    setBidderCode: setBidderCode,
	    getBidderCode: getBidderCode
	  };
	}

	exports.createNew = function (bidderCode) {
	  return new Adapter(bidderCode);
	};

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	/**
	 * Adapter for requesting bids from Adblade
	 * To request an Adblade Header partner account
	 * or for additional integration support please
	 * register at http://www.adblade.com.
	 */
	var AdbladeAdapter = function AdbladeAdapter() {
	  'use strict';

	  var BIDDER_CODE = 'adblade';
	  var BASE_URI = '//rtb.adblade.com/prebidjs/bid?';
	  var DEFAULT_BID_FLOOR = 0.0000000001;

	  function _callBids(params) {
	    var bids = params.bids || [],
	        referrer = utils.getTopWindowUrl(),
	        loc = utils.getTopWindowLocation(),
	        domain = loc.hostname,
	        partnerId = 0,
	        bidRequests = {};

	    if (bids.length > 0) {
	      partnerId = '' + bids[0].params.partnerId;
	    }

	    utils._each(bids, (function (bid) {
	      // make sure the "sizes" are an array of arrays
	      if (!(bid.sizes[0] instanceof Array)) {
	        bid.sizes = [bid.sizes];
	      }
	      utils._each(bid.sizes, (function (size) {
	        var key = size[0] + 'x' + size[1];

	        bidRequests[key] = bidRequests[key] || {
	          'site': {
	            'id': partnerId,
	            'page': referrer,
	            'domain': domain,
	            'publisher': {
	              'id': partnerId,
	              'name': referrer,
	              'domain': domain
	            }
	          },
	          'id': params.requestId,
	          'imp': [],
	          'device': {
	            'ua': window.navigator.userAgent
	          },
	          'cur': ['USD'],
	          'user': {}
	        };

	        bidRequests[key].imp.push({
	          'id': bid.bidId,
	          'bidfloor': bid.params.bidFloor || DEFAULT_BID_FLOOR,
	          'tag': bid.placementCode,
	          'banner': {
	            'w': size[0],
	            'h': size[1]
	          },
	          'secure': 0 + (loc.protocol === 'https')
	        });
	      }));
	    }));

	    utils._each(bidRequests, (function (bidRequest) {
	      adloader.loadScript(utils.tryAppendQueryString(utils.tryAppendQueryString(BASE_URI, 'callback', 'pbjs.adbladeResponse'), 'json', JSON.stringify(bidRequest)));
	    }));
	  }

	  pbjs.adbladeResponse = function (response) {
	    var auctionIdRe = /\$(%7B|\{)AUCTION_ID(%7D|\})/gi,
	        auctionPriceRe = /\$(%7B|\{)AUCTION_PRICE(%7D|\})/gi,
	        clickUrlRe = /\$(%7B|\{)CLICK_URL(%7D|\})/gi;

	    if (typeof response === 'undefined' || !response.hasOwnProperty('seatbid') || utils.isEmpty(response.seatbid)) {
	      // handle empty bids
	      var bidsRequested = pbjs._bidsRequested.find((function (bidSet) {
	        return bidSet.bidderCode === BIDDER_CODE;
	      })).bids;
	      if (bidsRequested.length > 0) {
	        var bid = bidfactory.createBid(2);
	        bid.bidderCode = BIDDER_CODE;
	        bidmanager.addBidResponse(bidsRequested[0].placementCode, bid);
	      }

	      return;
	    }

	    utils._each(response.seatbid, (function (seatbid) {
	      utils._each(seatbid.bid, (function (seatbidBid) {
	        var bidRequest = utils.getBidRequest(seatbidBid.impid),
	            ad = seatbidBid.adm + utils.createTrackPixelHtml(seatbidBid.nurl);

	        ad = ad.replace(auctionIdRe, seatbidBid.impid);
	        ad = ad.replace(clickUrlRe, '');
	        ad = ad.replace(auctionPriceRe, seatbidBid.price);

	        var bid = bidfactory.createBid(1);

	        bid.bidderCode = BIDDER_CODE;
	        bid.cpm = seatbidBid.price;
	        bid.ad = ad;
	        bid.width = seatbidBid.w;
	        bid.height = seatbidBid.h;
	        bidmanager.addBidResponse(bidRequest.placementCode, bid);
	      }));
	    }));
	  };

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = AdbladeAdapter;

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var adBundAdapter = function adBundAdapter() {
	  var timezone = new Date().getTimezoneOffset();
	  var bidAPIs = ['http://us-east-engine.adbund.xyz/prebid/ad/get', 'http://us-west-engine.adbund.xyz/prebid/ad/get'];
	  //Based on the time zone to select the interface to the server
	  var bidAPI = bidAPIs[timezone < 0 ? 0 : 1];

	  function _stringify(param) {
	    var result = [];
	    var key;
	    for (key in param) {
	      if (param.hasOwnProperty(key)) {
	        result.push(key + '=' + encodeURIComponent(param[key]));
	      }
	    }
	    return result.join('&');
	  }

	  function _createCallback(bid) {
	    return function (data) {
	      var response;
	      if (data && data.cpm) {
	        response = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
	        response.bidderCode = 'adbund';
	        _extends(response, data);
	      } else {
	        response = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
	        response.bidderCode = 'adbund';
	      }
	      bidmanager.addBidResponse(bid.placementCode, response);
	    };
	  }

	  function _requestBids(bid) {
	    var info = {
	      referrer: utils.getTopWindowUrl(),
	      domain: utils.getTopWindowLocation().hostname,
	      ua: window.navigator.userAgent
	    };
	    var param = _extends({}, bid.params, info);
	    param.sizes = JSON.stringify(param.sizes || bid.sizes);
	    param.callback = 'pbjs.adbundResponse';
	    pbjs.adbundResponse = _createCallback(bid);
	    adloader.loadScript(bidAPI + '?' + _stringify(param));
	  }

	  function _callBids(params) {
	    (params.bids || []).forEach((function (bid) {
	      _requestBids(bid);
	    }));
	  }

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = adBundAdapter;

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	/**
	 * @overview AdButler Prebid.js adapter.
	 * @author dkharton
	 */

	'use strict';

	var utils = __webpack_require__(2);
	var adloader = __webpack_require__(13);
	var bidmanager = __webpack_require__(11);
	var bidfactory = __webpack_require__(10);

	var AdButlerAdapter = function AdButlerAdapter() {

	  function _callBids(params) {

	    var bids = params.bids || [],
	        callbackData = {},
	        zoneCount = {},
	        pageID = Math.floor(Math.random() * 10e6);

	    //Build and send bid requests
	    for (var i = 0; i < bids.length; i++) {
	      var bid = bids[i],
	          zoneID = utils.getBidIdParameter('zoneID', bid.params),
	          callbackID;

	      if (!(zoneID in zoneCount)) {
	        zoneCount[zoneID] = 0;
	      }

	      //build callbackID to get placementCode later  
	      callbackID = zoneID + '_' + zoneCount[zoneID];

	      callbackData[callbackID] = {};
	      callbackData[callbackID].bidId = bid.bidId;

	      var adRequest = buildRequest(bid, zoneCount[zoneID], pageID);
	      zoneCount[zoneID]++;

	      adloader.loadScript(adRequest);
	    }

	    //Define callback function for bid responses
	    pbjs.adbutlerCB = function (aBResponseObject) {

	      var bidResponse = {},
	          callbackID = aBResponseObject.zone_id + '_' + aBResponseObject.place,
	          width = parseInt(aBResponseObject.width),
	          height = parseInt(aBResponseObject.height),
	          isCorrectSize = false,
	          isCorrectCPM = true,
	          CPM,
	          minCPM,
	          maxCPM,
	          bidObj = callbackData[callbackID] ? utils.getBidRequest(callbackData[callbackID].bidId) : null;

	      if (bidObj) {

	        if (aBResponseObject.status === 'SUCCESS') {
	          CPM = aBResponseObject.cpm;
	          minCPM = utils.getBidIdParameter('minCPM', bidObj.params);
	          maxCPM = utils.getBidIdParameter('maxCPM', bidObj.params);

	          //Ensure response CPM is within the given bounds
	          if (minCPM !== '' && CPM < parseFloat(minCPM)) {
	            isCorrectCPM = false;
	          }
	          if (maxCPM !== '' && CPM > parseFloat(maxCPM)) {
	            isCorrectCPM = false;
	          }

	          //Ensure that response ad matches one of the placement sizes.  
	          utils._each(bidObj.sizes, (function (size) {
	            if (width === size[0] && height === size[1]) {
	              isCorrectSize = true;
	            }
	          }));

	          if (isCorrectCPM && isCorrectSize) {

	            bidResponse = bidfactory.createBid(1, bidObj);
	            bidResponse.bidderCode = 'adbutler';
	            bidResponse.cpm = CPM;
	            bidResponse.width = width;
	            bidResponse.height = height;
	            bidResponse.ad = aBResponseObject.ad_code;
	            bidResponse.ad += addTrackingPixels(aBResponseObject.tracking_pixels);
	          } else {

	            bidResponse = bidfactory.createBid(2, bidObj);
	            bidResponse.bidderCode = 'adbutler';
	          }
	        } else {

	          bidResponse = bidfactory.createBid(2, bidObj);
	          bidResponse.bidderCode = 'adbutler';
	        }

	        bidmanager.addBidResponse(bidObj.placementCode, bidResponse);
	      }
	    };
	  }

	  function buildRequest(bid, adIndex, pageID) {
	    var accountID = utils.getBidIdParameter('accountID', bid.params);
	    var zoneID = utils.getBidIdParameter('zoneID', bid.params);
	    var keyword = utils.getBidIdParameter('keyword', bid.params);

	    var requestURI = location.protocol + '//servedbyadbutler.com/adserve/;type=hbr;';
	    requestURI += 'ID=' + encodeURIComponent(accountID) + ';';
	    requestURI += 'setID=' + encodeURIComponent(zoneID) + ';';
	    requestURI += 'pid=' + encodeURIComponent(pageID) + ';';
	    requestURI += 'place=' + encodeURIComponent(adIndex) + ';';

	    //append the keyword for targeting if one was passed in  
	    if (keyword !== '') {
	      requestURI += 'kw=' + encodeURIComponent(keyword) + ';';
	    }
	    requestURI += 'jsonpfunc=pbjs.adbutlerCB;';
	    requestURI += 'click=CLICK_MACRO_PLACEHOLDER';

	    return requestURI;
	  }

	  function addTrackingPixels(trackingPixels) {
	    var trackingPixelMarkup = '';
	    utils._each(trackingPixels, (function (pixelURL) {

	      var trackingPixel = '<img height="0" width="0" border="0" style="display:none;" src="';
	      trackingPixel += pixelURL;
	      trackingPixel += '">';

	      trackingPixelMarkup += trackingPixel;
	    }));
	    return trackingPixelMarkup;
	  }

	  // Export the callBids function, so that prebid.js can execute this function
	  // when the page asks to send out bid requests.
	  return {
	    callBids: _callBids
	  };
	};

	module.exports = AdButlerAdapter;

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);
	var utils = __webpack_require__(2);
	var CONSTANTS = __webpack_require__(3);

	module.exports = function () {
	  var req_url_base = 'https://rex.adequant.com/rex/c2s_prebid?';

	  function _callBids(params) {
	    var req_url = [];
	    var publisher_id = null;
	    var sizes = [];
	    var cats = null;
	    var replies = [];
	    var placements = {};

	    var bids = params.bids || [];
	    for (var i = 0; i < bids.length; i++) {
	      var bid_request = bids[i];
	      var br_params = bid_request.params || {};
	      placements[bid_request.placementCode] = true;

	      publisher_id = br_params.publisher_id.toString() || publisher_id;
	      var bidfloor = br_params.bidfloor || 0.01;
	      cats = br_params.cats || cats;
	      if ((typeof cats === 'undefined' ? 'undefined' : _typeof(cats)) === utils.objectType_string) {
	        cats = cats.split(' ');
	      }
	      var br_sizes = utils.parseSizesInput(bid_request.sizes);
	      for (var j = 0; j < br_sizes.length; j++) {
	        sizes.push(br_sizes[j] + '_' + bidfloor);
	        replies.push(bid_request.placementCode);
	      }
	    }
	    // send out 1 bid request for all bids
	    if (publisher_id) {
	      req_url.push('a=' + publisher_id);
	    }
	    if (cats) {
	      req_url.push('c=' + cats.join('+'));
	    }
	    if (sizes) {
	      req_url.push('s=' + sizes.join('+'));
	    }

	    adloader.loadScript(req_url_base + req_url.join('&'), (function () {
	      process_bids(replies, placements);
	    }));
	  }

	  function process_bids(replies, placements) {
	    var placement_code,
	        bid,
	        adequant_creatives = window.adequant_creatives;
	    if (adequant_creatives && adequant_creatives.seatbid) {
	      for (var i = 0; i < adequant_creatives.seatbid.length; i++) {
	        var bid_response = adequant_creatives.seatbid[i].bid[0];
	        placement_code = replies[parseInt(bid_response.impid, 10) - 1];
	        if (!placement_code || !placements[placement_code]) {
	          continue;
	        }

	        bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
	        bid.bidderCode = 'adequant';
	        bid.cpm = bid_response.price;
	        bid.ad = bid_response.adm;
	        bid.width = bid_response.w;
	        bid.height = bid_response.h;
	        bidmanager.addBidResponse(placement_code, bid);
	        placements[placement_code] = false;
	      }
	    }
	    for (placement_code in placements) {
	      if (placements[placement_code]) {
	        bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
	        bid.bidderCode = 'adequant';
	        bidmanager.addBidResponse(placement_code, bid);
	        utils.logMessage('No bid response from Adequant for placement code ' + placement_code);
	      }
	    }
	  }

	  return {
	    callBids: _callBids
	  };
	};

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(2);
	var adloader = __webpack_require__(13);
	var bidmanager = __webpack_require__(11);
	var bidfactory = __webpack_require__(10);
	var STATUSCODES = __webpack_require__(3).STATUS;

	function AdformAdapter() {

	  return {
	    callBids: _callBids
	  };

	  function _callBids(params) {
	    var bid, _value, _key, i, j, k, l;
	    var bids = params.bids;
	    var request = [];
	    var callbackName = '_adf_' + utils.getUniqueIdentifierStr();
	    var globalParams = [['adxDomain', 'adx.adform.net'], ['url', null], ['tid', null], ['callback', 'pbjs.' + callbackName]];

	    for (i = 0, l = bids.length; i < l; i++) {
	      bid = bids[i];

	      for (j = 0, k = globalParams.length; j < k; j++) {
	        _key = globalParams[j][0];
	        _value = bid[_key] || bid.params[_key];
	        if (_value) {
	          bid[_key] = bid.params[_key] = null;
	          globalParams[j][1] = _value;
	        }
	      }

	      request.push(formRequestUrl(bid.params));
	    }

	    request.unshift('//' + globalParams[0][1] + '/adx/?rp=4');

	    for (i = 1, l = globalParams.length; i < l; i++) {
	      _key = globalParams[i][0];
	      _value = globalParams[i][1];
	      if (_value) {
	        request.push(globalParams[i][0] + '=' + encodeURIComponent(_value));
	      }
	    }

	    pbjs[callbackName] = handleCallback(bids);

	    adloader.loadScript(request.join('&'));
	  }

	  function formRequestUrl(reqData) {
	    var key;
	    var url = [];

	    for (key in reqData) {
	      if (reqData.hasOwnProperty(key) && reqData[key]) url.push(key, '=', reqData[key], '&');
	    }

	    return encode64(url.join('').slice(0, -1));
	  }

	  function handleCallback(bids) {
	    return function handleResponse(adItems) {
	      var bidObject;
	      var bidder = 'adform';
	      var adItem;
	      var bid;
	      for (var i = 0, l = adItems.length; i < l; i++) {
	        adItem = adItems[i];
	        bid = bids[i];
	        if (adItem && adItem.response === 'banner' && verifySize(adItem, bid.sizes)) {

	          bidObject = bidfactory.createBid(STATUSCODES.GOOD, bid);
	          bidObject.bidderCode = bidder;
	          bidObject.cpm = adItem.win_bid;
	          bidObject.cur = adItem.win_cur;
	          bidObject.ad = adItem.banner;
	          bidObject.width = adItem.width;
	          bidObject.height = adItem.height;
	          bidObject.dealId = adItem.deal_id;
	          bidmanager.addBidResponse(bid.placementCode, bidObject);
	        } else {
	          bidObject = bidfactory.createBid(STATUSCODES.NO_BID, bid);
	          bidObject.bidderCode = bidder;
	          bidmanager.addBidResponse(bid.placementCode, bidObject);
	        }
	      }
	    };

	    function verifySize(adItem, validSizes) {
	      for (var j = 0, k = validSizes.length; j < k; j++) {
	        if (adItem.width === validSizes[j][0] && adItem.height === validSizes[j][1]) {
	          return true;
	        }
	      }

	      return false;
	    }
	  }

	  function encode64(input) {
	    var out = [];
	    var chr1;
	    var chr2;
	    var chr3;
	    var enc1;
	    var enc2;
	    var enc3;
	    var enc4;
	    var i = 0;
	    var _keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_=';

	    input = utf8_encode(input);

	    while (i < input.length) {

	      chr1 = input.charCodeAt(i++);
	      chr2 = input.charCodeAt(i++);
	      chr3 = input.charCodeAt(i++);

	      enc1 = chr1 >> 2;
	      enc2 = (chr1 & 3) << 4 | chr2 >> 4;
	      enc3 = (chr2 & 15) << 2 | chr3 >> 6;
	      enc4 = chr3 & 63;

	      if (isNaN(chr2)) {
	        enc3 = enc4 = 64;
	      } else if (isNaN(chr3)) {
	        enc4 = 64;
	      }

	      out.push(_keyStr.charAt(enc1), _keyStr.charAt(enc2));
	      if (enc3 !== 64) out.push(_keyStr.charAt(enc3));
	      if (enc4 !== 64) out.push(_keyStr.charAt(enc4));
	    }

	    return out.join('');
	  }

	  function utf8_encode(string) {
	    string = string.replace(/\r\n/g, '\n');
	    var utftext = '';

	    for (var n = 0; n < string.length; n++) {

	      var c = string.charCodeAt(n);

	      if (c < 128) {
	        utftext += String.fromCharCode(c);
	      } else if (c > 127 && c < 2048) {
	        utftext += String.fromCharCode(c >> 6 | 192);
	        utftext += String.fromCharCode(c & 63 | 128);
	      } else {
	        utftext += String.fromCharCode(c >> 12 | 224);
	        utftext += String.fromCharCode(c >> 6 & 63 | 128);
	        utftext += String.fromCharCode(c & 63 | 128);
	      }
	    }

	    return utftext;
	  }
	}

	module.exports = AdformAdapter;

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _bidmanager = __webpack_require__(11);

	var _bidmanager2 = _interopRequireDefault(_bidmanager);

	var _bidfactory = __webpack_require__(10);

	var _bidfactory2 = _interopRequireDefault(_bidfactory);

	var _utils = __webpack_require__(2);

	var utils = _interopRequireWildcard(_utils);

	var _ajax = __webpack_require__(21);

	var _adapter = __webpack_require__(14);

	var _adapter2 = _interopRequireDefault(_adapter);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	/**
	 * Adapter for requesting bids from AdKernel white-label platform
	 * @class
	 */
	var AdKernelAdapter = function AdKernelAdapter() {
	  var AJAX_REQ_PARAMS = {
	    contentType: 'text/plain',
	    withCredentials: true,
	    method: 'GET'
	  };
	  var EMPTY_BID_RESPONSE = { 'seatbid': [{ 'bid': [] }] };

	  var baseAdapter = _adapter2['default'].createNew('adkernel');

	  /**
	   * Helper object to build multiple bid requests in case of multiple zones/ad-networks
	   * @constructor
	   */
	  function RtbRequestDispatcher() {
	    var _dispatch = {};
	    var originalBids = {};
	    var site = createSite();
	    var syncedHostZones = {};

	    //translate adunit info into rtb impression dispatched by host/zone
	    this.addImp = function (bid) {
	      var host = bid.params.host;
	      var zone = bid.params.zoneId;
	      var size = bid.sizes[0];
	      var bidId = bid.bidId;

	      if (!(host in _dispatch)) {
	        _dispatch[host] = {};
	      }
	      /* istanbul ignore else  */
	      if (!(zone in _dispatch[host])) {
	        _dispatch[host][zone] = [];
	      }
	      var imp = { 'id': bidId, 'banner': { 'w': size[0], 'h': size[1] } };
	      if (utils.getTopWindowLocation().protocol === 'https:') {
	        imp.secure = 1;
	      }
	      //save rtb impression for specified ad-network host and zone
	      _dispatch[host][zone].push(imp);
	      originalBids[bidId] = bid;
	      //perform user-sync
	      if (!(host in syncedHostZones)) {
	        syncedHostZones[host] = [];
	      }
	      if (syncedHostZones[host].indexOf(zone) === -1) {
	        syncedHostZones[host].push(zone);
	        insertUserSync(host, zone);
	      }
	    };

	    function insertUserSync(host, zone) {
	      var iframe = utils.createInvisibleIframe();
	      iframe.src = '//' + host + '/user-sync?zone=' + zone;
	      try {
	        document.body.appendChild(iframe);
	      } catch (error) {
	        utils.logError(error);
	      }
	    }

	    /**
	     *  Main function to get bid requests
	     */
	    this.dispatch = function (callback) {
	      utils._each(_dispatch, (function (zones, host) {
	        utils.logMessage('processing network ' + host);
	        utils._each(zones, (function (impressions, zone) {
	          utils.logMessage('processing zone ' + zone);
	          dispatchRtbRequest(host, zone, impressions, callback);
	        }));
	      }));
	    };

	    function dispatchRtbRequest(host, zone, impressions, callback) {
	      var url = buildEndpointUrl(host);
	      var rtbRequest = buildRtbRequest(impressions);
	      var params = buildRequestParams(zone, rtbRequest);
	      (0, _ajax.ajax)(url, (function (bidResp) {
	        bidResp = bidResp === '' ? EMPTY_BID_RESPONSE : JSON.parse(bidResp);
	        utils._each(rtbRequest.imp, (function (imp) {
	          var bidFound = false;
	          utils._each(bidResp.seatbid[0].bid, (function (bid) {
	            /* istanbul ignore else */
	            if (!bidFound && bid.impid === imp.id) {
	              bidFound = true;
	              callback(originalBids[imp.id], imp, bid);
	            }
	          }));
	          if (!bidFound) {
	            callback(originalBids[imp.id], imp);
	          }
	        }));
	      }), params, AJAX_REQ_PARAMS);
	    }

	    /**
	     * Builds complete rtb bid request
	     * @param imps collection of impressions
	     */
	    function buildRtbRequest(imps) {
	      return {
	        'id': utils.getUniqueIdentifierStr(),
	        'imp': imps,
	        'site': site,
	        'at': 1,
	        'device': {
	          'ip': 'caller',
	          'ua': 'caller'
	        }
	      };
	    }

	    /**
	     * Build ad-network specific endpoint url
	     */
	    function buildEndpointUrl(host) {
	      return window.location.protocol + '//' + host + '/rtbg';
	    }

	    function buildRequestParams(zone, rtbReq) {
	      return {
	        'zone': encodeURIComponent(zone),
	        'ad_type': 'rtb',
	        'r': encodeURIComponent(JSON.stringify(rtbReq))
	      };
	    }
	  }

	  /**
	   *  Main module export function implementation
	   */
	  baseAdapter.callBids = function (params) {
	    var bids = params.bids || [];
	    processBids(bids);
	  };

	  /**
	   *  Process all bids grouped by network/zone
	   */
	  function processBids(bids) {
	    var dispatcher = new RtbRequestDispatcher();
	    //process individual bids
	    utils._each(bids, (function (bid) {
	      if (!validateBidParams(bid.params)) {
	        utils.logError('Incorrect configuration for adkernel bidder: ' + bid.params);
	        _bidmanager2['default'].addBidResponse(bid.placementCode, createEmptyBidObject(bid));
	      } else {
	        dispatcher.addImp(bid);
	      }
	    }));
	    //process bids grouped into bidrequests
	    dispatcher.dispatch((function (bid, imp, bidResp) {
	      var adUnitId = bid.placementCode;
	      if (bidResp) {
	        utils.logMessage('got response for ' + adUnitId);
	        _bidmanager2['default'].addBidResponse(adUnitId, createBidObject(bidResp, bid, imp.banner.w, imp.banner.h));
	      } else {
	        utils.logMessage('got empty response for ' + adUnitId);
	        _bidmanager2['default'].addBidResponse(adUnitId, createEmptyBidObject(bid));
	      }
	    }));
	  }

	  /**
	   *  Create bid object for the bid manager
	   */
	  function createBidObject(resp, bid, width, height) {
	    return utils.extend(_bidfactory2['default'].createBid(1, bid), {
	      bidderCode: bid.bidder,
	      ad: formatAdMarkup(resp),
	      width: width,
	      height: height,
	      cpm: parseFloat(resp.price)
	    });
	  }

	  /**
	   * Create empty bid object for the bid manager
	   */
	  function createEmptyBidObject(bid) {
	    return utils.extend(_bidfactory2['default'].createBid(2, bid), {
	      bidderCode: bid.bidder
	    });
	  }

	  /**
	   *  Format creative with optional nurl call
	   */
	  function formatAdMarkup(bid) {
	    var adm = bid.adm;
	    if ('nurl' in bid) {
	      adm += utils.createTrackPixelHtml(bid.nurl);
	    }
	    return adm;
	  }

	  function validateBidParams(params) {
	    return typeof params.host !== 'undefined' && typeof params.zoneId !== 'undefined';
	  }

	  /**
	   * Creates site description object
	   */
	  function createSite() {
	    var location = utils.getTopWindowLocation();
	    return {
	      'domain': location.hostname
	    };
	  }

	  return {
	    callBids: baseAdapter.callBids,
	    setBidderCode: baseAdapter.setBidderCode,
	    getBidderCode: baseAdapter.getBidderCode,
	    createNew: AdKernelAdapter.createNew
	  };
	};

	/**
	 * Creates new instance of AdKernel bidder adapter
	 */
	AdKernelAdapter.createNew = function () {
	  return new AdKernelAdapter();
	};

	module.exports = AdKernelAdapter;

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	exports.ajax = ajax;

	var _url = __webpack_require__(22);

	var utils = __webpack_require__(2);

	var XHR_DONE = 4;

	/**
	 * Simple IE9+ and cross-browser ajax request function
	 * Note: x-domain requests in IE9 do not support the use of cookies
	 *
	 * @param url string url
	 * @param callback object callback
	 * @param data mixed data
	 * @param options object
	 */

	function ajax(url, callback, data) {
	  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

	  try {
	    var x = void 0;
	    var useXDomainRequest = false;
	    var method = options.method || (data ? 'POST' : 'GET');

	    if (!window.XMLHttpRequest) {
	      useXDomainRequest = true;
	    } else {
	      x = new window.XMLHttpRequest();
	      if (x.responseType === undefined) {
	        useXDomainRequest = true;
	      }
	    }

	    if (useXDomainRequest) {
	      x = new window.XDomainRequest();
	      x.onload = function () {
	        callback(x.responseText, x);
	      };

	      // http://stackoverflow.com/questions/15786966/xdomainrequest-aborts-post-on-ie-9
	      x.onerror = function () {
	        utils.logMessage('xhr onerror');
	      };
	      x.ontimeout = function () {
	        utils.logMessage('xhr timeout');
	      };
	      x.onprogress = function () {
	        utils.logMessage('xhr onprogress');
	      };
	    } else {
	      x.onreadystatechange = function () {
	        if (x.readyState === XHR_DONE && callback) {
	          callback(x.responseText, x);
	        }
	      };
	    }

	    if (method === 'GET' && data) {
	      var urlInfo = (0, _url.parse)(url);
	      _extends(urlInfo.search, data);
	      url = (0, _url.format)(urlInfo);
	    }

	    x.open(method, url);

	    if (!useXDomainRequest) {
	      if (options.withCredentials) {
	        x.withCredentials = true;
	      }
	      if (options.preflight) {
	        x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
	      }
	      x.setRequestHeader('Content-Type', options.contentType || 'text/plain');
	    }
	    x.send(method === 'POST' && data);
	  } catch (error) {
	    utils.logError('xhr construction', error);
	  }
	}

/***/ }),
/* 22 */
/***/ (function(module, exports) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

	exports.parseQS = parseQS;
	exports.formatQS = formatQS;
	exports.parse = parse;
	exports.format = format;
	function parseQS(query) {
	  return !query ? {} : query.replace(/^\?/, '').split('&').reduce((function (acc, criteria) {
	    var _criteria$split = criteria.split('='),
	        _criteria$split2 = _slicedToArray(_criteria$split, 2),
	        k = _criteria$split2[0],
	        v = _criteria$split2[1];

	    if (/\[\]$/.test(k)) {
	      k = k.replace('[]', '');
	      acc[k] = acc[k] || [];
	      acc[k].push(v);
	    } else {
	      acc[k] = v || '';
	    }
	    return acc;
	  }), {});
	}

	function formatQS(query) {
	  return Object.keys(query).map((function (k) {
	    return Array.isArray(query[k]) ? query[k].map((function (v) {
	      return k + '[]=' + v;
	    })).join('&') : k + '=' + query[k];
	  })).join('&');
	}

	function parse(url) {
	  var parsed = document.createElement('a');
	  parsed.href = decodeURIComponent(url);
	  return {
	    protocol: (parsed.protocol || '').replace(/:$/, ''),
	    hostname: parsed.hostname,
	    port: +parsed.port,
	    pathname: parsed.pathname,
	    search: parseQS(parsed.search || ''),
	    hash: (parsed.hash || '').replace(/^#/, ''),
	    host: parsed.host
	  };
	}

	function format(obj) {
	  return (obj.protocol || 'http') + '://' + (obj.host || obj.hostname + (obj.port ? ':' + obj.port : '')) + (obj.pathname || '') + (obj.search ? '?' + formatQS(obj.search || '') : '') + (obj.hash ? '#' + obj.hash : '');
	}

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _utils = __webpack_require__(2);

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);
	var utils = __webpack_require__(2);
	var CONSTANTS = __webpack_require__(3);

	/**
	 * Adapter for requesting bids from AdMedia.
	 *
	 */
	var AdmediaAdapter = function AdmediaAdapter() {

	  function _callBids(params) {
	    var bids,
	        bidderUrl = window.location.protocol + "//b.admedia.com/banner/prebid/bidder/?";
	    bids = params.bids || [];
	    for (var i = 0; i < bids.length; i++) {
	      var request_obj = {};
	      var bid = bids[i];

	      if (bid.params.aid) {
	        request_obj.aid = bid.params.aid;
	      } else {
	        utils.logError('required param aid is missing', "admedia");
	        continue;
	      }

	      //optional page_url macro
	      if (bid.params.page_url) {
	        request_obj.page_url = bid.params.page_url;
	      }

	      //if set, return a test ad for all aids
	      if (bid.params.test_ad === 1) {
	        request_obj.test_ad = 1;
	      }

	      var parsedSizes = utils.parseSizesInput(bid.sizes);
	      var parsedSizesLength = parsedSizes.length;
	      if (parsedSizesLength > 0) {
	        //first value should be "size"
	        request_obj.size = parsedSizes[0];
	        if (parsedSizesLength > 1) {
	          //any subsequent values should be "promo_sizes"
	          var promo_sizes = [];
	          for (var j = 1; j < parsedSizesLength; j++) {
	            promo_sizes.push(parsedSizes[j]);
	          }

	          request_obj.promo_sizes = promo_sizes.join(",");
	        }
	      }

	      //detect urls
	      request_obj.siteDomain = window.location.host;
	      request_obj.sitePage = window.location.href;
	      request_obj.siteRef = document.referrer;
	      request_obj.topUrl = utils.getTopWindowUrl();

	      request_obj.callbackId = bid.bidId;

	      var endpoint = bidderUrl + utils.parseQueryStringParameters(request_obj);

	      //utils.logMessage('Admedia request built: ' + endpoint);

	      adloader.loadScript(endpoint);
	    }
	  }

	  //expose the callback to global object
	  pbjs.admediaHandler = function (response) {
	    var bidObject = {};
	    var callback_id = response.callback_id;
	    var placementCode = '';
	    var bidObj = (0, _utils.getBidRequest)(callback_id);
	    if (bidObj) {
	      placementCode = bidObj.placementCode;
	    }

	    if (bidObj && response.cpm > 0 && !!response.ad) {
	      bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
	      bidObject.bidderCode = bidObj.bidder;
	      bidObject.cpm = parseFloat(response.cpm);
	      bidObject.ad = response.ad;
	      bidObject.width = response.width;
	      bidObject.height = response.height;
	    } else {
	      bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
	      bidObject.bidderCode = bidObj.bidder;
	      utils.logMessage('No prebid response from Admedia for placement code ' + placementCode);
	    }

	    bidmanager.addBidResponse(placementCode, bidObject);
	  };

	  // Export the callBids function, so that prebid.js can execute this function
	  // when the page asks to send out bid requests.
	  return {
	    callBids: _callBids
	  };
	};

	module.exports = AdmediaAdapter;

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _adapter = __webpack_require__(14);

	var _adapter2 = _interopRequireDefault(_adapter);

	var _bidfactory = __webpack_require__(10);

	var _bidfactory2 = _interopRequireDefault(_bidfactory);

	var _bidmanager = __webpack_require__(11);

	var _bidmanager2 = _interopRequireDefault(_bidmanager);

	var _utils = __webpack_require__(2);

	var utils = _interopRequireWildcard(_utils);

	var _ajax = __webpack_require__(21);

	var _constants = __webpack_require__(3);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var ENDPOINT = '//rtb.vertamedia.com/hb/';

	function VertamediaAdapter() {
	  var baseAdapter = _adapter2['default'].createNew('vertamedia'),
	      bidRequest;

	  baseAdapter.callBids = function (bidRequests) {
	    if (!bidRequests || !bidRequests.bids || bidRequests.bids.length === 0) {
	      return;
	    }

	    var RTBDataParams = prepareAndSaveRTBRequestParams(bidRequests.bids[0]);

	    if (!RTBDataParams) {
	      return;
	    }

	    (0, _ajax.ajax)(ENDPOINT, handleResponse, RTBDataParams, {
	      contentType: 'text/plain',
	      withCredentials: true,
	      method: 'GET'
	    });
	  };

	  function prepareAndSaveRTBRequestParams(bid) {
	    if (!bid || !bid.params || !bid.params.aid || !bid.placementCode) {
	      return;
	    }

	    bidRequest = bid;
	    bidRequest.width = parseInt(bid.sizes[0], 10) || undefined;
	    bidRequest.height = parseInt(bid.sizes[1], 10) || undefined;

	    return {
	      aid: bid.params.aid,
	      w: parseInt(bid.sizes[0], 10) || undefined,
	      h: parseInt(bid.sizes[1], 10) || undefined,
	      domain: document.location.hostname
	    };
	  }

	  /* Notify Prebid of bid responses so bids can get in the auction */
	  function handleResponse(response) {
	    var parsed;

	    try {
	      parsed = JSON.parse(response);
	    } catch (error) {
	      utils.logError(error);
	    }

	    if (!parsed || parsed.error || !parsed.bids || !parsed.bids.length) {
	      _bidmanager2['default'].addBidResponse(bidRequest.placementCode, createBid(_constants.STATUS.NO_BID));

	      return;
	    }

	    _bidmanager2['default'].addBidResponse(bidRequest.placementCode, createBid(_constants.STATUS.GOOD, parsed.bids[0]));
	  }

	  function createBid(status, tag) {
	    var bid = _bidfactory2['default'].createBid(status, tag);

	    bid.code = baseAdapter.getBidderCode();
	    bid.bidderCode = bidRequest.bidder;

	    if (!tag || status !== _constants.STATUS.GOOD) {
	      return bid;
	    }

	    bid.mediaType = 'video';
	    bid.cpm = tag.cpm;
	    bid.creative_id = tag.cmpId;
	    bid.width = bidRequest.width;
	    bid.height = bidRequest.height;
	    bid.descriptionUrl = tag.url;
	    bid.vastUrl = tag.url;

	    return bid;
	  }

	  return {
	    createNew: VertamediaAdapter.createNew,
	    callBids: baseAdapter.callBids,
	    setBidderCode: baseAdapter.setBidderCode
	  };
	}

	VertamediaAdapter.createNew = function () {
	  return new VertamediaAdapter();
	};

	module.exports = VertamediaAdapter;

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _templateObject = _taggedTemplateLiteral(['', '://', '/pubapi/3.0/', '/', '/', '/', '/ADTECH;v=2;cmd=bid;cors=yes;alias=', '', ';misc=', ''], ['', '://', '/pubapi/3.0/', '/', '/', '/', '/ADTECH;v=2;cmd=bid;cors=yes;alias=', '', ';misc=', '']);

	function _taggedTemplateLiteral(strings, raw) { return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

	var utils = __webpack_require__(2);
	var ajax = __webpack_require__(21).ajax;
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);

	var AolAdapter = function AolAdapter() {

	  var showCpmAdjustmentWarning = true;
	  var pubapiTemplate = template(_templateObject, 'protocol', 'host', 'network', 'placement', 'pageid', 'sizeid', 'alias', 'bidfloor', 'misc');
	  var BIDDER_CODE = 'aol';
	  var SERVER_MAP = {
	    us: 'adserver-us.adtech.advertising.com',
	    eu: 'adserver-eu.adtech.advertising.com',
	    as: 'adserver-as.adtech.advertising.com'
	  };

	  function template(strings) {
	    for (var _len = arguments.length, keys = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	      keys[_key - 1] = arguments[_key];
	    }

	    return function () {
	      for (var _len2 = arguments.length, values = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
	        values[_key2] = arguments[_key2];
	      }

	      var dict = values[values.length - 1] || {};
	      var result = [strings[0]];
	      keys.forEach((function (key, i) {
	        var value = Number.isInteger(key) ? values[key] : dict[key];
	        result.push(value, strings[i + 1]);
	      }));
	      return result.join('');
	    };
	  }

	  function _buildPubapiUrl(bid) {
	    var params = bid.params;
	    var serverParam = params.server;
	    var regionParam = params.region || 'us';
	    var server = void 0;

	    if (!SERVER_MAP.hasOwnProperty(regionParam)) {
	      utils.logWarn('Unknown region \'' + regionParam + '\' for AOL bidder.');
	      regionParam = 'us'; // Default region.
	    }

	    if (serverParam) {
	      server = serverParam;
	    } else {
	      server = SERVER_MAP[regionParam];
	    }

	    // Set region param, used by AOL analytics.
	    params.region = regionParam;

	    return pubapiTemplate({
	      protocol: document.location.protocol === 'https:' ? 'https' : 'http',
	      host: server,
	      network: params.network,
	      placement: parseInt(params.placement),
	      pageid: params.pageId || 0,
	      sizeid: params.sizeId || 0,
	      alias: params.alias || utils.getUniqueIdentifierStr(),
	      bidfloor: typeof params.bidFloor !== 'undefined' ? ';bidfloor=' + params.bidFloor.toString() : '',
	      misc: new Date().getTime() // cache busting
	    });
	  }

	  function _addErrorBidResponse(bid) {
	    var response = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

	    var bidResponse = bidfactory.createBid(2, bid);
	    bidResponse.bidderCode = BIDDER_CODE;
	    bidResponse.reason = response.nbr;
	    bidResponse.raw = response;
	    bidmanager.addBidResponse(bid.placementCode, bidResponse);
	  }

	  function _addBidResponse(bid, response) {
	    var bidData = void 0;

	    try {
	      bidData = response.seatbid[0].bid[0];
	    } catch (e) {
	      _addErrorBidResponse(bid, response);
	      return;
	    }

	    var cpm = void 0;

	    if (bidData.ext && bidData.ext.encp) {
	      cpm = bidData.ext.encp;
	    } else {
	      cpm = bidData.price;

	      if (cpm === null || isNaN(cpm)) {
	        utils.logError('Invalid price in bid response', BIDDER_CODE, bid);
	        _addErrorBidResponse(bid, response);
	        return;
	      }
	    }

	    var ad = bidData.adm;
	    if (response.ext && response.ext.pixels) {
	      ad += response.ext.pixels;
	    }

	    var bidResponse = bidfactory.createBid(1, bid);
	    bidResponse.bidderCode = BIDDER_CODE;
	    bidResponse.ad = ad;
	    bidResponse.cpm = cpm;
	    bidResponse.width = bidData.w;
	    bidResponse.height = bidData.h;
	    bidResponse.creativeId = bidData.crid;
	    bidResponse.pubapiId = response.id;
	    bidResponse.currencyCode = response.cur;
	    if (bidData.dealid) {
	      bidResponse.dealId = bidData.dealid;
	    }

	    bidmanager.addBidResponse(bid.placementCode, bidResponse);
	  }

	  function _callBids(params) {
	    utils._each(params.bids, (function (bid) {
	      var pubapiUrl = _buildPubapiUrl(bid);

	      ajax(pubapiUrl, (function (response) {
	        // needs to be here in case bidderSettings are defined after requestBids() is called
	        if (showCpmAdjustmentWarning && pbjs.bidderSettings && pbjs.bidderSettings.aol && typeof pbjs.bidderSettings.aol.bidCpmAdjustment === 'function') {
	          utils.logWarn('bidCpmAdjustment is active for the AOL adapter. ' + 'As of Prebid 0.14, AOL can bid in net – please contact your accounts team to enable.');
	        }
	        showCpmAdjustmentWarning = false; // warning is shown at most once

	        if (!response && response.length <= 0) {
	          utils.logError('Empty bid response', BIDDER_CODE, bid);
	          _addErrorBidResponse(bid, response);
	          return;
	        }

	        try {
	          response = JSON.parse(response);
	        } catch (e) {
	          utils.logError('Invalid JSON in bid response', BIDDER_CODE, bid);
	          _addErrorBidResponse(bid, response);
	          return;
	        }

	        _addBidResponse(bid, response);
	      }), null, { withCredentials: true });
	    }));
	  }

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = AolAdapter;

/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _utils = __webpack_require__(2);

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var adloader = __webpack_require__(13);
	var bidmanager = __webpack_require__(11);
	var bidfactory = __webpack_require__(10);
	var Adapter = __webpack_require__(14);

	var AppNexusAdapter;
	AppNexusAdapter = function AppNexusAdapter() {
	  var baseAdapter = Adapter.createNew('appnexus');
	  var usersync = false;

	  baseAdapter.callBids = function (params) {
	    //var bidCode = baseAdapter.getBidderCode();

	    var anArr = params.bids;

	    //var bidsCount = anArr.length;

	    //set expected bids count for callback execution
	    //bidmanager.setExpectedBidsCount(bidCode, bidsCount);

	    for (var i = 0; i < anArr.length; i++) {
	      var bidRequest = anArr[i];
	      var callbackId = bidRequest.bidId;
	      adloader.loadScript(buildJPTCall(bidRequest, callbackId));

	      //store a reference to the bidRequest from the callback id
	      //bidmanager.pbCallbackMap[callbackId] = bidRequest;
	    }
	  };

	  function buildJPTCall(bid, callbackId) {

	    //determine tag params
	    var placementId = utils.getBidIdParameter('placementId', bid.params);

	    //memberId will be deprecated, use member instead
	    var memberId = utils.getBidIdParameter('memberId', bid.params);
	    var member = utils.getBidIdParameter('member', bid.params);
	    var inventoryCode = utils.getBidIdParameter('invCode', bid.params);
	    var query = utils.getBidIdParameter('query', bid.params);
	    var referrer = utils.getBidIdParameter('referrer', bid.params);
	    var altReferrer = utils.getBidIdParameter('alt_referrer', bid.params);

	    //build our base tag, based on if we are http or https

	    var jptCall = 'http' + (document.location.protocol === 'https:' ? 's://secure.adnxs.com/jpt?' : '://ib.adnxs.com/jpt?');

	    jptCall = utils.tryAppendQueryString(jptCall, 'callback', 'pbjs.handleAnCB');
	    jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);
	    jptCall = utils.tryAppendQueryString(jptCall, 'psa', '0');
	    jptCall = utils.tryAppendQueryString(jptCall, 'id', placementId);
	    if (member) {
	      jptCall = utils.tryAppendQueryString(jptCall, 'member', member);
	    } else if (memberId) {
	      jptCall = utils.tryAppendQueryString(jptCall, 'member', memberId);
	      utils.logMessage('appnexus.callBids: "memberId" will be deprecated soon. Please use "member" instead');
	    }

	    jptCall = utils.tryAppendQueryString(jptCall, 'code', inventoryCode);

	    //sizes takes a bit more logic
	    var sizeQueryString = '';
	    var parsedSizes = utils.parseSizesInput(bid.sizes);

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

	    if (sizeQueryString) {
	      jptCall += sizeQueryString + '&';
	    }

	    //this will be deprecated soon
	    var targetingParams = utils.parseQueryStringParameters(query);

	    if (targetingParams) {
	      //don't append a & here, we have already done it in parseQueryStringParameters
	      jptCall += targetingParams;
	    }

	    //append custom attributes:
	    var paramsCopy = utils.extend({}, bid.params);

	    //delete attributes already used
	    delete paramsCopy.placementId;
	    delete paramsCopy.memberId;
	    delete paramsCopy.invCode;
	    delete paramsCopy.query;
	    delete paramsCopy.referrer;
	    delete paramsCopy.alt_referrer;
	    delete paramsCopy.member;

	    //get the reminder
	    var queryParams = utils.parseQueryStringParameters(paramsCopy);

	    //append
	    if (queryParams) {
	      jptCall += queryParams;
	    }

	    //append referrer
	    if (referrer === '') {
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

	    return jptCall;
	  }

	  //expose the callback to the global object:
	  pbjs.handleAnCB = function (jptResponseObj) {

	    var bidCode;

	    if (jptResponseObj && jptResponseObj.callback_uid) {

	      var responseCPM;
	      var id = jptResponseObj.callback_uid;
	      var placementCode = '';
	      var bidObj = (0, _utils.getBidRequest)(id);
	      if (bidObj) {

	        bidCode = bidObj.bidder;

	        placementCode = bidObj.placementCode;

	        //set the status
	        bidObj.status = CONSTANTS.STATUS.GOOD;
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

	        //store bid response
	        //bid status is good (indicating 1)
	        var adId = jptResponseObj.result.creative_id;
	        bid = bidfactory.createBid(1, bidObj);
	        bid.creative_id = adId;
	        bid.bidderCode = bidCode;
	        bid.cpm = responseCPM;
	        bid.adUrl = jptResponseObj.result.ad;
	        bid.width = jptResponseObj.result.width;
	        bid.height = jptResponseObj.result.height;
	        bid.dealId = jptResponseObj.result.deal_id;

	        bidmanager.addBidResponse(placementCode, bid);
	      } else {
	        //no response data
	        // @if NODE_ENV='debug'
	        utils.logMessage('No prebid response from AppNexus for placement code ' + placementCode);

	        // @endif
	        //indicate that there is no bid for this placement
	        bid = bidfactory.createBid(2, bidObj);
	        bid.bidderCode = bidCode;
	        bidmanager.addBidResponse(placementCode, bid);
	      }

	      if (!usersync) {
	        var iframe = utils.createInvisibleIframe();
	        iframe.src = '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html';
	        try {
	          document.body.appendChild(iframe);
	        } catch (error) {
	          utils.logError(error);
	        }
	        usersync = true;
	      }
	    } else {
	      //no response data
	      // @if NODE_ENV='debug'
	      utils.logMessage('No prebid response for placement %%PLACEMENT%%');

	      // @endif
	    }
	  };

	  return {
	    callBids: baseAdapter.callBids,
	    setBidderCode: baseAdapter.setBidderCode,
	    createNew: AppNexusAdapter.createNew,
	    buildJPTCall: buildJPTCall
	  };
	};

	AppNexusAdapter.createNew = function () {
	  return new AppNexusAdapter();
	};

	module.exports = AppNexusAdapter;

/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _adapter = __webpack_require__(14);

	var _adapter2 = _interopRequireDefault(_adapter);

	var _bidfactory = __webpack_require__(10);

	var _bidfactory2 = _interopRequireDefault(_bidfactory);

	var _bidmanager = __webpack_require__(11);

	var _bidmanager2 = _interopRequireDefault(_bidmanager);

	var _utils = __webpack_require__(2);

	var utils = _interopRequireWildcard(_utils);

	var _ajax = __webpack_require__(21);

	var _constants = __webpack_require__(3);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	var ENDPOINT = '//ib.adnxs.com/ut/v2/prebid';
	var VIDEO_TARGETING = ['id', 'mimes', 'minduration', 'maxduration', 'startdelay', 'skippable', 'playback_method', 'frameworks'];
	var USER_PARAMS = ['age', 'external_uid', 'segments', 'gender', 'dnt', 'language'];

	/**
	 * Bidder adapter for /ut endpoint. Given the list of all ad unit tag IDs,
	 * sends out a bid request. When a bid response is back, registers the bid
	 * to Prebid.js. This adapter supports alias bidding.
	 */
	function AppnexusAstAdapter() {

	  var baseAdapter = _adapter2['default'].createNew('appnexusAst');
	  var bidRequests = {};
	  var usersync = false;

	  /* Prebid executes this function when the page asks to send out bid requests */
	  baseAdapter.callBids = function (bidRequest) {
	    var bids = bidRequest.bids || [];
	    var member = 0;
	    var userObj = void 0;
	    var tags = bids.filter((function (bid) {
	      return valid(bid);
	    })).map((function (bid) {
	      // map request id to bid object to retrieve adUnit code in callback
	      bidRequests[bid.bidId] = bid;

	      var tag = {};
	      tag.sizes = getSizes(bid.sizes);
	      tag.primary_size = tag.sizes[0];
	      tag.uuid = bid.bidId;
	      if (bid.params.placementId) {
	        tag.id = parseInt(bid.params.placementId, 10);
	      } else {
	        tag.code = bid.params.invCode;
	      }
	      tag.allow_smaller_sizes = bid.params.allowSmallerSizes || false;
	      tag.prebid = true;
	      tag.disable_psa = true;
	      member = parseInt(bid.params.member, 10);
	      if (bid.params.reserve) {
	        tag.reserve = bid.params.reserve;
	      }
	      if (bid.params.position) {
	        tag.position = { 'above': 1, 'below': 2 }[bid.params.position] || 0;
	      }
	      if (bid.params.trafficSourceCode) {
	        tag.traffic_source_code = bid.params.trafficSourceCode;
	      }
	      if (bid.params.privateSizes) {
	        tag.private_sizes = getSizes(bid.params.privateSizes);
	      }
	      if (bid.params.supplyType) {
	        tag.supply_type = bid.params.supplyType;
	      }
	      if (bid.params.pubClick) {
	        tag.pubclick = bid.params.pubClick;
	      }
	      if (bid.params.extInvCode) {
	        tag.ext_inv_code = bid.params.extInvCode;
	      }
	      if (bid.params.externalImpId) {
	        tag.external_imp_id = bid.params.externalImpId;
	      }
	      if (!utils.isEmpty(bid.params.keywords)) {
	        tag.keywords = getKeywords(bid.params.keywords);
	      }

	      if (bid.mediaType === 'video') {
	        tag.require_asset_url = true;
	      }
	      if (bid.params.video) {
	        tag.video = {};
	        // place any valid video params on the tag
	        Object.keys(bid.params.video).filter((function (param) {
	          return VIDEO_TARGETING.includes(param);
	        })).forEach((function (param) {
	          return tag.video[param] = bid.params.video[param];
	        }));
	      }

	      if (bid.params.user) {
	        userObj = {};
	        Object.keys(bid.params.user).filter((function (param) {
	          return USER_PARAMS.includes(param);
	        })).forEach((function (param) {
	          return userObj[param] = bid.params.user[param];
	        }));
	      }

	      return tag;
	    }));

	    if (!utils.isEmpty(tags)) {
	      var payloadJson = { tags: [].concat(_toConsumableArray(tags)), user: userObj };
	      if (member > 0) {
	        payloadJson.member_id = member;
	      }
	      var payload = JSON.stringify(payloadJson);
	      (0, _ajax.ajax)(ENDPOINT, handleResponse, payload, {
	        contentType: 'text/plain',
	        withCredentials: true
	      });
	    }
	  };

	  /* Notify Prebid of bid responses so bids can get in the auction */
	  function handleResponse(response) {
	    var parsed = void 0;

	    try {
	      parsed = JSON.parse(response);
	    } catch (error) {
	      utils.logError(error);
	    }

	    if (!parsed || parsed.error) {
	      var errorMessage = 'in response for ' + baseAdapter.getBidderCode() + ' adapter';
	      if (parsed && parsed.error) {
	        errorMessage += ': ' + parsed.error;
	      }
	      utils.logError(errorMessage);

	      // signal this response is complete
	      Object.keys(bidRequests).map((function (bidId) {
	        return bidRequests[bidId].placementCode;
	      })).forEach((function (placementCode) {
	        _bidmanager2['default'].addBidResponse(placementCode, createBid(_constants.STATUS.NO_BID));
	      }));
	      return;
	    }

	    parsed.tags.forEach((function (tag) {
	      var ad = getRtbBid(tag);
	      var cpm = ad && ad.cpm;
	      var type = ad && ad.ad_type;

	      var status = void 0;
	      if (cpm !== 0 && (type === 'banner' || type === 'video')) {
	        status = _constants.STATUS.GOOD;
	      } else {
	        status = _constants.STATUS.NO_BID;
	      }

	      if (type && type !== 'banner' && type !== 'video') {
	        utils.logError(type + ' ad type not supported');
	      }

	      tag.bidId = tag.uuid; // bidfactory looks for bidId on requested bid
	      var bid = createBid(status, tag);
	      if (type === 'video') bid.mediaType = 'video';
	      var placement = bidRequests[bid.adId].placementCode;
	      _bidmanager2['default'].addBidResponse(placement, bid);
	    }));

	    if (!usersync) {
	      var iframe = utils.createInvisibleIframe();
	      iframe.src = '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html';
	      try {
	        document.body.appendChild(iframe);
	      } catch (error) {
	        utils.logError(error);
	      }
	      usersync = true;
	    }
	  }

	  /* Check that a bid has required paramters */
	  function valid(bid) {
	    if (bid.params.placementId || bid.params.member && bid.params.invCode) {
	      return bid;
	    } else {
	      utils.logError('bid requires placementId or (member and invCode) params');
	    }
	  }

	  /* Turn keywords parameter into ut-compatible format */
	  function getKeywords(keywords) {
	    var arrs = [];

	    utils._each(keywords, (function (v, k) {
	      if (utils.isArray(v)) {
	        var values = [];
	        utils._each(v, (function (val) {
	          val = utils.getValueString('keywords.' + k, val);
	          if (val) {
	            values.push(val);
	          }
	        }));
	        v = values;
	      } else {
	        v = utils.getValueString('keywords.' + k, v);
	        if (utils.isStr(v)) {
	          v = [v];
	        } else {
	          return;
	        } // unsuported types - don't send a key
	      }
	      arrs.push({ key: k, value: v });
	    }));

	    return arrs;
	  }

	  /* Turn bid request sizes into ut-compatible format */
	  function getSizes(requestSizes) {
	    var sizes = [];
	    var sizeObj = {};

	    if (utils.isArray(requestSizes) && requestSizes.length === 2 && !utils.isArray(requestSizes[0])) {
	      sizeObj.width = parseInt(requestSizes[0], 10);
	      sizeObj.height = parseInt(requestSizes[1], 10);
	      sizes.push(sizeObj);
	    } else if ((typeof requestSizes === 'undefined' ? 'undefined' : _typeof(requestSizes)) === 'object') {
	      for (var i = 0; i < requestSizes.length; i++) {
	        var size = requestSizes[i];
	        sizeObj = {};
	        sizeObj.width = parseInt(size[0], 10);
	        sizeObj.height = parseInt(size[1], 10);
	        sizes.push(sizeObj);
	      }
	    }

	    return sizes;
	  }

	  function getRtbBid(tag) {
	    return tag && tag.ads && tag.ads.length && tag.ads.find((function (ad) {
	      return ad.rtb;
	    }));
	  }

	  /* Create and return a bid object based on status and tag */
	  function createBid(status, tag) {
	    var ad = getRtbBid(tag);
	    var bid = _bidfactory2['default'].createBid(status, tag);
	    bid.code = baseAdapter.getBidderCode();
	    bid.bidderCode = baseAdapter.getBidderCode();

	    if (ad && status === _constants.STATUS.GOOD) {
	      bid.cpm = ad.cpm;
	      bid.creative_id = ad.creative_id;

	      if (ad.rtb.video) {
	        bid.width = ad.rtb.video.player_width;
	        bid.height = ad.rtb.video.player_height;
	        bid.vastUrl = ad.rtb.video.asset_url;
	        bid.descriptionUrl = ad.rtb.video.asset_url;
	      } else {
	        bid.width = ad.rtb.banner.width;
	        bid.height = ad.rtb.banner.height;
	        bid.ad = ad.rtb.banner.content;
	        try {
	          var url = ad.rtb.trackers[0].impression_urls[0];
	          var tracker = utils.createTrackPixelHtml(url);
	          bid.ad += tracker;
	        } catch (error) {
	          utils.logError('Error appending tracking pixel', error);
	        }
	      }
	    }

	    return bid;
	  }

	  return {
	    createNew: AppnexusAstAdapter.createNew,
	    callBids: baseAdapter.callBids,
	    setBidderCode: baseAdapter.setBidderCode
	  };
	}

	AppnexusAstAdapter.createNew = function () {
	  return new AppnexusAstAdapter();
	};

	module.exports = AppnexusAstAdapter;

/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var VERSION = '2.0.1',
	    CONSTANTS = __webpack_require__(3),
	    utils = __webpack_require__(2),
	    bidfactory = __webpack_require__(10),
	    bidmanager = __webpack_require__(11),
	    adloader = __webpack_require__(13),
	    ajax = __webpack_require__(21).ajax;

	/**
	 * Adapter for requesting bids from Conversant
	 */
	var ConversantAdapter = function ConversantAdapter() {
	  var w = window,
	      n = navigator;

	  // production endpoint
	  var conversantUrl = '//media.msg.dotomi.com/s2s/header?callback=pbjs.conversantResponse';

	  // SSAPI returns JSONP with window.pbjs.conversantResponse as the cb
	  var appendScript = function appendScript(code) {
	    var script = document.createElement('script');
	    script.type = 'text/javascript';
	    script.className = 'cnvr-response';

	    try {
	      script.appendChild(document.createTextNode(code));
	      document.getElementsByTagName('head')[0].appendChild(script);
	    } catch (e) {
	      script.text = code;
	      document.getElementsByTagName('head')[0].appendChild(script);
	    }
	  };

	  var getDNT = function getDNT() {
	    return n.doNotTrack === '1' || w.doNotTrack === '1' || n.msDoNotTrack === '1' || n.doNotTrack === 'yes';
	  };

	  var getDevice = function getDevice() {
	    var language = n.language ? 'language' : 'userLanguage';
	    return {
	      h: screen.height,
	      w: screen.width,
	      dnt: getDNT() ? 1 : 0,
	      language: n[language].split('-')[0],
	      make: n.vendor ? n.vendor : '',
	      ua: n.userAgent
	    };
	  };

	  var callBids = function callBids(params) {
	    var conversantBids = params.bids || [];
	    requestBids(conversantBids);
	  };

	  var requestBids = function requestBids(bidReqs) {
	    // build bid request object
	    var page = location.pathname + location.search + location.hash,
	        siteId = '',
	        conversantImps = [],
	        conversantBidReqs,
	        secure = 0;

	    //build impression array for conversant
	    utils._each(bidReqs, (function (bid) {
	      var bidfloor = utils.getBidIdParameter('bidfloor', bid.params),
	          adW = 0,
	          adH = 0,
	          imp;

	      secure = utils.getBidIdParameter('secure', bid.params) ? 1 : secure;
	      siteId = utils.getBidIdParameter('site_id', bid.params) + '';

	      // Allow sizes to be overridden per placement
	      var bidSizes = Array.isArray(bid.params.sizes) ? bid.params.sizes : bid.sizes;

	      if (bidSizes.length === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
	        adW = bidSizes[0];
	        adH = bidSizes[1];
	      } else {
	        adW = bidSizes[0][0];
	        adH = bidSizes[0][1];
	      }

	      imp = {
	        id: bid.bidId,
	        banner: {
	          w: adW,
	          h: adH
	        },
	        secure: secure,
	        bidfloor: bidfloor ? bidfloor : 0,
	        displaymanager: 'Prebid.js',
	        displaymanagerver: VERSION
	      };

	      conversantImps.push(imp);
	    }));

	    conversantBidReqs = {
	      'id': utils.getUniqueIdentifierStr(),
	      'imp': conversantImps,

	      'site': {
	        'id': siteId,
	        'mobile': document.querySelector('meta[name="viewport"][content*="width=device-width"]') !== null ? 1 : 0,
	        'page': page
	      },

	      'device': getDevice(),
	      'at': 1
	    };

	    var url = secure ? 'https:' + conversantUrl : location.protocol + conversantUrl;
	    ajax(url, appendScript, JSON.stringify(conversantBidReqs), {
	      withCredentials: true
	    });
	  };

	  var addEmptyBidResponses = function addEmptyBidResponses(placementsWithBidsBack) {
	    var allConversantBidRequests = pbjs._bidsRequested.find((function (bidSet) {
	      return bidSet.bidderCode === 'conversant';
	    }));

	    if (allConversantBidRequests && allConversantBidRequests.bids) {
	      utils._each(allConversantBidRequests.bids, (function (conversantBid) {
	        if (!utils.contains(placementsWithBidsBack, conversantBid.placementCode)) {
	          // Add a no-bid response for this placement.
	          var bid = bidfactory.createBid(2, conversantBid);
	          bid.bidderCode = 'conversant';
	          bidmanager.addBidResponse(conversantBid.placementCode, bid);
	        }
	      }));
	    }
	  };

	  var parseSeatbid = function parseSeatbid(bidResponse) {
	    var placementsWithBidsBack = [];
	    utils._each(bidResponse.bid, (function (conversantBid) {
	      var responseCPM,
	          placementCode = '',
	          id = conversantBid.impid,
	          bid = {},
	          responseAd,
	          responseNurl,
	          sizeArrayLength;

	      // Bid request we sent Conversant
	      var bidRequested = pbjs._bidsRequested.find((function (bidSet) {
	        return bidSet.bidderCode === 'conversant';
	      })).bids.find((function (bid) {
	        return bid.bidId === id;
	      }));

	      if (bidRequested) {
	        placementCode = bidRequested.placementCode;
	        bidRequested.status = CONSTANTS.STATUS.GOOD;
	        responseCPM = parseFloat(conversantBid.price);

	        if (responseCPM !== 0.0) {
	          conversantBid.placementCode = placementCode;
	          placementsWithBidsBack.push(placementCode);
	          conversantBid.size = bidRequested.sizes;
	          responseAd = conversantBid.adm || '';
	          responseNurl = conversantBid.nurl || '';

	          // Our bid!
	          bid = bidfactory.createBid(1, bidRequested);
	          bid.creative_id = conversantBid.id || '';
	          bid.bidderCode = 'conversant';

	          bid.cpm = responseCPM;

	          // Track impression image onto returned html
	          bid.ad = responseAd + '<img src=\"' + responseNurl + '\" />';

	          sizeArrayLength = bidRequested.sizes.length;
	          if (sizeArrayLength === 2 && typeof bidRequested.sizes[0] === 'number' && typeof bidRequested.sizes[1] === 'number') {
	            bid.width = bidRequested.sizes[0];
	            bid.height = bidRequested.sizes[1];
	          } else {
	            bid.width = bidRequested.sizes[0][0];
	            bid.height = bidRequested.sizes[0][1];
	          }

	          bidmanager.addBidResponse(placementCode, bid);
	        }
	      }
	    }));
	    addEmptyBidResponses(placementsWithBidsBack);
	  };

	  // Register our callback to the global object:
	  pbjs.conversantResponse = function (conversantResponseObj, path) {
	    // valid object?
	    if (conversantResponseObj && conversantResponseObj.id) {
	      if (conversantResponseObj.seatbid && conversantResponseObj.seatbid.length > 0 && conversantResponseObj.seatbid[0].bid && conversantResponseObj.seatbid[0].bid.length > 0) {
	        utils._each(conversantResponseObj.seatbid, parseSeatbid);
	      } else {
	        //no response data for any placements
	        addEmptyBidResponses([]);
	      }
	    } else {
	      //no response data for any placements
	      addEmptyBidResponses([]);
	    }
	    // for debugging purposes
	    if (path) {
	      adloader.loadScript(path, (function () {
	        var allConversantBidRequests = pbjs._bidsRequested.find((function (bidSet) {
	          return bidSet.bidderCode === 'conversant';
	        }));

	        if (pbjs.conversantDebugResponse) {
	          pbjs.conversantDebugResponse(allConversantBidRequests);
	        }
	      }));
	    }
	  }; // conversantResponse

	  return {
	    callBids: callBids
	  };
	};

	module.exports = ConversantAdapter;

/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adLoader = __webpack_require__(13);

	var DistrictmAdaptor = function districtmAdaptor() {
	  var _this = this;

	  var districtmUrl = window.location.protocol + '//prebid.districtm.ca/lib.js';
	  this.callBids = function (params) {
	    if (!window.hb_dmx_res) {
	      adLoader.loadScript(districtmUrl, (function () {
	        _this.sendBids(params);
	      }));
	    } else {
	      _this.sendBids(params);
	    }
	    return params;
	  };

	  this.handlerRes = function (response, bidObject) {
	    var bid = void 0;
	    if (parseFloat(response.result.cpm) > 0) {
	      bid = bidfactory.createBid(1);
	      bid.bidderCode = bidObject.bidder;
	      bid.cpm = response.result.cpm;
	      bid.width = response.result.width;
	      bid.height = response.result.height;
	      bid.ad = response.result.banner;
	      bidmanager.addBidResponse(bidObject.placementCode, bid);
	    } else {
	      bid = bidfactory.createBid(2);
	      bid.bidderCode = bidObject.bidder;
	      bidmanager.addBidResponse(bidObject.placementCode, bid);
	    }

	    return bid;
	  };

	  this.sendBids = function (params) {
	    var bids = params.bids;
	    for (var i = 0; i < bids.length; i++) {
	      bids[i].params.sizes = window.hb_dmx_res.auction.fixSize(bids[i].sizes);
	    }
	    window.hb_dmx_res.auction.run(window.hb_dmx_res.ssp, bids, this.handlerRes);
	    return bids;
	  };

	  return {
	    callBids: this.callBids,
	    sendBids: this.sendBids,
	    handlerRes: this.handlerRes
	  };
	};

	module.exports = DistrictmAdaptor;

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);
	var STATUS = __webpack_require__(3).STATUS;

	var FidelityAdapter = function FidelityAdapter() {
	  var FIDELITY_BIDDER_NAME = 'fidelity';
	  var FIDELITY_SERVER_NAME = 'x.fidelity-media.com';

	  function _callBids(params) {
	    var bids = params.bids || [];
	    bids.forEach((function (currentBid) {
	      var server = currentBid.params.server || FIDELITY_SERVER_NAME;
	      var m3_u = window.location.protocol + '//' + server + '/delivery/hb.php?';
	      m3_u += 'callback=window.pbjs.fidelityResponse';
	      m3_u += '&requestid=' + utils.getUniqueIdentifierStr();
	      m3_u += '&impid=' + currentBid.bidId;
	      m3_u += '&zoneid=' + currentBid.params.zoneid;
	      m3_u += '&cb=' + Math.floor(Math.random() * 99999999999);
	      m3_u += document.charset ? '&charset=' + document.charset : document.characterSet ? '&charset=' + document.characterSet : '';

	      var loc;
	      try {
	        loc = window.top !== window ? document.referrer : window.location.href;
	      } catch (e) {
	        loc = document.referrer;
	      }
	      loc = currentBid.params.loc || loc;
	      m3_u += '&loc=' + encodeURIComponent(loc);

	      var subid = currentBid.params.subid || 'hb';
	      m3_u += '&subid=' + subid;
	      if (document.referrer) m3_u += '&referer=' + encodeURIComponent(document.referrer);
	      if (currentBid.params.click) m3_u += '&ct0=' + encodeURIComponent(currentBid.params.click);
	      m3_u += '&flashver=' + encodeURIComponent(getFlashVersion());

	      adloader.loadScript(m3_u);
	    }));
	  }

	  function getFlashVersion() {
	    var plugins, plugin, result;

	    if (navigator.plugins && navigator.plugins.length > 0) {
	      plugins = navigator.plugins;
	      for (var i = 0; i < plugins.length && !result; i++) {
	        plugin = plugins[i];
	        if (plugin.name.indexOf("Shockwave Flash") > -1) {
	          result = plugin.description.split("Shockwave Flash ")[1];
	        }
	      }
	    }
	    return result ? result : "";
	  }

	  function addBlankBidResponses(placementsWithBidsBack) {
	    var allFidelityBidRequests = pbjs._bidsRequested.find((function (bidSet) {
	      return bidSet.bidderCode === FIDELITY_BIDDER_NAME;
	    }));

	    if (allFidelityBidRequests && allFidelityBidRequests.bids) {
	      utils._each(allFidelityBidRequests.bids, (function (fidelityBid) {
	        if (!utils.contains(placementsWithBidsBack, fidelityBid.placementCode)) {
	          // Add a no-bid response for this placement.
	          var bid = bidfactory.createBid(STATUS.NO_BID, fidelityBid);
	          bid.bidderCode = FIDELITY_BIDDER_NAME;
	          bidmanager.addBidResponse(fidelityBid.placementCode, bid);
	        }
	      }));
	    }
	  }

	  pbjs.fidelityResponse = function (responseObj) {

	    if (!responseObj || !responseObj.seatbid || responseObj.seatbid.length === 0 || !responseObj.seatbid[0].bid || responseObj.seatbid[0].bid.length === 0) {
	      addBlankBidResponses([]);
	      return;
	    }

	    var bid = responseObj.seatbid[0].bid[0];
	    var status = bid.adm ? STATUS.GOOD : STATUS.NO_BID;
	    var requestObj = utils.getBidRequest(bid.impid);

	    var bidResponse = bidfactory.createBid(status);
	    bidResponse.bidderCode = FIDELITY_BIDDER_NAME;
	    if (status === STATUS.GOOD) {
	      bidResponse.cpm = parseFloat(bid.price);
	      bidResponse.ad = bid.adm;
	      bidResponse.width = parseInt(bid.width);
	      bidResponse.height = parseInt(bid.height);
	    }
	    var placementCode = requestObj && requestObj.placementCode;
	    bidmanager.addBidResponse(placementCode, bidResponse);
	  };

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = FidelityAdapter;

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var utils = __webpack_require__(2);
	var adloader = __webpack_require__(13);

	var BIDDER_CODE = 'gumgum';
	var CALLBACKS = {};

	var GumgumAdapter = function GumgumAdapter() {

	  var bidEndpoint = 'https://g2.gumgum.com/hbid/imp';

	  var topWindow = void 0;
	  var topScreen = void 0;
	  var pageViewId = void 0;
	  var requestCache = {};
	  var throttleTable = {};
	  var defaultThrottle = 3e4;

	  try {
	    topWindow = global.top;
	    topScreen = topWindow.screen;
	  } catch (error) {
	    return utils.logError(error);
	  }

	  function _getTimeStamp() {
	    return new Date().getTime();
	  }

	  function _callBids(_ref) {
	    var bids = _ref.bids;

	    var browserParams = {
	      vw: topWindow.innerWidth,
	      vh: topWindow.innerHeight,
	      sw: topScreen.width,
	      sh: topScreen.height,
	      pu: topWindow.location.href,
	      ce: navigator.cookieEnabled,
	      dpr: topWindow.devicePixelRatio || 1
	    };
	    utils._each(bids, (function (bidRequest) {
	      var bidId = bidRequest.bidId,
	          _bidRequest$params = bidRequest.params,
	          params = _bidRequest$params === undefined ? {} : _bidRequest$params,
	          placementCode = bidRequest.placementCode;

	      var timestamp = _getTimeStamp();
	      var trackingId = params.inScreen;
	      var nativeId = params.native;
	      var slotId = params.inSlot;
	      var bid = { tmax: pbjs.cbTimeout };

	      /* slot/native ads need the placement id */
	      switch (true) {
	        case !!params.inImage:
	          bid.pi = 1;break;
	        case !!params.inScreen:
	          bid.pi = 2;break;
	        case !!params.inSlot:
	          bid.pi = 3;break;
	        case !!params.native:
	          bid.pi = 5;break;
	        default:
	          return utils.logWarn('[GumGum] No product selected for the placement ' + placementCode + ', please check your implementation.');
	      }

	      /* throttle based on the latest request for this product */
	      var productId = bid.pi;
	      var requestKey = productId + '|' + placementCode;
	      var throttle = throttleTable[productId];
	      var latestRequest = requestCache[requestKey];
	      if (latestRequest && throttle && timestamp - latestRequest < throttle) {
	        return utils.logWarn('[GumGum] The refreshes for "' + placementCode + '" with the params ' + (JSON.stringify(params) + ' should be at least ' + throttle / 1e3 + 's apart.'));
	      }
	      /* update the last request */
	      requestCache[requestKey] = timestamp;

	      /* tracking id is required for in-image and in-screen */
	      if (trackingId) bid.t = trackingId;
	      /* native ads require a native placement id */
	      if (nativeId) bid.ni = nativeId;
	      /* slot ads require a slot id */
	      if (slotId) bid.si = slotId;

	      /* include the pageViewId, if any */
	      if (pageViewId) bid.pv = pageViewId;

	      var cachedBid = _extends({
	        placementCode: placementCode,
	        id: bidId
	      }, bid);

	      var callback = { jsonp: 'pbjs.handleGumGumCB[\'' + bidId + '\']' };
	      CALLBACKS[bidId] = _handleGumGumResponse(cachedBid);
	      var query = _extends(callback, browserParams, bid);
	      var bidCall = bidEndpoint + '?' + utils.parseQueryStringParameters(query);
	      adloader.loadScript(bidCall);
	    }));
	  }

	  var _handleGumGumResponse = function _handleGumGumResponse(cachedBidRequest) {
	    return function () {
	      var bidResponse = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	      var productId = cachedBidRequest.pi;
	      var _bidResponse$ad = bidResponse.ad,
	          ad = _bidResponse$ad === undefined ? {} : _bidResponse$ad,
	          _bidResponse$pag = bidResponse.pag,
	          pag = _bidResponse$pag === undefined ? {} : _bidResponse$pag,
	          throttle = bidResponse.thms;
	      /* cache the pageViewId */

	      if (pag && pag.pvid) pageViewId = pag.pvid;
	      if (ad && ad.id) {
	        /* set the new throttle */
	        throttleTable[productId] = throttle || defaultThrottle;
	        /* create the bid */
	        var bid = bidfactory.createBid(1);
	        var trackingId = pag.t;

	        bidResponse.request = cachedBidRequest;
	        var encodedResponse = encodeURIComponent(JSON.stringify(bidResponse));
	        var gumgumAdLoader = '<script>\n        (function (context, topWindow, d, s, G) {\n          G = topWindow.GUMGUM;\n          d = topWindow.document;\n          function loadAd() {\n            topWindow.GUMGUM.pbjs("' + trackingId + '", ' + productId + ', "' + encodedResponse + '" , context);\n          }\n          if (G) {\n            loadAd();\n          } else {\n            topWindow.pbjs.loadScript("https://g2.gumgum.com/javascripts/ggv2.js", loadAd);\n          }\n        }(window, top));\n      </script>';
	        _extends(bid, {
	          cpm: ad.price,
	          ad: gumgumAdLoader,
	          width: ad.width,
	          height: ad.height,
	          bidderCode: BIDDER_CODE
	        });
	        bidmanager.addBidResponse(cachedBidRequest.placementCode, bid);
	      } else {
	        var noBid = bidfactory.createBid(2);
	        noBid.bidderCode = BIDDER_CODE;
	        bidmanager.addBidResponse(cachedBidRequest.placementCode, noBid);
	      }
	      delete CALLBACKS[cachedBidRequest.id];
	    };
	  };

	  window.pbjs.handleGumGumCB = CALLBACKS;

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = GumgumAdapter;
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	/*jslint white:true, browser:true*/
	/*global pbjs, require, module*/

	/**
	 * Adapter for HIRO Media
	 *
	 * @module HiroMediaAdapter
	 *
	 * @requires src/adloader
	 * @requires src/bidfactory
	 * @requires src/bidmanager
	 * @requires src/constants
	 * @requires src/utils
	 */
	var adloader = __webpack_require__(13);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var utils = __webpack_require__(2);
	var STATUS = __webpack_require__(3).STATUS;

	var HiroMediaAdapter = function HiroMediaAdapter() {

	  'use strict';

	  /**
	   * Bidder code
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @constant {string}
	   * @private
	   */

	  var BIDDER_CODE = 'hiromedia';

	  /**
	   * Adapter version
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @constant {number}
	   * @private
	   */
	  var ADAPTER_VERSION = 2;

	  /**
	   * Default bid param values
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @constant {module:HiroMediaAdapter~bidParams}
	   * @private
	   */
	  var REQUIRED_BID_PARAMS = ['accountId'];

	  /**
	   * Default bid param values
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @constant {module:HiroMediaAdapter~bidParams}
	   * @private
	   */
	  var DEFAULT_BID_PARAMS = {
	    bidUrl: 'https://hb-rtb.ktdpublishers.com/bid/get',
	    allowedSize: [300, 250],
	    sizeTolerance: 5
	  };

	  /**
	   * Storage for bid objects.
	   *
	   * Bids need to be stored between requests and response since the response
	   * is a global callback.
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @var {array.<module:HiroMediaAdapter~bidInfo>}
	   * @private
	   */
	  var _bidStorage = [];

	  /**
	   * Call bidmanager.addBidResponse
	   *
	   * Simple wrapper that will create a bid object with the correct status
	   * and add the response for the placement.
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @param  {module:HiroMediaAdapter~bidInfo} bidInfo bid object wrapper to respond for
	   * @param  {object|boolean} [bidResponse] response object for bid, if not
	   * set the response will be an empty bid response.
	   */
	  function addBidResponse(bidInfo, bidResponse) {

	    var placementCode = bidInfo.bid.placementCode;
	    var bidStatus = bidResponse ? STATUS.GOOD : STATUS.NO_BID;
	    var bidObject = bidfactory.createBid(bidStatus, bidInfo.bid);

	    bidObject.bidderCode = BIDDER_CODE;

	    if (bidResponse) {
	      bidObject.cpm = bidResponse.cpm;
	      bidObject.ad = bidResponse.ad;
	      bidObject.width = bidInfo.selectedSize[0];
	      bidObject.height = bidInfo.selectedSize[1];
	    }

	    utils.logMessage('hiromedia.callBids, addBidResponse for ' + placementCode + ' status: ' + bidStatus);
	    bidmanager.addBidResponse(placementCode, bidObject);
	  }

	  /**
	   * Return `true` if sampling is larger than a newly created random value
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @param  {number} sampling the value to check
	   * @return {boolean}  `true` if the sampling is larger, `false` otherwise
	   */
	  function checkChance(sampling) {
	    return Math.random() < sampling;
	  }

	  /**
	   * Apply a response for all pending bids that have the same response batch key
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @param  {object} response [description]
	   */
	  function handleResponse(response) {

	    _bidStorage.filter((function (bidInfo) {
	      return bidInfo.batchKey === response.batchKey;
	    })).forEach((function (bidInfo) {

	      // Sample the bid responses according to `response.chance`,
	      // if `response.chance` is not provided, sample at 100%.
	      if (response.chance === undefined || checkChance(response.chance)) {
	        addBidResponse(bidInfo, response);
	      } else {
	        addBidResponse(bidInfo, false);
	      }
	    }));
	  }

	  /**
	   * Call {@linkcode module:HiroMediaAdapter~handleResponse} for valid responses
	   *
	   * @global
	   *
	   * @param  {object} [response] the response from the server
	   */
	  pbjs.hiromedia_callback = function (response) {

	    if (response && response.batchKey) {
	      handleResponse(response);
	    }
	  };

	  /**
	   * Find browser name and version
	   *
	   * Super basic UA parser for the major browser configurations.
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @return {module:HiroMediaAdapter~browserInfo} object containing name and version of browser
	   * or empty strings.
	   */
	  function getBrowser() {

	    var ua = navigator.userAgent;
	    var browsers = [{
	      name: 'Mobile',
	      stringSearch: 'Mobi'
	    }, {
	      name: 'Edge'
	    }, {
	      name: 'Chrome'
	    }, {
	      name: 'Firefox'
	    }, {
	      name: 'IE',
	      versionSearch: /MSIE\s(\d+)/
	    }, {
	      name: 'IE',
	      stringSearch: 'Trident',
	      versionSearch: /rv:(\d+)/
	    }];

	    var name = '';
	    var version = '';

	    browsers.some((function (browser) {

	      var nameSearch = browser.stringSearch || browser.name;
	      var defaultVersionSearch = nameSearch + '\\/(\\d+)';
	      var versionSearch = browser.versionSearch || defaultVersionSearch;
	      var versionMatch;

	      if (ua.indexOf(nameSearch) !== -1) {
	        name = browser.name;
	        versionMatch = ua.match(versionSearch);
	        if (versionMatch) {
	          version = versionMatch && versionMatch[1];
	        }
	        return true;
	      }
	    }));

	    return {
	      name: name,
	      version: version
	    };
	  }

	  /**
	   * Return top context domain
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @return {string}  domain of top context url.
	   */
	  function getDomain() {

	    var a = document.createElement('a');
	    a.href = utils.getTopWindowUrl();
	    return a.hostname;
	  }

	  /**
	   * Convert a `string` to an integer with radix 10.
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @param  {string} value string to convert
	   * @return {number}  the converted integer
	   */
	  function parseInt10(value) {
	    return parseInt(value, 10);
	  }

	  /**
	   * Return `true` if a given value is in a certain range, `false` otherwise
	   *
	   * Returns `true` if the distance between `allowedValue` and `value`
	   * is smaller than the value of `tolerance`
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @param  {number} value the value to test
	   * @param  {number} allowedValue the value to test against
	   * @param  {number} tolerance tolerance value
	   * @return {Boolean} `true` if `dimension` is in range, `false` otherwise.
	   */
	  function isValueInRange(value, allowedValue, tolerance) {

	    value = parseInt10(value);
	    allowedValue = parseInt10(allowedValue);
	    tolerance = parseInt10(tolerance);

	    return allowedValue - tolerance <= value && value <= allowedValue + tolerance;
	  }

	  /**
	   * Returns `true` if a size array has both dimensions in range an allowed size array,
	   * `false` otherwise
	   *
	   * Each dimension of `size` will be checked against the corresponding dimension
	   * of `allowedSize`
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @param  {module:HiroMediaAdapter~size} size size array to test
	   * @param  {module:HiroMediaAdapter~size} allowedSize size array to test against
	   * @param  {number} tolerance tolerance value (same for both dimensions)
	   * @return {Boolean} `true` if the dimensions of `size` are in range of the
	   * dimensions of `allowedSize`, `false` otherwise.
	   */
	  function isSizeInRange(size, allowedSize, tolerance) {
	    return isValueInRange(allowedSize[0], size[0], tolerance) && isValueInRange(allowedSize[1], size[1], tolerance);
	  }

	  /**
	   * Normalize sizes and return an array with sizes in WIDTHxHEIGHT format
	   *
	   * Simple wrapper around `util.parseSizesInput`
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @param  {array} sizes array of sizes that are passed to `util.parseSizesInput`
	   * @return {array}  normalized array of sizes.
	   */
	  function normalizeSizes(sizes) {
	    return utils.parseSizesInput(sizes).map((function (size) {
	      return size.split('x');
	    }));
	  }

	  /**
	   * Apply default parameters to an object if the parameters are not set
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @param  {module:HiroMediaAdapter~bidParams} bidParams custom parameters for bid
	   * @return {module:HiroMediaAdapter~bidParams} `bidParams` shallow merged with
	   * {@linkcode module:HiroMediaAdapter~DEFAULT_BID_PARAMS|DEFAULT_BID_PARAMS}
	   */
	  function defaultParams(bidParams) {
	    return _extends({}, DEFAULT_BID_PARAMS, bidParams);
	  }

	  /**
	   * Calculate and return a batchKey key for a bid
	   *
	   * Bid of similar placement can have similar responses,
	   * we can calculate a key based on the variant properties
	   * of a bid which can share the same response
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @param  {module:HiroMediaAdapter~bidInfo} bidInfo bid information
	   * @return {string}  batch key for bid
	   */
	  function getBatchKey(bidInfo) {

	    var bidParams = bidInfo.bidParams;
	    var batchParams = [bidParams.bidUrl, bidParams.accountId, bidInfo.selectedSize.join('x')];

	    return batchParams.join('-');
	  }

	  /**
	   * Build a set of {@linkcode module:HiroMediaAdapter~bidInfo|bidInfo} objects based on the
	   * bids sent to {@linkcode module:HiroMediaAdapter#callBids|callBids}
	   *
	   * This routine determines if a bid request should be sent for the placement, it
	   * will set `selectedSize` based on `params.allowedSize` and calculate the batch
	   * key.
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @param  {object} bids bids sent from `Prebid.js`
	   * @return {array.<module:HiroMediaAdapter~bidInfo>} wrapped bids
	   */
	  function processBids(bids) {

	    var result = [];

	    if (bids) {

	      utils.logMessage('hiromedia.processBids, processing ' + bids.length + ' bids');

	      bids.forEach((function (bid) {

	        var sizes = normalizeSizes(bid.sizes);
	        var bidParams = defaultParams(bid.params);
	        var allowedSizes = normalizeSizes([bidParams.allowedSize])[0];
	        var selectedSize = sizes.find((function (size) {
	          return isSizeInRange(size, allowedSizes, bidParams.sizeTolerance);
	        }));
	        var hasValidBidRequest = utils.hasValidBidRequest(bidParams, REQUIRED_BID_PARAMS, BIDDER_CODE);
	        var shouldBid = hasValidBidRequest && selectedSize !== undefined;
	        var bidInfo = {
	          bid: bid,
	          bidParams: bidParams,
	          selectedSize: selectedSize,
	          shouldBid: shouldBid
	        };

	        if (shouldBid) {
	          bidInfo.batchKey = getBatchKey(bidInfo);
	        }

	        result.push(bidInfo);
	      }));
	    }

	    return result;
	  }

	  /**
	   * Send a bid request to the bid server endpoint
	   *
	   * Calls `adLoader.loadScript`
	   *
	   * @memberof module:HiroMediaAdapter~
	   * @private
	   *
	   * @param  {string} url base url, can already contain query parameters
	   * @param  {object} requestParams parameters to add to query
	   */
	  function sendBidRequest(url, requestParams) {

	    if (requestParams) {

	      if (url.indexOf('?') !== -1) {
	        url = url + '&';
	      } else {
	        url = url + '?';
	      }

	      Object.keys(requestParams).forEach((function (key) {
	        url = utils.tryAppendQueryString(url, key, requestParams[key]);
	      }));
	    }

	    utils.logMessage('hiromedia.callBids, url:' + url);

	    adloader.loadScript(url);
	  }

	  /**
	   * Receive a set of bid placements and create bid requests and responses accordingly
	   *
	   * @alias module:HiroMediaAdapter#callBids
	   *
	   * @param  {object} params placement and bid data from `Prebid.js`
	   */
	  function _callBids(params) {

	    var browser = getBrowser();
	    var domain = getDomain();
	    var bidsRequested = {};

	    utils.logMessage('hiromedia.callBids');

	    if (params) {

	      // Processed bids are stored in the adapter scope
	      _bidStorage = processBids(params.bids);
	    } else {

	      // Ensure we don't run on stale data
	      _bidStorage = [];
	    }

	    if (_bidStorage.length) {

	      // Loop over processed bids and send a request if a request for the bid
	      // batchKey has not been sent.
	      _bidStorage.forEach((function (bidInfo) {

	        var bid = bidInfo.bid;
	        var batchKey = bidInfo.batchKey;
	        var bidParams = bidInfo.bidParams;

	        utils.logMessage('hiromedia.callBids, bidInfo ' + bid.placementCode + ' ' + bidInfo.shouldBid);

	        if (bidInfo.shouldBid) {

	          var url = bidParams.bidUrl;

	          if (!bidsRequested[batchKey]) {

	            bidsRequested[batchKey] = true;

	            sendBidRequest(url, {
	              adapterVersion: ADAPTER_VERSION,
	              callback: 'pbjs.hiromedia_callback',
	              batchKey: batchKey,
	              placementCode: bid.placementCode,
	              accountId: bidParams.accountId,
	              browser: browser.name,
	              browserVersion: browser.version,
	              domain: domain,
	              selectedSize: utils.parseSizesInput([bidInfo.selectedSize]),
	              placementSizes: utils.parseSizesInput(bid.sizes)
	            });
	          }
	        } else {

	          // No bid
	          addBidResponse(bidInfo, false);
	        }
	      }));
	    }
	  }

	  return {
	    callBids: _callBids
	  };

	  // JSDoc typedefs

	  /**
	   * A size array where the width is the first array item and the height is
	   * the second array item.
	   *
	   * @typedef {array.<number>} module:HiroMediaAdapter~size
	   * @private
	   */

	  /**
	   * Parameters for bids to HIRO Media adapter
	   *
	   * @typedef {object} module:HiroMediaAdapter~bidParams
	   * @private
	   *
	   * @property {string} bidUrl the bid server endpoint url
	   * @property {module:HiroMediaAdapter~size} allowedSize allowed placement size
	   * @property {number} sizeTolerance custom tolerance for `allowedSize`
	   */

	  /**
	   * Bid object wrapper
	   *
	   * @typedef {object} module:HiroMediaAdapter~bidInfo
	   * @private
	   *
	   * @property {object} bid original bid passed to #callBids
	   * @property {module:HiroMediaAdapter~size} selectedSize the selected size of the placement
	   * @property {string} batchKey key used for batching requests which have the same basic properties
	   * @property {module:HiroMediaAdapter~bidParams} bidParams original params passed for bid in #callBids
	   * @property {boolean} shouldBid flag to determine if the bid is valid for bidding or not
	   */

	  /**
	   * browserInfo
	   *
	   * @typedef {object} module:HiroMediaAdapter~browserInfo
	   * @private
	   *
	   * @property {string} name browser name (e.g. `'Chrome'` or `'Firefox'`)
	   * @property {string} version browser major version (e.g. `'53'`)
	   */
	};

	module.exports = HiroMediaAdapter;

/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	//Factory for creating the bidderAdaptor
	// jshint ignore:start
	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var ADAPTER_NAME = 'INDEXEXCHANGE';
	var ADAPTER_CODE = 'indexExchange';

	var CONSTANTS = {
	  "INDEX_DEBUG_MODE": {
	    "queryParam": "pbjs_ix_debug",
	    "mode": {
	      "sandbox": {
	        "topFrameLimit": 10,
	        "queryValue": "sandbox",
	        "siteID": "999990"
	      }
	    }
	  }
	};

	var OPEN_MARKET = 'IOM';
	var PRIVATE_MARKET = 'IPM';

	window.cygnus_index_parse_res = function (response) {
	  try {
	    if (response) {
	      if ((typeof _IndexRequestData === 'undefined' ? 'undefined' : _typeof(_IndexRequestData)) !== "object" || _typeof(_IndexRequestData.impIDToSlotID) !== "object" || typeof _IndexRequestData.impIDToSlotID[response.id] === "undefined") {
	        return;
	      }
	      var targetMode = 1;
	      var callbackFn;
	      if (_typeof(_IndexRequestData.reqOptions) === 'object' && _typeof(_IndexRequestData.reqOptions[response.id]) === 'object') {
	        if (typeof _IndexRequestData.reqOptions[response.id].callback === "function") {
	          callbackFn = _IndexRequestData.reqOptions[response.id].callback;
	        }
	        if (typeof _IndexRequestData.reqOptions[response.id].targetMode === "number") {
	          targetMode = _IndexRequestData.reqOptions[response.id].targetMode;
	        }
	      }

	      _IndexRequestData.lastRequestID = response.id;
	      _IndexRequestData.targetIDToBid = {};
	      _IndexRequestData.targetIDToResp = {};
	      _IndexRequestData.targetIDToCreative = {};

	      var allBids = [];
	      var seatbidLength = typeof response.seatbid === "undefined" ? 0 : response.seatbid.length;
	      for (var i = 0; i < seatbidLength; i++) {
	        for (var j = 0; j < response.seatbid[i].bid.length; j++) {
	          var bid = response.seatbid[i].bid[j];
	          if (_typeof(bid.ext) !== "object" || typeof bid.ext.pricelevel !== "string") {
	            continue;
	          }
	          if (typeof _IndexRequestData.impIDToSlotID[response.id][bid.impid] === "undefined") {
	            continue;
	          }
	          var slotID = _IndexRequestData.impIDToSlotID[response.id][bid.impid];
	          var targetID;
	          var noTargetModeTargetID;
	          var targetPrefix;
	          if (typeof bid.ext.dealid === "string") {
	            if (targetMode === 1) {
	              targetID = slotID + bid.ext.pricelevel;
	            } else {
	              targetID = slotID + "_" + bid.ext.dealid;
	            }
	            noTargetModeTargetID = slotID + '_' + bid.ext.dealid;
	            targetPrefix = PRIVATE_MARKET + '_';
	          } else {
	            targetID = slotID + bid.ext.pricelevel;
	            noTargetModeTargetID = slotID + bid.ext.pricelevel;
	            targetPrefix = OPEN_MARKET + '_';
	          }
	          if (_IndexRequestData.targetIDToBid[targetID] === undefined) {
	            _IndexRequestData.targetIDToBid[targetID] = [bid.adm];
	          } else {
	            _IndexRequestData.targetIDToBid[targetID].push(bid.adm);
	          }
	          if (_IndexRequestData.targetIDToCreative[noTargetModeTargetID] === undefined) {
	            _IndexRequestData.targetIDToCreative[noTargetModeTargetID] = [bid.adm];
	          } else {
	            _IndexRequestData.targetIDToCreative[noTargetModeTargetID].push(bid.adm);
	          }
	          var impBid = {};
	          impBid.impressionID = bid.impid;
	          if (typeof bid.ext.dealid !== 'undefined') {
	            impBid.dealID = bid.ext.dealid;
	          }
	          impBid.bid = bid.price;
	          impBid.slotID = slotID;
	          impBid.priceLevel = bid.ext.pricelevel;
	          impBid.target = targetPrefix + targetID;
	          _IndexRequestData.targetIDToResp[targetID] = impBid;
	          allBids.push(impBid);
	        }
	      }
	      if (typeof callbackFn === "function") {
	        if (allBids.length === 0) {
	          callbackFn(response.id);
	        } else {
	          callbackFn(response.id, allBids);
	        }
	      }
	    }
	  } catch (e) {}

	  if (typeof window.cygnus_index_ready_state === 'function') {
	    window.cygnus_index_ready_state();
	  }
	};

	window.index_render = function (doc, targetID) {
	  try {
	    var ad = _IndexRequestData.targetIDToCreative[targetID].pop();
	    if (ad != null) {
	      doc.write(ad);
	    } else {
	      var url = window.location.protocol === 'https:' ? 'https://as-sec.casalemedia.com' : 'http://as.casalemedia.com';
	      url += '/headerstats?type=RT&s=' + cygnus_index_args.siteID + '&u=' + encodeURIComponent(location.href) + '&r=' + _IndexRequestData.lastRequestID;
	      var px_call = new Image();
	      px_call.src = url + '&blank=' + targetID;
	    }
	  } catch (e) {}
	};

	window.headertag_render = function (doc, targetID, slotID) {
	  var index_slot = slotID;
	  var index_ary = targetID.split(',');
	  for (var i = 0; i < index_ary.length; i++) {
	    var unpack = index_ary[i].split('_');
	    if (unpack[0] == index_slot) {
	      index_render(doc, index_ary[i]);
	      return;
	    }
	  }
	};

	window.cygnus_index_args = {};

	var cygnus_index_adunits = [[728, 90], [120, 600], [300, 250], [160, 600], [336, 280], [234, 60], [300, 600], [300, 50], [320, 50], [970, 250], [300, 1050], [970, 90], [180, 150]]; // jshint ignore:line

	var getIndexDebugMode = function getIndexDebugMode() {
	  return getParameterByName(CONSTANTS.INDEX_DEBUG_MODE.queryParam).toUpperCase();
	};

	var getParameterByName = function getParameterByName(name) {
	  var wdw = window;
	  var childsReferrer = '';
	  for (var x = 0; x < CONSTANTS.INDEX_DEBUG_MODE.mode.sandbox.topFrameLimit; x++) {
	    if (wdw.parent == wdw) {
	      break;
	    }
	    try {
	      childsReferrer = wdw.document.referrer;
	    } catch (err) {}
	    wdw = wdw.parent;
	  }
	  var topURL = top === self ? location.href : childsReferrer;
	  var regexS = '[\\?&]' + name + '=([^&#]*)';
	  var regex = new RegExp(regexS);
	  var results = regex.exec(topURL);
	  if (results === null) {
	    return '';
	  }
	  return decodeURIComponent(results[1].replace(/\+/g, ' '));
	};

	var cygnus_index_start = function cygnus_index_start() {
	  window.cygnus_index_args.parseFn = cygnus_index_parse_res;
	  var escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
	  var meta = {
	    '\b': '\\b',
	    '\t': '\\t',
	    '\n': '\\n',
	    '\f': '\\f',
	    '\r': '\\r',
	    '"': '\\"',
	    '\\': '\\\\'
	  };

	  function escapeCharacter(character) {
	    var escaped = meta[character];
	    if (typeof escaped === 'string') {
	      return escaped;
	    } else {
	      return '\\u' + ('0000' + character.charCodeAt(0).toString(16)).slice(-4);
	    }
	  }

	  function quote(string) {
	    escapable.lastIndex = 0;
	    if (escapable.test(string)) {
	      return string.replace(escapable, escapeCharacter);
	    } else {
	      return string;
	    }
	  }

	  function OpenRTBRequest(siteID, parseFn, timeoutDelay) {
	    this.initialized = false;
	    if (typeof siteID !== 'number' || siteID % 1 !== 0 || siteID < 0) {
	      throw 'Invalid Site ID';
	    }

	    timeoutDelay = Number(timeoutDelay);
	    if (typeof timeoutDelay === 'number' && timeoutDelay % 1 === 0 && timeoutDelay >= 0) {
	      this.timeoutDelay = timeoutDelay;
	    }

	    this.siteID = siteID;
	    this.impressions = [];
	    this._parseFnName = undefined;
	    if (top === self) {
	      this.sitePage = location.href;
	      this.topframe = 1;
	    } else {
	      this.sitePage = document.referrer;
	      this.topframe = 0;
	    }

	    if (typeof parseFn !== 'undefined') {
	      if (typeof parseFn === 'function') {
	        this._parseFnName = 'cygnus_index_args.parseFn';
	      } else {
	        throw 'Invalid jsonp target function';
	      }
	    }

	    if (typeof _IndexRequestData.requestCounter === 'undefined') {
	      _IndexRequestData.requestCounter = Math.floor(Math.random() * 256);
	    } else {
	      _IndexRequestData.requestCounter = (_IndexRequestData.requestCounter + 1) % 256;
	    }

	    this.requestID = String(new Date().getTime() % 2592000 * 256 + _IndexRequestData.requestCounter + 256);
	    this.initialized = true;
	  }

	  OpenRTBRequest.prototype.serialize = function () {
	    var json = '{"id":"' + this.requestID + '","site":{"page":"' + quote(this.sitePage) + '"';
	    if (typeof document.referrer === 'string' && document.referrer !== "") {
	      json += ',"ref":"' + quote(document.referrer) + '"';
	    }

	    json += '},"imp":[';
	    for (var i = 0; i < this.impressions.length; i++) {
	      var impObj = this.impressions[i];
	      var ext = [];
	      json += '{"id":"' + impObj.id + '", "banner":{"w":' + impObj.w + ',"h":' + impObj.h + ',"topframe":' + String(this.topframe) + '}';
	      if (typeof impObj.bidfloor === 'number') {
	        json += ',"bidfloor":' + impObj.bidfloor;
	        if (typeof impObj.bidfloorcur === 'string') {
	          json += ',"bidfloorcur":"' + quote(impObj.bidfloorcur) + '"';
	        }
	      }

	      if (typeof impObj.slotID === 'string' && !impObj.slotID.match(/^\s*$/)) {
	        ext.push('"sid":"' + quote(impObj.slotID) + '"');
	      }

	      if (typeof impObj.siteID === 'number') {
	        ext.push('"siteID":' + impObj.siteID);
	      }

	      if (ext.length > 0) {
	        json += ',"ext": {' + ext.join() + '}';
	      }

	      if (i + 1 === this.impressions.length) {
	        json += '}';
	      } else {
	        json += '},';
	      }
	    }

	    json += ']}';
	    return json;
	  };

	  OpenRTBRequest.prototype.setPageOverride = function (sitePageOverride) {
	    if (typeof sitePageOverride === 'string' && !sitePageOverride.match(/^\s*$/)) {
	      this.sitePage = sitePageOverride;
	      return true;
	    } else {
	      return false;
	    }
	  };

	  OpenRTBRequest.prototype.addImpression = function (width, height, bidFloor, bidFloorCurrency, slotID, siteID) {
	    var impObj = {
	      id: String(this.impressions.length + 1)
	    };
	    if (typeof width !== 'number' || width <= 1) {
	      return null;
	    }

	    if (typeof height !== 'number' || height <= 1) {
	      return null;
	    }

	    if ((typeof slotID === 'string' || typeof slotID === 'number') && String(slotID).length <= 50) {
	      impObj.slotID = String(slotID);
	    }

	    impObj.w = width;
	    impObj.h = height;
	    if (bidFloor !== undefined && typeof bidFloor !== 'number') {
	      return null;
	    }

	    if (typeof bidFloor === 'number') {
	      if (bidFloor < 0) {
	        return null;
	      }

	      impObj.bidfloor = bidFloor;
	      if (bidFloorCurrency !== undefined && typeof bidFloorCurrency !== 'string') {
	        return null;
	      }

	      impObj.bidfloorcur = bidFloorCurrency;
	    }

	    if (typeof siteID !== 'undefined') {
	      if (typeof siteID === 'number' && siteID % 1 === 0 && siteID >= 0) {
	        impObj.siteID = siteID;
	      } else {
	        return null;
	      }
	    }

	    this.impressions.push(impObj);
	    return impObj.id;
	  };

	  OpenRTBRequest.prototype.buildRequest = function () {
	    if (this.impressions.length === 0 || this.initialized !== true) {
	      return;
	    }

	    var jsonURI = encodeURIComponent(this.serialize());

	    var scriptSrc;
	    if (getIndexDebugMode() == CONSTANTS.INDEX_DEBUG_MODE.mode.sandbox.queryValue.toUpperCase()) {
	      this.siteID = CONSTANTS.INDEX_DEBUG_MODE.mode.sandbox.siteID;
	      scriptSrc = window.location.protocol === 'https:' ? 'https://sandbox.ht.indexexchange.com' : 'http://sandbox.ht.indexexchange.com';
	      utils.logMessage('IX DEBUG: Sandbox mode activated');
	    } else {
	      scriptSrc = window.location.protocol === 'https:' ? 'https://as-sec.casalemedia.com' : 'http://as.casalemedia.com';
	    }
	    var prebidVersion = encodeURIComponent("0.21.0-pre");
	    scriptSrc += '/cygnus?v=7&fn=cygnus_index_parse_res&s=' + this.siteID + '&r=' + jsonURI + '&pid=pb' + prebidVersion;
	    if (typeof this.timeoutDelay === 'number' && this.timeoutDelay % 1 === 0 && this.timeoutDelay >= 0) {
	      scriptSrc += '&t=' + this.timeoutDelay;
	    }

	    return scriptSrc;
	  };

	  try {
	    if (typeof cygnus_index_args === 'undefined' || typeof cygnus_index_args.siteID === 'undefined' || typeof cygnus_index_args.slots === 'undefined') {
	      return;
	    }

	    var req = new OpenRTBRequest(cygnus_index_args.siteID, cygnus_index_args.parseFn, cygnus_index_args.timeout);
	    if (cygnus_index_args.url && typeof cygnus_index_args.url === 'string') {
	      req.setPageOverride(cygnus_index_args.url);
	    }

	    _IndexRequestData.impIDToSlotID[req.requestID] = {};
	    _IndexRequestData.reqOptions[req.requestID] = {};
	    var slotDef, impID;

	    for (var i = 0; i < cygnus_index_args.slots.length; i++) {
	      slotDef = cygnus_index_args.slots[i];

	      impID = req.addImpression(slotDef.width, slotDef.height, slotDef.bidfloor, slotDef.bidfloorcur, slotDef.id, slotDef.siteID);
	      if (impID) {
	        _IndexRequestData.impIDToSlotID[req.requestID][impID] = String(slotDef.id);
	      }
	    }

	    if (typeof cygnus_index_args.targetMode === 'number') {
	      _IndexRequestData.reqOptions[req.requestID].targetMode = cygnus_index_args.targetMode;
	    }

	    if (typeof cygnus_index_args.callback === 'function') {
	      _IndexRequestData.reqOptions[req.requestID].callback = cygnus_index_args.callback;
	    }

	    return req.buildRequest();
	  } catch (e) {
	    utils.logError('Error calling index adapter', ADAPTER_NAME, e);
	  }
	};

	var IndexExchangeAdapter = function IndexExchangeAdapter() {
	  var slotIdMap = {};
	  var requiredParams = [
	  /* 0 */
	  'id',
	  /* 1 */
	  'siteID'];
	  var firstAdUnitCode = '';

	  function _callBids(request) {
	    var bidArr = request.bids;

	    if (typeof window._IndexRequestData === 'undefined') {
	      window._IndexRequestData = {};
	      window._IndexRequestData.impIDToSlotID = {};
	      window._IndexRequestData.reqOptions = {};
	    }
	    // clear custom targets at the beginning of every request
	    _IndexRequestData.targetAggregate = { 'open': {}, 'private': {} };

	    if (!utils.hasValidBidRequest(bidArr[0].params, requiredParams, ADAPTER_NAME)) {
	      return;
	    }

	    //Our standard is to always bid for all known slots.
	    cygnus_index_args.slots = [];

	    var expectedBids = 0;

	    //Grab the slot level data for cygnus_index_args
	    for (var i = 0; i < bidArr.length; i++) {
	      var bid = bidArr[i];
	      var sizeID = 0;

	      expectedBids++;

	      // Expecting nested arrays for sizes
	      if (!(bid.sizes[0] instanceof Array)) {
	        bid.sizes = [bid.sizes];
	      }

	      // Create index slots for all bids and sizes
	      for (var j = 0; j < bid.sizes.length; j++) {
	        var validSize = false;
	        for (var k = 0; k < cygnus_index_adunits.length; k++) {
	          if (bid.sizes[j][0] == cygnus_index_adunits[k][0] && bid.sizes[j][1] == cygnus_index_adunits[k][1]) {
	            bid.sizes[j][0] = Number(bid.sizes[j][0]);
	            bid.sizes[j][1] = Number(bid.sizes[j][1]);
	            validSize = true;
	            break;
	          }
	        }

	        if (!validSize) {
	          utils.logMessage(ADAPTER_NAME + " slot excluded from request due to no valid sizes");
	          continue;
	        }

	        var usingSizeSpecificSiteID = false;
	        // Check for size defined in bidder params 
	        if (bid.params.size && bid.params.size instanceof Array) {
	          if (!(bid.sizes[j][0] == bid.params.size[0] && bid.sizes[j][1] == bid.params.size[1])) continue;
	          usingSizeSpecificSiteID = true;
	        }

	        if (bid.params.timeout && typeof cygnus_index_args.timeout === 'undefined') {
	          cygnus_index_args.timeout = bid.params.timeout;
	        }

	        var siteID = Number(bid.params.siteID);
	        if (typeof siteID !== "number" || siteID % 1 != 0 || siteID <= 0) {
	          utils.logMessage(ADAPTER_NAME + " slot excluded from request due to invalid siteID");
	          continue;
	        }
	        if (siteID && typeof cygnus_index_args.siteID === 'undefined') {
	          cygnus_index_args.siteID = siteID;
	        }

	        if (utils.hasValidBidRequest(bid.params, requiredParams, ADAPTER_NAME)) {
	          firstAdUnitCode = bid.placementCode;
	          var slotID = bid.params[requiredParams[0]];
	          if (typeof slotID !== 'string' && typeof slotID !== 'number') {
	            utils.logError(ADAPTER_NAME + " bid contains invalid slot ID from " + bid.placementCode + ". Discarding slot");
	            continue;
	          }

	          sizeID++;
	          var size = {
	            width: bid.sizes[j][0],
	            height: bid.sizes[j][1]
	          };

	          var slotName = usingSizeSpecificSiteID ? String(slotID) : slotID + '_' + sizeID;
	          slotIdMap[slotName] = bid;

	          //Doesn't need the if(primary_request) conditional since we are using the mergeSlotInto function which is safe
	          cygnus_index_args.slots = mergeSlotInto({
	            id: slotName,
	            width: size.width,
	            height: size.height,
	            siteID: siteID || cygnus_index_args.siteID
	          }, cygnus_index_args.slots);

	          if (bid.params.tier2SiteID) {
	            var tier2SiteID = Number(bid.params.tier2SiteID);
	            if (typeof tier2SiteID !== 'undefined' && !tier2SiteID) {
	              continue;
	            }

	            cygnus_index_args.slots = mergeSlotInto({
	              id: 'T1_' + slotName,
	              width: size.width,
	              height: size.height,
	              siteID: tier2SiteID
	            }, cygnus_index_args.slots);
	          }

	          if (bid.params.tier3SiteID) {
	            var tier3SiteID = Number(bid.params.tier3SiteID);
	            if (typeof tier3SiteID !== 'undefined' && !tier3SiteID) {
	              continue;
	            }

	            cygnus_index_args.slots = mergeSlotInto({
	              id: 'T2_' + slotName,
	              width: size.width,
	              height: size.height,
	              siteID: tier3SiteID
	            }, cygnus_index_args.slots);
	          }
	        }
	      }
	    }

	    if (cygnus_index_args.slots.length > 20) {
	      utils.logError('Too many unique sizes on slots, will use the first 20.', ADAPTER_NAME);
	    }

	    //bidmanager.setExpectedBidsCount(ADAPTER_CODE, expectedBids);
	    adloader.loadScript(cygnus_index_start());

	    var responded = false;

	    // Handle response
	    window.cygnus_index_ready_state = function () {
	      if (responded) {
	        return;
	      }
	      responded = true;

	      try {
	        var indexObj = _IndexRequestData.targetIDToBid;
	        var lookupObj = cygnus_index_args;

	        // Grab all the bids for each slot
	        for (var adSlotId in slotIdMap) {
	          var bidObj = slotIdMap[adSlotId];
	          var adUnitCode = bidObj.placementCode;

	          var bids = [];

	          // Grab the bid for current slot
	          for (var cpmAndSlotId in indexObj) {
	            var match = /^(T\d_)?(.+)_(\d+)$/.exec(cpmAndSlotId);
	            // if parse fail, move to next bid
	            if (!match) {
	              utils.logError("Unable to parse " + cpmAndSlotId + ", skipping slot", ADAPTER_NAME);
	              continue;
	            }
	            var tier = match[1] || '';
	            var slotID = match[2];
	            var currentCPM = match[3];

	            var slotObj = getSlotObj(cygnus_index_args, tier + slotID);
	            // Bid is for the current slot
	            if (slotID === adSlotId) {
	              var bid = bidfactory.createBid(1);
	              bid.cpm = currentCPM / 100;
	              bid.ad = indexObj[cpmAndSlotId][0];
	              bid.bidderCode = ADAPTER_CODE;
	              bid.width = slotObj.width;
	              bid.height = slotObj.height;
	              bid.siteID = slotObj.siteID;
	              if (_typeof(_IndexRequestData.targetIDToResp) === 'object' && _typeof(_IndexRequestData.targetIDToResp[cpmAndSlotId]) === 'object' && typeof _IndexRequestData.targetIDToResp[cpmAndSlotId].dealID !== 'undefined') {
	                if (typeof _IndexRequestData.targetAggregate['private'][adUnitCode] === 'undefined') _IndexRequestData.targetAggregate['private'][adUnitCode] = [];
	                bid.dealId = _IndexRequestData.targetIDToResp[cpmAndSlotId].dealID;
	                _IndexRequestData.targetAggregate['private'][adUnitCode].push(slotID + "_" + _IndexRequestData.targetIDToResp[cpmAndSlotId].dealID);
	              } else {
	                if (typeof _IndexRequestData.targetAggregate['open'][adUnitCode] === 'undefined') _IndexRequestData.targetAggregate['open'][adUnitCode] = [];
	                _IndexRequestData.targetAggregate['open'][adUnitCode].push(slotID + "_" + currentCPM);
	              }
	              bids.push(bid);
	            }
	          }

	          var currentBid = undefined;

	          if (bids.length > 0) {
	            // Add all bid responses
	            for (var i = 0; i < bids.length; i++) {
	              bidmanager.addBidResponse(adUnitCode, bids[i]);
	            }
	            // No bids for expected bid, pass bid
	          } else {
	            var bid = bidfactory.createBid(2);
	            bid.bidderCode = ADAPTER_CODE;
	            currentBid = bid;
	            bidmanager.addBidResponse(adUnitCode, currentBid);
	          }
	        }
	      } catch (e) {
	        utils.logError('Error calling index adapter', ADAPTER_NAME, e);
	        logErrorBidResponse();
	      } finally {
	        // ensure that previous targeting mapping is cleared
	        _IndexRequestData.targetIDToBid = {};
	      }

	      //slotIdMap is used to determine which slots will be bid on in a given request.
	      //Therefore it needs to be blanked after the request is handled, else we will submit 'bids' for the wrong ads.
	      slotIdMap = {};
	    };
	  }

	  /*
	  Function in order to add a slot into the list if it hasn't been created yet, else it returns the same list.
	  */
	  function mergeSlotInto(slot, slotList) {
	    for (var i = 0; i < slotList.length; i++) {
	      if (slot.id === slotList[i].id) {
	        return slotList;
	      }
	    }
	    slotList.push(slot);
	    return slotList;
	  }

	  function getSlotObj(obj, id) {
	    var arr = obj.slots;
	    var returnObj = {};
	    utils._each(arr, (function (value) {
	      if (value.id === id) {
	        returnObj = value;
	      }
	    }));

	    return returnObj;
	  }

	  function logErrorBidResponse() {
	    //no bid response
	    var bid = bidfactory.createBid(2);
	    bid.bidderCode = ADAPTER_CODE;

	    //log error to first add unit
	    bidmanager.addBidResponse(firstAdUnitCode, bid);
	  }

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = IndexExchangeAdapter;

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	function _qs(key, value) {
	  return encodeURIComponent(key) + '=' + encodeURIComponent(value);
	}

	function _makeBidResponse(placementCode, bid) {
	  var bidResponse = bidfactory.createBid(bid !== undefined ? 1 : 2);
	  bidResponse.bidderCode = 'kruxlink';
	  if (bid !== undefined) {
	    bidResponse.cpm = bid.price;
	    bidResponse.ad = bid.adm;
	    bidResponse.width = bid.w;
	    bidResponse.height = bid.h;
	  }
	  bidmanager.addBidResponse(placementCode, bidResponse);
	}

	function _makeCallback(id, placements) {
	  var callback = '_kruxlink_' + id;
	  pbjs[callback] = function (response) {
	    // Clean up our callback
	    delete pbjs[callback];

	    // Add in the bid respones
	    if (response.seatbid !== undefined) {
	      for (var i = 0; i < response.seatbid.length; i++) {
	        var seatbid = response.seatbid[i];
	        if (seatbid.bid !== undefined) {
	          for (var j = 0; j < seatbid.bid.length; j++) {
	            var bid = seatbid.bid[j];
	            if (bid.impid !== undefined) {
	              _makeBidResponse(placements[bid.impid], bid);
	              delete placements[bid.impid];
	            }
	          }
	        }
	      }
	    }

	    // Add any no-bids remaining
	    for (var impid in placements) {
	      if (placements.hasOwnProperty(impid)) {
	        _makeBidResponse(placements[impid]);
	      }
	    }
	  };

	  return 'pbjs.' + callback;
	}

	function _callBids(params) {
	  var impids = [];
	  var placements = {};

	  var bids = params.bids || [];
	  for (var i = 0; i < bids.length; i++) {
	    var bidRequest = bids[i];
	    var bidRequestParams = bidRequest.params || {};
	    var impid = bidRequestParams.impid;
	    placements[impid] = bidRequest.placementCode;

	    impids.push(impid);
	  }

	  var callback = _makeCallback(params.bidderRequestId, placements);
	  var qs = [_qs('id', params.bidderRequestId), _qs('u', window.location.href), _qs('impid', impids.join(',')), _qs('calltype', 'pbd'), _qs('callback', callback)];
	  var url = 'https://link.krxd.net/hb?' + qs.join('&');

	  adloader.loadScript(url);
	}

	module.exports = function KruxAdapter() {
	  return {
	    callBids: _callBids
	  };
	};

/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _constants = __webpack_require__(3);

	var bidfactory = __webpack_require__(10); /*jshint loopfunc: true */

	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var GetIntentAdapter = function GetIntentAdapter() {
	  var headerBiddingStaticJS = window.location.protocol + '//cdn.adhigh.net/adserver/hb.js';

	  function _callBids(params) {
	    if (typeof window.gi_hb === 'undefined') {
	      adloader.loadScript(headerBiddingStaticJS, (function () {
	        bid(params);
	      }), true);
	    } else {
	      bid(params);
	    }
	  }

	  function addOptional(params, request, props) {
	    for (var i = 0; i < props.length; i++) {
	      if (params.hasOwnProperty(props[i])) {
	        request[props[i]] = params[props[i]];
	      }
	    }
	  }

	  function bid(params) {
	    var bids = params.bids || [];
	    for (var i = 0; i < bids.length; i++) {
	      var bidRequest = bids[i];
	      var request = {
	        pid: bidRequest.params.pid, // required
	        tid: bidRequest.params.tid, // required
	        known: bidRequest.params.known || 1,
	        is_video: bidRequest.mediaType === 'video',
	        video: bidRequest.params.video || {},
	        size: bidRequest.sizes[0].join("x")
	      };
	      addOptional(bidRequest.params, request, ['cur', 'floor']);
	      (function (r, br) {
	        window.gi_hb.makeBid(r, (function (bidResponse) {
	          if (bidResponse.no_bid === 1) {
	            var nobid = bidfactory.createBid(_constants.STATUS.NO_BID);
	            nobid.bidderCode = br.bidder;
	            bidmanager.addBidResponse(br.placementCode, nobid);
	          } else {
	            var bid = bidfactory.createBid(_constants.STATUS.GOOD);
	            var size = bidResponse.size.split('x');
	            bid.bidderCode = br.bidder;
	            bid.cpm = bidResponse.cpm;
	            bid.width = size[0];
	            bid.height = size[1];
	            if (br.mediaType === 'video') {
	              bid.vastUrl = bidResponse.vast_url;
	              bid.descriptionUrl = bidResponse.vast_url;
	            } else {
	              bid.ad = bidResponse.ad;
	            }
	            bidmanager.addBidResponse(br.placementCode, bid);
	          }
	        }));
	      })(request, bidRequest);
	    }
	  }

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = GetIntentAdapter;

/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _adapter = __webpack_require__(14);

	var _adapter2 = _interopRequireDefault(_adapter);

	var _bidfactory = __webpack_require__(10);

	var _bidfactory2 = _interopRequireDefault(_bidfactory);

	var _bidmanager = __webpack_require__(11);

	var _bidmanager2 = _interopRequireDefault(_bidmanager);

	var _utils = __webpack_require__(2);

	var utils = _interopRequireWildcard(_utils);

	var _ajax = __webpack_require__(21);

	var _constants = __webpack_require__(3);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	var ENDPOINT = '//bidder.komoona.com/v1/GetSBids';

	function KomoonaAdapter() {

	  var baseAdapter = _adapter2['default'].createNew('komoona');
	  var bidRequests = {};

	  /* Prebid executes this function when the page asks to send out bid requests */
	  baseAdapter.callBids = function (bidRequest) {
	    var bids = bidRequest.bids || [];
	    var tags = bids.filter((function (bid) {
	      return valid(bid);
	    })).map((function (bid) {
	      // map request id to bid object to retrieve adUnit code in callback
	      bidRequests[bid.bidId] = bid;

	      var tag = {};
	      tag.sizes = bid.sizes;
	      tag.uuid = bid.bidId;
	      tag.placementid = bid.params.placementId;
	      tag.hbid = bid.params.hbid;

	      return tag;
	    }));

	    if (!utils.isEmpty(tags)) {
	      var payload = JSON.stringify({ bids: [].concat(_toConsumableArray(tags)) });

	      (0, _ajax.ajax)(ENDPOINT, handleResponse, payload, {
	        contentType: 'text/plain',
	        withCredentials: true
	      });
	    }
	  };

	  /* Notify Prebid of bid responses so bids can get in the auction */
	  function handleResponse(response) {
	    var parsed = void 0;

	    try {
	      parsed = JSON.parse(response);
	    } catch (error) {
	      utils.logError(error);
	    }

	    if (!parsed || parsed.error) {
	      var errorMessage = 'in response for ' + baseAdapter.getBidderCode() + ' adapter';
	      if (parsed && parsed.error) {
	        errorMessage += ': ' + parsed.error;
	      }
	      utils.logError(errorMessage);

	      // signal this response is complete
	      Object.keys(bidRequests).map((function (bidId) {
	        return bidRequests[bidId].placementCode;
	      })).forEach((function (placementCode) {
	        _bidmanager2['default'].addBidResponse(placementCode, createBid(_constants.STATUS.NO_BID));
	      }));

	      return;
	    }

	    parsed.bids.forEach((function (tag) {
	      var status = void 0;
	      if (tag.cpm > 0 && tag.creative) {
	        status = _constants.STATUS.GOOD;
	      } else {
	        status = _constants.STATUS.NO_BID;
	      }

	      tag.bidId = tag.uuid; // bidfactory looks for bidId on requested bid
	      var bid = createBid(status, tag);
	      var placement = bidRequests[bid.adId].placementCode;

	      _bidmanager2['default'].addBidResponse(placement, bid);
	    }));
	  }

	  /* Check that a bid has required paramters */
	  function valid(bid) {
	    if (bid.params.placementId && bid.params.hbid) {
	      return bid;
	    } else {
	      utils.logError('bid requires placementId and hbid params');
	    }
	  }

	  /* Create and return a bid object based on status and tag */
	  function createBid(status, tag) {
	    var bid = _bidfactory2['default'].createBid(status, tag);
	    bid.code = baseAdapter.getBidderCode();
	    bid.bidderCode = baseAdapter.getBidderCode();

	    if (status === _constants.STATUS.GOOD) {
	      bid.cpm = tag.cpm;
	      bid.width = tag.width;
	      bid.height = tag.height;
	      bid.ad = tag.creative;
	    }

	    return bid;
	  }

	  return {
	    createNew: KomoonaAdapter.createNew,
	    callBids: baseAdapter.callBids,
	    setBidderCode: baseAdapter.setBidderCode
	  };
	}

	KomoonaAdapter.createNew = function () {
	  return new KomoonaAdapter();
	};

	module.exports = KomoonaAdapter;

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var utils = __webpack_require__(2);
	var adloader = __webpack_require__(13);

	var LifestreetAdapter = function LifestreetAdapter() {
	  var BIDDER_CODE = 'lifestreet';
	  var ADAPTER_VERSION = 'prebidJS-1.0';
	  var SLOTS_LOAD_MAP = {};
	  var PREBID_REQUEST_MESSAGE = 'LSMPrebid Request';
	  var PREBID_RESPONSE_MESSAGE = 'LSMPrebid Response';

	  function _callBids(params) {
	    utils._each(params.bids, (function (bid) {
	      var jstagUrl = bid.params.jstag_url;
	      var slot = bid.params.slot;
	      var adkey = bid.params.adkey;
	      var adSize = bid.params.ad_size;
	      var timeout = 700;
	      if (bid.params.timeout) {
	        timeout = bid.params.timeout;
	      }
	      var shouldRequest = false;
	      if (jstagUrl && jstagUrl.length > 0 && slot && slot.length > 0 && adkey && adkey.length > 0 && adSize && adSize.length > 0) {
	        var adSizeArray = adSize.split('x');
	        for (var i = 0; i < adSizeArray.length; ++i) {
	          adSizeArray[i] = +adSizeArray[i];
	        }
	        if (bid.sizes && bid.sizes instanceof Array && bid.sizes.length > 0 && adSizeArray.length > 1) {
	          bid.sizes = !(bid.sizes[0] instanceof Array) ? [bid.sizes] : bid.sizes;
	          for (var _i = 0; _i < bid.sizes.length; ++_i) {
	            var size = bid.sizes[_i];
	            if (size.length > 1) {
	              if (size[0] === adSizeArray[0] && size[1] === adSizeArray[1]) {
	                shouldRequest = true;
	                break;
	              }
	            }
	          }
	        } else {
	          shouldRequest = true;
	        }
	      }
	      if (shouldRequest) {
	        _callJSTag(bid, jstagUrl, timeout);
	      } else {
	        _addSlotBidResponse(bid, 0, null, 0, 0);
	      }
	    }));
	  }

	  function _callJSTag(bid, jstagUrl, timeout) {
	    adloader.loadScript(jstagUrl, (function () {
	      /*global LSM_Slot */
	      if (LSM_Slot && typeof LSM_Slot === 'function') {
	        var slotTagParams = {
	          _preload: 'wait',
	          _hb_request: ADAPTER_VERSION,
	          _timeout: timeout,
	          _onload: function _onload(slot, action, cpm, width, height) {
	            if (slot.state() !== 'error') {
	              var slotName = slot.getSlotObjectName();
	              pbjs[slotName] = slot;
	              if (slotName && !SLOTS_LOAD_MAP[slotName]) {
	                SLOTS_LOAD_MAP[slotName] = true;
	                var ad = _constructLSMAd(jstagUrl, slotName);
	                _addSlotBidResponse(bid, cpm, ad, width, height);
	              } else {
	                slot.show();
	              }
	            } else {
	              _addSlotBidResponse(bid, 0, null, 0, 0);
	            }
	          }
	        };
	        for (var property in bid.params) {
	          if (property === 'jstag_url' || property === 'timeout') {
	            continue;
	          }
	          if (bid.params.hasOwnProperty(property)) {
	            slotTagParams[property] = bid.params[property];
	          }
	        }
	        /*jshint newcap: false */
	        LSM_Slot(slotTagParams);
	        window.addEventListener('message', (function (ev) {
	          var key = ev.message ? 'message' : 'data';
	          var object = {};
	          try {
	            object = JSON.parse(ev[key]);
	          } catch (e) {
	            return;
	          }
	          if (object.message && object.message === PREBID_REQUEST_MESSAGE && object.slotName) {
	            ev.source.postMessage(JSON.stringify({
	              message: PREBID_RESPONSE_MESSAGE,
	              slotObject: window.pbjs[object.slotName]
	            }), '*');
	            window.pbjs[object.slotName].destroy();
	          }
	        }), false);
	      } else {
	        _addSlotBidResponse(bid, 0, null, 0, 0);
	      }
	    }));
	  }

	  function _addSlotBidResponse(bid, cpm, ad, width, height) {
	    var hasResponse = cpm && ad && ad.length > 0;
	    var bidObject = bidfactory.createBid(hasResponse ? 1 : 2, bid);
	    bidObject.bidderCode = BIDDER_CODE;
	    if (hasResponse) {
	      bidObject.cpm = cpm;
	      bidObject.ad = ad;
	      bidObject.width = width;
	      bidObject.height = height;
	    }
	    bidmanager.addBidResponse(bid.placementCode, bidObject);
	  }

	  function _constructLSMAd(jsTagUrl, slotName) {
	    if (jsTagUrl && slotName) {
	      return '<div id="LSM_AD"></div>\n             <script type="text/javascript" src=\'' + jsTagUrl + '\'></script>\n             <script>\n              function receivedLSMMessage(ev) {\n                var key = ev.message ? \'message\' : \'data\';\n                var object = {};\n                try {\n                  object = JSON.parse(ev[key]);\n                } catch (e) {\n                  return;\n                }\n                if (object.message === \'' + PREBID_RESPONSE_MESSAGE + '\' && object.slotObject) {\n                  var slot  = object.slotObject;\n                  slot.__proto__ = slotapi.Slot.prototype;\n                  slot.getProperties()[\'_onload\'] = function(slot) {\n                    if (slot.state() !== \'error\') {\n                      slot.show();\n                    }\n                  };\n                  window[slot.getSlotObjectName()] = slot;\n                  slot.showInContainer(document.getElementById("LSM_AD"));\n                }\n              }\n              window.addEventListener(\'message\', receivedLSMMessage, false);\n              window.parent.postMessage(JSON.stringify({\n                message: \'' + PREBID_REQUEST_MESSAGE + '\',\n                slotName: \'' + slotName + '\'\n              }), \'*\');\n            </script>';
	    }
	    return null;
	  }

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = LifestreetAdapter;

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);
	var constants = __webpack_require__(3);

	module.exports = function () {
	  function inIframe() {
	    try {
	      return window.self !== window.top && !window.mantis_link;
	    } catch (e) {
	      return true;
	    }
	  }

	  function isDesktop(ignoreTouch) {
	    var scope = function scope(win) {
	      var width = win.innerWidth || win.document.documentElement.clientWidth || win.document.body.clientWidth;
	      var supportsTouch = !ignoreTouch && ('ontouchstart' in window || navigator.msMaxTouchPoints);

	      return !supportsTouch && (!width || width >= (window.mantis_breakpoint || 768));
	    };

	    if (inIframe()) {
	      try {
	        return scope(window.top);
	      } catch (ex) {}
	    }

	    return scope(window);
	  }

	  function isSendable(val) {
	    if (val === null || val === undefined) {
	      return false;
	    }

	    if (typeof val === 'string') {
	      return !(!val || /^\s*$/.test(val));
	    }

	    if (typeof val === 'number') {
	      return !isNaN(val);
	    }

	    return true;
	  }

	  function isObject(value) {
	    return Object.prototype.toString.call(value) === '[object Object]';
	  }

	  function isAmp() {
	    return _typeof(window.context) === "object" && (window.context.tagName === "AMP-AD" || window.context.tagName === "AMP-EMBED");
	  }

	  function isSecure() {
	    return document.location.protocol === "https:";
	  }

	  function isArray(value) {
	    return Object.prototype.toString.call(value) === '[object Array]';
	  }

	  function jsonp(callback) {
	    if (!window.mantis_jsonp) {
	      window.mantis_jsonp = [];
	    }

	    window.mantis_jsonp.push(callback);

	    return 'mantis_jsonp[' + (window.mantis_jsonp.length - 1) + ']';
	  }

	  function jsonToQuery(data, chain, form) {
	    if (!data) {
	      return null;
	    }

	    var parts = form || [];

	    for (var key in data) {
	      var queryKey = key;

	      if (chain) {
	        queryKey = chain + '[' + key + ']';
	      }

	      var val = data[key];

	      if (isArray(val)) {
	        for (var index = 0; index < val.length; index++) {
	          var akey = queryKey + '[' + index + ']';
	          var aval = val[index];

	          if (isObject(aval)) {
	            jsonToQuery(aval, akey, parts);
	          } else if (isSendable(aval)) {
	            parts.push(akey + '=' + encodeURIComponent(aval));
	          }
	        }
	      } else if (isObject(val)) {
	        jsonToQuery(val, queryKey, parts);
	      } else if (isSendable(val)) {
	        parts.push(queryKey + '=' + encodeURIComponent(val));
	      }
	    }

	    return parts.join('&');
	  }

	  function buildMantisUrl(path, data, domain) {
	    var params = {
	      referrer: document.referrer,
	      tz: new Date().getTimezoneOffset(),
	      buster: new Date().getTime(),
	      secure: isSecure()
	    };

	    if (!inIframe() || isAmp()) {
	      params.mobile = !isAmp() && isDesktop(true) ? 'false' : 'true';
	    }

	    if (window.mantis_uuid) {
	      params.uuid = window.mantis_uuid;
	    } else if (window.localStorage) {
	      var localUuid = window.localStorage.getItem('mantis:uuid');

	      if (localUuid) {
	        params.uuid = localUuid;
	      }
	    }

	    if (!inIframe()) {
	      try {
	        params.title = window.top.document.title;
	        params.referrer = window.top.document.referrer;
	        params.url = window.top.document.location.href;
	      } catch (ex) {}
	    } else {
	      params.iframe = true;
	    }

	    if (isAmp()) {
	      if (!params.url && window.context.canonicalUrl) {
	        params.url = window.context.canonicalUrl;
	      }

	      if (!params.url && window.context.location) {
	        params.url = window.context.location.href;
	      }

	      if (!params.referrer && window.context.referrer) {
	        params.referrer = window.context.referrer;
	      }
	    }

	    Object.keys(data || {}).forEach((function (key) {
	      params[key] = data[key];
	    }));

	    var query = jsonToQuery(params);

	    return (window.mantis_domain === undefined ? domain || 'https://mantodea.mantisadnetwork.com' : window.mantis_domain) + path + '?' + query;
	  }

	  var Prebid = function Prebid(bidfactory, bidmanager, adloader, constants) {
	    return {
	      callBids: function callBids(params) {
	        var property = null;

	        params.bids.some((function (bid) {
	          if (bid.params.property) {
	            property = bid.params.property;

	            return true;
	          }
	        }));

	        var url = {
	          jsonp: jsonp((function (resp) {
	            params.bids.forEach((function (bid) {
	              var ad = resp.ads[bid.bidId];

	              var bidObject;

	              if (ad) {
	                bidObject = bidfactory.createBid(constants.STATUS.GOOD);
	                bidObject.bidderCode = 'mantis';
	                bidObject.cpm = ad.cpm;
	                bidObject.ad = ad.html;
	                bidObject.width = ad.width;
	                bidObject.height = ad.height;
	              } else {
	                bidObject = bidfactory.createBid(constants.STATUS.NO_BID);
	                bidObject.bidderCode = 'mantis';
	              }

	              bidmanager.addBidResponse(bid.placementCode, bidObject);
	            }));
	          })),
	          property: property,
	          bids: params.bids.map((function (bid) {
	            return {
	              bidId: bid.bidId,
	              sizes: bid.sizes.map((function (size) {
	                return { width: size[0], height: size[1] };
	              }))
	            };
	          })),
	          version: 1
	        };

	        adloader.loadScript(buildMantisUrl('/website/prebid', url));
	      }
	    };
	  };

	  return new Prebid(bidfactory, bidmanager, adloader, constants);
	};

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);
	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);

	var OpenxAdapter = function OpenxAdapter() {
	  var BIDDER_CODE = 'openx';
	  var BIDDER_CONFIG = 'hb_pb';
	  var startTime = void 0;

	  var pdNode = null;

	  pbjs.oxARJResponse = function (oxResponseObj) {
	    var adUnits = oxResponseObj.ads.ad;
	    if (oxResponseObj.ads && oxResponseObj.ads.pixels) {
	      makePDCall(oxResponseObj.ads.pixels);
	    }

	    if (!adUnits) {
	      adUnits = [];
	    }

	    var bids = pbjs._bidsRequested.find((function (bidSet) {
	      return bidSet.bidderCode === 'openx';
	    })).bids;
	    for (var i = 0; i < bids.length; i++) {
	      var bid = bids[i];
	      var auid = null;
	      var adUnit = null;
	      // find the adunit in the response
	      for (var j = 0; j < adUnits.length; j++) {
	        adUnit = adUnits[j];
	        if (String(bid.params.unit) === String(adUnit.adunitid) && adUnitHasValidSizeFromBid(adUnit, bid) && !adUnit.used) {
	          auid = adUnit.adunitid;
	          break;
	        }
	      }

	      var beaconParams = {
	        bd: +new Date() - startTime,
	        br: '0', // maybe 0, t, or p
	        bt: pbjs.cbTimeout || pbjs.bidderTimeout, // For the timeout per bid request
	        bs: window.location.hostname
	      };

	      // no fill :(
	      if (!auid || !adUnit.pub_rev) {
	        addBidResponse(null, bid);
	        continue;
	      }
	      adUnit.used = true;

	      beaconParams.br = beaconParams.bt < beaconParams.bd ? 't' : 'p';
	      beaconParams.bp = adUnit.pub_rev;
	      beaconParams.ts = adUnit.ts;
	      addBidResponse(adUnit, bid);
	      buildBoPixel(adUnit.creative[0], beaconParams);
	    }
	  };

	  function getViewportDimensions(isIfr) {
	    var width = void 0,
	        height = void 0,
	        tWin = window,
	        tDoc = document,
	        docEl = tDoc.documentElement,
	        body = void 0;

	    if (isIfr) {
	      try {
	        tWin = window.top;
	        tDoc = window.top.document;
	      } catch (e) {
	        return;
	      }
	      docEl = tDoc.documentElement;
	      body = tDoc.body;

	      width = tWin.innerWidth || docEl.clientWidth || body.clientWidth;
	      height = tWin.innerHeight || docEl.clientHeight || body.clientHeight;
	    } else {
	      docEl = tDoc.documentElement;
	      width = tWin.innerWidth || docEl.clientWidth;
	      height = tWin.innerHeight || docEl.clientHeight;
	    }

	    return width + 'x' + height;
	  }

	  function makePDCall(pixelsUrl) {
	    var pdFrame = utils.createInvisibleIframe();
	    var name = 'openx-pd';
	    pdFrame.setAttribute("id", name);
	    pdFrame.setAttribute("name", name);
	    var rootNode = document.body;

	    if (!rootNode) {
	      return;
	    }

	    pdFrame.src = pixelsUrl;

	    if (pdNode) {
	      pdNode.parentNode.replaceChild(pdFrame, pdNode);
	      pdNode = pdFrame;
	    } else {
	      pdNode = rootNode.appendChild(pdFrame);
	    }
	  }

	  function addBidResponse(adUnit, bid) {
	    var bidResponse = bidfactory.createBid(adUnit ? CONSTANTS.STATUS.GOOD : CONSTANTS.STATUS.NO_BID, bid);
	    bidResponse.bidderCode = BIDDER_CODE;

	    if (adUnit) {
	      var creative = adUnit.creative[0];
	      bidResponse.ad = adUnit.html;
	      bidResponse.cpm = Number(adUnit.pub_rev) / 1000;
	      bidResponse.ad_id = adUnit.adid;
	      if (adUnit.deal_id) {
	        bidResponse.dealId = adUnit.deal_id;
	      }
	      if (creative) {
	        bidResponse.width = creative.width;
	        bidResponse.height = creative.height;
	      }
	    }
	    bidmanager.addBidResponse(bid.placementCode, bidResponse);
	  }

	  function buildQueryStringFromParams(params) {
	    for (var key in params) {
	      if (params.hasOwnProperty(key)) {
	        if (!params[key]) {
	          delete params[key];
	        }
	      }
	    }
	    return utils._map(Object.keys(params), (function (key) {
	      return key + '=' + params[key];
	    })).join('&');
	  }

	  function buildBoPixel(creative, params) {
	    var img = new Image();
	    var recordPixel = creative.tracking.impression;
	    var boBase = recordPixel.match(/([^?]+\/)ri\?/);

	    if (boBase) {
	      img.src = boBase[1] + 'bo?' + buildQueryStringFromParams(params);
	    }
	  }

	  function adUnitHasValidSizeFromBid(adUnit, bid) {
	    var sizes = utils.parseSizesInput(bid.sizes);
	    var sizeLength = sizes && sizes.length || 0;
	    var found = false;
	    var creative = adUnit.creative && adUnit.creative[0];
	    var creative_size = String(creative.width) + 'x' + String(creative.height);

	    if (utils.isArray(sizes)) {
	      for (var i = 0; i < sizeLength; i++) {
	        var size = sizes[i];
	        if (String(size) === String(creative_size)) {
	          found = true;
	          break;
	        }
	      }
	    }
	    return found;
	  }

	  function buildRequest(bids, params, delDomain) {
	    if (!utils.isArray(bids)) {
	      return;
	    }

	    params.auid = utils._map(bids, (function (bid) {
	      return bid.params.unit;
	    })).join('%2C');
	    params.aus = utils._map(bids, (function (bid) {
	      return utils.parseSizesInput(bid.sizes).join(',');
	    })).join('|');

	    bids.forEach((function (bid) {
	      for (var customParam in bid.params.customParams) {
	        if (bid.params.customParams.hasOwnProperty(customParam)) {
	          params["c." + customParam] = bid.params.customParams[customParam];
	        }
	      }
	    }));

	    params.callback = 'window.pbjs.oxARJResponse';
	    var queryString = buildQueryStringFromParams(params);

	    adloader.loadScript('//' + delDomain + '/w/1.0/arj?' + queryString);
	  }

	  function callBids(params) {
	    var isIfr = void 0,
	        bids = params.bids || [],
	        currentURL = window.location.href && encodeURIComponent(window.location.href);
	    try {
	      isIfr = window.self !== window.top;
	    } catch (e) {
	      isIfr = false;
	    }
	    if (bids.length === 0) {
	      return;
	    }

	    var delDomain = bids[0].params.delDomain;

	    startTime = new Date(params.start);

	    buildRequest(bids, {
	      ju: currentURL,
	      jr: currentURL,
	      ch: document.charSet || document.characterSet,
	      res: screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
	      ifr: isIfr,
	      tz: startTime.getTimezoneOffset(),
	      tws: getViewportDimensions(isIfr),
	      ee: 'api_sync_write',
	      ef: 'bt%2Cdb',
	      be: 1,
	      bc: BIDDER_CONFIG
	    }, delDomain);
	  }

	  return {
	    callBids: callBids
	  };
	};

	module.exports = OpenxAdapter;

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var bidmanager = __webpack_require__(11);
	var bidfactory = __webpack_require__(10);
	var adloader = __webpack_require__(13);
	var Adapter = __webpack_require__(14);

	var PiximediaAdapter = function PiximediaAdapter() {
	  var PREBID_URL = '//static.adserver.pm/prebid';
	  var baseAdapter = Adapter.createNew('piximedia');
	  var bidStash = {};

	  var tryAppendPixiQueryString = function tryAppendPixiQueryString(url, name, value) {
	    return url + "/" + encodeURIComponent(name) + "=" + value;
	  };

	  baseAdapter.callBids = function callBidsPiximedia(params) {
	    utils._each(params.bids, (function (bid) {

	      // valid bids must include a siteId and an placementId
	      if (bid.placementCode && bid.sizes && bid.params && bid.params.siteId && bid.params.placementId) {

	        var sizes = bid.params.hasOwnProperty('sizes') ? bid.params.sizes : bid.sizes;
	        sizes = utils.parseSizesInput(sizes);

	        var cbid = utils.getUniqueIdentifierStr();

	        // we allow overriding the URL in the params
	        var url = bid.params.prebidUrl || PREBID_URL;

	        // params are passed to the Piximedia endpoint, including custom params
	        for (var key in bid.params) {
	          /* istanbul ignore else */
	          if (bid.params.hasOwnProperty(key)) {
	            var value = bid.params[key];
	            switch (key) {
	              case "siteId":
	                url = tryAppendPixiQueryString(url, 'site_id', encodeURIComponent(value));
	                break;

	              case "placementId":
	                url = tryAppendPixiQueryString(url, 'placement_id', encodeURIComponent(value));
	                break;

	              case "dealId":
	                url = tryAppendPixiQueryString(url, 'l_id', encodeURIComponent(value));
	                break;

	              case "sizes":
	              case "prebidUrl":
	                break;

	              default:
	                if (typeof value === "function") {
	                  url = tryAppendPixiQueryString(url, key, encodeURIComponent((value(baseAdapter, params, bid) || "").toString()));
	                } else {
	                  url = tryAppendPixiQueryString(url, key, encodeURIComponent((value || "").toString()));
	                }
	                break;
	            }
	          }
	        }

	        url = tryAppendPixiQueryString(url, 'jsonp', 'pbjs.handlePiximediaCallback');
	        url = tryAppendPixiQueryString(url, 'sizes', encodeURIComponent(sizes.join(",")));
	        url = tryAppendPixiQueryString(url, 'cbid', encodeURIComponent(cbid));
	        url = tryAppendPixiQueryString(url, 'rand', String(Math.floor(Math.random() * 1000000000)));

	        bidStash[cbid] = {
	          'bidObj': bid,
	          'url': url,
	          'start': new Date().getTime()
	        };
	        utils.logMessage('[Piximedia] Dispatching header Piximedia to URL ' + url);
	        adloader.loadScript(url);
	      }
	    }));
	  };

	  /*
	   * Piximedia's bidResponse should look like:
	   *
	   * {
	   *   'foundbypm': true,            // a Boolean, indicating if an ad was found
	   *   'currency': 'EUR',        // the currency, as a String
	   *   'cpm': 1.99,              // the win price as a Number, in currency
	   *   'dealId': null,           // or string value of winning deal ID
	   *   'width': 300,             // width in pixels of winning ad
	   *   'height': 250,            // height in pixels of winning ad
	   *   'html': 'tag_here'        // HTML tag to load if we are picked
	   * }
	   *
	   */
	  pbjs.handlePiximediaCallback = function (bidResponse) {
	    if (bidResponse && bidResponse.hasOwnProperty("foundbypm")) {
	      var stash = bidStash[bidResponse.cbid]; // retrieve our stashed data, by using the cbid
	      var bid;

	      if (stash) {
	        var bidObj = stash.bidObj;
	        var timelapsed = new Date().getTime();
	        timelapsed = timelapsed - stash.start;

	        if (bidResponse.foundbypm && bidResponse.width && bidResponse.height && bidResponse.html && bidResponse.cpm && bidResponse.currency) {

	          /* we have a valid ad to display */
	          bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
	          bid.bidderCode = bidObj.bidder;
	          bid.width = bidResponse.width;
	          bid.height = bidResponse.height;
	          bid.ad = bidResponse.html;
	          bid.cpm = bidResponse.cpm;
	          bid.currency = bidResponse.currency;

	          if (bidResponse.dealId) {
	            bid.dealId = bidResponse.dealId;
	          } else {
	            bid.dealId = null;
	          }

	          bidmanager.addBidResponse(bidObj.placementCode, bid);

	          utils.logMessage('[Piximedia] Registered bidresponse from URL ' + stash.url + ' (time: ' + String(timelapsed) + ')');
	          utils.logMessage('[Piximedia] ======> BID placementCode: ' + bidObj.placementCode + ' CPM: ' + String(bid.cpm) + ' ' + bid.currency + ' Format: ' + String(bid.width) + 'x' + String(bid.height));
	        } else {

	          /* we have no ads to display */
	          bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
	          bid.bidderCode = bidObj.bidder;
	          bidmanager.addBidResponse(bidObj.placementCode, bid);

	          utils.logMessage('[Piximedia] Registered BLANK bidresponse from URL ' + stash.url + ' (time: ' + String(timelapsed) + ')');
	          utils.logMessage('[Piximedia] ======> NOBID placementCode: ' + bidObj.placementCode);
	        }

	        // We should no longer need this stashed object, so drop reference:
	        bidStash[bidResponse.cbid] = null;
	      } else {
	        utils.logMessage("[Piximedia] Couldn't find stash for cbid=" + bidResponse.cbid);
	      }
	    }
	  };

	  // return an object with PiximediaAdapter methods
	  return {
	    callBids: baseAdapter.callBids,
	    setBidderCode: baseAdapter.setBidderCode,
	    getBidderCode: baseAdapter.getBidderCode
	  };
	};

	module.exports = PiximediaAdapter;

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);

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
	  var iframe = void 0;

	  function _callBids(params) {
	    bids = params.bids;
	    for (var i = 0; i < bids.length; i++) {
	      var bid = bids[i];
	      //bidmanager.pbCallbackMap['' + bid.params.adSlot] = bid;
	      _pm_pub_id = _pm_pub_id || bid.params.publisherId;
	      _pm_optimize_adslots.push(bid.params.adSlot);
	    }

	    // Load pubmatic script in an iframe, because they call document.write
	    _getBids();
	  }

	  function _getBids() {

	    //create the iframe
	    iframe = utils.createInvisibleIframe();

	    var elToAppend = document.getElementsByTagName('head')[0];

	    //insert the iframe into document
	    elToAppend.insertBefore(iframe, elToAppend.firstChild);

	    var iframeDoc = utils.getIframeDocument(iframe);
	    iframeDoc.write(_createRequestContent());
	    iframeDoc.close();
	  }

	  function _createRequestContent() {
	    var content = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"' + ' "http://www.w3.org/TR/html4/loose.dtd"><html><head><base target="_top" /><scr' + 'ipt>inDapIF=true;</scr' + 'ipt></head>';
	    content += '<body>';
	    content += '<scr' + 'ipt>';
	    content += '' + 'window.pm_pub_id  = "%%PM_PUB_ID%%";' + 'window.pm_optimize_adslots     = [%%PM_OPTIMIZE_ADSLOTS%%];' + 'window.pm_async_callback_fn = "window.parent.pbjs.handlePubmaticCallback";';
	    content += '</scr' + 'ipt>';

	    var map = {};
	    map.PM_PUB_ID = _pm_pub_id;
	    map.PM_OPTIMIZE_ADSLOTS = _pm_optimize_adslots.map((function (adSlot) {
	      return "'" + adSlot + "'";
	    })).join(',');

	    content += '<scr' + 'ipt src="https://ads.pubmatic.com/AdServer/js/gshowad.js"></scr' + 'ipt>';
	    content += '<scr' + 'ipt>';
	    content += '</scr' + 'ipt>';
	    content += '</body></html>';
	    content = utils.replaceTokenInString(content, map, '%%');

	    return content;
	  }

	  pbjs.handlePubmaticCallback = function () {
	    var bidDetailsMap = {};
	    var progKeyValueMap = {};
	    try {
	      bidDetailsMap = iframe.contentWindow.bidDetailsMap;
	      progKeyValueMap = iframe.contentWindow.progKeyValueMap;
	    } catch (e) {
	      utils.logError(e, 'Error parsing Pubmatic response');
	    }

	    var i;
	    var adUnit;
	    var adUnitInfo;
	    var bid;
	    var bidResponseMap = bidDetailsMap || {};
	    var bidInfoMap = progKeyValueMap || {};
	    var dimensions;

	    for (i = 0; i < bids.length; i++) {
	      var adResponse;
	      bid = bids[i].params;

	      adUnit = bidResponseMap[bid.adSlot] || {};

	      // adUnitInfo example: bidstatus=0;bid=0.0000;bidid=39620189@320x50;wdeal=

	      // if using DFP GPT, the params string comes in the format:
	      // "bidstatus;1;bid;5.0000;bidid;hb_test@468x60;wdeal;"
	      // the code below detects and handles this.
	      if (bidInfoMap[bid.adSlot] && bidInfoMap[bid.adSlot].indexOf('=') === -1) {
	        bidInfoMap[bid.adSlot] = bidInfoMap[bid.adSlot].replace(/([a-z]+);(.[^;]*)/ig, '$1=$2');
	      }

	      adUnitInfo = (bidInfoMap[bid.adSlot] || '').split(';').reduce((function (result, pair) {
	        var parts = pair.split('=');
	        result[parts[0]] = parts[1];
	        return result;
	      }), {});

	      if (adUnitInfo.bidstatus === '1') {
	        dimensions = adUnitInfo.bidid.split('@')[1].split('x');
	        adResponse = bidfactory.createBid(1);
	        adResponse.bidderCode = 'pubmatic';
	        adResponse.adSlot = bid.adSlot;
	        adResponse.cpm = Number(adUnitInfo.bid);
	        adResponse.ad = unescape(adUnit.creative_tag); // jshint ignore:line
	        adResponse.ad += utils.createTrackPixelIframeHtml(decodeURIComponent(adUnit.tracking_url));
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

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);
	var utils = __webpack_require__(2);

	var PulsePointAdapter = function PulsePointAdapter() {

	  var getJsStaticUrl = window.location.protocol + '//tag.contextweb.com/getjs.static.js';
	  var bidUrl = window.location.protocol + '//bid.contextweb.com/header/tag';

	  function _callBids(params) {
	    if (typeof window.pp === 'undefined') {
	      adloader.loadScript(getJsStaticUrl, (function () {
	        bid(params);
	      }), true);
	    } else {
	      bid(params);
	    }
	  }

	  function bid(params) {
	    var bids = params.bids;
	    for (var i = 0; i < bids.length; i++) {
	      var bidRequest = bids[i];
	      requestBid(bidRequest);
	    }
	  }

	  function requestBid(bidRequest) {
	    try {
	      var ppBidRequest = new window.pp.Ad(bidRequestOptions(bidRequest));
	      ppBidRequest.display();
	    } catch (e) {
	      //register passback on any exceptions while attempting to fetch response.
	      utils.logError('pulsepoint.requestBid', 'ERROR', e);
	      bidResponseAvailable(bidRequest);
	    }
	  }

	  function bidRequestOptions(bidRequest) {
	    var callback = bidResponseCallback(bidRequest);
	    var options = {
	      cn: 1,
	      ca: window.pp.requestActions.BID,
	      cu: bidUrl,
	      adUnitId: bidRequest.placementCode,
	      callback: callback
	    };
	    for (var param in bidRequest.params) {
	      if (bidRequest.params.hasOwnProperty(param)) {
	        options[param] = bidRequest.params[param];
	      }
	    }
	    return options;
	  }

	  function bidResponseCallback(bid) {
	    return function (bidResponse) {
	      bidResponseAvailable(bid, bidResponse);
	    };
	  }

	  function bidResponseAvailable(bidRequest, bidResponse) {
	    if (bidResponse) {
	      var adSize = bidRequest.params.cf.toUpperCase().split('X');
	      var bid = bidfactory.createBid(1, bidRequest);
	      bid.bidderCode = bidRequest.bidder;
	      bid.cpm = bidResponse.bidCpm;
	      bid.ad = bidResponse.html;
	      bid.width = adSize[0];
	      bid.height = adSize[1];
	      bidmanager.addBidResponse(bidRequest.placementCode, bid);
	    } else {
	      var passback = bidfactory.createBid(2, bidRequest);
	      passback.bidderCode = bidRequest.bidder;
	      bidmanager.addBidResponse(bidRequest.placementCode, passback);
	    }
	  }

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = PulsePointAdapter;

/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _ajax = __webpack_require__(21);

	var bidmanager = __webpack_require__(11),
	    bidfactory = __webpack_require__(10),
	    utils = __webpack_require__(2),
	    CONSTANTS = __webpack_require__(3);

	function track(debug, p1, p2, p3) {
	  if (debug === true) {
	    console.log('GA: %s %s %s', p1, p2, p3 || '');
	  }
	}

	var w = typeof window !== "undefined" ? window : {};
	w.trackR1Impression = track;

	module.exports = function (bidManager, global, loader) {

	  var version = "0.9.0.0",
	      defaultZone = "1r",
	      defaultPath = "mvo",
	      bidfloor = 0,
	      currency = "USD",
	      debug = false,
	      auctionEnded = false,
	      requestCompleted = false,
	      placementCodes = {};

	  if (typeof global === "undefined") global = window;

	  if (typeof bidManager === "undefined") bidManager = bidmanager;

	  if (typeof loader === "undefined") loader = _ajax.ajax;

	  function applyMacros(txt, values) {
	    return txt.replace(/\{([^\}]+)\}/g, (function (match) {
	      var v = values[match.replace(/[\{\}]/g, "").toLowerCase()];
	      if (typeof v !== "undefined") return v;
	      return match;
	    }));
	  }

	  function load(bidParams, url, postData, callback) {
	    if (bidParams.method === "get") {
	      loader(url, (function (responseText, response) {
	        if (response.status === 200) callback(200, "success", response.responseText);else callback(-1, "http error " + response.status, response.responseText);
	      }), false, { method: "GET", withCredentials: true });
	    } else {
	      loader(url, (function (responseText, response) {
	        if (response.status === 200) callback(200, "success", response.responseText);else callback(-1, "http error " + response.status, response.responseText);
	      }), postData, { method: "POST", contentType: "application/json", withCredentials: true });
	    }
	  }

	  var bidderCode = "rhythmone",
	      bidLostTimeout = null;

	  function setIfPresent(o, key, value) {
	    try {
	      if (typeof value === "function") o[key] = value();
	    } catch (ex) {}
	  }

	  function logToConsole(txt) {
	    if (debug) console.log(txt);
	  }

	  function sniffAuctionEnd() {

	    global.pbjs.onEvent('bidWon', (function (e) {

	      if (e.bidderCode === bidderCode) {
	        placementCodes[e.adUnitCode] = true;
	        track(debug, 'hb', "bidWon");
	      }

	      if (auctionEnded) {
	        clearTimeout(bidLostTimeout);
	        bidLostTimeout = setTimeout((function () {
	          for (var k in placementCodes) {
	            if (placementCodes[k] === false) track(debug, 'hb', "bidLost");
	          }
	        }), 50);
	      }
	    }));

	    global.pbjs.onEvent('auctionEnd', (function () {

	      auctionEnded = true;

	      if (requestCompleted === false) track(debug, 'hb', 'rmpReplyFail', "prebid timeout post auction");
	    }));
	  }

	  function getBidParameters(bids) {
	    for (var i = 0; i < bids.length; i++) {
	      if (_typeof(bids[i].params) === "object" && bids[i].params.placementId) return bids[i].params;
	    }return null;
	  }

	  function noBids(params) {
	    for (var i = 0; i < params.bids.length; i++) {
	      if (params.bids[i].success !== 1) {
	        logToConsole("registering nobid for slot " + params.bids[i].placementCode);
	        var bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
	        bid.bidderCode = bidderCode;
	        track(debug, 'hb', 'bidResponse', 0);
	        bidmanager.addBidResponse(params.bids[i].placementCode, bid);
	      }
	    }
	  }

	  function getRMPURL(bidParams, ortbJSON, bids) {
	    var endpoint = "//tag.1rx.io/rmp/{placementId}/0/{path}?z={zone}",
	        query = [];

	    if (typeof bidParams.endpoint === "string") endpoint = bidParams.endpoint;

	    if (typeof bidParams.zone === "string") defaultZone = bidParams.zone;

	    if (typeof bidParams.path === "string") defaultPath = bidParams.path;

	    if (bidParams.debug === true) debug = true;

	    if (bidParams.trace === true) query.push("trace=true");

	    endpoint = applyMacros(endpoint, {
	      placementid: bidParams.placementId,
	      zone: defaultZone,
	      path: defaultPath
	    });

	    function p(k, v) {
	      if (typeof v !== "undefined") query.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
	    }

	    if (bidParams.method === "get") {

	      p("domain", ortbJSON.site.domain);
	      p("title", ortbJSON.site.name);
	      p("url", ortbJSON.site.page);
	      p("dsh", ortbJSON.device.h);
	      p("dsw", ortbJSON.device.w);
	      p("tz", new Date().getTimezoneOffset());
	      p("dtype", ortbJSON.device.devicetype);

	      var placementCodes = [],
	          heights = [],
	          widths = [],
	          floors = [];

	      for (var i = 0; i < bids.length; i++) {

	        track(debug, 'hb', 'bidRequest');
	        var th = [],
	            tw = [];

	        for (var j = 0; j < bids[i].sizes.length; j++) {
	          tw.push(bids[i].sizes[j][0]);
	          th.push(bids[i].sizes[j][1]);
	        }
	        placementCodes.push(bids[i].placementCode);
	        heights.push(th.join("|"));
	        widths.push(tw.join("|"));
	        floors.push(0);
	      }

	      p("imp", placementCodes.join(","));
	      p("w", widths.join(","));
	      p("h", heights.join(","));
	      p("floor", floors.join(","));
	    }

	    endpoint += "&" + query.join("&");

	    return endpoint;
	  }

	  function getORTBJSON(bids, slotMap, bidParams) {
	    var o = {
	      "device": {
	        "langauge": global.navigator.language,
	        "dnt": global.navigator.doNotTrack === 1 ? 1 : 0
	      },
	      "at": 2,
	      "site": {},
	      "tmax": 3000,
	      "cur": [currency],
	      "id": utils.generateUUID(),
	      "imp": []
	    };

	    setIfPresent(o.site, "page", (function () {
	      var l;
	      try {
	        l = global.top.document.location.href.toString();
	      } catch (ex) {
	        l = document.location.href.toString();
	      }
	      return l;
	    }));
	    setIfPresent(o.site, "domain", (function () {
	      var d = document.location.ancestorOrigins;
	      if (d && d.length > 0) return d[d.length - 1];
	      return global.top.document.location.hostname;
	    }));
	    setIfPresent(o.site, "name", (function () {
	      return global.top.document.title;
	    }));

	    o.device.devicetype = /(ios|ipod|ipad|iphone|android)/i.test(global.navigator.userAgent) ? 1 : /(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i.test(global.navigator.userAgent) ? 3 : 2;

	    setIfPresent(o.device, "h", (function () {
	      return global.screen.height;
	    }));
	    setIfPresent(o.device, "w", (function () {
	      return global.screen.width;
	    }));

	    for (var i = 0; i < bids.length; i++) {
	      var bidID = utils.generateUUID();
	      slotMap[bidID] = bids[i];
	      slotMap[bids[i].placementCode] = bids[i];

	      if (bidParams.method === "post") track(debug, 'hb', 'bidRequest');

	      for (var j = 0; j < bids[i].sizes.length; j++) {
	        o.imp.push({
	          "id": bidID,
	          "tagId": bids[i].placementCode,
	          "bidfloor": bidfloor,
	          "bidfloorcur": currency,
	          "banner": {
	            "id": utils.generateUUID(),
	            "pos": 0,
	            "w": bids[i].sizes[j][0],
	            "h": bids[i].sizes[j][1]
	          }
	        });
	      }
	    }

	    return o;
	  }

	  this.callBids = function (params) {

	    var slotMap = {},
	        bidParams = getBidParameters(params.bids);

	    debug = bidParams !== null && bidParams.debug === true;

	    auctionEnded = false;
	    requestCompleted = false;

	    track(debug, 'hb', 'callBids');

	    if (bidParams === null) {
	      noBids(params);
	      track(debug, 'hb', 'misconfiguration');
	      return;
	    }

	    // default to GET request
	    if (typeof bidParams.method !== "string") bidParams.method = "get";

	    bidParams.method = bidParams.method.toLowerCase();

	    sniffAuctionEnd();

	    track(debug, 'hb', 'rmpRequest');

	    var ortbJSON = getORTBJSON(params.bids, slotMap, bidParams);

	    load(bidParams, getRMPURL(bidParams, ortbJSON, params.bids), JSON.stringify(ortbJSON), (function (code, msg, txt) {

	      if (auctionEnded === true) return;

	      requestCompleted = true;

	      logToConsole(txt);

	      if (code === -1) track(debug, 'hb', 'rmpReplyFail', msg);else {
	        try {
	          var result = JSON.parse(txt),
	              registerBid = function registerBid(bid) {

	            slotMap[bid.impid].success = 1;

	            var pbResponse = bidfactory.createBid(CONSTANTS.STATUS.GOOD),
	                placementCode = slotMap[bid.impid].placementCode;

	            placementCodes[placementCode] = false;

	            pbResponse.bidderCode = bidderCode;
	            pbResponse.cpm = parseFloat(bid.price);
	            pbResponse.width = bid.w;
	            pbResponse.height = bid.h;
	            pbResponse.ad = bid.adm;

	            logToConsole("registering bid " + placementCode + " " + JSON.stringify(pbResponse));

	            track(debug, 'hb', 'bidResponse', 1);
	            bidManager.addBidResponse(placementCode, pbResponse);
	          };

	          track(debug, 'hb', 'rmpReplySuccess');

	          for (var i = 0; result.seatbid && i < result.seatbid.length; i++) {
	            for (var j = 0; result.seatbid[i].bid && j < result.seatbid[i].bid.length; j++) {
	              registerBid(result.seatbid[i].bid[j]);
	            }
	          }
	        } catch (ex) {
	          track(debug, 'hb', 'rmpReplyFail', 'invalid json in rmp response');
	        }
	      }

	      // if no bids are successful, inform prebid
	      noBids(params);

	      // when all bids are complete, log a report
	      track(debug, 'hb', 'bidsComplete');
	    }));

	    logToConsole("version: " + version);
	  };
	};

/***/ }),
/* 44 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _adapter = __webpack_require__(14);

	var Adapter = _interopRequireWildcard(_adapter);

	var _bidfactory = __webpack_require__(10);

	var _bidfactory2 = _interopRequireDefault(_bidfactory);

	var _bidmanager = __webpack_require__(11);

	var _bidmanager2 = _interopRequireDefault(_bidmanager);

	var _utils = __webpack_require__(2);

	var utils = _interopRequireWildcard(_utils);

	var _ajax = __webpack_require__(21);

	var _constants = __webpack_require__(3);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

	var RUBICON_BIDDER_CODE = 'rubicon';

	// use deferred function call since version isn't defined yet at this point
	function getIntegration() {
	  return 'pbjs_lite_' + pbjs.version;
	}

	// use protocol relative urls for http or https
	var FASTLANE_ENDPOINT = '//fastlane.rubiconproject.com/a/api/fastlane.json';
	var VIDEO_ENDPOINT = '//optimized-by-adv.rubiconproject.com/v1/auction/video';

	var TIMEOUT_BUFFER = 500;

	var sizeMap = {
	  1: '468x60',
	  2: '728x90',
	  8: '120x600',
	  9: '160x600',
	  10: '300x600',
	  15: '300x250',
	  16: '336x280',
	  19: '300x100',
	  43: '320x50',
	  44: '300x50',
	  48: '300x300',
	  54: '300x1050',
	  55: '970x90',
	  57: '970x250',
	  58: '1000x90',
	  59: '320x80',
	  61: '1000x1000',
	  65: '640x480',
	  67: '320x480',
	  68: '1800x1000',
	  72: '320x320',
	  73: '320x160',
	  83: '480x300',
	  94: '970x310',
	  96: '970x210',
	  101: '480x320',
	  102: '768x1024',
	  113: '1000x300',
	  117: '320x100',
	  125: '800x250',
	  126: '200x600'
	};
	utils._each(sizeMap, (function (item, key) {
	  return sizeMap[item] = key;
	}));

	function RubiconAdapter() {

	  function _callBids(bidderRequest) {
	    var bids = bidderRequest.bids || [];

	    bids.forEach((function (bid) {
	      try {
	        // Video endpoint only accepts POST calls
	        if (bid.mediaType === 'video') {
	          (0, _ajax.ajax)(VIDEO_ENDPOINT, bidCallback, buildVideoRequestPayload(bid, bidderRequest), { withCredentials: true });
	        } else {
	          (0, _ajax.ajax)(buildOptimizedCall(bid), bidCallback, undefined, { withCredentials: true });
	        }
	      } catch (err) {
	        utils.logError('Error sending rubicon request for placement code ' + bid.placementCode, null, err);
	        addErrorBid();
	      }

	      function bidCallback(responseText) {
	        try {
	          utils.logMessage('XHR callback function called for ad ID: ' + bid.bidId);
	          handleRpCB(responseText, bid);
	        } catch (err) {
	          if (typeof err === "string") {
	            utils.logWarn(err + ' when processing rubicon response for placement code ' + bid.placementCode);
	          } else {
	            utils.logError('Error processing rubicon response for placement code ' + bid.placementCode, null, err);
	          }
	          addErrorBid();
	        }
	      }

	      function addErrorBid() {
	        var badBid = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bid);
	        badBid.bidderCode = bid.bidder;
	        _bidmanager2['default'].addBidResponse(bid.placementCode, badBid);
	      }
	    }));
	  }

	  function _getScreenResolution() {
	    return [window.screen.width, window.screen.height].join('x');
	  }

	  function buildVideoRequestPayload(bid, bidderRequest) {
	    bid.startTime = new Date().getTime();

	    var params = bid.params;

	    if (!params || _typeof(params.video) !== 'object') {
	      throw 'Invalid Video Bid';
	    }

	    var size = void 0;
	    if (params.video.playerWidth && params.video.playerHeight) {
	      size = [params.video.playerWidth, params.video.playerHeight];
	    } else if (Array.isArray(bid.sizes) && bid.sizes.length > 0 && Array.isArray(bid.sizes[0]) && bid.sizes[0].length > 1) {
	      size = bid.sizes[0];
	    } else {
	      throw "Invalid Video Bid - No size provided";
	    }

	    var postData = {
	      page_url: !params.referrer ? utils.getTopWindowUrl() : params.referrer,
	      resolution: _getScreenResolution(),
	      account_id: params.accountId,
	      integration: getIntegration(),
	      timeout: bidderRequest.timeout - (Date.now() - bidderRequest.auctionStart + TIMEOUT_BUFFER),
	      stash_creatives: true,
	      ae_pass_through_parameters: params.video.aeParams,
	      slots: []
	    };

	    // Define the slot object
	    var slotData = {
	      site_id: params.siteId,
	      zone_id: params.zoneId,
	      position: params.position || 'btf',
	      floor: 0.01,
	      element_id: bid.placementCode,
	      name: bid.placementCode,
	      language: params.video.language,
	      width: size[0],
	      height: size[1]
	    };

	    // check and add inventory, keywords, visitor and size_id data
	    if (params.video.size_id) {
	      slotData.size_id = params.video.size_id;
	    } else {
	      throw "Invalid Video Bid - Invalid Ad Type!";
	    }

	    if (params.inventory && _typeof(params.inventory) === 'object') {
	      slotData.inventory = params.inventory;
	    }

	    if (params.keywords && Array.isArray(params.keywords)) {
	      slotData.keywords = params.keywords;
	    }

	    if (params.visitor && _typeof(params.visitor) === 'object') {
	      slotData.visitor = params.visitor;
	    }

	    postData.slots.push(slotData);

	    return JSON.stringify(postData);
	  }

	  function buildOptimizedCall(bid) {
	    bid.startTime = new Date().getTime();

	    var _bid$params = bid.params,
	        accountId = _bid$params.accountId,
	        siteId = _bid$params.siteId,
	        zoneId = _bid$params.zoneId,
	        position = _bid$params.position,
	        floor = _bid$params.floor,
	        keywords = _bid$params.keywords,
	        visitor = _bid$params.visitor,
	        inventory = _bid$params.inventory,
	        userId = _bid$params.userId,
	        pageUrl = _bid$params.referrer;

	    // defaults

	    floor = (floor = parseFloat(floor)) > 0.01 ? floor : 0.01;
	    position = position || 'btf';

	    // use rubicon sizes if provided, otherwise adUnit.sizes
	    var parsedSizes = RubiconAdapter.masSizeOrdering(Array.isArray(bid.params.sizes) ? bid.params.sizes.map((function (size) {
	      return (sizeMap[size] || '').split('x');
	    })) : bid.sizes);

	    if (parsedSizes.length < 1) {
	      throw "no valid sizes";
	    }

	    // using array to honor ordering. if order isn't important (it shouldn't be), an object would probably be preferable
	    var queryString = ['account_id', accountId, 'site_id', siteId, 'zone_id', zoneId, 'size_id', parsedSizes[0], 'alt_size_ids', parsedSizes.slice(1).join(',') || undefined, 'p_pos', position, 'rp_floor', floor, 'tk_flint', getIntegration(), 'p_screen_res', _getScreenResolution(), 'kw', keywords, 'tk_user_key', userId];

	    if (visitor !== null && (typeof visitor === 'undefined' ? 'undefined' : _typeof(visitor)) === "object") {
	      utils._each(visitor, (function (item, key) {
	        return queryString.push('tg_v.' + key, item);
	      }));
	    }

	    if (inventory !== null && (typeof inventory === 'undefined' ? 'undefined' : _typeof(inventory)) === 'object') {
	      utils._each(inventory, (function (item, key) {
	        return queryString.push('tg_i.' + key, item);
	      }));
	    }

	    queryString.push('rand', Math.random(), 'rf', !pageUrl ? utils.getTopWindowUrl() : pageUrl);

	    return queryString.reduce((function (memo, curr, index) {
	      return index % 2 === 0 && queryString[index + 1] !== undefined ? memo + curr + '=' + encodeURIComponent(queryString[index + 1]) + '&' : memo;
	    }), FASTLANE_ENDPOINT + '?').slice(0, -1); // remove trailing &
	  }

	  var _renderCreative = function _renderCreative(script, impId) {
	    return '<html>\n<head><script type=\'text/javascript\'>inDapIF=true;</script></head>\n<body style=\'margin : 0; padding: 0;\'>\n<!-- Rubicon Project Ad Tag -->\n<div data-rp-impression-id=\'' + impId + '\'>\n<script type=\'text/javascript\'>' + script + '</script>\n</div>\n</body>\n</html>';
	  };

	  function handleRpCB(responseText, bidRequest) {
	    var responseObj = JSON.parse(responseText),
	        // can throw
	    ads = responseObj.ads,
	        adResponseKey = bidRequest.placementCode;

	    // check overall response
	    if ((typeof responseObj === 'undefined' ? 'undefined' : _typeof(responseObj)) !== 'object' || responseObj.status !== 'ok') {
	      throw 'bad response';
	    }

	    // video ads array is wrapped in an object
	    if (bidRequest.mediaType === 'video' && (typeof ads === 'undefined' ? 'undefined' : _typeof(ads)) === 'object') {
	      ads = ads[adResponseKey];
	    }

	    // check the ad response
	    if (!Array.isArray(ads) || ads.length < 1) {
	      throw 'invalid ad response';
	    }

	    // if there are multiple ads, sort by CPM
	    ads = ads.sort(_adCpmSort);

	    ads.forEach((function (ad) {
	      if (ad.status !== 'ok') {
	        throw 'bad ad status';
	      }

	      //store bid response
	      //bid status is good (indicating 1)
	      var bid = _bidfactory2['default'].createBid(_constants.STATUS.GOOD, bidRequest);
	      bid.creative_id = ad.ad_id;
	      bid.bidderCode = bidRequest.bidder;
	      bid.cpm = ad.cpm || 0;
	      bid.dealId = ad.deal;
	      if (bidRequest.mediaType === 'video') {
	        bid.width = bidRequest.params.video.playerWidth;
	        bid.height = bidRequest.params.video.playerHeight;
	        bid.vastUrl = ad.creative_depot_url;
	        bid.descriptionUrl = ad.impression_id;
	        bid.impression_id = ad.impression_id;
	      } else {
	        bid.ad = _renderCreative(ad.script, ad.impression_id);

	        var _sizeMap$ad$size_id$s = sizeMap[ad.size_id].split('x').map((function (num) {
	          return Number(num);
	        }));

	        var _sizeMap$ad$size_id$s2 = _slicedToArray(_sizeMap$ad$size_id$s, 2);

	        bid.width = _sizeMap$ad$size_id$s2[0];
	        bid.height = _sizeMap$ad$size_id$s2[1];
	      }

	      try {
	        _bidmanager2['default'].addBidResponse(bidRequest.placementCode, bid);
	      } catch (err) {
	        utils.logError('Error from addBidResponse', null, err);
	      }
	    }));
	  }

	  function _adCpmSort(adA, adB) {
	    return (adB.cpm || 0.0) - (adA.cpm || 0.0);
	  }

	  return _extends(Adapter.createNew(RUBICON_BIDDER_CODE), {
	    callBids: _callBids,
	    createNew: RubiconAdapter.createNew
	  });
	}

	RubiconAdapter.masSizeOrdering = function (sizes) {
	  var MAS_SIZE_PRIORITY = [15, 2, 9];

	  return utils.parseSizesInput(sizes)
	  // map sizes while excluding non-matches
	  .reduce((function (result, size) {
	    var mappedSize = parseInt(sizeMap[size], 10);
	    if (mappedSize) {
	      result.push(mappedSize);
	    }
	    return result;
	  }), []).sort((function (first, second) {
	    // sort by MAS_SIZE_PRIORITY priority order
	    var firstPriority = MAS_SIZE_PRIORITY.indexOf(first),
	        secondPriority = MAS_SIZE_PRIORITY.indexOf(second);

	    if (firstPriority > -1 || secondPriority > -1) {
	      if (firstPriority === -1) {
	        return 1;
	      }
	      if (secondPriority === -1) {
	        return -1;
	      }
	      return firstPriority - secondPriority;
	    }

	    // and finally ascending order
	    return first - second;
	  }));
	};

	RubiconAdapter.createNew = function () {
	  return new RubiconAdapter();
	};

	module.exports = RubiconAdapter;

/***/ }),
/* 45 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var _adapter = __webpack_require__(14);

	var Adapter = _interopRequireWildcard(_adapter);

	var _bidfactory = __webpack_require__(10);

	var _bidfactory2 = _interopRequireDefault(_bidfactory);

	var _bidmanager = __webpack_require__(11);

	var _bidmanager2 = _interopRequireDefault(_bidmanager);

	var _utils = __webpack_require__(2);

	var utils = _interopRequireWildcard(_utils);

	var _ajax = __webpack_require__(21);

	var _constants = __webpack_require__(3);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

	var SMARTYADS_BIDDER_CODE = 'smartyads';

	var sizeMap = {
	  1: '468x60',
	  2: '728x90',
	  8: '120x600',
	  9: '160x600',
	  10: '300x600',
	  15: '300x250',
	  16: '336x280',
	  19: '300x100',
	  43: '320x50',
	  44: '300x50',
	  48: '300x300',
	  54: '300x1050',
	  55: '970x90',
	  57: '970x250',
	  58: '1000x90',
	  59: '320x80',
	  61: '1000x1000',
	  65: '640x480',
	  67: '320x480',
	  68: '1800x1000',
	  72: '320x320',
	  73: '320x160',
	  83: '480x300',
	  94: '970x310',
	  96: '970x210',
	  101: '480x320',
	  102: '768x1024',
	  113: '1000x300',
	  117: '320x100',
	  125: '800x250',
	  126: '200x600'
	};

	utils._each(sizeMap, (function (item, key) {
	  return sizeMap[item] = key;
	}));

	function SmartyadsAdapter() {

	  function _callBids(bidderRequest) {

	    var bids = bidderRequest.bids || [];

	    bids.forEach((function (bid) {
	      try {
	        (0, _ajax.ajax)(buildOptimizedCall(bid), bidCallback, undefined, { withCredentials: true });
	      } catch (err) {
	        utils.logError('Error sending smartyads request for placement code ' + bid.placementCode, null, err);
	      }

	      function bidCallback(responseText) {

	        try {
	          utils.logMessage('XHR callback function called for ad ID: ' + bid.bidId);
	          handleRpCB(responseText, bid);
	        } catch (err) {
	          if (typeof err === "string") {
	            utils.logWarn(err + ' when processing smartyads response for placement code ' + bid.placementCode);
	          } else {
	            utils.logError('Error processing smartyads response for placement code ' + bid.placementCode, null, err);
	          }

	          //indicate that there is no bid for this placement
	          var badBid = _bidfactory2['default'].createBid(_constants.STATUS.NO_BID, bid);
	          badBid.bidderCode = bid.bidder;
	          badBid.error = err;
	          _bidmanager2['default'].addBidResponse(bid.placementCode, badBid);
	        }
	      }
	    }));
	  }

	  function buildOptimizedCall(bid) {

	    bid.startTime = new Date().getTime();

	    // use smartyads sizes if provided, otherwise adUnit.sizes
	    var parsedSizes = SmartyadsAdapter.masSizeOrdering(Array.isArray(bid.params.sizes) ? bid.params.sizes.map((function (size) {
	      return (sizeMap[size] || '').split('x');
	    })) : bid.sizes);

	    if (parsedSizes.length < 1) {
	      throw "no valid sizes";
	    }

	    var secure;
	    if (window.location.protocol !== 'http:') {
	      secure = 1;
	    } else {
	      secure = 0;
	    }

	    var host = window.location.host,
	        page = window.location.pathname,
	        language = navigator.language,
	        deviceWidth = window.screen.width,
	        deviceHeight = window.screen.height;

	    var queryString = ['banner_id', bid.params.banner_id, 'size_ad', parsedSizes[0], 'alt_size_ad', parsedSizes.slice(1).join(',') || undefined, 'host', host, "page", page, "language", language, "deviceWidth", deviceWidth, "deviceHeight", deviceHeight, "secure", secure, "bidId", bid.bidId, "checkOn", 'rf'];

	    return queryString.reduce((function (memo, curr, index) {
	      return index % 2 === 0 && queryString[index + 1] !== undefined ? memo + curr + '=' + encodeURIComponent(queryString[index + 1]) + '&' : memo;
	    }), '//ssp-nj.webtradehub.com/?').slice(0, -1);
	  }

	  function handleRpCB(responseText, bidRequest) {

	    var ad = JSON.parse(responseText); // can throw

	    var bid = _bidfactory2['default'].createBid(_constants.STATUS.GOOD, bidRequest);
	    bid.creative_id = ad.ad_id;
	    bid.bidderCode = bidRequest.bidder;
	    bid.cpm = ad.cpm || 0;
	    bid.ad = ad.adm;
	    bid.width = ad.width;
	    bid.height = ad.height;
	    bid.dealId = ad.deal;

	    _bidmanager2['default'].addBidResponse(bidRequest.placementCode, bid);
	  }

	  return _extends(Adapter.createNew(SMARTYADS_BIDDER_CODE), { // SMARTYADS_BIDDER_CODE smartyads
	    callBids: _callBids,
	    createNew: SmartyadsAdapter.createNew
	  });
	}

	SmartyadsAdapter.masSizeOrdering = function (sizes) {

	  var MAS_SIZE_PRIORITY = [15, 2, 9];

	  return utils.parseSizesInput(sizes)
	  // map sizes while excluding non-matches
	  .reduce((function (result, size) {
	    var mappedSize = parseInt(sizeMap[size], 10);
	    if (mappedSize) {
	      result.push(mappedSize);
	    }
	    return result;
	  }), []).sort((function (first, second) {
	    // sort by MAS_SIZE_PRIORITY priority order
	    var firstPriority = MAS_SIZE_PRIORITY.indexOf(first),
	        secondPriority = MAS_SIZE_PRIORITY.indexOf(second);

	    if (firstPriority > -1 || secondPriority > -1) {
	      if (firstPriority === -1) {
	        return 1;
	      }
	      if (secondPriority === -1) {
	        return -1;
	      }
	      return firstPriority - secondPriority;
	    }

	    return first - second;
	  }));
	};

	SmartyadsAdapter.createNew = function () {
	  return new SmartyadsAdapter();
	};

	module.exports = SmartyadsAdapter;

/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);
	var url = __webpack_require__(22);

	var SmartAdServer = function SmartAdServer() {
	  var generateCallback = function generateCallback(bid) {
	    var callbackId = "sas_" + utils.getUniqueIdentifierStr();
	    pbjs[callbackId] = function (adUnit) {
	      var bidObject;
	      if (adUnit) {
	        utils.logMessage("[SmartAdServer] bid response for placementCode " + bid.placementCode);
	        bidObject = bidfactory.createBid(1);
	        bidObject.bidderCode = 'smartadserver';
	        bidObject.cpm = adUnit.cpm;
	        bidObject.currency = adUnit.currency;
	        bidObject.ad = adUnit.ad;
	        bidObject.width = adUnit.width;
	        bidObject.height = adUnit.height;
	        bidObject.dealId = adUnit.dealId;
	        bidmanager.addBidResponse(bid.placementCode, bidObject);
	      } else {
	        utils.logMessage("[SmartAdServer] no bid response for placementCode " + bid.placementCode);
	        bidObject = bidfactory.createBid(2);
	        bidObject.bidderCode = 'smartadserver';
	        bidmanager.addBidResponse(bid.placementCode, bidObject);
	      }
	    };
	    return callbackId;
	  };

	  return {
	    callBids: function callBids(params) {
	      for (var i = 0; i < params.bids.length; i++) {
	        var bid = params.bids[i];
	        var adCall = url.parse(bid.params.domain);
	        adCall.pathname = "/prebid";
	        adCall.search = {
	          "pbjscbk": "pbjs." + generateCallback(bid),
	          "siteid": bid.params.siteId,
	          "pgid": bid.params.pageId,
	          "fmtid": bid.params.formatId,
	          "ccy": bid.params.currency || "USD",
	          "tgt": encodeURIComponent(bid.params.target || ''),
	          "tag": bid.placementCode,
	          "sizes": bid.sizes.map((function (size) {
	            return size[0] + "x" + size[1];
	          })).join(","),
	          "async": 1
	        };
	        adloader.loadScript(url.format(adCall));
	      }
	    }
	  };
	};

	module.exports = SmartAdServer;

/***/ }),
/* 47 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _utils = __webpack_require__(2);

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var sekindoUMAdapter;
	sekindoUMAdapter = function sekindoUMAdapter() {

	  function _callBids(params) {
	    var bids = params.bids;
	    var bidsCount = bids.length;

	    var pubUrl = null;
	    if (parent !== window) pubUrl = document.referrer;else pubUrl = window.location.href;

	    for (var i = 0; i < bidsCount; i++) {
	      var bidReqeust = bids[i];
	      var callbackId = bidReqeust.bidId;
	      _requestBids(bidReqeust, callbackId, pubUrl);
	      //store a reference to the bidRequest from the callback id
	      //bidmanager.pbCallbackMap[callbackId] = bidReqeust;
	    }
	  }

	  pbjs.sekindoCB = function (callbackId, response) {
	    var bidObj = (0, _utils.getBidRequest)(callbackId);
	    if (typeof response !== 'undefined' && typeof response.cpm !== 'undefined') {
	      var bid = [];
	      if (bidObj) {
	        var bidCode = bidObj.bidder;
	        var placementCode = bidObj.placementCode;

	        if (response.cpm !== undefined && response.cpm > 0) {

	          bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD);
	          bid.callback_uid = callbackId;
	          bid.bidderCode = bidCode;
	          bid.creative_id = response.adId;
	          bid.cpm = parseFloat(response.cpm);
	          bid.ad = response.ad;
	          bid.width = response.width;
	          bid.height = response.height;

	          bidmanager.addBidResponse(placementCode, bid);
	        } else {
	          bid = bidfactory.createBid(CONSTANTS.STATUS.NO_BID);
	          bid.callback_uid = callbackId;
	          bid.bidderCode = bidCode;
	          bidmanager.addBidResponse(placementCode, bid);
	        }
	      }
	    } else {
	      if (bidObj) {
	        utils.logMessage('No prebid response for placement ' + bidObj.placementCode);
	      } else {
	        utils.logMessage('sekindoUM callback general error');
	      }
	    }
	  };

	  function _requestBids(bid, callbackId, pubUrl) {
	    //determine tag params
	    var spaceId = utils.getBidIdParameter('spaceId', bid.params);
	    var subId = utils.getBidIdParameter('subId', bid.params);
	    var bidfloor = utils.getBidIdParameter('bidfloor', bid.params);
	    var protocol = 'https:' === document.location.protocol ? 's' : '';
	    var scriptSrc = 'http' + protocol + '://hb.sekindo.com/live/liveView.php?';

	    scriptSrc = utils.tryAppendQueryString(scriptSrc, 's', spaceId);
	    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'subId', subId);
	    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'pubUrl', pubUrl);
	    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'hbcb', callbackId);
	    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'hbver', '3');
	    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'hbobj', 'pbjs');
	    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'dcpmflr', bidfloor);
	    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'hbto', pbjs.bidderTimeout);
	    scriptSrc = utils.tryAppendQueryString(scriptSrc, 'protocol', protocol);

	    adloader.loadScript(scriptSrc);
	  }

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = sekindoUMAdapter;

/***/ }),
/* 48 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);
	var utils = __webpack_require__(2);

	var SonobiAdapter = function SonobiAdapter() {
	  var keymakerAssoc = {}; //  Remember placement codes for callback mapping
	  var bidReqAssoc = {}; //  Remember bids for bid complete reporting

	  function _phone_in(request) {
	    var trinity = 'https://apex.go.sonobi.com/trinity.js?key_maker=';
	    var adSlots = request.bids || [];
	    var bidderRequestId = request.bidderRequestId;
	    var ref = window.frameElement ? '&ref=' + encodeURI(top.location.host || document.referrer) : '';
	    adloader.loadScript(trinity + JSON.stringify(_keymaker(adSlots)) + '&cv=' + _operator(bidderRequestId) + ref);
	  }

	  function _keymaker(adSlots) {
	    var keyring = {};
	    utils._each(adSlots, (function (bidRequest) {
	      if (bidRequest.params) {
	        //  Optional
	        var floor = bidRequest.params.floor ? bidRequest.params.floor : null;
	        //  Mandatory
	        var slotIdentifier = bidRequest.params.ad_unit ? bidRequest.params.ad_unit : bidRequest.params.placement_id ? bidRequest.params.placement_id : null;
	        var sizes = utils.parseSizesInput(bidRequest.sizes).toString() || null;
	        var bidId = bidRequest.bidId;
	        if (utils.isEmpty(sizes)) {
	          utils.logError('Sonobi adapter expects sizes for ' + bidRequest.placementCode);
	        }
	        var args = sizes ? floor ? sizes + '|f=' + floor : sizes : floor ? 'f=' + floor : '';
	        if (/^[\/]?[\d]+[[\/].+[\/]?]?$/.test(slotIdentifier)) {
	          slotIdentifier = slotIdentifier.charAt(0) === '/' ? slotIdentifier : '/' + slotIdentifier;
	          keyring[slotIdentifier + '|' + bidId] = args;
	          keymakerAssoc[slotIdentifier + '|' + bidId] = bidRequest.placementCode;
	          bidReqAssoc[bidRequest.placementCode] = bidRequest;
	        } else if (/^[0-9a-fA-F]{20}$/.test(slotIdentifier) && slotIdentifier.length === 20) {
	          keyring[bidId] = slotIdentifier + '|' + args;
	          keymakerAssoc[bidId] = bidRequest.placementCode;
	          bidReqAssoc[bidRequest.placementCode] = bidRequest;
	        } else {
	          keymakerAssoc[bidId] = bidRequest.placementCode;
	          bidReqAssoc[bidRequest.placementCode] = bidRequest;
	          _failure(bidRequest.placementCode);
	          utils.logError('The ad unit code or Sonobi Placement id for slot ' + bidRequest.placementCode + ' is invalid');
	        }
	      }
	    }));
	    return keyring;
	  }

	  function _operator(bidderRequestId) {
	    var cb_name = "sbi_" + bidderRequestId;
	    window[cb_name] = _trinity;
	    return cb_name;
	  }

	  function _trinity(response) {
	    var slots = response.slots || {};
	    var sbi_dc = response.sbi_dc || '';
	    utils._each(slots, (function (bid, slot_id) {
	      var placementCode = keymakerAssoc[slot_id];
	      if (bid.sbi_aid && bid.sbi_mouse && bid.sbi_size) {
	        _success(placementCode, sbi_dc, bid);
	      } else {
	        _failure(placementCode);
	      }
	      delete keymakerAssoc[slot_id];
	    }));
	  }

	  function _seraph(placementCode) {
	    var theOne = bidReqAssoc[placementCode];
	    delete bidReqAssoc[placementCode];
	    return theOne;
	  }

	  function _success(placementCode, sbi_dc, bid) {
	    var goodBid = bidfactory.createBid(1, _seraph(placementCode));
	    if (bid.sbi_dozer) {
	      goodBid.dealId = bid.sbi_dozer;
	    }
	    goodBid.bidderCode = 'sonobi';
	    goodBid.ad = _creative(sbi_dc, bid.sbi_aid);
	    goodBid.cpm = Number(bid.sbi_mouse);
	    goodBid.width = Number(bid.sbi_size.split('x')[0]) || 1;
	    goodBid.height = Number(bid.sbi_size.split('x')[1]) || 1;
	    bidmanager.addBidResponse(placementCode, goodBid);
	  }

	  function _failure(placementCode) {
	    var failBid = bidfactory.createBid(2, _seraph(placementCode));
	    failBid.bidderCode = 'sonobi';
	    bidmanager.addBidResponse(placementCode, failBid);
	  }

	  function _creative(sbi_dc, sbi_aid) {
	    var src = 'https://' + sbi_dc + 'apex.go.sonobi.com/sbi.js?aid=' + sbi_aid + '&as=null';
	    return '<script type="text/javascript" src="' + src + '"></script>';
	  }

	  return {
	    callBids: _phone_in,
	    formRequest: _keymaker,
	    parseResponse: _trinity,
	    success: _success,
	    failure: _failure
	  };
	};

	module.exports = SonobiAdapter;

/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	/**
	 * Adapter for requesting bids from Sovrn
	 */
	var SovrnAdapter = function SovrnAdapter() {
	  var sovrnUrl = 'ap.lijit.com/rtb/bid';

	  function _callBids(params) {
	    var sovrnBids = params.bids || [];

	    _requestBids(sovrnBids);
	  }

	  function _requestBids(bidReqs) {
	    // build bid request object
	    var domain = window.location.host;
	    var page = window.location.pathname + location.search + location.hash;

	    var sovrnImps = [];

	    //build impression array for sovrn
	    utils._each(bidReqs, (function (bid) {
	      var tagId = utils.getBidIdParameter('tagid', bid.params);
	      var bidFloor = utils.getBidIdParameter('bidfloor', bid.params);
	      var adW = 0;
	      var adH = 0;

	      //sovrn supports only one size per tagid, so we just take the first size if there are more
	      //if we are a 2 item array of 2 numbers, we must be a SingleSize array
	      var bidSizes = Array.isArray(bid.params.sizes) ? bid.params.sizes : bid.sizes;
	      var sizeArrayLength = bidSizes.length;
	      if (sizeArrayLength === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
	        adW = bidSizes[0];
	        adH = bidSizes[1];
	      } else {
	        adW = bidSizes[0][0];
	        adH = bidSizes[0][1];
	      }

	      var imp = {
	        id: bid.bidId,
	        banner: {
	          w: adW,
	          h: adH
	        },
	        tagid: tagId,
	        bidfloor: bidFloor
	      };
	      sovrnImps.push(imp);
	    }));

	    // build bid request with impressions
	    var sovrnBidReq = {
	      id: utils.getUniqueIdentifierStr(),
	      imp: sovrnImps,
	      site: {
	        domain: domain,
	        page: page
	      }
	    };

	    var scriptUrl = '//' + sovrnUrl + '?callback=window.pbjs.sovrnResponse' + '&src=' + CONSTANTS.REPO_AND_VERSION + '&br=' + encodeURIComponent(JSON.stringify(sovrnBidReq));
	    adloader.loadScript(scriptUrl);
	  }

	  function addBlankBidResponses(impidsWithBidBack) {
	    var missing = pbjs._bidsRequested.find((function (bidSet) {
	      return bidSet.bidderCode === 'sovrn';
	    }));
	    if (missing) {
	      missing = missing.bids.filter((function (bid) {
	        return impidsWithBidBack.indexOf(bid.bidId) < 0;
	      }));
	    } else {
	      missing = [];
	    }

	    missing.forEach((function (bidRequest) {
	      // Add a no-bid response for this bid request.
	      var bid = {};
	      bid = bidfactory.createBid(2, bidRequest);
	      bid.bidderCode = 'sovrn';
	      bidmanager.addBidResponse(bidRequest.placementCode, bid);
	    }));
	  }

	  //expose the callback to the global object:
	  pbjs.sovrnResponse = function (sovrnResponseObj) {
	    // valid object?
	    if (sovrnResponseObj && sovrnResponseObj.id) {
	      // valid object w/ bid responses?
	      if (sovrnResponseObj.seatbid && sovrnResponseObj.seatbid.length !== 0 && sovrnResponseObj.seatbid[0].bid && sovrnResponseObj.seatbid[0].bid.length !== 0) {
	        var impidsWithBidBack = [];
	        sovrnResponseObj.seatbid[0].bid.forEach((function (sovrnBid) {

	          var responseCPM;
	          var placementCode = '';
	          var id = sovrnBid.impid;
	          var bid = {};

	          // try to fetch the bid request we sent Sovrn
	          var bidObj = pbjs._bidsRequested.find((function (bidSet) {
	            return bidSet.bidderCode === 'sovrn';
	          })).bids.find((function (bid) {
	            return bid.bidId === id;
	          }));

	          if (bidObj) {
	            placementCode = bidObj.placementCode;
	            bidObj.status = CONSTANTS.STATUS.GOOD;

	            //place ad response on bidmanager._adResponsesByBidderId
	            responseCPM = parseFloat(sovrnBid.price);

	            if (responseCPM !== 0) {
	              sovrnBid.placementCode = placementCode;
	              sovrnBid.size = bidObj.sizes;
	              var responseAd = sovrnBid.adm;

	              // build impression url from response
	              var responseNurl = '<img src="' + sovrnBid.nurl + '">';

	              //store bid response
	              //bid status is good (indicating 1)
	              bid = bidfactory.createBid(1, bidObj);
	              bid.creative_id = sovrnBid.id;
	              bid.bidderCode = 'sovrn';
	              bid.cpm = responseCPM;

	              //set ad content + impression url
	              // sovrn returns <script> block, so use bid.ad, not bid.adurl
	              bid.ad = decodeURIComponent(responseAd + responseNurl);

	              // Set width and height from response now
	              bid.width = parseInt(sovrnBid.w);
	              bid.height = parseInt(sovrnBid.h);

	              bidmanager.addBidResponse(placementCode, bid);
	              impidsWithBidBack.push(id);
	            }
	          }
	        }));

	        addBlankBidResponses(impidsWithBidBack);
	      } else {
	        //no response data for all requests
	        addBlankBidResponses([]);
	      }
	    } else {
	      //no response data for all requests
	      addBlankBidResponses([]);
	    }
	  }; // sovrnResponse

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = SovrnAdapter;

/***/ }),
/* 50 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var SpringServeAdapter;
	SpringServeAdapter = function SpringServeAdapter() {

	  function buildSpringServeCall(bid) {

	    var spCall = window.location.protocol + '//bidder.springserve.com/display/hbid?';

	    //get width and height from bid attribute
	    var size = bid.sizes[0];
	    var width = size[0];
	    var height = size[1];

	    spCall += '&w=';
	    spCall += width;
	    spCall += '&h=';
	    spCall += height;

	    var params = bid.params;

	    //maps param attributes to request parameters
	    var requestAttrMap = {
	      sp: 'supplyPartnerId',
	      imp_id: 'impId'
	    };

	    for (var property in requestAttrMap) {
	      if (requestAttrMap.hasOwnProperty && params.hasOwnProperty(requestAttrMap[property])) {
	        spCall += '&';
	        spCall += property;
	        spCall += '=';

	        //get property from params and include it in request
	        spCall += params[requestAttrMap[property]];
	      }
	    }

	    var domain = window.location.hostname;

	    //override domain when testing
	    if (params.hasOwnProperty('test') && params.test === true) {
	      spCall += '&debug=true';
	      domain = 'test.com';
	    }

	    spCall += '&domain=';
	    spCall += domain;
	    spCall += '&callback=pbjs.handleSpringServeCB';

	    return spCall;
	  }

	  function _callBids(params) {
	    var bids = params.bids || [];
	    for (var i = 0; i < bids.length; i++) {
	      var bid = bids[i];
	      //bidmanager.pbCallbackMap[bid.params.impId] = params;
	      adloader.loadScript(buildSpringServeCall(bid));
	    }
	  }

	  pbjs.handleSpringServeCB = function (responseObj) {
	    if (responseObj && responseObj.seatbid && responseObj.seatbid.length > 0 && responseObj.seatbid[0].bid[0] !== undefined) {
	      //look up the request attributs stored in the bidmanager
	      var responseBid = responseObj.seatbid[0].bid[0];
	      //var requestObj = bidmanager.getPlacementIdByCBIdentifer(responseBid.impid);
	      var requestBids = pbjs._bidsRequested.find((function (bidSet) {
	        return bidSet.bidderCode === 'springserve';
	      }));
	      if (requestBids && requestBids.bids.length > 0) {
	        requestBids = requestBids.bids.filter((function (bid) {
	          return bid.params && bid.params.impId === +responseBid.impid;
	        }));
	      } else {
	        requestBids = [];
	      }
	      var bid = bidfactory.createBid(1);
	      var placementCode;

	      //assign properties from the original request to the bid object
	      for (var i = 0; i < requestBids.length; i++) {
	        var bidRequest = requestBids[i];
	        if (bidRequest.bidder === 'springserve') {
	          placementCode = bidRequest.placementCode;
	          var size = bidRequest.sizes[0];
	          bid.width = size[0];
	          bid.height = size[1];
	        }
	      }

	      if (requestBids[0]) {
	        bid.bidderCode = requestBids[0].bidder;
	      }

	      if (responseBid.hasOwnProperty('price') && responseBid.hasOwnProperty('adm')) {
	        //assign properties from the response to the bid object
	        bid.cpm = responseBid.price;
	        bid.ad = responseBid.adm;
	      } else {
	        //make object for invalid bid response
	        bid = bidfactory.createBid(2);
	        bid.bidderCode = 'springserve';
	      }

	      bidmanager.addBidResponse(placementCode, bid);
	    }
	  };

	  // Export the callBids function, so that prebid.js can execute this function
	  // when the page asks to send out bid requests.
	  return {
	    callBids: _callBids,
	    buildSpringServeCall: buildSpringServeCall
	  };
	};

	module.exports = SpringServeAdapter;

/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict";

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var utils = __webpack_require__(2);
	var adloader_1 = __webpack_require__(13);
	var ROOT_URL = "//cdn.thoughtleadr.com/v4/";
	var BID_AVAILABLE = 1;

	var ThoughtleadrAdapter = (function () {
	  function ThoughtleadrAdapter() {}

	  ThoughtleadrAdapter.prototype.callBids = function (params) {
	    if (!window.tldr || !window.tldr.requestPrebid) {
	      var rootUrl = ROOT_URL;
	      if (window.tldr && window.tldr.config && window.tldr.config.root_url) {
	        rootUrl = window.tldr.config.root_url;
	      }
	      adloader_1.loadScript(rootUrl + "page.js", this.handleBids.bind(this, params), true);
	    } else {
	      this.handleBids(params);
	    }
	  };

	  ThoughtleadrAdapter.prototype.handleBids = function (params) {
	    var bids = (params.bids || []).filter((function (bid) {
	      return ThoughtleadrAdapter.valid(bid);
	    }));

	    for (var _i = 0, bids_1 = bids; _i < bids_1.length; _i++) {
	      var bid = bids_1[_i];
	      this.requestPlacement(bid);
	    }
	  };

	  ThoughtleadrAdapter.prototype.requestPlacement = function (bid) {
	    var _this = this;
	    var rid = utils.generateUUID(null);
	    var size = ThoughtleadrAdapter.getSizes(bid.sizes);

	    window.tldr.requestPrebid(bid.params.placementId, rid).then((function (params) {
	      if (!params || !params.bid) {
	        utils.logError("invalid response from tldr.requestPrebid", undefined, undefined);
	        return;
	      }

	      _this.receiver = function (ev) {
	        if (ev.origin === location.origin && ev.data && ev.data.TLDR_REQUEST && ev.data.TLDR_REQUEST.rid === rid) {
	          ev.source.postMessage({ TLDR_RESPONSE: { config: params.config, rid: rid } }, location.origin);
	        }
	        _this.stopListen();
	      };
	      window.addEventListener("message", _this.receiver, false);
	      setTimeout((function () {
	        return _this.stopListen();
	      }), 5000);

	      var bidObject;
	      if (params.bid.code === BID_AVAILABLE) {
	        bidObject = bidfactory.createBid(params.bid.code);
	        bidObject.bidderCode = 'thoughtleadr';
	        bidObject.cpm = params.bid.cpm;
	        bidObject.ad = params.bid.ad;
	        bidObject.width = size.width;
	        bidObject.height = size.height;
	      } else {
	        bidObject = bidfactory.createBid(params.bid.code);
	        bidObject.bidderCode = 'thoughtleadr';
	      }
	      bidmanager.addBidResponse(bid.placementCode, bidObject);
	    }));
	  };

	  ThoughtleadrAdapter.prototype.stopListen = function () {
	    if (this.receiver) {
	      window.removeEventListener("message", this.receiver);
	      this.receiver = undefined;
	    }
	  };

	  ThoughtleadrAdapter.valid = function (bid) {
	    return !!(bid && bid.params && typeof bid.params.placementId === "string");
	  };

	  ThoughtleadrAdapter.getSizes = function (sizes) {
	    var first = sizes[0];
	    if (Array.isArray(first)) {
	      return ThoughtleadrAdapter.getSizes(first);
	    }
	    return {
	      width: sizes[0],
	      height: sizes[1]
	    };
	  };
	  return ThoughtleadrAdapter;
	})();

	module.exports = ThoughtleadrAdapter;

/***/ }),
/* 52 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var StickyAdsTVAdapter = function StickyAdsTVAdapter() {

	  var MUSTANG_URL = "//cdn.stickyadstv.com/mustang/mustang.min.js";
	  var INTEXTROLL_URL = "//cdn.stickyadstv.com/prime-time/intext-roll.min.js";
	  var SCREENROLL_URL = "//cdn.stickyadstv.com/prime-time/screen-roll.min.js";

	  var topMostWindow = getTopMostWindow();
	  topMostWindow.stickyadstv_cache = {};

	  function _callBids(params) {

	    var bids = params.bids || [];
	    for (var i = 0; i < bids.length; i++) {
	      var bid = bids[i];
	      // Send out bid request for each bid given its tag IDs and query strings

	      if (bid.placementCode && bid.params.zoneId) {
	        sendBidRequest(bid);
	      } else {
	        console.warn("StickyAdsTV: Missing mandatory field(s).");
	      }
	    }
	  }

	  function sendBidRequest(bid) {

	    var placementCode = bid.placementCode;

	    var integrationType = bid.params.format ? bid.params.format : "inbanner";
	    var urltoLoad = MUSTANG_URL;

	    if (integrationType === "intext-roll") {
	      urltoLoad = INTEXTROLL_URL;
	    }
	    if (integrationType === "screen-roll") {
	      urltoLoad = SCREENROLL_URL;
	    }

	    var bidRegistered = false;
	    adloader.loadScript(urltoLoad, (function () {

	      getBid(bid, (function (bidObject) {

	        if (!bidRegistered) {
	          bidRegistered = true;
	          bidmanager.addBidResponse(placementCode, bidObject);
	        }
	      }));
	    }), true);
	  }

	  function getBid(bid, callback) {
	    var zoneId = bid.params.zoneId || bid.params.zone; //accept both
	    var size = getBiggerSize(bid.sizes);

	    var vastLoader = new window.com.stickyadstv.vast.VastLoader();
	    bid.vast = topMostWindow.stickyadstv_cache[bid.placementCode] = vastLoader.getVast();

	    var vastCallback = {
	      onSuccess: bind((function () {

	        //'this' is the bid request here
	        var bidRequest = this;

	        var adHtml = formatAdHTML(bidRequest, size);
	        var price = extractPrice(bidRequest.vast);

	        callback(formatBidObject(bidRequest, true, price, adHtml, size[0], size[1]));
	      }), bid),
	      onError: bind((function () {
	        var bidRequest = this;
	        callback(formatBidObject(bidRequest, false));
	      }), bid)
	    };

	    var config = {
	      zoneId: zoneId,
	      playerSize: size[0] + "x" + size[1],
	      vastUrlParams: bid.params.vastUrlParams,
	      componentId: "prebid-sticky" + (bid.params.format ? "-" + bid.params.format : "")
	    };

	    if (bid.params.format === "screen-roll") {
	      //in screenroll case we never use the original div size.
	      config.playerSize = window.com.stickyadstv.screenroll.getPlayerSize();
	    }

	    vastLoader.load(config, vastCallback);
	  }

	  function getBiggerSize(array) {
	    var result = [1, 1];
	    for (var i = 0; i < array.length; i++) {
	      if (array[i][0] * array[i][1] > result[0] * result[1]) {
	        result = array[i];
	      }
	    }
	    return result;
	  }

	  var formatInBannerHTML = function formatInBannerHTML(bid, size) {
	    var placementCode = bid.placementCode;

	    var divHtml = "<div id=\"stickyadstv_prebid_target\"></div>";

	    var script = "<script type='text/javascript'>" +
	    //get the top most accessible window
	    "var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();" + "var vast =  topWindow.stickyadstv_cache[\"" + placementCode + "\"];" + "var config = {" + "  preloadedVast:vast," + "  autoPlay:true" + "};" + "var ad = new topWindow.com.stickyadstv.vpaid.Ad(document.getElementById(\"stickyadstv_prebid_target\"),config);" + "ad.initAd(" + size[0] + "," + size[1] + ",\"\",0,\"\",\"\");" + "</script>";

	    return divHtml + script;
	  };

	  var formatIntextHTML = function formatIntextHTML(bid) {
	    var placementCode = bid.placementCode;

	    var config = bid.params;

	    //default placement if no placement is set
	    if (!config.hasOwnProperty("domId") && !config.hasOwnProperty("auto") && !config.hasOwnProperty("p") && !config.hasOwnProperty("article")) {
	      config.domId = placementCode;
	    }

	    var script = "<script type='text/javascript'>" +
	    //get the top most accessible window
	    "var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();" + "var vast =  topWindow.stickyadstv_cache[\"" + placementCode + "\"];" + "var config = {" + "  preloadedVast:vast";

	    for (var key in config) {
	      //dont' send format parameter
	      //neither zone nor vastUrlParams value as Vast is already loaded
	      if (config.hasOwnProperty(key) && key !== "format" && key !== "zone" && key !== "zoneId" && key !== "vastUrlParams") {

	        script += "," + key + ":\"" + config[key] + "\"";
	      }
	    }
	    script += "};" + "topWindow.com.stickyadstv.intextroll.start(config);" + "</script>";

	    return script;
	  };

	  var formatScreenRollHTML = function formatScreenRollHTML(bid) {
	    var placementCode = bid.placementCode;

	    var config = bid.params;

	    var script = "<script type='text/javascript'>" +

	    //get the top most accessible window
	    "var topWindow = (function(){var res=window; try{while(top != res){if(res.parent.location.href.length)res=res.parent;}}catch(e){}return res;})();" + "var vast =  topWindow.stickyadstv_cache[\"" + placementCode + "\"];" + "var config = {" + "  preloadedVast:vast";

	    for (var key in config) {
	      //dont' send format parameter
	      //neither zone nor vastUrlParams values as Vast is already loaded
	      if (config.hasOwnProperty(key) && key !== "format" && key !== "zone" && key !== "zoneId" && key !== "vastUrlParams") {

	        script += "," + key + ":\"" + config[key] + "\"";
	      }
	    }
	    script += "};" + "topWindow.com.stickyadstv.screenroll.start(config);" + "</script>";

	    return script;
	  };

	  function formatAdHTML(bid, size) {

	    var integrationType = bid.params.format;

	    var html = "";
	    if (integrationType === "intext-roll") {
	      html = formatIntextHTML(bid);
	    } else if (integrationType === "screen-roll") {
	      html = formatScreenRollHTML(bid);
	    } else {
	      html = formatInBannerHTML(bid, size);
	    }

	    return html;
	  }

	  function extractPrice(vast) {
	    var priceData = vast.getPricing();

	    if (!priceData) {
	      console.warn("StickyAdsTV: Bid pricing Can't be retreived. You may need to enable pricing on you're zone. Please get in touch with your sticky contact.");
	    }

	    return priceData;
	  }

	  function formatBidObject(bidRequest, valid, priceData, html, width, height) {
	    var bidObject;
	    if (valid && priceData) {
	      // valid bid response
	      bidObject = bidfactory.createBid(1, bidRequest);
	      bidObject.bidderCode = 'stickyadstv';
	      bidObject.cpm = priceData.price;
	      bidObject.currencyCode = priceData.currency;
	      bidObject.ad = html;
	      bidObject.width = width;
	      bidObject.height = height;
	    } else {
	      // invalid bid response
	      bidObject = bidfactory.createBid(2, bidRequest);
	      bidObject.bidderCode = 'stickyadstv';
	    }
	    return bidObject;
	  }

	  /**
	  * returns the top most accessible window
	  */
	  function getTopMostWindow() {
	    var res = window;

	    try {
	      while (top !== res) {
	        if (res.parent.location.href.length) res = res.parent;
	      }
	    } catch (e) {}

	    return res;
	  }

	  /* Create a function bound to a given object (assigning `this`, and arguments,
	   * optionally). Binding with arguments is also known as `curry`.
	   * Delegates to **ECMAScript 5**'s native `Function.bind` if available.
	   * We check for `func.bind` first, to fail fast when `func` is undefined.
	   *
	   * @param {function} func
	   * @param {optional} context
	   * @param {...any} var_args 
	   * @return {function}
	   */
	  var bind = function bind(func, context) {

	    return function () {
	      return func.apply(context, arguments);
	    };
	  };

	  // Export the callBids function, so that prebid.js can execute
	  // this function when the page asks to send out bid requests.
	  return {
	    callBids: _callBids,
	    formatBidObject: formatBidObject,
	    formatAdHTML: formatAdHTML,
	    getBiggerSize: getBiggerSize,
	    getBid: getBid,
	    getTopMostWindow: getTopMostWindow
	  };
	};

	module.exports = StickyAdsTVAdapter;

/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(2);
	var adloader = __webpack_require__(13);
	var bidmanager = __webpack_require__(11);
	var bidfactory = __webpack_require__(10);

	/* TripleLift bidder factory function
	*  Use to create a TripleLiftAdapter object
	*/

	var TripleLiftAdapter = function TripleLiftAdapter() {

	  function _callBids(params) {
	    var tlReq = params.bids;
	    var bidsCount = tlReq.length;

	    // set expected bids count for callback execution
	    // bidmanager.setExpectedBidsCount('triplelift',bidsCount);

	    for (var i = 0; i < bidsCount; i++) {
	      var bidRequest = tlReq[i];
	      var callbackId = bidRequest.bidId;
	      adloader.loadScript(buildTLCall(bidRequest, callbackId));
	      // store a reference to the bidRequest from the callback id
	      // bidmanager.pbCallbackMap[callbackId] = bidRequest;
	    }
	  }

	  function buildTLCall(bid, callbackId) {
	    //determine tag params
	    var inventoryCode = utils.getBidIdParameter('inventoryCode', bid.params);
	    var floor = utils.getBidIdParameter('floor', bid.params);

	    // build our base tag, based on if we are http or https
	    var tlURI = '//tlx.3lift.com/header/auction?';
	    var tlCall = document.location.protocol + tlURI;

	    tlCall = utils.tryAppendQueryString(tlCall, 'callback', 'pbjs.TLCB');
	    tlCall = utils.tryAppendQueryString(tlCall, 'lib', 'prebid');
	    tlCall = utils.tryAppendQueryString(tlCall, 'v', '0.21.0-pre');
	    tlCall = utils.tryAppendQueryString(tlCall, 'callback_id', callbackId);
	    tlCall = utils.tryAppendQueryString(tlCall, 'inv_code', inventoryCode);
	    tlCall = utils.tryAppendQueryString(tlCall, 'floor', floor);

	    // indicate whether flash support exists
	    tlCall = utils.tryAppendQueryString(tlCall, 'fe', isFlashEnabled());

	    // sizes takes a bit more logic
	    var sizeQueryString = utils.parseSizesInput(bid.sizes);
	    if (sizeQueryString) {
	      tlCall += 'size=' + sizeQueryString + '&';
	    }

	    // append referrer
	    var referrer = utils.getTopWindowUrl();
	    tlCall = utils.tryAppendQueryString(tlCall, 'referrer', referrer);

	    // remove the trailing "&"
	    if (tlCall.lastIndexOf('&') === tlCall.length - 1) {
	      tlCall = tlCall.substring(0, tlCall.length - 1);
	    }

	    // @if NODE_ENV='debug'
	    utils.logMessage('tlCall request built: ' + tlCall);
	    // @endif

	    // append a timer here to track latency
	    bid.startTime = new Date().getTime();

	    return tlCall;
	  }

	  function isFlashEnabled() {
	    var hasFlash = 0;
	    try {
	      // check for Flash support in IE
	      var fo = new window.ActiveXObject('ShockwaveFlash.ShockwaveFlash');
	      if (fo) {
	        hasFlash = 1;
	      }
	    } catch (e) {
	      if (navigator.mimeTypes && navigator.mimeTypes['application/x-shockwave-flash'] !== undefined && navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin) {
	        hasFlash = 1;
	      }
	    }
	    return hasFlash;
	  }

	  // expose the callback to the global object:
	  pbjs.TLCB = function (tlResponseObj) {
	    if (tlResponseObj && tlResponseObj.callback_id) {
	      var bidObj = utils.getBidRequest(tlResponseObj.callback_id);
	      var placementCode = bidObj && bidObj.placementCode;

	      // @if NODE_ENV='debug'
	      if (bidObj) {
	        utils.logMessage('JSONP callback function called for inventory code: ' + bidObj.params.inventoryCode);
	      }
	      // @endif

	      var bid = [];
	      if (tlResponseObj && tlResponseObj.cpm && tlResponseObj.cpm !== 0) {

	        bid = bidfactory.createBid(1, bidObj);
	        bid.bidderCode = 'triplelift';
	        bid.cpm = tlResponseObj.cpm;
	        bid.ad = tlResponseObj.ad;
	        bid.width = tlResponseObj.width;
	        bid.height = tlResponseObj.height;
	        bid.dealId = tlResponseObj.deal_id;
	        bidmanager.addBidResponse(placementCode, bid);
	      } else {
	        // no response data
	        // @if NODE_ENV='debug'
	        if (bidObj) {
	          utils.logMessage('No prebid response from TripleLift for inventory code: ' + bidObj.params.inventoryCode);
	        }
	        // @endif
	        bid = bidfactory.createBid(2, bidObj);
	        bid.bidderCode = 'triplelift';
	        bidmanager.addBidResponse(placementCode, bid);
	      }
	    } else {
	      // no response data
	      // @if NODE_ENV='debug'
	      utils.logMessage('No prebid response for placement %%PLACEMENT%%');
	      // @endif
	    }
	  };

	  return {
	    callBids: _callBids

	  };
	};
	module.exports = TripleLiftAdapter;

/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _utils = __webpack_require__(2);

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var adloader = __webpack_require__(13);
	var bidmanager = __webpack_require__(11);
	var bidfactory = __webpack_require__(10);
	var Adapter = __webpack_require__(14);

	var TwengaAdapter;
	TwengaAdapter = function TwengaAdapter() {
	  var baseAdapter = Adapter.createNew('twenga');

	  baseAdapter.callBids = function (params) {
	    for (var i = 0; i < params.bids.length; i++) {
	      var bidRequest = params.bids[i];
	      var callbackId = bidRequest.bidId;
	      adloader.loadScript(buildBidCall(bidRequest, callbackId));
	    }
	  };

	  function buildBidCall(bid, callbackId) {

	    var bidUrl = '//rtb.t.c4tw.net/Bid?';
	    bidUrl = utils.tryAppendQueryString(bidUrl, 's', 'h');
	    bidUrl = utils.tryAppendQueryString(bidUrl, 'callback', 'pbjs.handleTwCB');
	    bidUrl = utils.tryAppendQueryString(bidUrl, 'callback_uid', callbackId);
	    bidUrl = utils.tryAppendQueryString(bidUrl, 'referrer', utils.getTopWindowUrl());
	    if (bid.params) {
	      for (var key in bid.params) {
	        var value = bid.params[key];
	        switch (key) {
	          case 'placementId':
	            key = 'id';break;
	          case 'siteId':
	            key = 'sid';break;
	          case 'publisherId':
	            key = 'pid';break;
	          case 'currency':
	            key = 'cur';break;
	          case 'bidFloor':
	            key = 'min';break;
	          case 'country':
	            key = 'gz';break;
	        }
	        bidUrl = utils.tryAppendQueryString(bidUrl, key, value);
	      }
	    }

	    var sizes = utils.parseSizesInput(bid.sizes);
	    if (sizes.length > 0) {
	      bidUrl = utils.tryAppendQueryString(bidUrl, 'size', sizes.join(','));
	    }

	    bidUrl += 'ta=1';

	    // @if NODE_ENV='debug'
	    utils.logMessage('bid request built: ' + bidUrl);

	    // @endif

	    //append a timer here to track latency
	    bid.startTime = new Date().getTime();

	    return bidUrl;
	  }

	  //expose the callback to the global object:
	  pbjs.handleTwCB = function (bidResponseObj) {

	    var bidCode;

	    if (bidResponseObj && bidResponseObj.callback_uid) {

	      var responseCPM;
	      var id = bidResponseObj.callback_uid;
	      var placementCode = '';
	      var bidObj = (0, _utils.getBidRequest)(id);
	      if (bidObj) {

	        bidCode = bidObj.bidder;

	        placementCode = bidObj.placementCode;

	        bidObj.status = CONSTANTS.STATUS.GOOD;
	      }

	      // @if NODE_ENV='debug'
	      utils.logMessage('JSONP callback function called for ad ID: ' + id);

	      // @endif
	      var bid = [];
	      if (bidResponseObj.result && bidResponseObj.result.cpm && bidResponseObj.result.cpm !== 0 && bidResponseObj.result.ad) {

	        var result = bidResponseObj.result;

	        responseCPM = parseInt(result.cpm, 10);

	        //CPM response from /Bid is dollar/cent multiplied by 10000
	        //in order to avoid using floats
	        //switch CPM to "dollar/cent"
	        responseCPM = responseCPM / 10000;

	        var ad = result.ad.replace('%%WP%%', result.cpm);

	        //store bid response
	        //bid status is good (indicating 1)
	        bid = bidfactory.createBid(1, bidObj);
	        bid.creative_id = result.creative_id;
	        bid.bidderCode = bidCode;
	        bid.cpm = responseCPM;
	        if (ad && (ad.lastIndexOf('http', 0) === 0 || ad.lastIndexOf('//', 0) === 0)) bid.adUrl = ad;else bid.ad = ad;
	        bid.width = result.width;
	        bid.height = result.height;

	        bidmanager.addBidResponse(placementCode, bid);
	      } else {
	        //no response data
	        // @if NODE_ENV='debug'
	        utils.logMessage('No prebid response from Twenga for placement code ' + placementCode);

	        // @endif
	        //indicate that there is no bid for this placement
	        bid = bidfactory.createBid(2, bidObj);
	        bid.bidderCode = bidCode;
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
	    callBids: baseAdapter.callBids,
	    setBidderCode: baseAdapter.setBidderCode,
	    createNew: TwengaAdapter.createNew,
	    buildBidCall: buildBidCall
	  };
	};

	TwengaAdapter.createNew = function () {
	  return new TwengaAdapter();
	};

	module.exports = TwengaAdapter;

/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * @overview Yieldbot sponsored Prebid.js adapter.
	 * @author elljoh
	 */
	var adloader = __webpack_require__(13);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var utils = __webpack_require__(2);

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
	    buildCreative: function buildCreative(slot, size) {
	      return '<script type="text/javascript" src="//cdn.yldbt.com/js/yieldbot.intent.js"></script>' + '<script type="text/javascript">var ybotq = ybotq || [];' + 'ybotq.push(function () {yieldbot.renderAd(\'' + slot + ':' + size + '\');});</script>';
	    },
	    /**
	     * Bid response builder.
	     *
	     * @param {Object} slotCriteria  - Yieldbot bid criteria
	     * @private
	     */
	    buildBid: function buildBid(slotCriteria) {
	      var bid = {};

	      if (slotCriteria && slotCriteria.ybot_ad && slotCriteria.ybot_ad !== 'n') {

	        bid = bidfactory.createBid(ybotlib.BID_STATUS.AVAILABLE);

	        bid.cpm = parseInt(slotCriteria.ybot_cpm) / 100.0 || 0; // Yieldbot CPM bids are in cents

	        var szArr = slotCriteria.ybot_size ? slotCriteria.ybot_size.split('x') : [0, 0];
	        var slot = slotCriteria.ybot_slot || '';
	        var sizeStr = slotCriteria.ybot_size || ''; // Creative template needs the dimensions string

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
	    callBids: function callBids(params) {

	      var bids = params.bids || [];
	      var ybotq = window.ybotq || [];

	      ybotlib.pageLevelOption = false;

	      ybotq.push((function () {
	        var yieldbot = window.yieldbot;

	        utils._each(bids, (function (v) {
	          var bid = v;
	          var psn = bid.params && bid.params.psn || 'ERROR_DEFINE_YB_PSN';
	          var slot = bid.params && bid.params.slot || 'ERROR_DEFINE_YB_SLOT';

	          yieldbot.pub(psn);
	          yieldbot.defineSlot(slot, { sizes: bid.sizes || [] });

	          ybotlib.definedSlots.push(bid.bidId);
	        }));

	        yieldbot.enableAsync();
	        yieldbot.go();
	      }));

	      ybotq.push((function () {
	        ybotlib.handleUpdateState();
	      }));

	      adloader.loadScript('//cdn.yldbt.com/js/yieldbot.intent.js', null, true);
	    },
	    /**
	     * Yieldbot bid request callback handler.
	     *
	     * @see {@link YieldbotAdapter~_callBids}
	     * @private
	     */
	    handleUpdateState: function handleUpdateState() {
	      var yieldbot = window.yieldbot;

	      utils._each(ybotlib.definedSlots, (function (v) {
	        var slot;
	        var criteria;
	        var placementCode;
	        var adapterConfig;

	        adapterConfig = pbjs._bidsRequested.find((function (bidderRequest) {
	          return bidderRequest.bidderCode === 'yieldbot';
	        })).bids.find((function (bid) {
	          return bid.bidId === v;
	        })) || {};
	        slot = adapterConfig.params.slot || '';
	        criteria = yieldbot.getSlotCriteria(slot);

	        placementCode = adapterConfig.placementCode || 'ERROR_YB_NO_PLACEMENT';
	        var bid = ybotlib.buildBid(criteria);

	        bidmanager.addBidResponse(placementCode, bid);
	      }));
	    }
	  };
	  return {
	    callBids: ybotlib.callBids
	  };
	};

	module.exports = YieldbotAdapter;

/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var defaultPlacementForBadBid = null;

	/**
	 * Adapter for requesting bids from NginAd
	 */
	var NginAdAdapter = function NginAdAdapter() {

	  var rtbServerDomain = 'placeholder.for.nginad.server.com';

	  function _callBids(params) {
	    var nginadBids = params.bids || [];

	    // De-dupe by tagid then issue single bid request for all bids
	    _requestBids(_getUniqueTagids(nginadBids));
	  }

	  // filter bids to de-dupe them?
	  function _getUniqueTagids(bids) {
	    var key;
	    var map = {};
	    var PubZoneIds = [];

	    for (key in bids) {
	      map[utils.getBidIdParameter('pzoneid', bids[key].params)] = bids[key];
	    }

	    for (key in map) {
	      if (map.hasOwnProperty(key)) {
	        PubZoneIds.push(map[key]);
	      }
	    }

	    return PubZoneIds;
	  }

	  function getWidthAndHeight(bid) {

	    var adW = null;
	    var adH = null;

	    var sizeArrayLength = bid.sizes.length;
	    if (sizeArrayLength === 2 && typeof bid.sizes[0] === 'number' && typeof bid.sizes[1] === 'number') {
	      adW = bid.sizes[0];
	      adH = bid.sizes[1];
	    } else {
	      adW = bid.sizes[0][0];
	      adH = bid.sizes[0][1];
	    }

	    return [adW, adH];
	  }

	  function _requestBids(bidReqs) {
	    // build bid request object
	    var domain = window.location.host;
	    var page = window.location.pathname + location.search + location.hash;

	    var nginadImps = [];

	    //assign the first adUnit (placement) for bad bids;
	    defaultPlacementForBadBid = bidReqs[0].placementCode;

	    //build impression array for nginad
	    utils._each(bidReqs, (function (bid) {
	      var tagId = utils.getBidIdParameter('pzoneid', bid.params);
	      var bidFloor = utils.getBidIdParameter('bidfloor', bid.params);

	      var whArr = getWidthAndHeight(bid);

	      var imp = {
	        id: bid.bidId,
	        banner: {
	          w: whArr[0],
	          h: whArr[1]
	        },
	        tagid: tagId,
	        bidfloor: bidFloor
	      };

	      nginadImps.push(imp);
	      //bidmanager.pbCallbackMap[imp.id] = bid;

	      rtbServerDomain = bid.params.nginadDomain;
	    }));

	    // build bid request with impressions
	    var nginadBidReq = {
	      id: utils.getUniqueIdentifierStr(),
	      imp: nginadImps,
	      site: {
	        domain: domain,
	        page: page
	      }
	    };

	    var scriptUrl = window.location.protocol + '//' + rtbServerDomain + '/bid/rtb?callback=window.pbjs.nginadResponse' + '&br=' + encodeURIComponent(JSON.stringify(nginadBidReq));

	    adloader.loadScript(scriptUrl);
	  }

	  function handleErrorResponse(bidReqs, defaultPlacementForBadBid) {
	    //no response data
	    if (defaultPlacementForBadBid === null) {
	      // no id with which to create an dummy bid
	      return;
	    }

	    var bid = bidfactory.createBid(2);
	    bid.bidderCode = 'nginad';
	    bidmanager.addBidResponse(defaultPlacementForBadBid, bid);
	  }

	  //expose the callback to the global object:
	  pbjs.nginadResponse = function (nginadResponseObj) {
	    var bid = {};
	    var key;

	    // valid object?
	    if (!nginadResponseObj || !nginadResponseObj.id) {
	      return handleErrorResponse(nginadResponseObj, defaultPlacementForBadBid);
	    }

	    if (!nginadResponseObj.seatbid || nginadResponseObj.seatbid.length === 0 || !nginadResponseObj.seatbid[0].bid || nginadResponseObj.seatbid[0].bid.length === 0) {
	      return handleErrorResponse(nginadResponseObj, defaultPlacementForBadBid);
	    }

	    for (key in nginadResponseObj.seatbid[0].bid) {

	      var nginadBid = nginadResponseObj.seatbid[0].bid[key];

	      var responseCPM;
	      var placementCode = '';
	      var id = nginadBid.impid;

	      // try to fetch the bid request we sent NginAd
	      /*jshint -W083 */
	      var bidObj = pbjs._bidsRequested.find((function (bidSet) {
	        return bidSet.bidderCode === 'nginad';
	      })).bids.find((function (bid) {
	        return bid.bidId === id;
	      }));
	      if (!bidObj) {
	        return handleErrorResponse(nginadBid, defaultPlacementForBadBid);
	      }

	      placementCode = bidObj.placementCode;
	      bidObj.status = CONSTANTS.STATUS.GOOD;

	      //place ad response on bidmanager._adResponsesByBidderId
	      responseCPM = parseFloat(nginadBid.price);

	      if (responseCPM === 0) {
	        handleErrorResponse(nginadBid, id);
	      }

	      nginadBid.placementCode = placementCode;
	      nginadBid.size = bidObj.sizes;
	      var responseAd = nginadBid.adm;

	      //store bid response
	      //bid status is good (indicating 1)
	      bid = bidfactory.createBid(1);
	      bid.creative_id = nginadBid.Id;
	      bid.bidderCode = 'nginad';
	      bid.cpm = responseCPM;

	      //The bid is a mock bid, the true bidding process happens after the publisher tag is called
	      bid.ad = decodeURIComponent(responseAd);

	      var whArr = getWidthAndHeight(bidObj);
	      bid.width = whArr[0];
	      bid.height = whArr[1];

	      bidmanager.addBidResponse(placementCode, bid);
	    }
	  }; // nginadResponse

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = NginAdAdapter;

/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	/**
	 * Adapter for requesting bids from Brightcom
	 */
	var BrightcomAdapter = function BrightcomAdapter() {

	  // Set Brightcom Bidder URL
	  var brightcomUrl = 'hb.iselephant.com/auc/ortb';

	  // Define the bidder code
	  var brightcomBidderCode = 'brightcom';

	  // Define the callback function
	  var brightcomCallbackFunction = 'window.pbjs=window.pbjs||window.parent.pbjs||window.top.pbjs;window.pbjs.brightcomResponse';

	  // Manage the requested and received ad units' codes, to know which are invalid (didn't return)
	  var reqAdUnitsCode = [],
	      resAdUnitsCode = [];

	  function _callBids(params) {

	    var bidRequests = params.bids || [];

	    // Get page data
	    var siteDomain = window.location.host;
	    var sitePage = window.location.href;

	    // Prepare impressions object
	    var brightcomImps = [];

	    // Prepare a variable for publisher id
	    var pubId = '';

	    // Go through the requests and build array of impressions
	    utils._each(bidRequests, (function (bid) {

	      // Get impression details
	      var tagId = utils.getBidIdParameter('tagId', bid.params);
	      var ref = utils.getBidIdParameter('ref', bid.params);
	      var adWidth = 0;
	      var adHeight = 0;

	      // If no publisher id is set, use the current
	      if (pubId === '') {
	        // Get the current publisher id (if it doesn't exist, it'll return '')
	        pubId = utils.getBidIdParameter('pubId', bid.params);
	      }

	      // Brightcom supports only 1 size per impression
	      // Check if the array contains 1 size or array of sizes
	      if (bid.sizes.length === 2 && typeof bid.sizes[0] === 'number' && typeof bid.sizes[1] === 'number') {
	        // The array contains 1 size (the items are the values)
	        adWidth = bid.sizes[0];
	        adHeight = bid.sizes[1];
	      } else {
	        // The array contains array of sizes, use the first size
	        adWidth = bid.sizes[0][0];
	        adHeight = bid.sizes[0][1];
	      }

	      // Build the impression
	      var imp = {
	        id: utils.getUniqueIdentifierStr(),
	        banner: {
	          w: adWidth,
	          h: adHeight
	        },
	        tagid: tagId
	      };

	      // If ref exists, create it (in the "ext" object)
	      if (ref !== '') {
	        imp.ext = {
	          refoverride: ref
	        };
	      }

	      // Add current impression to collection
	      brightcomImps.push(imp);
	      // Add mapping to current bid via impression id
	      //bidmanager.pbCallbackMap[imp.id] = bid;

	      // Add current ad unit's code to tracking
	      reqAdUnitsCode.push(bid.placementCode);
	    }));

	    // Build the bid request
	    var brightcomBidReq = {
	      id: utils.getUniqueIdentifierStr(),
	      imp: brightcomImps,
	      site: {
	        publisher: {
	          id: pubId
	        },
	        domain: siteDomain,
	        page: sitePage
	      }
	    };

	    // Add timeout data, if available
	    var PREBID_TIMEOUT = PREBID_TIMEOUT || 0;
	    var curTimeout = PREBID_TIMEOUT;
	    if (curTimeout > 0) {
	      brightcomBidReq.tmax = curTimeout;
	    }

	    // Define the bid request call URL
	    var bidRequestCallUrl = 'https://' + brightcomUrl + '?callback=' + encodeURIComponent(brightcomCallbackFunction) + '&request=' + encodeURIComponent(JSON.stringify(brightcomBidReq));

	    // Add the call to get the bid
	    adloader.loadScript(bidRequestCallUrl);
	  }

	  //expose the callback to the global object:
	  pbjs.brightcomResponse = function (brightcomResponseObj) {

	    var bid = {};

	    // Make sure response is valid
	    if (brightcomResponseObj && brightcomResponseObj.id && brightcomResponseObj.seatbid && brightcomResponseObj.seatbid.length !== 0 && brightcomResponseObj.seatbid[0].bid && brightcomResponseObj.seatbid[0].bid.length !== 0) {

	      // Go through the received bids
	      brightcomResponseObj.seatbid[0].bid.forEach((function (curBid) {

	        // Get the bid request data
	        var bidRequest = pbjs._bidsRequested.find((function (bidSet) {
	          return bidSet.bidderCode === 'brightcom';
	        })).bids[0]; // this assumes a single request only

	        // Make sure the bid exists
	        if (bidRequest) {

	          var placementCode = bidRequest.placementCode;
	          bidRequest.status = CONSTANTS.STATUS.GOOD;

	          curBid.placementCode = placementCode;
	          curBid.size = bidRequest.sizes;

	          // Get the creative
	          var responseCreative = curBid.adm;
	          // Build the NURL element
	          var responseNurl = '<img src="' + curBid.nurl + '" width="1" height="1" style="display:none" />';
	          // Build the ad to display:
	          var responseAd = decodeURIComponent(responseCreative + responseNurl);

	          // Create a valid bid
	          bid = bidfactory.createBid(1);

	          // Set the bid data
	          bid.creative_id = curBid.Id;
	          bid.bidderCode = brightcomBidderCode;
	          bid.cpm = parseFloat(curBid.price);

	          // Brightcom tag is in <script> block, so use bid.ad, not bid.adurl
	          bid.ad = responseAd;

	          // Since Brightcom currently supports only 1 size, if multiple sizes are provided - take the first
	          var adWidth, adHeight;
	          if (bidRequest.sizes.length === 2 && typeof bidRequest.sizes[0] === 'number' && typeof bidRequest.sizes[1] === 'number') {
	            // Only one size is provided
	            adWidth = bidRequest.sizes[0];
	            adHeight = bidRequest.sizes[1];
	          } else {
	            // And array of sizes is provided. Take the first.
	            adWidth = bidRequest.sizes[0][0];
	            adHeight = bidRequest.sizes[0][1];
	          }

	          // Set the ad's width and height
	          bid.width = adWidth;
	          bid.height = adHeight;

	          // Add the bid
	          bidmanager.addBidResponse(placementCode, bid);

	          // Add current ad unit's code to tracking
	          resAdUnitsCode.push(placementCode);
	        }
	      }));
	    }

	    // Define all unreceived ad unit codes as invalid (if Brightcom don't want to bid on an impression, it won't include it in the response)
	    for (var i = 0; i < reqAdUnitsCode.length; i++) {
	      var adUnitCode = reqAdUnitsCode[i];
	      // Check if current ad unit code was NOT received
	      if (resAdUnitsCode.indexOf(adUnitCode) === -1) {
	        // Current ad unit wasn't returned. Define it as invalid.
	        bid = bidfactory.createBid(2);
	        bid.bidderCode = brightcomBidderCode;
	        bidmanager.addBidResponse(adUnitCode, bid);
	      }
	    }
	  };

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = BrightcomAdapter;

/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10),
	    bidmanager = __webpack_require__(11),
	    utils = __webpack_require__(2),
	    adloader = __webpack_require__(13);

	var WideOrbitAdapter = function WideOrbitAdapter() {
	  var pageImpression = 'JSAdservingMP.ashx?pc={pc}&pbId={pbId}&clk=&exm=&jsv=1.0&tsv=1.0&cts={cts}&arp=0&fl=0&vitp=&vit=&jscb=window.pbjs.handleWideOrbitCallback&url={referrer}&fp=&oid=&exr=&mraid=&apid=&apbndl=&mpp=0&uid=&cb={cb}&hb=1',
	      pageRepeatCommonParam = '&gid{o}={gid}&pp{o}=&clk{o}=&rpos{o}={rpos}&ecpm{o}={ecpm}&ntv{o}=&ntl{o}=&adsid{o}=',
	      pageRepeatParamId = '&pId{o}={pId}&rank{o}={rank}',
	      pageRepeatParamNamed = '&wsName{o}={wsName}&wName{o}={wName}&rank{o}={rank}&bfDim{o}={width}x{height}&subp{o}={subp}',
	      base = window.location.protocol + '//p{pbId}.atemda.com/',
	      bids,
	      adapterName = 'wideorbit';

	  function _fixParamNames(param) {
	    if (!param) {
	      return;
	    }

	    var properties = ['site', 'page', 'width', 'height', 'rank', 'subPublisher', 'ecpm', 'atf', 'pId', 'pbId', 'referrer'],
	        prop;

	    utils._each(properties, (function (correctName) {
	      for (prop in param) {
	        if (param.hasOwnProperty(prop) && prop.toLowerCase() === correctName.toLowerCase()) {
	          param[correctName] = param[prop];
	          break;
	        }
	      }
	    }));
	  }

	  function _setParam(str, param, value) {
	    var pattern = new RegExp('{' + param + '}', 'g');

	    if (value === true) {
	      value = 1;
	    }
	    if (value === false) {
	      value = 0;
	    }
	    return str.replace(pattern, value);
	  }

	  function _setParams(str, keyValuePairs) {
	    utils._each(keyValuePairs, (function (keyValuePair) {
	      str = _setParam(str, keyValuePair[0], keyValuePair[1]);
	    }));
	    return str;
	  }

	  function _setCommonParams(pos, params) {
	    return _setParams(pageRepeatCommonParam, [['o', pos], ['gid', encodeURIComponent(params.tagId)], ['rpos', params.atf ? 1001 : 0], ['ecpm', params.ecpm || '']]);
	  }

	  function _getRankParam(rank, pos) {
	    return rank || pos;
	  }

	  function _setupIdPlacementParameters(pos, params) {
	    return _setParams(pageRepeatParamId, [['o', pos], ['pId', params.pId], ['rank', _getRankParam(params.rank, pos)]]);
	  }

	  function _setupNamedPlacementParameters(pos, params) {
	    return _setParams(pageRepeatParamNamed, [['o', pos], ['wsName', encodeURIComponent(decodeURIComponent(params.site))], ['wName', encodeURIComponent(decodeURIComponent(params.page))], ['width', params.width], ['height', params.height], ['subp', params.subPublisher ? encodeURIComponent(decodeURIComponent(params.subPublisher)) : ''], ['rank', _getRankParam(params.rank, pos)]]);
	  }

	  function _setupAdCall(publisherId, placementCount, placementsComponent, referrer) {
	    return _setParams(base + pageImpression, [['pbId', publisherId], ['pc', placementCount], ['cts', new Date().getTime()], ['cb', Math.floor(Math.random() * 100000000)], ['referrer', encodeURIComponent(referrer || '')]]) + placementsComponent;
	  }

	  function _setupPlacementParameters(pos, params) {
	    var commonParams = _setCommonParams(pos, params);

	    if (params.pId) {
	      return _setupIdPlacementParameters(pos, params) + commonParams;
	    }

	    return _setupNamedPlacementParameters(pos, params) + commonParams;
	  }

	  function _callBids(params) {
	    var publisherId,
	        bidUrl = '',
	        i,
	        referrer;

	    bids = params.bids || [];

	    for (i = 0; i < bids.length; i++) {
	      var requestParams = bids[i].params;

	      requestParams.tagId = bids[i].placementCode;

	      _fixParamNames(requestParams);

	      publisherId = requestParams.pbId;
	      referrer = referrer || requestParams.referrer;
	      bidUrl += _setupPlacementParameters(i, requestParams);
	    }

	    bidUrl = _setupAdCall(publisherId, bids.length, bidUrl, referrer);

	    utils.logMessage('Calling WO: ' + bidUrl);

	    adloader.loadScript(bidUrl);
	  }

	  function _processUserMatchings(userMatchings) {
	    var headElem = document.getElementsByTagName('head')[0],
	        createdElem;

	    utils._each(userMatchings, (function (userMatching) {
	      switch (userMatching.Type) {
	        case 'redirect':
	          createdElem = document.createElement('img');
	          break;
	        case 'iframe':
	          createdElem = utils.createInvisibleIframe();
	          break;
	        case 'javascript':
	          createdElem = document.createElement('script');
	          createdElem.type = 'text/javascript';
	          createdElem.async = true;
	          break;
	      }
	      createdElem.src = decodeURIComponent(userMatching.Url);
	      headElem.insertBefore(createdElem, headElem.firstChild);
	    }));
	  }

	  function _getBidResponse(id, placements) {
	    var i;

	    for (i = 0; i < placements.length; i++) {
	      if (placements[i].ExtPlacementId === id) {
	        return placements[i];
	      }
	    }
	  }

	  function _isUrl(scr) {
	    return scr.slice(0, 6) === "http:/" || scr.slice(0, 7) === "https:/" || scr.slice(0, 2) === "//";
	  }

	  function _buildAdCode(placement) {
	    var adCode = placement.Source,
	        pixelTag;

	    utils._each(placement.TrackingCodes, (function (trackingCode) {
	      if (_isUrl(trackingCode)) {
	        pixelTag = '<img src="' + trackingCode + '" width="0" height="0" style="position:absolute"></img>';
	      } else {
	        pixelTag = trackingCode;
	      }
	      adCode = pixelTag + adCode;
	    }));

	    return adCode;
	  }

	  window.pbjs = window.pbjs || {};
	  window.pbjs.handleWideOrbitCallback = function (response) {
	    var bidResponse, bidObject;

	    utils.logMessage('WO response. Placements: ' + response.Placements.length);

	    _processUserMatchings(response.UserMatchings);

	    utils._each(bids, (function (bid) {
	      bidResponse = _getBidResponse(bid.placementCode, response.Placements);

	      if (bidResponse && bidResponse.Type === 'DirectHTML') {
	        bidObject = bidfactory.createBid(1);
	        bidObject.cpm = bidResponse.Bid;
	        bidObject.ad = _buildAdCode(bidResponse);
	        bidObject.width = bidResponse.Width;
	        bidObject.height = bidResponse.Height;
	      } else {
	        bidObject = bidfactory.createBid(2);
	      }

	      bidObject.bidderCode = adapterName;
	      bidmanager.addBidResponse(bid.placementCode, bidObject);
	    }));
	  };

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = WideOrbitAdapter;

/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);
	var utils = __webpack_require__(2);

	var JCMAdapter = function JCMAdapter() {

	  window.pbjs = window.pbjs || {};
	  window.pbjs.processJCMResponse = function (JCMResponse) {
	    if (JCMResponse) {
	      var JCMRespObj = JSON.parse(JCMResponse);
	      if (JCMRespObj) {
	        var bids = JCMRespObj.bids;
	        for (var i = 0; i < bids.length; i++) {
	          var bid = bids[i];
	          var bidObject;
	          if (bid.cpm > 0) {
	            bidObject = bidfactory.createBid(1);
	            bidObject.bidderCode = 'jcm';
	            bidObject.cpm = bid.cpm;
	            bidObject.ad = decodeURIComponent(bid.ad.replace(/\+/g, '%20'));
	            bidObject.width = bid.width;
	            bidObject.height = bid.height;
	            bidmanager.addBidResponse(utils.getBidRequest(bid.callbackId).placementCode, bidObject);
	          } else {
	            bidObject = bidfactory.createBid(2);
	            bidObject.bidderCode = 'jcm';
	            bidmanager.addBidResponse(utils.getBidRequest(bid.callbackId).placementCode, bidObject);
	          }
	        }
	      }
	    }
	  };

	  function _callBids(params) {

	    var BidRequest = {
	      bids: []
	    };

	    for (var i = 0; i < params.bids.length; i++) {

	      var adSizes = "";
	      var bid = params.bids[i];
	      for (var x = 0; x < bid.sizes.length; x++) {
	        adSizes += utils.parseGPTSingleSizeArray(bid.sizes[x]);
	        if (x !== bid.sizes.length - 1) {
	          adSizes += ',';
	        }
	      }

	      BidRequest.bids.push({
	        "callbackId": bid.bidId,
	        "siteId": bid.params.siteId,
	        "adSizes": adSizes
	      });
	    }

	    var JSONStr = JSON.stringify(BidRequest);
	    var reqURL = document.location.protocol + "//media.adfrontiers.com/pq?t=hb&bids=" + encodeURIComponent(JSONStr);
	    adloader.loadScript(reqURL);
	  }

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = JCMAdapter;

/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);
	var utils = __webpack_require__(2);

	var UnderdogMediaAdapter = function UnderdogMediaAdapter() {

	  var getJsStaticUrl = window.location.protocol + '//bid.underdog.media/udm_header_lib.js';

	  function _callBids(params) {
	    if (typeof window.udm_header_lib === 'undefined') {
	      adloader.loadScript(getJsStaticUrl, (function () {
	        bid(params);
	      }));
	    } else {
	      bid(params);
	    }
	  }

	  function bid(params) {
	    var bids = params.bids;
	    var mapped_bids = [];
	    for (var i = 0; i < bids.length; i++) {
	      var bidRequest = bids[i];
	      var callback = bidResponseCallback(bidRequest);
	      mapped_bids.push({
	        sizes: bidRequest.sizes,
	        siteId: bidRequest.params.siteId,
	        bidfloor: bidRequest.params.bidfloor,
	        placementCode: bidRequest.placementCode,
	        divId: bidRequest.params.divId,
	        subId: bidRequest.params.subId,
	        callback: callback
	      });
	    }
	    var udmBidRequest = new window.udm_header_lib.BidRequestArray(mapped_bids);
	    udmBidRequest.send();
	  }

	  function bidResponseCallback(bid) {
	    return function (bidResponse) {
	      bidResponseAvailable(bid, bidResponse);
	    };
	  }

	  function bidResponseAvailable(bidRequest, bidResponse) {
	    if (bidResponse.bids.length > 0) {
	      for (var i = 0; i < bidResponse.bids.length; i++) {
	        var udm_bid = bidResponse.bids[i];
	        var bid = bidfactory.createBid(1);
	        bid.bidderCode = bidRequest.bidder;
	        bid.cpm = udm_bid.cpm;
	        bid.width = udm_bid.width;
	        bid.height = udm_bid.height;

	        if (udm_bid.ad_url !== undefined) {
	          bid.adUrl = udm_bid.ad_url;
	        } else if (udm_bid.ad_html !== undefined) {
	          bid.ad = udm_bid.ad_html;
	        } else {
	          utils.logMessage('Underdogmedia bid is lacking both ad_url and ad_html, skipping bid');
	          continue;
	        }

	        bidmanager.addBidResponse(bidRequest.placementCode, bid);
	      }
	    } else {
	      var nobid = bidfactory.createBid(2);
	      nobid.bidderCode = bidRequest.bidder;
	      bidmanager.addBidResponse(bidRequest.placementCode, nobid);
	    }
	  }

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = UnderdogMediaAdapter;

/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var defaultPlacementForBadBid = null;
	var bidderName = 'memeglobal';
	/**
	 * Adapter for requesting bids from Meme Global Media Group
	 * OpenRTB compatible
	 */
	var MemeGlobalAdapter = function MemeGlobalAdapter() {
	  var bidder = 'stinger.memeglobal.com/api/v1/services/prebid';

	  function _callBids(params) {
	    var bids = params.bids;

	    if (!bids) return;

	    // assign the first adUnit (placement) for bad bids;
	    defaultPlacementForBadBid = bids[0].placementCode;

	    for (var i = 0; i < bids.length; i++) {
	      _requestBid(bids[i]);
	    }
	  }

	  function _requestBid(bidReq) {
	    // build bid request object
	    var domain = window.location.host;
	    var page = window.location.host + window.location.pathname + location.search + location.hash;

	    var tagId = utils.getBidIdParameter('tagid', bidReq.params);
	    var bidFloor = Number(utils.getBidIdParameter('bidfloor', bidReq.params));
	    var adW = 0;
	    var adH = 0;

	    var bidSizes = Array.isArray(bidReq.params.sizes) ? bidReq.params.sizes : bidReq.sizes;
	    var sizeArrayLength = bidSizes.length;
	    if (sizeArrayLength === 2 && typeof bidSizes[0] === 'number' && typeof bidSizes[1] === 'number') {
	      adW = bidSizes[0];
	      adH = bidSizes[1];
	    } else {
	      adW = bidSizes[0][0];
	      adH = bidSizes[0][1];
	    }

	    // build bid request with impressions
	    var bidRequest = {
	      id: utils.getUniqueIdentifierStr(),
	      imp: [{
	        id: bidReq.bidId,
	        banner: {
	          w: adW,
	          h: adH
	        },
	        tagid: bidReq.placementCode,
	        bidfloor: bidFloor
	      }],
	      site: {
	        domain: domain,
	        page: page,
	        publisher: {
	          id: tagId
	        }
	      }
	    };

	    var scriptUrl = '//' + bidder + '?callback=window.pbjs.mgres' + '&src=' + CONSTANTS.REPO_AND_VERSION + '&br=' + encodeURIComponent(JSON.stringify(bidRequest));
	    adloader.loadScript(scriptUrl);
	  }

	  function getBidSetForBidder() {
	    return pbjs._bidsRequested.find((function (bidSet) {
	      return bidSet.bidderCode === bidderName;
	    }));
	  }

	  // expose the callback to the global object:
	  pbjs.mgres = function (bidResp) {

	    // valid object?
	    if (!bidResp || !bidResp.id || !bidResp.seatbid || bidResp.seatbid.length === 0 || !bidResp.seatbid[0].bid || bidResp.seatbid[0].bid.length === 0) {
	      return;
	    }

	    bidResp.seatbid[0].bid.forEach((function (bidderBid) {
	      var responseCPM;
	      var placementCode = '';

	      var bidSet = getBidSetForBidder();
	      var bidRequested = bidSet.bids.find((function (b) {
	        return b.bidId === bidderBid.impid;
	      }));
	      if (bidRequested) {
	        var bidResponse = bidfactory.createBid(1);
	        placementCode = bidRequested.placementCode;
	        bidRequested.status = CONSTANTS.STATUS.GOOD;
	        responseCPM = parseFloat(bidderBid.price);
	        if (responseCPM === 0) {
	          var bid = bidfactory.createBid(2);
	          bid.bidderCode = bidderName;
	          bidmanager.addBidResponse(placementCode, bid);
	          return;
	        }
	        bidResponse.placementCode = placementCode;
	        bidResponse.size = bidRequested.sizes;
	        var responseAd = bidderBid.adm;
	        var responseNurl = '<img src="' + bidderBid.nurl + '" height="0px" width="0px" style="display: none;">';
	        bidResponse.creative_id = bidderBid.id;
	        bidResponse.bidderCode = bidderName;
	        bidResponse.cpm = responseCPM;
	        bidResponse.ad = decodeURIComponent(responseAd + responseNurl);
	        bidResponse.width = parseInt(bidderBid.w);
	        bidResponse.height = parseInt(bidderBid.h);
	        bidmanager.addBidResponse(placementCode, bidResponse);
	      }
	    }));
	  };

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = MemeGlobalAdapter;

/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var CriteoAdapter = function CriteoAdapter() {

	  var _publisherTagUrl = window.location.protocol + '//static.criteo.net/js/ld/publishertag.js';
	  var _bidderCode = 'criteo';
	  var _profileId = 125;

	  function _callBids(params) {
	    if (!window.criteo_pubtag || window.criteo_pubtag instanceof Array) {
	      // publisherTag not loaded yet

	      _pushBidRequestEvent(params);
	      adloader.loadScript(_publisherTagUrl, (function () {}), true);
	    } else {
	      // publisherTag already loaded
	      _pushBidRequestEvent(params);
	    }
	  }

	  // send bid request to criteo direct bidder handler
	  function _pushBidRequestEvent(params) {

	    // if we want to be fully asynchronous, we must first check window.criteo_pubtag in case publishertag.js is not loaded yet.
	    window.Criteo = window.Criteo || {};
	    window.Criteo.events = window.Criteo.events || [];

	    // generate the bidding event
	    var biddingEventFunc = function biddingEventFunc() {

	      var bids = params.bids || [];

	      var slots = [];

	      var isAudit = false;

	      // build slots before sending one multi-slots bid request
	      for (var i = 0; i < bids.length; i++) {
	        var bid = bids[i];
	        slots.push(new Criteo.PubTag.DirectBidding.DirectBiddingSlot(bid.placementCode, bid.params.zoneId));

	        isAudit |= bid.params.audit !== undefined;
	      }

	      var biddingEvent = new Criteo.PubTag.DirectBidding.DirectBiddingEvent(_profileId, new Criteo.PubTag.DirectBidding.DirectBiddingUrlBuilder(isAudit), slots, _callbackSuccess(slots), _callbackError(slots), _callbackError(slots) // timeout handled as error
	      );

	      // process the event as soon as possible
	      window.criteo_pubtag.push(biddingEvent);
	    };

	    window.Criteo.events.push(biddingEventFunc);
	  }

	  function parseBidResponse(bidsResponse) {
	    try {
	      return JSON.parse(bidsResponse);
	    } catch (error) {
	      return {};
	    }
	  }

	  function isNoBidResponse(jsonbidsResponse) {
	    return jsonbidsResponse.slots === undefined;
	  }

	  function _callbackSuccess(slots) {
	    return function (bidsResponse) {
	      var jsonbidsResponse = parseBidResponse(bidsResponse);

	      if (isNoBidResponse(jsonbidsResponse)) return _callbackError(slots)();

	      for (var i = 0; i < slots.length; i++) {
	        var bidResponse = null;

	        // look for the matching bid response
	        for (var j = 0; j < jsonbidsResponse.slots.length; j++) {
	          if (jsonbidsResponse.slots[j] && jsonbidsResponse.slots[j].impid === slots[i].impId) {
	            bidResponse = jsonbidsResponse.slots.splice(j, 1)[0];
	            break;
	          }
	        }

	        // register the bid response
	        var bidObject;
	        if (bidResponse) {
	          bidObject = bidfactory.createBid(1);
	          bidObject.bidderCode = _bidderCode;
	          bidObject.cpm = bidResponse.cpm;
	          bidObject.ad = bidResponse.creative;
	          bidObject.width = bidResponse.width;
	          bidObject.height = bidResponse.height;
	        } else {
	          bidObject = _invalidBidResponse();
	        }
	        bidmanager.addBidResponse(slots[i].impId, bidObject);
	      }
	    };
	  }

	  function _callbackError(slots) {
	    return function () {
	      for (var i = 0; i < slots.length; i++) {
	        bidmanager.addBidResponse(slots[i].impId, _invalidBidResponse());
	      }
	    };
	  }

	  function _invalidBidResponse() {
	    var bidObject = bidfactory.createBid(2);
	    bidObject.bidderCode = _bidderCode;
	    return bidObject;
	  }

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = CriteoAdapter;

/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var CentroAdapter = function CentroAdapter() {
	  var baseUrl = '//t.brand-server.com/hb',
	      devUrl = '//staging.brand-server.com/hb',
	      bidderCode = 'centro',
	      handlerPrefix = 'adCentroHandler_',
	      LOG_ERROR_MESS = {
	    noUnit: 'Bid has no unit',
	    noAdTag: 'Bid has missmatch format.',
	    noBid: 'Response has no bid.',
	    anotherCode: 'Bid has another bidderCode - ',
	    undefBid: 'Bid is undefined',
	    unitNum: 'Requested unit is '
	  };

	  function _makeHandler(handlerName, unit, placementCode) {
	    return function (response) {
	      try {
	        delete window[handlerName];
	      } catch (err) {
	        //catching for old IE
	        window[handlerName] = undefined;
	      }
	      _responseProcessing(response, unit, placementCode);
	    };
	  }

	  function _sendBidRequest(bid) {
	    var placementCode = bid.placementCode,
	        size = bid.sizes && bid.sizes[0];

	    bid = bid.params;
	    if (!bid.unit) {
	      //throw exception, or call utils.logError
	      utils.logError(LOG_ERROR_MESS.noUnit, bidderCode);
	      return;
	    }
	    var query = ['s=' + bid.unit, 'adapter=prebid']; //,'url=www.abc15.com','sz=320x50'];
	    var isDev = bid.unit.toString() === '28136';

	    query.push('url=' + encodeURIComponent(bid.page_url || location.href));
	    //check size format
	    if (size instanceof Array && size.length === 2 && typeof size[0] === 'number' && typeof size[1] === 'number') {
	      query.push('sz=' + size.join('x'));
	    }
	    //make handler name for JSONP request
	    var handlerName = handlerPrefix + bid.unit + size.join('x') + encodeURIComponent(placementCode);
	    query.push('callback=' + handlerName);

	    //maybe is needed add some random parameter to disable cache
	    //query.push('r='+Math.round(Math.random() * 1e5));

	    window[handlerName] = _makeHandler(handlerName, bid.unit, placementCode);

	    adloader.loadScript((document.location.protocol === 'https:' ? 'https:' : 'http:') + (isDev ? devUrl : baseUrl) + '?' + query.join('&'));
	  }

	  /*
	   "sectionID": 7302,
	   "height": 250,
	   "width": 300,
	   "value": 3.2,
	   "adTag":''
	   */
	  function _responseProcessing(resp, unit, placementCode) {
	    var bidObject;
	    var bid = resp && resp.bid || resp;

	    if (bid && bid.adTag && bid.sectionID && bid.sectionID.toString() === unit.toString()) {
	      bidObject = bidfactory.createBid(1);
	      bidObject.cpm = bid.value;
	      bidObject.ad = bid.adTag;
	      bidObject.width = bid.width;
	      bidObject.height = bid.height;
	    } else {
	      //throw exception, or call utils.logError with resp.statusMessage
	      utils.logError(LOG_ERROR_MESS.unitNum + unit + '. ' + (bid ? bid.statusMessage || LOG_ERROR_MESS.noAdTag : LOG_ERROR_MESS.noBid), bidderCode);
	      bidObject = bidfactory.createBid(2);
	    }
	    bidObject.bidderCode = bidderCode;
	    bidmanager.addBidResponse(placementCode, bidObject);
	  }

	  /*
	   {
	   bidderCode: "centro",
	   bids: [
	   {
	   unit:  '3242432',
	   page_url: "http://",
	   size: [300, 250]
	   */
	  function _callBids(params) {
	    var bid,
	        bids = params.bids || [];
	    for (var i = 0; i < bids.length; i++) {
	      bid = bids[i];
	      if (bid && bid.bidder === bidderCode) {
	        _sendBidRequest(bid);
	      }
	    }
	  }

	  return {
	    callBids: _callBids
	  };
	};

	module.exports = CentroAdapter;

/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _utils = __webpack_require__(2);

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var adloader = __webpack_require__(13);
	var bidmanager = __webpack_require__(11);
	var bidfactory = __webpack_require__(10);

	var XhbAdapter = function XhbAdapter() {

	  var _defaultBidderSettings = {
	    alwaysUseBid: true,
	    adserverTargeting: [{
	      key: 'hb_xhb_deal',
	      val: function val(bidResponse) {
	        return bidResponse.dealId;
	      }
	    }, {
	      key: 'hb_xhb_adid',
	      val: function val(bidResponse) {
	        return bidResponse.adId;
	      }
	    }]
	  };
	  bidmanager.registerDefaultBidderSetting('xhb', _defaultBidderSettings);

	  function buildJPTCall(bid, callbackId) {
	    //determine tag params
	    var placementId = utils.getBidIdParameter('placementId', bid.params);
	    var inventoryCode = utils.getBidIdParameter('invCode', bid.params);
	    var referrer = utils.getBidIdParameter('referrer', bid.params);
	    var altReferrer = utils.getBidIdParameter('alt_referrer', bid.params);

	    //Always use https
	    var jptCall = 'https://ib.adnxs.com/jpt?';

	    jptCall = utils.tryAppendQueryString(jptCall, 'callback', 'pbjs.handleXhbCB');
	    jptCall = utils.tryAppendQueryString(jptCall, 'callback_uid', callbackId);
	    jptCall = utils.tryAppendQueryString(jptCall, 'id', placementId);
	    jptCall = utils.tryAppendQueryString(jptCall, 'code', inventoryCode);

	    //sizes takes a bit more logic
	    var sizeQueryString = '';
	    var parsedSizes = utils.parseSizesInput(bid.sizes);

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

	    if (sizeQueryString) {
	      jptCall += sizeQueryString + '&';
	    }

	    //append custom attributes:
	    var paramsCopy = utils.extend({}, bid.params);

	    //delete attributes already used
	    delete paramsCopy.placementId;
	    delete paramsCopy.invCode;
	    delete paramsCopy.query;
	    delete paramsCopy.referrer;
	    delete paramsCopy.alt_referrer;

	    //get the reminder
	    var queryParams = utils.parseQueryStringParameters(paramsCopy);

	    //append
	    if (queryParams) {
	      jptCall += queryParams;
	    }

	    //append referrer
	    if (referrer === '') {
	      referrer = utils.getTopWindowUrl();
	    }

	    jptCall = utils.tryAppendQueryString(jptCall, 'referrer', referrer);
	    jptCall = utils.tryAppendQueryString(jptCall, 'alt_referrer', altReferrer);

	    //remove the trailing "&"
	    if (jptCall.lastIndexOf('&') === jptCall.length - 1) {
	      jptCall = jptCall.substring(0, jptCall.length - 1);
	    }

	    return jptCall;
	  }

	  //expose the callback to the global object:
	  pbjs.handleXhbCB = function (jptResponseObj) {
	    var bidCode = void 0;

	    if (jptResponseObj && jptResponseObj.callback_uid) {

	      var responseCPM = void 0;
	      var id = jptResponseObj.callback_uid;
	      var placementCode = '';
	      var bidObj = (0, _utils.getBidRequest)(id);
	      if (bidObj) {
	        bidCode = bidObj.bidder;
	        placementCode = bidObj.placementCode;
	        //set the status
	        bidObj.status = CONSTANTS.STATUS.GOOD;
	      }

	      var bid = [];
	      if (jptResponseObj.result && jptResponseObj.result.ad && jptResponseObj.result.ad !== '') {
	        responseCPM = 0.00;

	        //store bid response
	        //bid status is good (indicating 1)
	        var adId = jptResponseObj.result.creative_id;
	        bid = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bidObj);
	        bid.creative_id = adId;
	        bid.bidderCode = bidCode;
	        bid.cpm = responseCPM;
	        bid.adUrl = jptResponseObj.result.ad;
	        bid.width = jptResponseObj.result.width;
	        bid.height = jptResponseObj.result.height;
	        bid.dealId = '99999999';

	        bidmanager.addBidResponse(placementCode, bid);
	      } else {
	        //no response data
	        //indicate that there is no bid for this placement
	        bid = bidfactory.createBid(2);
	        bid.bidderCode = bidCode;
	        bidmanager.addBidResponse(placementCode, bid);
	      }
	    }
	  };

	  function _callBids(params) {
	    var bids = params.bids || [];
	    for (var i = 0; i < bids.length; i++) {
	      var bid = bids[i];
	      var callbackId = bid.bidId;
	      adloader.loadScript(buildJPTCall(bid, callbackId));
	    }
	  }

	  // Export the callBids function, so that prebid.js can execute
	  // this function when the page asks to send out bid requests.
	  return {
	    callBids: _callBids
	  };
	};

	module.exports = XhbAdapter;

/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var utils = __webpack_require__(2);
	var bidmanager = __webpack_require__(11);
	var bidfactory = __webpack_require__(10);

	var STR_BIDDER_CODE = "sharethrough";
	var STR_VERSION = "0.1.0"; //Need to check analytics too for version

	var SharethroughAdapter = function SharethroughAdapter() {

	  var str = {};
	  str.STR_BTLR_HOST = document.location.protocol + "//btlr.sharethrough.com";
	  str.STR_BEACON_HOST = document.location.protocol + "//b.sharethrough.com/butler?";
	  str.placementCodeSet = {};

	  function _callBids(params) {
	    var bids = params.bids;

	    addEventListener("message", _receiveMessage, false);

	    // cycle through bids
	    for (var i = 0; i < bids.length; i += 1) {
	      var bidRequest = bids[i];
	      str.placementCodeSet[bidRequest.placementCode] = bidRequest;
	      var scriptUrl = _buildSharethroughCall(bidRequest);
	      str.loadIFrame(scriptUrl);
	    }
	  }

	  function _buildSharethroughCall(bid) {
	    var testPkey = 'test';
	    var pkey = utils.getBidIdParameter('pkey', bid.params);

	    var host = str.STR_BTLR_HOST;

	    var url = host + "/header-bid/v1?";
	    url = utils.tryAppendQueryString(url, 'bidId', bid.bidId);

	    if (pkey !== testPkey) {
	      url = utils.tryAppendQueryString(url, 'placement_key', pkey);
	      url = utils.tryAppendQueryString(url, 'ijson', 'pbjs.strcallback');
	      url = appendEnvFields(url);
	    } else {
	      url = url.substring(0, url.length - 1);
	    }

	    return url;
	  }

	  str.loadIFrame = function (url) {
	    var iframe = document.createElement("iframe");
	    iframe.src = url;
	    iframe.style.cssText = 'display:none;';

	    document.body.appendChild(iframe);
	  };

	  function _receiveMessage(event) {
	    if (event.origin === str.STR_BTLR_HOST) {
	      try {
	        pbjs.strcallback(JSON.parse(event.data).response);
	      } catch (e) {
	        console.log(e);
	      }
	    }
	  }

	  pbjs.strcallback = function (bidResponse) {
	    var bidId = bidResponse.bidId;
	    var bidObj = utils.getBidRequest(bidId);
	    try {
	      var bid = bidfactory.createBid(1, bidObj);
	      bid.bidderCode = STR_BIDDER_CODE;
	      bid.cpm = bidResponse.creatives[0].cpm;
	      var size = bidObj.sizes[0];
	      bid.width = size[0];
	      bid.height = size[1];
	      bid.adserverRequestId = bidResponse.adserverRequestId;
	      str.placementCodeSet[bidObj.placementCode].adserverRequestId = bidResponse.adserverRequestId;

	      bid.pkey = utils.getBidIdParameter('pkey', bidObj.params);

	      var windowLocation = 'str_response_' + bidId;
	      var bidJsonString = JSON.stringify(bidResponse);
	      bid.ad = '<div data-str-native-key="' + bid.pkey + '" data-stx-response-name=\'' + windowLocation + '\'>\n                </div>\n                <script>var ' + windowLocation + ' = ' + bidJsonString + '</script>\n                <script src="//native.sharethrough.com/assets/sfp-set-targeting.js"></script>\n                <script type=\'text/javascript\'>\n                (function() {\n                    var sfp_js = document.createElement(\'script\');\n                    sfp_js.src = "//native.sharethrough.com/assets/sfp.js";\n                    sfp_js.type = \'text/javascript\';\n                    sfp_js.charset = \'utf-8\';\n                    try {\n                        window.top.document.getElementsByTagName(\'body\')[0].appendChild(sfp_js);\n                    } catch (e) {\n                      console.log(e);\n                    }\n                })();\n                </script>';
	      bidmanager.addBidResponse(bidObj.placementCode, bid);
	    } catch (e) {
	      _handleInvalidBid(bidObj);
	    }
	  };

	  function _handleInvalidBid(bidObj) {
	    var bid = bidfactory.createBid(2, bidObj);
	    bidmanager.addBidResponse(bidObj.placementCode, bid);
	  }

	  function appendEnvFields(url) {
	    url = utils.tryAppendQueryString(url, 'hbVersion', '0.21.0-pre');
	    url = utils.tryAppendQueryString(url, 'strVersion', STR_VERSION);
	    url = utils.tryAppendQueryString(url, 'hbSource', 'prebid');

	    return url;
	  }

	  return {
	    callBids: _callBids,
	    str: str
	  };
	};

	module.exports = SharethroughAdapter;

/***/ }),
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var RoxotAdapter = function RoxotAdapter() {
	  var roxotUrl = "r.rxthdr.com";

	  pbjs.roxotResponseHandler = roxotResponseHandler;

	  return {
	    callBids: _callBids
	  };

	  function _callBids(bidReqs) {
	    utils.logInfo('callBids roxot adapter invoking');

	    var domain = window.location.host;
	    var page = window.location.pathname + location.search + location.hash;

	    var roxotBidReqs = {
	      id: utils.getUniqueIdentifierStr(),
	      bids: bidReqs,
	      site: {
	        domain: domain,
	        page: page
	      }
	    };

	    var scriptUrl = '//' + roxotUrl + '?callback=pbjs.roxotResponseHandler' + '&src=' + CONSTANTS.REPO_AND_VERSION + '&br=' + encodeURIComponent(JSON.stringify(roxotBidReqs));

	    adloader.loadScript(scriptUrl);
	  }

	  function roxotResponseHandler(roxotResponseObject) {
	    utils.logInfo('roxotResponseHandler invoking');
	    var placements = [];

	    if (isResponseInvalid()) {
	      return fillPlacementEmptyBid();
	    }

	    roxotResponseObject.bids.forEach(pushRoxotBid);
	    var allBidResponse = fillPlacementEmptyBid(placements);
	    utils.logInfo('roxotResponse handler finish');

	    return allBidResponse;

	    function isResponseInvalid() {
	      return !roxotResponseObject || !roxotResponseObject.bids || !Array.isArray(roxotResponseObject.bids) || roxotResponseObject.bids.length <= 0;
	    }

	    function pushRoxotBid(roxotBid) {
	      var placementCode = '';

	      var bidReq = pbjs._bidsRequested.find((function (bidSet) {
	        return bidSet.bidderCode === 'roxot';
	      })).bids.find((function (bid) {
	        return bid.bidId === roxotBid.bidId;
	      }));

	      if (!bidReq) {
	        return pushErrorBid(placementCode);
	      }

	      bidReq.status = CONSTANTS.STATUS.GOOD;

	      placementCode = bidReq.placementCode;
	      placements.push(placementCode);

	      var cpm = roxotBid.cpm;
	      var responseNurl = '<img src="' + roxotBid.nurl + '">';

	      if (!cpm) {
	        return pushErrorBid(placementCode);
	      }

	      var bid = bidfactory.createBid(1, bidReq);

	      bid.creative_id = roxotBid.id;
	      bid.bidderCode = 'roxot';
	      bid.cpm = cpm;
	      bid.ad = decodeURIComponent(roxotBid.adm + responseNurl);
	      bid.width = parseInt(roxotBid.w);
	      bid.height = parseInt(roxotBid.h);

	      bidmanager.addBidResponse(placementCode, bid);
	    }

	    function fillPlacementEmptyBid(places) {
	      pbjs._bidsRequested.find((function (bidSet) {
	        return bidSet.bidderCode === 'roxot';
	      })).bids.forEach(fillIfNotFilled);

	      function fillIfNotFilled(bid) {
	        if (utils.contains(places, bid.placementCode)) {
	          return null;
	        }

	        pushErrorBid(bid);
	      }
	    }

	    function pushErrorBid(bidRequest) {
	      var bid = bidfactory.createBid(2, bidRequest);
	      bid.bidderCode = 'roxot';
	      bidmanager.addBidResponse(bidRequest.placementCode, bid);
	    }
	  }
	};

	module.exports = RoxotAdapter;

/***/ }),
/* 67 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var CONSTANTS = __webpack_require__(3);
	var utils = __webpack_require__(2);
	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var adloader = __webpack_require__(13);

	var VertozAdapter = function VertozAdapter() {

	  var BASE_URI = '//banner.vrtzads.com/vzhbidder/bid?';
	  var BIDDER_NAME = 'vertoz';
	  var QUERY_PARAM_KEY = 'q';

	  function _callBids(params) {
	    var bids = params.bids || [];

	    for (var i = 0; i < bids.length; i++) {
	      var bid = bids[i];
	      var slotBidId = utils.getValue(bid, 'bidId');
	      var cb = Math.round(new Date().getTime() / 1000);
	      var vzEndPoint = BASE_URI;
	      var reqParams = bid.params || {};
	      var placementId = utils.getValue(reqParams, 'placementId');

	      if (utils.isEmptyStr(placementId)) {
	        utils.logError('missing params:', BIDDER_NAME, 'Enter valid vzPlacementId');
	        return;
	      }

	      var reqSrc = utils.getTopWindowLocation().href;
	      var vzReq = {
	        _vzPlacementId: placementId,
	        _rqsrc: reqSrc,
	        _cb: cb,
	        _slotBidId: slotBidId
	      };
	      var queryParamValue = JSON.stringify(vzReq);
	      vzEndPoint = utils.tryAppendQueryString(vzEndPoint, QUERY_PARAM_KEY, queryParamValue);
	      adloader.loadScript(vzEndPoint);
	    }
	  }

	  pbjs.vzResponse = function (vertozResponse) {
	    var bidRespObj = vertozResponse;
	    var bidObject;
	    var reqBidObj = utils.getBidRequest(bidRespObj.slotBidId);

	    if (bidRespObj.cpm) {
	      bidObject = bidfactory.createBid(CONSTANTS.STATUS.GOOD, reqBidObj);
	      bidObject.cpm = Number(bidRespObj.cpm);
	      bidObject.ad = bidRespObj.ad + utils.createTrackPixelHtml(decodeURIComponent(bidRespObj.nurl));
	      bidObject.width = bidRespObj.adWidth;
	      bidObject.height = bidRespObj.adHeight;
	    } else {
	      var respStatusText = bidRespObj.statusText;
	      bidObject = bidfactory.createBid(CONSTANTS.STATUS.NO_BID, reqBidObj);
	      utils.logMessage(respStatusText);
	    }

	    var adSpaceId = reqBidObj.placementCode;
	    bidObject.bidderCode = BIDDER_NAME;
	    bidmanager.addBidResponse(adSpaceId, bidObject);
	  };
	  return { callBids: _callBids };
	};

	module.exports = VertozAdapter;

/***/ }),
/* 68 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _utils = __webpack_require__(2);

	var utils = __webpack_require__(2);
	var adloader = __webpack_require__(13);
	var bidmanager = __webpack_require__(11);
	var bidfactory = __webpack_require__(10);

	function WidespaceAdapter() {
	  var useSSL = 'https:' === document.location.protocol,
	      baseURL = (useSSL ? 'https:' : 'http:') + '//engine.widespace.com/map/engine/hb/dynamic?',
	      callbackName = 'pbjs.widespaceHandleCB';

	  function _callBids(params) {
	    var bids = params && params.bids || [];

	    for (var i = 0; i < bids.length; i++) {
	      var bid = bids[i],
	          callbackUid = bid.bidId,
	          sid = bid.params.sid,
	          currency = bid.params.currency;

	      //Handle Sizes string
	      var sizeQueryString = '';
	      var parsedSizes = utils.parseSizesInput(bid.sizes);

	      sizeQueryString = parsedSizes.reduce((function (prev, curr) {
	        return prev ? prev + ',' + curr : curr;
	      }), sizeQueryString);

	      var requestURL = baseURL;
	      requestURL = utils.tryAppendQueryString(requestURL, 'hb.name', 'prebidjs');
	      requestURL = utils.tryAppendQueryString(requestURL, 'hb.callback', callbackName);
	      requestURL = utils.tryAppendQueryString(requestURL, 'hb.callbackUid', callbackUid);
	      requestURL = utils.tryAppendQueryString(requestURL, 'hb.sizes', sizeQueryString);
	      requestURL = utils.tryAppendQueryString(requestURL, 'sid', sid);
	      requestURL = utils.tryAppendQueryString(requestURL, 'hb.currency', currency);

	      // Expose the callback
	      pbjs.widespaceHandleCB = window[callbackName] = handleCallback;

	      adloader.loadScript(requestURL);
	    }
	  }

	  //Handle our callback
	  var handleCallback = function handleCallback(bidsArray) {
	    if (!bidsArray) {
	      return;
	    }

	    var bidObject,
	        bidCode = 'widespace';

	    for (var i = 0, l = bidsArray.length; i < l; i++) {
	      var bid = bidsArray[i],
	          placementCode = '',
	          validSizes = [];

	      bid.sizes = { height: bid.height, width: bid.height };

	      var inBid = (0, _utils.getBidRequest)(bid.callbackUid);

	      if (inBid) {
	        bidCode = inBid.bidder;
	        placementCode = inBid.placementCode;
	        validSizes = inBid.sizes;
	      }
	      if (bid && bid.callbackUid && bid.status !== 'noad' && verifySize(bid.sizes, validSizes)) {
	        bidObject = bidfactory.createBid(1);
	        bidObject.bidderCode = bidCode;
	        bidObject.cpm = bid.cpm;
	        bidObject.cur = bid.currency;
	        bidObject.creative_id = bid.adId;
	        bidObject.ad = bid.code;
	        bidObject.width = bid.width;
	        bidObject.height = bid.height;
	        bidmanager.addBidResponse(placementCode, bidObject);
	      } else {
	        bidObject = bidfactory.createBid(2);
	        bidObject.bidderCode = bidCode;
	        bidmanager.addBidResponse(placementCode, bidObject);
	      }
	    }

	    function verifySize(bid, validSizes) {
	      for (var j = 0, k = validSizes.length; j < k; j++) {
	        if (bid.width === validSizes[j][0] && bid.height === validSizes[j][1]) {
	          return true;
	        }
	      }
	      return false;
	    }
	  };

	  return {
	    callBids: _callBids
	  };
	}

	module.exports = WidespaceAdapter;

/***/ }),
/* 69 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var bidfactory = __webpack_require__(10);
	var bidmanager = __webpack_require__(11);
	var Ajax = __webpack_require__(21);
	var utils = __webpack_require__(2);

	/**
	 * Adapter for requesting bids from Admixer.
	 *
	 * @returns {{callBids: _callBids,responseCallback: _responseCallback}}
	 */
	var AdmixerAdapter = function AdmixerAdapter() {
	  var invUrl = '//inv-nets.admixer.net/prebid.aspx';

	  function _callBids(data) {
	    var bids = data.bids || [];
	    for (var i = 0, ln = bids.length; i < ln; i++) {
	      var bid = bids[i];
	      var params = {
	        'sizes': utils.parseSizesInput(bid.sizes).join('-'),
	        'zone': bid.params && bid.params.zone,
	        'callback_uid': bid.placementCode
	      };
	      if (params.zone) {
	        _requestBid(invUrl, params);
	      } else {
	        var bidObject = bidfactory.createBid(2);
	        bidObject.bidderCode = 'admixer';
	        bidmanager.addBidResponse(params.callback_uid, bidObject);
	      }
	    }
	  }

	  function _requestBid(url, params) {
	    Ajax.ajax(url, _responseCallback, params, { method: 'GET', withCredentials: true });
	  }

	  function _responseCallback(adUnit) {
	    try {
	      adUnit = JSON.parse(adUnit);
	    } catch (_error) {
	      adUnit = { result: { cpm: 0 } };
	      utils.logError(_error);
	    }
	    var adUnitCode = adUnit.callback_uid;
	    var bid = adUnit.result;
	    var bidObject;
	    if (bid.cpm > 0) {
	      bidObject = bidfactory.createBid(1);
	      bidObject.bidderCode = 'admixer';
	      bidObject.cpm = bid.cpm;
	      bidObject.ad = bid.ad;
	      bidObject.width = bid.width;
	      bidObject.height = bid.height;
	    } else {
	      bidObject = bidfactory.createBid(2);
	      bidObject.bidderCode = 'admixer';
	    }
	    bidmanager.addBidResponse(adUnitCode, bidObject);
	  }

	  return {
	    callBids: _callBids,
	    responseCallback: _responseCallback
	  };
	};

	module.exports = AdmixerAdapter;

/***/ }),
/* 70 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _shim = __webpack_require__(71);

	var _shim2 = _interopRequireDefault(_shim);

	var _shim3 = __webpack_require__(96);

	var _shim4 = _interopRequireDefault(_shim3);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	/** @module polyfill
	Misc polyfills
	*/
	/*jshint -W121 */
	if (!Array.prototype.find) {
	  (0, _shim2['default'])();
	}

	if (!Array.prototype.includes) {
	  (0, _shim4['default'])();
	}

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
	Number.isInteger = Number.isInteger || function (value) {
	  return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
	};

/***/ }),
/* 71 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var define = __webpack_require__(72);
	var getPolyfill = __webpack_require__(76);

	module.exports = function shimArrayPrototypeFind() {
		var polyfill = getPolyfill();

		define(Array.prototype, { find: polyfill }, {
			find: function () {
				return Array.prototype.find !== polyfill;
			}
		});

		return polyfill;
	};


/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var keys = __webpack_require__(73);
	var foreach = __webpack_require__(75);
	var hasSymbols = typeof Symbol === 'function' && typeof Symbol() === 'symbol';

	var toStr = Object.prototype.toString;

	var isFunction = function (fn) {
		return typeof fn === 'function' && toStr.call(fn) === '[object Function]';
	};

	var arePropertyDescriptorsSupported = function () {
		var obj = {};
		try {
			Object.defineProperty(obj, 'x', { enumerable: false, value: obj });
	        /* eslint-disable no-unused-vars, no-restricted-syntax */
	        for (var _ in obj) { return false; }
	        /* eslint-enable no-unused-vars, no-restricted-syntax */
			return obj.x === obj;
		} catch (e) { /* this is IE 8. */
			return false;
		}
	};
	var supportsDescriptors = Object.defineProperty && arePropertyDescriptorsSupported();

	var defineProperty = function (object, name, value, predicate) {
		if (name in object && (!isFunction(predicate) || !predicate())) {
			return;
		}
		if (supportsDescriptors) {
			Object.defineProperty(object, name, {
				configurable: true,
				enumerable: false,
				value: value,
				writable: true
			});
		} else {
			object[name] = value;
		}
	};

	var defineProperties = function (object, map) {
		var predicates = arguments.length > 2 ? arguments[2] : {};
		var props = keys(map);
		if (hasSymbols) {
			props = props.concat(Object.getOwnPropertySymbols(map));
		}
		foreach(props, (function (name) {
			defineProperty(object, name, map[name], predicates[name]);
		}));
	};

	defineProperties.supportsDescriptors = !!supportsDescriptors;

	module.exports = defineProperties;


/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	// modified from https://github.com/es-shims/es5-shim
	var has = Object.prototype.hasOwnProperty;
	var toStr = Object.prototype.toString;
	var slice = Array.prototype.slice;
	var isArgs = __webpack_require__(74);
	var isEnumerable = Object.prototype.propertyIsEnumerable;
	var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
	var hasProtoEnumBug = isEnumerable.call((function () {}), 'prototype');
	var dontEnums = [
		'toString',
		'toLocaleString',
		'valueOf',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'constructor'
	];
	var equalsConstructorPrototype = function (o) {
		var ctor = o.constructor;
		return ctor && ctor.prototype === o;
	};
	var excludedKeys = {
		$console: true,
		$external: true,
		$frame: true,
		$frameElement: true,
		$frames: true,
		$innerHeight: true,
		$innerWidth: true,
		$outerHeight: true,
		$outerWidth: true,
		$pageXOffset: true,
		$pageYOffset: true,
		$parent: true,
		$scrollLeft: true,
		$scrollTop: true,
		$scrollX: true,
		$scrollY: true,
		$self: true,
		$webkitIndexedDB: true,
		$webkitStorageInfo: true,
		$window: true
	};
	var hasAutomationEqualityBug = (function () {
		/* global window */
		if (typeof window === 'undefined') { return false; }
		for (var k in window) {
			try {
				if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
					try {
						equalsConstructorPrototype(window[k]);
					} catch (e) {
						return true;
					}
				}
			} catch (e) {
				return true;
			}
		}
		return false;
	}());
	var equalsConstructorPrototypeIfNotBuggy = function (o) {
		/* global window */
		if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
			return equalsConstructorPrototype(o);
		}
		try {
			return equalsConstructorPrototype(o);
		} catch (e) {
			return false;
		}
	};

	var keysShim = function keys(object) {
		var isObject = object !== null && typeof object === 'object';
		var isFunction = toStr.call(object) === '[object Function]';
		var isArguments = isArgs(object);
		var isString = isObject && toStr.call(object) === '[object String]';
		var theKeys = [];

		if (!isObject && !isFunction && !isArguments) {
			throw new TypeError('Object.keys called on a non-object');
		}

		var skipProto = hasProtoEnumBug && isFunction;
		if (isString && object.length > 0 && !has.call(object, 0)) {
			for (var i = 0; i < object.length; ++i) {
				theKeys.push(String(i));
			}
		}

		if (isArguments && object.length > 0) {
			for (var j = 0; j < object.length; ++j) {
				theKeys.push(String(j));
			}
		} else {
			for (var name in object) {
				if (!(skipProto && name === 'prototype') && has.call(object, name)) {
					theKeys.push(String(name));
				}
			}
		}

		if (hasDontEnumBug) {
			var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);

			for (var k = 0; k < dontEnums.length; ++k) {
				if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
					theKeys.push(dontEnums[k]);
				}
			}
		}
		return theKeys;
	};

	keysShim.shim = function shimObjectKeys() {
		if (Object.keys) {
			var keysWorksWithArguments = (function () {
				// Safari 5.0 bug
				return (Object.keys(arguments) || '').length === 2;
			}(1, 2));
			if (!keysWorksWithArguments) {
				var originalKeys = Object.keys;
				Object.keys = function keys(object) {
					if (isArgs(object)) {
						return originalKeys(slice.call(object));
					} else {
						return originalKeys(object);
					}
				};
			}
		} else {
			Object.keys = keysShim;
		}
		return Object.keys || keysShim;
	};

	module.exports = keysShim;


/***/ }),
/* 74 */
/***/ (function(module, exports) {

	'use strict';

	var toStr = Object.prototype.toString;

	module.exports = function isArguments(value) {
		var str = toStr.call(value);
		var isArgs = str === '[object Arguments]';
		if (!isArgs) {
			isArgs = str !== '[object Array]' &&
				value !== null &&
				typeof value === 'object' &&
				typeof value.length === 'number' &&
				value.length >= 0 &&
				toStr.call(value.callee) === '[object Function]';
		}
		return isArgs;
	};


/***/ }),
/* 75 */
/***/ (function(module, exports) {

	
	var hasOwn = Object.prototype.hasOwnProperty;
	var toString = Object.prototype.toString;

	module.exports = function forEach (obj, fn, ctx) {
	    if (toString.call(fn) !== '[object Function]') {
	        throw new TypeError('iterator must be a function');
	    }
	    var l = obj.length;
	    if (l === +l) {
	        for (var i = 0; i < l; i++) {
	            fn.call(ctx, obj[i], i, obj);
	        }
	    } else {
	        for (var k in obj) {
	            if (hasOwn.call(obj, k)) {
	                fn.call(ctx, obj[k], k, obj);
	            }
	        }
	    }
	};



/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = function getPolyfill() {
		// Detect if an implementation exists
		// Detect early implementations which skipped holes in sparse arrays
	  // eslint-disable-next-line no-sparse-arrays
		var implemented = Array.prototype.find && [, 1].find((function () {
			return true;
		})) !== 1;

	  // eslint-disable-next-line global-require
		return implemented ? Array.prototype.find : __webpack_require__(77);
	};


/***/ }),
/* 77 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var ES = __webpack_require__(78);

	module.exports = function find(predicate) {
		var list = ES.ToObject(this);
		var length = ES.ToInteger(ES.ToLength(list.length));
		if (!ES.IsCallable(predicate)) {
			throw new TypeError('Array#find: predicate must be a function');
		}
		if (length === 0) {
			return undefined;
		}
		var thisArg = arguments[1];
		for (var i = 0, value; i < length; i++) {
			value = list[i];
			if (ES.Call(predicate, thisArg, [value, i, list])) {
				return value;
			}
		}
		return undefined;
	};


/***/ }),
/* 78 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var toStr = Object.prototype.toString;
	var hasSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol';
	var symbolToStr = hasSymbols ? Symbol.prototype.toString : toStr;

	var $isNaN = __webpack_require__(79);
	var $isFinite = __webpack_require__(80);
	var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || Math.pow(2, 53) - 1;

	var assign = __webpack_require__(81);
	var sign = __webpack_require__(82);
	var mod = __webpack_require__(83);
	var isPrimitive = __webpack_require__(84);
	var toPrimitive = __webpack_require__(85);
	var parseInteger = parseInt;
	var bind = __webpack_require__(90);
	var strSlice = bind.call(Function.call, String.prototype.slice);
	var isBinary = bind.call(Function.call, RegExp.prototype.test, /^0b[01]+$/i);
	var isOctal = bind.call(Function.call, RegExp.prototype.test, /^0o[0-7]+$/i);
	var nonWS = ['\u0085', '\u200b', '\ufffe'].join('');
	var nonWSregex = new RegExp('[' + nonWS + ']', 'g');
	var hasNonWS = bind.call(Function.call, RegExp.prototype.test, nonWSregex);
	var invalidHexLiteral = /^[-+]0x[0-9a-f]+$/i;
	var isInvalidHexLiteral = bind.call(Function.call, RegExp.prototype.test, invalidHexLiteral);

	// whitespace from: http://es5.github.io/#x15.5.4.20
	// implementation from https://github.com/es-shims/es5-shim/blob/v3.4.0/es5-shim.js#L1304-L1324
	var ws = [
		'\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003',
		'\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028',
		'\u2029\uFEFF'
	].join('');
	var trimRegex = new RegExp('(^[' + ws + ']+)|([' + ws + ']+$)', 'g');
	var replace = bind.call(Function.call, String.prototype.replace);
	var trim = function (value) {
		return replace(value, trimRegex, '');
	};

	var ES5 = __webpack_require__(92);

	var hasRegExpMatcher = __webpack_require__(94);

	// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-abstract-operations
	var ES6 = assign(assign({}, ES5), {

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-call-f-v-args
		Call: function Call(F, V) {
			var args = arguments.length > 2 ? arguments[2] : [];
			if (!this.IsCallable(F)) {
				throw new TypeError(F + ' is not a function');
			}
			return F.apply(V, args);
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toprimitive
		ToPrimitive: toPrimitive,

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toboolean
		// ToBoolean: ES5.ToBoolean,

		// http://www.ecma-international.org/ecma-262/6.0/#sec-tonumber
		ToNumber: function ToNumber(argument) {
			var value = isPrimitive(argument) ? argument : toPrimitive(argument, 'number');
			if (typeof value === 'symbol') {
				throw new TypeError('Cannot convert a Symbol value to a number');
			}
			if (typeof value === 'string') {
				if (isBinary(value)) {
					return this.ToNumber(parseInteger(strSlice(value, 2), 2));
				} else if (isOctal(value)) {
					return this.ToNumber(parseInteger(strSlice(value, 2), 8));
				} else if (hasNonWS(value) || isInvalidHexLiteral(value)) {
					return NaN;
				} else {
					var trimmed = trim(value);
					if (trimmed !== value) {
						return this.ToNumber(trimmed);
					}
				}
			}
			return Number(value);
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tointeger
		// ToInteger: ES5.ToNumber,

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toint32
		// ToInt32: ES5.ToInt32,

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint32
		// ToUint32: ES5.ToUint32,

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toint16
		ToInt16: function ToInt16(argument) {
			var int16bit = this.ToUint16(argument);
			return int16bit >= 0x8000 ? int16bit - 0x10000 : int16bit;
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint16
		// ToUint16: ES5.ToUint16,

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toint8
		ToInt8: function ToInt8(argument) {
			var int8bit = this.ToUint8(argument);
			return int8bit >= 0x80 ? int8bit - 0x100 : int8bit;
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint8
		ToUint8: function ToUint8(argument) {
			var number = this.ToNumber(argument);
			if ($isNaN(number) || number === 0 || !$isFinite(number)) { return 0; }
			var posInt = sign(number) * Math.floor(Math.abs(number));
			return mod(posInt, 0x100);
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint8clamp
		ToUint8Clamp: function ToUint8Clamp(argument) {
			var number = this.ToNumber(argument);
			if ($isNaN(number) || number <= 0) { return 0; }
			if (number >= 0xFF) { return 0xFF; }
			var f = Math.floor(argument);
			if (f + 0.5 < number) { return f + 1; }
			if (number < f + 0.5) { return f; }
			if (f % 2 !== 0) { return f + 1; }
			return f;
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tostring
		ToString: function ToString(argument) {
			if (typeof argument === 'symbol') {
				throw new TypeError('Cannot convert a Symbol value to a string');
			}
			return String(argument);
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toobject
		ToObject: function ToObject(value) {
			this.RequireObjectCoercible(value);
			return Object(value);
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-topropertykey
		ToPropertyKey: function ToPropertyKey(argument) {
			var key = this.ToPrimitive(argument, String);
			return typeof key === 'symbol' ? symbolToStr.call(key) : this.ToString(key);
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
		ToLength: function ToLength(argument) {
			var len = this.ToInteger(argument);
			if (len <= 0) { return 0; } // includes converting -0 to +0
			if (len > MAX_SAFE_INTEGER) { return MAX_SAFE_INTEGER; }
			return len;
		},

		// http://www.ecma-international.org/ecma-262/6.0/#sec-canonicalnumericindexstring
		CanonicalNumericIndexString: function CanonicalNumericIndexString(argument) {
			if (toStr.call(argument) !== '[object String]') {
				throw new TypeError('must be a string');
			}
			if (argument === '-0') { return -0; }
			var n = this.ToNumber(argument);
			if (this.SameValue(this.ToString(n), argument)) { return n; }
			return void 0;
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-requireobjectcoercible
		RequireObjectCoercible: ES5.CheckObjectCoercible,

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isarray
		IsArray: Array.isArray || function IsArray(argument) {
			return toStr.call(argument) === '[object Array]';
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-iscallable
		// IsCallable: ES5.IsCallable,

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isconstructor
		IsConstructor: function IsConstructor(argument) {
			return typeof argument === 'function' && !!argument.prototype; // unfortunately there's no way to truly check this without try/catch `new argument`
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isextensible-o
		IsExtensible: function IsExtensible(obj) {
			if (!Object.preventExtensions) { return true; }
			if (isPrimitive(obj)) {
				return false;
			}
			return Object.isExtensible(obj);
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isinteger
		IsInteger: function IsInteger(argument) {
			if (typeof argument !== 'number' || $isNaN(argument) || !$isFinite(argument)) {
				return false;
			}
			var abs = Math.abs(argument);
			return Math.floor(abs) === abs;
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-ispropertykey
		IsPropertyKey: function IsPropertyKey(argument) {
			return typeof argument === 'string' || typeof argument === 'symbol';
		},

		// http://www.ecma-international.org/ecma-262/6.0/#sec-isregexp
		IsRegExp: function IsRegExp(argument) {
			if (!argument || typeof argument !== 'object') {
				return false;
			}
			if (hasSymbols) {
				var isRegExp = argument[Symbol.match];
				if (typeof isRegExp !== 'undefined') {
					return ES5.ToBoolean(isRegExp);
				}
			}
			return hasRegExpMatcher(argument);
		},

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevalue
		// SameValue: ES5.SameValue,

		// https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero
		SameValueZero: function SameValueZero(x, y) {
			return (x === y) || ($isNaN(x) && $isNaN(y));
		},

		/**
		 * 7.3.2 GetV (V, P)
		 * 1. Assert: IsPropertyKey(P) is true.
		 * 2. Let O be ToObject(V).
		 * 3. ReturnIfAbrupt(O).
		 * 4. Return O.[[Get]](P, V).
		 */
		GetV: function GetV(V, P) {
			// 7.3.2.1
			if (!this.IsPropertyKey(P)) {
				throw new TypeError('Assertion failed: IsPropertyKey(P) is not true');
			}

			// 7.3.2.2-3
			var O = this.ToObject(V);

			// 7.3.2.4
			return O[P];
		},

		/**
		 * 7.3.9 - http://www.ecma-international.org/ecma-262/6.0/#sec-getmethod
		 * 1. Assert: IsPropertyKey(P) is true.
		 * 2. Let func be GetV(O, P).
		 * 3. ReturnIfAbrupt(func).
		 * 4. If func is either undefined or null, return undefined.
		 * 5. If IsCallable(func) is false, throw a TypeError exception.
		 * 6. Return func.
		 */
		GetMethod: function GetMethod(O, P) {
			// 7.3.9.1
			if (!this.IsPropertyKey(P)) {
				throw new TypeError('Assertion failed: IsPropertyKey(P) is not true');
			}

			// 7.3.9.2
			var func = this.GetV(O, P);

			// 7.3.9.4
			if (func == null) {
				return undefined;
			}

			// 7.3.9.5
			if (!this.IsCallable(func)) {
				throw new TypeError(P + 'is not a function');
			}

			// 7.3.9.6
			return func;
		},

		/**
		 * 7.3.1 Get (O, P) - http://www.ecma-international.org/ecma-262/6.0/#sec-get-o-p
		 * 1. Assert: Type(O) is Object.
		 * 2. Assert: IsPropertyKey(P) is true.
		 * 3. Return O.[[Get]](P, O).
		 */
		Get: function Get(O, P) {
			// 7.3.1.1
			if (this.Type(O) !== 'Object') {
				throw new TypeError('Assertion failed: Type(O) is not Object');
			}
			// 7.3.1.2
			if (!this.IsPropertyKey(P)) {
				throw new TypeError('Assertion failed: IsPropertyKey(P) is not true');
			}
			// 7.3.1.3
			return O[P];
		},

		Type: function Type(x) {
			if (typeof x === 'symbol') {
				return 'Symbol';
			}
			return ES5.Type(x);
		},

		// http://www.ecma-international.org/ecma-262/6.0/#sec-speciesconstructor
		SpeciesConstructor: function SpeciesConstructor(O, defaultConstructor) {
			if (this.Type(O) !== 'Object') {
				throw new TypeError('Assertion failed: Type(O) is not Object');
			}
			var C = O.constructor;
			if (typeof C === 'undefined') {
				return defaultConstructor;
			}
			if (this.Type(C) !== 'Object') {
				throw new TypeError('O.constructor is not an Object');
			}
			var S = hasSymbols && Symbol.species ? C[Symbol.species] : undefined;
			if (S == null) {
				return defaultConstructor;
			}
			if (this.IsConstructor(S)) {
				return S;
			}
			throw new TypeError('no constructor found');
		}
	});

	delete ES6.CheckObjectCoercible; // renamed in ES6 to RequireObjectCoercible

	module.exports = ES6;


/***/ }),
/* 79 */
/***/ (function(module, exports) {

	module.exports = Number.isNaN || function isNaN(a) {
		return a !== a;
	};


/***/ }),
/* 80 */
/***/ (function(module, exports) {

	var $isNaN = Number.isNaN || function (a) { return a !== a; };

	module.exports = Number.isFinite || function (x) { return typeof x === 'number' && !$isNaN(x) && x !== Infinity && x !== -Infinity; };


/***/ }),
/* 81 */
/***/ (function(module, exports) {

	var has = Object.prototype.hasOwnProperty;
	module.exports = Object.assign || function assign(target, source) {
		for (var key in source) {
			if (has.call(source, key)) {
				target[key] = source[key];
			}
		}
		return target;
	};


/***/ }),
/* 82 */
/***/ (function(module, exports) {

	module.exports = function sign(number) {
		return number >= 0 ? 1 : -1;
	};


/***/ }),
/* 83 */
/***/ (function(module, exports) {

	module.exports = function mod(number, modulo) {
		var remain = number % modulo;
		return Math.floor(remain >= 0 ? remain : remain + modulo);
	};


/***/ }),
/* 84 */
/***/ (function(module, exports) {

	module.exports = function isPrimitive(value) {
		return value === null || (typeof value !== 'function' && typeof value !== 'object');
	};


/***/ }),
/* 85 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var hasSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol';

	var isPrimitive = __webpack_require__(86);
	var isCallable = __webpack_require__(87);
	var isDate = __webpack_require__(88);
	var isSymbol = __webpack_require__(89);

	var ordinaryToPrimitive = function OrdinaryToPrimitive(O, hint) {
		if (typeof O === 'undefined' || O === null) {
			throw new TypeError('Cannot call method on ' + O);
		}
		if (typeof hint !== 'string' || (hint !== 'number' && hint !== 'string')) {
			throw new TypeError('hint must be "string" or "number"');
		}
		var methodNames = hint === 'string' ? ['toString', 'valueOf'] : ['valueOf', 'toString'];
		var method, result, i;
		for (i = 0; i < methodNames.length; ++i) {
			method = O[methodNames[i]];
			if (isCallable(method)) {
				result = method.call(O);
				if (isPrimitive(result)) {
					return result;
				}
			}
		}
		throw new TypeError('No default value');
	};

	var GetMethod = function GetMethod(O, P) {
		var func = O[P];
		if (func !== null && typeof func !== 'undefined') {
			if (!isCallable(func)) {
				throw new TypeError(func + ' returned for property ' + P + ' of object ' + O + ' is not a function');
			}
			return func;
		}
	};

	// http://www.ecma-international.org/ecma-262/6.0/#sec-toprimitive
	module.exports = function ToPrimitive(input, PreferredType) {
		if (isPrimitive(input)) {
			return input;
		}
		var hint = 'default';
		if (arguments.length > 1) {
			if (PreferredType === String) {
				hint = 'string';
			} else if (PreferredType === Number) {
				hint = 'number';
			}
		}

		var exoticToPrim;
		if (hasSymbols) {
			if (Symbol.toPrimitive) {
				exoticToPrim = GetMethod(input, Symbol.toPrimitive);
			} else if (isSymbol(input)) {
				exoticToPrim = Symbol.prototype.valueOf;
			}
		}
		if (typeof exoticToPrim !== 'undefined') {
			var result = exoticToPrim.call(input, hint);
			if (isPrimitive(result)) {
				return result;
			}
			throw new TypeError('unable to convert exotic object to primitive');
		}
		if (hint === 'default' && (isDate(input) || isSymbol(input))) {
			hint = 'string';
		}
		return ordinaryToPrimitive(input, hint === 'default' ? 'number' : hint);
	};


/***/ }),
/* 86 */
/***/ (function(module, exports) {

	module.exports = function isPrimitive(value) {
		return value === null || (typeof value !== 'function' && typeof value !== 'object');
	};


/***/ }),
/* 87 */
/***/ (function(module, exports) {

	'use strict';

	var fnToStr = Function.prototype.toString;

	var constructorRegex = /^\s*class /;
	var isES6ClassFn = function isES6ClassFn(value) {
		try {
			var fnStr = fnToStr.call(value);
			var singleStripped = fnStr.replace(/\/\/.*\n/g, '');
			var multiStripped = singleStripped.replace(/\/\*[.\s\S]*\*\//g, '');
			var spaceStripped = multiStripped.replace(/\n/mg, ' ').replace(/ {2}/g, ' ');
			return constructorRegex.test(spaceStripped);
		} catch (e) {
			return false; // not a function
		}
	};

	var tryFunctionObject = function tryFunctionObject(value) {
		try {
			if (isES6ClassFn(value)) { return false; }
			fnToStr.call(value);
			return true;
		} catch (e) {
			return false;
		}
	};
	var toStr = Object.prototype.toString;
	var fnClass = '[object Function]';
	var genClass = '[object GeneratorFunction]';
	var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

	module.exports = function isCallable(value) {
		if (!value) { return false; }
		if (typeof value !== 'function' && typeof value !== 'object') { return false; }
		if (hasToStringTag) { return tryFunctionObject(value); }
		if (isES6ClassFn(value)) { return false; }
		var strClass = toStr.call(value);
		return strClass === fnClass || strClass === genClass;
	};


/***/ }),
/* 88 */
/***/ (function(module, exports) {

	'use strict';

	var getDay = Date.prototype.getDay;
	var tryDateObject = function tryDateObject(value) {
		try {
			getDay.call(value);
			return true;
		} catch (e) {
			return false;
		}
	};

	var toStr = Object.prototype.toString;
	var dateClass = '[object Date]';
	var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

	module.exports = function isDateObject(value) {
		if (typeof value !== 'object' || value === null) { return false; }
		return hasToStringTag ? tryDateObject(value) : toStr.call(value) === dateClass;
	};


/***/ }),
/* 89 */
/***/ (function(module, exports) {

	'use strict';

	var toStr = Object.prototype.toString;
	var hasSymbols = typeof Symbol === 'function' && typeof Symbol() === 'symbol';

	if (hasSymbols) {
		var symToStr = Symbol.prototype.toString;
		var symStringRegex = /^Symbol\(.*\)$/;
		var isSymbolObject = function isSymbolObject(value) {
			if (typeof value.valueOf() !== 'symbol') { return false; }
			return symStringRegex.test(symToStr.call(value));
		};
		module.exports = function isSymbol(value) {
			if (typeof value === 'symbol') { return true; }
			if (toStr.call(value) !== '[object Symbol]') { return false; }
			try {
				return isSymbolObject(value);
			} catch (e) {
				return false;
			}
		};
	} else {
		module.exports = function isSymbol(value) {
			// this environment does not support Symbols.
			return false;
		};
	}


/***/ }),
/* 90 */
/***/ (function(module, exports, __webpack_require__) {

	var implementation = __webpack_require__(91);

	module.exports = Function.prototype.bind || implementation;


/***/ }),
/* 91 */
/***/ (function(module, exports) {

	var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
	var slice = Array.prototype.slice;
	var toStr = Object.prototype.toString;
	var funcType = '[object Function]';

	module.exports = function bind(that) {
	    var target = this;
	    if (typeof target !== 'function' || toStr.call(target) !== funcType) {
	        throw new TypeError(ERROR_MESSAGE + target);
	    }
	    var args = slice.call(arguments, 1);

	    var bound;
	    var binder = function () {
	        if (this instanceof bound) {
	            var result = target.apply(
	                this,
	                args.concat(slice.call(arguments))
	            );
	            if (Object(result) === result) {
	                return result;
	            }
	            return this;
	        } else {
	            return target.apply(
	                that,
	                args.concat(slice.call(arguments))
	            );
	        }
	    };

	    var boundLength = Math.max(0, target.length - args.length);
	    var boundArgs = [];
	    for (var i = 0; i < boundLength; i++) {
	        boundArgs.push('$' + i);
	    }

	    bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

	    if (target.prototype) {
	        var Empty = function Empty() {};
	        Empty.prototype = target.prototype;
	        bound.prototype = new Empty();
	        Empty.prototype = null;
	    }

	    return bound;
	};


/***/ }),
/* 92 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var $isNaN = __webpack_require__(79);
	var $isFinite = __webpack_require__(80);

	var sign = __webpack_require__(82);
	var mod = __webpack_require__(83);

	var IsCallable = __webpack_require__(87);
	var toPrimitive = __webpack_require__(93);

	// https://es5.github.io/#x9
	var ES5 = {
		ToPrimitive: toPrimitive,

		ToBoolean: function ToBoolean(value) {
			return Boolean(value);
		},
		ToNumber: function ToNumber(value) {
			return Number(value);
		},
		ToInteger: function ToInteger(value) {
			var number = this.ToNumber(value);
			if ($isNaN(number)) { return 0; }
			if (number === 0 || !$isFinite(number)) { return number; }
			return sign(number) * Math.floor(Math.abs(number));
		},
		ToInt32: function ToInt32(x) {
			return this.ToNumber(x) >> 0;
		},
		ToUint32: function ToUint32(x) {
			return this.ToNumber(x) >>> 0;
		},
		ToUint16: function ToUint16(value) {
			var number = this.ToNumber(value);
			if ($isNaN(number) || number === 0 || !$isFinite(number)) { return 0; }
			var posInt = sign(number) * Math.floor(Math.abs(number));
			return mod(posInt, 0x10000);
		},
		ToString: function ToString(value) {
			return String(value);
		},
		ToObject: function ToObject(value) {
			this.CheckObjectCoercible(value);
			return Object(value);
		},
		CheckObjectCoercible: function CheckObjectCoercible(value, optMessage) {
			/* jshint eqnull:true */
			if (value == null) {
				throw new TypeError(optMessage || 'Cannot call method on ' + value);
			}
			return value;
		},
		IsCallable: IsCallable,
		SameValue: function SameValue(x, y) {
			if (x === y) { // 0 === -0, but they are not identical.
				if (x === 0) { return 1 / x === 1 / y; }
				return true;
			}
			return $isNaN(x) && $isNaN(y);
		},

		// http://www.ecma-international.org/ecma-262/5.1/#sec-8
		Type: function Type(x) {
			if (x === null) {
				return 'Null';
			}
			if (typeof x === 'undefined') {
				return 'Undefined';
			}
			if (typeof x === 'function' || typeof x === 'object') {
				return 'Object';
			}
			if (typeof x === 'number') {
				return 'Number';
			}
			if (typeof x === 'boolean') {
				return 'Boolean';
			}
			if (typeof x === 'string') {
				return 'String';
			}
		}
	};

	module.exports = ES5;


/***/ }),
/* 93 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var toStr = Object.prototype.toString;

	var isPrimitive = __webpack_require__(86);

	var isCallable = __webpack_require__(87);

	// https://es5.github.io/#x8.12
	var ES5internalSlots = {
		'[[DefaultValue]]': function (O, hint) {
			var actualHint = hint || (toStr.call(O) === '[object Date]' ? String : Number);

			if (actualHint === String || actualHint === Number) {
				var methods = actualHint === String ? ['toString', 'valueOf'] : ['valueOf', 'toString'];
				var value, i;
				for (i = 0; i < methods.length; ++i) {
					if (isCallable(O[methods[i]])) {
						value = O[methods[i]]();
						if (isPrimitive(value)) {
							return value;
						}
					}
				}
				throw new TypeError('No default value');
			}
			throw new TypeError('invalid [[DefaultValue]] hint supplied');
		}
	};

	// https://es5.github.io/#x9
	module.exports = function ToPrimitive(input, PreferredType) {
		if (isPrimitive(input)) {
			return input;
		}
		return ES5internalSlots['[[DefaultValue]]'](input, PreferredType);
	};


/***/ }),
/* 94 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var has = __webpack_require__(95);
	var regexExec = RegExp.prototype.exec;
	var gOPD = Object.getOwnPropertyDescriptor;

	var tryRegexExecCall = function tryRegexExec(value) {
		try {
			var lastIndex = value.lastIndex;
			value.lastIndex = 0;

			regexExec.call(value);
			return true;
		} catch (e) {
			return false;
		} finally {
			value.lastIndex = lastIndex;
		}
	};
	var toStr = Object.prototype.toString;
	var regexClass = '[object RegExp]';
	var hasToStringTag = typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol';

	module.exports = function isRegex(value) {
		if (!value || typeof value !== 'object') {
			return false;
		}
		if (!hasToStringTag) {
			return toStr.call(value) === regexClass;
		}

		var descriptor = gOPD(value, 'lastIndex');
		var hasLastIndexDataProperty = descriptor && has(descriptor, 'value');
		if (!hasLastIndexDataProperty) {
			return false;
		}

		return tryRegexExecCall(value);
	};


/***/ }),
/* 95 */
/***/ (function(module, exports, __webpack_require__) {

	var bind = __webpack_require__(90);

	module.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);


/***/ }),
/* 96 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var define = __webpack_require__(72);
	var getPolyfill = __webpack_require__(97);

	module.exports = function shimArrayPrototypeIncludes() {
		var polyfill = getPolyfill();
		if (Array.prototype.includes !== polyfill) {
			define(Array.prototype, { includes: polyfill });
		}
		return polyfill;
	};


/***/ }),
/* 97 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var implementation = __webpack_require__(98);

	module.exports = function getPolyfill() {
		return Array.prototype.includes || implementation;
	};


/***/ }),
/* 98 */
/***/ (function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var ES = __webpack_require__(78);
	var $isNaN = Number.isNaN || function (a) { return a !== a; };
	var $isFinite = Number.isFinite || function (n) { return typeof n === 'number' && global.isFinite(n); };
	var indexOf = Array.prototype.indexOf;

	module.exports = function includes(searchElement) {
		var fromIndex = arguments.length > 1 ? ES.ToInteger(arguments[1]) : 0;
		if (indexOf && !$isNaN(searchElement) && $isFinite(fromIndex) && typeof searchElement !== 'undefined') {
			return indexOf.apply(this, arguments) > -1;
		}

		var O = ES.ToObject(this);
		var length = ES.ToLength(O.length);
		if (length === 0) {
			return false;
		}
		var k = fromIndex >= 0 ? fromIndex : Math.max(0, length + fromIndex);
		while (k < length) {
			if (ES.SameValueZero(searchElement, O[k])) {
				return true;
			}
			k += 1;
		}
		return false;
	};

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ }),
/* 99 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.listenMessagesFromCreative = listenMessagesFromCreative;

	var _events = __webpack_require__(8);

	var _events2 = _interopRequireDefault(_events);

	var _constants = __webpack_require__(3);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	/* Secure Creatives
	  Provides support for rendering creatives into cross domain iframes such as SafeFrame to prevent
	   access to a publisher page from creative payloads.
	 */

	var BID_WON = _constants.EVENTS.BID_WON;

	function listenMessagesFromCreative() {
	  addEventListener('message', receiveMessage, false);
	}

	function receiveMessage(ev) {
	  var key = ev.message ? 'message' : 'data';
	  var data = {};
	  try {
	    data = JSON.parse(ev[key]);
	  } catch (e) {
	    return;
	  }

	  if (data.adId) {
	    var adObject = pbjs._bidsReceived.find((function (bid) {
	      return bid.adId === data.adId;
	    }));

	    if (data.message === 'Prebid Request') {
	      sendAdToCreative(adObject, data.adServerDomain, ev.source);
	      _events2['default'].emit(BID_WON, adObject);
	    }
	  }
	}

	function sendAdToCreative(adObject, remoteDomain, source) {
	  var adId = adObject.adId,
	      ad = adObject.ad,
	      adUrl = adObject.adUrl,
	      width = adObject.width,
	      height = adObject.height;


	  if (adId) {
	    resizeRemoteCreative(adObject);
	    source.postMessage(JSON.stringify({
	      message: 'Prebid Response',
	      ad: ad,
	      adUrl: adUrl,
	      adId: adId,
	      width: width,
	      height: height
	    }), remoteDomain);
	  }
	}

	function resizeRemoteCreative(_ref) {
	  var adUnitCode = _ref.adUnitCode,
	      width = _ref.width,
	      height = _ref.height;

	  var iframe = document.getElementById(window.googletag.pubads().getSlots().find((function (slot) {
	    return slot.getAdUnitPath() === adUnitCode || slot.getSlotElementId() === adUnitCode;
	  })).getSlotElementId()).querySelector('iframe');

	  iframe.width = '' + width;
	  iframe.height = '' + height;
	}

/***/ }),
/* 100 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _url = __webpack_require__(22);

	//Adserver parent class
	var AdServer = function AdServer(attr) {
	  this.name = attr.adserver;
	  this.code = attr.code;
	  this.getWinningBidByCode = function () {
	    var _this = this;

	    var bidObject = pbjs._bidsReceived.find((function (bid) {
	      return bid.adUnitCode === _this.code;
	    }));
	    return bidObject;
	  };
	};

	//DFP ad server
	exports.dfpAdserver = function (options, urlComponents) {
	  var adserver = new AdServer(options);
	  adserver.urlComponents = urlComponents;

	  var dfpReqParams = {
	    'env': 'vp',
	    'gdfp_req': '1',
	    'impl': 's',
	    'unviewed_position_start': '1'
	  };

	  var dfpParamsWithVariableValue = ['output', 'iu', 'sz', 'url', 'correlator', 'description_url', 'hl'];

	  var getCustomParams = function getCustomParams(targeting) {
	    return encodeURIComponent((0, _url.formatQS)(targeting));
	  };

	  adserver.appendQueryParams = function () {
	    var bid = adserver.getWinningBidByCode();
	    this.urlComponents.search.description_url = encodeURIComponent(bid.descriptionUrl);
	    this.urlComponents.search.cust_params = getCustomParams(bid.adserverTargeting);
	    this.urlComponents.search.correlator = Date.now();
	  };

	  adserver.verifyAdserverTag = function () {
	    for (var key in dfpReqParams) {
	      if (!this.urlComponents.search.hasOwnProperty(key) || this.urlComponents.search[key] !== dfpReqParams[key]) {
	        return false;
	      }
	    }
	    for (var i in dfpParamsWithVariableValue) {
	      if (!this.urlComponents.search.hasOwnProperty(dfpParamsWithVariableValue[i])) {
	        return false;
	      }
	    }
	    return true;
	  };

	  return adserver;
	};

/***/ }),
/* 101 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _utils = __webpack_require__(2);

	function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	var bidmanager = __webpack_require__(11);
	var utils = __webpack_require__(2);
	var CONSTANTS = __webpack_require__(3);

	var targeting = exports;
	var pbTargetingKeys = [];

	targeting.resetPresetTargeting = function () {
	  if ((0, _utils.isGptPubadsDefined)()) {
	    window.googletag.pubads().getSlots().forEach((function (slot) {
	      pbTargetingKeys.forEach((function (key) {
	        // reset only registered adunits
	        pbjs.adUnits.find((function (unit) {
	          if (unit.code === slot.getAdUnitPath() || unit.code === slot.getSlotElementId()) {
	            slot.setTargeting(key, null);
	          }
	        }));
	      }));
	    }));
	  }
	};

	targeting.getAllTargeting = function (adUnitCode) {
	  var adUnitCodes = adUnitCode && adUnitCode.length ? [adUnitCode] : pbjs._adUnitCodes;

	  // Get targeting for the winning bid. Add targeting for any bids that have
	  // `alwaysUseBid=true`. If sending all bids is enabled, add targeting for losing bids.
	  var targeting = getWinningBidTargeting(adUnitCodes).concat(getAlwaysUseBidTargeting(adUnitCodes)).concat(pbjs._sendAllBids ? getBidLandscapeTargeting(adUnitCodes) : []);

	  //store a reference of the targeting keys
	  targeting.map((function (adUnitCode) {
	    Object.keys(adUnitCode).map((function (key) {
	      adUnitCode[key].map((function (targetKey) {
	        if (pbTargetingKeys.indexOf(Object.keys(targetKey)[0]) === -1) {
	          pbTargetingKeys = Object.keys(targetKey).concat(pbTargetingKeys);
	        }
	      }));
	    }));
	  }));
	  return targeting;
	};

	targeting.setTargeting = function (targetingConfig) {
	  window.googletag.pubads().getSlots().forEach((function (slot) {
	    targetingConfig.filter((function (targeting) {
	      return Object.keys(targeting)[0] === slot.getAdUnitPath() || Object.keys(targeting)[0] === slot.getSlotElementId();
	    })).forEach((function (targeting) {
	      return targeting[Object.keys(targeting)[0]].forEach((function (key) {
	        key[Object.keys(key)[0]].map((function (value) {
	          utils.logMessage('Attempting to set key value for slot: ' + slot.getSlotElementId() + ' key: ' + Object.keys(key)[0] + ' value: ' + value);
	          return value;
	        })).forEach((function (value) {
	          slot.setTargeting(Object.keys(key)[0], value);
	        }));
	      }));
	    }));
	  }));
	};

	targeting.getWinningBids = function (adUnitCode) {
	  // use the given adUnitCode as a filter if present or all adUnitCodes if not
	  var adUnitCodes = adUnitCode ? [adUnitCode] : pbjs._adUnitCodes;

	  return pbjs._bidsReceived.filter((function (bid) {
	    return adUnitCodes.includes(bid.adUnitCode);
	  })).filter((function (bid) {
	    return bid.cpm > 0;
	  })).map((function (bid) {
	    return bid.adUnitCode;
	  })).filter(_utils.uniques).map((function (adUnitCode) {
	    return pbjs._bidsReceived.filter((function (bid) {
	      return bid.adUnitCode === adUnitCode ? bid : null;
	    })).reduce(_utils.getHighestCpm, {
	      adUnitCode: adUnitCode,
	      cpm: 0,
	      adserverTargeting: {},
	      timeToRespond: 0
	    });
	  }));
	};

	targeting.setTargetingForAst = function () {
	  var targeting = pbjs.getAdserverTargeting();
	  Object.keys(targeting).forEach((function (targetId) {
	    return Object.keys(targeting[targetId]).forEach((function (key) {
	      utils.logMessage('Attempting to set targeting for targetId: ' + targetId + ' key: ' + key + ' value: ' + targeting[targetId][key]);
	      //setKeywords supports string and array as value
	      if (utils.isStr(targeting[targetId][key]) || utils.isArray(targeting[targetId][key])) {
	        var keywordsObj = {};
	        var nKey = key === 'hb_adid' ? key.toUpperCase() : key;
	        keywordsObj[nKey] = targeting[targetId][key];
	        window.apntag.setKeywords(targetId, keywordsObj);
	      }
	    }));
	  }));
	};

	function getWinningBidTargeting() {
	  var winners = targeting.getWinningBids();
	  var standardKeys = getStandardKeys();

	  winners = winners.map((function (winner) {
	    return _defineProperty({}, winner.adUnitCode, Object.keys(winner.adserverTargeting).filter((function (key) {
	      return typeof winner.sendStandardTargeting === "undefined" || winner.sendStandardTargeting || standardKeys.indexOf(key) === -1;
	    })).map((function (key) {
	      return _defineProperty({}, key.substring(0, 20), [winner.adserverTargeting[key]]);
	    })));
	  }));

	  return winners;
	}

	function getStandardKeys() {
	  return bidmanager.getStandardBidderAdServerTargeting() // in case using a custom standard key set
	  .map((function (targeting) {
	    return targeting.key;
	  })).concat(CONSTANTS.TARGETING_KEYS).filter(_utils.uniques); // standard keys defined in the library.
	}

	/**
	 * Get custom targeting keys for bids that have `alwaysUseBid=true`.
	 */
	function getAlwaysUseBidTargeting(adUnitCodes) {
	  var standardKeys = getStandardKeys();
	  return pbjs._bidsReceived.filter(_utils.adUnitsFilter.bind(this, adUnitCodes)).map((function (bid) {
	    if (bid.alwaysUseBid) {
	      return _defineProperty({}, bid.adUnitCode, Object.keys(bid.adserverTargeting).map((function (key) {
	        // Get only the non-standard keys of the losing bids, since we
	        // don't want to override the standard keys of the winning bid.
	        if (standardKeys.indexOf(key) > -1) {
	          return;
	        }

	        return _defineProperty({}, key.substring(0, 20), [bid.adserverTargeting[key]]);
	      })).filter((function (key) {
	        return key;
	      })));
	    }
	  })).filter((function (bid) {
	    return bid;
	  })); // removes empty elements in array;
	}

	function getBidLandscapeTargeting(adUnitCodes) {
	  var standardKeys = CONSTANTS.TARGETING_KEYS;

	  return pbjs._bidsReceived.filter(_utils.adUnitsFilter.bind(this, adUnitCodes)).map((function (bid) {
	    if (bid.adserverTargeting) {
	      return _defineProperty({}, bid.adUnitCode, getTargetingMap(bid, standardKeys.filter((function (key) {
	        return typeof bid.adserverTargeting[key] !== 'undefined';
	      })) // mainly for possibly
	      // unset hb_deal
	      ));
	    }
	  })).filter((function (bid) {
	    return bid;
	  })); // removes empty elements in array
	}

	function getTargetingMap(bid, keys) {
	  return keys.map((function (key) {
	    return _defineProperty({}, (key + '_' + bid.bidderCode).substring(0, 20), [bid.adserverTargeting[key]]);
	  }));
	}

	targeting.isApntagDefined = function () {
	  if (window.apntag && utils.isFn(window.apntag.setKeywords)) {
	    return true;
	  }
	};

/***/ })
/******/ ]);