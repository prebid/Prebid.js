import Adapter from '../../../src/adapters/indexExchange';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

var assert           = require('chai').assert;
var IndexUtils       = require('../../helpers/index_adapter_utils.js');
var HeaderTagRequest = '/headertag';
var ADAPTER_CODE     = 'indexExchange';

window.pbjs = window.pbjs || {};

describe('indexExchange adapter - Validation', function () {
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
		sandbox.stub(adLoader, 'loadScript');
	});

	afterEach( function() {
		sandbox.restore();
	});

	it('test_prebid_indexAdapter_sizeValidation_1: request slot has supported and unsupported size -> unsupported size ignored in IX demand request', function () {
		// create 2 sizes for 1 slot, 1 for supported size, the other is not supported
		var unsupportedSize = IndexUtils.unsupportedSizes[0];
		var configuredBids = [ 
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix,   "slot_1", [ IndexUtils.supportedSizes[0], unsupportedSize ] ) 
		]; 

		adapter.callBids({ bids: configuredBids });

		assert.isTrue(adLoader.loadScript.called, "loadScript get request");
		assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, "request is headertag request");

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		assert.isNotNull( requestJSON.r.imp, "headertag request include impression object" );

		var impressionObj = requestJSON.r.imp; 

		var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
		var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
		for ( var i = 0; i < sidMatched.matched.length; i++) {
			var pair = sidMatched.matched[i];

			assert.equal(pair.sent.banner.w, pair.configured.size[0],         "request " + pair.name + " width is set to " + pair.configured.size[0]);
			assert.equal(pair.sent.banner.h, pair.configured.size[1],         "request " + pair.name + " width is set to " + pair.configured.size[1]);
			assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, "request " + pair.name + " siteID is set to " + pair.configured.params.siteID);
		}

		assert.equal( sidMatched.unmatched.sent.length,       0, "All bids in impression object are from configured bids");

		assert.equal( sidMatched.unmatched.configured.length, 1, "1 configured bid is not in impression Obj");
		assert.equal( sidMatched.unmatched.configured[0].size, unsupportedSize, "configured bid not in impression obj size width is" + JSON.stringify(unsupportedSize) );
	});

	it('test_prebid_indexAdapter_sizeValidation_2_1: some slot has unsupported size -> unsupported slot ignored in IX demand request', function () {
		// create 2 slot, 1 for supported size, the other is not supported
		var unsupportedSize = IndexUtils.unsupportedSizes[0];
		var configuredBids = [ 
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"supported",   "slot_1", [ IndexUtils.supportedSizes[0], ], { siteID:IndexUtils.DefaultSiteID } ),
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"unspported",  "slot_2", [ unsupportedSize ],               { siteID:IndexUtils.DefaultSiteID+1} ) 
		]; 

		adapter.callBids({ bids: configuredBids });

		assert.isTrue(adLoader.loadScript.called, "loadScript get request");
		assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, "request is headertag request");

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		assert.isNotNull( requestJSON.r.imp, "headertag request include impression object" );

		var impressionObj = requestJSON.r.imp; 

		var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
		var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
		for ( var i = 0; i < sidMatched.matched.length; i++) {
			var pair = sidMatched.matched[i];

			assert.equal(pair.sent.banner.w, pair.configured.size[0],         "request " + pair.name + " width is set to " + pair.configured.size[0]);
			assert.equal(pair.sent.banner.h, pair.configured.size[1],         "request " + pair.name + " width is set to " + pair.configured.size[1]);
			assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, "request " + pair.name + " siteID is set to " + pair.configured.params.siteID);
		}

		assert.equal( sidMatched.unmatched.sent.length,       0, "All bids in impression object are from configured bids");

		assert.equal( sidMatched.unmatched.configured.length, 1, "1 configured bid is not in impression Obj");
		assert.equal( sidMatched.unmatched.configured[0].size, unsupportedSize, "configured bid not in impression obj size width is" + JSON.stringify(unsupportedSize) );
		assert.equal( sidMatched.unmatched.configured[0].params.id,  "slot_2",  "configured bid not in impression obj id is slot_2" );
		assert.equal( sidMatched.unmatched.configured[0].params.siteID,  IndexUtils.DefaultSiteID+1, "configured bid not in impression obj siteID is "+(IndexUtils.DefaultSiteID+1) );
	});

	it('test_prebid_indexAdapter_sizeValidation_2_2: multiple slots with sinle size, all slot has supported size -> all slots are sent to IX demand', function () {
		// create 2 slot, 1 for supported size, the other is not supported
		var unsupportedSize = IndexUtils.unsupportedSizes[0];
		var configuredBids = [ 
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"supported1",  "slot_1", [ IndexUtils.supportedSizes[0] ], { siteID:IndexUtils.DefaultSiteID } ),
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"supported2",  "slot_2", [ IndexUtils.supportedSizes[1] ], { siteID:IndexUtils.DefaultSiteID+1} ) 
		]; 

		adapter.callBids({ bids: configuredBids });

		assert.isTrue(adLoader.loadScript.called, "loadScript get request");
		assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, "request is headertag request");

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		assert.isNotNull( requestJSON.r.imp, "headertag request include impression object" );

		var impressionObj = requestJSON.r.imp; 

		var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
		var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
		for ( var i = 0; i < sidMatched.matched.length; i++) {
			var pair = sidMatched.matched[i];
			
			assert.equal(pair.sent.banner.w, pair.configured.size[0],         "request " + pair.name + " width is set to " + pair.configured.size[0]);
			assert.equal(pair.sent.banner.h, pair.configured.size[1],         "request " + pair.name + " width is set to " + pair.configured.size[1]);
			assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, "request " + pair.name + " siteID is set to " + pair.configured.params.siteID);
		}

		assert.equal( sidMatched.unmatched.sent.length,       0, "All bids in impression object are from configured bids");
		assert.equal( sidMatched.unmatched.configured.length, 0, "0 configured bid is not in impression Obj");
	});

	it('test_prebid_indexAdapter_sizeValidation_2_3: multiple slots with sinle size, all slot has unsupported size -> all slots are ignored', function () {
		// create 2 slot, 1 for supported size, the other is not supported
		var unsupportedSize = IndexUtils.unsupportedSizes[0];
		var configuredBids = [ 
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"unsupported1",  "slot_1", [ IndexUtils.unsupportedSizes[0] ], { siteID:IndexUtils.DefaultSiteID } ),
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"unsupported2",  "slot_2", [ IndexUtils.unsupportedSizes[1] ], { siteID:IndexUtils.DefaultSiteID+1} ) 
		]; 
		adapter.callBids({ bids: configuredBids });
		
		assert.isUndefined( adLoader.loadScript.firstCall.args[0], "no request made to IX demand");
	});

	it('test_prebid_indexAdapter_sizeValidation_3_1: one slot has supported, unsupported, supported size -> unsupported slot ignored in IX demand request', function () {
		// create 2 slot, 1 for supported size, the other is not supported
		var unsupportedSize = IndexUtils.unsupportedSizes[0];
		var configuredBids = [ 
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"somesupported",   "slot_1", [ IndexUtils.supportedSizes[0], unsupportedSize ,IndexUtils.supportedSizes[1] ], { siteID:IndexUtils.DefaultSiteID } ),
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"allsupported",  "slot_2", [ IndexUtils.supportedSizes[2], IndexUtils.supportedSizes[3] ],  { siteID:IndexUtils.DefaultSiteID+1} ) 
		]; 

		adapter.callBids({ bids: configuredBids });

		assert.isTrue(adLoader.loadScript.called, "loadScript get request");
		assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, "request is headertag request");

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		assert.isNotNull( requestJSON.r.imp, "headertag request include impression object" );

		var impressionObj = requestJSON.r.imp; 

		var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
		var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);
		for ( var i = 0; i < sidMatched.matched.length; i++) {
			var pair = sidMatched.matched[i];

			assert.equal(pair.sent.banner.w, pair.configured.size[0],         "request " + pair.name + " width is set to " + pair.configured.size[0]);
			assert.equal(pair.sent.banner.h, pair.configured.size[1],         "request " + pair.name + " width is set to " + pair.configured.size[1]);
			assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, "request " + pair.name + " siteID is set to " + pair.configured.params.siteID);
		}

		assert.equal( sidMatched.unmatched.sent.length,       0, "All bids in impression object are from configured bids");

		assert.equal( sidMatched.unmatched.configured.length, 1, "1 configured bid is not in impression Obj");
		assert.equal( sidMatched.unmatched.configured[0].size, unsupportedSize, "configured bid not in impression obj size width is" + JSON.stringify(unsupportedSize) );
		assert.equal( sidMatched.unmatched.configured[0].params.id,  "slot_1",  "configured bid not in impression obj id is slot_1" );
		assert.equal( sidMatched.unmatched.configured[0].params.siteID,  IndexUtils.DefaultSiteID, "configured bid not in impression obj siteID is "+(IndexUtils.DefaultSiteID) );
	});

	it('test_prebid_indexAdapter_sizeValidation_3_2: one slot has unsupported, supported, unsupported size -> unsupported slot ignored in IX demand request', function () {
		// create 2 slot, 1 for supported size, the other is not supported
		var unsupportedSize1 = IndexUtils.unsupportedSizes[0];
		var unsupportedSize2 = IndexUtils.unsupportedSizes[1];
		var configuredBids = [ 
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"somesupported",   "slot_1", [ unsupportedSize1, IndexUtils.supportedSizes[1], unsupportedSize2 ], { siteID:IndexUtils.DefaultSiteID } ),
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"allsupported",  "slot_2", [ IndexUtils.supportedSizes[2], IndexUtils.supportedSizes[3] ],  { siteID:IndexUtils.DefaultSiteID+1} ) 
		]; 

		adapter.callBids({ bids: configuredBids });

		assert.isTrue(adLoader.loadScript.called, "loadScript get request");
		assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, "request is headertag request");

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		assert.isNotNull( requestJSON.r.imp, "headertag request include impression object" );

		var impressionObj = requestJSON.r.imp; 

		var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
		var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);
		for ( var i = 0; i < sidMatched.matched.length; i++) {
			var pair = sidMatched.matched[i];

			assert.equal(pair.sent.banner.w, pair.configured.size[0],         "request " + pair.name + " width is set to " + pair.configured.size[0]);
			assert.equal(pair.sent.banner.h, pair.configured.size[1],         "request " + pair.name + " width is set to " + pair.configured.size[1]);
			assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, "request " + pair.name + " siteID is set to " + pair.configured.params.siteID);
		}

		assert.equal( sidMatched.unmatched.sent.length,       0, "All bids in impression object are from configured bids");

		assert.equal( sidMatched.unmatched.configured.length, 2, "2 configured bid is not in impression Obj");
		
		assert.equal( sidMatched.unmatched.configured[0].size, unsupportedSize1, "configured bid not in impression obj size width is" + JSON.stringify(unsupportedSize1) );
		assert.equal( sidMatched.unmatched.configured[0].params.id,  "slot_1",  "configured bid not in impression obj id is slot_1" );
		assert.equal( sidMatched.unmatched.configured[0].params.siteID,  IndexUtils.DefaultSiteID, "configured bid not in impression obj siteID is "+(IndexUtils.DefaultSiteID) );

		assert.equal( sidMatched.unmatched.configured[1].size, unsupportedSize2, "configured bid not in impression obj size width is" + JSON.stringify(unsupportedSize2) );
		assert.equal( sidMatched.unmatched.configured[1].params.id,  "slot_1",  "configured bid not in impression obj id is slot_1" );
		assert.equal( sidMatched.unmatched.configured[1].params.siteID,  IndexUtils.DefaultSiteID, "configured bid not in impression obj siteID is "+(IndexUtils.DefaultSiteID) );
	});

	it('test_prebid_indexAdapter_sizeValidation_3_3: multiple slots, all slots have supported size -> all slots are included in IX demand request', function () {
		var configuredBids = [ 
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"allsupported1", "slot_1", [ IndexUtils.supportedSizes[0], IndexUtils.supportedSizes[1] ], { siteID:IndexUtils.DefaultSiteID } ),
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"allsupported2", "slot_2", [ IndexUtils.supportedSizes[2], IndexUtils.supportedSizes[3] ], { siteID:IndexUtils.DefaultSiteID+1} ) 
		]; 

		adapter.callBids({ bids: configuredBids });

		assert.isTrue(adLoader.loadScript.called, "loadScript get request");
		assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, "request is headertag request");

		var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
		assert.isNotNull( requestJSON.r.imp, "headertag request include impression object" );

		var impressionObj = requestJSON.r.imp; 

		var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
		var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);
		for ( var i = 0; i < sidMatched.matched.length; i++) {
			var pair = sidMatched.matched[i];

			assert.equal(pair.sent.banner.w, pair.configured.size[0],         "request " + pair.name + " width is set to " + pair.configured.size[0]);
			assert.equal(pair.sent.banner.h, pair.configured.size[1],         "request " + pair.name + " width is set to " + pair.configured.size[1]);
			assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, "request " + pair.name + " siteID is set to " + pair.configured.params.siteID);
		}

		assert.equal( sidMatched.unmatched.sent.length,       0, "All bids in impression object are from configured bids");

		assert.equal( sidMatched.unmatched.configured.length, 0, "0 configured bid is not in impression Obj");
	});

	it('test_prebid_indexAdapter_sizeValidation_3_4: multiple slots, all slots have unsupported size -> no slots are sent to IX demand', function () {
		var configuredBids = [ 
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"allsupported1", "slot_1", [ IndexUtils.unsupportedSizes[0], IndexUtils.unsupportedSizes[1] ], { siteID:IndexUtils.DefaultSiteID } ),
			IndexUtils.createBidSlot( IndexUtils.DefaultPlacementCodePrefix+"allsupported2", "slot_2", [ IndexUtils.unsupportedSizes[2], IndexUtils.unsupportedSizes[3] ], { siteID:IndexUtils.DefaultSiteID+1} ) 
		]; 
		adapter.callBids({ bids: configuredBids });
		
		assert.isUndefined(adLoader.loadScript.firstCall.args[0], "No request to IX demand");
	});
});
