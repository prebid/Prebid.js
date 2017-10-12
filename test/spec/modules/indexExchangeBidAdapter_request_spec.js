import Adapter from 'modules/indexExchangeBidAdapter';
import bidManager from 'src/bidmanager';
import adLoader from 'src/adloader';
import * as url from 'src/url';

var assert = require('chai').assert;
var IndexUtils = require('../../helpers/index_adapter_utils.js');
var HeaderTagRequest = '/cygnus';
var SlotThreshold = 20;
var ADAPTER_CODE = 'indexExchange';

window.pbjs = window.pbjs || {};

describe('indexExchange adapter - Request', function () {
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
    sandbox.stub(bidManager, 'addBidResponse');
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('test_prebid_indexAdapter_parameter_x3: prebid sends AS request -> x3 parameter does not exist in the request', function () {
    var configuredBids = IndexUtils.createBidSlots();
    adapter.callBids({ bids: configuredBids });

    assert.notInclude(adLoader.loadScript.firstCall.args[0], 'x3=', 'x3 parameter is not in AS request');
  });

  it('test_prebid_indexAdapter_request_1_1: single slot with single size -> single request object for the slot', function () {
    var configuredBids = IndexUtils.createBidSlots();
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
    assert.isString(requestJSON.r.id, 'ID is string');
  });

  it('test_prebid_indexAdapter_request_1_1: single slot with single size -> single request object for the slot', function () {
    var configuredBids = IndexUtils.createBidSlots();
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

  it('test_prebid_indexAdapter_request_1_2: single slot with unsupported single size -> indexExchange does not participate in auction', function () {
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.unsupportedSizes[0] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isFalse(adLoader.loadScript.called, 'no request made to AS');

    var adapterResponse = {};
    for (var i = 0; i < bidManager.addBidResponse.callCount; i++) {
      var adUnitCode = bidManager.addBidResponse.getCall(i).args[0];
      var bid = bidManager.addBidResponse.getCall(i).args[1];

      if (typeof adapterResponse[adUnitCode] === 'undefined') {
        adapterResponse[adUnitCode] = [];
      };
      adapterResponse[adUnitCode].push(bid);
    };
    assert.deepEqual(Object.keys(adapterResponse), [IndexUtils.DefaultPlacementCodePrefix], 'bid response from placement code that is configured');
    assert.equal(adapterResponse[IndexUtils.DefaultPlacementCodePrefix].length, 1, 'one response back returned for placement ' + IndexUtils.DefaultPlacementCodePrefix);
    assert.equal(adapterResponse[IndexUtils.DefaultPlacementCodePrefix][0].bidderCode, ADAPTER_CODE, "bidder code match with adapter's name");
    assert.equal(adapterResponse[IndexUtils.DefaultPlacementCodePrefix][0].statusMessage, 'Bid returned empty or error response', 'pass on bid message');
  });

  it('test_prebid_indexAdapter_request_2_1: single slot with all supported multiple sizes -> multiple request objects for the slot', function () {
    var configuredBids = IndexUtils.createBidSlots(1, 5);
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

  it('test_prebid_indexAdapter_request_2_2: single slot with all unsupported multiple sizes -> no request objects for the slot', function () {
    var isSetExpectedBidsCountCalled = false;

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.unsupportedSizes[0], IndexUtils.unsupportedSizes[1], IndexUtils.unsupportedSizes[2] ])
    ];
    adapter.callBids({ bids: configuredBids });

    assert.isFalse(adLoader.loadScript.called, 'no request made to AS');
  });

  it('test_prebid_indexAdapter_request_2_3: single slot with supported, unsupportrd, supported sizes -> only the supported size request objects for the slot', function () {
    var unsupportedSize = IndexUtils.unsupportedSizes[0];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ IndexUtils.supportedSizes[0], unsupportedSize, IndexUtils.supportedSizes[1] ])
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
  });

  it('test_prebid_indexAdapter_request_2_4: single slot with unsupported, supportrd, unsupported sizes -> only the supported size request objects for the slot', function () {
    var unsupportedSize1 = IndexUtils.unsupportedSizes[0];
    var unsupportedSize2 = IndexUtils.unsupportedSizes[1];
    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, 'slot_1', [ unsupportedSize1, IndexUtils.supportedSizes[1], unsupportedSize2 ])
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
    assert.equal(sidMatched.unmatched.configured[1].size, unsupportedSize2, 'configured bid not in impression obj size width is' + JSON.stringify(unsupportedSize2));
  });

  it('test_prebid_indexAdapter_request_3: multiple slots with single size below allowed slot threshold -> request for all the slots', function () {
    var configuredBids = IndexUtils.createBidSlots(10);
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

  it('test_prebid_indexAdapter_request_4: multiple slots with single size at exact allowed slot threshold -> request for all the slots', function () {
    var configuredBids = IndexUtils.createBidSlots(SlotThreshold);
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

  it('test_prebid_indexAdapter_request_5: multiple slots with single size exceed allowed slot threshold -> request for all the slots', function () {
    var requestSlotNumber = SlotThreshold + 1;
    var configuredBids = IndexUtils.createBidSlots(requestSlotNumber);
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

  it('test_prebid_indexAdapter_request_6: threshold valid + non valid which exceeds threshold -> 1 Ad Server request with supported sizes only', function () {
    var unsupportedSizeCount = 1;
    var requestSlotNumber = SlotThreshold;
    var configuredBids = IndexUtils.createBidSlots(requestSlotNumber);
    // add additional unsupported sized slot
    var invalidSlotPlacement = IndexUtils.DefaultPlacementCodePrefix + 'invalid';
    var invalidSlotID = 'slot-invalid';
    configuredBids.push(IndexUtils.createBidSlot(invalidSlotPlacement, invalidSlotID, [ IndexUtils.unsupportedSizes[0] ]));

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

    assert.equal(sidMatched.unmatched.configured.length, unsupportedSizeCount, unsupportedSizeCount + ' of configured bids is missing in impression Obj');
    assert.equal(sidMatched.unmatched.configured[0].placementCode, invalidSlotPlacement, "missing slot's placement code is " + invalidSlotPlacement);
    assert.equal(sidMatched.unmatched.configured[0].params.id, invalidSlotID, "missing slot's slotID is " + invalidSlotID);

    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
  });

  it('test_prebid_indexAdapter_request_7: multiple sizes with slots that exceeds max threshold requests -> 1 Ad Server request with supported sizes only', function () {
    var requestSlotNumber = SlotThreshold;
    var requestSizeNumber = 2;
    var configuredBids = IndexUtils.createBidSlots(requestSlotNumber, requestSizeNumber);
    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');
    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = configuredBids.map(bid => IndexUtils.expandSizes(bid))
    var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);

    assert.equal(sidMatched.matched.length, requestSlotNumber * requestSizeNumber, 'All slots each with multiple sizes are in AS request');
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];
      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.configured.length, 0, 'All configured bids are in impression Obj');
    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
  });

  it('test_prebid_indexAdapter_request_sizeID_1: 1 prebid size slot, 1 index slot with size -> one slot in AS request 1 no size ID', function () {
    var slotID = 52;
    var slotSizes = IndexUtils.supportedSizes[0];

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, slotID, [ slotSizes ], { slotSize: slotSizes })
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');

    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    assert.equal(impressionObj.length, 1, '1 slot is made in the request');
    assert.equal(impressionObj[0].banner.w, slotSizes[0], 'the width made in the request matches with request: ' + slotSizes[0]);
    assert.equal(impressionObj[0].banner.h, slotSizes[1], 'the height made in the request matches with request: ' + slotSizes[1]);
    assert.equal(impressionObj[0].ext.sid, slotID, 'slotID in the request matches with configuration: ' + slotID);
    assert.equal(impressionObj[0].ext.siteID, IndexUtils.DefaultSiteID, 'siteID in the request matches with request: ' + IndexUtils.DefaultSiteID);
  });

  it('test_prebid_indexAdapter_request_sizeID_2: multiple prebid size slot, 1 index slot with size -> one slot in AS request 1 no size ID', function () {
    var slotID = 52;
    var slotSizes = IndexUtils.supportedSizes[0];

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, slotID, [ slotSizes, IndexUtils.supportedSizes[1] ], { slotSize: slotSizes })
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');

    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    assert.equal(impressionObj.length, 1, '1 slot is made in the request');
    assert.equal(impressionObj[0].banner.w, slotSizes[0], 'the width made in the request matches with request: ' + slotSizes[0]);
    assert.equal(impressionObj[0].banner.h, slotSizes[1], 'the height made in the request matches with request: ' + slotSizes[1]);
    assert.equal(impressionObj[0].ext.sid, slotID, 'slotID in the request matches with configuration: ' + slotID);
    assert.equal(impressionObj[0].ext.siteID, IndexUtils.DefaultSiteID, 'siteID in the request matches with request: ' + IndexUtils.DefaultSiteID);
  });

  it('test_prebid_indexAdapter_request_sizeID_3: multiple prebid size slot, index slots with size for all prebid slots -> all size in AS request, no size ID', function () {
    var slotID_1 = 52;
    var slotID_2 = 53;
    var slotSizes_1 = IndexUtils.supportedSizes[0];
    var slotSizes_2 = IndexUtils.supportedSizes[1];

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, slotID_1, [ slotSizes_1, slotSizes_2 ], { slotSize: slotSizes_1 }),
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, slotID_2, [ slotSizes_1, slotSizes_2 ], { slotSize: slotSizes_2 })
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isTrue(adLoader.loadScript.called, 'loadScript get request');

    assert.include(adLoader.loadScript.firstCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.firstCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;
    assert.equal(impressionObj.length, 2, '2 slot is made in the request');
    assert.equal(impressionObj[0].banner.w, slotSizes_1[0], 'the width made in the request matches with request: ' + slotSizes_1[0]);
    assert.equal(impressionObj[0].banner.h, slotSizes_1[1], 'the height made in the request matches with request: ' + slotSizes_1[1]);
    assert.equal(impressionObj[0].ext.sid, slotID_1, 'slotID in the request matches with configuration: ' + slotID_1);
    assert.equal(impressionObj[0].ext.siteID, IndexUtils.DefaultSiteID, 'siteID in the request matches with request: ' + IndexUtils.DefaultSiteID);

    assert.equal(impressionObj[1].banner.w, slotSizes_2[0], 'the width made in the request matches with request: ' + slotSizes_2[0]);
    assert.equal(impressionObj[1].banner.h, slotSizes_2[1], 'the height made in the request matches with request: ' + slotSizes_2[1]);
    assert.equal(impressionObj[1].ext.sid, slotID_2, 'slotID in the request matches with configuration: ' + slotID_2);
    assert.equal(impressionObj[1].ext.siteID, IndexUtils.DefaultSiteID, 'siteID in the request matches with request: ' + IndexUtils.DefaultSiteID);
  });

  it('test_prebid_indexAdapter_request_sizeID_4: multiple prebid size slot, 1 index slot but size not in prebid defined size git -> no AS requset', function () {
    var slotID = 52;
    var slotSizes = IndexUtils.unsupportedSizes[0];

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, slotID, [ IndexUtils.supportedSizes[0] ], { slotSize: slotSizes })
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isFalse(adLoader.loadScript.called, 'no request made to AS');
  });

  it('test_prebid_indexAdapter_request_sizeID_5: multiple prebid size slot, 1 index slot but size not defined in slot -> no AS requset', function () {
    var slotID = 52;
    var slotSizes = IndexUtils.supportedSizes[1];

    var configuredBids = [
      IndexUtils.createBidSlot(IndexUtils.DefaultPlacementCodePrefix, slotID, [ IndexUtils.supportedSizes[0] ], { slotSize: slotSizes })
    ];

    adapter.callBids({ bids: configuredBids });

    assert.isFalse(adLoader.loadScript.called, 'no request made to AS');
  });

  it('test_prebid_indexAdapter_request_different_type_adUnits: both display and video slots -> 2 Ad Server requests, 1 for display and 1 for video', function() {
    var videoConfig = {
      'siteID': 6,
      'playerType': 'HTML5',
      'protocols': ['VAST2', 'VAST3'],
      'maxduration': 15
    }
    var videoWidth = 640;
    var videoHeight = 480;
    var configuredBids = IndexUtils.createBidSlots(2);
    configuredBids[1].params.video = Object.assign({}, videoConfig);
    configuredBids[1].mediaType = 'video';
    configuredBids[1].sizes[0] = videoWidth;
    configuredBids[1].sizes[1] = videoHeight;

    adapter.callBids({ bids: configuredBids });

    sinon.assert.calledTwice(adLoader.loadScript);

    // Check request for display ads
    assert.include(adLoader.loadScript.secondCall.args[0], HeaderTagRequest, 'request is headertag request');

    var requestJSON = IndexUtils.parseIndexRequest(adLoader.loadScript.secondCall.args[0]);
    assert.isNotNull(requestJSON.r.imp, 'headertag request include impression object');

    var impressionObj = requestJSON.r.imp;

    var expandedBids = [IndexUtils.expandSizes(configuredBids[0])];
    var sidMatched = IndexUtils.matchBidsOnSID(expandedBids, impressionObj);
    for (var i = 0; i < sidMatched.matched.length; i++) {
      var pair = sidMatched.matched[i];

      assert.equal(pair.sent.banner.w, pair.configured.size[0], 'request ' + pair.name + ' width is set to ' + pair.configured.size[0]);
      assert.equal(pair.sent.banner.h, pair.configured.size[1], 'request ' + pair.name + ' width is set to ' + pair.configured.size[1]);
      assert.equal(pair.sent.ext.siteID, pair.configured.params.siteID, 'request ' + pair.name + ' siteID is set to ' + pair.configured.params.siteID);
    }

    assert.equal(sidMatched.unmatched.configured.length, 0, 'All configured bids are in impression Obj');
    assert.equal(sidMatched.unmatched.sent.length, 0, 'All bids in impression object are from configured bids');
    assert.isString(requestJSON.r.id, 'ID is string');

    // Check request for video ads
    let cygnusRequestUrl = url.parse(encodeURIComponent(adLoader.loadScript.firstCall.args[0]));
    cygnusRequestUrl.search.r = JSON.parse(decodeURIComponent(cygnusRequestUrl.search.r));

    expect(cygnusRequestUrl.search.r.imp[0].ext.siteID).to.equal(videoConfig.siteID);
    expect(cygnusRequestUrl.search.r.imp[0].video.maxduration).to.equal(videoConfig.maxduration);
    expect(cygnusRequestUrl.search.r.imp[0].video.w).to.equal(videoWidth);
    expect(cygnusRequestUrl.search.r.imp[0].video.h).to.equal(videoHeight);
  });
});
