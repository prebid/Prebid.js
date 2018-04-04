import {
  getAdServerTargeting,
  getBidRequests,
  getBidResponses,
  getBidResponsesFromAPI,
  getTargetingKeys,
  getTargetingKeysBidLandscape,
  getAdUnits
} from 'test/fixtures/fixtures';
import { config as configObj } from 'src/config';

var assert = require('chai').assert;
var expect = require('chai').expect;

var urlParse = require('url-parse');

var prebid = require('src/prebid');
var utils = require('src/utils');
var bidmanager = require('src/bidmanager');
var bidfactory = require('src/bidfactory');
var adloader = require('src/adloader');
var adaptermanager = require('src/adaptermanager');
var events = require('src/events');
var adserver = require('src/adserver');
var CONSTANTS = require('src/constants.json');

// These bid adapters are required to be loaded for the following tests to work
require('modules/appnexusAstBidAdapter');
require('modules/adequantBidAdapter');

var config = require('test/fixtures/config.json');

$$PREBID_GLOBAL$$ = $$PREBID_GLOBAL$$ || {};
$$PREBID_GLOBAL$$._bidsRequested = getBidRequests();
$$PREBID_GLOBAL$$._bidsReceived = getBidResponses();
$$PREBID_GLOBAL$$.adUnits = getAdUnits();
$$PREBID_GLOBAL$$._adUnitCodes = $$PREBID_GLOBAL$$.adUnits.map(unit => unit.code);

function resetAuction() {
  $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: false });
  $$PREBID_GLOBAL$$.clearAuction();
  $$PREBID_GLOBAL$$._bidsRequested = getBidRequests();
  $$PREBID_GLOBAL$$._bidsReceived = getBidResponses();
  $$PREBID_GLOBAL$$.adUnits = getAdUnits();
  $$PREBID_GLOBAL$$._adUnitCodes = $$PREBID_GLOBAL$$.adUnits.map(unit => unit.code);
}

var Slot = function Slot(elementId, pathId) {
  var slot = {
    targeting: [],
    getSlotElementId: function getSlotElementId() {
      return elementId;
    },

    getAdUnitPath: function getAdUnitPath() {
      return pathId;
    },

    setTargeting: function setTargeting(key, value) {
      var obj = [];
      obj[key] = value;
      this.targeting.push(obj);
    },

    getTargeting: function getTargeting() {
      return this.targeting;
    },

    getTargetingKeys: function getTargetingKeys() {
      return [];
    },

    clearTargeting: function clearTargeting() {
      return googletag.pubads().getSlots();
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

var createSlotArrayScenario2 = function createSlotArrayScenario2() {
  var slot1 = new Slot(config.adUnitElementIDs[0], config.adUnitCodes[0]);
  slot1.setTargeting('pos1', '750x350');
  var slot2 = new Slot(config.adUnitElementIDs[1], config.adUnitCodes[0]);
  slot2.setTargeting('gender', ['male', 'female']);
  return [
    slot1,
    slot2
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

var createTagAST = function() {
  var tags = {};
  tags[config.adUnitCodes[0]] = {
    keywords: {}
  };
  return tags;
};

window.apntag = {
  keywords: [],
  tags: createTagAST(),
  setKeywords: function(key, params) {
    var self = this;
    if (!self.tags.hasOwnProperty(key)) {
      return;
    }
    self.tags[key].keywords = this.tags[key].keywords || {};

    utils._each(params, function(param, id) {
      if (!self.tags[key].keywords.hasOwnProperty(id)) { self.tags[key].keywords[id] = param; } else if (!utils.isArray(self.tags[key].keywords[id])) { self.tags[key].keywords[id] = [self.tags[key].keywords[id]].concat(param); } else { self.tags[key].keywords[id] = self.tags[key].keywords[id].concat(param); }
    });
  }
};

describe('Unit: Prebid Module', function () {
  after(function() {
    $$PREBID_GLOBAL$$.adUnits = [];
  });
  describe('getAdserverTargetingForAdUnitCodeStr', function () {
    beforeEach(() => {
      resetAuction();
    });

    it('should return targeting info as a string', function () {
      const adUnitCode = config.adUnitCodes[0];
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });
      var expected = 'foobar=300x250&hb_size=300x250&hb_pb=10.00&hb_adid=233bcbee889d46d&hb_bidder=appnexus&hb_size_triplelift=0x0&hb_pb_triplelift=10.00&hb_adid_triplelift=222bb26f9e8bd&hb_bidder_triplelift=triplelift&hb_size_appnexus=300x250&hb_pb_appnexus=10.00&hb_adid_appnexus=233bcbee889d46d&hb_bidder_appnexus=appnexus&hb_size_pagescience=300x250&hb_pb_pagescience=10.00&hb_adid_pagescience=25bedd4813632d7&hb_bidder_pagescienc=pagescience&hb_size_brightcom=300x250&hb_pb_brightcom=10.00&hb_adid_brightcom=26e0795ab963896&hb_bidder_brightcom=brightcom&hb_size_brealtime=300x250&hb_pb_brealtime=10.00&hb_adid_brealtime=275bd666f5a5a5d&hb_bidder_brealtime=brealtime&hb_size_pubmatic=300x250&hb_pb_pubmatic=10.00&hb_adid_pubmatic=28f4039c636b6a7&hb_bidder_pubmatic=pubmatic&hb_size_rubicon=300x600&hb_pb_rubicon=10.00&hb_adid_rubicon=29019e2ab586a5a&hb_bidder_rubicon=rubicon';
      var result = $$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCodeStr(adUnitCode);
      assert.equal(expected, result, 'returns expected string of ad targeting info');
    });

    it('should log message if adunitCode param is falsey', function () {
      var spyLogMessage = sinon.spy(utils, 'logMessage');
      var result = $$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCodeStr();
      assert.ok(spyLogMessage.calledWith('Need to call getAdserverTargetingForAdUnitCodeStr with adunitCode'), 'expected message was logged');
      assert.equal(result, undefined, 'result is undefined');
      utils.logMessage.restore();
    });
  });

  describe('getAdserverTargetingForAdUnitCode', function () {
    it('should return targeting info as an object', function () {
      const adUnitCode = config.adUnitCodes[0];
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });
      var result = $$PREBID_GLOBAL$$.getAdserverTargetingForAdUnitCode(adUnitCode);
      const expected = getAdServerTargeting()[adUnitCode];
      assert.deepEqual(result, expected, 'returns expected' +
        ' targeting info object');
    });
  });

  describe('getAdServerTargeting', function () {
    beforeEach(() => {
      resetAuction();
    });

    afterEach(() => {
      resetAuction();
    });

    it('should return current targeting data for slots', function () {
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });
      const targeting = $$PREBID_GLOBAL$$.getAdserverTargeting();
      const expected = getAdServerTargeting();
      assert.deepEqual(targeting, expected, 'targeting ok');
    });

    it('should return correct targeting with default settings', () => {
      var targeting = $$PREBID_GLOBAL$$.getAdserverTargeting();
      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '300x250',
          hb_size: '300x250',
          hb_pb: '10.00',
          hb_adid: '233bcbee889d46d',
          hb_bidder: 'appnexus'
        },
        '/19968336/header-bid-tag1': {
          foobar: '728x90',
          hb_size: '728x90',
          hb_pb: '10.00',
          hb_adid: '24bd938435ec3fc',
          hb_bidder: 'appnexus'
        }
      };
      assert.deepEqual(targeting, expected);
    });

    it('should return correct targeting with bid landscape targeting on', () => {
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });
      var targeting = $$PREBID_GLOBAL$$.getAdserverTargeting();
      var expected = getAdServerTargeting();
      assert.deepEqual(targeting, expected);
    });

    it("should include a losing bid's custom ad targeting key when the bid has `alwaysUseBid` set to `true`", () => {
      // Let's make sure we're getting the expected losing bid.
      assert.equal($$PREBID_GLOBAL$$._bidsReceived[0]['bidderCode'], 'triplelift');
      assert.equal($$PREBID_GLOBAL$$._bidsReceived[0]['cpm'], 0.112256);

      // Modify the losing bid to have `alwaysUseBid=true` and a custom `adserverTargeting` key.
      $$PREBID_GLOBAL$$._bidsReceived[0]['alwaysUseBid'] = true;
      $$PREBID_GLOBAL$$._bidsReceived[0]['adserverTargeting'] = {
        always_use_me: 'abc',
      };

      var targeting = $$PREBID_GLOBAL$$.getAdserverTargeting();

      // Ensure targeting for both ad placements includes the custom key.
      assert.equal(
        targeting['/19968336/header-bid-tag-0'].hasOwnProperty('always_use_me'),
        true
      );

      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '300x250',
          hb_size: '300x250',
          hb_pb: '10.00',
          hb_adid: '233bcbee889d46d',
          hb_bidder: 'appnexus',
          always_use_me: 'abc'
        },
        '/19968336/header-bid-tag1': {
          foobar: '728x90',
          hb_size: '728x90',
          hb_pb: '10.00',
          hb_adid: '24bd938435ec3fc',
          hb_bidder: 'appnexus'
        }
      };

      assert.deepEqual(targeting, expected);
    });

    it('should not overwrite winning bids custom keys targeting key when the bid has `alwaysUseBid` set to `true`', () => {
      // mimic a bidderSetting.standard key here for each bid and alwaysUseBid true for every bid
      $$PREBID_GLOBAL$$._bidsReceived.forEach(bid => {
        bid.adserverTargeting.custom_ad_id = bid.adId;
        bid.alwaysUseBid = true;
      });
      $$PREBID_GLOBAL$$.bidderSettings = {
        'standard': {
          adserverTargeting: [{
            key: 'hb_bidder',
            val: function(bidResponse) {
              return bidResponse.bidderCode;
            }
          }, {
            key: 'custom_ad_id',
            val: function(bidResponse) {
              return bidResponse.adId;
            }
          }, {
            key: 'hb_pb',
            val: function(bidResponse) {
              return bidResponse.pbMg;
            }
          }, {
            key: 'foobar',
            val: function(bidResponse) {
              return bidResponse.size;
            }
          }]
        }
      };

      var targeting = $$PREBID_GLOBAL$$.getAdserverTargeting();

      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '300x250',
          hb_size: '300x250',
          hb_pb: '10.00',
          hb_adid: '233bcbee889d46d',
          hb_bidder: 'appnexus',
          custom_ad_id: '233bcbee889d46d'
        },
        '/19968336/header-bid-tag1': {
          foobar: '728x90',
          hb_size: '728x90',
          hb_pb: '10.00',
          hb_adid: '24bd938435ec3fc',
          hb_bidder: 'appnexus',
          custom_ad_id: '24bd938435ec3fc'
        }
      };

      assert.deepEqual(targeting, expected);
      $$PREBID_GLOBAL$$.bidderSettings = {};
    });

    it('should not send standard targeting keys when the bid has `sendStandardTargeting` set to `false`', () => {
      $$PREBID_GLOBAL$$._bidsReceived.forEach(bid => {
        bid.adserverTargeting.custom_ad_id = bid.adId;
        bid.sendStandardTargeting = false;
      });

      var targeting = $$PREBID_GLOBAL$$.getAdserverTargeting();

      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '300x250',
          custom_ad_id: '233bcbee889d46d'
        },
        '/19968336/header-bid-tag1': {
          foobar: '728x90',
          custom_ad_id: '24bd938435ec3fc'
        }
      };

      assert.deepEqual(targeting, expected);
      $$PREBID_GLOBAL$$.bidderSettings = {};
    });
  });

  describe('getAdserverTargeting', function() {
    const customConfigObject = {
      'buckets': [
        { 'precision': 2, 'min': 0, 'max': 5, 'increment': 0.01 },
        { 'precision': 2, 'min': 5, 'max': 8, 'increment': 0.05},
        { 'precision': 2, 'min': 8, 'max': 20, 'increment': 0.5 },
        { 'precision': 2, 'min': 20, 'max': 25, 'increment': 1 }
      ]
    };
    let currentPriceBucket;
    let bid;

    before(() => {
      resetAuction();
      currentPriceBucket = configObj.getConfig('priceGranularity');
      configObj.setConfig({ priceGranularity: customConfigObject });
      bid = Object.assign({},
        bidfactory.createBid(2),
        getBidResponses()[5]
      );
    });

    after(() => {
      configObj.setConfig({ priceGranularity: currentPriceBucket });
      resetAuction();
    })

    beforeEach(() => {
      $$PREBID_GLOBAL$$._bidsReceived = [];
    })

    it('should get correct hb_pb when using bid.cpm is between 0 to 5', () => {
      bid.cpm = 2.1234;
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      expect($$PREBID_GLOBAL$$.getAdserverTargeting()['/19968336/header-bid-tag-0'].hb_pb).to.equal('2.12');
    });

    it('should get correct hb_pb when using bid.cpm is between 5 to 8', () => {
      bid.cpm = 6.78;
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      expect($$PREBID_GLOBAL$$.getAdserverTargeting()['/19968336/header-bid-tag-0'].hb_pb).to.equal('6.75');
    });

    it('should get correct hb_pb when using bid.cpm is between 8 to 20', () => {
      bid.cpm = 19.5234;
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      expect($$PREBID_GLOBAL$$.getAdserverTargeting()['/19968336/header-bid-tag-0'].hb_pb).to.equal('19.50');
    });

    it('should get correct hb_pb when using bid.cpm is between 20 to 25', () => {
      bid.cpm = 21.5234;
      bidmanager.addBidResponse(bid.adUnitCode, bid);
      expect($$PREBID_GLOBAL$$.getAdserverTargeting()['/19968336/header-bid-tag-0'].hb_pb).to.equal('21.00');
    });
  });

  describe('getBidResponses', function () {
    it('should return expected bid responses when not passed an adunitCode', function () {
      var result = $$PREBID_GLOBAL$$.getBidResponses();
      var compare = getBidResponsesFromAPI();
      assert.deepEqual(result, compare, 'expected bid responses are returned');
    });

    it('should return bid responses for most recent requestId only', () => {
      const responses = $$PREBID_GLOBAL$$.getBidResponses();
      assert.equal(responses[Object.keys(responses)[0]].bids.length, 4);
    });
  });

  describe('getBidResponsesForAdUnitCode', function () {
    it('should return bid responses as expected', function () {
      const adUnitCode = '/19968336/header-bid-tag-0';
      const result = $$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode(adUnitCode);
      const bids = getBidResponses().filter(bid => bid.adUnitCode === adUnitCode);
      const compare = { bids: bids };
      assert.deepEqual(result, compare, 'expected id responses for ad unit code are returned');
    });
  });

  describe('setTargetingForGPTAsync', function () {
    let logErrorSpy;

    beforeEach(() => {
      logErrorSpy = sinon.spy(utils, 'logError');
      resetAuction();
    });

    afterEach(() => {
      utils.logError.restore();
      resetAuction();
    });

    it('should set googletag targeting keys after calling setTargetingForGPTAsync function', function () {
      var slots = createSlotArrayScenario2();
      window.googletag.pubads().setSlots(slots);
      $$PREBID_GLOBAL$$.setTargetingForGPTAsync();

      var targeting = [];
      slots[1].getTargeting().map(function (value) {
        var temp = [];
        temp.push(Object.keys(value).toString());
        temp.push(value[Object.keys(value)]);
        targeting.push(temp);
      });

      assert.deepEqual(slots[1].spySetTargeting.args, targeting, 'google tag targeting options not matching');
    });

    it('should set targeting when passed a string ad unit code with enableSendAllBids', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });

      $$PREBID_GLOBAL$$.setTargetingForGPTAsync('/19968336/header-bid-tag-0');
      expect(slots[0].spySetTargeting.args).to.deep.contain.members([['hb_bidder', 'appnexus'], ['hb_adid_appnexus', '233bcbee889d46d'], ['hb_pb_appnexus', '10.00']]);
    });

    it('should set targeting when passed an array of ad unit codes with enableSendAllBids', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });

      $$PREBID_GLOBAL$$.setTargetingForGPTAsync(['/19968336/header-bid-tag-0']);
      expect(slots[0].spySetTargeting.args).to.deep.contain.members([['hb_bidder', 'appnexus'], ['hb_adid_appnexus', '233bcbee889d46d'], ['hb_pb_appnexus', '10.00']]);
    });

    it('should set targeting from googletag data', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      $$PREBID_GLOBAL$$.setTargetingForGPTAsync();

      var expected = getTargetingKeys();
      expect(slots[0].spySetTargeting.args).to.deep.contain.members(expected);
    });

    it('Calling enableSendAllBids should set targeting to include standard keys with bidder' +
      ' append to key name', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });
      $$PREBID_GLOBAL$$.setTargetingForGPTAsync();

      var expected = getTargetingKeysBidLandscape();
      expect(slots[0].spySetTargeting.args).to.deep.contain.members(expected);
    });

    it('should set targeting for bids with `alwaysUseBid=true`', function () {
      // Make sure we're getting the expected losing bid.
      assert.equal($$PREBID_GLOBAL$$._bidsReceived[0]['bidderCode'], 'triplelift');
      assert.equal($$PREBID_GLOBAL$$._bidsReceived[0]['cpm'], 0.112256);

      // Modify the losing bid to have `alwaysUseBid=true` and a custom `adserverTargeting` key.
      $$PREBID_GLOBAL$$._bidsReceived[0]['alwaysUseBid'] = true;
      $$PREBID_GLOBAL$$._bidsReceived[0]['adserverTargeting'] = {
        always_use_me: 'abc',
      };

      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      $$PREBID_GLOBAL$$.setTargetingForGPTAsync();

      var expected = [
        [
          'hb_bidder',
          'appnexus'
        ],
        [
          'hb_adid',
          '233bcbee889d46d'
        ],
        [
          'hb_pb',
          '10.00'
        ],
        [
          'hb_size',
          '300x250'
        ],
        [
          'foobar',
          '300x250'
        ],
        [
          'always_use_me',
          'abc'
        ],
        [
          'foobar',
          '300x250'
        ]
      ];

      expect(slots[0].spySetTargeting.args).to.deep.contain.members(expected);
    });

    it('should log error when googletag is not defined on page', function () {
      const error = 'window.googletag is not defined on the page';
      const windowGoogletagBackup = window.googletag;
      window.googletag = {};

      $$PREBID_GLOBAL$$.setTargetingForGPTAsync();
      assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
      window.googletag = windowGoogletagBackup;
    });

    it('should emit SET_TARGETING event when successfully invoked', function() {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      var callback = sinon.spy();

      $$PREBID_GLOBAL$$.onEvent('setTargeting', callback);
      $$PREBID_GLOBAL$$.setTargetingForGPTAsync(config.adUnitCodes);

      sinon.assert.calledOnce(callback);
    });
  });

  describe('allBidsAvailable', function () {
    it('should call bidmanager.allBidsBack', function () {
      var spyAllBidsBack = sinon.spy(bidmanager, 'bidsBackAll');

      $$PREBID_GLOBAL$$.allBidsAvailable();
      assert.ok(spyAllBidsBack.called, 'called bidmanager.allBidsBack');
      bidmanager.bidsBackAll.restore();
    });
  });

  describe('renderAd', function () {
    var bidId = 1;
    var doc = {};
    var elStub = {};
    var adResponse = {};
    var spyLogError = null;
    var spyLogMessage = null;
    var inIframe = true;

    beforeEach(function () {
      doc = {
        write: sinon.spy(),
        close: sinon.spy(),
        defaultView: {
          frameElement: {
            width: 0,
            height: 0
          }
        },
        getElementsByTagName: sinon.stub()
      };

      elStub = {
        insertBefore: sinon.stub()
      };
      doc.getElementsByTagName.returns([elStub]);

      adResponse = {
        adId: bidId,
        width: 300,
        height: 250,
      };
      $$PREBID_GLOBAL$$._bidsReceived.push(adResponse);

      spyLogError = sinon.spy(utils, 'logError');
      spyLogMessage = sinon.spy(utils, 'logMessage');

      inIframe = true;
      sinon.stub(utils, 'inIframe', () => inIframe);
    });

    afterEach(function () {
      $$PREBID_GLOBAL$$._bidsReceived.splice($$PREBID_GLOBAL$$._bidsReceived.indexOf(adResponse), 1);
      $$PREBID_GLOBAL$$._winningBids = [];
      utils.logError.restore();
      utils.logMessage.restore();
      utils.inIframe.restore();
    });

    it('should require doc and id params', function () {
      $$PREBID_GLOBAL$$.renderAd();
      var error = 'Error trying to write ad Id :undefined to the page. Missing document or adId';
      assert.ok(spyLogError.calledWith(error), 'expected param error was logged');
    });

    it('should log message with bid id', function () {
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);
      var message = 'Calling renderAd with adId :' + bidId;
      assert.ok(spyLogMessage.calledWith(message), 'expected message was logged');
    });

    it('should write the ad to the doc', function () {
      adResponse.ad = "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>";
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);
      assert.ok(doc.write.calledWith(adResponse.ad), 'ad was written to doc');
      assert.ok(doc.close.called, 'close method called');
    });

    it('should place the url inside an iframe on the doc', function () {
      adResponse.adUrl = 'http://server.example.com/ad/ad.js';
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);
      assert.ok(elStub.insertBefore.called, 'url was written to iframe in doc');
    });

    it('should log an error when no ad or url', function () {
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);
      var error = 'Error trying to write ad. No ad for bid response id: ' + bidId;
      assert.ok(spyLogError.calledWith(error), 'expected error was logged');
    });

    it('should log an error when not in an iFrame', () => {
      inIframe = false;
      $$PREBID_GLOBAL$$.renderAd(document, bidId);
      const error = 'Error trying to write ad. Ad render call ad id ' + bidId + ' was prevented from writing to the main document.';
      assert.ok(spyLogError.calledWith(error), 'expected error was logged');
    });

    it('should not render videos', () => {
      adResponse.mediatype = 'video';
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);
      sinon.assert.notCalled(doc.write);
      delete adResponse.mediatype;
    });

    it('should catch errors thrown when trying to write ads to the page', function () {
      adResponse.ad = "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>";

      var error = { message: 'doc write error' };
      doc.write = sinon.stub().throws(error);
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);

      var errorMessage = 'Error trying to write ad Id :' + bidId + ' to the page:' + error.message;
      assert.ok(spyLogError.calledWith(errorMessage), 'expected error was logged');
    });

    it('should log an error when ad not found', function () {
      var fakeId = 99;
      $$PREBID_GLOBAL$$.renderAd(doc, fakeId);
      var error = 'Error trying to write ad. Cannot find ad by given id : ' + fakeId;
      assert.ok(spyLogError.calledWith(error), 'expected error was logged');
    });

    it('should save bid displayed to winning bid', function () {
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);
      assert.equal($$PREBID_GLOBAL$$._winningBids[0], adResponse);
    });
  });

  describe('requestBids', () => {
    var adUnitsBackup;

    beforeEach(() => {
      adUnitsBackup = $$PREBID_GLOBAL$$.adUnits;
    });

    afterEach(() => {
      $$PREBID_GLOBAL$$.adUnits = adUnitsBackup;
      resetAuction();
    });

    it('should add bidsBackHandler callback to bidmanager', () => {
      var spyAddOneTimeCallBack = sinon.spy(bidmanager, 'addOneTimeCallback');
      var requestObj = {
        bidsBackHandler: function bidsBackHandlerCallback() {
        }
      };
      $$PREBID_GLOBAL$$.requestBids(requestObj);
      assert.ok(spyAddOneTimeCallBack.calledWith(requestObj.bidsBackHandler),
        'called bidmanager.addOneTimeCallback');
      bidmanager.addOneTimeCallback.restore();
    });

    it('should log message when adUnits not configured', () => {
      const logMessageSpy = sinon.spy(utils, 'logMessage');

      $$PREBID_GLOBAL$$.adUnits = [];
      $$PREBID_GLOBAL$$.requestBids({});

      assert.ok(logMessageSpy.calledWith('No adUnits configured. No bids requested.'), 'expected message was logged');
      utils.logMessage.restore();
    });

    it('should execute callback after timeout', () => {
      var spyExecuteCallback = sinon.spy(bidmanager, 'executeCallback');
      var clock = sinon.useFakeTimers();
      var requestObj = {
        bidsBackHandler: function bidsBackHandlerCallback() {
        },

        timeout: 2000
      };

      $$PREBID_GLOBAL$$.requestBids(requestObj);

      clock.tick(requestObj.timeout - 1);
      assert.ok(spyExecuteCallback.notCalled, 'bidmanager.executeCallback not called');

      clock.tick(1);
      assert.ok(spyExecuteCallback.called, 'called bidmanager.executeCallback');

      bidmanager.executeCallback.restore();
      clock.restore();
    });

    it('should execute callback immediately if adUnits is empty', () => {
      var spyExecuteCallback = sinon.spy(bidmanager, 'executeCallback');

      $$PREBID_GLOBAL$$.adUnits = [];
      $$PREBID_GLOBAL$$.requestBids({});

      assert.ok(spyExecuteCallback.calledOnce, 'callback executed immediately when adUnits is' +
        ' empty');

      bidmanager.executeCallback.restore();
    });

    it('should not propagate exceptions from bidsBackHandler', () => {
      $$PREBID_GLOBAL$$.adUnits = [];

      var requestObj = {
        bidsBackHandler: function bidsBackHandlerCallback() {
          var test;
          return test.test;
        }
      };

      expect(() => {
        $$PREBID_GLOBAL$$.requestBids(requestObj);
      }).not.to.throw();
    });

    it('should call callBids function on adaptermanager', () => {
      var spyCallBids = sinon.spy(adaptermanager, 'callBids');

      $$PREBID_GLOBAL$$.requestBids({});
      assert.ok(spyCallBids.called, 'called adaptermanager.callBids');
      adaptermanager.callBids.restore();
    });

    it('should only request video bidders on video adunits', () => {
      sinon.spy(adaptermanager, 'callBids');
      const videoAdaptersBackup = adaptermanager.videoAdapters;
      adaptermanager.videoAdapters = ['appnexusAst'];
      const adUnits = [{
        code: 'adUnit-code',
        mediaType: 'video',
        bids: [
          {bidder: 'appnexus', params: {placementId: 'id'}},
          {bidder: 'appnexusAst', params: {placementId: 'id'}}
        ]
      }];

      $$PREBID_GLOBAL$$.requestBids({adUnits});
      sinon.assert.calledOnce(adaptermanager.callBids);

      const spyArgs = adaptermanager.callBids.getCall(0);
      const biddersCalled = spyArgs.args[0].adUnits[0].bids;
      expect(biddersCalled.length).to.equal(1);

      adaptermanager.callBids.restore();
      adaptermanager.videoAdapters = videoAdaptersBackup;
    });

    it('should only request video bidders on video adunits configured with mediaTypes', () => {
      sinon.spy(adaptermanager, 'callBids');
      const videoAdaptersBackup = adaptermanager.videoAdapters;
      adaptermanager.videoAdapters = ['appnexusAst'];
      const adUnits = [{
        code: 'adUnit-code',
        mediaTypes: {video: {context: 'instream'}},
        bids: [
          {bidder: 'appnexus', params: {placementId: 'id'}},
          {bidder: 'appnexusAst', params: {placementId: 'id'}}
        ]
      }];

      $$PREBID_GLOBAL$$.requestBids({adUnits});
      sinon.assert.calledOnce(adaptermanager.callBids);

      const spyArgs = adaptermanager.callBids.getCall(0);
      const biddersCalled = spyArgs.args[0].adUnits[0].bids;
      expect(biddersCalled.length).to.equal(1);

      adaptermanager.callBids.restore();
      adaptermanager.videoAdapters = videoAdaptersBackup;
    });

    it('should callBids if a video adUnit has all video bidders', () => {
      sinon.spy(adaptermanager, 'callBids');
      const videoAdaptersBackup = adaptermanager.videoAdapters;
      adaptermanager.videoAdapters = ['appnexusAst'];
      const adUnits = [{
        code: 'adUnit-code',
        mediaType: 'video',
        bids: [
          {bidder: 'appnexusAst', params: {placementId: 'id'}}
        ]
      }];

      $$PREBID_GLOBAL$$.requestBids({adUnits});
      sinon.assert.calledOnce(adaptermanager.callBids);

      adaptermanager.callBids.restore();
      adaptermanager.videoAdapters = videoAdaptersBackup;
    });

    it('should only request native bidders on native adunits', () => {
      sinon.spy(adaptermanager, 'callBids');
      // appnexusAst is a native bidder, appnexus is not
      const adUnits = [{
        code: 'adUnit-code',
        mediaType: 'native',
        bids: [
          {bidder: 'appnexus', params: {placementId: 'id'}},
          {bidder: 'appnexusAst', params: {placementId: 'id'}}
        ]
      }];

      $$PREBID_GLOBAL$$.requestBids({adUnits});
      sinon.assert.calledOnce(adaptermanager.callBids);

      const spyArgs = adaptermanager.callBids.getCall(0);
      const biddersCalled = spyArgs.args[0].adUnits[0].bids;
      expect(biddersCalled.length).to.equal(1);

      adaptermanager.callBids.restore();
    });

    it('should callBids if a native adUnit has all native bidders', () => {
      sinon.spy(adaptermanager, 'callBids');
      // TODO: appnexusAst is currently hardcoded in native.js, update this text when fixed
      const adUnits = [{
        code: 'adUnit-code',
        mediaType: 'native',
        bids: [
          {bidder: 'appnexusAst', params: {placementId: 'id'}}
        ]
      }];

      $$PREBID_GLOBAL$$.requestBids({adUnits});
      sinon.assert.calledOnce(adaptermanager.callBids);

      adaptermanager.callBids.restore();
    });

    it('splits native type to individual native assets', () => {
      $$PREBID_GLOBAL$$._bidsRequested = [];

      const adUnits = [{
        code: 'adUnit-code',
        nativeParams: {type: 'image'},
        bids: [
          {bidder: 'appnexusAst', params: {placementId: 'id'}}
        ]
      }];

      $$PREBID_GLOBAL$$.requestBids({adUnits});

      const nativeRequest = $$PREBID_GLOBAL$$._bidsRequested[0].bids[0].nativeParams;
      expect(nativeRequest).to.deep.equal({
        image: {required: true},
        title: {required: true},
        sponsoredBy: {required: true},
        clickUrl: {required: true},
        body: {required: false},
        icon: {required: false},
      });

      resetAuction();
    });

    it('should queue bid requests when a previous bid request is in process', () => {
      var spyCallBids = sinon.spy(adaptermanager, 'callBids');
      var clock = sinon.useFakeTimers();
      var requestObj1 = {
        adUnitCodes: ['/19968336/header-bid-tag1'],
        bidsBackHandler: function bidsBackHandlerCallback() {
        },

        timeout: 2000
      };

      var requestObj2 = {
        adUnitCodes: ['/19968336/header-bid-tag-0'],
        bidsBackHandler: function bidsBackHandlerCallback() {
        },

        timeout: 2000
      };

      assert.equal($$PREBID_GLOBAL$$._bidsReceived.length, 8, '_bidsReceived contains 8 bids');

      $$PREBID_GLOBAL$$.requestBids(requestObj1);
      $$PREBID_GLOBAL$$.requestBids(requestObj2);

      clock.tick(requestObj1.timeout - 1);
      assert.ok(spyCallBids.calledOnce, 'When two requests for bids are made only one should' +
        ' callBids immediately');
      assert.equal($$PREBID_GLOBAL$$._bidsReceived.length, 7, '_bidsReceived now contains 7 bids');
      assert.deepEqual($$PREBID_GLOBAL$$._bidsReceived
        .find(bid => requestObj1.adUnitCodes.includes(bid.adUnitCode)), undefined, 'Placements' +
        ' for' +
        ' current request have been cleared of bids');
      assert.deepEqual($$PREBID_GLOBAL$$._bidsReceived
        .filter(bid => requestObj2.adUnitCodes.includes(bid.adUnitCode)).length, 7, 'Placements' +
        ' for previous request have not been cleared of bids');
      assert.deepEqual($$PREBID_GLOBAL$$._adUnitCodes, ['/19968336/header-bid-tag1'], '_adUnitCodes is' +
        ' for first request');
      assert.ok($$PREBID_GLOBAL$$._bidsReceived.length > 0, '_bidsReceived contains bids');
      assert.deepEqual($$PREBID_GLOBAL$$.getBidResponses(), {}, 'yet getBidResponses returns' +
        ' empty object for first request (no matching bids for current placement');
      assert.deepEqual($$PREBID_GLOBAL$$.getAdserverTargeting(), {}, 'getAdserverTargeting' +
        ' returns empty object for first request');
      clock.tick(1);

      // restore _bidsReceived to simulate more bids returned
      $$PREBID_GLOBAL$$._bidsReceived = getBidResponses();
      assert.ok(spyCallBids.calledTwice, 'The second queued request should callBids when the' +
        ' first request has completed');
      assert.deepEqual($$PREBID_GLOBAL$$._adUnitCodes, ['/19968336/header-bid-tag-0'], '_adUnitCodes is' +
        'now for second request');
      assert.deepEqual($$PREBID_GLOBAL$$.getBidResponses(), {
        '/19968336/header-bid-tag-0': {
          'bids': [
            {
              'bidderCode': 'brightcom',
              'width': 300,
              'height': 250,
              'statusMessage': 'Bid available',
              'adId': '26e0795ab963896',
              'cpm': 0.17,
              'ad': "<script type=\"text/javascript\">document.write('<scr'+'ipt src=\"//trk.diamondminebubble.com/h.html?e=hb_before_creative_renders&ho=2140340&ty=j&si=300x250&ta=16577&cd=cdn.marphezis.com&raid=15f3d12e77c1e5a&rimid=14fe662ee0a3506&rbid=235894352&cb=' + Math.floor((Math.random()*100000000000)+1) + '&ref=\"></scr' + 'ipt>');</script><script type=\"text/javascript\">var compassSmartTag={h:\"2140340\",t:\"16577\",d:\"2\",referral:\"\",y_b:{y:\"j\",s:\"300x250\"},hb:{raid:\"15f3d12e77c1e5a\",rimid:\"14fe662ee0a3506\",rbid:\"235894352\"}};</script><script src=\"//cdn.marphezis.com/cmps/cst.min.js\"></script><img src=\"http://notifications.iselephant.com/hb/awin?byid=400&imid=14fe662ee0a3506&auid=15f3d12e77c1e5a&bdid=235894352\" width=\"1\" height=\"1\" style=\"display:none\" />",
              'responseTimestamp': 1462919239420,
              'requestTimestamp': 1462919238937,
              'bidder': 'brightcom',
              'adUnitCode': '/19968336/header-bid-tag-0',
              'timeToRespond': 483,
              'pbLg': '0.00',
              'pbMg': '0.10',
              'pbHg': '0.17',
              'pbAg': '0.15',
              'size': '300x250',
              'requestId': 654321,
              'adserverTargeting': {
                'hb_bidder': 'brightcom',
                'hb_adid': '26e0795ab963896',
                'hb_pb': '10.00',
                'hb_size': '300x250',
                'foobar': '300x250'
              }
            },
            {
              'bidderCode': 'brealtime',
              'width': 300,
              'height': 250,
              'statusMessage': 'Bid available',
              'adId': '275bd666f5a5a5d',
              'creative_id': 29681110,
              'cpm': 0.5,
              'adUrl': 'http://lax1-ib.adnxs.com/ab?e=wqT_3QLzBKhzAgAAAwDWAAUBCMjAybkFEIPr4YfMvKLoQBjL84KE1tzG-kkgASotCQAAAQII4D8RAQcQAADgPxkJCQjwPyEJCQjgPykRCaAwuvekAji-B0C-B0gCUNbLkw5YweAnYABokUB4mo8EgAEBigEDVVNEkgUG8FKYAawCoAH6AagBAbABALgBAcABA8gBANABANgBAOABAPABAIoCOnVmKCdhJywgNDk0NDcyLCAxNDYyOTE5MjQwKTt1ZigncicsIDI5NjgxMTEwLDIeAPBvkgLNASFsU2NQWlFpNjBJY0VFTmJMa3c0WUFDREI0Q2N3QURnQVFBUkl2Z2RRdXZla0FsZ0FZSk1IYUFCdzNBMTRDb0FCcGh5SUFRcVFBUUdZQVFHZ0FRR29BUU93QVFDNUFRQUFBQUFBQU9BX3dRRQkMSEFEZ1A4a0JHZmNvazFBejFUX1oVKCRQQV80QUVBOVFFBSw8bUFLS2dOU0NEYUFDQUxVQwUVBEwwCQh0T0FDQU9nQ0FQZ0NBSUFEQVEuLpoCJSFDUWxfYXdpMtAA8KZ3ZUFuSUFRb2lvRFVnZzAu2ALoB-ACx9MB6gIfaHR0cDovL3ByZWJpZC5vcmc6OTk5OS9ncHQuaHRtbIADAIgDAZADAJgDBaADAaoDALADALgDAMADrALIAwDYAwDgAwDoAwD4AwOABACSBAQvanB0mAQAogQKMTAuMS4xMy4zN6gEi-wJsgQICAAQABgAIAC4BADABADIBADSBAsxMC4wLjg1LjIwOA..&s=975cfe6518f064683541240f0d780d93a5f973da&referrer=http%3A%2F%2Fprebid.org%3A9999%2Fgpt.html',
              'responseTimestamp': 1462919239486,
              'requestTimestamp': 1462919238941,
              'bidder': 'brealtime',
              'adUnitCode': '/19968336/header-bid-tag-0',
              'timeToRespond': 545,
              'pbLg': '0.50',
              'pbMg': '0.50',
              'pbHg': '0.50',
              'pbAg': '0.50',
              'size': '300x250',
              'requestId': 654321,
              'adserverTargeting': {
                'hb_bidder': 'brealtime',
                'hb_adid': '275bd666f5a5a5d',
                'hb_pb': '10.00',
                'hb_size': '300x250',
                'foobar': '300x250'
              }
            },
            {
              'bidderCode': 'pubmatic',
              'width': '300',
              'height': '250',
              'statusMessage': 'Bid available',
              'adId': '28f4039c636b6a7',
              'adSlot': '39620189@300x250',
              'cpm': 5.9396,
              'ad': "<span class=\"PubAPIAd\"><img src=\"http://usw-lax.adsrvr.org/bid/feedback/pubmatic?iid=467b5d95-d55a-4125-a90a-64a34d92ceec&crid=p84y3ree&wp=8.5059874&aid=9519B012-A2CF-4166-93F5-DEB9D7CC9680&wpc=USD&sfe=969e047&puid=4367D163-7DC9-40CD-8DC1-0A0876574ADE&tdid=9514a176-457b-4bb1-ae75-0d2b5e8012fa&pid=rw83mt1&ag=rmorau3&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&svbttd=1&dt=PC&osf=OSX&os=Other&br=Chrome&rlangs=en&mlang=&svpid=39741&did=&rcxt=Other&lat=45.518097&lon=-122.675095&tmpc=&daid=&vp=0&osi=&osv=&bp=13.6497&testid=audience-eval-old&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI/f//////////ARIGcGVlcjM5EISVAw==&crrelr=\" width=\"1\" height=\"1\" style=\"display: none;\"/><IFRAME SRC=\"https://ad.doubleclick.net/ddm/adi/N84001.284566THETRADEDESK/B9241716.125553599;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\" WIDTH=300 HEIGHT=250 MARGINWIDTH=0 MARGINHEIGHT=0 HSPACE=0 VSPACE=0 FRAMEBORDER=0 SCROLLING=no BORDERCOLOR='#000000'>\r\n<SCRIPT language='JavaScript1.1' SRC=\"https://ad.doubleclick.net/ddm/adj/N84001.284566THETRADEDESK/B9241716.125553599;abr=!ie;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\">\r\n</SCRIPT>\r\n<NOSCRIPT>\r\n<A HREF=\"http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=https://ad.doubleclick.net/ddm/jump/N84001.284566THETRADEDESK/B9241716.125553599;abr=!ie4;abr=!ie5;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\">\r\n<IMG SRC=\"https://ad.doubleclick.net/ddm/ad/N84001.284566THETRADEDESK/B9241716.125553599;abr=!ie4;abr=!ie5;sz=300x250;click0=http://insight.adsrvr.org/track/clk?imp=467b5d95-d55a-4125-a90a-64a34d92ceec&ag=rmorau3&crid=p84y3ree&cf=&fq=1&td_s=prebid.org:9999&rcats=&mcat=&mste=&mfld=2&mssi=&mfsi=s4go1cqvhn&sv=pubmatic&uhow=63&agsa=&rgco=United%20States&rgre=Oregon&rgme=820&rgci=Portland&rgz=97204&dt=PC&osf=OSX&os=Other&br=Chrome&svpid=39741&rlangs=en&mlang=&did=&rcxt=Other&tmpc=&vrtd=&osi=&osv=&daid=&dnr=0&dur=CicKB203c2NmY3oQhJUDIgsIncWDPRIEbm9uZSILCOjyjz0SBG5vbmUKNQoeY2hhcmdlLWFsbFBlZXIzOUN1c3RvbUNhdGVnb3J5IhMI%2Ff%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARIGcGVlcjM5EISVAw%3D%3D&crrelr=&svscid=66156&testid=audience-eval-old&r=;ord=102917?\" BORDER=0 WIDTH=300 HEIGHT=250 ALT=\"Advertisement\"></A>\r\n</NOSCRIPT>\r\n</IFRAME><span id=\"te-clearads-js-tradedesk01cont1\"><script type=\"text/javascript\" src=\"https://choices.truste.com/ca?pid=tradedesk01&aid=tradedesk01&cid=10312015&c=tradedesk01cont1&js=pmw0&w=300&h=250&sid=0\"></script></span>\r</span> <!-- PubMatic Ad Ends --><div style=\"position:absolute;left:0px;top:0px;visibility:hidden;\"><img src=\"http://aktrack.pubmatic.com/AdServer/AdDisplayTrackerServlet?operId=1&pubId=39741&siteId=66156&adId=148827&adServerId=243&kefact=5.939592&kaxefact=5.939592&kadNetFrequecy=1&kadwidth=300&kadheight=250&kadsizeid=9&kltstamp=1462919239&indirectAdId=0&adServerOptimizerId=2&ranreq=0.8652068939929505&kpbmtpfact=8.505987&dcId=1&tldId=19194842&passback=0&imprId=8025E377-EC45-4EB6-826C-49D56CCE47DF&oid=8025E377-EC45-4EB6-826C-49D56CCE47DF&ias=272&crID=p84y3ree&campaignId=6810&creativeId=0&pctr=0.000000&wDSPByrId=1362&pageURL=http%253A%252F%252Fprebid.org%253A9999%252Fgpt.html&lpu=www.etrade.com\"></div>",
              'dealId': '',
              'responseTimestamp': 1462919239544,
              'requestTimestamp': 1462919238922,
              'bidder': 'pubmatic',
              'adUnitCode': '/19968336/header-bid-tag-0',
              'timeToRespond': 622,
              'pbLg': '5.00',
              'pbMg': '5.90',
              'pbHg': '5.93',
              'pbAg': '5.90',
              'size': '300x250',
              'requestId': 654321,
              'adserverTargeting': {
                'hb_bidder': 'pubmatic',
                'hb_adid': '28f4039c636b6a7',
                'hb_pb': '10.00',
                'hb_size': '300x250',
                'foobar': '300x250'
              }
            },
            {
              'bidderCode': 'rubicon',
              'width': 300,
              'height': 600,
              'statusMessage': 'Bid available',
              'adId': '29019e2ab586a5a',
              'cpm': 2.74,
              'ad': '<script type="text/javascript">;(function (rt, fe) { rt.renderCreative(fe, "/19968336/header-bid-tag-0", "10"); }((parent.window.rubicontag || window.top.rubicontag), (document.body || document.documentElement)));</script>',
              'responseTimestamp': 1462919239860,
              'requestTimestamp': 1462919238934,
              'bidder': 'rubicon',
              'adUnitCode': '/19968336/header-bid-tag-0',
              'timeToRespond': 926,
              'pbLg': '2.50',
              'pbMg': '2.70',
              'pbHg': '2.74',
              'pbAg': '2.70',
              'size': '300x600',
              'requestId': 654321,
              'adserverTargeting': {
                'hb_bidder': 'rubicon',
                'hb_adid': '29019e2ab586a5a',
                'hb_pb': '10.00',
                'hb_size': '300x600',
                'foobar': '300x600'
              }
            }
          ]
        }
      }, 'getBidResponses returns info for current bid request');

      assert.deepEqual($$PREBID_GLOBAL$$.getAdserverTargeting(), {
        '/19968336/header-bid-tag-0': {
          'foobar': '300x250',
          'hb_size': '300x250',
          'hb_pb': '10.00',
          'hb_adid': '233bcbee889d46d',
          'hb_bidder': 'appnexus'
        }
      }, 'targeting info returned for current placements');
      resetAuction();
      adaptermanager.callBids.restore();
    });
  });

  describe('onEvent', () => {
    it('should log an error when handler is not a function', () => {
      var spyLogError = sinon.spy(utils, 'logError');
      var event = 'testEvent';
      $$PREBID_GLOBAL$$.onEvent(event);
      assert.ok(spyLogError.calledWith('The event handler provided is not a function and was not set on event "' + event + '".'),
        'expected error was logged');
      utils.logError.restore();
    });

    it('should log an error when id provided is not valid for event', () => {
      var spyLogError = sinon.spy(utils, 'logError');
      var event = 'bidWon';
      $$PREBID_GLOBAL$$.onEvent(event, Function, 'testId');
      assert.ok(spyLogError.calledWith('The id provided is not valid for event "' + event + '" and no handler was set.'),
        'expected error was logged');
      utils.logError.restore();
    });

    it('should call events.on with valid parameters', () => {
      var spyEventsOn = sinon.spy(events, 'on');
      $$PREBID_GLOBAL$$.onEvent('bidWon', Function);
      assert.ok(spyEventsOn.calledWith('bidWon', Function));
      events.on.restore();
    });
  });

  describe('offEvent', () => {
    it('should return when id provided is not valid for event', () => {
      var spyEventsOff = sinon.spy(events, 'off');
      $$PREBID_GLOBAL$$.offEvent('bidWon', Function, 'testId');
      assert.ok(spyEventsOff.notCalled);
      events.off.restore();
    });

    it('should call events.off with valid parameters', () => {
      var spyEventsOff = sinon.spy(events, 'off');
      $$PREBID_GLOBAL$$.offEvent('bidWon', Function);
      assert.ok(spyEventsOff.calledWith('bidWon', Function));
      events.off.restore();
    });
  });

  describe('emit', () => {
    it('should be able to emit event without arguments', () => {
      var spyEventsEmit = sinon.spy(events, 'emit');
      events.emit(CONSTANTS.EVENTS.AUCTION_END);
      assert.ok(spyEventsEmit.calledWith('auctionEnd'));
      events.emit.restore();
    });
  });

  describe('addCallback', () => {
    it('should log error and return null id when error registering callback', () => {
      var spyLogError = sinon.spy(utils, 'logError');
      var id = $$PREBID_GLOBAL$$.addCallback('event', 'fakeFunction');
      assert.equal(id, null, 'id returned was null');
      assert.ok(spyLogError.calledWith('error registering callback. Check method signature'),
        'expected error was logged');
      utils.logError.restore();
    });

    it('should add callback to bidmanager', () => {
      var spyAddCallback = sinon.spy(bidmanager, 'addCallback');
      var id = $$PREBID_GLOBAL$$.addCallback('event', Function);
      assert.ok(spyAddCallback.calledWith(id, Function, 'event'), 'called bidmanager.addCallback');
      bidmanager.addCallback.restore();
    });
  });

  describe('removeCallback', () => {
    it('should return null', () => {
      const id = $$PREBID_GLOBAL$$.removeCallback();
      assert.equal(id, null);
    });
  });

  describe('registerBidAdapter', () => {
    it('should register bidAdaptor with adaptermanager', () => {
      var registerBidAdapterSpy = sinon.spy(adaptermanager, 'registerBidAdapter');
      $$PREBID_GLOBAL$$.registerBidAdapter(Function, 'biddercode');
      assert.ok(registerBidAdapterSpy.called, 'called adaptermanager.registerBidAdapter');
      adaptermanager.registerBidAdapter.restore();
    });

    it('should catch thrown errors', () => {
      var spyLogError = sinon.spy(utils, 'logError');
      var errorObject = { message: 'bidderAdaptor error' };
      var bidderAdaptor = sinon.stub().throws(errorObject);

      $$PREBID_GLOBAL$$.registerBidAdapter(bidderAdaptor, 'biddercode');

      var errorMessage = 'Error registering bidder adapter : ' + errorObject.message;
      assert.ok(spyLogError.calledWith(errorMessage), 'expected error was caught');
      utils.logError.restore();
    });
  });

  describe('bidsAvailableForAdapter', () => {
    it('should update requested bid with status set to available', () => {
      const bidderCode = 'appnexus';
      $$PREBID_GLOBAL$$.bidsAvailableForAdapter(bidderCode);

      const requestedBids = $$PREBID_GLOBAL$$._bidsRequested.find(bid => bid.bidderCode === bidderCode);
      requestedBids.bids.forEach(bid => {
        assert.equal(bid.bidderCode, bidderCode, 'bidderCode was set');
        assert.equal(bid.statusMessage, 'Bid available', 'bid set as available');
      });
    });
  });

  describe('createBid', () => {
    it('should return a bid object', () => {
      const statusCode = 1;
      const bid = $$PREBID_GLOBAL$$.createBid(statusCode);
      assert.isObject(bid, 'bid is an object');
      assert.equal(bid.getStatusCode(), statusCode, 'bid has correct status');

      const defaultStatusBid = $$PREBID_GLOBAL$$.createBid();
      assert.isObject(defaultStatusBid, 'bid is an object');
      assert.equal(defaultStatusBid.getStatusCode(), 0, 'bid has correct status');
    });
  });

  describe('addBidResponse', () => {
    it('should call bidmanager.addBidResponse', () => {
      const addBidResponseStub = sinon.stub(bidmanager, 'addBidResponse');
      const adUnitCode = 'testcode';
      const bid = $$PREBID_GLOBAL$$.createBid(0);

      $$PREBID_GLOBAL$$.addBidResponse(adUnitCode, bid);
      assert.ok(addBidResponseStub.calledWith(adUnitCode, bid), 'called bidmanager.addBidResponse');
      bidmanager.addBidResponse.restore();
    });
  });

  describe('loadScript', () => {
    it('should call adloader.loadScript', () => {
      const loadScriptSpy = sinon.spy(adloader, 'loadScript');
      const tagSrc = '';
      const callback = Function;
      const useCache = false;

      $$PREBID_GLOBAL$$.loadScript(tagSrc, callback, useCache);
      assert.ok(loadScriptSpy.calledWith(tagSrc, callback, useCache), 'called adloader.loadScript');
      adloader.loadScript.restore();
    });
  });

  // describe('enableAnalytics', () => {
  //  let logErrorSpy;
  //
  //  beforeEach(() => {
  //    logErrorSpy = sinon.spy(utils, 'logError');
  //  });
  //
  //  afterEach(() => {
  //    utils.logError.restore();
  //  });
  //
  //  it('should log error when not passed options', () => {
  //    const error = '$$PREBID_GLOBAL$$.enableAnalytics should be called with option {}';
  //    $$PREBID_GLOBAL$$.enableAnalytics();
  //    assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
  //  });
  //
  //  it('should call ga.enableAnalytics with options', () => {
  //    const enableAnalyticsSpy = sinon.spy(ga, 'enableAnalytics');
  //
  //    let options = {'provider': 'ga'};
  //    $$PREBID_GLOBAL$$.enableAnalytics(options);
  //    assert.ok(enableAnalyticsSpy.calledWith({}), 'ga.enableAnalytics called with empty options object');
  //
  //    options['options'] = 'testoptions';
  //    $$PREBID_GLOBAL$$.enableAnalytics(options);
  //    assert.ok(enableAnalyticsSpy.calledWith(options.options), 'ga.enableAnalytics called with provided options');
  //
  //    ga.enableAnalytics.restore();
  //  });
  //
  //  it('should catch errors thrown from ga.enableAnalytics', () => {
  //    const error = {message: 'Error calling GA: '};
  //    const enableAnalyticsStub = sinon.stub(ga, 'enableAnalytics').throws(error);
  //    const options = {'provider': 'ga'};
  //
  //    $$PREBID_GLOBAL$$.enableAnalytics(options);
  //    assert.ok(logErrorSpy.calledWith(error.message), 'expected error was caught');
  //    ga.enableAnalytics.restore();
  //  });
  //
  //  it('should return null for other providers', () => {
  //    const options = {'provider': 'other_provider'};
  //    const returnValue = $$PREBID_GLOBAL$$.enableAnalytics(options);
  //    assert.equal(returnValue, null, 'expected return value');
  //  });
  // });

  describe('sendTimeoutEvent', () => {
    it('should emit BID_TIMEOUT for timed out bids', () => {
      const eventsEmitSpy = sinon.spy(events, 'emit');

      var requestObj = {
        bidsBackHandler: function bidsBackHandlerCallback() {},
        timeout: 20
      };
      var adUnits = [{
        code: 'code',
        bids: [{
          bidder: 'appnexus',
          params: { placementId: '123' }
        }]
      }];
      $$PREBID_GLOBAL$$.adUnits = adUnits;
      $$PREBID_GLOBAL$$.requestBids(requestObj);

      setTimeout(function () {
        assert.ok(eventsEmitSpy.calledWith(CONSTANTS.EVENTS.BID_TIMEOUT), 'emitted events BID_TIMEOUT');
        events.emit.restore();
      }, 100);
    });
  });

  describe('aliasBidder', () => {
    it('should call adaptermanager.aliasBidder', () => {
      const aliasBidAdapterSpy = sinon.spy(adaptermanager, 'aliasBidAdapter');
      const bidderCode = 'testcode';
      const alias = 'testalias';

      $$PREBID_GLOBAL$$.aliasBidder(bidderCode, alias);
      assert.ok(aliasBidAdapterSpy.calledWith(bidderCode, alias), 'called adaptermanager.aliasBidAdapterSpy');
      adaptermanager.aliasBidAdapter.restore();
    });

    it('should log error when not passed correct arguments', () => {
      const logErrorSpy = sinon.spy(utils, 'logError');
      const error = 'bidderCode and alias must be passed as arguments';

      $$PREBID_GLOBAL$$.aliasBidder();
      assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
      utils.logError.restore();
    });
  });

  describe('setPriceGranularity', () => {
    it('should log error when not passed granularity', () => {
      const logErrorSpy = sinon.spy(utils, 'logError');
      const error = 'Prebid Error: no value passed to `setPriceGranularity()`';

      $$PREBID_GLOBAL$$.setConfig({ priceGranularity: null });
      assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
      utils.logError.restore();
    });

    it('should log error when not passed a valid config object', () => {
      const logErrorSpy = sinon.spy(utils, 'logError');
      const error = 'Invalid custom price value passed to `setPriceGranularity()`';
      const badConfig = {
        'buckets': [{
          'min': 0,
          'max': 3,
          'increment': 0.01,
        },
        {
          // missing min prop
          'max': 18,
          'increment': 0.05,
          'cap': true
        }
        ]
      };

      $$PREBID_GLOBAL$$.setConfig({ priceGranularity: badConfig });
      assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
      utils.logError.restore();
    });

    it('should set customPriceBucket with custom config buckets', () => {
      let customPriceBucket = configObj.getConfig('customPriceBucket');
      const goodConfig = {
        'buckets': [{
          'min': 0,
          'max': 3,
          'increment': 0.01,
          'cap': true
        }
        ]
      };
      configObj.setConfig({ priceGranularity: goodConfig });
      let priceGranularity = configObj.getConfig('priceGranularity');
      let newCustomPriceBucket = configObj.getConfig('customPriceBucket');
      expect(goodConfig).to.deep.equal(newCustomPriceBucket);
      expect(priceGranularity).to.equal(CONSTANTS.GRANULARITY_OPTIONS.CUSTOM);
    });
  });

  describe('getAllWinningBids', () => {
    it('should return all winning bids', () => {
      const bids = {name: 'a winning bid'};
      $$PREBID_GLOBAL$$._winningBids = bids;

      assert.deepEqual($$PREBID_GLOBAL$$.getAllWinningBids(), bids);

      $$PREBID_GLOBAL$$._winningBids = [];
    });
  });

  describe('emit event', () => {
    it('should call AUCTION_END only once', () => {
      resetAuction();
      var spyClearAuction = sinon.spy($$PREBID_GLOBAL$$, 'clearAuction');
      var clock1 = sinon.useFakeTimers();

      var requestObj = {
        bidsBackHandler: function bidsBackHandlerCallback() {},
        timeout: 2000,
      };

      $$PREBID_GLOBAL$$.requestBids(requestObj);
      clock1.tick(2001);
      assert.ok(spyClearAuction.calledOnce, true);

      $$PREBID_GLOBAL$$._bidsRequested = [{
        'bidderCode': 'appnexus',
        'requestId': '1863e370099523',
        'bidderRequestId': '2946b569352ef2',
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': '4799418',
              'test': 'me'
            },
            'placementCode': '/19968336/header-bid-tag1',
            'sizes': [[728, 90], [970, 90]],
            'bidId': '392b5a6b05d648',
            'bidderRequestId': '2946b569352ef2',
            'requestId': '1863e370099523',
            'startTime': 1462918897462,
            'status': 1
          }
        ],
        'start': 1462918897460
      }];

      $$PREBID_GLOBAL$$._bidsReceived = [];

      var bid = Object.assign({
        'bidderCode': 'appnexus',
        'width': 728,
        'height': 90,
        'statusMessage': 'Bid available',
        'adId': '24bd938435ec3fc',
        'creative_id': 33989846,
        'cpm': 0,
        'adUrl': 'http://lax1-ib.adnxs.com/ab?e=wqT_3QLyBKhyAgAAAwDWAAUBCMjAybkFEOOryfjI7rGNWhjL84KE1tzG-kkgASotCQAAAQII4D8RAQcQAADgPxkJCQjwPyEJCQjgPykRCaAwuvekAji-B0C-B0gCUNbJmhBYweAnYABokUB4mt0CgAEBigEDVVNEkgUG8ECYAdgFoAFaqAEBsAEAuAEBwAEDyAEA0AEA2AEA4AEA8AEAigI6dWYoJ2EnLCA0OTQ0NzIsIDE0NjI5MTkyNDApOwEcLHInLCAzMzk4OTg0NjYeAPBvkgLNASFwU2Y1YUFpNjBJY0VFTmJKbWhBWUFDREI0Q2N3QURnQVFBUkl2Z2RRdXZla0FsZ0FZSk1IYUFCd3lnNTRDb0FCcGh5SUFRcVFBUUdZQVFHZ0FRR29BUU93QVFDNUFRQUFBQUFBQU9BX3dRRQkMSEFEZ1A4a0JJNTJDbGs5VjB6X1oVKCRQQV80QUVBOVFFBSw8bUFLS2dNQ0NENkFDQUxVQwUVBEwwCQh0T0FDQU9nQ0FQZ0NBSUFEQVEuLpoCJSFfZ2lqYXdpMtAA8KZ3ZUFuSUFRb2lvREFnZzgu2ALoB-ACx9MB6gIfaHR0cDovL3ByZWJpZC5vcmc6OTk5OS9ncHQuaHRtbIADAIgDAZADAJgDBaADAaoDALADALgDAMADrALIAwDYAwDgAwDoAwD4AwOABACSBAQvanB0mAQAogQKMTAuMS4xMy4zN6gEi-wJsgQICAAQABgAIAC4BADABADIBADSBAsxMC4wLjgwLjI0MA..&s=1f584d32c2d7ae3ce3662cfac7ca24e710bc7fd0&referrer=http%3A%2F%2Fprebid.org%3A9999%2Fgpt.html',
        'responseTimestamp': 1462919239342,
        'requestTimestamp': 1462919238919,
        'bidder': 'appnexus',
        'adUnitCode': '/19968336/header-bid-tag1',
        'timeToRespond': 423,
        'pbLg': '5.00',
        'pbMg': '10.00',
        'pbHg': '10.00',
        'pbAg': '10.00',
        'size': '728x90',
        'alwaysUseBid': true,
        'adserverTargeting': {
          'hb_bidder': 'appnexus',
          'hb_adid': '24bd938435ec3fc',
          'hb_pb': '10.00',
          'hb_size': '728x90',
          'foobar': '728x90'
        }
      }, bidfactory.createBid(2));

      var adUnits = [{
        code: '/19968336/header-bid-tag1',
        bids: [{
          bidder: 'appnexus',
          params: { placementId: '123' }
        }]
      }];
      $$PREBID_GLOBAL$$.adUnits = adUnits;

      const adUnitCode = '/19968336/header-bid-tag1';
      $$PREBID_GLOBAL$$.addBidResponse(adUnitCode, bid);
      assert.equal(spyClearAuction.callCount, 1, 'AUCTION_END event emitted more than once');

      clock1.restore();
      resetAuction();
    });
  });

  describe('removeAdUnit', () => {
    it('should remove given adUnit in adUnits array', () => {
      const adUnit1 = {
        code: 'adUnit1',
        bids: [{
          bidder: 'appnexus',
          params: { placementId: '123' }
        }]
      };
      const adUnit2 = {
        code: 'adUnit2',
        bids: [{
          bidder: 'rubicon',
          params: {
            accountId: '1234',
            siteId: '1234',
            zoneId: '1234'
          }
        }]
      };
      const adUnits = [adUnit1, adUnit2];
      $$PREBID_GLOBAL$$.adUnits = adUnits;
      $$PREBID_GLOBAL$$.removeAdUnit('foobar');
      assert.deepEqual($$PREBID_GLOBAL$$.adUnits, adUnits);
      $$PREBID_GLOBAL$$.removeAdUnit('adUnit1');
      assert.deepEqual($$PREBID_GLOBAL$$.adUnits, [adUnit2]);
    });
  });

  describe('getDealTargeting', () => {
    beforeEach(() => {
      resetAuction();
    });

    afterEach(() => {
      resetAuction();
    });

    it('should truncate deal keys', () => {
      $$PREBID_GLOBAL$$._bidsReceived = [
        {
          'bidderCode': 'appnexusDummyName',
          'dealId': '1234',
          'width': 300,
          'height': 250,
          'statusMessage': 'Bid available',
          'adId': '233bcbee889d46d',
          'creative_id': 29681110,
          'cpm': 10,
          'adUrl': 'http://lax1-ib.adnxs.com/ab?e=wqT_3QL8BKh8AgAAAwDWAAUBCMjAybkFEMLLiJWTu9PsVxjL84KE1tzG-kkgASotCQAAAQII4D8RAQcQAADgPxkJCQjwPyEJCQjgPykRCaAwuvekAji-B0C-B0gCUNbLkw5YweAnYABokUB4190DgAEBigEDVVNEkgUG8FKYAawCoAH6AagBAbABALgBAcABA8gBANABANgBAOABAPABAIoCOnVmKCdhJywgNDk0NDcyLCAxNDYyOTE5MjQwKTt1ZigncicsIDI5NjgxMTEwLDIeAPBskgLZASFmU21rZ0FpNjBJY0VFTmJMa3c0WUFDREI0Q2N3QURnQVFBUkl2Z2RRdXZla0FsZ0FZSk1IYUFCd0EzZ0RnQUVEaUFFRGtBRUJtQUVCb0FFQnFBRURzQUVBdVFFQUFBQUFBQURnUDhFQgkMTEFBNERfSkFRMkxMcEVUMU93XzJRFSggd1AtQUJBUFVCBSxASmdDaW9EVTJnV2dBZ0MxQWcBFgRDOQkIqERBQWdQSUFnUFFBZ1BZQWdQZ0FnRG9BZ0Q0QWdDQUF3RS6aAiUhV1FrbmI63AAcd2VBbklBUW8JXPCVVS7YAugH4ALH0wHqAh9odHRwOi8vcHJlYmlkLm9yZzo5OTk5L2dwdC5odG1sgAMAiAMBkAMAmAMFoAMBqgMAsAMAuAMAwAOsAsgDANgDAOADAOgDAPgDA4AEAJIEBC9qcHSYBACiBAoxMC4xLjEzLjM3qAQAsgQICAAQABgAIAC4BADABADIBADSBAoxMC4wLjg1Ljkx&s=1bf15e8cdc7c0c8c119614c6386ab1496560da39&referrer=http%3A%2F%2Fprebid.org%3A9999%2Fgpt.html',
          'responseTimestamp': 1462919239340,
          'requestTimestamp': 1462919238919,
          'bidder': 'appnexus',
          'adUnitCode': '/19968336/header-bid-tag-0',
          'timeToRespond': 421,
          'pbLg': '5.00',
          'pbMg': '10.00',
          'pbHg': '10.00',
          'pbAg': '10.00',
          'size': '300x250',
          'alwaysUseBid': true,
          'requestId': 123456,
          'adserverTargeting': {
            'hb_bidder': 'appnexus',
            'hb_adid': '233bcbee889d46d',
            'hb_pb': '10.00',
            'hb_size': '300x250',
            'foobar': '300x250',
            'hb_deal_appnexusDummyName': '1234'
          }
        }
      ];

      var result = $$PREBID_GLOBAL$$.getAdserverTargeting();
      Object.keys(result['/19968336/header-bid-tag-0']).forEach(value => {
        expect(value).to.have.length.of.at.most(20);
      });
    });
  });

  describe('video adserverTag', () => {
    var adserverTag = 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/19968336/header-bid-tag-0&impl=s&gdfp_req=1&env=vp&output=xml_vast2&unviewed_position_start=1&url=www.test.com';

    var options = {
      'adserver': 'dfp',
      'code': '/19968336/header-bid-tag-0'
    };

    beforeEach(() => {
      resetAuction();
      $$PREBID_GLOBAL$$._bidsReceived = [
        {
          'bidderCode': 'appnexusAstDummyName',
          'width': 0,
          'height': 0,
          'statusMessage': 'Bid returned empty or error response',
          'adId': '233bcbee889d46d',
          'requestId': 123456,
          'responseTimestamp': 1462919238959,
          'requestTimestamp': 1462919238910,
          'cpm': 0,
          'bidder': 'appnexus',
          'adUnitCode': '/19968336/header-bid-tag-0',
          'timeToRespond': 49,
          'pbLg': '0.00',
          'pbMg': '0.00',
          'pbHg': '0.00',
          'pbAg': '0.00',
          'pbDg': '0.00',
          'pbCg': '',
          'adserverTargeting': {}
        },
        {
          'bidderCode': 'appnexusAst',
          'dealId': '1234',
          'width': 300,
          'height': 250,
          'statusMessage': 'Bid available',
          'adId': '233bcbee889d46d',
          'creative_id': 29681110,
          'cpm': 10,
          'vastUrl': 'http://www.simplevideoad.com/',
          'descriptionUrl': 'http://www.simplevideoad.com/',
          'responseTimestamp': 1462919239340,
          'requestTimestamp': 1462919238919,
          'bidder': 'appnexus',
          'adUnitCode': '/19968336/header-bid-tag-0',
          'timeToRespond': 421,
          'pbLg': '5.00',
          'pbMg': '10.00',
          'pbHg': '10.00',
          'pbAg': '10.00',
          'size': '300x250',
          'alwaysUseBid': true,
          'requestId': 123456,
          'adserverTargeting': {
            'hb_bidder': 'appnexus',
            'hb_adid': '233bcbee889d46d',
            'hb_pb': '10.00',
            'hb_size': '300x250',
            'foobar': '300x250',
            'hb_deal_appnexusAst': '1234'
          }
        }
      ];
    });

    afterEach(() => {
      resetAuction();
    });

    it('should log error when adserver is not dfp', () => {
      var logErrorSpy = sinon.spy(utils, 'logError');
      var options = {
        'adserver': 'anyother',
        'code': '/19968336/header-bid-tag-0'
      };
      var masterTagUrl = $$PREBID_GLOBAL$$.buildMasterVideoTagFromAdserverTag(adserverTag, options);
      assert.ok(logErrorSpy.calledOnce, true);
      utils.logError.restore();
    });

    it('should return original adservertag if bids empty', () => {
      $$PREBID_GLOBAL$$._bidsReceived = [];
      var masterTagUrl = $$PREBID_GLOBAL$$.buildMasterVideoTagFromAdserverTag(adserverTag, options);
      expect(masterTagUrl).to.equal(adserverTag);
    });

    it('should return original adservertag if there are no bids for the given placement code', () => {
      // urls.js:parse returns port 443 for IE11, blank for other browsers
      const ie11port = !!window.MSInputMethodContext && !!document.documentMode ? ':443' : '';
      const adserverTag = `https://pubads.g.doubleclick.net${ie11port}/gampad/ads?sz=640x480&iu=/19968336/header-bid-tag-0&impl=s&gdfp_req=1&env=vp&output=xml_vast2&unviewed_position_start=1&url=www.test.com`;

      const masterTagUrl = $$PREBID_GLOBAL$$.buildMasterVideoTagFromAdserverTag(adserverTag, {
        'adserver': 'dfp',
        'code': 'one-without-bids'
      });

      expect(masterTagUrl).to.equal(adserverTag);
    });

    it('should log error when google\'s parameters are missing in adserverTag', () => {
      var logErrorSpy = sinon.spy(utils, 'logError');
      var adserverTag = 'https://pubads.g.doubleclick.net/gampad/ads?sz=640x480&iu=/19968336/header-bid-tag-0&impl=s&gdfp_req=1&env=vp&output=xml_vast2&unviewed_position_start=1&url=www.test.com';
      var masterTagUrl = $$PREBID_GLOBAL$$.buildMasterVideoTagFromAdserverTag(adserverTag, options);
      assert.ok(logErrorSpy.calledOnce, true);
      utils.logError.restore();
    });

    it('should append parameters to the adserverTag', () => {
      var masterTagUrl = $$PREBID_GLOBAL$$.buildMasterVideoTagFromAdserverTag(adserverTag, options);
      var masterTagUrlParsed = urlParse(masterTagUrl, true);
      var masterTagQuery = masterTagUrlParsed.query;
      var expectedTargetingQuery = 'hb_bidder=appnexus&hb_adid=233bcbee889d46d&hb_pb=10.00&hb_size=300x250&foobar=300x250&hb_deal_appnexusAst=1234';

      expect(masterTagQuery).to.have.property('cust_params').and.to.equal(expectedTargetingQuery);
      expect(masterTagQuery).to.have.property('description_url').and.to.equal('http://www.simplevideoad.com/');
    });
  });

  describe('bidderSequence', () => {
    it('setting to `random` uses shuffled order of adUnits', () => {
      sinon.spy(utils, 'shuffle');
      const requestObj = {
        bidsBackHandler: function bidsBackHandlerCallback() {},
        timeout: 2000
      };

      $$PREBID_GLOBAL$$.setConfig({ bidderSequence: 'random' });
      $$PREBID_GLOBAL$$.requestBids(requestObj);

      sinon.assert.calledOnce(utils.shuffle);
      utils.shuffle.restore();
      resetAuction();
    });
  });

  describe('getHighestCpm', () => {
    it('returns an array of winning bid objects for each adUnit', () => {
      const highestCpmBids = $$PREBID_GLOBAL$$.getHighestCpmBids();
      expect(highestCpmBids.length).to.equal(2);
      expect(highestCpmBids[0]).to.deep.equal($$PREBID_GLOBAL$$._bidsReceived[1]);
      expect(highestCpmBids[1]).to.deep.equal($$PREBID_GLOBAL$$._bidsReceived[2]);
    });

    it('returns an array containing the highest bid object for the given adUnitCode', () => {
      const highestCpmBids = $$PREBID_GLOBAL$$.getHighestCpmBids('/19968336/header-bid-tag-0');
      expect(highestCpmBids.length).to.equal(1);
      expect(highestCpmBids[0]).to.deep.equal($$PREBID_GLOBAL$$._bidsReceived[1]);
    });

    it('returns an empty array when the given adUnit is not found', () => {
      const highestCpmBids = $$PREBID_GLOBAL$$.getHighestCpmBids('/stallone');
      expect(highestCpmBids.length).to.equal(0);
    });

    it('returns an empty array when the given adUnit has no bids', () => {
      $$PREBID_GLOBAL$$._bidsReceived = [$$PREBID_GLOBAL$$._bidsReceived[0]];
      $$PREBID_GLOBAL$$._bidsReceived[0].cpm = 0;
      const highestCpmBids = $$PREBID_GLOBAL$$.getHighestCpmBids('/19968336/header-bid-tag-0');
      expect(highestCpmBids.length).to.equal(0);
      resetAuction();
    });
  });

  describe('setTargetingForAst', () => {
    beforeEach(() => {
      resetAuction();
    });

    afterEach(() => {
      resetAuction();
    });

    it('should set targeting for appnexus apntag object', () => {
      const adUnitCode = '/19968336/header-bid-tag-0';
      const bidder = 'appnexus';
      const bids = $$PREBID_GLOBAL$$._bidsReceived.filter(bid => (bid.adUnitCode === adUnitCode && bid.bidderCode === bidder));

      var expectedAdserverTargeting = bids[0].adserverTargeting;
      var newAdserverTargeting = {};
      for (var key in expectedAdserverTargeting) {
        var nkey = (key === 'hb_adid') ? key.toUpperCase() : key;
        newAdserverTargeting[nkey] = expectedAdserverTargeting[key];
      }

      $$PREBID_GLOBAL$$.setTargetingForAst();
      expect(newAdserverTargeting).to.deep.equal(window.apntag.tags[adUnitCode].keywords);
    });

    it('should not find hb_adid key in lowercase for all bidders', () => {
      const adUnitCode = '/19968336/header-bid-tag-0';
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });
      $$PREBID_GLOBAL$$.setTargetingForAst();
      const keywords = Object.keys(window.apntag.tags[adUnitCode].keywords).filter(keyword => (keyword.substring(0, 'hb_adid'.length) === 'hb_adid'));
      expect(keywords.length).to.equal(0);
    });
  });

  describe('The monkey-patched queue.push function', function() {
    beforeEach(function initializeSpies() {
      sinon.spy(utils, 'logError');
    });

    afterEach(function resetSpies() {
      utils.logError.restore();
    });

    it('should run commands which are pushed into it', function() {
      let cmd = sinon.spy();
      $$PREBID_GLOBAL$$.cmd.push(cmd);
      assert.isTrue(cmd.called);
    });

    it('should log an error when given non-functions', function() {
      $$PREBID_GLOBAL$$.cmd.push(5);
      assert.isTrue(utils.logError.calledOnce);
    });

    it('should log an error if the command passed into it fails', function() {
      $$PREBID_GLOBAL$$.cmd.push(function() {
        throw new Error('Failed function.');
      });
      assert.isTrue(utils.logError.calledOnce);
    });
  });

  describe('The monkey-patched que.push function', function() {
    it('should be the same as the cmd.push function', function() {
      assert.equal($$PREBID_GLOBAL$$.que.push, $$PREBID_GLOBAL$$.cmd.push);
    });
  });

  describe('setS2SConfig', () => {
    let logErrorSpy;

    beforeEach(() => {
      logErrorSpy = sinon.spy(utils, 'logError');
    });

    afterEach(() => {
      utils.logError.restore();
    });

    it('should log error when accountId is missing', () => {
      const options = {
        enabled: true,
        bidders: ['appnexus'],
        timeout: 1000,
        adapter: 'prebidServer',
        endpoint: 'https://prebid.adnxs.com/pbs/v1/auction'
      };

      $$PREBID_GLOBAL$$.setConfig({ s2sConfig: {options} });
      assert.ok(logErrorSpy.calledOnce, true);
    });

    it('should log error when bidders is missing', () => {
      const options = {
        accountId: '1',
        enabled: true,
        timeout: 1000,
        adapter: 's2s',
        endpoint: 'https://prebid.adnxs.com/pbs/v1/auction'
      };

      $$PREBID_GLOBAL$$.setConfig({ s2sConfig: {options} });
      assert.ok(logErrorSpy.calledOnce, true);
    });
  });
});
