import { expect } from 'chai';
import {find} from 'src/polyfill.js';
import { config } from 'src/config.js';
import { init, requestBidsHook, setSubmoduleRegistry } from 'modules/userId/index.js';
import { storage, getStorage, zeotapIdPlusSubmodule } from 'modules/zeotapIdPlusIdSystem.js';
import * as storageManager from 'src/storageManager.js';

const ZEOTAP_COOKIE_NAME = 'IDP';
const ZEOTAP_COOKIE = 'THIS-IS-A-DUMMY-COOKIE';
const ENCODED_ZEOTAP_COOKIE = btoa(JSON.stringify(ZEOTAP_COOKIE));

function getConfigMock() {
  return {
    userSync: {
      syncDelay: 0,
      userIds: [{
        name: 'zeotapIdPlus'
      }]
    }
  }
}

function getAdUnitMock(code = 'adUnit-code') {
  return {
    code,
    mediaTypes: {banner: {}, native: {}},
    sizes: [
      [300, 200],
      [300, 600]
    ],
    bids: [{
      bidder: 'sampleBidder',
      params: { placementId: 'banner-only-bidder' }
    }]
  };
}

function unsetCookie() {
  storage.setCookie(ZEOTAP_COOKIE_NAME, '');
}

function unsetLocalStorage() {
  storage.setDataInLocalStorage(ZEOTAP_COOKIE_NAME, '');
}

describe('Zeotap ID System', function() {
  describe('Zeotap Module invokes StorageManager with appropriate arguments', function() {
    let getStorageManagerSpy;

    beforeEach(function() {
      getStorageManagerSpy = sinon.spy(storageManager, 'getStorageManager');
    });

    it('when a stored Zeotap ID exists it is added to bids', function() {
      let store = getStorage();
      expect(getStorageManagerSpy.calledOnce).to.be.true;
      sinon.assert.calledWith(getStorageManagerSpy, {gvlid: 301, moduleName: 'zeotapIdPlus'});
    });
  });

  describe('test method: getId calls storage methods to fetch ID', function() {
    let cookiesAreEnabledStub;
    let getCookieStub;
    let localStorageIsEnabledStub;
    let getDataFromLocalStorageStub;

    beforeEach(() => {
      cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');
      getCookieStub = sinon.stub(storage, 'getCookie');
      localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
      getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    });

    afterEach(() => {
      storage.cookiesAreEnabled.restore();
      storage.getCookie.restore();
      storage.localStorageIsEnabled.restore();
      storage.getDataFromLocalStorage.restore();
      unsetCookie();
      unsetLocalStorage();
    });

    it('should check if cookies are enabled', function() {
      let id = zeotapIdPlusSubmodule.getId();
      expect(cookiesAreEnabledStub.calledOnce).to.be.true;
    });

    it('should call getCookie if cookies are enabled', function() {
      cookiesAreEnabledStub.returns(true);
      let id = zeotapIdPlusSubmodule.getId();
      expect(cookiesAreEnabledStub.calledOnce).to.be.true;
      expect(getCookieStub.calledOnce).to.be.true;
      sinon.assert.calledWith(getCookieStub, 'IDP');
    });

    it('should check for localStorage if cookies are disabled', function() {
      cookiesAreEnabledStub.returns(false);
      localStorageIsEnabledStub.returns(true)
      let id = zeotapIdPlusSubmodule.getId();
      expect(cookiesAreEnabledStub.calledOnce).to.be.true;
      expect(getCookieStub.called).to.be.false;
      expect(localStorageIsEnabledStub.calledOnce).to.be.true;
      expect(getDataFromLocalStorageStub.calledOnce).to.be.true;
      sinon.assert.calledWith(getDataFromLocalStorageStub, 'IDP');
    });
  });

  describe('test method: getId', function() {
    afterEach(() => {
      unsetCookie();
      unsetLocalStorage();
    });

    it('provides the stored Zeotap id if a cookie exists', function() {
      storage.setCookie(ZEOTAP_COOKIE_NAME, ENCODED_ZEOTAP_COOKIE);
      let id = zeotapIdPlusSubmodule.getId();
      expect(id).to.deep.equal({
        id: ENCODED_ZEOTAP_COOKIE
      });
    });

    it('provides the stored Zeotap id if cookie is absent but present in local storage', function() {
      storage.setDataInLocalStorage(ZEOTAP_COOKIE_NAME, ENCODED_ZEOTAP_COOKIE);
      let id = zeotapIdPlusSubmodule.getId();
      expect(id).to.deep.equal({
        id: ENCODED_ZEOTAP_COOKIE
      });
    });

    it('returns undefined if both cookie and local storage are empty', function() {
      let id = zeotapIdPlusSubmodule.getId();
      expect(id).to.be.undefined
    })
  });

  describe('test method: decode', function() {
    it('provides the Zeotap ID (IDP) from a stored object', function() {
      let zeotapId = {
        id: ENCODED_ZEOTAP_COOKIE,
      };

      expect(zeotapIdPlusSubmodule.decode(zeotapId)).to.deep.equal({
        IDP: ZEOTAP_COOKIE
      });
    });

    it('provides the Zeotap ID (IDP) from a stored string', function() {
      let zeotapId = ENCODED_ZEOTAP_COOKIE;

      expect(zeotapIdPlusSubmodule.decode(zeotapId)).to.deep.equal({
        IDP: ZEOTAP_COOKIE
      });
    });
  });

  describe('requestBids hook', function() {
    let adUnits;

    beforeEach(function() {
      adUnits = [getAdUnitMock()];
      storage.setCookie(
        ZEOTAP_COOKIE_NAME,
        ENCODED_ZEOTAP_COOKIE
      );
      init(config);
      setSubmoduleRegistry([zeotapIdPlusSubmodule]);
      config.setConfig(getConfigMock());
    });

    afterEach(function() {
      unsetCookie();
      unsetLocalStorage();
    });

    it('when a stored Zeotap ID exists it is added to bids', function(done) {
      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.IDP');
            expect(bid.userId.IDP).to.equal(ZEOTAP_COOKIE);
            const zeotapIdAsEid = find(bid.userIdAsEids, e => e.source == 'zeotap.com');
            expect(zeotapIdAsEid).to.deep.equal({
              source: 'zeotap.com',
              uids: [{
                id: ZEOTAP_COOKIE,
                atype: 1,
              }]
            });
          });
        });
        done();
      }, { adUnits });
    });
  });
});
