import {
  createBidReceived,
  getAdServerTargeting,
  getAdUnits,
  getBidRequests,
  getBidResponses,
  getBidResponsesFromAPI,
  getTargetingKeys,
  getTargetingKeysBidLandscape
} from 'test/fixtures/fixtures.js';
import {auctionManager, newAuctionManager} from 'src/auctionManager.js';
import {filters, newTargeting, targeting} from 'src/targeting.js';
import {config as configObj} from 'src/config.js';
import * as ajaxLib from 'src/ajax.js';
import * as auctionModule from 'src/auction.js';
import {resetAuctionState} from 'src/auction.js';
import {registerBidder} from 'src/adapters/bidderFactory.js';
import * as pbjsModule from 'src/prebid.js';
import pbjs, {resetQueSetup, startAuction} from 'src/prebid.js';
import {hook} from '../../../src/hook.js';
import {reset as resetDebugging} from '../../../src/debugging.js';
import {stubAuctionIndex} from '../../helpers/indexStub.js';
import {createBid} from '../../../src/bidfactory.js';
import {enrichFPD} from '../../../src/fpd/enrichment.js';
import {mockFpdEnrichments} from '../../helpers/fpd.js';
import {deepAccess, deepSetValue, generateUUID} from '../../../src/utils.js';
import {getCreativeRenderer} from '../../../src/creativeRenderers.js';
import {BID_STATUS, EVENTS, GRANULARITY_OPTIONS, PB_LOCATOR, TARGETING_KEYS} from 'src/constants.js';
import {getBidToRender} from '../../../src/adRendering.js';

var assert = require('chai').assert;
var expect = require('chai').expect;

var utils = require('src/utils');
var adapterManager = require('src/adapterManager').default;
var events = require('src/events');

// These bid adapters are required to be loaded for the following tests to work
require('modules/appnexusBidAdapter');

var config = require('test/fixtures/config.json');

var adUnits = getAdUnits();
var adUnitCodes = getAdUnits().map(unit => unit.code);
var bidsBackHandler = function() {};
const timeout = 2000;
const auctionId = generateUUID();
let auction;

function resetAuction() {
  if (auction == null) {
    auction = auctionManager.createAuction({adUnits, adUnitCodes, callback: bidsBackHandler, cbTimeout: timeout, labels: undefined, auctionId: auctionId});
  }
  pbjs.setConfig({ enableSendAllBids: false });
  auction.getBidRequests = getBidRequests;
  auction.getBidsReceived = getBidResponses;
  auction.getAdUnits = getAdUnits;
  auction.getAuctionStatus = function() { return auctionModule.AUCTION_COMPLETED }
}

var Slot = function Slot(elementId, pathId) {
  var slot = {
    targeting: {},
    getSlotElementId: function getSlotElementId() {
      return elementId;
    },

    getAdUnitPath: function getAdUnitPath() {
      return pathId;
    },

    setTargeting: function setTargeting(key, value) {
      this.targeting[key] = Array.isArray(value) ? value : [value];
    },

    getTargeting: function getTargeting(key) {
      return this.targeting[key] || [];
    },

    getTargetingKeys: function getTargetingKeys() {
      return Object.getOwnPropertyNames(this.targeting);
    },

    clearTargeting: function clearTargeting() {
      this.targeting = {};
      return this;
    },

    updateTargetingFromMap: function updateTargetingFromMap(targetingMap) {
      Object.keys(targetingMap).forEach(key => this.setTargeting(key, targetingMap[key]))
    }
  };
  slot.spySetTargeting = sinon.spy(slot, 'setTargeting');
  slot.spyGetSlotElementId = sinon.spy(slot, 'getSlotElementId');
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
  slot2.setTargeting('pos1', '750x350');
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
        self._targeting[key] = Array.isArray(arrayOfValues) ? arrayOfValues : [arrayOfValues];
      },

      getTargeting: function(key) {
        return self._targeting[key] || [];
      },

      getTargetingKeys: function() {
        return Object.getOwnPropertyNames(self._targeting);
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
  let bidExpiryStub, sandbox;
  function getBidToRenderHook(next, adId) {
    // make sure we can handle async bidToRender
    next(adId, new Promise((resolve) => setTimeout(resolve)))
  }
  before((done) => {
    hook.ready();
    pbjsModule.requestBids.getHooks().remove();
    resetDebugging();
    getBidToRender.before(getBidToRenderHook, 100);
    // preload creative renderer
    getCreativeRenderer({}).then(() => done());
  });

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    mockFpdEnrichments(sandbox);
    bidExpiryStub = sinon.stub(filters, 'isBidNotExpired').callsFake(() => true);
    configObj.setConfig({ useBidCache: true });
    resetAuctionState();
  });

  afterEach(function() {
    sandbox.restore();
    pbjs.adUnits = [];
    bidExpiryStub.restore();
    configObj.setConfig({ useBidCache: false });
  });

  after(function() {
    auctionManager.clearAllAuctions();
    getBidToRender.getHooks({hook: getBidToRenderHook}).remove();
  });

  describe('processQueue', () => {
    it('should insert a locator frame on the page', () => {
      pbjs.processQueue();
      expect(window.frames[PB_LOCATOR]).to.exist;
    });

    ['cmd', 'que'].forEach(prop => {
      describe(`using .${prop}`, () => {
        let queue, ran;
        beforeEach(() => {
          ran = false;
          queue = pbjs[prop] = [];
          resetQueSetup();
        });
        after(() => {
          pbjs.processQueue();
        })

        function pushToQueue(fn = () => { ran = true }) {
          return new Promise((resolve) => {
            queue.push(() => {
              fn();
              resolve();
            });
          })
        }

        it(`should patch .push`, async () => {
          pbjs.processQueue();
          await pushToQueue();
          expect(ran).to.be.true;
        });

        it('should respect insertion order', async () => {
          const log = [];
          pushToQueue(() => log.push(1));
          pbjs.processQueue();
          await pushToQueue(() => log.push(2));
          expect(log).to.eql([1, 2]);
        });
      })
    });
  })

  describe('and global adUnits', () => {
    const startingAdUnits = [
      {
        code: 'one',
      },
      {
        code: 'two',
      }
    ];
    let actualAdUnits, hookRan, done;

    function deferringHook(next, req) {
      setTimeout(() => {
        actualAdUnits = req.adUnits || pbjs.adUnits;
        done();
      });
    }

    beforeEach(() => {
      pbjsModule.requestBids.before(deferringHook, 99);
      hookRan = new Promise((resolve) => {
        done = resolve;
      });
      pbjs.adUnits.splice(0, pbjs.adUnits.length, ...startingAdUnits);
    });

    afterEach(() => {
      pbjsModule.requestBids.getHooks({hook: deferringHook}).remove();
      pbjs.adUnits.splice(0, pbjs.adUnits.length);
    })

    Object.entries({
      'addAdUnits': (g) => g.addAdUnits({code: 'three'}),
      'removeAdUnit': (g) => g.removeAdUnit('one')
    }).forEach(([method, op]) => {
      it(`once called, should not be affected by ${method}`, () => {
        pbjs.requestBids({});
        op(pbjs);
        return hookRan.then(() => {
          expect(actualAdUnits).to.eql(startingAdUnits);
        })
      });
    });
  });

  describe('getAdserverTargetingForAdUnitCodeStr', function () {
    beforeEach(function () {
      resetAuction();
    });

    it('should return targeting info as a string', function () {
      const adUnitCode = config.adUnitCodes[0];
      pbjs.setConfig({ enableSendAllBids: true, targetingControls: { allBidsCustomTargeting: true } });
      var expectedResults = [`foobar=300x250%2C300x600%2C0x0`, `${TARGETING_KEYS.SIZE}=300x250`, `${TARGETING_KEYS.PRICE_BUCKET}=10.00`, `${TARGETING_KEYS.AD_ID}=233bcbee889d46d`, `${TARGETING_KEYS.BIDDER}=appnexus`, `${TARGETING_KEYS.SIZE}_triplelift=0x0`, `${TARGETING_KEYS.PRICE_BUCKET}_triplelift=10.00`, `${TARGETING_KEYS.AD_ID}_triplelift=222bb26f9e8bd`, `${TARGETING_KEYS.BIDDER}_triplelift=triplelift`, `${TARGETING_KEYS.SIZE}_appnexus=300x250`, `${TARGETING_KEYS.PRICE_BUCKET}_appnexus=10.00`, `${TARGETING_KEYS.AD_ID}_appnexus=233bcbee889d46d`, `${TARGETING_KEYS.BIDDER}_appnexus=appnexus`, `${TARGETING_KEYS.SIZE}_pagescience=300x250`, `${TARGETING_KEYS.PRICE_BUCKET}_pagescience=10.00`, `${TARGETING_KEYS.AD_ID}_pagescience=25bedd4813632d7`, `${TARGETING_KEYS.BIDDER}_pagescienc=pagescience`, `${TARGETING_KEYS.SIZE}_brightcom=300x250`, `${TARGETING_KEYS.PRICE_BUCKET}_brightcom=10.00`, `${TARGETING_KEYS.AD_ID}_brightcom=26e0795ab963896`, `${TARGETING_KEYS.BIDDER}_brightcom=brightcom`, `${TARGETING_KEYS.SIZE}_brealtime=300x250`, `${TARGETING_KEYS.PRICE_BUCKET}_brealtime=10.00`, `${TARGETING_KEYS.AD_ID}_brealtime=275bd666f5a5a5d`, `${TARGETING_KEYS.BIDDER}_brealtime=brealtime`, `${TARGETING_KEYS.SIZE}_pubmatic=300x250`, `${TARGETING_KEYS.PRICE_BUCKET}_pubmatic=10.00`, `${TARGETING_KEYS.AD_ID}_pubmatic=28f4039c636b6a7`, `${TARGETING_KEYS.BIDDER}_pubmatic=pubmatic`, `${TARGETING_KEYS.SIZE}_rubicon=300x600`, `${TARGETING_KEYS.PRICE_BUCKET}_rubicon=10.00`, `${TARGETING_KEYS.AD_ID}_rubicon=29019e2ab586a5a`, `${TARGETING_KEYS.BIDDER}_rubicon=rubicon`];
      var result = pbjs.getAdserverTargetingForAdUnitCodeStr(adUnitCode);

      expectedResults.forEach(expected => {
        expect(result).to.include(expected);
      })
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
      const adUnitCode = config.adUnitCodes[0];
      pbjs.setConfig({ enableSendAllBids: true });
      var result = pbjs.getAdserverTargetingForAdUnitCode(adUnitCode);
      const expected = getAdServerTargeting()[adUnitCode];
      sinon.assert.match(result, expected);
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
      pbjs.setConfig({ enableSendAllBids: true });
      const targeting = pbjs.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);
      const expected = getAdServerTargeting(['/19968336/header-bid-tag-0, /19968336/header-bid-tag1']);
      sinon.assert.match(targeting, expected);
    });

    it('should return correct targeting with default settings', function () {
      var targeting = pbjs.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);
      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '300x250,300x600,0x0',
          [TARGETING_KEYS.SIZE]: '300x250',
          [TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [TARGETING_KEYS.AD_ID]: '233bcbee889d46d',
          [TARGETING_KEYS.BIDDER]: 'appnexus'
        },
        '/19968336/header-bid-tag1': {
          foobar: '728x90',
          [TARGETING_KEYS.SIZE]: '728x90',
          [TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [TARGETING_KEYS.AD_ID]: '24bd938435ec3fc',
          [TARGETING_KEYS.BIDDER]: 'appnexus'
        }
      };
      sinon.assert.match(targeting, expected);
    });

    it('should return correct targeting with bid landscape targeting on', function () {
      pbjs.setConfig({ enableSendAllBids: true, targetingControls: { allBidsCustomTargeting: true } });
      var targeting = pbjs.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);
      var expected = getAdServerTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);
      sinon.assert.match(targeting, expected);
    });

    it("should include a losing bid's custom ad targeting key", function () {
      // Let's make sure we're getting the expected losing bid.
      assert.equal(auction.getBidsReceived()[0]['bidderCode'], 'triplelift');
      assert.equal(auction.getBidsReceived()[0]['cpm'], 0.112256);

      // Modify the losing bid to have `alwaysUseBid=true` and a custom `adserverTargeting` key.
      const _bidsReceived = getBidResponses();
      _bidsReceived[0]['adserverTargeting'] = {
        always_use_me: 'abc',
      };

      auction.getBidsReceived = function() { return _bidsReceived };

      var targeting = pbjs.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);

      // Ensure targeting for both ad placements includes the custom key.
      assert.equal(
        targeting['/19968336/header-bid-tag-0'].hasOwnProperty('always_use_me'),
        true
      );

      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '300x250,300x600',
          always_use_me: 'abc',
          [TARGETING_KEYS.SIZE]: '300x250',
          [TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [TARGETING_KEYS.AD_ID]: '233bcbee889d46d',
          [TARGETING_KEYS.BIDDER]: 'appnexus'
        },
        '/19968336/header-bid-tag1': {
          foobar: '728x90',
          [TARGETING_KEYS.SIZE]: '728x90',
          [TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [TARGETING_KEYS.AD_ID]: '24bd938435ec3fc',
          [TARGETING_KEYS.BIDDER]: 'appnexus'
        }
      };
      sinon.assert.match(targeting, expected);
    });

    it('should not overwrite winning bids custom keys targeting key', function () {
      resetAuction();
      // mimic a bidderSetting.standard key here for each bid and alwaysUseBid true for every bid
      const _bidsReceived = getBidResponses();
      _bidsReceived.forEach(bid => {
        bid.adserverTargeting.custom_ad_id = bid.adId;
      });

      auction.getBidsReceived = function() { return _bidsReceived };

      pbjs.bidderSettings = {
        'standard': {
          adserverTargeting: [{
            key: TARGETING_KEYS.BIDDER,
            val: function(bidResponse) {
              return bidResponse.bidderCode;
            }
          }, {
            key: 'custom_ad_id',
            val: function(bidResponse) {
              return bidResponse.adId;
            }
          }, {
            key: TARGETING_KEYS.PRICE_BUCKET,
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

      var targeting = pbjs.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);

      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '300x250',
          custom_ad_id: '233bcbee889d46d',
          [TARGETING_KEYS.SIZE]: '300x250',
          [TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [TARGETING_KEYS.AD_ID]: '233bcbee889d46d',
          [TARGETING_KEYS.BIDDER]: 'appnexus'
        },
        '/19968336/header-bid-tag1': {
          foobar: '728x90',
          [TARGETING_KEYS.SIZE]: '728x90',
          [TARGETING_KEYS.PRICE_BUCKET]: '10.00',
          [TARGETING_KEYS.AD_ID]: '24bd938435ec3fc',
          [TARGETING_KEYS.BIDDER]: 'appnexus',
          custom_ad_id: '24bd938435ec3fc'
        }
      };
      sinon.assert.match(targeting, expected);
      pbjs.bidderSettings = {};
    });

    it('should not send standard targeting keys when the bid has `sendStandardTargeting` set to `false`', function () {
      const _bidsReceived = getBidResponses();
      _bidsReceived.forEach(bid => {
        bid.adserverTargeting.custom_ad_id = bid.adId;
        bid.sendStandardTargeting = false;
      });

      auction.getBidsReceived = function() { return _bidsReceived };

      var targeting = pbjs.getAdserverTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']);

      var expected = {
        '/19968336/header-bid-tag-0': {
          foobar: '300x250,300x600,0x0',
          custom_ad_id: '233bcbee889d46d,28f4039c636b6a7,29019e2ab586a5a,25bedd4813632d7,275bd666f5a5a5d,26e0795ab963896,222bb26f9e8bd'
        },
        '/19968336/header-bid-tag1': {
          foobar: '728x90',
          custom_ad_id: '24bd938435ec3fc'
        }
      };
      sinon.assert.match(targeting, expected);
      Object.values(targeting).forEach(targetingMap => {
        expect(targetingMap).to.have.keys(['foobar', 'custom_ad_id', 'hb_ver']);
      })
    });
  });

  describe('getAdserverTargeting', function() {
    const customConfigObject = {
      'buckets': [
        { 'precision': 2, 'max': 5, 'increment': 0.01 },
        { 'precision': 2, 'max': 8, 'increment': 0.05 },
        { 'precision': 2, 'max': 20, 'increment': 0.5 },
        { 'precision': 2, 'max': 25, 'increment': 1 }
      ]
    };
    let currentPriceBucket;
    let bid;
    let auction;
    let ajaxStub;
    let indexStub;
    const cbTimeout = 3000;
    let targeting;

    const RESPONSE = {
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

    before(function () {
      pbjs.bidderSettings = {};
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
            'auctionId': '20882439e3238c',
            'transactionId': 'trdiv-gpt-ad-1460505748561-0',
            'adUnitId': 'audiv-gpt-ad-1460505748561-0',
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
      const auctionManagerInstance = newAuctionManager();
      targeting = newTargeting(auctionManagerInstance);
      const adUnits = [{
        adUnitId: 'audiv-gpt-ad-1460505748561-0',
        transactionId: 'trdiv-gpt-ad-1460505748561-0',
        code: 'div-gpt-ad-1460505748561-0',
        sizes: [[300, 250], [300, 600]],
        bids: [{
          bidder: 'appnexus',
          params: {
            placementId: '10433394'
          }
        }]
      }];
      const adUnitCodes = ['div-gpt-ad-1460505748561-0'];
      auction = auctionManagerInstance.createAuction({adUnits, adUnitCodes});
      indexStub = sinon.stub(auctionManager, 'index');
      indexStub.get(() => auctionManagerInstance.index);
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
      indexStub.restore();
    });

    it('should get correct ' + TARGETING_KEYS.PRICE_BUCKET + ' when using bid.cpm is between 0 to 5', async function () {
      RESPONSE.tags[0].ads[0].cpm = 2.1234;
      auction.callBids(cbTimeout);
      await auction.end;
      const bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][TARGETING_KEYS.PRICE_BUCKET]).to.equal('2.12');
    });

    it('should get correct ' + TARGETING_KEYS.PRICE_BUCKET + ' when using bid.cpm is between 5 to 8', async function () {
      RESPONSE.tags[0].ads[0].cpm = 6.78;
      auction.callBids(cbTimeout);
      await auction.end;
      const bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][TARGETING_KEYS.PRICE_BUCKET]).to.equal('6.75');
    });

    it('should get correct ' + TARGETING_KEYS.PRICE_BUCKET + ' when using bid.cpm is between 8 to 20', async function () {
      RESPONSE.tags[0].ads[0].cpm = 19.5234;
      auction.callBids(cbTimeout);
      await auction.end;
      const bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][TARGETING_KEYS.PRICE_BUCKET]).to.equal('19.50');
    });

    it('should get correct ' + TARGETING_KEYS.PRICE_BUCKET + ' when using bid.cpm is between 20 to 25', async function () {
      RESPONSE.tags[0].ads[0].cpm = 21.5234;
      auction.callBids(cbTimeout);
      await auction.end;
      const bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][TARGETING_KEYS.PRICE_BUCKET]).to.equal('21.00');
    });
  });

  describe('getAdserverTargeting with `mediaTypePriceGranularity` set for media type', function() {
    let currentPriceBucket;
    let auction;
    let ajaxStub;
    let response;
    const cbTimeout = 3000;
    let auctionManagerInstance;
    let targeting;
    let indexStub;

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
        transactionId: `tr${code}`,
        adUnitId: `au${code}`,
        code: code,
        sizes: [[300, 250], [300, 600]],
        bids: [{
          bidder: 'appnexus',
          params: {
            placementId: '10433394'
          }
        }]
      };

      const _mediaTypes = {};
      if (mediaTypes.indexOf('banner') !== -1) {
        Object.assign(_mediaTypes, {
          'banner': {}
        });
      }
      if (mediaTypes.indexOf('video') !== -1) {
        Object.assign(_mediaTypes, {
          'video': {
            context: 'instream',
            playerSize: [300, 250]
          }
        });
      }
      if (mediaTypes.indexOf('native') !== -1) {
        Object.assign(_mediaTypes, {
          'native': {}
        });
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
      pbjs.bidderSettings = {};

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
            { 'precision': 2, 'max': 5, 'increment': 0.01 },
            { 'precision': 2, 'max': 8, 'increment': 0.05 },
            { 'precision': 2, 'max': 20, 'increment': 0.5 },
            { 'precision': 2, 'max': 25, 'increment': 1 }
          ]
        },
        'mediaTypePriceGranularity': {
          'banner': {
            'buckets': [
              { 'precision': 2, 'max': 5, 'increment': 0.25 },
              { 'precision': 2, 'max': 20, 'increment': 0.5 },
              { 'precision': 2, 'max': 100, 'increment': 1 }
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
      sinon.stub(adapterManager, 'makeBidRequests').callsFake(() => {
        const br = {
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
              'transactionId': 'trdiv-gpt-ad-1460505748561-0',
              'adUnitId': 'audiv-gpt-ad-1460505748561-0',
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
        };
        const au = auction.getAdUnits().find((au) => au.transactionId === br.bids[0].transactionId);
        br.bids[0].mediaTypes = Object.assign({}, au.mediaTypes);
        return [br];
      });
    });

    after(function () {
      configObj.setConfig({ priceGranularity: currentPriceBucket });
      adapterManager.makeBidRequests.restore();
    })

    beforeEach(() => {
      indexStub = sinon.stub(auctionManager, 'index');
      indexStub.get(() => auctionManagerInstance.index);
    });

    afterEach(function () {
      ajaxStub.restore();
      indexStub.restore();
    });

    it('should get correct ' + TARGETING_KEYS.PRICE_BUCKET + ' with cpm between 0 - 5', async function () {
      initTestConfig({
        adUnits: [createAdUnit('div-gpt-ad-1460505748561-0')],
        adUnitCodes: ['div-gpt-ad-1460505748561-0']
      });

      response = bannerResponse;
      response.tags[0].ads[0].cpm = 3.4288;

      auction.callBids(cbTimeout);
      await auction.end;
      const bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][TARGETING_KEYS.PRICE_BUCKET]).to.equal('3.25');
    });

    it('should get correct ' + TARGETING_KEYS.PRICE_BUCKET + ' with cpm between 21 - 100', async function () {
      initTestConfig({
        adUnits: [createAdUnit('div-gpt-ad-1460505748561-0')],
        adUnitCodes: ['div-gpt-ad-1460505748561-0']
      });

      response = bannerResponse;
      response.tags[0].ads[0].cpm = 43.4288;

      auction.callBids(cbTimeout);
      await auction.end;
      const bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][TARGETING_KEYS.PRICE_BUCKET]).to.equal('43.00');
    });

    it('should only apply price granularity if bid media type matches', async function () {
      initTestConfig({
        adUnits: [createAdUnit('div-gpt-ad-1460505748561-0')],
        adUnitCodes: ['div-gpt-ad-1460505748561-0']
      });

      response = bannerResponse;
      response.tags[0].ads[0].cpm = 3.4288;

      auction.callBids(cbTimeout);
      await auction.end;
      const bidTargeting = targeting.getAllTargeting();
      expect(bidTargeting['div-gpt-ad-1460505748561-0'][TARGETING_KEYS.PRICE_BUCKET]).to.equal('3.25');

      if (FEATURES.VIDEO) {
        ajaxStub.restore();

        initTestConfig({
          adUnits: [createAdUnit('div-gpt-ad-1460505748561-0', 'video')],
          adUnitCodes: ['div-gpt-ad-1460505748561-0']
        });

        response = videoResponse;
        response.tags[0].ads[0].cpm = 3.4288;

        auction.callBids(cbTimeout);
        await auction.end;
        const bidTargeting = targeting.getAllTargeting();
        expect(bidTargeting['div-gpt-ad-1460505748561-0'][TARGETING_KEYS.PRICE_BUCKET]).to.equal('3.00');
      }
    });
  });

  describe('getBidResponses', function () {
    it('should return empty obj when last auction Id had no responses', function () {
      auctionManager.getLastAuctionId = () => 999994;
      var result = pbjs.getBidResponses();
      assert.deepEqual(result, {}, 'expected bid responses are returned');
    });

    it('should return expected bid responses when not passed an adunitCode', function () {
      auctionManager.getLastAuctionId = () => 654321;
      var result = pbjs.getBidResponses();
      var compare = Object.fromEntries(Object.entries(getBidResponsesFromAPI()).map(([code, {bids}]) => {
        const arr = bids.slice();
        arr.bids = arr;
        return [code, arr];
      }));
      assert.deepEqual(result, compare, 'expected bid responses are returned');
    });

    it('should return bid responses for most recent auctionId only', function () {
      const responses = pbjs.getBidResponses();
      assert.equal(responses[Object.keys(responses)[0]].bids.length, 4);
    });
  });

  describe('getBidResponsesForAdUnitCode', function () {
    it('should return bid responses as expected', function () {
      const adUnitCode = '/19968336/header-bid-tag-0';
      const result = pbjs.getBidResponsesForAdUnitCode(adUnitCode);
      const bids = getBidResponses().filter(bid => bid.adUnitCode === adUnitCode);
      const compare = (() => { const arr = bids.slice(); arr.bids = arr; return arr; })();
      assert.deepEqual(result, compare, 'expected id responses for ad unit code are returned');
    });
  });

  describe('setTargetingForGPTAsync', function () {
    let logErrorSpy;
    let targeting;

    beforeEach(function () {
      logErrorSpy = sinon.spy(utils, 'logError');
      resetAuction();
    });

    afterEach(function () {
      utils.logError.restore();
    });

    it('should set pbjs targeting keys with values after calling setTargetingForGPTAsync function', function () {
      var slots = createSlotArrayScenario2();

      window.googletag.pubads().setSlots(slots);
      pbjs.setTargetingForGPTAsync([config.adUnitCodes[0]]);
      pbjs.setConfig({ targetingControls: {allBidsCustomTargeting: true }});

      slots.forEach(function(slot) {
        targeting = {};
        slot.getTargetingKeys().forEach(function (key) {
          const value = slot.getTargeting(key);
          targeting[key] = value[0]
        });
        expect(targeting['pos1']).to.equal('750x350'); // non prebid targeting that was set should still be there
        // Check that some of the keys with the hb_ prefix  have values with length > 1
        const hasSomePrebidTargetingValues = Object.keys(targeting).some(target => target.startsWith('hb_') && targeting[target]?.length > 0);
        expect(hasSomePrebidTargetingValues).to.equal(true);
      });
    });
    it('should remove pbjs targeting when a new auction is run without any bids returned', function () {
      auction.getBidsReceived = function() { return [] };

      var slots = createSlotArrayScenario2();
      window.googletag.pubads().setSlots(slots);

      pbjs.setTargetingForGPTAsync([config.adUnitCodes[0]]);

      slots.forEach(function(slot) {
        targeting = {};
        slot.getTargetingKeys().forEach(function (key) {
          const value = slot.getTargeting(key);
          targeting[key] = value[0]
        });

        expect(targeting['pos1']).to.equal('750x350'); // non prebid targeting that was set should still be there
        // ensure that all of the keys with the hb_ prefix have values with length === 0, ignore other keys
        const hasNoPrebidTargetingValues = Object.keys(targeting).every(targetKey => (targetKey.startsWith('hb_') && targeting[targetKey] === null) || !targetKey.startsWith('hb_'))
        expect(hasNoPrebidTargetingValues).to.equal(true);
      });
    });

    it('should set googletag targeting keys to specific slot with customSlotMatching', function () {
      // same ad unit code but two differnt divs
      // we make sure we can set targeting for a specific one with customSlotMatching

      pbjs.setConfig({ enableSendAllBids: false });

      var slots = createSlotArrayScenario2();

      slots[0].spySetTargeting.resetHistory();
      slots[1].spySetTargeting.resetHistory();
      window.googletag.pubads().setSlots(slots);
      pbjs.setConfig({ targetingControls: {allBidsCustomTargeting: true }});
      pbjs.setTargetingForGPTAsync([config.adUnitCodes[0]], (slot) => {
        return (adUnitCode) => {
          return slots[0].getSlotElementId() === slot.getSlotElementId();
        };
      });

      var expected = getTargetingKeys();
      expect(slots[0].spySetTargeting.args).to.deep.contain.members(expected);
      expect(slots[1].spySetTargeting.args).to.not.deep.contain.members(expected);
    });

    it('should set targeting when passed a string ad unit code with enableSendAllBids', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);
      pbjs.setConfig({ enableSendAllBids: true });

      pbjs.setTargetingForGPTAsync('/19968336/header-bid-tag-0');
      expect(slots[0].spySetTargeting.args).to.deep.contain.members([[TARGETING_KEYS.BIDDER, 'appnexus'], [TARGETING_KEYS.AD_ID + '_appnexus', '233bcbee889d46d'], [TARGETING_KEYS.PRICE_BUCKET + '_appnexus', '10.00']]);
    });

    it('should set targeting when passed an array of ad unit codes with enableSendAllBids', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);
      pbjs.setConfig({ enableSendAllBids: true });

      pbjs.setTargetingForGPTAsync(['/19968336/header-bid-tag-0']);
      expect(slots[0].spySetTargeting.args).to.deep.contain.members([[TARGETING_KEYS.BIDDER, 'appnexus'], [TARGETING_KEYS.AD_ID + '_appnexus', '233bcbee889d46d'], [TARGETING_KEYS.PRICE_BUCKET + '_appnexus', '10.00']]);
    });

    it('should set targeting from googletag data', function () {
      var slots = createSlotArray();
      slots[0].spySetTargeting.resetHistory();
      window.googletag.pubads().setSlots(slots);
      pbjs.setConfig({ enableSendAllBids: true, targetingControls: { allBidsCustomTargeting: true } });
      pbjs.setTargetingForGPTAsync();

      var expected = getTargetingKeys();
      expect(slots[0].spySetTargeting.args).to.deep.contain.members(expected);
    });

    it('Calling enableSendAllBids should set targeting to include standard keys with bidder' +
      ' append to key name', function () {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      pbjs.setConfig({ enableSendAllBids: true });
      pbjs.setTargetingForGPTAsync();

      var expected = getTargetingKeysBidLandscape();
      expect(slots[0].spySetTargeting.args).to.deep.contain.members(expected);
    });

    it('should set targeting for bids', function () {
      // Make sure we're getting the expected losing bid.
      assert.equal(auctionManager.getBidsReceived()[0]['bidderCode'], 'triplelift');
      assert.equal(auctionManager.getBidsReceived()[0]['cpm'], 0.112256);

      resetAuction();
      // Modify the losing bid to have `alwaysUseBid=true` and a custom `adserverTargeting` key.
      const _bidsReceived = getBidResponses();
      _bidsReceived[0]['adserverTargeting'] = {
        always_use_me: 'abc',
      };

      auction.getBidsReceived = function() { return _bidsReceived };

      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      pbjs.setTargetingForGPTAsync();

      var expected = [
        [
          TARGETING_KEYS.BIDDER,
          'appnexus'
        ],
        [
          TARGETING_KEYS.AD_ID,
          '233bcbee889d46d'
        ],
        [
          TARGETING_KEYS.PRICE_BUCKET,
          '10.00'
        ],
        [
          TARGETING_KEYS.SIZE,
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

      pbjs.setTargetingForGPTAsync();
      assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
      window.googletag = windowGoogletagBackup;
    });

    it('should emit SET_TARGETING event when successfully invoked', function() {
      var slots = createSlotArray();
      window.googletag.pubads().setSlots(slots);

      var callback = sinon.spy();

      pbjs.onEvent('setTargeting', callback);
      pbjs.setTargetingForGPTAsync(config.adUnitCodes);

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
    var spyLogWarn = null;
    var spyAddWinningBid;
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
        const bidsReceived = getBidResponses();
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
        body: {
          appendChild: sinon.stub()
        },
        getElementsByTagName: sinon.stub(),
        querySelector: sinon.stub(),
        createElement: sinon.stub(),
      };
      doc.defaultView.document = doc;

      elStub = {
        insertBefore: sinon.stub()
      };
      doc.getElementsByTagName.returns([elStub]);
      doc.querySelector.returns(elStub);

      spyLogError = sinon.spy(utils, 'logError');
      spyLogMessage = sinon.spy(utils, 'logMessage');
      spyLogWarn = sinon.spy(utils, 'logWarn');
      spyAddWinningBid = sinon.spy(auctionManager, 'addWinningBid');

      inIframe = true;
      sinon.stub(utils, 'inIframe').callsFake(() => inIframe);
      triggerPixelStub = sinon.stub(utils.internal, 'triggerPixel');
    });

    afterEach(function () {
      auction.getBidsReceived = getBidResponses;
      utils.logError.restore();
      utils.logMessage.restore();
      utils.logWarn.restore();
      utils.inIframe.restore();
      triggerPixelStub.restore();
      spyAddWinningBid.restore();
    });

    function renderAd(...args) {
      pbjs.renderAd(...args);
      return new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }

    it('should require doc and id params', function () {
      return renderAd().then(() => {
        var error = 'Error rendering ad (id: undefined): missing adId';
        assert.ok(spyLogError.calledWith(error), 'expected param error was logged');
      })
    });

    it('should write the ad to the doc', function () {
      const ad = "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>";
      pushBidResponseToAuction({
        ad
      });
      const iframe = {};
      doc.createElement.returns(iframe);
      return renderAd(doc, bidId).then(() => {
        expect(iframe.srcdoc).to.eql(ad);
      })
    });

    it('should place the url inside an iframe on the doc', function () {
      pushBidResponseToAuction({
        adUrl: 'http://server.example.com/ad/ad.js'
      });
      return renderAd(doc, bidId).then(() => {
        sinon.assert.calledWith(doc.createElement, 'iframe');
      });
    });

    it('should log an error when no ad or url', function () {
      pushBidResponseToAuction({});
      return renderAd(doc, bidId).then(() => {
        sinon.assert.called(spyLogError);
      });
    });

    it('should log an error when not in an iFrame', function () {
      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });
      inIframe = false;
      return renderAd(document, bidId).then(() => {
        const error = `Error rendering ad (id: ${bidId}): renderAd was prevented from writing to the main document.`;
        assert.ok(spyLogError.calledWith(error), 'expected error was logged');
      });
    });

    it('should emit AD_RENDER_SUCCEEDED', () => {
      sandbox.stub(events, 'emit');
      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });
      return renderAd(document, bidId).then(() => {
        sinon.assert.calledWith(events.emit, EVENTS.AD_RENDER_SUCCEEDED, sinon.match({adId: bidId}));
      });
    });

    it('should not render videos', function () {
      pushBidResponseToAuction({
        mediatype: 'video'
      });
      return renderAd(doc, bidId).then(() => {
        sinon.assert.notCalled(doc.createElement);
      });
    });

    it('should catch errors thrown when trying to write ads to the page', function () {
      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });

      var error = { message: 'doc write error' };
      doc.createElement.throws(error);

      return renderAd(doc, bidId).then(() => {
        var errorMessage = `Error rendering ad (id: ${bidId}): doc write error`
        assert.ok(spyLogError.calledWith(errorMessage), 'expected error was logged');
      });
    });

    it('should log an error when ad not found', function () {
      var fakeId = 99;
      return renderAd(doc, fakeId).then(() => {
        var error = `Error rendering ad (id: ${fakeId}): Cannot find ad '${fakeId}'`
        assert.ok(spyLogError.calledWith(error), 'expected error was logged');
      });
    });

    it('should save bid displayed to winning bid', function () {
      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });
      return renderAd(doc, bidId).then(() => {
        assert.deepEqual(pbjs.getAllWinningBids()[0], adResponse);
      });
    });

    it('fires impression trackers if present', function () {
      const url = 'http://www.example.com/burl';
      pushBidResponseToAuction({
        ad: '<div>ad</div>',
        source: 's2s',
        eventtrackers: [
          {event: 1, method: 1, url}
        ]
      });

      return renderAd(doc, bidId).then(() => {
        sinon.assert.calledOnce(triggerPixelStub);
        sinon.assert.calledWith(triggerPixelStub, url);
      });
    });

    it('should call addWinningBid', function () {
      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });
      return renderAd(doc, bidId).then(() => {
        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(spyAddWinningBid, adResponse);
      });
    });

    it('should warn stale rendering', function () {
      var warning = `Ad id ${bidId} has been rendered before`;
      var onWonEvent = sinon.stub();
      var onStaleEvent = sinon.stub();

      pbjs.onEvent(EVENTS.BID_WON, onWonEvent);
      pbjs.onEvent(EVENTS.STALE_RENDER, onStaleEvent);

      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });

      // First render should pass with no warning and added to winning bids
      return renderAd(doc, bidId).then(() => {
        sinon.assert.neverCalledWith(spyLogWarn, warning);

        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(spyAddWinningBid, adResponse);

        sinon.assert.calledWith(onWonEvent, adResponse);
        sinon.assert.notCalled(onStaleEvent);
        expect(adResponse).to.have.property('status', BID_STATUS.RENDERED);

        // Reset call history for spies and stubs
        spyLogMessage.resetHistory();
        spyLogWarn.resetHistory();
        spyAddWinningBid.resetHistory();
        onWonEvent.resetHistory();
        onStaleEvent.resetHistory();
        doc.createElement.resetHistory();
        return renderAd(doc, bidId);
      }).then(() => {
        // Second render should have a warning but still be rendered
        sinon.assert.calledWith(spyLogWarn, warning);
        sinon.assert.calledWith(onStaleEvent, adResponse);
        sinon.assert.called(doc.createElement);

        // Clean up
        pbjs.offEvent(EVENTS.BID_WON, onWonEvent);
        pbjs.offEvent(EVENTS.STALE_RENDER, onStaleEvent);
      });
    });

    it('should stop stale rendering', function () {
      var warning = `Ad id ${bidId} has been rendered before`;
      var onWonEvent = sinon.stub();
      var onStaleEvent = sinon.stub();

      // Setting suppressStaleRender to true explicitly
      configObj.setConfig({'auctionOptions': {'suppressStaleRender': true}});

      pbjs.onEvent(EVENTS.BID_WON, onWonEvent);
      pbjs.onEvent(EVENTS.STALE_RENDER, onStaleEvent);

      pushBidResponseToAuction({
        ad: "<script type='text/javascript' src='http://server.example.com/ad/ad.js'></script>"
      });

      // First render should pass with no warning and added to winning bids
      return renderAd(doc, bidId).then(() => {
        sinon.assert.neverCalledWith(spyLogWarn, warning);

        sinon.assert.calledOnce(spyAddWinningBid);
        sinon.assert.calledWith(spyAddWinningBid, adResponse);
        expect(adResponse).to.have.property('status', BID_STATUS.RENDERED);

        sinon.assert.calledWith(onWonEvent, adResponse);
        sinon.assert.notCalled(onStaleEvent);

        // Reset call history for spies and stubs
        spyLogMessage.resetHistory();
        spyLogWarn.resetHistory();
        spyAddWinningBid.resetHistory();
        onWonEvent.resetHistory();
        onStaleEvent.resetHistory();

        // Second render should have a warning and do not proceed further
        return renderAd(doc, bidId);
      }).then(() => {
        sinon.assert.calledWith(spyLogWarn, warning);

        sinon.assert.notCalled(spyAddWinningBid);

        sinon.assert.notCalled(onWonEvent);
        sinon.assert.calledWith(onStaleEvent, adResponse);

        // Clean up
        pbjs.offEvent(EVENTS.BID_WON, onWonEvent);
        pbjs.offEvent(EVENTS.STALE_RENDER, onStaleEvent);
        configObj.setConfig({'auctionOptions': {}});
      });
    });
  });

  describe('requestBids', function () {
    let logMessageSpy;
    let makeRequestsStub, createAuctionStub;
    let adUnits;
    let clock;
    before(function () {
      clock = sinon.useFakeTimers();
    });
    after(function () {
      clock.restore();
    });

    const BIDDER_CODE = 'sampleBidder';
    const bids = [{
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
    const bidRequests = [{
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

    let spec, indexStub, auction, completeAuction, auctionStarted;

    beforeEach(function () {
      logMessageSpy = sinon.spy(utils, 'logMessage');
      makeRequestsStub = sinon.stub(adapterManager, 'makeBidRequests');
      makeRequestsStub.returns(bidRequests);
      adUnits = [{
        code: 'adUnit-code',
        mediaTypes: {
          banner: {
            sizes: [[300, 250]]
          }
        },
        transactionId: 'mock-tid',
        adUnitId: 'mock-au',
        bids: [
          {bidder: BIDDER_CODE, params: {placementId: 'id'}},
        ]
      }];
      indexStub = sinon.stub(auctionManager, 'index');
      indexStub.get(() => stubAuctionIndex({adUnits, bidRequests}))
      sinon.stub(adapterManager, 'callBids').callsFake((_, bidrequests, addBidResponse, adapterDone) => {
        completeAuction = (bidsReceived) => {
          bidsReceived.forEach((bid) => addBidResponse(bid.adUnitCode, Object.assign(createBid(), bid)));
          bidRequests.forEach((req) => adapterDone.call(req));
          return auction.end;
        }
      })
      const origNewAuction = auctionModule.newAuction;
      auctionStarted = new Promise((resolve) => {
        sinon.stub(auctionModule, 'newAuction').callsFake(function (opts) {
          auction = origNewAuction(opts);
          resolve(auction);
          return auction;
        })
      })
      spec = {
        code: BIDDER_CODE,
        isBidRequestValid: sinon.stub(),
        buildRequests: sinon.stub(),
        interpretResponse: sinon.stub(),
        getUserSyncs: sinon.stub(),
        onTimeout: sinon.stub(),
        onSetTargeting: sinon.stub(),
      };

      registerBidder(spec);
      spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec.isBidRequestValid.returns(true);
      spec.interpretResponse.returns(bids);
    });

    afterEach(function () {
      clock.restore();
      adapterManager.makeBidRequests.restore();
      adapterManager.callBids.restore();
      indexStub.restore();
      auction.getBidsReceived = () => [];
      auctionModule.newAuction.restore();
      utils.logMessage.restore();
    });

    async function runAuction(request = {}) {
      pbjs.requestBids(request);
      await auctionStarted;
    }

    it('should execute callback after timeout', async function () {
      const requestObj = {
        bidsBackHandler: sinon.stub(),
        timeout: 2000,
        adUnits: adUnits
      };
      await runAuction(requestObj);

      const re = new RegExp('^Auction [a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12} timedOut$');
      await clock.tick(requestObj.timeout - 1);
      assert.ok(logMessageSpy.neverCalledWith(sinon.match(re)), 'executeCallback not called');

      await clock.tick(1);
      assert.ok(logMessageSpy.calledWith(sinon.match(re)), 'executeCallback called');

      expect(requestObj.bidsBackHandler.getCall(0).args[1]).to.equal(true,
        'bidsBackHandler should be called with timedOut=true');

      sinon.assert.called(spec.onTimeout);
    });

    it('should execute `onSetTargeting` after setTargetingForGPTAsync', async function () {
      const bidId = 1;
      const auctionId = 1;
      const adResponse = Object.assign({
        auctionId: auctionId,
        adId: String(bidId),
        width: 300,
        height: 250,
        adUnitCode: bidRequests[0].bids[0].adUnitCode,
        transactionId: 'mock-tid',
        adUnitId: 'mock-au',
        adserverTargeting: {
          'hb_bidder': BIDDER_CODE,
          'hb_adid': bidId,
          'hb_pb': bids[0].cpm,
          'hb_size': '300x250',
        },
        bidder: bids[0].bidderCode,
      }, bids[0]);

      const requestObj = {
        bidsBackHandler: null,
        timeout: 2000,
        adUnits: adUnits
      };

      await runAuction(requestObj);
      await completeAuction([adResponse]);
      pbjs.setTargetingForGPTAsync();

      sinon.assert.called(spec.onSetTargeting);
    });

    describe('returns a promise that resolves', () => {
      function delayHook(next, ...args) {
        setTimeout(() => next(...args))
      }

      beforeEach(() => {
        // make sure the return value works correctly when hooks give up priority
        pbjsModule.requestBids.before(delayHook)
      });

      afterEach(() => {
        pbjsModule.requestBids.getHooks({hook: delayHook}).remove();
      });

      Object.entries({
        'immediately, without bidsBackHandler': (req) => pbjs.requestBids(req),
        'after bidsBackHandler': (() => {
          const bidsBackHandler = sinon.stub();
          return function (req) {
            return pbjs.requestBids({...req, bidsBackHandler}).then(({bids, timedOut, auctionId}) => {
              sinon.assert.calledWith(bidsBackHandler, bids, timedOut, auctionId);
              return {bids, timedOut, auctionId};
            })
          }
        })(),
        'after a bidsBackHandler that throws': (req) => pbjs.requestBids({...req, bidsBackHandler: () => { throw new Error() }})
      }).forEach(([t, requestBids]) => {
        describe(t, () => {
          it('with no args, when no adUnits are defined', () => {
            return requestBids({}).then((res) => {
              expect(res).to.eql({
                bids: undefined,
                timedOut: undefined,
                auctionId: undefined
              });
            });
          });

          it('on timeout', (done) => {
            requestBids({
              auctionId: 'mock-auctionId',
              adUnits,
              timeout: 10
            }).then(({timedOut, bids, auctionId}) => {
              expect(timedOut).to.be.true;
              expect(bids).to.eql({});
              expect(auctionId).to.eql('mock-auctionId');
              done();
            });
            clock.tick(12);
          });

          it('with auction result', (done) => {
            const bid = {
              bidder: 'mock-bidder',
              adUnitCode: adUnits[0].code,
              transactionId: adUnits[0].transactionId,
              adUnitId: adUnits[0].adUnitId,
            }
            requestBids({
              adUnits,
            }).then(({bids}) => {
              sinon.assert.match(bids[bid.adUnitCode].bids[0], bid)
              done();
            });
            // `completeAuction` won't work until we're out of `delayHook`
            // and the mocked auction has been set up;
            // setTimeout here takes us after the setTimeout in `delayHook`
            setTimeout(() => completeAuction([bid]));
          })
        })
      })
    })

    it('should transfer ttlBuffer to adUnit.ttlBuffer', async () => {
      await runAuction({
        ttlBuffer: 123,
        adUnits: [adUnits[0], {...adUnits[0], ttlBuffer: 0}]
      });
      sinon.assert.calledWithMatch(auctionModule.newAuction, {
        adUnits: sinon.match((units) => units[0].ttlBuffer === 123 && units[1].ttlBuffer === 0)
      })
    });
  })

  describe('requestBids', function () {
    let sandbox;
    beforeEach(function () {
      sandbox = sinon.createSandbox();
    });
    afterEach(function () {
      sandbox.restore();
    });
    describe('bidRequests is empty', function () {
      it('should log warning message and execute callback if bidRequests is empty', async function () {
        const bidsBackHandler = function bidsBackHandlerCallback() {
        };
        const spyExecuteCallback = sinon.spy(bidsBackHandler);
        const logWarnSpy = sandbox.spy(utils, 'logWarn');

        await pbjs.requestBids({
          adUnits: [
            {
              code: 'test1',
              mediaTypes: {banner: {sizes: []}},
              bids: [],
            }, {
              code: 'test2',
              mediaTypes: {banner: {sizes: []}},
              bids: [],
            }
          ],
          bidsBackHandler: spyExecuteCallback
        });

        assert.ok(logWarnSpy.calledWith('No valid bid requests returned for auction'), 'expected warning message was logged');
        assert.ok(spyExecuteCallback.calledOnce, 'callback executed when bidRequests is empty');
      });
    });

    describe('starts auction', () => {
      let startAuctionStub, auctionStarted, __started;
      function saHook(fn, ...args) {
        __started();
        return startAuctionStub(...args);
      }
      beforeEach(() => {
        auctionStarted = new Promise(resolve => { __started = resolve });
        startAuctionStub = sinon.stub();
        pbjsModule.startAuction.before(saHook);
        configObj.resetConfig();
      });
      afterEach(() => {
        pbjsModule.startAuction.getHooks({hook: saHook}).remove();
      })
      after(() => {
        configObj.resetConfig();
      });

      async function runAuction(request = {}) {
        pbjs.requestBids(request);
        await auctionStarted;
      }

      it('with normalized FPD', async () => {
        configObj.setBidderConfig({
          bidders: ['test'],
          config: {
            ortb2: {
              source: {
                schain: 'foo'
              }
            }
          }
        });
        configObj.setConfig({
          ortb2: {
            source: {
              schain: 'bar'
            }
          }
        });
        await runAuction();
        sinon.assert.calledWith(startAuctionStub, sinon.match({
          ortb2Fragments: {
            global: {
              source: {
                ext: {
                  schain: 'bar'
                }
              }
            },
            bidder: {
              test: {
                source: {
                  ext: {
                    schain: 'foo'
                  }
                }
              }
            }
          }
        }));
      })
      describe('with FPD', () => {
        let globalFPD, auctionFPD, mergedFPD;
        beforeEach(() => {
          globalFPD = {
            'k1': 'v1',
            'k2': {
              'k3': 'v3',
              'k4': 'v4'
            }
          };
          auctionFPD = {
            'k5': 'v5',
            'k2': {
              'k3': 'override',
              'k7': 'v7'
            }
          };
          mergedFPD = {
            'k1': 'v1',
            'k5': 'v5',
            'k2': {
              'k3': 'override',
              'k4': 'v4',
              'k7': 'v7'
            }
          };
        });

        it('merged from setConfig and requestBids', async () => {
          configObj.setConfig({ortb2: globalFPD});
          await runAuction({ortb2: auctionFPD});
          sinon.assert.calledWith(startAuctionStub, sinon.match({
            ortb2Fragments: {global: mergedFPD}
          }));
        });

        it('that cannot alter global config', () => {
          configObj.setConfig({ortb2: {value: 'old'}});
          startAuctionStub.callsFake(({ortb2Fragments}) => {
            ortb2Fragments.global.value = 'new'
          });
          pbjs.requestBids({ortb2: auctionFPD});
          expect(configObj.getAnyConfig('ortb2').value).to.eql('old');
        });

        it('that cannot alter bidder config', () => {
          configObj.setBidderConfig({
            bidders: ['mockBidder'],
            config: {
              ortb2: {value: 'old'}
            }
          })
          startAuctionStub.callsFake(({ortb2Fragments}) => {
            ortb2Fragments.bidder.mockBidder.value = 'new';
          })
          pbjs.requestBids({ortb2: auctionFPD});
          expect(configObj.getBidderConfig().mockBidder.ortb2.value).to.eql('old');
        })

        it('enriched through enrichFPD', async () => {
          function enrich(next, fpd) {
            next.bail(fpd.then(ortb2 => {
              ortb2.enrich = true;
              return ortb2;
            }))
          }

          enrichFPD.before(enrich);
          try {
            configObj.setConfig({ortb2: globalFPD});
            await runAuction({ortb2: auctionFPD});
            sinon.assert.calledWith(startAuctionStub, sinon.match({
              ortb2Fragments: {global: {...mergedFPD, enrich: true}}
            }));
          } finally {
            enrichFPD.getHooks({hook: enrich}).remove();
          }
        })
      });

      it('filtering adUnits by adUnitCodes', async () => {
        await runAuction({
          adUnits: [{code: 'one'}, {code: 'two'}],
          adUnitCodes: 'two'
        });
        sinon.assert.calledWith(startAuctionStub, sinon.match({
          adUnits: [{code: 'two'}],
          adUnitCodes: ['two']
        }));
      });

      it('does not repeat ad unit codes on twin ad units', async () => {
        await runAuction({
          adUnits: [{code: 'au1'}, {code: 'au2'}, {code: 'au1'}, {code: 'au2'}],
        });
        sinon.assert.calledWith(startAuctionStub, sinon.match({
          adUnitCodes: ['au1', 'au2']
        }));
      });

      it('filters out repeated ad unit codes from input', async () => {
        await runAuction({adUnitCodes: ['au1', 'au1', 'au2']});
        sinon.assert.calledWith(startAuctionStub, sinon.match({
          adUnitCodes: ['au1', 'au2']
        }));
      });

      it('passing bidder-specific FPD as ortb2Fragments.bidder', async () => {
        configObj.setBidderConfig({
          bidders: ['bidderA', 'bidderC'],
          config: {
            ortb2: {
              k1: 'v1'
            }
          }
        });
        configObj.setBidderConfig({
          bidders: ['bidderB'],
          config: {
            ortb2: {
              k2: 'v2'
            }
          }
        });
        await runAuction({})
        sinon.assert.calledWith(startAuctionStub, sinon.match({
          ortb2Fragments: {
            bidder: {
              bidderA: {
                k1: 'v1'
              },
              bidderB: {
                k2: 'v2'
              },
              bidderC: {
                k1: 'v1'
              }
            }
          }
        }));
      });
    });
  });

  describe('startAuction', () => {
    let sandbox, newAuctionStub, auctionStarted;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      auctionStarted = new Promise(resolve => {
        newAuctionStub = sandbox.stub(auctionManager, 'createAuction').callsFake(() => {
          resolve();
          return {
            getAuctionId: () => 'mockAuctionId',
            callBids: sinon.stub()
          }
        });
      });
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('passes ortb2 fragments to createAuction', async () => {
      const ortb2Fragments = {global: {}, bidder: {}};
      pbjsModule.startAuction({
        adUnits: [{
          code: 'au',
          mediaTypes: {banner: {sizes: [[300, 250]]}},
          bids: [{bidder: 'bd'}]
        }],
        adUnitCodes: ['au'],
        ortb2Fragments
      });
      await auctionStarted;
      sinon.assert.calledWith(newAuctionStub, sinon.match({
        ortb2Fragments: sinon.match.same(ortb2Fragments)
      }));
    });
  })

  describe('requestBids', function () {
    var adUnitsBackup;
    var auctionManagerStub;
    let logMessageSpy;
    let logInfoSpy;
    let logErrorSpy;

    const spec = {
      code: 'sampleBidder',
      isBidRequestValid: () => {},
      buildRequests: () => {},
      interpretResponse: () => {},
      getUserSyncs: () => {}
    };
    registerBidder(spec);

    describe('part 1', function () {
      let auctionArgs, auctionStarted;

      beforeEach(function () {
        adUnitsBackup = auction.getAdUnits
        auctionStarted = new Promise(resolve => {
          auctionManagerStub = sinon.stub(auctionManager, 'createAuction').callsFake(function() {
            auctionArgs = arguments[0];
            resolve();
            return auction;
          });
        })
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

      function runAuction(request = {}) {
        pbjs.requestBids(request);
        return auctionStarted;
      }

      it('should log message when adUnits not configured', async function () {
        pbjs.adUnits = [];
        try {
          await pbjs.requestBids({});
        } catch (e) {
        }
        assert.ok(logMessageSpy.calledWith('No adUnits configured. No bids requested.'), 'expected message was logged');
      });

      it('should always attach new transactionIds to adUnits passed to requestBids', async function () {
        await runAuction({
          adUnits: [
            {
              code: 'test1',
              transactionId: 'd0676a3c-ff32-45a5-af65-8175a8e7ddca',
              mediaTypes: {banner: {sizes: []}},
              bids: []
            }, {
              code: 'test2',
              mediaTypes: {banner: {sizes: []}},
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

      it('should use the same transactionID for ad units with the same code', async () => {
        await runAuction({
          adUnits: [
            {
              code: 'twin',
              mediaTypes: {banner: {sizes: []}},
              bids: []
            }, {
              code: 'twin',
              mediaTypes: {banner: {sizes: []}},
              bids: []
            }
          ]
        });
        const tid = auctionArgs.adUnits[0].transactionId;
        expect(tid).to.exist;
        expect(auctionArgs.adUnits[1].transactionId).to.eql(tid);
      });

      it('should re-use pub-provided transaction ID for ad units with the same code', async () => {
        await runAuction({
          adUnits: [
            {
              code: 'twin',
              mediaTypes: {banner: {sizes: []}},
              bids: [],
            }, {
              code: 'twin',
              mediaTypes: {banner: {sizes: []}},
              bids: [],
              ortb2Imp: {
                ext: {
                  tid: 'pub-tid'
                }
              }
            }
          ]
        });
        expect(auctionArgs.adUnits.map(au => au.transactionId)).to.eql(['pub-tid', 'pub-tid']);
      });

      it('should use pub-provided TIDs when they conflict for ad units with the same code', async () => {
        await runAuction({
          adUnits: [
            {
              code: 'twin',
              mediaTypes: {banner: {sizes: []}},
              bids: [],
              ortb2Imp: {
                ext: {
                  tid: 't1'
                }
              }
            }, {
              code: 'twin',
              mediaTypes: {banner: {sizes: []}},
              bids: [],
              ortb2Imp: {
                ext: {
                  tid: 't2'
                }
              }
            }
          ]
        });
        expect(auctionArgs.adUnits.map(au => au.transactionId)).to.eql(['t1', 't2']);
      });

      it('should generate unique adUnitId', async () => {
        await runAuction({
          adUnits: [
            {
              code: 'single',
              mediaTypes: {banner: {sizes: []}},
              bids: []
            }, {
              code: 'twin',
              mediaTypes: {banner: {sizes: []}},
              bids: []
            },
            {
              code: 'twin',
              mediaTypes: {banner: {sizes: []}},
              bids: []
            }
          ]
        });

        const ids = new Set();
        auctionArgs.adUnits.forEach(au => {
          expect(au.adUnitId).to.exist;
          ids.add(au.adUnitId);
        });
        expect(ids.size).to.eql(3);
      });

      describe('transactionId', () => {
        let adUnit;
        beforeEach(() => {
          adUnit = {
            code: 'adUnit',
            mediaTypes: {
              banner: {
                sizes: [300, 250]
              }
            },
            bids: [
              {
                bidder: 'mock-bidder',
              }
            ]
          };
        });
        it('should be set to ortb2Imp.ext.tid, if specified', async () => {
          await runAuction({
            adUnits: [
              {...adUnit, ortb2Imp: {ext: {tid: 'custom-tid'}}}
            ]
          });
          sinon.assert.match(auctionArgs.adUnits[0], {
            transactionId: 'custom-tid',
            ortb2Imp: {
              ext: {
                tid: 'custom-tid'
              }
            }
          })
        });
        it('should NOT be copied to ortb2Imp.ext.tid, if not specified', async () => {
          await runAuction({
            adUnits: [
              adUnit
            ]
          });
          const tid = auctionArgs.adUnits[0].transactionId;
          expect(tid).to.exist;
          expect(auctionArgs.adUnits[0].ortb2Imp?.ext?.tid).to.not.exist;
        });
      });

      it('should NOT set ortb2.ext.tid same as transactionId in adUnits', async function () {
        await runAuction({
          adUnits: [
            {
              code: 'test1',
              mediaTypes: {banner: {sizes: []}},
              bids: []
            }, {
              code: 'test2',
              mediaTypes: {banner: {sizes: []}},
              bids: []
            }
          ]
        });

        expect(auctionArgs.adUnits[0]).to.have.property('transactionId');
        expect(auctionArgs.adUnits[0].ortb2Imp?.ext?.tid).to.not.exist;
        expect(auctionArgs.adUnits[1]).to.have.property('transactionId');
        expect(auctionArgs.adUnits[0].ortb2Imp?.ext?.tid).to.not.exist;
      });

      it('should notify targeting of the latest auction for each adUnit', async function () {
        const latestStub = sinon.stub(targeting, 'setLatestAuctionForAdUnit');
        const getAuctionStub = sinon.stub(auction, 'getAuctionId').returns(2);

        await runAuction({
          adUnits: [
            {
              code: 'test1',
              mediaTypes: {banner: {sizes: []}},
              bids: []
            }, {
              code: 'test2',
              mediaTypes: {banner: {sizes: []}},
              bids: []
            }
          ]
        });

        expect(latestStub.firstCall.calledWith('test1', 2)).to.equal(true);
        expect(latestStub.secondCall.calledWith('test2', 2)).to.equal(true);

        latestStub.restore();
        getAuctionStub.restore();
      });

      it('should execute callback immediately if adUnits is empty', async function () {
        var bidsBackHandler = function bidsBackHandlerCallback() {
        };
        var spyExecuteCallback = sinon.spy(bidsBackHandler);

        pbjs.adUnits = [];
        await pbjs.requestBids({
          bidsBackHandler: spyExecuteCallback
        });

        assert.ok(spyExecuteCallback.calledOnce, 'callback executed immediately when adUnits is' +
          ' empty');
      });

      it('should not propagate exceptions from bidsBackHandler', function () {
        pbjs.adUnits = [];

        var requestObj = {
          bidsBackHandler: function bidsBackHandlerCallback() {
            var test;
            return test.test;
          }
        };

        expect(() => {
          pbjs.requestBids(requestObj);
        }).not.to.throw();
      });

      describe('checkAdUnitSetup', function() {
        describe('positive tests for validating adUnits', function() {
          describe('should maintain adUnit structure and adUnit.sizes is replaced', () => {
            it('full ad unit', async () => {
              const fullAdUnit = [{
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
              await runAuction({
                adUnits: fullAdUnit
              });
              expect(auctionArgs.adUnits[0].sizes).to.deep.equal(
                FEATURES.VIDEO ? [[640, 480]] : [[300, 250]]
              );
              expect(auctionArgs.adUnits[0].mediaTypes.video.playerSize).to.deep.equal([[640, 480]]);
              expect(auctionArgs.adUnits[0].mediaTypes.native.image.sizes).to.deep.equal([150, 150]);
              expect(auctionArgs.adUnits[0].mediaTypes.native.icon.sizes).to.deep.equal([75, 75]);
              expect(auctionArgs.adUnits[0].mediaTypes.native.image.aspect_ratios).to.deep.equal([140, 140]);
            })
            it('no optional field', async () => {
              const noOptnlFieldAdUnit = [{
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
              await runAuction({
                adUnits: noOptnlFieldAdUnit
              });
              expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[300, 250]]);
              expect(auctionArgs.adUnits[0].mediaTypes.video).to.exist;
            })
            if (FEATURES.VIDEO) {
              it('mixed ad unit', async () => {
                const mixedAdUnit = [{
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
                await runAuction({
                  adUnits: mixedAdUnit
                });
                expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[400, 350]]);
                expect(auctionArgs.adUnits[0].mediaTypes.video).to.exist;
              });
              it('alternative video size', async () => {
                const altVideoPlayerSize = [{
                  code: 'test4',
                  bids: [],
                  sizes: [[600, 600]],
                  mediaTypes: {
                    video: {
                      playerSize: [640, 480]
                    }
                  }
                }];
                await runAuction({
                  adUnits: altVideoPlayerSize
                });
                expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[640, 480]]);
                expect(auctionArgs.adUnits[0].mediaTypes.video.playerSize).to.deep.equal([[640, 480]]);
                expect(auctionArgs.adUnits[0].mediaTypes.video).to.exist;
              })
            }
          })

          it('should normalize adUnit.sizes and adUnit.mediaTypes.banner.sizes', async function () {
            const normalizeAdUnit = [{
              code: 'test5',
              bids: [],
              sizes: [300, 250],
              mediaTypes: {
                banner: {
                  sizes: [300, 250]
                }
              }
            }];
            await runAuction({
              adUnits: normalizeAdUnit
            });
            expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[300, 250]]);
            expect(auctionArgs.adUnits[0].mediaTypes.banner.sizes).to.deep.equal([[300, 250]]);
          });

          it('should filter mediaType pos value if not integer', async function () {
            const adUnit = [{
              code: 'test5',
              bids: [],
              sizes: [300, 250],
              mediaTypes: {
                banner: {
                  sizes: [300, 250],
                  pos: 'foo'
                }
              }
            }];
            await runAuction({
              adUnits: adUnit
            });
            expect(auctionArgs.adUnits[0].mediaTypes.banner.pos).to.be.undefined;
          });

          it('should pass mediaType pos value if integer', async function () {
            const adUnit = [{
              code: 'test5',
              bids: [],
              sizes: [300, 250],
              mediaTypes: {
                banner: {
                  sizes: [300, 250],
                  pos: 2
                }
              }
            }, {
              code: 'test6',
              bids: [],
              sizes: [300, 250],
              mediaTypes: {
                banner: {
                  sizes: [300, 250],
                  pos: 0
                }
              }
            }];
            await runAuction({
              adUnits: adUnit
            });
            expect(auctionArgs.adUnits[0].mediaTypes.banner.pos).to.equal(2);
            expect(auctionArgs.adUnits[1].mediaTypes.banner.pos).to.equal(0);
          });

          it(`should allow no bids if 'ortb2Imp' is specified`, async () => {
            const adUnit = {
              code: 'test',
              mediaTypes: {
                banner: {
                  sizes: [[300, 250]]
                }
              },
              ortb2Imp: {}
            };
            await runAuction({
              adUnits: [adUnit]
            });
            sinon.assert.match(auctionArgs.adUnits[0], adUnit);
          });

          describe('banner.format', () => {
            let au;
            beforeEach(() => {
              au = {
                code: 'test',
                bids: [],
                mediaTypes: {
                  banner: {}
                }
              };
            });
            const EXPDIR = ['ortb2Imp.banner.expdir', 'mediaTypes.banner.expdir'];
            EXPDIR.forEach(prop => {
              it(`should make ${prop} avaliable under both ${EXPDIR.join(' and ')}`, async () => {
                au.mediaTypes.banner.sizes = [1, 2];
                deepSetValue(au, prop, [1, 2]);
                await runAuction({
                  adUnits: [au]
                })
                EXPDIR.forEach(dest => {
                  expect(deepAccess(auctionArgs.adUnits[0], dest)).to.eql([1, 2]);
                });
              })
            });
            ['ortb2Imp.banner.format', 'mediaTypes.banner.format'].forEach(prop => {
              it(`should accept ${prop} instead of sizes`, async () => {
                deepSetValue(au, prop, [{w: 123, h: 321}, {w: 444, h: 555}]);
                await runAuction({
                  adUnits: [au]
                })
                expect(auctionArgs.adUnits[0].mediaTypes.banner.sizes).to.deep.equal([[123, 321], [444, 555]]);
              });

              it(`should make ${prop} available under both mediaTypes.banner and ortb2Imp.format`, async () => {
                const format = [{w: 123, h: 321}];
                deepSetValue(au, prop, format);
                await runAuction({
                  adUnits: [au]
                })
                expect(auctionArgs.adUnits[0].mediaTypes.banner.format).to.deep.equal(format);
                expect(auctionArgs.adUnits[0].ortb2Imp.banner.format).to.deep.equal(format);
              })

              it(`should transform wratio/hratio from ${prop} into placeholder sizes`, async () => {
                deepSetValue(au, prop, [{w: 123, h: 321}, {wratio: 2, hratio: 1}]);
                await runAuction({
                  adUnits: [au]
                })
                expect(auctionArgs.adUnits[0].mediaTypes.banner.sizes).to.deep.equal([[123, 321], [2, 1]]);
              });
              it(`should ignore ${prop} elements that specify both w/h and wratio/hratio`, async () => {
                deepSetValue(au, prop, [{w: 333, hratio: 2}, {w: 123, h: 321}]);
                await runAuction({
                  adUnits: [au]
                })
                expect(auctionArgs.adUnits[0].mediaTypes.banner.sizes).to.deep.equal([[123, 321]]);
              });

              it('should ignore incomplete formats', async () => {
                deepSetValue(au, prop, [{w: 123, h: 321}, {w: 123}, {wratio: 2}]);
                await runAuction({
                  adUnits: [au]
                })
                expect(auctionArgs.adUnits[0].mediaTypes.banner.sizes).to.deep.equal([[123, 321]]);
              })
            });
          })
        });

        describe('negative tests for validating adUnits', function() {
          describe('should throw error message and delete an object/property', () => {
            it('bad banner', async () => {
              const badBanner = [{
                code: 'testb1',
                bids: [],
                sizes: [[300, 250], [300, 600]],
                mediaTypes: {
                  banner: {
                    name: 'test'
                  }
                }
              }];
              await runAuction({
                adUnits: badBanner
              });
              expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[300, 250], [300, 600]]);
              expect(auctionArgs.adUnits[0].mediaTypes.banner).to.be.undefined;
              assert.ok(logErrorSpy.calledWith('Detected a mediaTypes.banner object without a proper sizes field.  Please ensure the sizes are listed like: [[300, 250], ...].  Removing invalid mediaTypes.banner object from request.'));
            });
            if (FEATURES.VIDEO) {
              it('bad video 1', async () => {
                const badVideo1 = [{
                  code: 'testb2',
                  bids: [],
                  sizes: [[600, 600]],
                  mediaTypes: {
                    video: {
                      playerSize: ['600x400']
                    }
                  }
                }];
                await runAuction({
                  adUnits: badVideo1
                });
                expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[600, 600]]);
                expect(auctionArgs.adUnits[0].mediaTypes.video.playerSize).to.be.undefined;
                expect(auctionArgs.adUnits[0].mediaTypes.video).to.exist;
                assert.ok(logErrorSpy.calledWith('Detected incorrect configuration of mediaTypes.video.playerSize.  Please specify only one set of dimensions in a format like: [[640, 480]]. Removing invalid mediaTypes.video.playerSize property from request.'));
              });
              it('bad video 2', async () => {
                const badVideo2 = [{
                  code: 'testb3',
                  bids: [],
                  sizes: [[600, 600]],
                  mediaTypes: {
                    video: {
                      playerSize: [['300', '200']]
                    }
                  }
                }];
                await runAuction({
                  adUnits: badVideo2
                });
                expect(auctionArgs.adUnits[0].sizes).to.deep.equal([[600, 600]]);
                expect(auctionArgs.adUnits[0].mediaTypes.video.playerSize).to.be.undefined;
                expect(auctionArgs.adUnits[0].mediaTypes.video).to.exist;
                assert.ok(logErrorSpy.calledWith('Detected incorrect configuration of mediaTypes.video.playerSize.  Please specify only one set of dimensions in a format like: [[640, 480]]. Removing invalid mediaTypes.video.playerSize property from request.'));
              })
            }
            if (FEATURES.NATIVE) {
              it('bad native img size', async () => {
                const badNativeImgSize = [{
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
                await runAuction({
                  adUnits: badNativeImgSize
                });
                expect(auctionArgs.adUnits[0].mediaTypes.native.image.sizes).to.be.undefined;
                expect(auctionArgs.adUnits[0].mediaTypes.native.image).to.exist;
                assert.ok(logErrorSpy.calledWith('Please use an array of sizes for native.image.sizes field.  Removing invalid mediaTypes.native.image.sizes property from request.'));
              });
              it('bad native aspect ratio', async () => {
                const badNativeImgAspRat = [{
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
                await runAuction({
                  adUnits: badNativeImgAspRat
                });
                expect(auctionArgs.adUnits[0].mediaTypes.native.image.aspect_ratios).to.be.undefined;
                expect(auctionArgs.adUnits[0].mediaTypes.native.image).to.exist;
                assert.ok(logErrorSpy.calledWith('Please use an array of sizes for native.image.aspect_ratios field.  Removing invalid mediaTypes.native.image.aspect_ratios property from request.'));
              });
              it('bad native icon', async () => {
                const badNativeIcon = [{
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
                await runAuction({
                  adUnits: badNativeIcon
                });
                expect(auctionArgs.adUnits[0].mediaTypes.native.icon.sizes).to.be.undefined;
                expect(auctionArgs.adUnits[0].mediaTypes.native.icon).to.exist;
                assert.ok(logErrorSpy.calledWith('Please use an array of sizes for native.icon.sizes field.  Removing invalid mediaTypes.native.icon.sizes property from request.'));
              })
            }
          })

          if (FEATURES.NATIVE) {
            Object.entries({
              missing: {},
              negative: {id: -1},
              'not an integer': {id: 1.23},
              NaN: {id: 'garbage'}
            }).forEach(([t, props]) => {
              it(`should reject native ortb when asset ID is ${t}`, async () => {
                const adUnit = {
                  code: 'au',
                  mediaTypes: {
                    native: {
                      ortb: {
                        assets: [props]
                      }
                    }
                  },
                  bids: [{bidder: 'appnexus'}]
                };
                await runAuction({
                  adUnits: [adUnit]
                });
                expect(auctionArgs.adUnits[0].bids.length).to.equal(0);
              });
            });

            ['types'].forEach(key => {
              it(`should reject native that includes both ortb and ${key}`, async () => {
                const adUnit = {
                  code: 'au',
                  mediaTypes: {
                    native: {
                      ortb: {},
                      [key]: {}
                    }
                  },
                  bids: [{bidder: 'appnexus'}]
                };
                await runAuction({
                  adUnits: [adUnit]
                });
                expect(auctionArgs.adUnits[0].bids.length).to.equal(0);
              })
            });
          }

          it('should throw error message and remove adUnit if adUnit.bids is not defined correctly', async function () {
            const adUnits = [{
              code: 'ad-unit-1',
              mediaTypes: {
                banner: {
                  sizes: [300, 400]
                }
              },
              bids: [{code: 'appnexus', params: 1234}]
            }, {
              code: 'bad-ad-unit-2',
              mediaTypes: {
                banner: {
                  sizes: [300, 400]
                }
              }
            }];

            await runAuction({
              adUnits: adUnits
            });
            expect(auctionArgs.adUnits.length).to.equal(1);
            expect(auctionArgs.adUnits[1]).to.not.exist;
            assert.ok(logErrorSpy.calledWith("adUnit.code 'bad-ad-unit-2' has no 'adUnit.bids' and no 'adUnit.ortb2Imp'. Removing adUnit from auction"));
          });
        });
      });
    });

    describe('multiformat requests', function () {
      if (!FEATURES.NATIVE) {
        return;
      }
      let adUnits, auctionStarted;

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
        auctionStarted = new Promise(resolve => {
          sinon.stub(adapterManager, 'callBids').callsFake(function() {
            resolve();
            return adapterManager.callBids.wrappedMethod.apply(this, arguments);
          });
        })
      })

      afterEach(function () {
        adapterManager.callBids.restore();
      });

      it('bidders that support one of the declared formats are allowed to participate', async function () {
        pbjs.requestBids({adUnits});
        await auctionStarted;
        sinon.assert.calledOnce(adapterManager.callBids);

        const spyArgs = adapterManager.callBids.getCall(0);
        const biddersCalled = spyArgs.args[0][0].bids;

        // appnexus and sampleBidder both support banner
        expect(biddersCalled.length).to.equal(2);
      });

      it('bidders that do not support one of the declared formats are dropped', async function () {
        delete adUnits[0].mediaTypes.banner;

        pbjs.requestBids({adUnits});
        await auctionStarted;
        sinon.assert.calledOnce(adapterManager.callBids);

        const spyArgs = adapterManager.callBids.getCall(0);
        const biddersCalled = spyArgs.args[0][0].bids;
        // only appnexus supports native
        expect(biddersCalled.length).to.equal(1);
      });
    });

    describe('part 2', function () {
      if (!FEATURES.NATIVE) {
        return;
      }
      let spyCallBids;
      let adUnits, adUnitCodes;

      beforeEach(function () {
        adUnitCodes = ['adUnit-code'];
        spyCallBids = sinon.spy(adapterManager, 'callBids');
      })

      afterEach(function () {
        adapterManager.callBids.restore();
      })

      function runAuction(request = {}) {
        const auctionStarted = new Promise(resolve => {
          sandbox.stub(auctionModule, 'newAuction').callsFake((...args) => {
            resolve();
            return auctionModule.newAuction.wrappedMethod(...args);
          });
        })
        pbjs.requestBids(request);
        return auctionStarted;
      }

      it('should callBids if a native adUnit has all native bidders', async function () {
        adUnits = [{
          code: 'adUnit-code',
          mediaTypes: { native: {} },
          bids: [
            {bidder: 'appnexus', params: {placementId: '10433394'}}
          ]
        }];
        await runAuction({adUnits});
        sinon.assert.calledOnce(adapterManager.callBids);
      });

      it('should call callBids function on adapterManager', async function () {
        adUnits = [{
          code: 'adUnit-code',
          mediaTypes: {banner: {sizes: [[300, 250], [300, 600]]}},
          bids: [
            {bidder: 'appnexus', params: {placementId: '10433394'}}
          ]
        }];
        await runAuction({adUnits});
        assert.ok(spyCallBids.called, 'called adapterManager.callBids');
      });

      it('splits native type to individual native assets', async function () {
        adUnits = [{
          code: 'adUnit-code',
          mediaTypes: {native: {type: 'image'}},
          bids: [
            {bidder: 'appnexus', params: {placementId: 'id'}}
          ]
        }];
        await runAuction({adUnits});
        const spyArgs = adapterManager.callBids.getCall(0);
        const nativeRequest = spyArgs.args[1][0].bids[0].nativeParams;
        expect(nativeRequest.ortb.assets).to.deep.equal([
          {
            required: 1,
            id: 1,
            img: {
              type: 3,
              wmin: 100,
              hmin: 100,
            }
          },
          {
            required: 1,
            id: 2,
            title: {
              len: 140,
            }
          },
          {
            required: 1,
            id: 3,
            data: {
              type: 1,
            }
          },
          {
            required: 0,
            id: 4,
            data: {
              type: 2,
            }
          },
          {
            required: 0,
            id: 5,
            img: {
              type: 1,
              wmin: 20,
              hmin: 20,
            }
          },
        ]);
        resetAuction();
      });
    });

    describe('part-3', function () {
      const auctionManagerInstance = newAuctionManager();
      let auctionManagerStub;
      const adUnits1 = getAdUnits().filter((adUnit) => {
        return adUnit.code === '/19968336/header-bid-tag1';
      });
      const adUnitCodes1 = getAdUnits().map(unit => unit.code);
      const auction1 = auctionManagerInstance.createAuction({adUnits: adUnits1, adUnitCodes: adUnitCodes1});

      const adUnits2 = getAdUnits().filter((adUnit) => {
        return adUnit.code === '/19968336/header-bid-tag-0';
      });
      const adUnitCodes2 = getAdUnits().map(unit => unit.code);
      const auction2 = auctionManagerInstance.createAuction({adUnits: adUnits2, adUnitCodes: adUnitCodes2});
      let spyCallBids;

      auction1.getBidRequests = function() {
        return getBidRequests().map((req) => {
          req.bids = req.bids.filter((bid) => {
            return bid.adUnitCode === '/19968336/header-bid-tag1';
          });
          return (req.bids.length > 0) ? req : undefined;
        }).filter((item) => {
          return item !== undefined;
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
          return item !== undefined;
        });
      };
      auction2.getBidsReceived = function() {
        return getBidResponses().filter((bid) => {
          return bid.adUnitCode === '/19968336/header-bid-tag-0';
        });
      };

      let auctionsStarted;

      beforeEach(function() {
        spyCallBids = sinon.spy(adapterManager, 'callBids');
        auctionManagerStub = sinon.stub(auctionManager, 'createAuction');
        auctionsStarted = Promise.all(
          [auction1, auction2].map((au, i) => new Promise((resolve) => {
            auctionManagerStub.onCall(i).callsFake(() => {
              resolve();
              return au;
            });
          }))
        );
      });

      afterEach(function() {
        auctionManager.createAuction.restore();
        adapterManager.callBids.restore();
      });

      it('should not queue bid requests when a previous bid request is in process', async function () {
        var requestObj1 = {
          bidsBackHandler: function bidsBackHandlerCallback() {
          },
          timeout: 2000,
          adUnits: auction1.getAdUnits()
        };

        var requestObj2 = {
          bidsBackHandler: function bidsBackHandlerCallback() {
          },
          timeout: 2000,
          adUnits: auction2.getAdUnits()
        };

        assert.equal(auctionManager.getBidsReceived().length, 8, '_bidsReceived contains 8 bids');
        pbjs.setConfig({ targetingControls: {allBidsCustomTargeting: true }});
        pbjs.requestBids(requestObj1);
        pbjs.requestBids(requestObj2);
        await auctionsStarted;

        assert.ok(spyCallBids.calledTwice, 'When two requests for bids are made both should be' +
          ' callBids immediately');

        const result = targeting.getAllTargeting(['/19968336/header-bid-tag-0', '/19968336/header-bid-tag1']); // pbjs.getAdserverTargeting();
        const expected = {
          '/19968336/header-bid-tag-0': {
            'foobar': '300x250,300x600,0x0',
            [TARGETING_KEYS.SIZE]: '300x250',
            [TARGETING_KEYS.PRICE_BUCKET]: '10.00',
            [TARGETING_KEYS.AD_ID]: '233bcbee889d46d',
            [TARGETING_KEYS.BIDDER]: 'appnexus'
          },
          '/19968336/header-bid-tag1': {
            [TARGETING_KEYS.BIDDER]: 'appnexus',
            [TARGETING_KEYS.AD_ID]: '24bd938435ec3fc',
            [TARGETING_KEYS.PRICE_BUCKET]: '10.00',
            [TARGETING_KEYS.SIZE]: '728x90',
            'foobar': '728x90'
          }
        }
        sinon.assert.match(result, expected)
      });
    });
  });

  describe('onEvent', function () {
    it('should log an error when handler is not a function', function () {
      var spyLogError = sinon.spy(utils, 'logError');
      var event = 'testEvent';
      pbjs.onEvent(event);
      assert.ok(spyLogError.calledWith('The event handler provided is not a function and was not set on event "' + event + '".'),
        'expected error was logged');
      utils.logError.restore();
    });

    it('should log an error when id provided is not valid for event', function () {
      var spyLogError = sinon.spy(utils, 'logError');
      var event = 'bidWon';
      pbjs.onEvent(event, Function, 'testId');
      assert.ok(spyLogError.calledWith('The id provided is not valid for event "' + event + '" and no handler was set.'),
        'expected error was logged');
      utils.logError.restore();
    });

    it('should call events.on with valid parameters', function () {
      var spyEventsOn = sinon.spy(events, 'on');
      pbjs.onEvent('bidWon', Function);
      assert.ok(spyEventsOn.calledWith('bidWon', Function));
      events.on.restore();
    });

    it('should emit event BID_ACCEPTED when invoked', function () {
      var callback = sinon.spy();
      pbjs.onEvent('bidAccepted', callback);
      events.emit(EVENTS.BID_ACCEPTED);
      sinon.assert.calledOnce(callback);
    });

    describe('beforeRequestBids', function () {
      let bidRequestedHandler;
      let beforeRequestBidsHandler;
      const bidsBackHandler = function bidsBackHandler() {};
      let auctionStarted;

      let bidsBackSpy;
      let bidRequestedSpy;
      let beforeRequestBidsSpy;

      beforeEach(function () {
        resetAuction();
        bidsBackSpy = sinon.spy(bidsBackHandler);
        googletag.pubads().setSlots(createSlotArrayScenario2());
        auctionStarted = new Promise((resolve) => sandbox.stub(adapterManager, 'callBids').callsFake(function() {
          resolve()
          return adapterManager.callBids.wrappedMethod.apply(this, arguments);
        }));
      });

      afterEach(function () {
        bidsBackSpy.resetHistory();

        if (bidRequestedSpy) {
          pbjs.offEvent('bidRequested', bidRequestedSpy);
          bidRequestedSpy.resetHistory();
        }

        if (beforeRequestBidsSpy) {
          pbjs.offEvent('beforeRequestBids', beforeRequestBidsSpy);
          beforeRequestBidsSpy.resetHistory();
        }
      });

      it('should allow creation of a fpd.context.pbAdSlot property on adUnits from inside the event handler', async function () {
        // verify adUnits passed to handler then alter the adUnits
        beforeRequestBidsHandler = function beforeRequestBidsHandler(beforeRequestBidsAdUnits) {
          expect(beforeRequestBidsAdUnits).to.be.a('array');
          expect(beforeRequestBidsAdUnits).to.have.lengthOf(1);
          expect(beforeRequestBidsAdUnits[0]).to.be.a('object');
          // adUnit should not contain a context property yet
          expect(beforeRequestBidsAdUnits[0]).to.not.have.property('fpd')
          // alter the adUnit by adding the property for context.pbAdSlot
          beforeRequestBidsAdUnits[0].fpd = {
            context: {
              pbAdSlot: '/19968336/header-bid-tag-pbadslot-0'
            }
          };
        };
        beforeRequestBidsSpy = sinon.spy(beforeRequestBidsHandler);

        // use this handler to verify if the adUnits alterations were applied successfully by the beforeRequestBids handler
        bidRequestedHandler = function bidRequestedHandler(bidRequest) {
          expect(bidRequest).to.be.a('object');
          expect(bidRequest).to.have.property('bids');
          expect(bidRequest.bids).to.be.a('array');
          expect(bidRequest.bids).to.have.lengthOf(1);
          const bid = bidRequest['bids'][0];
          expect(bid).to.be.a('object');
          expect(bid).to.have.property('fpd');
          expect(bid.fpd).to.be.a('object');
          expect(bid.fpd).to.have.property('context');
          expect(bid.fpd.context).to.be.a('object');
          expect(bid.fpd.context).to.have.property('pbAdSlot');
          expect(bid.fpd.context.pbAdSlot).to.equal('/19968336/header-bid-tag-pbadslot-0');
        };
        bidRequestedSpy = sinon.spy(bidRequestedHandler);

        pbjs.onEvent('beforeRequestBids', beforeRequestBidsSpy);
        pbjs.onEvent('bidRequested', bidRequestedSpy);
        pbjs.requestBids({
          adUnits: [{
            code: '/19968336/header-bid-tag-0',
            mediaTypes: {
              banner: {
                sizes: [[750, 350]]
              }
            },
            bids: [{
              bidder: 'appnexus',
              params: {
                placementId: 13122370
              }
            }]
          }],
          bidsBackHandler: bidsBackSpy
        });

        await auctionStarted;

        sinon.assert.calledOnce(beforeRequestBidsSpy);
        sinon.assert.calledOnce(bidRequestedSpy);
      });

      it('should allow creation of a fpd.context.pbAdSlot property on adUnits from inside the event handler', async function () {
        // verify adUnits passed to handler then alter the adUnits
        beforeRequestBidsHandler = function beforeRequestBidsHandler(beforeRequestBidsAdUnits) {
          expect(beforeRequestBidsAdUnits).to.be.a('array');
          expect(beforeRequestBidsAdUnits).to.have.lengthOf(2);
          expect(beforeRequestBidsAdUnits[0]).to.be.a('object');
          expect(beforeRequestBidsAdUnits[1]).to.be.a('object');
          // adUnit should not contain a context property yet
          expect(beforeRequestBidsAdUnits[0]).to.not.have.property('fpd');
          expect(beforeRequestBidsAdUnits[1]).to.not.have.property('fpd');
          // alter the adUnit by adding the property for context.pbAdSlot
          beforeRequestBidsAdUnits[0].fpd = {
            context: {
              pbAdSlot: '/19968336/header-bid-tag-pbadslot-0'
            }
          };
          beforeRequestBidsAdUnits[1].fpd = {
            context: {
              pbAdSlot: '/19968336/header-bid-tag-pbadslot-1'
            }
          };
        };
        beforeRequestBidsSpy = sinon.spy(beforeRequestBidsHandler);

        // use this handler to verify if the adUnits alterations were applied successfully by the beforeRequestBids handler
        bidRequestedHandler = function bidRequestedHandler(bidRequest) {
          expect(bidRequest).to.be.a('object');
          expect(bidRequest).to.have.property('bids');
          expect(bidRequest.bids).to.be.a('array');
          expect(bidRequest.bids).to.have.lengthOf(2);
          const bid0 = bidRequest['bids'][0];
          expect(bid0).to.be.a('object');
          expect(bid0).to.have.property('fpd');
          expect(bid0.fpd).to.be.a('object');
          expect(bid0.fpd).to.have.property('context');
          expect(bid0.fpd.context).to.be.a('object');
          expect(bid0.fpd.context).to.have.property('pbAdSlot');
          expect(bid0.fpd.context.pbAdSlot).to.equal('/19968336/header-bid-tag-pbadslot-0');

          const bid1 = bidRequest['bids'][1];
          expect(bid1).to.be.a('object');
          expect(bid1).to.have.property('fpd');
          expect(bid1.fpd).to.be.a('object');
          expect(bid1.fpd).to.have.property('context');
          expect(bid1.fpd.context).to.be.a('object');
          expect(bid1.fpd.context).to.have.property('pbAdSlot');
          expect(bid1.fpd.context.pbAdSlot).to.equal('/19968336/header-bid-tag-pbadslot-1');
        };
        bidRequestedSpy = sinon.spy(bidRequestedHandler);

        pbjs.onEvent('beforeRequestBids', beforeRequestBidsSpy);
        pbjs.onEvent('bidRequested', bidRequestedSpy);
        pbjs.requestBids({
          adUnits: [{
            code: '/19968336/header-bid-tag-0',
            mediaTypes: {
              banner: {
                sizes: [[750, 350]]
              }
            },
            bids: [{
              bidder: 'appnexus',
              params: {
                placementId: 13122370
              }
            }]
          }, {
            code: '/19968336/header-bid-tag-1',
            mediaTypes: {
              banner: {
                sizes: [[750, 350]]
              }
            },
            bids: [{
              bidder: 'appnexus',
              params: {
                placementId: 14122380
              }
            }]
          }],
          bidsBackHandler: bidsBackSpy
        });
        await auctionStarted;

        sinon.assert.calledOnce(beforeRequestBidsSpy);
        sinon.assert.calledOnce(bidRequestedSpy);
      });

      it('should not create a context property on adUnits if not added by handler', async function () {
        // verify adUnits passed to handler then alter the adUnits
        beforeRequestBidsHandler = function beforeRequestBidsHandler(beforeRequestBidsAdUnits) {
          expect(beforeRequestBidsAdUnits).to.be.a('array');
          expect(beforeRequestBidsAdUnits).to.have.lengthOf(1);
          expect(beforeRequestBidsAdUnits[0]).to.be.a('object');
          // adUnit should not contain a context property yet
          expect(beforeRequestBidsAdUnits[0]).to.not.have.property('context')
        };
        beforeRequestBidsSpy = sinon.spy(beforeRequestBidsHandler);

        // use this handler to verify if the adUnits alterations were applied successfully by the beforeRequestBids handler
        bidRequestedHandler = function bidRequestedHandler(bidRequest) {
          expect(bidRequest).to.be.a('object');
          expect(bidRequest).to.have.property('bids');
          expect(bidRequest.bids).to.be.a('array');
          expect(bidRequest.bids).to.have.lengthOf(1);
          const bid = bidRequest['bids'][0];
          expect(bid).to.be.a('object');
          expect(bid).to.not.have.property('context');
        };
        bidRequestedSpy = sinon.spy(bidRequestedHandler);

        pbjs.onEvent('beforeRequestBids', beforeRequestBidsSpy);
        pbjs.onEvent('bidRequested', bidRequestedSpy);
        pbjs.requestBids({
          adUnits: [{
            code: '/19968336/header-bid-tag-0',
            mediaTypes: {
              banner: {
                sizes: [[750, 350]]
              }
            },
            bids: [{
              bidder: 'appnexus',
              params: {
                placementId: 13122370
              }
            }]
          }],
          bidsBackHandler: bidsBackSpy
        });
        await auctionStarted;

        sinon.assert.calledOnce(beforeRequestBidsSpy);
        sinon.assert.calledOnce(bidRequestedSpy);
      });
    });
  });

  describe('offEvent', function () {
    it('should return when id provided is not valid for event', function () {
      var spyEventsOff = sinon.spy(events, 'off');
      pbjs.offEvent('bidWon', Function, 'testId');
      assert.ok(spyEventsOff.notCalled);
      events.off.restore();
    });

    it('should call events.off with valid parameters', function () {
      var spyEventsOff = sinon.spy(events, 'off');
      pbjs.offEvent('bidWon', Function);
      assert.ok(spyEventsOff.calledWith('bidWon', Function));
      events.off.restore();
    });
  });

  describe('emit', function () {
    it('should be able to emit event without arguments', function () {
      var spyEventsEmit = sinon.spy(events, 'emit');
      events.emit(EVENTS.REQUEST_BIDS);
      assert.ok(spyEventsEmit.calledWith('requestBids'));
      events.emit.restore();
    });
  });

  describe('registerBidAdapter', function () {
    it('should register bidAdaptor with adapterManager', function () {
      var registerBidAdapterSpy = sinon.spy(adapterManager, 'registerBidAdapter');
      pbjs.registerBidAdapter(Function, 'biddercode');
      assert.ok(registerBidAdapterSpy.called, 'called adapterManager.registerBidAdapter');
      adapterManager.registerBidAdapter.restore();
    });

    it('should catch thrown errors', function () {
      var spyLogError = sinon.spy(utils, 'logError');
      var errorObject = { message: 'bidderAdaptor error' };
      var bidderAdaptor = sinon.stub().throws(errorObject);

      pbjs.registerBidAdapter(bidderAdaptor, 'biddercode');

      var errorMessage = 'Error registering bidder adapter : ' + errorObject.message;
      assert.ok(spyLogError.calledWith(errorMessage), 'expected error was caught');
      utils.logError.restore();
    });
  });

  describe('aliasBidder', function () {
    it('should call adapterManager.aliasBidder', function () {
      const aliasBidAdapterSpy = sinon.spy(adapterManager, 'aliasBidAdapter');
      const bidderCode = 'testcode';
      const alias = 'testalias';

      pbjs.aliasBidder(bidderCode, alias);
      assert.ok(aliasBidAdapterSpy.calledWith(bidderCode, alias), 'called adapterManager.aliasBidAdapterSpy');
      adapterManager.aliasBidAdapter();
    });

    it('should log error when not passed correct arguments', function () {
      const logErrorSpy = sinon.spy(utils, 'logError');
      const error = 'bidderCode and alias must be passed as arguments';

      pbjs.aliasBidder();
      assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
      utils.logError.restore();
    });
  });

  describe('aliasRegistry', function () {
    it('should return the same value as adapterManager.aliasRegistry by default', function () {
      const adapterManagerAliasRegistry = adapterManager.aliasRegistry;
      const pbjsAliasRegistry = pbjs.aliasRegistry;
      assert.equal(adapterManagerAliasRegistry, pbjsAliasRegistry);
    });

    it('should return undefined if the aliasRegistry config option is set to private', function () {
      configObj.setConfig({ aliasRegistry: 'private' });
      const pbjsAliasRegistry = pbjs.aliasRegistry;
      assert.equal(pbjsAliasRegistry, undefined);
    });
  });

  describe('setPriceGranularity', function () {
    it('should log error when not passed granularity', function () {
      const logErrorSpy = sinon.spy(utils, 'logError');
      const error = 'Prebid Error: no value passed to `setPriceGranularity()`';

      pbjs.setConfig({ priceGranularity: null });
      assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
      utils.logError.restore();
    });

    it('should log error when not passed a valid config object', function () {
      const logErrorSpy = sinon.spy(utils, 'logError');
      const error = 'Invalid custom price value passed to `setPriceGranularity()`';
      const badConfig = {
        'buckets': [{
          'max': 3,
          'increment': 0.01,
        },
        {
          'max': 18,
          // missing increment prop
          'cap': true
        }
        ]
      };

      pbjs.setConfig({ priceGranularity: badConfig });
      assert.ok(logErrorSpy.calledWith(error), 'expected error was logged');
      utils.logError.restore();
    });

    it('should set customPriceBucket with custom config buckets', function () {
      const customPriceBucket = configObj.getConfig('customPriceBucket');
      const goodConfig = {
        'buckets': [{
          'max': 3,
          'increment': 0.01,
          'cap': true
        }
        ]
      };
      configObj.setConfig({ priceGranularity: goodConfig });
      const priceGranularity = configObj.getConfig('priceGranularity');
      const newCustomPriceBucket = configObj.getConfig('customPriceBucket');
      expect(goodConfig).to.deep.equal(newCustomPriceBucket);
      expect(priceGranularity).to.equal(GRANULARITY_OPTIONS.CUSTOM);
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
      pbjs.adUnits = adUnits;
      pbjs.removeAdUnit('foobar');
      assert.deepEqual(pbjs.adUnits, adUnits);
      pbjs.removeAdUnit('adUnit1');
      assert.deepEqual(pbjs.adUnits, [adUnit2]);
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
      pbjs.adUnits = adUnits;
      pbjs.removeAdUnit();
      assert.deepEqual(pbjs.adUnits, []);
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
      pbjs.adUnits = adUnits;
      pbjs.removeAdUnit([adUnit1.code, adUnit2.code]);
      assert.deepEqual(pbjs.adUnits, [adUnit3]);
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
      pbjs._bidsReceived = [
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
            [TARGETING_KEYS.BIDDER]: 'appnexus',
            [TARGETING_KEYS.AD_ID]: '233bcbee889d46d',
            [TARGETING_KEYS.PRICE_BUCKET]: '10.00',
            [TARGETING_KEYS.SIZE]: '300x250',
            [TARGETING_KEYS.DEAL + '_appnexusDummyName']: '1234'
          }
        }
      ];

      var result = pbjs.getAdserverTargeting();
      Object.keys(result['/19968336/header-bid-tag-0']).forEach(value => {
        expect(value).to.have.length.of.at.most(20);
      });
    });
  });

  describe('getHighestUnusedBidResponseForAdUnitCode', () => {
    afterEach(() => {
      resetAuction();
    })

    it('returns null if there is no bid for the given adUnitCode', () => {
      const highestBid = pbjs.getHighestUnusedBidResponseForAdUnitCode('stallone');
      expect(highestBid).to.equal(null);
    })

    it('returns undefined if adUnitCode is provided', () => {
      const highestBid = pbjs.getHighestUnusedBidResponseForAdUnitCode();
      expect(highestBid).to.be.undefined;
    })

    it('should ignore bids that have already been used (\'rendered\')', () => {
      const _bidsReceived = getBidResponses().slice(0, 3);
      _bidsReceived[0].cpm = 11
      _bidsReceived[1].cpm = 13
      _bidsReceived[2].cpm = 12

      _bidsReceived.forEach((bid) => {
        bid.adUnitCode = '/19968336/header-bid-tag-0';
      });

      auction.getBidsReceived = function() { return _bidsReceived };
      const highestBid1 = pbjs.getHighestUnusedBidResponseForAdUnitCode('/19968336/header-bid-tag-0');
      expect(highestBid1).to.deep.equal(_bidsReceived[1])
      _bidsReceived[1].status = BID_STATUS.RENDERED
      const highestBid2 = pbjs.getHighestUnusedBidResponseForAdUnitCode('/19968336/header-bid-tag-0');
      expect(highestBid2).to.deep.equal(_bidsReceived[2])
    })

    it('should ignore expired bids', () => {
      const _bidsReceived = getBidResponses().slice(0, 3);
      _bidsReceived[0].cpm = 11
      _bidsReceived[1].cpm = 13
      _bidsReceived[2].cpm = 12

      _bidsReceived.forEach((bid) => {
        bid.adUnitCode = '/19968336/header-bid-tag-0';
      });

      auction.getBidsReceived = function() { return _bidsReceived };

      bidExpiryStub.restore();
      bidExpiryStub = sinon.stub(filters, 'isBidNotExpired').callsFake((bid) => bid.cpm !== 13);
      const highestBid = pbjs.getHighestUnusedBidResponseForAdUnitCode('/19968336/header-bid-tag-0');
      expect(highestBid).to.deep.equal(_bidsReceived[2])
    })
  });

  describe('getHighestCpmBids', () => {
    after(() => {
      resetAuction();
    });
    it('returns an array containing the highest bid object for the given adUnitCode', function () {
      const adUnitcode = '/19968336/header-bid-tag-0';
      targeting.setLatestAuctionForAdUnit(adUnitcode, auctionId)
      const highestCpmBids = pbjs.getHighestCpmBids(adUnitcode);
      expect(highestCpmBids.length).to.equal(1);
      const expectedBid = auctionManager.getBidsReceived()[1];
      expectedBid.latestTargetedAuctionId = auctionId;
      expect(highestCpmBids[0]).to.deep.equal(expectedBid);
    });

    it('returns an empty array when the given adUnit is not found', function () {
      const highestCpmBids = pbjs.getHighestCpmBids('/stallone');
      expect(highestCpmBids.length).to.equal(0);
    });

    it('returns an empty array when the given adUnit has no bids', function () {
      const _bidsReceived = getBidResponses()[0];
      _bidsReceived.cpm = 0;
      auction.getBidsReceived = function() { return _bidsReceived };

      const highestCpmBids = pbjs.getHighestCpmBids('/19968336/header-bid-tag-0');
      expect(highestCpmBids.length).to.equal(0);
    });

    it('should not return rendered bid', function() {
      const _bidsReceived = getBidResponses().slice(0, 3);
      _bidsReceived[0].cpm = 12;
      _bidsReceived[0].status = 'rendered';
      _bidsReceived[1].cpm = 9;
      _bidsReceived[2].cpm = 11;

      _bidsReceived.forEach((bid) => {
        bid.adUnitCode = '/19968336/header-bid-tag-0';
      });

      auction.getBidsReceived = function() { return _bidsReceived };

      const highestCpmBids = pbjs.getHighestCpmBids('/19968336/header-bid-tag-0');
      expect(highestCpmBids[0]).to.deep.equal(auctionManager.getBidsReceived()[2]);
    });
  });

  if (FEATURES.VIDEO) {
    describe('markWinningBidAsUsed', function () {
      const adUnitCode = '/19968336/header-bid-tag-0';
      let winningBid, markedBid;

      beforeEach(() => {
        const bidsReceived = pbjs.getBidResponsesForAdUnitCode(adUnitCode);
        auction.getBidsReceived = function() { return bidsReceived.bids };

        // mark the bid and verify the state has changed to RENDERED
        winningBid = targeting.getWinningBids(adUnitCode)[0];
        auction.getAuctionId = function() { return winningBid.auctionId };
        sandbox.stub(events, 'emit');
        markedBid = pbjs.getBidResponsesForAdUnitCode(adUnitCode).bids.find(
          bid => bid.adId === winningBid.adId);
      })

      afterEach(() => {
        resetAuction();
      })

      function checkBidRendered() {
        expect(markedBid.status).to.equal(BID_STATUS.RENDERED);
      }

      Object.entries({
        'events=true': {
          mark(options = {}) {
            pbjs.markWinningBidAsUsed(Object.assign({events: true}, options))
          },
          checkBidWon() {
            sinon.assert.calledWith(events.emit, EVENTS.BID_WON, markedBid);
          }
        },
        'events=false': {
          mark(options = {}) {
            pbjs.markWinningBidAsUsed(options)
          },
          checkBidWon() {
            sinon.assert.notCalled(events.emit)
          }
        }
      }).forEach(([t, {mark, checkBidWon}]) => {
        describe(`when ${t}`, () => {
          it('marks the bid object as used for the given adUnitCode/adId combination', function () {
            mark({ adUnitCode, adId: winningBid.adId });
            checkBidRendered();
            checkBidWon();
          });
          it('marks the winning bid object as used for the given adUnitCode', function () {
            mark({ adUnitCode });
            checkBidRendered();
            checkBidWon();
          });

          it('marks a bid object as used for the given adId', function () {
            mark({ adId: winningBid.adId });
            checkBidRendered();
            checkBidWon();
          });
        })
      })

      it('try and mark the bid object, but fail because we supplied the wrong adId', function () {
        pbjs.markWinningBidAsUsed({ adUnitCode, adId: 'miss' });
        const markedBid = pbjs.getBidResponsesForAdUnitCode(adUnitCode).bids.find(
          bid => bid.adId === winningBid.adId);

        expect(markedBid.status).to.not.equal(BID_STATUS.RENDERED);
      });
    });
  }

  describe('setTargetingForAst', function () {
    let targeting;
    let auctionManagerInstance;

    beforeEach(function () {
      resetAuction();
      auctionManagerInstance = newAuctionManager();
      sinon.stub(auctionManagerInstance, 'getBidsReceived').callsFake(function() {
        const bidResponse = getBidResponses()[1];
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
      const regex = /pt[0-9]/;

      for (var key in expectedAdserverTargeting) {
        if (key.search(regex) < 0) {
          newAdserverTargeting[key.toUpperCase()] = expectedAdserverTargeting[key];
        } else {
          newAdserverTargeting[key] = expectedAdserverTargeting[key];
        }
      }
      targeting.setTargetingForAst();
      sinon.assert.match(window.apntag.tags[adUnitCode].keywords, newAdserverTargeting);
    });

    it('should reset targeting for appnexus apntag object', function () {
      const bids = auctionManagerInstance.getBidsReceived();
      const adUnitCode = '/19968336/header-bid-tag-0';

      var expectedAdserverTargeting = bids[0].adserverTargeting;
      var newAdserverTargeting = {};
      const regex = /pt[0-9]/;

      for (var key in expectedAdserverTargeting) {
        if (key.search(regex) < 0) {
          newAdserverTargeting[key.toUpperCase()] = expectedAdserverTargeting[key];
        } else {
          newAdserverTargeting[key] = expectedAdserverTargeting[key];
        }
      }
      targeting.setTargetingForAst();
      sinon.assert.match(window.apntag.tags[adUnitCode].keywords, newAdserverTargeting)
      targeting.resetPresetTargetingAST();
      expect(window.apntag.tags[adUnitCode].keywords).to.deep.equal({});
    });

    it('should not find ' + TARGETING_KEYS.AD_ID + ' key in lowercase for all bidders', function () {
      const adUnitCode = '/19968336/header-bid-tag-0';
      pbjs.setConfig({ enableSendAllBids: true });
      targeting.setTargetingForAst();
      const keywords = Object.keys(window.apntag.tags[adUnitCode].keywords).filter(keyword => (keyword.substring(0, TARGETING_KEYS.AD_ID.length) === TARGETING_KEYS.AD_ID));
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

    function push(cmd) {
      return new Promise((resolve) => {
        pbjs.cmd.push(() => {
          try {
            cmd();
          } finally {
            resolve();
          }
        })
      })
    }

    it('should run commands which are pushed into it', async function () {
      const cmd = sinon.spy();
      await push(cmd);
      assert.isTrue(cmd.called);
    });

    it('should log an error when given non-functions', async function () {
      pbjs.cmd.push(5);
      await push(() => null);
      assert.isTrue(utils.logError.calledOnce);
    });

    it('should log an error if the command passed into it fails', async function () {
      await push(function () {
        throw new Error('Failed function.');
      });
      assert.isTrue(utils.logError.calledOnce);
    });
  });

  describe('The monkey-patched que.push function', function() {
    it('should be the same as the cmd.push function', function() {
      assert.equal(pbjs.que.push, pbjs.cmd.push);
    });
  });

  describe('getAllPrebidWinningBids', function () {
    let auctionManagerStub;
    let logWarnSpy;
    beforeEach(function () {
      auctionManagerStub = sinon.stub(auctionManager, 'getBidsReceived');
      logWarnSpy = sandbox.spy(utils, 'logWarn');
    });

    afterEach(function () {
      auctionManagerStub.restore();
      logWarnSpy.restore();
    });

    it('should warn and return prebid auction winning bids', function () {
      const bidsReceived = [
        createBidReceived({bidder: 'appnexus', cpm: 7, auctionId: 1, responseTimestamp: 100, adUnitCode: 'code-0', adId: 'adid-1', status: 'targetingSet', requestId: 'reqid-1'}),
        createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 1, responseTimestamp: 101, adUnitCode: 'code-1', adId: 'adid-2', requestId: 'reqid-2'}),
        createBidReceived({bidder: 'appnexus', cpm: 6, auctionId: 2, responseTimestamp: 102, adUnitCode: 'code-0', adId: 'adid-3', requestId: 'reqid-3'}),
        createBidReceived({bidder: 'rubicon', cpm: 6, auctionId: 2, responseTimestamp: 103, adUnitCode: 'code-1', adId: 'adid-4', requestId: 'reqid-4'}),
      ];
      auctionManagerStub.returns(bidsReceived)
      const bids = pbjs.getAllPrebidWinningBids();

      expect(bids.length).to.equal(1);
      expect(bids[0].adId).to.equal('adid-1');
      sinon.assert.calledOnce(logWarnSpy);
    });
  });

  describe('deferred billing', function () {
    let bid;

    beforeEach(function () {
      bid = { adapterCode: 'pubmatic', bidder: 'pubmatic', params: {placementId: '10433394'}, adUnitCode: 'adUnit-code-1', adUnitId: '1234567890', adId: 'abcdefg' };
      sandbox.spy(adapterManager, 'triggerBilling');
      sandbox.stub(auctionManager, 'getAllWinningBids').returns([bid]);
    });

    Object.entries({
      'bid': () => bid,
      'adUnitCode': () => ({adUnitCode: bid.adUnitCode})
    }).forEach(([t, val]) => {
      it(`should trigger billing when invoked with ${t}`, () => {
        pbjs.triggerBilling(val());
        sinon.assert.calledWith(adapterManager.triggerBilling, bid);
      })
    })
  });

  describe('clearAllAuctions', () => {
    after(() => {
      resetAuction();
    });
    it('clears auction data', function () {
      expect(auctionManager.getBidsReceived().length).to.not.equal(0);
      pbjs.clearAllAuctions();
      expect(auctionManager.getBidsReceived().length).to.equal(0);
    });
  });
});
