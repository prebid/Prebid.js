import { expect } from 'chai';
import sinon from 'sinon';
import * as utils from '../../../src/utils.js';
import * as pubmaticRtdProvider from '../../../modules/pubmaticRtdProvider.js';
import { FloorProvider } from '../../../libraries/pubmaticUtils/plugins/floorProvider.js';
import { UnifiedPricingRule } from '../../../libraries/pubmaticUtils/plugins/unifiedPricingRule.js';

describe('Pubmatic RTD Provider', () => {
  let sandbox;
  let fetchStub;
  let logErrorStub;
  let originalPluginManager;
  let originalConfigJsonManager;
  let pluginManagerStub;
  let configJsonManagerStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    fetchStub = sandbox.stub(window, 'fetch');
    logErrorStub = sinon.stub(utils, 'logError');

    // Store original implementations
    originalPluginManager = Object.assign({}, pubmaticRtdProvider.pluginManager);
    originalConfigJsonManager = Object.assign({}, pubmaticRtdProvider.configJsonManager);

    // Create stubs
    pluginManagerStub = {
      initialize: sinon.stub().resolves(),
      executeHook: sinon.stub().resolves(),
      register: sinon.stub()
    };

    configJsonManagerStub = {
      fetchConfig: sinon.stub().resolves(true),
      getYMConfig: sinon.stub(),
      getConfigByName: sinon.stub(),
      country: 'IN'
    };

    // Replace exported objects with stubs
    Object.keys(pluginManagerStub).forEach(key => {
      pubmaticRtdProvider.pluginManager[key] = pluginManagerStub[key];
    });

    Object.keys(configJsonManagerStub).forEach(key => {
      if (key === 'country') {
        Object.defineProperty(pubmaticRtdProvider.configJsonManager, key, {
          get: () => configJsonManagerStub[key]
        });
      } else {
        pubmaticRtdProvider.configJsonManager[key] = configJsonManagerStub[key];
      }
    });

    // Reset _ymConfigPromise for each test
    pubmaticRtdProvider.setYmConfigPromise(Promise.resolve());
  });

  afterEach(() => {
    sandbox.restore();
    logErrorStub.restore();

    // Restore original implementations
    Object.keys(originalPluginManager).forEach(key => {
      pubmaticRtdProvider.pluginManager[key] = originalPluginManager[key];
    });

    Object.keys(originalConfigJsonManager).forEach(key => {
      if (key === 'country') {
        Object.defineProperty(pubmaticRtdProvider.configJsonManager, 'country', {
          get: () => originalConfigJsonManager[key]
        });
      } else {
        pubmaticRtdProvider.configJsonManager[key] = originalConfigJsonManager[key];
      }
    });
  });

  describe('init', () => {
    const validConfig = {
      params: {
        publisherId: 'test-publisher-id',
        profileId: 'test-profile-id'
      }
    };

    it('should return false if publisherId is missing', () => {
      const config = {
        params: {
          profileId: 'test-profile-id'
        }
      };
      const result = pubmaticRtdProvider.pubmaticSubmodule.init(config);
      expect(result).to.be.false;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${pubmaticRtdProvider.CONSTANTS.LOG_PRE_FIX} Missing publisher Id.`);
    });

    it('should return false if publisherId is not a string', () => {
      const config = {
        params: {
          publisherId: 123,
          profileId: 'test-profile-id'
        }
      };
      const result = pubmaticRtdProvider.pubmaticSubmodule.init(config);
      expect(result).to.be.false;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${pubmaticRtdProvider.CONSTANTS.LOG_PRE_FIX} Publisher Id should be a string.`);
    });

    it('should return false if profileId is missing', () => {
      const config = {
        params: {
          publisherId: 'test-publisher-id'
        }
      };
      const result = pubmaticRtdProvider.pubmaticSubmodule.init(config);
      expect(result).to.be.false;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${pubmaticRtdProvider.CONSTANTS.LOG_PRE_FIX} Missing profile Id.`);
    });

    it('should return false if profileId is not a string', () => {
      const config = {
        params: {
          publisherId: 'test-publisher-id',
          profileId: 345
        }
      };
      const result = pubmaticRtdProvider.pubmaticSubmodule.init(config);
      expect(result).to.be.false;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.equal(`${pubmaticRtdProvider.CONSTANTS.LOG_PRE_FIX} Profile Id should be a string.`);
    });

    it('should initialize successfully with valid config', async () => {
      configJsonManagerStub.fetchConfig.resolves(true);
      pluginManagerStub.initialize.resolves();

      const result = pubmaticRtdProvider.pubmaticSubmodule.init(validConfig);
      expect(result).to.be.true;
      expect(configJsonManagerStub.fetchConfig.calledOnce).to.be.true;
      expect(configJsonManagerStub.fetchConfig.firstCall.args[0]).to.equal('test-publisher-id');
      expect(configJsonManagerStub.fetchConfig.firstCall.args[1]).to.equal('test-profile-id');

      // Wait for promise to resolve
      await pubmaticRtdProvider.getYmConfigPromise();
      expect(pluginManagerStub.initialize.calledOnce).to.be.true;
      expect(pluginManagerStub.initialize.firstCall.args[0]).to.equal(pubmaticRtdProvider.configJsonManager);
    });

    it('should handle config fetch error gracefully', async () => {
      configJsonManagerStub.fetchConfig.resolves(false);

      const result = pubmaticRtdProvider.pubmaticSubmodule.init(validConfig);
      expect(result).to.be.true;

      try {
        await pubmaticRtdProvider.getYmConfigPromise();
      } catch (e) {
        expect(e.message).to.equal('Failed to fetch configuration');
      }

      expect(pluginManagerStub.initialize.called).to.be.false;
    });
  });

  describe('getBidRequestData', () => {
    const reqBidsConfigObj = {
      ortb2Fragments: {
        bidder: {}
      },
      adUnits: [
        {
          code: 'div-1',
          bids: [{ bidder: 'pubmatic', params: {} }]
        },
        {
          code: 'div-2',
          bids: [{ bidder: 'pubmatic', params: {} }]
        }
      ]
    };
    let callback;

    beforeEach(() => {
      callback = sinon.stub();
      pubmaticRtdProvider.setYmConfigPromise(Promise.resolve());
    });

    it('should call pluginManager executeHook with correct parameters', (done) => {
      pluginManagerStub.executeHook.resolves();

      pubmaticRtdProvider.pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      setTimeout(() => {
        expect(pluginManagerStub.executeHook.calledOnce).to.be.true;
        expect(pluginManagerStub.executeHook.firstCall.args[0]).to.equal('processBidRequest');
        expect(pluginManagerStub.executeHook.firstCall.args[1]).to.deep.equal(reqBidsConfigObj);
        expect(callback.calledOnce).to.be.true;
        done();
      }, 0);
    });

    it('should add country information to ORTB2', (done) => {
      pluginManagerStub.executeHook.resolves();

      pubmaticRtdProvider.pubmaticSubmodule.getBidRequestData(reqBidsConfigObj, callback);

      setTimeout(() => {
        expect(reqBidsConfigObj.ortb2Fragments.bidder[pubmaticRtdProvider.CONSTANTS.SUBMODULE_NAME]).to.deep.equal({
          user: {
            ext: {
              ctr: 'IN'
            }
          }
        });
        done();
      }, 0);
    });
  });

  describe('getTargetingData', () => {
    const adUnitCodes = ['div-1', 'div-2'];
    const config = {
      params: {
        publisherId: 'test-publisher-id',
        profileId: 'test-profile-id'
      }
    };
    const userConsent = {};
    const auction = {};
    const unifiedPricingRule = {
      'div-1': { key1: 'value1' },
      'div-2': { key2: 'value2' }
    };

    it('should call pluginManager executeHook with correct parameters', () => {
      pluginManagerStub.executeHook.returns(unifiedPricingRule);

      const result = pubmaticRtdProvider.getTargetingData(adUnitCodes, config, userConsent, auction);

      expect(pluginManagerStub.executeHook.calledOnce).to.be.true;
      expect(pluginManagerStub.executeHook.firstCall.args[0]).to.equal('getTargeting');
      expect(pluginManagerStub.executeHook.firstCall.args[1]).to.equal(adUnitCodes);
      expect(pluginManagerStub.executeHook.firstCall.args[2]).to.equal(config);
      expect(pluginManagerStub.executeHook.firstCall.args[3]).to.equal(userConsent);
      expect(pluginManagerStub.executeHook.firstCall.args[4]).to.equal(auction);
      expect(result).to.equal(unifiedPricingRule);
    });

    it('should return empty object if no targeting data', () => {
      pluginManagerStub.executeHook.returns({});

      const result = pubmaticRtdProvider.getTargetingData(adUnitCodes, config, userConsent, auction);
      expect(result).to.deep.equal({});
    });
  });

  describe('ConfigJsonManager', () => {
    let configManager;

    beforeEach(() => {
      configManager = pubmaticRtdProvider.ConfigJsonManager();
    });

    it('should fetch config successfully', async () => {
      const mockResponse = {
        ok: true,
        headers: {
          get: sinon.stub().withArgs('country_code').returns('US')
        },
        json: sinon.stub().resolves({ plugins: { test: { enabled: true } } })
      };

      fetchStub.resolves(mockResponse);

      const result = await configManager.fetchConfig('pub-123', 'profile-456');

      expect(result).to.be.true;
      expect(fetchStub.calledOnce).to.be.true;
      expect(fetchStub.firstCall.args[0]).to.equal(`${pubmaticRtdProvider.CONSTANTS.ENDPOINTS.BASEURL}/pub-123/profile-456/${pubmaticRtdProvider.CONSTANTS.ENDPOINTS.CONFIGS}`);
      expect(configManager.country).to.equal('US');
    });

    it('should handle fetch errors', async () => {
      fetchStub.rejects(new Error('Network error'));

      const result = await configManager.fetchConfig('pub-123', 'profile-456');

      expect(result).to.be.null;
      expect(logErrorStub.calledOnce).to.be.true;
      expect(logErrorStub.firstCall.args[0]).to.include('Error while fetching config');
    });

    it('should get config by name', () => {
      const mockConfig = {
        plugins: {
          testPlugin: { enabled: true }
        }
      };

      configManager.setYMConfig(mockConfig);

      const result = configManager.getConfigByName('testPlugin');
      expect(result).to.deep.equal({ enabled: true });
    });
  });
});
