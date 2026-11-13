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

    // Create mock plugin with synchronous methods
    mockPlugin = {
      init: sandbox.stub().resolves(true),
      testHook: sandbox.stub().returns({ result: 'success' }),
      errorHook: sandbox.stub().throws(new Error('Test error')),
      nullHook: sandbox.stub().returns(null),
      objectHook: sandbox.stub().returns({ key1: 'value1', key2: 'value2' })
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

    it('should handle registering plugins with null or undefined values', () => {
      pluginManager.register('nullPlugin', null);
      pluginManager.register('undefinedPlugin', undefined);

      expect(plugins.has('nullPlugin')).to.be.true;
      expect(plugins.get('nullPlugin')).to.be.null;
      expect(plugins.has('undefinedPlugin')).to.be.true;
      expect(plugins.get('undefinedPlugin')).to.be.undefined;
    });
  });

  // Test the unregister functionality through the initialize method
  describe('unregister functionality', () => {
    it('should unregister plugins when initialization fails', async () => {
      const failingPlugin = {
        init: sandbox.stub().resolves(false)
      };

      pluginManager.register('failingPlugin', failingPlugin);

      await pluginManager.initialize(mockConfigJsonManager);

      // Verify plugin was removed
      expect(plugins.has('failingPlugin')).to.be.false;
      expect(logInfoStub.calledOnce).to.be.true;
      expect(logInfoStub.firstCall.args[0]).to.equal(`${CONSTANTS.LOG_PRE_FIX} Unregistering plugin failingPlugin`);
    });

    it('should not unregister plugins when initialization succeeds', async () => {
      pluginManager.register('testPlugin', mockPlugin);

      await pluginManager.initialize(mockConfigJsonManager);

      // Verify plugin was not removed
      expect(plugins.has('testPlugin')).to.be.true;
      expect(logInfoStub.called).to.be.false;
    });

    it('should handle multiple plugins with some failing initialization', async () => {
      const failingPlugin = {
        init: sandbox.stub().resolves(false)
      };

      pluginManager.register('failingPlugin', failingPlugin);
      pluginManager.register('testPlugin', mockPlugin);

      await pluginManager.initialize(mockConfigJsonManager);

      // Verify only failing plugin was removed
      expect(plugins.has('failingPlugin')).to.be.false;
      expect(plugins.has('testPlugin')).to.be.true;
      expect(logInfoStub.calledOnce).to.be.true;
      expect(logInfoStub.firstCall.args[0]).to.equal(`${CONSTANTS.LOG_PRE_FIX} Unregistering plugin failingPlugin`);
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
        testHook: sandbox.stub().returns({ result: 'success' })
      };

      pluginManager.register('pluginWithoutInit', pluginWithoutInit);
      pluginManager.register('testPlugin', mockPlugin);

      await pluginManager.initialize(mockConfigJsonManager);

      expect(plugins.has('pluginWithoutInit')).to.be.true;
      expect(plugins.has('testPlugin')).to.be.true;
      expect(mockPlugin.init.calledOnce).to.be.true;
    });

    it('should handle rejected promises during initialization', async () => {
      const rejectingPlugin = {
        init: sandbox.stub().rejects(new Error('Initialization error'))
      };

      pluginManager.register('rejectingPlugin', rejectingPlugin);
      pluginManager.register('testPlugin', mockPlugin);

      try {
        await pluginManager.initialize(mockConfigJsonManager);
        // If we get here without an error being thrown, the test should fail
        expect.fail('Expected initialize to throw an error');
      } catch (e) {
        // Expected to catch the error
        expect(e.message).to.equal('Initialization error');
      }

      // The plugin should still be registered since the unregister happens only on false return
      expect(plugins.has('rejectingPlugin')).to.be.true;
      expect(plugins.has('testPlugin')).to.be.true;
    });

    it('should handle null or undefined configJsonManager', async () => {
      pluginManager.register('testPlugin', mockPlugin);

      await pluginManager.initialize(null);

      expect(mockPlugin.init.calledOnce).to.be.true;
      expect(mockPlugin.init.firstCall.args[0]).to.equal('testPlugin');
      expect(mockPlugin.init.firstCall.args[1]).to.be.null;

      // Reset for next test
      mockPlugin.init.reset();

      await pluginManager.initialize(undefined);

      expect(mockPlugin.init.calledOnce).to.be.true;
      expect(mockPlugin.init.firstCall.args[0]).to.equal('testPlugin');
      expect(mockPlugin.init.firstCall.args[1]).to.be.undefined;
    });
  });

  describe('executeHook', () => {
    beforeEach(() => {
      pluginManager.register('testPlugin', mockPlugin);
    });

    it('should execute hook on all registered plugins', () => {
      const results = pluginManager.executeHook('testHook', 'arg1', 'arg2');

      expect(mockPlugin.testHook.calledOnce).to.be.true;
      expect(mockPlugin.testHook.firstCall.args[0]).to.equal('arg1');
      expect(mockPlugin.testHook.firstCall.args[1]).to.equal('arg2');
      expect(results).to.deep.equal({ result: 'success' });
    });

    it('should handle errors during hook execution', () => {
      const results = pluginManager.executeHook('errorHook');

      expect(mockPlugin.errorHook.calledOnce).to.be.true;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${CONSTANTS.LOG_PRE_FIX} Error executing hook errorHook in plugin testPlugin: Test error`);
      expect(results).to.deep.equal({});
    });

    it('should skip null or undefined results', () => {
      const results = pluginManager.executeHook('nullHook');

      expect(mockPlugin.nullHook.calledOnce).to.be.true;
      expect(results).to.deep.equal({});
    });

    it('should merge results from multiple plugins', () => {
      const anotherPlugin = {
        testHook: sandbox.stub().returns({ key3: 'value3', key4: 'value4' })
      };

      pluginManager.register('anotherPlugin', anotherPlugin);

      const results = pluginManager.executeHook('testHook');

      expect(mockPlugin.testHook.calledOnce).to.be.true;
      expect(anotherPlugin.testHook.calledOnce).to.be.true;
      expect(results).to.deep.equal({
        result: 'success',
        key3: 'value3',
        key4: 'value4'
      });
    });

    it('should handle non-object results', () => {
      mockPlugin.testHook = sandbox.stub().returns('string result');

      const results = pluginManager.executeHook('testHook');

      expect(mockPlugin.testHook.calledOnce).to.be.true;
      expect(results).to.deep.equal({});
    });

    it('should handle plugins without the requested hook', () => {
      const results = pluginManager.executeHook('nonExistentHook');

      expect(results).to.deep.equal({});
    });

    it('should merge results from multiple object hooks', () => {
      const results = pluginManager.executeHook('objectHook');

      expect(mockPlugin.objectHook.calledOnce).to.be.true;
      expect(results).to.deep.equal({
        key1: 'value1',
        key2: 'value2'
      });
    });

    it('should handle errors during plugin filtering', () => {
      // Create a scenario where Array.from throws an error
      const originalArrayFrom = Array.from;
      Array.from = sandbox.stub().throws(new Error('Array.from error'));

      const results = pluginManager.executeHook('testHook');

      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${CONSTANTS.LOG_PRE_FIX} Error in executeHookSync: Array.from error`);
      expect(results).to.deep.equal({});

      // Restore original Array.from
      Array.from = originalArrayFrom;
    });

    it('should handle synchronous hook functions', () => {
      const syncPlugin = {
        syncHook: sandbox.stub().returns({ syncKey: 'syncValue' })
      };

      pluginManager.register('syncPlugin', syncPlugin);

      const results = pluginManager.executeHook('syncHook');

      expect(syncPlugin.syncHook.calledOnce).to.be.true;
      expect(results).to.deep.equal({ syncKey: 'syncValue' });
    });

    it('should handle overwriting properties when merging results', () => {
      const plugin1 = {
        duplicateHook: sandbox.stub().returns({ key: 'value1' })
      };

      const plugin2 = {
        duplicateHook: sandbox.stub().returns({ key: 'value2' })
      };

      pluginManager.register('plugin1', plugin1);
      pluginManager.register('plugin2', plugin2);

      const results = pluginManager.executeHook('duplicateHook');

      expect(plugin1.duplicateHook.calledOnce).to.be.true;
      expect(plugin2.duplicateHook.calledOnce).to.be.true;

      // The last plugin's value should win in case of duplicate keys
      expect(results).to.deep.equal({ key: 'value2' });
    });

    it('should handle empty plugins map', () => {
      // Clear all plugins
      plugins.clear();

      const results = pluginManager.executeHook('testHook');

      expect(results).to.deep.equal({});
    });

    it('should handle complex nested object results', () => {
      const complexPlugin = {
        complexHook: sandbox.stub().returns({
          level1: {
            level2: {
              level3: 'deep value'
            },
            array: [1, 2, 3]
          },
          topLevel: 'top value'
        })
      };

      pluginManager.register('complexPlugin', complexPlugin);

      const results = pluginManager.executeHook('complexHook');

      expect(complexPlugin.complexHook.calledOnce).to.be.true;
      expect(results).to.deep.equal({
        level1: {
          level2: {
            level3: 'deep value'
          },
          array: [1, 2, 3]
        },
        topLevel: 'top value'
      });
    });

    it('should handle plugins that return promises', () => {
      const promisePlugin = {
        promiseHook: sandbox.stub().returns(Promise.resolve({ promiseKey: 'promiseValue' }))
      };

      pluginManager.register('promisePlugin', promisePlugin);

      const results = pluginManager.executeHook('promiseHook');

      // Since executeHook is synchronous, it should treat the promise as an object
      expect(promisePlugin.promiseHook.calledOnce).to.be.true;
      expect(results).to.deep.equal({});
    });
  });

  describe('CONSTANTS', () => {
    it('should have the correct LOG_PRE_FIX value', () => {
      expect(CONSTANTS.LOG_PRE_FIX).to.equal('PubMatic-Plugin-Manager: ');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(CONSTANTS)).to.be.true;
    });

    it('should not allow modification of constants', () => {
      try {
        CONSTANTS.LOG_PRE_FIX = 'Modified prefix';
        // If we get here, the test should fail because the constant was modified
        expect.fail('Expected an error when modifying frozen CONSTANTS');
      } catch (e) {
        // This is expected behavior
        expect(e).to.be.an.instanceof(TypeError);
        expect(CONSTANTS.LOG_PRE_FIX).to.equal('PubMatic-Plugin-Manager: ');
      }
    });
  });

  // Test browser compatibility
  describe('browser compatibility', () => {
    let originalMap;
    let originalObjectEntries;
    let originalObjectAssign;

    beforeEach(() => {
      // Store original implementations
      originalMap = global.Map;
      originalObjectEntries = Object.entries;
      originalObjectAssign = Object.assign;
    });

    afterEach(() => {
      // Restore original implementations
      global.Map = originalMap;
      Object.entries = originalObjectEntries;
      Object.assign = originalObjectAssign;
    });

    it('should handle browser environments where Map is not available', function() {
      // Skip this test if running in a real browser environment
      if (typeof window !== 'undefined' && window.Map) {
        this.skip();
        return;
      }

      // Mock a browser environment where Map is not available
      const MapBackup = global.Map;
      global.Map = undefined;

      try {
        // This should not throw an error
        expect(() => {
          const pm = PluginManager();
          pm.register('testPlugin', {});
        }).to.not.throw();
      } finally {
        // Restore Map
        global.Map = MapBackup;
      }
    });

    it('should handle browser environments where Object.entries is not available', function() {
      // Skip this test if running in a real browser environment
      if (typeof window !== 'undefined') {
        this.skip();
        return;
      }

      // Mock a browser environment where Object.entries is not available
      Object.entries = undefined;

      // Register a plugin
      pluginManager.register('testPlugin', mockPlugin);

      // This should not throw an error
      expect(() => {
        pluginManager.executeHook('testHook');
      }).to.not.throw();
    });

    it('should handle browser environments where Object.assign is not available', function() {
      // Skip this test if running in a real browser environment
      if (typeof window !== 'undefined') {
        this.skip();
        return;
      }

      // Mock a browser environment where Object.assign is not available
      Object.assign = undefined;

      // Register a plugin
      pluginManager.register('testPlugin', mockPlugin);

      // This should not throw an error
      expect(() => {
        pluginManager.executeHook('testHook');
      }).to.not.throw();
    });
  });
});
