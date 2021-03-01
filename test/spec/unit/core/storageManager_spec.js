import { resetData, getCoreStorageManager, storageCallbacks, getStorageManager } from 'src/storageManager.js';
import { config } from 'src/config.js';
import * as utils from 'src/utils.js';

describe('storage manager', function() {
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
    const originalLocalStorage = { get: () => window.localStorage };
    const localStorageMock = { get: () => { throw Error } };

    beforeEach(function() {
      Object.defineProperty(window, 'localStorage', localStorageMock);
      errorLogSpy = sinon.spy(utils, 'logError');
    });

    afterEach(function() {
      Object.defineProperty(window, 'localStorage', originalLocalStorage);
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
});
