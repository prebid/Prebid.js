import {expect} from 'chai';
import {idxIdSubmodule, storage} from 'modules/idxIdSystem.js';
import 'src/prebid.js';

const IDX_COOKIE_NAME = '_idx';
const IDX_DUMMY_VALUE = 'idx value for testing';
const IDX_COOKIE_STORED = '{ "idx": "' + IDX_DUMMY_VALUE + '" }';
const ID_COOKIE_OBJECT = { id: IDX_DUMMY_VALUE };
const IDX_COOKIE_OBJECT = { idx: IDX_DUMMY_VALUE };

describe('IDx ID System', () => {
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

  describe('IDx: test "getId" method', () => {
    it('provides the stored IDx if a cookie exists', () => {
      getCookieStub.withArgs(IDX_COOKIE_NAME).returns(IDX_COOKIE_STORED);
      const idx = idxIdSubmodule.getId();
      expect(idx).to.deep.equal(ID_COOKIE_OBJECT);
    });

    it('provides the stored IDx if cookie is absent but present in local storage', () => {
      getDataFromLocalStorageStub.withArgs(IDX_COOKIE_NAME).returns(IDX_COOKIE_STORED);
      const idx = idxIdSubmodule.getId();
      expect(idx).to.deep.equal(ID_COOKIE_OBJECT);
    });

    it('returns undefined if both cookie and local storage are empty', () => {
      const idx = idxIdSubmodule.getId();
      expect(idx).to.be.undefined;
    })
  });

  describe('IDx: test "decode" method', () => {
    it('provides the IDx from a stored object', () => {
      expect(idxIdSubmodule.decode(ID_COOKIE_OBJECT)).to.deep.equal(IDX_COOKIE_OBJECT);
    });

    it('provides the IDx from a stored string', () => {
      expect(idxIdSubmodule.decode(IDX_DUMMY_VALUE)).to.deep.equal(IDX_COOKIE_OBJECT);
    });
  });
});
