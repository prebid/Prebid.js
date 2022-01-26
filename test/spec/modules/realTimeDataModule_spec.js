import * as rtdModule from 'modules/rtdModule/index.js';
import {config} from 'src/config.js';
import * as sinon from 'sinon';
import {default as CONSTANTS} from '../../../src/constants.json';
import * as events from '../../../src/events.js';
import 'src/prebid.js';

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
  let eventHandlers;
  let sandbox;

  function mockEmitEvent(event, ...args) {
    (eventHandlers[event] || []).forEach((h) => h(...args));
  }

  before(() => {
    eventHandlers = {};
    sandbox = sinon.sandbox.create();
    sandbox.stub(events, 'on').callsFake((event, handler) => {
      if (!eventHandlers.hasOwnProperty(event)) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    });
  });

  after(() => {
    sandbox.restore();
  });

  describe('', () => {
    const PROVIDERS = [validSM, invalidSM, failureSM, nonConfSM, validSMWait];
    let _detachers;

    beforeEach(function () {
      _detachers = PROVIDERS.map(rtdModule.attachRealTimeDataProvider);
      rtdModule.init(config);
      config.setConfig(conf);
    });

    afterEach(function () {
      _detachers.forEach((f) => f());
      config.resetConfig();
    });

    it('should use only valid modules', function () {
      expect(rtdModule.subModules).to.eql([validSMWait, validSM]);
    });

    it('should be able to modify bid request', function (done) {
      rtdModule.setBidRequestsData(() => {
        assert(getBidRequestDataSpy.calledTwice);
        assert(getBidRequestDataSpy.calledWith({bidRequest: {}}));
        done();
      }, {bidRequest: {}})
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
    });

    describe('setBidRequestData', () => {
      let withWait, withoutWait;

      function runSetBidRequestData() {
        return new Promise((resolve) => {
          rtdModule.setBidRequestsData(resolve, {bidRequest: {}});
        });
      }

      beforeEach(() => {
        withWait = {
          submod: validSMWait,
          cbTime: 0,
          cbRan: false
        };
        withoutWait = {
          submod: validSM,
          cbTime: 0,
          cbRan: false
        };

        [withWait, withoutWait].forEach((c) => {
          c.submod.getBidRequestData = sinon.stub().callsFake((_, cb) => {
            setTimeout(() => {
              c.cbRan = true;
              cb();
            }, c.cbTime);
          });
        });
      });

      it('should allow non-priority submodules to run synchronously', () => {
        withWait.cbTime = withoutWait.cbTime = 0;
        return runSetBidRequestData().then(() => {
          expect(withWait.cbRan).to.be.true;
          expect(withoutWait.cbRan).to.be.true;
        })
      });

      it('should not wait for non-priority submodules if priority ones complete first', () => {
        withWait.cbTime = 10;
        withoutWait.cbTime = 100;
        return runSetBidRequestData().then(() => {
          expect(withWait.cbRan).to.be.true;
          expect(withoutWait.cbRan).to.be.false;
        });
      });
    });
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

  describe('event', () => {
    const EVENTS = {
      [CONSTANTS.EVENTS.AUCTION_INIT]: 'onAuctionInitEvent',
      [CONSTANTS.EVENTS.AUCTION_END]: 'onAuctionEndEvent',
      [CONSTANTS.EVENTS.BID_RESPONSE]: 'onBidResponseEvent',
      [CONSTANTS.EVENTS.BID_REQUESTED]: 'onBidRequestEvent'
    }
    const conf = {
      'realTimeData': {
        dataProviders: [
          {
            'name': 'tp1',
          },
          {
            'name': 'tp2',
          }
        ]
      }
    };
    let providers;
    let _detachers;

    function eventHandlingProvider(name) {
      const provider = {
        name: name,
        init: () => true,
      }
      Object.values(EVENTS).forEach((ev) => provider[ev] = sinon.spy());
      return provider;
    }

    beforeEach(() => {
      providers = [eventHandlingProvider('tp1'), eventHandlingProvider('tp2')];
      _detachers = providers.map(rtdModule.attachRealTimeDataProvider);
      rtdModule.init(config);
      config.setConfig(conf);
    });

    afterEach(() => {
      _detachers.forEach((d) => d())
      config.resetConfig();
    });

    it('should set targeting for auctionEnd', () => {
      providers.forEach(p => p.getTargetingData = sinon.spy());
      const auction = {
        adUnitCodes: ['a1'],
        adUnits: [{code: 'a1'}]
      };
      mockEmitEvent(CONSTANTS.EVENTS.AUCTION_END, auction);
      providers.forEach(p => {
        expect(p.getTargetingData.calledWith(auction.adUnitCodes)).to.be.true;
      });
    });

    Object.entries(EVENTS).forEach(([event, hook]) => {
      it(`'${event}' should be propagated to providers through '${hook}'`, () => {
        const eventArg = {};
        mockEmitEvent(event, eventArg);
        providers.forEach((provider) => {
          const providerConf = conf.realTimeData.dataProviders.find((cfg) => cfg.name === provider.name);
          expect(provider[hook].called).to.be.true;
          expect(provider[hook].args).to.have.length(1);
          expect(provider[hook].args[0]).to.include.members([eventArg, providerConf])
        })
      });

      it(`${event} should not fail to propagate elsewhere if a provider throws in its event handler`, () => {
        providers[0][hook] = function () { throw new Error() };
        mockEmitEvent(event);
        expect(providers[1][hook].called).to.be.true;
      });
    });
  });
});
