import { liveIntentIdSubmodule } from 'modules/liveIntentIdSystem';
import * as utils from 'src/utils';
import { server } from 'test/mocks/xhr';

describe('LiveIntentId', function() {
  let getCookieStub;
  let getDataFromLocalStorageStub;
  let logErrorStub;

  const defaultConfigParams = {'publisherId': '89899'};
  const responseHeader = { 'Content-Type': 'application/json' }

  beforeEach(function () {
    getCookieStub = sinon.stub(utils, 'getCookie');
    getDataFromLocalStorageStub = sinon.stub(utils, 'getDataFromLocalStorage');
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    getCookieStub.restore();
    getDataFromLocalStorageStub.restore();
    logErrorStub.restore();
  });

  it('should log an error if no configParams were passed', function() {
    liveIntentIdSubmodule.getId();
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should log an error if publisherId configParam was not passed', function() {
    liveIntentIdSubmodule.getId({});
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should call the Custom URL of the LiveIntent Identity Exchange endpoint', function() {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({...defaultConfigParams, ...{'url': 'https://dummy.liveintent.com'}}).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://dummy.liveintent.com/idex/prebid/89899?');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should call the default url of the LiveIntent Identity Exchange endpoint, with a partner', function() {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({...defaultConfigParams, ...{'url': 'https://dummy.liveintent.com', 'partner': 'rubicon'}}).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://dummy.liveintent.com/idex/rubicon/89899?');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should call the LiveIntent Identity Exchange endpoint, with no additional query params', function() {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899?');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should include the LiveConnect identifier when calling the LiveIntent Identity Exchange endpoint', function() {
    getCookieStub.withArgs('_li_duid').returns('li-fpc');
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899?duid=li-fpc&');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should include the LiveConnect identifier and additional Identifiers to resolve', function() {
    getCookieStub.withArgs('_li_duid').returns('li-fpc');
    getDataFromLocalStorageStub.withArgs('_thirdPC').returns('third-pc');
    let configParams = {
      ...defaultConfigParams,
      ...{
        'identifiersToResolve': ['_thirdPC']
      }
    };

    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899?_thirdPC=third-pc&duid=li-fpc&');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should include an additional identifier value to resolve even if it is an object', function() {
    getCookieStub.returns(null);
    getDataFromLocalStorageStub.withArgs('_thirdPC').returns({'key': 'value'});
    let configParams = {
      ...defaultConfigParams,
      ...{
        'identifiersToResolve': ['_thirdPC']
      }
    };

    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899?_thirdPC=%7B%22key%22%3A%22value%22%7D&');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });
});
