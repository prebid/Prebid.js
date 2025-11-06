import { expect } from 'chai';
import * as rulesModule from 'modules/rules/index.ts';
import * as utils from 'src/utils.js';
import * as storageManager from 'src/storageManager.js';
import { isActivityAllowed } from 'src/activities/rules.js';
import { activityParams } from 'src/activities/activityParams.js';
import { ACTIVITY_FETCH_BIDS, ACTIVITY_ADD_BID_RESPONSE } from 'src/activities/activities.js';
import { MODULE_TYPE_BIDDER } from 'src/activities/modules.ts';
import { config } from 'src/config.js';

describe('Rules Module', function() {
  let sandbox;
  let logWarnStub;
  let logInfoStub;
  let newStorageManagerStub;

  beforeEach(function() {
    sandbox = sinon.createSandbox();

    logWarnStub = sandbox.stub(utils, 'logWarn');
    logInfoStub = sandbox.stub(utils, 'logInfo');

    const mockStorageManager = {
      localStorageIsEnabled: sandbox.stub().returns(true),
      getDataFromLocalStorage: sandbox.stub().returns(null),
      setDataInLocalStorage: sandbox.stub()
    };
    newStorageManagerStub = sandbox.stub(storageManager, 'newStorageManager').returns(mockStorageManager);
  });

  afterEach(function() {
    sandbox.restore();
    config.resetConfig();
    rulesModule.reset();
  });

  describe('assignModelGroups', function() {
    it('should select model group based on weights', function() {
      const rulesets = [{
        name: 'testRuleSet',
        stage: 'processed-auction-request',
        modelGroups: [{
          weight: 50,
          selected: false,
          analyticsKey: 'testKey1',
          schema: [],
          rules: []
        }, {
          weight: 50,
          selected: false,
          analyticsKey: 'testKey2',
          schema: [],
          rules: []
        }]
      }];

      // Mock Math.random to return 0.15 (15 < 50, so first group should be selected)
      // randomValue = 0.15 * 100 = 15, 15 < 50 so first group selected
      sandbox.stub(Math, 'random').returns(0.15);

      rulesModule.assignModelGroups(rulesets);

      // Verify that first model group was selected
      expect(rulesets[0].modelGroups[0].selected).to.be.true;
      expect(rulesets[0].modelGroups[1].selected).to.be.false;
    });

    it('should use default weight of 100 when weight is not specified', function() {
      const rulesets = [{
        name: 'testRuleSet',
        stage: 'processed-auction-request',
        modelGroups: [{
          // weight not specified, should default to 100
          selected: false,
          analyticsKey: 'testKey1',
          schema: [],
          rules: []
        }, {
          // weight not specified, should default to 100
          selected: false,
          analyticsKey: 'testKey2',
          schema: [],
          rules: []
        }, {
          // weight not specified, should default to 100
          selected: false,
          analyticsKey: 'testKey3',
          schema: [],
          rules: []
        }]
      }];

      // Mock Math.random to return value that selects last group
      // randomValue = 0.85 * 300 = 255
      // First group: 255 >= 100, not selected, randomValue = 255 - 100 = 155
      // Second group: 155 >= 100, not selected, randomValue = 155 - 100 = 55
      // Third group: 55 < 100, selected!
      sandbox.stub(Math, 'random').returns(0.85);

      rulesModule.assignModelGroups(rulesets);

      expect(rulesets[0].modelGroups[0].selected).to.be.false;
      expect(rulesets[0].modelGroups[1].selected).to.be.false;
      expect(rulesets[0].modelGroups[2].selected).to.be.true;
    });
  });

  describe('evaluateConfig', function() {

    it('should exclude bidder when it matches bidders list for processed-auction-request stage', function() {
      const rulesJson = {
        enabled: true,
        timestamp: '1234567890',
        ruleSets: [{
          name: 'testRuleSet',
          stage: 'processed-auction-request',
          version: '1.0',
          modelGroups: [{
            weight: 100,
            selected: true,
            analyticsKey: 'testAnalyticsKey',
            schema: [],
            rules: [{
              conditions: ['*'],
              results: [{
                function: 'excludeBidders',
                args: [{
                  bidders: ['bidder1'],
                  analyticsValue: 'excluded'
                }]
              }]
            }]
          }]
        }]
      };

      sandbox.stub(Math, 'random').returns(0.5);
      rulesModule.evaluateConfig(rulesJson);

      expect(isActivityAllowed(ACTIVITY_FETCH_BIDS, activityParams(MODULE_TYPE_BIDDER, 'bidder1', {}))).to.eql(false);
    });

    it('should allow bidder when it does not match bidders list for processed-auction-request stage', function() {
      const rulesJson = {
        enabled: true,
        timestamp: '1234567890',
        ruleSets: [{
          name: 'testRuleSet',
          stage: 'processed-auction-request',
          version: '1.0',
          modelGroups: [{
            weight: 100,
            selected: true,
            analyticsKey: 'testAnalyticsKey',
            schema: [],
            rules: [{
              conditions: ['*'],
              results: [{
                function: 'excludeBidders',
                args: [{
                  bidders: ['bidder1'],
                  analyticsValue: 'excluded'
                }]
              }]
            }]
          }]
        }]
      };

      sandbox.stub(Math, 'random').returns(0.5);
      rulesModule.evaluateConfig(rulesJson);

      expect(isActivityAllowed(ACTIVITY_FETCH_BIDS, activityParams(MODULE_TYPE_BIDDER, 'bidder2', {}))).to.eql(true);
    });

    it('should exclude bidder when it matches bidders list for processed-auction stage', function() {
      const rulesJson = {
        enabled: true,
        timestamp: '1234567890',
        ruleSets: [{
          name: 'testRuleSet',
          stage: 'processed-auction',
          version: '1.0',
          modelGroups: [{
            weight: 100,
            selected: true,
            analyticsKey: 'testAnalyticsKey',
            schema: [],
            rules: [{
              conditions: ['*'],
              results: [{
                function: 'excludeBidders',
                args: [{
                  bidders: ['bidder3'],
                  analyticsValue: 'excluded'
                }]
              }]
            }]
          }]
        }]
      };

      sandbox.stub(Math, 'random').returns(0.5);
      rulesModule.evaluateConfig(rulesJson);

      // Verify that excluded bidder is not allowed for processed-auction
      expect(isActivityAllowed(ACTIVITY_ADD_BID_RESPONSE, activityParams(MODULE_TYPE_BIDDER, 'bidder3', {}))).to.eql(false);
      // Verify that non-excluded bidder is allowed for processed-auction
      expect(isActivityAllowed(ACTIVITY_ADD_BID_RESPONSE, activityParams(MODULE_TYPE_BIDDER, 'bidder4', {}))).to.eql(true);
    });
  });

  describe('evaluateSchema', function() {
    it('should evaluate percent condition', function() {
      sandbox.stub(Math, 'random').returns(0.3);
      const func = rulesModule.evaluateSchema('percent', [50], {});
      const result = func();
      // 30 < 50, so should return true
      expect(result).to.be.true;
    });

    it('should evaluate adUnitCode condition', function() {
      const context = {
        adUnit: {
          code: 'div-1'
        }
      };
      const func = rulesModule.evaluateSchema('adUnitCode', ['div-1'], context);
      expect(func()).to.be.true;

      const func2 = rulesModule.evaluateSchema('adUnitCode', ['div-2'], context);
      expect(func2()).to.be.false;
    });

    it('should evaluate adUnitCodeIn condition', function() {
      const context = {
        adUnit: {
          code: 'div-1'
        }
      };
      const func = rulesModule.evaluateSchema('adUnitCodeIn', ['div-1', 'div-2'], context);
      expect(func()).to.be.true;

      const func2 = rulesModule.evaluateSchema('adUnitCodeIn', ['div-3', 'div-4'], context);
      expect(func2()).to.be.false;
    });

    it('should evaluate deviceCountry condition', function() {
      const context = {
        ortb2: {
          device: {
            geo: {
              country: 'US'
            }
          }
        }
      };
      const func = rulesModule.evaluateSchema('deviceCountry', ['US'], context);
      expect(func()).to.be.true;

      const func2 = rulesModule.evaluateSchema('deviceCountry', ['UK'], context);
      expect(func2()).to.be.false;
    });

    it('should evaluate deviceCountryIn condition', function() {
      const context = {
        ortb2: {
          device: {
            geo: {
              country: 'US'
            }
          }
        }
      };
      const func = rulesModule.evaluateSchema('deviceCountryIn', ['US', 'UK'], context);
      expect(func()).to.be.true;

      const func2 = rulesModule.evaluateSchema('deviceCountryIn', ['DE', 'FR'], context);
      expect(func2()).to.be.false;
    });

    it('should evaluate channel condition', function() {
      const context1 = {
        ortb2: {
          ext: {
            prebid: {
              channel: 'pbjs'
            }
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('channel', [], context1);
      expect(func1()).to.equal('web');

      const context2 = {
        ortb2: {
          ext: {
            prebid: {
              channel: 'amp'
            }
          }
        }
      };
      const func2 = rulesModule.evaluateSchema('channel', [], context2);
      expect(func2()).to.equal('amp');

      const context3 = {};
      const func3 = rulesModule.evaluateSchema('channel', [], context3);
      expect(func3()).to.equal('');
    });

    it('should evaluate eidAvailable condition', function() {
      const context1 = {
        ortb2: {
          user: {
            eids: [{ source: 'test', id: '123' }]
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('eidAvailable', [], context1);
      expect(func1()).to.be.true;

      const context2 = {
        ortb2: {
          user: {
            eids: []
          }
        }
      };
      const func2 = rulesModule.evaluateSchema('eidAvailable', [], context2);
      expect(func2()).to.be.false;
    });

    it('should evaluate userFpdAvailable condition', function() {
      const context1 = {
        ortb2: {
          user: {
            data: [{ name: 'test', segment: [] }]
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('userFpdAvailable', [], context1);
      expect(func1()).to.be.true;

      const context2 = {
        ortb2: {
          user: {
            ext: {
              data: [{ name: 'test', segment: [] }]
            }
          }
        }
      };
      const func2 = rulesModule.evaluateSchema('userFpdAvailable', [], context2);
      expect(func2()).to.be.true;

      const context3 = {
        ortb2: {
          user: {}
        }
      };
      const func3 = rulesModule.evaluateSchema('userFpdAvailable', [], context3);
      expect(func3()).to.be.false;
    });

    it('should evaluate fpdAvailable condition', function() {
      const context1 = {
        ortb2: {
          user: {
            data: [{ name: 'test' }]
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('fpdAvailable', [], context1);
      expect(func1()).to.be.true;

      const context2 = {
        ortb2: {
          site: {
            content: {
              data: [{ name: 'test' }]
            }
          }
        }
      };
      const func2 = rulesModule.evaluateSchema('fpdAvailable', [], context2);
      expect(func2()).to.be.true;

      const context3 = {
        ortb2: {}
      };
      const func3 = rulesModule.evaluateSchema('fpdAvailable', [], context3);
      expect(func3()).to.be.false;
    });

    it('should evaluate gppSidIn condition', function() {
      const context1 = {
        regs: {
          gpp_sid: [1, 2, 3]
        }
      };
      const func1 = rulesModule.evaluateSchema('gppSidIn', [2], context1);
      expect(func1()).to.be.true;

      const func2 = rulesModule.evaluateSchema('gppSidIn', [4], context1);
      expect(func2()).to.be.false;
    });

    it('should evaluate tcfInScope condition', function() {
      const context1 = {
        regs: {
          ext: {
            gdpr: 1
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('tcfInScope', [], context1);
      expect(func1()).to.be.true;

      const context2 = {
        regs: {
          ext: {
            gdpr: 0
          }
        }
      };
      const func2 = rulesModule.evaluateSchema('tcfInScope', [], context2);
      expect(func2()).to.be.false;
    });

    it('should evaluate domainIn condition', function() {
      const context1 = {
        ortb2: {
          site: {
            domain: 'example.com'
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('domainIn', ['example.com', 'test.com'], context1);
      expect(func1()).to.be.true;

      const context2 = {
        ortb2: {
          app: {
            domain: 'app.example.com'
          }
        }
      };
      const func2 = rulesModule.evaluateSchema('domainIn', ['app.example.com'], context2);
      expect(func2()).to.be.true;

      const func3 = rulesModule.evaluateSchema('domainIn', ['other.com'], context1);
      expect(func3()).to.be.false;
    });

    it('should evaluate bundleIn condition', function() {
      const context1 = {
        ortb2: {
          app: {
            bundle: 'com.example.app'
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('bundleIn', ['com.example.app'], context1);
      expect(func1()).to.be.true;

      const func2 = rulesModule.evaluateSchema('bundleIn', ['com.other.app'], context1);
      expect(func2()).to.be.false;
    });

    it('should evaluate mediaTypeIn condition', function() {
      const context1 = {
        adUnit: {
          mediaTypes: {
            banner: {},
            video: {}
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('mediaTypeIn', ['banner'], context1);
      expect(func1()).to.be.true;

      const func2 = rulesModule.evaluateSchema('mediaTypeIn', ['native'], context1);
      expect(func2()).to.be.false;
    });

    it('should evaluate deviceTypeIn condition', function() {
      const context1 = {
        ortb2: {
          device: {
            devicetype: 2
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('deviceTypeIn', [2, 3], context1);
      expect(func1()).to.be.true;

      const func2 = rulesModule.evaluateSchema('deviceTypeIn', [4, 5], context1);
      expect(func2()).to.be.false;
    });

    it('should evaluate bidPrice condition', function() {
      const context1 = {
        bid: {
          price: 5.50
        }
      };
      const func1 = rulesModule.evaluateSchema('bidPrice', [5.0], context1);
      expect(func1()).to.be.true;

      const func2 = rulesModule.evaluateSchema('bidPrice', [6.0], context1);
      expect(func2()).to.be.false;

      const context3 = {
        bid: {
          price: 0
        }
      };
      const func3 = rulesModule.evaluateSchema('bidPrice', [1.0], context3);
      expect(func3()).to.be.false;
    });

    it('should return null function for unknown schema function', function() {
      const func = rulesModule.evaluateSchema('unknownFunction', [], {});
      expect(func()).to.be.null;
    });
  });
});
