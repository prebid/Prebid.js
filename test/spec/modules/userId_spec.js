import {attachIdSystem, init, requestBidsHook, setSubmoduleRegistry, syncDelay} from 'modules/userId/index.js';
import {config} from 'src/config';
import * as utils from 'src/utils';
import {unifiedIdSubmodule} from 'modules/userId/unifiedIdSystem';
import {pubCommonIdSubmodule} from 'modules/userId/pubCommonIdSystem';
import {id5IdSubmodule} from 'modules/id5IdSystem';
import {identityLinkSubmodule} from 'modules/identityLinkIdSystem';

let assert = require('chai').assert;
let expect = require('chai').expect;
let events = require('src/events');
let constants = require('src/constants.json');
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';

describe('User ID', function() {
  function getConfigMock(configArr1, configArr2, configArr3, configArr4) {
    return {
      userSync: {
        syncDelay: 0,
        userIds: [
          (configArr1 && configArr1.length >= 3) ? getStorageMock.apply(null, configArr1) : null,
          (configArr2 && configArr2.length >= 3) ? getStorageMock.apply(null, configArr2) : null,
          (configArr3 && configArr3.length >= 3) ? getStorageMock.apply(null, configArr3) : null,
          (configArr4 && configArr4.length >= 3) ? getStorageMock.apply(null, configArr4) : null
        ].filter(i => i)}
    }
  }
  function getStorageMock(name = 'pubCommonId', key = 'pubcid', type = 'cookie', expires = 30, refreshInSeconds) {
    return { name: name, storage: { name: key, type: type, expires: expires, refreshInSeconds: refreshInSeconds } }
  }
  function getConfigValueMock(name, value) {
    return {
      userSync: { syncDelay: 0, userIds: [{ name: name, value: value }] }
    }
  }

  function getAdUnitMock(code = 'adUnit-code') {
    return {
      code,
      mediaTypes: {banner: {}, native: {}},
      sizes: [[300, 200], [300, 600]],
      bids: [{bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}]
    };
  }

  function addConfig(cfg, name, value) {
    if (cfg && cfg.userSync && cfg.userSync.userIds) {
      cfg.userSync.userIds.forEach(element => {
        if (element[name] !== undefined) { element[name] = Object.assign(element[name], value); } else { element[name] = value; }
      });
    }

    return cfg;
  }

  before(function() {
    utils.setCookie('_pubcid_optout', '', EXPIRED_COOKIE_DATE);
    localStorage.removeItem('_pbjs_id_optout');
    localStorage.removeItem('_pubcid_optout');
  });

  describe('Decorate Ad Units', function() {
    beforeEach(function() {
      utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('pubcid_alt', 'altpubcid200000', (new Date(Date.now() + 5000).toUTCString()));
      sinon.spy(utils, 'setCookie');
    });

    afterEach(function () {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      config.resetConfig();
      utils.setCookie.restore();
    });

    after(function() {
      utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('pubcid_alt', '', EXPIRED_COOKIE_DATE);
    });

    it('Check same cookie behavior', function () {
      let adUnits1 = [getAdUnitMock()];
      let adUnits2 = [getAdUnitMock()];
      let innerAdUnits1;
      let innerAdUnits2;

      let pubcid = utils.getCookie('pubcid');
      expect(pubcid).to.be.null; // there should be no cookie initially

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));

      requestBidsHook(config => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
      pubcid = utils.getCookie('pubcid'); // cookies is created after requestbidHook

      innerAdUnits1.forEach(unit => {
        unit.bids.forEach(bid => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(pubcid);
        });
      });

      requestBidsHook(config => { innerAdUnits2 = config.adUnits }, {adUnits: adUnits2});
      assert.deepEqual(innerAdUnits1, innerAdUnits2);
    });

    it('Check different cookies', function () {
      let adUnits1 = [getAdUnitMock()];
      let adUnits2 = [getAdUnitMock()];
      let innerAdUnits1;
      let innerAdUnits2;
      let pubcid1;
      let pubcid2;

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      requestBidsHook((config) => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
      pubcid1 = utils.getCookie('pubcid'); // get first cookie
      utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE); // erase cookie

      innerAdUnits1.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(pubcid1);
        });
      });

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      requestBidsHook((config) => { innerAdUnits2 = config.adUnits }, {adUnits: adUnits2});

      pubcid2 = utils.getCookie('pubcid'); // get second cookie

      innerAdUnits2.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(pubcid2);
        });
      });

      expect(pubcid1).to.not.equal(pubcid2);
    });

    it('Use existing cookie', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']));
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal('altpubcid200000');
        });
      });
      // Because the cookie exists already, there should be no setCookie call by default
      expect(utils.setCookie.callCount).to.equal(0);
    });

    it('Extend cookie', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customConfig = getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {extend: true});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customConfig);
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal('altpubcid200000');
        });
      });
      // Because extend is true, the cookie will be updated even if it exists already
      expect(utils.setCookie.callCount).to.equal(1);
    });

    it('Disable auto create', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customConfig = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {create: false});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customConfig);
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.not.have.deep.nested.property('userId.pubcid');
        });
      });
      expect(utils.setCookie.callCount).to.equal(0);
    });
  });

  describe('Opt out', function () {
    before(function () {
      utils.setCookie('_pbjs_id_optout', '1', (new Date(Date.now() + 5000).toUTCString()));
    });

    beforeEach(function () {
      sinon.stub(utils, 'logInfo');
    });

    afterEach(function () {
      // removed cookie
      utils.setCookie('_pbjs_id_optout', '', EXPIRED_COOKIE_DATE);
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      utils.logInfo.restore();
      config.resetConfig();
    });

    after(function () {
      utils.setCookie('_pbjs_id_optout', '', EXPIRED_COOKIE_DATE);
    });

    it('fails initialization if opt out cookie exists', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - opt-out cookie found, exit module');
    });

    it('initializes if no opt out cookie exists', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - usersync config updated for 1 submodules');
    });
  });

  describe('Handle variations of config values', function () {
    beforeEach(function () {
      sinon.stub(utils, 'logInfo');
    });

    afterEach(function () {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      utils.logInfo.restore();
      config.resetConfig();
    });

    it('handles config with no usersync object', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule]);
      init(config);
      config.setConfig({});
      // usersync is undefined, and no logInfo message for 'User ID - usersync config updated'
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with empty usersync object', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule]);
      init(config);
      config.setConfig({ usersync: {} });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds that are empty objs', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule]);
      init(config);
      config.setConfig({
        usersync: {
          userIds: [{}]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds with empty names or that dont match a submodule.name', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule]);
      init(config);
      config.setConfig({
        usersync: {
          userIds: [{
            name: '',
            value: { test: '1' }
          }, {
            name: 'foo',
            value: { test: '1' }
          }]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('config with 1 configuration should create 1 submodule', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['unifiedId', 'unifiedid', 'cookie']));

      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - usersync config updated for 1 submodules');
    });

    it('config with 4 configurations should result in 4 submodules add', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule]);
      init(config);
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubCommonId', value: {'pubcid': '11111'}
          }, {
            name: 'unifiedId',
            storage: { name: 'unifiedid', type: 'cookie' }
          }, {
            name: 'id5Id',
            storage: { name: 'id5id', type: 'cookie' }
          }, {
            name: 'identityLink',
            storage: { name: 'idl_env', type: 'cookie' }
          }]
        }
      });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - usersync config updated for 4 submodules');
    });

    it('config syncDelay updates module correctly', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule]);
      init(config);
      config.setConfig({
        usersync: {
          syncDelay: 99,
          userIds: [{
            name: 'unifiedId',
            storage: { name: 'unifiedid', type: 'cookie' }
          }]
        }
      });
      expect(syncDelay).to.equal(99);
    });
  });

  describe('Request bids hook appends userId to bid objs in adapters', function() {
    let adUnits;

    beforeEach(function() {
      adUnits = [getAdUnitMock()];
    });

    it('test hook from pubcommonid cookie', function(done) {
      utils.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
          });
        });
        utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from pubcommonid config value object', function(done) {
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigValueMock('pubCommonId', {'pubcidvalue': 'testpubcidvalue'}));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.pubcidvalue');
            expect(bid.userId.pubcidvalue).to.equal('testpubcidvalue');
          });
        });
        done();
      }, {adUnits});
    });

    it('test hook from pubcommonid html5', function(done) {
      // simulate existing browser local storage values
      localStorage.setItem('unifiedid_alt', JSON.stringify({'TDID': 'testunifiedid_alt'}));
      localStorage.setItem('unifiedid_alt_exp', '');

      setSubmoduleRegistry([unifiedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['unifiedId', 'unifiedid_alt', 'html5']));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('testunifiedid_alt');
          });
        });
        localStorage.removeItem('unifiedid_alt');
        localStorage.removeItem('unifiedid_alt_exp');
        done();
      }, {adUnits});
    });

    it('test hook from identityLink html5', function(done) {
      // simulate existing browser local storage values
      localStorage.setItem('idl_env', 'AiGNC8Z5ONyZKSpIPf');
      localStorage.setItem('idl_env_exp', '');

      setSubmoduleRegistry([identityLinkSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['identityLink', 'idl_env', 'html5']));
      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.idl_env');
            expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
          });
        });
        localStorage.removeItem('idl_env');
        localStorage.removeItem('idl_env_exp');
        done();
      }, {adUnits});
    });

    it('test hook from identityLink cookie', function(done) {
      utils.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([identityLinkSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['identityLink', 'idl_env', 'cookie']));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.idl_env');
            expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
          });
        });
        utils.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from id5id cookies when refresh needed', function(done) {
      // simulate existing browser local storage values
      utils.setCookie('id5id', JSON.stringify({'ID5ID': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      utils.setCookie('id5id_last', (new Date(Date.now() - 7200 * 1000)).toUTCString(), (new Date(Date.now() + 5000).toUTCString()));

      sinon.stub(utils, 'logError'); // getId should failed with a logError as it has no partnerId

      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['id5Id', 'id5id', 'cookie', 10, 3600]));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.id5id');
            expect(bid.userId.id5id).to.equal('testid5id');
          });
        });
        sinon.assert.calledOnce(utils.logError);
        utils.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
        utils.logError.restore();
        done();
      }, {adUnits});
    });

    it('test hook from id5id value-based config', function(done) {
      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(getConfigValueMock('id5Id', {'id5id': 'testid5id'}));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.id5id');
            expect(bid.userId.id5id).to.equal('testid5id');
          });
        });
        done();
      }, {adUnits});
    });

    it('test hook when pubCommonId, unifiedId and id5Id have data to pass', function(done) {
      utils.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      utils.setCookie('unifiedid', JSON.stringify({'TDID': 'testunifiedid'}), (new Date(Date.now() + 5000).toUTCString()));
      utils.setCookie('id5id', JSON.stringify({'ID5ID': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      utils.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie'],
        ['unifiedId', 'unifiedid', 'cookie'],
        ['id5Id', 'id5id', 'cookie'],
        ['identityLink', 'idl_env', 'cookie']));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            // also check that UnifiedId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('testunifiedid');
            // also check that Id5Id id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.id5id');
            expect(bid.userId.id5id).to.equal('testid5id');
            // check that identityLink id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.idl_env');
            expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
          });
        });
        utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook when pubCommonId, unifiedId and id5Id have their modules added before and after init', function(done) {
      utils.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      utils.setCookie('unifiedid', JSON.stringify({'TDID': 'cookie-value-add-module-variations'}), new Date(Date.now() + 5000).toUTCString());
      utils.setCookie('id5id', JSON.stringify({'ID5ID': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      utils.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', new Date(Date.now() + 5000).toUTCString());

      setSubmoduleRegistry([]);

      // attaching before init
      attachIdSystem(pubCommonIdSubmodule);

      init(config);

      // attaching after init
      attachIdSystem(unifiedIdSubmodule);
      attachIdSystem(id5IdSubmodule);
      attachIdSystem(identityLinkSubmodule);

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie'],
        ['unifiedId', 'unifiedid', 'cookie'],
        ['id5Id', 'id5id', 'cookie'],
        ['identityLink', 'idl_env', 'cookie']));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            // also check that UnifiedId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('cookie-value-add-module-variations');
            // also check that Id5Id id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.id5id');
            expect(bid.userId.id5id).to.equal('testid5id');
            // also check that identityLink id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.idl_env');
            expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
          });
        });
        utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('should add new id system ', function(done) {
      utils.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      utils.setCookie('unifiedid', JSON.stringify({'TDID': 'cookie-value-add-module-variations'}), new Date(Date.now() + 5000).toUTCString());
      utils.setCookie('id5id', JSON.stringify({'ID5ID': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      utils.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', new Date(Date.now() + 5000).toUTCString());
      utils.setCookie('MOCKID', JSON.stringify({'MOCKID': '123456778'}), new Date(Date.now() + 5000).toUTCString());

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule]);
      init(config);

      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubCommonId', storage: { name: 'pubcid', type: 'cookie' }
          }, {
            name: 'unifiedId', storage: { name: 'unifiedid', type: 'cookie' }
          }, {
            name: 'id5Id', storage: { name: 'id5id', type: 'cookie' }
          }, {
            name: 'identityLink', storage: { name: 'idl_env', type: 'cookie' }
          }, {
            name: 'mockId', storage: { name: 'MOCKID', type: 'cookie' }
          }]
        }
      });

      // Add new submodule named 'mockId'
      attachIdSystem({
        name: 'mockId',
        decode: function(value) {
          return {
            'mid': value['MOCKID']
          };
        },
        getId: function(params, storedId) {
          if (storedId) return {};
          return {id: {'MOCKID': '1234'}};
        }
      });

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // check PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            // check UnifiedId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('cookie-value-add-module-variations');
            // also check that Id5Id id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.id5id');
            expect(bid.userId.id5id).to.equal('testid5id');
            // also check that identityLink id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.idl_env');
            expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
            // check MockId data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.mid');
            expect(bid.userId.mid).to.equal('123456778');
          });
        });
        utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });
  });

  describe('callbacks at the end of auction', function() {
    let xhr;
    let requests;

    beforeEach(function() {
      requests = [];
      xhr = sinon.useFakeXMLHttpRequest();
      xhr.onCreate = request => requests.push(request);
      sinon.stub(events, 'getEvents').returns([]);
      sinon.stub(utils, 'triggerPixel');
      utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
    });

    afterEach(function() {
      xhr.restore();
      events.getEvents.restore();
      utils.triggerPixel.restore();
      utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
    });

    it('pubcid callback with url', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customCfg = getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']);
      customCfg = addConfig(customCfg, 'params', {pixelUrl: '/any/pubcid/url'});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customCfg);
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(utils.triggerPixel.called).to.be.false;
      events.emit(constants.EVENTS.AUCTION_END, {});
      expect(utils.triggerPixel.getCall(0).args[0]).to.include('/any/pubcid/url');
    });

    it('unifiedid callback with url', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customCfg = getConfigMock(['unifiedId', 'unifiedid', 'cookie']);
      addConfig(customCfg, 'params', {url: '/any/unifiedid/url'});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customCfg);
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(requests).to.be.empty;
      events.emit(constants.EVENTS.AUCTION_END, {});
      expect(requests[0].url).to.equal('/any/unifiedid/url');
    });

    it('unifiedid callback with partner', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customCfg = getConfigMock(['unifiedId', 'unifiedid', 'cookie']);
      addConfig(customCfg, 'params', {partner: 'rubicon'});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customCfg);
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(requests).to.be.empty;
      events.emit(constants.EVENTS.AUCTION_END, {});
      expect(requests[0].url).to.equal('//match.adsrvr.org/track/rid?ttd_pid=rubicon&fmt=json');
    });
  });
});
