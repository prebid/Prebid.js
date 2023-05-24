import { expect } from 'chai';
import { intentIqIdSubmodule, storage } from 'modules/intentIqIdSystem.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';

const partner = 10;
const pai = '11';
const pcid = '12';
const enableCookieStorage = true;
const defaultConfigParams = { params: { partner: partner } };
const paiConfigParams = { params: { partner: partner, pai: pai } };
const pcidConfigParams = { params: { partner: partner, pcid: pcid } };
const enableCookieConfigParams = { params: { partner: partner, enableCookieStorage: enableCookieStorage } };
const allConfigParams = { params: { partner: partner, pai: pai, pcid: pcid, enableCookieStorage: enableCookieStorage } };
const responseHeader = { 'Content-Type': 'application/json' }

describe('IntentIQ tests', function () {
  let logErrorStub;
  let testLSValue = {
    'date': 1651945280759,
    'cttl': 2000,
    'rrtt': 123
  }
  let testLSValueWithData = {
    'date': 1651945280759,
    'cttl': 9999999999999,
    'rrtt': 123,
    'data': 'previousTestData'
  }
  let testResponseWithValues = {
    'abPercentage': 90,
    'adt': 1,
    'ct': 2,
    'data': 'testdata',
    'dbsaved': 'false',
    'ls': true,
    'mde': true,
    'tc': 4
  }

  beforeEach(function () {
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    logErrorStub.restore();
  });

  it('should log an error if no configParams were passed when getId', function () {
    let submodule = intentIqIdSubmodule.getId({ params: {} });
    expect(logErrorStub.calledOnce).to.be.true;
    expect(submodule).to.be.undefined;
  });

  it('should log an error if partner configParam was not passed when getId', function () {
    let submodule = intentIqIdSubmodule.getId({ params: {} });
    expect(logErrorStub.calledOnce).to.be.true;
    expect(submodule).to.be.undefined;
  });

  it('should log an error if partner configParam was not a numeric value', function () {
    let submodule = intentIqIdSubmodule.getId({ params: { partner: '10' } });
    expect(logErrorStub.calledOnce).to.be.true;
    expect(submodule).to.be.undefined;
  });

  it('should not save data in cookie if enableCookieStorage configParam not set', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: true })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(storage.getCookie('_iiq_fdata_' + partner)).to.equal(null);
  });

  it('should save data in cookie if enableCookieStorage configParam set to true', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: true })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    const cookieValue = storage.getCookie('_iiq_fdata_' + partner)
    expect(cookieValue).to.not.equal(null)
    expect(JSON.parse(cookieValue).data).to.be.equal('test_personid');
  });

  it('should call the IntentIQ endpoint with only partner', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should ignore INVALID_ID and invalid responses in decode', function () {
    // let resp = JSON.stringify({'RESULT': 'NA'});
    // expect(intentIqIdSubmodule.decode(resp)).to.equal(undefined);
    expect(intentIqIdSubmodule.decode('INVALID_ID')).to.equal(undefined);
    expect(intentIqIdSubmodule.decode('')).to.equal(undefined);
    expect(intentIqIdSubmodule.decode(undefined)).to.equal(undefined);
  });

  it('should call the IntentIQ endpoint with only partner, pai', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(paiConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should call the IntentIQ endpoint with only partner, pcid', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(pcidConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should call the IntentIQ endpoint with partner, pcid, pai', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should not throw Uncaught TypeError when IntentIQ endpoint returns empty response', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      204,
      responseHeader,
      ''
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(request.response).to.equal('');
  });

  it('should log an error and continue to callback if ajax request errors', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      503,
      responseHeader,
      'Unavailable'
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('save result if ls=true', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: true })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.be.eq('test_personid');
  });

  it('dont save result if ls=false', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: false })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.be.undefined;
  });

  it('save result as INVALID_ID on empty data and ls=true ', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: '', ls: true })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.be.eq('INVALID_ID');
  });

  it('send addition parameters if were found in localstorage', function () {
    localStorage.setItem('_iiq_fdata_' + partner, JSON.stringify(testLSValue))
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];

    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&pai=11&iiqidtype=2&iiqpcid=');
    expect(request.url).to.contain('cttl=' + testLSValue.cttl);
    expect(request.url).to.contain('rrtt=' + testLSValue.rrtt);
    request.respond(
      200,
      responseHeader,
      JSON.stringify(testResponseWithValues)
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.be.eq(testResponseWithValues.data);
  });

  it('return data stored in local storage ', function () {
    localStorage.setItem('_iiq_fdata_' + partner, JSON.stringify(testLSValueWithData))
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    expect(server.requests.length).to.be.equal(0);
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.be.equal(testLSValueWithData.data);
  });
});
