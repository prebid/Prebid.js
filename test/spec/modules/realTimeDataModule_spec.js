import * as rtdModule from 'modules/rtdModule/index.js';
import { config } from 'src/config.js';
import * as sinon from 'sinon';
import { EVENTS } from '../../../src/constants.js';
import * as events from '../../../src/events.js';
import 'src/prebid.js';
import { attachRealTimeDataProvider, detachRealTimeDataProvider, onDataDeletionRequest } from 'modules/rtdModule/index.js';
import { submodule } from 'src/hook.js';
import * as utils from 'src/utils.js';
import { GDPR_ACPIDS, GDPR_GVLIDS } from '../../../src/consentHandler.js';
import { MODULE_TYPE_RTD } from '../../../src/activities/modules.js';
import { registerActivityControl } from '../../../src/activities/rules.js';
import { ACTIVITY_ENRICH_UFPD, ACTIVITY_TRANSMIT_EIDS } from '../../../src/activities/activities.js';

describe('Real time module', function () {
  let eventHandlers;
  let sandbox;
  let validSM, validSMWait, invalidSM, failureSM, nonConfSM, conf;
  let getBidRequestDataStub;

  function mockEmitEvent(event, ...args) {
    (eventHandlers[event] || []).forEach((h) => h(...args));
  }

  before(() => {
    eventHandlers = {};
    sandbox = sinon.createSandbox();
    getBidRequestDataStub = sinon.stub();

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

  beforeEach(() => {
    validSM = {
      name: 'validSM',
      init: () => { return true; },
      getTargetingData: (adUnitsCodes) => {
        return { 'ad2': { 'key': 'validSM' } };
      },
      getBidRequestData: getBidRequestDataStub
    };

    validSMWait = {
      name: 'validSMWait',
      init: () => { return true; },
      getTargetingData: (adUnitsCodes) => {
        return { 'ad1': { 'key': 'validSMWait' } };
      },
      getBidRequestData: sinon.stub(),
    };

    invalidSM = {
      name: 'invalidSM'
    };

    failureSM = {
      name: 'failureSM',
      init: () => { return false; }
    };

    nonConfSM = {
      name: 'nonConfSM',
      init: () => { return true; }
    };

    conf = {
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
  });

  describe('GVL IDs', () => {
    beforeEach(() => {
      sinon.stub(GDPR_GVLIDS, 'register');
    });

    afterEach(() => {
      GDPR_GVLIDS.register.restore();
    });

    it('are registered when RTD module is registered', () => {
      const mod = { name: 'mockRtd', gvlid: 123 };
      try {
        attachRealTimeDataProvider(mod);
        sinon.assert.calledWith(GDPR_GVLIDS.register, MODULE_TYPE_RTD, 'mockRtd', 123);
      } finally {
        detachRealTimeDataProvider(mod);
      }
    });

    it('registers Additional Consent provider IDs', () => {
      const mod = { name: 'mockAcpRtd', acpId: 321 };
      sinon.stub(GDPR_ACPIDS, 'register');
      try {
        attachRealTimeDataProvider(mod);
        sinon.assert.calledWith(GDPR_ACPIDS.register, MODULE_TYPE_RTD, 'mockAcpRtd', 321);
      } finally {
        GDPR_ACPIDS.register.restore();
        detachRealTimeDataProvider(mod);
      }
    });
  });

  describe('', () => {
    let PROVIDERS, rules;

    beforeEach(function () {
      PROVIDERS = [validSM, invalidSM, failureSM, nonConfSM, validSMWait];
      PROVIDERS.forEach((provider) => rtdModule.attachRealTimeDataProvider(provider));
      rtdModule.init(config);
      config.setConfig(conf);
      rules = [
        registerActivityControl(ACTIVITY_TRANSMIT_EIDS, 'test', (params) => {
          return { allow: false };
        }),
        registerActivityControl(ACTIVITY_ENRICH_UFPD, 'test', (params) => {
          return { allow: false };
        })
      ];
    });

    afterEach(function () {
      PROVIDERS.forEach((provider) => rtdModule.detachRealTimeDataProvider(provider));
      config.resetConfig();
      rules.forEach(rule => rule());
    });

    it('should use only valid modules', function () {
      expect(rtdModule.subModules).to.eql([validSMWait, validSM]);
    });

    it('should be able to modify bid request', function (done) {
      const request = { bidRequest: {} };
      getBidRequestDataStub.callsFake((req) => {
        req.foo = 'bar';
      });
      rtdModule.setBidRequestsData(() => {
        assert(getBidRequestDataStub.calledOnce);
        assert(getBidRequestDataStub.calledWith(sinon.match({ bidRequest: {} })));
        expect(request.foo).to.eql('bar');
        done();
      }, request);
    });

    [
      {
        scope: 'global',
        set(request, val) {
          request.ortb2Fragments.global = val;
        },
        get(request) {
          return request.ortb2Fragments.global;
        }
      },
      {
        scope: 'bidder',
        set(request, val) {
          request.ortb2Fragments.bidder = {
            mockBidder: val
          };
        },
        get(request) {
          return request.ortb2Fragments.bidder.mockBidder;
        }
      },
    ].forEach(({ scope, set, get }) => {
      describe(`ortb2Fragments.${scope}`, () => {
        let request;
        beforeEach(() => {
          request = {
            ortb2Fragments: {}
          };
          set(request, { foo: 'bar' });
        });

        it('can be assigned into', (done) => {
          let complete = false;
          getBidRequestDataStub.callsFake((req) => {
            set(req, { test: 1 });
            complete = true;
          });
          rtdModule.setBidRequestsData(() => {
            expect(get(request)).to.eql({
              foo: 'bar',
              test: 1
            });
            expect(complete).to.be.true;
            done();
          }, request);
        });

        it('has arrays replaced, not merged, by assignment', (done) => {
          set(request, { site: { cat: ['b'] } });
          getBidRequestDataStub.callsFake((req) => {
            set(req, { site: { cat: ['a'] } });
          });
          rtdModule.setBidRequestsData(() => {
            expect(get(request)).to.eql({ site: { cat: ['a'] } });
            done();
          }, request);
        });

        it('does not assign what the guard protects', (done) => {
          // ACTIVITY_ENRICH_UFPD is denied for these tests
          set(request, { user: { data: ['b'] } });
          getBidRequestDataStub.callsFake((req) => {
            set(req, { user: { data: ['a'] }, site: { id: 1 } });
          });
          rtdModule.setBidRequestsData(() => {
            expect(get(request)).to.eql({ user: { data: ['b'] }, site: { id: 1 } });
            done();
          }, request);
        });

        it('can be assigned into through ortb2Fragments', (done) => {
          set(request, { site: { cat: ['b'] } });
          getBidRequestDataStub.callsFake((req) => {
            const value = { ortb2Fragments: {} };
            set(value, { site: { cat: ['a'] } });
            req.ortb2Fragments = value.ortb2Fragments;
          });
          rtdModule.setBidRequestsData(() => {
            expect(get(request)).to.eql({ site: { cat: ['a'] } });
            done();
          }, request);
        });

        [null, ['value']].forEach(value => {
          it(`ignores assignment of ${JSON.stringify(value)}`, (done) => {
            let complete = false;
            getBidRequestDataStub.callsFake((req) => {
              req.ortb2Fragments[scope] = value;
              complete = true;
            });
            rtdModule.setBidRequestsData(() => {
              expect(get(request)).to.eql({ foo: 'bar' });
              expect(complete).to.be.true;
              done();
            }, request);
          });
        });

        it('can be assigned to itself', (done) => {
          let complete = false;
          getBidRequestDataStub.callsFake((req) => {
            set(req, get(req));
            complete = true;
          });
          rtdModule.setBidRequestsData(() => {
            expect(get(request)).to.eql({
              foo: 'bar',
            });
            expect(complete).to.be.true;
            done();
          }, request);
        });
      });
    });

    describe('bidder-specific ortb2', () => {
      it('can be set on a new bidder', (done) => {
        const request = { ortb2Fragments: { bidder: {} } };
        getBidRequestDataStub.callsFake((req) => {
          utils.deepSetValue(req, 'ortb2Fragments.bidder.mockBidder.foo', 'bar');
        });
        rtdModule.setBidRequestsData(() => {
          expect(request.ortb2Fragments.bidder.mockBidder).to.eql({ foo: 'bar' });
          done();
        }, request);
      });

      it('can be set on an existing bidder without replacing its data with guarded views', (done) => {
        const user = { foo: 'bar' };
        const request = { ortb2Fragments: { bidder: { mockBidder: { user } } } };
        getBidRequestDataStub.callsFake((req) => {
          utils.deepSetValue(req, 'ortb2Fragments.bidder.mockBidder.user.ext.data.test', 1);
        });
        rtdModule.setBidRequestsData(() => {
          const bidderData = request.ortb2Fragments.bidder.mockBidder;
          expect(bidderData.user).to.equal(user);
          expect(bidderData).to.eql({ user: { foo: 'bar', ext: { data: { test: 1 } } } });
          expect(() => structuredClone(request.ortb2Fragments.bidder)).to.not.throw();
          done();
        }, request);
      });

      it('keeps writes made through a view held while another submodule creates the bidder', (done) => {
        const request = { ortb2Fragments: { bidder: {} } };
        let held;
        validSMWait.getBidRequestData = (req, callback) => {
          held = req.ortb2Fragments.bidder.mockBidder;
          callback();
        };
        getBidRequestDataStub.callsFake((req) => {
          utils.deepSetValue(req, 'ortb2Fragments.bidder.mockBidder.b', 2);
          held.a = 1;
        });
        rtdModule.setBidRequestsData(() => {
          expect(request.ortb2Fragments.bidder.mockBidder).to.eql({ a: 1, b: 2 });
          expect(held.b).to.equal(2);
          done();
        }, request);
      });

      describe('prototype properties', () => {
        const PROTO = '__proto__';

        afterEach(() => {
          delete Object.prototype.polluted;
        });

        it('refuses to set __proto__ as a bidder', (done) => {
          const request = { ortb2Fragments: { bidder: {} } };
          let error;
          getBidRequestDataStub.callsFake((req) => {
            try {
              req.ortb2Fragments.bidder[PROTO] = { polluted: true };
            } catch (e) {
              error = e;
            }
          });
          rtdModule.setBidRequestsData(() => {
            expect(error).to.be.instanceOf(TypeError);
            expect(Object.getPrototypeOf(request.ortb2Fragments.bidder)).to.equal(Object.prototype);
            expect(({}).polluted).to.not.exist;
            done();
          }, request);
        });

        it('does not treat inherited properties as bidders', (done) => {
          const request = { ortb2Fragments: { bidder: { mockBidder: {} } } };
          let result;
          getBidRequestDataStub.callsFake((req) => {
            const bidder = req.ortb2Fragments.bidder;
            result = [bidder.hasOwnProperty('mockBidder'), bidder.hasOwnProperty('other'), String(bidder)];
          });
          rtdModule.setBidRequestsData(() => {
            expect(result).to.eql([true, false, '[object Object]']);
            expect(Object.keys(request.ortb2Fragments.bidder)).to.eql(['mockBidder']);
            done();
          }, request);
        });

        it('ignores __proto__ keys in assigned bidder data', (done) => {
          const request = { ortb2Fragments: { bidder: {} } };
          getBidRequestDataStub.callsFake((req) => {
            req.ortb2Fragments.bidder.mockBidder = JSON.parse('{"__proto__": {"polluted": true}, "site": {"id": "x"}}');
          });
          rtdModule.setBidRequestsData(() => {
            const bidderData = request.ortb2Fragments.bidder.mockBidder;
            expect(Object.getPrototypeOf(bidderData)).to.equal(Object.prototype);
            expect(bidderData.polluted).to.not.exist;
            expect(bidderData).to.eql({ site: { id: 'x' } });
            done();
          }, request);
        });
      });

      [null, 'value'].forEach(value => {
        it(`is not created by assigning ${JSON.stringify(value)}`, (done) => {
          const request = { ortb2Fragments: { bidder: {} } };
          let complete = false;
          getBidRequestDataStub.callsFake((req) => {
            req.ortb2Fragments.bidder.mockBidder = value;
            complete = true;
          });
          rtdModule.setBidRequestsData(() => {
            expect(complete).to.be.true;
            expect(request.ortb2Fragments.bidder).to.eql({});
            done();
          }, request);
        });
      });

      it('is not created by reads', (done) => {
        const request = { ortb2Fragments: { bidder: {} } };
        getBidRequestDataStub.callsFake((req) => {
          Object.assign({}, req.ortb2Fragments.bidder.mockBidder);
          JSON.stringify(req.ortb2Fragments.bidder);
        });
        rtdModule.setBidRequestsData(() => {
          expect(Object.keys(request.ortb2Fragments.bidder)).to.eql([]);
          done();
        }, request);
      });

      it('is not created by assigning it to itself', (done) => {
        const request = { ortb2Fragments: { bidder: {} } };
        getBidRequestDataStub.callsFake((req) => {
          req.ortb2Fragments.bidder.mockBidder = req.ortb2Fragments.bidder.mockBidder || {};
        });
        rtdModule.setBidRequestsData(() => {
          expect(Object.keys(request.ortb2Fragments.bidder)).to.eql([]);
          done();
        }, request);
      });

      Object.entries({
        'another bidder': (fragments) => { fragments.bidder.other = fragments.bidder.mockBidder; },
        'another bidder through spread': (fragments) => { fragments.bidder.other = { ...fragments.bidder.mockBidder }; },
        'global': (fragments) => { fragments.global.user = fragments.bidder.mockBidder.user; },
      }).forEach(([t, copy]) => {
        it(`can be copied to ${t} without sharing data`, (done) => {
          const user = { foo: 'bar' };
          const request = { ortb2Fragments: { global: {}, bidder: { mockBidder: { user } } } };
          getBidRequestDataStub.callsFake((req) => copy(req.ortb2Fragments));
          rtdModule.setBidRequestsData(() => {
            const copied = request.ortb2Fragments.bidder.other?.user ?? request.ortb2Fragments.global.user;
            expect(copied).to.eql({ foo: 'bar' });
            expect(copied).to.not.equal(user);
            expect(() => structuredClone(request.ortb2Fragments)).to.not.throw();
            done();
          }, request);
        });
      });

      it('are kept when assigning ortb2Fragments.bidder without them', (done) => {
        const request = { ortb2Fragments: { bidder: { mockBidder: { site: { id: 1 } } } } };
        getBidRequestDataStub.callsFake((req) => {
          req.ortb2Fragments.bidder = { other: { site: { id: 2 } } };
        });
        rtdModule.setBidRequestsData(() => {
          expect(request.ortb2Fragments.bidder).to.eql({ mockBidder: { site: { id: 1 } }, other: { site: { id: 2 } } });
          done();
        }, request);
      });

      [
        ['an existing bidder', { mockBidder: { site: { id: 1 } } }],
        ['a missing bidder', {}],
      ].forEach(([t, bidder]) => {
        it(`keeps writes through views of ${t} held across a delete`, (done) => {
          const request = { ortb2Fragments: { bidder } };
          getBidRequestDataStub.callsFake((req) => {
            const held = req.ortb2Fragments.bidder.mockBidder;
            delete req.ortb2Fragments.bidder.mockBidder;
            const again = req.ortb2Fragments.bidder.mockBidder;
            held.site = { id: 2 };
            again.device = { w: 1 };
          });
          rtdModule.setBidRequestsData(() => {
            expect(request.ortb2Fragments.bidder).to.eql({ mockBidder: { site: { id: 2 }, device: { w: 1 } } });
            done();
          }, request);
        });
      });

      it('have their contents deleted, except for what the guard protects', (done) => {
        // ACTIVITY_ENRICH_UFPD is denied for these tests
        const request = {
          ortb2Fragments: {
            bidder: {
              mockBidder: { site: { id: 1 } },
              protectedBidder: { site: { id: 1 }, user: { data: ['b'] } }
            }
          }
        };
        getBidRequestDataStub.callsFake((req) => {
          delete req.ortb2Fragments.bidder.mockBidder;
          delete req.ortb2Fragments.bidder.protectedBidder;
        });
        rtdModule.setBidRequestsData(() => {
          expect(request.ortb2Fragments.bidder).to.eql({ mockBidder: {}, protectedBidder: { user: { data: ['b'] } } });
          done();
        }, request);
      });

      it('can be created by assigning ortb2Fragments.bidder', (done) => {
        const request = { ortb2Fragments: { bidder: {} } };
        getBidRequestDataStub.callsFake((req) => {
          req.ortb2Fragments.bidder = { mockBidder: { site: { ext: { data: { test: 1 } } } } };
        });
        rtdModule.setBidRequestsData(() => {
          expect(request.ortb2Fragments.bidder).to.eql({ mockBidder: { site: { ext: { data: { test: 1 } } } } });
          done();
        }, request);
      });
    });

    it('should apply guard to modules, but not affect ortb2Fragments otherwise', (done) => {
      const ortb2Fragments = {
        global: {
          user: {
            eids: ['id']
          }
        },
        bidder: {
          bidderA: {
            user: {
              eids: ['bid']
            }
          }
        }
      };
      const request = { ortb2Fragments };
      getBidRequestDataStub.callsFake((req) => {
        expect(req.ortb2Fragments.global.user.eids).to.not.exist;
        expect(req.ortb2Fragments.bidder.bidderA.user.eids).to.not.exist;
        req.ortb2Fragments.global.user.yob = 123;
        req.ortb2Fragments.bidder.bidderB = {
          user: {
            yob: 123
          }
        };
      });
      rtdModule.setBidRequestsData(() => {
        expect(request.ortb2Fragments.global.user.eids).to.eql(['id']);
        expect(request.ortb2Fragments.bidder.bidderB?.user?.yob).to.not.exist;
        done();
      }, request);
    });

    it('should place targeting on adUnits', function (done) {
      const auction = {
        adUnitCodes: ['ad1', 'ad2'],
        adUnits: [
          {
            code: 'ad1'
          },
          {
            code: 'ad2',
            adserverTargeting: { preKey: 'preValue' }
          }
        ]
      };

      const expectedAdUnits = [
        {
          code: 'ad1',
          adserverTargeting: { key: 'validSMWait' }
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
      assert.deepEqual(expectedAdUnits, adUnits);
      done();
    });

    it('should isolate targeting from different submodules', () => {
      const auction = {
        adUnitCodes: ['ad1', 'ad2'],
        adUnits: [
          {
            code: 'ad1'
          },
          {
            code: 'ad2',
          }
        ]
      };
      validSM.getTargetingData = (adUnits) => {
        const targeting = { 'module1': 'targeting' };
        return {
          ad1: targeting,
          ad2: targeting
        };
      };

      rtdModule.getAdUnitTargeting(auction);
      expect(auction.adUnits[0].adserverTargeting).to.eql({
        module1: 'targeting',
        key: 'validSMWait'
      });
      expect(auction.adUnits[1].adserverTargeting).to.eql({
        module1: 'targeting'
      });
    });

    it('should still place targeting from the other submodules when one throws', () => {
      const auction = {
        adUnitCodes: ['ad1', 'ad2'],
        adUnits: [
          {
            code: 'ad1'
          },
          {
            code: 'ad2',
          }
        ]
      };
      validSMWait.getTargetingData = () => {
        throw new Error('this provider is broken');
      };

      expect(() => rtdModule.getAdUnitTargeting(auction)).to.not.throw();
      expect(auction.adUnits[1].adserverTargeting).to.eql({ key: 'validSM' });
    });

    describe('setBidRequestData', () => {
      let withWait, withoutWait;

      function runSetBidRequestData() {
        return new Promise((resolve) => {
          rtdModule.setBidRequestsData(resolve, { bidRequest: {} });
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
        });
      });

      it('should not wait for non-priority submodules if priority ones complete first', () => {
        withWait.cbTime = 10;
        withoutWait.cbTime = 100;
        return runSetBidRequestData().then(() => {
          expect(withWait.cbRan).to.be.true;
          expect(withoutWait.cbRan).to.be.false;
        });
      });

      it('should not let a priority submodule release the auction early by invoking its own callback more than once', () => {
        const doubleCalling = {
          name: 'doubleCallingSM',
          config: { waitForIt: true },
          getBidRequestData: sinon.stub().callsFake((_, cb) => {
            cb();
            cb(); // buggy (or adversarial) submodule invoking its own callback twice
          })
        };
        withWait.cbTime = 20;
        rtdModule.subModules.push(doubleCalling);

        return runSetBidRequestData().then(() => {
          // the second callback must only ever clear doubleCallingSM's own slot; it must not
          // also release the auction on validSMWait's behalf
          expect(withWait.cbRan).to.be.true;
        });
      });

      it('should run the submodules that follow one that throws', () => {
        const throwing = {
          name: 'throwingSM',
          config: { waitForIt: false },
          getBidRequestData: sinon.stub().throws(new Error('this provider is broken'))
        };
        rtdModule.subModules.unshift(throwing);

        return runSetBidRequestData().then(() => {
          expect(withWait.cbRan).to.be.true;
          expect(withoutWait.cbRan).to.be.true;
        });
      });

      it('should not hold the auction for a priority submodule that throws', () => {
        const throwing = {
          name: 'throwingPrioritySM',
          config: { waitForIt: true },
          getBidRequestData: sinon.stub().throws(new Error('this provider is broken'))
        };
        // the only submodule left, so nothing else can release the auction on its behalf
        rtdModule.subModules.splice(0, rtdModule.subModules.length, throwing);

        // a provider that threw will never call its callback, so the auction has to be released
        // without waiting out the whole 100ms auctionDelay
        const released = runSetBidRequestData().then(() => 'released');
        const waitedOut = new Promise((resolve) => setTimeout(() => resolve('waited out'), 90));

        return Promise.race([released, waitedOut]).then((outcome) => {
          expect(outcome).to.equal('released');
        });
      });
    });
  });

  describe('event', () => {
    const TEST_EVENTS = {
      [EVENTS.AUCTION_INIT]: 'onAuctionInitEvent',
      [EVENTS.AUCTION_END]: 'onAuctionEndEvent',
      [EVENTS.BID_RESPONSE]: 'onBidResponseEvent',
      [EVENTS.BID_REQUESTED]: 'onBidRequestEvent'
    };
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

    function eventHandlingProvider(name) {
      const provider = {
        name: name,
        init: () => true,
      };
      Object.values(TEST_EVENTS).forEach((ev) => provider[ev] = sinon.spy());
      return provider;
    }

    beforeEach(() => {
      providers = [eventHandlingProvider('tp1'), eventHandlingProvider('tp2')];
      providers.forEach((provider) => rtdModule.attachRealTimeDataProvider(provider));
      rtdModule.init(config);
      config.setConfig(conf);
    });

    afterEach(() => {
      providers.forEach((provider) => rtdModule.detachRealTimeDataProvider(provider));
      config.resetConfig();
    });

    it('should set targeting for auctionEnd', () => {
      providers.forEach(p => p.getTargetingData = sinon.spy());
      const auction = {
        adUnitCodes: ['a1'],
        adUnits: [{ code: 'a1' }]
      };
      mockEmitEvent(EVENTS.AUCTION_END, auction);
      providers.forEach(p => {
        expect(p.getTargetingData.calledWith(auction.adUnitCodes)).to.be.true;
      });
    });

    Object.entries(TEST_EVENTS).forEach(([event, hook]) => {
      it(`'${event}' should be propagated to providers through '${hook}'`, () => {
        const eventArg = {};
        mockEmitEvent(event, eventArg);
        providers.forEach((provider) => {
          const providerConf = conf.realTimeData.dataProviders.find((cfg) => cfg.name === provider.name);
          expect(provider[hook].called).to.be.true;
          expect(provider[hook].args).to.have.length(1);
          expect(provider[hook].args[0]).to.include.members([eventArg, providerConf]);
        });
      });

      it(`${event} should not fail to propagate elsewhere if a provider throws in its event handler`, () => {
        providers[0][hook] = function () { throw new Error(); };
        mockEmitEvent(event);
        expect(providers[1][hook].called).to.be.true;
      });
    });
  });

  describe('data deletion requests', () => {
    let detach = () => null;

    function mkRtdModule(name) {
      const mod = {
        name,
        init: () => true,
        onDataDeletionRequest: sinon.stub()
      };
      attachRealTimeDataProvider(mod);
      detach = ((orig) => function () {
        orig();
        detachRealTimeDataProvider(mod);
      })(detach);
      return mod;
    }
    let sm1, sm2, cfg1, cfg2;
    beforeEach(() => {
      sm1 = mkRtdModule('mockMod1');
      sm2 = mkRtdModule('mockMod2');
      cfg1 = {
        name: 'mockMod1',
        i: 0
      };
      cfg2 = {
        name: 'mockMod2',
        i: 1
      };
      rtdModule.init(config);
      config.setConfig({
        realTimeData: {
          dataProviders: [cfg1, cfg2],
        }
      });
    });
    afterEach(() => {
      detach();
      config.resetConfig();
    });

    it('calls onDataDeletionRequest on submodules', () => {
      const next = sinon.stub();
      onDataDeletionRequest(next, { a: 0 });
      sinon.assert.calledWith(next, { a: 0 });
      sinon.assert.calledWith(sm1.onDataDeletionRequest, cfg1);
      sinon.assert.calledWith(sm2.onDataDeletionRequest, cfg2);
    });

    describe('does not choke if onDataDeletionRequest', () => {
      Object.entries({
        'is missing': () => { delete sm1.onDataDeletionRequest; },
        'throws': () => { sm1.onDataDeletionRequest.throws(new Error()); }
      }).forEach(([t, setup]) => {
        it(t, () => {
          setup();
          onDataDeletionRequest(sinon.stub());
          sinon.assert.calledWith(sm2.onDataDeletionRequest, cfg2);
        });
      });
    });
  });

  describe('provider registration', () => {
    let attached;

    function mockProvider(name, initResponse = true) {
      return {
        name,
        init: sinon.stub().returns(initResponse),
        getBidRequestData: sinon.stub().callsFake((req, done) => done())
      };
    }

    function attach(provider) {
      rtdModule.attachRealTimeDataProvider(provider);
      attached.push(provider);
      return provider;
    }

    function configure(...providerConfigs) {
      rtdModule.init(config);
      config.setConfig({
        realTimeData: {
          dataProviders: providerConfigs.map((cfg) => typeof cfg === 'string' ? { name: cfg } : cfg)
        }
      });
    }

    beforeEach(() => {
      attached = [];
    });

    afterEach(() => {
      attached.forEach((provider) => rtdModule.detachRealTimeDataProvider(provider));
      config.resetConfig();
      // `dataProviders` is kept in module scope and is not cleared by resetConfig; blank it out
      // so that it does not leak into unrelated tests
      configure();
      config.resetConfig();
    });

    describe('activates a provider that registers', () => {
      it('before configuration', () => {
        const provider = attach(mockProvider('beforeConfig'));
        configure('beforeConfig');
        sinon.assert.called(provider.init);
        expect(rtdModule.subModules).to.include(provider);
      });

      it('after configuration', () => {
        configure('afterConfig');
        const provider = attach(mockProvider('afterConfig'));
        sinon.assert.called(provider.init);
        expect(rtdModule.subModules).to.include(provider);
      });
    });

    it('passes the provider its configuration when it registers after configuration', () => {
      const cfg = { name: 'lateWithConfig', params: { key: 'value' } };
      configure(cfg);
      const provider = attach(mockProvider('lateWithConfig'));
      sinon.assert.calledWith(provider.init, cfg);
      expect(provider.config).to.eql(cfg);
    });

    it('runs a provider that registered after configuration on the next auction', (done) => {
      configure('lateForAuction');
      const provider = attach(mockProvider('lateForAuction'));
      rtdModule.setBidRequestsData(() => {
        sinon.assert.called(provider.getBidRequestData);
        done();
      }, { bidRequest: {} });
    });

    it('keeps providers in configuration order when one registers late', () => {
      const first = attach(mockProvider('first'));
      configure('first', 'second');
      const second = attach(mockProvider('second'));
      expect(rtdModule.subModules).to.eql([first, second]);
    });

    it('does not re-initialize providers when another one registers late', () => {
      const early = attach(mockProvider('early'));
      configure('early', 'late');
      sinon.assert.calledOnce(early.init);
      attach(mockProvider('late'));
      sinon.assert.calledOnce(early.init);
    });

    it('does not activate or retry a provider whose init fails', () => {
      configure('failing', 'other');
      const failing = attach(mockProvider('failing', false));
      expect(rtdModule.subModules).to.not.include(failing);
      sinon.assert.calledOnce(failing.init);
      attach(mockProvider('other'));
      sinon.assert.calledOnce(failing.init);
    });

    it('does not let a provider that throws in init keep the others from initializing', () => {
      const throwing = attach(mockProvider('throwing'));
      throwing.init.throws(new Error('this provider is broken'));
      const other = attach(mockProvider('other'));
      configure('throwing', 'other');
      expect(rtdModule.subModules).to.not.include(throwing);
      expect(rtdModule.subModules).to.include(other);
    });

    it('does not activate a provider that is registered but not configured', () => {
      configure('configured');
      const unconfigured = attach(mockProvider('unconfigured'));
      sinon.assert.notCalled(unconfigured.init);
      expect(rtdModule.subModules).to.not.include(unconfigured);
    });

    it('ignores a second registration under the same name', () => {
      configure('dupe');
      const first = attach(mockProvider('dupe'));
      const second = attach(mockProvider('dupe'));
      sinon.assert.notCalled(second.init);
      expect(rtdModule.subModules).to.eql([first]);
    });

    it('re-initializes a provider that is registered again after detaching', () => {
      configure('reattach');
      const provider = mockProvider('reattach');
      rtdModule.attachRealTimeDataProvider(provider);
      rtdModule.detachRealTimeDataProvider(provider);
      expect(rtdModule.subModules).to.not.include(provider);
      attach(provider);
      sinon.assert.calledTwice(provider.init);
      expect(rtdModule.subModules).to.include(provider);
    });

    describe('logging', () => {
      let logInfoStub;

      beforeEach(() => {
        logInfoStub = sinon.stub(utils, 'logInfo');
      });

      afterEach(() => {
        logInfoStub.restore();
      });

      function messages(prefix) {
        return logInfoStub.args
          .map(([msg]) => msg)
          .filter((msg) => typeof msg === 'string' && msg.startsWith(prefix));
      }

      const announcements = () => messages('Real time data module enabled');
      const enablements = () => messages('Real time data module: enabling submodule');

      describe('announces the enabled submodules once', () => {
        it('listing the providers that registered before configuration', () => {
          attach(mockProvider('one'));
          attach(mockProvider('two'));
          configure('one', 'two');
          expect(announcements()).to.have.length(1);
          expect(announcements()[0]).to.contain('one').and.to.contain('two');
        });

        it('without repeating it for each provider that registers after configuration', () => {
          configure('one', 'two');
          attach(mockProvider('one'));
          attach(mockProvider('two'));
          expect(announcements()).to.have.length(1);
          expect(announcements()[0]).to.not.contain('one');
          expect(announcements()[0]).to.not.contain('two');
        });
      });

      describe('announces each provider enabled after configuration', () => {
        it('as it is enabled, rather than in configuration order', () => {
          configure('one', 'two');
          attach(mockProvider('two'));
          attach(mockProvider('one'));
          expect(enablements()).to.eql([
            'Real time data module: enabling submodule two',
            'Real time data module: enabling submodule one'
          ]);
        });

        it('only once per provider', () => {
          configure('one', 'two');
          attach(mockProvider('one'));
          attach(mockProvider('two'));
          expect(enablements().filter((msg) => msg.endsWith('one'))).to.have.length(1);
        });

        it('but not for providers already enabled at configuration time', () => {
          attach(mockProvider('one'));
          configure('one');
          expect(enablements()).to.be.empty;
        });

        it('but not for a provider whose init fails', () => {
          configure('failing');
          attach(mockProvider('failing', false));
          expect(enablements()).to.be.empty;
        });

        it('but not for a provider that is not configured', () => {
          configure('configured');
          attach(mockProvider('unconfigured'));
          expect(enablements()).to.be.empty;
        });
      });
    });

    it('installs a provider submitted through `submodule` after hooks are ready', () => {
      configure('viaSubmodule');
      const provider = mockProvider('viaSubmodule');
      submodule('realTimeData', provider);
      attached.push(provider);
      expect(rtdModule.subModules).to.include(provider);
    });
  });
});
