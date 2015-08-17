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

		//3. let us know when all bids are in (need to check if they are all here first)
		//bidsAreAllIn(bidderCode);

	};

	return {
		callBids: callBids

	};
	//end of Rubicon bid adaptor
};

module.exports = RubiconAdapter;