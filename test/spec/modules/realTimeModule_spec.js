import {
  init,
  requestBidsHook,
  attachRealTimeDataProvider,
  setTargetsAfterRequestBids
} from 'modules/realTimeDataModule';
import {
  init as browsiInit,
  addBrowsiTag,
  isIdMatchingAdUnit
} from 'modules/browsiProvider';
import {config} from 'src/config';
import {browsiSubmodule, _resolvePromise} from 'modules/browsiProvider';
import {makeSlot} from '../integration/faker/googletag';

let expect = require('chai').expect;

describe('Real time module', function() {
  const conf = {
    'realTimeData': {
      'name': 'browsi',
      'primary_only': false,
      'params': {
        'url': 'testUrl.com',
        'siteKey': 'testKey',
        'pubKey': 'testPub',
        'keyName': 'bv'
      }
    }
  };

  const predictions =
    {
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
    const slot2 = makeSlot({code: '/57778053/Browsi_Demo_Low', divId: 'browsiAd_2'});
    return [
      slot1,
      slot2
    ];
  }

  before(function() {

  });

  describe('Real time module with browsi provider', function() {
    afterEach(function () {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
    });

    it('check module using bidsBackCallback', function () {
      let adUnits1 = [getAdUnitMock('browsiAd_1')];
      _resolvePromise(predictions);
      attachRealTimeDataProvider(browsiSubmodule);
      init(config);
      browsiInit(config);
      config.setConfig(conf);

      // set slot
      const slots = createSlots();
      window.googletag.pubads().setSlots(slots);

      setTargetsAfterRequestBids(afterBidHook, {adUnits: adUnits1});
      function afterBidHook() {
        slots.map(s => {
          let targeting = [];
          s.getTargeting().map(value => {
            console.log('in slots map');
            let temp = [];
            temp.push(Object.keys(value).toString());
            temp.push(value[Object.keys(value)]);
            targeting.push(temp);
          });
          expect(targeting.indexOf('bv')).to.be.greaterThan(-1);
        });
      }
    });

    it('check module using requestBidsHook', function () {
      let adUnits1 = [getAdUnitMock('browsiAd_1')];

      // set slot
      const slotsB = createSlots();
      window.googletag.pubads().setSlots(slotsB);

      requestBidsHook(afterBidHook, {adUnits: adUnits1});
      function afterBidHook(adUnits) {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.property('bv');
          });
        });

        slotsB.map(s => {
          let targeting = [];
          s.getTargeting().map(value => {
            let temp = [];
            temp.push(Object.keys(value).toString());
            temp.push(value[Object.keys(value)]);
            targeting.push(temp);
          });
          expect(targeting.indexOf('bv')).to.be.greaterThan(-1);
        });
      }
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
