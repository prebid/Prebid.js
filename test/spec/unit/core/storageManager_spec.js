import {
  getCoreStorageManager, getStorageManager,
  newStorageManager,
  resetData,
  storageCallbacks,
  validateStorageEnforcement
} from 'src/storageManager.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import {hook} from '../../../../src/hook.js';
import {MODULE_TYPE_BIDDER} from '../../../../src/activities/modules.js';

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

  describe(`enforcement`, () => {
    let validateHook;

    beforeEach(() => {
      validateHook = sinon.stub().callsFake(function (next, ...args) {
        next.apply(this, args);
      });
      validateStorageEnforcement.before(validateHook, 99);
    });

    afterEach(() => {
      validateStorageEnforcement.getHooks({hook: validateHook}).remove();
      config.resetConfig();
    })

    Object.entries({
      'core': () => getCoreStorageManager('mock'),
      'other': () => getStorageManager({moduleType: 'other', moduleName: 'mock'})
    }).forEach(([moduleType, getMgr]) => {
      describe(`for ${moduleType} modules`, () => {
        let storage;
        beforeEach(() => {
          storage = getMgr();
        });
        it(`should pass '${moduleType}' module type to consent enforcement`, () => {
          storage.localStorageIsEnabled();
          expect(validateHook.args[0][1]).to.equal(moduleType);
        });

        it('should respect the deviceAccess flag', () => {
          config.setConfig({deviceAccess: false});
          expect(storage.localStorageIsEnabled()).to.be.false
        });
      });
    });
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

  describe('when bidderSettings.allowStorage is defined', () => {
    const ALLOWED_BIDDER = 'allowed-bidder';
    const ALLOW_KEY = 'storageAllowed';

    const COOKIE = 'test-cookie';
    const LS_KEY = 'test-localstorage';

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
              let mgr;

              beforeEach(() => {
                mgr = newStorageManager({moduleType: MODULE_TYPE_BIDDER, moduleName: bidderCode}, {bidderSettings: mockBidderSettings(configValue)});
              })

              afterEach(() => {
                mgr.setCookie(COOKIE, 'delete', new Date().toUTCString());
                mgr.removeDataFromLocalStorage(LS_KEY);
              })

              function scenario(type, desc, fn) {
                const shouldWork = isBidderAllowed && ({html5, cookie})[type];
                it(`${shouldWork ? '' : 'NOT'} ${desc}`, () => fn(shouldWork));
              }

              scenario('cookie', 'allow cookies', (shouldWork) => {
                mgr.setCookie(COOKIE, 'value');
                expect(mgr.getCookie(COOKIE)).to.equal(shouldWork ? 'value' : null);
              });

              scenario('html5', 'allow localStorage', (shouldWork) => {
                mgr.setDataInLocalStorage(LS_KEY, 'value');
                expect(mgr.getDataFromLocalStorage(LS_KEY)).to.equal(shouldWork ? 'value' : null);
              });

              scenario('html5', 'report localStorage as available', (shouldWork) => {
                expect(mgr.hasLocalStorage()).to.equal(shouldWork);
              });

              scenario('cookie', 'report cookies as available', (shouldWork) => {
                expect(mgr.cookiesAreEnabled()).to.equal(shouldWork);
              });
            }));
          });
        });
      });
    });
  });
});
