import { expect } from 'chai';
import {intentIqIdSubmodule, readData, FIRST_PARTY_KEY} from 'modules/intentIqIdSystem.js';
import * as utils from 'src/utils.js';
import {server} from 'test/mocks/xhr.js';

const partner = 10;
const pai = '11';
const pcid = '12';
const defaultConfigParams = { params: {partner: partner} };
const paiConfigParams = { params: {partner: partner, pai: pai} };
const pcidConfigParams = { params: {partner: partner, pcid: pcid} };
const allConfigParams = { params: {partner: partner, pai: pai, pcid: pcid} };
const responseHeader = {'Content-Type': 'application/json'}

describe('IntentIQ tests', function () {
  let logErrorStub;

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
    let submodule = intentIqIdSubmodule.getId({ params: {partner: '10'} });
    expect(logErrorStub.calledOnce).to.be.true;
    expect(submodule).to.be.undefined;
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

  it('should ignore NA and invalid responses in decode', function () {
    // let resp = JSON.stringify({'RESULT': 'NA'});
    // expect(intentIqIdSubmodule.decode(resp)).to.equal(undefined);
    expect(intentIqIdSubmodule.decode('NA')).to.equal(undefined);
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

  it('should ignore {RESULT: NA} in get id', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({RESULT: 'NA'})
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.be.undefined;
  });

  it('should ignore NA in get id', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      'NA'
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.be.undefined;
  });

  it('should parse result from json response', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({pid: 'test_pid', data: 'test_personid'})
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.be.eq('test_personid');
  });
});
