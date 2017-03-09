const bidfactory = require('../bidfactory.js');
const bidmanager = require('../bidmanager.js');
const adloader = require('../adloader.js');
const ajax = require('../ajax.js');

var QCXAdapter = function QCXAdapter() {

	const BIDDER_CODE 			= 'qcx';
	const BIDDER_CONFIG 		= 'hb_pb';
	const QCX_CALLBACK_URL 		= 'http://qcx.quantcast.com?';
	const DEFAULT_BID_FLOOR 	= 0.0000000001;
	
	
	function buildServerCall(bid, callbackId) {
	
		const placementId = utils.getBidIdParameter('placementId', bid.params);
		let request = {};
		request.site = window.location.href && encodeURIComponent(window.location.href);
		request.id = utils.getBidIdParameter('placementId', bid.params);
		
		let qcxCall = this.QCX_CALLBACK_URL;
		
		
		
	}
	
	//expose the callback to the global object:
	$$PREBID_GLOBAL$$.handleQcxCB = function (qcResponse) {
		let bidCode;
		
		var bidRequest  = utils.getBidRequest(id);
		
		if(typeof(response) === 'undefined' || !response.hasOwnProperty('bids') || utils.isEmpty(response.bids)) {
			var bidsRequested = $$PREBID_GLOBAL$$._bidsRequested.find(bidSet => bidSet.bidderCode === BIDDER_CODE).bids;
			if (bidsRequested.length > 0) {
				let bid = bidfactory.createBid(2);
				bid.bidderCode = BIDDER_CODE;
				bidmanager.addBidResponse(bidsRequested[0].placementCode, bid);
			}
			
			return;
		}
		
		for(let i = 0; i < response.bids.length; i++) {
			let seatbid = response.bids[i];
			var bidRequest = utils.getBidRequest(seatbidBid.impid);
			let bid = utils.extend(bidfactory.createBid(1), seatbidBid);
			bidmanager.addBidResponse(bidRequest.placementCode, bid);
		}
		
	};

    function _callBids(params){
    	let bids 		= params.bids || [];
    	let referrer 	= utils.getTopWindowUrl();
    	let loc 		= utils.getTopWindowLocation();
    	let domain      = loc.hostname;
    	let publisherId   = 0;
    	let bidRequests = {};
    	
    	let currentURL 	= window.location.href && encodeURIComponent(window.location.href);
    	if (bids.length === 0) {
			return;
		}
		publisherId = '' + bids[0].params.publisherId;
		utils._each(bids, function(bid) {
			// make sure the "sizes" are an array of arrays
			if (!(bid.sizes[0] instanceof Array)) {
				bid.sizes = [bid.sizes];
			}
			utils._each(bid.sizes, function(size) {
				let key = size[0] + 'x' + size[1];
				bidRequests[key] = bidRequests[key] || {
				  'publisherId' : publisherId,
				  'id'			: params.requestId,
				  'site'		: {
						'page' 		: loc,
						'referrer' 	: referrer,
						'domain'	: domain,
				  },
				  'imp' 		: [{
	  
						'banner'	: { 
							'battr' : [],
							'w'		: size[0],
							'h'		: size[1],
						},
						'id' 		: bidId,
						'bidfloor'	: bid.params.bidFloor || DEFAULT_BID_FLOOR,
						'secure'	: 0 + (loc.protocol === 'https')
				  }]
				};
			};
			
			utils._each(bidRequests, function (bidRequest) {
				adloader.loadScript(
					utils.tryAppendQueryString(
						utils.tryAppendQueryString(QCX_CALLBACK_URL, 'callback', '$$PREBID_GLOBAL$$.handleQcxCB'),
						'request', JSON.stringify(bidRequest)
					)
				);
			});
		});		
    }
    

    // Export the `callBids` function, so that Prebid.js can execute
    // this function when the page asks to send out bid requests.
    return {
        callBids: _callBids
    };
};

module.exports = QCXAdapter;

