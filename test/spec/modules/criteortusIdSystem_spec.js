import { criteortusIdSubmodule } from 'modules/criteortusIdSystem';
import * as utils from 'src/utils';

describe('Criteo RTUS', function() {
  let xhr;
  let requests;
  let getCookieStub;
  let logErrorStub;

  beforeEach(function () {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];
    xhr.onCreate = request => requests.push(request);
    getCookieStub = sinon.stub(utils, 'getCookie');
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    xhr.restore();
    getCookieStub.restore();
    logErrorStub.restore();
  });

  it('should log error when configParams are not passed', function() {
    criteortusIdSubmodule.getId();
    expect(logErrorStub.calledOnce).to.be.true;
  })

  it('should call criteo endpoint to get user id', function() {
    getCookieStub.returns(null);
    let configParams = {
      clientIdentifier: {
        'sampleBidder': 1
      }
    }

    let response = { 'status': 'ok', 'userid': 'sample-userid' }
    let callBackSpy = sinon.spy();
    let submoduleCallback = criteortusIdSubmodule.getId(configParams);
    submoduleCallback(callBackSpy);
    requests[0].respond(
      200,
      { 'Content-Type': 'text/plain' },
      JSON.stringify(response)
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.calledWith({'sampleBidder': response})).to.be.true;
  })

  it('should get uid from cookie and not call endpoint', function() {
    let response = {'appnexus': {'status': 'ok', 'userid': 'sample-userid'}}
    getCookieStub.returns(JSON.stringify(response));
    let configParams = {
      clientIdentifier: {
        'sampleBidder': 1
      }
    }
    let uid = criteortusIdSubmodule.getId(configParams);
    expect(requests.length).to.equal(0);
  })

  it('should call criteo endpoint for multiple bidders', function() {
    getCookieStub.returns(null);
    let configParams = {
      clientIdentifier: {
        'sampleBidder': 1,
        'sampleBidder2': 2
      }
    }

    let response = { 'status': 'ok', 'userid': 'sample-userid' }
    let callBackSpy = sinon.spy();
    let submoduleCallback = criteortusIdSubmodule.getId(configParams);
    submoduleCallback(callBackSpy);
    requests[0].respond(
      200,
      { 'Content-Type': 'text/plain' },
      JSON.stringify(response)
    );
    expect(callBackSpy.calledOnce).to.be.false;
    requests[1].respond(
      200,
      { 'Content-Type': 'text/plain' },
      JSON.stringify(response)
    );
    expect(callBackSpy.calledOnce).to.be.true;
  })
});
