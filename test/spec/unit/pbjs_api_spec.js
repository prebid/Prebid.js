import {
  getAdServerTargeting,
  getBidRequests,
  getBidResponses,
  getBidResponsesFromAPI,
  getTargetingKeys,
  getTargetingKeysBidLandscape,
  getAdUnits
} from 'test/fixtures/fixtures';
import { auctionManager, newAuctionManager } from 'src/auctionManager';
import { targeting, newTargeting } from 'src/targeting';
import { config as configObj } from 'src/config';
import * as ajaxLib from 'src/ajax';
import * as auctionModule from 'src/auction';
import { registerBidder } from 'src/adapters/bidderFactory';

var assert = require('chai').assert;
var expect = require('chai').expect;

var urlParse = require('url-parse');

var prebid = require('src/prebid');
var utils = require('src/utils');
// var bidmanager = require('src/bidmanager');
var bidfactory = require('src/bidfactory');
var adloader = require('src/adloader');
var adaptermanager = require('src/adaptermanager');
var events = require('src/events');
var adserver = require('src/adserver');
var CONSTANTS = require('src/constants.json');

// These bid adapters are required to be loaded for the following tests to work
require('modules/appnexusBidAdapter');

var config = require('test/fixtures/config.json');

$$PREBID_GLOBAL$$ = $$PREBID_GLOBAL$$ || {};
var adUnits = getAdUnits();
var adUnitCodes = getAdUnits().map(unit => unit.code);
var bidsBackHandler = function() {};
const timeout = 2000;
var auction = auctionManager.createAuction({adUnits, adUnitCodes, callback: bidsBackHandler, cbTimeout: timeout});
auction.getBidRequests = getBidRequests;
auction.getBidsReceived = getBidResponses;
auction.getAdUnits = getAdUnits;
auction.getAuctionStatus = function() { return auctionModule.AUCTION_COMPLETED }

function resetAuction() {
  $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: false });
  auction.getBidRequests = getBidRequests;
  auction.getBidsReceived = getBidResponses;
  auction.getAdUnits = getAdUnits;
  auction.getAuctionStatus = function() { return auctionModule.AUCTION_COMPLETED }
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
      assert.equal(auction.getBidsReceived()[0]['bidderCode'], 'triplelift');
      assert.equal(auction.getBidsReceived()[0]['cpm'], 0.112256);

      // Modify the losing bid to have `alwaysUseBid=true` and a custom `adserverTargeting` key.
      let _bidsReceived = getBidResponses();
      _bidsReceived[0]['alwaysUseBid'] = true;
      _bidsReceived[0]['adserverTargeting'] = {
        always_use_me: 'abc',
      };

      auction.getBidsReceived = function() { return _bidsReceived };

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
      resetAuction();
      // mimic a bidderSetting.standard key here for each bid and alwaysUseBid true for every bid
      let _bidsReceived = getBidResponses();
      _bidsReceived.forEach(bid => {
        bid.adserverTargeting.custom_ad_id = bid.adId;
        bid.alwaysUseBid = true;
      });

      auction.getBidsReceived = function() { return _bidsReceived };

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
      let _bidsReceived = getBidResponses();
      _bidsReceived.forEach(bid => {
        bid.adserverTargeting.custom_ad_id = bid.adId;
        bid.sendStandardTargeting = false;
      });

      auction.getBidsReceived = function() { return _bidsReceived };

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
    let auction;
    let ajaxStub;
    let cbTimeout = 3000;
    let auctionManagerInstance = newAuctionManager();
    let targeting = newTargeting(auctionManagerInstance);

    let RESPONSE = {
      'version': '0.0.1',
      'tags': [{
        'uuid': '4d0a6829338a07',
        'tag_id': 4799418,
        'auction_id': '2256922143947979797',
        'no_ad_url': 'http://lax1-ib.adnxs.com/no-ad',
        'timeout_ms': 2500,
        'ads': [{
          'content_source': 'rtb',
          'ad_type': 'banner',
          'buyer_member_id': 958,
          'creative_id': 33989846,
          'media_type_id': 1,
          'media_subtype_id': 1,
          'cpm': 1.99,
          'cpm_publisher_currency': 0.500000,
          'publisher_currency_code': '$',
          'client_initiated_ad_counting': true,
          'rtb': {
            'banner': {
              'width': 728,
              'height': 90,
              'content': '<!-- Creative -->'
            },
            'trackers': [{
              'impression_urls': ['http://lax1-ib.adnxs.com/impression']
            }]
          }
        }]
      }]
    };

    before(() => {
      $$PREBID_GLOBAL$$.bidderSettings = {};
      currentPriceBucket = configObj.getConfig('priceGranularity');
      configObj.setConfig({ priceGranularity: customConfigObject });
      sinon.stub(adaptermanager, 'makeBidRequests', () => ([{
        'bidderCode': 'appnexus',
        'auctionId': '20882439e3238c',
        'bidderRequestId': '331f3cf3f1d9c8',
        'bids': [
          {
            'bidder': 'appnexus',
            'params': {
              'placementId': '10433394'
            },
            'adUnitCode': 'div-gpt-ad-1460505748561-0',
            'sizes': [
              [
                300,
                250
              ],
              [
                300,
                600
              ]
            ],
            'bidId': '4d0a6829338a07',
            'bidderRequestId': '331f3cf3f1d9c8',
            'auctionId': '20882439e3238c'
          }
        ],
        'auctionStart': 1505250713622,
        'timeout': 3000
      }]
      ));
    });

    after(() => {
      configObj.setConfig({ priceGranularity: currentPriceBucket });
      adaptermanager.makeBidRequests.restore();
    })

    beforeEach(() => {
      let adUnits = [{
        code: 'div-gpt-ad-1460505748561-0',
        sizes: [[300, 250], [300, 600]],
        bids: [{
          bidder: 'appnexus',
          params: {
            placementId: '10433394'
          }
        }]
      }];
      let adUnitCodes = ['div-gpt-ad-1460505748561-0'];
      auction = auctionManagerInstance.createAuction({adUnits, adUnitCodes});
      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder', function() {
        return function(url, callback) {
          const fakeResponse = sinon.stub();
          fakeResponse.returns('headerContent');
          callback.success(JSON.stringify(RESPONSE), { getResponseHeader: fakeResponse });
        }
      });
    });

    afterEach(() => {
      ajaxStub.restore();
    });

    it('should get correct hb_pb when using bid.cpm is between 0 to 5', () => {
      RESPONSE.tags[0].ads[0].cpm = 2.1234;
      auction.callBids(cbTimeout);
      let bidTargeting = targeting.getAllTargeting();
      let bid = bidTargeting[0]['div-gpt-ad-1460505748561-0'].filter(obj => obj.hb_pb !== undefined);
      expect(bid[0]['hb_pb'][0]).to.equal('2.12');
    });

    it('should get correct hb_pb when using bid.cpm is between 5 to 8', () => {
      RESPONSE.tags[0].ads[0].cpm = 6.78;
      auction.callBids(cbTimeout);
      let bidTargeting = targeting.getAllTargeting();
      let bid = bidTargeting[0]['div-gpt-ad-1460505748561-0'].filter(obj => obj.hb_pb !== undefined);
      expect(bid[0]['hb_pb'][0]).to.equal('6.75');
    });

    it('should get correct hb_pb when using bid.cpm is between 8 to 20', () => {
      RESPONSE.tags[0].ads[0].cpm = 19.5234;
      auction.callBids(cbTimeout);
      let bidTargeting = targeting.getAllTargeting();
      let bid = bidTargeting[0]['div-gpt-ad-1460505748561-0'].filter(obj => obj.hb_pb !== undefined);
      expect(bid[0]['hb_pb'][0]).to.equal('19.50');
    });

    it('should get correct hb_pb when using bid.cpm is between 20 to 25', () => {
      RESPONSE.tags[0].ads[0].cpm = 21.5234;
      auction.callBids(cbTimeout);
      let bidTargeting = targeting.getAllTargeting();
      let bid = bidTargeting[0]['div-gpt-ad-1460505748561-0'].filter(obj => obj.hb_pb !== undefined);
      expect(bid[0]['hb_pb'][0]).to.equal('21.00');
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
      assert.equal(auctionManager.getBidsReceived()[0]['bidderCode'], 'triplelift');
      assert.equal(auctionManager.getBidsReceived()[0]['cpm'], 0.112256);

      resetAuction();
      // Modify the losing bid to have `alwaysUseBid=true` and a custom `adserverTargeting` key.
      let _bidsReceived = getBidResponses();
      _bidsReceived[0]['alwaysUseBid'] = true;
      _bidsReceived[0]['adserverTargeting'] = {
        always_use_me: 'abc',
      };

      auction.getBidsReceived = function() { return _bidsReceived };

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

  describe('renderAd', function () {
    var bidId = 1;
    var doc = {};
    var elStub = {};
    var adResponse = {};
    var spyLogError = null;
    var spyLogMessage = null;
    var inIframe = true;

    function pushBidResponseToAuction(obj) {
      adResponse = Object.assign({
        auctionId: 1,
        adId: bidId,
        width: 300,
        height: 250,
      }, obj);
      auction.getBidsReceived = function() {
        let bidsReceived = getBidResponses();
        bidsReceived.push(adResponse);
        return bidsReceived;
      }
      auction.getAuctionId = () => 1;
    }

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

      spyLogError = sinon.spy(utils, 'logError');
      spyLogMessage = sinon.spy(utils, 'logMessage');

      inIframe = true;
      sinon.stub(utils, 'inIframe', () => inIframe);
    });

    afterEach(function () {
      auction.getBidsReceived = getBidResponses;
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
      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });
      adResponse.ad = "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>";
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);
      assert.ok(doc.write.calledWith(adResponse.ad), 'ad was written to doc');
      assert.ok(doc.close.called, 'close method called');
    });

    it('should place the url inside an iframe on the doc', function () {
      pushBidResponseToAuction({
        adUrl: 'http://server.example.com/ad/ad.js'
      });
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);
      assert.ok(elStub.insertBefore.called, 'url was written to iframe in doc');
    });

    it('should log an error when no ad or url', function () {
      pushBidResponseToAuction({});
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);
      var error = 'Error trying to write ad. No ad for bid response id: ' + bidId;
      assert.ok(spyLogError.calledWith(error), 'expected error was logged');
    });

    it('should log an error when not in an iFrame', () => {
      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });
      inIframe = false;
      $$PREBID_GLOBAL$$.renderAd(document, bidId);
      const error = 'Error trying to write ad. Ad render call ad id ' + bidId + ' was prevented from writing to the main document.';
      assert.ok(spyLogError.calledWith(error), 'expected error was logged');
    });

    it('should not render videos', () => {
      pushBidResponseToAuction({
        mediatype: 'video'
      });
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);
      sinon.assert.notCalled(doc.write);
    });

    it('should catch errors thrown when trying to write ads to the page', function () {
      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });

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
      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });
      $$PREBID_GLOBAL$$.renderAd(doc, bidId);
      assert.deepEqual($$PREBID_GLOBAL$$.getAllWinningBids()[0], adResponse);
    });
  });

  describe('requestBids', () => {
    var adUnitsBackup;
    var auctionManagerStub;
    let logMessageSpy

    let spec = {
      code: 'sampleBidder',
      isBidRequestValid: () => {},
      buildRequests: () => {},
      interpretResponse: () => {},
      getUserSyncs: () => {}
    };
    registerBidder(spec);

    describe('part 1', () => {
      beforeEach(() => {
        adUnitsBackup = auction.getAdUnits
        auctionManagerStub = sinon.stub(auctionManager, 'createAuction', function() {
          return auction;
        });
        logMessageSpy = sinon.spy(utils, 'logMessage');
      });

      afterEach(() => {
        auction.getAdUnits = adUnitsBackup;
        auctionManager.createAuction.restore();
        utils.logMessage.restore();
        resetAuction();
      });

      it('should log message when adUnits not configured', () => {
        $$PREBID_GLOBAL$$.adUnits = [];
        $$PREBID_GLOBAL$$.requestBids({});

        assert.ok(logMessageSpy.calledWith('No adUnits configured. No bids requested.'), 'expected message was logged');
      });

      it('should execute callback after timeout', () => {
        let clock = sinon.useFakeTimers();
        let requestObj = {
          bidsBackHandler: function bidsBackHandlerCallback() {},
          timeout: timeout,
          adUnits: auction.getAdUnits()
        };

        $$PREBID_GLOBAL$$.requestBids(requestObj);
        let re = new RegExp('^Auction [a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12} timedOut$');
        clock.tick(requestObj.timeout - 1);
        assert.ok(logMessageSpy.neverCalledWith(sinon.match(re)), 'executeCallback not called');

        clock.tick(1);
        assert.ok(logMessageSpy.calledWith(sinon.match(re)), 'executeCallback called');

        clock.restore();
      });

      it('should execute callback immediately if adUnits is empty', () => {
        var bidsBackHandler = function bidsBackHandlerCallback() {};
        var spyExecuteCallback = sinon.spy(bidsBackHandler);

        $$PREBID_GLOBAL$$.adUnits = [];
        $$PREBID_GLOBAL$$.requestBids({
          bidsBackHandler: spyExecuteCallback
        });

        assert.ok(spyExecuteCallback.calledOnce, 'callback executed immediately when adUnits is' +
          ' empty');
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
    });

    describe.skip('#video', () => {
      let spyCallBids;
      let createAuctionStub;
      let adUnits;

      before(() => {
        adUnits = [{
          code: 'adUnit-code',
          mediaType: 'video',
          sizes: [[300, 250], [300, 600]],
          bids: [
            {bidder: 'appnexus', params: {placementId: 'id'}},
            {bidder: 'sampleBidder', params: {placementId: 'id'}}
          ]
        }];
        adUnitCodes = ['adUnit-code'];
        let auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: timeout});
        spyCallBids = sinon.spy(adaptermanager, 'callBids');
        createAuctionStub = sinon.stub(auctionModule, 'newAuction');
        createAuctionStub.returns(auction);
      });

      after(() => {
        auctionModule.newAuction.restore();
        adaptermanager.callBids.restore();
      });

      it('should not callBids if a video adUnit has non-video bidders', () => {
        const videoAdaptersBackup = adaptermanager.videoAdapters;
        adaptermanager.videoAdapters = ['appnexus'];
        $$PREBID_GLOBAL$$.requestBids({adUnits});
        sinon.assert.notCalled(adaptermanager.callBids);
        adaptermanager.videoAdapters = videoAdaptersBackup;
      });
    });

    describe('#video', () => {
      let spyCallBids;
      let createAuctionStub;
      let adUnits;

      before(() => {
        adUnits = [{
          code: 'adUnit-code',
          mediaType: 'video',
          sizes: [[300, 250], [300, 600]],
          bids: [
            {bidder: 'appnexus', params: {placementId: 'id'}}
          ]
        }];
        adUnitCodes = ['adUnit-code'];
        let auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: timeout});
        spyCallBids = sinon.spy(adaptermanager, 'callBids');
        createAuctionStub = sinon.stub(auctionModule, 'newAuction');
        createAuctionStub.returns(auction);
      })

      after(() => {
        auctionModule.newAuction.restore();
        adaptermanager.callBids.restore();
      });

      it('should callBids if a video adUnit has all video bidders', () => {
        const videoAdaptersBackup = adaptermanager.videoAdapters;
        adaptermanager.videoAdapters = ['appnexus'];
        $$PREBID_GLOBAL$$.requestBids({adUnits});
        sinon.assert.calledOnce(adaptermanager.callBids);
        adaptermanager.videoAdapters = videoAdaptersBackup;
      });
    });

    describe('#native', () => {
      let spyCallBids;
      let createAuctionStub;
      let adUnits;

      before(() => {
        adUnits = [{
          code: 'adUnit-code',
          mediaType: 'native',
          sizes: [[300, 250], [300, 600]],
          bids: [
            {bidder: 'appnexus', params: {placementId: 'id'}},
            {bidder: 'sampleBidder', params: {placementId: 'id'}}
          ]
        }];
        adUnitCodes = ['adUnit-code'];
        let auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: timeout});
        spyCallBids = sinon.spy(adaptermanager, 'callBids');
        createAuctionStub = sinon.stub(auctionModule, 'newAuction');
        createAuctionStub.returns(auction);
      });

      after(() => {
        auctionModule.newAuction.restore();
        adaptermanager.callBids.restore();
      });

      it('should only request native bidders on native adunits', () => {
        // appnexus is a native bidder, appnexus is not
        $$PREBID_GLOBAL$$.requestBids({adUnits});
        sinon.assert.calledOnce(adaptermanager.callBids);
        const spyArgs = adaptermanager.callBids.getCall(0);
        const biddersCalled = spyArgs.args[0][0].bids;
        expect(biddersCalled.length).to.equal(1);
      });
    });

    describe('part 2', () => {
      let spyCallBids;
      let createAuctionStub;
      let adUnits;

      before(() => {
        adUnits = [{
          code: 'adUnit-code',
          sizes: [[300, 250], [300, 600]],
          bids: [
            {bidder: 'appnexus', params: {placementId: '10433394'}}
          ]
        }];
        let adUnitCodes = ['adUnit-code'];
        let auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: timeout});

        adUnits[0]['mediaType'] = 'native';
        adUnitCodes = ['adUnit-code'];
        let auction1 = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: timeout});

        adUnits = [{
          code: 'adUnit-code',
          nativeParams: {type: 'image'},
          sizes: [[300, 250], [300, 600]],
          bids: [
            {bidder: 'appnexus', params: {placementId: 'id'}}
          ]
        }];
        let auction3 = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: timeout});

        let createAuctionStub = sinon.stub(auctionModule, 'newAuction');
        createAuctionStub.onCall(0).returns(auction1);
        createAuctionStub.onCall(2).returns(auction3);
        createAuctionStub.returns(auction);
      });

      after(() => {
        auctionModule.newAuction.restore();
      });

      beforeEach(() => {
        spyCallBids = sinon.spy(adaptermanager, 'callBids');
      })

      afterEach(() => {
        adaptermanager.callBids.restore();
      })

      it('should callBids if a native adUnit has all native bidders', () => {
        $$PREBID_GLOBAL$$.requestBids({adUnits});
        sinon.assert.calledOnce(adaptermanager.callBids);
      });

      it('should call callBids function on adaptermanager', () => {
        let adUnits = [{
          code: 'adUnit-code',
          sizes: [[300, 250], [300, 600]],
          bids: [
            {bidder: 'appnexus', params: {placementId: '10433394'}}
          ]
        }];
        $$PREBID_GLOBAL$$.requestBids({adUnits});
        assert.ok(spyCallBids.called, 'called adaptermanager.callBids');
      });

      it('splits native type to individual native assets', () => {
        let adUnits = [{
          code: 'adUnit-code',
          nativeParams: {type: 'image'},
          sizes: [[300, 250], [300, 600]],
          bids: [
            {bidder: 'appnexus', params: {placementId: 'id'}}
          ]
        }];
        $$PREBID_GLOBAL$$.requestBids({adUnits});
        const spyArgs = adaptermanager.callBids.getCall(0);
        const nativeRequest = spyArgs.args[1][0].bids[0].nativeParams;
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
    });

    describe('part-3', () => {
      let auctionManagerInstance = newAuctionManager();
      let auctionManagerStub;
      let adUnits1 = getAdUnits().filter((adUnit) => {
        return adUnit.code === '/19968336/header-bid-tag1';
      });
      let adUnitCodes1 = getAdUnits().map(unit => unit.code);
      let auction1 = auctionManagerInstance.createAuction({adUnits: adUnits1, adUnitCodes: adUnitCodes1});

      let adUnits2 = getAdUnits().filter((adUnit) => {
        return adUnit.code === '/19968336/header-bid-tag-0';
      });
      let adUnitCodes2 = getAdUnits().map(unit => unit.code);
      let auction2 = auctionManagerInstance.createAuction({adUnits: adUnits2, adUnitCodes: adUnitCodes2});
      let spyCallBids;

      auction1.getBidRequests = function() {
        return getBidRequests().map((req) => {
          req.bids = req.bids.filter((bid) => {
            return bid.adUnitCode === '/19968336/header-bid-tag1';
          });
          return (req.bids.length > 0) ? req : undefined;
        }).filter((item) => {
          return item != undefined;
        });
      };
      auction1.getBidsReceived = function() {
        return getBidResponses().filter((bid) => {
          return bid.adUnitCode === '/19968336/header-bid-tag1';
        });
      };

      auction2.getBidRequests = function() {
        return getBidRequests().map((req) => {
          req.bids = req.bids.filter((bid) => {
            return bid.adUnitCode === '/19968336/header-bid-tag-0';
          });
          return (req.bids.length > 0) ? req : undefined;
        }).filter((item) => {
          return item != undefined;
        });
      };
      auction2.getBidsReceived = function() {
        return getBidResponses().filter((bid) => {
          return bid.adUnitCode === '/19968336/header-bid-tag-0';
        });
      };

      beforeEach(function() {
        spyCallBids = sinon.spy(adaptermanager, 'callBids');
        auctionManagerStub = sinon.stub(auctionManager, 'createAuction');
        auctionManagerStub.onCall(0).returns(auction1);
        auctionManagerStub.onCall(1).returns(auction2);
      });

      afterEach(function() {
        auctionManager.createAuction.restore();
        adaptermanager.callBids.restore();
      });

      it('should not queue bid requests when a previous bid request is in process', () => {
        // var clock = sinon.useFakeTimers();
        var requestObj1 = {
          bidsBackHandler: function bidsBackHandlerCallback() {},
          timeout: 2000,
          adUnits: auction1.getAdUnits()
        };

        var requestObj2 = {
          bidsBackHandler: function bidsBackHandlerCallback() {},
          timeout: 2000,
          adUnits: auction2.getAdUnits()
        };

        assert.equal(auctionManager.getBidsReceived().length, 8, '_bidsReceived contains 8 bids');

        $$PREBID_GLOBAL$$.requestBids(requestObj1);
        $$PREBID_GLOBAL$$.requestBids(requestObj2);

        // clock.tick(requestObj1.timeout - 1);
        assert.ok(spyCallBids.calledTwice, 'When two requests for bids are made both should be' +
          ' callBids immediately');

        assert.deepEqual($$PREBID_GLOBAL$$.getAdserverTargeting(), {
          '/19968336/header-bid-tag-0': {
            'foobar': '300x250',
            'hb_size': '300x250',
            'hb_pb': '10.00',
            'hb_adid': '233bcbee889d46d',
            'hb_bidder': 'appnexus'
          },
          '/19968336/header-bid-tag1': {
            'hb_bidder': 'appnexus',
            'hb_adid': '24bd938435ec3fc',
            'hb_pb': '10.00',
            'hb_size': '728x90',
            'foobar': '728x90'
          }
        }, 'targeting info returned for current placements');
      });
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

  describe('emit event', () => {
    let auctionManagerStub;
    beforeEach(() => {
      auctionManagerStub = sinon.stub(auctionManager, 'createAuction', function() {
        return auction;
      });
    });

    afterEach(() => {
      auctionManager.createAuction.restore();
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

  describe('setBidderSequence', () => {
    let auctionManagerStub;
    beforeEach(() => {
      auctionManagerStub = sinon.stub(auctionManager, 'createAuction', function() {
        return auction;
      });
    });

    afterEach(() => {
      auctionManager.createAuction.restore();
    });

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
      expect(highestCpmBids[0]).to.deep.equal(auctionManager.getBidsReceived()[1]);
      expect(highestCpmBids[1]).to.deep.equal(auctionManager.getBidsReceived()[2]);
    });

    it('returns an array containing the highest bid object for the given adUnitCode', () => {
      const highestCpmBids = $$PREBID_GLOBAL$$.getHighestCpmBids('/19968336/header-bid-tag-0');
      expect(highestCpmBids.length).to.equal(1);
      expect(highestCpmBids[0]).to.deep.equal(auctionManager.getBidsReceived()[1]);
    });

    it('returns an empty array when the given adUnit is not found', () => {
      const highestCpmBids = $$PREBID_GLOBAL$$.getHighestCpmBids('/stallone');
      expect(highestCpmBids.length).to.equal(0);
    });

    it('returns an empty array when the given adUnit has no bids', () => {
      let _bidsReceived = getBidResponses()[0];
      _bidsReceived.cpm = 0;
      auction.getBidsReceived = function() { return _bidsReceived };

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
      const bids = auctionManager.getBidsReceived().filter(bid => (bid.adUnitCode === adUnitCode && bid.bidderCode === bidder));

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
});
