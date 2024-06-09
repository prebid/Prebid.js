import { expect } from 'chai';
import iiqAnalyticsAnalyticsAdapter from 'modules/intentIqAnalyticsAdapter.js';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import { CLIENT_HINTS_KEY, FIRST_PARTY_KEY, decryptData, detectBrowserFromUserAgent, detectBrowserFromUserAgentData, handleClientHints, handleGPPData, readData } from '../../../modules/intentIqIdSystem';
import { gppDataHandler, uspDataHandler } from '../../../src/consentHandler';
import { logInfo } from '../../../src/utils';

const partner = 10;
const pai = '11';
const pcid = '12';
const userPercentage = 0;
const defaultPercentage = 100;
const FIRST_PARTY_DATA_KEY = '_iiq_fdata';
const PERCENT_LS_KEY = '_iiq_percent';
const GROUP_LS_KEY = '_iiq_group';

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

describe('IntentIQ tests', function () {
  let logErrorStub;

  beforeEach(function () {
    localStorage.clear();
    const expiredDate = new Date(0).toUTCString();
    storage.setCookie(FIRST_PARTY_KEY, '', expiredDate, 'Lax');
    storage.setCookie(FIRST_PARTY_KEY + '_' + partner, '', expiredDate, 'Lax');
    logErrorStub = sinon.stub(utils, 'logError');
    sinon.stub(config, 'getConfig').withArgs('userSync.userIds').returns(USERID_CONFIG);
    sinon.stub(events, 'getEvents').returns([]);
    iiqAnalyticsAnalyticsAdapter.enableAnalytics({
      provider: 'iiqAnalytics',
    });
    iiqAnalyticsAnalyticsAdapter.initOptions = {
      lsValueInitialized: false,
      partner: null,
      fpid: null,
      userGroup: null,
      userPercentage: null,
      currentGroup: null,
      currentPercentage: null,
      dataInLs: null,
      eidl: null,
      lsIdsInitialized: false,
      manualReport: false
    };
    if (iiqAnalyticsAnalyticsAdapter.track.restore) {
      iiqAnalyticsAnalyticsAdapter.track.restore();
    }
    sinon.spy(iiqAnalyticsAnalyticsAdapter, 'track');
  });

  afterEach(function () {
    logErrorStub.restore();
    config.getConfig.restore();
    events.getEvents.restore();
    iiqAnalyticsAnalyticsAdapter.disableAnalytics();
    if (iiqAnalyticsAnalyticsAdapter.track.restore) {
      iiqAnalyticsAnalyticsAdapter.track.restore();
    }
  });

  it('IIQ Analytical Adapter bid win report', function () {
    localStorage.setItem(PERCENT_LS_KEY + '_' + partner, defaultPercentage);
    localStorage.setItem(GROUP_LS_KEY + '_' + partner, 'A');
    localStorage.setItem(FIRST_PARTY_DATA_KEY + '_' + partner, '{"pcid":"f961ffb1-a0e1-4696-a9d2-a21d815bd344"}');

    events.emit(EVENTS.BID_WON, wonRequest);

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    expect(request.url).to.contain('https://reports.intentiq.com/report?pid=' + partner + '&mct=1&agid=');
    expect(request.url).to.contain('&jsver=5.3&source=pbjs&payload=');
  });

  it('should initialize with default configurations', function () {
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized).to.be.false;
  });

  it('should handle BID_WON event with user percentage configuration', function () {
    localStorage.setItem(PERCENT_LS_KEY + '_' + partner, userPercentage);
    localStorage.setItem(GROUP_LS_KEY + '_' + partner, 'B');
    localStorage.setItem(FIRST_PARTY_DATA_KEY + '_' + partner, '{"pcid":"testpcid"}');

    events.emit(EVENTS.BID_WON, wonRequest);

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    expect(request.url).to.contain('https://reports.intentiq.com/report?pid=' + partner + '&mct=1&agid=');
    expect(request.url).to.contain('&jsver=5.3&source=pbjs&payload=');
  });

  it('should handle BID_WON event with default percentage configuration', function () {
    localStorage.setItem(PERCENT_LS_KEY + '_' + partner, defaultPercentage);
    localStorage.setItem(GROUP_LS_KEY + '_' + partner, 'A');
    localStorage.setItem(FIRST_PARTY_DATA_KEY + '_' + partner, '{"pcid":"defaultpcid"}');

    events.emit(EVENTS.BID_WON, wonRequest);

    expect(server.requests.length).to.be.above(0);
    const request = server.requests[0];
    expect(request.url).to.contain('https://reports.intentiq.com/report?pid=' + partner + '&mct=1&agid=');
    expect(request.url).to.contain('&jsver=5.3&source=pbjs&payload=');
  });

  it('should not send request if manualReport is true', function () {
    iiqAnalyticsAnalyticsAdapter.initOptions.manualReport = true;
    events.emit(EVENTS.BID_WON, wonRequest);
    expect(server.requests.length).to.equal(0);
  });

  it('should read data from local storage', function () {
    localStorage.setItem(FIRST_PARTY_DATA_KEY + '_' + partner, '{"data":"testpcid", "eidl": 10}');
    events.emit(EVENTS.BID_WON, wonRequest);
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs).to.equal('testpcid');
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.eidl).to.equal(10);
  });

  it('should handle initialization values from local storage', function () {
    localStorage.setItem(PERCENT_LS_KEY + '_' + partner, 50);
    localStorage.setItem(GROUP_LS_KEY + '_' + partner, 'B');
    localStorage.setItem(FIRST_PARTY_KEY, '{"pcid":"testpcid"}');
    events.emit(EVENTS.BID_WON, wonRequest); // This will call initLsValues internally
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup).to.equal('B');
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.currentPercentage).to.equal(50);
    expect(iiqAnalyticsAnalyticsAdapter.initOptions.fpid).to.be.not.null;
  });

  it('should handle encrypted data correctly', function () {
    let encryptedData = AES.encrypt('test_personid', MODULE_NAME).toString();
    localStorage.setItem(FIRST_PARTY_DATA_KEY + '_' + partner, JSON.stringify({ data: encryptedData }));
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.equal('test_personid');
  });

  it('should handle getId with high entropy values', function (done) {
    let callBackSpy = sinon.spy();
    sinon.stub(navigator.userAgentData, 'getHighEntropyValues').returns(Promise.resolve({
      brands: [{ brand: 'Google Chrome', version: '89' }],
      mobile: false,
      platform: 'Windows',
      architecture: 'x86',
      bitness: '64',
      model: '',
      platformVersion: '10.0',
      wow64: false,
      fullVersionList: [{ brand: 'Google Chrome', version: '89' }]
    }));
    let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    setTimeout(() => {
      expect(callBackSpy.calledOnce).to.be.true;
      navigator.userAgentData.getHighEntropyValues.restore();
      done();
    }, 1000);
  });

  it('should store and read data with cookie storage enabled through getId', function () {
    let callBackSpy = sinon.spy();
    let submoduleCallback = intentIqIdSubmodule.getId(enableCookieConfigParams).callback;
    submoduleCallback(callBackSpy);
    let request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: true })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    // Now check if data is stored correctly in cookies
    const cookieValue = storage.getCookie('_iiq_fdata_' + partner);
    expect(cookieValue).to.not.equal(null);
    expect(JSON.parse(cookieValue).data).to.be.equal('test_personid');
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

  describe('handleGPPData', function () {
    it('should convert array of objects to a single JSON string', function () {
      const input = [
        { key1: 'value1' },
        { key2: 'value2' }
      ];
      const expectedOutput = JSON.stringify({ key1: 'value1', key2: 'value2' });
      const result = handleGPPData(input);
      expect(result).to.equal(expectedOutput);
    });

    it('should convert a single object to a JSON string', function () {
      const input = { key1: 'value1', key2: 'value2' };
      const expectedOutput = JSON.stringify(input);
      const result = handleGPPData(input);
      expect(result).to.equal(expectedOutput);
    });

    it('should handle empty object', function () {
      const input = {};
      const expectedOutput = JSON.stringify(input);
      const result = handleGPPData(input);
      expect(result).to.equal(expectedOutput);
    });

    it('should handle empty array', function () {
      const input = [];
      const expectedOutput = JSON.stringify({});
      const result = handleGPPData(input);
      expect(result).to.equal(expectedOutput);
    });
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

    beforeEach(function () {
      localStorage.clear();
      const expiredDate = new Date(0).toUTCString();
      storage.setCookie(FIRST_PARTY_KEY, '', expiredDate, 'Lax');
      storage.setCookie(FIRST_PARTY_KEY + '_' + partner, '', expiredDate, 'Lax');
      uspDataHandlerStub = sinon.stub(uspDataHandler, 'getConsentData');
      gppDataHandlerStub = sinon.stub(gppDataHandler, 'getConsentData');
    });

    afterEach(function () {
      uspDataHandlerStub.restore();
      gppDataHandlerStub.restore();
    });

    it('should set cmpData.us_privacy if uspData exists', function () {
      const uspData = '1NYN';
      uspDataHandlerStub.returns(uspData);
      let callBackSpy = sinon.spy();
      let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
      submoduleCallback(callBackSpy);
      let request = server.requests[0];
      expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
      request.respond(
        200,
        responseHeader,
        JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: false, isOptedOut: false })
      );
      expect(callBackSpy.calledOnce).to.be.true;

      // Check the local storage directly to see if cmpData.us_privacy was set correctly
      const firstPartyData = JSON.parse(localStorage.getItem(FIRST_PARTY_KEY));
      expect(firstPartyData.uspapi_value).to.equal(uspData);
    });

    it('should set cmpData.gpp and cmpData.gpp_sid if gppData exists and has parsedSections with usnat', function () {
      const gppData = {
        parsedSections: {
          usnat: { key1: 'value1', key2: 'value2' }
        },
        applicableSections: ['usnat']
      };
      gppDataHandlerStub.returns(gppData);

      let callBackSpy = sinon.spy();
      let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
      submoduleCallback(callBackSpy);
      let request = server.requests[0];
      expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
      request.respond(
        200,
        responseHeader,
        JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: false, isOptedOut: false })
      );
      expect(callBackSpy.calledOnce).to.be.true;

      const firstPartyData = JSON.parse(localStorage.getItem(FIRST_PARTY_KEY));
      expect(firstPartyData.gpp_value).to.equal(JSON.stringify({ key1: 'value1', key2: 'value2' }));
    });

    it('should handle gppData without usnat in parsedSections', function () {
      const gppData = {
        parsedSections: {
          euconsent: { key1: 'value1' }
        },
        applicableSections: ['euconsent']
      };
      gppDataHandlerStub.returns(gppData);

      let callBackSpy = sinon.spy();
      let submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
      submoduleCallback(callBackSpy);
      let request = server.requests[0];
      expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
      request.respond(
        200,
        responseHeader,
        JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: false, isOptedOut: true })
      );
      expect(callBackSpy.calledOnce).to.be.true;

      const firstPartyData = JSON.parse(localStorage.getItem(FIRST_PARTY_KEY));
      expect(firstPartyData.gpp_value).to.equal('');
    });
  });

  it('should get and save client hints to storge', async () => {
    // Client hints are async function, thats why async/await is using
    localStorage.clear();
    Object.defineProperty(navigator, 'userAgentData', {
      value: { getHighEntropyValues: async () => testClientHints },
      configurable: true
    });
    await intentIqIdSubmodule.getId(defaultConfigParams);
    const savedClientHints = readData(CLIENT_HINTS_KEY);
    expect(savedClientHints).to.equal(handleClientHints(testClientHints));
  });
});
