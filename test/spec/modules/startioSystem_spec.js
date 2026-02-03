import * as utils from '../../../src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { startioIdSubmodule, storage } from 'modules/startioSystem.js';

describe('StartIO ID System', function () {
  let sandbox;

  const validConfig = {
    params: {
      endpoint: 'https://test-endpoint.start.io/getId'
    },
    storage: {
      expires: 365
    }
  };

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logError');
    sandbox.stub(storage, 'getCookie').returns(null);
    sandbox.stub(storage, 'setCookie');
    sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
    sandbox.stub(storage, 'setDataInLocalStorage');
    sandbox.stub(storage, 'cookiesAreEnabled').returns(true);
    sandbox.stub(storage, 'localStorageIsEnabled').returns(true);
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('module registration', function () {
    it('should register the submodule', function () {
      expect(startioIdSubmodule.name).to.equal('startioId');
    });

    it('should have eids configuration', function () {
      expect(startioIdSubmodule.eids).to.deep.equal({
        'startioId': {
          source: 'start.io',
          atype: 3
        }
      });
    });
  });

  describe('decode', function () {
    it('should return undefined if no value passed', function () {
      expect(startioIdSubmodule.decode()).to.be.undefined;
    });

    it('should return undefined if invalid value passed', function () {
      expect(startioIdSubmodule.decode(123)).to.be.undefined;
      expect(startioIdSubmodule.decode(null)).to.be.undefined;
      expect(startioIdSubmodule.decode({})).to.be.undefined;
      expect(startioIdSubmodule.decode('')).to.be.undefined;
    });

    it('should return startioId object if valid string passed', function () {
      const id = 'test-uuid-12345';
      const result = startioIdSubmodule.decode(id);
      expect(result).to.deep.equal({ 'startioId': id });
    });
  });

  describe('getId', function () {
    it('should log an error if no endpoint configured', function () {
      const config = { params: {} };
      startioIdSubmodule.getId(config);
      expect(utils.logError.calledOnce).to.be.true;
      expect(utils.logError.args[0][0]).to.include('requires an endpoint');
    });

    it('should log an error if endpoint is not a string', function () {
      const config = { params: { endpoint: 123 } };
      startioIdSubmodule.getId(config);
      expect(utils.logError.calledOnce).to.be.true;
    });

    it('should return existing storedId immediately if provided', function () {
      const storedId = 'existing-id-12345';
      const result = startioIdSubmodule.getId(validConfig, {}, storedId);
      expect(result).to.deep.equal({ id: storedId });
      expect(server.requests.length).to.eq(0);
    });

    it('should fetch new ID from server if no storedId provided', function () {
      const result = startioIdSubmodule.getId(validConfig);
      expect(result).to.have.property('callback');
      expect(typeof result.callback).to.equal('function');
    });

    it('should invoke callback with ID from server response', function () {
      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(validConfig).callback;
      callback(callbackSpy);

      const request = server.requests[0];
      expect(request.method).to.eq('GET');
      expect(request.url).to.eq(validConfig.params.endpoint);

      const serverId = 'new-server-id-12345';
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ id: serverId }));

      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.equal(serverId);
    });

    it('should store new ID in both cookie and localStorage by default', function () {
      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(validConfig).callback;
      callback(callbackSpy);

      const serverId = 'new-server-id-12345';
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ id: serverId }));

      expect(storage.setCookie.calledOnce).to.be.true;
      expect(storage.setCookie.args[0][0]).to.equal('startioId');
      expect(storage.setCookie.args[0][1]).to.equal(serverId);
      expect(storage.setDataInLocalStorage.calledOnce).to.be.true;
      expect(storage.setDataInLocalStorage.args[0][0]).to.equal('startioId');
      expect(storage.setDataInLocalStorage.args[0][1]).to.equal(serverId);
    });

    it('should store only in cookie when storage type is cookie', function () {
      const config = { ...validConfig, storage: { ...validConfig.storage, type: 'cookie' } };
      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(config).callback;
      callback(callbackSpy);

      const serverId = 'new-server-id-12345';
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ id: serverId }));

      expect(storage.setCookie.calledOnce).to.be.true;
      expect(storage.setDataInLocalStorage.called).to.be.false;
    });

    it('should store only in localStorage when storage type is html5', function () {
      const config = { ...validConfig, storage: { ...validConfig.storage, type: 'html5' } };
      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(config).callback;
      callback(callbackSpy);

      const serverId = 'new-server-id-12345';
      server.requests[0].respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ id: serverId }));

      expect(storage.setCookie.called).to.be.false;
      expect(storage.setDataInLocalStorage.calledOnce).to.be.true;
    });

    it('should log error if server response is missing id field', function () {
      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(validConfig).callback;
      callback(callbackSpy);

      const request = server.requests[0];
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ wrongField: 'value' }));

      expect(utils.logError.calledOnce).to.be.true;
      expect(utils.logError.args[0][0]).to.include('missing \'id\' field');
    });

    it('should log error if server response is invalid JSON', function () {
      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(validConfig).callback;
      callback(callbackSpy);

      const request = server.requests[0];
      request.respond(200, { 'Content-Type': 'application/json' }, 'invalid-json{');

      expect(utils.logError.calledOnce).to.be.true;
      expect(utils.logError.args[0][0]).to.include('Error parsing');
    });

    it('should log error if server request fails', function () {
      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(validConfig).callback;
      callback(callbackSpy);

      const request = server.requests[0];
      request.error();

      expect(utils.logError.calledOnce).to.be.true;
      expect(utils.logError.args[0][0]).to.include('encountered an error');
    });

    it('should not store in cookie if cookies are disabled', function () {
      storage.cookiesAreEnabled.returns(false);

      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(validConfig).callback;
      callback(callbackSpy);

      const request = server.requests[0];
      const serverId = 'new-server-id-12345';
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ id: serverId }));

      expect(storage.setCookie.called).to.be.false;
      expect(storage.setDataInLocalStorage.calledOnce).to.be.true;
    });

    it('should not store in localStorage if localStorage is disabled', function () {
      storage.localStorageIsEnabled.returns(false);

      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(validConfig).callback;
      callback(callbackSpy);

      const request = server.requests[0];
      const serverId = 'new-server-id-12345';
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ id: serverId }));

      expect(storage.setCookie.calledOnce).to.be.true;
      expect(storage.setDataInLocalStorage.called).to.be.false;
    });
  });
});
