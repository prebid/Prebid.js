import {
  parseConfig,
  generateSessionID,
  getPassport,
  setPassport,
  defaultHandleRtd,
  getBidRequestData,
  getTargetingData,
  optableSubmodule,
  LOG_PREFIX,
} from 'modules/optableRtdProvider';
import {config} from 'src/config.js';
import * as ajax from 'src/ajax.js';

describe('Optable RTD Submodule', function () {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('parseConfig', function () {
    it('parses valid config with required parameters', function () {
      const moduleConfig = {
        params: {
          host: 'dcn.customer.com',
          site: 'my-site',
        }
      };
      const result = parseConfig(moduleConfig);
      expect(result).to.not.be.null;
      expect(result.host).to.equal('dcn.customer.com');
      expect(result.site).to.equal('my-site');
      expect(result.cookies).to.be.true;
      expect(result.ids).to.deep.equal([]);
      expect(result.hids).to.deep.equal([]);
    });

    it('trims host and site values', function () {
      const moduleConfig = {
        params: {
          host: '  dcn.customer.com  ',
          site: '  my-site  ',
        }
      };
      const result = parseConfig(moduleConfig);
      expect(result.host).to.equal('dcn.customer.com');
      expect(result.site).to.equal('my-site');
    });

    it('returns null if host is missing', function () {
      const moduleConfig = {params: {site: 'my-site'}};
      expect(parseConfig(moduleConfig)).to.be.null;
    });

    it('returns null if site is missing', function () {
      const moduleConfig = {params: {host: 'dcn.customer.com'}};
      expect(parseConfig(moduleConfig)).to.be.null;
    });

    it('parses optional parameters correctly', function () {
      const handleRtdFn = () => {};
      const moduleConfig = {
        params: {
          host: 'dcn.customer.com',
          site: 'my-site',
          node: 'prod-us',
          cookies: false,
          timeout: '500ms',
          ids: ['id1', 'id2'],
          hids: ['hid1'],
          handleRtd: handleRtdFn
        }
      };
      const result = parseConfig(moduleConfig);
      expect(result.node).to.equal('prod-us');
      expect(result.cookies).to.be.false;
      expect(result.timeout).to.equal('500ms');
      expect(result.ids).to.deep.equal(['id1', 'id2']);
      expect(result.hids).to.deep.equal(['hid1']);
      expect(result.handleRtd).to.equal(handleRtdFn);
    });

    it('returns null if handleRtd is not a function', function () {
      const moduleConfig = {
        params: {
          host: 'dcn.customer.com',
          site: 'my-site',
          handleRtd: 'notAFunction'
        }
      };
      expect(parseConfig(moduleConfig)).to.be.null;
    });

    it('returns null if ids is not an array', function () {
      const moduleConfig = {
        params: {
          host: 'dcn.customer.com',
          site: 'my-site',
          ids: 'notAnArray'
        }
      };
      expect(parseConfig(moduleConfig)).to.be.null;
    });

    it('returns null if hids is not an array', function () {
      const moduleConfig = {
        params: {
          host: 'dcn.customer.com',
          site: 'my-site',
          hids: 'notAnArray'
        }
      };
      expect(parseConfig(moduleConfig)).to.be.null;
    });
  });

  describe('generateSessionID', function () {
    it('generates a session ID', function () {
      const sid = generateSessionID();
      expect(sid).to.be.a('string');
      expect(sid.length).to.be.greaterThan(0);
    });

    it('returns the same session ID on subsequent calls', function () {
      const sid1 = generateSessionID();
      const sid2 = generateSessionID();
      expect(sid1).to.equal(sid2);
    });

    it('generates base64url encoded string', function () {
      const sid = generateSessionID();
      // base64url should not contain +, /, or =
      expect(sid).to.not.match(/[+/=]/);
    });
  });

  describe('passport storage', function () {
    let storageStub;

    beforeEach(() => {
      storageStub = {
        getDataFromLocalStorage: sandbox.stub(),
        setDataInLocalStorage: sandbox.stub()
      };
      // Mock storage manager
      sandbox.stub(require('src/storageManager'), 'getStorageManager').returns(storageStub);
    });

    it('getPassport retrieves passport from localStorage', function () {
      storageStub.getDataFromLocalStorage.returns('test-passport-value');
      const passport = getPassport('dcn.customer.com');
      expect(passport).to.equal('test-passport-value');
      expect(storageStub.getDataFromLocalStorage.calledOnce).to.be.true;
    });

    it('setPassport stores passport in localStorage', function () {
      setPassport('dcn.customer.com', null, 'new-passport-value');
      expect(storageStub.setDataInLocalStorage.calledOnce).to.be.true;
      const args = storageStub.setDataInLocalStorage.getCall(0).args;
      expect(args[1]).to.equal('new-passport-value');
    });

    it('generates different keys for different hosts', function () {
      setPassport('dcn1.customer.com', null, 'passport1');
      setPassport('dcn2.customer.com', null, 'passport2');
      expect(storageStub.setDataInLocalStorage.calledTwice).to.be.true;
      const key1 = storageStub.setDataInLocalStorage.getCall(0).args[0];
      const key2 = storageStub.setDataInLocalStorage.getCall(1).args[0];
      expect(key1).to.not.equal(key2);
    });

    it('generates different keys for same host with different nodes', function () {
      setPassport('dcn.customer.com', 'node1', 'passport1');
      setPassport('dcn.customer.com', 'node2', 'passport2');
      const key1 = storageStub.setDataInLocalStorage.getCall(0).args[0];
      const key2 = storageStub.setDataInLocalStorage.getCall(1).args[0];
      expect(key1).to.not.equal(key2);
    });
  });

  describe('defaultHandleRtd', function () {
    let reqBidsConfigObj, mergeFn;

    beforeEach(() => {
      reqBidsConfigObj = {ortb2Fragments: {global: {}}};
      mergeFn = sinon.spy();
    });

    it('merges valid targeting data into the global ORTB2 object', function () {
      const targetingData = {
        ortb2: {
          user: {
            eids: [{source: 'optable.co', uids: [{id: 'test-id'}]}]
          }
        }
      };

      defaultHandleRtd(reqBidsConfigObj, targetingData, mergeFn);
      expect(mergeFn.calledWith(reqBidsConfigObj.ortb2Fragments.global, targetingData.ortb2)).to.be.true;
    });

    it('does nothing if targeting data is missing ortb2', function () {
      defaultHandleRtd(reqBidsConfigObj, {}, mergeFn);
      expect(mergeFn.called).to.be.false;
    });

    it('does nothing if targeting data is null', function () {
      defaultHandleRtd(reqBidsConfigObj, null, mergeFn);
      expect(mergeFn.called).to.be.false;
    });

    it('adds eids to user.ext.eids for additional coverage', function () {
      const targetingData = {
        ortb2: {
          user: {
            eids: [
              {source: 'optable.co', uids: [{id: 'test-id-1'}]},
              {source: 'other.com', uids: [{id: 'test-id-2'}]}
            ]
          }
        }
      };

      defaultHandleRtd(reqBidsConfigObj, targetingData, mergeFn);

      // Check that user.ext.eids was populated
      expect(reqBidsConfigObj.ortb2Fragments.global.user).to.exist;
      expect(reqBidsConfigObj.ortb2Fragments.global.user.ext).to.exist;
      expect(reqBidsConfigObj.ortb2Fragments.global.user.ext.eids).to.exist;
      expect(reqBidsConfigObj.ortb2Fragments.global.user.ext.eids.length).to.equal(2);
    });
  });

  describe('getBidRequestData', function () {
    let reqBidsConfigObj, callback, moduleConfig, ajaxStub, configStub;

    beforeEach(() => {
      reqBidsConfigObj = {
        ortb2Fragments: {
          global: {
            user: {
              ext: {
                eids: []
              }
            }
          }
        }
      };
      callback = sinon.spy();
      moduleConfig = {
        params: {
          host: 'dcn.customer.com',
          site: 'my-site',
          ids: ['id1'],
          hids: []
        }
      };

      // Mock ajax
      ajaxStub = sandbox.stub(ajax, 'ajax');

      // Mock config.getConfig for consent
      configStub = sandbox.stub(config, 'getConfig');
      configStub.withArgs('consentManagement.gpp').returns(null);
      configStub.withArgs('consentManagement.gdpr').returns(null);
    });

    it('calls targeting API with correct parameters', async function () {
      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('https://dcn.customer.com/v2/targeting');
        expect(url).to.include('o=my-site');
        expect(url).to.include('id=id1');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(ajaxStub.calledOnce).to.be.true;
      expect(callback.calledOnce).to.be.true;
    });

    it('handles API errors gracefully', async function () {
      ajaxStub.callsFake((url, options) => {
        options.error('Network error');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(callback.calledOnce).to.be.true;
    });

    it('uses cached data if available', async function () {
      // Mock localStorage to return cached data
      const storageStub = {
        getDataFromLocalStorage: sandbox.stub(),
        setDataInLocalStorage: sandbox.stub()
      };
      storageStub.getDataFromLocalStorage.returns(JSON.stringify({
        ortb2: {
          user: {
            eids: [{source: 'cached.com', uids: [{id: 'cached-id'}]}]
          }
        }
      }));
      sandbox.stub(require('src/storageManager'), 'getStorageManager').returns(storageStub);

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      // Should not call ajax if cache is available
      expect(ajaxStub.called).to.be.false;
      expect(callback.calledOnce).to.be.true;
    });

    it('includes consent parameters in API call', async function () {
      configStub.withArgs('consentManagement.gpp').returns({
        gppString: 'DBABMA~test',
        applicableSections: [2, 6]
      });
      configStub.withArgs('consentManagement.gdpr').returns({
        gdprApplies: true,
        consentString: 'CPXxxx'
      });

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('gpp=DBABMA~test');
        expect(url).to.include('gpp_sid=2,6');
        expect(url).to.include('gdpr_consent=CPXxxx');
        expect(url).to.include('gdpr=1');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('extracts identifiers from Prebid userId module', async function () {
      reqBidsConfigObj.ortb2Fragments.global.user.ext.eids = [
        {
          source: 'id5-sync.com',
          uids: [{id: 'id5-user-id'}]
        }
      ];

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('id=id1'); // from config
        expect(url).to.include('id=id5-user-id'); // from userId module
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('includes node parameter if provided', async function () {
      moduleConfig.params.node = 'prod-us';

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('t=prod-us');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('includes timeout parameter if provided', async function () {
      moduleConfig.params.timeout = '500ms';

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('timeout=500ms');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('handles cookieless mode correctly', async function () {
      moduleConfig.params.cookies = false;

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('cookies=no');
        expect(url).to.include('passport=');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('handles invalid config gracefully', async function () {
      moduleConfig.params.host = null;

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(ajaxStub.called).to.be.false;
      expect(callback.calledOnce).to.be.true;
    });

    it('uses custom handleRtd function if provided', async function () {
      const customHandleRtd = sinon.spy();
      moduleConfig.params.handleRtd = customHandleRtd;

      ajaxStub.callsFake((url, options) => {
        options.success('{"ortb2":{"user":{"eids":[{"source":"test.com"}]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(customHandleRtd.calledOnce).to.be.true;
      expect(callback.calledOnce).to.be.true;
    });

    it('caches targeting response after API call', async function () {
      const storageStub = {
        getDataFromLocalStorage: sandbox.stub().returns(null),
        setDataInLocalStorage: sandbox.stub()
      };
      sandbox.stub(require('src/storageManager'), 'getStorageManager').returns(storageStub);

      ajaxStub.callsFake((url, options) => {
        options.success('{"ortb2":{"user":{"eids":[{"source":"test.com"}]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(storageStub.setDataInLocalStorage.called).to.be.true;
    });
  });

  describe('getTargetingData', function () {
    it('returns empty object (ad server targeting not supported)', function () {
      const result = getTargetingData(['adUnit1'], {}, {}, {});
      expect(result).to.deep.equal({});
    });
  });

  describe('init', function () {
    it('initializes Optable RTD module', function () {
      expect(optableSubmodule.init()).to.be.true;
    });
  });

  describe('submodule structure', function () {
    it('exports the correct submodule structure', function () {
      expect(optableSubmodule.name).to.equal('optable');
      expect(optableSubmodule.init).to.be.a('function');
      expect(optableSubmodule.getBidRequestData).to.be.a('function');
      expect(optableSubmodule.getTargetingData).to.be.a('function');
    });
  });
});
