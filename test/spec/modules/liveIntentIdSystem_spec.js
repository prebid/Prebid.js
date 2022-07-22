import { liveIntentIdSubmodule, reset as resetLiveIntentIdSubmodule, storage } from 'modules/liveIntentIdSystem.js';
import * as utils from 'src/utils.js';
import { gdprDataHandler, uspDataHandler } from '../../../src/adapterManager.js';
import { server } from 'test/mocks/xhr.js';
resetLiveIntentIdSubmodule();
liveIntentIdSubmodule.setModuleMode('standard')
const PUBLISHER_ID = '89899';
const defaultConfigParams = { params: {publisherId: PUBLISHER_ID} };
const responseHeader = {'Content-Type': 'application/json'}

describe('LiveIntentId', function() {
  let logErrorStub;
  let uspConsentDataStub;
  let gdprConsentDataStub;
  let getCookieStub;
  let getDataFromLocalStorageStub;
  let imgStub;

  beforeEach(function() {
    liveIntentIdSubmodule.setModuleMode('standard');
    imgStub = sinon.stub(utils, 'triggerPixel');
    getCookieStub = sinon.stub(storage, 'getCookie');
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    logErrorStub = sinon.stub(utils, 'logError');
    uspConsentDataStub = sinon.stub(uspDataHandler, 'getConsentData');
    gdprConsentDataStub = sinon.stub(gdprDataHandler, 'getConsentData');
  });

  afterEach(function() {
    imgStub.restore();
    getCookieStub.restore();
    getDataFromLocalStorageStub.restore();
    logErrorStub.restore();
    uspConsentDataStub.restore();
    gdprConsentDataStub.restore();
    resetLiveIntentIdSubmodule();
  });

  it('should initialize LiveConnect with a privacy string when getId, and include it in the resolution request', function () {
    uspConsentDataStub.returns('1YNY');
    gdprConsentDataStub.returns({
      gdprApplies: true,
      consentString: 'consentDataString'
    })
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[1];
    expect(request.url).to.match(/.*us_privacy=1YNY.*&gdpr=1&n3pc=1&gdpr_consent=consentDataString.*/);
    const response = {
      unifiedId: 'a_unified_id',
      segments: [123, 234]
    }
    request.respond(
      200,
      responseHeader,
      JSON.stringify(response)
    );
    expect(callBackSpy.calledOnceWith(response)).to.be.true;
  });

  it('should fire an event when getId', function() {
    uspConsentDataStub.returns('1YNY');
    gdprConsentDataStub.returns({
      gdprApplies: true,
      consentString: 'consentDataString'
    })
    liveIntentIdSubmodule.getId(defaultConfigParams);
    expect(server.requests[0].url).to.match(/https:\/\/rp.liadm.com\/j\?.*&us_privacy=1YNY.*&wpn=prebid.*&gdpr=1&n3pc=1&n3pct=1&nb=1&gdpr_consent=consentDataString.*/);
  });

  it('should fire an event when getId and a hash is provided', function() {
    liveIntentIdSubmodule.getId({ params: {
      ...defaultConfigParams,
      emailHash: '58131bc547fb87af94cebdaf3102321f'
    }});
    expect(server.requests[0].url).to.match(/https:\/\/rp.liadm.com\/j\?.*e=58131bc547fb87af94cebdaf3102321f.+/)
  });

  it('should initialize LiveConnect with the config params when decode and emit an event', function () {
    liveIntentIdSubmodule.decode({}, { params: {
      ...defaultConfigParams.params,
      ...{
        url: 'https://dummy.liveintent.com',
        liCollectConfig: {
          appId: 'a-0001',
          collectorUrl: 'https://collector.liveintent.com'
        }
      }
    }});
    expect(server.requests[0].url).to.match(/https:\/\/collector.liveintent.com\/j\?.*aid=a-0001.*&wpn=prebid.*/);
  });

  it('should initialize LiveConnect and emit an event with a privacy string when decode', function() {
    uspConsentDataStub.returns('1YNY');
    gdprConsentDataStub.returns({
      gdprApplies: false,
      consentString: 'consentDataString'
    })
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    expect(server.requests[0].url).to.match(/.*us_privacy=1YNY.*&gdpr=0&gdpr_consent=consentDataString.*/);
  });

  it('should fire an event when decode and a hash is provided', function() {
    liveIntentIdSubmodule.decode({}, { params: {
      ...defaultConfigParams.params,
      emailHash: '58131bc547fb87af94cebdaf3102321f'
    }});
    expect(server.requests[0].url).to.match(/https:\/\/rp.liadm.com\/j\?.*e=58131bc547fb87af94cebdaf3102321f.+/);
  });

  it('should not return a decoded identifier when the unifiedId is not present in the value', function() {
    const result = liveIntentIdSubmodule.decode({ additionalData: 'data' });
    expect(result).to.be.undefined;
  });

  it('should fire an event when decode', function() {
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    expect(server.requests[0].url).to.be.not.null
  });

  it('should initialize LiveConnect and send data only once', function() {
    liveIntentIdSubmodule.getId(defaultConfigParams);
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    liveIntentIdSubmodule.getId(defaultConfigParams);
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    expect(server.requests.length).to.be.eq(1);
  });

  it('should call the Custom URL of the LiveIntent Identity Exchange endpoint', function() {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: {...defaultConfigParams.params, ...{'url': 'https://dummy.liveintent.com/idex'}} }).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[1];
    expect(request.url).to.be.eq('https://dummy.liveintent.com/idex/prebid/89899');
    request.respond(
      204,
      responseHeader
    );
    expect(callBackSpy.calledOnceWith({})).to.be.true;
  });

  it('should call the default url of the LiveIntent Identity Exchange endpoint, with a partner', function() {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: {
      ...defaultConfigParams.params,
      ...{
        'url': 'https://dummy.liveintent.com/idex',
        'partner': 'rubicon'
      }
    } }).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[1];
    expect(request.url).to.be.eq('https://dummy.liveintent.com/idex/rubicon/89899');
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
    let request = server.requests[1];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should log an error and continue to callback if ajax request errors', function() {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[1];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899');
    request.respond(
      503,
      responseHeader,
      'Unavailable'
    );
    expect(logErrorStub.calledOnce).to.be.true;
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should include the LiveConnect identifier when calling the LiveIntent Identity Exchange endpoint', function() {
    const oldCookie = 'a-xxxx--123e4567-e89b-12d3-a456-426655440000'
    getCookieStub.withArgs('_lc2_fpi').returns(oldCookie)
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[1];
    expect(request.url).to.be.eq(`https://idx.liadm.com/idex/prebid/89899?duid=${oldCookie}`);
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should include the LiveConnect identifier and additional Identifiers to resolve', function() {
    const oldCookie = 'a-xxxx--123e4567-e89b-12d3-a456-426655440000'
    getCookieStub.withArgs('_lc2_fpi').returns(oldCookie);
    getDataFromLocalStorageStub.withArgs('_thirdPC').returns('third-pc');
    const configParams = { params: {
      ...defaultConfigParams.params,
      ...{
        'identifiersToResolve': ['_thirdPC']
      }
    }};
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[1];
    expect(request.url).to.be.eq(`https://idx.liadm.com/idex/prebid/89899?duid=${oldCookie}&_thirdPC=third-pc`);
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
    const configParams = { params: {
      ...defaultConfigParams.params,
      ...{
        'identifiersToResolve': ['_thirdPC']
      }
    }};
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[1];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899?_thirdPC=%7B%22key%22%3A%22value%22%7D');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should send an error when the cookie jar throws an unexpected error', function() {
    getCookieStub.throws('CookieError', 'A message');
    liveIntentIdSubmodule.getId(defaultConfigParams);
    expect(imgStub.getCall(0).args[0]).to.match(/.*ae=.+/);
  });
});
