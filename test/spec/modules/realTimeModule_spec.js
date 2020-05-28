import {
  init,
  requestBidsHook,
  setTargetsAfterRequestBids,
  deepMerge,
  validateProviderDataForGPT
} from 'modules/rtdModule/index.js';
import {
  init as browsiInit,
  addBrowsiTag,
  isIdMatchingAdUnit,
  setData,
  getMacroId
} from 'modules/browsiRtdProvider.js';
import {
  init as audigentInit,
  setData as setAudigentData
} from 'modules/audigentRtdProvider.js';
import { config } from 'src/config.js';
import { makeSlot } from '../integration/faker/googletag.js';

let expect = require('chai').expect;

describe('Real time module', function () {
  const conf = {
    'realTimeData': {
      'auctionDelay': 250,
      dataProviders: [{
        'name': 'browsi',
        'params': {
          'url': 'testUrl.com',
          'siteKey': 'testKey',
          'pubKey': 'testPub',
          'keyName': 'bv'
        }
      }, {
        'name': 'audigent'
      }]
    }
  };

  const predictions = {
    p: {
      'browsiAd_2': {
        'w': [
          '/57778053/Browsi_Demo_Low',
          '/57778053/Browsi_Demo_300x250'
        ],
        'p': 0.07
      },
      'browsiAd_1': {
        'w': [],
        'p': 0.06
      },
      'browsiAd_3': {
        'w': [],
        'p': 0.53
      },
      'browsiAd_4': {
        'w': [
          '/57778053/Browsi_Demo'
        ],
        'p': 0.85
      }
    }
  };

  const audigentSegments = {
    audigent_segments: { 'a': 1, 'b': 2 }
  }

  function getAdUnitMock(code = 'adUnit-code') {
    return {
      code,
      mediaTypes: { banner: {}, native: {} },
      sizes: [[300, 200], [300, 600]],
      bids: [{ bidder: 'sampleBidder', params: { placementId: 'banner-only-bidder' } }]
    };
  }

  function createSlots() {
    const slot1 = makeSlot({ code: '/57778053/Browsi_Demo_300x250', divId: 'browsiAd_1' });
    const slot2 = makeSlot({ code: '/57778053/Browsi', divId: 'browsiAd_1' });
    return [slot1, slot2];
  }

  describe('Real time module with browsi provider', function () {
    afterEach(function () {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
    });

    after(function () {
      config.resetConfig();
    });

    it('check module using bidsBackCallback', function () {
      let adUnits1 = [getAdUnitMock('browsiAd_1')];
      let targeting = [];
      init(config);
      browsiInit(config);
      config.setConfig(conf);
      setData(predictions);

      // set slot
      const slots = createSlots();
      window.googletag.pubads().setSlots(slots);

      function afterBidHook() {
        slots.map(s => {
          targeting = [];
          s.getTargeting().map(value => {
            targeting.push(Object.keys(value).toString());
          });
        });

        expect(targeting.indexOf('bv')).to.be.greaterThan(-1);
      }
      setTargetsAfterRequestBids(afterBidHook, adUnits1, true);
    });

    it('check module using requestBidsHook', function () {
      let adUnits1 = [getAdUnitMock('browsiAd_1')];
      let targeting = [];
      let dataReceived = null;

      // set slot
      const slotsB = createSlots();
      window.googletag.pubads().setSlots(slotsB);

      function afterBidHook(data) {
        dataReceived = data;
        slotsB.map(s => {
          targeting = [];
          s.getTargeting().map(value => {
            targeting.push(Object.keys(value).toString());
          });
        });

        expect(targeting.indexOf('bv')).to.be.greaterThan(-1);
        dataReceived.adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid.realTimeData).to.have.property('bv');
          });
        });
      }
      requestBidsHook(afterBidHook, { adUnits: adUnits1 });
    });

    it('check object deep merge', function () {
      const obj1 = {
        id1: {
          key: 'value',
          key2: 'value2'
        },
        id2: {
          k: 'v'
        }
      };
      const obj2 = {
        id1: {
          key3: 'value3'
        }
      };
      const obj3 = {
        id3: {
          key: 'value'
        }
      };
      const expected = {
        id1: {
          key: 'value',
          key2: 'value2',
          key3: 'value3'
        },
        id2: {
          k: 'v'
        },
        id3: {
          key: 'value'
        }
      };

      const merged = deepMerge([obj1, obj2, obj3]);
      assert.deepEqual(expected, merged);
    });

    it('check data validation for GPT targeting', function () {
      // non strings values should be removed
      const obj = {
        valid: {'key': 'value'},
        invalid: {'key': ['value']},
        combine: {
          'a': 'value',
          'b': []
        }
      };

      const expected = {
        valid: {'key': 'value'},
        invalid: {},
        combine: {
          'a': 'value',
        }
      };
      const validationResult = validateProviderDataForGPT(obj);
      assert.deepEqual(expected, validationResult);
    });

    it('check browsi sub module', function () {
      const script = addBrowsiTag('scriptUrl.com');
      expect(script.getAttribute('data-sitekey')).to.equal('testKey');
      expect(script.getAttribute('data-pubkey')).to.equal('testPub');
      expect(script.async).to.equal(true);

      const slots = createSlots();
      const test1 = isIdMatchingAdUnit(slots[0], ['/57778053/Browsi_Demo_300x250']); // true
      const test2 = isIdMatchingAdUnit(slots[0], ['/57778053/Browsi_Demo_300x250', '/57778053/Browsi']); // true
      const test3 = isIdMatchingAdUnit(slots[0], ['/57778053/Browsi_Demo_Low']); // false
      const test4 = isIdMatchingAdUnit(slots[0], []); // true

      expect(test1).to.equal(true);
      expect(test2).to.equal(true);
      expect(test3).to.equal(false);
      expect(test4).to.equal(true);

      // macro results
      slots[0].setTargeting('test', ['test', 'value']);
      // slot getTargeting doesn't act like GPT so we can't expect real value
      const macroResult = getMacroId({p: '<AD_UNIT>/<KEY_test>'}, slots[0]);
      expect(macroResult).to.equal('/57778053/Browsi_Demo_300x250/NA');

      const macroResultB = getMacroId({}, slots[0]);
      expect(macroResultB).to.equal('browsiAd_1');

      const macroResultC = getMacroId({p: '<AD_UNIT>', s: {s: 0, e: 1}}, slots[0]);
      expect(macroResultC).to.equal('/');
    })
  });

  describe('Real time module with Audigent provider', function () {
    before(function () {
      init(config);
      audigentInit(config);
      config.setConfig(conf);
      setAudigentData(audigentSegments);
    });

    afterEach(function () {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      config.resetConfig();
    });

    it('check module using requestBidsHook', function () {
      let adUnits1 = [getAdUnitMock('audigentAd_1')];
      let targeting = [];
      let dataReceived = null;

      // set slot
      const slotsB = createSlots();
      window.googletag.pubads().setSlots(slotsB);

      function afterBidHook(data) {
        dataReceived = data;
        slotsB.map(s => {
          targeting = [];
          s.getTargeting().map(value => {
            targeting.push(Object.keys(value).toString());
          });
        });

        dataReceived.adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid.realTimeData).to.have.property('audigent_segments');
            expect(bid.realTimeData.audigent_segments).to.deep.equal(audigentSegments.audigent_segments);
          });
        });
      }

      requestBidsHook(afterBidHook, { adUnits: adUnits1 });
    });
  });
});
