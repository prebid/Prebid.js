import { pirIdSubmodule, storage, readId } from 'modules/pirIdSystem.js';
import sinon from 'sinon';

describe('pirIdSystem', () => {
  let sandbox;
  let setCookieStub;
  let getCookieStub;
  let setDataInLocalStorageStub;
  let getDataFromLocalStorageStub;
  let localStorageIsEnabledStub;
  let cookiesAreEnabledStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    setCookieStub = sandbox.stub(storage, 'setCookie');
    getCookieStub = sandbox.stub(storage, 'getCookie');
    setDataInLocalStorageStub = sandbox.stub(storage, 'setDataInLocalStorage');
    getDataFromLocalStorageStub = sandbox.stub(storage, 'getDataFromLocalStorage');
    localStorageIsEnabledStub = sandbox.stub(storage, 'localStorageIsEnabled');
    cookiesAreEnabledStub = sandbox.stub(storage, 'cookiesAreEnabled');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('setId', () => {
    it('should set ID token in local storage when enabled', () => {
      const config = { params: { pirIdToken: 'testToken' } };

      localStorageIsEnabledStub.returns(true);
      pirIdSubmodule.setId(config);

      expect(setDataInLocalStorageStub.calledWith('pirIdToken', config.params.pirIdToken)).to.be.true;
    });

    it('should set ID token in cookies when enabled', () => {
      const config = { params: { pirIdToken: 'testToken' } };

      cookiesAreEnabledStub.returns(true);
      pirIdSubmodule.setId(config);

      expect(setCookieStub.calledWith('pirIdToken', config.params.pirIdToken, undefined, undefined, 'pir.wp.pl')).to.be.true;
    });
  });

  describe('getId', () => {
    it('should return an object with id when pirIdToken is found', () => {
      const config = { params: { pirIdToken: 'testToken' } };
      const setIdStub = sandbox.stub(pirIdSubmodule, 'setId');

      getDataFromLocalStorageStub.returns('testToken');
      getCookieStub.returns('testToken');

      const result = pirIdSubmodule.getId(config);

      expect(setIdStub.calledWith(config)).to.be.false;
      expect(result).to.deep.equal({ id: 'testToken' });
    });

    it('should return undefined when pirIdToken is not found', () => {
      const config = { params: { pirIdToken: 'testToken' } };
      const setIdStub = sandbox.stub(pirIdSubmodule, 'setId');

      const result = pirIdSubmodule.getId(config);

      expect(setIdStub.calledWith(config)).to.be.true;
      expect(result).to.deep.equal({ id: 'testToken' });
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

  describe('domainOverride', () => {
    it('should extract top-level domain from current windows location', () => {
      const result = pirIdSubmodule.domainOverride();

      expect(result).to.deep.equal('localhost');
    });
  });

  describe('readId', () => {
    it('should return data from local storage when it exists', () => {
      getDataFromLocalStorageStub.returns('local_storage_data');

      const result = readId();

      expect(result).to.equal('local_storage_data');
      expect(getDataFromLocalStorageStub.calledWith('pirIdToken')).to.be.true;
      expect(getCookieStub.called).to.be.false;
    });

    it('should return data from cookie when local storage data does not exist', () => {
      getDataFromLocalStorageStub.returns(null);
      getCookieStub.returns('cookie_data');

      const result = readId();

      expect(result).to.equal('cookie_data');
      expect(getDataFromLocalStorageStub.calledWith('pirIdToken')).to.be.true;
      expect(getCookieStub.calledWith('pirIdToken')).to.be.true;
    });

    it('should return null when neither local storage data nor cookie data exists', () => {
      getDataFromLocalStorageStub.returns(null);
      getCookieStub.returns(null);

      const result = readId();

      expect(result).to.be.null;
      expect(getDataFromLocalStorageStub.calledWith('pirIdToken')).to.be.true;
      expect(getCookieStub.calledWith('pirIdToken')).to.be.true;
    });
  });
});
