import {
  resetData,
  getCoreStorageManager,
  storageCallbacks,
  getStorageManager,
  newStorageManager
} from 'src/storageManager.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';
import {hook} from '../../../../src/hook.js';

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
    const coreStorage = getStorageManager();

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
    const storage = getStorageManager();
    storage.setCookie('foo1', 'baz1');
    expect(deviceAccessSpy.calledOnce).to.equal(true);
    deviceAccessSpy.restore();
  });

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
      const coreStorage = getStorageManager();

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
      const storage = getStorageManager();

      localStorage.setItem('unrelated', 'dummy');
      const val = storage.localStorageIsEnabled();

      expect(val).to.be.true;
      expect(localStorage.length).to.be.eq(1);
      expect(localStorage.getItem('unrelated')).to.be.eq('dummy');
    });
  });

  describe('when bidderSettings.allowStorage is defined', () => {
    const DENIED_BIDDER = 'denied-bidder';
    const DENY_KEY = 'storageAllowed';

    const COOKIE = 'test-cookie';
    const LS_KEY = 'test-localstorage';

    function mockBidderSettings() {
      return {
        get(bidder, key) {
          if (bidder === DENIED_BIDDER && key === DENY_KEY) {
            return false;
          } else {
            return undefined;
          }
        }
      }
    }

    Object.entries({
      disallowed: [DENIED_BIDDER, false],
      allowed: ['allowed-bidder', true]
    }).forEach(([test, [bidderCode, shouldWork]]) => {
      describe(`for ${test} bidders`, () => {
        let mgr;

        beforeEach(() => {
          mgr = newStorageManager({bidderCode: bidderCode}, {bidderSettings: mockBidderSettings()});
        })

        afterEach(() => {
          mgr.setCookie(COOKIE, 'delete', new Date().toUTCString());
          mgr.removeDataFromLocalStorage(LS_KEY);
        })

        const testDesc = (desc) => `should ${shouldWork ? '' : 'not'} ${desc}`;

        it(testDesc('allow cookies'), () => {
          mgr.setCookie(COOKIE, 'value');
          expect(mgr.getCookie(COOKIE)).to.equal(shouldWork ? 'value' : null);
        });

        it(testDesc('allow localStorage'), () => {
          mgr.setDataInLocalStorage(LS_KEY, 'value');
          expect(mgr.getDataFromLocalStorage(LS_KEY)).to.equal(shouldWork ? 'value' : null);
        });

        it(testDesc('report localStorage as available'), () => {
          expect(mgr.hasLocalStorage()).to.equal(shouldWork);
        });

        it(testDesc('report cookies as available'), () => {
          expect(mgr.cookiesAreEnabled()).to.equal(shouldWork);
        });
      });
    });
  })
});
