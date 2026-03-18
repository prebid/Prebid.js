import * as utils from '../../../src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { startioIdSubmodule } from 'modules/startioIdSystem.js';
import { createEidsArray } from '../../../modules/userId/eids.js';

describe('StartIO ID System', function () {
  let sandbox;

  const validConfig = {
    params: {},
    storage: {
      expires: 365
    }
  };

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    sandbox.stub(utils, 'logError');
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
          atype: 1
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

  describe('eid', function () {
    it('should generate correct EID', function () {
      const TEST_UID = 'test-uid-value';
      const eids = createEidsArray(startioIdSubmodule.decode(TEST_UID), new Map(Object.entries(startioIdSubmodule.eids)));
      expect(eids).to.eql([
        {
          source: 'start.io',
          uids: [
            {
              atype: 1,
              id: TEST_UID
            }
          ]
        }
      ]);
    });
  });

  describe('getId', function () {
    it('should return callback and fire ajax even if no endpoint configured', function () {
      const config = { params: {} };
      const result = startioIdSubmodule.getId(config);
      expect(result).to.have.property('callback');
      expect(typeof result.callback).to.equal('function');

      const callbackSpy = sinon.spy();
      result.callback(callbackSpy);
      expect(server.requests.length).to.equal(1);
    });

    it('should return callback and fire ajax even if endpoint is not a string', function () {
      const config = { params: { endpoint: 123 } };
      const result = startioIdSubmodule.getId(config);
      expect(result).to.have.property('callback');
      expect(typeof result.callback).to.equal('function');

      const callbackSpy = sinon.spy();
      result.callback(callbackSpy);
      expect(server.requests.length).to.equal(1);
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
      expect(request.url).to.eq('https://cs.startappnetwork.com/get-uid-obj?p=m4b8b3y4');

      const serverId = 'new-server-id-12345';
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ uid: serverId }));

      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.equal(serverId);
    });

    it('should append consent params to the request URL', function () {
      const consentData = {
        gdpr: {
          gdprApplies: true,
          consentString: 'TEST_CONSENT_STRING'
        },
        usp: '1YNN',
        gpp: {
          gppString: 'TEST_GPP_STRING',
          applicableSections: [7]
        }
      };

      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(validConfig, consentData).callback;
      callback(callbackSpy);

      const request = server.requests[0];
      expect(request.url).to.include('gdpr=1');
      expect(request.url).to.include('gdpr_consent=TEST_CONSENT_STRING');
      expect(request.url).to.include('us_privacy=1YNN');
      expect(request.url).to.include('gpp=TEST_GPP_STRING');
      expect(request.url).to.include('gpp_sid=7');
    });

    it('should send request without consent params when consentData is absent', function () {
      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(validConfig).callback;
      callback(callbackSpy);

      const request = server.requests[0];
      expect(request.url).to.eq('https://cs.startappnetwork.com/get-uid-obj?p=m4b8b3y4');
    });

    it('should log error if server response is missing uid field', function () {
      const callbackSpy = sinon.spy();
      const callback = startioIdSubmodule.getId(validConfig).callback;
      callback(callbackSpy);

      const request = server.requests[0];
      request.respond(200, { 'Content-Type': 'application/json' }, JSON.stringify({ wrongField: 'value' }));

      expect(utils.logError.calledOnce).to.be.true;
      expect(utils.logError.args[0][0]).to.include('missing \'uid\' field');
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

    it('should set default storage.expires to 90 when not provided', function () {
      const config = { params: {}, storage: { type: 'html5', name: 'startioId' } };
      startioIdSubmodule.getId(config);
      expect(config.storage.expires).to.equal(90);
    });

    it('should not override storage.expires when already set', function () {
      const config = { params: {}, storage: { type: 'html5', name: 'startioId', expires: 365 } };
      startioIdSubmodule.getId(config);
      expect(config.storage.expires).to.equal(365);
    });
  });
});
