import Adapter from '../../../modules/indexExchangeBidAdapter';
import adLoader from '../../../src/adloader';

var assert = require('chai').assert;
var IndexUtils = require('../../helpers/index_adapter_utils.js');
var HeaderTagRequest = '/cygnus';
var ADAPTER_CODE = 'indexExchange';

describe('indexExchange adapter - Validation', function () {
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
    sandbox.stub(adLoader, 'loadScript');
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('test_prebid_indexAdapter_sizeValidation_1: request slot has supported and unsupported size -> unsupported size ignored in IX demand request', function () {
		// create 2 sizes for 1 slot, 1 for supported size, the other is not supported
    var unsupportedSize = IndexUtils.unsupportedSizes[0];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0], unsupportedSize ])
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');

    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, unsupportedSize, 'configured bid not in impression obj size width is' + JSON.stringify(unsupportedSize));
  });

  it('test_prebid_indexAdapter_sizeValidation_2_1: some slot has unsupported size -> unsupported slot ignored in IX demand request', function () {
		// create 2 slot, 1 for supported size, the other is not supported
    var unsupportedSize = IndexUtils.unsupportedSizes[0];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'supported', 'slot_1', [ IndexUtils.supportedSizes[0], ], { siteID: IndexUtils.DefaultSiteID }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'unspported', 'slot_2', [ unsupportedSize ], { siteID: IndexUtils.DefaultSiteID + 1})
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');

    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, unsupportedSize, 'configured bid not in impression obj size width is' + JSON.stringify(unsupportedSize));
    assert.equal(sidMatched.unmatched.configured[0].params.id, 'slot_2', 'configured bid not in impression obj id is slot_2');
    assert.equal(sidMatched.unmatched.configured[0].params.siteID, IndexUtils.DefaultSiteID + 1, 'configured bid not in impression obj siteID is ' + (IndexUtils.DefaultSiteID + 1));
  });

  it('test_prebid_indexAdapter_sizeValidation_2_2: multiple slots with sinle size, all slot has supported size -> all slots are sent to IX demand', function () {
		// create 2 slot, 1 for supported size, the other is not supported
    var unsupportedSize = IndexUtils.unsupportedSizes[0];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'supported1', 'slot_1', [ IndexUtils.supportedSizes[0] ], { siteID: IndexUtils.DefaultSiteID }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'supported2', 'slot_2', [ IndexUtils.supportedSizes[1] ], { siteID: IndexUtils.DefaultSiteID + 1})
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 0, '0 configured bid is not in impression Obj');
  });

  it('test_prebid_indexAdapter_sizeValidation_2_3: multiple slots with sinle size, all slot has unsupported size -> all slots are ignored', function () {
		// create 2 slot, 1 for supported size, the other is not supported
    var unsupportedSize = IndexUtils.unsupportedSizes[0];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'unsupported1', 'slot_1', [ IndexUtils.unsupportedSizes[0] ], { siteID: IndexUtils.DefaultSiteID }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'unsupported2', 'slot_2', [ IndexUtils.unsupportedSizes[1] ], { siteID: IndexUtils.DefaultSiteID + 1})
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isUndefined(adLoader.loadScript.firstCall.args[0], 'no request made to IX demand');
  });

  it('test_prebid_indexAdapter_sizeValidation_3_1: one slot has supported, unsupported, supported size -> unsupported slot ignored in IX demand request', function () {
		// create 2 slot, 1 for supported size, the other is not supported
    var unsupportedSize = IndexUtils.unsupportedSizes[0];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'somesupported', 'slot_1', [ IndexUtils.supportedSizes[0], unsupportedSize, IndexUtils.supportedSizes[1] ], { siteID: IndexUtils.DefaultSiteID }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'allsupported', 'slot_2', [ IndexUtils.supportedSizes[2], IndexUtils.supportedSizes[3] ], { siteID: IndexUtils.DefaultSiteID + 1})
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');

    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, unsupportedSize, 'configured bid not in impression obj size width is' + JSON.stringify(unsupportedSize));
    assert.equal(sidMatched.unmatched.configured[0].params.id, 'slot_1', 'configured bid not in impression obj id is slot_1');
    assert.equal(sidMatched.unmatched.configured[0].params.siteID, IndexUtils.DefaultSiteID, 'configured bid not in impression obj siteID is ' + (IndexUtils.DefaultSiteID));
  });

  it('test_prebid_indexAdapter_sizeValidation_3_2: one slot has unsupported, supported, unsupported size -> unsupported slot ignored in IX demand request', function () {
		// create 2 slot, 1 for supported size, the other is not supported
    var unsupportedSize1 = IndexUtils.unsupportedSizes[0];
    var unsupportedSize2 = IndexUtils.unsupportedSizes[1];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'somesupported', 'slot_1', [ unsupportedSize1, IndexUtils.supportedSizes[1], unsupportedSize2 ], { siteID: IndexUtils.DefaultSiteID }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'allsupported', 'slot_2', [ IndexUtils.supportedSizes[2], IndexUtils.supportedSizes[3] ], { siteID: IndexUtils.DefaultSiteID + 1})
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');

    assert.equal(sidMatched.unmatched.configured.length, 2, '2 configured bid is not in impression Obj');

    assert.equal(sidMatched.unmatched.configured[0].size, unsupportedSize1, 'configured bid not in impression obj size width is' + JSON.stringify(unsupportedSize1));
    assert.equal(sidMatched.unmatched.configured[0].params.id, 'slot_1', 'configured bid not in impression obj id is slot_1');
    assert.equal(sidMatched.unmatched.configured[0].params.siteID, IndexUtils.DefaultSiteID, 'configured bid not in impression obj siteID is ' + (IndexUtils.DefaultSiteID));

    assert.equal(sidMatched.unmatched.configured[1].size, unsupportedSize2, 'configured bid not in impression obj size width is' + JSON.stringify(unsupportedSize2));
    assert.equal(sidMatched.unmatched.configured[1].params.id, 'slot_1', 'configured bid not in impression obj id is slot_1');
    assert.equal(sidMatched.unmatched.configured[1].params.siteID, IndexUtils.DefaultSiteID, 'configured bid not in impression obj siteID is ' + (IndexUtils.DefaultSiteID));
  });

  it('test_prebid_indexAdapter_sizeValidation_3_3: multiple slots, all slots have supported size -> all slots are included in IX demand request', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'allsupported1', 'slot_1', [ IndexUtils.supportedSizes[0], IndexUtils.supportedSizes[1] ], { siteID: IndexUtils.DefaultSiteID }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'allsupported2', 'slot_2', [ IndexUtils.supportedSizes[2], IndexUtils.supportedSizes[3] ], { siteID: IndexUtils.DefaultSiteID + 1})
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');

    assert.equal(sidMatched.unmatched.configured.length, 0, '0 configured bid is not in impression Obj');
  });

  it('test_prebid_indexAdapter_sizeValidation_3_4: multiple slots, all slots have unsupported size -> no slots are sent to IX demand', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'allsupported1', 'slot_1', [ IndexUtils.unsupportedSizes[0], IndexUtils.unsupportedSizes[1] ], { siteID: IndexUtils.DefaultSiteID }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + 'allsupported2', 'slot_2', [ IndexUtils.unsupportedSizes[2], IndexUtils.unsupportedSizes[3] ], { siteID: IndexUtils.DefaultSiteID + 1})
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isUndefined(adLoader.loadScript.firstCall.args[0], 'No request to IX demand');
  });

  it('test_prebid_indexAdapter_param_timeout_integer: timeout is integer -> t parameter that matches with the integer', function () {
    var testTimeout = 100; // integer timeout
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], { timeout: testTimeout }),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.equal(requestJSON.t, testTimeout, 't parameter matches timeout and is included in AS request parameter');
  });

  it('test_prebid_indexAdapter_param_timeout_quoted_integer: timeout is quoted integer -> t parameter that matches with the integer', function () {
    var testTimeout = '100'; // quoted integer timeout
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], { timeout: testTimeout }),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.equal(requestJSON.t, testTimeout, 't parameter matches timeout and is included in AS request parameter');
  });

  it('test_prebid_indexAdapter_param_timeout_float: timeout is float number -> t parameter is not included in AS request', function () {
    var testTimeout = 1.234;
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], { timeout: testTimeout }),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isUndefined(requestJSON.t, 't parameter is not included in AS request parameter');
  });

  it('test_prebid_indexAdapter_param_timeout_float: timeout is float number -> t parameter is not included in AS request', function () {
    var testTimeout = 1.234;
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], { timeout: testTimeout }),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isUndefined(requestJSON.t, 't parameter is not included in AS request parameter');
  });

  it('test_prebid_indexAdapter_param_timeout_string: timeout is string -> t parameter is not included in AS request', function () {
    var testTimeout = 'string';
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], { timeout: testTimeout }),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isUndefined(requestJSON.t, 't parameter is not included in AS request parameter');
  });

  it('test_prebid_indexAdapter_param_timeout_array: timeout is array -> t parameter is not included in AS request', function () {
    var testTimeout = [ 'abc' ];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], { timeout: testTimeout }),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isUndefined(requestJSON.t, 't parameter is not included in AS request parameter');
  });

  it('test_prebid_indexAdapter_param_timeout_hash: timeout is hash -> t parameter is not included in AS request', function () {
    var testTimeout = { 'timeout': 100 };
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], { timeout: testTimeout }),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isUndefined(requestJSON.t, 't parameter is not included in AS request parameter');
  });

  it('test_prebid_indexAdapter_param_timeout_zero: timeout is zero -> t parameter is not included in AS request', function () {
    var testTimeout = 0;
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], { timeout: testTimeout }),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isUndefined(requestJSON.t, 't parameter is not included in AS request parameter');
  });

  it('test_prebid_indexAdapter_param_timeout_negative: timeout is negative integer -> t parameter is not included in AS request', function () {
    var testTimeout = -100;
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], { timeout: testTimeout }),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isUndefined(requestJSON.t, 't parameter is not included in AS request parameter');
  });

  it('test_prebid_indexAdapter_param_timeout_too_big: timeout is bigger than AS max timeout -> t parameter is not included in AS request', function () {
    var testTimeout = 25000; // very large timeout
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], { timeout: testTimeout }),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.equal(requestJSON.t, testTimeout, 't parameter matches timeout and is included in AS request parameter');
  });

  it('test_prebid_indexAdapter_param_timeout_missing: timeout is missing -> t parameter is not included in AS request', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ]),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isUndefined(requestJSON.t, 't parameter is not included in AS request parameter');
  });

  it('test_prebid_indexAdapter_param_timeout_empty_string: timeout is empty string -> t parameter is not included in AS request', function () {
    var testTimeout = '';
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], { timeout: testTimeout}),
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isUndefined(requestJSON.t, 't parameter is not included in AS request parameter');
  });

  var test_indexAdapter_slotid = [
    {
      'testname': 'test_prebid_indexAdapter_slotid_integer: slot ID is integer -> slot ID sent to AS in string',
      'slotID': 123,
      'expected': 'pass'
    },
    {
      'testname': 'test_prebid_indexAdapter_slotid_quoted_integer: slot ID is quoted_integer -> slot ID sent to AS in string',
      'slotID': '123',
      'expected': 'pass'
    },
    {
      'testname': 'test_prebid_indexAdapter_slotid_float: slot ID is float -> slot ID sent to AS in string',
      'slotID': 123.45,
      'expected': 'pass'
    },
    {
      'testname': 'test_prebid_indexAdapter_slotid_string: slot ID is string -> slot ID sent to AS in string',
      'slotID': 'string',
      'expected': 'pass'
    },
    {
      'testname': 'test_prebid_indexAdapter_slotid_array: slot ID is array -> slot is not sent to AS',
      'slotID': [ 'arrayelement1', 'arrayelement2' ],
      'expected': 'fail'
    },
    {
      'testname': 'test_prebid_indexAdapter_slotid_hash: slot ID is hash -> slot is not sent to AS',
      'slotID': { 'hashName': 'hashKey' },
      'expected': 'fail'
    },
    {
      'testname': 'test_prebid_indexAdapter_slotid_zero: slot ID is zero integer -> slot ID sent to AS in string',
      'slotID': 0,
      'expected': 'pass'
    },
    {
      'testname': 'test_prebid_indexAdapter_slotid_negative: slot ID is negative integer -> slot ID sent to AS in string',
      'slotID': -100,
      'expected': 'pass'
    },
    {
      'testname': 'test_prebid_indexAdapter_slotid_undefined: slot ID is undefined -> slot is not sent to AS',
      'slotID': undefined,
      'expected': 'fail'
    },
    {
      'testname': 'test_prebid_indexAdapter_slotid_missing: slot ID is missing -> slot is not sent to AS',
      'param': { 'missingSlotID': true},
      'expected': 'invalid'
    }
  ];

  function base_prebid_indexAdapter_slotid (testname, slotID, expected, param) {
    it(testname, function() {
      var configuredBids = [
        IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, slotID, [ IndexUtils.supportedSizes[0] ], param),
      ];
      adapter.callBids({ bids: configuredBids });
      if (expected == 'pass') {
        assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
        assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

        var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
        assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

        var impressionObj = requestJSON.r.imp;

        var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
        var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
        for (var i = 0; i < sidMatched.matched.length; i++) {
          var pair = sidMatched.matched[i];

          var actualSlotID = pair.sent.ext.sid;
          var expectedSlotID = pair.configured.params.id + '_1';
          assert.equal(actualSlotID, expectedSlotID, 'request ' + pair.name + ' slot ID is set to ' + expectedSlotID);
          assert.isString(actualSlotID, 'slotID is string');
        }

        assert.equal(sidMatched.unmatched.configured.length, 0, 'All configured bids are in impression Obj');
        assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
      } else if (expected == 'invalid') {
				// case where callBids throws out request due to missing params
        assert.isFalse(adLoader.loadScript.called, 'No request to AS')
      } else {
        assert.strictEqual(typeof indexBidRequest, 'undefined', 'No request to AS');
      }
    });
  };

  for (var i = 0; i < test_indexAdapter_slotid.length; i++) {
    var test = test_indexAdapter_slotid[i];
    base_prebid_indexAdapter_slotid(test.testname, test.slotID, test.expected, test.param);
  }

  it('test_prebid_indexAdapter_slotid_multiple_slot: uniqueness for multiple slots -> all slots in ad server request with unique slot id', function() {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ]),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_2', [ IndexUtils.supportedSizes[1] ]),
    ];
    adapter.callBids({ bids: configuredBids });
    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');

    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      var actualSlotID = pair.sent.ext.sid;
      var expectedSlotID = pair.configured.params.id + '_1';
      assert.equal(actualSlotID, expectedSlotID, 'request ' + pair.name + ' slot ID is set to ' + expectedSlotID);
      assert.isString(actualSlotID, 'slotID is string');
    }

    assert.equal(sidMatched.unmatched.configured.length, 0, 'All configured bids are in impression Obj');
    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
  });

  it('test_prebid_indexAdapter_slotid_multiple_same: same across some slots -> all slots in ad server request with same slot id', function() {
    var slotName = 'slot_same';
    var secondSlotSize = IndexUtils.supportedSizes[1];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, slotName, [ IndexUtils.supportedSizes[0] ]),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, slotName, [ secondSlotSize ]),
    ];
    adapter.callBids({ bids: configuredBids });
    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      var actualSlotID = pair.sent.ext.sid;
      var expectedSlotID = pair.configured.params.id + '_1';
      assert.equal(actualSlotID, expectedSlotID, 'request ' + pair.name + ' slot ID is set to ' + expectedSlotID);
      assert.isString(actualSlotID, 'slotID is string');
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');

    assert.equal(sidMatched.unmatched.configured.length, 1, 'All configured bids are in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, secondSlotSize, 'configured bid not in impression obj size width is' + JSON.stringify(secondSlotSize));
    assert.equal(sidMatched.unmatched.configured[0].params.id, slotName, 'slot name is ' + slotName);
  });

  var test_indexAdapter_siteid = [
    {
      'testname': 'test_prebid_indexAdapter_siteid_integer: site ID is integer -> siteID ID sent to AS as integer',
      'param': { 'siteID': 12345 },
      'expected': 'pass',
    },
    {
      'testname': 'test_prebid_indexAdapter_siteid_quoted_integer: site ID is quoted integer -> siteID ID sent to AS as integer',
      'param': { 'siteID': '12345' },
      'expected': 'pass',
    },
    {
      'testname': 'test_prebid_indexAdapter_siteid_float: site ID is float -> slot is ignored',
      'param': { 'siteID': 12.345 },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_siteid_string: site ID is string -> slot is ignored',
      'param': { 'siteID': 'string' },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_siteid_array: site ID is array with int -> siteID sent to AS as integer',
      'param': { 'siteID': [ 12345 ] },
      'expected': 'pass',
    },
    {
      'testname': 'test_prebid_indexAdapter_siteid_array: site ID is array with quoted int -> siteID sent to AS as integer',
      'param': { 'siteID': [ '12345' ] },
      'expected': 'pass',
    },
    {
      'testname': 'test_prebid_indexAdapter_siteid_array: site ID is array with alpha string -> slot is ignored',
      'param': { 'siteID': [ 'ABC' ] },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_siteid_hash: site ID is hash -> slot is ignored',
      'param': { 'siteID': { 12345: 678 } },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_siteid_zero: site ID is zero integer -> slot is ignored',
      'param': { 'siteID': 0 },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_siteid_negative: site ID is a negative integer -> slot is ignored',
      'param': { 'siteID': -1234 },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_siteid_missing: site ID is missing -> slot is ignored',
      'param': { 'missingSiteID': true },
      'expected': 'invalid',
    },
  ];

  function base_prebid_indexAdapter_siteid (testname, param, expected) {
    it(testname, function() {
      var configuredBids = [
        IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], param),
      ];

      adapter.callBids({ bids: configuredBids });
      if (expected == 'pass') {
        assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
        assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

        var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
        assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

        var impressionObj = requestJSON.r.imp;

        var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
        var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
        for (var i = 0; i < sidMatched.matched.length; i++) {
          var pair = sidMatched.matched[i];

          var actualSiteID = pair.sent.ext.siteID;
          var expectedSiteID = pair.configured.params.siteID;
          assert.equal(actualSiteID, expectedSiteID, 'request ' + pair.name + ' site ID is set to ' + expectedSiteID);
          assert.isNumber(actualSiteID, 'site ID is integer');
        }

        assert.equal(sidMatched.unmatched.configured.length, 0, 'All configured bids are in impression Obj');
        assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
      } else if (expected == 'invalid') {
				// case where callBids throws out request due to missing params
        assert.isFalse(adLoader.loadScript.called, 'No request to AS');
      } else {
        assert.isUndefined(adLoader.loadScript.firstCall.args[0], 'No request to AS');
      }
    });
  };

  for (var i = 0; i < test_indexAdapter_siteid.length; i++) {
    var test = test_indexAdapter_siteid[i];
    base_prebid_indexAdapter_siteid(test.testname, test.param, test.expected);
  }

	// TS: case created by PBA-12
  it('test_prebid_indexAdapter_second_siteid_float: site ID is float -> slot is ignored', function() {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + '1', 'slot_1', [ IndexUtils.supportedSizes[0] ]),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix + '2', 'slot_2', [ IndexUtils.supportedSizes[1] ], { 'siteID': 123.45 }),
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
    assert.equal(sidMatched.matched.length, 1, 'one slot is configured and sent to AS');

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      var actualSiteID = pair.sent.ext.siteID;
      var expectedSiteID = pair.configured.params.siteID;
      assert.equal(actualSiteID, expectedSiteID, 'request ' + pair.name + ' site ID is set to ' + expectedSiteID);
      assert.isNumber(actualSiteID, 'site ID is integer');
    }

    assert.equal(sidMatched.unmatched.configured.length, 1, 'float site ID configured bid is missing in impression Obj');
    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
  });

  var test_indexAdapter_tier2siteid = [
    {
      'testname': 'test_prebid_indexAdapter_tier2siteid_integer: tier2 site ID is integer -> siteID ID sent to AS in integer',
      'param': { 'tier2SiteID': 12345 },
      'expected': 'pass',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier2siteid_quoted_integer: tier2 site ID is quoted integer -> siteID ID sent to AS in integer',
      'param': { 'tier2SiteID': '12345' },
      'expected': 'pass',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier2siteid_float: tier2 site ID is float -> slot is ignored',
      'param': { 'tier2SiteID': 12.345 },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier2siteid_string: tier2 site ID is string -> slot is ignored',
      'param': { 'tier2SiteID': 'string' },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier2siteid_array: tier2 site ID is array -> slot is ignored',
      'param': { 'tier2SiteID': [ 12345 ] },
      'expected': 'pass',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier2siteid_hash: tier2 site ID is hash -> slot is ignored',
      'param': { 'tier2SiteID': { 12345: 678 } },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier2siteid_zero: tier2 site ID is zero integer -> slot is ignored',
      'param': { 'tier2SiteID': 0 },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier2siteid_negative: tier2 site ID is a negative integer -> slot is ignored',
      'param': { 'tier2SiteID': -1234 },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier2siteid_missing: tier2 site ID is missing -> slot is ignored',
      'param': { 'missingtier2SiteID': true },
      'expected': 'fail',
    },
  ];
  function base_prebid_indexAdapter_tier2siteid (testname, param, expected) {
    it(testname, function() {
      var configuredBids = [
        IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], param),
      ];
      adapter.callBids({ bids: configuredBids });

      assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
      assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

      var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
      assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

      var impressionObj = requestJSON.r.imp;
      var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
      var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);

      if (expected == 'pass') {
        assert.equal(sidMatched.matched.length, 2, 'Two slots are configured and sent to AS');

				// check normal site id
        var normalSitePair = sidMatched.matched[0];

        var expectedSlotID = normalSitePair.configured.params.id + '_1';
        assert.equal(normalSitePair.sent.ext.sid, expectedSlotID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedSlotID);
        assert.isString(normalSitePair.sent.ext.sid, 'type of slot ID is string');

        var expectedSiteID = normalSitePair.configured.params.siteID;
        assert.equal(normalSitePair.sent.ext.siteID, expectedSiteID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedSiteID);
        assert.isNumber(normalSitePair.sent.ext.siteID, 'site ID is integer');

				// check tier site id
        var tier2SitePair = sidMatched.matched[1];
        var expectedTierSlotID = 'T1_' + tier2SitePair.configured.params.id + '_1';
        assert.equal(tier2SitePair.sent.ext.sid, expectedTierSlotID, 'request ' + tier2SitePair.name + ' site ID is set to ' + expectedTierSlotID);
        assert.isString(tier2SitePair.sent.ext.sid, 'type of slot ID is string');

        var expectedTierSiteID = tier2SitePair.configured.params.tier2SiteID;
        assert.equal(tier2SitePair.sent.ext.siteID, expectedTierSiteID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedTierSiteID);
        assert.isNumber(tier2SitePair.sent.ext.siteID, 'site ID is integer');

				// check unsent bids
        assert.equal(sidMatched.unmatched.configured.length, 0, 'All configured bids are in impression Obj');
        assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
      } else {
        assert.equal(sidMatched.matched.length, 1, 'one slot is configured and sent to AS');

				// check normal site id
        var normalSitePair = sidMatched.matched[0];

        var expectedSlotID = normalSitePair.configured.params.id + '_1';
        assert.equal(normalSitePair.sent.ext.sid, expectedSlotID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedSlotID);
        assert.isString(normalSitePair.sent.ext.sid, 'type of slot ID is string');

        var expectedSiteID = normalSitePair.configured.params.siteID;
        assert.equal(normalSitePair.sent.ext.siteID, expectedSiteID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedSiteID);
        assert.isNumber(normalSitePair.sent.ext.siteID, 'site ID is integer');

				// check unsent bids
        if (param.missingtier2SiteID) {
          assert.equal(sidMatched.unmatched.configured.length, 0, 'one configured bid is missing in impression Obj');
        } else {
          assert.equal(sidMatched.unmatched.configured.length, 1, 'one configured bid is missing in impression Obj');
        }
        assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
      }
    });
  };

  for (var i = 0; i < test_indexAdapter_tier2siteid.length; i++) {
    var test = test_indexAdapter_tier2siteid[i];
    base_prebid_indexAdapter_tier2siteid(test.testname, test.param, test.expected);
  }

  var test_indexAdapter_tier3siteid = [
    {
      'testname': 'test_prebid_indexAdapter_tier3siteid_integer: tier3 site ID is integer -> siteID ID sent to AS in integer',
      'param': { 'tier3SiteID': 12345 },
      'expected': 'pass',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier3siteid_quoted_integer: tier3 site ID is quoted integer -> siteID ID sent to AS in integer',
      'param': { 'tier3SiteID': '12345' },
      'expected': 'pass',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier3siteid_float: tier3 site ID is float -> slot is ignored',
      'param': { 'tier3SiteID': 12.345 },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier3siteid_string: tier3 site ID is string -> slot is ignored',
      'param': { 'tier3SiteID': 'string' },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier3siteid_array: tier3 site ID is array -> slot is ignored',
      'param': { 'tier3SiteID': [ 12345 ] },
      'expected': 'pass',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier3siteid_hash: tier3 site ID is hash -> slot is ignored',
      'param': { 'tier3SiteID': { 12345: 678 } },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier3siteid_zero: tier3 site ID is zero integer -> slot is ignored',
      'param': { 'tier3SiteID': 0 },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier3siteid_negative: tier3 site ID is a negative integer -> slot is ignored',
      'param': { 'tier3SiteID': -1234 },
      'expected': 'fail',
    },
    {
      'testname': 'test_prebid_indexAdapter_tier3siteid_missing: tier3 site ID is missing -> slot is ignored',
      'param': { 'missingtier3SiteID': true },
      'expected': 'fail',
    },
  ];
  function base_prebid_indexAdapter_tier3siteid (testname, param, expected) {
    it(testname, function() {
      var configuredBids = [
        IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0] ], param),
      ];
      adapter.callBids({ bids: configuredBids });

      assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
      assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

      var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
      assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

      var impressionObj = requestJSON.r.imp;
      var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
      var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);

      if (expected == 'pass') {
        assert.equal(sidMatched.matched.length, 2, 'Two slots are configured and sent to AS');

				// check normal site id
        var normalSitePair = sidMatched.matched[0];

        var expectedSlotID = normalSitePair.configured.params.id + '_1';
        assert.equal(normalSitePair.sent.ext.sid, expectedSlotID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedSlotID);
        assert.isString(normalSitePair.sent.ext.sid, 'type of slot ID is string');

        var expectedSiteID = normalSitePair.configured.params.siteID;
        assert.equal(normalSitePair.sent.ext.siteID, expectedSiteID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedSiteID);
        assert.isNumber(normalSitePair.sent.ext.siteID, 'site ID is integer');

				// check tier site id
        var tier3SitePair = sidMatched.matched[1];
        var expectedTierSlotID = 'T2_' + tier3SitePair.configured.params.id + '_1';
        assert.equal(tier3SitePair.sent.ext.sid, expectedTierSlotID, 'request ' + tier3SitePair.name + ' site ID is set to ' + expectedTierSlotID);
        assert.isString(tier3SitePair.sent.ext.sid, 'type of slot ID is string');

        var expectedTierSiteID = tier3SitePair.configured.params.tier3SiteID;
        assert.equal(tier3SitePair.sent.ext.siteID, expectedTierSiteID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedTierSiteID);
        assert.isNumber(tier3SitePair.sent.ext.siteID, 'site ID is integer');

				// check unsent bids
        assert.equal(sidMatched.unmatched.configured.length, 0, 'All configured bids are in impression Obj');
        assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
      } else {
        assert.equal(sidMatched.matched.length, 1, 'one slot is configured and sent to AS');

				// check normal site id
        var normalSitePair = sidMatched.matched[0];

        var expectedSlotID = normalSitePair.configured.params.id + '_1';
        assert.equal(normalSitePair.sent.ext.sid, expectedSlotID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedSlotID);
        assert.isString(normalSitePair.sent.ext.sid, 'type of slot ID is string');

        var expectedSiteID = normalSitePair.configured.params.siteID;
        assert.equal(normalSitePair.sent.ext.siteID, expectedSiteID, 'request ' + normalSitePair.name + ' site ID is set to ' + expectedSiteID);
        assert.isNumber(normalSitePair.sent.ext.siteID, 'site ID is integer');

				// check unsent bids
        if (param.missingtier3SiteID) {
          assert.equal(sidMatched.unmatched.configured.length, 0, 'one configured bid is missing in impression Obj');
        } else {
          assert.equal(sidMatched.unmatched.configured.length, 1, 'one configured bid is missing in impression Obj');
        }
        assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
      }
    });
  };

  for (var i = 0; i < test_indexAdapter_tier3siteid.length; i++) {
    var test = test_indexAdapter_tier3siteid[i];
    base_prebid_indexAdapter_tier3siteid(test.testname, test.param, test.expected);
  }

  it('test_prebid_indexAdapter_siteID_multiple: multiple slots have same siteIDs -> all slots in ad server request with the same site IDs', function() {
    var first_slot = {
      slotName: 'slot1',
      siteID: 111111,
    };
    var second_slot = {
      slotName: 'slot2',
      siteID: 111111, // same as first slot
    };

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, first_slot['slotName'], [ IndexUtils.supportedSizes[0] ], { siteID: first_slot['siteID'] }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, second_slot['slotName'], [ IndexUtils.supportedSizes[1] ], { siteID: second_slot['siteID'] }),
    ];

    adapter.callBids({ bids: configuredBids });
    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      var expectedSiteID = pair.configured.params.siteID;
      var actualSiteID = pair.sent.ext.siteID;
      assert.equal(actualSiteID, expectedSiteID, 'request ' + pair.name + ' site ID is set to ' + expectedSiteID);
      assert.isNumber(actualSiteID, 'site ID is number');
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 0, 'All configured bids are in impression Obj');
  });

  it('test_prebid_indexAdapter_siteID_different: multiple slots have different siteIDs -> all slots in ad server request with the different site IDs', function() {
    var first_slot = {
      slotName: 'slot1',
      siteID: 111111,
    };
    var second_slot = {
      slotName: 'slot2',
      siteID: 222222,
    };

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, first_slot['slotName'], [ IndexUtils.supportedSizes[0] ], { siteID: first_slot['siteID'] }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, second_slot['slotName'], [ IndexUtils.supportedSizes[1] ], { siteID: second_slot['siteID'] }),
    ];

    adapter.callBids({ bids: configuredBids });
    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      var expectedSiteID = pair.configured.params.siteID;
      var actualSiteID = pair.sent.ext.siteID;
      assert.equal(actualSiteID, expectedSiteID, 'request ' + pair.name + ' site ID is set to ' + expectedSiteID);
      assert.isNumber(actualSiteID, 'site ID is number');
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 0, 'All configured bids are in impression Obj');
  });

  it('test_prebid_indexAdapter_size_singleArr: single sized array -> width and height in integer in request', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', IndexUtils.supportedSizes[0])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');

    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.configured.length, 0, 'All configured bids are in impression Obj');
    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
  });

  it('test_prebid_indexAdapter_size_singleDim: missing width/height -> size is ignored, no ad server request for bad size', function () {
    var oneDimSize = [728];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0], oneDimSize, IndexUtils.supportedSizes[1] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, oneDimSize, 'configured bid not in impression obj size width is' + JSON.stringify(oneDimSize));
  });

  it('test_prebid_indexAdapter_size_missing: missing size -> slot is ignored, no ad server request', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isUndefined(adLoader.loadScript.firstCall.args[0], 'no request made to AS');
  });

  it('test_prebid_indexAdapter_size_negativeWidth: negative width -> size is ignored, no ad server request for bad size', function () {
    var invalidSize = [-728, 90];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0], invalidSize, IndexUtils.supportedSizes[1] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, invalidSize, 'configured bid not in impression obj size width is' + JSON.stringify(invalidSize));
  });

  it('test_prebid_indexAdapter_size_negativeHeight: negative height -> size is ignored, no ad server request for bad size', function () {
    var invalidSize = [728, -90];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0], invalidSize, IndexUtils.supportedSizes[1] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, invalidSize, 'configured bid not in impression obj size width is' + JSON.stringify(invalidSize));
  });

  it('test_prebid_indexAdapter_size_quoted: height and width quoted -> invalid size, no ad server request for invalid size', function () {
    var otherSize = ['300', '250'];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0], otherSize, IndexUtils.supportedSizes[1] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid));
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 0, '0 configured bid is not in impression Obj');
  });

  it('test_prebid_indexAdapter_size_float: height and width float -> invalid size, no ad server request for invalid size ', function () {
    var otherSize = [300.1, 250];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0], otherSize, IndexUtils.supportedSizes[1] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid));
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, otherSize, 'configured bid not in impression obj size width is' + JSON.stringify(otherSize));
  });

  it('test_prebid_indexAdapter_size_string_1_pba23: height and width string -> invalid size, no ad server request for invalid size ', function () {
    var otherSize = [String(IndexUtils.supportedSizes[0][0]), String(IndexUtils.supportedSizes[0][1])];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[1], otherSize, IndexUtils.supportedSizes[2] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid));
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 0, 'all configured bids are in impression Obj');
  });

  it('test_prebid_indexAdapter_size_string_2: whole size is string -> invalid size, no ad server request for invalid size ', function () {
    var otherSize = 'gallery';
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0], otherSize, IndexUtils.supportedSizes[1] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid));
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, otherSize, 'configured bid not in impression obj size width is' + JSON.stringify(otherSize));
  });

  it('test_prebid_indexAdapter_size_string_3: entire size structure is string -> no ad server request since size is invalid', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', 'gallery')
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isUndefined(adLoader.loadScript.firstCall.args[0], 'no request made to AS');
  });

  it('test_prebid_indexAdapter_size_hash_1: height or width hash -> invalid size, no ad server request for invalid size ', function () {
    var otherSize = [{728: 1}, 90];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0], otherSize, IndexUtils.supportedSizes[1] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid));
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, otherSize, 'configured bid not in impression obj size width is' + JSON.stringify(otherSize));
  });

  it('test_prebid_indexAdapter_size_hash_2: whole size hash -> invalid size, no ad server request for invalid size ', function () {
    var otherSize = {728: 1, 90: 1};
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0], otherSize, IndexUtils.supportedSizes[1] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid));
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, otherSize, 'configured bid not in impression obj size width is' + JSON.stringify(otherSize));
  });

  it('test_prebid_indexAdapter_size_hash_3: entire size structure is hash -> no ad server request since size is invalid', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', {728: 90})
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isUndefined(adLoader.loadScript.firstCall.args[0], 'no request made to AS');
  });

  it('test_prebid_indexAdapter_size_swap: swap size and width for valid so now its invalid -> unsupportedsize, no ad server request for unsupported size ', function () {
    var otherSize = [90, 728];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0], otherSize, IndexUtils.supportedSizes[1] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid));
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, otherSize, 'configured bid not in impression obj size width is' + JSON.stringify(otherSize));
  });

  it('test_prebid_indexAdapter_size_sameWidth: same width for all sizes in a slot -> ad server request only for supported sizes', function () {
    var valid1Size = [300, 250];
    var otherSize = [300, 999];
    var valid2Size = [300, 600];

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ valid1Size, otherSize, valid2Size ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid));
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, otherSize, 'configured bid not in impression obj size width is' + JSON.stringify(otherSize));
  });

  it('test_prebid_indexAdapter_size_sameHeight: same height for all sizes in a slot -> ad server request only for supported sizes', function () {
    var valid1Size = [120, 600];
    var otherSize = [999, 600];
    var valid2Size = [300, 600];

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ valid1Size, otherSize, valid2Size ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid));
    var sidMatched = IndexUtils.matchBidsOnSize(expandedBids, impressionObj);

    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.equal(sidMatched.unmatched.configured.length, 1, '1 configured bid is not in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].size, otherSize, 'configured bid not in impression obj size width is' + JSON.stringify(otherSize));
  });

  it('test_prebid_indexAdapter_request_sizeID_validation_1: multiple prebid size slot, index slots with size for all prebid slots, 1 slot is not configured properly -> all size in AS request, except misconfigured slot', function () {
    var slotID_1 = 52;
    var slotID_2 = 53;
    var slotSizes_1 = IndexUtils.supportedSizes[0];
    var slotSizes_2 = IndexUtils.supportedSizes[1];

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, slotID_1, [ slotSizes_1, slotSizes_2 ], { slotSize: [ 728, 'invalid' ] }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, slotID_2, [ slotSizes_1, slotSizes_2 ], { slotSize: slotSizes_2 })
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');

    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;
    assert.equal(impressionObj.length, 1, '1 slot is made in the request');

    assert.equal(impressionObj[0].banner.w, slotSizes_2[0], 'the width made in the request matches with request: ' + slotSizes_2[0]);
    assert.equal(impressionObj[0].banner.h, slotSizes_2[1], 'the height made in the request matches with request: ' + slotSizes_2[1]);
    assert.equal(impressionObj[0].ext.sid, slotID_2, 'slotID in the request matches with configuration: ' + slotID_2);
    assert.equal(impressionObj[0].ext.siteID, IndexUtils.DefaultSiteID, 'siteID in the request matches with request: ' + IndexUtils.DefaultSiteID);
  });
});
