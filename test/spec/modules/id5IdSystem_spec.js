import {
  expDaysStr,
  getFromLocalStorage,
  getNbFromCache,
  ID5_PRIVACY_STORAGE_NAME,
  ID5_STORAGE_NAME,
  id5IdSubmodule,
  nbCacheName,
  storage,
  storeInLocalStorage,
  storeNbInCache,
} from 'modules/id5IdSystem.js';
import {coreStorage, init, requestBidsHook, setSubmoduleRegistry} from 'modules/userId/index.js';
import {config} from 'src/config.js';
import * as events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils.js';
import {uspDataHandler} from 'src/adapterManager.js';
import 'src/prebid.js';
import {hook} from '../../../src/hook.js';
import {mockGdprConsent} from '../../helpers/consentData.js';

let expect = require('chai').expect;

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
  const ID5_NB_STORAGE_NAME = nbCacheName(ID5_TEST_PARTNER_ID);
  const ID5_STORED_ID = 'storedid5id';
  const ID5_STORED_SIGNATURE = '123456';
  const ID5_STORED_LINK_TYPE = 1;
  const ID5_STORED_OBJ = {
    'universal_uid': ID5_STORED_ID,
    'signature': ID5_STORED_SIGNATURE,
    'link_type': ID5_STORED_LINK_TYPE
  };
  const ID5_RESPONSE_ID = 'newid5id';
  const ID5_RESPONSE_SIGNATURE = 'abcdef';
  const ID5_RESPONSE_LINK_TYPE = 2;
  const ID5_JSON_RESPONSE = {
    'universal_uid': ID5_RESPONSE_ID,
    'signature': ID5_RESPONSE_SIGNATURE,
    'link_type': ID5_RESPONSE_LINK_TYPE
  };

  function getId5FetchConfig(storageName = ID5_STORAGE_NAME, storageType = 'html5') {
    return {
      name: ID5_MODULE_NAME,
      params: {
        partner: ID5_TEST_PARTNER_ID
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
    return getUserSyncConfig([getId5FetchConfig(ID5_STORAGE_NAME, 'html5')]);
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
    return new Promise((resolve) => {
      id5IdSubmodule.getId(config, consentData, cacheIdObj).callback((response) => {
        resolve(response)
      })
    });
  }

  class XhrServerMock {
    constructor(server) {
      this.currentRequestIdx = 0
      this.server = server
    }

    expectFirstRequest() {
      return this.#expectRequest(0);
    }

    expectNextRequest() {
      return this.#expectRequest(++this.currentRequestIdx)
    }

    expectConfigRequest() {
      return this.expectFirstRequest()
        .then(configRequest => {
          expect(configRequest.url).is.eq(ID5_API_CONFIG_URL);
          expect(configRequest.method).is.eq('POST');
          return configRequest;
        })
    }

    respondWithConfigAndExpectNext(configRequest, config = ID5_API_CONFIG) {
      configRequest.respond(200, {'Content-Type': 'application/json'}, JSON.stringify(config));
      return this.expectNextRequest()
    }

    expectFetchRequest() {
      return this.expectConfigRequest()
        .then(configRequest => {
          return this.respondWithConfigAndExpectNext(configRequest, ID5_API_CONFIG);
        }).then(request => {
          expect(request.url).is.eq(ID5_API_CONFIG.fetchCall.url);
          expect(request.method).is.eq('POST');
          return request;
        })
    }

    #expectRequest(index) {
      let server = this.server
      return new Promise(function (resolve) {
        (function waitForCondition() {
          if (server.requests && server.requests.length > index) return resolve(server.requests[index]);
          setTimeout(waitForCondition, 30);
        })();
      })
        .then(request => {
          return request
        });
    }

    hasReceivedAnyRequest() {
      let requests = this.server.requests;
      return requests && requests.length > 0;
    }
  }

  before(() => {
    hook.ready();
  });

  describe('Check for valid publisher config', function () {
    it('should fail with invalid config', function () {
      // no config
      expect(id5IdSubmodule.getId()).is.eq(undefined);
      expect(id5IdSubmodule.getId({})).is.eq(undefined);

      // valid params, invalid storage
      expect(id5IdSubmodule.getId({ params: { partner: 123 } })).to.be.eq(undefined);
      expect(id5IdSubmodule.getId({ params: { partner: 123 }, storage: {} })).to.be.eq(undefined);
      expect(id5IdSubmodule.getId({ params: { partner: 123 }, storage: { name: '' } })).to.be.eq(undefined);
      expect(id5IdSubmodule.getId({ params: { partner: 123 }, storage: { type: '' } })).to.be.eq(undefined);

      // valid storage, invalid params
      expect(id5IdSubmodule.getId({ storage: { name: 'name', type: 'html5', }, })).to.be.eq(undefined);
      expect(id5IdSubmodule.getId({ storage: { name: 'name', type: 'html5', }, params: { } })).to.be.eq(undefined);
      expect(id5IdSubmodule.getId({ storage: { name: 'name', type: 'html5', }, params: { partner: 'abc' } })).to.be.eq(undefined);
    });

    it('should warn with non-recommended storage params', function () {
      let logWarnStub = sinon.stub(utils, 'logWarn');

      id5IdSubmodule.getId({ storage: { name: 'name', type: 'html5', }, params: { partner: 123 } });
      expect(logWarnStub.calledOnce).to.be.true;
      logWarnStub.restore();

      id5IdSubmodule.getId({ storage: { name: ID5_STORAGE_NAME, type: 'cookie', }, params: { partner: 123 } });
      expect(logWarnStub.calledOnce).to.be.true;
      logWarnStub.restore();
    });
  });

  describe('Xhr Requests from getId()', function () {
    const responseHeader = {'Content-Type': 'application/json'};

    beforeEach(function () {
    });

    afterEach(function () {
      uspDataHandler.reset()
    });

    it('should call the ID5 server and handle a valid response', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let config = getId5FetchConfig();
      let submoduleResponse = callSubmoduleGetId(config, undefined, undefined);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(fetchRequest.url).to.contain(ID5_ENDPOINT);
          expect(fetchRequest.withCredentials).is.true;
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
          return submoduleResponse
        })
        .then(submoduleResponse => {
          expect(submoduleResponse).is.deep.equal(ID5_JSON_RESPONSE);
        });
    });

    it('should call the ID5 server with gdpr data ', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let consentData = {
        gdprApplies: true,
        consentString: 'consentString'
      }

      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), consentData, undefined);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
          expect(requestBody.gdpr).to.eq(1);
          expect(requestBody.gdpr_consent).is.eq(consentData.consentString);

          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
        .then(submoduleResponse => {
          expect(submoduleResponse).is.deep.equal(ID5_JSON_RESPONSE);
        });
    });

    it('should call the ID5 server without gdpr data when gdpr not applies ', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let consentData = {
        gdprApplies: false,
        consentString: 'consentString'
      }

      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), consentData, undefined);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.gdpr).to.eq(0);
          expect(requestBody.gdpr_consent).is.undefined

          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
        .then(submoduleResponse => {
          expect(submoduleResponse).is.deep.equal(ID5_JSON_RESPONSE);
        });
    });

    it('should call the ID5 server with us privacy consent', function () {
      let usPrivacyString = '1YN-';
      uspDataHandler.setConsentData(usPrivacyString)
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let consentData = {
        gdprApplies: true,
        consentString: 'consentString'
      }

      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), consentData, undefined);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
          expect(requestBody.us_privacy).to.eq(usPrivacyString);

          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
        .then(submoduleResponse => {
          expect(submoduleResponse).is.deep.equal(ID5_JSON_RESPONSE);
        });
    });

    it('should call the ID5 server with no signature field when no stored object', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, undefined);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.s).is.undefined;
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
    });

    it('should call the ID5 server for config with submodule config object', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let id5FetchConfig = getId5FetchConfig();
      id5FetchConfig.params.extraParam = {
        x: 'X',
        y: {
          a: 1,
          b: '3'
        }
      }
      let submoduleResponse = callSubmoduleGetId(id5FetchConfig, undefined, undefined);

      return xhrServerMock.expectConfigRequest()
        .then(configRequest => {
          let requestBody = JSON.parse(configRequest.requestBody)
          expect(requestBody).is.deep.eq(id5FetchConfig)
          return xhrServerMock.respondWithConfigAndExpectNext(configRequest)
        })
        .then(fetchRequest => {
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
    });

    it('should call the ID5 server for config with overridden url', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let id5FetchConfig = getId5FetchConfig();
      id5FetchConfig.params.configUrl = 'http://localhost/x/y/z'

      let submoduleResponse = callSubmoduleGetId(id5FetchConfig, undefined, undefined);

      return xhrServerMock.expectFirstRequest()
        .then(configRequest => {
          expect(configRequest.url).is.eq('http://localhost/x/y/z')
          return xhrServerMock.respondWithConfigAndExpectNext(configRequest)
        })
        .then(fetchRequest => {
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
    });

    it('should call the ID5 server with additional data when provided', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, undefined);

      return xhrServerMock.expectConfigRequest()
        .then(configRequest => {
          return xhrServerMock.respondWithConfigAndExpectNext(configRequest, {
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
        })
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
          expect(requestBody.o).is.eq('pbjs');
          expect(requestBody.v).is.eq('$prebid.version$');
          expect(requestBody.arg1).is.eq('123')
          expect(requestBody.arg2).is.deep.eq({
            x: '1',
            y: 2
          })
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
    });

    it('should call the ID5 server with extensions', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, undefined);

      return xhrServerMock.expectConfigRequest()
        .then(configRequest => {
          return xhrServerMock.respondWithConfigAndExpectNext(configRequest, {
            fetchCall: {
              url: ID5_ENDPOINT
            },
            extensionsCall: {
              url: ID5_EXTENSIONS_ENDPOINT,
              method: 'GET'
            }
          });
        })
        .then(extensionsRequest => {
          expect(extensionsRequest.url).is.eq(ID5_EXTENSIONS_ENDPOINT)
          expect(extensionsRequest.method).is.eq('GET')
          extensionsRequest.respond(200, responseHeader, JSON.stringify({
            lb: 'ex'
          }))
          return xhrServerMock.expectNextRequest();
        })
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
          expect(requestBody.o).is.eq('pbjs');
          expect(requestBody.v).is.eq('$prebid.version$');
          expect(requestBody.extensions).is.deep.eq({
            lb: 'ex'
          })
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
    });

    it('should call the ID5 server with extensions fetched with POST', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, undefined);

      return xhrServerMock.expectConfigRequest()
        .then(configRequest => {
          return xhrServerMock.respondWithConfigAndExpectNext(configRequest, {
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
        })
        .then(extensionsRequest => {
          expect(extensionsRequest.url).is.eq(ID5_EXTENSIONS_ENDPOINT)
          expect(extensionsRequest.method).is.eq('POST')
          let requestBody = JSON.parse(extensionsRequest.requestBody)
          expect(requestBody).is.deep.eq({
            x: '1',
            y: 2
          })
          extensionsRequest.respond(200, responseHeader, JSON.stringify({
            lb: 'post',
          }))
          return xhrServerMock.expectNextRequest();
        })
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.partner).is.eq(ID5_TEST_PARTNER_ID);
          expect(requestBody.o).is.eq('pbjs');
          expect(requestBody.v).is.eq('$prebid.version$');
          expect(requestBody.extensions).is.deep.eq({
            lb: 'post'
          })
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
    });

    it('should call the ID5 server with signature field from stored object', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, ID5_STORED_OBJ);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.s).is.eq(ID5_STORED_SIGNATURE);
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
    });

    it('should call the ID5 server with pd field when pd config is set', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      const pubData = 'b50ca08271795a8e7e4012813f23d505193d75c0f2e2bb99baa63aa822f66ed3';

      let id5Config = getId5FetchConfig();
      id5Config.params.pd = pubData;

      let submoduleResponse = callSubmoduleGetId(id5Config, undefined, ID5_STORED_OBJ);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.pd).is.eq(pubData);
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse;
        })
    });

    it('should call the ID5 server with no pd field when pd config is not set', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let id5Config = getId5FetchConfig();
      id5Config.params.pd = undefined;

      let submoduleResponse = callSubmoduleGetId(id5Config, undefined, ID5_STORED_OBJ);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.pd).is.undefined;
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse;
        })
    });

    it('should call the ID5 server with nb=1 when no stored value exists and reset after', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      coreStorage.removeDataFromLocalStorage(ID5_NB_STORAGE_NAME);

      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, ID5_STORED_OBJ);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.nbPage).is.eq(1);
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
        .then(() => {
          expect(getNbFromCache(ID5_TEST_PARTNER_ID)).is.eq(0);
        })
    });

    it('should call the ID5 server with incremented nb when stored value exists and reset after', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      storeNbInCache(ID5_TEST_PARTNER_ID, 1);

      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, ID5_STORED_OBJ);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.nbPage).is.eq(2);
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        })
        .then(() => {
          expect(getNbFromCache(ID5_TEST_PARTNER_ID)).is.eq(0);
        })
    });

    it('should call the ID5 server with ab_testing object when abTesting is turned on', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let id5Config = getId5FetchConfig();
      id5Config.params.abTesting = {enabled: true, controlGroupPct: 0.234}

      let submoduleResponse = callSubmoduleGetId(id5Config, undefined, ID5_STORED_OBJ);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.ab_testing.enabled).is.eq(true);
          expect(requestBody.ab_testing.control_group_pct).is.eq(0.234);
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse;
        });
    });

    it('should call the ID5 server without ab_testing object when abTesting is turned off', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let id5Config = getId5FetchConfig();
      id5Config.params.abTesting = {enabled: false, controlGroupPct: 0.55}

      let submoduleResponse = callSubmoduleGetId(id5Config, undefined, ID5_STORED_OBJ);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.ab_testing).is.undefined;
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        });
    });

    it('should call the ID5 server without ab_testing when when abTesting is not set', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let id5Config = getId5FetchConfig();

      let submoduleResponse = callSubmoduleGetId(id5Config, undefined, ID5_STORED_OBJ);

      return xhrServerMock.expectFetchRequest()
        .then(fetchRequest => {
          let requestBody = JSON.parse(fetchRequest.requestBody);
          expect(requestBody.ab_testing).is.undefined;
          fetchRequest.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
          return submoduleResponse
        });
    });

    it('should store the privacy object from the ID5 server response', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, ID5_STORED_OBJ);

      const privacy = {
        jurisdiction: 'gdpr',
        id5_consent: true
      };

      return xhrServerMock.expectFetchRequest()
        .then(request => {
          let responseObject = utils.deepClone(ID5_JSON_RESPONSE);
          responseObject.privacy = privacy;
          request.respond(200, responseHeader, JSON.stringify(responseObject));
          return submoduleResponse
        })
        .then(() => {
          expect(getFromLocalStorage(ID5_PRIVACY_STORAGE_NAME)).is.eq(JSON.stringify(privacy));
          coreStorage.removeDataFromLocalStorage(ID5_PRIVACY_STORAGE_NAME);
        })
    });

    it('should not store a privacy object if not part of ID5 server response', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      coreStorage.removeDataFromLocalStorage(ID5_PRIVACY_STORAGE_NAME);
      let submoduleResponse = callSubmoduleGetId(getId5FetchConfig(), undefined, ID5_STORED_OBJ);

      return xhrServerMock.expectFetchRequest()
        .then(request => {
          let responseObject = utils.deepClone(ID5_JSON_RESPONSE);
          responseObject.privacy = undefined;
          request.respond(200, responseHeader, JSON.stringify(responseObject));
          return submoduleResponse
        })
        .then(() => {
          expect(getFromLocalStorage(ID5_PRIVACY_STORAGE_NAME)).is.null;
        });
    });

    describe('when legacy cookies are set', () => {
      let sandbox;
      beforeEach(() => {
        sandbox = sinon.sandbox.create();
        sandbox.stub(storage, 'getCookie');
      });
      afterEach(() => {
        sandbox.restore();
      });
      it('should not throw if malformed JSON is forced into cookies', () => {
        storage.getCookie.callsFake(() => ' Not JSON ');
        id5IdSubmodule.getId(getId5FetchConfig());
      });
    })
  });

  describe('Request Bids Hook', function () {
    let adUnits;
    let sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      mockGdprConsent(sandbox);
      sinon.stub(events, 'getEvents').returns([]);
      coreStorage.removeDataFromLocalStorage(ID5_STORAGE_NAME);
      coreStorage.removeDataFromLocalStorage(`${ID5_STORAGE_NAME}_last`);
      coreStorage.removeDataFromLocalStorage(ID5_NB_STORAGE_NAME);
      adUnits = [getAdUnitMock()];
    });
    afterEach(function () {
      events.getEvents.restore();
      coreStorage.removeDataFromLocalStorage(ID5_STORAGE_NAME);
      coreStorage.removeDataFromLocalStorage(`${ID5_STORAGE_NAME}_last`);
      coreStorage.removeDataFromLocalStorage(ID5_NB_STORAGE_NAME);
      sandbox.restore();
    });

    it('should add stored ID from cache to bids', function (done) {
      storeInLocalStorage(ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);

      init(config);
      setSubmoduleRegistry([id5IdSubmodule]);
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

    it('should add config value ID to bids', function (done) {
      init(config);
      setSubmoduleRegistry([id5IdSubmodule]);
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
      storeInLocalStorage(ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);
      coreStorage.removeDataFromLocalStorage(ID5_NB_STORAGE_NAME);

      init(config);
      setSubmoduleRegistry([id5IdSubmodule]);
      config.setConfig(getFetchLocalStorageConfig());

      requestBidsHook((adUnitConfig) => {
        expect(getNbFromCache(ID5_TEST_PARTNER_ID)).is.eq(1);
        done()
      }, {adUnits});
    });

    it('should increment nb in cache when stored nb value exists and cached ID', function (done) {
      storeInLocalStorage(ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);
      storeNbInCache(ID5_TEST_PARTNER_ID, 1);

      init(config);
      setSubmoduleRegistry([id5IdSubmodule]);
      config.setConfig(getFetchLocalStorageConfig());

      requestBidsHook(() => {
        expect(getNbFromCache(ID5_TEST_PARTNER_ID)).is.eq(2);
        done()
      }, {adUnits});
    });

    it('should call ID5 servers with signature and incremented nb post auction if refresh needed', function () {
      let xhrServerMock = new XhrServerMock(sinon.createFakeServer())
      let initialLocalStorageValue = JSON.stringify(ID5_STORED_OBJ);
      storeInLocalStorage(ID5_STORAGE_NAME, initialLocalStorageValue, 1);
      storeInLocalStorage(`${ID5_STORAGE_NAME}_last`, expDaysStr(-1), 1);

      storeNbInCache(ID5_TEST_PARTNER_ID, 1);
      let id5Config = getFetchLocalStorageConfig();
      id5Config.userSync.userIds[0].storage.refreshInSeconds = 2;
      init(config);
      setSubmoduleRegistry([id5IdSubmodule]);
      config.setConfig(id5Config);

      return new Promise((resolve) => {
        requestBidsHook(() => {
          resolve()
        }, {adUnits});
      }).then(() => {
        expect(xhrServerMock.hasReceivedAnyRequest()).is.false;
        events.emit(CONSTANTS.EVENTS.AUCTION_END, {});
        return xhrServerMock.expectFetchRequest()
      }).then(request => {
        let requestBody = JSON.parse(request.requestBody);
        expect(requestBody.s).is.eq(ID5_STORED_SIGNATURE);
        expect(requestBody.nbPage).is.eq(2);
        expect(getNbFromCache(ID5_TEST_PARTNER_ID)).is.eq(2);
        const responseHeader = {'Content-Type': 'application/json'};
        request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

        return new Promise(function (resolve) {
          (function waitForCondition() {
            if (getFromLocalStorage(ID5_STORAGE_NAME) !== initialLocalStorageValue) return resolve();
            setTimeout(waitForCondition, 30);
          })();
        })
      }).then(() => {
        expect(decodeURIComponent(getFromLocalStorage(ID5_STORAGE_NAME))).is.eq(JSON.stringify(ID5_JSON_RESPONSE));
        expect(getNbFromCache(ID5_TEST_PARTNER_ID)).is.eq(0);
      })
    });
  });

  describe('Decode stored object', function () {
    const expectedDecodedObject = {id5id: {uid: ID5_STORED_ID, ext: {linkType: ID5_STORED_LINK_TYPE}}};

    it('should properly decode from a stored object', function () {
      expect(id5IdSubmodule.decode(ID5_STORED_OBJ, getId5FetchConfig())).is.deep.equal(expectedDecodedObject);
    });
    it('should return undefined if passed a string', function () {
      expect(id5IdSubmodule.decode('somestring', getId5FetchConfig())).is.eq(undefined);
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
          let decoded = id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).is.deep.equal(expectedDecodedObjectWithIdAbOff);
        });

        it('should set abTestingControlGroup to false when A/B testing is on but in normal group', function () {
          storedObject.ab_testing = {result: 'normal'};
          let decoded = id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).is.deep.equal(expectedDecodedObjectWithIdAbOn);
        });

        it('should not expose ID when everyone is in control group', function () {
          storedObject.ab_testing = {result: 'control'};
          storedObject.universal_uid = '';
          storedObject.link_type = 0;
          let decoded = id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).is.deep.equal(expectedDecodedObjectWithoutIdAbOn);
        });

        it('should log A/B testing errors', function () {
          storedObject.ab_testing = {result: 'error'};
          let decoded = id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).is.deep.equal(expectedDecodedObjectWithIdAbOff);
          sinon.assert.calledOnce(logErrorSpy);
        });
      });
    });
  });
});
