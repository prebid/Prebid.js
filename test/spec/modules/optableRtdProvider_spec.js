import {
  parseConfig,
  defaultHandleRtd,
  mergeOptableData,
  getBidRequestData,
  getTargetingData,
  optableSubmodule,
  readCachedTargeting,
  storage,
  OPTABLE_RESOLVED_KEY,
} from 'modules/optableRtdProvider';
import * as events from 'src/events.js';
import { config } from 'src/config.js';
import { EVENTS } from 'src/constants.js';

/**
 * Record warnings and errors logged while it is active. The module logs through
 * prefixLog, which binds the logger functions at import, so stubbing utils does
 * not catch them; logWarn and logError also emit AUCTION_DEBUG, which does.
 */
function captureLogs() {
  const logs = { WARNING: [], ERROR: [] };
  const handler = ({ type, arguments: args }) => logs[type]?.push(args.join(' '));
  events.on(EVENTS.AUCTION_DEBUG, handler);
  logs.stop = () => events.off(EVENTS.AUCTION_DEBUG, handler);
  return logs;
}

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

    it('returns instance when provided', function () {
      expect(parseConfig({ params: { instance: 'custom' } }).instance).to.equal('custom');
    });

    it('omits instance when not provided', function () {
      expect(parseConfig({ params: {} })).to.not.have.property('instance');
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

    it('moves EIDs from the targeting event to user.ext.eids', async function () {
      const eid = { source: 'optable.co', uids: [{ id: 'abc' }] };
      window.optable.instance.targetingFromCache.returns({ ortb2: { user: { eids: [eid] } } });

      await defaultHandleRtd(reqBidsConfigObj, {}, mergeFn);
      expect(mergeFn.calledOnceWith(reqBidsConfigObj.ortb2Fragments.global, { user: { ext: { eids: [eid] } } })).to.be.true;
    });

    it('warns when the targeting event has no ORTB2 data', async function () {
      window.optable.instance.targetingFromCache.returns(null);
      const logs = captureLogs();
      try {
        setTimeout(() => window.dispatchEvent(new CustomEvent('optable-targeting:change', { detail: {} })), 10);
        await defaultHandleRtd(reqBidsConfigObj, {}, mergeFn);
        expect(logs.WARNING.some((msg) => msg.includes('No targeting data found'))).to.be.true;
      } finally {
        logs.stop();
      }
    });
  });

  describe('defaultHandleRtd with a named SDK instance', function () {
    let sandbox, reqBidsConfigObj, mergeFn;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      reqBidsConfigObj = { ortb2Fragments: { global: {} } };
      mergeFn = sinon.spy();
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('treats the bundle as loaded when the named instance exists, and reads targeting from it', async function () {
      const targetingData = { ortb2: { user: { ext: { optable: 'testData' } } } };
      sandbox.stub(window, 'optable').value({ cmd: [], custom: { targetingFromCache: sinon.stub().returns(targetingData) } });
      const getStorage = sandbox.stub(storage, 'getDataFromLocalStorage');

      await defaultHandleRtd(reqBidsConfigObj, {}, mergeFn, 'custom');

      expect(getStorage.called).to.be.false;
      expect(window.optable.custom.targetingFromCache.calledOnce).to.be.true;
      expect(mergeFn.calledOnceWith(reqBidsConfigObj.ortb2Fragments.global, targetingData.ortb2)).to.be.true;
    });

    it('does not treat the default instance as the named one', async function () {
      sandbox.stub(window, 'optable').value({ cmd: [], instance: {} });
      const cachedOrtb2 = { user: { eids: [{ source: 'optable.co', uids: [{ id: 'abc' }] }] } };
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify({ ortb2: cachedOrtb2 }));

      await defaultHandleRtd(reqBidsConfigObj, {}, mergeFn, 'custom');

      expect(mergeFn.calledOnceWith(reqBidsConfigObj.ortb2Fragments.global, { user: { ext: { eids: cachedOrtb2.user.eids } } })).to.be.true;
    });
  });

  describe('defaultHandleRtd before the bundle loads', function () {
    let sandbox, reqBidsConfigObj, mergeFn;
    const cachedOrtb2 = { user: { eids: [{ source: 'optable.co', uids: [{ id: 'abc' }] }] } };
    const mergedOrtb2 = { user: { ext: { eids: cachedOrtb2.user.eids } } };

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      reqBidsConfigObj = { ortb2Fragments: { global: {} } };
      mergeFn = sinon.spy();
      sandbox.stub(window, 'optable').value({ cmd: [] });
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('delegates to the bundle handleRtd when it is available', async function () {
      const bundleHandleRtd = sinon.stub().resolves();
      window.optable.rtd = { handleRtd: bundleHandleRtd };
      const extra = { email: 'hash' };

      await defaultHandleRtd(reqBidsConfigObj, extra, mergeFn);

      expect(bundleHandleRtd.calledOnceWithExactly(reqBidsConfigObj, extra, mergeFn)).to.be.true;
    });

    it('merges cached targeting data right away when the bundle is not loaded', async function () {
      sandbox.stub(storage, 'getDataFromLocalStorage')
        .withArgs(OPTABLE_RESOLVED_KEY).returns(JSON.stringify({ ortb2: cachedOrtb2 }));

      await defaultHandleRtd(reqBidsConfigObj, {}, mergeFn);

      expect(mergeFn.calledOnceWith(reqBidsConfigObj.ortb2Fragments.global, mergedOrtb2)).to.be.true;
      expect(window.optable.cmd.length).to.equal(0);
    });

    it('adds cached EIDs to user.ext.eids, after any already cached there', function () {
      const existing = { source: 'other.com', uids: [{ id: 'x' }] };
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify({
        ortb2: { user: { eids: cachedOrtb2.user.eids, ext: { eids: [existing], foo: 1 } } }
      }));
      expect(readCachedTargeting()).to.deep.equal({
        user: { ext: { eids: [existing, ...cachedOrtb2.user.eids], foo: 1 } }
      });
    });

    it('waits for the bundle when nothing is cached, then uses its handleRtd', async function () {
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(null);
      const bundleHandleRtd = sinon.stub().resolves();

      const pending = defaultHandleRtd(reqBidsConfigObj, {}, mergeFn);
      expect(window.optable.cmd.length).to.equal(1);

      // Simulate the bundle loading and processing the queue
      window.optable.rtd = { handleRtd: bundleHandleRtd };
      window.optable.cmd[0]();
      await pending;

      expect(bundleHandleRtd.calledOnce).to.be.true;
      expect(mergeFn.called).to.be.false;
    });

    it('ignores a cache entry without EIDs', function () {
      sandbox.stub(storage, 'getDataFromLocalStorage')
        .returns(JSON.stringify({ ortb2: { user: { eids: [] } } }));
      expect(readCachedTargeting()).to.be.null;
    });

    it('ignores an unreadable cache entry, with a warning', function () {
      sandbox.stub(storage, 'getDataFromLocalStorage').returns('{not json');
      const logs = captureLogs();
      try {
        expect(readCachedTargeting()).to.be.null;
        expect(logs.WARNING.some((msg) => msg.includes('Could not read cached targeting data'))).to.be.true;
      } finally {
        logs.stop();
      }
    });

    it('strips cache-only _ref metadata from cached EIDs', function () {
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify({
        ortb2: { user: { eids: [{ source: 'uidapi.com', uids: [{ id: 'abc' }], _ref: { refreshToken: 'secret' } }] } }
      }));
      expect(readCachedTargeting()).to.deep.equal({
        user: { ext: { eids: [{ source: 'uidapi.com', uids: [{ id: 'abc' }] }] } }
      });
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

    it('waits for a promise returned by a non-async function (e.g. a transpiled async function)', async function () {
      let resolveHandler;
      handleRtdFn = function () {
        return new Promise((resolve) => { resolveHandler = resolve; });
      };
      let done = false;
      const result = mergeOptableData(handleRtdFn, reqBidsConfigObj, {}, mergeFn).then(() => { done = true; });
      await Promise.resolve();
      expect(done).to.be.false;
      resolveHandler();
      await result;
      expect(done).to.be.true;
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

      // The bundle is loaded, so the default handler runs right away
      expect(window.optable.cmd.length).to.equal(0);

      // Dispatch the event after a short delay
      setTimeout(() => {
        const event = new CustomEvent('optable-targeting:change', {
          detail: { ortb2: { user: { ext: { optable: 'testData' } } } }
        });
        window.dispatchEvent(event);
      }, 10);

      setTimeout(() => {
        expect(callback.calledOnce).to.be.true;
        done();
      }, 100);
    });

    it('calls a custom handleRtd right away, before the bundle loads', function () {
      moduleConfig.params.bundleUrl = null;
      moduleConfig.params.handleRtd = sinon.spy();

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(moduleConfig.params.handleRtd.calledOnce).to.be.true;
      expect(window.optable.cmd.length).to.equal(0);
    });

    it('calls a custom handleRtd right away when bundleUrl is provided', function () {
      moduleConfig.params.handleRtd = sinon.spy();

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(window.document.createElement.called).to.be.true;
      expect(moduleConfig.params.handleRtd.calledOnce).to.be.true;
    });

    it('calls back right away with cached data when the bundle is not loaded', function (done) {
      moduleConfig.params.bundleUrl = null;
      sandbox.stub(storage, 'getDataFromLocalStorage').returns(JSON.stringify({
        ortb2: { user: { eids: [{ source: 'optable.co', uids: [{ id: 'abc' }] }] } }
      }));

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(window.optable.cmd.length).to.equal(0);
      setTimeout(() => {
        expect(callback.calledOnce).to.be.true;
        expect(reqBidsConfigObj.ortb2Fragments.global.user.ext.eids).to.have.length(1);
        expect(reqBidsConfigObj.ortb2Fragments.global.user.eids).to.be.undefined;
        done();
      }, 20);
    });

    it('passes params.instance to a custom handleRtd', function () {
      moduleConfig.params.bundleUrl = null;
      moduleConfig.params.instance = 'custom';
      moduleConfig.params.handleRtd = sinon.spy();

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      expect(moduleConfig.params.handleRtd.firstCall.args[3]).to.equal('custom');
    });

    it('logs an error and executes callback when the handler fails', function (done) {
      moduleConfig.params.bundleUrl = null;
      moduleConfig.params.handleRtd = () => { throw new Error('Test error'); };
      const logs = captureLogs();

      getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});

      setTimeout(() => {
        logs.stop();
        expect(callback.calledOnce).to.be.true;
        expect(logs.ERROR.some((msg) => msg.includes('handleRtd failed') && msg.includes('Test error'))).to.be.true;
        done();
      }, 50);
    });

    it('logs an error and executes callback when getBidRequestData itself throws', function () {
      moduleConfig.params.bundleUrl = null;
      sandbox.stub(config, 'getConfig').callThrough()
        .withArgs('optableRtdConfig').throws(new Error('Config error'));
      const logs = captureLogs();
      try {
        getBidRequestData(reqBidsConfigObj, callback, moduleConfig, {});
      } finally {
        logs.stop();
      }
      expect(callback.calledOnce).to.be.true;
      expect(logs.ERROR.some((msg) => msg.includes('Config error'))).to.be.true;
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

      expect(window.optable.cmd.length).to.equal(0);

      // Dispatch event after a short delay
      setTimeout(() => {
        const event = new CustomEvent('optable-targeting:change', {
          detail: { ortb2: { user: { ext: { optable: 'testData' } } } }
        });
        window.dispatchEvent(event);
      }, 10);

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

    it('reads targeting from the named instance', function () {
      moduleConfig.params.instance = 'custom';
      window.optable.custom = { targetingKeyValuesFromCache: sandbox.stub().returns({ key2: 'value2' }) };
      expect(getTargetingData(['adUnit1'], moduleConfig, {}, {})).to.deep.equal({ adUnit1: { key2: 'value2' } });
    });

    it('warns and returns empty object when the SDK instance is missing', function () {
      moduleConfig.params.instance = 'missing';
      const logs = captureLogs();
      try {
        expect(getTargetingData(['adUnit1'], moduleConfig, {}, {})).to.deep.equal({});
        expect(logs.WARNING.some((msg) => msg.includes('No Optable SDK instance found for: missing'))).to.be.true;
      } finally {
        logs.stop();
      }
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
