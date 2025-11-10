/* eslint-disable promise/param-names */
import { expect } from 'chai';
import * as utils from 'src/utils.js';
import { server } from 'test/mocks/xhr.js';
import {
  intentIqIdSubmodule,
  handleClientHints,
  firstPartyData as moduleFPD,
  isCMPStringTheSame, createPixelUrl, translateMetadata
} from '../../../modules/intentIqIdSystem.js';
import { storage, readData, storeData } from '../../../libraries/intentIqUtils/storageUtils.js';
import { gppDataHandler, uspDataHandler, gdprDataHandler } from '../../../src/consentHandler.js';
import { clearAllCookies } from '../../helpers/cookies.js';
import { detectBrowser, detectBrowserFromUserAgent, detectBrowserFromUserAgentData } from '../../../libraries/intentIqUtils/detectBrowserUtils.js';
import {CLIENT_HINTS_KEY, FIRST_PARTY_KEY, NOT_YET_DEFINED, PREBID, WITH_IIQ, WITHOUT_IIQ} from '../../../libraries/intentIqConstants/intentIqConstants.js';
import { decryptData } from '../../../libraries/intentIqUtils/cryptionUtils.js';
import { isCHSupported } from '../../../libraries/intentIqUtils/chUtils.js';

const partner = 10;
const pai = '11';
const partnerClientId = '12';
const partnerClientIdType = 0;
const sourceMetaData = '1.1.1.1';
const defaultConfigParams = { params: { partner } };
const paiConfigParams = { params: { partner, pai } };
const pcidConfigParams = { params: { partner, partnerClientIdType, partnerClientId } };
const allConfigParams = { params: { partner, pai, partnerClientIdType, partnerClientId, sourceMetaData } };
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

function stubCHDeferred() {
  let resolve, reject;
  const p = new Promise((res, rej) => { resolve = res; reject = rej; });
  const originalUAD = navigator.userAgentData;
  const stub = sinon.stub(navigator, 'userAgentData').value({
    ...originalUAD,
    getHighEntropyValues: () => p
  });
  return { resolve, reject, stub };
}

function stubCHReject(err = new Error('boom')) {
  ensureUAData();
  return sinon.stub(navigator.userAgentData, 'getHighEntropyValues')
    .callsFake(() => Promise.reject(err));
}

function ensureUAData() {
  if (!navigator.userAgentData) {
    Object.defineProperty(navigator, 'userAgentData', { value: {}, configurable: true });
  }
}

async function waitForClientHints() {
  if (!isCHSupported()) return;

  const clock = globalThis.__iiqClock;

  if (clock && typeof clock.runAllAsync === 'function') {
    await clock.runAllAsync();
    return;
  }
  if (clock && typeof clock.runAll === 'function') {
    clock.runAll();
    await Promise.resolve();
    await Promise.resolve();
    return;
  }
  if (clock && typeof clock.runToLast === 'function') {
    clock.runToLast();
    await Promise.resolve();
    return;
  }
  if (clock && typeof clock.tick === 'function') {
    clock.tick(0);
    await Promise.resolve();
    return;
  }

  await Promise.resolve();
  await Promise.resolve();
  await new Promise(r => setTimeout(r, 0));
}

const testAPILink = 'https://new-test-api.intentiq.com'
const syncTestAPILink = 'https://new-test-sync.intentiq.com'
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
  let sandbox;
  let logErrorStub;
  let clock;
  const testLSValue = {
    'date': Date.now(),
    'cttl': 2000,
    'rrtt': 123
  }
  const testLSValueWithData = {
    'date': Date.now(),
    'cttl': 9999999999999,
    'rrtt': 123,
    'data': '81.8.79.67.78.89.8.16.113.81.8.94.79.89.94.8.16.8.89.69.71.79.10.78.75.94.75.8.87.119.87'
  }
  const testResponseWithValues = {
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
    sandbox = sinon.createSandbox();
    logErrorStub = sinon.stub(utils, 'logError');
    clock = sinon.useFakeTimers({ now: Date.now() });
    globalThis.__iiqClock = clock;
  });

  afterEach(async function () {
    await waitForClientHints(); // wait all timers & promises from CH
    try { clock?.restore(); } catch (_) {}
    delete globalThis.__iiqClock;
    sandbox.restore();
    logErrorStub.restore?.();
    clearAllCookies();
    localStorage.clear();
  });

  it('should log an error if no configParams were passed when getId', function () {
    const submodule = intentIqIdSubmodule.getId({ params: {} });
    expect(logErrorStub.calledOnce).to.be.true;
    expect(submodule).to.be.undefined;
  });

  it('should log an error if partner configParam was not passed when getId', function () {
    const submodule = intentIqIdSubmodule.getId({ params: {} });
    expect(logErrorStub.calledOnce).to.be.true;
    expect(submodule).to.be.undefined;
  });

  it('should log an error if partner configParam was not a numeric value', function () {
    const submodule = intentIqIdSubmodule.getId({ params: { partner: '10' } });
    expect(logErrorStub.calledOnce).to.be.true;
    expect(submodule).to.be.undefined;
  });

  it('should not save data in cookie if relevant type not set', async function () {
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()
    const request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: true })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(storage.getCookie('_iiq_fdata_' + partner)).to.equal(null);
  });

  it('should save data in cookie if storage type is "cookie"', async function () {
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId({ ...allConfigParams, enabledStorageTypes: ['cookie'] }).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints();

    const request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pai=11&iiqidtype=2&iiqpcid=');
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

  it('should call the IntentIQ endpoint with only partner', async function () {
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()
    const request = server.requests[0];
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

  it('should send AT=20 request and send source in it', async function () {
    const usedBrowser = 'chrome';
    intentIqIdSubmodule.getId({params: {
      partner: 10,
      browserBlackList: usedBrowser
    }
    });
    const currentBrowserLowerCase = detectBrowser();

    if (currentBrowserLowerCase === usedBrowser) {
      await waitForClientHints()
      const at20request = server.requests[0];
      expect(at20request.url).to.contain(`&source=${PREBID}`);
      expect(at20request.url).to.contain(`at=20`);
    }
  });

  it('should send at=39 request and send source in it', async function () {
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints();
    const request = server.requests[0];

    expect(request.url).to.contain(`&source=${PREBID}`);
  });

  it('should call the IntentIQ endpoint with only partner, pai', async function () {
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(paiConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints();

    const request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should call the IntentIQ endpoint with only partner, pcid', async function () {
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(pcidConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints();

    const request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1');
    expect(request.url).to.contain('&pcid=12');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should call the IntentIQ endpoint with partner, pcid, pai', async function () {
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints();
    const request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pai=11&iiqidtype=2&iiqpcid=');
    expect(request.url).to.contain('&pcid=12');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should set GAM targeting to U initially and update to A after server response', async function () {
    const callBackSpy = sinon.spy();
    const mockGamObject = mockGAM();
    const expectedGamParameterName = 'intent_iq_group';

    const originalPubads = mockGamObject.pubads;
    const setTargetingSpy = sinon.spy();
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

    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;

    submoduleCallback(callBackSpy);
    await waitForClientHints();
    const request = server.requests[0];

    mockGamObject.cmd.forEach(cb => cb());
    mockGamObject.cmd = []

    const groupBeforeResponse = mockGamObject.pubads().getTargeting(expectedGamParameterName);

    request.respond(
      200,
      responseHeader,
      JSON.stringify({ group: 'A', tc: 20 })
    );

    mockGamObject.cmd.forEach(item => item());

    const groupAfterResponse = mockGamObject.pubads().getTargeting(expectedGamParameterName);

    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39');
    expect(groupBeforeResponse).to.deep.equal([NOT_YET_DEFINED]);
    expect(groupAfterResponse).to.deep.equal([WITH_IIQ]);

    expect(setTargetingSpy.calledTwice).to.be.true;
  });

  it('should use the provided gamParameterName from configParams', function () {
    const callBackSpy = sinon.spy();
    const mockGamObject = mockGAM();
    const customParamName = 'custom_gam_param';

    defaultConfigParams.params.gamObjectReference = mockGamObject;
    defaultConfigParams.params.gamParameterName = customParamName;

    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    mockGamObject.cmd.forEach(cb => cb());
    const targetingKeys = mockGamObject.pubads().getTargetingKeys();

    expect(targetingKeys).to.include(customParamName);
  });

  it('should NOT call GAM setTargeting when current browser is in browserBlackList', function () {
    const usedBrowser = 'chrome';
    const gam = mockGAM();
    const pa = gam.pubads();
    sinon.stub(gam, 'pubads').returns(pa);

    const originalSetTargeting = pa.setTargeting;
    let setTargetingCalls = 0;
    pa.setTargeting = function (...args) {
      setTargetingCalls++;
      return originalSetTargeting.apply(this, args);
    };

    localStorage.setItem(FIRST_PARTY_KEY, JSON.stringify({
      pcid: 'pcid-1',
      pcidDate: Date.now(),
      group: 'A',
      isOptedOut: false,
      date: Date.now(),
      sCal: Date.now()
    }));

    const cfg = {
      params: {
        partner,
        gamObjectReference: gam,
        gamParameterName: 'custom_gam_param',
        browserBlackList: usedBrowser
      }
    };

    intentIqIdSubmodule.getId(cfg);
    gam.cmd.forEach(fn => fn());
    const currentBrowserLowerCase = detectBrowser();
    if (currentBrowserLowerCase === usedBrowser) {
      expect(setTargetingCalls).to.equal(0);
      expect(pa.getTargetingKeys()).to.not.include('custom_gam_param');
    }
  });

  it('should not throw Uncaught TypeError when IntentIQ endpoint returns empty response', async function () {
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()
    const request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      204,
      responseHeader,
    );

    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('should log an error and continue to callback if ajax request errors', async function () {
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()
    const request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      503,
      responseHeader,
      'Unavailable'
    );
    expect(callBackSpy.calledOnce).to.be.true;
  });

  it('save result if ls=true', async function () {
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()
    const request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: true })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.deep.equal(['test_personid']);
  });

  it('dont save result if ls=false', async function () {
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()
    const request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pai=11&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: false })
    );
    expect(callBackSpy.calledOnce).to.be.true;
    expect(callBackSpy.args[0][0]).to.deep.equal({eids: []});
  });

  it('send addition parameters if were found in localstorage', async function () {
    localStorage.setItem('_iiq_fdata_' + partner, JSON.stringify(testLSValue))
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()
    const request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&pai=11&iiqidtype=2&iiqpcid=');
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
    const returnedValue = intentIqIdSubmodule.getId(allConfigParams);
    expect(returnedValue.id).to.deep.equal(JSON.parse(decryptData(testLSValueWithData.data)).eids);
  });

  it('should handle browser blacklisting', function () {
    const configParamsWithBlacklist = {
      params: { partner: partner, browserBlackList: 'chrome' }
    };
    sinon.stub(navigator, 'userAgent').value('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    const submoduleCallback = intentIqIdSubmodule.getId(configParamsWithBlacklist);
    expect(logErrorStub.calledOnce).to.be.true;
    expect(submoduleCallback).to.be.undefined;
  });

  it('should handle invalid JSON in readData', async function () {
    localStorage.setItem('_iiq_fdata_' + partner, 'invalid_json');
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints();
    const request = server.requests[0];
    expect(request.url).to.contain('https://api.intentiq.com/profiles_engine/ProfilesEngineServlet?at=39&mi=10&dpi=10&pt=17&dpn=1&iiqidtype=2&iiqpcid=');
    request.respond(
      200,
      responseHeader,
      JSON.stringify({})
    );

    expect(callBackSpy.calledOnce).to.be.true;
    expect(logErrorStub.called).to.be.true;
  });

  it('should send AT=20 request and send spd in it', async function () {
    const spdValue = { foo: 'bar', value: 42 };
    const encodedSpd = encodeURIComponent(JSON.stringify(spdValue));
    localStorage.setItem(FIRST_PARTY_KEY, JSON.stringify({pcid: '123', spd: spdValue}));

    intentIqIdSubmodule.getId({params: {
      partner: 10,
      browserBlackList: 'chrome'
    }
    });

    await waitForClientHints();

    const at20request = server.requests[0];
    expect(at20request.url).to.contain(`&spd=${encodedSpd}`);
    expect(at20request.url).to.contain(`at=20`);
  });

  it('should send AT=20 request and send spd string in it ', async function () {
    const spdValue = 'server provided data';
    const encodedSpd = encodeURIComponent(spdValue);
    localStorage.setItem(FIRST_PARTY_KEY, JSON.stringify({pcid: '123', spd: spdValue}));

    intentIqIdSubmodule.getId({params: {
      partner: 10,
      browserBlackList: 'chrome'
    }
    });

    await waitForClientHints();

    const at20request = server.requests[0];
    expect(at20request.url).to.contain(`&spd=${encodedSpd}`);
    expect(at20request.url).to.contain(`at=20`);
  });

  it('should send spd from firstPartyData in localStorage in at=39 request', async function () {
    const spdValue = { foo: 'bar', value: 42 };
    const encodedSpd = encodeURIComponent(JSON.stringify(spdValue));

    localStorage.setItem(FIRST_PARTY_KEY, JSON.stringify({ pcid: '123', spd: spdValue }));

    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;

    submoduleCallback(callBackSpy);
    await waitForClientHints();
    const request = server.requests[0];

    expect(request.url).to.contain(`&spd=${encodedSpd}`);
    expect(request.url).to.contain(`at=39`);
  });

  it('should send spd string from firstPartyData in localStorage in at=39 request', async function () {
    const spdValue = 'spd string';
    const encodedSpd = encodeURIComponent(spdValue);
    localStorage.setItem(FIRST_PARTY_KEY, JSON.stringify({ pcid: '123', spd: spdValue }));

    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints();
    const request = server.requests[0];

    expect(request.url).to.contain(`&spd=${encodedSpd}`);
    expect(request.url).to.contain(`at=39`);
  });

  it('should save spd to firstPartyData in localStorage if present in response', async function () {
    const spdValue = { foo: 'bar', value: 42 };
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints();
    const request = server.requests[0];

    request.respond(
      200,
      responseHeader,
      JSON.stringify({ pid: 'test_pid', data: 'test_personid', ls: true, spd: spdValue })
    );

    const storedLs = readData(FIRST_PARTY_KEY, ['html5', 'cookie'], storage);
    const parsedLs = JSON.parse(storedLs);

    expect(storedLs).to.not.be.null;
    expect(callBackSpy.calledOnce).to.be.true;
    expect(parsedLs).to.have.property('spd');
    expect(parsedLs.spd).to.deep.equal(spdValue);
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

    it("Should call the server for new partner if FPD has been updated by other partner, and 24 hours have not yet passed.", async () => {
      const allowedStorage = ['html5']
      const newPartnerId = 12345
      const FPD = {
        pcid: 'c869aa1f-fe40-47cb-810f-4381fec28fc9',
        pcidDate: 1747720820757,
        group: 'A',
        sCal: Date.now(),
        gdprString: null,
        gppString: null,
        uspString: null
      };

      storeData(FIRST_PARTY_KEY, JSON.stringify(FPD), allowedStorage, storage)
      const callBackSpy = sinon.spy()
      const submoduleCallback = intentIqIdSubmodule.getId({...allConfigParams, params: {...allConfigParams.params, partner: newPartnerId}}).callback;
      submoduleCallback(callBackSpy);
      await waitForClientHints();
      const request = server.requests[0];
      expect(request.url).contain("ProfilesEngineServlet?at=39") // server was called
    })
    it("Should NOT call the server if FPD has been updated user Opted Out, and 24 hours have not yet passed.", async () => {
      const allowedStorage = ['html5']
      const newPartnerId = 12345
      const FPD = {
        pcid: 'c869aa1f-fe40-47cb-810f-4381fec28fc9',
        pcidDate: 1747720820757,
        group: 'A',
        isOptedOut: true,
        sCal: Date.now(),
        gdprString: null,
        gppString: null,
        uspString: null
      };

      storeData(FIRST_PARTY_KEY, JSON.stringify(FPD), allowedStorage, storage)
      const returnedObject = intentIqIdSubmodule.getId({...allConfigParams, params: {...allConfigParams.params, partner: newPartnerId}});
      await waitForClientHints();
      expect(returnedObject.callback).to.be.undefined
      expect(server.requests.length).to.equal(0) // no server requests
    })
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

    it('should set isOptOut to true for new users if GDPR is detected and update it upon receiving a server response', async function () {
      localStorage.clear();
      mockConsentHandlers(uspData, gppData, gdprData);
      const callBackSpy = sinon.spy();
      const submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
      submoduleCallback(callBackSpy);
      await waitForClientHints();

      const lsBeforeReq = JSON.parse(localStorage.getItem(FIRST_PARTY_KEY));

      const request = server.requests[0];
      request.respond(
        200,
        responseHeader,
        JSON.stringify({ isOptedOut: false })
      );

      const updatedFirstPartyData = JSON.parse(localStorage.getItem(FIRST_PARTY_KEY));

      expect(lsBeforeReq).to.not.be.null;
      expect(lsBeforeReq.isOptedOut).to.be.true;
      expect(callBackSpy.calledOnce).to.be.true;
      expect(updatedFirstPartyData).to.not.be.undefined;
      expect(updatedFirstPartyData.isOptedOut).to.equal(false);
    });

    it('should save cmpData parameters in LS data and used it request if uspData, gppData, gdprData exists', async function () {
      mockConsentHandlers(uspData, gppData, gdprData);

      const callBackSpy = sinon.spy();
      const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
      const data = {eids: {key1: 'value1', key2: 'value2'}}

      submoduleCallback(callBackSpy);
      await waitForClientHints();
      const request = server.requests[0];
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

    it('should clear localStorage, update runtimeEids and trigger callback with empty data if isOptedOut is true in response', async function () {
      // Save some data to localStorage for FPD and CLIENT_HINTS
      const FIRST_PARTY_DATA_KEY = FIRST_PARTY_KEY + '_' + partner;
      localStorage.setItem(FIRST_PARTY_DATA_KEY, JSON.stringify({terminationCause: 35, some_key: 'someValue'}));
      localStorage.setItem(CLIENT_HINTS_KEY, JSON.stringify({ hint: 'someClientHintData' }));

      mockConsentHandlers(uspData, gppData, gdprData);

      const callBackSpy = sinon.spy();
      const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;

      submoduleCallback(callBackSpy);
      await waitForClientHints();

      const request = server.requests[0];
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

    it('should make request to correct address api-gdpr.intentiq.com if gdpr is detected', async function() {
      const ENDPOINT_GDPR = 'https://api-gdpr.intentiq.com';
      mockConsentHandlers(uspData, gppData, gdprData);
      const callBackSpy = sinon.spy();
      const submoduleCallback = intentIqIdSubmodule.getId({...defaultConfigParams}).callback;

      submoduleCallback(callBackSpy);
      await waitForClientHints();
      const request = server.requests[0];

      expect(request.url).to.contain(ENDPOINT_GDPR);
    });

    it('should make request to correct address with iiqServerAddress parameter', async function() {
      defaultConfigParams.params.iiqServerAddress = testAPILink
      const callBackSpy = sinon.spy();
      const submoduleCallback = intentIqIdSubmodule.getId({...defaultConfigParams}).callback;

      submoduleCallback(callBackSpy);
      await waitForClientHints();
      const request = server.requests[0];

      expect(request.url).to.contain(testAPILink);
    });

    it('should make request to correct address with iiqPixelServerAddress parameter', async function() {
      let wasCallbackCalled = false
      const callbackConfigParams = { params: { partner: partner,
        pai,
        partnerClientIdType,
        partnerClientId,
        browserBlackList: 'Chrome',
        iiqPixelServerAddress: syncTestAPILink,
        callback: () => {
          wasCallbackCalled = true
        } } };

      intentIqIdSubmodule.getId({...callbackConfigParams});
      await waitForClientHints();

      const request = server.requests[0];
      expect(request.url).to.contain(syncTestAPILink);
    });
  });

  it('should get and save client hints to storage', async () => {
    localStorage.clear();
    Object.defineProperty(navigator, 'userAgentData', {
      value: { getHighEntropyValues: async () => testClientHints },
      configurable: true
    });
    intentIqIdSubmodule.getId(defaultConfigParams);
    await waitForClientHints();

    const savedClientHints = readData(CLIENT_HINTS_KEY, ['html5'], storage);
    const expectedClientHints = handleClientHints(testClientHints);
    expect(savedClientHints).to.equal(expectedClientHints);
  });

  it('should add clientHints to the URL if provided', function () {
    const firstPartyData = {};
    const clientHints = 'exampleClientHints';
    const configParams = { partner: 'testPartner', domainName: 'example.com' };
    const partnerData = {};
    const cmpData = {};
    const url = createPixelUrl(firstPartyData, clientHints, configParams, partnerData, cmpData);

    expect(url).to.include(`&uh=${encodeURIComponent(clientHints)}`);
  });

  it('should not add clientHints to the URL if not provided', function () {
    const firstPartyData = {};
    const configParams = { partner: 'testPartner', domainName: 'example.com' };
    const partnerData = {};
    const cmpData = {};
    const url = createPixelUrl(firstPartyData, undefined, configParams, partnerData, cmpData);

    expect(url).to.not.include('&uh=');
  });

  it('should sends uh from LS immediately and later updates LS with fresh CH', async () => {
    localStorage.setItem(CLIENT_HINTS_KEY, 'OLD_CH_VALUE');
    const callBackSpy = sinon.spy();
    const { resolve, stub } = stubCHDeferred(); // Defer CH-API resolution

    const cfg = { params: { ...defaultConfigParams.params, chTimeout: 300 } };
    const submoduleCallback = intentIqIdSubmodule.getId(cfg).callback;
    submoduleCallback(callBackSpy);

    // First network call must use CH from LS immediately
    const firstReq = server.requests[0];
    expect(firstReq).to.exist;
    expect(firstReq.url).to.include('&uh=OLD_CH_VALUE');
    expect(server.requests.length).to.equal(1); // only one request sent

    // deliver fresh CH from the browser
    resolve(testClientHints);
    await waitForClientHints();

    // LS must be updated; no extra network calls
    const expectedFresh = handleClientHints(testClientHints);
    expect(readData(CLIENT_HINTS_KEY, ['html5'], storage)).to.equal(expectedFresh);
    expect(server.requests.length).to.equal(1);

    stub.restore();
  });

  it('should use cached uh immediately and clears LS on CH error (API supported)', async () => {
    const callBackSpy = sinon.spy();
    localStorage.setItem(CLIENT_HINTS_KEY, 'OLD_CH_VALUE');
    const chStub = stubCHReject(new Error('boom')); // CH API rejects
    const cfg = { params: { ...defaultConfigParams.params, chTimeout: 200 } };
    const submoduleCallback = intentIqIdSubmodule.getId(cfg).callback;
    submoduleCallback(callBackSpy);

    // first request with uh from LS
    const req = server.requests[0];
    expect(req).to.exist;
    expect(req.url).to.include('&uh=OLD_CH_VALUE');
    expect(server.requests.length).to.equal(1);

    await waitForClientHints();

    const saved = readData(CLIENT_HINTS_KEY, ['html5'], storage);
    expect(saved === '' || saved === null).to.be.true;
    expect(server.requests.length).to.equal(1);

    chStub.restore();
  });

  it('should clear CLIENT_HINTS from LS and NOT send uh when CH are not supported', async function () {
    localStorage.setItem(CLIENT_HINTS_KEY, 'OLD_CH_VALUE');
    const uadStub = sinon.stub(navigator, 'userAgentData').value(undefined); // no CH-API
    const cbSpy = sinon.spy();
    const cfg = { params: { ...defaultConfigParams.params, chTimeout: 0 } };

    intentIqIdSubmodule.getId(cfg).callback(cbSpy);
    await waitForClientHints();

    const req = server.requests[0];
    const saved = readData(CLIENT_HINTS_KEY, ['html5'], storage);

    expect(req).to.exist;
    expect(req.url).to.not.include('&uh=');
    expect(saved === '' || saved === null).to.be.true;

    uadStub.restore();
  });

  it('blacklist: should use uh from LS immediately and updates LS when CH resolves', async () => {
    localStorage.setItem(CLIENT_HINTS_KEY, 'OLD_CH_VALUE');
    const { resolve, stub } = stubCHDeferred(); // getHighEntropyValues returns pending promise
    const blk = detectBrowser();
    const cfg = { params: { ...defaultConfigParams.params, browserBlackList: blk, chTimeout: 50 } };

    intentIqIdSubmodule.getId(cfg);

    const firstReq = server.requests[0];
    expect(firstReq).to.exist;
    expect(firstReq.url).to.include('at=20');
    expect(firstReq.url).to.include('&uh=OLD_CH_VALUE');
    expect(server.requests.length).to.equal(1);

    // Now deliver fresh CH from browser and wait for background handlers
    resolve(testClientHints);
    await waitForClientHints();

    // LS updated, network not re-fired
    const expectedFresh = handleClientHints(testClientHints);
    expect(readData(CLIENT_HINTS_KEY, ['html5'], storage)).to.equal(expectedFresh);
    expect(server.requests.length).to.equal(1);

    stub.restore();
  });

  it('blacklist: should send sync with uh when CH supported and ready', async () => {
    localStorage.removeItem(CLIENT_HINTS_KEY);
    const expectedCH = handleClientHints(testClientHints);

    let uadStub = sinon.stub(navigator, 'userAgentData').value({
      getHighEntropyValues: async () => testClientHints
    });

    const blk = detectBrowser();
    const cfg = {
      params: {
        ...defaultConfigParams.params,
        browserBlackList: blk,
        chTimeout: 300
      }
    };

    intentIqIdSubmodule.getId(cfg);
    await waitForClientHints();

    const req = server.requests[0];
    expect(req).to.exist;
    expect(req.url).to.include('at=20');
    expect(req.url).to.include(`&uh=${encodeURIComponent(expectedCH)}`);
    expect(readData(CLIENT_HINTS_KEY, ['html5'], storage)).to.equal(expectedCH);

    uadStub.restore();
  });

  it('blacklist: sends sync with uh when CH supported and ready', async () => {
    const expectedCH = handleClientHints(testClientHints);
    Object.defineProperty(navigator, 'userAgentData', {
      value: { getHighEntropyValues: async () => testClientHints },
      configurable: true
    });
    const blk = detectBrowser();
    const cfg = {
      params: {
        ...defaultConfigParams.params,
        browserBlackList: blk,
        chTimeout: 300
      }
    };

    intentIqIdSubmodule.getId(cfg);
    await waitForClientHints();

    const req = server.requests[0];
    expect(req).to.exist;
    expect(req.url).to.include('at=20');
    expect(req.url).to.include(`&uh=${encodeURIComponent(expectedCH)}`);
    expect(readData(CLIENT_HINTS_KEY, ['html5'], storage)).to.equal(expectedCH);
  });

  it('should return true if CMP strings are the same', function () {
    const fpData = { gdprString: '123', gppString: '456', uspString: '789' };
    const cmpData = { gdprString: '123', gppString: '456', uspString: '789' };

    expect(isCMPStringTheSame(fpData, cmpData)).to.be.true;
  });

  it('should return false if gdprString is different', function () {
    const fpData = { gdprString: '123', gppString: '456', uspString: '789' };
    const cmpData = { gdprString: '321', gppString: '456', uspString: '789' };

    expect(isCMPStringTheSame(fpData, cmpData)).to.be.false;
  });

  it('should return false if gppString is different', function () {
    const fpData = { gdprString: '123', gppString: '456', uspString: '789' };
    const cmpData = { gdprString: '123', gppString: '654', uspString: '789' };

    expect(isCMPStringTheSame(fpData, cmpData)).to.be.false;
  });

  it('should return false if uspString is different', function () {
    const fpData = { gdprString: '123', gppString: '456', uspString: '789' };
    const cmpData = { gdprString: '123', gppString: '456', uspString: '987' };

    expect(isCMPStringTheSame(fpData, cmpData)).to.be.false;
  });

  it('should return false if one of the properties is missing in fpData', function () {
    const fpData = { gdprString: '123', gppString: '456' };
    const cmpData = { gdprString: '123', gppString: '456', uspString: '789' };

    expect(isCMPStringTheSame(fpData, cmpData)).to.be.false;
  });

  it('should return false if one of the properties is missing in cmpData', function () {
    const fpData = { gdprString: '123', gppString: '456', uspString: '789' };
    const cmpData = { gdprString: '123', gppString: '456' };

    expect(isCMPStringTheSame(fpData, cmpData)).to.be.false;
  });

  it('should return true if both objects are empty', function () {
    const fpData = {};
    const cmpData = {};

    expect(isCMPStringTheSame(fpData, cmpData)).to.be.true;
  });

  it('should return false if one object is empty and another is not', function () {
    const fpData = {};
    const cmpData = { gdprString: '123', gppString: '456', uspString: '789' };

    expect(isCMPStringTheSame(fpData, cmpData)).to.be.false;
  });

  it('should run callback from params', async () => {
    let wasCallbackCalled = false
    const callbackConfigParams = { params: { partner: partner,
      pai,
      partnerClientIdType,
      partnerClientId,
      browserBlackList: 'Chrome',
      callback: () => {
        wasCallbackCalled = true
      } } };

    await intentIqIdSubmodule.getId(callbackConfigParams);
    expect(wasCallbackCalled).to.equal(true);
  });

  it('should send sourceMetaData in AT=39 if it exists in configParams', async function () {
    const translatedMetaDataValue = translateMetadata(sourceMetaData)
    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(allConfigParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()

    const request = server.requests[0];

    expect(request.url).to.include('?at=39')
    expect(request.url).to.include(`fbp=${translatedMetaDataValue}`)
  });

  it('should NOT send sourceMetaData and sourceMetaDataExternal in AT=39 if it is undefined', async function () {
    const callBackSpy = sinon.spy();
    const configParams = { params: {...allConfigParams.params, sourceMetaData: undefined} };
    const submoduleCallback = intentIqIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()

    const request = server.requests[0];

    expect(request.url).to.include('?at=39')
    expect(request.url).not.to.include('fbp=')
  });

  it('should NOT send sourceMetaData in AT=39 if value is NAN', async function () {
    const callBackSpy = sinon.spy();
    const configParams = { params: {...allConfigParams.params, sourceMetaData: NaN} };
    const submoduleCallback = intentIqIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()
    const request = server.requests[0];

    expect(request.url).to.include('?at=39')
    expect(request.url).not.to.include('fbp=')
  });

  it('should send sourceMetaData in AT=20 if it exists in configParams', async function () {
    const translatedMetaDataValue = translateMetadata(sourceMetaData)
    const configParams = { params: {...allConfigParams.params, browserBlackList: 'chrome'} };

    intentIqIdSubmodule.getId(configParams);
    await waitForClientHints()
    const request = server.requests[0];

    expect(request.url).to.include('?at=20');
    expect(request.url).to.include(`fbp=${translatedMetaDataValue}`)
  });

  it('should NOT send sourceMetaData in AT=20 if value is NAN', async function () {
    const configParams = { params: {...allConfigParams.params, sourceMetaData: NaN, browserBlackList: 'chrome'} };

    intentIqIdSubmodule.getId(configParams);
    await waitForClientHints()
    const request = server.requests[0];

    expect(request.url).to.include('?at=20');
    expect(request.url).to.not.include('&fbp=');
  });

  it('should send pcid and idtype in AT=20 if it provided in config', async function () {
    const partnerClientId = 'partnerClientId 123';
    const partnerClientIdType = 0;
    const configParams = { params: {...allConfigParams.params, browserBlackList: 'chrome', partnerClientId, partnerClientIdType} };

    intentIqIdSubmodule.getId(configParams);
    await waitForClientHints()
    const request = server.requests[0];

    expect(request.url).to.include('?at=20');
    expect(request.url).to.include(`&pcid=${encodeURIComponent(partnerClientId)}`);
    expect(request.url).to.include(`&idtype=${partnerClientIdType}`);
  });

  it('should NOT send pcid and idtype in AT=20 if partnerClientId is NOT a string', async function () {
    const partnerClientId = 123;
    const partnerClientIdType = 0;
    const configParams = { params: {...allConfigParams.params, browserBlackList: 'chrome', partnerClientId, partnerClientIdType} };

    intentIqIdSubmodule.getId(configParams);
    await waitForClientHints()
    const request = server.requests[0];

    expect(request.url).to.include('?at=20');
    expect(request.url).not.to.include(`&pcid=`);
    expect(request.url).not.to.include(`&idtype=`);
  });

  it('should NOT send pcid and idtype in AT=20 if partnerClientIdType is NOT a number', async function () {
    const partnerClientId = 'partnerClientId 123';
    const partnerClientIdType = 'wrong';
    const configParams = { params: {...allConfigParams.params, browserBlackList: 'chrome', partnerClientId, partnerClientIdType} };

    intentIqIdSubmodule.getId(configParams);
    await waitForClientHints()
    const request = server.requests[0];

    expect(request.url).to.include('?at=20');
    expect(request.url).not.to.include(`&pcid=`);
    expect(request.url).not.to.include(`&idtype=`);
  });

  it('should send partnerClientId and partnerClientIdType in AT=39 if it provided in config', async function () {
    const partnerClientId = 'partnerClientId 123';
    const partnerClientIdType = 0;
    const callBackSpy = sinon.spy();
    const configParams = { params: {...allConfigParams.params, partnerClientId, partnerClientIdType} };
    const submoduleCallback = intentIqIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()

    const request = server.requests[0];

    expect(request.url).to.include('?at=39')
    expect(request.url).to.include(`&pcid=${encodeURIComponent(partnerClientId)}`);
    expect(request.url).to.include(`&idtype=${partnerClientIdType}`);
  });

  it('should NOT send partnerClientId and partnerClientIdType in AT=39 if partnerClientId is not a string', async function () {
    const partnerClientId = 123;
    const partnerClientIdType = 0;
    const callBackSpy = sinon.spy();
    const configParams = { params: {...allConfigParams.params, partnerClientId, partnerClientIdType} };
    const submoduleCallback = intentIqIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()

    const request = server.requests[0];

    expect(request.url).to.include('?at=39')
    expect(request.url).not.to.include(`&pcid=${partnerClientId}`);
    expect(request.url).not.to.include(`&idtype=${partnerClientIdType}`);
  });

  it('should NOT send partnerClientId and partnerClientIdType in AT=39 if partnerClientIdType is not a number', async function () {
    const partnerClientId = 'partnerClientId-123';
    const partnerClientIdType = 'wrong';
    const callBackSpy = sinon.spy();
    const configParams = { params: {...allConfigParams.params, partnerClientId, partnerClientIdType} };
    const submoduleCallback = intentIqIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()

    const request = server.requests[0];

    expect(request.url).to.include('?at=39')
    expect(request.url).not.to.include(`&pcid=${partnerClientId}`);
    expect(request.url).not.to.include(`&idtype=${partnerClientIdType}`);
  });

  it('should NOT send sourceMetaData in AT=20 if sourceMetaDataExternal provided', async function () {
    const configParams = { params: {...allConfigParams.params, browserBlackList: 'chrome', sourceMetaDataExternal: 123} };

    intentIqIdSubmodule.getId(configParams);
    await waitForClientHints()
    const request = server.requests[0];

    expect(request.url).to.include('?at=20');
    expect(request.url).to.include('&fbp=123');
  });

  it('should store first party data under the silo key when siloEnabled is true', async function () {
    const configParams = { params: {...allConfigParams.params, siloEnabled: true} };

    intentIqIdSubmodule.getId(configParams);
    await waitForClientHints()
    const expectedKey = FIRST_PARTY_KEY + '_p_' + configParams.params.partner;
    const storedData = localStorage.getItem(expectedKey);
    const parsed = JSON.parse(storedData);

    expect(storedData).to.be.a('string');
    expect(localStorage.getItem(FIRST_PARTY_KEY)).to.be.null;
    expect(parsed).to.have.property('pcid');
  });

  it('should send siloEnabled value in the request', async function () {
    const callBackSpy = sinon.spy();
    const configParams = { params: {...allConfigParams.params, siloEnabled: true} };
    const submoduleCallback = intentIqIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()

    const request = server.requests[0];

    expect(request.url).to.contain(`&japs=${configParams.params.siloEnabled}`);
  });

  it('should increment callCount when valid eids are returned', async function () {
    const firstPartyDataKey = '_iiq_fdata_' + partner;
    const partnerData = { callCount: 0, failCount: 0, noDataCounter: 0 };
    localStorage.setItem(firstPartyDataKey, JSON.stringify(partnerData));
    localStorage.setItem(FIRST_PARTY_KEY, JSON.stringify({ pcid: 'abc', cttl: 9999999, group: 'with_iiq' }));

    const responseData = { data: { eids: ['abc'] }, ls: true };

    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    const callBackSpy = sinon.spy();
    submoduleCallback(callBackSpy);
    await waitForClientHints()

    const request = server.requests[0];
    request.respond(200, responseHeader, JSON.stringify(responseData));

    const updatedData = JSON.parse(localStorage.getItem(firstPartyDataKey));
    expect(updatedData.callCount).to.equal(1);
  });

  it('should increment failCount when request fails', async function () {
    const firstPartyDataKey = '_iiq_fdata_' + partner;
    const partnerData = { callCount: 0, failCount: 0, noDataCounter: 0 };
    localStorage.setItem(firstPartyDataKey, JSON.stringify(partnerData));
    localStorage.setItem(FIRST_PARTY_KEY, JSON.stringify({ pcid: 'abc', cttl: 9999999, group: 'with_iiq' }));

    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    const callBackSpy = sinon.spy();
    submoduleCallback(callBackSpy);
    await waitForClientHints()

    const request = server.requests[0];
    request.respond(503, responseHeader, 'Service Unavailable');

    const updatedData = JSON.parse(localStorage.getItem(firstPartyDataKey));
    expect(updatedData.failCount).to.equal(1);
  });

  it('should increment noDataCounter when eids are empty', async function () {
    const firstPartyDataKey = '_iiq_fdata_' + partner;
    const partnerData = { callCount: 0, failCount: 0, noDataCounter: 0 };
    localStorage.setItem(firstPartyDataKey, JSON.stringify(partnerData));
    localStorage.setItem(FIRST_PARTY_KEY, JSON.stringify({ pcid: 'abc', cttl: 9999999, group: 'with_iiq' }));

    const responseData = { data: { eids: [] }, ls: true };

    const submoduleCallback = intentIqIdSubmodule.getId(defaultConfigParams).callback;
    const callBackSpy = sinon.spy();
    submoduleCallback(callBackSpy);
    await waitForClientHints()

    const request = server.requests[0];
    request.respond(200, responseHeader, JSON.stringify(responseData));

    const updatedData = JSON.parse(localStorage.getItem(firstPartyDataKey));
    expect(updatedData.noDataCounter).to.equal(1);
  });

  it('should send additional parameters in sync request due to configuration', async function () {
    const configParams = {
      params: {
        ...defaultConfigParams.params,
        browserBlackList: 'chrome',
        additionalParams: [{
          parameterName: 'general',
          parameterValue: 'Lee',
          destination: [1, 0, 0]
        }]
      }
    };

    intentIqIdSubmodule.getId(configParams);
    await waitForClientHints()
    const syncRequest = server.requests[0];

    expect(syncRequest.url).to.include('general=Lee');
  });
  it('should send additionalParams in VR request', async function () {
    const configParams = {
      params: {
        ...defaultConfigParams.params,
        additionalParams: [{
          parameterName: 'general',
          parameterValue: 'Lee',
          destination: [0, 1, 0]
        }]
      }
    };

    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()
    const vrRequest = server.requests[0];

    expect(vrRequest.url).to.include('general=Lee');
  });

  it('should not send additionalParams in case it is not an array', async function () {
    const configParams = {
      params: {
        ...defaultConfigParams.params,
        additionalParams: {
          parameterName: 'general',
          parameterValue: 'Lee',
          destination: [0, 1, 0]
        }
      }
    };

    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()
    const vrRequest = server.requests[0];

    expect(vrRequest.url).not.to.include('general=');
  });

  it('should not send additionalParams in case request url is too long', async function () {
    const longValue = 'x'.repeat(5000000); // simulate long parameter
    const configParams = {
      params: {
        ...defaultConfigParams.params,
        additionalParams: [{
          parameterName: 'general',
          parameterValue: longValue,
          destination: [0, 1, 0]
        }]
      }
    };

    const callBackSpy = sinon.spy();
    const submoduleCallback = intentIqIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()
    const vrRequest = server.requests[0];

    expect(vrRequest.url).not.to.include('general=');
  });

  it('should call groupChanged with "withoutIIQ" when terminationCause is 41', async function () {
    const groupChangedSpy = sinon.spy();
    const callBackSpy = sinon.spy();
    const configParams = {
      params: {
        ...defaultConfigParams.params,
        groupChanged: groupChangedSpy
      }
    };

    const submoduleCallback = intentIqIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()

    const request = server.requests[0];
    request.respond(
      200,
      responseHeader,
      JSON.stringify({
        tc: 41,
        isOptedOut: false,
        data: { eids: [] }
      })
    );

    expect(callBackSpy.calledOnce).to.be.true;
    expect(groupChangedSpy.calledWith(WITHOUT_IIQ)).to.be.true;
  });

  it('should call groupChanged with "withIIQ" when terminationCause is NOT 41', async function () {
    const groupChangedSpy = sinon.spy();
    const callBackSpy = sinon.spy();
    const configParams = {
      params: {
        ...defaultConfigParams.params,
        groupChanged: groupChangedSpy
      }
    };

    const submoduleCallback = intentIqIdSubmodule.getId(configParams).callback;
    submoduleCallback(callBackSpy);
    await waitForClientHints()

    const request = server.requests[0];
    request.respond(
      200,
      responseHeader,
      JSON.stringify({
        tc: 35,
        isOptedOut: false,
        data: { eids: [] }
      })
    );

    expect(callBackSpy.calledOnce).to.be.true;
    expect(groupChangedSpy.calledWith(WITH_IIQ)).to.be.true;
  });
});
