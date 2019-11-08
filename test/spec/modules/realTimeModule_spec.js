import {
  init,
  requestBidsHook,
  setTargetsAfterRequestBids,
  deepMerge
} from 'modules/rtdModule/index';
import {
  init as browsiInit,
  addBrowsiTag,
  isIdMatchingAdUnit,
  setData
} from 'modules/browsiRtdProvider';
import {config} from 'src/config';
import {makeSlot} from '../integration/faker/googletag';

let expect = require('chai').expect;

describe('Real time module', function() {
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
      }]

    }
  };

  const predictions =
    {p: {
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

  function getAdUnitMock(code = 'adUnit-code') {
    return {
      code,
      mediaTypes: {banner: {}, native: {}},
      sizes: [[300, 200], [300, 600]],
      bids: [{bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}]
    };
  }

  function createSlots() {
    const slot1 = makeSlot({code: '/57778053/Browsi_Demo_300x250', divId: 'browsiAd_1'});
    return [slot1];
  }

  describe('Real time module with browsi provider', function() {
    afterEach(function () {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
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
      }
      setTargetsAfterRequestBids(afterBidHook, adUnits1, true);

      setTimeout(() => {
        expect(targeting.indexOf('bv')).to.be.greaterThan(-1);
      }, 200);
    });

    it('check module using requestBidsHook', function () {
      console.log('entrance', new Date().getMinutes() + ':' + new Date().getSeconds());
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
      }
      requestBidsHook(afterBidHook, {adUnits: adUnits1});
      setTimeout(() => {
        expect(targeting.indexOf('bv')).to.be.greaterThan(-1);
        dataReceived.adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid.realTimeData).to.have.property('bv');
          });
        });
      }, 200);
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

    it('check browsi sub module', function () {
      const script = addBrowsiTag('scriptUrl.com');
      expect(script.getAttribute('data-sitekey')).to.equal('testKey');
      expect(script.getAttribute('data-pubkey')).to.equal('testPub');
      expect(script.async).to.equal(true);

      const slots = createSlots();
      const test1 = isIdMatchingAdUnit('browsiAd_1', slots, ['/57778053/Browsi_Demo_300x250']); // true
      const test2 = isIdMatchingAdUnit('browsiAd_1', slots, ['/57778053/Browsi_Demo_300x250', '/57778053/Browsi']); // true
      const test3 = isIdMatchingAdUnit('browsiAd_1', slots, ['/57778053/Browsi_Demo_Low']); // false
      const test4 = isIdMatchingAdUnit('browsiAd_1', slots, []); // true

      expect(test1).to.equal(true);
      expect(test2).to.equal(true);
      expect(test3).to.equal(false);
      expect(test4).to.equal(true);
    })
  });
});
