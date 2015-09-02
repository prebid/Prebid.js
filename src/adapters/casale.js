//Factory for creating the bidderAdaptor
var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var ADAPTER_NAME = 'CASALE';
var ADAPTER_CODE = 'casale';

var CasaleAdapter = function CasaleAdapter() {
	var slotIdMap = {};
	var requiredParams = [
		/* 0 */
		'slotId',
		/* 1 */
		'casaleUrl'
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
				var casaleObj = iframeObj.contentWindow._IndexRequestData.targetIDToBid;
				var lookupObj = iframeObj.contentWindow.cygnus_index_args;

				if (utils.isEmpty(casaleObj)) {
					//no bid response
					var bid = bidfactory.createBid(2);
					bid.bidderCode = ADAPTER_CODE;
					logErrorBidResponse();
					return;
				}

				utils._each(casaleObj, function(adContents, cpmAndSlotId) {

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
				utils.logError('Error calling casale adapter', ADAPTER_NAME, e);
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

module.exports = CasaleAdapter;