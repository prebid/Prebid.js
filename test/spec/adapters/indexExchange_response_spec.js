import Adapter from '../../../src/adapters/indexExchange';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

var assert           = require('chai').assert;
var IndexUtils       = require('../../helpers/index_adapter_utils.js');
var IndexResponse    = require('../../helpers/index_adapter_response.js');
var HeaderTagRequest = '/cygnus';
var SlotThreshold    = 20;
var ADAPTER_CODE     = 'indexExchange';
var DefaultValue     = {
	dealID    : 'IXDeal'
};
window.pbjs = window.pbjs || {};
var ResponseStatus = {
	noBid: "Bid returned empty or error response"
};

describe('indexExchange adapter - Response', function () {
	let adapter;
	let sandbox;

	beforeEach( function() {
		window._IndexRequestData = {};
		_IndexRequestData.impIDToSlotID = {};
		_IndexRequestData.reqOptions = {};
		_IndexRequestData.targetIDToResp = {};
		window.cygnus_index_args = {};

		adapter = new Adapter();
		sandbox = sinon.sandbox.create();
		sandbox.stub(bidManager, 'addBidResponse');
		sandbox.stub(adLoader, 'loadScript');
	});

	afterEach( function() {
		sandbox.restore();
	});

	it('test_prebid_indexAdapter_response_deal_1_1: response for single slot with single size contains alpha deal -> bid fetched into prebid', function () {
		var configuredBids = IndexUtils.createBidSlots(1, 1);
		adapter.callBids({ bids: configuredBids });

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		var optionalResponseParam = [
			[
				{ ext: { dealid: 'ixDeal' } } // first slot first size
			]
		];
		var asResponse = IndexUtils.getBidResponse( configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam );
		IndexResponse.cygnus_index_parse_res( asResponse );

		var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse( configuredBids, asResponse );

		var adapterResponse = {};

		for ( var i = 0; i < bidManager.addBidResponse.callCount; i++ ) {
			var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
			var bid        = bidManager.addBidResponse.getCall(i).args[1];

			if ( typeof adapterResponse[adUnitCode] === 'undefined'){
				adapterResponse[adUnitCode] = [];
			};
			adapterResponse[adUnitCode].push(bid);
		}

		var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
		for ( var i = 0; i < prebidResponsePair.matched.length; i++) {
			var pair = prebidResponsePair.matched[i];

			assert.equal(pair.prebid[i].siteID,     pair.expected[i].siteID,     "adapter response for " + pair.placementCode + " siteID is set to "+pair.expected[i].siteID);
			assert.equal(pair.prebid[i].bidderCode, pair.expected[i].bidderCode, "adapter response for " + pair.placementCode + " bidderCode is set to "+pair.expected[i].bidderCode);
			assert.equal(pair.prebid[i].width,      pair.expected[i].width,      "adapter response for " + pair.placementCode + " width is set to "+pair.expected[i].width);
			assert.equal(pair.prebid[i].height,     pair.expected[i].height,     "adapter response for " + pair.placementCode + " height is set to "+pair.expected[i].height);
			assert.equal(pair.prebid[i].ad,         pair.expected[i].ad,         "adapter response for " + pair.placementCode + " ad is set to "+pair.expected[i].ad);
			assert.equal(pair.prebid[i].cpm,        pair.expected[i].cpm,        "adapter response for " + pair.placementCode + " cpm is set to "+pair.expected[i].cpm);
			assert.equal(pair.prebid[i].dealId,     pair.expected[i].dealId,     "adapter response for " + pair.placementCode + " deaiid is set to "+pair.expected[i].dealId);
		}

		assert.equal( prebidResponsePair.unmatched.expected.length, 0, "All AS bid response translated to Adapter response for prebid");
		assert.equal( prebidResponsePair.unmatched.prebid.length,   0, "All Adapter response for prebid is from AS bid");
	});

	it('test_prebid_indexAdapter_response_deal_1_2: response for single slot with single size contains numeric deal -> bid fetched into prebid', function () {
		var configuredBids = IndexUtils.createBidSlots(1, 1);
		adapter.callBids({ bids: configuredBids });

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		var optionalResponseParam = [
			[
				{ ext: { dealid: '239' } } // first slot first size
			]
		];
		var asResponse = IndexUtils.getBidResponse( configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam );
		IndexResponse.cygnus_index_parse_res( asResponse );
		var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse( configuredBids, asResponse );

		var adapterResponse = {};

		for ( var i = 0; i < bidManager.addBidResponse.callCount; i++ ) {
			var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
			var bid        = bidManager.addBidResponse.getCall(i).args[1];

			if ( typeof adapterResponse[adUnitCode] === 'undefined'){
				adapterResponse[adUnitCode] = [];
			};
			adapterResponse[adUnitCode].push(bid);
		}

		var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
		
		for ( var i = 0; i < prebidResponsePair.matched.length; i++) {
			var pair = prebidResponsePair.matched[i];

			assert.equal(pair.prebid[i].siteID,     pair.expected[i].siteID,     "adapter response for " + pair.placementCode + " siteID is set to "+pair.expected[i].siteID);
			assert.equal(pair.prebid[i].bidderCode, pair.expected[i].bidderCode, "adapter response for " + pair.placementCode + " bidderCode is set to "+pair.expected[i].bidderCode);
			assert.equal(pair.prebid[i].width,      pair.expected[i].width,      "adapter response for " + pair.placementCode + " width is set to "+pair.expected[i].width);
			assert.equal(pair.prebid[i].height,     pair.expected[i].height,     "adapter response for " + pair.placementCode + " height is set to "+pair.expected[i].height);
			assert.equal(pair.prebid[i].ad,         pair.expected[i].ad,         "adapter response for " + pair.placementCode + " ad is set to "+pair.expected[i].ad);
			assert.equal(pair.prebid[i].cpm,        pair.expected[i].cpm,        "adapter response for " + pair.placementCode + " cpm is set to "+pair.expected[i].cpm);
			assert.equal(pair.prebid[i].dealId,     pair.expected[i].dealId,     "adapter response for " + pair.placementCode + " deaiid is set to "+pair.expected[i].dealId);
		}

		assert.equal( prebidResponsePair.unmatched.expected.length, 0, "All AS bid response translated to Adapter response for prebid");
		assert.equal( prebidResponsePair.unmatched.prebid.length,   0, "All Adapter response for prebid is from AS bid");
	});


	it('test_prebid_indexAdapter_response_deal_1_3: response for single slot with single size contains alpha-numeric deal starting with numeric -> bid fetched into prebid', function () {
		var configuredBids = IndexUtils.createBidSlots(1, 1);
		adapter.callBids({ bids: configuredBids });

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		var optionalResponseParam = [
			[
				{ ext: { dealid: '1234Deal' } } // first slot first size
			]
		];
		var asResponse = IndexUtils.getBidResponse( configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam );
		IndexResponse.cygnus_index_parse_res( asResponse );
		var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse( configuredBids, asResponse );

		var adapterResponse = {};

		for ( var i = 0; i < bidManager.addBidResponse.callCount; i++ ) {
			var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
			var bid        = bidManager.addBidResponse.getCall(i).args[1];

			if ( typeof adapterResponse[adUnitCode] === 'undefined'){
				adapterResponse[adUnitCode] = [];
			};
			adapterResponse[adUnitCode].push(bid);
		}

		var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
		
		for ( var i = 0; i < prebidResponsePair.matched.length; i++) {
			var pair = prebidResponsePair.matched[i];

			assert.equal(pair.prebid[i].siteID,     pair.expected[i].siteID,     "adapter response for " + pair.placementCode + " siteID is set to "+pair.expected[i].siteID);
			assert.equal(pair.prebid[i].bidderCode, pair.expected[i].bidderCode, "adapter response for " + pair.placementCode + " bidderCode is set to "+pair.expected[i].bidderCode);
			assert.equal(pair.prebid[i].width,      pair.expected[i].width,      "adapter response for " + pair.placementCode + " width is set to "+pair.expected[i].width);
			assert.equal(pair.prebid[i].height,     pair.expected[i].height,     "adapter response for " + pair.placementCode + " height is set to "+pair.expected[i].height);
			assert.equal(pair.prebid[i].ad,         pair.expected[i].ad,         "adapter response for " + pair.placementCode + " ad is set to "+pair.expected[i].ad);
			assert.equal(pair.prebid[i].cpm,        pair.expected[i].cpm,        "adapter response for " + pair.placementCode + " cpm is set to "+pair.expected[i].cpm);
			assert.equal(pair.prebid[i].dealId,     pair.expected[i].dealId,     "adapter response for " + pair.placementCode + " deaiid is set to "+pair.expected[i].dealId);
		}

		assert.equal( prebidResponsePair.unmatched.expected.length, 0, "All AS bid response translated to Adapter response for prebid");
		assert.equal( prebidResponsePair.unmatched.prebid.length,   0, "All Adapter response for prebid is from AS bid");
	});

	it('test_prebid_indexAdapter_response_deal_1_4: response for single slot with single size contains alpha-numeric deal starting with non-numeric -> bid fetched into prebid ', function () {
		var configuredBids = IndexUtils.createBidSlots(1, 1);
		adapter.callBids({ bids: configuredBids });

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		var optionalResponseParam = [
			[
				{ ext: { dealid: 'deal1234' } } // first slot first size
			]
		];
		var asResponse = IndexUtils.getBidResponse( configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam ); // Alpha numeric starting with non-numeric
		IndexResponse.cygnus_index_parse_res( asResponse );
		var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse( configuredBids, asResponse );

		var adapterResponse = {};

		for ( var i = 0; i < bidManager.addBidResponse.callCount; i++ ) {
			var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
			var bid        = bidManager.addBidResponse.getCall(i).args[1];

			if ( typeof adapterResponse[adUnitCode] === 'undefined'){
				adapterResponse[adUnitCode] = [];
			};
			adapterResponse[adUnitCode].push(bid);
		}

		var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
		
		for ( var i = 0; i < prebidResponsePair.matched.length; i++) {
			var pair = prebidResponsePair.matched[i];

			assert.equal(pair.prebid[i].siteID,     pair.expected[i].siteID,     "adapter response for " + pair.placementCode + " siteID is set to "+pair.expected[i].siteID);
			assert.equal(pair.prebid[i].bidderCode, pair.expected[i].bidderCode, "adapter response for " + pair.placementCode + " bidderCode is set to "+pair.expected[i].bidderCode);
			assert.equal(pair.prebid[i].width,      pair.expected[i].width,      "adapter response for " + pair.placementCode + " width is set to "+pair.expected[i].width);
			assert.equal(pair.prebid[i].height,     pair.expected[i].height,     "adapter response for " + pair.placementCode + " height is set to "+pair.expected[i].height);
			assert.equal(pair.prebid[i].ad,         pair.expected[i].ad,         "adapter response for " + pair.placementCode + " ad is set to "+pair.expected[i].ad);
			assert.equal(pair.prebid[i].cpm,        pair.expected[i].cpm,        "adapter response for " + pair.placementCode + " cpm is set to "+pair.expected[i].cpm);
			assert.equal(pair.prebid[i].dealId,     pair.expected[i].dealId,     "adapter response for " + pair.placementCode + " deaiid is set to "+pair.expected[i].dealId);
		}

		assert.equal( prebidResponsePair.unmatched.expected.length, 0, "All AS bid response translated to Adapter response for prebid");
		assert.equal( prebidResponsePair.unmatched.prebid.length,   0, "All Adapter response for prebid is from AS bid");
	});



	it('test_prebid_indexAdapter_response_deal_2_1: response for single slot with multi size, all deal bids returned -> all bid fetched into prebid as deal bid', function () {
		var sizeCount = 2;
		var configuredBids = IndexUtils.createBidSlots(1, sizeCount);
		adapter.callBids({ bids: configuredBids });

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		var optionalResponseParam = [
			[
				{ ext: { deal: 'deal1', dealid: 'ixDealID1', dealname: 'deal name 1' } }, // first slot first size
				{ ext: { deal: 'deal2', dealid: 'ixDealID2', dealname: 'deal name 2' } }, // first slot second size
			]
		];
		var asResponse = IndexUtils.getBidResponse( configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam );
		IndexResponse.cygnus_index_parse_res( asResponse );
		var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse( configuredBids, asResponse );

		var adapterResponse = {};

		for ( var i = 0; i < bidManager.addBidResponse.callCount; i++ ) {
			var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
			var bid        = bidManager.addBidResponse.getCall(i).args[1];

			if ( typeof adapterResponse[adUnitCode] === 'undefined'){
				adapterResponse[adUnitCode] = [];
			};
			adapterResponse[adUnitCode].push(bid);
		}

		var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
		for ( var i = 0; i < prebidResponsePair.matched.length; i++) {
			var pair = prebidResponsePair.matched[i];

			for ( var j = 0; j < pair.expected.length; j++ ) {
				assert.equal(pair.prebid[j].siteID,     pair.expected[j].siteID,     "adapter response for " + pair.placementCode + " siteID is set to "+pair.expected[i].siteID);
				assert.equal(pair.prebid[j].bidderCode, pair.expected[j].bidderCode, "adapter response for " + pair.placementCode + " bidderCode is set to "+pair.expected[i].bidderCode);
				assert.equal(pair.prebid[j].width,      pair.expected[j].width,      "adapter response for " + pair.placementCode + " width is set to "+pair.expected[i].width);
				assert.equal(pair.prebid[j].height,     pair.expected[j].height,     "adapter response for " + pair.placementCode + " height is set to "+pair.expected[i].height);
				assert.equal(pair.prebid[j].ad,         pair.expected[j].ad,         "adapter response for " + pair.placementCode + " ad is set to "+pair.expected[i].ad);
				assert.equal(pair.prebid[j].cpm,        pair.expected[j].cpm,        "adapter response for " + pair.placementCode + " cpm is set to "+pair.expected[i].cpm);
				assert.equal(pair.prebid[j].dealId,     pair.expected[j].dealId,     "adapter response for " + pair.placementCode + " deaiid is set to "+pair.expected[i].dealId);
			}
		}
		assert.equal( prebidResponsePair.unmatched.expected.length, 0, "All AS bid response translated to Adapter response for prebid");
		assert.equal( prebidResponsePair.unmatched.prebid.length,   0, "All Adapter response for prebid is from AS bid");
	});


	it('test_prebid_indexAdapter_response_deal_2_2: response for single slot with multi size, some deal resposne returned and the rest non deal response -> all bid fetched, only deal response has dealID', function () {
		var sizeCount = 2;
		var configuredBids = IndexUtils.createBidSlots(1, sizeCount);
		adapter.callBids({ bids: configuredBids });

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		var optionalResponseParam = [
			[
				{ ext: { deal: 'deal1', dealid: 'ixDealID1', dealname: 'deal name 1' } } // first slot first size
				// No deal on first slot second size
			]
		];
		var asResponse = IndexUtils.getBidResponse( configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam );
		
		IndexResponse.cygnus_index_parse_res( asResponse );
		var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse( configuredBids, asResponse );

		var adapterResponse = {};

		for ( var i = 0; i < bidManager.addBidResponse.callCount; i++ ) {
			var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
			var bid        = bidManager.addBidResponse.getCall(i).args[1];

			if ( typeof adapterResponse[adUnitCode] === 'undefined'){
				adapterResponse[adUnitCode] = [];
			};
			adapterResponse[adUnitCode].push(bid);
		}

		var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
		
		for ( var i = 0; i < prebidResponsePair.matched.length; i++) {
			var pair = prebidResponsePair.matched[i];
		
			for ( var j = 0; j < pair.expected.length; j++ ) {
				assert.equal(pair.prebid[j].siteID,     pair.expected[j].siteID,     "adapter response for " + pair.placementCode + " siteID is set to "+pair.expected[i].siteID);
				assert.equal(pair.prebid[j].bidderCode, pair.expected[j].bidderCode, "adapter response for " + pair.placementCode + " bidderCode is set to "+pair.expected[i].bidderCode);
				assert.equal(pair.prebid[j].width,      pair.expected[j].width,      "adapter response for " + pair.placementCode + " width is set to "+pair.expected[i].width);
				assert.equal(pair.prebid[j].height,     pair.expected[j].height,     "adapter response for " + pair.placementCode + " height is set to "+pair.expected[i].height);
				assert.equal(pair.prebid[j].ad,         pair.expected[j].ad,         "adapter response for " + pair.placementCode + " ad is set to "+pair.expected[i].ad);
				assert.equal(pair.prebid[j].cpm,        pair.expected[j].cpm,        "adapter response for " + pair.placementCode + " cpm is set to "+pair.expected[i].cpm);
				if ( i === 0) {
					assert.equal(pair.prebid[j].dealId, pair.expected[j].dealId, "adapter response for " + pair.placementCode + " deaiid is set to "+pair.expected[i].dealId);
				} else {
					assert.isUndefined( pair.prebid[j].dealId, "adapter response for " + pair.placementCode + " deaiid is not set");
				}
			}
		}

		assert.equal( prebidResponsePair.unmatched.expected.length, 0, "All AS bid response translated to Adapter response for prebid");
		assert.equal( prebidResponsePair.unmatched.prebid.length,   0, "All Adapter response for prebid is from AS bid");
	});


	it('test_prebid_indexAdapter_response_deal_2_3: response for single slot with multi size, all returned as non-deal response -> all bid fetched, no response has dealID', function () {
		var sizeCount = 2;
		var configuredBids = IndexUtils.createBidSlots(1, sizeCount);
		adapter.callBids({ bids: configuredBids });

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		var optionalResponseParam = [
			[
				{},
				{}
				// No deal on first slot first size
				// No deal on first slot second size
			]
		];
		var asResponse = IndexUtils.getBidResponse( configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam );
		
		IndexResponse.cygnus_index_parse_res( asResponse );
		var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse( configuredBids, asResponse );

		var adapterResponse = {};

		for ( var i = 0; i < bidManager.addBidResponse.callCount; i++ ) {
			var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
			var bid        = bidManager.addBidResponse.getCall(i).args[1];

			if ( typeof adapterResponse[adUnitCode] === 'undefined'){
				adapterResponse[adUnitCode] = [];
			};
			adapterResponse[adUnitCode].push(bid);
		}

		var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
		
		for ( var i = 0; i < prebidResponsePair.matched.length; i++) {
			var pair = prebidResponsePair.matched[i];
			for ( var j = 0; j < pair.expected.length; j++ ) {
				assert.equal(pair.prebid[i].siteID,     pair.expected[i].siteID,     "adapter response for " + pair.placementCode + " siteID is set to "+pair.expected[i].siteID);
				assert.equal(pair.prebid[i].bidderCode, pair.expected[i].bidderCode, "adapter response for " + pair.placementCode + " bidderCode is set to "+pair.expected[i].bidderCode);
				assert.equal(pair.prebid[i].width,      pair.expected[i].width,      "adapter response for " + pair.placementCode + " width is set to "+pair.expected[i].width);
				assert.equal(pair.prebid[i].height,     pair.expected[i].height,     "adapter response for " + pair.placementCode + " height is set to "+pair.expected[i].height);
				assert.equal(pair.prebid[i].ad,         pair.expected[i].ad,         "adapter response for " + pair.placementCode + " ad is set to "+pair.expected[i].ad);
				assert.equal(pair.prebid[i].cpm,        pair.expected[i].cpm,        "adapter response for " + pair.placementCode + " cpm is set to "+pair.expected[i].cpm);
				assert.isUndefined( pair.prebid[i].dealId, "adapter response for " + pair.placementCode + " deaiid is not set");
			}
		}
		assert.equal( prebidResponsePair.unmatched.expected.length, 0, "All AS bid response translated to Adapter response for prebid");
		assert.equal( prebidResponsePair.unmatched.prebid.length,   0, "All Adapter response for prebid is from AS bid");
	});


	it('test_prebid_indexAdapter_response_deal_3_1: multi slots, all responses contain deal -> all bid fetched into prebid as deal bid', function () {
		var slotCount = 2;
		var configuredBids = IndexUtils.createBidSlots(slotCount, 1);
		adapter.callBids({ bids: configuredBids });

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		var optionalResponseParam = [
			[
				{ ext: { dealid: 'ixDeal1' } } // first slot first size
			],
			[
				{ ext: { dealid: 'ixDeal2' } } // second slot first size
			]
		];
		var asResponse = IndexUtils.getBidResponse( configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam );
		IndexResponse.cygnus_index_parse_res( asResponse );
		var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse( configuredBids, asResponse );

		var adapterResponse = {};

		for ( var i = 0; i < bidManager.addBidResponse.callCount; i++ ) {
			var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
			var bid        = bidManager.addBidResponse.getCall(i).args[1];

			if ( typeof adapterResponse[adUnitCode] === 'undefined'){
				adapterResponse[adUnitCode] = [];
			};
			adapterResponse[adUnitCode].push(bid);
		}

		var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

		for ( var i = 0; i < prebidResponsePair.matched.length; i++) {
			var pair = prebidResponsePair.matched[i];
			assert.equal(pair.prebid[0].siteID,     pair.expected[0].siteID,     "adapter response for " + pair.placementCode + " siteID is set to "+pair.expected[0].siteID);
			assert.equal(pair.prebid[0].bidderCode, pair.expected[0].bidderCode, "adapter response for " + pair.placementCode + " bidderCode is set to "+pair.expected[0].bidderCode);
			assert.equal(pair.prebid[0].width,      pair.expected[0].width,      "adapter response for " + pair.placementCode + " width is set to "+pair.expected[0].width);
			assert.equal(pair.prebid[0].height,     pair.expected[0].height,     "adapter response for " + pair.placementCode + " height is set to "+pair.expected[0].height);
			assert.equal(pair.prebid[0].ad,         pair.expected[0].ad,         "adapter response for " + pair.placementCode + " ad is set to "+pair.expected[0].ad);
			assert.equal(pair.prebid[0].cpm,        pair.expected[0].cpm,        "adapter response for " + pair.placementCode + " cpm is set to "+pair.expected[0].cpm);
			assert.equal(pair.prebid[0].dealId,     pair.expected[0].dealId,     "adapter response for " + pair.placementCode + " deaiid is set to "+pair.expected[0].dealId);
		}

		assert.equal( prebidResponsePair.unmatched.expected.length, 0, "All AS bid response translated to Adapter response for prebid");
		assert.equal( prebidResponsePair.unmatched.prebid.length,   0, "All Adapter response for prebid is from AS bid");
	});


	it('test_prebid_indexAdapter_response_deal_3_2: multi slots, some responses contain deal -> all bid fetched, only deal response has dealID', function () {
		var slotCount = 2;
		var configuredBids = IndexUtils.createBidSlots(slotCount, 1);
		adapter.callBids({ bids: configuredBids });

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		var optionalResponseParam = [
			[
				{ ext: { dealid: 'ixDeal1' } } // first slot first size
			],
			[
				{}
				// no deal on second slot first size
			]
		];
		var asResponse = IndexUtils.getBidResponse( configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam );
		IndexResponse.cygnus_index_parse_res( asResponse );
		var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse( configuredBids, asResponse );

		var adapterResponse = {};

		for ( var i = 0; i < bidManager.addBidResponse.callCount; i++ ) {
			var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
			var bid        = bidManager.addBidResponse.getCall(i).args[1];

			if ( typeof adapterResponse[adUnitCode] === 'undefined'){
				adapterResponse[adUnitCode] = [];
			};
			adapterResponse[adUnitCode].push(bid);
		}

		var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
		var count = 0;
		for ( var i = 0; i < prebidResponsePair.matched.length; i++) {
			var pair = prebidResponsePair.matched[i];
			assert.equal(pair.prebid[0].siteID,     pair.expected[0].siteID,     "adapter response for " + pair.placementCode + " siteID is set to "+pair.expected[0].siteID);
			assert.equal(pair.prebid[0].bidderCode, pair.expected[0].bidderCode, "adapter response for " + pair.placementCode + " bidderCode is set to "+pair.expected[0].bidderCode);
			assert.equal(pair.prebid[0].width,      pair.expected[0].width,      "adapter response for " + pair.placementCode + " width is set to "+pair.expected[0].width);
			assert.equal(pair.prebid[0].height,     pair.expected[0].height,     "adapter response for " + pair.placementCode + " height is set to "+pair.expected[0].height);
			assert.equal(pair.prebid[0].ad,         pair.expected[0].ad,         "adapter response for " + pair.placementCode + " ad is set to "+pair.expected[0].ad);
			assert.equal(pair.prebid[0].cpm,        pair.expected[0].cpm,        "adapter response for " + pair.placementCode + " cpm is set to "+pair.expected[0].cpm);
			if ( count === 0 ) { // if first slot, check deal parameter
				assert.equal(pair.prebid[0].dealId,     pair.expected[0].dealId,     "adapter response for " + pair.placementCode + " deaiid is set to "+pair.expected[0].dealId);
			} else {
				assert.isUndefined( pair.prebid[0].dealId, "adapter response for " + pair.placementCode + " deaiid is not defined");
			}
			count ++;
		}

		assert.equal( prebidResponsePair.unmatched.expected.length, 0, "All AS bid response translated to Adapter response for prebid");
		assert.equal( prebidResponsePair.unmatched.prebid.length,   0, "All Adapter response for prebid is from AS bid");
	});


	it('test_prebid_indexAdapter_response_deal_3_3: multi slots, no responses contain deal -> all bid fetched, no response has dealID ', function () {
		var slotCount = 2;
		var configuredBids = IndexUtils.createBidSlots(slotCount, 1);
		adapter.callBids({ bids: configuredBids });

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		var optionalResponseParam = [
			[
				{}
				// no deal on first slot first size
			],
			[
				{}
				// no deal on second slot first size
			]
		];
		var asResponse = IndexUtils.getBidResponse( configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam );
		IndexResponse.cygnus_index_parse_res( asResponse );
		var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse( configuredBids, asResponse );

		var adapterResponse = {};

		for ( var i = 0; i < bidManager.addBidResponse.callCount; i++ ) {
			var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
			var bid        = bidManager.addBidResponse.getCall(i).args[1];

			if ( typeof adapterResponse[adUnitCode] === 'undefined'){
				adapterResponse[adUnitCode] = [];
			};
			adapterResponse[adUnitCode].push(bid);
		}

		var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
		
		for ( var i = 0; i < prebidResponsePair.matched.length; i++) {
			var pair = prebidResponsePair.matched[i];
			assert.equal(pair.prebid[0].siteID,     pair.expected[0].siteID,     "adapter response for " + pair.placementCode + " siteID is set to "+pair.expected[0].siteID);
			assert.equal(pair.prebid[0].bidderCode, pair.expected[0].bidderCode, "adapter response for " + pair.placementCode + " bidderCode is set to "+pair.expected[0].bidderCode);
			assert.equal(pair.prebid[0].width,      pair.expected[0].width,      "adapter response for " + pair.placementCode + " width is set to "+pair.expected[0].width);
			assert.equal(pair.prebid[0].height,     pair.expected[0].height,     "adapter response for " + pair.placementCode + " height is set to "+pair.expected[0].height);
			assert.equal(pair.prebid[0].ad,         pair.expected[0].ad,         "adapter response for " + pair.placementCode + " ad is set to "+pair.expected[0].ad);
			assert.equal(pair.prebid[0].cpm,        pair.expected[0].cpm,        "adapter response for " + pair.placementCode + " cpm is set to "+pair.expected[0].cpm);
			assert.isUndefined( pair.prebid[0].dealId, "adapter response for " + pair.placementCode + " deaiid is not defined");
		}

		assert.equal( prebidResponsePair.unmatched.expected.length, 0, "All AS bid response translated to Adapter response for prebid");
		assert.equal( prebidResponsePair.unmatched.prebid.length,   0, "All Adapter response for prebid is from AS bid");
	});
});
