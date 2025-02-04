import { expect } from 'chai';
import { MODULE_TYPE_RTD } from 'src/activities/modules.js';
import { loadExternalScriptStub } from 'test/mocks/adloaderStub.js';
import { server } from 'test/mocks/xhr.js';

import { nodalsAiRtdSubmodule } from 'modules/nodalsAiRtdProvider.js';

const jsonResponseHeaders = {
  'Content-Type': 'application/json',
};

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
      id: 1234,
      ads: [
        {
          delivery_id: '1234',
          property_id: 'fd32da',
          weighting: 1,
          kvs: [
            {
              k: 'nodals',
              v: '1',
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
    nodalsConsent: true,
  };
  const mergedConsent = Object.assign({}, defaults, consent);
  return {
    gdpr: {
      gdprApplies: mergedConsent.gdprApplies,
      consentString: mergedConsent.consentString,
      vendorData: {
        purpose: {
          consents: {
            1: mergedConsent.purpose1Consent,
            3: true,
            4: true,
            5: true,
            6: true,
            9: true,
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
  };
};

const setDataInLocalStorage = (data) => {
  const storageData = { ...data };
  nodalsAiRtdSubmodule.storage.setDataInLocalStorage(
    nodalsAiRtdSubmodule.STORAGE_KEY,
    JSON.stringify(storageData)
  );
};

describe('NodalsAI RTD Provider', () => {
  let sandbox;
  let validConfig;

  beforeEach(() => {
    validConfig = { params: { propertyId: '10312dd2' } };

    sandbox = sinon.sandbox.create();
    nodalsAiRtdSubmodule.storage.removeDataFromLocalStorage(
      nodalsAiRtdSubmodule.STORAGE_KEY
    );
  });

  afterEach(() => {
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
      const userConsent = {};

      it('should return true when initialized with valid config and empty user consent', function () {
        const result = nodalsAiRtdSubmodule.init(validConfig, userConsent);
        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it('should return false when initialized with invalid config', () => {
        const config = { params: { invalid: true } };
        const result = nodalsAiRtdSubmodule.init(config, userConsent);
        expect(result).to.be.false;
        expect(server.requests.length).to.equal(0);
      });
    });

    describe('when initialised with valid config data', () => {
      it('should return false when user is under GDPR jurisdiction and purpose1 has not been granted', () => {
        const userConsent = generateGdprConsent({ purpose1Consent: false });
        const result = nodalsAiRtdSubmodule.init(validConfig, userConsent);
        expect(result).to.be.false;
      });

      it('should return false when user is under GDPR jurisdiction and Nodals AI as a vendor has no consent', () => {
        const userConsent = generateGdprConsent({ nodalsConsent: false });
        const result = nodalsAiRtdSubmodule.init(validConfig, userConsent);
        expect(result).to.be.false;
      });

      it('should return true when user is under GDPR jurisdiction and all consent provided', function () {
        const userConsent = generateGdprConsent();
        const result = nodalsAiRtdSubmodule.init(validConfig, userConsent);
        expect(result).to.be.true;
      });

      it('should return true when user is not under GDPR jurisdiction', () => {
        const userConsent = generateGdprConsent({ gdprApplies: false });
        const result = nodalsAiRtdSubmodule.init(validConfig, userConsent);
        expect(result).to.be.true;
      });
    });

    describe('when initialised with valid config and data already in storage', () => {
      it('should return true and not make a remote request when stored data is valid', function () {
        setDataInLocalStorage({ data: { foo: 'bar' }, createdAt: Date.now() });
        const result = nodalsAiRtdSubmodule.init(validConfig, {});
        expect(result).to.be.true;
        expect(server.requests.length).to.equal(0);
      });

      it('should return true and make a remote request when stored data has no TTL defined', function () {
        setDataInLocalStorage({ data: { foo: 'bar' } });
        const result = nodalsAiRtdSubmodule.init(validConfig, {});
        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it('should return true and make a remote request when stored data has expired', function () {
        setDataInLocalStorage({ data: { foo: 'bar' }, createdAt: 100 });
        const result = nodalsAiRtdSubmodule.init(validConfig, {});
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
        const result = nodalsAiRtdSubmodule.init(config, {});
        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });

      it('should detect stale data if remote defined TTL is exceeded', function () {
        const fiveMinutesAgoMs = Date.now() - (5 * 60 * 1000);
        setDataInLocalStorage({
          data: { foo: 'bar', meta: { ttl: 4 * 60 } },
          createdAt: fiveMinutesAgoMs,
        });
        const result = nodalsAiRtdSubmodule.init(validConfig, {});
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
        const result = nodalsAiRtdSubmodule.init(config, {});
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
        const result = nodalsAiRtdSubmodule.init(config, {});
        expect(result).to.be.true;
        expect(server.requests.length).to.equal(0);
      });

      it('should return true and make a remote request when data stored under default key, but override key specified', () => {
        setDataInLocalStorage({ data: { foo: 'bar' }, createdAt: Date.now() });
        const config = Object.assign({}, validConfig);
        config.params.storage = { key: '_foobarbaz_' };
        const result = nodalsAiRtdSubmodule.init(config, {});
        expect(result).to.be.true;
        expect(server.requests.length).to.equal(1);
      });
    });

    describe('when performing requests to the publisher endpoint', () => {
      it('should construct the correct URL to the default origin', () => {
        const userConsent = generateGdprConsent();
        nodalsAiRtdSubmodule.init(validConfig, userConsent);

        let request = server.requests[0];

        expect(request.method).to.equal('GET');
        expect(request.withCredentials).to.be.false;
        const requestUrl = new URL(request.url);
        expect(requestUrl.origin).to.equal('https://nodals.io');
      });

      it('should construct the URL to the overridden origin when specified in the config', () => {
        const config = Object.assign({}, validConfig);
        config.params.endpoint = { origin: 'http://localhost:8000' };
        const userConsent = generateGdprConsent();
        nodalsAiRtdSubmodule.init(config, userConsent);

        let request = server.requests[0];

        expect(request.method).to.equal('GET');
        expect(request.withCredentials).to.be.false;
        const requestUrl = new URL(request.url);
        expect(requestUrl.origin).to.equal('http://localhost:8000');
      });

      it('should construct the correct URL with the correct path', () => {
        const userConsent = generateGdprConsent();
        nodalsAiRtdSubmodule.init(validConfig, userConsent);

        let request = server.requests[0];
        const requestUrl = new URL(request.url);
        expect(requestUrl.pathname).to.equal('/p/v1/10312dd2/config');
      });

      it('should construct the correct URL with the correct GDPR query params', () => {
        const consentData = {
          consentString: 'foobarbaz',
        };
        const userConsent = generateGdprConsent(consentData);
        nodalsAiRtdSubmodule.init(validConfig, userConsent);

        let request = server.requests[0];
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
        const userConsent = generateGdprConsent();
        nodalsAiRtdSubmodule.init(validConfig, userConsent);

        let request = server.requests[0];
        request.respond(
          200,
          jsonResponseHeaders,
          JSON.stringify(successPubEndpointResponse)
        );

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
        const userConsent = generateGdprConsent();
        const config = Object.assign({}, validConfig);
        config.params.storage = { key: '_foobarbaz_' };
        nodalsAiRtdSubmodule.init(config, userConsent);

        let request = server.requests[0];
        request.respond(
          200,
          jsonResponseHeaders,
          JSON.stringify(successPubEndpointResponse)
        );

        const storedData = JSON.parse(
          nodalsAiRtdSubmodule.storage.getDataFromLocalStorage('_foobarbaz_')
        );
        expect(request.method).to.equal('GET');
        expect(storedData).to.have.property('createdAt');
        expect(storedData.data).to.deep.equal(successPubEndpointResponse);
      });

      it('should attempt to load the referenced script libraries contained in the response payload', () => {
        const userConsent = generateGdprConsent();
        nodalsAiRtdSubmodule.init(validConfig, userConsent);

        let request = server.requests[0];
        request.respond(
          200,
          jsonResponseHeaders,
          JSON.stringify(successPubEndpointResponse)
        );

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
    afterEach(() => {
      if (window.$nodals) {
        delete window.$nodals;
      }
    });

    const stubVersionedTargetingEngine = (returnValue, raiseError = false) => {
      const version = 'latest';
      const initStub = sinon.stub();
      const getTargetingDataStub = sinon.stub();
      if (raiseError) {
        getTargetingDataStub.throws(new Error('Stubbed error'));
      } else {
        getTargetingDataStub.returns(returnValue);
      }
      window.$nodals = window.$nodals || {};
      window.$nodals.adTargetingEngine = window.$nodals.adTargetingEngine || {};
      window.$nodals.adTargetingEngine[version] = {
        init: initStub,
        getTargetingData: getTargetingDataStub,
      };
      return window.$nodals.adTargetingEngine[version];
    };

    it('should return an empty object when no data is available in local storage', () => {
      const result = nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        {}
      );
      expect(result).to.deep.equal({});
    });

    it('should return an empty object when getTargetingData throws error', () => {
      stubVersionedTargetingEngine({}, true); // TODO: Change the data
      const userConsent = generateGdprConsent();
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      const result = nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        userConsent
      );
      expect(result).to.deep.equal({});
    });

    it('should initialise the versioned targeting engine', () => {
      const returnData = {};
      const engine = stubVersionedTargetingEngine(returnData);
      const userConsent = generateGdprConsent();
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        userConsent
      );

      expect(engine.init.called).to.be.true;
      const args = engine.init.getCall(0).args;
      expect(args[0]).to.deep.equal(validConfig);
      expect(args[1]).to.deep.include(successPubEndpointResponse.facts);
    });

    it('should proxy the correct data to engine.init()', () => {
      const engine = stubVersionedTargetingEngine(
        engineGetTargetingDataReturnValue
      );
      const userConsent = generateGdprConsent();
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1', 'adUnit2'],
        validConfig,
        userConsent
      );

      expect(engine.init.called).to.be.true;
      const args = engine.init.getCall(0).args;
      expect(args[0]).to.deep.equal(validConfig);
      expect(args[1]).to.be.an('object').with.keys(['browser.name', 'geo.country', 'page.url']);
    });

    it('should proxy the correct data to engine.getTargetingData()', () => {
      const engine = stubVersionedTargetingEngine(
        engineGetTargetingDataReturnValue
      );
      const userConsent = generateGdprConsent();
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });
      nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1', 'adUnit2'],
        validConfig,
        userConsent
      );

      expect(engine.getTargetingData.called).to.be.true;
      const args = engine.getTargetingData.getCall(0).args;
      expect(args[0]).to.deep.equal(['adUnit1', 'adUnit2']);
      expect(args[1]).to.deep.include(successPubEndpointResponse);
      expect(args[2]).to.deep.equal(userConsent);
    });

    it('should return the response from engine.getTargetingData when data is available and we have consent under GDPR jurisdiction', () => {
      stubVersionedTargetingEngine(engineGetTargetingDataReturnValue);
      const userConsent = generateGdprConsent();
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      const result = nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        userConsent
      );

      expect(result).to.deep.equal(engineGetTargetingDataReturnValue);
    });

    it('should return the response from engine.getTargetingData when data is available and we are NOT under GDPR jurisdiction', () => {
      stubVersionedTargetingEngine(engineGetTargetingDataReturnValue);
      const userConsent = generateGdprConsent({ gdprApplies: false });
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      const result = nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        userConsent
      );

      expect(result).to.deep.equal(engineGetTargetingDataReturnValue);
    });

    it('should return an empty object when data is available, but user has not provided consent to Nodals AI as a vendor', () => {
      stubVersionedTargetingEngine(engineGetTargetingDataReturnValue);
      const userConsent = generateGdprConsent({ nodalsConsent: false });
      setDataInLocalStorage({
        data: successPubEndpointResponse,
        createdAt: Date.now(),
      });

      const result = nodalsAiRtdSubmodule.getTargetingData(
        ['adUnit1'],
        validConfig,
        userConsent
      );

      expect(result).to.deep.equal({});
    });
  });
});
