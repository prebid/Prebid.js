import {
  expDaysStr,
  getFromLocalStorage,
  getNbFromCache,
  ID5_PRIVACY_STORAGE_NAME,
  ID5_STORAGE_NAME,
  id5IdSubmodule,
  nbCacheName, storage,
  storeInLocalStorage,
  storeNbInCache,
} from 'modules/id5IdSystem.js';
import {coreStorage, init, requestBidsHook, setSubmoduleRegistry} from 'modules/userId/index.js';
import {config} from 'src/config.js';
import {server} from 'test/mocks/xhr.js';
import * as events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils.js';
import 'src/prebid.js';
import {hook} from '../../../src/hook.js';
import {mockGdprConsent} from '../../helpers/consentData.js';

let expect = require('chai').expect;

describe('ID5 ID System', function() {
  const ID5_MODULE_NAME = 'id5Id';
  const ID5_EIDS_NAME = ID5_MODULE_NAME.toLowerCase();
  const ID5_SOURCE = 'id5-sync.com';
  const ID5_TEST_PARTNER_ID = 173;
  const ID5_ENDPOINT = `https://id5-sync.com/g/v2/${ID5_TEST_PARTNER_ID}.json`;
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

  before(() => {
    hook.ready();
  });

  describe('Check for valid publisher config', function() {
    it('should fail with invalid config', function() {
      // no config
      expect(id5IdSubmodule.getId()).to.be.eq(undefined);
      expect(id5IdSubmodule.getId({ })).to.be.eq(undefined);

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

    it('should warn with non-recommended storage params', function() {
      let logWarnStub = sinon.stub(utils, 'logWarn');

      id5IdSubmodule.getId({ storage: { name: 'name', type: 'html5', }, params: { partner: 123 } });
      expect(logWarnStub.calledOnce).to.be.true;
      logWarnStub.restore();

      id5IdSubmodule.getId({ storage: { name: ID5_STORAGE_NAME, type: 'cookie', }, params: { partner: 123 } });
      expect(logWarnStub.calledOnce).to.be.true;
      logWarnStub.restore();
    });
  });

  describe('Xhr Requests from getId()', function() {
    const responseHeader = { 'Content-Type': 'application/json' };
    let callbackSpy = sinon.spy();

    beforeEach(function() {
      callbackSpy.resetHistory();
    });
    afterEach(function () {

    });

    it('should call the ID5 server and handle a valid response', function () {
      let submoduleCallback = id5IdSubmodule.getId(getId5FetchConfig(), undefined, undefined).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.contain(ID5_ENDPOINT);
      expect(request.withCredentials).to.be.true;
      expect(requestBody.partner).to.eq(ID5_TEST_PARTNER_ID);
      expect(requestBody.o).to.eq('pbjs');
      expect(requestBody.pd).to.be.undefined;
      expect(requestBody.s).to.be.undefined;
      expect(requestBody.provider).to.be.undefined
      expect(requestBody.v).to.eq('$prebid.version$');
      expect(requestBody.gdpr).to.exist;
      expect(requestBody.gdpr_consent).to.be.undefined;
      expect(requestBody.us_privacy).to.be.undefined;

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.deep.equal(ID5_JSON_RESPONSE);
    });

    it('should call the ID5 server with no signature field when no stored object', function () {
      let submoduleCallback = id5IdSubmodule.getId(getId5FetchConfig(), undefined, undefined).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.s).to.be.undefined;

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
    });

    it('should call the ID5 server with signature field from stored object', function () {
      let submoduleCallback = id5IdSubmodule.getId(getId5FetchConfig(), undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.s).to.eq(ID5_STORED_SIGNATURE);

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
    });

    it('should call the ID5 server with pd field when pd config is set', function () {
      const pubData = 'b50ca08271795a8e7e4012813f23d505193d75c0f2e2bb99baa63aa822f66ed3';

      let id5Config = getId5FetchConfig();
      id5Config.params.pd = pubData;

      let submoduleCallback = id5IdSubmodule.getId(id5Config, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.pd).to.eq(pubData);

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
    });

    it('should call the ID5 server with no pd field when pd config is not set', function () {
      let id5Config = getId5FetchConfig();
      id5Config.params.pd = undefined;

      let submoduleCallback = id5IdSubmodule.getId(id5Config, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.pd).to.be.undefined;

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
    });

    it('should call the ID5 server with nb=1 when no stored value exists and reset after', function () {
      coreStorage.removeDataFromLocalStorage(ID5_NB_STORAGE_NAME);

      let submoduleCallback = id5IdSubmodule.getId(getId5FetchConfig(), undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.nbPage).to.eq(1);

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      expect(getNbFromCache(ID5_TEST_PARTNER_ID)).to.be.eq(0);
    });

    it('should call the ID5 server with incremented nb when stored value exists and reset after', function () {
      storeNbInCache(ID5_TEST_PARTNER_ID, 1);

      let submoduleCallback = id5IdSubmodule.getId(getId5FetchConfig(), undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.nbPage).to.eq(2);

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      expect(getNbFromCache(ID5_TEST_PARTNER_ID)).to.be.eq(0);
    });

    it('should call the ID5 server with ab_testing object when abTesting is turned on', function () {
      let id5Config = getId5FetchConfig();
      id5Config.params.abTesting = { enabled: true, controlGroupPct: 0.234 }

      let submoduleCallback = id5IdSubmodule.getId(id5Config, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.ab_testing.enabled).to.eq(true);
      expect(requestBody.ab_testing.control_group_pct).to.eq(0.234);

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
    });

    it('should call the ID5 server without ab_testing object when abTesting is turned off', function () {
      let id5Config = getId5FetchConfig();
      id5Config.params.abTesting = { enabled: false, controlGroupPct: 0.55 }

      let submoduleCallback = id5IdSubmodule.getId(id5Config, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.ab_testing).to.be.undefined;

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
    });

    it('should call the ID5 server without ab_testing when when abTesting is not set', function () {
      let id5Config = getId5FetchConfig();

      let submoduleCallback = id5IdSubmodule.getId(id5Config, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.ab_testing).to.be.undefined;

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
    });

    it('should store the privacy object from the ID5 server response', function () {
      let submoduleCallback = id5IdSubmodule.getId(getId5FetchConfig(), undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];

      let responseObject = utils.deepClone(ID5_JSON_RESPONSE);
      responseObject.privacy = {
        jurisdiction: 'gdpr',
        id5_consent: true
      };
      request.respond(200, responseHeader, JSON.stringify(responseObject));
      expect(getFromLocalStorage(ID5_PRIVACY_STORAGE_NAME)).to.be.eq(JSON.stringify(responseObject.privacy));
      coreStorage.removeDataFromLocalStorage(ID5_PRIVACY_STORAGE_NAME);
    });

    it('should not store a privacy object if not part of ID5 server response', function () {
      coreStorage.removeDataFromLocalStorage(ID5_PRIVACY_STORAGE_NAME);
      let submoduleCallback = id5IdSubmodule.getId(getId5FetchConfig(), undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      expect(getFromLocalStorage(ID5_PRIVACY_STORAGE_NAME)).to.be.null;
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

  describe('Request Bids Hook', function() {
    let adUnits;
    let sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      mockGdprConsent(sandbox);
      sinon.stub(events, 'getEvents').returns([]);
      coreStorage.removeDataFromLocalStorage(ID5_STORAGE_NAME);
      coreStorage.removeDataFromLocalStorage(`${ID5_STORAGE_NAME}_last`);
      coreStorage.removeDataFromLocalStorage(ID5_NB_STORAGE_NAME);
      adUnits = [getAdUnitMock()];
    });
    afterEach(function() {
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
            expect(bid.userId.id5id.uid).to.equal(ID5_STORED_ID);
            expect(bid.userIdAsEids[0]).to.deep.equal({
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
      }, { adUnits });
    });

    it('should add config value ID to bids', function (done) {
      init(config);
      setSubmoduleRegistry([id5IdSubmodule]);
      config.setConfig(getValueConfig(ID5_STORED_ID));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property(`userId.${ID5_EIDS_NAME}`);
            expect(bid.userId.id5id.uid).to.equal(ID5_STORED_ID);
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: ID5_SOURCE,
              uids: [{ id: ID5_STORED_ID, atype: 1 }]
            });
          });
        });
        done();
      }, { adUnits });
    });

    it('should set nb=1 in cache when no stored nb value exists and cached ID', function (done) {
      storeInLocalStorage(ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);
      coreStorage.removeDataFromLocalStorage(ID5_NB_STORAGE_NAME);

      init(config);
      setSubmoduleRegistry([id5IdSubmodule]);
      config.setConfig(getFetchLocalStorageConfig());

      requestBidsHook((adUnitConfig) => {
        expect(getNbFromCache(ID5_TEST_PARTNER_ID)).to.be.eq(1);
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
        expect(getNbFromCache(ID5_TEST_PARTNER_ID)).to.be.eq(2);
        done()
      }, {adUnits});
    });

    it('should call ID5 servers with signature and incremented nb post auction if refresh needed', function () {
      storeInLocalStorage(ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);
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
        expect(getNbFromCache(ID5_TEST_PARTNER_ID)).to.be.eq(2);
        expect(server.requests).to.be.empty;
        events.emit(CONSTANTS.EVENTS.AUCTION_END, {});
        return new Promise((resolve) => setTimeout(resolve))
      }).then(() => {
        let request = server.requests[0];
        let requestBody = JSON.parse(request.requestBody);
        expect(request.url).to.contain(ID5_ENDPOINT);
        expect(requestBody.s).to.eq(ID5_STORED_SIGNATURE);
        expect(requestBody.nbPage).to.eq(2);

        const responseHeader = { 'Content-Type': 'application/json' };
        request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

        expect(decodeURIComponent(getFromLocalStorage(ID5_STORAGE_NAME))).to.be.eq(JSON.stringify(ID5_JSON_RESPONSE));
        expect(getNbFromCache(ID5_TEST_PARTNER_ID)).to.be.eq(0);
      })
    });
  });

  describe('Decode stored object', function() {
    const expectedDecodedObject = { id5id: { uid: ID5_STORED_ID, ext: { linkType: ID5_STORED_LINK_TYPE } } };

    it('should properly decode from a stored object', function() {
      expect(id5IdSubmodule.decode(ID5_STORED_OBJ, getId5FetchConfig())).to.deep.equal(expectedDecodedObject);
    });
    it('should return undefined if passed a string', function() {
      expect(id5IdSubmodule.decode('somestring', getId5FetchConfig())).to.eq(undefined);
    });
  });

  describe('A/B Testing', function() {
    const expectedDecodedObjectWithIdAbOff = { id5id: { uid: ID5_STORED_ID, ext: { linkType: ID5_STORED_LINK_TYPE } } };
    const expectedDecodedObjectWithIdAbOn = { id5id: { uid: ID5_STORED_ID, ext: { linkType: ID5_STORED_LINK_TYPE, abTestingControlGroup: false } } };
    const expectedDecodedObjectWithoutIdAbOn = { id5id: { uid: '', ext: { linkType: 0, abTestingControlGroup: true } } };
    let testConfig, storedObject;

    beforeEach(function() {
      testConfig = getId5FetchConfig();
      storedObject = utils.deepClone(ID5_STORED_OBJ);
    });

    describe('A/B Testing Config is Set', function() {
      let randStub;

      beforeEach(function() {
        randStub = sinon.stub(Math, 'random').callsFake(function() {
          return 0.25;
        });
      });
      afterEach(function () {
        randStub.restore();
      });

      describe('Decode', function() {
        let logErrorSpy;

        beforeEach(function() {
          logErrorSpy = sinon.spy(utils, 'logError');
        });
        afterEach(function() {
          logErrorSpy.restore();
        });

        it('should not set abTestingControlGroup extension when A/B testing is off', function () {
          let decoded = id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).to.deep.equal(expectedDecodedObjectWithIdAbOff);
        });

        it('should set abTestingControlGroup to false when A/B testing is on but in normal group', function () {
          storedObject.ab_testing = { result: 'normal' };
          let decoded = id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).to.deep.equal(expectedDecodedObjectWithIdAbOn);
        });

        it('should not expose ID when everyone is in control group', function () {
          storedObject.ab_testing = { result: 'control' };
          storedObject.universal_uid = '';
          storedObject.link_type = 0;
          let decoded = id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).to.deep.equal(expectedDecodedObjectWithoutIdAbOn);
        });

        it('should log A/B testing errors', function () {
          storedObject.ab_testing = { result: 'error' };
          let decoded = id5IdSubmodule.decode(storedObject, testConfig);
          expect(decoded).to.deep.equal(expectedDecodedObjectWithIdAbOff);
          sinon.assert.calledOnce(logErrorSpy);
        });
      });
    });
  });
});
