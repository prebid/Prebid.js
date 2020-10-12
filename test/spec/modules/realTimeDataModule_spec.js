import * as rtdModule from 'modules/rtdModule/index.js';
import { config } from 'src/config.js';
import * as sinon from 'sinon';

const getBidRequestDataSpy = sinon.spy();

const validSM = {
  name: 'validSM',
  init: () => { return true },
  getTargetingData: (adUnitsCodes) => {
    return {'ad2': {'key': 'validSM'}}
  },
  getBidRequestData: getBidRequestDataSpy
};

const validSMWait = {
  name: 'validSMWait',
  init: () => { return true },
  getTargetingData: (adUnitsCodes) => {
    return {'ad1': {'key': 'validSMWait'}}
  },
  getBidRequestData: getBidRequestDataSpy
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
    'auctionDelay': 100,
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

describe('Real time module', function () {
  before(function () {
    rtdModule.attachRealTimeDataProvider(validSM);
    rtdModule.attachRealTimeDataProvider(invalidSM);
    rtdModule.attachRealTimeDataProvider(failureSM);
    rtdModule.attachRealTimeDataProvider(nonConfSM);
    rtdModule.attachRealTimeDataProvider(validSMWait);
  });

  after(function () {
    config.resetConfig();
  });

  beforeEach(function () {
    config.setConfig(conf);
  });

  it('should use only valid modules', function () {
    rtdModule.init(config);
    expect(rtdModule.subModules).to.eql([validSMWait, validSM]);
  });

  it('should be able to modify bid request', function (done) {
    rtdModule.setBidRequestsData(() => {
      assert(getBidRequestDataSpy.calledTwice);
      assert(getBidRequestDataSpy.calledWith({bidRequest: {}}));
      done();
    }, {bidRequest: {}})
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

  it('sould place targeting on adUnits', function (done) {
    const auction = {
      adUnitCodes: ['ad1', 'ad2'],
      adUnits: [
        {
          code: 'ad1'
        },
        {
          code: 'ad2',
          adserverTargeting: {preKey: 'preValue'}
        }
      ]
    };

    const expectedAdUnits = [
      {
        code: 'ad1',
        adserverTargeting: {key: 'validSMWait'}
      },
      {
        code: 'ad2',
        adserverTargeting: {
          preKey: 'preValue',
          key: 'validSM'
        }
      }
    ];

    const adUnits = rtdModule.getAdUnitTargeting(auction);
    assert.deepEqual(expectedAdUnits, adUnits)
    done();
  })
});
