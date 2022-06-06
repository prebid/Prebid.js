import {identityLinkSubmodule} from 'modules/identityLinkIdSystem.js';
import * as utils from 'src/utils.js';
import {server} from 'test/mocks/xhr.js';
import {getStorageManager} from '../../../src/storageManager.js';

export const storage = getStorageManager();

const pid = '14';
let defaultConfigParams;
const responseHeader = {'Content-Type': 'application/json'}

describe('IdentityLinkId tests', function () {
  let logErrorStub;

  beforeEach(function () {
    defaultConfigParams = { params: {pid: pid} };
    logErrorStub = sinon.stub(utils, 'logError');
    // remove _lr_retry_request cookie before test
    storage.setCookie('_lr_retry_request', 'true', 'Thu, 01 Jan 1970 00:00:01 GMT');
  });

  afterEach(function () {
    defaultConfigParams = {};
    logErrorStub.restore();
  });

  it('should log an error if no configParams were passed when getId', function () {
    identityLinkSubmodule.getId({ params: {} });
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should log an error if pid configParam was not passed when getId', function () {
    identityLinkSubmodule.getId({ params: {} });
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

  it('should NOT call the LiveRamp envelope endpoint if gdpr applies but consent string is empty string', function () {
    let consentData = {
      gdprApplies: true,
      consentString: ''
    };
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams, consentData);
    expect(submoduleCallback).to.be.undefined;
  });

  it('should NOT call the LiveRamp envelope endpoint if gdpr applies but consent string is missing', function () {
    let consentData = { gdprApplies: true };
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams, consentData);
    expect(submoduleCallback).to.be.undefined;
  });

  it('should call the LiveRamp envelope endpoint with IAB consent string v1', function () {
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

  it('should call the LiveRamp envelope endpoint with IAB consent string v2', function () {
    let callBackSpy = sinon.spy();
    let consentData = {
      gdprApplies: true,
      consentString: 'CO4VThZO4VTiuADABBENAzCgAP_AAEOAAAAAAwwAgAEABhAAgAgAAA.YAAAAAAAAAA',
      vendorData: {
        tcfPolicyVersion: 2
      }
    };
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams, consentData).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://api.rlcdn.com/api/identity/envelope?pid=14&ct=4&cv=CO4VThZO4VTiuADABBENAzCgAP_AAEOAAAAAAwwAgAEABhAAgAgAAA.YAAAAAAAAAA');
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
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should not call the LiveRamp envelope endpoint if cookie _lr_retry_request exist', function () {
    let now = new Date();
    now.setTime(now.getTime() + 3000);
    storage.setCookie('_lr_retry_request', 'true', now.toUTCString());
    let callBackSpy = sinon.spy();
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request).to.be.eq(undefined);
  });

  it('should call the LiveRamp envelope endpoint if cookie _lr_retry_request does not exist and notUse3P config property was not set', function () {
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

  it('should not call the LiveRamp envelope endpoint if config property notUse3P is set to true', function () {
    defaultConfigParams.params.notUse3P = true;
    let callBackSpy = sinon.spy();
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request).to.be.eq(undefined);
  });
});
