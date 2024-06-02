import { pirIdSubmodule, storage, readId } from 'modules/pirIdSystem.js';
import sinon from 'sinon';

describe('pirIdSystem', () => {
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
    it('should return an object with id when pirIdToken is found', () => {
      getDataFromLocalStorageStub.returns('testToken');
      getCookieStub.returns('testToken');

      const result = pirIdSubmodule.getId();

      expect(result).to.deep.equal({ id: 'testToken' });
    });

    it('should return undefined when pirIdToken is not found', () => {
      const result = pirIdSubmodule.getId();

      expect(result).to.be.undefined;
    });
  });

  describe('decode', () => {
    it('should return an object with pirId when value is a string', () => {
      const result = pirIdSubmodule.decode('testId');

      expect(result).to.deep.equal({ pirId: 'testId' });
    });

    it('should return undefined when value is not a string', () => {
      const result = pirIdSubmodule.decode({});

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
