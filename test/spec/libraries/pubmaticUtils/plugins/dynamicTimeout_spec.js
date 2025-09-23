import sinon from 'sinon';
import { expect } from 'chai';
import * as utils from '../../../../../src/utils.js';
import * as prebidGlobal from '../../../../../src/prebidGlobal.js';
import * as dynamicTimeout from '../../../../../libraries/pubmaticUtils/plugins/dynamicTimeout.js';
import { bidderTimeoutFunctions } from '../../../../../libraries/bidderTimeoutUtils/bidderTimeoutUtils.js';
import * as pubmaticUtils from '../../../../../libraries/pubmaticUtils/pubmaticUtils.js';

describe('DynamicTimeout Plugin', () => {
  let sandbox;

  // Sample configuration objects
  const enabledConfig = {
    enabled: true,
    config: {
      skipRate: 20,
      bidderTimeout: 1000,
      timeoutRules: {
        includesVideo: {
          'true': 200,
          'false': 50
        },
        numAdUnits: {
          '1-5': 100,
          '6-10': 200
        }
      }
    }
  };

  const configWithData = {
    enabled: true,
    config: {
      skipRate: 20,
      bidderTimeout: 1000
    },
    data: {
      includesVideo: {
        'true': 300,
        'false': 100
      },
      deviceType: {
        '2': 50,
        '4': 150
      }
    }
  };

  const disabledConfig = {
    enabled: false,
    config: {
      skipRate: 0
    }
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    // Reset dynamic timeout config before each test
    dynamicTimeout.setDynamicTimeoutConfig(null);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('init', () => {
    it('should initialize successfully with valid config', async () => {
      const configJsonManager = {
        getConfigByName: sandbox.stub().returns(enabledConfig)
      };

      const logInfoStub = sandbox.stub(utils, 'logInfo');

      const result = await dynamicTimeout.init('dynamicTimeout', configJsonManager);

      expect(result).to.be.true;
      expect(dynamicTimeout.getDynamicTimeoutConfig()).to.deep.equal(enabledConfig);
      expect(logInfoStub.called).to.be.false;
    });

    it('should return false if config is not found', async () => {
      const configJsonManager = {
        getConfigByName: sandbox.stub().returns(null)
      };

      const logInfoStub = sandbox.stub(utils, 'logInfo');

      const result = await dynamicTimeout.init('dynamicTimeout', configJsonManager);

      expect(result).to.be.false;
      expect(logInfoStub.calledOnce).to.be.true;
      expect(logInfoStub.firstCall.args[0]).to.include('Dynamic Timeout configuration not found');
    });

    it('should return false if config is disabled', async () => {
      const configJsonManager = {
        getConfigByName: sandbox.stub().returns(disabledConfig)
      };

      const logInfoStub = sandbox.stub(utils, 'logInfo');

      const result = await dynamicTimeout.init('dynamicTimeout', configJsonManager);

      expect(result).to.be.false;
      expect(logInfoStub.calledOnce).to.be.true;
      expect(logInfoStub.firstCall.args[0]).to.include('Dynamic Timeout configuration is disabled');
    });
  });

  describe('processBidRequest', () => {
    let logInfoStub;
    let getGlobalStub;
    let calculateTimeoutModifierStub;
    let shouldThrottleStub;

    beforeEach(() => {
      logInfoStub = sandbox.stub(utils, 'logInfo');
      getGlobalStub = sandbox.stub(prebidGlobal, 'getGlobal').returns({
        getConfig: sandbox.stub().returns(800),
        adUnits: [{ code: 'test-div' }]
      });
      calculateTimeoutModifierStub = sandbox.stub(bidderTimeoutFunctions, 'calculateTimeoutModifier').returns(150);
      shouldThrottleStub = sandbox.stub(pubmaticUtils, 'shouldThrottle');

      // Set up default config for most tests
      dynamicTimeout.setDynamicTimeoutConfig(enabledConfig);
    });

    it('should skip processing if throttled by skipRate', async () => {
      shouldThrottleStub.returns(true);

      const reqBidsConfigObj = { timeout: 800 };
      const result = await dynamicTimeout.processBidRequest(reqBidsConfigObj);

      expect(result).to.equal(reqBidsConfigObj);
      expect(logInfoStub.calledOnce).to.be.true;
      expect(logInfoStub.firstCall.args[0]).to.include('Dynamic timeout is skipped');
      expect(calculateTimeoutModifierStub.called).to.be.false;
    });

    it('should apply timeout adjustment when not throttled', async () => {
      shouldThrottleStub.returns(false);

      const reqBidsConfigObj = { timeout: 800 };
      const result = await dynamicTimeout.processBidRequest(reqBidsConfigObj);

      // The actual code uses the bidderTimeout from config (1000) + additionalTimeout (150)
      expect(result.timeout).to.equal(1150);
      expect(logInfoStub.called).to.be.true;
      expect(calculateTimeoutModifierStub.calledOnce).to.be.true;
    });

    it('should use adUnits from reqBidsConfigObj if available', async () => {
      shouldThrottleStub.returns(false);

      const reqBidsConfigObj = {
        timeout: 800,
        adUnits: [
          { code: 'div1' },
          { code: 'div2' }
        ]
      };

      await dynamicTimeout.processBidRequest(reqBidsConfigObj);

      expect(calculateTimeoutModifierStub.calledOnce).to.be.true;
      expect(calculateTimeoutModifierStub.firstCall.args[0]).to.deep.equal(reqBidsConfigObj.adUnits);
    });

    it('should use adUnits from global if not in reqBidsConfigObj', async () => {
      shouldThrottleStub.returns(false);

      const globalAdUnits = [{ code: 'global-div' }];
      getGlobalStub.returns({
        getConfig: sandbox.stub().returns(800),
        adUnits: globalAdUnits
      });

      const reqBidsConfigObj = { timeout: 800 };
      await dynamicTimeout.processBidRequest(reqBidsConfigObj);

      expect(calculateTimeoutModifierStub.calledOnce).to.be.true;
      expect(calculateTimeoutModifierStub.firstCall.args[0]).to.deep.equal(globalAdUnits);
    });

    it('should use bidderTimeout from config if available', async () => {
      shouldThrottleStub.returns(false);

      const reqBidsConfigObj = {};
      await dynamicTimeout.processBidRequest(reqBidsConfigObj);

      // Should use the bidderTimeout from config (1000) not the global one (800)
      expect(reqBidsConfigObj.timeout).to.equal(1150); // 1000 + 150
    });

    it('should use timeout from reqBidsConfigObj if available and no config bidderTimeout', async () => {
      shouldThrottleStub.returns(false);

      // Remove bidderTimeout from config
      const configWithoutBidderTimeout = {
        ...enabledConfig,
        config: { ...enabledConfig.config }
      };
      delete configWithoutBidderTimeout.config.bidderTimeout;
      dynamicTimeout.setDynamicTimeoutConfig(configWithoutBidderTimeout);

      const reqBidsConfigObj = { timeout: 900 };
      await dynamicTimeout.processBidRequest(reqBidsConfigObj);

      expect(reqBidsConfigObj.timeout).to.equal(1050); // 900 + 150
    });

    it('should fall back to global bidderTimeout if needed', async () => {
      shouldThrottleStub.returns(false);

      // Remove bidderTimeout from config
      const configWithoutBidderTimeout = {
        ...enabledConfig,
        config: { ...enabledConfig.config }
      };
      delete configWithoutBidderTimeout.config.bidderTimeout;
      dynamicTimeout.setDynamicTimeoutConfig(configWithoutBidderTimeout);

      const reqBidsConfigObj = {};
      await dynamicTimeout.processBidRequest(reqBidsConfigObj);

      expect(reqBidsConfigObj.timeout).to.equal(950); // 800 + 150
    });

    it('should use skipRate 0 when explicitly set to 0', async () => {
      // Set a config with skipRate explicitly set to 0
      const configWithZeroSkipRate = {
        enabled: true,
        config: {
          skipRate: 0,
          bidderTimeout: 1000
        }
      };
      dynamicTimeout.setDynamicTimeoutConfig(configWithZeroSkipRate);

      const reqBidsConfigObj = { timeout: 800 };
      await dynamicTimeout.processBidRequest(reqBidsConfigObj);

      // Verify shouldThrottle was called with skipRate=0, not the default value
      expect(shouldThrottleStub.calledOnce).to.be.true;
      expect(shouldThrottleStub.firstCall.args[0]).to.equal(0);
    });

    it('should use default skipRate when skipRate is not present in config', async () => {
      // Set a config without skipRate
      const configWithoutSkipRate = {
        enabled: true,
        config: {
          bidderTimeout: 1000
        }
      };
      dynamicTimeout.setDynamicTimeoutConfig(configWithoutSkipRate);

      const reqBidsConfigObj = { timeout: 800 };
      await dynamicTimeout.processBidRequest(reqBidsConfigObj);

      // Verify shouldThrottle was called with the default skipRate
      expect(shouldThrottleStub.calledOnce).to.be.true;
      expect(shouldThrottleStub.firstCall.args[0]).to.equal(dynamicTimeout.CONSTANTS.DEFAULT_SKIP_RATE);
    });
  });

  describe('getBidderTimeout', () => {
    let getGlobalStub;

    beforeEach(() => {
      getGlobalStub = sandbox.stub(prebidGlobal, 'getGlobal').returns({
        getConfig: sandbox.stub().returns(800)
      });
    });

    it('should return bidderTimeout from config if available', () => {
      dynamicTimeout.setDynamicTimeoutConfig(enabledConfig);

      const result = dynamicTimeout.getBidderTimeout({});

      expect(result).to.equal(1000);
    });

    it('should return timeout from reqBidsConfigObj if no config bidderTimeout', () => {
      const configWithoutBidderTimeout = {
        ...enabledConfig,
        config: { ...enabledConfig.config }
      };
      delete configWithoutBidderTimeout.config.bidderTimeout;
      dynamicTimeout.setDynamicTimeoutConfig(configWithoutBidderTimeout);

      const result = dynamicTimeout.getBidderTimeout({ timeout: 900 });

      expect(result).to.equal(900);
    });

    it('should fall back to global bidderTimeout if needed', () => {
      const configWithoutBidderTimeout = {
        ...enabledConfig,
        config: { ...enabledConfig.config }
      };
      delete configWithoutBidderTimeout.config.bidderTimeout;
      dynamicTimeout.setDynamicTimeoutConfig(configWithoutBidderTimeout);

      const result = dynamicTimeout.getBidderTimeout({});

      expect(result).to.equal(800);
    });
  });

  describe('getRules', () => {
    it('should return data rules if available', () => {
      dynamicTimeout.setDynamicTimeoutConfig(configWithData);

      const result = dynamicTimeout.getRules(1000);

      expect(result).to.deep.equal(configWithData.data);
    });

    it('should return config timeoutRules if no data rules', () => {
      dynamicTimeout.setDynamicTimeoutConfig(enabledConfig);

      const result = dynamicTimeout.getRules(1000);

      expect(result).to.deep.equal(enabledConfig.config.timeoutRules);
    });

    it('should create dynamic rules if no data or config rules', () => {
      const configWithoutRules = {
        enabled: true,
        config: {
          skipRate: 20,
          bidderTimeout: 1000
        }
      };
      dynamicTimeout.setDynamicTimeoutConfig(configWithoutRules);

      const result = dynamicTimeout.getRules(1000);

      expect(result).to.deep.equal(dynamicTimeout.createDynamicRules(dynamicTimeout.RULES_PERCENTAGE, 1000));
    });
  });

  describe('createDynamicRules', () => {
    it('should convert percentage rules to millisecond values', () => {
      const percentageRules = {
        includesVideo: {
          'true': 20,  // 20% of bidderTimeout
          'false': 5   // 5% of bidderTimeout
        },
        numAdUnits: {
          '1-5': 10,   // 10% of bidderTimeout
          '6-10': 20   // 20% of bidderTimeout
        }
      };

      const bidderTimeout = 1000;
      const result = dynamicTimeout.createDynamicRules(percentageRules, bidderTimeout);

      expect(result).to.deep.equal({
        includesVideo: {
          'true': 200,  // 20% of 1000
          'false': 50   // 5% of 1000
        },
        numAdUnits: {
          '1-5': 100,   // 10% of 1000
          '6-10': 200   // 20% of 1000
        }
      });
    });

    it('should handle invalid percentage values', () => {
      const percentageRules = {
        includesVideo: {
          'true': 'invalid',
          'false': 5
        }
      };

      const bidderTimeout = 1000;
      const result = dynamicTimeout.createDynamicRules(percentageRules, bidderTimeout);

      expect(result).to.deep.equal({
        includesVideo: {
          'false': 50
        }
      });
    });

    it('should return empty object for invalid inputs', () => {
      expect(dynamicTimeout.createDynamicRules(null, 1000)).to.deep.equal({});
      expect(dynamicTimeout.createDynamicRules({}, 0)).to.deep.equal({});
      expect(dynamicTimeout.createDynamicRules('invalid', 1000)).to.deep.equal({});
      expect(dynamicTimeout.createDynamicRules({}, -10)).to.deep.equal({});
    });

    it('should skip non-object rule categories', () => {
      const percentageRules = {
        includesVideo: {
          'true': 20
        },
        numAdUnits: 'invalid'
      };

      const bidderTimeout = 1000;
      const result = dynamicTimeout.createDynamicRules(percentageRules, bidderTimeout);

      expect(result).to.deep.equal({
        includesVideo: {
          'true': 200
        }
      });
    });
  });

  describe('getTargeting', () => {
    it('should return undefined', () => {
      expect(dynamicTimeout.getTargeting()).to.be.undefined;
    });
  });

  describe('CONSTANTS', () => {
    it('should have the correct LOG_PRE_FIX value', () => {
      expect(dynamicTimeout.CONSTANTS.LOG_PRE_FIX).to.equal('PubMatic-Dynamic-Timeout: ');
    });

    it('should have the correct rule type constants', () => {
      expect(dynamicTimeout.CONSTANTS.INCLUDES_VIDEOS).to.equal('includesVideo');
      expect(dynamicTimeout.CONSTANTS.NUM_AD_UNITS).to.equal('numAdUnits');
      expect(dynamicTimeout.CONSTANTS.DEVICE_TYPE).to.equal('deviceType');
      expect(dynamicTimeout.CONSTANTS.CONNECTION_SPEED).to.equal('connectionSpeed');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(dynamicTimeout.CONSTANTS)).to.be.true;
    });
  });

  describe('RULES_PERCENTAGE', () => {
    it('should have the correct percentage values', () => {
      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.INCLUDES_VIDEOS]['true']).to.equal(20);
      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.INCLUDES_VIDEOS]['false']).to.equal(5);

      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.NUM_AD_UNITS]['1-5']).to.equal(10);
      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.NUM_AD_UNITS]['6-10']).to.equal(20);
      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.NUM_AD_UNITS]['11-15']).to.equal(30);

      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.DEVICE_TYPE]['2']).to.equal(5);
      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.DEVICE_TYPE]['4']).to.equal(10);
      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.DEVICE_TYPE]['5']).to.equal(20);

      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.CONNECTION_SPEED]['slow']).to.equal(20);
      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.CONNECTION_SPEED]['medium']).to.equal(10);
      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.CONNECTION_SPEED]['fast']).to.equal(5);
      expect(dynamicTimeout.RULES_PERCENTAGE[dynamicTimeout.CONSTANTS.CONNECTION_SPEED]['unknown']).to.equal(1);
    });
  });

  describe('DynamicTimeout export', () => {
    it('should export the correct interface', () => {
      expect(dynamicTimeout.DynamicTimeout).to.be.an('object');
      expect(dynamicTimeout.DynamicTimeout.init).to.be.a('function');
      expect(dynamicTimeout.DynamicTimeout.processBidRequest).to.be.a('function');
      expect(dynamicTimeout.DynamicTimeout.getTargeting).to.be.a('function');
    });
  });
});
