var bidmanager = require('../bidmanager.js');
var bidfactory = require('../bidfactory.js');
var utils = require('../utils.js');
var CONSTANTS = require('../constants.json');

import {ajax as ajax} from '../ajax';

function track(debug, p1, p2, p3) {
	if (debug === true) {
		utils.logMessage('GA: %s %s %s', p1, p2, p3 || '');
	}
}

var w = (typeof window !== "undefined" ? window : {});
w.trackR1Impression = track;

module.exports = function (bidManager, global, loader) {

	var version = "0.1",
		bidfloor = 0.02,
		currency = "USD",
		debug = false,
		auctionEnded = false,
		requestCompleted = false,
		placementCodes = {};

	if (typeof global === "undefined") {
		global = window;
	}
	if (typeof bidManager === "undefined") {
		bidManager = bidmanager;
	}

	if (typeof loader === "undefined") {
		loader = ajax;
	}
	function applyMacros(txt, values) {
		return txt.replace(/\{([^\}]+)\}/g, function (match) {
			var v = values[match.replace(/[\{\}]/g, "").toLowerCase()];
			if (typeof v !== "undefined") {
				return v;
			}
			return match;
		});
	}

	function load(bidParams, url, postData, callback) {
		loader(url, function (responseText, response) {
			if (response.status === 200) {
				callback(200, "success", response.responseText);
			} else {
				callback(-1, "http error " + response.status, response.responseText);
			}
		}, postData, {method: "POST", contentType: "application/json", withCredentials: true});
	}

	var bidderCode = "q1connect";
	var bidLostTimeout = null;

	function findAndFillParam(o, key, value) {
		try {
			if (typeof value === "function") {
				o[key] = value();
			} else {
				o[key] = value;
			}
		} catch (ex) {
		}
	}

	function logToConsole(txt) {
		if (debug) {
			utils.logMessage(txt);
		}
	}

	function sniffAuctionEnd() {

		global.$$PREBID_GLOBAL$$.onEvent('bidWon', function (e) {

			if (e.bidderCode === bidderCode) {
				placementCodes[e.adUnitCode] = true;
				track(debug, 'hb', "bidWon");
			}

			if (auctionEnded) {
				clearTimeout(bidLostTimeout);
				bidLostTimeout = setTimeout(function () {
					for (var k in placementCodes) {
						if (placementCodes[k] === false) {
							track(debug, 'hb', "bidLost");
						}
					}
				}, 50);
			}
		});

		global.$$PREBID_GLOBAL$$.onEvent('auctionEnd', function () {

			auctionEnded = true;

			if (requestCompleted === false) {
				track(debug, 'hb', 'q1ReplyFail', "prebid timeout post auction");
			}
		});
	}

	function getBidParameters(bids) {
		for (var i = 0; i < bids.length; i++)
		{
			if (typeof bids[i].params === "object" && bids[i].params.publisher && bids[i].params.host)
			{
				return bids[i].params;
			}
		}
		return null;
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

	function getRtbEndpoint(bidParams) {
		var endpoint = "//{host}/xp/get?pubid={publisher}";

		if (bidParams.debug === true)
		{
			debug = true;
		}
		endpoint = applyMacros(endpoint, {
			publisher: bidParams.publisher,
			host: bidParams.host
		});
		return endpoint;
	}

	function getBidRequestJson(bids, slotMap, bidParams) {
		var o = {
			"device": {
				"langauge": (global.navigator.language).split('-')[0],
				"dnt": (global.navigator.doNotTrack === 1 ? 1 : 0)
			},
			"at": 2,
			"site": {},
			"tmax": 3000,
			"cur": [currency],
			"id": utils.generateUUID(),
			"imp": []
		};

		var secure;
		if (window.location.protocol !== 'http:') {
			secure = 1;
		} else {
			secure = 0;
		}

		findAndFillParam(o.site, "page", function () {
			var l;
			try {
				l = global.top.document.location.href.toString();
			}
			catch (ex) {
				l = document.location.href.toString();
			}
			return l;
		});
		findAndFillParam(o.site, "domain", function () {
			var d = document.location.ancestorOrigins;
			if (d && d.length > 0)
			{
				return d[d.length - 1];
			}
			return global.top.document.location.hostname;
		});

		//   findAndFillParam(o.site, "domain", "advangelists.com");
		//   findAndFillParam(o.site, "page", "http://demand.advangelists.com/home");

		findAndFillParam(o.site, "name", function () {
			return global.top.document.title;
		});

		o.device.devicetype =
			((/(ios|ipod|ipad|iphone|android)/i).test(global.navigator.userAgent) ? 1 :
				((/(smart[-]?tv|hbbtv|appletv|googletv|hdmi|netcast\.tv|viera|nettv|roku|\bdtv\b|sonydtv|inettvbrowser|\btv\b)/i).test(global.navigator.userAgent) ? 3 : 2));

		findAndFillParam(o.device, "h", function () {
			return global.screen.height;
		});
		findAndFillParam(o.device, "w", function () {
			return global.screen.width;
		});

		for (var i = 0; i < bids.length; i++) {
			var bidID = utils.generateUUID();
			slotMap[bidID] = bids[i];
			slotMap[bids[i].placementCode] = bids[i];

			if (bidParams.method === "post")
			{
				track(debug, 'hb', 'bidRequest');
			}
			for (var j = 0; j < bids[i].sizes.length; j++) {
				o.imp.push({
					"id": bidID,
					"tagId": bids[i].placementCode,
					//   "bidfloor": bidfloor,
					"bidfloorcur": currency,
					"secure": secure,
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

		debug = (bidParams !== null && bidParams.debug === true);

		auctionEnded = false;
		requestCompleted = false;

		track(debug, 'hb', 'callBids');

		if (bidParams === null) {
			noBids(params);
			track(debug, 'hb', 'misconfiguration');
			return;
		}

		// default to GET request
		if (typeof bidParams.method !== "string")
		{
			bidParams.method = "get";
		}
		bidParams.method = bidParams.method.toLowerCase();

		sniffAuctionEnd();

		track(debug, 'hb', 'q1Request');

		var bidRequestJson = getBidRequestJson(params.bids, slotMap, bidParams);

		load(bidParams, getRtbEndpoint(bidParams), JSON.stringify(bidRequestJson), function (code, msg, txt) {

			if (auctionEnded === true)
			{
				return;
			}
			requestCompleted = true;

			logToConsole(txt);

			if (code === -1)
			{
				track(debug, 'hb', 'q1ReplyFail', msg);
			} else {
				try {
					var result = JSON.parse(txt),
						registerBid = function (bid) {

							slotMap[bid.impid].success = 1;

							var pbResponse = bidfactory.createBid(CONSTANTS.STATUS.GOOD, bid),
								placementCode = slotMap[bid.impid].placementCode;

							placementCodes[placementCode] = false;

							pbResponse.creativeId = bid.crid;
							pbResponse.bidderCode = bidderCode;
							pbResponse.cpm = parseFloat(bid.price);
							pbResponse.width = bid.w;
							pbResponse.height = bid.h;
							pbResponse.ad = bid.adm;
							if (bid.dealid) {
								pbResponse.dealId = bid.dealid;
							}
							if (bid.adid) {
								pbResponse.adId = bid.adid;
							}

							logToConsole("registering bid " + placementCode + " " + JSON.stringify(pbResponse));


							track(debug, 'hb', 'bidResponse', 1);
							bidManager.addBidResponse(placementCode, pbResponse);
						};


					track(debug, 'hb', 'q1ReplySuccess');


					for (var i = 0; result.seatbid && i < result.seatbid.length; i++)
					{
						for (var j = 0; result.seatbid[i].bid && j < result.seatbid[i].bid.length; j++)
						{
							registerBid(result.seatbid[i].bid[j]);
						}
					}
					return;
				}
				catch (ex) {
					track(debug, 'hb', 'q1ReplyFail', 'invalid json in rmp response');
				}
			}

			// if no bids are successful, inform prebid
			noBids(params);

			// when all bids are complete, log a report
			track(debug, 'hb', 'bidsComplete');
		});

		logToConsole("version: " + version);
	};
};