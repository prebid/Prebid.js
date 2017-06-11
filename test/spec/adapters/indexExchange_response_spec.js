import Adapter from '../../../src/adapters/indexExchange';
import bidManager from '../../../src/bidmanager';
import adLoader from '../../../src/adloader';

var assert = require('chai').assert;
var IndexUtils = require('../../helpers/index_adapter_utils.js');
var HeaderTagRequest = '/cygnus';
var SlotThreshold = 20;
var ADAPTER_CODE = 'indexExchange';
var DefaultValue = {
  dealID: 'IXDeal'
};
window.pbjs = window.pbjs || {};
var ResponseStatus = {
  noBid: 'Bid returned empty or error response'
};

describe('indexExchange adapter - Response', function () {
  let adapter;
  let sandbox;

  beforeEach(function() {
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

  afterEach(function() {
    sandbox.restore();
  });

  it('test_prebid_indexAdapter_response_1_1: response for single slot with single size -> bid fetched into prebid', function () {
    var configuredBids = IndexUtils.createBidSlots(1, 1);
    adapter.callBids({ bids: configuredBids });

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON);
    cygnus_index_parse_res(asResponse);

    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];
      assert.equal(pair.prebid.length, 1, 'Only one bid is ferched into prebid');
      assert.equal(pair.prebid[0].siteID, pair.expected[0].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[0].siteID);
      assert.equal(pair.prebid[0].bidderCode, pair.expected[0].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[0].bidderCode);
      assert.equal(pair.prebid[0].width, pair.expected[0].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[0].width);
      assert.equal(pair.prebid[0].height, pair.expected[0].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[0].height);
      assert.equal(pair.prebid[0].ad, pair.expected[0].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[0].ad);
      assert.equal(pair.prebid[0].cpm, pair.expected[0].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[0].cpm);
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
  });

  it('test_prebid_indexAdapter_response_1_2: pass on bid for single slot with single size -> bid fetched into prebid', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot1', [ IndexUtils.supportedSizes[0] ]),
    ];
    adapter.callBids({ bids: configuredBids });

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, [ [ true ] ]);
    cygnus_index_parse_res(asResponse);

    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    assert.equal(prebidResponsePair.matched.length, 0, 'No bids are added to prebid');
    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 1, 'no Adapter response for prebid is from AS bid');
  });

  it('test_prebid_indexAdapter_response_2_1: response for single slot with multiple sizes -> all bids fetched into prebid', function () {
    var configuredBids = IndexUtils.createBidSlots(1, 3);
    adapter.callBids({ bids: configuredBids });

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);

    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON);
    cygnus_index_parse_res(asResponse);

    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse, [ [1000, 3000, 2000] ]);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];

      assert.equal(pair.prebid.length, 3, 'all bids are fetched into prebid');
      for (var j = 0; j < pair.prebid.length; j++) {
        assert.equal(pair.prebid[j].siteID, pair.expected[j].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[j].siteID);
        assert.equal(pair.prebid[j].bidderCode, pair.expected[j].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[j].bidderCode);
        assert.equal(pair.prebid[j].width, pair.expected[j].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[j].width);
        assert.equal(pair.prebid[j].height, pair.expected[j].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[j].height);
        assert.equal(pair.prebid[j].ad, pair.expected[j].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[j].ad);
        assert.equal(pair.prebid[j].cpm, pair.expected[j].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[j].cpm);
      }
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
  });

  it('test_prebid_indexAdapter_response_2_2: pass on bid on some sizes for single slot with multiple sizes -> highest bid fetched into prebid', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot1', [ IndexUtils.supportedSizes[0], IndexUtils.supportedSizes[1] ]),
    ];
    adapter.callBids({ bids: configuredBids });

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);

		// pass on bid on second size
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, [ [ false, true ] ]);
    cygnus_index_parse_res(asResponse);

    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    assert.equal(prebidResponsePair.matched.length, 1, 'one slot is added to prebid');
    var pair = prebidResponsePair.matched[0];
    assert.equal(pair.prebid[0].siteID, pair.expected[0].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[0].siteID);
    assert.equal(pair.prebid[0].bidderCode, pair.expected[0].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[0].bidderCode);
    assert.equal(pair.prebid[0].width, pair.expected[0].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[0].width);
    assert.equal(pair.prebid[0].height, pair.expected[0].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[0].height);
    assert.equal(pair.prebid[0].ad, pair.expected[0].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[0].ad);
    assert.equal(pair.prebid[0].cpm, pair.expected[0].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[0].cpm);

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
  });

  it('test_prebid_indexAdapter_response_2_3: pass on bid on all sizes for a single slot -> no bids fetched into prebid', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot1', [ IndexUtils.supportedSizes[0], IndexUtils.supportedSizes[1] ]),
    ];
    adapter.callBids({ bids: configuredBids });

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);

		// pass on bid on all bids
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, [ [ true, true ] ]);
    cygnus_index_parse_res(asResponse);

    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    assert.equal(prebidResponsePair.matched.length, 0, 'no bids fetched into prebid');
    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid[0][0].statusMessage, ResponseStatus.noBid, 'Bid response status is set to ' + ResponseStatus.noBid);
  });

  it('test_prebid_indexAdapter_response_3_1: response for multiple slots request with single size for each slots -> all response for all adunit fetched into prebid', function () {
    var configuredBids = IndexUtils.createBidSlots(20);
    adapter.callBids({ bids: configuredBids });

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);

    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON);
    cygnus_index_parse_res(asResponse);

    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse, [ [1000, 3000, 2000] ]);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];

      assert.equal(pair.prebid.length, 1, 'all bids are fetched into prebid');
      assert.equal(pair.prebid[0].siteID, pair.expected[0].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[0].siteID);
      assert.equal(pair.prebid[0].bidderCode, pair.expected[0].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[0].bidderCode);
      assert.equal(pair.prebid[0].width, pair.expected[0].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[0].width);
      assert.equal(pair.prebid[0].height, pair.expected[0].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[0].height);
      assert.equal(pair.prebid[0].ad, pair.expected[0].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[0].ad);
      assert.equal(pair.prebid[0].cpm, pair.expected[0].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[0].cpm);
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
  });

  it('test_prebid_indexAdapter_response_3_2: some slots response returned -> returned bids fetched into prebid ', function () {
    var configuredBids = IndexUtils.createBidSlots(2);
    adapter.callBids({ bids: configuredBids });

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);

    var passOnBid = [
			[ false ], // bids back on first slot
			[ true ], // pass on bid on second slot
    ];
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, passOnBid);
    cygnus_index_parse_res(asResponse);

    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse, [ [1000, 3000, 2000] ]);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    assert.equal(prebidResponsePair.matched.length, 1, '1 bid from ad server is fetched into prebid');
    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];

      assert.equal(pair.prebid.length, 1, 'all bids are fetched into prebid');
      assert.equal(pair.prebid[0].siteID, pair.expected[0].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[0].siteID);
      assert.equal(pair.prebid[0].bidderCode, pair.expected[0].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[0].bidderCode);
      assert.equal(pair.prebid[0].width, pair.expected[0].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[0].width);
      assert.equal(pair.prebid[0].height, pair.expected[0].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[0].height);
      assert.equal(pair.prebid[0].ad, pair.expected[0].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[0].ad);
      assert.equal(pair.prebid[0].cpm, pair.expected[0].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[0].cpm);
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 1, 'One slot passed on bid from Ad Server');
  });

  it('test_prebid_indexAdapter_response_3_3: response for multiple slots with no response returned -> no bid fetched into prebid', function () {
    var configuredBids = IndexUtils.createBidSlots(2);
    adapter.callBids({ bids: configuredBids });

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);

    var passOnBid = [
			[ true ], // pass on bid on the first slot
			[ true ], // pass on bid on the second slot
    ];
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, passOnBid);
    cygnus_index_parse_res(asResponse);

    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse, [ [1000, 3000, 2000] ]);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    assert.equal(prebidResponsePair.matched.length, 0, 'no bids from ad server is fetched into prebid');

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 2, 'two slots passed on bid from Ad Server');
  });

  it("test_prebid_indexAdapter_refreshSlot_1: slot refreshes multiple times with different bids on refresh with same price -> response to prebid use correct AS response's creative", function () {
    var configuredBids = IndexUtils.createBidSlots(1, 1);

    var refreshSetup = [ {price: 1000, request: 'request-1'}, {price: 1000, request: 'request-2'} ];
    for (var i = 0; i < refreshSetup.length; i++) {
      var requestParams = refreshSetup[i];

      adapter.callBids({ bids: configuredBids });
      var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);

			// first ix call
      var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, [ [requestParams.price] ], requestParams.request);
      cygnus_index_parse_res(asResponse);
      var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

      var adapterResponse = {};

      for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
        var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
        var bid = bidManager.addBidResponse.getCall(i).args[1];

        if (typeof adapterResponse[adUnitCode] === 'undefined') {
          adapterResponse[adUnitCode] = [];
        };
        adapterResponse[adUnitCode].push(bid);
      }

      var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

      for (var j = 0; j < prebidResponsePair.matched.length; j++) {
        var pair = prebidResponsePair.matched[j];

        assert.equal(pair.prebid.length, 1, 'all bids are fetched into prebid');
        for (var k = 0; k < pair.prebid.length; k++) {
          assert.equal(pair.prebid[k].siteID, pair.expected[k].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[k].siteID);
          assert.equal(pair.prebid[k].bidderCode, pair.expected[k].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[k].bidderCode);
          assert.equal(pair.prebid[k].width, pair.expected[k].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[k].width);
          assert.equal(pair.prebid[k].height, pair.expected[k].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[k].height);
          assert.equal(pair.prebid[k].ad, pair.expected[k].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[k].ad);
          assert.equal(pair.prebid[k].cpm, pair.expected[k].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[k].cpm);
        }
      }

      assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
      assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');

      bidManager.addBidResponse.reset();
      adapterResponse = {}; // initialize adapterReaponse for refresh test
    }
  });

  it("test_prebid_indexAdapter_refreshSlot_2: slot refreshes multiple times with different bids on refresh with different price, but first bid is higher -> response to prebid use correct AS response's creative", function () {
    var configuredBids = IndexUtils.createBidSlots(1, 1);

    var refreshSetup = [ {price: 8000, request: 'request-1'}, {price: 1000, request: 'request-2'} ];
    for (var i = 0; i < refreshSetup.length; i++) {
      var requestParams = refreshSetup[i];

      adapter.callBids({ bids: configuredBids });
      var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);

			// first ix call
      var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, [ [requestParams.price] ], requestParams.request);
      cygnus_index_parse_res(asResponse);

      var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

      var adapterResponse = {};

      for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
        var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
        var bid = bidManager.addBidResponse.getCall(i).args[1];

        if (typeof adapterResponse[adUnitCode] === 'undefined') {
          adapterResponse[adUnitCode] = [];
        };
        adapterResponse[adUnitCode].push(bid);
      }

      var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

      for (var j = 0; j < prebidResponsePair.matched.length; j++) {
        var pair = prebidResponsePair.matched[j];

        assert.equal(pair.prebid.length, 1, 'all bids are fetched into prebid');
        for (var k = 0; k < pair.prebid.length; k++) {
          assert.equal(pair.prebid[k].siteID, pair.expected[k].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[k].siteID);
          assert.equal(pair.prebid[k].bidderCode, pair.expected[k].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[k].bidderCode);
          assert.equal(pair.prebid[k].width, pair.expected[k].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[k].width);
          assert.equal(pair.prebid[k].height, pair.expected[k].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[k].height);
          assert.equal(pair.prebid[k].ad, pair.expected[k].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[k].ad);
          assert.equal(pair.prebid[k].cpm, pair.expected[k].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[k].cpm);
        }
      }

      assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
      assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
      bidManager.addBidResponse.reset();
      adapterResponse = {}; // initialize adapterReaponse for refresh test
    }
  });

  it("test_prebid_indexAdapter_refreshSlot_3: slot refreshes multiple times with different bids on refresh with different price, but first bid is lower -> response to prebid use correct AS response's creative", function () {
    var configuredBids = IndexUtils.createBidSlots(1, 1);

    var refreshSetup = [ {price: 1000, request: 'request-1'}, {price: 8000, request: 'request-2'} ];
    for (var i = 0; i < refreshSetup.length; i++) {
      var requestParams = refreshSetup[i];

      adapter.callBids({ bids: configuredBids });
      var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);

			// first ix call
      var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, [ [requestParams.price] ], requestParams.request);
      cygnus_index_parse_res(asResponse);

      var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

      var adapterResponse = {};

      for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
        var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
        var bid = bidManager.addBidResponse.getCall(i).args[1];

        if (typeof adapterResponse[adUnitCode] === 'undefined') {
          adapterResponse[adUnitCode] = [];
        };
        adapterResponse[adUnitCode].push(bid);
      }

      var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

      for (var j = 0; j < prebidResponsePair.matched.length; j++) {
        var pair = prebidResponsePair.matched[j];

        assert.equal(pair.prebid.length, 1, 'all bids are fetched into prebid');
        for (var k = 0; k < pair.prebid.length; k++) {
          assert.equal(pair.prebid[k].siteID, pair.expected[k].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[k].siteID);
          assert.equal(pair.prebid[k].bidderCode, pair.expected[k].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[k].bidderCode);
          assert.equal(pair.prebid[k].width, pair.expected[k].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[k].width);
          assert.equal(pair.prebid[k].height, pair.expected[k].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[k].height);
          assert.equal(pair.prebid[k].ad, pair.expected[k].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[k].ad);
          assert.equal(pair.prebid[k].cpm, pair.expected[k].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[k].cpm);
        }
      }

      assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
      assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
      bidManager.addBidResponse.reset();
      adapterResponse = {}; // initialize adapterReaponse for refresh test
    }
  });

  it('test_prebid_indexAdapter_refreshSlot_4: got no response the second time -> no bids fetched into prebid', function () {
    var configuredBids = IndexUtils.createBidSlots(1, 1);

    var refreshSetup = [ { price: 1000, request: 'request-1', passOnBid: false}, { price: 1000, request: 'request-2', passOnBid: true} ];
    for (var i = 0; i < refreshSetup.length; i++) {
      var requestParams = refreshSetup[i];

      adapter.callBids({ bids: configuredBids });
      var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);

			// first ix call
      var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, [ [requestParams.price] ], requestParams.request, [ [ requestParams.passOnBid ] ]);
      cygnus_index_parse_res(asResponse);
      var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

      var adapterResponse = {};

      for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
        var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
        var bid = bidManager.addBidResponse.getCall(i).args[1];

        if (typeof adapterResponse[adUnitCode] === 'undefined') {
          adapterResponse[adUnitCode] = [];
        };
        adapterResponse[adUnitCode].push(bid);
      }

      var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

      for (var j = 0; j < prebidResponsePair.matched.length; j++) {
        var pair = prebidResponsePair.matched[j];

        assert.equal(pair.prebid.length, 1, 'all bids are fetched into prebid');
        for (var k = 0; k < pair.prebid.length; k++) {
          assert.equal(pair.prebid[k].siteID, pair.expected[k].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[k].siteID);
          assert.equal(pair.prebid[k].bidderCode, pair.expected[k].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[k].bidderCode);
          assert.equal(pair.prebid[k].width, pair.expected[k].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[k].width);
          assert.equal(pair.prebid[k].height, pair.expected[k].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[k].height);
          assert.equal(pair.prebid[k].ad, pair.expected[k].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[k].ad);
          assert.equal(pair.prebid[k].cpm, pair.expected[k].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[k].cpm);
        }
      }
      assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
      if (requestParams.passOnBid) {
        assert.equal(prebidResponsePair.unmatched.prebid.length, 1, '1 Adapter response is missing');
      } else {
        assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
      }

      bidManager.addBidResponse.reset();
      adapterResponse = {}; // initialize adapterReaponse for refresh test
    }
  });

  it('test_prebid_indexAdapter_refreshSlot_5: unsupported slots refresh -> no ad server request, no bids fetched into prebid', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.unsupportedSizes[0] ])
    ];

    var refreshSetup = [ { request: 'request-1' }, { request: 'request-2' } ];
    for (var i = 0; i < refreshSetup.length; i++) {
      var requestParams = refreshSetup[i];

      adapter.callBids({ bids: configuredBids });
      assert.isUndefined(adLoader.loadScript.firstCall.args[0], 'no ad server request for ' + requestParams.request)
    }
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
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam);
    cygnus_index_parse_res(asResponse);

    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];

      assert.equal(pair.prebid[i].siteID, pair.expected[i].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[i].siteID);
      assert.equal(pair.prebid[i].bidderCode, pair.expected[i].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[i].bidderCode);
      assert.equal(pair.prebid[i].width, pair.expected[i].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[i].width);
      assert.equal(pair.prebid[i].height, pair.expected[i].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[i].height);
      assert.equal(pair.prebid[i].ad, pair.expected[i].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[i].ad);
      assert.equal(pair.prebid[i].cpm, pair.expected[i].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[i].cpm);
      assert.equal(pair.prebid[i].dealId, pair.expected[i].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is set to ' + pair.expected[i].dealId);
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
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
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam);
    cygnus_index_parse_res(asResponse);
    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];

      assert.equal(pair.prebid[i].siteID, pair.expected[i].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[i].siteID);
      assert.equal(pair.prebid[i].bidderCode, pair.expected[i].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[i].bidderCode);
      assert.equal(pair.prebid[i].width, pair.expected[i].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[i].width);
      assert.equal(pair.prebid[i].height, pair.expected[i].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[i].height);
      assert.equal(pair.prebid[i].ad, pair.expected[i].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[i].ad);
      assert.equal(pair.prebid[i].cpm, pair.expected[i].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[i].cpm);
      assert.equal(pair.prebid[i].dealId, pair.expected[i].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is set to ' + pair.expected[i].dealId);
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
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
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam);
    cygnus_index_parse_res(asResponse);
    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];

      assert.equal(pair.prebid[i].siteID, pair.expected[i].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[i].siteID);
      assert.equal(pair.prebid[i].bidderCode, pair.expected[i].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[i].bidderCode);
      assert.equal(pair.prebid[i].width, pair.expected[i].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[i].width);
      assert.equal(pair.prebid[i].height, pair.expected[i].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[i].height);
      assert.equal(pair.prebid[i].ad, pair.expected[i].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[i].ad);
      assert.equal(pair.prebid[i].cpm, pair.expected[i].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[i].cpm);
      assert.equal(pair.prebid[i].dealId, pair.expected[i].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is set to ' + pair.expected[i].dealId);
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
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
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam); // Alpha numeric starting with non-numeric
    cygnus_index_parse_res(asResponse);
    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];

      assert.equal(pair.prebid[i].siteID, pair.expected[i].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[i].siteID);
      assert.equal(pair.prebid[i].bidderCode, pair.expected[i].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[i].bidderCode);
      assert.equal(pair.prebid[i].width, pair.expected[i].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[i].width);
      assert.equal(pair.prebid[i].height, pair.expected[i].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[i].height);
      assert.equal(pair.prebid[i].ad, pair.expected[i].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[i].ad);
      assert.equal(pair.prebid[i].cpm, pair.expected[i].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[i].cpm);
      assert.equal(pair.prebid[i].dealId, pair.expected[i].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is set to ' + pair.expected[i].dealId);
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
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
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam);
    cygnus_index_parse_res(asResponse);
    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];

      for (var j = 0; j < pair.expected.length; j++) {
        assert.equal(pair.prebid[j].siteID, pair.expected[j].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[i].siteID);
        assert.equal(pair.prebid[j].bidderCode, pair.expected[j].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[i].bidderCode);
        assert.equal(pair.prebid[j].width, pair.expected[j].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[i].width);
        assert.equal(pair.prebid[j].height, pair.expected[j].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[i].height);
        assert.equal(pair.prebid[j].ad, pair.expected[j].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[i].ad);
        assert.equal(pair.prebid[j].cpm, pair.expected[j].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[i].cpm);
        assert.equal(pair.prebid[j].dealId, pair.expected[j].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is set to ' + pair.expected[i].dealId);
      }
    }
    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
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
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam);
    cygnus_index_parse_res(asResponse);
    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];

      for (var j = 0; j < pair.expected.length; j++) {
        assert.equal(pair.prebid[j].siteID, pair.expected[j].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[i].siteID);
        assert.equal(pair.prebid[j].bidderCode, pair.expected[j].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[i].bidderCode);
        assert.equal(pair.prebid[j].width, pair.expected[j].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[i].width);
        assert.equal(pair.prebid[j].height, pair.expected[j].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[i].height);
        assert.equal(pair.prebid[j].ad, pair.expected[j].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[i].ad);
        assert.equal(pair.prebid[j].cpm, pair.expected[j].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[i].cpm);
        if (i === 0) {
          assert.equal(pair.prebid[j].dealId, pair.expected[j].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is set to ' + pair.expected[i].dealId);
        } else {
          assert.isUndefined(pair.prebid[j].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is not set');
        }
      }
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
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
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam);

    cygnus_index_parse_res(asResponse);
    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];
      for (var j = 0; j < pair.expected.length; j++) {
        assert.equal(pair.prebid[i].siteID, pair.expected[i].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[i].siteID);
        assert.equal(pair.prebid[i].bidderCode, pair.expected[i].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[i].bidderCode);
        assert.equal(pair.prebid[i].width, pair.expected[i].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[i].width);
        assert.equal(pair.prebid[i].height, pair.expected[i].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[i].height);
        assert.equal(pair.prebid[i].ad, pair.expected[i].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[i].ad);
        assert.equal(pair.prebid[i].cpm, pair.expected[i].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[i].cpm);
        assert.isUndefined(pair.prebid[i].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is not set');
      }
    }
    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
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
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam);
    cygnus_index_parse_res(asResponse);
    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];
      assert.equal(pair.prebid[0].siteID, pair.expected[0].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[0].siteID);
      assert.equal(pair.prebid[0].bidderCode, pair.expected[0].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[0].bidderCode);
      assert.equal(pair.prebid[0].width, pair.expected[0].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[0].width);
      assert.equal(pair.prebid[0].height, pair.expected[0].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[0].height);
      assert.equal(pair.prebid[0].ad, pair.expected[0].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[0].ad);
      assert.equal(pair.prebid[0].cpm, pair.expected[0].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[0].cpm);
      assert.equal(pair.prebid[0].dealId, pair.expected[0].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is set to ' + pair.expected[0].dealId);
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
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
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam);
    cygnus_index_parse_res(asResponse);
    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);
    var count = 0;
    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];
      assert.equal(pair.prebid[0].siteID, pair.expected[0].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[0].siteID);
      assert.equal(pair.prebid[0].bidderCode, pair.expected[0].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[0].bidderCode);
      assert.equal(pair.prebid[0].width, pair.expected[0].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[0].width);
      assert.equal(pair.prebid[0].height, pair.expected[0].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[0].height);
      assert.equal(pair.prebid[0].ad, pair.expected[0].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[0].ad);
      assert.equal(pair.prebid[0].cpm, pair.expected[0].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[0].cpm);
      if (count === 0) { // if first slot, check deal parameter
        assert.equal(pair.prebid[0].dealId, pair.expected[0].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is set to ' + pair.expected[0].dealId);
      } else {
        assert.isUndefined(pair.prebid[0].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is not defined');
      }
      count++;
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
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
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, undefined, optionalResponseParam);
    cygnus_index_parse_res(asResponse);
    var expectedAdapterResponse = IndexUtils.getExpectedAdaptorResponse(configuredBids, asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }

    var prebidResponsePair = IndexUtils.matchOnPlacementCode(expectedAdapterResponse, adapterResponse);

    for (var i = 0; i < prebidResponsePair.matched.length; i++) {
      var pair = prebidResponsePair.matched[i];
      assert.equal(pair.prebid[0].siteID, pair.expected[0].siteID, 'adapter response for ' + pair.placementCode + ' siteID is set to ' + pair.expected[0].siteID);
      assert.equal(pair.prebid[0].bidderCode, pair.expected[0].bidderCode, 'adapter response for ' + pair.placementCode + ' bidderCode is set to ' + pair.expected[0].bidderCode);
      assert.equal(pair.prebid[0].width, pair.expected[0].width, 'adapter response for ' + pair.placementCode + ' width is set to ' + pair.expected[0].width);
      assert.equal(pair.prebid[0].height, pair.expected[0].height, 'adapter response for ' + pair.placementCode + ' height is set to ' + pair.expected[0].height);
      assert.equal(pair.prebid[0].ad, pair.expected[0].ad, 'adapter response for ' + pair.placementCode + ' ad is set to ' + pair.expected[0].ad);
      assert.equal(pair.prebid[0].cpm, pair.expected[0].cpm, 'adapter response for ' + pair.placementCode + ' cpm is set to ' + pair.expected[0].cpm);
      assert.isUndefined(pair.prebid[0].dealId, 'adapter response for ' + pair.placementCode + ' deaiid is not defined');
    }

    assert.equal(prebidResponsePair.unmatched.expected.length, 0, 'All AS bid response translated to Adapter response for prebid');
    assert.equal(prebidResponsePair.unmatched.prebid.length, 0, 'All Adapter response for prebid is from AS bid');
  });

  it('test_prebid_indexAdapter_tier: one slot with multiple tier -> all tier bids are fetched into prebid', function() {
    var slotConfig = {
      tier2SiteID: IndexUtils.DefaultSiteID + 1,
      tier3SiteID: IndexUtils.DefaultSiteID + 2,
    };
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], slotConfig),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;
    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);

    assert.equal(sidMatched.matched.length, 3, 'Three slots are configured and sent to AS');
		// check normal site id
    var normalSitePair = sidMatched.matched[0];

    var expectedSlotID = normalSitePair.configured.params.id + '_1';
    assert.equal(normalSitePair.sent.ext.sid, expectedSlotID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedSlotID);
    assert.isString(normalSitePair.sent.ext.sid, 'type of slot ID is string');

    var expectedSiteID = normalSitePair.configured.params.siteID;
    assert.equal(normalSitePair.sent.ext.siteID, expectedSiteID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedSiteID);
    assert.isNumber(normalSitePair.sent.ext.siteID, 'site ID is integer');

		// check tier 1  site id
    var tier2SitePair = sidMatched.matched[1];
    var expectedTierSlotID = 'T1_' + tier2SitePair.configured.params.id + '_1';
    assert.equal(tier2SitePair.sent.ext.sid, expectedTierSlotID, 'request ' + tier2SitePair.name + ' site ID is set to ' + expectedTierSlotID);
    assert.isString(tier2SitePair.sent.ext.sid, 'type of slot ID is string');

    var expectedTierSiteID = tier2SitePair.configured.params.tier2SiteID;
    assert.equal(tier2SitePair.sent.ext.siteID, expectedTierSiteID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedTierSiteID);
    assert.isNumber(tier2SitePair.sent.ext.siteID, 'site ID is integer');

		// check tier 2  site id
    var tier3SitePair = sidMatched.matched[2];
    var expectedTierSlotID = 'T2_' + tier3SitePair.configured.params.id + '_1';
    assert.equal(tier3SitePair.sent.ext.sid, expectedTierSlotID, 'request ' + tier3SitePair.name + ' site ID is set to ' + expectedTierSlotID);
    assert.isString(tier3SitePair.sent.ext.sid, 'type of slot ID is string');

    var expectedTier3SiteID = tier3SitePair.configured.params.tier3SiteID;
    assert.equal(tier3SitePair.sent.ext.siteID, expectedTier3SiteID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedTier3SiteID);
    assert.isNumber(tier3SitePair.sent.ext.siteID, 'site ID is integer');

		// check unsent bids
    assert.equal(sidMatched.unmatched.configured.length, 0, 'All configured bids are in impression Obj');
    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
  });

  it('test_prebid_indexAdapter_callback_bids: callback function defined with bids -> calls callback function with bids', function () {
    var callbackCalled = false;
    var callback_requestID;
    var callback_slots;
    window.cygnus_index_args['callback'] = function(requestID, slots) {
      callbackCalled = true;
      callback_requestID = requestID;
      callback_slots = slots;
    }

    var configuredBids = IndexUtils.createBidSlots(1, 1);
    adapter.callBids({ bids: configuredBids });

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON);
    cygnus_index_parse_res(asResponse);

    assert.equal(callbackCalled, true, 'callback function is called');
    assert.equal(callback_requestID, requestJSON.r.id, 'callback requestID matches with actual request ID: ' + requestJSON.r.id);
    assert.equal(callback_slots.length, 1, 'callback slots include one slot');
  });

  it('test_prebid_indexAdapter_callback_nobids: callback function defined with no bids -> calls callback function without bids', function () {
    var callbackCalled = false;
    var callback_requestID;
    var callback_slots;
    window.cygnus_index_args['callback'] = function(requestID, slots) {
      callbackCalled = true;
      callback_requestID = requestID;
      callback_slots = slots;
    }

    var configuredBids = IndexUtils.createBidSlots(1, 1);
    adapter.callBids({ bids: configuredBids });

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, [[true]]); // pass on bid
    cygnus_index_parse_res(asResponse);

    assert.equal(callbackCalled, true, 'callback function is called');
    assert.equal(callback_requestID, requestJSON.r.id, 'callback requestID matches with actual request ID: ' + requestJSON.r.id);
    assert.isUndefined(callback_slots, 'callback slot is undefined because all bids passed on bid');
  });

  it('test_prebid_indexAdapter_response_sizeID_1: multiple prebid size slot, index slots with size for all prebid slots -> all size in AS request, no size ID', function () {
    var slotID_1 = '52';
    var slotID_2 = '53';
    var slotSizes_1 = IndexUtils.supportedSizes[0];
    var slotSizes_2 = IndexUtils.supportedSizes[1];

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + slotID_1, slotID_1, [ slotSizes_1, slotSizes_2 ], { slotSize: slotSizes_1 }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + slotID_2, slotID_2, [ slotSizes_1, slotSizes_2 ], { siteID: IndexUtils.DefaultSiteID + 1 })
    ];

    adapter.callBids({ bids: configuredBids });

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    var asResponse = IndexUtils.getBidResponse(configuredBids, requestJSON, undefined, undefined, [[true]]); // pass on bid
    cygnus_index_parse_res(asResponse);

    var adapterResponse = {};

    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    }
  });
});
