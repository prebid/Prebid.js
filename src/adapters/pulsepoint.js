var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader.js');

var PulsePointAdapter = function PulsePointAdapter() {

	var getJsStaticUrl = 'http://projects.contextweb.com/av/prebid/getjs.static.js';
	var bidUrl = 'http://projects.contextweb.com/av/prebid/bid';
	
    function _callBids(params) {
    	var me = this;
    	if(typeof window.pp === 'undefined') {
			adloader.loadScript(getJsStaticUrl, function() { bid(params); });
		} else {
			me.bid(params);
		}
    }
    
    function bid(params) {
		var bids = params.bids;
		var me = this;
		for (var i = 0; i < bids.length; i++) {
			var bid = bids[i];
			var ppBidRequest = new window.pp.Ad({
				cf : bid.params.cf,
	            cp : bid.params.cp,
	            ct : bid.params.ct,
	            cn : 1,
	            ca : window.pp.requestActions.BID,
	            cu : bidUrl,
	            adUnitId: bid.placementCode,
	            /* jshint ignore:start */
	            callBack: function(bidResponse) { 
	            	bidResponseAvailable(bid, bidResponse); 
	            }
	            /* jshint ignore:end */
			});
			ppBidRequest.display();
		}
	}

	function bidResponseAvailable(bidRequest, bidResponse) {
		if(bidResponse) {
			var adSize = bidRequest.params.cf.split('X');
			var bid = bidfactory.createBid(1);
			bid.bidderCode = bidRequest.bidder;
			bid.cpm = bidResponse.bidCpm;
			bid.ad = bidResponse.html;
			bid.width = adSize[0];
			bid.height = adSize[1];
			bidmanager.addBidResponse(bidRequest.placementCode, bid);
		}
	}

	return {
        callBids: _callBids
    };

};

module.exports = PulsePointAdapter;