import { criteoIdSubmodule, storage } from 'modules/criteoIdSystem.js';
import * as utils from 'src/utils.js';
import { gdprDataHandler, uspDataHandler, gppDataHandler } from '../../../src/adapterManager.js';
import { server } from '../../mocks/xhr';
import {attachIdSystem} from '../../../modules/userId/index.js';
import {createEidsArray} from '../../../modules/userId/eids.js';
import {expect} from 'chai/index.mjs';

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
  let gdprConsentDataStub;
  let uspConsentDataStub;
  let gppConsentDataStub;

  beforeEach(function (done) {
    getCookieStub = sinon.stub(storage, 'getCookie');
    setCookieStub = sinon.stub(storage, 'setCookie');
    getLocalStorageStub = sinon.stub(storage, 'getDataFromLocalStorage');
    setLocalStorageStub = sinon.stub(storage, 'setDataInLocalStorage');
    removeFromLocalStorageStub = sinon.stub(storage, 'removeDataFromLocalStorage');
    timeStampStub = sinon.stub(utils, 'timestamp').returns(nowTimestamp);
    parseUrlStub = sinon.stub(utils, 'parseUrl').returns({ protocol: 'https', hostname: 'testdev.com' })
    triggerPixelStub = sinon.stub(utils, 'triggerPixel');
    gdprConsentDataStub = sinon.stub(gdprDataHandler, 'getConsentData');
    uspConsentDataStub = sinon.stub(uspDataHandler, 'getConsentData');
    gppConsentDataStub = sinon.stub(gppDataHandler, 'getConsentData');
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
    gdprConsentDataStub.restore();
    uspConsentDataStub.restore();
    gppConsentDataStub.restore();
  });

  const storageTestCases = [
    { submoduleConfig: undefined, cookie: 'bidId', localStorage: 'bidId2', expected: 'bidId' },
    { submoduleConfig: undefined, cookie: 'bidId', localStorage: undefined, expected: 'bidId' },
    { submoduleConfig: undefined, cookie: undefined, localStorage: 'bidId', expected: 'bidId' },
    { submoduleConfig: undefined, cookie: undefined, localStorage: undefined, expected: undefined },
    { submoduleConfig: { storage: { type: 'cookie' } }, cookie: 'bidId', localStorage: 'bidId2', expected: 'bidId' },
    { submoduleConfig: { storage: { type: 'cookie' } }, cookie: undefined, localStorage: 'bidId2', expected: undefined },
    { submoduleConfig: { storage: { type: 'html5' } }, cookie: 'bidId', localStorage: 'bidId2', expected: 'bidId2' },
    { submoduleConfig: { storage: { type: 'html5' } }, cookie: 'bidId', localStorage: undefined, expected: undefined },
  ]

  storageTestCases.forEach(testCase => it('getId() should return the user id depending on the storage type enabled and the data available', function () {
    getCookieStub.withArgs('cto_bidid').returns(testCase.cookie);
    getLocalStorageStub.withArgs('cto_bidid').returns(testCase.localStorage);

    const result = criteoIdSubmodule.getId(testCase.submoduleConfig);
    expect(result.id).to.be.deep.equal(testCase.expected ? { criteoId: testCase.expected } : undefined);
    expect(result.callback).to.be.a('function');
  }))

  it('decode() should return the bidId when it exists in local storages', function () {
    const id = criteoIdSubmodule.decode('testDecode');
    expect(id).to.equal('testDecode')
  });

  it('should call user sync url with the right params', function () {
    getCookieStub.withArgs('cto_bundle').returns('bundle');
    getCookieStub.withArgs('cto_dna_bundle').returns('info');
    window.criteo_pubtag = {}

    let callBackSpy = sinon.spy();
    let result = criteoIdSubmodule.getId();
    result.callback(callBackSpy);

    const expectedUrl = `https://gum.criteo.com/sid/json?origin=prebid&topUrl=https%3A%2F%2Ftestdev.com%2F&domain=testdev.com&bundle=bundle&info=info&cw=1&pbt=1&lsw=1`;

    let request = server.requests[0];
    expect(request.url).to.be.eq(expectedUrl);

    request.respond(
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  const responses = [
    { submoduleConfig: undefined, shouldWriteCookie: true, shouldWriteLocalStorage: true, bundle: 'bundle', bidId: 'bidId', acwsUrl: 'acwsUrl' },
    { submoduleConfig: undefined, shouldWriteCookie: true, shouldWriteLocalStorage: true, bundle: 'bundle', bidId: undefined, acwsUrl: 'acwsUrl' },
    { submoduleConfig: undefined, shouldWriteCookie: true, shouldWriteLocalStorage: true, bundle: 'bundle', bidId: 'bidId', acwsUrl: undefined },
    { submoduleConfig: undefined, shouldWriteCookie: true, shouldWriteLocalStorage: true, bundle: undefined, bidId: 'bidId', acwsUrl: 'acwsUrl' },
    { submoduleConfig: undefined, shouldWriteCookie: true, shouldWriteLocalStorage: true, bundle: 'bundle', bidId: undefined, acwsUrl: undefined },
    { submoduleConfig: undefined, shouldWriteCookie: true, shouldWriteLocalStorage: true, bundle: undefined, bidId: 'bidId', acwsUrl: undefined },
    { submoduleConfig: undefined, shouldWriteCookie: true, shouldWriteLocalStorage: true, bundle: undefined, bidId: undefined, acwsUrl: 'acwsUrl' },
    { submoduleConfig: undefined, shouldWriteCookie: true, shouldWriteLocalStorage: true, bundle: undefined, bidId: undefined, acwsUrl: ['acwsUrl', 'acwsUrl2'] },
    { submoduleConfig: undefined, shouldWriteCookie: true, shouldWriteLocalStorage: true, bundle: undefined, bidId: undefined, acwsUrl: undefined },
    { submoduleConfig: { storage: { type: 'cookie' } }, shouldWriteCookie: true, shouldWriteLocalStorage: false, bundle: 'bundle', bidId: 'bidId', acwsUrl: undefined },
    { submoduleConfig: { storage: { type: 'html5' } }, shouldWriteCookie: false, shouldWriteLocalStorage: true, bundle: 'bundle', bidId: 'bidId', acwsUrl: undefined },
  ]

  responses.forEach(response => describe('test user sync response behavior', function () {
    const expirationTs = new Date(nowTimestamp + cookiesMaxAge).toString();

    it('should save bidId if it exists', function () {
      const result = criteoIdSubmodule.getId(response.submoduleConfig);
      result.callback((id) => {
        expect(id).to.be.deep.equal(response.bidId ? { criteoId: response.bidId } : undefined);
      });

      let request = server.requests[0];
      request.respond(
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(response)
      );

      if (response.acwsUrl) {
        expect(triggerPixelStub.called).to.be.true;
        expect(setCookieStub.calledWith('cto_bundle')).to.be.false;
        expect(setLocalStorageStub.calledWith('cto_bundle')).to.be.false;
      } else if (response.bundle) {
        if (response.shouldWriteCookie) {
          expect(setCookieStub.calledWith('cto_bundle', response.bundle, expirationTs, null, '.com')).to.be.true;
          expect(setCookieStub.calledWith('cto_bundle', response.bundle, expirationTs, null, '.testdev.com')).to.be.true;
        } else {
          expect(setCookieStub.calledWith('cto_bundle', response.bundle, expirationTs, null, '.com')).to.be.false;
          expect(setCookieStub.calledWith('cto_bundle', response.bundle, expirationTs, null, '.testdev.com')).to.be.false;
        }

        if (response.shouldWriteLocalStorage) {
          expect(setLocalStorageStub.calledWith('cto_bundle', response.bundle)).to.be.true;
        } else {
          expect(setLocalStorageStub.calledWith('cto_bundle', response.bundle)).to.be.false;
        }
        expect(triggerPixelStub.called).to.be.false;
      }

      if (response.bidId) {
        if (response.shouldWriteCookie) {
          expect(setCookieStub.calledWith('cto_bidid', response.bidId, expirationTs, null, '.com')).to.be.true;
          expect(setCookieStub.calledWith('cto_bidid', response.bidId, expirationTs, null, '.testdev.com')).to.be.true;
        } else {
          expect(setCookieStub.calledWith('cto_bidid', response.bidId, expirationTs, null, '.com')).to.be.false;
          expect(setCookieStub.calledWith('cto_bidid', response.bidId, expirationTs, null, '.testdev.com')).to.be.false;
        }
        if (response.shouldWriteLocalStorage) {
          expect(setLocalStorageStub.calledWith('cto_bidid', response.bidId)).to.be.true;
        } else {
          expect(setLocalStorageStub.calledWith('cto_bidid', response.bidId)).to.be.false;
        }
      } else {
        expect(setCookieStub.calledWith('cto_bidid', '', pastDateString, null, '.com')).to.be.true;
        expect(setCookieStub.calledWith('cto_bidid', '', pastDateString, null, '.testdev.com')).to.be.true;
        expect(removeFromLocalStorageStub.calledWith('cto_bidid')).to.be.true;
      }
    });
  }));

  const gdprConsentTestCases = [
    { consentData: { gdprApplies: true, consentString: 'expectedConsentString' }, expectedGdprConsent: 'expectedConsentString', expectedGdpr: '1' },
    { consentData: { gdprApplies: false, consentString: 'expectedConsentString' }, expectedGdprConsent: 'expectedConsentString', expectedGdpr: '0' },
    { consentData: { gdprApplies: true, consentString: undefined }, expectedGdprConsent: undefined, expectedGdpr: '1' },
    { consentData: { gdprApplies: 'oui', consentString: 'expectedConsentString' }, expectedGdprConsent: 'expectedConsentString', expectedGdpr: '0' },
    { consentData: undefined, expectedGdprConsent: undefined, expectedGdpr: undefined }
  ];

  it('should call sync pixels if request by backend', function () {
    const expirationTs = new Date(nowTimestamp + cookiesMaxAge).toString();

    const result = criteoIdSubmodule.getId();
    result.callback((id) => {

    });

    const response = {
      pixels: [
        {
          pixelUrl: 'pixelUrlWithBundle',
          writeBundleInStorage: true,
          bundlePropertyName: 'abc',
          storageKeyName: 'cto_pixel_test'
        },
        {
          pixelUrl: 'pixelUrl'
        }
      ]
    };

    server.requests[0].respond(
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response)
    );

    server.requests[1].respond(
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({
        abc: 'ok'
      })
    );

    expect(triggerPixelStub.called).to.be.true;
    expect(setCookieStub.calledWith('cto_pixel_test', 'ok', expirationTs, null, '.com')).to.be.true;
    expect(setCookieStub.calledWith('cto_pixel_test', 'ok', expirationTs, null, '.testdev.com')).to.be.true;
    expect(setLocalStorageStub.calledWith('cto_pixel_test', 'ok')).to.be.true;
  });

  it('should call sync pixels and use error handler', function () {
    const expirationTs = new Date(nowTimestamp + cookiesMaxAge).toString();

    const result = criteoIdSubmodule.getId();
    result.callback((id) => {
    });

    const response = {
      pixels: [
        {
          pixelUrl: 'pixelUrlWithBundle',
          writeBundleInStorage: true,
          bundlePropertyName: 'abc',
          storageKeyName: 'cto_pixel_test'
        }
      ]
    };

    server.requests[0].respond(
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify(response)
    );

    server.requests[1].respond(
      500,
      { 'Content-Type': 'application/json' },
      JSON.stringify({
        abc: 'ok'
      })
    );

    expect(triggerPixelStub.called).to.be.false;
    expect(setCookieStub.calledWith('cto_pixel_test', 'ok', expirationTs, null, '.com')).to.be.false;
    expect(setCookieStub.calledWith('cto_pixel_test', 'ok', expirationTs, null, '.testdev.com')).to.be.false;
    expect(setLocalStorageStub.calledWith('cto_pixel_test', 'ok')).to.be.false;
  });

  gdprConsentTestCases.forEach(testCase => it('should call user sync url with the gdprConsent', function () {
    let callBackSpy = sinon.spy();

    gdprConsentDataStub.returns(testCase.consentData);

    let result = criteoIdSubmodule.getId(undefined);
    result.callback(callBackSpy);

    let request = server.requests[0];

    if (testCase.expectedGdprConsent) {
      expect(request.url).to.have.string(`gdprString=${testCase.expectedGdprConsent}`);
    } else {
      expect(request.url).to.not.have.string('gdprString=');
    }

    if (testCase.expectedGdpr) {
      expect(request.url).to.have.string(`gdpr=${testCase.expectedGdpr}`);
    } else {
      expect(request.url).to.not.have.string('gdpr=');
    }

    request.respond(
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({})
    );

    expect(callBackSpy.calledOnce).to.be.true;
  }));

  [undefined, 'abc'].forEach(usPrivacy => it('should call user sync url with the us privacy string', function () {
    let callBackSpy = sinon.spy();

    uspConsentDataStub.returns(usPrivacy);

    let result = criteoIdSubmodule.getId(undefined);
    result.callback(callBackSpy);

    let request = server.requests[0];

    if (usPrivacy) {
      expect(request.url).to.have.string(`us_privacy=${usPrivacy}`);
    } else {
      expect(request.url).to.not.have.string('us_privacy=');
    }

    request.respond(
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({})
    );

    expect(callBackSpy.calledOnce).to.be.true;
  }));

  [
    {
      consentData: {
        gppString: 'abc',
        applicableSections: [1]
      },
      expectedGpp: 'abc',
      expectedGppSid: '1'
    },
    {
      consentData: undefined,
      expectedGpp: undefined,
      expectedGppSid: undefined
    }
  ].forEach(testCase => it('should call user sync url with the gpp string', function () {
    let callBackSpy = sinon.spy();

    gppConsentDataStub.returns(testCase.consentData);

    let result = criteoIdSubmodule.getId(undefined);
    result.callback(callBackSpy);

    let request = server.requests[0];

    if (testCase.expectedGpp) {
      expect(request.url).to.have.string(`gpp=${testCase.expectedGpp}`);
    } else {
      expect(request.url).to.not.have.string('gpp=');
    }

    if (testCase.expectedGppSid) {
      expect(request.url).to.have.string(`gpp_sid=${testCase.expectedGppSid}`);
    } else {
      expect(request.url).to.not.have.string('gpp_sid=');
    }

    request.respond(
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({})
    );

    expect(callBackSpy.calledOnce).to.be.true;
  }));
  describe('eid', () => {
    before(() => {
      attachIdSystem(criteoIdSubmodule);
    });
    it('criteo', function() {
      const userId = {
        criteoId: 'some-random-id-value'
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'criteo.com',
        uids: [{id: 'some-random-id-value', atype: 1}]
      });
    });
  })
});
