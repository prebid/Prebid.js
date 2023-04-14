import {
  attachIdSystem,
  auctionDelay,
  coreStorage,
  init,
  requestBidsHook,
  setStoredConsentData,
  setStoredValue,
  setSubmoduleRegistry,
  syncDelay,
  PBJS_USER_ID_OPTOUT_NAME,
  findRootDomain, requestDataDeletion,
} from 'modules/userId/index.js';
import {createEidsArray} from 'modules/userId/eids.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import * as events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import {getGlobal} from 'src/prebidGlobal.js';
import {
  resetConsentData,
} from 'modules/consentManagement.js';
import {server} from 'test/mocks/xhr.js';
import {find} from 'src/polyfill.js';
import {unifiedIdSubmodule} from 'modules/unifiedIdSystem.js';
import {britepoolIdSubmodule} from 'modules/britepoolIdSystem.js';
import {id5IdSubmodule} from 'modules/id5IdSystem.js';
import {identityLinkSubmodule} from 'modules/identityLinkIdSystem.js';
import {dmdIdSubmodule} from 'modules/dmdIdSystem.js';
import {liveIntentIdSubmodule, setEventFiredFlag as liveIntentIdSubmoduleDoNotFireEvent} from 'modules/liveIntentIdSystem.js';
import {merkleIdSubmodule} from 'modules/merkleIdSystem.js';
import {netIdSubmodule} from 'modules/netIdSystem.js';
import {intentIqIdSubmodule} from 'modules/intentIqIdSystem.js';
import {zeotapIdPlusSubmodule} from 'modules/zeotapIdPlusIdSystem.js';
import {sharedIdSystemSubmodule} from 'modules/sharedIdSystem.js';
import {hadronIdSubmodule} from 'modules/hadronIdSystem.js';
import {pubProvidedIdSubmodule} from 'modules/pubProvidedIdSystem.js';
import {criteoIdSubmodule} from 'modules/criteoIdSystem.js';
import {mwOpenLinkIdSubModule} from 'modules/mwOpenLinkIdSystem.js';
import {tapadIdSubmodule} from 'modules/tapadIdSystem.js';
import {tncidSubModule} from 'modules/tncIdSystem.js';
import {getPrebidInternal} from 'src/utils.js';
import {uid2IdSubmodule} from 'modules/uid2IdSystem.js';
import {admixerIdSubmodule} from 'modules/admixerIdSystem.js';
import {deepintentDpesSubmodule} from 'modules/deepintentDpesIdSystem.js';
import {amxIdSubmodule} from '../../../modules/amxIdSystem.js';
import {kinessoIdSubmodule} from 'modules/kinessoIdSystem.js';
import {adqueryIdSubmodule} from 'modules/adqueryIdSystem.js';
import {imuIdSubmodule} from 'modules/imuIdSystem.js';
import * as mockGpt from '../integration/faker/googletag.js';
import 'src/prebid.js';
import {hook} from '../../../src/hook.js';
import {mockGdprConsent} from '../../helpers/consentData.js';
import {getPPID} from '../../../src/adserver.js';
import {uninstall as uninstallGdprEnforcement} from 'modules/gdprEnforcement.js';
import {GDPR_GVLIDS} from '../../../src/consentHandler.js';
import {MODULE_TYPE_UID} from '../../../src/activities/modules.js';

let assert = require('chai').assert;
let expect = require('chai').expect;
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';
const CONSENT_LOCAL_STORAGE_NAME = '_pbjs_userid_consent_data';

describe('User ID', function () {
  function getConfigMock(...configArrays) {
    return {
      userSync: {
        syncDelay: 0,
        userIds: configArrays.map(configArray => (configArray && configArray.length >= 3) ? getStorageMock.apply(null, configArray) : null)
      }
    }
  }

  function getStorageMock(name = 'pubCommonId', key = 'pubcid', type = 'cookie', expires = 30, refreshInSeconds) {
    return {name: name, storage: {name: key, type: type, expires: expires, refreshInSeconds: refreshInSeconds}}
  }

  function getConfigValueMock(name, value) {
    return {
      userSync: {syncDelay: 0, userIds: [{name: name, value: value}]}
    }
  }

  function getAdUnitMock(code = 'adUnit-code') {
    return {
      code,
      mediaTypes: {banner: {}, native: {}},
      sizes: [[300, 200], [300, 600]],
      bids: [{bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}, {bidder: 'anotherSampleBidder', params: {placementId: 'banner-only-bidder'}}]
    };
  }

  function addConfig(cfg, name, value) {
    if (cfg && cfg.userSync && cfg.userSync.userIds) {
      cfg.userSync.userIds.forEach(element => {
        if (element[name] !== undefined) {
          element[name] = Object.assign(element[name], value);
        } else {
          element[name] = value;
        }
      });
    }

    return cfg;
  }

  function findEid(eids, source) {
    return find(eids, (eid) => {
      if (eid.source === source) { return true; }
    });
  }

  let sandbox, consentData, startDelay, callbackDelay;

  function clearStack() {
    return new Promise((resolve) => setTimeout(resolve));
  }

  function delay() {
    const stub = sinon.stub().callsFake(() => new Promise((resolve) => {
      stub.resolve = () => {
        resolve();
        return clearStack();
      };
    }));
    return stub;
  }

  function runBidsHook(...args) {
    startDelay = delay();

    const result = requestBidsHook(...args, {delay: startDelay});
    return new Promise((resolve) => setTimeout(() => resolve(result)));
  }

  function expectImmediateBidHook(...args) {
    return runBidsHook(...args).then(() => {
      startDelay.calledWith(0);
      return startDelay.resolve();
    })
  }

  function initModule(config) {
    callbackDelay = delay();
    return init(config, {delay: callbackDelay});
  }

  before(function () {
    hook.ready();
    uninstallGdprEnforcement();
    localStorage.removeItem(PBJS_USER_ID_OPTOUT_NAME);
    liveIntentIdSubmoduleDoNotFireEvent();
  });

  beforeEach(function () {
    // TODO: this whole suite needs to be redesigned; it is passing by accident
    // some tests do not pass if consent data is available
    // (there are functions here with signature `getId(config, storedId)`, but storedId is actually consentData)
    // also, this file is ginormous; do we really need to test *all* id systems as one?
    resetConsentData();
    sandbox = sinon.sandbox.create();
    consentData = null;
    mockGdprConsent(sandbox, () => consentData);
    coreStorage.setCookie(CONSENT_LOCAL_STORAGE_NAME, '', EXPIRED_COOKIE_DATE);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('GVL IDs', () => {
    beforeEach(() => {
      sinon.stub(GDPR_GVLIDS, 'register');
    });
    afterEach(() => {
      GDPR_GVLIDS.register.restore();
    });

    it('are registered when ID submodule is registered', () => {
      attachIdSystem({name: 'gvlidMock', gvlid: 123});
      sinon.assert.calledWith(GDPR_GVLIDS.register, MODULE_TYPE_UID, 'gvlidMock', 123);
    })
  })

  describe('Decorate Ad Units', function () {
    beforeEach(function () {
      // reset mockGpt so nothing else interferes
      mockGpt.disable();
      mockGpt.enable();
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('pubcid_alt', 'altpubcid200000', (new Date(Date.now() + 5000).toUTCString()));
      let origSK = coreStorage.setCookie.bind(coreStorage);
      sinon.spy(coreStorage, 'setCookie');
      sinon.stub(utils, 'logWarn');
    });

    afterEach(function () {
      mockGpt.enable();
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      config.resetConfig();
      coreStorage.setCookie.restore();
      utils.logWarn.restore();
    });

    after(function () {
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('pubcid_alt', '', EXPIRED_COOKIE_DATE);
    });

    it('Check same cookie behavior', function () {
      let adUnits1 = [getAdUnitMock()];
      let adUnits2 = [getAdUnitMock()];
      let innerAdUnits1;
      let innerAdUnits2;

      let pubcid = coreStorage.getCookie('pubcid');
      expect(pubcid).to.be.null; // there should be no cookie initially

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));

      return expectImmediateBidHook(config => {
        innerAdUnits1 = config.adUnits
      }, {adUnits: adUnits1}).then(() => {
        pubcid = coreStorage.getCookie('pubcid'); // cookies is created after requestbidHook

        innerAdUnits1.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal(pubcid);
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'pubcid.org',
              uids: [{id: pubcid, atype: 1}]
            });
          });
        });

        return expectImmediateBidHook(config => {
          innerAdUnits2 = config.adUnits
        }, {adUnits: adUnits2}).then(() => {
          assert.deepEqual(innerAdUnits1, innerAdUnits2);
        });
      });
    });

    it('Check different cookies', function () {
      let adUnits1 = [getAdUnitMock()];
      let adUnits2 = [getAdUnitMock()];
      let innerAdUnits1;
      let innerAdUnits2;
      let pubcid1;
      let pubcid2;

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      return expectImmediateBidHook((config) => {
        innerAdUnits1 = config.adUnits
      }, {adUnits: adUnits1}).then(() => {
        pubcid1 = coreStorage.getCookie('pubcid'); // get first cookie
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE); // erase cookie

        innerAdUnits1.forEach((unit) => {
          unit.bids.forEach((bid) => {
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal(pubcid1);
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'pubcid.org',
              uids: [{id: pubcid1, atype: 1}]
            });
          });
        });

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);

        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
        return expectImmediateBidHook((config) => {
          innerAdUnits2 = config.adUnits
        }, {adUnits: adUnits2}).then(() => {
          pubcid2 = coreStorage.getCookie('pubcid'); // get second cookie

          innerAdUnits2.forEach((unit) => {
            unit.bids.forEach((bid) => {
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal(pubcid2);
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'pubcid.org',
                uids: [{id: pubcid2, atype: 1}]
              });
            });
          });

          expect(pubcid1).to.not.equal(pubcid2);
        });
      });
    });

    it('Use existing cookie', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']));
      return expectImmediateBidHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits}).then(() => {
        innerAdUnits.forEach((unit) => {
          unit.bids.forEach((bid) => {
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('altpubcid200000');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'pubcid.org',
              uids: [{id: 'altpubcid200000', atype: 1}]
            });
          });
        });
        // Because the consent cookie doesn't exist yet, we'll have 2 setCookie calls:
        // 1) for the consent cookie
        // 2) from the getId() call that results in a new call to store the results
        expect(coreStorage.setCookie.callCount).to.equal(2);
      });
    });

    it('Extend cookie', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customConfig = getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {extend: true});

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule]);

      config.setConfig(customConfig);
      return expectImmediateBidHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits}).then(() => {
        innerAdUnits.forEach((unit) => {
          unit.bids.forEach((bid) => {
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('altpubcid200000');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'pubcid.org',
              uids: [{id: 'altpubcid200000', atype: 1}]
            });
          });
        });
        expect(coreStorage.setCookie.callCount).to.equal(2);
      });
    });

    it('Disable auto create', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customConfig = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {create: false});

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule]);

      config.setConfig(customConfig);
      return expectImmediateBidHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits}).then(() => {
        innerAdUnits.forEach((unit) => {
          unit.bids.forEach((bid) => {
            expect(bid).to.not.have.deep.nested.property('userId.pubcid');
            expect(bid).to.not.have.deep.nested.property('userIdAsEids');
          });
        });
        // setCookie is called once in order to store consentData
        expect(coreStorage.setCookie.callCount).to.equal(1);
      });
    });

    it('pbjs.getUserIds', function (done) {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      const ids = {pubcid: '11111'};
      config.setConfig({
        userSync: {
          auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
          userIds: [{
            name: 'pubCommonId', value: ids
          }]
        }
      });
      getGlobal().getUserIdsAsync().then((uids) => {
        expect(uids).to.deep.equal(ids);
        expect(getGlobal().getUserIds()).to.deep.equal(ids);
        done();
      })
    });

    it('pbjs.getUserIdsAsEids', function (done) {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      const ids = {'pubcid': '11111'};
      config.setConfig({
        userSync: {
          auctionDelay: 10,
          userIds: [{
            name: 'pubCommonId', value: ids
          }]
        }
      });
      getGlobal().getUserIdsAsync().then((ids) => {
        expect(getGlobal().getUserIdsAsEids()).to.deep.equal(createEidsArray(ids));
        done();
      });
    });

    it('should set googletag ppid correctly', function () {
      let adUnits = [getAdUnitMock()];
      init(config);
      setSubmoduleRegistry([amxIdSubmodule, sharedIdSystemSubmodule, identityLinkSubmodule, imuIdSubmodule]);

      // before ppid should not be set
      expect(window.googletag._ppid).to.equal(undefined);

      config.setConfig({
        userSync: {
          ppid: 'pubcid.org',
          userIds: [
            { name: 'amxId', value: {'amxId': 'amx-id-value-amx-id-value-amx-id-value'} },
            { name: 'pubCommonId', value: {'pubcid': 'pubCommon-id-value-pubCommon-id-value'} },
            { name: 'identityLink', value: {'idl_env': 'identityLink-id-value-identityLink-id-value'} },
            { name: 'imuid', value: {'imppid': 'imppid-value-imppid-value-imppid-value'} },
          ]
        }
      });
      return expectImmediateBidHook(() => {}, {adUnits}).then(() => {
        // ppid should have been set without dashes and stuff
        expect(window.googletag._ppid).to.equal('pubCommonidvaluepubCommonidvalue');
      });
    });

    describe('submodule callback', () => {
      const TEST_KEY = 'testKey';

      function setVal(val) {
        if (val) {
          coreStorage.setDataInLocalStorage(TEST_KEY, val);
          coreStorage.setDataInLocalStorage(TEST_KEY + '_exp', '');
        } else {
          coreStorage.removeDataFromLocalStorage(TEST_KEY);
          coreStorage.removeDataFromLocalStorage(TEST_KEY + '_exp');
        }
      }
      afterEach(() => {
        setVal(null);
      })

      it('should be able to re-read ID changes', (done) => {
        setVal(null);
        init(config);
        setSubmoduleRegistry([{
          name: 'mockId',
          getId: function (_1, _2, storedId) {
            expect(storedId).to.not.exist;
            setVal('laterValue');
            return {
              callback(_, readId) {
                expect(readId()).to.eql('laterValue');
                done();
              }
            }
          },
          decode(d) {
            return d
          }
        }]);
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [
              {
                name: 'mockId',
                storage: {
                  type: 'html5',
                  name: TEST_KEY
                }
              }
            ]
          }
        });
      });
    });

    it('should set PPID when the source needs to call out to the network', () => {
      let adUnits = [getAdUnitMock()];
      init(config);
      const callback = sinon.stub();
      setSubmoduleRegistry([{
        name: 'sharedId',
        getId: function () {
          return {callback}
        },
        decode(d) {
          return d
        }
      }]);
      config.setConfig({
        userSync: {
          ppid: 'pubcid.org',
          auctionDelay: 10,
          userIds: [
            {
              name: 'sharedId',
            }
          ]
        }
      });
      return expectImmediateBidHook(() => {}, {adUnits}).then(() => {
        expect(window.googletag._ppid).to.be.undefined;
        const uid = 'thismustbelongerthan32characters'
        callback.yield({pubcid: uid});
        expect(window.googletag._ppid).to.equal(uid);
      });
    });

    it('should set googletag ppid correctly for imuIdSubmodule', function () {
      let adUnits = [getAdUnitMock()];
      init(config);
      setSubmoduleRegistry([imuIdSubmodule]);

      // before ppid should not be set
      expect(window.googletag._ppid).to.equal(undefined);

      config.setConfig({
        userSync: {
          ppid: 'ppid.intimatemerger.com',
          userIds: [
            { name: 'imuid', value: {'imppid': 'imppid-value-imppid-value-imppid-value'} },
          ]
        }
      });

      return expectImmediateBidHook(() => {}, {adUnits}).then(() => {
        // ppid should have been set without dashes and stuff
        expect(window.googletag._ppid).to.equal('imppidvalueimppidvalueimppidvalue');
      });
    });

    it('should log a warning if PPID too big or small', function () {
      let adUnits = [getAdUnitMock()];

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig({
        userSync: {
          ppid: 'pubcid.org',
          userIds: [
            { name: 'pubCommonId', value: {'pubcid': 'pubcommonIdValue'} },
          ]
        }
      });
      // before ppid should not be set
      expect(window.googletag._ppid).to.equal(undefined);
      return expectImmediateBidHook(() => {}, {adUnits}).then(() => {
        // ppid should NOT have been set
        expect(window.googletag._ppid).to.equal(undefined);
        // a warning should have been emmited
        expect(utils.logWarn.args[0][0]).to.exist.and.to.contain('User ID - Googletag Publisher Provided ID for pubcid.org is not between 32 and 150 characters - pubcommonIdValue');
      });
    });

    it('should make PPID available to core', () => {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      const id = 'thishastobelongerthan32characters';
      config.setConfig({
        userSync: {
          ppid: 'pubcid.org',
          userIds: [
            { name: 'pubCommonId', value: {'pubcid': id} },
          ]
        }
      });
      return getGlobal().refreshUserIds().then(() => {
        expect(getPPID()).to.eql(id);
      })
    });

    describe('refreshing before init is complete', () => {
      const MOCK_ID = {'MOCKID': '1111'};
      let mockIdCallback;
      let startInit;

      beforeEach(() => {
        mockIdCallback = sinon.stub();
        let mockIdSystem = {
          name: 'mockId',
          decode: function(value) {
            return {
              'mid': value['MOCKID']
            };
          },
          getId: sinon.stub().returns({callback: mockIdCallback})
        };
        init(config);
        setSubmoduleRegistry([mockIdSystem]);
        startInit = () => config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [{
              name: 'mockId',
              storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });
      });

      it('should still resolve promises returned by getUserIdsAsync', () => {
        startInit();
        let result = null;
        getGlobal().getUserIdsAsync().then((val) => { result = val; });
        return clearStack().then(() => {
          expect(result).to.equal(null); // auction has not ended, callback should not have been called
          mockIdCallback.callsFake((cb) => cb(MOCK_ID));
          return getGlobal().refreshUserIds().then(clearStack);
        }).then(() => {
          expect(result).to.deep.equal(getGlobal().getUserIds()) // auction still not over, but refresh was explicitly forced
        });
      });

      it('should not stop auctions', (done) => {
        // simulate an infinite `auctionDelay`; refreshing should still allow the auction to continue
        // as soon as ID submodules have completed init
        startInit();
        requestBidsHook(() => {
          done();
        }, {adUnits: [getAdUnitMock()]}, {delay: delay()});
        getGlobal().refreshUserIds();
        clearStack().then(() => {
          // simulate init complete
          mockIdCallback.callArg(0, {id: {MOCKID: '1111'}});
        });
      });

      it('should continue the auction when init fails', (done) => {
        startInit();
        requestBidsHook(() => {
          done();
        },
        {adUnits: [getAdUnitMock()]},
        {
          delay: delay(),
          getIds: () => Promise.reject(new Error())
        }
        );
      })

      it('should not get stuck when init fails', () => {
        const err = new Error();
        mockIdCallback.callsFake(() => { throw err; });
        startInit();
        return getGlobal().getUserIdsAsync().catch((e) =>
          expect(e).to.equal(err)
        );
      });
    });

    describe('when ID systems throw errors', () => {
      function mockIdSystem(name) {
        return {
          name,
          decode: function(value) {
            return {
              [name]: value
            };
          },
          getId: sinon.stub().callsFake(() => ({id: name}))
        };
      }
      let id1, id2;
      beforeEach(() => {
        id1 = mockIdSystem('mock1');
        id2 = mockIdSystem('mock2');
        init(config);
        setSubmoduleRegistry([id1, id2]);
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [{
              name: 'mock1',
              storage: {name: 'mock1', type: 'cookie'}
            }, {
              name: 'mock2',
              storage: {name: 'mock2', type: 'cookie'}
            }]
          }
        })
      });
      afterEach(() => {
        config.resetConfig();
      })
      Object.entries({
        'in init': () => id1.getId.callsFake(() => { throw new Error() }),
        'in callback': () => {
          const mockCallback = sinon.stub().callsFake(() => { throw new Error() });
          id1.getId.callsFake(() => ({callback: mockCallback}))
        }
      }).forEach(([t, setup]) => {
        describe(`${t}`, () => {
          beforeEach(setup);
          it('should still retrieve IDs that do not throw', () => {
            return getGlobal().getUserIdsAsync().then((uid) => {
              expect(uid.mock2).to.not.be.undefined;
            })
          });
        })
      })
    });
    it('pbjs.refreshUserIds updates submodules', function(done) {
      let sandbox = sinon.createSandbox();
      let mockIdCallback = sandbox.stub().returns({id: {'MOCKID': '1111'}});
      let mockIdSystem = {
        name: 'mockId',
        decode: function(value) {
          return {
            'mid': value['MOCKID']
          };
        },
        getId: mockIdCallback
      };
      init(config);
      setSubmoduleRegistry([mockIdSystem]);

      config.setConfig({
        userSync: {
          auctionDelay: 10,
          userIds: [{
            name: 'mockId',
            value: {id: {mockId: '1111'}}
          }]
        }
      });

      getGlobal().getUserIdsAsync().then((uids) => {
        expect(uids.id.mockId).to.equal('1111');
        // update to new config value
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [{
              name: 'mockId',
              value: {id: {mockId: '1212'}}
            }]
          }
        });
        getGlobal().refreshUserIds({ submoduleNames: ['mockId'] }).then(() => {
          expect(getGlobal().getUserIds().id.mockId).to.equal('1212');
          done();
        });
      });
    });

    it('pbjs.refreshUserIds refreshes single', function() {
      coreStorage.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('REFRESH', '', EXPIRED_COOKIE_DATE);

      let sandbox = sinon.createSandbox();
      let mockIdCallback = sandbox.stub().returns({id: {'MOCKID': '1111'}});
      let refreshUserIdsCallback = sandbox.stub();

      let mockIdSystem = {
        name: 'mockId',
        decode: function(value) {
          return {
            'mid': value['MOCKID']
          };
        },
        getId: mockIdCallback
      };

      let refreshedIdCallback = sandbox.stub().returns({id: {'REFRESH': '1111'}});

      let refreshedIdSystem = {
        name: 'refreshedId',
        decode: function(value) {
          return {
            'refresh': value['REFRESH']
          };
        },
        getId: refreshedIdCallback
      };

      init(config);
      setSubmoduleRegistry([refreshedIdSystem, mockIdSystem]);

      config.setConfig({
        userSync: {
          auctionDelay: 10,
          userIds: [
            {
              name: 'mockId',
              storage: {name: 'MOCKID', type: 'cookie'},
            },
            {
              name: 'refreshedId',
              storage: {name: 'refreshedid', type: 'cookie'},
            }
          ]
        }
      });

      return getGlobal().refreshUserIds({submoduleNames: 'refreshedId'}, refreshUserIdsCallback).then(() => {
        expect(refreshedIdCallback.callCount).to.equal(2);
        expect(mockIdCallback.callCount).to.equal(1);
        expect(refreshUserIdsCallback.callCount).to.equal(1);
      });
    });
  });

  describe('Opt out', function () {
    before(function () {
      coreStorage.setCookie(PBJS_USER_ID_OPTOUT_NAME, '1', (new Date(Date.now() + 5000).toUTCString()));
    });

    beforeEach(function () {
      sinon.stub(utils, 'logInfo');
    });

    afterEach(function () {
      // removed cookie
      coreStorage.setCookie(PBJS_USER_ID_OPTOUT_NAME, '', EXPIRED_COOKIE_DATE);
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      utils.logInfo.restore();
      config.resetConfig();
    });

    it('does not fetch ids if opt out cookie exists', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      const cfg = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      cfg.userSync.auctionDelay = 1; // to let init complete without an auction
      config.setConfig(cfg);
      return getGlobal().getUserIdsAsync().then((uid) => {
        expect(uid).to.eql({});
      })
    });

    it('initializes if no opt out cookie exists', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      expect(utils.logInfo.args[0][0]).to.exist.and.to.contain('User ID - usersync config updated for 1 submodules');
    });
  });

  describe('Handle variations of config values', function () {
    beforeEach(function () {
      sinon.stub(utils, 'logInfo');
    });

    afterEach(function () {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      utils.logInfo.restore();
      config.resetConfig();
    });

    it('handles config with no usersync object', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, mwOpenLinkIdSubModule, tapadIdSubmodule, uid2IdSubmodule, admixerIdSubmodule, deepintentDpesSubmodule, amxIdSubmodule, kinessoIdSubmodule, adqueryIdSubmodule]);
      config.setConfig({});
      // usersync is undefined, and no logInfo message for 'User ID - usersync config updated'
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with empty usersync object', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, mwOpenLinkIdSubModule, tapadIdSubmodule, uid2IdSubmodule, admixerIdSubmodule, deepintentDpesSubmodule, amxIdSubmodule, kinessoIdSubmodule, adqueryIdSubmodule]);
      config.setConfig({userSync: {}});
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds that are empty objs', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, mwOpenLinkIdSubModule, tapadIdSubmodule, uid2IdSubmodule, admixerIdSubmodule, deepintentDpesSubmodule, dmdIdSubmodule, amxIdSubmodule, kinessoIdSubmodule, adqueryIdSubmodule]);
      config.setConfig({
        userSync: {
          userIds: [{}]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds with empty names or that dont match a submodule.name', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, mwOpenLinkIdSubModule, tapadIdSubmodule, uid2IdSubmodule, admixerIdSubmodule, deepintentDpesSubmodule, dmdIdSubmodule, amxIdSubmodule, kinessoIdSubmodule, adqueryIdSubmodule]);
      config.setConfig({
        userSync: {
          userIds: [{
            name: '',
            value: {test: '1'}
          }, {
            name: 'foo',
            value: {test: '1'}
          }]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('config with 1 configurations should create 1 submodules', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, mwOpenLinkIdSubModule, tapadIdSubmodule, uid2IdSubmodule, admixerIdSubmodule, deepintentDpesSubmodule, amxIdSubmodule, kinessoIdSubmodule, adqueryIdSubmodule]);
      config.setConfig(getConfigMock(['unifiedId', 'unifiedid', 'cookie']));

      expect(utils.logInfo.args[0][0]).to.exist.and.to.contain('User ID - usersync config updated for 1 submodules');
    });

    it('handles config with name in different case', function () {
      init(config);
      setSubmoduleRegistry([criteoIdSubmodule]);
      config.setConfig({
        userSync: {
          userIds: [{
            name: 'Criteo'
          }]
        }
      });

      expect(utils.logInfo.args[0][0]).to.exist.and.to.contain('User ID - usersync config updated for 1 submodules');
    });

    it('config with 22 configurations should result in 22 submodules add', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, liveIntentIdSubmodule, britepoolIdSubmodule, netIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, hadronIdSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, mwOpenLinkIdSubModule, tapadIdSubmodule, uid2IdSubmodule, admixerIdSubmodule, deepintentDpesSubmodule, dmdIdSubmodule, amxIdSubmodule, kinessoIdSubmodule, adqueryIdSubmodule, tncidSubModule]);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubProvidedId'
          }, {
            name: 'pubCommonId', value: {'pubcid': '11111'}
          }, {
            name: 'unifiedId',
            storage: {name: 'unifiedid', type: 'cookie'}
          }, {
            name: 'id5Id',
            storage: {name: 'id5id', type: 'cookie'}
          }, {
            name: 'identityLink',
            storage: {name: 'idl_env', type: 'cookie'}
          }, {
            name: 'liveIntentId',
            storage: {name: '_li_pbid', type: 'cookie'}
          }, {
            name: 'britepoolId',
            value: {'primaryBPID': '279c0161-5152-487f-809e-05d7f7e653fd'}
          }, {
            name: 'netId',
            storage: {name: 'netId', type: 'cookie'}
          }, {
            name: 'intentIqId',
            storage: {name: 'intentIqId', type: 'cookie'}
          }, {
            name: 'hadronId',
            storage: {name: 'hadronId', type: 'html5'}
          }, {
            name: 'zeotapIdPlus'
          }, {
            name: 'criteo'
          }, {
            name: 'mwOpenLinkId'
          }, {
            name: 'tapadId',
            storage: {name: 'tapad_id', type: 'cookie'}
          }, {
            name: 'uid2'
          }, {
            name: 'admixerId',
            storage: {name: 'admixerId', type: 'cookie'}
          }, {
            name: 'deepintentId',
            storage: {name: 'deepintentId', type: 'cookie'}
          }, {
            name: 'dmdId',
            storage: {name: 'dmdId', type: 'cookie'}
          }, {
            name: 'amxId',
            storage: {name: 'amxId', type: 'html5'}
          }, {
            name: 'kpuid',
            storage: {name: 'kpuid', type: 'cookie'}
          }, {
            name: 'qid',
            storage: {name: 'qid', type: 'html5'}
          }, {
            name: 'tncId'
          }]
        }
      });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.contain('User ID - usersync config updated for 22 submodules');
    });

    it('config syncDelay updates module correctly', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, hadronIdSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, mwOpenLinkIdSubModule, tapadIdSubmodule, uid2IdSubmodule, admixerIdSubmodule, deepintentDpesSubmodule, dmdIdSubmodule, amxIdSubmodule, kinessoIdSubmodule, adqueryIdSubmodule]);
      config.setConfig({
        userSync: {
          syncDelay: 99,
          userIds: [{
            name: 'unifiedId',
            storage: {name: 'unifiedid', type: 'cookie'}
          }]
        }
      });
      expect(syncDelay).to.equal(99);
    });

    it('config auctionDelay updates module correctly', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, hadronIdSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, mwOpenLinkIdSubModule, tapadIdSubmodule, uid2IdSubmodule, admixerIdSubmodule, deepintentDpesSubmodule, dmdIdSubmodule, amxIdSubmodule, kinessoIdSubmodule, adqueryIdSubmodule]);
      config.setConfig({
        userSync: {
          auctionDelay: 100,
          userIds: [{
            name: 'unifiedId',
            storage: {name: 'unifiedid', type: 'cookie'}
          }]
        }
      });
      expect(auctionDelay).to.equal(100);
    });

    it('config auctionDelay defaults to 0 if not a number', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, hadronIdSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, mwOpenLinkIdSubModule, tapadIdSubmodule, uid2IdSubmodule, admixerIdSubmodule, deepintentDpesSubmodule, dmdIdSubmodule, amxIdSubmodule, kinessoIdSubmodule, adqueryIdSubmodule]);
      config.setConfig({
        userSync: {
          auctionDelay: '',
          userIds: [{
            name: 'unifiedId',
            storage: {name: 'unifiedid', type: 'cookie'}
          }]
        }
      });
      expect(auctionDelay).to.equal(0);
    });

    describe('auction and user sync delays', function () {
      let sandbox;
      let adUnits;
      let mockIdCallback;
      let auctionSpy;

      beforeEach(function () {
        sandbox = sinon.createSandbox();
        sandbox.stub(events, 'on');
        sandbox.stub(coreStorage, 'getCookie');

        // remove cookie
        coreStorage.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);

        adUnits = [getAdUnitMock()];

        auctionSpy = sandbox.spy();
        mockIdCallback = sandbox.stub();
        const mockIdSystem = {
          name: 'mockId',
          decode: function (value) {
            return {
              'mid': value['MOCKID']
            };
          },
          getId: function () {
            const storedId = coreStorage.getCookie('MOCKID');
            if (storedId) {
              return {id: {'MOCKID': storedId}};
            }
            return {callback: mockIdCallback};
          }
        };
        initModule(config);
        attachIdSystem(mockIdSystem, true);
      });

      afterEach(function () {
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        config.resetConfig();
        sandbox.restore();
      });

      it('delays auction if auctionDelay is set, timing out at auction delay', function () {
        config.setConfig({
          userSync: {
            auctionDelay: 33,
            syncDelay: 77,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        return runBidsHook(auctionSpy, {adUnits}).then(() => {
          // check auction was delayed
          startDelay.calledWith(33);
          auctionSpy.calledOnce.should.equal(false);

          // check ids were fetched
          mockIdCallback.calledOnce.should.equal(true);

          // mock timeout
          return startDelay.resolve();
        }).then(() => {
          auctionSpy.calledOnce.should.equal(true);

          // does not call auction again once ids are synced
          mockIdCallback.callArgWith(0, {'MOCKID': '1234'});
          auctionSpy.calledOnce.should.equal(true);

          // no sync after auction ends
          events.on.called.should.equal(false);
        });
      });

      it('delays auction if auctionDelay is set, continuing auction if ids are fetched before timing out', function () {
        config.setConfig({
          userSync: {
            auctionDelay: 33,
            syncDelay: 77,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        return runBidsHook(auctionSpy, {adUnits}).then(() => {
          // check auction was delayed
          startDelay.calledWith(33);
          auctionSpy.calledOnce.should.equal(false);

          // check ids were fetched
          mockIdCallback.calledOnce.should.equal(true);

          // if ids returned, should continue auction
          mockIdCallback.callArgWith(0, {'MOCKID': '1234'});
          return clearStack();
        }).then(() => {
          auctionSpy.calledOnce.should.equal(true);

          // check ids were copied to bids
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.mid');
              expect(bid.userId.mid).to.equal('1234');
              expect(bid.userIdAsEids.length).to.equal(0);// "mid" is an un-known submodule for USER_IDS_CONFIG in eids.js
            });
          });

          // no sync after auction ends
          events.on.called.should.equal(false);
        });
      });

      it('does not delay auction if not set, delays id fetch after auction ends with syncDelay', function () {
        config.setConfig({
          userSync: {
            syncDelay: 77,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        // check config has been set correctly
        expect(auctionDelay).to.equal(0);
        expect(syncDelay).to.equal(77);

        return expectImmediateBidHook(auctionSpy, {adUnits})
          .then(() => {
            // should not delay auction
            auctionSpy.calledOnce.should.equal(true);

            // check user sync is delayed after auction is ended
            mockIdCallback.calledOnce.should.equal(false);
            events.on.calledOnce.should.equal(true);
            events.on.calledWith(CONSTANTS.EVENTS.AUCTION_END, sinon.match.func);

            // once auction is ended, sync user ids after delay
            events.on.callArg(1);
            callbackDelay.calledWith(77);
            mockIdCallback.calledOnce.should.equal(false);

            return callbackDelay.resolve();
          }).then(() => {
            // once sync delay is over, ids should be fetched
            mockIdCallback.calledOnce.should.equal(true);
          });
      });

      it('does not delay user id sync after auction ends if set to 0', function () {
        config.setConfig({
          userSync: {
            syncDelay: 0,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        expect(syncDelay).to.equal(0);

        return expectImmediateBidHook(auctionSpy, {adUnits})
          .then(() => {
            // auction should not be delayed
            auctionSpy.calledOnce.should.equal(true);

            // sync delay after auction is ended
            mockIdCallback.calledOnce.should.equal(false);
            events.on.calledOnce.should.equal(true);
            events.on.calledWith(CONSTANTS.EVENTS.AUCTION_END, sinon.match.func);

            // once auction is ended, if no sync delay, fetch ids
            events.on.callArg(1);
            callbackDelay.calledWith(0);
            return callbackDelay.resolve();
          }).then(() => {
            mockIdCallback.calledOnce.should.equal(true);
          });
      });

      it('does not delay auction if there are no ids to fetch', function () {
        coreStorage.getCookie.withArgs('MOCKID').returns('123456778');
        config.setConfig({
          userSync: {
            auctionDelay: 33,
            syncDelay: 77,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        return runBidsHook(auctionSpy, {adUnits}).then(() => {
          auctionSpy.calledOnce.should.equal(true);
          mockIdCallback.calledOnce.should.equal(false);

          // no sync after auction ends
          events.on.called.should.equal(false);
        });
      });
    });

    describe('Request bids hook appends userId to bid objs in adapters', function () {
      let adUnits;

      beforeEach(function () {
        adUnits = [getAdUnitMock()];
      });

      it('test hook from pubcommonid cookie', function (done) {
        coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 100000).toUTCString()));

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal('testpubcid');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'pubcid.org',
                uids: [{id: 'testpubcid', atype: 1}]
              });
            });
          });
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from pubcommonid html5', function (done) {
        // simulate existing browser local storage values
        localStorage.setItem('pubcid', 'testpubcid');
        localStorage.setItem('pubcid_exp', new Date(Date.now() + 100000).toUTCString());

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'html5']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal('testpubcid');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'pubcid.org',
                uids: [{id: 'testpubcid', atype: 1}]
              });
            });
          });
          localStorage.removeItem('pubcid');
          localStorage.removeItem('pubcid_exp');
          done();
        }, {adUnits});
      });

      it('test hook from pubcommonid config value object', function (done) {
        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigValueMock('pubCommonId', {'pubcidvalue': 'testpubcidvalue'}));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubcidvalue');
              expect(bid.userId.pubcidvalue).to.equal('testpubcidvalue');
              expect(bid.userIdAsEids.length).to.equal(0);// "pubcidvalue" is an un-known submodule for USER_IDS_CONFIG in eids.js
            });
          });
          done();
        }, {adUnits});
      });

      it('test hook from UnifiedId html5', function (done) {
        // simulate existing browser local storage values
        localStorage.setItem('unifiedid_alt', JSON.stringify({'TDID': 'testunifiedid_alt'}));
        localStorage.setItem('unifiedid_alt_exp', '');

        init(config);
        setSubmoduleRegistry([unifiedIdSubmodule]);
        config.setConfig(getConfigMock(['unifiedId', 'unifiedid_alt', 'html5']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.tdid');
              expect(bid.userId.tdid).to.equal('testunifiedid_alt');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'adserver.org',
                uids: [{id: 'testunifiedid_alt', atype: 1, ext: {rtiPartner: 'TDID'}}]
              });
            });
          });
          localStorage.removeItem('unifiedid_alt');
          localStorage.removeItem('unifiedid_alt_exp');
          done();
        }, {adUnits});
      });

      it('test hook from amxId html5', (done) => {
        // simulate existing localStorage values
        localStorage.setItem('amxId', 'test_amxid_id');
        localStorage.setItem('amxId_exp', '');

        init(config);
        setSubmoduleRegistry([amxIdSubmodule]);
        config.setConfig(getConfigMock(['amxId', 'amxId', 'html5']));

        requestBidsHook(() => {
          adUnits.forEach((adUnit) => {
            adUnit.bids.forEach((bid) => {
              expect(bid).to.have.deep.nested.property('userId.amxId');
              expect(bid.userId.amxId).to.equal('test_amxid_id');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'amxdt.net',
                uids: [{
                  id: 'test_amxid_id',
                  atype: 1,
                }]
              });
            });
          });

          // clear LS
          localStorage.removeItem('amxId');
          localStorage.removeItem('amxId_exp');
          done();
        }, {adUnits});
      });

      it('test hook from identityLink html5', function (done) {
        // simulate existing browser local storage values
        localStorage.setItem('idl_env', 'AiGNC8Z5ONyZKSpIPf');
        localStorage.setItem('idl_env_exp', '');

        init(config);
        setSubmoduleRegistry([identityLinkSubmodule]);
        config.setConfig(getConfigMock(['identityLink', 'idl_env', 'html5']));
        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.idl_env');
              expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'liveramp.com',
                uids: [{id: 'AiGNC8Z5ONyZKSpIPf', atype: 3}]
              });
            });
          });
          localStorage.removeItem('idl_env');
          localStorage.removeItem('idl_env_exp');
          done();
        }, {adUnits});
      });

      it('test hook from identityLink cookie', function (done) {
        coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', (new Date(Date.now() + 100000).toUTCString()));

        init(config);
        setSubmoduleRegistry([identityLinkSubmodule]);
        config.setConfig(getConfigMock(['identityLink', 'idl_env', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.idl_env');
              expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'liveramp.com',
                uids: [{id: 'AiGNC8Z5ONyZKSpIPf', atype: 3}]
              });
            });
          });
          coreStorage.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from criteoIdModule cookie', function (done) {
        coreStorage.setCookie('storage_bidid', JSON.stringify({'criteoId': 'test_bidid'}), (new Date(Date.now() + 100000).toUTCString()));

        init(config);
        setSubmoduleRegistry([criteoIdSubmodule]);
        config.setConfig(getConfigMock(['criteo', 'storage_bidid', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.criteoId');
              expect(bid.userId.criteoId).to.equal('test_bidid');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'criteo.com',
                uids: [{id: 'test_bidid', atype: 1}]
              });
            });
          });
          coreStorage.setCookie('storage_bidid', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from tapadIdModule cookie', function (done) {
        coreStorage.setCookie('tapad_id', 'test-tapad-id', (new Date(Date.now() + 100000).toUTCString()));

        init(config);
        setSubmoduleRegistry([tapadIdSubmodule]);
        config.setConfig(getConfigMock(['tapadId', 'tapad_id', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.tapadId');
              expect(bid.userId.tapadId).to.equal('test-tapad-id');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'tapad.com',
                uids: [{id: 'test-tapad-id', atype: 1}]
              });
            });
          })
          coreStorage.setCookie('tapad_id', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from liveIntentId html5', function (done) {
        // simulate existing browser local storage values
        localStorage.setItem('_li_pbid', JSON.stringify({'unifiedId': 'random-ls-identifier'}));
        localStorage.setItem('_li_pbid_exp', '');

        init(config);
        setSubmoduleRegistry([liveIntentIdSubmodule]);
        config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'html5']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.lipb');
              expect(bid.userId.lipb.lipbid).to.equal('random-ls-identifier');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'liveintent.com',
                uids: [{id: 'random-ls-identifier', atype: 3}]
              });
            });
          });
          localStorage.removeItem('_li_pbid');
          localStorage.removeItem('_li_pbid_exp');
          done();
        }, {adUnits});
      });

      it('test hook from Kinesso cookies', function (done) {
        // simulate existing browser local storage values
        coreStorage.setCookie('kpuid', 'KINESSO_ID', (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([kinessoIdSubmodule]);
        config.setConfig(getConfigMock(['kpuid', 'kpuid', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.kpuid');
              expect(bid.userId.kpuid).to.equal('KINESSO_ID');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'kpuid.com',
                uids: [{id: 'KINESSO_ID', atype: 3}]
              });
            });
          });
          coreStorage.setCookie('kpuid', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from Kinesso html5', function (done) {
        // simulate existing browser local storage values
        localStorage.setItem('kpuid', 'KINESSO_ID');
        localStorage.setItem('kpuid_exp', '');

        init(config);
        setSubmoduleRegistry([kinessoIdSubmodule]);
        config.setConfig(getConfigMock(['kpuid', 'kpuid', 'html5']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.kpuid');
              expect(bid.userId.kpuid).to.equal('KINESSO_ID');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'kpuid.com',
                uids: [{id: 'KINESSO_ID', atype: 3}]
              });
            });
          });
          localStorage.removeItem('kpuid');
          localStorage.removeItem('kpuid_exp', '');
          done();
        }, {adUnits});
      });

      it('test hook from liveIntentId cookie', function (done) {
        coreStorage.setCookie('_li_pbid', JSON.stringify({'unifiedId': 'random-cookie-identifier'}), (new Date(Date.now() + 100000).toUTCString()));

        init(config);
        setSubmoduleRegistry([liveIntentIdSubmodule]);
        config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.lipb');
              expect(bid.userId.lipb.lipbid).to.equal('random-cookie-identifier');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'liveintent.com',
                uids: [{id: 'random-cookie-identifier', atype: 3}]
              });
            });
          });
          coreStorage.setCookie('_li_pbid', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('eidPermissions fun with bidders', function (done) {
        coreStorage.setCookie('pubcid', 'test222', (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        let eidPermissions;
        getPrebidInternal().setEidPermissions = function (newEidPermissions) {
          eidPermissions = newEidPermissions;
        }
        config.setConfig({
          userSync: {
            syncDelay: 0,
            userIds: [
              {
                name: 'pubCommonId',
                bidders: [
                  'sampleBidder'
                ],
                storage: {
                  type: 'cookie',
                  name: 'pubcid',
                  expires: 28
                }
              }
            ]
          }
        });

        requestBidsHook(function () {
          expect(eidPermissions).to.deep.equal(
            [
              {
                bidders: [
                  'sampleBidder'
                ],
                source: 'pubcid.org'
              }
            ]
          );
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              if (bid.bidder === 'sampleBidder') {
                expect(bid).to.have.deep.nested.property('userId.pubcid');
                expect(bid.userId.pubcid).to.equal('test222');
                expect(bid.userIdAsEids[0]).to.deep.equal({
                  source: 'pubcid.org',
                  uids: [
                    {
                      id: 'test222',
                      atype: 1
                    }
                  ]
                });
              }
              if (bid.bidder === 'anotherSampleBidder') {
                expect(bid).to.not.have.deep.nested.property('userId.pubcid');
                expect(bid).to.not.have.property('userIdAsEids');
              }
            });
          });
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
          getPrebidInternal().setEidPermissions = undefined;
          done();
        }, {adUnits});
      });

      it('eidPermissions fun without bidders', function (done) {
        coreStorage.setCookie('pubcid', 'test222', new Date(Date.now() + 5000).toUTCString());

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        let eidPermissions;
        getPrebidInternal().setEidPermissions = function (newEidPermissions) {
          eidPermissions = newEidPermissions;
        }
        config.setConfig({
          userSync: {
            syncDelay: 0,
            userIds: [
              {
                name: 'pubCommonId',
                storage: {
                  type: 'cookie',
                  name: 'pubcid',
                  expires: 28
                }
              }
            ]
          }
        });

        requestBidsHook(function () {
          expect(eidPermissions).to.deep.equal(
            []
          );
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal('test222');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'pubcid.org',
                uids: [
                  {
                    id: 'test222',
                    atype: 1
                  }]
              });
            });
          });
          getPrebidInternal().setEidPermissions = undefined;
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from pubProvidedId config params', function (done) {
        init(config);
        setSubmoduleRegistry([pubProvidedIdSubmodule]);
        config.setConfig({
          userSync: {
            syncDelay: 0,
            userIds: [{
              name: 'pubProvidedId',
              params: {
                eids: [{
                  source: 'example.com',
                  uids: [{
                    id: 'value read from cookie or local storage',
                    ext: {
                      stype: 'ppuid'
                    }
                  }]
                }, {
                  source: 'id-partner.com',
                  uids: [{
                    id: 'value read from cookie or local storage',
                    ext: {
                      stype: 'dmp'
                    }
                  }]
                }],
                eidsFunction: function () {
                  return [{
                    source: 'provider.com',
                    uids: [{
                      id: 'value read from cookie or local storage',
                      ext: {
                        stype: 'sha256email'
                      }
                    }]
                  }]
                }
              }
            }
            ]
          }
        });

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubProvidedId');
              expect(bid.userId.pubProvidedId).to.deep.equal([{
                source: 'example.com',
                uids: [{
                  id: 'value read from cookie or local storage',
                  ext: {
                    stype: 'ppuid'
                  }
                }]
              }, {
                source: 'id-partner.com',
                uids: [{
                  id: 'value read from cookie or local storage',
                  ext: {
                    stype: 'dmp'
                  }
                }]
              }, {
                source: 'provider.com',
                uids: [{
                  id: 'value read from cookie or local storage',
                  ext: {
                    stype: 'sha256email'
                  }
                }]
              }]);

              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'example.com',
                uids: [{
                  id: 'value read from cookie or local storage',
                  ext: {
                    stype: 'ppuid'
                  }
                }]
              });
              expect(bid.userIdAsEids[2]).to.deep.equal({
                source: 'provider.com',
                uids: [{
                  id: 'value read from cookie or local storage',
                  ext: {
                    stype: 'sha256email'
                  }
                }]
              });
            });
          });
          done();
        }, {adUnits});
      });

      it('test hook from liveIntentId html5', function (done) {
        // simulate existing browser local storage values
        localStorage.setItem('_li_pbid', JSON.stringify({'unifiedId': 'random-ls-identifier', 'segments': ['123']}));
        localStorage.setItem('_li_pbid_exp', '');

        init(config);
        setSubmoduleRegistry([liveIntentIdSubmodule]);
        config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'html5']));
        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.lipb');
              expect(bid.userId.lipb.lipbid).to.equal('random-ls-identifier');
              expect(bid.userId.lipb.segments).to.include('123');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'liveintent.com',
                uids: [{id: 'random-ls-identifier', atype: 3}],
                ext: {segments: ['123']}
              });
            });
          });
          localStorage.removeItem('_li_pbid');
          localStorage.removeItem('_li_pbid_exp');
          done();
        }, {adUnits});
      });

      it('test hook from liveIntentId cookie', function (done) {
        coreStorage.setCookie('_li_pbid', JSON.stringify({
          'unifiedId': 'random-cookie-identifier',
          'segments': ['123']
        }), (new Date(Date.now() + 100000).toUTCString()));

        init(config);
        setSubmoduleRegistry([liveIntentIdSubmodule]);
        config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.lipb');
              expect(bid.userId.lipb.lipbid).to.equal('random-cookie-identifier');
              expect(bid.userId.lipb.segments).to.include('123');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'liveintent.com',
                uids: [{id: 'random-cookie-identifier', atype: 3}],
                ext: {segments: ['123']}
              });
            });
          });
          coreStorage.setCookie('_li_pbid', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from britepoolid cookies', function (done) {
        // simulate existing browser local storage values
        coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': '279c0161-5152-487f-809e-05d7f7e653fd'}), (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([britepoolIdSubmodule]);
        config.setConfig(getConfigMock(['britepoolId', 'britepoolid', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.britepoolid');
              expect(bid.userId.britepoolid).to.equal('279c0161-5152-487f-809e-05d7f7e653fd');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'britepool.com',
                uids: [{id: '279c0161-5152-487f-809e-05d7f7e653fd', atype: 3}]
              });
            });
          });
          coreStorage.setCookie('britepoolid', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from dmdId cookies', function (done) {
        // simulate existing browser local storage values
        coreStorage.setCookie('dmdId', 'testdmdId', (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([dmdIdSubmodule]);
        config.setConfig(getConfigMock(['dmdId', 'dmdId', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.dmdId');
              expect(bid.userId.dmdId).to.equal('testdmdId');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'hcn.health',
                uids: [{id: 'testdmdId', atype: 3}]
              });
            });
          });
          coreStorage.setCookie('dmdId', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from netId cookies', function (done) {
        // simulate existing browser local storage values
        coreStorage.setCookie('netId', JSON.stringify({'netId': 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg'}), (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([netIdSubmodule]);
        config.setConfig(getConfigMock(['netId', 'netId', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.netId');
              expect(bid.userId.netId).to.equal('fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'netid.de',
                uids: [{id: 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg', atype: 1}]
              });
            });
          });
          coreStorage.setCookie('netId', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from intentIqId cookies', function (done) {
        // simulate existing browser local storage values
        coreStorage.setCookie('intentIqId', 'abcdefghijk', (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([intentIqIdSubmodule]);
        config.setConfig(getConfigMock(['intentIqId', 'intentIqId', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.intentIqId');
              expect(bid.userId.intentIqId).to.equal('abcdefghijk');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'intentiq.com',
                uids: [{id: 'abcdefghijk', atype: 1}]
              });
            });
          });
          coreStorage.setCookie('intentIqId', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from hadronId html5', function (done) {
        // simulate existing browser local storage values
        localStorage.setItem('hadronId', JSON.stringify({'hadronId': 'testHadronId1'}));
        localStorage.setItem('hadronId_exp', (new Date(Date.now() + 5000)).toUTCString());

        init(config);
        setSubmoduleRegistry([hadronIdSubmodule]);
        config.setConfig(getConfigMock(['hadronId', 'hadronId', 'html5']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.hadronId');
              expect(bid.userId.hadronId).to.equal('testHadronId1');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'audigent.com',
                uids: [{id: 'testHadronId1', atype: 1}]
              });
            });
          });
          localStorage.removeItem('hadronId');
          localStorage.removeItem('hadronId_exp');
          done();
        }, {adUnits});
      });

      it('test hook from merkleId cookies - legacy', function (done) {
        // simulate existing browser local storage values
        coreStorage.setCookie('merkleId', JSON.stringify({'pam_id': {'id': 'testmerkleId', 'keyID': 1}}), (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([merkleIdSubmodule]);
        config.setConfig(getConfigMock(['merkleId', 'merkleId', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.merkleId');
              expect(bid.userId.merkleId).to.deep.equal({'id': 'testmerkleId', 'keyID': 1});
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'merkleinc.com',
                uids: [{id: 'testmerkleId', atype: 3, ext: {keyID: 1}}]
              });
            });
          });
          coreStorage.setCookie('merkleId', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from merkleId cookies', function (done) {
        // simulate existing browser local storage values
        coreStorage.setCookie('merkleId', JSON.stringify({
          'merkleId': [{id: 'testmerkleId', ext: { keyID: 1, ssp: 'ssp1' }}, {id: 'another-random-id-value', ext: { ssp: 'ssp2' }}],
          '_svsid': 'svs-id-1'
        }), (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([merkleIdSubmodule]);
        config.setConfig(getConfigMock(['merkleId', 'merkleId', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.merkleId');
              expect(bid.userId.merkleId.length).to.equal(2);
              expect(bid.userIdAsEids.length).to.equal(2);
              expect(bid.userIdAsEids[0]).to.deep.equal({ source: 'ssp1.merkleinc.com', uids: [{id: 'testmerkleId', atype: 3, ext: { keyID: 1, ssp: 'ssp1' }}] });
              expect(bid.userIdAsEids[1]).to.deep.equal({ source: 'ssp2.merkleinc.com', uids: [{id: 'another-random-id-value', atype: 3, ext: { ssp: 'ssp2' }}] });
            });
          });
          coreStorage.setCookie('merkleId', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from zeotapIdPlus cookies', function (done) {
        // simulate existing browser local storage values
        coreStorage.setCookie('IDP', btoa(JSON.stringify('abcdefghijk')), (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([zeotapIdPlusSubmodule]);
        config.setConfig(getConfigMock(['zeotapIdPlus', 'IDP', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.IDP');
              expect(bid.userId.IDP).to.equal('abcdefghijk');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'zeotap.com',
                uids: [{id: 'abcdefghijk', atype: 1}]
              });
            });
          });
          coreStorage.setCookie('IDP', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from mwOpenLinkId cookies', function (done) {
        // simulate existing browser local storage values
        coreStorage.setCookie('mwol', JSON.stringify({eid: 'XX-YY-ZZ-123'}), (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([mwOpenLinkIdSubModule]);
        config.setConfig(getConfigMock(['mwOpenLinkId', 'mwol', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.mwOpenLinkId');
              expect(bid.userId.mwOpenLinkId).to.equal('XX-YY-ZZ-123');
            });
          });
          coreStorage.setCookie('mwol', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from admixerId html5', function (done) {
        // simulate existing browser local storage values
        localStorage.setItem('admixerId', 'testadmixerId');
        localStorage.setItem('admixerId_exp', '');

        init(config);
        setSubmoduleRegistry([admixerIdSubmodule]);
        config.setConfig(getConfigMock(['admixerId', 'admixerId', 'html5']));
        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.admixerId');
              expect(bid.userId.admixerId).to.equal('testadmixerId');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'admixer.net',
                uids: [{id: 'testadmixerId', atype: 3}]
              });
            });
          });
          localStorage.removeItem('admixerId');
          done();
        }, {adUnits});
      });

      it('test hook from admixerId cookie', function (done) {
        coreStorage.setCookie('admixerId', 'testadmixerId', (new Date(Date.now() + 100000).toUTCString()));

        init(config);
        setSubmoduleRegistry([admixerIdSubmodule]);
        config.setConfig(getConfigMock(['admixerId', 'admixerId', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.admixerId');
              expect(bid.userId.admixerId).to.equal('testadmixerId');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'admixer.net',
                uids: [{id: 'testadmixerId', atype: 3}]
              });
            });
          });
          coreStorage.setCookie('admixerId', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from deepintentId cookies', function (done) {
        // simulate existing browser local storage values
        coreStorage.setCookie('deepintentId', 'testdeepintentId', (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([deepintentDpesSubmodule]);
        config.setConfig(getConfigMock(['deepintentId', 'deepintentId', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.deepintentId');
              expect(bid.userId.deepintentId).to.deep.equal('testdeepintentId');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'deepintent.com',
                uids: [{id: 'testdeepintentId', atype: 3}]
              });
            });
          });
          coreStorage.setCookie('deepintentId', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from deepintentId html5', function (done) {
        // simulate existing browser local storage values
        localStorage.setItem('deepintentId', 'testdeepintentId');
        localStorage.setItem('deepintentId_exp', '');

        init(config);
        setSubmoduleRegistry([deepintentDpesSubmodule]);
        config.setConfig(getConfigMock(['deepintentId', 'deepintentId', 'html5']));
        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.deepintentId');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'deepintent.com',
                uids: [{id: 'testdeepintentId', atype: 3}]
              });
            });
          });
          localStorage.removeItem('deepintentId');
          done();
        }, {adUnits});
      });

      it('test hook from qid html5', (done) => {
        // simulate existing localStorage values
        localStorage.setItem('qid', 'testqid');
        localStorage.setItem('qid_exp', '');

        init(config);
        setSubmoduleRegistry([adqueryIdSubmodule]);
        config.setConfig(getConfigMock(['qid', 'qid', 'html5']));

        requestBidsHook(() => {
          adUnits.forEach((adUnit) => {
            adUnit.bids.forEach((bid) => {
              expect(bid).to.have.deep.nested.property('userId.qid');
              expect(bid.userId.qid).to.equal('testqid');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'adquery.io',
                uids: [{
                  id: 'testqid',
                  atype: 1,
                }]
              });
            });
          });

          // clear LS
          localStorage.removeItem('qid');
          localStorage.removeItem('qid_exp');
          done();
        }, {adUnits});
      });

      it('test hook when pubCommonId, unifiedId, id5Id, identityLink, britepoolId, intentIqId, zeotapIdPlus, netId, hadronId, Criteo, UID 2.0, admixerId, amxId, dmdId, kpuid, qid and mwOpenLinkId have data to pass', function (done) {
        coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('unifiedid', JSON.stringify({'TDID': 'testunifiedid'}), (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('id5id', JSON.stringify({'universal_uid': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': 'testbritepoolid'}), (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('dmdId', 'testdmdId', (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('netId', JSON.stringify({'netId': 'testnetId'}), (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('intentIqId', 'testintentIqId', (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('IDP', btoa(JSON.stringify('zeotapId')), (new Date(Date.now() + 5000).toUTCString()));
        // hadronId only supports localStorage
        localStorage.setItem('hadronId', JSON.stringify({'hadronId': 'testHadronId1'}));
        localStorage.setItem('hadronId_exp', (new Date(Date.now() + 5000)).toUTCString());
        coreStorage.setCookie('storage_criteo', JSON.stringify({'criteoId': 'test_bidid'}), (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('mwol', JSON.stringify({eid: 'XX-YY-ZZ-123'}), (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('uid2id', 'Sample_AD_Token', (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('admixerId', 'testadmixerId', (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('deepintentId', 'testdeepintentId', (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('kpuid', 'KINESSO_ID', (new Date(Date.now() + 5000).toUTCString()));
        // amxId only supports localStorage
        localStorage.setItem('amxId', 'test_amxid_id');
        localStorage.setItem('amxId_exp', (new Date(Date.now() + 5000)).toUTCString());
        // qid only supports localStorage
        localStorage.setItem('qid', 'testqid');
        localStorage.setItem('qid_exp', (new Date(Date.now() + 5000)).toUTCString());
        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, britepoolIdSubmodule, netIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, hadronIdSubmodule, criteoIdSubmodule, mwOpenLinkIdSubModule, tapadIdSubmodule, uid2IdSubmodule, admixerIdSubmodule, deepintentDpesSubmodule, dmdIdSubmodule, amxIdSubmodule, kinessoIdSubmodule, adqueryIdSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie'],
          ['unifiedId', 'unifiedid', 'cookie'],
          ['id5Id', 'id5id', 'cookie'],
          ['identityLink', 'idl_env', 'cookie'],
          ['britepoolId', 'britepoolid', 'cookie'],
          ['dmdId', 'dmdId', 'cookie'],
          ['netId', 'netId', 'cookie'],
          ['intentIqId', 'intentIqId', 'cookie'],
          ['zeotapIdPlus', 'IDP', 'cookie'],
          ['hadronId', 'hadronId', 'html5'],
          ['criteo', 'storage_criteo', 'cookie'],
          ['mwOpenLinkId', 'mwol', 'cookie'],
          ['tapadId', 'tapad_id', 'cookie'],
          ['uid2', 'uid2id', 'cookie'],
          ['admixerId', 'admixerId', 'cookie'],
          ['amxId', 'amxId', 'html5'],
          ['deepintentId', 'deepintentId', 'cookie'],
          ['kpuid', 'kpuid', 'cookie'],
          ['qid', 'qid', 'html5']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              // verify that the PubCommonId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal('testpubcid');
              // also check that UnifiedId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.tdid');
              expect(bid.userId.tdid).to.equal('testunifiedid');
              // also check that Id5Id id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.id5id.uid');
              expect(bid.userId.id5id.uid).to.equal('testid5id');
              // check that identityLink id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.idl_env');
              expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
              // also check that britepoolId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.britepoolid');
              expect(bid.userId.britepoolid).to.equal('testbritepoolid');
              // also check that dmdID id was copied to bid
              expect(bid).to.have.deep.nested.property('userId.dmdId');
              expect(bid.userId.dmdId).to.equal('testdmdId');
              // also check that netId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.netId');
              expect(bid.userId.netId).to.equal('testnetId');
              // also check that intentIqId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.intentIqId');
              expect(bid.userId.intentIqId).to.equal('testintentIqId');
              // also check that zeotapIdPlus id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.IDP');
              expect(bid.userId.IDP).to.equal('zeotapId');
              // also check that hadronId id was copied to bid
              expect(bid).to.have.deep.nested.property('userId.hadronId');
              expect(bid.userId.hadronId).to.equal('testHadronId1');
              // also check that criteo id was copied to bid
              expect(bid).to.have.deep.nested.property('userId.criteoId');
              expect(bid.userId.criteoId).to.equal('test_bidid');
              // also check that mwOpenLink id was copied to bid
              expect(bid).to.have.deep.nested.property('userId.mwOpenLinkId');
              expect(bid.userId.mwOpenLinkId).to.equal('XX-YY-ZZ-123');
              expect(bid.userId.uid2).to.deep.equal({
                id: 'Sample_AD_Token'
              });
              expect(bid).to.have.deep.nested.property('userId.amxId');
              expect(bid.userId.amxId).to.equal('test_amxid_id');

              // also check that criteo id was copied to bid
              expect(bid).to.have.deep.nested.property('userId.admixerId');
              expect(bid.userId.admixerId).to.equal('testadmixerId');

              // also check that deepintentId was copied to bid
              expect(bid).to.have.deep.nested.property('userId.deepintentId');
              expect(bid.userId.deepintentId).to.equal('testdeepintentId');

              expect(bid).to.have.deep.nested.property('userId.kpuid');
              expect(bid.userId.kpuid).to.equal('KINESSO_ID');

              expect(bid).to.have.deep.nested.property('userId.qid');
              expect(bid.userId.qid).to.equal('testqid');

              expect(bid.userIdAsEids.length).to.equal(18);
            });
          });
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('britepoolid', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('dmdId', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('netId', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('intentIqId', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('IDP', '', EXPIRED_COOKIE_DATE);
          localStorage.removeItem('hadronId');
          localStorage.removeItem('hadronId_exp');
          coreStorage.setCookie('storage_criteo', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('mwol', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('uid2id', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('admixerId', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('deepintentId', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('kpuid', EXPIRED_COOKIE_DATE);
          localStorage.removeItem('amxId');
          localStorage.removeItem('amxId_exp');
          localStorage.removeItem('qid');
          localStorage.removeItem('qid_exp');
          done();
        }, {adUnits});
      });

      it('test hook from UID2 cookie', function (done) {
        coreStorage.setCookie('uid2id', 'Sample_AD_Token', (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([uid2IdSubmodule]);
        config.setConfig(getConfigMock(['uid2', 'uid2id', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.uid2');
              expect(bid.userId.uid2).to.have.deep.nested.property('id');
              expect(bid.userId.uid2).to.deep.equal({
                id: 'Sample_AD_Token'
              });
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'uidapi.com',
                uids: [{
                  id: 'Sample_AD_Token',
                  atype: 3,
                }]
              });
            });
          });
          coreStorage.setCookie('uid2id', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });
      it('should add new id system ', function (done) {
        coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('unifiedid', JSON.stringify({'TDID': 'cookie-value-add-module-variations'}), new Date(Date.now() + 5000).toUTCString());
        coreStorage.setCookie('id5id', JSON.stringify({'universal_uid': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', new Date(Date.now() + 5000).toUTCString());
        coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': 'testbritepoolid'}), (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('dmdId', 'testdmdId', (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('netId', JSON.stringify({'netId': 'testnetId'}), new Date(Date.now() + 5000).toUTCString());
        coreStorage.setCookie('intentIqId', 'testintentIqId', (new Date(Date.now() + 5000).toUTCString()));
        coreStorage.setCookie('IDP', btoa(JSON.stringify('zeotapId')), (new Date(Date.now() + 5000).toUTCString()));
        localStorage.setItem('hadronId', JSON.stringify({'hadronId': 'testHadronId1'}));
        localStorage.setItem('hadronId_exp', (new Date(Date.now() + 5000)).toUTCString());
        coreStorage.setCookie('admixerId', 'testadmixerId', new Date(Date.now() + 5000).toUTCString());
        coreStorage.setCookie('deepintentId', 'testdeepintentId', new Date(Date.now() + 5000).toUTCString());
        coreStorage.setCookie('MOCKID', JSON.stringify({'MOCKID': '123456778'}), new Date(Date.now() + 5000).toUTCString());
        coreStorage.setCookie('__uid2_advertising_token', 'Sample_AD_Token', (new Date(Date.now() + 5000).toUTCString()));
        localStorage.setItem('amxId', 'test_amxid_id');
        localStorage.setItem('amxId_exp', new Date(Date.now() + 5000).toUTCString())
        coreStorage.setCookie('kpuid', 'KINESSO_ID', (new Date(Date.now() + 5000).toUTCString()));
        localStorage.setItem('qid', 'testqid');
        localStorage.setItem('qid_exp', new Date(Date.now() + 5000).toUTCString())

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, britepoolIdSubmodule, netIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, hadronIdSubmodule, uid2IdSubmodule, admixerIdSubmodule, deepintentDpesSubmodule, dmdIdSubmodule, amxIdSubmodule, kinessoIdSubmodule, adqueryIdSubmodule]);

        config.setConfig({
          userSync: {
            syncDelay: 0,
            userIds: [{
              name: 'pubCommonId', storage: {name: 'pubcid', type: 'cookie'}
            }, {
              name: 'unifiedId', storage: {name: 'unifiedid', type: 'cookie'}
            }, {
              name: 'id5Id', storage: {name: 'id5id', type: 'cookie'}
            }, {
              name: 'identityLink', storage: {name: 'idl_env', type: 'cookie'}
            }, {
              name: 'britepoolId', storage: {name: 'britepoolid', type: 'cookie'}
            }, {
              name: 'dmdId', storage: {name: 'dmdId', type: 'cookie'}
            }, {
              name: 'netId', storage: {name: 'netId', type: 'cookie'}
            }, {
              name: 'intentIqId', storage: {name: 'intentIqId', type: 'cookie'}
            }, {
              name: 'zeotapIdPlus'
            }, {
              name: 'hadronId', storage: {name: 'hadronId', type: 'html5'}
            }, {
              name: 'admixerId', storage: {name: 'admixerId', type: 'cookie'}
            }, {
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }, {
              name: 'uid2'
            }, {
              name: 'deepintentId', storage: {name: 'deepintentId', type: 'cookie'}
            }, {
              name: 'amxId', storage: {name: 'amxId', type: 'html5'}
            }, {
              name: 'kpuid', storage: {name: 'kpuid', type: 'cookie'}
            }, {
              name: 'qid', storage: {name: 'qid', type: 'html5'}
            }]
          }
        });

        // Add new submodule named 'mockId'
        attachIdSystem({
          name: 'mockId',
          decode: function (value) {
            return {
              'mid': value['MOCKID']
            };
          },
          getId: function (config, storedId) {
            if (storedId) return {};
            return {id: {'MOCKID': '1234'}};
          }
        });

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              // check PubCommonId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal('testpubcid');
              // check UnifiedId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.tdid');
              expect(bid.userId.tdid).to.equal('cookie-value-add-module-variations');
              // also check that Id5Id id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.id5id.uid');
              expect(bid.userId.id5id.uid).to.equal('testid5id');
              // also check that identityLink id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.idl_env');
              expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
              // also check that britepoolId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.britepoolid');
              expect(bid.userId.britepoolid).to.equal('testbritepoolid');
              // also check that dmdId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.dmdId');
              expect(bid.userId.dmdId).to.equal('testdmdId');
              // check MockId data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.netId');
              expect(bid.userId.netId).to.equal('testnetId');
              // check MockId data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.mid');
              expect(bid.userId.mid).to.equal('1234');
              // also check that intentIqId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.intentIqId');
              expect(bid.userId.intentIqId).to.equal('testintentIqId');
              // also check that zeotapIdPlus id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.IDP');
              expect(bid.userId.IDP).to.equal('zeotapId');
              // also check that hadronId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.hadronId');
              expect(bid.userId.hadronId).to.equal('testHadronId1');
              expect(bid.userId.uid2).to.deep.equal({
                id: 'Sample_AD_Token'
              });

              expect(bid).to.have.deep.nested.property('userId.amxId');
              expect(bid.userId.amxId).to.equal('test_amxid_id');

              // also check that admixerId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.admixerId');
              expect(bid.userId.admixerId).to.equal('testadmixerId');

              // also check that deepintentId was copied to bid
              expect(bid).to.have.deep.nested.property('userId.deepintentId');
              expect(bid.userId.deepintentId).to.equal('testdeepintentId');

              expect(bid).to.have.deep.nested.property('userId.kpuid');
              expect(bid.userId.kpuid).to.equal('KINESSO_ID');

              expect(bid).to.have.deep.nested.property('userId.qid');
              expect(bid.userId.qid).to.equal('testqid');
              expect(bid.userIdAsEids.length).to.equal(16);
            });
          });
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('britepoolid', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('netId', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('intentIqId', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('IDP', '', EXPIRED_COOKIE_DATE);
          localStorage.removeItem('hadronId');
          localStorage.removeItem('hadronId_exp');
          coreStorage.setCookie('dmdId', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('admixerId', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('deepintentId', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('mwol', '', EXPIRED_COOKIE_DATE);
          localStorage.removeItem('amxId');
          localStorage.removeItem('amxId_exp');
          coreStorage.setCookie('kpuid', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });
    });

    describe('callbacks at the end of auction', function () {
      beforeEach(function () {
        sinon.stub(events, 'getEvents').returns([]);
        sinon.stub(utils, 'triggerPixel');
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('_parrable_eid', '', EXPIRED_COOKIE_DATE);
      });

      afterEach(function () {
        events.getEvents.restore();
        utils.triggerPixel.restore();
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('_parrable_eid', '', EXPIRED_COOKIE_DATE);
        resetConsentData();
        delete window.__tcfapi;
      });

      function endAuction() {
        events.emit(CONSTANTS.EVENTS.AUCTION_END, {});
        return new Promise((resolve) => setTimeout(resolve));
      }

      it('pubcid callback with url', function () {
        let adUnits = [getAdUnitMock()];
        let innerAdUnits;
        let customCfg = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
        customCfg = addConfig(customCfg, 'params', {pixelUrl: '/any/pubcid/url'});

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule]);
        config.setConfig(customCfg);
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          expect(utils.triggerPixel.called).to.be.false;
          return endAuction();
        }).then(() => {
          expect(utils.triggerPixel.getCall(0).args[0]).to.include('/any/pubcid/url');
        });
      });

      it('unifiedid callback with url', function () {
        let adUnits = [getAdUnitMock()];
        let innerAdUnits;
        let customCfg = getConfigMock(['unifiedId', 'unifiedid', 'cookie']);
        addConfig(customCfg, 'params', {url: '/any/unifiedid/url'});

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule]);
        config.setConfig(customCfg);
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          expect(server.requests).to.be.empty;
          return endAuction();
        }).then(() => {
          expect(server.requests[0].url).to.equal('/any/unifiedid/url');
        });
      });

      it('unifiedid callback with partner', function () {
        let adUnits = [getAdUnitMock()];
        let innerAdUnits;
        let customCfg = getConfigMock(['unifiedId', 'unifiedid', 'cookie']);
        addConfig(customCfg, 'params', {partner: 'rubicon'});

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule, unifiedIdSubmodule]);
        config.setConfig(customCfg);
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          expect(server.requests).to.be.empty;
          return endAuction();
        }).then(() => {
          expect(server.requests[0].url).to.equal('https://match.adsrvr.org/track/rid?ttd_pid=rubicon&fmt=json');
        });
      });
    });

    describe('Set cookie behavior', function () {
      let coreStorageSpy;
      beforeEach(function () {
        coreStorageSpy = sinon.spy(coreStorage, 'setCookie');
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        init(config);
      });
      afterEach(function () {
        coreStorageSpy.restore();
      });
      it('should allow submodules to override the domain', function () {
        const submodule = {
          submodule: {
            domainOverride: function () {
              return 'foo.com'
            }
          },
          config: {
            storage: {
              type: 'cookie'
            }
          }
        }
        setStoredValue(submodule, 'bar');
        expect(coreStorage.setCookie.getCall(0).args[4]).to.equal('foo.com');
      });

      it('should pass null for domain if submodule does not override the domain', function () {
        const submodule = {
          submodule: {},
          config: {
            storage: {
              type: 'cookie'
            }
          }
        }
        setStoredValue(submodule, 'bar');
        expect(coreStorage.setCookie.getCall(0).args[4]).to.equal(null);
      });
    });

    describe('Consent changes determine getId refreshes', function () {
      let expStr;
      let adUnits;
      let mockGetId;
      let mockDecode;
      let mockExtendId;
      let mockIdSystem;
      let userIdConfig;

      const mockIdCookieName = 'MOCKID';

      beforeEach(function () {
        mockGetId = sinon.stub();
        mockDecode = sinon.stub();
        mockExtendId = sinon.stub();
        mockIdSystem = {
          name: 'mockId',
          getId: mockGetId,
          decode: mockDecode,
          extendId: mockExtendId
        };
        userIdConfig = {
          userSync: {
            userIds: [{
              name: 'mockId',
              storage: {
                name: 'MOCKID',
                type: 'cookie',
                refreshInSeconds: 30
              }
            }],
            auctionDelay: 5
          }
        };

        consentData = {
          gdprApplies: true,
          consentString: 'mockString',
          apiVersion: 1,
          hasValidated: true // mock presence of GPDR enforcement module
        }
        // clear cookies
        expStr = (new Date(Date.now() + 25000).toUTCString());
        coreStorage.setCookie(mockIdCookieName, '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie(`${mockIdCookieName}_last`, '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie(CONSENT_LOCAL_STORAGE_NAME, '', EXPIRED_COOKIE_DATE);

        // init
        adUnits = [getAdUnitMock()];
        init(config);

        // init id system
        attachIdSystem(mockIdSystem);
      });

      afterEach(function () {
        config.resetConfig();
      });

      it('calls getId if no stored consent data and refresh is not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({id: '1234'}), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        config.setConfig(userIdConfig);

        let innerAdUnits;
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          sinon.assert.calledOnce(mockGetId);
          sinon.assert.calledOnce(mockDecode);
          sinon.assert.notCalled(mockExtendId);
        });
      });

      it('calls getId if no stored consent data but refresh is needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({id: '1234'}), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 60 * 1000).toUTCString()), expStr);

        config.setConfig(userIdConfig);

        let innerAdUnits;
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          sinon.assert.calledOnce(mockGetId);
          sinon.assert.calledOnce(mockDecode);
          sinon.assert.notCalled(mockExtendId);
        });
      });

      it('calls getId if empty stored consent and refresh not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({id: '1234'}), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        setStoredConsentData();

        config.setConfig(userIdConfig);

        let innerAdUnits;
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          sinon.assert.calledOnce(mockGetId);
          sinon.assert.calledOnce(mockDecode);
          sinon.assert.notCalled(mockExtendId);
        });
      });

      it('calls getId if stored consent does not match current consent and refresh not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({id: '1234'}), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        setStoredConsentData({...consentData, consentString: 'different'});

        config.setConfig(userIdConfig);

        let innerAdUnits;
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          sinon.assert.calledOnce(mockGetId);
          sinon.assert.calledOnce(mockDecode);
          sinon.assert.notCalled(mockExtendId);
        });
      });

      it('does not call getId if stored consent matches current consent and refresh not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({id: '1234'}), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        setStoredConsentData({...consentData});

        config.setConfig(userIdConfig);

        let innerAdUnits;
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          sinon.assert.notCalled(mockGetId);
          sinon.assert.calledOnce(mockDecode);
          sinon.assert.calledOnce(mockExtendId);
        });
      });
    });

    describe('requestDataDeletion', () => {
      function idMod(name, value) {
        return {
          name,
          getId() {
            return {id: value}
          },
          decode(d) {
            return {[name]: d}
          },
          onDataDeletionRequest: sinon.stub()
        }
      }
      let mod1, mod2, mod3, cfg1, cfg2, cfg3;

      beforeEach(() => {
        init(config);
        mod1 = idMod('id1', 'val1');
        mod2 = idMod('id2', 'val2');
        mod3 = idMod('id3', 'val3');
        cfg1 = getStorageMock('id1', 'id1', 'cookie');
        cfg2 = getStorageMock('id2', 'id2', 'html5');
        cfg3 = {name: 'id3', value: {id3: 'val3'}};
        setSubmoduleRegistry([mod1, mod2, mod3]);
        config.setConfig({
          auctionDelay: 1,
          userSync: {
            userIds: [cfg1, cfg2, cfg3]
          }
        });
        return getGlobal().refreshUserIds();
      });

      it('deletes stored IDs', () => {
        expect(coreStorage.getCookie('id1')).to.exist;
        expect(coreStorage.getDataFromLocalStorage('id2')).to.exist;
        requestDataDeletion(sinon.stub());
        expect(coreStorage.getCookie('id1')).to.not.exist;
        expect(coreStorage.getDataFromLocalStorage('id2')).to.not.exist;
      });

      it('invokes onDataDeletionRequest', () => {
        requestDataDeletion(sinon.stub());
        sinon.assert.calledWith(mod1.onDataDeletionRequest, cfg1, {id1: 'val1'});
        sinon.assert.calledWith(mod2.onDataDeletionRequest, cfg2, {id2: 'val2'})
        sinon.assert.calledWith(mod3.onDataDeletionRequest, cfg3, {id3: 'val3'})
      });

      describe('does not choke when onDataDeletionRequest', () => {
        Object.entries({
          'is missing': () => { delete mod1.onDataDeletionRequest },
          'throws': () => { mod1.onDataDeletionRequest.throws(new Error()) }
        }).forEach(([t, setup]) => {
          it(t, () => {
            setup();
            const next = sinon.stub();
            const arg = {random: 'value'};
            requestDataDeletion(next, arg);
            sinon.assert.calledOnce(mod2.onDataDeletionRequest);
            sinon.assert.calledOnce(mod3.onDataDeletionRequest);
            sinon.assert.calledWith(next, arg);
          })
        })
      })
    });
  });

  describe('handles config with ESP configuration in user sync object', function() {
    describe('Call registerSignalSources to register signal sources with gtag', function () {
      it('pbjs.registerSignalSources should be defined', () => {
        expect(typeof (getGlobal()).registerSignalSources).to.equal('function');
      });
    })

    describe('Call getEncryptedEidsForSource to get encrypted Eids for source', function() {
      const signalSources = ['pubcid.org'];

      it('pbjs.getEncryptedEidsForSource should be defined', () => {
        expect(typeof (getGlobal()).getEncryptedEidsForSource).to.equal('function');
      });

      it('pbjs.getEncryptedEidsForSource should return the string without encryption if encryption is false', (done) => {
        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [
              {
                'name': 'sharedId',
                'storage': {
                  'type': 'cookie',
                  'name': '_pubcid',
                  'expires': 365
                }
              },
              {
                'name': 'pubcid.org'
              }
            ]
          },
        });
        const encrypt = false;
        (getGlobal()).getEncryptedEidsForSource(signalSources[0], encrypt).then((data) => {
          let users = (getGlobal()).getUserIdsAsEids();
          expect(data).to.equal(users[0].uids[0].id);
          done();
        }).catch(done);
      });

      describe('pbjs.getEncryptedEidsForSource', () => {
        beforeEach(() => {
          init(config);
          setSubmoduleRegistry([sharedIdSystemSubmodule]);
          config.setConfig({
            userSync: {
              auctionDelay: 10,
              userIds: [{
                name: 'pubCommonId', value: {'pubcid': '11111'}
              }]
            }
          });
        });

        it('should return the string base64 encryption if encryption is true', (done) => {
          const encrypt = true;
          (getGlobal()).getEncryptedEidsForSource(signalSources[0], encrypt).then((result) => {
            expect(result.startsWith('1||')).to.true;
            done();
          }).catch(done);
        });

        it('pbjs.getEncryptedEidsForSource should return string if custom function is defined', () => {
          const getCustomSignal = () => {
            return '{"keywords":["tech","auto"]}';
          }
          const expectedString = '1||eyJrZXl3b3JkcyI6WyJ0ZWNoIiwiYXV0byJdfQ==';
          const encrypt = false;
          const source = 'pubmatic.com';
          return (getGlobal()).getEncryptedEidsForSource(source, encrypt, getCustomSignal).then((result) => {
            expect(result).to.equal(expectedString);
          });
        });
      });

      it('pbjs.getUserIdsAsEidBySource', (done) => {
        const users = {
          'source': 'pubcid.org',
          'uids': [
            {
              'id': '11111',
              'atype': 1
            }
          ]
        }
        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule, amxIdSubmodule]);
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [{
              name: 'pubCommonId', value: {'pubcid': '11111'}
            }, {
              name: 'amxId', value: {'amxId': 'amx-id-value-amx-id-value-amx-id-value'}
            }]
          }
        });
        expect(typeof (getGlobal()).getUserIdsAsEidBySource).to.equal('function');
        (getGlobal()).getUserIdsAsync().then(() => {
          expect(getGlobal().getUserIdsAsEidBySource(signalSources[0])).to.deep.equal(users);
          done();
        });
      });
    })
  });
});
