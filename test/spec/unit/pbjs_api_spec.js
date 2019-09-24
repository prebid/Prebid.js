import {
  getAdServerTargeting,
  getBidRequests,
  getBidResponses,
  getBidResponsesFromAPI,
  getTargetingKeys,
  getTargetingKeysBidLandscape,
  getAdUnits,
  createBidReceived
} from 'test/fixtures/fixtures';
import { auctionManager, newAuctionManager } from 'src/auctionManager';
import { targeting, newTargeting, filters } from 'src/targeting';
import { config as configObj } from 'src/config';
import * as ajaxLib from 'src/ajax';
import * as auctionModule from 'src/auction';
import { newBidder, registerBidder } from 'src/adapters/bidderFactory';
import find from 'core-js/library/fn/array/find';

var assert = require('chai').assert;
var expect = require('chai').expect;

var urlParse = require('url-parse');

var prebid = require('src/prebid');
var utils = require('src/utils');
var bidfactory = require('src/bidfactory');
var adloader = require('test/mocks/adloaderStub');
var adapterManager = require('src/adapterManager').default;
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
  _targeting: {},
  pubads: function () {
    var self = this;
    return {
      getSlots: function () {
        return self._slots;
      },

      setSlots: function (slots) {
        self._slots = slots;
      },

      setTargeting: function(key, arrayOfValues) {
        self._targeting[key] = arrayOfValues;
      },

      getTargeting: function() {
        return self._targeting;
      },

      clearTargeting: function() {
        self._targeting = {};
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
  setKeywords: function(key, params, options) {
    var self = this;
    if (!self.tags.hasOwnProperty(key)) {
      return;
    }
    self.tags[key].keywords = this.tags[key].keywords || {};

    if (typeof options === 'object' && options !== null && options.overrideKeyValue === true) {
      utils._each(params, function(param, id) {
        self.tags[key].keywords[id] = param;
      });
    } else {
      utils._each(params, function (param, id) {
        if (!self.tags[key].keywords.hasOwnProperty(id)) {
          self.tags[key].keywords[id] = param;
        } else if (!utils.isArray(self.tags[key].keywords[id])) {
          self.tags[key].keywords[id] = [self.tags[key].keywords[id]].concat(param);
        } else {
          self.tags[key].keywords[id] = self.tags[key].keywords[id].concat(param);
        }
      })
    }
  },
  getTag: function(tagId) {
    return this.tags[tagId];
  },
  modifyTag: function(tagId, params) {
    var output = {};

    utils._each(this.tags[tagId], function(tag, id) {
      output[id] = tag;
    });

    utils._each(params, function(param, id) {
      output[id] = param;
    });

    this.tags[tagId] = output;
  }
}

describe('Unit: Prebid Module', function () {
  let bidExpiryStub;
  beforeEach(function () {
    bidExpiryStub = sinon.stub(filters, 'isBidNotExpired').callsFake(() => true);
    configObj.setConfig({ useBidCache: true });
  });

  afterEach(function() {
    $$PREBID_GLOBAL$$.adUnits = [];
    bidExpiryStub.restore();
    configObj.setConfig({ useBidCache: false });
  });

  describe('getAdserverTargetingForAdUnitCodeStr', function () {
    beforeEach(function () {
      resetAuction();
    });

    it('should return targeting info as a string', function () {
      const adUnitCode = config.adUnitCodes[0];
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });
      var expected = 'foobar=0x0%2C300x250%2C300x600&' + CONSTANTS.TARGETING_KEYS.SIZE + '=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '=233bcbee889d46d&' + CONSTANTS.TARGETING_KEYS.BIDDER + '=appnexus&' + CONSTANTS.TARGETING_KEYS.SIZE + '_triplelift=0x0&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_triplelift=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_triplelift=222bb26f9e8bd&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_triplelift=triplelift&' + CONSTANTS.TARGETING_KEYS.SIZE + '_appnexus=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_appnexus=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_appnexus=233bcbee889d46d&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_appnexus=appnexus&' + CONSTANTS.TARGETING_KEYS.SIZE + '_pagescience=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_pagescience=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_pagescience=25bedd4813632d7&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_pagescienc=pagescience&' + CONSTANTS.TARGETING_KEYS.SIZE + '_brightcom=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_brightcom=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_brightcom=26e0795ab963896&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_brightcom=brightcom&' + CONSTANTS.TARGETING_KEYS.SIZE + '_brealtime=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_brealtime=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_brealtime=275bd666f5a5a5d&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_brealtime=brealtime&' + CONSTANTS.TARGETING_KEYS.SIZE + '_pubmatic=300x250&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_pubmatic=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_pubmatic=28f4039c636b6a7&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_pubmatic=pubmatic&' + CONSTANTS.TARGETING_KEYS.SIZE + '_rubicon=300x600&' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_rubicon=10.00&' + CONSTANTS.TARGETING_KEYS.AD_ID + '_rubicon=29019e2ab586a5a&' + CONSTANTS.TARGETING_KEYS.BIDDER + '_rubicon=rubicon';
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
    beforeEach(function () {
      resetAuction();
    });

    afterEach(function () {
      resetAuction();
    });

    it('should return current targeting data for slots', function () {
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });
      const targeting = $$PREBID_GLOBAL$$.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);
      const expected = getAdServerTargeting(['/19968336/header-bid-tag-0, /19968336/header-bid-tag1']);
      assert.deepEqual(targeting, expected, 'targeting ok');
    });

    it('should return correct targeting with default settings', function () {
      var targeting = $$PREBID_GLOBAL$$.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);
      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '0x0,300x250,300x600',
          [CONSTANTS.TARGETING_KEYS.SIZE]: '300x250',
          [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [CONSTANTS.TARGETING_KEYS.AD_ID]: '233bcbee889d46d',
          [CONSTANTS.TARGETING_KEYS.BIDDER]: 'appnexus'
        },
        '/19968336/header-bid-tag1': {
          foobar: '728x90',
          [CONSTANTS.TARGETING_KEYS.SIZE]: '728x90',
          [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [CONSTANTS.TARGETING_KEYS.AD_ID]: '24bd938435ec3fc',
          [CONSTANTS.TARGETING_KEYS.BIDDER]: 'appnexus'
        }
      };
      assert.deepEqual(targeting, expected);
    });

    it('should return correct targeting with bid landscape targeting on', function () {
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });
      var targeting = $$PREBID_GLOBAL$$.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);
      var expected = getAdServerTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);
      assert.deepEqual(targeting, expected);
    });

    it("should include a losing bid's custom ad targeting key", function () {
      // Let's make sure we're getting the expected losing bid.
      assert.equal(auction.getBidsReceived()[0]['bidderCode'], 'triplelift');
      assert.equal(auction.getBidsReceived()[0]['cpm'], 0.112256);

      // Modify the losing bid to have `alwaysUseBid=true` and a custom `adserverTargeting` key.
      let _bidsReceived = getBidResponses();
      _bidsReceived[0]['adserverTargeting'] = {
        always_use_me: 'abc',
      };

      auction.getBidsReceived = function() { return _bidsReceived };

      var targeting = $$PREBID_GLOBAL$$.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);

      // Ensure targeting for both ad placements includes the custom key.
      assert.equal(
        targeting['/19968336/header-bid-tag-0'].hasOwnProperty('always_use_me'),
        true
      );

      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '300x250,300x600',
          always_use_me: 'abc',
          [CONSTANTS.TARGETING_KEYS.SIZE]: '300x250',
          [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [CONSTANTS.TARGETING_KEYS.AD_ID]: '233bcbee889d46d',
          [CONSTANTS.TARGETING_KEYS.BIDDER]: 'appnexus'
        },
        '/19968336/header-bid-tag1': {
          foobar: '728x90',
          [CONSTANTS.TARGETING_KEYS.SIZE]: '728x90',
          [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [CONSTANTS.TARGETING_KEYS.AD_ID]: '24bd938435ec3fc',
          [CONSTANTS.TARGETING_KEYS.BIDDER]: 'appnexus'
        }
      };
      assert.deepEqual(targeting, expected);
    });

    it('should not overwrite winning bids custom keys targeting key', function () {
      resetAuction();
      // mimic a bidderSetting.standard key here for each bid and alwaysUseBid true for every bid
      let _bidsReceived = getBidResponses();
      _bidsReceived.forEach(bid => {
        bid.adserverTargeting.custom_ad_id = bid.adId;
      });

      auction.getBidsReceived = function() { return _bidsReceived };

      $$PREBID_GLOBAL$$.bidderSettings = {
        'standard': {
          adserverTargeting: [{
            key: CONSTANTS.TARGETING_KEYS.BIDDER,
            val: function(bidResponse) {
              return bidResponse.bidderCode;
            }
          }, {
            key: 'custom_ad_id',
            val: function(bidResponse) {
              return bidResponse.adId;
            }
          }, {
            key: CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
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

      var targeting = $$PREBID_GLOBAL$$.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);

      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '300x250',
          custom_ad_id: '233bcbee889d46d',
          [CONSTANTS.TARGETING_KEYS.SIZE]: '300x250',
          [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [CONSTANTS.TARGETING_KEYS.AD_ID]: '233bcbee889d46d',
          [CONSTANTS.TARGETING_KEYS.BIDDER]: 'appnexus'
        },
        '/19968336/header-bid-tag1': {
          foobar: '728x90',
          [CONSTANTS.TARGETING_KEYS.SIZE]: '728x90',
          [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [CONSTANTS.TARGETING_KEYS.AD_ID]: '24bd938435ec3fc',
          [CONSTANTS.TARGETING_KEYS.BIDDER]: 'appnexus',
          custom_ad_id: '24bd938435ec3fc'
        }
      };
      assert.deepEqual(targeting, expected);
      $$PREBID_GLOBAL$$.bidderSettings = {};
    });

    it('should not send standard targeting keys when the bid has `sendStandardTargeting` set to `false`', function () {
      let _bidsReceived = getBidResponses();
      _bidsReceived.forEach(bid => {
        bid.adserverTargeting.custom_ad_id = bid.adId;
        bid.sendStandardTargeting = false;
      });

      auction.getBidsReceived = function() { return _bidsReceived };

      var targeting = $$PREBID_GLOBAL$$.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);

      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '0x0,300x250,300x600',
          custom_ad_id: '222bb26f9e8bd,233bcbee889d46d,25bedd4813632d7,26e0795ab963896,275bd666f5a5a5d,28f4039c636b6a7,29019e2ab586a5a'
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
        { 'precision': 2, 'min': 5, 'max': 8, 'increment': 0.05 },
        { 'precision': 2, 'min': 8, 'max': 20, 'increment': 0.5 },
        { 'precision': 2, 'min': 20, 'max': 25, 'increment': 1 }
      ]
    };
    let currentPriceBucket;
    let bid;
    let auction;
    let ajaxStub;
    let cbTimeout = 3000;
    let targeting;

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
          },
          'viewability': {
            'config': '<script type=\'text/javascript\' async=\'true\' src=\'http://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=http%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttp%253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'}
        }]
      }]
    };

    before(function () {
      $$PREBID_GLOBAL$$.bidderSettings = {};
      currentPriceBucket = configObj.getConfig('priceGranularity');
      configObj.setConfig({ priceGranularity: customConfigObject });
      sinon.stub(adapterManager, 'makeBidRequests').callsFake(() => ([{
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

    after(function () {
      configObj.setConfig({ priceGranularity: currentPriceBucket });
      adapterManager.makeBidRequests.restore();
    })

    beforeEach(function () {
      let auctionManagerInstance = newAuctionManager();
      targeting = newTargeting(auctionManagerInstance);
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
      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(function() {
        return function(url, callback) {
          const fakeResponse = sinon.stub();
          fakeResponse.returns('headerContent');
          callback.success(JSON.stringify(RESPONSE), { getResponseHeader: fakeResponse });
        }
      });
    });

    afterEach(function () {
      ajaxStub.restore();
    });

    it('should get correct ' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + ' when using bid.cpm is between 0 to 5', function() {
      RESPONSE.tags[0].ads[0].cpm = 2.1234;
      auction.callBids(cbTimeout);
      let bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]).to.equal('2.12');
    });

    it('should get correct ' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + ' when using bid.cpm is between 5 to 8', function() {
      RESPONSE.tags[0].ads[0].cpm = 6.78;
      auction.callBids(cbTimeout);
      let bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]).to.equal('6.75');
    });

    it('should get correct ' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + ' when using bid.cpm is between 8 to 20', function() {
      RESPONSE.tags[0].ads[0].cpm = 19.5234;
      auction.callBids(cbTimeout);
      let bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]).to.equal('19.50');
    });

    it('should get correct ' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + ' when using bid.cpm is between 20 to 25', function() {
      RESPONSE.tags[0].ads[0].cpm = 21.5234;
      auction.callBids(cbTimeout);
      let bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]).to.equal('21.00');
    });
  });

  describe('getAdserverTargeting with `mediaTypePriceGranularity` set for media type', function() {
    let currentPriceBucket;
    let auction;
    let ajaxStub;
    let response;
    let cbTimeout = 3000;
    let auctionManagerInstance;
    let targeting;

    const bannerResponse = {
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
              'width': 300,
              'height': 250,
              'content': '<!-- Creative -->'
            },
            'trackers': [{
              'impression_urls': ['http://lax1-ib.adnxs.com/impression']
            }]
          },
          'viewability': {
            'config': '<script type=\'text/javascript\' async=\'true\' src=\'http://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=http%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttp%253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'}
        }]
      }]
    };
    const videoResponse = {
      'version': '0.0.1',
      'tags': [{
        'uuid': '4d0a6829338a07',
        'tag_id': 4799418,
        'auction_id': '2256922143947979797',
        'no_ad_url': 'http://lax1-ib.adnxs.com/no-ad',
        'timeout_ms': 2500,
        'ads': [{
          'content_source': 'rtb',
          'ad_type': 'video',
          'buyer_member_id': 958,
          'creative_id': 33989846,
          'media_type_id': 1,
          'media_subtype_id': 1,
          'cpm': 1.99,
          'cpm_publisher_currency': 0.500000,
          'publisher_currency_code': '$',
          'client_initiated_ad_counting': true,
          'rtb': {
            'video': {
              'width': 300,
              'height': 250,
              'content': '<!-- Creative -->'
            },
            'trackers': [{
              'impression_urls': ['http://lax1-ib.adnxs.com/impression']
            }]
          },
          'viewability': {
            'config': '<script type=\'text/javascript\' async=\'true\' src=\'http://cdn.adnxs.com/v/s/152/trk.js#v;vk=appnexus.com-omid;tv=native1-18h;dom_id=%native_dom_id%;st=0;d=1x1;vc=iab;vid_ccr=1;tag_id=13232354;cb=http%3A%2F%2Fams1-ib.adnxs.com%2Fvevent%3Freferrer%3Dhttp%253A%252F%252Ftestpages-pmahe.tp.adnxs.net%252F01_basic_single%26e%3DwqT_3QLNB6DNAwAAAwDWAAUBCLfl_-MFEMStk8u3lPTjRxih88aF0fq_2QsqNgkAAAECCCRAEQEHEAAAJEAZEQkAIREJACkRCQAxEQmoMOLRpwY47UhA7UhIAlCDy74uWJzxW2AAaM26dXjzjwWAAQGKAQNVU0SSAQEG8FCYAQGgAQGoAQGwAQC4AQHAAQTIAQLQAQDYAQDgAQDwAQCKAjt1ZignYScsIDI1Mjk4ODUsIDE1NTE4ODkwNzkpO3VmKCdyJywgOTc0OTQ0MDM2HgDwjZIC8QEha0RXaXBnajgtTHdLRUlQTHZpNFlBQ0NjOFZzd0FEZ0FRQVJJN1VoUTR0R25CbGdBWU1rR2FBQndMSGlrTDRBQlVvZ0JwQy1RQVFHWUFRR2dBUUdvQVFPd0FRQzVBZk90YXFRQUFDUkF3UUh6cldxa0FBQWtRTWtCbWo4dDA1ZU84VF9aQVFBQUEBAyRQQV80QUVBOVFFAQ4sQW1BSUFvQUlBdFFJBRAAdg0IeHdBSUF5QUlBNEFJQTZBSUEtQUlBZ0FNQm1BTUJxQVAFzIh1Z01KUVUxVE1UbzBNekl3NEFPVENBLi6aAmEhUXcxdGNRagUoEfQkblBGYklBUW9BRAl8AEEBqAREbzJEABRRSk1JU1EBGwRBQQGsAFURDAxBQUFXHQzwWNgCAOACrZhI6gIzaHR0cDovL3Rlc3RwYWdlcy1wbWFoZS50cC5hZG54cy5uZXQvMDFfYmFzaWNfc2luZ2xl8gITCg9DVVNUT01fTU9ERUxfSUQSAPICGgoWMhYAPExFQUZfTkFNRRIA8gIeCho2HQAIQVNUAT7wnElGSUVEEgCAAwCIAwGQAwCYAxegAwGqAwDAA-CoAcgDANgD8ao-4AMA6AMA-AMBgAQAkgQNL3V0L3YzL3ByZWJpZJgEAKIECjEwLjIuMTIuMzioBIqpB7IEDggAEAEYACAAKAAwADgCuAQAwAQAyAQA0gQOOTMyNSNBTVMxOjQzMjDaBAIIAeAEAfAEg8u-LogFAZgFAKAF______8BAxgBwAUAyQUABQEU8D_SBQkJBQt8AAAA2AUB4AUB8AWZ9CH6BQQIABAAkAYBmAYAuAYAwQYBITAAAPA_yAYA2gYWChAAOgEAGBAAGADgBgw.%26s%3D971dce9d49b6bee447c8a58774fb30b40fe98171;ts=1551889079;cet=0;cecb=\'></script>'}
        }]
      }]
    };

    const createAdUnit = (code, mediaTypes) => {
      if (!mediaTypes) {
        mediaTypes = ['banner'];
      } else if (typeof mediaTypes === 'string') {
        mediaTypes = [mediaTypes];
      }

      const adUnit = {
        code: code,
        sizes: [[300, 250], [300, 600]],
        bids: [{
          bidder: 'appnexus',
          params: {
            placementId: '10433394'
          }
        }]
      };

      let _mediaTypes = {};
      if (mediaTypes.indexOf('banner') !== -1) {
        _mediaTypes['banner'] = {
          'banner': {}
        };
      }
      if (mediaTypes.indexOf('video') !== -1) {
        _mediaTypes['video'] = {
          'video': {
            context: 'instream',
            playerSize: [300, 250]
          }
        };
      }
      if (mediaTypes.indexOf('native') !== -1) {
        _mediaTypes['native'] = {
          'native': {}
        };
      }

      if (Object.keys(_mediaTypes).length > 0) {
        adUnit['mediaTypes'] = _mediaTypes;
        // if video type, add video to every bid.param object
        if (_mediaTypes.video) {
          adUnit.bids.forEach(bid => {
            bid.params['video'] = {
              width: 300,
              height: 250,
              vastUrl: '',
              ttl: 3600
            };
          });
        }
      }
      return adUnit;
    }
    const initTestConfig = (data) => {
      $$PREBID_GLOBAL$$.bidderSettings = {};

      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(function() {
        return function(url, callback) {
          const fakeResponse = sinon.stub();
          fakeResponse.returns('headerContent');
          callback.success(JSON.stringify(response), { getResponseHeader: fakeResponse });
        }
      });
      auctionManagerInstance = newAuctionManager();
      targeting = newTargeting(auctionManagerInstance)

      configObj.setConfig({
        'priceGranularity': {
          'buckets': [
            { 'precision': 2, 'min': 0, 'max': 5, 'increment': 0.01 },
            { 'precision': 2, 'min': 5, 'max': 8, 'increment': 0.05 },
            { 'precision': 2, 'min': 8, 'max': 20, 'increment': 0.5 },
            { 'precision': 2, 'min': 20, 'max': 25, 'increment': 1 }
          ]
        },
        'mediaTypePriceGranularity': {
          'banner': {
            'buckets': [
              { 'precision': 2, 'min': 0, 'max': 5, 'increment': 0.25 },
              { 'precision': 2, 'min': 6, 'max': 20, 'increment': 0.5 },
              { 'precision': 2, 'min': 21, 'max': 100, 'increment': 1 }
            ]
          },
          'video': 'low',
          'native': 'high'
        }
      });

      auction = auctionManagerInstance.createAuction({
        adUnits: data.adUnits,
        adUnitCodes: data.adUnitCodes
      });
    };

    before(function () {
      currentPriceBucket = configObj.getConfig('priceGranularity');
      sinon.stub(adapterManager, 'makeBidRequests').callsFake(() => ([{
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
      }]));
    });

    after(function () {
      configObj.setConfig({ priceGranularity: currentPriceBucket });
      adapterManager.makeBidRequests.restore();
    })

    afterEach(function () {
      ajaxStub.restore();
    });

    it('should get correct ' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + ' with cpm between 0 - 5', function() {
      initTestConfig({
        adUnits: [createAdUnit('div-gpt-ad-1460505748561-0')],
        adUnitCodes: ['div-gpt-ad-1460505748561-0']
      });

      response = bannerResponse;
      response.tags[0].ads[0].cpm = 3.4288;

      auction.callBids(cbTimeout);
      let bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]).to.equal('3.25');
    });

    it('should get correct ' + CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + ' with cpm between 21 - 100', function() {
      initTestConfig({
        adUnits: [createAdUnit('div-gpt-ad-1460505748561-0')],
        adUnitCodes: ['div-gpt-ad-1460505748561-0']
      });

      response = bannerResponse;
      response.tags[0].ads[0].cpm = 43.4288;

      auction.callBids(cbTimeout);
      let bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]).to.equal('43.00');
    });

    it('should only apply price granularity if bid media type matches', function () {
      initTestConfig({
        adUnits: [ createAdUnit('div-gpt-ad-1460505748561-0', 'video') ],
        adUnitCodes: ['div-gpt-ad-1460505748561-0']
      });

      response = videoResponse;
      response.tags[0].ads[0].cpm = 3.4288;

      auction.callBids(cbTimeout);
      let bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]).to.equal('3.00');
    });
  });

  describe('getBidResponses', function () {
    it('should return empty obj when last auction Id had no responses', function () {
      auctionManager.getLastAuctionId = () => 999994;
      var result = $$PREBID_GLOBAL$$.getBidResponses();
      assert.deepEqual(result, {}, 'expected bid responses are returned');
    });

    it('should return expected bid responses when not passed an adunitCode', function () {
      auctionManager.getLastAuctionId = () => 654321;
      var result = $$PREBID_GLOBAL$$.getBidResponses();
      var compare = getBidResponsesFromAPI();
      assert.deepEqual(result, compare, 'expected bid responses are returned');
    });

    it('should return bid responses for most recent auctionId only', function () {
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

    beforeEach(function () {
      logErrorSpy = sinon.spy(utils, 'logError');
      resetAuction();
    });

    afterEach(function () {
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
      expect(slots[0].spySetTargeting.args).to.deep.contain.members([[CONSTANTS.TARGETING_KEYS.BIDDER, 'appnexus'], [CONSTANTS.TARGETING_KEYS.AD_ID + '_appnexus', '233bcbee889d46d'], [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_appnexus', '10.00']]);
    });

    it('should set targeting when passed an array of ad unit codes with enableSendAllBids', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });

      $$PREBID_GLOBAL$$.setTargetingForGPTAsync(['/19968336/header-bid-tag-0']);
      expect(slots[0].spySetTargeting.args).to.deep.contain.members([[CONSTANTS.TARGETING_KEYS.BIDDER, 'appnexus'], [CONSTANTS.TARGETING_KEYS.AD_ID + '_appnexus', '233bcbee889d46d'], [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET + '_appnexus', '10.00']]);
    });

    it('should set targeting from googletag data', function () {
      var slots = createSlotArray();
      slots[0].spySetTargeting.resetHistory();
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

    it('should set targeting for bids', function () {
      // Make sure we're getting the expected losing bid.
      assert.equal(auctionManager.getBidsReceived()[0]['bidderCode'], 'triplelift');
      assert.equal(auctionManager.getBidsReceived()[0]['cpm'], 0.112256);

      resetAuction();
      // Modify the losing bid to have `alwaysUseBid=true` and a custom `adserverTargeting` key.
      let _bidsReceived = getBidResponses();
      _bidsReceived[0]['adserverTargeting'] = {
        always_use_me: 'abc',
      };

      auction.getBidsReceived = function() { return _bidsReceived };

      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      $$PREBID_GLOBAL$$.setTargetingForGPTAsync();

      var expected = [
        [
          CONSTANTS.TARGETING_KEYS.BIDDER,
          'appnexus'
        ],
        [
          CONSTANTS.TARGETING_KEYS.AD_ID,
          '233bcbee889d46d'
        ],
        [
          CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
          '10.00'
        ],
        [
          CONSTANTS.TARGETING_KEYS.SIZE,
          '300x250'
        ],
        [
          'foobar',
          ['300x250', '300x600']
        ],
        [
          'always_use_me',
          'abc'
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
    var triggerPixelStub;

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
      sinon.stub(utils, 'inIframe').callsFake(() => inIframe);
      triggerPixelStub = sinon.stub(utils.internal, 'triggerPixel');
    });

    afterEach(function () {
      auction.getBidsReceived = getBidResponses;
      utils.logError.restore();
      utils.logMessage.restore();
      utils.inIframe.restore();
      triggerPixelStub.restore();
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

    it('should log an error when not in an iFrame', function () {
      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });
      inIframe = false;
      $$PREBID_GLOBAL$$.renderAd(document, bidId);
      const error = 'Error trying to write ad. Ad render call ad id ' + bidId + ' was prevented from writing to the main document.';
      assert.ok(spyLogError.calledWith(error), 'expected error was logged');
    });

    it('should not render videos', function () {
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

    it('fires billing url if present on s2s bid', function () {
      const burl = 'http://www.example.com/burl';
      pushBidResponseToAuction({
        ad: '<div>ad</div>',
        source: 's2s',
        burl
      });

      $$PREBID_GLOBAL$$.renderAd(doc, bidId);

      sinon.assert.calledOnce(triggerPixelStub);
      sinon.assert.calledWith(triggerPixelStub, burl);
    });
  });

  describe('requestBids', function () {
    let logMessageSpy;
    let makeRequestsStub;
    let xhr;
    let adUnits;
    let clock;
    let bidsBackHandlerStub = sinon.stub();

    const BIDDER_CODE = 'sampleBidder';
    let bids = [{
      'ad': 'creative',
      'cpm': '1.99',
      'width': 300,
      'height': 250,
      'bidderCode': BIDDER_CODE,
      'requestId': '4d0a6829338a07',
      'creativeId': 'id',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 360
    }];
    let bidRequests = [{
      'bidderCode': BIDDER_CODE,
      'auctionId': '20882439e3238c',
      'bidderRequestId': '331f3cf3f1d9c8',
      'bids': [
        {
          'bidder': BIDDER_CODE,
          'params': {
            'placementId': 'id'
          },
          'adUnitCode': 'adUnit-code',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4d0a6829338a07',
          'bidderRequestId': '331f3cf3f1d9c8',
          'auctionId': '20882439e3238c'
        }
      ],
      'auctionStart': 1505250713622,
      'timeout': 3000,
      'start': 1000
    }];

    beforeEach(function () {
      logMessageSpy = sinon.spy(utils, 'logMessage');
      makeRequestsStub = sinon.stub(adapterManager, 'makeBidRequests');
      makeRequestsStub.returns(bidRequests);
      xhr = sinon.useFakeXMLHttpRequest();

      adUnits = [{
        code: 'adUnit-code',
        bids: [
          {bidder: BIDDER_CODE, params: {placementId: 'id'}},
        ]
      }];
      let adUnitCodes = ['adUnit-code'];
      let auction = auctionModule.newAuction({
        adUnits,
        adUnitCodes,
        callback: bidsBackHandlerStub,
        cbTimeout: 2000
      });
      let createAuctionStub = sinon.stub(auctionModule, 'newAuction');
      createAuctionStub.returns(auction);
    });

    afterEach(function () {
      clock.restore();
      adapterManager.makeBidRequests.restore();
      auctionModule.newAuction.restore();
      utils.logMessage.restore();
      xhr.restore();
    });

    it('should execute callback after timeout', function () {
      let spec = {
        code: BIDDER_CODE,
        isBidRequestValid: sinon.stub(),
        buildRequests: sinon.stub(),
        interpretResponse: sinon.stub(),
        getUserSyncs: sinon.stub(),
        onTimeout: sinon.stub()
      };

      registerBidder(spec);
      spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec.isBidRequestValid.returns(true);
      spec.interpretResponse.returns(bids);

      clock = sinon.useFakeTimers();
      let requestObj = {
        bidsBackHandler: null, // does not need to be defined because of newAuction mock in beforeEach
        timeout: 2000,
        adUnits: adUnits
      };

      $$PREBID_GLOBAL$$.requestBids(requestObj);
      let re = new RegExp('^Auction [a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12} timedOut$');
      clock.tick(requestObj.timeout - 1);
      assert.ok(logMessageSpy.neverCalledWith(sinon.match(re)), 'executeCallback not called');

      clock.tick(1);
      assert.ok(logMessageSpy.calledWith(sinon.match(re)), 'executeCallback called');

      expect(bidsBackHandlerStub.getCall(0).args[1]).to.equal(true,
        'bidsBackHandler should be called with timedOut=true');

      sinon.assert.called(spec.onTimeout);
    });

    it('should execute callback after setTargeting', function () {
      let spec = {
        code: BIDDER_CODE,
        isBidRequestValid: sinon.stub(),
        buildRequests: sinon.stub(),
        interpretResponse: sinon.stub(),
        onSetTargeting: sinon.stub()
      };

      registerBidder(spec);
      spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec.isBidRequestValid.returns(true);
      spec.interpretResponse.returns(bids);

      const bidId = 1;
      const auctionId = 1;
      let adResponse = Object.assign({
        auctionId: auctionId,
        adId: String(bidId),
        width: 300,
        height: 250,
        adUnitCode: bidRequests[0].bids[0].adUnitCode,
        adserverTargeting: {
          'hb_bidder': BIDDER_CODE,
          'hb_adid': bidId,
          'hb_pb': bids[0].cpm,
          'hb_size': '300x250',
        },
        bidder: bids[0].bidderCode,
      }, bids[0]);
      auction.getBidsReceived = function() { return [adResponse]; }
      auction.getAuctionId = () => auctionId;

      clock = sinon.useFakeTimers();
      let requestObj = {
        bidsBackHandler: null, // does not need to be defined because of newAuction mock in beforeEach
        timeout: 2000,
        adUnits: adUnits
      };

      $$PREBID_GLOBAL$$.requestBids(requestObj);
      $$PREBID_GLOBAL$$.setTargetingForGPTAsync();

      sinon.assert.called(spec.onSetTargeting);
    });
  })

  describe('requestBids', function () {
    let sandbox;
    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });
    afterEach(function () {
      sandbox.restore();
    });
    describe('bidRequests is empty', function () {
      it('should log warning message and execute callback if bidRequests is empty', function () {
        let bidsBackHandler = function bidsBackHandlerCallback() {};
        let spyExecuteCallback = sinon.spy(bidsBackHandler);
        let logWarnSpy = sandbox.spy(utils, 'logWarn');

        $$PREBID_GLOBAL$$.requestBids({
          adUnits: [
            {
              code: 'test1',
              bids: [],
            }, {
              code: 'test2',
              bids: [],
            }
          ],
          bidsBackHandler: spyExecuteCallback
        });

        assert.ok(logWarnSpy.calledWith('No valid bid requests returned for auction'), 'expected warning message was logged');
        assert.ok(spyExecuteCallback.calledOnce, 'callback executed when bidRequests is empty');
      });
    });
  });

  describe('requestBids', function () {
    let xhr;
    let requests;

    beforeEach(function () {
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = request => requests.push(request);
    });

    afterEach(function () {
      xhr.restore();
    });
    var adUnitsBackup;
    var auctionManagerStub;
    let logMessageSpy;
    let logInfoSpy;
    let logErrorSpy;

    let spec = {
      code: 'sampleBidder',
      isBidRequestValid: () => {},
      buildRequests: () => {},
      interpretResponse: () => {},
      getUserSyncs: () => {}
    };
    registerBidder(spec);

    describe('part 1', function () {
      let auctionArgs;

      beforeEach(function () {
        adUnitsBackup = auction.getAdUnits
        auctionManagerStub = sinon.stub(auctionManager, 'createAuction').callsFake(function() {
          auctionArgs = arguments[0];
          return auction;
        });
        logMessageSpy = sinon.spy(utils, 'logMessage');
        logInfoSpy = sinon.spy(utils, 'logInfo');
        logErrorSpy = sinon.spy(utils, 'logError');
      });

      afterEach(function () {
        auction.getAdUnits = adUnitsBackup;
        auctionManager.createAuction.restore();
        utils.logMessage.restore();
        utils.logInfo.restore();
        utils.logError.restore();
        resetAuction();
      });

      it('should log message when adUnits not configured', function () {
        $$PREBID_GLOBAL$$.adUnits = [];
        try {
          $$PREBID_GLOBAL$$.requestBids({});
        } catch (e) {
          console.log(e);
        }
        assert.ok(logMessageSpy.calledWith('No adUnits configured. No bids requested.'), 'expected message was logged');
      });

      it('should always attach new transactionIds to adUnits passed to requestBids', function () {
        $$PREBID_GLOBAL$$.requestBids({
          adUnits: [
            {
              code: 'test1',
              transactionId: 'd0676a3c-ff32-45a5-af65-8175a8e7ddca',
              bids: []
            }, {
              code: 'test2',
              bids: []
            }
          ]
        });

        expect(auctionArgs.adUnits[0]).to.have.property('transactionId')
          .and.to.match(/[a-f0-9\-]{36}/i)
          .and.not.to.equal('d0676a3c-ff32-45a5-af65-8175a8e7ddca');
        expect(auctionArgs.adUnits[1]).to.have.property('transactionId')
          .and.to.match(/[a-f0-9\-]{36}/i);
      });

      it('should notify targeting of the latest auction for each adUnit', function () {
        let latestStub = sinon.stub(targeting, 'setLatestAuctionForAdUnit');
        let getAuctionStub = sinon.stub(auction, 'getAuctionId').returns(2);

        $$PREBID_GLOBAL$$.requestBids({
          adUnits: [
            {
              code: 'test1',
              bids: []
            }, {
              code: 'test2',
              bids: []
            }
          ]
        });

        expect(latestStub.firstCall.calledWith('test1', 2)).to.equal(true);
        expect(latestStub.secondCall.calledWith('test2', 2)).to.equal(true);

        latestStub.restore();
        getAuctionStub.restore();
      });

      it('should execute callback immediately if adUnits is empty', function () {
        var bidsBackHandler = function bidsBackHandlerCallback() {};
        var spyExecuteCallback = sinon.spy(bidsBackHandler);

        $$PREBID_GLOBAL$$.adUnits = [];
        $$PREBID_GLOBAL$$.requestBids({
          bidsBackHandler: spyExecuteCallback
        });

        assert.ok(spyExecuteCallback.calledOnce, 'callback executed immediately when adUnits is' +
          ' empty');
      });

      it('should not propagate exceptions from bidsBackHandler', function () {
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

      describe('checkAdUnitSetup', function() {
        describe('positive tests for validating adUnits', function() {
          it('should maintain adUnit structure and adUnit.sizes is replaced', function () {
            let fullAdUnit = [{
              code: 'test1',
              sizes: [[300, 250], [300, 600]],
              mediaTypes: {
                banner: {
                  sizes: [[300, 250]]
                },
                video: {
                  playerSize: [[640, 480]]
                },
                native: {
                  image: {
                    sizes: [150, 150],
                    aspect_ratios: [140, 140]
                  },
                  icon: {
                    sizes: [75, 75]
                  }
                }
              },
              bids: []
            }];
            $$PREBID_GLOBAL$$.requestBids({
              adUnits: fullAdUnit
            });
            expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[640, 480]]);
            expect(auctionArgs.adUnits[0].mediaTypes.video.playerSize).to.deep.equal([[640, 480]]);
            expect(auctionArgs.adUnits[0].mediaTypes.native.image.sizes).to.deep.equal([150, 150]);
            expect(auctionArgs.adUnits[0].mediaTypes.native.icon.sizes).to.deep.equal([75, 75]);
            expect(auctionArgs.adUnits[0].mediaTypes.native.image.aspect_ratios).to.deep.equal([140, 140]);

            let noOptnlFieldAdUnit = [{
              code: 'test2',
              bids: [],
              sizes: [[300, 250], [300, 600]],
              mediaTypes: {
                banner: {
                  sizes: [[300, 250]]
                },
                video: {
                  context: 'outstream'
                },
                native: {
                  image: {
                    required: true
                  },
                  icon: {
                    required: true
                  }
                }
              }
            }];
            $$PREBID_GLOBAL$$.requestBids({
              adUnits: noOptnlFieldAdUnit
            });
            expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[300, 250]]);
            expect(auctionArgs.adUnits[0].mediaTypes.video).to.exist;

            let mixedAdUnit = [{
              code: 'test3',
              bids: [],
              sizes: [[300, 250], [300, 600]],
              mediaTypes: {
                video: {
                  context: 'outstream',
                  playerSize: [[400, 350]]
                },
                native: {
                  image: {
                    aspect_ratios: [200, 150],
                    required: true
                  }
                }
              }
            }];
            $$PREBID_GLOBAL$$.requestBids({
              adUnits: mixedAdUnit
            });
            expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[400, 350]]);
            expect(auctionArgs.adUnits[0].mediaTypes.video).to.exist;

            let altVideoPlayerSize = [{
              code: 'test4',
              bids: [],
              sizes: [[600, 600]],
              mediaTypes: {
                video: {
                  playerSize: [640, 480]
                }
              }
            }];
            $$PREBID_GLOBAL$$.requestBids({
              adUnits: altVideoPlayerSize
            });
            expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[640, 480]]);
            expect(auctionArgs.adUnits[0].mediaTypes.video.playerSize).to.deep.equal([[640, 480]]);
            expect(auctionArgs.adUnits[0].mediaTypes.video).to.exist;
            assert.ok(logInfoSpy.calledWith('Transforming video.playerSize from [640,480] to [[640,480]] so it\'s in the proper format.'), 'expected message was logged');
          });

          it('should normalize adUnit.sizes and adUnit.mediaTypes.banner.sizes', function () {
            let normalizeAdUnit = [{
              code: 'test5',
              bids: [],
              sizes: [300, 250],
              mediaTypes: {
                banner: {
                  sizes: [300, 250]
                }
              }
            }];
            $$PREBID_GLOBAL$$.requestBids({
              adUnits: normalizeAdUnit
            });
            expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[300, 250]]);
            expect(auctionArgs.adUnits[0].mediaTypes.banner.sizes).to.deep.equal([[300, 250]]);
          });
        });

        describe('negative tests for validating adUnits', function() {
          it('should throw error message and delete an object/property', function () {
            let badBanner = [{
              code: 'testb1',
              bids: [],
              sizes: [[300, 250], [300, 600]],
              mediaTypes: {
                banner: {
                  name: 'test'
                }
              }
            }];
            $$PREBID_GLOBAL$$.requestBids({
              adUnits: badBanner
            });
            expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[300, 250], [300, 600]]);
            expect(auctionArgs.adUnits[0].mediaTypes.banner).to.be.undefined;
            assert.ok(logErrorSpy.calledWith('Detected a mediaTypes.banner object did not include sizes.  This is a required field for the mediaTypes.banner object.  Removing invalid mediaTypes.banner object from request.'));

            let badVideo1 = [{
              code: 'testb2',
              bids: [],
              sizes: [[600, 600]],
              mediaTypes: {
                video: {
                  playerSize: ['600x400']
                }
              }
            }];
            $$PREBID_GLOBAL$$.requestBids({
              adUnits: badVideo1
            });
            expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[600, 600]]);
            expect(auctionArgs.adUnits[0].mediaTypes.video.playerSize).to.be.undefined;
            expect(auctionArgs.adUnits[0].mediaTypes.video).to.exist;
            assert.ok(logErrorSpy.calledWith('Detected incorrect configuration of mediaTypes.video.playerSize.  Please specify only one set of dimensions in a format like: [[640, 480]]. Removing invalid mediaTypes.video.playerSize property from request.'));

            let badVideo2 = [{
              code: 'testb3',
              bids: [],
              sizes: [[600, 600]],
              mediaTypes: {
                video: {
                  playerSize: [['300', '200']]
                }
              }
            }];
            $$PREBID_GLOBAL$$.requestBids({
              adUnits: badVideo2
            });
            expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[600, 600]]);
            expect(auctionArgs.adUnits[0].mediaTypes.video.playerSize).to.be.undefined;
            expect(auctionArgs.adUnits[0].mediaTypes.video).to.exist;
            assert.ok(logErrorSpy.calledWith('Detected incorrect configuration of mediaTypes.video.playerSize.  Please specify only one set of dimensions in a format like: [[640, 480]]. Removing invalid mediaTypes.video.playerSize property from request.'));

            let badNativeImgSize = [{
              code: 'testb4',
              bids: [],
              mediaTypes: {
                native: {
                  image: {
                    sizes: '300x250'
                  }
                }
              }
            }];
            $$PREBID_GLOBAL$$.requestBids({
              adUnits: badNativeImgSize
            });
            expect(auctionArgs.adUnits[0].mediaTypes.native.image.sizes).to.be.undefined;
            expect(auctionArgs.adUnits[0].mediaTypes.native.image).to.exist;
            assert.ok(logErrorSpy.calledWith('Please use an array of sizes for native.image.sizes field.  Removing invalid mediaTypes.native.image.sizes property from request.'));

            let badNativeImgAspRat = [{
              code: 'testb5',
              bids: [],
              mediaTypes: {
                native: {
                  image: {
                    aspect_ratios: '300x250'
                  }
                }
              }
            }];
            $$PREBID_GLOBAL$$.requestBids({
              adUnits: badNativeImgAspRat
            });
            expect(auctionArgs.adUnits[0].mediaTypes.native.image.aspect_ratios).to.be.undefined;
            expect(auctionArgs.adUnits[0].mediaTypes.native.image).to.exist;
            assert.ok(logErrorSpy.calledWith('Please use an array of sizes for native.image.aspect_ratios field.  Removing invalid mediaTypes.native.image.aspect_ratios property from request.'));

            let badNativeIcon = [{
              code: 'testb6',
              bids: [],
              mediaTypes: {
                native: {
                  icon: {
                    sizes: '300x250'
                  }
                }
              }
            }];
            $$PREBID_GLOBAL$$.requestBids({
              adUnits: badNativeIcon
            });
            expect(auctionArgs.adUnits[0].mediaTypes.native.icon.sizes).to.be.undefined;
            expect(auctionArgs.adUnits[0].mediaTypes.native.icon).to.exist;
            assert.ok(logErrorSpy.calledWith('Please use an array of sizes for native.icon.sizes field.  Removing invalid mediaTypes.native.icon.sizes property from request.'));
          });
        });
      });
    });

    describe('multiformat requests', function () {
      let spyCallBids;
      let createAuctionStub;
      let adUnits;

      beforeEach(function () {
        adUnits = [{
          code: 'adUnit-code',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]]
            },
            native: {},
          },
          sizes: [[300, 250], [300, 600]],
          bids: [
            {bidder: 'appnexus', params: {placementId: 'id'}},
            {bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}
          ]
        }];
        adUnitCodes = ['adUnit-code'];
        configObj.setConfig({maxRequestsPerOrigin: Number.MAX_SAFE_INTEGER || 99999999});
        let auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: timeout});
        spyCallBids = sinon.spy(adapterManager, 'callBids');
        createAuctionStub = sinon.stub(auctionModule, 'newAuction');
        createAuctionStub.returns(auction);
      })

      afterEach(function () {
        auctionModule.newAuction.restore();
        adapterManager.callBids.restore();
      });

      it('bidders that support one of the declared formats are allowed to participate', function () {
        $$PREBID_GLOBAL$$.requestBids({adUnits});
        sinon.assert.calledOnce(adapterManager.callBids);

        const spyArgs = adapterManager.callBids.getCall(0);
        const biddersCalled = spyArgs.args[0][0].bids;

        // appnexus and sampleBidder both support banner
        expect(biddersCalled.length).to.equal(2);
      });

      it('bidders that do not support one of the declared formats are dropped', function () {
        delete adUnits[0].mediaTypes.banner;

        $$PREBID_GLOBAL$$.requestBids({adUnits});
        sinon.assert.calledOnce(adapterManager.callBids);

        const spyArgs = adapterManager.callBids.getCall(0);
        const biddersCalled = spyArgs.args[0][0].bids;

        // only appnexus supports native
        expect(biddersCalled.length).to.equal(1);
      });
    });

    describe('part 2', function () {
      let spyCallBids;
      let createAuctionStub;
      let adUnits;

      before(function () {
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

      after(function () {
        auctionModule.newAuction.restore();
      });

      beforeEach(function () {
        spyCallBids = sinon.spy(adapterManager, 'callBids');
      })

      afterEach(function () {
        adapterManager.callBids.restore();
      })

      it('should callBids if a native adUnit has all native bidders', function () {
        $$PREBID_GLOBAL$$.requestBids({adUnits});
        sinon.assert.calledOnce(adapterManager.callBids);
      });

      it('should call callBids function on adapterManager', function () {
        let adUnits = [{
          code: 'adUnit-code',
          sizes: [[300, 250], [300, 600]],
          bids: [
            {bidder: 'appnexus', params: {placementId: '10433394'}}
          ]
        }];
        $$PREBID_GLOBAL$$.requestBids({adUnits});
        assert.ok(spyCallBids.called, 'called adapterManager.callBids');
      });

      it('splits native type to individual native assets', function () {
        let adUnits = [{
          code: 'adUnit-code',
          nativeParams: {type: 'image'},
          sizes: [[300, 250], [300, 600]],
          bids: [
            {bidder: 'appnexus', params: {placementId: 'id'}}
          ]
        }];
        $$PREBID_GLOBAL$$.requestBids({adUnits});
        const spyArgs = adapterManager.callBids.getCall(0);
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

    describe('part-3', function () {
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
        spyCallBids = sinon.spy(adapterManager, 'callBids');
        auctionManagerStub = sinon.stub(auctionManager, 'createAuction');
        auctionManagerStub.onCall(0).returns(auction1);
        auctionManagerStub.onCall(1).returns(auction2);
      });

      afterEach(function() {
        auctionManager.createAuction.restore();
        adapterManager.callBids.restore();
      });

      it('should not queue bid requests when a previous bid request is in process', function () {
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

        assert.ok(spyCallBids.calledTwice, 'When two requests for bids are made both should be' +
          ' callBids immediately');

        let result = targeting.getAllTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']); // $$PREBID_GLOBAL$$.getAdserverTargeting();
        let expected = {
          '/19968336/header-bid-tag-0': {
            'foobar': '0x0,300x250,300x600',
            [CONSTANTS.TARGETING_KEYS.SIZE]: '300x250',
            [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '10.00',
            [CONSTANTS.TARGETING_KEYS.AD_ID]: '233bcbee889d46d',
            [CONSTANTS.TARGETING_KEYS.BIDDER]: 'appnexus'
          },
          '/19968336/header-bid-tag1': {
            [CONSTANTS.TARGETING_KEYS.BIDDER]: 'appnexus',
            [CONSTANTS.TARGETING_KEYS.AD_ID]: '24bd938435ec3fc',
            [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '10.00',
            [CONSTANTS.TARGETING_KEYS.SIZE]: '728x90',
            'foobar': '728x90'
          }
        }
        assert.deepEqual(result, expected, 'targeting info returned for current placements');
      });
    });
  });

  describe('onEvent', function () {
    it('should log an error when handler is not a function', function () {
      var spyLogError = sinon.spy(utils, 'logError');
      var event = 'testEvent';
      $$PREBID_GLOBAL$$.onEvent(event);
      assert.ok(spyLogError.calledWith('The event handler provided is not a function and was not set on event "' + event + '".'),
        'expected error was logged');
      utils.logError.restore();
    });

    it('should log an error when id provided is not valid for event', function () {
      var spyLogError = sinon.spy(utils, 'logError');
      var event = 'bidWon';
      $$PREBID_GLOBAL$$.onEvent(event, Function, 'testId');
      assert.ok(spyLogError.calledWith('The id provided is not valid for event "' + event + '" and no handler was set.'),
        'expected error was logged');
      utils.logError.restore();
    });

    it('should call events.on with valid parameters', function () {
      var spyEventsOn = sinon.spy(events, 'on');
      $$PREBID_GLOBAL$$.onEvent('bidWon', Function);
      assert.ok(spyEventsOn.calledWith('bidWon', Function));
      events.on.restore();
    });
  });

  describe('offEvent', function () {
    it('should return when id provided is not valid for event', function () {
      var spyEventsOff = sinon.spy(events, 'off');
      $$PREBID_GLOBAL$$.offEvent('bidWon', Function, 'testId');
      assert.ok(spyEventsOff.notCalled);
      events.off.restore();
    });

    it('should call events.off with valid parameters', function () {
      var spyEventsOff = sinon.spy(events, 'off');
      $$PREBID_GLOBAL$$.offEvent('bidWon', Function);
      assert.ok(spyEventsOff.calledWith('bidWon', Function));
      events.off.restore();
    });
  });

  describe('emit', function () {
    it('should be able to emit event without arguments', function () {
      var spyEventsEmit = sinon.spy(events, 'emit');
      events.emit(CONSTANTS.EVENTS.REQUEST_BIDS);
      assert.ok(spyEventsEmit.calledWith('requestBids'));
      events.emit.restore();
    });
  });

  describe('registerBidAdapter', function () {
    it('should register bidAdaptor with adapterManager', function () {
      var registerBidAdapterSpy = sinon.spy(adapterManager, 'registerBidAdapter');
      $$PREBID_GLOBAL$$.registerBidAdapter(Function, 'biddercode');
      assert.ok(registerBidAdapterSpy.called, 'called adapterManager.registerBidAdapter');
      adapterManager.registerBidAdapter.restore();
    });

    it('should catch thrown errors', function () {
      var spyLogError = sinon.spy(utils, 'logError');
      var errorObject = { message: 'bidderAdaptor error' };
      var bidderAdaptor = sinon.stub().throws(errorObject);

      $$PREBID_GLOBAL$$.registerBidAdapter(bidderAdaptor, 'biddercode');

      var errorMessage = 'Error registering bidder adapter : ' + errorObject.message;
      assert.ok(spyLogError.calledWith(errorMessage), 'expected error was caught');
      utils.logError.restore();
    });
  });

  describe('createBid', function () {
    it('should return a bid object', function () {
      const statusCode = 1;
      const bid = $$PREBID_GLOBAL$$.createBid(statusCode);
      assert.isObject(bid, 'bid is an object');
      assert.equal(bid.getStatusCode(), statusCode, 'bid has correct status');

      const defaultStatusBid = $$PREBID_GLOBAL$$.createBid();
      assert.isObject(defaultStatusBid, 'bid is an object');
      assert.equal(defaultStatusBid.getStatusCode(), 0, 'bid has correct status');
    });
  });

  describe('loadScript', function () {
    it('should call adloader.loadScript', function () {
      const tagSrc = '';
      const callback = Function;
      const useCache = false;

      $$PREBID_GLOBAL$$.loadScript(tagSrc, callback, useCache);
      assert.ok(adloader.loadScriptStub.calledWith(tagSrc, callback, useCache), 'called adloader.loadScript');
    });
  });

  describe('aliasBidder', function () {
    it('should call adapterManager.aliasBidder', function () {
      const aliasBidAdapterSpy = sinon.spy(adapterManager, 'aliasBidAdapter');
      const bidderCode = 'testcode';
      const alias = 'testalias';

      $$PREBID_GLOBAL$$.aliasBidder(bidderCode, alias);
      assert.ok(aliasBidAdapterSpy.calledWith(bidderCode, alias), 'called adapterManager.aliasBidAdapterSpy');
      adapterManager.aliasBidAdapter();
    });

    it('should log error when not passed correct arguments', function () {
      const logErrorSpy = sinon.spy(utils, 'logError');
      const error = 'bidderCode and alias must be passed as arguments';

      $$PREBID_GLOBAL$$.aliasBidder();
      assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
      utils.logError.restore();
    });
  });

  describe('setPriceGranularity', function () {
    it('should log error when not passed granularity', function () {
      const logErrorSpy = sinon.spy(utils, 'logError');
      const error = 'Prebid Error: no value passed to `setPriceGranularity()`';

      $$PREBID_GLOBAL$$.setConfig({ priceGranularity: null });
      assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
      utils.logError.restore();
    });

    it('should log error when not passed a valid config object', function () {
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

    it('should set customPriceBucket with custom config buckets', function () {
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

  describe('emit event', function () {
    let auctionManagerStub;
    beforeEach(function () {
      auctionManagerStub = sinon.stub(auctionManager, 'createAuction').callsFake(function() {
        return auction;
      });
    });

    afterEach(function () {
      auctionManager.createAuction.restore();
    });
  });

  describe('removeAdUnit', function () {
    it('should remove given adUnit in adUnits array', function () {
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
    it('should remove all adUnits in adUnits array if no adUnits are given', function () {
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
      $$PREBID_GLOBAL$$.removeAdUnit();
      assert.deepEqual($$PREBID_GLOBAL$$.adUnits, []);
    });
    it('should remove adUnits which match addUnitCodes in adUnit array argument', function () {
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
      const adUnit3 = {
        code: 'adUnit3',
        bids: [{
          bidder: 'rubicon3',
          params: {
            accountId: '12345',
            siteId: '12345',
            zoneId: '12345'
          }
        }]
      };
      const adUnits = [adUnit1, adUnit2, adUnit3];
      $$PREBID_GLOBAL$$.adUnits = adUnits;
      $$PREBID_GLOBAL$$.removeAdUnit([adUnit1.code, adUnit2.code]);
      assert.deepEqual($$PREBID_GLOBAL$$.adUnits, [adUnit3]);
    });
  });

  describe('getDealTargeting', function () {
    beforeEach(function () {
      resetAuction();
    });

    afterEach(function () {
      resetAuction();
    });

    it('should truncate deal keys', function () {
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
          'auctionId': 123456,
          'adserverTargeting': {
            'foobar': '300x250',
            [CONSTANTS.TARGETING_KEYS.BIDDER]: 'appnexus',
            [CONSTANTS.TARGETING_KEYS.AD_ID]: '233bcbee889d46d',
            [CONSTANTS.TARGETING_KEYS.PRICE_BUCKET]: '10.00',
            [CONSTANTS.TARGETING_KEYS.SIZE]: '300x250',
            [CONSTANTS.TARGETING_KEYS.DEAL + '_appnexusDummyName']: '1234'
          }
        }
      ];

      var result = $$PREBID_GLOBAL$$.getAdserverTargeting();
      Object.keys(result['/19968336/header-bid-tag-0']).forEach(value => {
        expect(value).to.have.length.of.at.most(20);
      });
    });
  });

  describe('getHighestCpm', () => {
    // it('returns an array of winning bid objects for each adUnit', () => {
    //   const highestCpmBids = $$PREBID_GLOBAL$$.getHighestCpmBids();
    //   expect(highestCpmBids.length).to.equal(2);
    //   expect(highestCpmBids[0]).to.deep.equal(auctionManager.getBidsReceived()[1]);
    //   expect(highestCpmBids[1]).to.deep.equal(auctionManager.getBidsReceived()[2]);
    // });

    it('returns an array containing the highest bid object for the given adUnitCode', function () {
      const highestCpmBids = $$PREBID_GLOBAL$$.getHighestCpmBids('/19968336/header-bid-tag-0');
      expect(highestCpmBids.length).to.equal(1);
      expect(highestCpmBids[0]).to.deep.equal(auctionManager.getBidsReceived()[1]);
    });

    it('returns an empty array when the given adUnit is not found', function () {
      const highestCpmBids = $$PREBID_GLOBAL$$.getHighestCpmBids('/stallone');
      expect(highestCpmBids.length).to.equal(0);
    });

    it('returns an empty array when the given adUnit has no bids', function () {
      let _bidsReceived = getBidResponses()[0];
      _bidsReceived.cpm = 0;
      auction.getBidsReceived = function() { return _bidsReceived };

      const highestCpmBids = $$PREBID_GLOBAL$$.getHighestCpmBids('/19968336/header-bid-tag-0');
      expect(highestCpmBids.length).to.equal(0);
      resetAuction();
    });
  });

  describe('markWinningBidAsUsed', function () {
    it('marks the bid object as used for the given adUnitCode/adId combination', function () {
      // make sure the auction has "state" and does not reload the fixtures
      const adUnitCode = '/19968336/header-bid-tag-0';
      const bidsReceived = $$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode(adUnitCode);
      auction.getBidsReceived = function() { return bidsReceived.bids };

      // mark the bid and verify the state has changed to RENDERED
      const winningBid = targeting.getWinningBids(adUnitCode)[0];
      $$PREBID_GLOBAL$$.markWinningBidAsUsed({ adUnitCode, adId: winningBid.adId });
      const markedBid = find($$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode(adUnitCode).bids,
        bid => bid.adId === winningBid.adId);

      expect(markedBid.status).to.equal(CONSTANTS.BID_STATUS.RENDERED);
      resetAuction();
    });

    it('try and mark the bid object, but fail because we supplied the wrong adId', function () {
      const adUnitCode = '/19968336/header-bid-tag-0';
      const bidsReceived = $$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode(adUnitCode);
      auction.getBidsReceived = function() { return bidsReceived.bids };

      const winningBid = targeting.getWinningBids(adUnitCode)[0];
      $$PREBID_GLOBAL$$.markWinningBidAsUsed({ adUnitCode, adId: 'miss' });
      const markedBid = find($$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode(adUnitCode).bids,
        bid => bid.adId === winningBid.adId);

      expect(markedBid.status).to.not.equal(CONSTANTS.BID_STATUS.RENDERED);
      resetAuction();
    });

    it('marks the winning bid object as used for the given adUnitCode', function () {
      // make sure the auction has "state" and does not reload the fixtures
      const adUnitCode = '/19968336/header-bid-tag-0';
      const bidsReceived = $$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode(adUnitCode);
      auction.getBidsReceived = function() { return bidsReceived.bids };

      // mark the bid and verify the state has changed to RENDERED
      const winningBid = targeting.getWinningBids(adUnitCode)[0];
      $$PREBID_GLOBAL$$.markWinningBidAsUsed({ adUnitCode });
      const markedBid = find($$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode(adUnitCode).bids,
        bid => bid.adId === winningBid.adId);

      expect(markedBid.status).to.equal(CONSTANTS.BID_STATUS.RENDERED);
      resetAuction();
    });

    it('marks a bid object as used for the given adId', function () {
      // make sure the auction has "state" and does not reload the fixtures
      const adUnitCode = '/19968336/header-bid-tag-0';
      const bidsReceived = $$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode(adUnitCode);
      auction.getBidsReceived = function() { return bidsReceived.bids };

      // mark the bid and verify the state has changed to RENDERED
      const winningBid = targeting.getWinningBids(adUnitCode)[0];
      $$PREBID_GLOBAL$$.markWinningBidAsUsed({ adId: winningBid.adId });
      const markedBid = find($$PREBID_GLOBAL$$.getBidResponsesForAdUnitCode(adUnitCode).bids,
        bid => bid.adId === winningBid.adId);

      expect(markedBid.status).to.equal(CONSTANTS.BID_STATUS.RENDERED);
      resetAuction();
    });
  });

  describe('setTargetingForAst', function () {
    let targeting;
    let auctionManagerInstance;

    beforeEach(function () {
      resetAuction();
      auctionManagerInstance = newAuctionManager();
      sinon.stub(auctionManagerInstance, 'getBidsReceived').callsFake(function() {
        let bidResponse = getBidResponses()[1];
        // add a pt0 value for special case.
        bidResponse.adserverTargeting.pt0 = 'someVal';
        return [bidResponse];
      });
      sinon.stub(auctionManagerInstance, 'getAdUnitCodes').callsFake(function() {
        return ['/19968336/header-bid-tag-0'];
      });
      targeting = newTargeting(auctionManagerInstance);
    });

    afterEach(function () {
      auctionManagerInstance.getBidsReceived.restore();
      auctionManagerInstance.getAdUnitCodes.restore();
      resetAuction();
    });

    it('should set targeting for appnexus apntag object', function () {
      const bids = auctionManagerInstance.getBidsReceived();
      const adUnitCode = '/19968336/header-bid-tag-0';

      var expectedAdserverTargeting = bids[0].adserverTargeting;
      var newAdserverTargeting = {};
      let regex = /pt[0-9]/;

      for (var key in expectedAdserverTargeting) {
        if (key.search(regex) < 0) {
          newAdserverTargeting[key.toUpperCase()] = expectedAdserverTargeting[key];
        } else {
          newAdserverTargeting[key] = expectedAdserverTargeting[key];
        }
      }
      targeting.setTargetingForAst();
      expect(newAdserverTargeting).to.deep.equal(window.apntag.tags[adUnitCode].keywords);
    });

    it('should reset targeting for appnexus apntag object', function () {
      const bids = auctionManagerInstance.getBidsReceived();
      const adUnitCode = '/19968336/header-bid-tag-0';

      var expectedAdserverTargeting = bids[0].adserverTargeting;
      var newAdserverTargeting = {};
      let regex = /pt[0-9]/;

      for (var key in expectedAdserverTargeting) {
        if (key.search(regex) < 0) {
          newAdserverTargeting[key.toUpperCase()] = expectedAdserverTargeting[key];
        } else {
          newAdserverTargeting[key] = expectedAdserverTargeting[key];
        }
      }
      targeting.setTargetingForAst();
      expect(newAdserverTargeting).to.deep.equal(window.apntag.tags[adUnitCode].keywords);
      targeting.resetPresetTargetingAST();
      expect(window.apntag.tags[adUnitCode].keywords).to.deep.equal({});
    });

    it('should not find ' + CONSTANTS.TARGETING_KEYS.AD_ID + ' key in lowercase for all bidders', function() {
      const adUnitCode = '/19968336/header-bid-tag-0';
      $$PREBID_GLOBAL$$.setConfig({ enableSendAllBids: true });
      targeting.setTargetingForAst();
      const keywords = Object.keys(window.apntag.tags[adUnitCode].keywords).filter(keyword => (keyword.substring(0, CONSTANTS.TARGETING_KEYS.AD_ID.length) === CONSTANTS.TARGETING_KEYS.AD_ID));
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

  describe('getAllPrebidWinningBids', function () {
    let auctionManagerStub;
    beforeEach(function () {
      auctionManagerStub = sinon.stub(auctionManager, 'getBidsReceived');
    });

    afterEach(function () {
      auctionManagerStub.restore();
    });

    it('should return prebid auction winning bids', function () {
      let bidsReceived = [
        createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1', status: 'targetingSet', requestId: 'reqid-1'}),
        createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-1', adId: 'adid-2', requestId: 'reqid-2'}),
        createBidReceived({bidder: 'appnexus', cpm: 6, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-3', requestId: 'reqid-3'}),
        createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-1', adId: 'adid-4', requestId: 'reqid-4'}),
      ];
      auctionManagerStub.returns(bidsReceived)
      let bids = $$PREBID_GLOBAL$$.getAllPrebidWinningBids();

      expect(bids.length).to.equal(1);
      expect(bids[0].adId).to.equal('adid-1');
    });
  });
});
