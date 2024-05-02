import { expect } from 'chai';
import {find} from 'src/polyfill.js';
import { storage, deepintentDpesSubmodule } from 'modules/deepintentDpesIdSystem.js';
import { init, requestBidsHook, setSubmoduleRegistry } from 'modules/userId/index.js';
import { config } from 'src/config.js';

const DI_COOKIE_NAME = '_dpes_id';
const DI_COOKIE_STORED = '{"id":"2cf40748c4f7f60d343336e08f80dc99"}';
const DI_COOKIE_OBJECT = {id: '2cf40748c4f7f60d343336e08f80dc99'};

const cookieConfig = {
  name: 'deepintentId',
  storage: {
    type: 'cookie',
    name: '_dpes_id',
    expires: 28
  }
};

const html5Config = {
  name: 'deepintentId',
  storage: {
    type: 'html5',
    name: '_dpes_id',
    expires: 28
  }
}

describe('Deepintent DPES System', () => {
  let getDataFromLocalStorageStub, localStorageIsEnabledStub;
  let getCookieStub, cookiesAreEnabledStub;

  beforeEach(() => {
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
    getCookieStub = sinon.stub(storage, 'getCookie');
    cookiesAreEnabledStub = sinon.stub(storage, 'cookiesAreEnabled');
  });

  afterEach(() => {
    getDataFromLocalStorageStub.restore();
    localStorageIsEnabledStub.restore();
    getCookieStub.restore();
    cookiesAreEnabledStub.restore();
  });

  describe('Deepintent Dpes Sytsem: test "getId" method', () => {
    it('Wrong config should fail the tests', () => {
      // no config
      expect(deepintentDpesSubmodule.getId()).to.be.eq(undefined);
      expect(deepintentDpesSubmodule.getId({ })).to.be.eq(undefined);

      expect(deepintentDpesSubmodule.getId({params: {}, storage: {}})).to.be.eq(undefined);
      expect(deepintentDpesSubmodule.getId({params: {}, storage: {type: 'cookie'}})).to.be.eq(undefined);
      expect(deepintentDpesSubmodule.getId({params: {}, storage: {name: '_dpes_id'}})).to.be.eq(undefined);
    });

    it('Get value stored in cookie for getId', () => {
      getCookieStub.withArgs(DI_COOKIE_NAME).returns(DI_COOKIE_STORED);
      let diId = deepintentDpesSubmodule.getId(cookieConfig, undefined, DI_COOKIE_OBJECT);
      expect(diId).to.deep.equal(DI_COOKIE_OBJECT);
    });

    it('provides the stored deepintentId if cookie is absent but present in local storage', () => {
      getDataFromLocalStorageStub.withArgs(DI_COOKIE_NAME).returns(DI_COOKIE_STORED);
      let idx = deepintentDpesSubmodule.getId(html5Config, undefined, DI_COOKIE_OBJECT);
      expect(idx).to.deep.equal(DI_COOKIE_OBJECT);
    });
  });

  describe('Deepintent Dpes System : test "decode" method', () => {
    it('Get the correct decoded value for dpes id', () => {
      expect(deepintentDpesSubmodule.decode(DI_COOKIE_OBJECT, cookieConfig)).to.deep.equal({'deepintentId': {'id': '2cf40748c4f7f60d343336e08f80dc99'}});
    });
  });
});
