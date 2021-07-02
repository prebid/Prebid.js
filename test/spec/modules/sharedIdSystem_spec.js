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

    it('should call pixel when pixelUrl is configured', function () {
      const config = {params: {extend: false, pixelUrl: 'https://test.com'}};
      let submoduleCallback = sharedIdSystemSubmodule.getId(config, undefined).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      // expect(request.url).to.equal('https://test.com');
      expect(request.withCredentials).to.be.true;

      // request.respond(200, {}, JSON.stringify(SHAREDID_RESPONSE));
      expect(callbackSpy.calledOnce).to.be.true;
    });
  });
});
