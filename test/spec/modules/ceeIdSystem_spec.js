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
    it('should return an object with id when ceeIdToken is found in LS', () => {
      const config = {
        name: 'ceeId',
        storage: {
          type: 'cookie',
          name: 'ceeIdToken',
          expires: 7,
          refreshInSeconds: 360,
        },
        params: {
          tokenName: 'WPxid',
        },
      };

      getDataFromLocalStorageStub.returns('testToken');
      getCookieStub.returns('testToken');

      const result = ceeIdSubmodule.getId(config);

      expect(result).to.deep.equal({ id: 'testToken' });
    });

    it('should return an object with id when ceeIdToken is passed in setConfig', () => {
      const config = {
        name: 'ceeId',
        storage: {
          type: 'cookie',
          name: 'ceeIdToken',
          expires: 7,
          refreshInSeconds: 360,
        },
        params: {
          tokenName: 'WPxid',
          value: 'testTokenFromSetConfig'
        },
      };

      getDataFromLocalStorageStub.returns('testToken');
      getCookieStub.returns('testToken');

      const result = ceeIdSubmodule.getId(config);

      expect(result).to.deep.equal({ id: 'testTokenFromSetConfig' });
    });

    it('should return undefined when ceeIdToken is not found', () => {
      const config = {
        name: 'ceeId',
        storage: {
          type: 'cookie',
          name: 'ceeIdToken',
          expires: 7,
          refreshInSeconds: 360,
        },
        params: {
          tokenName: 'WPxid',
        },
      };
      const result = ceeIdSubmodule.getId(config);

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
      const tokenName = 'testToken';

      getDataFromLocalStorageStub.returns('local_storage_data');

      const result = readId(tokenName);

      expect(result).to.equal('local_storage_data');
    });

    it('should return data from cookie when local storage data does not exist', () => {
      const tokenName = 'testToken';

      getDataFromLocalStorageStub.returns(null);
      getCookieStub.returns('cookie_data');

      const result = readId(tokenName);

      expect(result).to.equal('cookie_data');
    });

    it('should return null when neither local storage data nor cookie data exists', () => {
      const tokenName = 'testToken';

      getDataFromLocalStorageStub.returns(null);
      getCookieStub.returns(null);

      const result = readId(tokenName);

      expect(result).to.be.null;
    });
  });
});
