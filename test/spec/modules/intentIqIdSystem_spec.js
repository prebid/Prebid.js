import { expect } from 'chai';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { intentIqIdSubmodule, decryptData, handleClientHints, firstPartyData as moduleFPD } from '../../../modules/intentIqIdSystem';
import {storage, readData} from '../../../libraries/intentIqUtils/storageUtils.js';
import { gppDataHandler, uspDataHandler, gdprDataHandler } from '../../../src/consentHandler';
import { clearAllCookies } from '../../helpers/cookies';
import { detectBrowserFromUserAgent, detectBrowserFromUserAgentData } from '../../../libraries/intentIqUtils/detectBrowserUtils';
import {CLIENT_HINTS_KEY, FIRST_PARTY_KEY, NOT_YET_DEFINED, WITH_IIQ} from '../../../libraries/intentIqConstants/intentIqConstants.js';

const partner = 10;
const pai = '11';
const pcid = '12';
const defaultConfigParams = { params: { partner: partner } };
const paiConfigParams = { params: { partner: partner, pai: pai } };
const pcidConfigParams = { params: { partner: partner, pcid: pcid } };
const allConfigParams = { params: { partner: partner, pai: pai, pcid: pcid } };
const responseHeader = { 'Content-Type': 'application/json' }

export const testClientHints = {
  architecture: 'x86',
  bitness: '64',
  brands: [
    {
      brand: 'Not(A:Brand',
      version: '24'
    },
    {
      brand: 'Chromium',
      version: '122'
    }
  ],
  fullVersionList: [
    {
      brand: 'Not(A:Brand',
      version: '24.0.0.0'
    },
    {
      brand: 'Chromium',
      version: '122.0.6261.128'
    }
  ],
  mobile: false,
  model: '',
  platform: 'Linux',
  platformVersion: '6.5.0',
  wow64: false
};

const mockGAM = () => {
  const targetingObject = {};
  return {
    cmd: [],
    pubads: () => ({
      setTargeting: (key, value) => {
        targetingObject[key] = value;
      },
      getTargeting: (key) => {
        return [targetingObject[key]];
      },
      getTargetingKeys: () => {
        return Object.keys(targetingObject);
      }
    })
  };
};

describe('IntentIQ tests', function () {
  let logErrorStub;
  let testLSValue = {
    'date': Date.now(),
    'cttl': 2000,
    'rrtt': 123
  }
  let testLSValueWithData = {
    'date': Date.now(),
    'cttl': 9999999999999,
    'rrtt': 123,
    'data': 'U2FsdGVkX185JJuQ2Zk0JLGjpgEbqxNy0Yl2qMtj9PqA5Q3IkNQYyTyFyTOkJi9Nf7E43PZQvIUgiUY/A9QxKYmy1LHX9LmZMKlLOcY1Je13Kr1EN7HRF8nIIWXo2jRgS5n0Nmty5995x3YMjLw+aRweoEtcrMC6p4wOdJnxfrOhdg0d/R7b8C+IN85rDLfNXANL1ezX8zwh4rj9XpMmWw=='
  }
  let testResponseWithValues = {
    'abPercentage': 90,
    'adt': 1,
    'ct': 2,
    'data': 'testdata',
    'dbsaved': 'false',
    'ls': true,
    'mde': true,
    'tc': 4
  }

  beforeEach(function () {
    localStorage.clear();
    const expiredDate = new Date(0).toUTCString();
    storage.setCookie(FIRST_PARTY_KEY, '', expiredDate, 'Lax');
    storage.setCookie(FIRST_PARTY_KEY + '_' + partner, '', expiredDate, 'Lax');
    logErrorStub = sinon.stub(utils, 'logError');
  });

  afterEach(function () {
    logErrorStub.restore();
    clearAllCookies();
    localStorage.clear();
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
    let submodule = intentIqIdSubmodule.getId({ params: { partner: '10' } });
    expect(logErrorStub.calledOnce).to.be.true;
    expect(submodule).to.be.undefined;
  });

  it('should not save data in cookie if relevant type not set', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: true })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(storage.getCookie('_iiq_fdata_' + partner)).to.equal(null);
  });

  it('should save data in cookie if storage type is "cookie"', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId({ ...allConfigParams, enabledStorageTypes: ['cookie'] }).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: true })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    const cookieValue = storage.getCookie('_iiq_fdata_' + partner);
    expect(cookieValue).to.not.equal(null);
    const decryptedData = JSON.parse(decryptData(JSON.parse(cookieValue).data));
    expect(decryptedData).to.deep.equal({eids: ['test_personid']});
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

  it('should ignore INVALID_ID and invalid responses in decode', function () {
    expect(intentIqIdSubmodule.decode('INVALID_ID')).to.equal(undefined);
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

  it('should set GAM targeting to U initially and update to A after server response', function () {
    let callBackSpy = sinon.spy();
    let mockGamObject = mockGAM();
    let expectedGamParameterName = 'intent_iq_group';

    const originalPubads = mockGamObject.pubads;
    let setTargetingSpy = sinon.spy();
    mockGamObject.pubads = function () {
      const obj = { ...originalPubads.apply(this, arguments) };
      const originalSetTargeting = obj.setTargeting;
      obj.setTargeting = function (...args) {
        setTargetingSpy(...args);
        return originalSetTargeting.apply(this, args);
      };
      return obj;
    };

    defaultConfigParams.params.gamObjectReference = mockGamObject;

    let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;

    submoduleCallback(callBackSpy);
    let request = server.requests[0];

    mockGamObject.cmd.forEach(cb => cb());
    mockGamObject.cmd = []

    let groupBeforeResponse = mockGamObject.pubads().getTargeting(expectedGamParameterName);

    request.respond(
      200,
      responseHeader,
      JSON.stringify({ group: 'A', tc: 20 })
    );

    mockGamObject.cmd.forEach(item => item());

    let groupAfterResponse = mockGamObject.pubads().getTargeting(expectedGamParameterName);

    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39');
    expect(groupBeforeResponse).to.deep.equal([NOT_YET_DEFINED]);
    expect(groupAfterResponse).to.deep.equal([WITH_IIQ]);

    expect(setTargetingSpy.calledTwice).to.be.true;
  });

  it('should use the provided gamParameterName from configParams', function () {
    let callBackSpy = sinon.spy();
    let mockGamObject = mockGAM();
    let customParamName = 'custom_gam_param';

    defaultConfigParams.params.gamObjectReference = mockGamObject;
    defaultConfigParams.params.gamParameterName = customParamName;

    let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    mockGamObject.cmd.forEach(cb => cb());
    let targetingKeys = mockGamObject.pubads().getTargetingKeys();

    expect(targetingKeys).to.include(customParamName);
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
    );
    expect(callBackSpy.calledOnce).to.be.true;
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

  it('save result if ls=true', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: true })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.deep.equal(['test_personid']);
  });

  it('dont save result if ls=false', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: false })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.deep.equal({eids: []});
  });

  it('send addition parameters if were found in localstorage', function () {
    localStorage.setItem('_iiq_fdata_' + partner, JSON.stringify(testLSValue))
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];

    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pcid=12&pai=11&iiqidtype=2&iiqpcid=');
    expect(request.url).to.contain('cttl=' + testLSValue.cttl);
    expect(request.url).to.contain('rrtt=' + testLSValue.rrtt);
    request.respond(
      200,
      responseHeader,
      JSON.stringify(testResponseWithValues)
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.deep.equal([testResponseWithValues.data]);
  });

  it('return data stored in local storage ', function () {
    localStorage.setItem('_iiq_fdata_' + partner, JSON.stringify(testLSValueWithData));
    let returnedValue = intentIqIdSubmodule.getId(allConfigParams);
    expect(returnedValue.id).to.deep.equal(JSON.parse(decryptData(testLSValueWithData.data)).eids);
  });

  it('should handle browser blacklisting', function () {
    let configParamsWithBlacklist = {
      params: { partner: partner, browserBlackList: 'chrome' }
    };
    sinon.stub(navigator, 'userAgent').value('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    let submoduleCallback = intentIqIdSubmodule.getId(configParamsWithBlacklist);
    expect(logErrorStub.calledOnce).to.be.true;
    expect(submoduleCallback).to.be.undefined;
  });

  it('should handle invalid JSON in readData', function () {
    localStorage.setItem('_iiq_fdata_' + partner, 'invalid_json');
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
    expect(logErrorStub.called).to.be.true;
  });

  describe('detectBrowserFromUserAgent', function () {
    it('should detect Chrome browser', function () {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      const result = detectBrowserFromUserAgent(userAgent);
      expect(result).to.equal('chrome');
    });

    it('should detect Safari browser', function () {
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15';
      const result = detectBrowserFromUserAgent(userAgent);
      expect(result).to.equal('safari');
    });

    it('should detect Firefox browser', function () {
      const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      const result = detectBrowserFromUserAgent(userAgent);
      expect(result).to.equal('firefox');
    });
  });

  describe('detectBrowserFromUserAgentData', function () {
    it('should detect Microsoft Edge browser', function () {
      const userAgentData = {
        brands: [
          { brand: 'Microsoft Edge', version: '91' },
          { brand: 'Chromium', version: '91' }
        ]
      };
      const result = detectBrowserFromUserAgentData(userAgentData);
      expect(result).to.equal('edge');
    });

    it('should detect Chrome browser', function () {
      const userAgentData = {
        brands: [
          { brand: 'Google Chrome', version: '91' },
          { brand: 'Chromium', version: '91' }
        ]
      };
      const result = detectBrowserFromUserAgentData(userAgentData);
      expect(result).to.equal('chrome');
    });

    it('should return unknown for unrecognized user agent data', function () {
      const userAgentData = {
        brands: [
          { brand: 'Unknown Browser', version: '1.0' }
        ]
      };
      const result = detectBrowserFromUserAgentData(userAgentData);
      expect(result).to.equal('unknown');
    });
  });

  describe('IntentIQ consent management within getId', function () {
    let uspDataHandlerStub;
    let gppDataHandlerStub;
    let gdprDataHandlerStub;
    let uspData;
    let gppData;
    let gdprData;

    function mockConsentHandlers(usp, gpp, gdpr) {
      uspDataHandlerStub.returns(usp);
      gppDataHandlerStub.returns(gpp);
      gdprDataHandlerStub.returns(gdpr);
    }

    beforeEach(function () {
      localStorage.clear();
      uspDataHandlerStub = sinon.stub(uspDataHandler, 'getConsentData');
      gppDataHandlerStub = sinon.stub(gppDataHandler, 'getConsentData');
      gdprDataHandlerStub = sinon.stub(gdprDataHandler, 'getConsentData');
      // Initialize data here so it can be reused in all tests
      uspData = '1NYN';
      gppData = { gppString: '{"key1":"value1","key2":"value2"}' };
      gdprData = { gdprApplies: true, consentString: 'gdprConsent' };
    });

    afterEach(function () {
      uspDataHandlerStub.restore();
      gppDataHandlerStub.restore();
      gdprDataHandlerStub.restore();
    });

    it('should set isOptOut to true for new users if GDPR is detected and update it upon receiving a server response', function () {
      localStorage.clear();
      mockConsentHandlers(uspData, gppData, gdprData);
      let callBackSpy = sinon.spy();
      let submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
      submoduleCallback(callBackSpy);

      let lsBeforeReq = JSON.parse(localStorage.getItem(FIRST_PARTY_KEY));

      let request = server.requests[0];
      request.respond(
        200,
        responseHeader,
        JSON.stringify({ isOptedOut: false })
      );

      let updatedFirstPartyData = JSON.parse(localStorage.getItem(FIRST_PARTY_KEY));

      expect(lsBeforeReq).to.not.be.null;
      expect(lsBeforeReq.isOptedOut).to.be.true;
      expect(callBackSpy.calledOnce).to.be.true;
      expect(updatedFirstPartyData).to.not.be.undefined;
      expect(updatedFirstPartyData.isOptedOut).to.equal(false);
    });

    it('should save cmpData parameters in LS data and used it request if uspData, gppData, gdprData exists', function () {
      mockConsentHandlers(uspData, gppData, gdprData);

      let callBackSpy = sinon.spy();
      let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
      const data = {eids: {key1: 'value1', key2: 'value2'}}

      submoduleCallback(callBackSpy);
      let request = server.requests[0];
      request.respond(
        200,
        responseHeader,
        JSON.stringify({ ...data, isOptedOut: false })
      );

      expect(request.url).to.contain(`&gpp=${encodeURIComponent(gppData.gppString)}`);
      expect(request.url).to.contain(`&us_privacy=${encodeURIComponent(uspData)}`);
      expect(request.url).to.contain(`&gdpr_consent=${encodeURIComponent(gdprData.consentString)}`);

      const lsFirstPartyData = JSON.parse(localStorage.getItem(FIRST_PARTY_KEY));
      expect(lsFirstPartyData.uspString).to.equal(uspData);
      expect(lsFirstPartyData.gppString).to.equal(gppData.gppString);
      expect(lsFirstPartyData.gdprString).to.equal(gdprData.consentString);

      expect(moduleFPD.uspString).to.equal(uspData);
      expect(moduleFPD.gppString).to.equal(gppData.gppString);
      expect(moduleFPD.gdprString).to.equal(gdprData.consentString);
    });

    it('should clear localStorage, update runtimeEids and trigger callback with empty data if isOptedOut is true in response', function () {
      // Save some data to localStorage for FPD and CLIENT_HINTS
      const FIRST_PARTY_DATA_KEY = FIRST_PARTY_KEY + '_' + partner;
      localStorage.setItem(FIRST_PARTY_DATA_KEY, JSON.stringify({terminationCause: 35, some_key: 'someValue'}));
      localStorage.setItem(CLIENT_HINTS_KEY, JSON.stringify({ hint: 'someClientHintData' }));

      mockConsentHandlers(uspData, gppData, gdprData);

      let callBackSpy = sinon.spy();
      let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;

      submoduleCallback(callBackSpy);

      let request = server.requests[0];
      request.respond(
        200,
        responseHeader,
        JSON.stringify({isOptedOut: true})
      );

      // Check that the URL contains the expected consent data
      expect(request.url).to.contain(`&gpp=${encodeURIComponent(gppData.gppString)}`);
      expect(request.url).to.contain(`&us_privacy=${encodeURIComponent(uspData)}`);
      expect(request.url).to.contain(`&gdpr_consent=${encodeURIComponent(gdprData.consentString)}`);

      const lsFirstPartyData = JSON.parse(localStorage.getItem(FIRST_PARTY_KEY));

      // Ensure that keys are removed if isOptedOut is true
      expect(localStorage.getItem(FIRST_PARTY_DATA_KEY)).to.be.null;
      expect(localStorage.getItem(CLIENT_HINTS_KEY)).to.be.null;

      expect(lsFirstPartyData.isOptedOut).to.equal(true);
      expect(callBackSpy.calledOnce).to.be.true;
      // Get the parameter with which the callback was called
      const callbackArgument = callBackSpy.args[0][0]; // The first argument from the callback call (runtimeEids)
      expect(callbackArgument).to.deep.equal({ eids: [] }); // Ensure that runtimeEids was updated to { eids: [] }
    });

    it('should make request to correct address api-gdpr.intentiq.com if gdpr is detected', function() {
      const ENDPOINT_GDPR = 'https://api-gdpr.intentiq.com';
      mockConsentHandlers(uspData, gppData, gdprData);
      let callBackSpy = sinon.spy();
      let submoduleCallback = intentIqIdSubmodule.getId({...defaultConfigParams}).callback;

      submoduleCallback(callBackSpy);
      let request = server.requests[0];

      expect(request.url).to.contain(ENDPOINT_GDPR);
    });
  });

  it('should get and save client hints to storage', async () => {
    localStorage.clear();
    Object.defineProperty(navigator, 'userAgentData', {
      value: { getHighEntropyValues: async () => testClientHints },
      configurable: true
    });
    await intentIqIdSubmodule.getId(defaultConfigParams);

    const savedClientHints = readData(CLIENT_HINTS_KEY, ['html5'], storage);
    const expectedClientHints = handleClientHints(testClientHints);
    expect(savedClientHints).to.equal(expectedClientHints);
  });

  it('should run callback from params', async () => {
    let wasCallbackCalled = false
    const callbackConfigParams = { params: { partner: partner,
      pai: pai,
      pcid: pcid,
      browserBlackList: 'Chrome',
      callback: () => {
        wasCallbackCalled = true
      } } };

    await intentIqIdSubmodule.getId(callbackConfigParams);
    expect(wasCallbackCalled).to.equal(true);
  });
});
