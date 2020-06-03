import {liveIntentIdSubmodule, reset as resetLiveIntentIdSubmodule, storage} from 'modules/liveIntentIdSystem.js';
import * as utils from 'src/utils.js';
import {uspDataHandler} from '../../../src/adapterManager.js';
import {server} from 'test/mocks/xhr.js';

const PUBLISHER_ID = '89899';
const defaultConfigParams = {publisherId: PUBLISHER_ID};
const responseHeader = {'Content-Type': 'application/json'}

describe('LiveIntentId', function () {
  let pixel = {};
  let logErrorStub;
  let consentDataStub;
  let getCookieStub;
  let getDataFromLocalStorageStub;
  let imgStub;

  beforeEach(function () {
    imgStub = sinon.stub(window, 'Image').returns(pixel);
    getCookieStub = sinon.stub(storage, 'getCookie');
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    logErrorStub = sinon.stub(utils, 'logError');
    consentDataStub = sinon.stub(uspDataHandler, 'getConsentData');
  });

  afterEach(function () {
    pixel = {};
    imgStub.restore();
    getCookieStub.restore();
    getDataFromLocalStorageStub.restore();
    logErrorStub.restore();
    consentDataStub.restore();
    resetLiveIntentIdSubmodule();
  });

  it('should log an error if no configParams were passed when getId', function () {
    liveIntentIdSubmodule.getId();
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should log an error if publisherId configParam was not passed when getId', function () {
    liveIntentIdSubmodule.getId({});
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should log an error if publisherId configParam was not passed when decode', function () {
    liveIntentIdSubmodule.decode({}, {});
    expect(logErrorStub.calledOnce).to.be.true;
  });

  it('should initialize LiveConnect with a us privacy string when getId, and include it in all requests', function () {
    consentDataStub.returns('1YNY');
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(defaultConfigParams).callback;
    expect(pixel.src).to.match(/.*us_privacy=1YNY/);
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.match(/.*us_privacy=1YNY/);
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should fire an event when getId', function () {
    liveIntentIdSubmodule.getId(defaultConfigParams);
    expect(pixel.src).to.match(/https:\/\/rp.liadm.com\/p\?wpn=prebid.*/)
  });

  it('should initialize LiveConnect with the config params when decode and emit an event', function () {
    liveIntentIdSubmodule.decode({}, {
      ...defaultConfigParams,
      ...{
        url: 'https://dummy.liveintent.com',
        liCollectConfig: {
          appId: 'a-0001',
          collectorUrl: 'https://collector.liveintent.com'
        }
      }
    });
    expect(pixel.src).to.match(/https:\/\/collector.liveintent.com\/p\?aid=a-0001&wpn=prebid.*/)
  });

  it('should initialize LiveConnect and emit an event with a us privacy string when decode', function () {
    consentDataStub.returns('1YNY');
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    expect(pixel.src).to.match(/.*us_privacy=1YNY/);
  });

  it('should not return a decoded identifier when the unifiedId is not present in the value', function () {
    const result = liveIntentIdSubmodule.decode({additionalData: 'data'});
    expect(result).to.be.undefined;
  });

  it('should fire an event when decode', function () {
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    expect(pixel.src).to.be.not.null
  });

  it('should initialize LiveConnect and send data only once', function () {
    liveIntentIdSubmodule.getId(defaultConfigParams);
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    liveIntentIdSubmodule.getId(defaultConfigParams);
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    expect(imgStub.calledOnce).to.be.true;
  });

  it('should call the Custom URL of the LiveIntent Identity Exchange endpoint', function () {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({...defaultConfigParams, ...{'url': 'https://dummy.liveintent.com/idex'}}).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://dummy.liveintent.com/idex/prebid/89899');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should call the default url of the LiveIntent Identity Exchange endpoint, with a partner', function () {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({
      ...defaultConfigParams,
      ...{
        'url': 'https://dummy.liveintent.com/idex',
        'partner': 'rubicon'
      }
    }).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://dummy.liveintent.com/idex/rubicon/89899');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should call the LiveIntent Identity Exchange endpoint, with no additional query params', function () {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should log an error and continue to callback if ajax request errors', function () {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899');
    request.respond(
      503,
      responseHeader,
      'Unavailable'
    );
    expect(logErrorStub.calledOnce).to.be.true;
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should include the LiveConnect identifier when calling the LiveIntent Identity Exchange endpoint', function () {
    const oldCookie = 'a-xxxx--123e4567-e89b-12d3-a456-426655440000'
    getDataFromLocalStorageStub.withArgs('_li_duid').returns(oldCookie);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq(`https://idx.liadm.com/idex/prebid/89899?duid=${oldCookie}`);
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should include the LiveConnect identifier and additional Identifiers to resolve', function () {
    const oldCookie = 'a-xxxx--123e4567-e89b-12d3-a456-426655440000'
    getDataFromLocalStorageStub.withArgs('_li_duid').returns(oldCookie);
    getDataFromLocalStorageStub.withArgs('_thirdPC').returns('third-pc');
    const configParams = {
      ...defaultConfigParams,
      ...{
        'identifiersToResolve': ['_thirdPC']
      }
    };
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq(`https://idx.liadm.com/idex/prebid/89899?duid=${oldCookie}&_thirdPC=third-pc`);
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should include an additional identifier value to resolve even if it is an object', function () {
    getCookieStub.returns(null);
    getDataFromLocalStorageStub.withArgs('_thirdPC').returns({'key': 'value'});
    const configParams = {
      ...defaultConfigParams,
      ...{
        'identifiersToResolve': ['_thirdPC']
      }
    };
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899?_thirdPC=%7B%22key%22%3A%22value%22%7D');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });
});
