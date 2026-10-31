import {
  parseConfig,
  defaultHandleRtd,
  mergeOptableData,
  getBidRequestData,
  getTargetingData,
  optableSubmodule,
  parseTargetingConfig,
  generateSessionID,
  getPassport,
  setPassport,
  targetingHandleRtd,
  storage,
  dep,
  resetTargetingRequest,
} from 'modules/optableRtdProvider';

describe('Optable RTD Submodule', function () {
  describe('parseConfig', function () {
    it('parses valid config correctly', function () {
      const config = {
        params: {
          bundleUrl: 'https://cdn.optable.co/bundle.js',
          adserverTargeting: true,
          handleRtd: () => {}
        }
      };
      expect(parseConfig(config)).to.deep.equal({
        bundleUrl: 'https://cdn.optable.co/bundle.js',
        adserverTargeting: true,
        handleRtd: config.params.handleRtd,
      });
    });

    it('trims bundleUrl if it contains extra spaces', function () {
      const config = { params: { bundleUrl: '  https://cdn.optable.co/bundle.js  ' } };
      expect(parseConfig(config).bundleUrl).to.equal('https://cdn.optable.co/bundle.js');
    });

    it('returns null bundleUrl for invalid bundleUrl format', function () {
      expect(parseConfig({ params: { bundleUrl: 'invalidURL' } }).bundleUrl).to.be.null;
      expect(parseConfig({ params: { bundleUrl: 'www.invalid.com' } }).bundleUrl).to.be.null;
    });

    it('returns null bundleUrl for non-HTTPS bundleUrl', function () {
      expect(parseConfig({ params: { bundleUrl: 'http://cdn.optable.co/bundle.js' } }).bundleUrl).to.be.null;
      expect(parseConfig({ params: { bundleUrl: '//cdn.optable.co/bundle.js' } }).bundleUrl).to.be.null;
      expect(parseConfig({ params: { bundleUrl: '/bundle.js' } }).bundleUrl).to.be.null;
    });

    it('defaults adserverTargeting to true if missing', function () {
      expect(parseConfig(
        { params: { bundleUrl: 'https://cdn.optable.co/bundle.js' } }
      ).adserverTargeting).to.be.true;
    });

    it('returns null handleRtd if handleRtd is not a function', function () {
      expect(parseConfig({ params: { handleRtd: 'notAFunction' } }).handleRtd).to.be.null;
    });
  });

  describe('defaultHandleRtd', function () {
    let sandbox, reqBidsConfigObj, mergeFn;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      reqBidsConfigObj = { ortb2Fragments: { global: {} } };
      mergeFn = sinon.spy();
      window.optable = {
        instance: {
          targeting: sandbox.stub(),
          targetingFromCache: sandbox.stub(),
        },
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('merges valid targeting data into the global ORTB2 object', async function () {
      const targetingData = { ortb2: { user: { ext: { optable: 'testData' } } } };
      window.optable.instance.targetingFromCache.returns(targetingData);
      window.optable.instance.targeting.resolves(targetingData);

      await defaultHandleRtd(reqBidsConfigObj, {}, mergeFn);
      expect(mergeFn.calledWith(reqBidsConfigObj.ortb2Fragments.global, targetingData.ortb2)).to.be.true;
    });

    it('does nothing if targeting data is missing the ortb2 property', async function () {
      window.optable.instance.targetingFromCache.returns({});

      // Dispatch event with empty ortb2 data after a short delay
      setTimeout(() => {
        const event = new CustomEvent('optable-targeting:change', {
          detail: {}
        });
        window.dispatchEvent(event);
      }, 10);

      await defaultHandleRtd(reqBidsConfigObj, {}, mergeFn);
      expect(mergeFn.called).to.be.false;
    });

    it('uses targeting data from cache if available', async function () {
      const targetingData = { ortb2: { user: { ext: { optable: 'testData' } } } };
      window.optable.instance.targetingFromCache.returns(targetingData);

      await defaultHandleRtd(reqBidsConfigObj, {}, mergeFn);
      expect(mergeFn.calledWith(reqBidsConfigObj.ortb2Fragments.global, targetingData.ortb2)).to.be.true;
    });

    it('calls targeting function if no data is found in cache', async function () {
      const targetingData = { ortb2: { user: { ext: { optable: 'testData' } } } };
      window.optable.instance.targetingFromCache.returns(null);

      // Dispatch event with targeting data after a short delay
      setTimeout(() => {
        const event = new CustomEvent('optable-targeting:change', {
          detail: targetingData
        });
        window.dispatchEvent(event);
      }, 10);

      await defaultHandleRtd(reqBidsConfigObj, {}, mergeFn);
      expect(mergeFn.calledWith(reqBidsConfigObj.ortb2Fragments.global, targetingData.ortb2)).to.be.true;
    });
  });

  describe('mergeOptableData', function () {
    let sandbox, mergeFn, handleRtdFn, reqBidsConfigObj;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      mergeFn = sinon.spy();
      reqBidsConfigObj = { ortb2Fragments: { global: {} } };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('calls handleRtdFn synchronously if it is a regular function', async function () {
      handleRtdFn = sinon.spy();
      await mergeOptableData(handleRtdFn, reqBidsConfigObj, {}, mergeFn);
      expect(handleRtdFn.calledOnceWith(reqBidsConfigObj, {}, mergeFn)).to.be.true;
    });

    it('calls handleRtdFn asynchronously if it is an async function', async function () {
      handleRtdFn = sinon.stub().resolves();
      await mergeOptableData(handleRtdFn, reqBidsConfigObj, {}, mergeFn);
      expect(handleRtdFn.calledOnceWith(reqBidsConfigObj, {}, mergeFn)).to.be.true;
    });
  });

  describe('getBidRequestData', function () {
    let sandbox, reqBidsConfigObj, callback, moduleConfig;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      reqBidsConfigObj = { ortb2Fragments: { global: {} } };
      callback = sinon.spy();
      moduleConfig = { params: { bundleUrl: 'https://cdn.optable.co/bundle.js' } };

      sandbox.stub(window, 'optable').value({ cmd: [] });
      sandbox.stub(window.document, 'createElement');
      sandbox.stub(window.document, 'head');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('loads Optable JS bundle if bundleUrl is provided', function () {
      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(window.document.createElement.called).to.be.true;
    });

    it('uses existing Optable instance if no bundleUrl is provided', function () {
      moduleConfig.params.bundleUrl = null;
      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(window.optable.cmd.length).to.equal(1);
    });

    it('calls callback when assuming the bundle is present', function (done) {
      moduleConfig.params.bundleUrl = null;
      window.optable = {
        cmd: [],
        instance: {
          targetingFromCache: sandbox.stub().returns(null)
        }
      };

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      // Check that the function is queued
      expect(window.optable.cmd.length).to.equal(1);

      // Dispatch the event after a short delay
      setTimeout(() => {
        const event = new CustomEvent('optable-targeting:change', {
          detail: { ortb2: { user: { ext: { optable: 'testData' } } } }
        });
        window.dispatchEvent(event);
      }, 10);

      // Manually trigger the queued function
      window.optable.cmd[0]();

      setTimeout(() => {
        expect(callback.calledOnce).to.be.true;
        done();
      }, 100);
    });

    it('mergeOptableData catches error and executes callback when something goes wrong', function (done) {
      moduleConfig.params.bundleUrl = null;
      moduleConfig.params.handleRtd = () => { throw new Error('Test error'); };

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(window.optable.cmd.length).to.equal(1);
      window.optable.cmd[0]();

      setTimeout(() => {
        expect(callback.calledOnce).to.be.true;
        done();
      }, 50);
    });

    it('getBidRequestData catches error and executes callback when something goes wrong', function (done) {
      moduleConfig.params.bundleUrl = null;
      moduleConfig.params.handleRtd = 'not a function';
      window.optable = {
        cmd: [],
        instance: {
          targetingFromCache: sandbox.stub().returns(null)
        }
      };

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(window.optable.cmd.length).to.equal(1);

      // Dispatch event after a short delay
      setTimeout(() => {
        const event = new CustomEvent('optable-targeting:change', {
          detail: { ortb2: { user: { ext: { optable: 'testData' } } } }
        });
        window.dispatchEvent(event);
      }, 10);

      // Execute the queued command
      window.optable.cmd[0]();

      setTimeout(() => {
        expect(callback.calledOnce).to.be.true;
        done();
      }, 100);
    });

    it("doesn't fail when optable is not available", function (done) {
      moduleConfig.params.bundleUrl = null;
      delete window.optable;

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      // The code should have created window.optable with cmd array
      expect(window.optable).to.exist;
      expect(window.optable.cmd.length).to.equal(1);

      // Simulate optable bundle initializing and executing commands
      window.optable.instance = {
        targetingFromCache: () => null
      };

      // Dispatch event after a short delay
      setTimeout(() => {
        const event = new CustomEvent('optable-targeting:change', {
          detail: { ortb2: { user: { ext: { optable: 'testData' } } } }
        });
        window.dispatchEvent(event);
      }, 10);

      // Execute the queued command (simulating optable bundle execution)
      window.optable.cmd[0]();

      setTimeout(() => {
        expect(callback.calledOnce).to.be.true;
        done();
      }, 100);
    });
  });

  describe('getTargetingData', function () {
    let sandbox, moduleConfig;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      moduleConfig = { params: { adserverTargeting: true } };
      window.optable = { instance: { targetingKeyValuesFromCache: sandbox.stub().returns({ key1: 'value1' }) } };
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('returns correct targeting data when Optable data is available', function () {
      const result = getTargetingData(['adUnit1'], moduleConfig, {}, {});
      expect(result).to.deep.equal({ adUnit1: { key1: 'value1' } });
    });

    it('returns empty object when no Optable data is found', function () {
      window.optable.instance.targetingKeyValuesFromCache.returns({});
      expect(getTargetingData(['adUnit1'], moduleConfig, {}, {})).to.deep.equal({});
    });

    it('returns empty object when adserverTargeting is disabled', function () {
      moduleConfig.params.adserverTargeting = false;
      expect(getTargetingData(['adUnit1'], moduleConfig, {}, {})).to.deep.equal({});
    });

    it('returns empty object when provided keys contain no data', function () {
      window.optable.instance.targetingKeyValuesFromCache.returns({ key1: [] });
      expect(getTargetingData(['adUnit1'], moduleConfig, {}, {})).to.deep.equal({});

      window.optable.instance.targetingKeyValuesFromCache.returns({ key1: [], key2: [], key3: [] });
      expect(getTargetingData(['adUnit1'], moduleConfig, {}, {})).to.deep.equal({});
    });
  });

  describe('init', function () {
    it('initializes Optable RTD module', function () {
      expect(optableSubmodule.init()).to.be.true;
    });
  });
});

describe('Optable RTD Submodule - enableTargeting', function () {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    resetTargetingRequest();
    sandbox.stub(storage, 'getDataFromLocalStorage');
    sandbox.stub(storage, 'setDataInLocalStorage');
  });

  afterEach(() => {
    sandbox.restore();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  describe('parseTargetingConfig', function () {
    it('parses valid config with required Direct API parameters', function () {
      const moduleConfig = {
        params: {
          host: 'dcn.customer.com',
          site: 'my-site',
          node: 'my-node'
        }
      };
      const result = parseTargetingConfig(moduleConfig);
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
      const result = parseTargetingConfig(moduleConfig);
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
      const result = parseTargetingConfig(moduleConfig);
      expect(result.host).to.equal('dcn.customer.com');
      expect(result.site).to.equal('my-site');
      expect(result.node).to.equal('my-node');
    });

    it('accepts config with null host/site/node (SDK mode)', function () {
      const moduleConfig = { params: { adserverTargeting: true } };
      const result = parseTargetingConfig(moduleConfig);
      expect(result).to.not.be.null;
      expect(result.hasDirectApiConfig).to.be.false;
    });

    it('returns null if host is empty string', function () {
      const moduleConfig = { params: { host: '', site: 'my-site', node: 'my-node' } };
      expect(parseTargetingConfig(moduleConfig)).to.be.null;
    });

    it('returns null if site is empty string', function () {
      const moduleConfig = { params: { host: 'dcn.customer.com', site: '', node: 'my-node' } };
      expect(parseTargetingConfig(moduleConfig)).to.be.null;
    });

    it('returns null if node is empty string', function () {
      const moduleConfig = { params: { host: 'dcn.customer.com', site: 'my-site', node: '' } };
      expect(parseTargetingConfig(moduleConfig)).to.be.null;
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
      const result = parseTargetingConfig(moduleConfig);
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
      expect(parseTargetingConfig(moduleConfig)).to.be.null;
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
      expect(parseTargetingConfig(moduleConfig)).to.be.null;
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
      expect(parseTargetingConfig(moduleConfig)).to.be.null;
    });

    it('ignores bundleUrl', function () {
      const moduleConfig = {
        params: {
          bundleUrl: 'https://example.cdn.optable.co/bundle.js'
        }
      };
      expect(parseTargetingConfig(moduleConfig)).to.not.be.null;
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

  describe('targetingHandleRtd', function () {
    let reqBidsConfigObj, mergeFn;

    beforeEach(() => {
      reqBidsConfigObj = { ortb2Fragments: { global: {} } };
      mergeFn = sinon.spy();
    });

    it('merges valid targeting data into the global ORTB2 object', function () {
      const targetingData = {
        ortb2: {
          user: {
            eids: [{ source: 'optable.co', uids: [{ id: 'test-id' }] }]
          }
        }
      };

      targetingHandleRtd(reqBidsConfigObj, targetingData, mergeFn);
      expect(mergeFn.calledOnce).to.be.true;
      expect(mergeFn.firstCall.args[0]).to.equal(reqBidsConfigObj.ortb2Fragments.global);
      expect(mergeFn.firstCall.args[1]).to.deep.equal({
        user: { ext: { eids: [{ source: 'optable.co', uids: [{ id: 'test-id' }] }] } }
      });
    });

    it('writes EIDs only through mergeFn', function () {
      reqBidsConfigObj.ortb2Fragments.global = { user: { ext: { eids: [{ source: 'existing.com' }] } } };
      const targetingData = { ortb2: { user: { eids: [{ source: 'optable.co', uids: [{ id: 'test-id' }] }] } } };

      targetingHandleRtd(reqBidsConfigObj, targetingData, mergeFn);
      expect(reqBidsConfigObj.ortb2Fragments.global.user.ext.eids).to.deep.equal([{ source: 'existing.com' }]);
    });

    it('skips Optable UID2 EIDs when user.ext.eids already has one', function () {
      reqBidsConfigObj.ortb2Fragments.global = { user: { ext: { eids: [{ source: 'uidapi.com', uids: [{ id: 'pub-uid2' }] }] } } };
      const targetingData = {
        ortb2: {
          user: {
            eids: [
              { source: 'uidapi.com', uids: [{ id: 'optable-uid2' }] },
              { source: 'optable.co', uids: [{ id: 'oid' }] }
            ]
          }
        }
      };

      targetingHandleRtd(reqBidsConfigObj, targetingData, mergeFn, { skipMergeIfUid2Exists: true });
      expect(mergeFn.firstCall.args[1].user.ext.eids).to.deep.equal([{ source: 'optable.co', uids: [{ id: 'oid' }] }]);
    });

    it('stamps the split test assignment on ad units without ortb2', function () {
      reqBidsConfigObj.adUnits = [{ code: 'au1' }];

      targetingHandleRtd(reqBidsConfigObj, { split_test_assignment: 'treatment' }, mergeFn);
      expect(mergeFn.called).to.be.false;
      expect(reqBidsConfigObj.adUnits[0].ortb2Imp.ext.optable).to.deep.equal({
        variant: 'optable-rtd-1.0.0',
        splitTestAssignment: 'treatment'
      });
    });

    it('strips UID2 ref pointers and legacy _ref before merging', function () {
      const targetingData = {
        ortb2: {
          user: {
            eids: [
              { source: 'uidapi.com', _ref: 'legacy', uids: [{ id: 'uid2', ext: { optable: { ref: 'r1' } } }] },
              { source: 'optable.co', uids: [{ id: 'oid', ext: { stype: 'ppuid', optable: { ref: 'r2' } } }] }
            ]
          }
        },
        refs: { r1: { refresh_token: 'refresh-token' } }
      };

      targetingHandleRtd(reqBidsConfigObj, targetingData, mergeFn);
      expect(mergeFn.firstCall.args[1].user.ext.eids).to.deep.equal([
        { source: 'uidapi.com', uids: [{ id: 'uid2' }] },
        { source: 'optable.co', uids: [{ id: 'oid', ext: { stype: 'ppuid' } }] }
      ]);
      expect(targetingData.ortb2.user.eids[0].uids[0].ext.optable.ref).to.equal('r1');
    });

    it('does nothing if targeting data is missing ortb2', function () {
      targetingHandleRtd(reqBidsConfigObj, {}, mergeFn);
      expect(mergeFn.called).to.be.false;
    });

    it('does nothing if targeting data is null', function () {
      targetingHandleRtd(reqBidsConfigObj, null, mergeFn);
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
          enableTargeting: true,
          host: 'dcn.customer.com',
          site: 'my-site',
          node: 'my-node',
          ids: ['id1'],
          hids: []
        }
      };

      ajaxStub = sandbox.stub(dep, 'ajax');
      delete window.optable;
    });

    it('calls targeting API with correct parameters', async function () {
      storage.getDataFromLocalStorage.returns(null);

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('https://dcn.customer.com/v2/targeting');
        expect(url).to.include('o=my-site');
        expect(url).to.include('t=my-node');
        expect(url).to.include('id=id1');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(ajaxStub.calledOnce).to.be.true;
      expect(ajaxStub.firstCall.args[3]).to.deep.equal({ method: 'GET', withCredentials: true });
      expect(callback.calledOnce).to.be.true;
    });

    it('does not call targeting API without enableTargeting', function () {
      moduleConfig.params.enableTargeting = false;

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(ajaxStub.called).to.be.false;
      expect(window.optable.cmd).to.have.length(1);
      delete window.optable;
    });

    it('uses cached data immediately and updates cache in background', async function () {
      const cachedData = {
        ortb2: {
          user: {
            eids: [{ source: 'cached.com', uids: [{ id: 'cached-id' }] }]
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
      storage.getDataFromLocalStorage.returns(null);

      ajaxStub.callsFake((url, options) => {
        options.success('{"ortb2":{"user":{"eids":[{"source":"fresh.com"}]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(ajaxStub.calledOnce).to.be.true;
      expect(callback.calledOnce).to.be.true;
      expect(storage.setDataInLocalStorage.called).to.be.true;
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
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.false;
    });

    it('follows TCF Purpose 1 for credentials when GDPR applies', async function () {
      storage.getDataFromLocalStorage.returns(null);
      ajaxStub.callsFake((url, options) => options.success('{}'));

      const consentWith = (purpose1, publisher1) => ({
        gdpr: {
          gdprApplies: true,
          vendorData: { purpose: { consents: { 1: purpose1 } }, publisher: { consents: { 1: publisher1 } } }
        }
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, consentWith(false, true));
      expect(ajaxStub.firstCall.args[3].withCredentials).to.be.false;

      resetTargetingRequest();
      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, consentWith(true, undefined));
      expect(ajaxStub.secondCall.args[3].withCredentials).to.be.true;
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
        expect(url).to.include('timeout=2400ms');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {}, auctionTimeout);
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('prefers config timeout over auctionDelay', async function () {
      storage.getDataFromLocalStorage.returns(null);
      moduleConfig.params.timeout = '1000ms';

      ajaxStub.callsFake((url, options) => {
        expect(url).to.include('timeout=1000ms');
        options.success('{"ortb2":{"user":{"eids":[]}}}');
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {}, 2500);
      expect(ajaxStub.calledOnce).to.be.true;
    });

    it('caches a response that arrives after auctionDelay without merging it', async function () {
      storage.getDataFromLocalStorage.returns(null);
      const handleRtd = sinon.spy();
      moduleConfig.params.handleRtd = handleRtd;

      ajaxStub.callsFake((url, options) => {
        setTimeout(() => options.success('{"ortb2":{"user":{"eids":[{"source":"late.com"}]}}}'), 30);
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {}, 10);

      expect(handleRtd.called).to.be.false;
      expect(callback.calledOnce).to.be.true;
      expect(storage.setDataInLocalStorage.calledWith('optable-cache:targeting')).to.be.true;
    });

    it('shares one API call across concurrent auctions', async function () {
      storage.getDataFromLocalStorage.returns(null);
      ajaxStub.callsFake((url, options) => {
        setTimeout(() => options.success('{"ortb2":{"user":{"eids":[]}}}'), 10);
      });

      await Promise.all([
        getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {}),
        getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {})
      ]);

      expect(ajaxStub.calledOnce).to.be.true;
      expect(callback.calledTwice).to.be.true;
    });

    it('retries the API call after a failure', async function () {
      storage.getDataFromLocalStorage.returns(null);
      ajaxStub.onFirstCall().callsFake((url, options) => options.error('Network error'));
      ajaxStub.onSecondCall().callsFake((url, options) => options.success('{}'));

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(ajaxStub.calledTwice).to.be.true;
    });

    it('caches and serves an empty response', async function () {
      storage.getDataFromLocalStorage.returns(null);
      ajaxStub.callsFake((url, options) => options.success('{}'));

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(storage.setDataInLocalStorage.calledWith('optable-cache:targeting', JSON.stringify({ refs: {} }))).to.be.true;

      storage.getDataFromLocalStorage.withArgs('optable-cache:targeting').returns(JSON.stringify({ refs: {} }));
      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(ajaxStub.calledOnce).to.be.true;
      expect(callback.calledTwice).to.be.true;
    });

    it('waits for an async handleRtd before releasing the auction', async function () {
      storage.getDataFromLocalStorage.returns(JSON.stringify({ ortb2: { user: { eids: [] } } }));
      ajaxStub.callsFake(() => {});
      let handled = false;
      moduleConfig.params.handleRtd = () => new Promise(resolve => setTimeout(() => {
        handled = true;
        resolve();
      }, 10));
      callback = sinon.spy(() => expect(handled).to.be.true);

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(callback.calledOnce).to.be.true;
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

    it('updates SDK-compatible targeting cache after successful API call', async function () {
      storage.getDataFromLocalStorage.returns(null);

      const targetingData = {
        ortb2: {
          user: {
            eids: [{ source: 'test.com', uids: [{ id: 'test-id' }] }]
          }
        }
      };

      ajaxStub.callsFake((url, options) => {
        options.success(JSON.stringify(targetingData));
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      const sdkCacheCall = storage.setDataInLocalStorage.getCalls().find(call =>
        call.args[0].includes('OPTABLE_TARGETING_')
      );
      expect(sdkCacheCall).to.exist;
      expect(sdkCacheCall.args[1]).to.equal(JSON.stringify({ ...targetingData, refs: {} }));
    });

    it('updates SDK-compatible cache in background refresh', async function () {
      const cachedData = {
        ortb2: {
          user: {
            eids: [{ source: 'cached.com', uids: [{ id: 'cached-id' }] }]
          }
        }
      };
      storage.getDataFromLocalStorage.returns(JSON.stringify(cachedData));

      const freshData = {
        ortb2: {
          user: {
            eids: [{ source: 'fresh.com', uids: [{ id: 'fresh-id' }] }]
          }
        }
      };

      ajaxStub.callsFake((url, options) => {
        // Simulate async response
        setTimeout(() => {
          options.success(JSON.stringify(freshData));
        }, 10);
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      // Wait for background call to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      const sdkCacheCalls = storage.setDataInLocalStorage.getCalls().filter(call =>
        call.args[0].includes('OPTABLE_TARGETING_')
      );
      expect(sdkCacheCalls.length).to.be.greaterThan(0);
    });

    it('uses correct SDK cache key format with base64 encoding', async function () {
      storage.getDataFromLocalStorage.returns(null);

      const targetingData = {
        ortb2: {
          user: {
            eids: [{ source: 'test.com', uids: [{ id: 'test-id' }] }]
          }
        }
      };

      ajaxStub.callsFake((url, options) => {
        options.success(JSON.stringify(targetingData));
      });

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      const sdkCacheCall = storage.setDataInLocalStorage.getCalls().find(call =>
        call.args[0].startsWith('OPTABLE_TARGETING_')
      );
      expect(sdkCacheCall).to.exist;
      expect(sdkCacheCall.args[0]).to.match(/^OPTABLE_TARGETING_.+$/);

      expect(sdkCacheCall.args[0]).to.not.equal('optable-cache:targeting');
    });
  });

  describe('getBidRequestData - SDK Mode', function () {
    let reqBidsConfigObj, callback, moduleConfig;

    beforeEach(() => {
      reqBidsConfigObj = { ortb2Fragments: { global: {} } };
      callback = sinon.spy();
      moduleConfig = { params: { enableTargeting: true, instance: 'instance', adserverTargeting: true } };

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
          user: { eids: [{ source: 'optable.co', uids: [{ id: 'sdk-id' }] }] }
        }
      };

      setTimeout(() => {
        const event = new CustomEvent('optable-targeting:change', { detail: targetingData });
        window.dispatchEvent(event);
      }, 10);

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(callback.calledOnce).to.be.true;
    });

    it('waits for the event when the SDK has no targetingFromCache', async function () {
      delete window.optable.instance.targetingFromCache;
      const targetingData = { ortb2: { user: { eids: [{ source: 'optable.co', uids: [{ id: 'sdk-id' }] }] } } };

      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('optable-targeting:change', { detail: targetingData }));
      }, 10);

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      expect(callback.calledOnce).to.be.true;
      expect(reqBidsConfigObj.ortb2Fragments.global.user.ext.eids).to.deep.equal([{ source: 'optable.co', uids: [{ id: 'sdk-id' }] }]);
    });

    it('uses SDK cached data if available', async function () {
      const cachedData = {
        ortb2: { user: { eids: [{ source: 'cached.com' }] } }
      };
      window.optable.instance.targetingFromCache.returns(cachedData);

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(callback.calledOnce).to.be.true;
    });
  });

  describe('getBidRequestData - Mode Detection', function () {
    let reqBidsConfigObj, callback;

    beforeEach(() => {
      reqBidsConfigObj = { ortb2Fragments: { global: {} } };
      callback = sinon.spy();
      delete window.optable;
    });

    it('errors when neither SDK nor Direct API params configured', async function () {
      const moduleConfig = { params: { enableTargeting: true } };

      await getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(callback.calledOnce).to.be.true;
    });
  });
});
