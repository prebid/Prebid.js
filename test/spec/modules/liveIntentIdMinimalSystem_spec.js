import * as utils from 'src/utils.js';
import { gdprDataHandler, uspDataHandler } from '../../../src/adapterManager.js';
import { server } from 'test/mocks/xhr.js';
import { liveIntentIdSubmodule, reset as resetLiveIntentIdSubmodule, storage } from 'modules/liveIntentIdSystem.js';
import * as refererDetection from '../../../src/refererDetection.js';

const PUBLISHER_ID = '89899';
const defaultConfigParams = { params: {publisherId: PUBLISHER_ID} };
const responseHeader = {'Content-Type': 'application/json'};

describe('LiveIntentMinimalId', function() {
  let logErrorStub;
  let uspConsentDataStub;
  let gdprConsentDataStub;
  let getCookieStub;
  let getDataFromLocalStorageStub;
  let imgStub;
  let refererInfoStub;

  beforeEach(function() {
    liveIntentIdSubmodule.setModuleMode('minimal');
    imgStub = sinon.stub(utils, 'triggerPixel');
    getCookieStub = sinon.stub(storage, 'getCookie');
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    logErrorStub = sinon.stub(utils, 'logError');
    uspConsentDataStub = sinon.stub(uspDataHandler, 'getConsentData');
    gdprConsentDataStub = sinon.stub(gdprDataHandler, 'getConsentData');
    refererInfoStub = sinon.stub(refererDetection, 'getRefererInfo');
  });

  afterEach(function() {
    imgStub.restore();
    getCookieStub.restore();
    getDataFromLocalStorageStub.restore();
    logErrorStub.restore();
    uspConsentDataStub.restore();
    gdprConsentDataStub.restore();
    refererInfoStub.restore();
    liveIntentIdSubmodule.setModuleMode('minimal');
    resetLiveIntentIdSubmodule();
  });
  it('should not fire an event when getId', function() {
    uspConsentDataStub.returns('1YNY');
    gdprConsentDataStub.returns({
      gdprApplies: true,
      consentString: 'consentDataString'
    })
    liveIntentIdSubmodule.getId(defaultConfigParams);
    expect(server.requests[0]).to.eql(undefined)
  });

  it('should not return a decoded identifier when the unifiedId is not present in the value', function() {
    const result = liveIntentIdSubmodule.decode({ additionalData: 'data' });
    expect(result).to.be.eql({});
  });

  it('should initialize LiveConnect and send no data', function() {
    liveIntentIdSubmodule.getId(defaultConfigParams);
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    liveIntentIdSubmodule.getId(defaultConfigParams);
    liveIntentIdSubmodule.decode({}, defaultConfigParams);
    expect(server.requests.length).to.be.eq(0);
  });

  it('should call the Custom URL of the LiveIntent Identity Exchange endpoint', function() {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: {...defaultConfigParams.params, ...{'url': 'https://dummy.liveintent.com/idex'}} }).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://dummy.liveintent.com/idex/prebid/89899?resolve=nonId');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should call the Identity Exchange endpoint with the provided distributorId', function() {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: { fireEventDelay: 1, distributorId: 'did-1111' } }).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/did-1111/any?did=did-1111&resolve=nonId');
    request.respond(
      204,
      responseHeader
    );
    expect(callBackSpy.calledOnceWith({})).to.be.true;
  });

  it('should call the Identity Exchange endpoint without the provided distributorId when appId is provided', function() {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: { fireEventDelay: 1, distributorId: 'did-1111', liCollectConfig: { appId: 'a-0001' } } }).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/any?resolve=nonId');
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
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://dummy.liveintent.com/idex/rubicon/89899?resolve=nonId');
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
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899?resolve=nonId');
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
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899?resolve=nonId');
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
    getDataFromLocalStorageStub.withArgs('_li_duid').returns(oldCookie);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq(`https://idx.liadm.com/idex/prebid/89899?duid=${oldCookie}&resolve=nonId`);
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should include the LiveConnect identifier and additional Identifiers to resolve', function() {
    const oldCookie = 'a-xxxx--123e4567-e89b-12d3-a456-426655440000'
    getDataFromLocalStorageStub.withArgs('_li_duid').returns(oldCookie);
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
    let request = server.requests[0];
    expect(request.url).to.be.eq(`https://idx.liadm.com/idex/prebid/89899?duid=${oldCookie}&_thirdPC=third-pc&resolve=nonId`);
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
    let request = server.requests[0];
    expect(request.url).to.be.eq('https://idx.liadm.com/idex/prebid/89899?_thirdPC=%7B%22key%22%3A%22value%22%7D&resolve=nonId');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should decode a unifiedId to lipbId and remove it', function() {
    const result = liveIntentIdSubmodule.decode({ unifiedId: 'data' });
    expect(result).to.eql({'lipb': {'lipbid': 'data'}});
  });

  it('should decode a nonId to lipbId', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'data' });
    expect(result).to.eql({'lipb': {'lipbid': 'data', 'nonId': 'data'}});
  });

  it('should resolve extra attributes', function() {
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: {
      ...defaultConfigParams.params,
      ...{ requestedAttributesOverrides: { 'foo': true, 'bar': false } }
    } }).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq(`https://idx.liadm.com/idex/prebid/89899?resolve=nonId&resolve=foo`);
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should decode a uid2 to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', uid2: 'bar' });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'uid2': 'bar'}, 'uid2': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode values with uid2 but no nonId', function() {
    const result = liveIntentIdSubmodule.decode({ uid2: 'bar' });
    expect(result).to.eql({'uid2': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode a bidswitch id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', bidswitch: 'bar' });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'bidswitch': 'bar'}, 'bidswitch': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode a medianet id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', medianet: 'bar' });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'medianet': 'bar'}, 'medianet': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode a sovrn id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', sovrn: 'bar' });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'sovrn': 'bar'}, 'sovrn': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode a magnite id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', magnite: 'bar' });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'magnite': 'bar'}, 'magnite': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode an index id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', index: 'bar' });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'index': 'bar'}, 'index': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode an openx id to a separate object when present', function () {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', openx: 'bar' });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'openx': 'bar'}, 'openx': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode an pubmatic id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', pubmatic: 'bar' });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'pubmatic': 'bar'}, 'pubmatic': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode a thetradedesk id to a separate object when present', function() {
    const provider = 'liveintent.com'
    refererInfoStub.returns({domain: provider})
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', thetradedesk: 'bar' });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'tdid': 'bar'}, 'tdid': {'id': 'bar', 'ext': {'rtiPartner': 'TDID', 'provider': provider}}});
  });

  it('should allow disabling nonId resolution', function() {
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: {
      ...defaultConfigParams.params,
      ...{ requestedAttributesOverrides: { 'nonId': false, 'uid2': true } }
    } }).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.be.eq(`https://idx.liadm.com/idex/prebid/89899?resolve=uid2`);
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });
});
