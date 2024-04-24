import * as id5System from '../../../modules/id5IdSystem.js';
import {
  coreStorage,
  getConsentHash,
  init,
  requestBidsHook,
  setSubmoduleRegistry
} from '../../../modules/userId/index.js';
import {config} from '../../../src/config.js';
import * as events from '../../../src/events.js';
import { EVENTS } from '../../../src/constants.js';
import * as utils from '../../../src/utils.js';
import {uspDataHandler, gppDataHandler} from '../../../src/adapterManager.js';
import '../../../src/prebid.js';
import {hook} from '../../../src/hook.js';
import {mockGdprConsent} from '../../helpers/consentData.js';
import {server} from '../../mocks/xhr.js';
import {expect} from 'chai';
import {GreedyPromise} from '../../../src/utils/promise.js';

const IdFetchFlow = id5System.IdFetchFlow;

describe('ID5 ID System', function () {
  const ID5_MODULE_NAME = 'id5Id';
  const ID5_EIDS_NAME = ID5_MODULE_NAME.toLowerCase();
  const ID5_SOURCE = 'id5-sync.com';
  const ID5_TEST_PARTNER_ID = 173;
  const ID5_ENDPOINT = `https://id5-sync.com/g/v2/${ID5_TEST_PARTNER_ID}.json`;
  const ID5_API_CONFIG_URL = `https://id5-sync.com/api/config/prebid`;
  const ID5_EXTENSIONS_ENDPOINT = 'https://extensions.id5-sync.com/test';
  const ID5_API_CONFIG = {
    fetchCall: {
      url: ID5_ENDPOINT
    }
  };
  const ID5_STORED_ID = 'storedid5id';
  const ID5_STORED_SIGNATURE = '123456';
  const ID5_STORED_LINK_TYPE = 1;
  const ID5_STORED_OBJ = {
    'universal_uid': ID5_STORED_ID,
    'signature': ID5_STORED_SIGNATURE,
    'ext': {
      'linkType': ID5_STORED_LINK_TYPE
    }
  };
  const EUID_STORED_ID = 'EUID_1';
  const EUID_SOURCE = 'uidapi.com';
  const ID5_STORED_OBJ_WITH_EUID = {
    'universal_uid': ID5_STORED_ID,
    'signature': ID5_STORED_SIGNATURE,
    'ext': {
      'linkType': ID5_STORED_LINK_TYPE,
      'euid': {
        'source': EUID_SOURCE,
        'uids': [{
          'id': EUID_STORED_ID,
          'aType': 3
        }]
      }
    }
  };
  const ID5_RESPONSE_ID = 'newid5id';
  const ID5_RESPONSE_SIGNATURE = 'abcdef';
  const ID5_RESPONSE_LINK_TYPE = 2;
  const ID5_JSON_RESPONSE = {
    'universal_uid': ID5_RESPONSE_ID,
    'signature': ID5_RESPONSE_SIGNATURE,
    'link_type': ID5_RESPONSE_LINK_TYPE,
    'ext': {
      'linkType': ID5_RESPONSE_LINK_TYPE
    }
  };
  const ALLOWED_ID5_VENDOR_DATA = {
    purpose: {
      consents: {
        1: true
      }
    },
    vendor: {
      consents: {
        131: true
      }
    }
  }

  const HEADERS_CONTENT_TYPE_JSON = {
    'Content-Type': 'application/json'
  }

  function getId5FetchConfig(partner = ID5_TEST_PARTNER_ID, storageName = id5System.ID5_STORAGE_NAME, storageType = 'html5') {
    return {
      name: ID5_MODULE_NAME,
      params: {
        partner
      },
      storage: {
        name: storageName,
        type: storageType,
        expires: 90
      }
    }
  }

  function getId5ValueConfig(value) {
    return {
      name: ID5_MODULE_NAME,
      value: {
        id5id: {
          uid: value
        }
      }
    }
  }

  function getUserSyncConfig(userIds) {
    return {
      userSync: {
        userIds: userIds,
        syncDelay: 0
      }
    }
  }

  function getFetchLocalStorageConfig() {
    return getUserSyncConfig([getId5FetchConfig()]);
  }

  function getValueConfig(value) {
    return getUserSyncConfig([getId5ValueConfig(value)]);
  }

  function getAdUnitMock(code = 'adUnit-code') {
    return {
      code,
      mediaTypes: {banner: {}, native: {}},
      sizes: [[300, 200], [300, 600]],
      bids: [{bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}]
    };
  }

  function callSubmoduleGetId(config, consentData, cacheIdObj) {
    return new GreedyPromise((resolve) => {
      id5System.id5IdSubmodule.getId(config, consentData, cacheIdObj).callback((response) => {
        resolve(response);
      });
    });
  }

  class XhrServerMock {
    currentRequestIdx = 0;
    server;

    constructor(server) {
      this.currentRequestIdx = 0;
      this.server = server;
    }

    async expectFirstRequest() {
      return this.#waitOnRequest(0);
    }

    async expectNextRequest() {
      return this.#waitOnRequest(++this.currentRequestIdx);
    }

    async expectConfigRequest() {
      const configRequest = await this.expectFirstRequest();
      expect(configRequest.url).is.eq(ID5_API_CONFIG_URL);
      expect(configRequest.method).is.eq('POST');
      return configRequest;
    }

    async respondWithConfigAndExpectNext(configRequest, config = ID5_API_CONFIG) {
      configRequest.respond(200, HEADERS_CONTENT_TYPE_JSON, JSON.stringify(config));
      return this.expectNextRequest();
    }

    async expectFetchRequest() {
      const configRequest = await this.expectFirstRequest();
      const fetchRequest = await this.respondWithConfigAndExpectNext(configRequest);
      expect(fetchRequest.method).is.eq('POST');
      expect(fetchRequest.url).is.eq(ID5_API_CONFIG.fetchCall.url);
      return fetchRequest;
    }

    async #waitOnRequest(index) {
      const server = this.server
      return new GreedyPromise((resolve) => {
        const waitForCondition = () => {
          if (server.requests && server.requests.length > index) {
            resolve(server.requests[index]);
          } else {
            setTimeout(waitForCondition, 30);
          }
        };
        waitForCondition();
      });
    }

    hasReceivedAnyRequest() {
      const requests = this.server.requests;
      return requests && requests.length > 0;
    }
  }

  before(() => {
    hook.ready();
  });

  describe('Check for valid publisher config', function () {
    it('should fail with invalid config', function () {
      // no config
      expect(id5System.id5IdSubmodule.getId()).is.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({})).is.eq(undefined);

      // valid params, invalid id5System.storage
      expect(id5System.id5IdSubmodule.getId({ params: { partner: 123 } })).to.be.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({ params: { partner: 123 }, storage: {} })).to.be.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({ params: { partner: 123 }, storage: { name: '' } })).to.be.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({ params: { partner: 123 }, storage: { type: '' } })).to.be.eq(undefined);

      // valid id5System.storage, invalid params
      expect(id5System.id5IdSubmodule.getId({ storage: { name: 'name', type: 'html5', }, })).to.be.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({ storage: { name: 'name', type: 'html5', }, params: { } })).to.be.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({ storage: { name: 'name', type: 'html5', }, params: { partner: 'abc' } })).to.be.eq(undefined);
    });

    it('should warn with non-recommended id5System.storage params', function () {
      const logWarnStub = sinon.stub(utils, 'logWarn');

      id5System.id5IdSubmodule.getId({ storage: { name: 'name', type: 'html5', }, params: { partner: 123 } });
      expect(logWarnStub.calledOnce).to.be.true;
      logWarnStub.restore();

      id5System.id5IdSubmodule.getId({ storage: { name: id5System.ID5_STORAGE_NAME, type: 'cookie', }, params: { partner: 123 } });
      expect(logWarnStub.calledOnce).to.be.true;
      logWarnStub.restore();
    });
  });

  describe('Check for valid consent', function() {
    const dataConsentVals = [
      [{purpose: {consents: {1: false}}}, {vendor: {consents: {131: true}}}, ' no purpose consent'],
      [{purpose: {consents: {1: true}}}, {vendor: {consents: {131: false}}}, ' no vendor consent'],
      [{purpose: {consents: {1: false}}}, {vendor: {consents: {131: false}}}, ' no purpose and vendor consent'],
      [{purpose: {consents: undefined}}, {vendor: {consents: {131: true}}}, ' undefined purpose consent'],
      [{purpose: {consents: {1: false}}}, {vendor: {consents: undefined}}], ' undefined vendor consent',
      [undefined, {vendor: {consents: {131: true}}}, ' undefined purpose'],
      [{purpose: {consents: {1: true}}}, {vendor: undefined}, ' undefined vendor'],
      [{purpose: {consents: {1: true}}}, {vendor: {consents: {31: true}}}, ' incorrect vendor consent']
    ];

    dataConsentVals.forEach(function([purposeConsent, vendorConsent, caseName]) {
      it('should fail with invalid consent because of ' + caseName, function() {
        const dataConsent = {
          gdprApplies: true,
          consentString: 'consentString',
          vendorData: {
            purposeConsent, vendorConsent
          }
        }
        expect(id5System.id5IdSubmodule.getId(config)).is.eq(undefined);
        expect(id5System.id5IdSubmodule.getId(config, dataConsent)).is.eq(undefined);

        const cacheIdObject = 'cacheIdObject';
        expect(id5System.id5IdSubmodule.extendId(config)).is.eq(undefined);
        expect(id5System.id5IdSubmodule.extendId(config, dataConsent, cacheIdObject)).is.eq(cacheIdObject);
      });
    });
  });

  describe('Xhr Requests from getId()', function () {
    const responseHeader = HEADERS_CONTENT_TYPE_JSON
    let gppStub

    beforeEach(function () {
    });

    afterEach(function () {
      uspDataHandler.reset()
      gppStub?.restore()
    });

    it('should call the ID5 server and handle a valid response', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const config = getId5FetchConfig();

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(config, undefined, undefined);

      const fetchRequest = await xhrServerMock.expectFetchRequest()

      expect(fetchRequest.url).to.contain(ID5_ENDPOINT);
      expect(fetchRequest.withCredentials).is.true;

      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
      expect(requestBody.o).is.eq('pbjs');
      expect(requestBody.pd).is.undefined;
      expect(requestBody.s).is.undefined;
      expect(requestBody.provider).is.undefined
      expect(requestBody.v).is.eq('$prebid.version$');
      expect(requestBody.gdpr).is.eq(0);
      expect(requestBody.gdpr_consent).is.undefined;
      expect(requestBody.us_privacy).is.undefined;
      expect(requestBody.storage).is.deep.eq(config.storage)

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      const submoduleResponse = await submoduleResponsePromise;
      expect(submoduleResponse).is.deep.equal(ID5_JSON_RESPONSE);
    });

    it('should call the ID5 server with gdpr data ', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const consentData = {
        gdprApplies: true,
        consentString: 'consentString',
        vendorData: ALLOWED_ID5_VENDOR_DATA
      }

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), consentData, undefined);

      const fetchRequest = await xhrServerMock.expectFetchRequest()
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
      expect(requestBody.gdpr).to.eq(1);
      expect(requestBody.gdpr_consent).is.eq(consentData.consentString);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      const submoduleResponse = await submoduleResponsePromise;
      expect(submoduleResponse).is.deep.equal(ID5_JSON_RESPONSE);
    });

    it('should call the ID5 server without gdpr data when gdpr not applies ', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const consentData = {
        gdprApplies: false,
        consentString: 'consentString'
      }

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), consentData, undefined);

      const fetchRequest = await xhrServerMock.expectFetchRequest()
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.gdpr).to.eq(0);
      expect(requestBody.gdpr_consent).is.undefined

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      const submoduleResponse = await submoduleResponsePromise;
      expect(submoduleResponse).is.deep.equal(ID5_JSON_RESPONSE);
    });

    it('should call the ID5 server with us privacy consent', async function () {
      const usPrivacyString = '1YN-';
      uspDataHandler.setConsentData(usPrivacyString)
      const xhrServerMock = new XhrServerMock(server)
      const consentData = {
        gdprApplies: true,
        consentString: 'consentString',
        vendorData: ALLOWED_ID5_VENDOR_DATA
      }

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), consentData, undefined);

      const fetchRequest = await xhrServerMock.expectFetchRequest()
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
      expect(requestBody.us_privacy).to.eq(usPrivacyString);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      const submoduleResponse = await submoduleResponsePromise;
      expect(submoduleResponse).is.deep.equal(ID5_JSON_RESPONSE);
    });

    it('should call the ID5 server with no signature field when no stored object', async function () {
      const xhrServerMock = new XhrServerMock(server)

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), undefined, undefined);

      const fetchRequest = await xhrServerMock.expectFetchRequest()
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.s).is.undefined;

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server for config with submodule config object', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const id5FetchConfig = getId5FetchConfig();
      id5FetchConfig.params.extraParam = {
        x: 'X',
        y: {
          a: 1,
          b: '3'
        }
      }

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5FetchConfig, undefined, undefined);

      const configRequest = await xhrServerMock.expectConfigRequest();
      const requestBody = JSON.parse(configRequest.requestBody);
      expect(requestBody).is.deep.eq(id5FetchConfig)

      const fetchRequest = await xhrServerMock.respondWithConfigAndExpectNext(configRequest)
      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server for config with partner id being a string', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const id5FetchConfig = getId5FetchConfig();
      id5FetchConfig.params.partner = '173';

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5FetchConfig, undefined, undefined);

      const configRequest = await xhrServerMock.expectConfigRequest();
      const requestBody = JSON.parse(configRequest.requestBody)
      expect(requestBody.params.partner).is.eq(173)

      const fetchRequest = await xhrServerMock.respondWithConfigAndExpectNext(configRequest)
      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server for config with overridden url', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const id5FetchConfig = getId5FetchConfig();
      id5FetchConfig.params.configUrl = 'http://localhost/x/y/z'

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5FetchConfig, undefined, undefined);

      const configRequest = await xhrServerMock.expectFirstRequest();
      expect(configRequest.url).is.eq('http://localhost/x/y/z');

      const fetchRequest = await xhrServerMock.respondWithConfigAndExpectNext(configRequest)
      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with additional data when provided', async function () {
      const xhrServerMock = new XhrServerMock(server)

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), undefined, undefined);

      const configRequest = await xhrServerMock.expectConfigRequest();
      const fetchRequest = await xhrServerMock.respondWithConfigAndExpectNext(configRequest, {
        fetchCall: {
          url: ID5_ENDPOINT,
          overrides: {
            arg1: '123',
            arg2: {
              x: '1',
              y: 2
            }
          }
        }
      });
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
      expect(requestBody.o).is.eq('pbjs');
      expect(requestBody.v).is.eq('$prebid.version$');
      expect(requestBody.arg1).is.eq('123')
      expect(requestBody.arg2).is.deep.eq({
        x: '1',
        y: 2
      })

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with extensions', async function () {
      const xhrServerMock = new XhrServerMock(server)

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), undefined, undefined);

      const configRequest = await xhrServerMock.expectConfigRequest();
      const extensionsRequest = await xhrServerMock.respondWithConfigAndExpectNext(configRequest, {
        fetchCall: {
          url: ID5_ENDPOINT
        },
        extensionsCall: {
          url: ID5_EXTENSIONS_ENDPOINT,
          method: 'GET'
        }
      });
      expect(extensionsRequest.url).is.eq(ID5_EXTENSIONS_ENDPOINT)
      expect(extensionsRequest.method).is.eq('GET')

      extensionsRequest.respond(200, responseHeader, JSON.stringify({
        lb: 'ex'
      }));
      const fetchRequest = await xhrServerMock.expectNextRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
      expect(requestBody.o).is.eq('pbjs');
      expect(requestBody.v).is.eq('$prebid.version$');
      expect(requestBody.extensions).is.deep.eq({
        lb: 'ex'
      })

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with extensions fetched using method POST', async function () {
      const xhrServerMock = new XhrServerMock(server)

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), undefined, undefined);

      const configRequest = await xhrServerMock.expectConfigRequest();
      const extensionsRequest = await xhrServerMock.respondWithConfigAndExpectNext(configRequest, {
        fetchCall: {
          url: ID5_ENDPOINT
        },
        extensionsCall: {
          url: ID5_EXTENSIONS_ENDPOINT,
          method: 'POST',
          body: {
            x: '1',
            y: 2
          }
        }
      });
      expect(extensionsRequest.url).is.eq(ID5_EXTENSIONS_ENDPOINT)
      expect(extensionsRequest.method).is.eq('POST')
      const extRequestBody = JSON.parse(extensionsRequest.requestBody)
      expect(extRequestBody).is.deep.eq({
        x: '1',
        y: 2
      })
      extensionsRequest.respond(200, responseHeader, JSON.stringify({
        lb: 'post',
      }));

      const fetchRequest = await xhrServerMock.expectNextRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
      expect(requestBody.o).is.eq('pbjs');
      expect(requestBody.v).is.eq('$prebid.version$');
      expect(requestBody.extensions).is.deep.eq({
        lb: 'post'
      });

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with signature field from stored object', async function () {
      const xhrServerMock = new XhrServerMock(server)

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), undefined, ID5_STORED_OBJ);

      const fetchRequest = await xhrServerMock.expectFetchRequest()
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.s).is.eq(ID5_STORED_SIGNATURE);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with pd field when pd config is set', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const pubData = 'b50ca08271795a8e7e4012813f23d505193d75c0f2e2bb99baa63aa822f66ed3';

      const id5Config = getId5FetchConfig();
      id5Config.params.pd = pubData;

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5Config, undefined, undefined);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.pd).is.eq(pubData);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with no pd field when pd config is not set', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const id5Config = getId5FetchConfig();
      id5Config.params.pd = undefined;

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5Config, undefined, ID5_STORED_OBJ);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.pd).is.undefined;

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with nb=1 when no stored value exists and reset after', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const TEST_PARTNER_ID = 189;
      coreStorage.removeDataFromLocalStorage(id5System.nbCacheName(TEST_PARTNER_ID));

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), undefined, ID5_STORED_OBJ);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.nbPage).is.eq(1);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;

      expect(id5System.getNbFromCache(TEST_PARTNER_ID)).is.eq(0);
    });

    it('should call the ID5 server with incremented nb when stored value exists and reset after', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const TEST_PARTNER_ID = 189;
      const config = getId5FetchConfig(TEST_PARTNER_ID);
      id5System.storeNbInCache(TEST_PARTNER_ID, 1);

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(config, undefined, ID5_STORED_OBJ);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.nbPage).is.eq(2);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;

      expect(id5System.getNbFromCache(TEST_PARTNER_ID)).is.eq(0);
    });

    it('should call the ID5 server with ab_testing object when abTesting is turned on', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const id5Config = getId5FetchConfig();
      id5Config.params.abTesting = {enabled: true, controlGroupPct: 0.234}

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5Config, undefined, ID5_STORED_OBJ);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.ab_testing.enabled).is.eq(true);
      expect(requestBody.ab_testing.control_group_pct).is.eq(0.234);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server without ab_testing object when abTesting is turned off', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const id5Config = getId5FetchConfig();
      id5Config.params.abTesting = {enabled: false, controlGroupPct: 0.55}

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5Config, undefined, ID5_STORED_OBJ);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.ab_testing).is.undefined;

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server without ab_testing when when abTesting is not set', async function () {
      const xhrServerMock = new XhrServerMock(server)
      const id5Config = getId5FetchConfig();

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5Config, undefined, ID5_STORED_OBJ);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.ab_testing).is.undefined;

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should store the privacy object from the ID5 server response', async function () {
      const xhrServerMock = new XhrServerMock(server)

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), undefined, ID5_STORED_OBJ);

      const privacy = {
        jurisdiction: 'gdpr',
        id5_consent: true
      };

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const responseObject = utils.deepClone(ID5_JSON_RESPONSE);
      responseObject.privacy = privacy;

      fetchRequest.respond(200, responseHeader, JSON.stringify(responseObject));
      await submoduleResponsePromise;

      expect(id5System.getFromLocalStorage(id5System.ID5_PRIVACY_STORAGE_NAME)).is.eq(JSON.stringify(privacy));
      coreStorage.removeDataFromLocalStorage(id5System.ID5_PRIVACY_STORAGE_NAME);
    });

    it('should not store a privacy object if not part of ID5 server response', async function () {
      const xhrServerMock = new XhrServerMock(server);
      coreStorage.removeDataFromLocalStorage(id5System.ID5_PRIVACY_STORAGE_NAME);

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), undefined, ID5_STORED_OBJ);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const responseObject = utils.deepClone(ID5_JSON_RESPONSE);
      responseObject.privacy = undefined;

      fetchRequest.respond(200, responseHeader, JSON.stringify(responseObject));
      await submoduleResponsePromise;

      expect(id5System.getFromLocalStorage(id5System.ID5_PRIVACY_STORAGE_NAME)).is.null;
    });

    describe('with successful external module call', function() {
      const MOCK_RESPONSE = {
        ...ID5_JSON_RESPONSE,
        universal_uid: 'my_mock_reponse'
      };
      let mockId5ExternalModule;

      beforeEach(() => {
        window.id5Prebid = {
          integration: {
            fetchId5Id: function() {}
          }
        };
        mockId5ExternalModule = sinon.stub(window.id5Prebid.integration, 'fetchId5Id')
          .resolves(MOCK_RESPONSE);
      });

      this.afterEach(() => {
        mockId5ExternalModule.restore();
        delete window.id5Prebid;
      });

      it('should retrieve the response from the external module interface', async function() {
        const xhrServerMock = new XhrServerMock(server);
        const config = getId5FetchConfig();
        config.params.externalModuleUrl = 'https://test-me.test';

        // Trigger the fetch but we await on it later
        const submoduleResponsePromise = callSubmoduleGetId(config, undefined, undefined);

        const configRequest = await xhrServerMock.expectConfigRequest();
        configRequest.respond(200, HEADERS_CONTENT_TYPE_JSON, JSON.stringify(ID5_API_CONFIG));

        const submoduleResponse = await submoduleResponsePromise;
        expect(submoduleResponse).to.deep.equal(MOCK_RESPONSE);
        expect(mockId5ExternalModule.calledOnce);
      });
    });

    describe('with failing external module loading', function() {
      it('should fallback to regular logic if external module fails to load', async function() {
        const xhrServerMock = new XhrServerMock(server);
        const config = getId5FetchConfig();
        config.params.externalModuleUrl = 'https://test-me.test'; // Fails by loading this fake URL

        // Trigger the fetch but we await on it later
        const submoduleResponsePromise = callSubmoduleGetId(config, undefined, undefined);

        // Still we have a server-side request triggered as fallback
        const fetchRequest = await xhrServerMock.expectFetchRequest();
        fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

        const submoduleResponse = await submoduleResponsePromise;
        expect(submoduleResponse).to.deep.equal(ID5_JSON_RESPONSE);
      });
    });

    it('should pass gpp_string and gpp_sid to ID5 server', function () {
      let xhrServerMock = new XhrServerMock(server)
      gppStub = sinon.stub(gppDataHandler, 'getConsentData');
      gppStub.returns({
        ready: true,
        gppString: 'GPP_STRING',
        applicableSections: [2]
      });
      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, ID5_STORED_OBJ);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.gpp_string).is.equal('GPP_STRING');
          expect(requestBody.gpp_sid).contains(2);
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        });
    });

    describe('when legacy cookies are set', () => {
      let sandbox;
      beforeEach(() => {
        sandbox = sinon.sandbox.create();
        sandbox.stub(id5System.storage, 'getCookie');
      });
      afterEach(() => {
        sandbox.restore();
      });
      it('should not throw if malformed JSON is forced into cookies', () => {
        id5System.storage.getCookie.callsFake(() => ' Not JSON ');
        id5System.id5IdSubmodule.getId(getId5FetchConfig());
      });
    })
  });

  describe('Local storage', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.sandbox.create();
      sandbox.stub(id5System.storage, 'localStorageIsEnabled');
    });
    afterEach(() => {
      sandbox.restore();
    });
    [
      [true, 1],
      [false, 0]
    ].forEach(([isEnabled, expectedValue]) => {
      it(`should check localStorage availability and log in request. Available=${isEnabled}`, async function() {
        const xhrServerMock = new XhrServerMock(server)
        id5System.storage.localStorageIsEnabled.callsFake(() => isEnabled)

        // Trigger the fetch but we await on it later
        const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), undefined, ID5_STORED_OBJ);

        const fetchRequest = await xhrServerMock.expectFetchRequest();
        const requestBody = JSON.parse(fetchRequest.requestBody);
        expect(requestBody.localStorage).is.eq(expectedValue);

        fetchRequest.respond(200, HEADERS_CONTENT_TYPE_JSON, JSON.stringify(ID5_JSON_RESPONSE));
        const submoduleResponse = await submoduleResponsePromise;
        expect(submoduleResponse).is.deep.equal(ID5_JSON_RESPONSE);
      });
    });
  });

  describe('Request Bids Hook', function () {
    let adUnits;
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      mockGdprConsent(sandbox);
      sinon.stub(events, 'getEvents').returns([]);
      coreStorage.removeDataFromLocalStorage(id5System.ID5_STORAGE_NAME);
      coreStorage.removeDataFromLocalStorage(`${id5System.ID5_STORAGE_NAME}_last`);
      coreStorage.removeDataFromLocalStorage(id5System.nbCacheName(ID5_TEST_PARTNER_ID));
      coreStorage.setDataInLocalStorage(id5System.ID5_STORAGE_NAME + '_cst', getConsentHash())
      adUnits = [getAdUnitMock()];
    });
    afterEach(function () {
      events.getEvents.restore();
      coreStorage.removeDataFromLocalStorage(id5System.ID5_STORAGE_NAME);
      coreStorage.removeDataFromLocalStorage(`${id5System.ID5_STORAGE_NAME}_last`);
      coreStorage.removeDataFromLocalStorage(id5System.nbCacheName(ID5_TEST_PARTNER_ID));
      coreStorage.removeDataFromLocalStorage(id5System.ID5_STORAGE_NAME + '_cst')
      sandbox.restore();
    });

    it('should add stored ID from cache to bids', function (done) {
      id5System.storeInLocalStorage(id5System.ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);

      init(config);
      setSubmoduleRegistry([id5System.id5IdSubmodule]);
      config.setConfig(getFetchLocalStorageConfig());

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property(`userId.${ID5_EIDS_NAME}`);
            expect(bid.userId.id5id.uid).is.equal(ID5_STORED_ID);
            expect(bid.userIdAsEids[0]).is.deep.equal({
              source: ID5_SOURCE,
              uids: [{
                id: ID5_STORED_ID,
                atype: 1,
                ext: {
                  linkType: ID5_STORED_LINK_TYPE
                }
              }]
            });
          });
        });
        done();
      }, {adUnits});
    });

    it('should add stored EUID from cache to bids', function (done) {
      id5System.storeInLocalStorage(id5System.ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ_WITH_EUID), 1);

      init(config);
      setSubmoduleRegistry([id5System.id5IdSubmodule]);
      config.setConfig(getFetchLocalStorageConfig());

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property(`userId.euid`);
            expect(bid.userId.euid.uid).is.equal(EUID_STORED_ID);
            expect(bid.userIdAsEids[0].uids[0].id).is.equal(ID5_STORED_ID);
            expect(bid.userIdAsEids[1]).is.deep.equal({
              source: EUID_SOURCE,
              uids: [{
                id: EUID_STORED_ID,
                atype: 3,
                ext: {
                  provider: ID5_SOURCE
                }
              }]
            })
          });
        });
        done();
      }, {adUnits});
    });

    it('should add config value ID to bids', function (done) {
      init(config);
      setSubmoduleRegistry([id5System.id5IdSubmodule]);
      config.setConfig(getValueConfig(ID5_STORED_ID));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property(`userId.${ID5_EIDS_NAME}`);
            expect(bid.userId.id5id.uid).is.equal(ID5_STORED_ID);
            expect(bid.userIdAsEids[0]).is.deep.equal({
              source: ID5_SOURCE,
              uids: [{id: ID5_STORED_ID, atype: 1}]
            });
          });
        });
        done();
      }, {adUnits});
    });

    it('should set nb=1 in cache when no stored nb value exists and cached ID', function (done) {
      id5System.storeInLocalStorage(id5System.ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);
      coreStorage.removeDataFromLocalStorage(id5System.nbCacheName(ID5_TEST_PARTNER_ID));

      init(config);
      setSubmoduleRegistry([id5System.id5IdSubmodule]);
      config.setConfig(getFetchLocalStorageConfig());

      requestBidsHook((adUnitConfig) => {
        expect(id5System.getNbFromCache(ID5_TEST_PARTNER_ID)).is.eq(1);
        done()
      }, {adUnits});
    });

    it('should increment nb in cache when stored nb value exists and cached ID', function (done) {
      id5System.storeInLocalStorage(id5System.ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);
      id5System.storeNbInCache(ID5_TEST_PARTNER_ID, 1);

      init(config);
      setSubmoduleRegistry([id5System.id5IdSubmodule]);
      config.setConfig(getFetchLocalStorageConfig());

      requestBidsHook(() => {
        expect(id5System.getNbFromCache(ID5_TEST_PARTNER_ID)).is.eq(2);
        done()
      }, {adUnits});
    });

    it('should call ID5 servers with signature and incremented nb post auction if refresh needed', function () {
      const xhrServerMock = new XhrServerMock(server)
      const initialLocalStorageValue = JSON.stringify(ID5_STORED_OBJ);
      id5System.storeInLocalStorage(id5System.ID5_STORAGE_NAME, initialLocalStorageValue, 1);
      id5System.storeInLocalStorage(`${id5System.ID5_STORAGE_NAME}_last`, id5System.expDaysStr(-1), 1);

      id5System.storeNbInCache(ID5_TEST_PARTNER_ID, 1);
      let id5Config = getFetchLocalStorageConfig();
      id5Config.userSync.userIds[0].storage.refreshInSeconds = 2;
      init(config);
      setSubmoduleRegistry([id5System.id5IdSubmodule]);
      config.setConfig(id5Config);

      return new Promise((resolve) => {
        requestBidsHook(() => {
          resolve()
        }, {adUnits});
      }).then(() => {
        expect(xhrServerMock.hasReceivedAnyRequest()).is.false;
        events.emit(EVENTS.AUCTION_END, {});
        return xhrServerMock.expectFetchRequest();
      }).then(request => {
        const requestBody = JSON.parse(request.requestBody);
        expect(requestBody.s).is.eq(ID5_STORED_SIGNATURE);
        expect(requestBody.nbPage).is.eq(2);
        expect(id5System.getNbFromCache(ID5_TEST_PARTNER_ID)).is.eq(0);
        request.respond(200, HEADERS_CONTENT_TYPE_JSON, JSON.stringify(ID5_JSON_RESPONSE));

        return new Promise(function (resolve) {
          (function waitForCondition() {
            if (id5System.getFromLocalStorage(id5System.ID5_STORAGE_NAME) !== initialLocalStorageValue) return resolve();
            setTimeout(waitForCondition, 30);
          })();
        })
      }).then(() => {
        expect(decodeURIComponent(id5System.getFromLocalStorage(id5System.ID5_STORAGE_NAME))).is.eq(JSON.stringify(ID5_JSON_RESPONSE));
        expect(id5System.getNbFromCache(ID5_TEST_PARTNER_ID)).is.eq(0);
      })
    });
  });

  describe('Decode stored object', function () {
    const expectedDecodedObject = {id5id: {uid: ID5_STORED_ID, ext: {linkType: ID5_STORED_LINK_TYPE}}};

    it('should properly decode from a stored object', function () {
      expect(id5System.id5IdSubmodule.decode(ID5_STORED_OBJ, getId5FetchConfig())).is.deep.equal(expectedDecodedObject);
    });
    it('should return undefined if passed a string', function () {
      expect(id5System.id5IdSubmodule.decode('somestring', getId5FetchConfig())).is.eq(undefined);
    });
    it('should decode euid from a stored object with EUID', function () {
      expect(id5System.id5IdSubmodule.decode(ID5_STORED_OBJ_WITH_EUID, getId5FetchConfig()).euid).is.deep.equal({
        'source': EUID_SOURCE,
        'uid': EUID_STORED_ID,
        'ext': {'provider': ID5_SOURCE}
      });
    });
  });

  describe('A/B Testing', function () {
    const expectedDecodedObjectWithIdAbOff = {id5id: {uid: ID5_STORED_ID, ext: {linkType: ID5_STORED_LINK_TYPE}}};
    const expectedDecodedObjectWithIdAbOn = {
      id5id: {
        uid: ID5_STORED_ID,
        ext: {linkType: ID5_STORED_LINK_TYPE, abTestingControlGroup: false}
      }
    };
    const expectedDecodedObjectWithoutIdAbOn = {id5id: {uid: '', ext: {linkType: 0, abTestingControlGroup: true}}};
    let testConfig, storedObject;

    beforeEach(function () {
      testConfig = getId5FetchConfig();
      storedObject = utils.deepClone(ID5_STORED_OBJ);
    });

    describe('A/B Testing Config is Set', function () {
      let randStub;

      beforeEach(function () {
        randStub = sinon.stub(Math, 'random').callsFake(function () {
          return 0.25;
        });
      });
      afterEach(function () {
        randStub.restore();
      });

      describe('Decode', function () {
        let logErrorSpy;

        beforeEach(function () {
          logErrorSpy = sinon.spy(utils, 'logError');
        });
        afterEach(function () {
          logErrorSpy.restore();
        });

        it('should not set abTestingControlGroup extension when A/B testing is off', function () {
          const decoded = id5System.id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).is.deep.equal(expectedDecodedObjectWithIdAbOff);
        });

        it('should set abTestingControlGroup to false when A/B testing is on but in normal group', function () {
          storedObject.ab_testing = {result: 'normal'};
          const decoded = id5System.id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).is.deep.equal(expectedDecodedObjectWithIdAbOn);
        });

        it('should not expose ID when everyone is in control group', function () {
          storedObject.ab_testing = {result: 'control'};
          storedObject.universal_uid = '';
          storedObject.ext = {
            'linkType': 0
          };
          const decoded = id5System.id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).is.deep.equal(expectedDecodedObjectWithoutIdAbOn);
        });

        it('should log A/B testing errors', function () {
          storedObject.ab_testing = {result: 'error'};
          const decoded = id5System.id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).is.deep.equal(expectedDecodedObjectWithIdAbOff);
          sinon.assert.calledOnce(logErrorSpy);
        });
      });
    });
  });
});
