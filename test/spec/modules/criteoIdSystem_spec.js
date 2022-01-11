import { criteoIdSubmodule, storage } from 'modules/criteoIdSystem.js';
import * as utils from 'src/utils.js';
import {server} from '../../mocks/xhr';

const pastDateString = new Date(0).toString()

describe('CriteoId module', function () {
  const cookiesMaxAge = 13 * 30 * 24 * 60 * 60 * 1000;

  const nowTimestamp = new Date().getTime();

  let getCookieStub;
  let setCookieStub;
  let getLocalStorageStub;
  let setLocalStorageStub;
  let removeFromLocalStorageStub;
  let timeStampStub;
  let parseUrlStub;
  let triggerPixelStub;

  beforeEach(function (done) {
    getCookieStub = sinon.stub(storage, 'getCookie');
    setCookieStub = sinon.stub(storage, 'setCookie');
    getLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    setLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
    removeFromLocalStorageStub = sinon.stub(storage, 'removeDataFromLocalStorage');
    timeStampStub = sinon.stub(utils, 'timestamp').returns(nowTimestamp);
    parseUrlStub = sinon.stub(utils, 'parseUrl').returns({protocol: 'https', hostname: 'testdev.com'})
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    done();
  });

  afterEach(function () {
    getCookieStub.restore();
    setCookieStub.restore();
    getLocalStorageStub.restore();
    setLocalStorageStub.restore();
    removeFromLocalStorageStub.restore();
    timeStampStub.restore();
    triggerPixelStub.restore();
    parseUrlStub.restore();
  });

  const storageTestCases = [
    { cookie: 'bidId', localStorage: 'bidId2', expected: 'bidId' },
    { cookie: 'bidId', localStorage: undefined, expected: 'bidId' },
    { cookie: undefined, localStorage: 'bidId', expected: 'bidId' },
    { cookie: undefined, localStorage: undefined, expected: undefined },
  ]

  storageTestCases.forEach(testCase => it('getId() should return the bidId when it exists in local storages', function () {
    getCookieStub.withArgs('cto_bidid').returns(testCase.cookie);
    getLocalStorageStub.withArgs('cto_bidid').returns(testCase.localStorage);

    const result = criteoIdSubmodule.getId();
    expect(result.id).to.be.deep.equal(testCase.expected ? { criteoId: testCase.expected } : undefined);
    expect(result.callback).to.be.a('function');
  }))

  it('decode() should return the bidId when it exists in local storages', function () {
    const id = criteoIdSubmodule.decode('testDecode');
    expect(id).to.equal('testDecode')
  });

  it('should call user sync url with the right params', function () {
    getCookieStub.withArgs('cto_bundle').returns('bundle');
    window.criteo_pubtag = {}

    let callBackSpy = sinon.spy();
    let result = criteoIdSubmodule.getId();
    result.callback(callBackSpy);

    const expectedUrl = `https://gum.criteo.com/sid/json?origin=prebid&topUrl=https%3A%2F%2Ftestdev.com%2F&domain=testdev.com&bundle=bundle&cw=1&pbt=1&lsw=1`;

    let request = server.requests[0];
    expect(request.url).to.be.eq(expectedUrl);

    request.respond(
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  const responses = [
    { bundle: 'bundle', bidId: 'bidId', acwsUrl: 'acwsUrl' },
    { bundle: 'bundle', bidId: undefined, acwsUrl: 'acwsUrl' },
    { bundle: 'bundle', bidId: 'bidId', acwsUrl: undefined },
    { bundle: undefined, bidId: 'bidId', acwsUrl: 'acwsUrl' },
    { bundle: 'bundle', bidId: undefined, acwsUrl: undefined },
    { bundle: undefined, bidId: 'bidId', acwsUrl: undefined },
    { bundle: undefined, bidId: undefined, acwsUrl: 'acwsUrl' },
    { bundle: undefined, bidId: undefined, acwsUrl: ['acwsUrl', 'acwsUrl2'] },
    { bundle: undefined, bidId: undefined, acwsUrl: undefined },
  ]

  responses.forEach(response => describe('test user sync response behavior', function () {
    const expirationTs = new Date(nowTimestamp + cookiesMaxAge).toString();

    it('should save bidId if it exists', function () {
      const result = criteoIdSubmodule.getId();
      result.callback((id) => {
        expect(id).to.be.deep.equal(response.bidId ? { criteoId: response.bidId } : undefined);
      });

      let request = server.requests[0];
      request.respond(
        200,
        {'Content-Type': 'application/json'},
        JSON.stringify(response)
      );

      if (response.acwsUrl) {
        expect(triggerPixelStub.called).to.be.true;
        expect(setCookieStub.calledWith('cto_bundle')).to.be.false;
        expect(setLocalStorageStub.calledWith('cto_bundle')).to.be.false;
      } else if (response.bundle) {
        expect(setCookieStub.calledWith('cto_bundle', response.bundle, expirationTs, null, '.com')).to.be.true;
        expect(setCookieStub.calledWith('cto_bundle', response.bundle, expirationTs, null, '.testdev.com')).to.be.true;
        expect(setLocalStorageStub.calledWith('cto_bundle', response.bundle)).to.be.true;
        expect(triggerPixelStub.called).to.be.false;
      }

      if (response.bidId) {
        expect(setCookieStub.calledWith('cto_bidid', response.bidId, expirationTs, null, '.com')).to.be.true;
        expect(setCookieStub.calledWith('cto_bidid', response.bidId, expirationTs, null, '.testdev.com')).to.be.true;
        expect(setLocalStorageStub.calledWith('cto_bidid', response.bidId)).to.be.true;
      } else {
        expect(setCookieStub.calledWith('cto_bidid', '', pastDateString, null, '.com')).to.be.true;
        expect(setCookieStub.calledWith('cto_bidid', '', pastDateString, null, '.testdev.com')).to.be.true;
        expect(removeFromLocalStorageStub.calledWith('cto_bidid')).to.be.true;
      }
    });
  }));

  const gdprConsentTestCases = [
    { consentData: { gdprApplies: true, consentString: 'expectedConsentString' }, expected: 'expectedConsentString' },
    { consentData: { gdprApplies: false, consentString: 'expectedConsentString' }, expected: undefined },
    { consentData: { gdprApplies: true, consentString: undefined }, expected: undefined },
    { consentData: { gdprApplies: 'oui', consentString: 'expectedConsentString' }, expected: undefined },
    { consentData: undefined, expected: undefined }
  ];

  gdprConsentTestCases.forEach(testCase => it('should call user sync url with the gdprConsent', function () {
    let callBackSpy = sinon.spy();
    let result = criteoIdSubmodule.getId(undefined, testCase.consentData);
    result.callback(callBackSpy);

    let request = server.requests[0];
    if (testCase.expected) {
      expect(request.url).to.have.string(`gdprString=${testCase.expected}`);
    } else {
      expect(request.url).to.not.have.string('gdprString');
    }

    request.respond(
      200,
      {'Content-Type': 'application/json'},
      JSON.stringify({})
    );

    expect(callBackSpy.calledOnce).to.be.true;
  }));
});
