import { liveIntentIdSubmodule, reset as resetLiveIntentIdSubmodule, storage } from 'modules/liveIntentIdSystem.js';
import * as utils from 'src/utils.js';
import { gdprDataHandler, uspDataHandler, gppDataHandler, coppaDataHandler } from '../../../src/adapterManager.js';
import { server } from 'test/mocks/xhr.js';
import * as refererDetection from '../../../src/refererDetection.js';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';

resetLiveIntentIdSubmodule();
liveIntentIdSubmodule.setModuleMode('standard')
const PUBLISHER_ID = '89899';
const defaultConfigParams = {publisherId: PUBLISHER_ID, fireEventDelay: 1};
const responseHeader = {'Content-Type': 'application/json'}

function requests(...urlRegExps) {
  return server.requests.filter((request) => urlRegExps.some((regExp) => request.url.match(regExp)))
}

function rpRequests() {
  return requests(/https:\/\/rp.liadm.com.*/)
}

function idxRequests() {
  return requests(/https:\/\/idx.liadm.com.*/)
}

describe('LiveIntentId', function() {
  let logErrorStub;
  let uspConsentDataStub;
  let gdprConsentDataStub;
  let gppConsentDataStub;
  let getCookieStub;
  let getDataFromLocalStorageStub;
  let imgStub;
  let coppaConsentDataStub;
  let refererInfoStub;

  beforeEach(function() {
    liveIntentIdSubmodule.setModuleMode('standard');
    imgStub = sinon.stub(utils, 'triggerPixel');
    getCookieStub = sinon.stub(storage, 'getCookie');
    getDataFromLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    logErrorStub = sinon.stub(utils, 'logError');
    uspConsentDataStub = sinon.stub(uspDataHandler, 'getConsentData');
    gdprConsentDataStub = sinon.stub(gdprDataHandler, 'getConsentData');
    gppConsentDataStub = sinon.stub(gppDataHandler, 'getConsentData');
    coppaConsentDataStub = sinon.stub(coppaDataHandler, 'getCoppa');
    refererInfoStub = sinon.stub(refererDetection, 'getRefererInfo');
  });

  afterEach(function() {
    imgStub.restore();
    getCookieStub.restore();
    getDataFromLocalStorageStub.restore();
    logErrorStub.restore();
    uspConsentDataStub.restore();
    gdprConsentDataStub.restore();
    gppConsentDataStub.restore();
    coppaConsentDataStub.restore();
    refererInfoStub.restore();
    resetLiveIntentIdSubmodule();
  });

  it('should initialize LiveConnect with a privacy string when getId but not send request', function (done) {
    uspConsentDataStub.returns('1YNY');
    gdprConsentDataStub.returns({
      gdprApplies: true,
      consentString: 'consentDataString'
    })
    gppConsentDataStub.returns({
      gppString: 'gppConsentDataString',
      applicableSections: [1, 2]
    })
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: defaultConfigParams }).callback;
    submoduleCallback(callBackSpy);
    setTimeout(() => {
      let requests = idxRequests().concat(rpRequests());
      expect(requests).to.be.empty;
      expect(callBackSpy.notCalled).to.be.true;
      done();
    }, 300)
  });

  it('should fire an event without privacy setting when getId', function(done) {
    uspConsentDataStub.returns('1YNY');
    gdprConsentDataStub.returns({
      gdprApplies: false,
      consentString: 'consentDataString'
    })
    gppConsentDataStub.returns({
      gppString: 'gppConsentDataString',
      applicableSections: [1]
    })
    liveIntentIdSubmodule.getId({ params: defaultConfigParams });
    setTimeout(() => {
      let request = rpRequests()[0];
      expect(request.url).to.match(/https:\/\/rp.liadm.com\/j\?.*&us_privacy=1YNY.*&wpn=prebid.*&gdpr=0.*&gdpr_consent=consentDataString.*&gpp_s=gppConsentDataString.*&gpp_as=1.*/);
      done();
    }, 300);
  });

  it('should fire an event when getId and a hash is provided', function(done) {
    liveIntentIdSubmodule.getId({ params: {
      ...defaultConfigParams,
      emailHash: '58131bc547fb87af94cebdaf3102321f'
    }});
    setTimeout(() => {
      let request = rpRequests()[0];
      expect(request.url).to.match(/https:\/\/rp.liadm.com\/j\?.*e=58131bc547fb87af94cebdaf3102321f.+/)
      done();
    }, 300);
  });

  it('should initialize LiveConnect and forward the prebid version when decode and emit an event', function(done) {
    liveIntentIdSubmodule.decode({}, { params: defaultConfigParams });
    setTimeout(() => {
      let request = rpRequests()[0];
      expect(request.url).to.contain('tv=$prebid.version$')
      done();
    }, 300);
  });

  it('should initialize LiveConnect with the config params when decode and emit an event', function (done) {
    liveIntentIdSubmodule.decode({}, { params: {
      ...defaultConfigParams,
      ...{
        url: 'https://dummy.liveintent.com',
        liCollectConfig: {
          appId: 'a-0001',
          collectorUrl: 'https://collector.liveintent.com'
        }
      }
    }});
    setTimeout(() => {
      let request = requests(/https:\/\/collector.liveintent.com\/j\?.*aid=a-0001.*&wpn=prebid.*/);
      expect(request.length).to.be.greaterThan(0);
      done();
    }, 300);
  });

  it('should fire an event with the provided distributorId', function (done) {
    liveIntentIdSubmodule.decode({}, { params: { fireEventDelay: 1, distributorId: 'did-1111' } });
    setTimeout(() => {
      let request = rpRequests()[0];
      expect(request.url).to.match(/https:\/\/rp.liadm.com\/j\?.*did=did-1111.*&wpn=prebid.*/);
      done();
    }, 300);
  });

  it('should fire an event without the provided distributorId when appId is provided', function (done) {
    liveIntentIdSubmodule.decode({}, { params: { fireEventDelay: 1, distributorId: 'did-1111', liCollectConfig: { appId: 'a-0001' } } });
    setTimeout(() => {
      let request = rpRequests()[0];
      expect(request.url).to.match(/https:\/\/rp.liadm.com\/j\?.*aid=a-0001.*&wpn=prebid.*/);
      expect(request.url).to.not.match(/.*did=*/);
      done();
    }, 300);
  });

  it('should initialize LiveConnect and emit an event with a privacy string when decode', function(done) {
    uspConsentDataStub.returns('1YNY');
    gdprConsentDataStub.returns({
      gdprApplies: false,
      consentString: 'consentDataString'
    })
    gppConsentDataStub.returns({
      gppString: 'gppConsentDataString',
      applicableSections: [1]
    })
    liveIntentIdSubmodule.decode({}, { params: defaultConfigParams });
    setTimeout(() => {
      let request = rpRequests()[0];
      expect(request.url).to.match(/.*us_privacy=1YNY.*&gdpr=0&gdpr_consent=consentDataString.*&gpp_s=gppConsentDataString&gpp_as=1.*/);
      done();
    }, 300);
  });

  it('should fire an event when decode and a hash is provided', function(done) {
    liveIntentIdSubmodule.decode({}, { params: {
      ...defaultConfigParams,
      emailHash: '58131bc547fb87af94cebdaf3102321f'
    }});
    setTimeout(() => {
      let request = rpRequests()[0];
      expect(request.url).to.match(/https:\/\/rp.liadm.com\/j\?.*e=58131bc547fb87af94cebdaf3102321f.+/);
      done();
    }, 300);
  });

  it('should not return a decoded identifier when the unifiedId is not present in the value', function() {
    const result = liveIntentIdSubmodule.decode({ params: { fireEventDelay: 1, additionalData: 'data' } });
    expect(result).to.be.eql({});
  });

  it('should fire an event when decode', function(done) {
    liveIntentIdSubmodule.decode({}, { params: defaultConfigParams });
    setTimeout(() => {
      expect(rpRequests().length).to.be.eq(1);
      done();
    }, 300);
  });

  it('should initialize LiveConnect and send data only once', function(done) {
    liveIntentIdSubmodule.getId({ params: defaultConfigParams });
    liveIntentIdSubmodule.decode({}, { params: defaultConfigParams });
    liveIntentIdSubmodule.getId({ params: defaultConfigParams });
    liveIntentIdSubmodule.decode({}, { params: defaultConfigParams });
    setTimeout(() => {
      expect(rpRequests().length).to.be.eq(1);
      done();
    }, 300);
  });

  it('should call the custom URL of the LiveIntent Identity Exchange endpoint', function() {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: {...defaultConfigParams, ...{'url': 'https://dummy.liveintent.com/idex'}} }).callback;
    submoduleCallback(callBackSpy);
    let request = requests(/https:\/\/dummy.liveintent.com\/idex\/.*/)[0];
    expect(request.url).to.match(/https:\/\/dummy.liveintent.com\/idex\/prebid\/89899\?.*cd=.localhost.*&resolve=nonId.*/);
    request.respond(
      204,
      responseHeader
    );
    expect(callBackSpy.calledOnceWith({})).to.be.true;
  });

  it('should call the Identity Exchange endpoint with the provided distributorId', function() {
    getCookieStub.returns(null);
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: { fireEventDelay: 1, distributorId: 'did-1111' } }).callback;
    submoduleCallback(callBackSpy);
    let request = idxRequests()[0];
    expect(request.url).to.match(/https:\/\/idx.liadm.com\/idex\/did-1111\/any\?.*did=did-1111.*&cd=.localhost.*&resolve=nonId.*/);
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
    let request = idxRequests()[0];
    expect(request.url).to.match(/https:\/\/idx.liadm.com\/idex\/prebid\/any\?.*cd=.localhost.*&resolve=nonId.*/);
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
      ...defaultConfigParams,
      ...{
        'url': 'https://dummy.liveintent.com/idex',
        'partner': 'rubicon'
      }
    } }).callback;
    submoduleCallback(callBackSpy);
    let request = requests(/https:\/\/dummy.liveintent.com\/idex\/.*/)[0];
    expect(request.url).to.match(/https:\/\/dummy.liveintent.com\/idex\/rubicon\/89899\?.*cd=.localhost.*&resolve=nonId.*/);
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
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: defaultConfigParams }).callback;
    submoduleCallback(callBackSpy);
    let request = idxRequests()[0];
    expect(request.url).to.match(/https:\/\/idx.liadm.com\/idex\/prebid\/89899\?.*cd=.localhost.*&resolve=nonId.*/);
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
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: defaultConfigParams }).callback;
    submoduleCallback(callBackSpy);
    let request = idxRequests()[0];
    expect(request.url).to.match(/https:\/\/idx.liadm.com\/idex\/prebid\/89899\?.*cd=.localhost.*&resolve=nonId.*/);
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
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: defaultConfigParams }).callback;
    submoduleCallback(callBackSpy);
    let request = idxRequests()[0];
    const expected = new RegExp('https:\/\/idx.liadm.com\/idex\/prebid\/89899\?.*duid=' + oldCookie + '.*&cd=.localhost.*&resolve=nonId.*');
    expect(request.url).to.match(expected);
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
      ...defaultConfigParams,
      ...{
        'identifiersToResolve': ['_thirdPC']
      }
    }};
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    let request = idxRequests()[0];
    const expected = new RegExp('https:\/\/idx.liadm.com\/idex\/prebid\/89899\?.*duid=' + oldCookie + '.*&cd=.localhost.*&_thirdPC=third-pc.*&resolve=nonId.*');
    expect(request.url).to.match(expected);
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
      ...defaultConfigParams,
      ...{
        'identifiersToResolve': ['_thirdPC']
      }
    }};
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    let request = idxRequests()[0];
    expect(request.url).to.match(/https:\/\/idx.liadm.com\/idex\/prebid\/89899\?.*cd=.localhost.*&_thirdPC=%7B%22key%22%3A%22value%22%7D.*&resolve=nonId.*/);
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should send an error when the cookie jar throws an unexpected error', function() {
    getCookieStub.throws('CookieError', 'A message');
    liveIntentIdSubmodule.getId({ params: defaultConfigParams });
    expect(imgStub.getCall(0).args[0]).to.match(/.*ae=.+/);
  });

  it('should decode a unifiedId to lipbId and remove it', function() {
    const result = liveIntentIdSubmodule.decode({ unifiedId: 'data' }, { params: defaultConfigParams });
    expect(result).to.eql({'lipb': {'lipbid': 'data'}});
  });

  it('should decode a nonId to lipbId', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'data' }, { params: defaultConfigParams });
    expect(result).to.eql({'lipb': {'lipbid': 'data', 'nonId': 'data'}});
  });

  it('should resolve extra attributes', function() {
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: {
      ...defaultConfigParams,
      ...{ requestedAttributesOverrides: { 'foo': true, 'bar': false } }
    } }).callback;
    submoduleCallback(callBackSpy);
    let request = idxRequests()[0];
    expect(request.url).to.match(/https:\/\/idx.liadm.com\/idex\/prebid\/89899\?.*cd=.localhost.*&resolve=nonId.*&resolve=foo.*/);
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should decode a uid2 to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', uid2: 'bar' }, { params: defaultConfigParams });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'uid2': 'bar'}, 'uid2': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode values with uid2 but no nonId', function() {
    const result = liveIntentIdSubmodule.decode({ uid2: 'bar' }, { params: defaultConfigParams });
    expect(result).to.eql({'uid2': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode a bidswitch id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', bidswitch: 'bar' }, { params: defaultConfigParams });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'bidswitch': 'bar'}, 'bidswitch': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode a medianet id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', medianet: 'bar' }, { params: defaultConfigParams });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'medianet': 'bar'}, 'medianet': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode a sovrn id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', sovrn: 'bar' }, { params: defaultConfigParams });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'sovrn': 'bar'}, 'sovrn': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode a magnite id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', magnite: 'bar' }, { params: defaultConfigParams });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'magnite': 'bar'}, 'magnite': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode an index id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', index: 'bar' }, { params: defaultConfigParams });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'index': 'bar'}, 'index': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode an openx id to a separate object when present', function () {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', openx: 'bar' }, { params: defaultConfigParams });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'openx': 'bar'}, 'openx': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode an pubmatic id to a separate object when present', function() {
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', pubmatic: 'bar' }, { params: defaultConfigParams });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'pubmatic': 'bar'}, 'pubmatic': {'id': 'bar', 'ext': {'provider': 'liveintent.com'}}});
  });

  it('should decode a thetradedesk id to a separate object when present', function() {
    const provider = 'liveintent.com'
    refererInfoStub.returns({domain: provider})
    const result = liveIntentIdSubmodule.decode({ nonId: 'foo', thetradedesk: 'bar' }, { params: defaultConfigParams });
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'tdid': 'bar'}, 'tdid': {'id': 'bar', 'ext': {'rtiPartner': 'TDID', 'provider': provider}}});
  });

  it('should allow disabling nonId resolution', function() {
    let callBackSpy = sinon.spy();
    let submoduleCallback = liveIntentIdSubmodule.getId({ params: {
      ...defaultConfigParams,
      ...{ requestedAttributesOverrides: { 'nonId': false, 'uid2': true } }
    } }).callback;
    submoduleCallback(callBackSpy);
    let request = idxRequests()[0];
    expect(request.url).to.match(/https:\/\/idx.liadm.com\/idex\/prebid\/89899\?.*cd=.localhost.*&resolve=uid2.*/);
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should decode a idCookie as fpid if it exists and coppa is false', function() {
    coppaConsentDataStub.returns(false)
    const result = liveIntentIdSubmodule.decode({nonId: 'foo', idCookie: 'bar'}, { params: defaultConfigParams })
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo', 'fpid': 'bar'}, 'fpid': {'id': 'bar'}})
  });

  it('should not decode a idCookie as fpid if it exists and coppa is true', function() {
    coppaConsentDataStub.returns(true)
    const result = liveIntentIdSubmodule.decode({nonId: 'foo', idCookie: 'bar'}, { params: defaultConfigParams })
    expect(result).to.eql({'lipb': {'lipbid': 'foo', 'nonId': 'foo'}})
  });

  it('should resolve fpid from cookie', async function() {
    const expectedValue = 'someValue'
    const cookieName = 'testcookie'
    getCookieStub.withArgs(cookieName).returns(expectedValue)
    const config = { params: {
      ...defaultConfigParams,
      fpid: { 'strategy': 'cookie', 'name': cookieName },
      requestedAttributesOverrides: { 'fpid': true } }
    }
    const submoduleCallback = liveIntentIdSubmodule.getId(config).callback;
    const decodedResult = new Promise(resolve => {
      submoduleCallback((x) => resolve(liveIntentIdSubmodule.decode(x, config)));
    });
    const request = idxRequests()[0];
    expect(request.url).to.match(/https:\/\/idx.liadm.com\/idex\/prebid\/89899\?.*cd=.localhost.*&ic=someValue.*&resolve=nonId.*/);
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );

    const result = await decodedResult
    expect(result).to.be.eql({
      lipb: { 'fpid': expectedValue },
      fpid: { id: expectedValue }
    });
  });

  describe('eid', () => {
    before(() => {
      attachIdSystem(liveIntentIdSubmodule);
    });
    it('liveIntentId; getValue call and ext', function() {
      const userId = {
        lipb: {
          lipbid: 'some-random-id-value',
          segments: ['s1', 's2']
        }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'liveintent.com',
        uids: [{id: 'some-random-id-value', atype: 3}],
        ext: {segments: ['s1', 's2']}
      });
    });
    it('fpid; getValue call', function() {
      const userId = {
        fpid: {
          id: 'some-random-id-value'
        }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'fpid.liveintent.com',
        uids: [{id: 'some-random-id-value', atype: 1}]
      });
    });
    it('bidswitch', function() {
      const userId = {
        bidswitch: {'id': 'sample_id'}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'bidswitch.net',
        uids: [{
          id: 'sample_id',
          atype: 3
        }]
      });
    });

    it('bidswitch with ext', function() {
      const userId = {
        bidswitch: {'id': 'sample_id', 'ext': {'provider': 'some.provider.com'}}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'bidswitch.net',
        uids: [{
          id: 'sample_id',
          atype: 3,
          ext: {
            provider: 'some.provider.com'
          }
        }]
      });
    });
    it('medianet', function() {
      const userId = {
        medianet: {'id': 'sample_id'}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'media.net',
        uids: [{
          id: 'sample_id',
          atype: 3
        }]
      });
    });

    it('medianet with ext', function() {
      const userId = {
        medianet: {'id': 'sample_id', 'ext': {'provider': 'some.provider.com'}}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'media.net',
        uids: [{
          id: 'sample_id',
          atype: 3,
          ext: {
            provider: 'some.provider.com'
          }
        }]
      });
    });

    it('sovrn', function() {
      const userId = {
        sovrn: {'id': 'sample_id'}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'liveintent.sovrn.com',
        uids: [{
          id: 'sample_id',
          atype: 3
        }]
      });
    });

    it('sovrn with ext', function() {
      const userId = {
        sovrn: {'id': 'sample_id', 'ext': {'provider': 'some.provider.com'}}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'liveintent.sovrn.com',
        uids: [{
          id: 'sample_id',
          atype: 3,
          ext: {
            provider: 'some.provider.com'
          }
        }]
      });
    });

    it('magnite', function() {
      const userId = {
        magnite: {'id': 'sample_id'}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'rubiconproject.com',
        uids: [{
          id: 'sample_id',
          atype: 3
        }]
      });
    });

    it('magnite with ext', function() {
      const userId = {
        magnite: {'id': 'sample_id', 'ext': {'provider': 'some.provider.com'}}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'rubiconproject.com',
        uids: [{
          id: 'sample_id',
          atype: 3,
          ext: {
            provider: 'some.provider.com'
          }
        }]
      });
    });
    it('index', function() {
      const userId = {
        index: {'id': 'sample_id'}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'liveintent.indexexchange.com',
        uids: [{
          id: 'sample_id',
          atype: 3
        }]
      });
    });

    it('index with ext', function() {
      const userId = {
        index: {'id': 'sample_id', 'ext': {'provider': 'some.provider.com'}}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'liveintent.indexexchange.com',
        uids: [{
          id: 'sample_id',
          atype: 3,
          ext: {
            provider: 'some.provider.com'
          }
        }]
      });
    });

    it('openx', function () {
      const userId = {
        openx: { 'id': 'sample_id' }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'openx.net',
        uids: [{
          id: 'sample_id',
          atype: 3
        }]
      });
    });

    it('openx with ext', function () {
      const userId = {
        openx: { 'id': 'sample_id', 'ext': { 'provider': 'some.provider.com' } }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'openx.net',
        uids: [{
          id: 'sample_id',
          atype: 3,
          ext: {
            provider: 'some.provider.com'
          }
        }]
      });
    });

    it('pubmatic', function() {
      const userId = {
        pubmatic: {'id': 'sample_id'}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'pubmatic.com',
        uids: [{
          id: 'sample_id',
          atype: 3
        }]
      });
    });

    it('pubmatic with ext', function() {
      const userId = {
        pubmatic: {'id': 'sample_id', 'ext': {'provider': 'some.provider.com'}}
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'pubmatic.com',
        uids: [{
          id: 'sample_id',
          atype: 3,
          ext: {
            provider: 'some.provider.com'
          }
        }]
      });
    });

    it('liveIntentId; getValue call and NO ext', function() {
      const userId = {
        lipb: {
          lipbid: 'some-random-id-value'
        }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'liveintent.com',
        uids: [{id: 'some-random-id-value', atype: 3}]
      });
    });
  })
})
