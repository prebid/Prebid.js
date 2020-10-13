import * as rtdModule from 'modules/rtdModule/index.js';
import { config } from 'src/config.js';
import {makeSlot} from '../integration/faker/googletag.js';
import * as browsiRTD from '../../../modules/browsiRtdProvider.js';

const validSM = {
  name: 'validSM',
  init: () => { return true },
  getData: (adUnits, onDone) => {
    setTimeout(() => {
      return onDone({'key': 'validSM'})
    }, 500)
  }
};

const validSMWait = {
  name: 'validSMWait',
  init: () => { return true },
  getData: (adUnits, onDone) => {
    setTimeout(() => {
      return onDone({'ad1': {'key': 'validSMWait'}})
    }, 50)
  }
};

const invalidSM = {
  name: 'invalidSM'
};

const failureSM = {
  name: 'failureSM',
  init: () => { return false }
};

const nonConfSM = {
  name: 'nonConfSM',
  init: () => { return true }
};

const conf = {
  'realTimeData': {
    'auctionDelay': 250,
    dataProviders: [
      {
        'name': 'validSMWait',
        'waitForIt': true,
      },
      {
        'name': 'validSM',
        'waitForIt': false,
      },
      {
        'name': 'invalidSM'
      },
      {
        'name': 'failureSM'
      }]
  }
};

function getAdUnitMock(code = 'adUnit-code') {
  return {
    code,
    mediaTypes: { banner: {}, native: {} },
    sizes: [[300, 200], [300, 600]],
    bids: [{ bidder: 'sampleBidder', params: { placementId: 'banner-only-bidder' } }]
  };
}

describe('Real time module', function () {
  after(function () {
    config.resetConfig();
  });

  beforeEach(function () {
    config.setConfig(conf);
  });

  it('should use only valid modules', function (done) {
    rtdModule.attachRealTimeDataProvider(validSM);
    rtdModule.attachRealTimeDataProvider(invalidSM);
    rtdModule.attachRealTimeDataProvider(failureSM);
    rtdModule.attachRealTimeDataProvider(nonConfSM);
    rtdModule.attachRealTimeDataProvider(validSMWait);
    rtdModule.initSubModules(afterInitSubModules);
    function afterInitSubModules() {
      expect(rtdModule.subModules).to.eql([validSMWait, validSM]);
      done();
    }
    rtdModule.init(config);
  });

  it('should only wait for must have sub modules', function (done) {
    rtdModule.getProviderData([], (data) => {
      expect(data).to.eql({validSMWait: {'ad1': {'key': 'validSMWait'}}});
      done();
    })
  });

  it('deep merge object', function () {
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

    const merged = rtdModule.deepMerge([obj1, obj2, obj3]);
    assert.deepEqual(expected, merged);
  });

  it('check module using bidsBackCallback', function (done) {
    // set slot
    const slot = makeSlot({ code: '/code1', divId: 'ad1' });
    window.googletag.pubads().setSlots([slot]);

    function afterBidHook() {
      expect(slot.getTargeting().length).to.equal(1);
      expect(slot.getTargeting()[0].key).to.equal('validSMWait');
      done();
    }
    rtdModule.setTargetsAfterRequestBids(afterBidHook, []);
  });

  it('check module using requestBidsHook', function (done) {
    // set slot
    const slotsB = makeSlot({ code: '/code1', divId: 'ad1' });
    window.googletag.pubads().setSlots([slotsB]);
    let adUnits = [getAdUnitMock('ad1')];

    function afterBidHook(data) {
      expect(slotsB.getTargeting().length).to.equal(1);
      expect(slotsB.getTargeting()[0].key).to.equal('validSMWait');

      data.adUnits.forEach(unit => {
        unit.bids.forEach(bid => {
          expect(bid.realTimeData).to.have.property('key');
          expect(bid.realTimeData.key).to.equal('validSMWait');
        });
      });
      done();
    }
    rtdModule.requestBidsHook(afterBidHook, { adUnits: adUnits });
  });
});

describe('browsi Real time  data sub module', function () {
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

  beforeEach(function () {
    config.setConfig(conf);
  });

  after(function () {
    config.resetConfig();
  });

  it('should init and return true', function () {
    browsiRTD.beforeInit(config);
    expect(browsiRTD.browsiSubmodule.init()).to.equal(true)
  });

  it('should create browsi script', function () {
    const script = browsiRTD.addBrowsiTag('scriptUrl.com');
    expect(script.getAttribute('data-sitekey')).to.equal('testKey');
    expect(script.getAttribute('data-pubkey')).to.equal('testPub');
    expect(script.async).to.equal(true);
    expect(script.prebidData.kn).to.equal(conf.realTimeData.dataProviders[0].params.keyName);
  });

  it('should match placement with ad unit', function () {
    const slot = makeSlot({ code: '/57778053/Browsi_Demo_300x250', divId: 'browsiAd_1' });

    const test1 = browsiRTD.isIdMatchingAdUnit(slot, ['/57778053/Browsi_Demo_300x250']); // true
    const test2 = browsiRTD.isIdMatchingAdUnit(slot, ['/57778053/Browsi_Demo_300x250', '/57778053/Browsi']); // true
    const test3 = browsiRTD.isIdMatchingAdUnit(slot, ['/57778053/Browsi_Demo_Low']); // false
    const test4 = browsiRTD.isIdMatchingAdUnit(slot, []); // true

    expect(test1).to.equal(true);
    expect(test2).to.equal(true);
    expect(test3).to.equal(false);
    expect(test4).to.equal(true);
  });

  it('should return correct macro values', function () {
    const slot = makeSlot({ code: '/57778053/Browsi_Demo_300x250', divId: 'browsiAd_1' });

    slot.setTargeting('test', ['test', 'value']);
    // slot getTargeting doesn't act like GPT so we can't expect real value
    const macroResult = browsiRTD.getMacroId({p: '<AD_UNIT>/<KEY_test>'}, slot);
    expect(macroResult).to.equal('/57778053/Browsi_Demo_300x250/NA');

    const macroResultB = browsiRTD.getMacroId({}, slot);
    expect(macroResultB).to.equal('browsiAd_1');

    const macroResultC = browsiRTD.getMacroId({p: '<AD_UNIT>', s: {s: 0, e: 1}}, slot);
    expect(macroResultC).to.equal('/');
  });

  describe('should return data to RTD module', function () {
    it('should return empty if no ad units defined', function (done) {
      browsiRTD.setData({});
      browsiRTD.browsiSubmodule.getData([], onDone);
      function onDone(data) {
        expect(data).to.eql({});
        done();
      }
    });

    it('should return NA if no prediction for ad unit', function (done) {
      const adUnits = [getAdUnitMock('adMock')];
      browsiRTD.setData({});
      browsiRTD.browsiSubmodule.getData(adUnits, onDone);
      function onDone(data) {
        expect(data).to.eql({adMock: {bv: 'NA'}});
        done();
      }
    });

    it('should return prediction from server', function (done) {
      const adUnits = [getAdUnitMock('hasPrediction')];
      const data = {
        p: {'hasPrediction': {p: 0.234}},
        kn: 'bv',
        pmd: undefined
      };
      browsiRTD.setData(data);
      browsiRTD.browsiSubmodule.getData(adUnits, onDone);
      function onDone(data) {
        expect(data).to.eql({hasPrediction: {bv: '0.20'}});
        done();
      }
    })
  })
});
