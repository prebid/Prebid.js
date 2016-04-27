var assert = require('chai').assert;

var prebid = require('src/prebid');
var utils = require('src/utils');
var bidmanager = require('src/bidmanager');

var bidResponses = require('test/fixtures/bid-responses.json');
var targetingMap = require('test/fixtures/targeting-map.json');
var config = require('test/fixtures/config.json');
var targetingString = 'hb_bidder=rubicon&hb_adid=148018fe5e&hb_pb=10.00&foobar=300x250&';
var spyLogMessage = sinon.spy(utils, 'logMessage');

var Slot = function Slot(elementId, pathId) {
  var slot = {
    getSlotElementId: function getSlotElementId() {
      return elementId;
    },

    getAdUnitPath: function getAdUnitPath() {
      return pathId;
    },

    setTargeting: function setTargeting(key, value) {
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
  describe('getAdserverTargetingForAdUnitCodeStr', function () {
    it('should return targeting info as a string', function () {
      var result = pbjs.getAdserverTargetingForAdUnitCodeStr(config.adUnitCodes[0]);
      assert.equal(result, targetingString, 'returns expected string of ad targeting info');
    });

    it('should log message if adunitCode param is falsey', function () {
      var result = pbjs.getAdserverTargetingForAdUnitCodeStr();
      assert.ok(spyLogMessage.calledWith('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode'), 'expected message was logged');
      assert.equal(result, undefined, 'result is undefined');
    });
  });

  describe('getAdserverTargetingForAdUnitCode', function () {
    it('should return targeting info as an object', function () {
      var result = pbjs.getAdserverTargetingForAdUnitCode(config.adUnitCodes[0]);
      assert.deepEqual(result, targetingMap[config.adUnitCodes[0]], 'returns expected targeting info object');
    });

    it('should return full targeting map object if adunitCode is falsey', function () {
      var result = pbjs.getAdserverTargetingForAdUnitCode();
      assert.deepEqual(result, targetingMap, 'the complete targeting map object is returned');
    });
  });

  describe('getAdServerTargeting', function () {
    it('should call getAdServerTargetingForAdUnitCode', function () {
      var spyGetAdServerTargetingForAdUnitCode = sinon.spy(pbjs, 'getAdserverTargetingForAdUnitCode');
      pbjs.getAdserverTargeting();
      assert.ok(spyGetAdServerTargetingForAdUnitCode.calledOnce, 'called the expected function');
      pbjs.getAdserverTargetingForAdUnitCode.restore();
    });
  });

  describe('getBidResponses', function () {
    it('should return expected bid responses when passed an adunitCode', function () {
      var result = pbjs.getBidResponses(config.adUnitCodes[0]);
      var compare = require('test/fixtures/bid-responses-cloned.json')[config.adUnitCodes[0]];

      assert.deepEqual(result, compare);
    });

    it('should return expected bid responses when not passed an adunitCode', function () {
      var result = pbjs.getBidResponses();
      var compare = require('test/fixtures/bid-responses-cloned.json');

      assert.deepEqual(result, compare);
    });
  });

  describe('getBidResponsesForAdUnitCode', function () {
    it('should call getBidResponses with passed in adUnitCode', function () {
      var adUnitCode = 'xyz';
      var spyGetBidResponses = sinon.spy(pbjs, 'getBidResponses');

      pbjs.getBidResponsesForAdUnitCode(adUnitCode);
      assert.ok(spyGetBidResponses.calledWith(adUnitCode));
      pbjs.getBidResponses.restore();
    });
  });

  describe('setTargetingForGPTAsync', function () {
    it('should log a message when googletag functions not defined', function () {
      var pubads = window.googletag.pubads;

      window.googletag.pubads = undefined;
      pbjs.setTargetingForAdUnitsGPTAsync();
      spyLogMessage.calledWith('window.googletag is not defined on the page');
      window.googletag.pubads = pubads;
    });

    it('should set targeting when passed an array of ad unit codes', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      pbjs.setTargetingForGPTAsync(config.adUnitCodes);
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', ''), 'clears hb_bidder param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', ''), 'clears hb_adid param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', ''), 'clears hb_pb param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', ''), 'clears foobar param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', 'rubicon'), 'sets hb_bidder param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', '148018fe5e'), 'sets hb_adid param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', '10.00'), 'sets hb_pb param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', '300x250'), 'sets foobar param');
    });

    it('should set targeting from googletag data', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      pbjs.setTargetingForGPTAsync();
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', ''), 'clears hb_bidder param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', ''), 'clears hb_adid param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', ''), 'clears hb_pb param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', ''), 'clears foobar param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', 'rubicon'), 'sets hb_bidder param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', '148018fe5e'), 'sets hb_adid param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', '10.00'), 'sets hb_pb param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', '300x250'), 'sets foobar param');
    });

    it('Calling enableSendAllBids should set targeting to include standard keys with bidder' +
      ' append to key name', function() {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      pbjs.enableSendAllBids();
      pbjs.setTargetingForGPTAsync();
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', ''), 'clears hb_bidder param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', ''), 'clears hb_adid param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', ''), 'clears hb_pb param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', ''), 'clears foobar param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_bidder', 'rubicon'), 'sets hb_bidder param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_adid', '148018fe5e'), 'sets hb_adid param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('hb_pb', '10.00'), 'sets hb_pb param');
      assert.ok(slots[0].spySetTargeting.calledWithExactly('foobar', '300x250'), 'sets foobar param');
      assert.ok(slots[0].spySetTargeting.calledWith('hb_bidder_rubicon', ''), 'sets' +
        ' hb_bidder_rubicon param');
      assert.ok(slots[0].spySetTargeting.calledWith('hb_adid_rubicon', ''), 'sets hb_adid_rubicon param');
      assert.ok(slots[0].spySetTargeting.calledWith('hb_pb_rubicon', ''), 'sets hb_pb_rubicon' +
        ' param');
      assert.ok(!slots[0].spySetTargeting.calledWithExactly('foobar_rubicon', ''), 'does' +
        ' not set custom keys with bidder in key name for foobar_rubicon param');
    });
  });

  describe('allBidsAvailable', function () {
    it('should call bidmanager.allBidsBack', function () {
      var spyAllBidsBack = sinon.spy(bidmanager, 'allBidsBack');

      pbjs.allBidsAvailable();
      assert.ok(spyAllBidsBack.called, 'called bidmanager.allBidsBack');
      bidmanager.allBidsBack.restore();
    });
  });
});
