import {
  sharedIdSystemSubmodule,
  storage
} from 'modules/sharedIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import {uspDataHandler} from 'src/adapterManager';
import sinon from 'sinon';
import * as utils from 'src/utils.js';

let expect = require('chai').expect;

describe('SharedId System', function() {
  const UUID = '15fde1dc-1861-4894-afdf-b757272f3568';
  const START_TIME_MILLIS = 1234;

  before(function() {
    sinon.stub(utils, 'generateUUID').returns(UUID);
  });

  after(function() {
    utils.generateUUID.restore();
  });

  describe('Xhr Requests from getId()', function() {
    const SHAREDID_RESPONSE = {sharedId: 'testsharedid'};
    const callbackSpy = sinon.spy();

    let uspConsentDataStub
    let setCookeStub;
    let sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      uspConsentDataStub = sandbox.stub(uspDataHandler, 'getConsentData');
      setCookeStub = sandbox.stub(storage, 'setCookie');

      sandbox.stub(storage, 'cookiesAreEnabled').returns(true);
      sandbox.stub(utils, 'hasDeviceAccess').returns(true);

      sandbox.useFakeTimers(START_TIME_MILLIS);

      callbackSpy.resetHistory();
    });

    afterEach(function () {
      sandbox.restore();
    });

    it('should call shared id endpoint without consent data and handle a valid response', function () {
      let config = {
        storage: {
          type: 'cookie',
          name: '_pubcid',
          expires: 10
        }
      };

      let submoduleCallback = sharedIdSystemSubmodule.getId(config, undefined).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      expect(request.url).to.equal('https://id.sharedid.org/id');
      expect(request.withCredentials).to.be.true;

      request.respond(200, {}, JSON.stringify(SHAREDID_RESPONSE));

      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.equal(UUID);

      expect(setCookeStub.calledThrice).to.be.true;

      let testCookieName = `_gd${START_TIME_MILLIS}`;
      expect(setCookeStub.firstCall.args).to.eql([testCookieName, '1', undefined, undefined, 'localhost']);
      expect(setCookeStub.secondCall.args).to.eql([testCookieName, '', 'Thu, 01 Jan 1970 00:00:01 GMT', undefined, 'localhost']);

      let expires = new Date(START_TIME_MILLIS + (config.storage.expires * (60 * 60 * 24 * 1000))).toUTCString();
      expect(setCookeStub.lastCall.args).to.eql(['_pubcid_sharedid', 'testsharedid', expires, 'LAX', undefined]);
    });

    it('should call shared id endpoint with consent data and handle a valid response', function () {
      let consentData = {
        gdprApplies: true,
        consentString: 'abc12345234',
      };

      let submoduleCallback = sharedIdSystemSubmodule.getId(undefined, consentData).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      expect(request.url).to.equal('https://id.sharedid.org/id?gdpr=1&gdpr_consent=abc12345234');
      expect(request.withCredentials).to.be.true;

      request.respond(200, {}, JSON.stringify(SHAREDID_RESPONSE));

      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.equal(UUID);
    });

    it('should call shared id endpoint with usp consent data and handle a valid response', function () {
      uspConsentDataStub.returns('1YYY');
      let consentData = {
        gdprApplies: true,
        consentString: 'abc12345234',
      };

      let submoduleCallback = sharedIdSystemSubmodule.getId(undefined, consentData).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      expect(request.url).to.equal('https://id.sharedid.org/id?us_privacy=1YYY&gdpr=1&gdpr_consent=abc12345234');
      expect(request.withCredentials).to.be.true;

      request.respond(200, {}, JSON.stringify(SHAREDID_RESPONSE));

      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.equal(UUID);
    });
  });
});
