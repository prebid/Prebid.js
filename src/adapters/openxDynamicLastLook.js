var CONSTANTS = require('../constants.json');
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

/**
 * Adapter for requesting bids from OpenX.
 *
 * @param {Object} options - Configuration options for OpenX
 * @returns {{callBids: _callBids}}
 * @constructor
 */

var allPlacementCodes;

var OpenxDynamicLastLookAdapter = function OpenxDynamicLastLookAdapter(options) {

	function _callBids(params) {
		var openxBids = params.bids || [];
		// De-dupe by tagid then issue single bid request for all bids
		_requestBids(_getUniqueTagids(openxBids));
	}

	function _getUniqueTagids(bids) {
		var key;
		var map = {};
		var Tagids = [];
		bids.forEach(function(bid) {
			map[utils.getBidIdParamater('tagid', bid.params)] = bid;
		});
		for (key in map) {
			if (map.hasOwnProperty(key)) {
				Tagids.push(map[key]);
			}
		}
		return Tagids;
	}

	function _requestBids(bidReqs) {

		var pageUrl = window.location.href;

		var adUnitIds = [];
		var adUnitFloorPairs = [];
		allPlacementCodes = [];
		//build impression array for sovrn
		utils._each(bidReqs, function(bid)
		{
			var tagId = utils.getBidIdParamater('tagid', bid.params);
			var bidFloor = utils.getBidIdParamater('bidfloor', bid.params);

      if(bidFloor){
          adUnitFloorPairs.push(tagId+':'+Math.round(bidFloor*1000));
      }

			adUnitIds.push(tagId);
			bidmanager.pbCallbackMap[tagId] = bid;
			allPlacementCodes.push(bid.placementCode);
		});


    // var adUnitIds = [538229330,538229329,538230511,538228924];

// aumf=538229330%3A2500,538229329%3A2400,538230511%3A230,538228924%3A220

		var scriptUrl = '//underdogmedia-d.openx.net/w/1.0/arj?auid='+ encodeURI(adUnitIds.join(',')) +
		  '&url='  + encodeURIComponent(pageUrl) +
		  '&callback=window.'+CONSTANTS.PBJS_GLOBAL_VAR_NAME+'.openxDllResponse';

    if(adUnitFloorPairs.length > 0){
      scriptUrl += '&aumf=' + encodeURIComponent(adUnitFloorPairs.join(','));
    }

		adloader.loadScript(scriptUrl, null);
	}

	function addBlankBidResponsesForAllPlacementsExceptThese(placementsWithBidsBack){
		utils._each(allPlacementCodes, function(placementCode)
		{
			if(utils.contains(placementsWithBidsBack, placementCode)) {
				// A bid was returned for this placement already
			} else {
				// Add a no-bid response for this placement.
				var bid = {};
				bid = bidfactory.createBid(2);
				bid.bidderCode = 'openx_dll';
				bidmanager.addBidResponse(placementCode, bid);
			}
		});
	}

	//expose the callback to the global object:
	window[CONSTANTS.PBJS_GLOBAL_VAR_NAME].openxDllResponse = function(openxResponseObj) {

    if (openxResponseObj && openxResponseObj.ads && openxResponseObj.ads.pixels){
      //openx wants us to render their pixels all the time, not just when rendering ads...
      var iframe = document.createElement('iframe');
      iframe.src = openxResponseObj.ads.pixels;
      iframe.width=0;
      iframe.height=0;
      iframe.hidden=true;
      document.body.appendChild(iframe);
    }

		if (openxResponseObj && openxResponseObj.ads && openxResponseObj.ads.ad && (openxResponseObj.ads.ad.length > 0) ) {
      var placementsWithBidsBack = [];
      openxResponseObj.ads.ad.forEach(function(openxBid){

        var placementCode = '';
        var id = openxBid.adunitid;
        var bid = {};



        // try to fetch the bid request we sent openx
        var bidObj = bidmanager.getPlacementIdByCBIdentifer(id); // not actually placement id
        if (bidObj){


          placementCode = bidObj.placementCode;
          placementsWithBidsBack.push(placementCode);
          bidObj.status = CONSTANTS.STATUS.GOOD;

          //place ad response on bidmanager._adResponsesByBidderId
          var responseCPM = parseFloat(openxBid.pub_rev)/1000;

          if(responseCPM > 0) {
//             sovrnBid.placementCode = placementCode;
//             sovrnBid.size = bidObj.sizes;

            //store bid response
            //bid status is good (indicating 1)
            bid = bidfactory.createBid(1);
            bid.creative_id = openxBid.adid;
            bid.bidderCode = 'openx_dll';
            bid.cpm = responseCPM;

            bid.ad = openxBid.html;
            bid.width  = parseInt(openxBid.creative[0].width,10);
            bid.height = parseInt(openxBid.creative[0].height,10);

            bidmanager.addBidResponse(placementCode, bid);

          } else {
            //0 price bid
            //indicate that there is no bid for this placement
            bid = bidfactory.createBid(2);
            bid.bidderCode = 'openx_dll';
            bidmanager.addBidResponse(placementCode, bid);

          }
        } else {	 // bid not found, we never asked for this?
          //no response data
          bid = bidfactory.createBid(2);
          bid.bidderCode = 'openx_dll';
          bidmanager.addBidResponse(placementCode, bid);
        }
      });
      addBlankBidResponsesForAllPlacementsExceptThese(placementsWithBidsBack);
		} else {
			//no response data for any placements
			addBlankBidResponsesForAllPlacementsExceptThese([]);
		}


  };

	return {
		callBids: _callBids
	};
};

module.exports = OpenxDynamicLastLookAdapter;
