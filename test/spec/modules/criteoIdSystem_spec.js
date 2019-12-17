import { criteoIdSubmodule } from 'modules/criteoIdSystem';
import * as utils from 'src/utils';
import * as ajaxLib from 'src/ajax';
import * as urlLib from 'src/url';

const pastDateString = new Date(0).toString()

function mockResponse(responseText, fakeResponse = (url, callback) => callback(responseText)) {
  return function() {
    return fakeResponse;
  }
}

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
  let ajaxBuilderStub;
  let triggerPixelStub;

  beforeEach(function (done) {
    getCookieStub = sinon.stub(utils, 'getCookie');
    setCookieStub = sinon.stub(utils, 'setCookie');
    getLocalStorageStub = sinon.stub(utils, 'getDataFromLocalStorage');
    setLocalStorageStub = sinon.stub(utils, 'setDataInLocalStorage');
    removeFromLocalStorageStub = sinon.stub(utils, 'removeDataFromLocalStorage');
    timeStampStub = sinon.stub(utils, 'timestamp').returns(nowTimestamp);
    ajaxBuilderStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(mockResponse('{}'));
    parseUrlStub = sinon.stub(urlLib, 'parse').returns({protocol: 'https', hostname: 'testdev.com'})
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
    ajaxBuilderStub.restore();
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

    const id = criteoIdSubmodule.getId();
    expect(id).to.be.deep.equal({id: testCase.expected ? { criteoId: testCase.expected } : undefined});
  }))

  it('decode() should return the bidId when it exists in local storages', function () {
    const id = criteoIdSubmodule.decode('testDecode');
    expect(id).to.equal('testDecode')
  });

  it('should call user sync url with the right params', function () {
    getCookieStub.withArgs('cto_test_cookie').returns('1');
    getCookieStub.withArgs('cto_bundle').returns('bundle');
    window.criteo_pubtag = {}

    const emptyObj = '{}';
    let ajaxStub = sinon.stub().callsFake((url, callback) => callback(emptyObj));
    ajaxBuilderStub.callsFake(mockResponse(undefined, ajaxStub))

    criteoIdSubmodule.getId();
    const expectedUrl = `https://gum.criteo.com/sid/json?origin=prebid&topUrl=https%3A%2F%2Ftestdev.com%2F&domain=testdev.com&bundle=bundle&cw=1&pbt=1`;

    expect(ajaxStub.calledWith(expectedUrl)).to.be.true;

    window.criteo_pubtag = undefined;
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

    beforeEach(function (done) {
      const fakeResponse = (url, callback) => {
        callback(JSON.stringify(response));
        setTimeout(done, 0);
      }
      ajaxBuilderStub.callsFake(mockResponse(undefined, fakeResponse));
      criteoIdSubmodule.getId();
    })

    it('should save bidId if it exists', function () {
      if (response.acwsUrl) {
        expect(triggerPixelStub.called).to.be.true;
        expect(setCookieStub.calledWith('cto_bundle')).to.be.false;
        expect(setLocalStorageStub.calledWith('cto_bundle')).to.be.false;
      } else if (response.bundle) {
        expect(setCookieStub.calledWith('cto_bundle', response.bundle, expirationTs)).to.be.true;
        expect(setLocalStorageStub.calledWith('cto_bundle', response.bundle)).to.be.true;
        expect(triggerPixelStub.called).to.be.false;
      }

      if (response.bidId) {
        expect(setCookieStub.calledWith('cto_bidid', response.bidId, expirationTs)).to.be.true;
        expect(setLocalStorageStub.calledWith('cto_bidid', response.bidId)).to.be.true;
      } else {
        expect(setCookieStub.calledWith('cto_bidid', '', pastDateString)).to.be.true;
        expect(removeFromLocalStorageStub.calledWith('cto_bidid')).to.be.true;
      }
    });
  }));
});
