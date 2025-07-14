import {expect} from 'chai';
import {lmpIdSubmodule, storage} from 'modules/lmpIdSystem.js';

describe('LMPID System', () => {
  let getDataFromLocalStorageStub, localStorageIsEnabledStub;
  let windowLmpidStub;

  beforeEach(() => {
    window.__lmpid = undefined;
    windowLmpidStub = sinon.stub(window, '__lmpid');
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    localStorageIsEnabledStub = sinon.stub(storage, 'localStorageIsEnabled');
  });

  afterEach(() => {
    getDataFromLocalStorageStub.restore();
    localStorageIsEnabledStub.restore();
    windowLmpidStub.restore();
  });

  describe('LMPID: test "getId" method', () => {
    it('prefers the window cached LMPID', () => {
      localStorageIsEnabledStub.returns(true);
      getDataFromLocalStorageStub.withArgs('__lmpid').returns('stored-lmpid');

      windowLmpidStub.value('lmpid');
      expect(lmpIdSubmodule.getId()).to.deep.equal({ id: 'lmpid' });
    });

    it('fallbacks on localStorage when window cache is falsy', () => {
      localStorageIsEnabledStub.returns(true);
      getDataFromLocalStorageStub.withArgs('__lmpid').returns('stored-lmpid');

      windowLmpidStub.value('');
      expect(lmpIdSubmodule.getId()).to.deep.equal({ id: 'stored-lmpid' });

      windowLmpidStub.value(false);
      expect(lmpIdSubmodule.getId()).to.deep.equal({ id: 'stored-lmpid' });
    });

    it('fallbacks only if localStorageIsEnabled', () => {
      localStorageIsEnabledStub.returns(false);
      getDataFromLocalStorageStub.withArgs('__lmpid').returns('stored-lmpid');

      expect(lmpIdSubmodule.getId()).to.be.undefined;
    });
  });

  describe('LMPID: test "decode" method', () => {
    it('provides the lmpid from a stored object', () => {
      expect(lmpIdSubmodule.decode('lmpid')).to.deep.equal({ lmpid: 'lmpid' });
    });
  });
});
