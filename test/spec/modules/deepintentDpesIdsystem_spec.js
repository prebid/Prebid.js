import { expect } from 'chai';
import find from 'core-js-pure/features/array/find.js';
import { storage, deepintentDpesSubmodule } from 'modules/deepintentDpesIdSystem.js';
import { init, requestBidsHook, setSubmoduleRegistry } from 'modules/userId/index.js';
import { config } from 'src/config.js';

const DI_COOKIE_NAME = '_di';
const DI_LOCALSTORAGE_ID = 'di_dpes';
const DI_DUMMY_VALUE = '{"email":"2cf40748c4f7f60d343336e08f80dc99","siteId":"80088"}';
const DI_COOKIE_STORED = DI_DUMMY_VALUE;
const DI_EMAIL_DECODE_VALUE = {
  email: '2cf40748c4f7f60d343336e08f80dc99',
  siteId: '80088'
};
const DI_NPI_DECODE_VALUE = {
  npi: '2cf40748c4f7f60d343336e08f80dc99',
  siteId: '80088'
};
const DI_COOKIE_OBJECT = {
  id: {
    email: '2cf40748c4f7f60d343336e08f80dc99',
    siteId: '80088'
  }
};
const cookieConfig = {
  name: 'deepintentId',
  params: {
    identityKey: 'hashedEmail',
    siteId: '80088'
  },
  storage: {
    type: 'cookie',
    name: '_di',
    expires: 28
  }
};
const cookieNPIConfig = {
  name: 'deepintentId',
  params: {
    identityKey: 'hashedNPI',
    siteId: '80088'
  },
  storage: {
    type: 'cookie',
    name: '_di',
    expires: 28
  }
};

const html5Config = {
  name: 'deepintentId',
  params: {
    identityKey: 'hashedEmail',
    siteId: '80088'
  },
  storage: {
    type: 'html5'
  }
};


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
      expect(deepintentDpesSubmodule.getId({params: {}, storage: {name: '_di'}})).to.be.eq(undefined);
    });

    it('Get value stored in cookie for getId', () => {
      getCookieStub.withArgs(DI_COOKIE_NAME).returns(DI_COOKIE_STORED);
      let diId = deepintentDpesSubmodule.getId(cookieConfig);
      expect(diId).to.deep.equal(DI_COOKIE_OBJECT);
    });

    it('provides the stored deepintentId if cookie is absent but present in local storage', () => {
      getDataFromLocalStorageStub.withArgs(DI_LOCALSTORAGE_ID).returns(DI_COOKIE_STORED);
      let idx = deepintentDpesSubmodule.getId(html5Config);
      expect(idx).to.deep.equal(DI_COOKIE_OBJECT);
    });
  });

  describe('Deepintent Dpes System : test "decode" method', () => {
    it('Wrong params passed via config', () => {
      expect(deepintentDpesSubmodule.decode('test', {params: {}})).to.be.undefined;
      expect(deepintentDpesSubmodule.decode('test', {params: {identityKey: 'hashedEmail'}})).to.be.undefined;
      expect(deepintentDpesSubmodule.decode('test', {params: {identityKey: 'hashedNPI'}})).to.be.undefined;
      expect(deepintentDpesSubmodule.decode('test', {params: {siteId: '80088'}})).to.be.undefined;
      expect(deepintentDpesSubmodule.decode('test', {params: {siteId: '80088', identityKey: 'hello'}})).to.be.undefined;
    });

    it('Get the correct decoded value for dpes id', () => {
      expect(deepintentDpesSubmodule.decode(DI_EMAIL_DECODE_VALUE, cookieConfig)).to.deep.equal({'deepintentId': '2cf40748c4f7f60d343336e08f80dc99'});
      expect(deepintentDpesSubmodule.decode(DI_NPI_DECODE_VALUE, cookieNPIConfig)).to.deep.equal({'deepintentId': '2cf40748c4f7f60d343336e08f80dc99'});
    });

    it('Check for wrong siteId', () => {
      expect(deepintentDpesSubmodule.decode(DI_EMAIL_DECODE_VALUE, {params: {siteId: '80090', identityKey: 'hashedEmail'}})).to.be.undefined;
    });
  });
});
