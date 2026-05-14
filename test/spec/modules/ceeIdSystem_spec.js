import { ceeIdSubmodule, storage, readId, fetchCeeIdToken } from 'modules/ceeIdSystem.js';
import { expect } from 'chai';
import { server } from 'test/mocks/xhr.js';
import * as utils from 'src/utils.js';
import sinon from 'sinon';

describe('ceeIdSystem', () => {
  let sandbox;
  let getCookieStub;
  let getDataFromLocalStorageStub;

  const consentData = {
    gdprApplies: true,
    consentString: 'abc123=='
  }

  const MODULE_NAME = 'ceeId';

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
          cookieName: 'WPxid',
        },
      };

      getDataFromLocalStorageStub.returns('testToken');
      getCookieStub.returns('testToken');

      const result = ceeIdSubmodule.getId(config, consentData);

      expect(result).to.deep.equal({ id: 'testToken' });
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
          cookieName: 'WPxid',
        },
      };

      const result = ceeIdSubmodule.getId(config, consentData);

      expect(result).to.be.undefined;
    });

    it('should call the callback with the response body if status 200 is sent', (done) => {
      const config = {
        params: {
          publisherId: 'testPublisher',
          type: 'testType',
          value: 'testValue'
        }
      };

      const consentData = {
        consentString: 'testConsentString'
      };

      const callbackSpy = sinon.spy();
      const callback = ceeIdSubmodule.getId(config, consentData).callback;
      callback(callbackSpy);

      const request = server.requests[0];
      expect(request).to.not.be.undefined;
      expect(request.url).to.include('https://ceeid.eu/api/token/generate');
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ value: 'testToken' }));

      setTimeout(() => {
        expect(callbackSpy.calledOnce).to.be.true;
        expect(callbackSpy.lastCall.args[0]).to.deep.equal('testToken');
        done();
      }, 0);
    });
  });

  describe('fetchCeeIdToken', () => {
    it('should resolve with the token if the response is successful', () => {
      const consentString = 'testConsentString';
      const requestData = {
        publisherId: 'testPublisher',
        type: 'testType',
        value: 'testValue',
        properties: {
          consent: consentString
        },
      };
      const responseBody = JSON.stringify({ value: 'testToken' });

      fetchCeeIdToken(requestData).then((token) => {
        expect(token).to.equal('testToken');
      }).catch();

      const request = server.requests[0];
      expect(request).to.not.be.undefined;
      expect(request.url).to.equal('https://ceeid.eu/api/token/generate');
      expect(request.method).to.equal('POST');
      expect(request.requestHeaders['Content-Type']).to.equal('application/json');
      expect(request.requestBody).to.equal(JSON.stringify(requestData));

      request.respond(200, { 'Content-Type': 'application/json' }, responseBody);
    });

    it('should reject if there is no token in the response', () => {
      const consentString = 'testConsentString';
      const requestData = {
        publisherId: 'testPublisher',
        type: 'testType',
        value: 'testValue',
        properties: {
          consent: consentString
        },
      };
      const responseBody = JSON.stringify({});

      const tokenPromise = fetchCeeIdToken(requestData);
      const request = server.requests[0];
      request.respond(200, { 'Content-Type': 'application/json' }, responseBody);

      return tokenPromise.then(() => {
        throw new Error('Promise should not be resolved');
      }).catch((error) => {
        expect(error.message).to.equal('No token in response');
      });
    });

    it('should reject if the response is not valid JSON', () => {
      const consentString = 'testConsentString';
      const requestData = {
        publisherId: 'testPublisher',
        type: 'testType',
        value: 'testValue',
        properties: {
          consent: consentString
        },
      };
      const responseBody = 'Invalid JSON';

      const tokenPromise = fetchCeeIdToken(requestData);
      const request = server.requests[0];
      expect(request).to.not.be.undefined;
      request.respond(400, { 'Content-Type': 'application/json' }, responseBody);

      return tokenPromise.then(() => {
        throw new Error('Promise should not be resolved');
      }).catch((error) => {
        expect(error).to.equal('Bad Request');
      });
    });

    it('should reject if the request encounters an error', async () => {
      const consentString = 'testConsentString';
      const requestData = {
        publisherId: 'testPublisher',
        type: 'testType',
        value: 'testValue',
        properties: {
          consent: consentString
        },
      };

      const tokenPromise = fetchCeeIdToken(requestData);
      const request = server.requests[0];
      expect(request).to.not.be.undefined;
      request.error();

      await tokenPromise.then(() => {
        throw new Error('Promise should not be resolved');
      }).catch((error) => {
        expect(error).to.equal('Network Error');
      });
    });

    it('should handle fetchCeeIdToken network error and log it', async () => {
      const requestData = {
        publisherId: 'testPublisher',
        type: 'testType',
        value: 'testValue'
      };
      const logErrorSpy = sandbox.spy(utils, 'logError');
      const tokenPromise = fetchCeeIdToken(requestData);
      const request = server.requests[0];
      expect(request).to.not.be.undefined;
      request.error();

      await tokenPromise.then(() => {
        throw new Error('Promise should not be resolved');
      }).catch((error) => {
        expect(error).to.equal('Network Error');
        expect(logErrorSpy.calledOnce).to.be.true;
        expect(logErrorSpy.calledWith(`${MODULE_NAME}: ID fetch encountered an error`, 'Network Error')).to.be.true;
      });
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
      const cookieName = 'testToken';

      getDataFromLocalStorageStub.returns('local_storage_data');

      const result = readId(cookieName);

      expect(result).to.equal('local_storage_data');
    });

    it('should return data from cookie when local storage data does not exist', () => {
      const cookieName = 'testToken';

      getDataFromLocalStorageStub.returns(null);
      getCookieStub.returns('cookie_data');

      const result = readId(cookieName);

      expect(result).to.equal('cookie_data');
    });

    it('should return null when neither local storage data nor cookie data exists', () => {
      const cookieName = 'testToken';

      getDataFromLocalStorageStub.returns(null);
      getCookieStub.returns(null);

      const result = readId(cookieName);

      expect(result).to.be.null;
    });
  });
});
