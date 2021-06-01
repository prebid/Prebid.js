import {
  id5IdSubmodule,
  ID5_STORAGE_NAME,
  ID5_PRIVACY_STORAGE_NAME,
  getFromLocalStorage,
  storeInLocalStorage,
  expDaysStr,
  nbCacheName,
  getNbFromCache,
  storeNbInCache,
  isInControlGroup
} from 'modules/id5IdSystem.js';
import { init, requestBidsHook, setSubmoduleRegistry, coreStorage } from 'modules/userId/index.js';
import { config } from 'src/config.js';
import { server } from 'test/mocks/xhr.js';
import events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import * as utils from 'src/utils.js';

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
  function getFetchCookieConfig() {
    return getUserSyncConfig([getId5FetchConfig(ID5_STORAGE_NAME, 'cookie')]);
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

    it('should call the ID5 server with ab feature = 1 when abTesting is turned on', function () {
      let id5Config = getId5FetchConfig();
      id5Config.params.abTesting = { enabled: true, controlGroupPct: 10 }

      let submoduleCallback = id5IdSubmodule.getId(id5Config, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.features.ab).to.eq(1);

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
    });

    it('should call the ID5 server without ab feature when abTesting is turned off', function () {
      let id5Config = getId5FetchConfig();
      id5Config.params.abTesting = { enabled: false, controlGroupPct: 10 }

      let submoduleCallback = id5IdSubmodule.getId(id5Config, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.features).to.be.undefined;

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
    });

    it('should call the ID5 server without ab feature when when abTesting is not set', function () {
      let id5Config = getId5FetchConfig();

      let submoduleCallback = id5IdSubmodule.getId(id5Config, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(requestBody.features).to.be.undefined;

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
  });

  describe('Request Bids Hook', function() {
    let adUnits;

    beforeEach(function() {
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
    });

    it('should add stored ID from cache to bids', function (done) {
      storeInLocalStorage(ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);

      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
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
      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
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

    it('should set nb=1 in cache when no stored nb value exists and cached ID', function () {
      storeInLocalStorage(ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);
      coreStorage.removeDataFromLocalStorage(ID5_NB_STORAGE_NAME);

      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(getFetchLocalStorageConfig());

      let innerAdUnits;
      requestBidsHook((adUnitConfig) => { innerAdUnits = adUnitConfig.adUnits }, {adUnits});

      expect(getNbFromCache(ID5_TEST_PARTNER_ID)).to.be.eq(1);
    });

    it('should increment nb in cache when stored nb value exists and cached ID', function () {
      storeInLocalStorage(ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);
      storeNbInCache(ID5_TEST_PARTNER_ID, 1);

      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(getFetchLocalStorageConfig());

      let innerAdUnits;
      requestBidsHook((adUnitConfig) => { innerAdUnits = adUnitConfig.adUnits }, {adUnits});

      expect(getNbFromCache(ID5_TEST_PARTNER_ID)).to.be.eq(2);
    });

    it('should call ID5 servers with signature and incremented nb post auction if refresh needed', function () {
      storeInLocalStorage(ID5_STORAGE_NAME, JSON.stringify(ID5_STORED_OBJ), 1);
      storeInLocalStorage(`${ID5_STORAGE_NAME}_last`, expDaysStr(-1), 1);
      storeNbInCache(ID5_TEST_PARTNER_ID, 1);

      let id5Config = getFetchLocalStorageConfig();
      id5Config.userSync.userIds[0].storage.refreshInSeconds = 2;

      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(id5Config);

      let innerAdUnits;
      requestBidsHook((adUnitConfig) => { innerAdUnits = adUnitConfig.adUnits }, {adUnits});

      expect(getNbFromCache(ID5_TEST_PARTNER_ID)).to.be.eq(2);

      expect(server.requests).to.be.empty;
      events.emit(CONSTANTS.EVENTS.AUCTION_END, {});

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.contain(ID5_ENDPOINT);
      expect(requestBody.s).to.eq(ID5_STORED_SIGNATURE);
      expect(requestBody.nbPage).to.eq(2);

      const responseHeader = { 'Content-Type': 'application/json' };
      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      expect(decodeURIComponent(getFromLocalStorage(ID5_STORAGE_NAME))).to.be.eq(JSON.stringify(ID5_JSON_RESPONSE));
      expect(getNbFromCache(ID5_TEST_PARTNER_ID)).to.be.eq(0);
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
    let testConfig;

    beforeEach(function() {
      testConfig = getId5FetchConfig();
    });

    describe('Configuration Validation', function() {
      let logErrorSpy;
      let logInfoSpy;

      beforeEach(function() {
        logErrorSpy = sinon.spy(utils, 'logError');
        logInfoSpy = sinon.spy(utils, 'logInfo');
      });
      afterEach(function() {
        logErrorSpy.restore();
        logInfoSpy.restore();
      });

      // A/B Testing ON, but invalid config
      let testInvalidAbTestingConfigsWithError = [
        { enabled: true },
        { enabled: true, controlGroupPct: 2 },
        { enabled: true, controlGroupPct: -1 },
        { enabled: true, controlGroupPct: 'a' },
        { enabled: true, controlGroupPct: true }
      ];
      testInvalidAbTestingConfigsWithError.forEach((testAbTestingConfig) => {
        it('should be undefined if ratio is invalid', () => {
          expect(isInControlGroup('userId', testAbTestingConfig.controlGroupPct)).to.be.undefined;
        });
        it('should error if config is invalid, and always return an ID', function () {
          testConfig.params.abTesting = testAbTestingConfig;
          let decoded = id5IdSubmodule.decode(ID5_STORED_OBJ, testConfig);
          expect(decoded).to.deep.equal(expectedDecodedObjectWithIdAbOn);
          sinon.assert.calledOnce(logErrorSpy);
        });
      });

      // A/B Testing OFF, with invalid config (ignore)
      let testInvalidAbTestingConfigsWithoutError = [
        { enabled: false, controlGroupPct: -1 },
        { enabled: false, controlGroupPct: 2 },
        { enabled: false, controlGroupPct: 'a' },
        { enabled: false, controlGroupPct: true }
      ];
      testInvalidAbTestingConfigsWithoutError.forEach((testAbTestingConfig) => {
        it('should be undefined if ratio is invalid', () => {
          expect(isInControlGroup('userId', testAbTestingConfig.controlGroupPct)).to.be.undefined;
        });
        it('should not error if config is invalid but A/B testing is off, and always return an ID', function () {
          testConfig.params.abTesting = testAbTestingConfig;
          let decoded = id5IdSubmodule.decode(ID5_STORED_OBJ, testConfig);
          expect(decoded).to.deep.equal(expectedDecodedObjectWithIdAbOff);
          sinon.assert.notCalled(logErrorSpy);
        });
      });

      // A/B Testing ON, with valid config
      let testValidConfigs = [
        { enabled: true, controlGroupPct: 0 },
        { enabled: true, controlGroupPct: 0.5 },
        { enabled: true, controlGroupPct: 1 }
      ];
      testValidConfigs.forEach((testAbTestingConfig) => {
        it('should not be undefined if ratio is valid', () => {
          expect(isInControlGroup('userId', testAbTestingConfig.controlGroupPct)).to.not.be.undefined;
        });
        it('should not error if config is valid', function () {
          testConfig.params.abTesting = testAbTestingConfig;
          id5IdSubmodule.decode(ID5_STORED_OBJ, testConfig);
          sinon.assert.notCalled(logErrorSpy);
        });
      });
    });

    describe('A/B Testing Config is not Set', function() {
      let randStub;

      beforeEach(function() {
        randStub = sinon.stub(Math, 'random').callsFake(function() {
          return 0;
        });
      });
      afterEach(function () {
        randStub.restore();
      });

      it('should expose ID when A/B config is not set', function () {
        let decoded = id5IdSubmodule.decode(ID5_STORED_OBJ, testConfig);
        expect(decoded).to.deep.equal(expectedDecodedObjectWithIdAbOff);
      });

      it('should expose ID when A/B config is empty', function () {
        testConfig.params.abTesting = { };

        let decoded = id5IdSubmodule.decode(ID5_STORED_OBJ, testConfig);
        expect(decoded).to.deep.equal(expectedDecodedObjectWithIdAbOff);
      });
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

      describe('IsInControlGroup', function () {
        it('Nobody is in a 0% control group', function () {
          expect(isInControlGroup('dsdndskhsdks', 0)).to.be.false;
          expect(isInControlGroup('3erfghyuijkm', 0)).to.be.false;
          expect(isInControlGroup('', 0)).to.be.false;
          expect(isInControlGroup(undefined, 0)).to.be.false;
        });

        it('Everybody is in a 100% control group', function () {
          expect(isInControlGroup('dsdndskhsdks', 1)).to.be.true;
          expect(isInControlGroup('3erfghyuijkm', 1)).to.be.true;
          expect(isInControlGroup('', 1)).to.be.true;
          expect(isInControlGroup(undefined, 1)).to.be.true;
        });

        it('Being in the control group must be consistant', function () {
          const inControlGroup = isInControlGroup('dsdndskhsdks', 0.5);
          expect(inControlGroup === isInControlGroup('dsdndskhsdks', 0.5)).to.be.true;
          expect(inControlGroup === isInControlGroup('dsdndskhsdks', 0.5)).to.be.true;
          expect(inControlGroup === isInControlGroup('dsdndskhsdks', 0.5)).to.be.true;
        });

        it('Control group ratio must be within a 10% error on a large sample', function () {
          let nbInControlGroup = 0;
          const sampleSize = 100;
          for (let i = 0; i < sampleSize; i++) {
            nbInControlGroup = nbInControlGroup + (isInControlGroup('R$*df' + i, 0.5) ? 1 : 0);
          }
          expect(nbInControlGroup).to.be.greaterThan(sampleSize / 2 - sampleSize / 10);
          expect(nbInControlGroup).to.be.lessThan(sampleSize / 2 + sampleSize / 10);
        });
      });

      describe('Decode', function() {
        it('should expose ID when A/B testing is off', function () {
          testConfig.params.abTesting = {
            enabled: false,
            controlGroupPct: 0.5
          };

          let decoded = id5IdSubmodule.decode(ID5_STORED_OBJ, testConfig);
          expect(decoded).to.deep.equal(expectedDecodedObjectWithIdAbOff);
        });

        it('should expose ID when no one is in control group', function () {
          testConfig.params.abTesting = {
            enabled: true,
            controlGroupPct: 0
          };

          let decoded = id5IdSubmodule.decode(ID5_STORED_OBJ, testConfig);
          expect(decoded).to.deep.equal(expectedDecodedObjectWithIdAbOn);
        });

        it('should not expose ID when everyone is in control group', function () {
          testConfig.params.abTesting = {
            enabled: true,
            controlGroupPct: 1
          };

          let decoded = id5IdSubmodule.decode(ID5_STORED_OBJ, testConfig);
          expect(decoded).to.deep.equal(expectedDecodedObjectWithoutIdAbOn);
        });
      });
    });
  });
});
