import { getBidRequests, getBidResponses, getSlotTargeting} from 'test/fixtures/fixtures';

var assert = require('chai').assert;

var prebid = require('src/prebid');
var utils = require('src/utils');
var bidmanager = require('src/bidmanager');

var bidResponses = require('test/fixtures/bid-responses.json');
var targetingMap = require('test/fixtures/targeting-map.json');
var config = require('test/fixtures/config.json');
var targetingString = 'hb_bidder=rubicon&hb_adid=148018fe5e&hb_pb=10.00&foobar=300x250&';
var spyLogMessage = sinon.spy(utils, 'logMessage');

pbjs = pbjs || {};
pbjs._bidsRequested = getBidRequests();
pbjs._bidsReceived = getBidResponses();

var Slot = function Slot(elementId, pathId) {
  var slot = {
    getSlotElementId: function getSlotElementId() {
      return elementId;
    },

    getAdUnitPath: function getAdUnitPath() {
      return pathId;
    },

    setTargeting: function setTargeting(key, value) {
    },

    getTargeting: function getTargeting() {
      return [{ testKey: ['a test targeting value'] }];
    },

    getTargetingKeys: function getTargetingKeys() {
      return ['testKey'];
    }
  };
  slot.spySetTargeting = sinon.spy(slot, 'setTargeting');
  return slot;
};

var createSlotArray = function createSlotArray() {
  return [
    new Slot(config.adUnitElementIDs[0], config.adUnitCodes[0]),
    new Slot(config.adUnitElementIDs[1], config.adUnitCodes[1]),
    new Slot(config.adUnitElementIDs[2], config.adUnitCodes[2])
  ];
};

window.googletag = {
  _slots: [],
  pubads: function () {
    var self = this;
    return {
      getSlots: function () {
        return self._slots;
      },

      setSlots: function (slots) {
        self._slots = slots;
      }
    };
  }
};

bidmanager.pbBidResponseByPlacement = bidResponses;

after(function () {
  utils.logMessage.restore();
});

describe('Unit: Prebid Module', function () {

  describe('getAdserverTargetingForAdUnitCode', function () {
    it('should return targeting info as an object', function () {
      var result = pbjs.getAdserverTargetingForAdUnitCode(config.adUnitCodes[0]);
      assert.deepEqual(result[config.adUnitCodes[0]], targetingMap[config.adUnitCodes[0]], 'returns expected targeting info object');
    });
  });

  describe('getAdServerTargeting', function () {
    it('should return current targeting data for slots', function () {
      const targeting = pbjs.getAdserverTargeting();
      const expected = getSlotTargeting();
      assert.deepEqual(targeting[0], expected, 'targeting ok');
    });
  });

  describe('getBidResponses', function () {
    it('should return expected bid responses when not passed an adunitCode', function () {
      var result = pbjs.getBidResponses();
      var compare = getBidResponses();

      assert.deepEqual(result, compare, 'expected bid responses are returned');
    });
  });

  describe('getBidResponsesForAdUnitCode', function () {
    it('should return bid responses as expected', function () {
      const adUnitCode = '/19968336/header-bid-tag-0';
      const result = pbjs.getBidResponsesForAdUnitCode(adUnitCode);
      const compare = getBidResponses().filter(bid => bid.adUnitCode === adUnitCode);
      assert.deepEqual(result, compare, 'expected id responses for ad unit code are returned');
    });
  });

  describe('setTargetingForGPTAsync', function () {

    it('should set targeting when passed an array of ad unit codes', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      pbjs.setTargetingForGPTAsync(config.adUnitCodes);
      assert.deepEqual(slots[0].spySetTargeting.args[0][1], {
        testKey: ['a test targeting value']
      }, 'slot.setTargeting was called with expected key/values');

      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', ''), 'clears hb_bidder param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', ''), 'clears hb_adid param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', ''), 'clears hb_pb param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', ''), 'clears foobar param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', 'rubicon'), 'sets hb_bidder param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', '148018fe5e'), 'sets hb_adid param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', '10.00'), 'sets hb_pb param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', '300x250'), 'sets foobar param');
    });

    it('should set targeting from googletag data', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      pbjs.setTargetingForGPTAsync();
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', ''), 'clears hb_bidder param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', ''), 'clears hb_adid param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', ''), 'clears hb_pb param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', ''), 'clears foobar param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', 'rubicon'), 'sets hb_bidder param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', '148018fe5e'), 'sets hb_adid param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', '10.00'), 'sets hb_pb param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', '300x250'), 'sets foobar param');
    });

    it('Calling enableSendAllBids should set targeting to include standard keys with bidder' +
      ' append to key name', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      pbjs.enableSendAllBids();
      pbjs.setTargetingForGPTAsync();
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', ''), 'clears hb_bidder param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', ''), 'clears hb_adid param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', ''), 'clears hb_pb param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', ''), 'clears foobar param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', 'rubicon'), 'sets hb_bidder param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', '148018fe5e'), 'sets hb_adid param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', '10.00'), 'sets hb_pb param');
      //assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', '300x250'), 'sets foobar param');
      //assert.ok(slots[0].spySetTargeting.calledWith('hb_bidder_rubicon', ''), 'sets' +
      //  ' hb_bidder_rubicon param');
      //assert.ok(slots[0].spySetTargeting.calledWith('hb_adid_rubicon', ''), 'sets hb_adid_rubicon param');
      //assert.ok(slots[0].spySetTargeting.calledWith('hb_pb_rubicon', ''), 'sets hb_pb_rubicon' +
      //  ' param');
      //assert.ok(!slots[0].spySetTargeting.calledWithExactly('foobar_rubicon', ''), 'does' +
      //  ' not set custom keys with bidder in key name for foobar_rubicon param');
    });
  });

  describe('allBidsAvailable', function () {
    it('should call bidmanager.allBidsBack', function () {
      var spyAllBidsBack = sinon.spy(bidmanager, 'bidsBackAll');

      pbjs.allBidsAvailable();
      assert.ok(spyAllBidsBack.called, 'called bidmanager.allBidsBack');
      bidmanager.bidsBackAll.restore();
    });
  });
});
