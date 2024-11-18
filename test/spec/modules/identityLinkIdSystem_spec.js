import {getEnvelopeFromStorage, identityLinkSubmodule} from 'modules/identityLinkIdSystem.js';
import * as utils from 'src/utils.js';
import {server} from 'test/mocks/xhr.js';
import {getCoreStorageManager} from '../../../src/storageManager.js';
import {stub} from 'sinon';
import { gppDataHandler } from '../../../src/adapterManager.js';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

const storage = getCoreStorageManager();

const pid = '14';
let defaultConfigParams;
const responseHeader = {'Content-Type': 'application/json'};
const testEnvelope = 'eyJ0aW1lc3RhbXAiOjE2OTEwNjU5MzQwMTcsInZlcnNpb24iOiIxLjIuMSIsImVudmVsb3BlIjoiQWhIenUyMFN3WHZ6T0hPd3c2bkxaODAtd2hoN2Nnd0FqWllNdkQ0UjBXT25xRVc1N21zR2Vral9QejU2b1FwcGdPOVB2aFJFa3VHc2lMdG56c3A2aG13eDRtTTRNLTctRy12NiJ9';
const testEnvelopeValue = '{"timestamp":1691065934017,"version":"1.2.1","envelope":"AhHzu20SwXvzOHOww6nLZ80-whh7cgwAjZYMvD4R0WOnqEW57msGekj_Pz56oQppgO9PvhREkuGsiLtnzsp6hmwx4mM4M-7-G-v6"}';

function setTestEnvelopeCookie () {
  let now = new Date();
  now.setTime(now.getTime() + 3000);
  storage.setCookie('_lr_env', testEnvelope, now.toUTCString());
}

describe('IdentityLinkId tests', function () {
  let logErrorStub;
  let gppConsentDataStub;

  beforeEach(function () {
    defaultConfigParams = { params: {pid: pid} };
    logErrorStub = sinon.stub(utils, 'logError');
    // remove _lr_retry_request cookie before test
    storage.setCookie('_lr_retry_request', 'true', 'Thu, 01 Jan 1970 00:00:01 GMT');
    storage.setCookie('_lr_env', testEnvelope, 'Thu, 01 Jan 1970 00:00:01 GMT');
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

  it('should call the LiveRamp envelope endpoint with GPP consent string', function() {
    gppConsentDataStub = sinon.stub(gppDataHandler, 'getConsentData');
    gppConsentDataStub.returns({
      ready: true,
      gppString: 'DBABLA~BVVqAAAACqA.QA',
      applicableSections: [7]
    });
    let callBackSpy = sinon.spy();
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://api.rlcdn.com/api/identity/envelope?pid=14&gpp=DBABLA~BVVqAAAACqA.QA&gpp_sid=7');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
    gppConsentDataStub.restore();
  });

  it('should call the LiveRamp envelope endpoint without GPP consent string if consent string is not provided', function () {
    gppConsentDataStub = sinon.stub(gppDataHandler, 'getConsentData');
    gppConsentDataStub.returns({
      ready: true,
      gppString: '',
      applicableSections: [7]
    });
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
    gppConsentDataStub.restore();
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
    );
    expect(callBackSpy.calledOnce).to.be.true;
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

  it('should get envelope from storage if ats is not present on a page and pass it to callback', function () {
    setTestEnvelopeCookie();
    let envelopeValueFromStorage = getEnvelopeFromStorage();
    let callBackSpy = sinon.spy();
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    expect(envelopeValueFromStorage).to.be.a('string');
    expect(callBackSpy.calledOnce).to.be.true;
  })

  it('if there is no envelope in storage and ats is not present on a page try to call 3p url', function () {
    let envelopeValueFromStorage = getEnvelopeFromStorage();
    let callBackSpy = sinon.spy();
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://api.rlcdn.com/api/identity/envelope?pid=14');
    request.respond(
      204,
      responseHeader,
    );
    expect(envelopeValueFromStorage).to.be.a('undefined');
    expect(callBackSpy.calledOnce).to.be.true;
  })

  it('if ats is present on a page, and envelope is generated and stored in storage, call a callback', function () {
    setTestEnvelopeCookie();
    let envelopeValueFromStorage = getEnvelopeFromStorage();
    window.ats = {retrieveEnvelope: function() {
    }}
    // mock ats.retrieveEnvelope to return envelope
    stub(window.ats, 'retrieveEnvelope').callsFake(function() { return envelopeValueFromStorage })
    let callBackSpy = sinon.spy();
    let submoduleCallback = identityLinkSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    expect(envelopeValueFromStorage).to.be.a('string');
    expect(envelopeValueFromStorage).to.be.eq(testEnvelopeValue);
  })

  describe('eid', () => {
    before(() => {
      attachIdSystem(identityLinkSubmodule);
    });
    it('identityLink', function() {
      const userId = {
        idl_env: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'liveramp.com',
        uids: [{id: 'some-random-id-value', atype: 3}]
      });
    });
  })
});
