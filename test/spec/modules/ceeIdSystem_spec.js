import { ceeIdSubmodule, storage, readId } from 'modules/ceeIdSystem.js';
import sinon from 'sinon';

describe('ceeIdSystem', () => {
  let sandbox;
  let getCookieStub;
  let getDataFromLocalStorageStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    getCookieStub = sandbox.stub(storage, 'getCookie');
    getDataFromLocalStorageStub = sandbox.stub(storage, 'getDataFromLocalStorage');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getId', () => {
    it('should return an object with id when ceeIdToken is found', () => {
      getDataFromLocalStorageStub.returns('testToken');
      getCookieStub.returns('testToken');

      const result = ceeIdSubmodule.getId();

      expect(result).to.deep.equal({ id: 'testToken' });
    });

    it('should return undefined when ceeIdToken is not found', () => {
      const result = ceeIdSubmodule.getId();

      expect(result).to.be.undefined;
    });
  });

  describe('decode', () => {
    it('should return an object with ceeId when value is a string', () => {
      const result = ceeIdSubmodule.decode('testId');

      expect(result).to.deep.equal({ ceeId: 'testId' });
    });

    it('should return undefined when value is not a string', () => {
      const result = ceeIdSubmodule.decode({});

      expect(result).to.be.undefined;
    });
  });

  describe('readId', () => {
    it('should return data from local storage when it exists', () => {
      getDataFromLocalStorageStub.returns('local_storage_data');

      const result = readId();

      expect(result).to.equal('local_storage_data');
    });

    it('should return data from cookie when local storage data does not exist', () => {
      getDataFromLocalStorageStub.returns(null);
      getCookieStub.returns('cookie_data');

      const result = readId();

      expect(result).to.equal('cookie_data');
    });

    it('should return null when neither local storage data nor cookie data exists', () => {
      getDataFromLocalStorageStub.returns(null);
      getCookieStub.returns(null);

      const result = readId();

      expect(result).to.be.null;
    });
  });
});
