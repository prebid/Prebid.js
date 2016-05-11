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

  describe('renderAd', function () {
    var bidId = 1;
    var doc = {};
    var adResponse = {};
    var spyLogError = null;

    beforeEach(function() {
      doc = {
        write: sinon.spy(),
        close: sinon.spy(),
        defaultView: {
          frameElement: {
            width: 0,
            height: 0
          }
        }
      };

      adResponse = {
        "width": 300,
        "height": 250,
      };
      bidmanager._adResponsesByBidderId[bidId] = adResponse;

      spyLogError = sinon.spy(utils, 'logError');
    });

    afterEach(function() {
      bidmanager._adResponsesByBidderId[bidId] = null;
      utils.logError.restore();
    });

    it('should require doc and id params', function () {
      pbjs.renderAd();
      var error = 'Error trying to write ad Id :undefined to the page. Missing document or adId';
      assert.ok(spyLogError.calledWith(error), 'expected param error was logged');
    });

    it('should log message with bid id', function () {
      pbjs.renderAd(doc, bidId);
      var message = 'Calling renderAd with adId :' + bidId;
      assert.ok(spyLogMessage.calledWith(message), 'expected message was logged');
    });

    it('should write the ad to the doc', function() {
      adResponse.ad = "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>";
      pbjs.renderAd(doc, bidId);
      assert.ok(doc.write.calledWith(adResponse.ad), 'ad was written to doc');
      assert.ok(doc.close.called, 'close method called');
    });

    it('should place the url inside an iframe on the doc', function() {
      adResponse.adUrl = "http://server.example.com/ad/ad.js";
      pbjs.renderAd(doc, bidId);
      var iframe = '<IFRAME SRC="' + adResponse.adUrl + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" WIDTH="' + adResponse.width + '" HEIGHT="' + adResponse.height + '"></IFRAME>'
      assert.ok(doc.write.calledWith(iframe), 'url was written to iframe in doc');
    });

    it('should log an error when no ad or url', function() {
      pbjs.renderAd(doc, bidId);
      var error = 'Error trying to write ad. No ad for bid response id: ' + bidId;
      assert.ok(spyLogError.calledWith(error), 'expected error was logged');
    });

    it('should catch errors thrown when trying to write ads to the page', function() {
      adResponse.ad = "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>";

      var error = {message: 'doc write error'};
      doc.write = sinon.stub().throws(error);
      pbjs.renderAd(doc, bidId);

      var errorMessage = 'Error trying to write ad Id :' + bidId + ' to the page:' + error.message;
      assert.ok(spyLogError.calledWith(errorMessage), 'expected error was logged');
    });

    it('should log an error when ad not found', function() {
      var fakeId = 99;
      pbjs.renderAd(doc, fakeId);
      var error = 'Error trying to write ad. Cannot find ad by given id : ' + fakeId;
      assert.ok(spyLogError.calledWith(error), 'expected error was logged');
    });
  });
});
