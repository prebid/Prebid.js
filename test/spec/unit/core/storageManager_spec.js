import {
  deviceAccessRule,
  getCoreStorageManager,
  newStorageManager,
  resetData,
  STORAGE_TYPE_COOKIES,
  STORAGE_TYPE_LOCALSTORAGE,
  storageAllowedRule,
  storageCallbacks,
} from 'src/storageManager.js';
import adapterManager from 'src/adapterManager.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import {hook} from '../../../../src/hook.js';
import {MODULE_TYPE_BIDDER, MODULE_TYPE_PREBID} from '../../../../src/activities/modules.js';
import {ACTIVITY_ACCESS_DEVICE} from '../../../../src/activities/activities.js';
import {
  ACTIVITY_PARAM_COMPONENT_NAME,
  ACTIVITY_PARAM_COMPONENT_TYPE,
  ACTIVITY_PARAM_STORAGE_TYPE
} from '../../../../src/activities/params.js';
import {activityParams} from '../../../../src/activities/activityParams.js';

describe('storage manager', function() {
  before(() => {
    hook.ready();
  });

  beforeEach(function() {
    resetData();
  });

  afterEach(function() {
    config.resetConfig();
  })

  it('should allow to set cookie for core modules without checking gdpr enforcements', function() {
    const coreStorage = getCoreStorageManager();
    let date = new Date();
    date.setTime(date.getTime() + (24 * 60 * 60 * 1000));
    let expires = date.toUTCString();
    coreStorage.setCookie('hello', 'world', expires);
    expect(coreStorage.getCookie('hello')).to.equal('world');
  });

  it('should add done callbacks to storageCallbacks array', function() {
    let noop = sinon.spy();
    const coreStorage = newStorageManager();

    coreStorage.setCookie('foo', 'bar', null, null, null, noop);
    coreStorage.getCookie('foo', noop);
    coreStorage.localStorageIsEnabled(noop);
    coreStorage.cookiesAreEnabled(noop);
    coreStorage.setDataInLocalStorage('foo', 'bar', noop);
    coreStorage.getDataFromLocalStorage('foo', noop);
    coreStorage.removeDataFromLocalStorage('foo', noop);
    coreStorage.hasLocalStorage(noop);

    expect(storageCallbacks.length).to.equal(8);
  });

  it('should allow bidder to access device if gdpr enforcement module is not included', function() {
    let deviceAccessSpy = sinon.spy(utils, 'hasDeviceAccess');
    const storage = newStorageManager();
    storage.setCookie('foo1', 'baz1');
    expect(deviceAccessSpy.calledOnce).to.equal(true);
    deviceAccessSpy.restore();
  });

  describe(`accessDevice activity check`, () => {
    let isAllowed;

    function mkManager(moduleType, moduleName) {
      return newStorageManager({moduleType, moduleName}, {isAllowed});
    }

    beforeEach(() => {
      isAllowed = sinon.stub();
    });

    it('should pass module type and name as activity params', () => {
      mkManager(MODULE_TYPE_PREBID, 'mockMod').localStorageIsEnabled();
      sinon.assert.calledWith(isAllowed, ACTIVITY_ACCESS_DEVICE, sinon.match({
        [ACTIVITY_PARAM_COMPONENT_TYPE]: MODULE_TYPE_PREBID,
        [ACTIVITY_PARAM_COMPONENT_NAME]: 'mockMod',
        [ACTIVITY_PARAM_STORAGE_TYPE]: STORAGE_TYPE_LOCALSTORAGE
      }));
    });

    it('should deny access if activity is denied', () => {
      isAllowed.returns(false);
      const mgr = mkManager(MODULE_TYPE_PREBID, 'mockMod');
      mgr.setDataInLocalStorage('testKey', 'val');
      expect(mgr.getDataFromLocalStorage('testKey')).to.not.exist;
    });

    it('should use bidder aliases when possible', () => {
      adapterManager.registerBidAdapter({callBids: sinon.stub(), getSpec: () => ({})}, 'mockBidder');
      adapterManager.aliasBidAdapter('mockBidder', 'mockAlias');
      const mgr = mkManager(MODULE_TYPE_BIDDER, 'mockBidder');
      config.runWithBidder('mockAlias', () => mgr.cookiesAreEnabled());
      sinon.assert.calledWith(isAllowed, ACTIVITY_ACCESS_DEVICE, sinon.match({
        [ACTIVITY_PARAM_COMPONENT_NAME]: 'mockAlias'
      }))
    })
  })

  describe('localstorage forbidden access in 3rd-party context', function() {
    let errorLogSpy;
    let originalLocalStorage;
    const localStorageMock = { get: () => { throw Error } };

    beforeEach(function() {
      originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', localStorageMock);
      errorLogSpy = sinon.spy(utils, 'logError');
    });

    afterEach(function() {
      Object.defineProperty(window, 'localStorage', { get: () => originalLocalStorage });
      errorLogSpy.restore();
    })

    it('should not throw if the localstorage is not accessible when setting/getting/removing from localstorage', function() {
      const coreStorage = newStorageManager();

      coreStorage.setDataInLocalStorage('key', 'value');
      const val = coreStorage.getDataFromLocalStorage('key');
      coreStorage.removeDataFromLocalStorage('key');

      expect(val).to.be.null;
      sinon.assert.calledThrice(errorLogSpy);
    })
  })

  describe('localstorage is enabled', function() {
    let localStorage;

    beforeEach(function() {
      localStorage = window.localStorage;
      localStorage.clear();
    });

    afterEach(function() {
      localStorage.clear();
    })

    it('should remove side-effect after checking', function () {
      const storage = newStorageManager();

      localStorage.setItem('unrelated', 'dummy');
      const val = storage.localStorageIsEnabled();

      expect(val).to.be.true;
      expect(localStorage.length).to.be.eq(1);
      expect(localStorage.getItem('unrelated')).to.be.eq('dummy');
    });
  });

  describe('deviceAccess control', () => {
    afterEach(() => {
      config.resetConfig()
    });

    it('should allow by default', () => {
      config.resetConfig();
      expect(deviceAccessRule()).to.not.exist;
    });

    it('should deny access when set', () => {
      config.setConfig({deviceAccess: false});
      sinon.assert.match(deviceAccessRule(), {allow: false});
    })
  });

  describe('allowStorage access control rule', () => {
    const ALLOWED_BIDDER = 'allowed-bidder';
    const ALLOW_KEY = 'storageAllowed';

    function mockBidderSettings(val) {
      return {
        get(bidder, key) {
          if (bidder === ALLOWED_BIDDER && key === ALLOW_KEY) {
            return val;
          } else {
            return undefined;
          }
        }
      }
    }

    Object.entries({
      disallowed: ['denied_bidder', false],
      allowed: [ALLOWED_BIDDER, true]
    }).forEach(([t, [bidderCode, isBidderAllowed]]) => {
      describe(`for ${t} bidders`, () => {
        Object.entries({
          'all': {
            configValues: [
              true,
              ['html5', 'cookie']
            ],
            shouldWork: {
              html5: true,
              cookie: true
            }
          },
          'none': {
            configValues: [
              false,
              []
            ],
            shouldWork: {
              html5: false,
              cookie: false
            }
          },
          'localStorage': {
            configValues: [
              'html5',
              ['html5']
            ],
            shouldWork: {
              html5: true,
              cookie: false
            }
          },
          'cookies': {
            configValues: [
              'cookie',
              ['cookie']
            ],
            shouldWork: {
              html5: false,
              cookie: true
            }
          }
        }).forEach(([t, {configValues, shouldWork: {cookie, html5}}]) => {
          describe(`when ${t} is allowed`, () => {
            configValues.forEach(configValue => describe(`storageAllowed = ${configValue}`, () => {
              Object.entries({
                [STORAGE_TYPE_LOCALSTORAGE]: 'allow localStorage',
                [STORAGE_TYPE_COOKIES]: 'allow cookies'
              }).forEach(([type, desc]) => {
                const shouldWork = isBidderAllowed && ({html5, cookie})[type];
                it(`${shouldWork ? '' : 'NOT'} ${desc}`, () => {
                  const res = storageAllowedRule(activityParams(MODULE_TYPE_BIDDER, bidderCode, {
                    [ACTIVITY_PARAM_STORAGE_TYPE]: type
                  }), mockBidderSettings(configValue));
                  if (shouldWork) {
                    expect(res).to.not.exist;
                  } else {
                    sinon.assert.match(res, {allow: false});
                  }
                });
              })
            }));
          });
        });
      });
    });
  });
});
