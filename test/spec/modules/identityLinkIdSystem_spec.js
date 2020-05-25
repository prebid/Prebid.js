import {identityLinkSubmodule} from 'modules/identityLinkIdSystem.js';
import * as utils from 'src/utils.js';
import {server} from 'test/mocks/xhr.js';

const pid = '14';
const defaultConfigParams = {pid: pid};
const responseHeader = {'Content-Type': 'application/json'}

describe('IdentityLinkId tests', function () {
  let logErrorStub;

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    logErrorStub.restore();
  });

  it('should log an error if no configParams were passed when getId', function () {
    identityLinkSubmodule.getId();
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should log an error if pid configParam was not passed when getId', function () {
    identityLinkSubmodule.getId({});
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should call the LiveRamp envelope endpoint', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://api.rlcdn.com/api/identity/envelope?pid=14');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should call the LiveRamp envelope endpoint with consent string', function () {
    let callBackSpy = sinon.spy();
    let consentData = {
      gdprApplies: true,
      consentString: 'BOkIpDSOkIpDSADABAENCc-AAAApOAFAAMAAsAMIAcAA_g'
    };
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams, consentData).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://api.rlcdn.com/api/identity/envelope?pid=14&ct=1&cv=BOkIpDSOkIpDSADABAENCc-AAAApOAFAAMAAsAMIAcAA_g');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should not throw Uncaught TypeError when envelope endpoint returns empty response', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://api.rlcdn.com/api/identity/envelope?pid=14');
    request.respond(
      204,
      responseHeader,
      ''
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(request.response).to.equal('');
    expect(logErrorStub.calledOnce).to.not.be.true;
  });

  it('should log an error and continue to callback if ajax request errors', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://api.rlcdn.com/api/identity/envelope?pid=14');
    request.respond(
      503,
      responseHeader,
      'Unavailable'
    );
    expect(logErrorStub.calledOnce).to.be.true;
    expect(callBackSpy.calledOnce).to.be.true;
  });
});
