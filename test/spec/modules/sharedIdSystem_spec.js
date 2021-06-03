import {
  sharedIdSystemSubmodule,
} from 'modules/sharedIdSystem.js';
import { server } from 'test/mocks/xhr.js';
import {uspDataHandler} from 'src/adapterManager';
import sinon from 'sinon';

let expect = require('chai').expect;

describe('SharedId System', function() {
  const SHAREDID_RESPONSE = {sharedId: 'testsharedid'};
  let uspConsentDataStub;
  describe('Xhr Requests from getId()', function() {
    let callbackSpy = sinon.spy();

    beforeEach(function() {
      callbackSpy.resetHistory();
      uspConsentDataStub = sinon.stub(uspDataHandler, 'getConsentData');
    });

    afterEach(function () {
      uspConsentDataStub.restore();
    });

    it('should call shared id endpoint without consent data and handle a valid response', function () {
      let submoduleCallback = sharedIdSystemSubmodule.getId(undefined, undefined).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      expect(request.url).to.equal('https://id.sharedid.org/id');
      expect(request.withCredentials).to.be.true;

      request.respond(200, {}, JSON.stringify(SHAREDID_RESPONSE));

      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.equal(SHAREDID_RESPONSE.sharedId);
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
      expect(callbackSpy.lastCall.lastArg).to.equal(SHAREDID_RESPONSE.sharedId);
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
      expect(callbackSpy.lastCall.lastArg).to.equal(SHAREDID_RESPONSE.sharedId);
    });
  });
});
