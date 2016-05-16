import { getBidRequests, getBidResponses, getSlotTargeting} from 'test/fixtures/fixtures';

var assert = require('chai').assert;

var prebid = require('src/prebid');
var utils = require('src/utils');
var bidmanager = require('src/bidmanager');

var bidResponses = require('test/fixtures/bid-responses.json');
var targetingMap = require('test/fixtures/targeting-map.json');
var config = require('test/fixtures/config.json');

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

describe('Unit: Prebid Module', function () {

  describe('getAdserverTargetingForAdUnitCodeStr', function () {
    it('should return targeting info as a string', function () {
      var expected = 'hb_bidder=appnexus&hb_adid=233bcbee889d46d&hb_pb=10.00&hb_size=300x250&foobar=300x250';
      var result = pbjs.getAdserverTargetingForAdUnitCodeStr(config.adUnitCodes[0]);
      assert.equal(expected, result, 'returns expected string of ad targeting info');
    });

    it('should log message if adunitCode param is falsey', function () {
      var spyLogMessage = sinon.spy(utils, 'logMessage');
      var result = pbjs.getAdserverTargetingForAdUnitCodeStr();
      assert.ok(spyLogMessage.calledWith('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode'), 'expected message was logged');
      assert.equal(result, undefined, 'result is undefined');
      utils.logMessage.restore();
    });
  });

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
      var compare = getBidResponses().map(bid => bid.adUnitCode)
        .filter((v, i, a) => a.indexOf(v) === i).map(adUnitCode => pbjs._bidsReceived
          .filter(bid => bid.adUnitCode === adUnitCode))
        .map(bids => {
          return {
            [bids[0].adUnitCode]: { bids: bids }
          };
        });

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
    });

    it('should set targeting from googletag data', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      pbjs.setTargetingForGPTAsync();
    });

    it('Calling enableSendAllBids should set targeting to include standard keys with bidder' +
      ' append to key name', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      pbjs.enableSendAllBids();
      pbjs.setTargetingForGPTAsync();
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

  describe('renderAd', function () {
    var bidId = 1;
    var doc = {};
    var adResponse = {};
    var spyLogError = null;
    var spyLogMessage = null;

    beforeEach(function () {
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
        "adId": bidId,
        "width": 300,
        "height": 250,
      };
      pbjs._bidsReceived.push(adResponse);

      spyLogError = sinon.spy(utils, 'logError');
      spyLogMessage = sinon.spy(utils, 'logMessage');
    });

    afterEach(function () {
      pbjs._bidsReceived.splice(pbjs._bidsReceived.indexOf(adResponse), 1);
      utils.logError.restore();
      utils.logMessage.restore();
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

    it('should write the ad to the doc', function () {
      adResponse.ad = "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>";
      pbjs.renderAd(doc, bidId);
      assert.ok(doc.write.calledWith(adResponse.ad), 'ad was written to doc');
      assert.ok(doc.close.called, 'close method called');
    });

    it('should place the url inside an iframe on the doc', function () {
      adResponse.adUrl = "http://server.example.com/ad/ad.js";
      pbjs.renderAd(doc, bidId);
      var iframe = '<IFRAME SRC="' + adResponse.adUrl + '" FRAMEBORDER="0" SCROLLING="no" MARGINHEIGHT="0" MARGINWIDTH="0" TOPMARGIN="0" LEFTMARGIN="0" ALLOWTRANSPARENCY="true" WIDTH="' + adResponse.width + '" HEIGHT="' + adResponse.height + '"></IFRAME>'
      assert.ok(doc.write.calledWith(iframe), 'url was written to iframe in doc');
    });

    it('should log an error when no ad or url', function () {
      pbjs.renderAd(doc, bidId);
      var error = 'Error trying to write ad. No ad for bid response id: ' + bidId;
      assert.ok(spyLogError.calledWith(error), 'expected error was logged');
    });

    it('should catch errors thrown when trying to write ads to the page', function () {
      adResponse.ad = "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>";

      var error = { message: 'doc write error' };
      doc.write = sinon.stub().throws(error);
      pbjs.renderAd(doc, bidId);

      var errorMessage = 'Error trying to write ad Id :' + bidId + ' to the page:' + error.message;
      assert.ok(spyLogError.calledWith(errorMessage), 'expected error was logged');
    });

    it('should log an error when ad not found', function () {
      var fakeId = 99;
      pbjs.renderAd(doc, fakeId);
      var error = 'Error trying to write ad. Cannot find ad by given id : ' + fakeId;
      assert.ok(spyLogError.calledWith(error), 'expected error was logged');
    });
  });
});
