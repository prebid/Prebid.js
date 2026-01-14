import {
  parseConfig,
  defaultHandleRtd,
  mergeOptableData,
  getBidRequestData,
  getTargetingData,
  optableSubmodule,
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
      const config = {params: {bundleUrl: '  https://cdn.optable.co/bundle.js  '}};
      expect(parseConfig(config).bundleUrl).to.equal('https://cdn.optable.co/bundle.js');
    });

    it('returns null bundleUrl for invalid bundleUrl format', function () {
      expect(parseConfig({params: {bundleUrl: 'invalidURL'}}).bundleUrl).to.be.null;
      expect(parseConfig({params: {bundleUrl: 'www.invalid.com'}}).bundleUrl).to.be.null;
    });

    it('returns null bundleUrl for non-HTTPS bundleUrl', function () {
      expect(parseConfig({params: {bundleUrl: 'http://cdn.optable.co/bundle.js'}}).bundleUrl).to.be.null;
      expect(parseConfig({params: {bundleUrl: '//cdn.optable.co/bundle.js'}}).bundleUrl).to.be.null;
      expect(parseConfig({params: {bundleUrl: '/bundle.js'}}).bundleUrl).to.be.null;
    });

    it('defaults adserverTargeting to true if missing', function () {
      expect(parseConfig(
        {params: {bundleUrl: 'https://cdn.optable.co/bundle.js'}}
      ).adserverTargeting).to.be.true;
    });

    it('returns null handleRtd if handleRtd is not a function', function () {
      expect(parseConfig({params: {handleRtd: 'notAFunction'}}).handleRtd).to.be.null;
    });
  });

  describe('defaultHandleRtd', function () {
    let sandbox, reqBidsConfigObj, mergeFn;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      reqBidsConfigObj = {ortb2Fragments: {global: {}}};
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
      const targetingData = {ortb2: {user: {ext: {optable: 'testData'}}}};
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
      const targetingData = {ortb2: {user: {ext: {optable: 'testData'}}}};
      window.optable.instance.targetingFromCache.returns(targetingData);

      await defaultHandleRtd(reqBidsConfigObj, {}, mergeFn);
      expect(mergeFn.calledWith(reqBidsConfigObj.ortb2Fragments.global, targetingData.ortb2)).to.be.true;
    });

    it('calls targeting function if no data is found in cache', async function () {
      const targetingData = {ortb2: {user: {ext: {optable: 'testData'}}}};
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
      reqBidsConfigObj = {ortb2Fragments: {global: {}}};
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
      reqBidsConfigObj = {ortb2Fragments: {global: {}}};
      callback = sinon.spy();
      moduleConfig = {params: {bundleUrl: 'https://cdn.optable.co/bundle.js'}};

      sandbox.stub(window, 'optable').value({cmd: []});
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
          detail: {ortb2: {user: {ext: {optable: 'testData'}}}}
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
          detail: {ortb2: {user: {ext: {optable: 'testData'}}}}
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
          detail: {ortb2: {user: {ext: {optable: 'testData'}}}}
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
      moduleConfig = {params: {adserverTargeting: true}};
      window.optable = {instance: {targetingKeyValuesFromCache: sandbox.stub().returns({key1: 'value1'})}};
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('returns correct targeting data when Optable data is available', function () {
      const result = getTargetingData(['adUnit1'], moduleConfig, {}, {});
      expect(result).to.deep.equal({adUnit1: {key1: 'value1'}});
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
      window.optable.instance.targetingKeyValuesFromCache.returns({key1: []});
      expect(getTargetingData(['adUnit1'], moduleConfig, {}, {})).to.deep.equal({});

      window.optable.instance.targetingKeyValuesFromCache.returns({key1: [], key2: [], key3: []});
      expect(getTargetingData(['adUnit1'], moduleConfig, {}, {})).to.deep.equal({});
    });
  });

  describe('init', function () {
    it('initializes Optable RTD module', function () {
      expect(optableSubmodule.init()).to.be.true;
    });
  });
});
