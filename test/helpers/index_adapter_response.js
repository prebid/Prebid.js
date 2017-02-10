var OPEN_MARKET = 'IOM';
var PRIVATE_MARKET = 'IPM';

function cygnus_index_parse_res( response ) {
	try {
		if (response) {
			if (typeof _IndexRequestData !== "object" || typeof _IndexRequestData.impIDToSlotID !== "object" || typeof _IndexRequestData.impIDToSlotID[response.id] === "undefined") {
				return;
			}
			var targetMode = 1;
			var callbackFn;
			if (typeof _IndexRequestData.reqOptions === 'object' && typeof _IndexRequestData.reqOptions[response.id] === 'object') {
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
			var allBids = [];
			var seatbidLength = typeof response.seatbid === "undefined" ? 0 : response.seatbid.length;
			for (var i = 0; i < seatbidLength; i++) {
				for (var j = 0; j < response.seatbid[i].bid.length; j++) {
					var bid = response.seatbid[i].bid[j];
					if (typeof bid.ext !== "object" || typeof bid.ext.pricelevel !== "string") {
						continue;
					}
					if (typeof _IndexRequestData.impIDToSlotID[response.id][bid.impid] === "undefined") {
						continue;
					}
					var slotID = _IndexRequestData.impIDToSlotID[response.id][bid.impid];
					if (typeof index_slots === "undefined") {
						index_slots = [];
					}
					if (typeof _IndexRequestData.targetIDToBid === "undefined") {
						_IndexRequestData.targetIDToBid = {};
					}
                                        if (typeof _IndexRequestData.targetIDToResp === "undefined") {
                                                _IndexRequestData.targetIDToResp = {};
                                        }
					var targetID;
					var targetPrefix;
					if (typeof bid.ext.dealid === "string") {
						if (targetMode === 1) {
							targetID = slotID + bid.ext.pricelevel;
						} else {
							targetID = slotID + "_" + bid.ext.dealid;
						}
						targetPrefix = PRIVATE_MARKET + '_';
					} else {
						targetID = slotID + bid.ext.pricelevel;
						targetPrefix = OPEN_MARKET + '_';
					}
					index_slots.push(targetPrefix + targetID);
					if (_IndexRequestData.targetIDToBid[targetID] === undefined) {
						_IndexRequestData.targetIDToBid[targetID] = [bid.adm];
					} else {
						_IndexRequestData.targetIDToBid[targetID].push(bid.adm);
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
	} catch (e) {  }
	if (typeof index_slots === "undefined") {
		index_slots = [];
	}

	if (typeof window.cygnus_index_ready_state === 'function') {
		window.cygnus_index_ready_state();
	}
}

exports.cygnus_index_parse_res = cygnus_index_parse_res;
