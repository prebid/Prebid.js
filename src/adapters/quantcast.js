var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');

var QuantcastAdapter = function QuantcastAdapter() {

	const BIDDER_CODE = 'qcx';
	const BIDDER_CONFIG = 'hb_pb';
	const QC_CALLBACK_URL = 'http://qcx.quantcast.com?';
	
	
	function buildServerCall(bid, callbackId) {
	
		const placementId = utils.getBidIdParameter('placementId', bid.params);
		let request = {};
		request.site = window.location.href && encodeURIComponent(window.location.href);
		request.id = utils.getBidIdParameter('placementId', bid.params);
		
		let qcxCall = this.QC_CALLBACK_URL;
		
		
		
	}
	
	//expose the callback to the global object:
	$$PREBID_GLOBAL$$.handleXhbCB = function (qcResponse) {
		let bidCode;
		
		var bidRequest  = utils.getBidRequest(id);
		

		if(qcResponse && qcResponse.biddercode == this.BIDDER_CODE) {
			
		} else {
			var bidResponse = bidfactory.createBid(2, bidRequest);
		}
		bidmanager.addBidResponse(placementCode, bid);
		
	};

    function _callBids(params){
    	let bids = params.bids || [];
    	let currentURL = window.location.href && encodeURIComponent(window.location.href);
    	if (bids.length === 0) {
			return;
		}
		for (let i = 0; i < bids.length; i++) {
			let bid = bids[i];
			let callbackId = bid.bidId;
			adloader.loadScript(buildServerCall(bid, callbackId));
		}
    }
    

    // Export the `callBids` function, so that Prebid.js can execute
    // this function when the page asks to send out bid requests.
    return {
        callBids: _callBids
    };
};

module.exports = QuantcastAdapter;

