import { init, requestBidsHook, setSubmoduleRegistry, coreStorage } from 'modules/userId/index.js';
import { config } from 'src/config.js';
import { id5IdSubmodule } from 'modules/id5IdSystem.js';
import { server } from 'test/mocks/xhr.js';
import events from 'src/events.js';
import CONSTANTS from 'src/constants.json';

let expect = require('chai').expect;

describe('ID5 ID System', function() {
  const ID5_MODULE_NAME = 'id5Id';
  const ID5_EIDS_NAME = ID5_MODULE_NAME.toLowerCase();
  const ID5_SOURCE = 'id5-sync.com';
  const ID5_PARTNER = 173;
  const ID5_ENDPOINT = `https://id5-sync.com/g/v2/${ID5_PARTNER}.json`;
  const ID5_COOKIE_NAME = 'id5idcookie';
  const ID5_NB_COOKIE_NAME = `id5id.1st_${ID5_PARTNER}_nb`;
  const ID5_EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';
  const ID5_STORED_ID = 'storedid5id';
  const ID5_STORED_SIGNATURE = '123456';
  const ID5_STORED_OBJ = {
    'universal_uid': ID5_STORED_ID,
    'signature': ID5_STORED_SIGNATURE
  };
  const ID5_LEGACY_STORED_OBJ = {
    'ID5ID': ID5_STORED_ID
  }
  const ID5_RESPONSE_ID = 'newid5id';
  const ID5_RESPONSE_SIGNATURE = 'abcdef';
  const ID5_JSON_RESPONSE = {
    'universal_uid': ID5_RESPONSE_ID,
    'signature': ID5_RESPONSE_SIGNATURE,
    'link_type': 0
  };

  function getId5FetchConfig(storageName = ID5_COOKIE_NAME, storageType = 'cookie') {
    return {
      name: ID5_MODULE_NAME,
      params: {
        partner: ID5_PARTNER
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
        id5id: value
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
    return getUserSyncConfig([getId5FetchConfig()]);
  }
  function getFetchLocalStorageConfig() {
    return getUserSyncConfig([getId5FetchConfig(ID5_COOKIE_NAME, 'html5')]);
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

  describe('Xhr Requests from getId()', function() {
    const responseHeader = { 'Content-Type': 'application/json' };
    let callbackSpy = sinon.spy();

    beforeEach(function() {
      callbackSpy.resetHistory();
    });
    afterEach(function () {

    });

    it('should fail if no partner is provided in the config', function() {
      expect(id5IdSubmodule.getId()).to.be.eq(undefined);
    });

    it('should call the ID5 server with 1puid field for legacy storedObj format', function () {
      let submoduleCallback = id5IdSubmodule.getId(getId5FetchConfig().params, undefined, ID5_LEGACY_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.contain(ID5_ENDPOINT);
      expect(request.withCredentials).to.be.true;
      expect(requestBody.s).to.eq('');
      expect(requestBody.partner).to.eq(ID5_PARTNER);
      expect(requestBody['1puid']).to.eq(ID5_STORED_ID);

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.deep.equal(ID5_JSON_RESPONSE);
    });

    it('should call the ID5 server with signature field for new storedObj format', function () {
      let submoduleCallback = id5IdSubmodule.getId(getId5FetchConfig().params, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.contain(ID5_ENDPOINT);
      expect(request.withCredentials).to.be.true;
      expect(requestBody.s).to.eq(ID5_STORED_SIGNATURE);
      expect(requestBody.partner).to.eq(ID5_PARTNER);
      expect(requestBody['1puid']).to.eq('');

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.deep.equal(ID5_JSON_RESPONSE);
    });

    it('should call the ID5 server with pd field when pd config is set', function () {
      const pubData = 'b50ca08271795a8e7e4012813f23d505193d75c0f2e2bb99baa63aa822f66ed3';

      let config = getId5FetchConfig().params;
      config.pd = pubData;

      let submoduleCallback = id5IdSubmodule.getId(config, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.contain(ID5_ENDPOINT);
      expect(request.withCredentials).to.be.true;
      expect(requestBody.s).to.eq(ID5_STORED_SIGNATURE);
      expect(requestBody.pd).to.eq(pubData);
      expect(requestBody['1puid']).to.eq('');

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.deep.equal(ID5_JSON_RESPONSE);
    });

    it('should call the ID5 server with empty pd field when pd config is not set', function () {
      let config = getId5FetchConfig().params;
      config.pd = undefined;

      let submoduleCallback = id5IdSubmodule.getId(config, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.contain(ID5_ENDPOINT);
      expect(request.withCredentials).to.be.true;
      expect(requestBody.pd).to.eq('');

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.deep.equal(ID5_JSON_RESPONSE);
    });

    it('should call the ID5 server with nb=1 when no stored value exists', function () {
      coreStorage.setCookie(ID5_NB_COOKIE_NAME, '', ID5_EXPIRED_COOKIE_DATE);

      let submoduleCallback = id5IdSubmodule.getId(getId5FetchConfig().params, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.contain(ID5_ENDPOINT);
      expect(request.withCredentials).to.be.true;
      expect(requestBody.nbPage).to.eq(1);

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.deep.equal(ID5_JSON_RESPONSE);

      expect(coreStorage.getCookie(ID5_NB_COOKIE_NAME)).to.be.eq('0');
    });

    it('should call the ID5 server with incremented nb when stored value exists', function () {
      let expStr = (new Date(Date.now() + 25000).toUTCString());
      coreStorage.setCookie(ID5_NB_COOKIE_NAME, '1', expStr);

      let submoduleCallback = id5IdSubmodule.getId(getId5FetchConfig().params, undefined, ID5_STORED_OBJ).callback;
      submoduleCallback(callbackSpy);

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.contain(ID5_ENDPOINT);
      expect(request.withCredentials).to.be.true;
      expect(requestBody.nbPage).to.eq(2);

      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));
      expect(callbackSpy.calledOnce).to.be.true;
      expect(callbackSpy.lastCall.lastArg).to.deep.equal(ID5_JSON_RESPONSE);

      expect(coreStorage.getCookie(ID5_NB_COOKIE_NAME)).to.be.eq('0');
    });
  });

  describe('Request Bids Hook', function() {
    let adUnits;

    beforeEach(function() {
      sinon.stub(events, 'getEvents').returns([]);
      coreStorage.setCookie(ID5_COOKIE_NAME, '', ID5_EXPIRED_COOKIE_DATE);
      coreStorage.setCookie(`${ID5_COOKIE_NAME}_last`, '', ID5_EXPIRED_COOKIE_DATE);
      coreStorage.setCookie(ID5_NB_COOKIE_NAME, '', ID5_EXPIRED_COOKIE_DATE);
      adUnits = [getAdUnitMock()];
    });
    afterEach(function() {
      events.getEvents.restore();
      coreStorage.setCookie(ID5_COOKIE_NAME, '', ID5_EXPIRED_COOKIE_DATE);
      coreStorage.setCookie(`${ID5_COOKIE_NAME}_last`, '', ID5_EXPIRED_COOKIE_DATE);
      coreStorage.setCookie(ID5_NB_COOKIE_NAME, '', ID5_EXPIRED_COOKIE_DATE);
    });

    it('should add stored ID from cookie to bids', function (done) {
      let expStr = (new Date(Date.now() + 25000).toUTCString());
      coreStorage.setCookie(ID5_COOKIE_NAME, JSON.stringify(ID5_STORED_OBJ), expStr);

      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(getFetchCookieConfig());

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property(`userId.${ID5_EIDS_NAME}`);
            expect(bid.userId.id5id).to.equal(ID5_STORED_ID);
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: ID5_SOURCE,
              uids: [{ id: ID5_STORED_ID, atype: 1 }]
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
            expect(bid.userId.id5id).to.equal(ID5_STORED_ID);
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: ID5_SOURCE,
              uids: [{ id: ID5_STORED_ID, atype: 1 }]
            });
          });
        });
        done();
      }, { adUnits });
    });

    it('should set nb=1 in cookie when no stored value exists', function () {
      let expStr = (new Date(Date.now() + 25000).toUTCString());
      coreStorage.setCookie(ID5_COOKIE_NAME, JSON.stringify(ID5_STORED_OBJ), expStr);
      coreStorage.setCookie(ID5_NB_COOKIE_NAME, '', ID5_EXPIRED_COOKIE_DATE);

      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(getFetchCookieConfig());

      let innerAdUnits;
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(coreStorage.getCookie(ID5_NB_COOKIE_NAME)).to.be.eq('1');
    });

    it('should increment nb in cookie when stored value exists', function () {
      let expStr = (new Date(Date.now() + 25000).toUTCString());
      coreStorage.setCookie(ID5_COOKIE_NAME, JSON.stringify(ID5_STORED_OBJ), expStr);
      coreStorage.setCookie(ID5_NB_COOKIE_NAME, '1', expStr);

      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(getFetchCookieConfig());

      let innerAdUnits;
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(coreStorage.getCookie(ID5_NB_COOKIE_NAME)).to.be.eq('2');
    });

    it('should call ID5 servers with signature and incremented nb post auction if refresh needed', function () {
      let expStr = (new Date(Date.now() + 25000).toUTCString());
      coreStorage.setCookie(ID5_COOKIE_NAME, JSON.stringify(ID5_STORED_OBJ), expStr);
      coreStorage.setCookie(`${ID5_COOKIE_NAME}_last`, (new Date(Date.now() - 50000).toUTCString()), expStr);
      coreStorage.setCookie(ID5_NB_COOKIE_NAME, '1', expStr);

      let id5Config = getFetchCookieConfig();
      id5Config.userSync.userIds[0].storage.refreshInSeconds = 2;

      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(id5Config);

      let innerAdUnits;
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(coreStorage.getCookie(ID5_NB_COOKIE_NAME)).to.be.eq('2');

      expect(server.requests).to.be.empty;
      events.emit(CONSTANTS.EVENTS.AUCTION_END, {});

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.contain(ID5_ENDPOINT);
      expect(requestBody.s).to.eq(ID5_STORED_SIGNATURE);
      expect(requestBody.nbPage).to.eq(2);

      const responseHeader = { 'Content-Type': 'application/json' };
      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      expect(coreStorage.getCookie(ID5_COOKIE_NAME)).to.be.eq(JSON.stringify(ID5_JSON_RESPONSE));
      expect(coreStorage.getCookie(ID5_NB_COOKIE_NAME)).to.be.eq('0');
    });

    it('should call ID5 servers with 1puid and nb=1 post auction if refresh needed for legacy stored object', function () {
      let expStr = (new Date(Date.now() + 25000).toUTCString());
      coreStorage.setCookie(ID5_COOKIE_NAME, JSON.stringify(ID5_LEGACY_STORED_OBJ), expStr);
      coreStorage.setCookie(`${ID5_COOKIE_NAME}_last`, (new Date(Date.now() - 50000).toUTCString()), expStr);

      let id5Config = getFetchCookieConfig();
      id5Config.userSync.userIds[0].storage.refreshInSeconds = 2;

      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(id5Config);

      let innerAdUnits;
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(coreStorage.getCookie(ID5_NB_COOKIE_NAME)).to.be.eq('1');

      expect(server.requests).to.be.empty;
      events.emit(CONSTANTS.EVENTS.AUCTION_END, {});

      let request = server.requests[0];
      let requestBody = JSON.parse(request.requestBody);
      expect(request.url).to.contain(ID5_ENDPOINT);
      expect(requestBody['1puid']).to.eq(ID5_STORED_ID);
      expect(requestBody.nbPage).to.eq(1);

      const responseHeader = { 'Content-Type': 'application/json' };
      request.respond(200, responseHeader, JSON.stringify(ID5_JSON_RESPONSE));

      expect(coreStorage.getCookie(ID5_COOKIE_NAME)).to.be.eq(JSON.stringify(ID5_JSON_RESPONSE));
      expect(coreStorage.getCookie(ID5_NB_COOKIE_NAME)).to.be.eq('0');
    });
  });

  describe('Decode stored object', function() {
    const decodedObject = { 'id5id': ID5_STORED_ID };

    it('should properly decode from a stored object', function() {
      expect(id5IdSubmodule.decode(ID5_STORED_OBJ)).to.deep.equal(decodedObject);
    });
    it('should properly decode from a legacy stored object', function() {
      expect(id5IdSubmodule.decode(ID5_LEGACY_STORED_OBJ)).to.deep.equal(decodedObject);
    });
    it('should return undefined if passed a string', function() {
      expect(id5IdSubmodule.decode('somestring')).to.eq(undefined);
    });
  });
});
