import { expect } from 'chai';
import { MODULE_TYPE_RTD } from 'src/activities/modules.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';
import { server } from 'test/mocks/xhr.js';

import { nodalsAiRtdSubmodule } from 'modules/nodalsAiRtdProvider.js';

const jsonResponseHeaders = {
  'Content-Type': 'application/json',
};

const overrideLocalStorageKey = '_foobarbaz_';

const successPubEndpointResponse = {
  deps: {
    '1.0.0': 'https://static.nodals.io/sdk/rule/1.0.0/engine.js',
    '1.1.0': 'https://static.nodals.io/sdk/rule/1.1.0/engine.js',
  },
  facts: {
    'browser.name': 'safari',
    'geo.country': 'AR',
  },
  campaigns: [
    {
      id: '41ffa965',
      ads: [
        {
          delivery_id: '1234',
          property_id: 'fd32da',
          weighting: 1,
          kvs: [
            {
              key: 'nodals',
              value: '1',
            },
          ],
          rules: {
            engine: {
              version: '1.0.0',
            },
            conditions: {
              ANY: [
                {
                  fact: 'id',
                  op: 'allin',
                  val: ['1', '2', '3'],
                },
              ],
              NONE: [
                {
                  fact: 'ua.browser',
                  op: 'eq',
                  val: 'opera',
                },
              ],
            },
          },
        },
      ],
    },
  ],
};

const engineGetTargetingDataReturnValue = {
  adUnit1: {
    adv1: 'foobarbaz',
  },
};

const generateGdprConsent = (consent = {}) => {
  const defaults = {
    gdprApplies: true,
    purpose1Consent: true,
    purpose7Consent: true,
    nodalsConsent: true,
  };
  const mergedConsent = { ...defaults, ...consent };
  return JSON.parse(JSON.stringify({
    gdpr: {
      gdprApplies: mergedConsent.gdprApplies,
      consentString: mergedConsent.consentString,
      vendorData: {
        purpose: {
          consents: {
            1: mergedConsent.purpose1Consent,
            2: true,
            3: true,
            4: true,
            5: true,
            6: true,
            7: mergedConsent.purpose7Consent,
            8: true,
            9: true,
            10: true,
          },
        },
        specialFeatureOptins: {
          1: true,
        },
        vendor: {
          consents: {
            1360: mergedConsent.nodalsConsent,
          },
        },
      },
    },
  }));
};

const setDataInLocalStorage = (data) => {
  const storageData = { ...data };
  nodalsAiRtdSubmodule.storage.setDataInLocalStorage(
    nodalsAiRtdSubmodule.STORAGE_KEY,
    JSON.stringify(storageData),
  );
};

const createTargetingEngineStub = (getTargetingDataReturnValue = {}, raiseError = false) => {
  const version = '1.x.x';
  const initStub = sinon.stub();
  const getTargetingDataStub = sinon.stub();
  const getBidRequestDataStub = sinon.stub();
  const onBidResponseEventStub = sinon.stub();
  const onAuctionEndEventStub = sinon.stub();
  if (raiseError) {
    getTargetingDataStub.throws(new Error('Stubbed error'));
  } else {
    getTargetingDataStub.returns(getTargetingDataReturnValue);
  }
  window.$nodals = window.$nodals || {};
  window.$nodals.adTargetingEngine = window.$nodals.adTargetingEngine || {};
  window.$nodals.adTargetingEngine[version] = {
    init: initStub,
    getTargetingData: getTargetingDataStub,
    getBidRequestData: getBidRequestDataStub,
    onBidResponseEvent: onBidResponseEventStub,
    onAuctionEndEvent: onAuctionEndEventStub,
  };
  return window.$nodals.adTargetingEngine[version];
};

describe('NodalsAI RTD Provider', () => {
  let sandbox;
  let validConfig;
  const permissiveUserConsent = generateGdprConsent();
  const vendorRestrictiveUserConsent = generateGdprConsent({ nodalsConsent: false });
  const noPurpose1UserConsent = generateGdprConsent({ purpose1Consent: false });
  const noPurpose7UserConsent = generateGdprConsent({ purpose7Consent: false });
  const outsideGdprUserConsent = generateGdprConsent({ gdprApplies: false });
  const leastPermissiveUserConsent = generateGdprConsent({ purpose1Consent: false, purpose7Consent: false, nodalsConsent: false });

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    validConfig = { params: { propertyId: '10312dd2' } };

    server.respondWith([
      200,
      jsonResponseHeaders,
      JSON.stringify(successPubEndpointResponse)
    ]);
  });

  afterEach(() => {
    if (window.$nodals) {
      delete window.$nodals;
    }

    nodalsAiRtdSubmodule.storage.removeDataFromLocalStorage(
      nodalsAiRtdSubmodule.STORAGE_KEY
    );
    nodalsAiRtdSubmodule.storage.removeDataFromLocalStorage(
      overrideLocalStorageKey
    );

    sandbox.restore();
  });

  describe('Module properties', () => {
    it('should have the name property set correctly', function () {
      expect(nodalsAiRtdSubmodule.name).equals('nodalsAi');
    });

    it('should expose the correct TCF Global Vendor ID', function () {
      expect(nodalsAiRtdSubmodule.gvlid).equals(1360);
    });
  });

  describe('init()', () => {
    describe('when initialised with empty consent data', () => {
      it('should return true when initialised with valid config and empty user consent', function () {
        const result = nodalsAiRtdSubmodule.init(validConfig, {});
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it('should return true when initialised with valid config and gdpr consent is null', function () {
        const result = nodalsAiRtdSubmodule.init(validConfig, {gdpr: null});
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it('should return false when initialised with invalid config', () => {
        const config = { params: { invalid: true } };
        const result = nodalsAiRtdSubmodule.init(config, {});
        server.respond();

        expect(result).to.be.false;
        expect(server.requests.length).to.equal(0);
      });
    });

    describe('when initialised with valid config data', () => {
      it('should return false when user is under GDPR jurisdiction and purpose1 has not been granted', () => {
        const result = nodalsAiRtdSubmodule.init(validConfig, noPurpose1UserConsent);
        server.respond();

        expect(result).to.be.false;
        expect(server.requests.length).to.equal(0);
      });

      it('should return false when user is under GDPR jurisdiction and purpose7 has not been granted', () => {
        const result = nodalsAiRtdSubmodule.init(validConfig, noPurpose7UserConsent);
        server.respond();

        expect(result).to.be.false;
        expect(server.requests.length).to.equal(0);
      });

      it('should return false when user is under GDPR jurisdiction and Nodals AI as a vendor has no consent', () => {
        const result = nodalsAiRtdSubmodule.init(validConfig, vendorRestrictiveUserConsent);
        server.respond();

        expect(result).to.be.false;
        expect(server.requests.length).to.equal(0);
      });

      it('should return false when user is under GDPR jurisdiction and Nodals AI is not present in the decoded consent string', () => {
        const userConsent = JSON.parse(JSON.stringify(permissiveUserConsent));
        userConsent.gdpr.vendorData.vendor.consents = {};
        const result = nodalsAiRtdSubmodule.init(validConfig, userConsent);
        server.respond();

        expect(result).to.be.false;
        expect(server.requests.length).to.equal(0);
      });

      it('should return true when user is under GDPR jurisdiction and all consent provided', function () {
        const result = nodalsAiRtdSubmodule.init(validConfig, permissiveUserConsent);
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it('should return true when user is not under GDPR jurisdiction', () => {
        const result = nodalsAiRtdSubmodule.init(validConfig, outsideGdprUserConsent);
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it('should return true with publisherProvidedConsent flag set and least permissive consent', function () {
        const configWithManagedConsent = { params: { propertyId: '10312dd2', publisherProvidedConsent: true } };
        const result = nodalsAiRtdSubmodule.init(configWithManagedConsent, leastPermissiveUserConsent);
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });
    });

    describe('when initialised with valid config and data already in storage', () => {
      it('should return true and not make a remote request when stored data is valid', function () {
        setDataInLocalStorage({ data: { foo: 'bar' }, createdAt: Date.now() });
        const result = nodalsAiRtdSubmodule.init(validConfig, permissiveUserConsent);
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(0);
      });

      it('should return true and make a remote request when stored data has no TTL defined', function () {
        setDataInLocalStorage({ data: { foo: 'bar' } });
        const result = nodalsAiRtdSubmodule.init(validConfig, permissiveUserConsent);
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it('should return true and make a remote request when stored data has expired', function () {
        setDataInLocalStorage({ data: { foo: 'bar' }, createdAt: 100 });
        const result = nodalsAiRtdSubmodule.init(validConfig, permissiveUserConsent);
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it('should detect stale data if override TTL is exceeded', function () {
        const fiveMinutesAgoMs = Date.now() - (5 * 60 * 1000);
        setDataInLocalStorage({
          data: { foo: 'bar' },
          createdAt: fiveMinutesAgoMs,
        });
        const config = Object.assign({}, validConfig);
        config.params.storage = { ttl: 4 * 60 };
        const result = nodalsAiRtdSubmodule.init(config, permissiveUserConsent);
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it('should detect stale data if remote defined TTL is exceeded', function () {
        const fiveMinutesAgoMs = Date.now() - (5 * 60 * 1000);
        setDataInLocalStorage({
          data: { foo: 'bar', meta: { ttl: 4 * 60 } },
          createdAt: fiveMinutesAgoMs,
        });
        const result = nodalsAiRtdSubmodule.init(validConfig, permissiveUserConsent);
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it('should respect pub defined TTL over remote defined TTL', function () {
        const fiveMinutesAgoMs = Date.now() - (5 * 60 * 1000);
        setDataInLocalStorage({
          data: { foo: 'bar', meta: { ttl: 4 * 60 } },
          createdAt: fiveMinutesAgoMs,
        });
        const config = Object.assign({}, validConfig);
        config.params.storage = { ttl: 6 * 60 };
        const result = nodalsAiRtdSubmodule.init(config, permissiveUserConsent);
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(0);
      });

      it('should NOT detect stale data if override TTL is not exceeded', function () {
        const fiveMinutesAgoMs = Date.now() - 5 * 60 * 1000;
        setDataInLocalStorage({
          data: { foo: 'bar' },
          createdAt: fiveMinutesAgoMs,
        });
        const config = Object.assign({}, validConfig);
        config.params.storage = { ttl: 6 * 60 };
        const result = nodalsAiRtdSubmodule.init(config, permissiveUserConsent);
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(0);
      });

      it('should return true and make a remote request when data stored under default key, but override key specified', () => {
        setDataInLocalStorage({ data: { foo: 'bar' }, createdAt: Date.now() });
        const config = Object.assign({}, validConfig);
        config.params.storage = { key: overrideLocalStorageKey };
        const result = nodalsAiRtdSubmodule.init(config, permissiveUserConsent);
        server.respond();

        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });
    });

    describe('when performing requests to the publisher endpoint', () => {
      it('should construct the correct URL to the default origin', () => {
        nodalsAiRtdSubmodule.init(validConfig, permissiveUserConsent);
        const request = server.requests[0];
        server.respond();

        expect(request.method).to.equal('GET');
        expect(request.withCredentials).to.be.false;
        const requestUrl = new URL(request.url);
        expect(requestUrl.origin).to.equal('https://nodals.io');
      });

      it('should construct the URL to the overridden origin when specified in the config', () => {
        const config = Object.assign({}, validConfig);
        config.params.endpoint = { origin: 'http://localhost:8000' };
        nodalsAiRtdSubmodule.init(config, permissiveUserConsent);
        const request = server.requests[0];
        server.respond();

        expect(request.method).to.equal('GET');
        expect(request.withCredentials).to.be.false;
        const requestUrl = new URL(request.url);
        expect(requestUrl.origin).to.equal('http://localhost:8000');
      });

      it('should construct the correct URL with the correct path', () => {
        nodalsAiRtdSubmodule.init(validConfig, permissiveUserConsent);
        const request = server.requests[0];
        server.respond();

        const requestUrl = new URL(request.url);
        expect(requestUrl.pathname).to.equal('/p/v1/10312dd2/config');
      });

      it('should construct the correct URL with the correct GDPR query params', () => {
        const consentData = {
          consentString: 'foobarbaz',
        };
        nodalsAiRtdSubmodule.init(validConfig, generateGdprConsent(consentData));
        const request = server.requests[0];
        server.respond();

        const requestUrl = new URL(request.url);
        expect(requestUrl.searchParams.get('gdpr')).to.equal('1');
        expect(requestUrl.searchParams.get('gdpr_consent')).to.equal(
          'foobarbaz'
        );
        expect(requestUrl.searchParams.get('us_privacy')).to.equal('');
        expect(requestUrl.searchParams.get('gpp')).to.equal('');
        expect(requestUrl.searchParams.get('gpp_sid')).to.equal('');
      });
    });

    describe('when handling responses from the publisher endpoint', () => {
      it('should store successful response data in local storage', () => {
        nodalsAiRtdSubmodule.init(validConfig, permissiveUserConsent);
        const request = server.requests[0];
        server.respond();

        const storedData = JSON.parse(
          nodalsAiRtdSubmodule.storage.getDataFromLocalStorage(
            nodalsAiRtdSubmodule.STORAGE_KEY
          )
        );

        expect(request.method).to.equal('GET');
        expect(storedData).to.have.property('createdAt');
        expect(storedData.data).to.deep.equal(successPubEndpointResponse);
      });

      it('should store successful response data in local storage under the override key', () => {
        const config = Object.assign({}, validConfig);
        config.params.storage = { key: overrideLocalStorageKey };
        nodalsAiRtdSubmodule.init(config, permissiveUserConsent);
        server.respond();
        const request = server.requests[0];
        const storedData = JSON.parse(
          nodalsAiRtdSubmodule.storage.getDataFromLocalStorage(overrideLocalStorageKey)
        );

        expect(request.method).to.equal('GET');
        expect(storedData).to.have.property('createdAt');
        expect(storedData.data).to.deep.equal(successPubEndpointResponse);
      });

      it('should attempt to load the referenced script libraries contained in the response payload', () => {
        nodalsAiRtdSubmodule.init(validConfig, permissiveUserConsent);
        server.respond();

        expect(loadExternalScriptStub.calledTwice).to.be.true;
        expect(
          loadExternalScriptStub.calledWith(
            successPubEndpointResponse.deps['1.0.0'],
            MODULE_TYPE_RTD,
            nodalsAiRtdSubmodule.name
          )
        ).to.be.true;
        expect(
          loadExternalScriptStub.calledWith(
            successPubEndpointResponse.deps['1.1.0'],
            MODULE_TYPE_RTD,
            nodalsAiRtdSubmodule.name
          )
        ).to.be.true;
      });
    });
  });

  describe('getTargetingData()', () => {
    it('should return an empty object when no data is available in local storage, but fetch data', () => {
      const result = nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        permissiveUserConsent
      );
      server.respond();
      expect(result).to.deep.equal({});
      expect(server.requests.length).to.equal(1);
    });

    it('should return an empty object when getTargetingData throws error', () => {
      createTargetingEngineStub({adUnit1: {someKey: 'someValue'}}, true);
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      const result = nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        permissiveUserConsent
      );
      expect(result).to.deep.equal({});
      expect(server.requests.length).to.equal(0);
    });

    it('should initialise the versioned targeting engine if fresh data is in storage and not make a HTTP request', () => {
      const returnData = {};
      const engine = createTargetingEngineStub(returnData);
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        permissiveUserConsent
      );
      server.respond();

      expect(engine.init.called).to.be.true;
      const args = engine.init.getCall(0).args;
      expect(args[0]).to.deep.equal(validConfig);
      expect(server.requests.length).to.equal(0);
    });

    it('should initialise the versioned targeting engine with stale data if data expired and fetch fresh data', function () {
      const returnData = {};
      const engine = createTargetingEngineStub(returnData);
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: 100,
      });

      nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        permissiveUserConsent
      );
      server.respond();

      expect(engine.init.called).to.be.true;
      const args = engine.init.getCall(0).args;
      expect(args[0]).to.deep.equal(validConfig);
      expect(server.requests.length).to.equal(1);
    });

    it('should proxy the correct data to engine.getTargetingData() when storage data is available and we have consent under GDPR jurisdiction', () => {
      const engine = createTargetingEngineStub(
        engineGetTargetingDataReturnValue
      );
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1', 'adUnit2'],
        validConfig,
        permissiveUserConsent
      );
      server.respond();

      expect(engine.getTargetingData.called).to.be.true;
      const args = engine.getTargetingData.getCall(0).args;
      expect(args[0]).to.deep.equal(['adUnit1', 'adUnit2']);
      expect(args[1]).to.deep.equal(permissiveUserConsent);

      expect(args[2].deps).to.deep.equal(successPubEndpointResponse.deps);
      expect(args[2].facts).to.deep.include(successPubEndpointResponse.facts);
      expect(args[2].campaigns).to.deep.equal(successPubEndpointResponse.campaigns);
    });

    it('should return the data from engine.getTargetingData when storage data is available and we have consent under GDPR jurisdiction', () => {
      createTargetingEngineStub(engineGetTargetingDataReturnValue);
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      const result = nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        permissiveUserConsent
      );
      server.respond();

      expect(result).to.deep.equal(engineGetTargetingDataReturnValue);
    });

    it('should return the data from engine.getTargetingData when storage is available and we are NOT under GDPR jurisdiction', () => {
      createTargetingEngineStub(engineGetTargetingDataReturnValue);
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      const result = nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        outsideGdprUserConsent
      );
      server.respond();

      expect(result).to.deep.equal(engineGetTargetingDataReturnValue);
    });

    it('should return an empty object when data is available, but user has not provided consent to Nodals AI as a vendor', () => {
      createTargetingEngineStub(engineGetTargetingDataReturnValue);
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      const result = nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        vendorRestrictiveUserConsent
      );
      server.respond();

      expect(result).to.deep.equal({});
    });

    it('should return targeting data with publisherProvidedConsent flag set and least permissive consent', () => {
      createTargetingEngineStub(engineGetTargetingDataReturnValue);
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const configWithManagedConsent = { params: { propertyId: '10312dd2', publisherProvidedConsent: true } };

      const result = nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        configWithManagedConsent,
        leastPermissiveUserConsent
      );
      server.respond();

      expect(result).to.deep.equal(engineGetTargetingDataReturnValue);
    });
  });

  describe('getBidRequestData()', () => {
    it('should invoke callback without attempting to initialise the engine if we do not have consent', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const engine = createTargetingEngineStub();
      const customUserConsent = generateGdprConsent({ nodalsConsent: false });
      const callback = sinon.spy();
      nodalsAiRtdSubmodule.getBidRequestData(
        {}, callback, validConfig, vendorRestrictiveUserConsent
      );
      server.respond();

      expect(callback.called).to.be.true;
      expect(engine.init.called).to.be.false;
      expect(window.$nodals.cmdQueue).to.be.undefined
      expect(server.requests.length).to.equal(0);
    });

    it('should not store function arguments in a queue when no data is in localstorage and make a HTTP request for data', () => {
      const callback = sinon.spy();
      const requestObj = {dummy: 'obj'}
      nodalsAiRtdSubmodule.getBidRequestData(
        requestObj, callback, validConfig, permissiveUserConsent
      );
      server.respond();

      expect(callback.called).to.be.true;
      expect(window.$nodals).to.be.undefined;
      expect(server.requests.length).to.equal(1);
    });

    it('should store function arguments in a queue when data is in localstorage and engine not loaded', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const callback = sinon.spy();
      const reqBidsConfigObj = {dummy: 'obj'}
      nodalsAiRtdSubmodule.getBidRequestData(
        reqBidsConfigObj, callback, validConfig, permissiveUserConsent
      );
      server.respond();

      expect(callback.called).to.be.false;
      expect(window.$nodals.cmdQueue).to.be.an('array').with.length(1);
      expect(window.$nodals.cmdQueue[0].cmd).to.equal('getBidRequestData');
      expect(window.$nodals.cmdQueue[0].runtimeFacts).to.have.keys(['prebid.version', 'page.url']);
      expect(window.$nodals.cmdQueue[0].data).to.deep.include({config: validConfig, reqBidsConfigObj, callback, userConsent: permissiveUserConsent});
      expect(window.$nodals.cmdQueue[0].data.storedData).to.have.property('deps').that.deep.equals(
        successPubEndpointResponse.deps);
      expect(window.$nodals.cmdQueue[0].data.storedData).to.have.property('facts').that.deep.includes(
        successPubEndpointResponse.facts);
      expect(window.$nodals.cmdQueue[0].data.storedData).to.have.property('campaigns').that.deep.equals(
        successPubEndpointResponse.campaigns);
      expect(server.requests.length).to.equal(0);
    });

    it('should proxy the correct data to engine.getBidRequestData when data is in localstorage and library has loaded', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const engine = createTargetingEngineStub();
      const callback = sinon.spy();
      const reqBidsConfigObj = {dummy: 'obj'}
      nodalsAiRtdSubmodule.getBidRequestData(
        reqBidsConfigObj, callback, validConfig, permissiveUserConsent
      );
      server.respond();

      expect(callback.called).to.be.false;
      expect(engine.init.called).to.be.true;
      expect(engine.getBidRequestData.called).to.be.true;
      const args = engine.getBidRequestData.getCall(0).args;
      expect(args[0]).to.deep.equal(reqBidsConfigObj);
      expect(args[1]).to.deep.equal(callback);
      expect(args[2]).to.deep.equal(permissiveUserConsent);
      expect(args[3].deps).to.deep.equal(successPubEndpointResponse.deps);
      expect(args[3].facts).to.deep.include(successPubEndpointResponse.facts);
      expect(args[3].campaigns).to.deep.equal(successPubEndpointResponse.campaigns);
      expect(server.requests.length).to.equal(0);
    });

    it('should proxy the correct data to engine.getBidRequestData with publisherProvidedConsent flag set and least permissive consent', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const engine = createTargetingEngineStub();
      const callback = sinon.spy();
      const reqBidsConfigObj = {dummy: 'obj'}
      const configWithManagedConsent = { params: { propertyId: '10312dd2', publisherProvidedConsent: true } };
      nodalsAiRtdSubmodule.getBidRequestData(
        reqBidsConfigObj, callback, configWithManagedConsent, leastPermissiveUserConsent
      );
      server.respond();

      expect(callback.called).to.be.false;
      expect(engine.init.called).to.be.true;
      expect(engine.getBidRequestData.called).to.be.true;
      const args = engine.getBidRequestData.getCall(0).args;
      expect(args[0]).to.deep.equal(reqBidsConfigObj);
      expect(args[1]).to.deep.equal(callback);
      expect(args[2]).to.deep.equal(leastPermissiveUserConsent);
      expect(args[3].deps).to.deep.equal(successPubEndpointResponse.deps);
      expect(args[3].facts).to.deep.include(successPubEndpointResponse.facts);
      expect(args[3].campaigns).to.deep.equal(successPubEndpointResponse.campaigns);
      expect(server.requests.length).to.equal(0);
    });
  });

  describe('onBidResponseEvent()', () => {
    it('should not proxy the call if we do not have user consent', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const engine = createTargetingEngineStub();
      const bidResponse = {dummy: 'obj', 'bid': 'foo'};
      nodalsAiRtdSubmodule.onBidResponseEvent(
        bidResponse, validConfig, vendorRestrictiveUserConsent
      );
      server.respond();

      expect(engine.init.called).to.be.false;
      expect(engine.onBidResponseEvent.called).to.be.false;
      expect(window.$nodals.cmdQueue).to.be.undefined
      expect(server.requests.length).to.equal(0);
    });

    it('should not store function arguments in a queue when no data is in localstorage and make a HTTP request for data', () => {
      const bidResponse = {dummy: 'obj', 'bid': 'foo'};
      nodalsAiRtdSubmodule.onBidResponseEvent(
        bidResponse, validConfig, permissiveUserConsent
      );
      server.respond();

      expect(window.$nodals).to.be.undefined;
      expect(server.requests.length).to.equal(1);
    });

    it('should store function arguments in a queue when data is in localstorage and engine not loaded', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const userConsent = generateGdprConsent();
      const bidResponse = {dummy: 'obj', 'bid': 'foo'};
      nodalsAiRtdSubmodule.onBidResponseEvent(
        bidResponse, validConfig, permissiveUserConsent
      );
      server.respond();

      expect(window.$nodals.cmdQueue).to.be.an('array').with.length(1);
      expect(window.$nodals.cmdQueue[0].cmd).to.equal('onBidResponseEvent');
      expect(window.$nodals.cmdQueue[0].runtimeFacts).to.have.keys(['prebid.version', 'page.url']);
      expect(window.$nodals.cmdQueue[0].data).to.deep.include({config: validConfig, bidResponse, userConsent: permissiveUserConsent });
      expect(window.$nodals.cmdQueue[0].data.storedData).to.have.property('deps').that.deep.equals(
        successPubEndpointResponse.deps);
      expect(window.$nodals.cmdQueue[0].data.storedData).to.have.property('facts').that.deep.includes(
        successPubEndpointResponse.facts);
      expect(window.$nodals.cmdQueue[0].data.storedData).to.have.property('campaigns').that.deep.equals(
        successPubEndpointResponse.campaigns);
      expect(server.requests.length).to.equal(0);
    });

    it('should proxy the correct data to engine.onBidResponseEvent when data is in localstorage and library has loaded', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const engine = createTargetingEngineStub();
      const bidResponse = {dummy: 'obj', 'bid': 'foo'};
      nodalsAiRtdSubmodule.onBidResponseEvent(
        bidResponse, validConfig, permissiveUserConsent
      );
      server.respond();

      expect(engine.init.called).to.be.true;
      expect(engine.onBidResponseEvent.called).to.be.true;
      const args = engine.onBidResponseEvent.getCall(0).args;
      expect(args[0]).to.deep.equal(bidResponse);
      expect(args[1]).to.deep.equal(permissiveUserConsent);
      expect(args[2].deps).to.deep.equal(successPubEndpointResponse.deps);
      expect(args[2].facts).to.deep.include(successPubEndpointResponse.facts);
      expect(args[2].campaigns).to.deep.equal(successPubEndpointResponse.campaigns);
      expect(server.requests.length).to.equal(0);
    });

    it('should proxy the correct data to engine.onBidResponseEvent with publisherProvidedConsent flag set and least permissive consent', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const engine = createTargetingEngineStub();
      const bidResponse = {dummy: 'obj', 'bid': 'foo'};
      const configWithManagedConsent = { params: { propertyId: '10312dd2', publisherProvidedConsent: true } };
      nodalsAiRtdSubmodule.onBidResponseEvent(
        bidResponse, configWithManagedConsent, leastPermissiveUserConsent
      );
      server.respond();

      expect(engine.init.called).to.be.true;
      expect(engine.onBidResponseEvent.called).to.be.true;
      const args = engine.onBidResponseEvent.getCall(0).args;
      expect(args[0]).to.deep.equal(bidResponse);
      expect(args[1]).to.deep.equal(leastPermissiveUserConsent);
      expect(args[2].deps).to.deep.equal(successPubEndpointResponse.deps);
      expect(args[2].facts).to.deep.include(successPubEndpointResponse.facts);
      expect(args[2].campaigns).to.deep.equal(successPubEndpointResponse.campaigns);
      expect(server.requests.length).to.equal(0);
    });
  });

  describe('onAuctionEndEvent()', () => {
    it('should not proxy the call if we do not have user consent', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const engine = createTargetingEngineStub();
      const auctionDetails = {dummy: 'obj', auction: 'foo'};
      nodalsAiRtdSubmodule.onAuctionEndEvent(
        auctionDetails, validConfig, vendorRestrictiveUserConsent
      );
      server.respond();

      expect(engine.init.called).to.be.false;
      expect(engine.onAuctionEndEvent.called).to.be.false;
      expect(window.$nodals.cmdQueue).to.be.undefined
      expect(server.requests.length).to.equal(0);
    });

    it('should not store function arguments in a queue when no data is in localstorage and make a HTTP request for data', () => {
      const auctionDetails = {dummy: 'obj', auction: 'foo'};
      nodalsAiRtdSubmodule.onAuctionEndEvent(
        auctionDetails, validConfig, permissiveUserConsent
      );
      server.respond();

      expect(window.$nodals).to.be.undefined;
      expect(server.requests.length).to.equal(1);
    });

    it('should store function arguments in a queue when data is in localstorage and engine not loaded', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const auctionDetails = {dummy: 'obj', auction: 'foo'};
      nodalsAiRtdSubmodule.onAuctionEndEvent(
        auctionDetails, validConfig, permissiveUserConsent
      );
      server.respond();

      expect(window.$nodals.cmdQueue).to.be.an('array').with.length(1);
      expect(window.$nodals.cmdQueue[0].cmd).to.equal('onAuctionEndEvent');
      expect(window.$nodals.cmdQueue[0].runtimeFacts).to.have.keys(['prebid.version', 'page.url']);
      expect(window.$nodals.cmdQueue[0].data).to.deep.include({config: validConfig, auctionDetails, userConsent: permissiveUserConsent });
      expect(window.$nodals.cmdQueue[0].data.storedData).to.have.property('deps').that.deep.equals(
        successPubEndpointResponse.deps);
      expect(window.$nodals.cmdQueue[0].data.storedData).to.have.property('facts').that.deep.includes(
        successPubEndpointResponse.facts);
      expect(window.$nodals.cmdQueue[0].data.storedData).to.have.property('campaigns').that.deep.equals(
        successPubEndpointResponse.campaigns);
      expect(server.requests.length).to.equal(0);
    });

    it('should proxy the correct data to engine.onAuctionEndEvent when data is in localstorage and library has loaded', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const engine = createTargetingEngineStub();
      const userConsent = generateGdprConsent();
      const auctionDetails = {dummy: 'obj', auction: 'foo'};
      nodalsAiRtdSubmodule.onAuctionEndEvent(
        auctionDetails, validConfig, permissiveUserConsent
      );
      server.respond();

      expect(engine.init.called).to.be.true;
      expect(engine.onAuctionEndEvent.called).to.be.true;
      const args = engine.onAuctionEndEvent.getCall(0).args;
      expect(args[0]).to.deep.equal(auctionDetails);
      expect(args[1]).to.deep.equal(permissiveUserConsent);
      expect(args[2].deps).to.deep.equal(successPubEndpointResponse.deps);
      expect(args[2].facts).to.deep.include(successPubEndpointResponse.facts);
      expect(args[2].campaigns).to.deep.equal(successPubEndpointResponse.campaigns);
      expect(server.requests.length).to.equal(0);
    });

    it('should proxy the correct data to engine.onAuctionEndEvent with publisherProvidedConsent flag set and least permissive consent', () => {
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const engine = createTargetingEngineStub();
      const auctionDetails = {dummy: 'obj', auction: 'foo'};
      const configWithManagedConsent = { params: { propertyId: '10312dd2', publisherProvidedConsent: true } };
      nodalsAiRtdSubmodule.onAuctionEndEvent(
        auctionDetails, configWithManagedConsent, leastPermissiveUserConsent
      );
      server.respond();

      expect(engine.init.called).to.be.true;
      expect(engine.onAuctionEndEvent.called).to.be.true;
      const args = engine.onAuctionEndEvent.getCall(0).args;
      expect(args[0]).to.deep.equal(auctionDetails);
      expect(args[1]).to.deep.equal(leastPermissiveUserConsent);
      expect(args[2].deps).to.deep.equal(successPubEndpointResponse.deps);
      expect(args[2].facts).to.deep.include(successPubEndpointResponse.facts);
      expect(args[2].campaigns).to.deep.equal(successPubEndpointResponse.campaigns);
      expect(server.requests.length).to.equal(0);
    });
  });

  describe('#getEngine()', () => {
    it('should return undefined when $nodals object does not exist', () => {
      // Setup data in storage to avoid triggering fetchData
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      delete window.$nodals;
      const result = nodalsAiRtdSubmodule.getTargetingData([], validConfig, permissiveUserConsent);
      expect(result).to.deep.equal({});
    });

    it('should return undefined when adTargetingEngine object does not exist', () => {
      // Setup data in storage to avoid triggering fetchData
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      window.$nodals = {};
      const result = nodalsAiRtdSubmodule.getTargetingData([], validConfig, permissiveUserConsent);
      expect(result).to.deep.equal({});
    });

    it('should return undefined when specific engine version does not exist', () => {
      // Setup data in storage to avoid triggering fetchData
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      window.$nodals = {
        adTargetingEngine: {}
      };
      const result = nodalsAiRtdSubmodule.getTargetingData([], validConfig, permissiveUserConsent);
      expect(result).to.deep.equal({});
    });

    it('should return undefined when property access throws an error', () => {
      // Setup data in storage to avoid triggering fetchData
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      Object.defineProperty(window, '$nodals', {
        get() {
          throw new Error('Access denied');
        },
        configurable: true
      });
      const result = nodalsAiRtdSubmodule.getTargetingData([], validConfig, permissiveUserConsent);
      expect(result).to.deep.equal({});
      delete window.$nodals;
    });
  });
});
