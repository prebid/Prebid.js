import * as id5System from '../../../modules/id5IdSystem.js';
import {
  attachIdSystem,
  coreStorage,
  getConsentHash,
  init,
  setSubmoduleRegistry,
  startAuctionHook
} from '../../../modules/userId/index.ts';
import {config} from '../../../src/config.js';
import * as events from '../../../src/events.js';
import {EVENTS} from '../../../src/constants.js';
import * as utils from '../../../src/utils.js';
import {deepClone} from '../../../src/utils.js';
import '../../../src/prebid.js';
import {hook} from '../../../src/hook.js';
import {mockGdprConsent} from '../../helpers/consentData.js';
import {server} from '../../mocks/xhr.js';
import {expect} from 'chai';
import {PbPromise} from '../../../src/utils/promise.js';
import {createEidsArray} from '../../../modules/userId/eids.js';

describe('ID5 ID System', function () {
  let logInfoStub;
  before(function () {
    logInfoStub = sinon.stub(utils, 'logInfo');
  });
  after(function () {
    logInfoStub.restore();
  });
  const ID5_MODULE_NAME = 'id5Id';
  const ID5_SOURCE = 'id5-sync.com';
  const TRUE_LINK_SOURCE = 'true-link-id5-sync.com';
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
    ...deepClone(ID5_STORED_OBJ),
    'ext': {
      'euid': {
        'source': EUID_SOURCE,
        'uids': [{
          'id': EUID_STORED_ID,
          'aType': 3
        }]
      }
    }
  };
  const TRUE_LINK_STORED_ID = 'TRUE_LINK_1';
  const ID5_STORED_OBJ_WITH_TRUE_LINK = {
    ...deepClone(ID5_STORED_OBJ),
    publisherTrueLinkId: TRUE_LINK_STORED_ID
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
  const IDS_ID5ID = {
    eid: {
      source: 'id5-sync.com',
      uids: [{
        id: 'ID5ID-value',
        atype: 1,
        ext: {
          linkType: 1,
          pba: 12
        }
      }]
    }
  };
  const IDS_TRUE_LINK_ID = {
    eid: {
      source: 'true-link-id5-sync.com',
      inserter: 'id5-sync.com',
      matcher: 'id5-sync.com',
      mm: 1,
      uids: [{
        id: 'truelink-id-value',
        atype: 1
      }]
    }
  };

  const IDS_EUID = {
    eid: {
      source: EUID_SOURCE,
      inserter: 'id5-sync.com',
      matcher: 'id5-sync.com',
      mm: 2,
      uids: [{
        atype: 3,
        id: 'euid-value',
        ext: {
          provider: 'id5-sync.com'
        }
      }]
    }
  };

  const ID5_STORED_OBJ_WITH_IDS_ID5ID_ONLY = {
    ...deepClone(ID5_STORED_OBJ),
    ids: {
      id5id: IDS_ID5ID
    }
  };

  const ID5_STORED_OBJ_WITH_IDS_ALL = {
    ...deepClone(ID5_STORED_OBJ),
    ids: {
      id5id: IDS_ID5ID,
      trueLinkId: IDS_TRUE_LINK_ID,
      euid: IDS_EUID
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
  };

  const HEADERS_CONTENT_TYPE_JSON = {
    'Content-Type': 'application/json'
  };

  function expDaysStr(expDays) {
    return (new Date(Date.now() + (1000 * 60 * 60 * 24 * expDays))).toUTCString();
  }

  function storeInStorage(key, value, expDays) {
    id5System.storage.setDataInLocalStorage(`${key}_exp`, expDaysStr(expDays));
    id5System.storage.setDataInLocalStorage(`${key}`, value);
  }

  /**
   *
   * @param partner
   * @param storageName
   * @param storageType
   */
  function getId5FetchConfig(partner = ID5_TEST_PARTNER_ID, storageName = id5System.ID5_STORAGE_NAME, storageType = 'html5') {
    return {
      name: ID5_MODULE_NAME,
      params: {
        partner: partner
      },
      storage: {
        name: storageName,
        type: storageType,
        expires: 90
      }
    };
  }

  function getUserSyncConfig(userIds) {
    return {
      userSync: {
        userIds: userIds,
        syncDelay: 0
      }
    };
  }

  function getFetchLocalStorageConfig() {
    return getUserSyncConfig([getId5FetchConfig()]);
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
    return callbackPromise(id5System.id5IdSubmodule.getId(config, consentData, cacheIdObj));
  }

  /**
   *
   * @param response
   * @returns {Promise<unknown>}
   */
  function callbackPromise(response) {
    return new PbPromise((resolve) => {
      response.callback((response) => {
        resolve(response);
      });
    });
  }

  function wrapAsyncExpects(done, expectsFn) {
    return function () {
      try {
        expectsFn();
      } catch (err) {
        done(err);
      }
    };
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
      expect(configRequest.withCredentials).is.eq(true);
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
      const server = this.server;
      return new PbPromise((resolve) => {
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
    id5System.id5IdSubmodule._reset();
  });

  describe('ExtendId', function () {
    it('should increase the nbPage only for configured partner if response for partner is in cache', function () {
      const configForPartner = getId5FetchConfig(1);
      const nbForPartner = 2;
      const configForOtherPartner = getId5FetchConfig(2);
      const nbForOtherPartner = 4;

      let storedObject = id5PrebidResponse(
        ID5_STORED_OBJ, configForPartner, nbForPartner,
        ID5_STORED_OBJ, configForOtherPartner, nbForOtherPartner
      );
      const response = id5System.id5IdSubmodule.extendId(configForPartner, undefined, storedObject);
      let expectedObject = id5PrebidResponse(
        ID5_STORED_OBJ, configForPartner, nbForPartner + 1,
        ID5_STORED_OBJ, configForOtherPartner, nbForOtherPartner
      );
      expect(response.id).is.eql(expectedObject);
    });

    it('should call getId if response for partner is not in cache - old version response in cache', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const configForPartner = getId5FetchConfig(1);

      const responsePromise = callbackPromise(id5System.id5IdSubmodule.extendId(configForPartner, undefined, deepClone(ID5_STORED_OBJ)));

      const fetchRequest = await xhrServerMock.expectFetchRequest();

      expect(fetchRequest.url).to.contain(ID5_ENDPOINT);
      expect(fetchRequest.withCredentials).is.true;

      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.partner).is.eq(configForPartner.params.partner);
      expect(requestBody.s).is.eq(ID5_STORED_OBJ.signature); // old signature

      fetchRequest.respond(200, HEADERS_CONTENT_TYPE_JSON, JSON.stringify(ID5_JSON_RESPONSE));
      const response = await responsePromise;
      expect(response).is.eql({  // merged old with new response
        ...deepClone(ID5_STORED_OBJ),
        ...(id5PrebidResponse(ID5_JSON_RESPONSE, configForPartner))
      });
    });

    it('should call getId if response for partner is not in cache - other partners response in cache', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const configForPartner = getId5FetchConfig(1);
      const configForOtherPartner = getId5FetchConfig(2);
      let storedObject = id5PrebidResponse(ID5_STORED_OBJ, configForOtherPartner, 2);
      const responsePromise = callbackPromise(id5System.id5IdSubmodule.extendId(configForPartner, undefined, storedObject));

      const fetchRequest = await xhrServerMock.expectFetchRequest();

      expect(fetchRequest.url).to.contain(ID5_ENDPOINT);
      expect(fetchRequest.withCredentials).is.true;

      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.partner).is.eq(configForPartner.params.partner);
      expect(requestBody.s).is.undefined; // no signature found for this partner

      fetchRequest.respond(200, HEADERS_CONTENT_TYPE_JSON, JSON.stringify(ID5_JSON_RESPONSE));
      const response = await responsePromise;
      expect(response).is.eql(id5PrebidResponse( // merged for both partners
        ID5_JSON_RESPONSE, configForPartner, undefined,
        ID5_STORED_OBJ, configForOtherPartner, 2
      ));
      expect(response.signature).is.eql(ID5_JSON_RESPONSE.signature); // overwrite signature to be most recent
    });

    ['string', 1, undefined, {}].forEach((value) => {
      it('should call getId if response for partner is not in cache - invalid value (' + value + ') in cache', async function () {
        const xhrServerMock = new XhrServerMock(server);
        const configForPartner = getId5FetchConfig(1);

        const responsePromise = callbackPromise(id5System.id5IdSubmodule.extendId(configForPartner, undefined, value));

        const fetchRequest = await xhrServerMock.expectFetchRequest();

        expect(fetchRequest.url).to.contain(ID5_ENDPOINT);
        expect(fetchRequest.withCredentials).is.true;

        const requestBody = JSON.parse(fetchRequest.requestBody);
        expect(requestBody.partner).is.eq(configForPartner.params.partner);

        fetchRequest.respond(200, HEADERS_CONTENT_TYPE_JSON, JSON.stringify(ID5_JSON_RESPONSE));
        const response = await responsePromise;
        expect(response).is.eql(id5PrebidResponse(ID5_JSON_RESPONSE, configForPartner));
      });
    });
  });

  describe('Check for valid publisher config', function () {
    it('should fail with invalid config', function () {
      // no config
      expect(id5System.id5IdSubmodule.getId()).is.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({})).is.eq(undefined);

      // valid params, invalid id5System.storage
      expect(id5System.id5IdSubmodule.getId({params: {partner: 123}})).to.be.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({params: {partner: 123}, storage: {}})).to.be.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({params: {partner: 123}, storage: {name: ''}})).to.be.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({params: {partner: 123}, storage: {type: ''}})).to.be.eq(undefined);

      // valid id5System.storage, invalid params
      expect(id5System.id5IdSubmodule.getId({storage: {name: 'name', type: 'html5'}})).to.be.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({storage: {name: 'name', type: 'html5'}, params: {}})).to.be.eq(undefined);
      expect(id5System.id5IdSubmodule.getId({
        storage: {name: 'name', type: 'html5'},
        params: {partner: 'abc'}
      })).to.be.eq(undefined);
    });

    it('should warn with non-recommended id5System.storage params', function () {
      const logWarnStub = sinon.stub(utils, 'logWarn');

      id5System.id5IdSubmodule.getId({storage: {name: 'name', type: 'html5'}, params: {partner: 123}});
      expect(logWarnStub.calledOnce).to.be.true;
      logWarnStub.restore();

      id5System.id5IdSubmodule.getId({
        storage: {name: id5System.ID5_STORAGE_NAME, type: 'cookie'},
        params: {partner: 123}
      });
      expect(logWarnStub.calledOnce).to.be.true;
      logWarnStub.restore();
    });
  });

  describe('Check for valid consent', function () {
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

    dataConsentVals.forEach(function ([purposeConsent, vendorConsent, caseName]) {
      it('should fail with invalid consent because of ' + caseName, function () {
        const dataConsent = {
          gdprApplies: true,
          consentString: 'consentString',
          vendorData: {
            purposeConsent, vendorConsent
          }
        };
        expect(id5System.id5IdSubmodule.getId(config, {gdpr: dataConsent})).is.eq(undefined);

        const cacheIdObject = 'cacheIdObject';
        expect(id5System.id5IdSubmodule.extendId(config, {gdpr: dataConsent}, cacheIdObject)).is.eql({id: cacheIdObject});
      });
    });
  });

  describe('Xhr Requests from getId()', function () {
    const responseHeader = HEADERS_CONTENT_TYPE_JSON;
    let gppStub;

    beforeEach(function () {
    });

    afterEach(function () {
      gppStub?.restore();
    });

    it('should call the ID5 server and handle a valid response', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const config = getId5FetchConfig();

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(config, undefined, undefined);

      const fetchRequest = await xhrServerMock.expectFetchRequest();

      expect(fetchRequest.url).to.contain(ID5_ENDPOINT);
      expect(fetchRequest.withCredentials).is.true;

      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
      expect(requestBody.o).is.eq('pbjs');
      expect(requestBody.pd).is.undefined;
      expect(requestBody.s).is.undefined;
      expect(requestBody.provider).is.undefined;
      expect(requestBody.v).is.eq('$prebid.version$');
      expect(requestBody.gdpr).is.eq(0);
      expect(requestBody.gdpr_consent).is.undefined;
      expect(requestBody.us_privacy).is.undefined;
      expect(requestBody.storage).is.deep.eq(config.storage);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      const submoduleResponse = await submoduleResponsePromise;
      expect(submoduleResponse).is.eql(id5PrebidResponse(ID5_JSON_RESPONSE, config));
    });

    it('should call the ID5 server with gdpr data ', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const consentData = {
        gdprApplies: true,
        consentString: 'consentString',
        vendorData: ALLOWED_ID5_VENDOR_DATA
      };

      // Trigger the fetch but we await on it later
      const config = getId5FetchConfig();
      const submoduleResponsePromise = callSubmoduleGetId(config, {gdpr: consentData}, undefined);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
      expect(requestBody.gdpr).to.eq(1);
      expect(requestBody.gdpr_consent).is.eq(consentData.consentString);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      const submoduleResponse = await submoduleResponsePromise;
      expect(submoduleResponse).is.eql(id5PrebidResponse(ID5_JSON_RESPONSE, config));
    });

    it('should call the ID5 server without gdpr data when gdpr not applies ', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const consentData = {
        gdprApplies: false,
        consentString: 'consentString'
      };

      // Trigger the fetch but we await on it later
      const config = getId5FetchConfig();
      const submoduleResponsePromise = callSubmoduleGetId(config, consentData, undefined);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.gdpr).to.eq(0);
      expect(requestBody.gdpr_consent).is.undefined;

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      const submoduleResponse = await submoduleResponsePromise;
      expect(submoduleResponse).is.eql(id5PrebidResponse(ID5_JSON_RESPONSE, config));
    });

    it('should call the ID5 server with us privacy consent', async function () {
      const usPrivacyString = '1YN-';
      const xhrServerMock = new XhrServerMock(server);
      const consentData = {
        gdprApplies: true,
        consentString: 'consentString',
        vendorData: ALLOWED_ID5_VENDOR_DATA
      };

      // Trigger the fetch but we await on it later
      const config = getId5FetchConfig();
      const submoduleResponsePromise = callSubmoduleGetId(config, {gdpr: consentData, usp: usPrivacyString}, undefined);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
      expect(requestBody.us_privacy).to.eq(usPrivacyString);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      const submoduleResponse = await submoduleResponsePromise;
      expect(submoduleResponse).is.eql(id5PrebidResponse(ID5_JSON_RESPONSE, config));
    });

    it('should call the ID5 server with no signature field when no stored object', async function () {
      const xhrServerMock = new XhrServerMock(server);

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(getId5FetchConfig(), undefined, undefined);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.s).is.undefined;

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server for config with submodule config object', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const id5FetchConfig = getId5FetchConfig();
      id5FetchConfig.params.extraParam = {
        x: 'X',
        y: {
          a: 1,
          b: '3'
        }
      };

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5FetchConfig, undefined, undefined);

      const configRequest = await xhrServerMock.expectConfigRequest();
      const requestBody = JSON.parse(configRequest.requestBody);
      expect(requestBody).is.deep.eq({
        ...id5FetchConfig,
        bounce: true
      });

      const fetchRequest = await xhrServerMock.respondWithConfigAndExpectNext(configRequest);
      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server for config with partner id being a string', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const id5FetchConfig = getId5FetchConfig();
      id5FetchConfig.params.partner = '173';

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5FetchConfig, undefined, undefined);

      const configRequest = await xhrServerMock.expectConfigRequest();
      const requestBody = JSON.parse(configRequest.requestBody);
      expect(requestBody.params.partner).is.eq(173);

      const fetchRequest = await xhrServerMock.respondWithConfigAndExpectNext(configRequest);
      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server for config with overridden url', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const id5FetchConfig = getId5FetchConfig();
      id5FetchConfig.params.configUrl = 'http://localhost/x/y/z';

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5FetchConfig, undefined, undefined);

      const configRequest = await xhrServerMock.expectFirstRequest();
      expect(configRequest.url).is.eq('http://localhost/x/y/z');

      const fetchRequest = await xhrServerMock.respondWithConfigAndExpectNext(configRequest);
      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with additional data when provided', async function () {
      const xhrServerMock = new XhrServerMock(server);

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
      expect(requestBody.arg1).is.eq('123');
      expect(requestBody.arg2).is.deep.eq({
        x: '1',
        y: 2
      });

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with extensions', async function () {
      const xhrServerMock = new XhrServerMock(server);

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
      expect(extensionsRequest.url).is.eq(ID5_EXTENSIONS_ENDPOINT);
      expect(extensionsRequest.method).is.eq('GET');

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
      });

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with extensions fetched using method POST', async function () {
      const xhrServerMock = new XhrServerMock(server);

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
      expect(extensionsRequest.url).is.eq(ID5_EXTENSIONS_ENDPOINT);
      expect(extensionsRequest.method).is.eq('POST');
      const extRequestBody = JSON.parse(extensionsRequest.requestBody);
      expect(extRequestBody).is.deep.eq({
        x: '1',
        y: 2
      });
      extensionsRequest.respond(200, responseHeader, JSON.stringify({
        lb: 'post'
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
      const xhrServerMock = new XhrServerMock(server);

      // Trigger the fetch but we await on it later
      const id5Config = getId5FetchConfig();
      const submoduleResponsePromise = callSubmoduleGetId(id5Config, undefined, id5PrebidResponse(ID5_STORED_OBJ, id5Config));

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.s).is.eq(ID5_STORED_SIGNATURE);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with pd field when pd config is set', async function () {
      const xhrServerMock = new XhrServerMock(server);
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
      const xhrServerMock = new XhrServerMock(server);
      const id5Config = getId5FetchConfig();
      id5Config.params.pd = undefined;

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5Config, undefined, oldStoredObject(ID5_STORED_OBJ));

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.pd).is.undefined;

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server with nb=1 when no stored value exists and reset after', async function () {
      const xhrServerMock = new XhrServerMock(server);

      // Trigger the fetch but we await on it later
      let config = getId5FetchConfig();
      const submoduleResponsePromise = callSubmoduleGetId(config, undefined, id5PrebidResponse(ID5_STORED_OBJ, config));

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.nbPage).is.eq(1);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      const response = await submoduleResponsePromise;

      expect(response.nbPage).is.undefined;
    });

    it('should call the ID5 server with incremented nb when stored value exists and reset after', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const TEST_PARTNER_ID = 189;
      const config = getId5FetchConfig(TEST_PARTNER_ID);
      const storedObj = id5PrebidResponse(ID5_STORED_OBJ, config, 1);

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(config, undefined, storedObj);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.nbPage).is.eq(2);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      const response = await submoduleResponsePromise;

      expect(response).is.eql(id5PrebidResponse(ID5_JSON_RESPONSE, config));
    });

    it('should call the ID5 server and keep older version response if provided from cache', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const TEST_PARTNER_ID = 189;
      const config = getId5FetchConfig(TEST_PARTNER_ID);

      // Trigger the fetch but we await on it later
      const cacheIdObj = oldStoredObject(ID5_STORED_OBJ); // older version response
      const submoduleResponsePromise = callSubmoduleGetId(config, undefined, cacheIdObj);

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.nbPage).is.eq(1);
      expect(requestBody.s).is.eq(ID5_STORED_OBJ.signature);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      const response = await submoduleResponsePromise;

      expect(response).is.eql(
        {
          ...deepClone(ID5_STORED_OBJ),
          ...id5PrebidResponse(ID5_JSON_RESPONSE, config)
        });
    })
    ;

    it('should call the ID5 server with ab_testing object when abTesting is turned on', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const id5Config = getId5FetchConfig();
      id5Config.params.abTesting = {enabled: true, controlGroupPct: 0.234};

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5Config, undefined, oldStoredObject(ID5_STORED_OBJ));

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.ab_testing.enabled).is.eq(true);
      expect(requestBody.ab_testing.control_group_pct).is.eq(0.234);

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server without ab_testing object when abTesting is turned off', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const id5Config = getId5FetchConfig();
      id5Config.params.abTesting = {enabled: false, controlGroupPct: 0.55};

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5Config, undefined, oldStoredObject(ID5_STORED_OBJ));

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.ab_testing).is.undefined;

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    it('should call the ID5 server without ab_testing when when abTesting is not set', async function () {
      const xhrServerMock = new XhrServerMock(server);
      const id5Config = getId5FetchConfig();

      // Trigger the fetch but we await on it later
      const submoduleResponsePromise = callSubmoduleGetId(id5Config, undefined, oldStoredObject(ID5_STORED_OBJ));

      const fetchRequest = await xhrServerMock.expectFetchRequest();
      const requestBody = JSON.parse(fetchRequest.requestBody);
      expect(requestBody.ab_testing).is.undefined;

      fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      await submoduleResponsePromise;
    });

    describe('with successful external module call', function () {
      const MOCK_RESPONSE = {
        ...ID5_JSON_RESPONSE,
        universal_uid: 'my_mock_reponse'
      };
      let mockId5ExternalModule;

      beforeEach(() => {
        window.id5Prebid = {
          integration: {
            fetchId5Id: function () {
            }
          }
        };
        mockId5ExternalModule = sinon.stub(window.id5Prebid.integration, 'fetchId5Id')
          .resolves(MOCK_RESPONSE);
      });

      this.afterEach(() => {
        mockId5ExternalModule.restore();
        delete window.id5Prebid;
      });

      it('should retrieve the response from the external module interface', async function () {
        const xhrServerMock = new XhrServerMock(server);
        const config = getId5FetchConfig();
        config.params.externalModuleUrl = 'https://test-me.test';

        // Trigger the fetch but we await on it later
        const submoduleResponsePromise = callSubmoduleGetId(config, undefined, undefined);

        const configRequest = await xhrServerMock.expectConfigRequest();
        configRequest.respond(200, HEADERS_CONTENT_TYPE_JSON, JSON.stringify(ID5_API_CONFIG));

        const submoduleResponse = await submoduleResponsePromise;
        expect(submoduleResponse).to.eql(id5PrebidResponse(MOCK_RESPONSE, config));
        expect(mockId5ExternalModule.calledOnce);
      });
    });

    describe('with failing external module loading', function () {
      it('should fallback to regular logic if external module fails to load', async function () {
        const xhrServerMock = new XhrServerMock(server);
        const config = getId5FetchConfig();
        config.params.externalModuleUrl = 'https://test-me.test'; // Fails by loading this fake URL

        // Trigger the fetch but we await on it later
        const submoduleResponsePromise = callSubmoduleGetId(config, undefined, undefined);

        // Still we have a server-side request triggered as fallback
        const fetchRequest = await xhrServerMock.expectFetchRequest();
        fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

        const submoduleResponse = await submoduleResponsePromise;
        expect(submoduleResponse).to.deep.equal(id5PrebidResponse(ID5_JSON_RESPONSE, config));
      });
    });

    it('should pass gpp_string and gpp_sid to ID5 server', function () {
      const xhrServerMock = new XhrServerMock(server);
      const gppData = {
        ready: true,
        gppString: 'GPP_STRING',
        applicableSections: [2]
      };
      const submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), {gpp: gppData}, oldStoredObject(ID5_STORED_OBJ));

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          const requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.gpp_string).is.equal('GPP_STRING');
          expect(requestBody.gpp_sid).contains(2);
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse;
        });
    });

    describe('when legacy cookies are set', () => {
      let sandbox;
      beforeEach(() => {
        sandbox = sinon.createSandbox();
        sandbox.stub(id5System.storage, 'getCookie');
      });
      afterEach(() => {
        sandbox.restore();
      });
      it('should not throw if malformed JSON is forced into cookies', () => {
        id5System.storage.getCookie.callsFake(() => ' Not JSON ');
        id5System.id5IdSubmodule.getId(getId5FetchConfig());
      });
    });

    it('should pass true link info to ID5 server even when true link is not booted', function () {
      const xhrServerMock = new XhrServerMock(server);
      const submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, oldStoredObject(ID5_STORED_OBJ));

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          const requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.true_link).is.eql({booted: false});
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse;
        });
    });

    it('should pass full true link info to ID5 server when true link is booted', function () {
      const xhrServerMock = new XhrServerMock(server);
      const trueLinkResponse = {booted: true, redirected: true, id: 'TRUE_LINK_ID'};
      window.id5Bootstrap = {
        getTrueLinkInfo: function () {
          return trueLinkResponse;
        }
      };
      const submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, oldStoredObject(ID5_STORED_OBJ));

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          const requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.true_link).is.eql(trueLinkResponse);
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse;
        });
    });
  });

  describe('Local storage', () => {
    let sandbox;
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.stub(id5System.storage, 'localStorageIsEnabled');
    });
    afterEach(() => {
      sandbox.restore();
    });
    [
      [true, 1],
      [false, 0]
    ].forEach(([isEnabled, expectedValue]) => {
      it(`should check localStorage availability and log in request. Available=${isEnabled}`, async function () {
        const xhrServerMock = new XhrServerMock(server);
        id5System.storage.localStorageIsEnabled.callsFake(() => isEnabled);

        // Trigger the fetch but we await on it later
        const config = getId5FetchConfig();
        const submoduleResponsePromise = callSubmoduleGetId(config, undefined, id5PrebidResponse(ID5_STORED_OBJ, config));

        const fetchRequest = await xhrServerMock.expectFetchRequest();
        const requestBody = JSON.parse(fetchRequest.requestBody);
        expect(requestBody.localStorage).is.eq(expectedValue);

        fetchRequest.respond(200, HEADERS_CONTENT_TYPE_JSON, JSON.stringify(ID5_JSON_RESPONSE));
        const submoduleResponse = await submoduleResponsePromise;
        expect(submoduleResponse).is.eql(id5PrebidResponse(ID5_JSON_RESPONSE, config));
      });
    });
  });

  describe('Request Bids Hook', function () {
    let adUnits, ortb2Fragments;
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      mockGdprConsent(sandbox);
      sinon.stub(events, 'getEvents').returns([]);
      coreStorage.removeDataFromLocalStorage(id5System.ID5_STORAGE_NAME);
      coreStorage.removeDataFromLocalStorage(`${id5System.ID5_STORAGE_NAME}_last`);
      coreStorage.setDataInLocalStorage(id5System.ID5_STORAGE_NAME + '_cst', getConsentHash());
      adUnits = [getAdUnitMock()];
      ortb2Fragments = {
        global: {}
      }
    });
    afterEach(function () {
      events.getEvents.restore();
      coreStorage.removeDataFromLocalStorage(id5System.ID5_STORAGE_NAME);
      coreStorage.removeDataFromLocalStorage(`${id5System.ID5_STORAGE_NAME}_last`);
      coreStorage.removeDataFromLocalStorage(id5System.ID5_STORAGE_NAME + '_cst');
      sandbox.restore();
    });

    describe('when old request stored', function () {
      it('should add stored ID from cache to bids', function (done) {
        storeInStorage(id5System.ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);

        init(config);
        setSubmoduleRegistry([id5System.id5IdSubmodule]);
        config.setConfig(getFetchLocalStorageConfig());

        startAuctionHook(wrapAsyncExpects(done, () => {
          expect(ortb2Fragments.global.user.ext.eids[0]).is.eql({
            source: ID5_SOURCE,
            uids: [{
              id: ID5_STORED_ID,
              atype: 1,
              ext: {
                linkType: ID5_STORED_LINK_TYPE
              }
            }]
          });
          done();
        }), {ortb2Fragments});
      });

      it('should add stored EUID from cache to bids', function (done) {
        storeInStorage(id5System.ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ_WITH_EUID), 1);

        init(config);
        setSubmoduleRegistry([id5System.id5IdSubmodule]);
        config.setConfig(getFetchLocalStorageConfig());

        startAuctionHook(function () {
          expect(ortb2Fragments.global.user.ext.eids[0].uids[0].id).is.equal(ID5_STORED_ID);
          expect(ortb2Fragments.global.user.ext.eids[1]).is.eql({
            source: EUID_SOURCE,
            uids: [{
              id: EUID_STORED_ID,
              atype: 3,
              ext: {
                provider: ID5_SOURCE
              }
            }]
          });
          done();
        }, {ortb2Fragments});
      });

      it('should add stored TRUE_LINK_ID from cache to bids', function (done) {
        storeInStorage(id5System.ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ_WITH_TRUE_LINK), 1);

        init(config);
        setSubmoduleRegistry([id5System.id5IdSubmodule]);
        config.setConfig(getFetchLocalStorageConfig());

        startAuctionHook(wrapAsyncExpects(done, function () {
          expect(ortb2Fragments.global.user.ext.eids[1]).is.eql({
            source: TRUE_LINK_SOURCE,
            uids: [{
              id: TRUE_LINK_STORED_ID,
              atype: 1
            }]
          });
          done();
        }), {ortb2Fragments});
      });
    });

    it('should call ID5 servers with signature and incremented nb post auction if refresh needed', function () {
      const xhrServerMock = new XhrServerMock(server);
      const storedObject = ID5_STORED_OBJ;
      storedObject.nbPage = 1;
      const initialLocalStorageValue = JSON.stringify(storedObject);
      storeInStorage(id5System.ID5_STORAGE_NAME, initialLocalStorageValue, 1);
      storeInStorage(`${id5System.ID5_STORAGE_NAME}_last`, expDaysStr(-1), 1);

      const id5Config = getFetchLocalStorageConfig();
      id5Config.userSync.userIds[0].storage.refreshInSeconds = 2;
      id5Config.userSync.auctionDelay = 0; // do not trigger callback before auction
      init(config);
      setSubmoduleRegistry([id5System.id5IdSubmodule]);
      config.setConfig(id5Config);
      return new Promise((resolve) => {
        startAuctionHook(() => {
          resolve();
        }, {adUnits});
      }).then(() => {
        expect(xhrServerMock.hasReceivedAnyRequest()).is.false;
        events.emit(EVENTS.AUCTION_END, {});
        return xhrServerMock.expectFetchRequest();
      }).then(request => {
        const requestBody = JSON.parse(request.requestBody);
        expect(requestBody.s).is.eq(ID5_STORED_SIGNATURE);
        expect(requestBody.nbPage).is.eq(2);
        request.respond(200, HEADERS_CONTENT_TYPE_JSON, JSON.stringify(ID5_JSON_RESPONSE));
      });
    });

    describe('when request with "ids" object stored', function () {
      // FIXME: all these tests involve base userId logic
      // (which already has its own tests, so these make it harder to refactor it)
      it('should add stored ID from cache to bids - from ids', function (done) {
        storeInStorage(id5System.ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ_WITH_IDS_ID5ID_ONLY), 1);

        init(config);
        setSubmoduleRegistry([id5System.id5IdSubmodule]);
        config.setConfig(getFetchLocalStorageConfig());
        const id5IdEidUid = IDS_ID5ID.eid.uids[0];
        startAuctionHook(wrapAsyncExpects(done, () => {
          expect(ortb2Fragments.global.user.ext.eids[0]).is.eql({
            source: IDS_ID5ID.eid.source,
            uids: [{
              id: id5IdEidUid.id,
              atype: id5IdEidUid.atype,
              ext: id5IdEidUid.ext
            }]
          });
          done();
        }), {ortb2Fragments});
      });

      it('should add stored EUID from cache to bids - from ids', function (done) {
        storeInStorage(id5System.ID5_STORAGE_NAME, JSON.stringify({
          ...deepClone(ID5_STORED_OBJ),
          ids: {
            id5id: IDS_ID5ID,
            euid: IDS_EUID
          }
        }), 1);

        init(config);
        setSubmoduleRegistry([id5System.id5IdSubmodule]);
        config.setConfig(getFetchLocalStorageConfig());

        startAuctionHook(wrapAsyncExpects(done, () => {
          const eids = ortb2Fragments.global.user.ext.eids;
          expect(eids[0]).is.eql(IDS_ID5ID.eid);
          expect(eids[1]).is.eql(IDS_EUID.eid);
          done();
        }), {ortb2Fragments});
      });

      it('should add stored TRUE_LINK_ID from cache to bids - from ids', function (done) {
        storeInStorage(id5System.ID5_STORAGE_NAME, JSON.stringify({
          ...deepClone(ID5_STORED_OBJ),
          ids: {
            id5id: IDS_ID5ID,
            trueLinkId: IDS_TRUE_LINK_ID
          }
        }), 1);

        init(config);
        setSubmoduleRegistry([id5System.id5IdSubmodule]);
        config.setConfig(getFetchLocalStorageConfig());

        startAuctionHook(wrapAsyncExpects(done, function () {
          expect(ortb2Fragments.global.user.ext.eids[1]).is.eql(IDS_TRUE_LINK_ID.eid);
          done();
        }), {ortb2Fragments});
      });

      it('should add other id from cache to bids', function (done) {
        storeInStorage(id5System.ID5_STORAGE_NAME, JSON.stringify({
          ...deepClone(ID5_STORED_OBJ),
          ids: {
            id5id: IDS_ID5ID,
            otherId: {
              pbid: {
                uid: 'other-id-value'
              },
              eid: {
                source: 'other-id.com',
                inserter: 'id5-sync.com',
                uids: [{
                  id: 'other-id-value',
                  atype: 2,
                  ext: {
                    provider: 'id5-sync.com'
                  }
                }],

              }
            }
          }
        }), 1);

        init(config);
        setSubmoduleRegistry([id5System.id5IdSubmodule]);
        config.setConfig(getFetchLocalStorageConfig());

        startAuctionHook(wrapAsyncExpects(done, function () {
          expect(ortb2Fragments.global.user.ext.eids[1]).is.eql({
            source: 'other-id.com',
            inserter: 'id5-sync.com',
            uids: [{
              id: 'other-id-value',
              atype: 2,
              ext: {
                provider: 'id5-sync.com'
              }
            }]
          });
          done();
        }), {ortb2Fragments});
      });
    });
  });

  describe('Decode id5response', function () {
    const expectedDecodedObject = {id5id: {uid: ID5_STORED_ID, ext: {linkType: ID5_STORED_LINK_TYPE}}};

    it('should return undefined if passed a string', function () {
      expect(id5System.id5IdSubmodule.decode('somestring', getId5FetchConfig())).is.eq(undefined);
    });

    [
      ['old_storage_format', oldStoredObject],
      ['new_storage_format', id5PrebidResponse]
    ].forEach(([version, responseF]) => {
      describe('Version ' + version, function () {
        let config;
        beforeEach(function () {
          config = getId5FetchConfig();
        })
        it('should properly decode from a stored object', function () {
          expect(id5System.id5IdSubmodule.decode(responseF(ID5_STORED_OBJ, config), config)).is.eql(expectedDecodedObject);
        });

        it('should decode euid from a stored object with EUID', function () {
          expect(id5System.id5IdSubmodule.decode(responseF(ID5_STORED_OBJ_WITH_EUID, config), config).euid).is.eql({
            'source': EUID_SOURCE,
            'uid': EUID_STORED_ID,
            'ext': {'provider': ID5_SOURCE}
          });
        });
        it('should decode trueLinkId from a stored object with trueLinkId', function () {
          expect(id5System.id5IdSubmodule.decode(responseF(ID5_STORED_OBJ_WITH_TRUE_LINK, config), config).trueLinkId).is.eql({
            'uid': TRUE_LINK_STORED_ID
          });
        });

        it('should decode id5id from a stored object with ids', function () {
          expect(id5System.id5IdSubmodule.decode(responseF(ID5_STORED_OBJ_WITH_IDS_ID5ID_ONLY, config), config).id5id).is.eql({
            uid: IDS_ID5ID.eid.uids[0].id,
            ext: IDS_ID5ID.eid.uids[0].ext
          });
        });

        it('should decode all ids from a stored object with ids', function () {
          const decoded = id5System.id5IdSubmodule.decode(responseF(ID5_STORED_OBJ_WITH_IDS_ALL, config), config);
          expect(decoded.id5id).is.eql({
            uid: IDS_ID5ID.eid.uids[0].id,
            ext: IDS_ID5ID.eid.uids[0].ext
          });
          expect(decoded.trueLinkId).is.eql({
            uid: IDS_TRUE_LINK_ID.eid.uids[0].id,
            ext: IDS_TRUE_LINK_ID.eid.uids[0].ext
          });
          expect(decoded.euid).is.eql({
            uid: IDS_EUID.eid.uids[0].id,
            ext: IDS_EUID.eid.uids[0].ext
          });
        });
      });
    });
  });

  describe('Decode should also update GAM tagging if configured', function () {
    let origGoogletag, setTargetingStub, storedObject;
    const targetingEnabledConfig = getId5FetchConfig();
    targetingEnabledConfig.params.gamTargetingPrefix = 'id5';

    beforeEach(function () {
      // Save original window.googletag if it exists
      origGoogletag = window.googletag;
      setTargetingStub = sinon.stub();
      window.googletag = {
        cmd: [],
        pubads: function () {
          return {
            setTargeting: setTargetingStub
          };
        }
      };
      sinon.spy(window.googletag, 'pubads');
      storedObject = utils.deepClone(ID5_STORED_OBJ);
    });

    afterEach(function () {
      // Restore original window.googletag
      if (origGoogletag) {
        window.googletag = origGoogletag;
      } else {
        delete window.googletag;
      }
      id5System.id5IdSubmodule._reset()
    });

    function verifyMultipleTagging(tagsObj) {
      expect(window.googletag.cmd.length).to.be.at.least(1);
      window.googletag.cmd.forEach(cmd => cmd());

      const tagCount = Object.keys(tagsObj).length;
      expect(setTargetingStub.callCount).to.equal(tagCount);

      for (const [tagName, tagValue] of Object.entries(tagsObj)) {
        const fullTagName = `${targetingEnabledConfig.params.gamTargetingPrefix}_${tagName}`;

        const matchingCall = setTargetingStub.getCalls().find(call => call.args[0] === fullTagName);
        expect(matchingCall, `Tag ${fullTagName} was not set`).to.exist;
        expect(matchingCall.args[1]).to.equal(tagValue);
      }

      window.googletag.cmd = [];
      setTargetingStub.reset();
      window.googletag.pubads.resetHistory();
    }

    it('should not set GAM targeting if it is not enabled', function () {
      id5System.id5IdSubmodule.decode(storedObject, getId5FetchConfig());
      expect(window.googletag.cmd).to.have.lengthOf(0)
    })

    it('should not set GAM targeting if not returned from the server', function () {
      let config = utils.deepClone(getId5FetchConfig());
      config.params.gamTargetingPrefix = "id5";
      id5System.id5IdSubmodule.decode(storedObject, getId5FetchConfig());
      expect(window.googletag.cmd).to.have.lengthOf(0)
    })

    it('should set GAM targeting when tags returned if fetch response', function () {
      // Setup
      let config = utils.deepClone(getId5FetchConfig());
      config.params.gamTargetingPrefix = "id5";
      let testObj = {
        ...storedObject,
        "tags": {
          "id": "y",
          "ab": "n",
          "enrich": "y"
        }
      };
      id5System.id5IdSubmodule.decode(testObj, config);

      verifyMultipleTagging({
        'id': 'y',
        'ab': 'n',
        'enrich': 'y'
      });
    })
  })

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
      storedObject = deepClone(ID5_STORED_OBJ);
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
          utils.logError.restore?.();
          logErrorSpy = sinon.spy(utils, 'logError');
        });
        afterEach(function () {
          logErrorSpy.restore();
        });

        it('should not set abTestingControlGroup extension when A/B testing is off', function () {
          const decoded = id5System.id5IdSubmodule.decode(id5PrebidResponse(storedObject, testConfig), testConfig);
          expect(decoded).is.eql(expectedDecodedObjectWithIdAbOff);
        });

        it('should set abTestingControlGroup to false when A/B testing is on but in normal group', function () {
          storedObject.ab_testing = {result: 'normal'};
          const decoded = id5System.id5IdSubmodule.decode(id5PrebidResponse(storedObject, testConfig), testConfig);
          expect(decoded).is.eql(expectedDecodedObjectWithIdAbOn);
        });

        it('should not expose ID when everyone is in control group', function () {
          storedObject.ab_testing = {result: 'control'};
          storedObject.universal_uid = '';
          storedObject.ext = {
            'linkType': 0
          };
          const decoded = id5System.id5IdSubmodule.decode(id5PrebidResponse(storedObject, testConfig), testConfig);
          expect(decoded).is.eql(expectedDecodedObjectWithoutIdAbOn);
        });

        it('should log A/B testing errors', function () {
          storedObject.ab_testing = {result: 'error'};
          const decoded = id5System.id5IdSubmodule.decode(id5PrebidResponse(storedObject, testConfig), testConfig);
          expect(decoded).is.eql(expectedDecodedObjectWithIdAbOff);
          sinon.assert.calledOnce(logErrorSpy);
        });
      });
    });
  });
  describe('eid', () => {
    before(() => {
      attachIdSystem(id5System);
    });
    it('does not include an ext if not provided', function () {
      const userId = {
        id5id: {
          uid: 'some-random-id-value'
        }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'id5-sync.com',
        uids: [{id: 'some-random-id-value', atype: 1}]
      });
    });

    it('includes ext if provided', function () {
      const userId = {
        id5id: {
          uid: 'some-random-id-value',
          ext: {
            linkType: 0
          }
        }
      };
      const newEids = createEidsArray(userId);
      expect(newEids.length).to.equal(1);
      expect(newEids[0]).to.deep.equal({
        source: 'id5-sync.com',
        uids: [{
          id: 'some-random-id-value',
          atype: 1,
          ext: {
            linkType: 0
          }
        }]
      });
    });
  });
});

/**
 *
 * @param response
 * @param config
 * @param nbPage
 * @param otherResponse
 * @param otherConfig
 * @param nbPageOther
 */
function id5PrebidResponse(response, config, nbPage = undefined, otherResponse = undefined, otherConfig = undefined, nbPageOther = undefined) {
  const responseObj = {
    pbjs: {}
  }
  responseObj.pbjs[config.params.partner] = deepClone(response);
  if (nbPage !== undefined) {
    responseObj.pbjs[config.params.partner].nbPage = nbPage;
  }
  Object.assign(responseObj, deepClone(response));
  responseObj.signature = response.signature;
  if (otherConfig) {
    responseObj.pbjs[otherConfig.params.partner] = deepClone(otherResponse);
    if (nbPageOther !== undefined) {
      responseObj.pbjs[otherConfig.params.partner].nbPage = nbPageOther;
    }
  }
  return responseObj
}

function oldStoredObject(response) {
  return deepClone(response);
}
