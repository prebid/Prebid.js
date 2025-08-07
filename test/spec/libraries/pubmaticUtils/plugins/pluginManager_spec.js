import { expect } from 'chai';
import sinon from 'sinon';
import * as utils from '../../../../../src/utils.js';
import { PluginManager, plugins, CONSTANTS } from '../../../../../libraries/pubmaticUtils/plugins/pluginManager.js';

describe('Plugin Manager', () => {
  let sandbox;
  let logInfoStub;
  let logWarnStub;
  let logErrorStub;
  let pluginManager;
  let mockPlugin;
  let mockConfigJsonManager;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    logInfoStub = sandbox.stub(utils, 'logInfo');
    logWarnStub = sandbox.stub(utils, 'logWarn');
    logErrorStub = sandbox.stub(utils, 'logError');

    // Clear plugins map before each test
    plugins.clear();

    pluginManager = PluginManager();

    // Create mock plugin
    mockPlugin = {
      init: sandbox.stub().resolves(true),
      testHook: sandbox.stub().resolves({ result: 'success' }),
      errorHook: sandbox.stub().throws(new Error('Test error')),
      nullHook: sandbox.stub().resolves(null),
      objectHook: sandbox.stub().resolves({ key1: 'value1', key2: 'value2' })
    };

    // Create mock config manager
    mockConfigJsonManager = {
      getConfigByName: sandbox.stub().returns({ enabled: true })
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('register', () => {
    it('should register a plugin successfully', () => {
      pluginManager.register('testPlugin', mockPlugin);

      expect(plugins.has('testPlugin')).to.be.true;
      expect(plugins.get('testPlugin')).to.equal(mockPlugin);
    });

    it('should log warning when registering a plugin with existing name', () => {
      pluginManager.register('testPlugin', mockPlugin);
      pluginManager.register('testPlugin', { init: () => {} });

      expect(logWarnStub.calledOnce).to.be.true;
      expect(logWarnStub.firstCall.args[0]).to.equal(`${CONSTANTS.LOG_PRE_FIX} Plugin testPlugin already registered`);
      expect(plugins.get('testPlugin')).to.equal(mockPlugin); // Should keep the original plugin
    });
  });

  describe('initialize', () => {
    it('should initialize all registered plugins', async () => {
      pluginManager.register('testPlugin1', mockPlugin);

      const anotherPlugin = {
        init: sandbox.stub().resolves(true)
      };
      pluginManager.register('testPlugin2', anotherPlugin);

      await pluginManager.initialize(mockConfigJsonManager);

      expect(mockPlugin.init.calledOnce).to.be.true;
      expect(mockPlugin.init.firstCall.args[0]).to.equal('testPlugin1');
      expect(mockPlugin.init.firstCall.args[1]).to.equal(mockConfigJsonManager);

      expect(anotherPlugin.init.calledOnce).to.be.true;
      expect(anotherPlugin.init.firstCall.args[0]).to.equal('testPlugin2');
      expect(anotherPlugin.init.firstCall.args[1]).to.equal(mockConfigJsonManager);
    });

    it('should unregister plugin if initialization fails', async () => {
      const failingPlugin = {
        init: sandbox.stub().resolves(false)
      };

      pluginManager.register('failingPlugin', failingPlugin);
      pluginManager.register('testPlugin', mockPlugin);

      await pluginManager.initialize(mockConfigJsonManager);

      expect(plugins.has('failingPlugin')).to.be.false;
      expect(plugins.has('testPlugin')).to.be.true;
      expect(logInfoStub.calledOnce).to.be.true;
      expect(logInfoStub.firstCall.args[0]).to.equal(`${CONSTANTS.LOG_PRE_FIX} Unregistering plugin failingPlugin`);
    });

    it('should handle plugins without init method', async () => {
      const pluginWithoutInit = {
        testHook: sandbox.stub().resolves({ result: 'success' })
      };

      pluginManager.register('pluginWithoutInit', pluginWithoutInit);
      pluginManager.register('testPlugin', mockPlugin);

      await pluginManager.initialize(mockConfigJsonManager);

      expect(plugins.has('pluginWithoutInit')).to.be.true;
      expect(plugins.has('testPlugin')).to.be.true;
      expect(mockPlugin.init.calledOnce).to.be.true;
    });
  });

  describe('executeHook', () => {
    beforeEach(() => {
      pluginManager.register('testPlugin', mockPlugin);
    });

    it('should execute hook on all registered plugins', async () => {
      const results = await pluginManager.executeHook('testHook', 'arg1', 'arg2');

      expect(mockPlugin.testHook.calledOnce).to.be.true;
      expect(mockPlugin.testHook.firstCall.args[0]).to.equal('arg1');
      expect(mockPlugin.testHook.firstCall.args[1]).to.equal('arg2');
      expect(results).to.deep.equal({ result: 'success' });
    });

    it('should handle errors during hook execution', async () => {
      const results = await pluginManager.executeHook('errorHook');

      expect(mockPlugin.errorHook.calledOnce).to.be.true;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${CONSTANTS.LOG_PRE_FIX} Error executing hook errorHook in plugin testPlugin: Test error`);
      expect(results).to.deep.equal({});
    });

    it('should skip null or undefined results', async () => {
      const results = await pluginManager.executeHook('nullHook');

      expect(mockPlugin.nullHook.calledOnce).to.be.true;
      expect(results).to.deep.equal({});
    });

    it('should merge results from multiple plugins', async () => {
      const anotherPlugin = {
        testHook: sandbox.stub().resolves({ key3: 'value3', key4: 'value4' })
      };

      pluginManager.register('anotherPlugin', anotherPlugin);

      const results = await pluginManager.executeHook('testHook');

      expect(mockPlugin.testHook.calledOnce).to.be.true;
      expect(anotherPlugin.testHook.calledOnce).to.be.true;
      expect(results).to.deep.equal({
        result: 'success',
        key3: 'value3',
        key4: 'value4'
      });
    });

    it('should handle non-object results', async () => {
      mockPlugin.testHook.resolves('string result');

      const results = await pluginManager.executeHook('testHook');

      expect(mockPlugin.testHook.calledOnce).to.be.true;
      expect(results).to.deep.equal({});
    });

    it('should handle plugins without the requested hook', async () => {
      const results = await pluginManager.executeHook('nonExistentHook');

      expect(results).to.deep.equal({});
    });

    it('should merge results from multiple object hooks', async () => {
      const results = await pluginManager.executeHook('objectHook');

      expect(mockPlugin.objectHook.calledOnce).to.be.true;
      expect(results).to.deep.equal({
        key1: 'value1',
        key2: 'value2'
      });
    });
  });

  describe('CONSTANTS', () => {
    it('should have the correct LOG_PRE_FIX value', () => {
      expect(CONSTANTS.LOG_PRE_FIX).to.equal('PubMatic-Plugin-Manager: ');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(CONSTANTS)).to.be.true;
    });
  });
});
