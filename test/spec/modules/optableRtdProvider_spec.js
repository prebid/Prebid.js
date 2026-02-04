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
import {getStorageManager} from 'src/storageManager.js';
import * as ajax from 'src/ajax.js';

describe('Optable RTD Submodule', function () {
  let sandbox;
  let storage;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    storage = getStorageManager({moduleType: 'rtd', moduleName: 'optable'});
    sandbox.stub(storage, 'getDataFromLocalStorage');
    sandbox.stub(storage, 'setDataInLocalStorage');
  });

  afterEach(() => {
    sandbox.restore();
    // Clear localStorage between tests
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('parseConfig', function () {
    it('parses valid config with required Direct API parameters', function () {
      const moduleConfig = {
        params: {
          host: 'dcn.customer.com',
          site: 'my-site',
          node: 'my-node'
        }
      };
      const result = parseConfig(moduleConfig);
      expect(result).to.not.be.null;
      expect(result.host).to.equal('dcn.customer.com');
      expect(result.site).to.equal('my-site');
      expect(result.node).to.equal('my-node');
      expect(result.cookies).to.be.true;
      expect(result.ids).to.deep.equal([]);
      expect(result.hids).to.deep.equal([]);
      expect(result.hasDirectApiConfig).to.be.true;
    });

    it('parses SDK mode config without Direct API params', function () {
      const moduleConfig = {
        params: {
          adserverTargeting: true,
          instance: 'custom'
        }
      };
      const result = parseConfig(moduleConfig);
      expect(result).to.not.be.null;
      expect(result.adserverTargeting).to.be.true;
      expect(result.instance).to.equal('custom');
      expect(result.hasDirectApiConfig).to.be.false;
    });

    it('trims host, site, and node values', function () {
      const moduleConfig = {
        params: {
          host: '  dcn.customer.com  ',
          site: '  my-site  ',
          node: '  my-node  '
        }
      };
      const result = parseConfig(moduleConfig);
      expect(result.host).to.equal('dcn.customer.com');
      expect(result.site).to.equal('my-site');
      expect(result.node).to.equal('my-node');
    });

    it('accepts config with null host/site/node (SDK mode)', function () {
      const moduleConfig = {params: {adserverTargeting: true}};
      const result = parseConfig(moduleConfig);
      expect(result).to.not.be.null;
      expect(result.hasDirectApiConfig).to.be.false;
    });

    it('returns null if host is empty string', function () {
      const moduleConfig = {params: {host: '', site: 'my-site', node: 'my-node'}};
      expect(parseConfig(moduleConfig)).to.be.null;
    });

    it('returns null if site is empty string', function () {
      const moduleConfig = {params: {host: 'dcn.customer.com', site: '', node: 'my-node'}};
      expect(parseConfig(moduleConfig)).to.be.null;
    });

    it('returns null if node is empty string', function () {
      const moduleConfig = {params: {host: 'dcn.customer.com', site: 'my-site', node: ''}};
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
          handleRtd: handleRtdFn,
          adserverTargeting: false,
          instance: 'custom'
        }
      };
      const result = parseConfig(moduleConfig);
      expect(result.node).to.equal('prod-us');
      expect(result.cookies).to.be.false;
      expect(result.timeout).to.equal('500ms');
      expect(result.ids).to.deep.equal(['id1', 'id2']);
      expect(result.hids).to.deep.equal(['hid1']);
      expect(result.handleRtd).to.equal(handleRtdFn);
      expect(result.adserverTargeting).to.be.false;
      expect(result.instance).to.equal('custom');
    });

    it('returns null if handleRtd is not a function', function () {
      const moduleConfig = {
        params: {
          host: 'dcn.customer.com',
          site: 'my-site',
          node: 'my-node',
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
          node: 'my-node',
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
          node: 'my-node',
          hids: 'notAnArray'
        }
      };
      expect(parseConfig(moduleConfig)).to.be.null;
    });

    it('returns null and logs error for deprecated bundleUrl parameter', function () {
      const moduleConfig = {
        params: {
          bundleUrl: 'https://example.cdn.optable.co/bundle.js'
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

    it('returns the same session ID on subsequent calls (singleton)', function () {
      const sid1 = generateSessionID();
      const sid2 = generateSessionID();
      expect(sid1).to.equal(sid2);
    });

    it('generates base64url encoded string without +/= characters', function () {
      const sid = generateSessionID();
      expect(sid).to.not.match(/[+/=]/);
    });
  });

  describe('passport storage', function () {
    it('getPassport retrieves passport from localStorage', function () {
      storage.getDataFromLocalStorage.returns('test-passport-value');
      const passport = getPassport('dcn.customer.com', 'node1');
      expect(passport).to.equal('test-passport-value');
      expect(storage.getDataFromLocalStorage.calledOnce).to.be.true;
    });

    it('setPassport stores passport in localStorage', function () {
      setPassport('dcn.customer.com', 'node1', 'new-passport-value');
      expect(storage.setDataInLocalStorage.calledOnce).to.be.true;
      const args = storage.setDataInLocalStorage.getCall(0).args;
      expect(args[1]).to.equal('new-passport-value');
    });

    it('generates different keys for different hosts', function () {
      setPassport('dcn1.customer.com', 'node1', 'passport1');
      setPassport('dcn2.customer.com', 'node1', 'passport2');
      expect(storage.setDataInLocalStorage.calledTwice).to.be.true;
      const key1 = storage.setDataInLocalStorage.getCall(0).args[0];
      const key2 = storage.setDataInLocalStorage.getCall(1).args[0];
      expect(key1).to.not.equal(key2);
    });

    it('generates different keys for same host with different nodes', function () {
      setPassport('dcn.customer.com', 'node1', 'passport1');
      setPassport('dcn.customer.com', 'node2', 'passport2');
      const key1 = storage.setDataInLocalStorage.getCall(0).args[0];
      const key2 = storage.setDataInLocalStorage.getCall(1).args[0];
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
  });

  describe('getBidRequestData - Direct API Mode', function () {
    let reqBidsConfigObj, callback, moduleConfig, ajaxStub;

    beforeEach(() => {
      reqBidsConfigObj = {
        ortb2Fragments: {
          global: {}
        }
      };
      callback = sinon.spy();
      moduleConfig = {
        params: {
          host: 'dcn.customer.com',
          site: 'my-site',
          node: 'my-node',
          ids: ['id1'],
          hids: []
        }
      };

      ajaxStub = sandbox.stub(ajax, 'ajax');
      // Stub window.optable to ensure Direct API mode
      delete window.optable;
    });

    it('calls targeting API with correct parameters', async function () {
      storage.getDataFromLocalStorage.returns(null); // No cache

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('https://dcn.customer.com/v2/targeting');
        expect(url).to.include('o=my-site');
        expect(url).to.include('t=my-node');
        expect(url).to.include('id=id1');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(ajaxStub.calledOnce).to.be.true;
      expect(callback.calledOnce).to.be.true;
    });

    it('uses cached data immediately and updates cache in background', async function () {
      const cachedData = {
        ortb2: {
          user: {
            eids: [{source: 'cached.com', uids: [{id: 'cached-id'}]}]
          }
        }
      };
      storage.getDataFromLocalStorage.returns(JSON.stringify(cachedData));

      let apiCallMade = false;
      ajaxStub.callsFake((url, options) => {
        apiCallMade = true;
        // Simulate async API call
        setTimeout(() => {
          options.success('{"ortb2":{"user":{"eids":[{"source":"fresh.com"}]}}}');
        }, 10);
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      // Callback should be called immediately with cached data
      expect(callback.calledOnce).to.be.true;
      // API call should still be made for background update
      expect(apiCallMade).to.be.true;
    });

    it('waits for API call when no cache available', async function () {
      storage.getDataFromLocalStorage.returns(null); // No cache

      ajaxStub.callsFake((url, options) => {
        options.success('{"ortb2":{"user":{"eids":[{"source":"fresh.com"}]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(ajaxStub.calledOnce).to.be.true;
      expect(callback.calledOnce).to.be.true;
      expect(storage.setDataInLocalStorage.called).to.be.true; // Cache updated
    });

    it('handles API errors gracefully', async function () {
      storage.getDataFromLocalStorage.returns(null);

      ajaxStub.callsFake((url, options) => {
        options.error('Network error');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(callback.calledOnce).to.be.true;
    });

    it('includes consent parameters in API call', async function () {
      storage.getDataFromLocalStorage.returns(null);

      const userConsent = {
        gpp: {
          gppString: 'DBABMA~test',
          applicableSections: [2, 6]
        },
        gdpr: {
          gdprApplies: true,
          consentString: 'CPXxxx'
        }
      };

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('gpp=DBABMA~test');
        expect(url).to.include('gpp_sid=2,6');
        expect(url).to.include('gdpr_consent=CPXxxx');
        expect(url).to.include('gdpr=1');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, userConsent);
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('adds default __passport__ ID when no IDs configured', async function () {
      storage.getDataFromLocalStorage.returns(null);
      moduleConfig.params.ids = [];

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('id=__passport__');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('includes passport in cookieless mode', async function () {
      storage.getDataFromLocalStorage.returns(null);
      moduleConfig.params.cookies = false;
      storage.getDataFromLocalStorage.withArgs(sinon.match(/OPTABLE_PASSPORT/)).returns('test-passport');

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('cookies=no');
        expect(url).to.include('passport=test-passport');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('includes cookies=yes in cookie mode', async function () {
      storage.getDataFromLocalStorage.returns(null);
      moduleConfig.params.cookies = true;

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('cookies=yes');
        expect(url).to.not.include('passport=');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('updates passport from API response', async function () {
      storage.getDataFromLocalStorage.returns(null);

      ajaxStub.callsFake((url, options) => {
        options.success('{"ortb2":{"user":{"eids":[]}},"passport":"new-passport-value"}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      // Check that passport was stored
      const passportCall = storage.setDataInLocalStorage.getCalls().find(call =>
        call.args[0].includes('OPTABLE_PASSPORT')
      );
      expect(passportCall).to.exist;
      expect(passportCall.args[1]).to.equal('new-passport-value');
    });

    it('derives timeout from auctionDelay', async function () {
      storage.getDataFromLocalStorage.returns(null);
      const auctionTimeout = 2500;

      ajaxStub.callsFake((url, options) => {
        // Should use auctionDelay - 100ms = 2400ms
        expect(url).to.include('timeout=2400');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {}, auctionTimeout);
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('uses config timeout when auctionDelay not available', async function () {
      storage.getDataFromLocalStorage.returns(null);
      moduleConfig.params.timeout = 1000;

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('timeout=1000');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('uses custom handleRtd function if provided', async function () {
      storage.getDataFromLocalStorage.returns(null);
      const customHandleRtd = sinon.spy();
      moduleConfig.params.handleRtd = customHandleRtd;

      ajaxStub.callsFake((url, options) => {
        options.success('{"ortb2":{"user":{"eids":[{"source":"test.com"}]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(customHandleRtd.calledOnce).to.be.true;
      expect(callback.calledOnce).to.be.true;
    });

    it('handles invalid config gracefully', async function () {
      moduleConfig.params.host = null;

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(ajaxStub.called).to.be.false;
      expect(callback.calledOnce).to.be.true;
    });
  });

  describe('getBidRequestData - SDK Mode', function () {
    let reqBidsConfigObj, callback, moduleConfig;

    beforeEach(() => {
      reqBidsConfigObj = {ortb2Fragments: {global: {}}};
      callback = sinon.spy();
      moduleConfig = {params: {instance: 'instance', adserverTargeting: true}};

      // Mock SDK availability
      window.optable = {
        instance: {
          targeting: sinon.stub(),
          targetingFromCache: sinon.stub().returns(null)
        }
      };
    });

    afterEach(() => {
      delete window.optable;
    });

    it('uses SDK mode when window.optable is available', async function () {
      const targetingData = {
        ortb2: {
          user: {eids: [{source: 'optable.co', uids: [{id: 'sdk-id'}]}]}
        }
      };

      // Simulate SDK event
      setTimeout(() => {
        const event = new CustomEvent('optable-targeting:change', {detail: targetingData});
        window.dispatchEvent(event);
      }, 10);

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(callback.calledOnce).to.be.true;
    });

    it('uses SDK cached data if available', async function () {
      const cachedData = {
        ortb2: {user: {eids: [{source: 'cached.com'}]}}
      };
      window.optable.instance.targetingFromCache.returns(cachedData);

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(callback.calledOnce).to.be.true;
    });
  });

  describe('getBidRequestData - Mode Detection', function () {
    let reqBidsConfigObj, callback;

    beforeEach(() => {
      reqBidsConfigObj = {ortb2Fragments: {global: {}}};
      callback = sinon.spy();
      delete window.optable;
    });

    it('errors when neither SDK nor Direct API params configured', async function () {
      const moduleConfig = {params: {}};

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(callback.calledOnce).to.be.true;
      // Should log error about missing configuration
    });
  });

  describe('getTargetingData', function () {
    it('returns empty object when SDK not available', function () {
      delete window.optable;
      const moduleConfig = {params: {host: 'test', site: 'test', node: 'test'}};
      const result = getTargetingData(['adUnit1'], moduleConfig, {}, {});
      expect(result).to.deep.equal({});
    });

    it('returns targeting data when SDK available', function () {
      window.optable = {
        instance: {
          targetingKeyValuesFromCache: sinon.stub().returns({
            'optable_segment': ['seg1', 'seg2']
          })
        }
      };

      const moduleConfig = {params: {adserverTargeting: true}};
      const result = getTargetingData(['adUnit1'], moduleConfig, {}, {});

      expect(result).to.have.property('adUnit1');
      expect(result.adUnit1).to.have.property('optable_segment');

      delete window.optable;
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
