import { expect } from 'chai';
import * as rulesModule from 'modules/rules/index.ts';
import * as utils from 'src/utils.js';
import * as storageManager from 'src/storageManager.js';
import * as analyticsAdapter from 'libraries/analyticsAdapter/AnalyticsAdapter.ts';
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

  describe('getAssignedModelGroups', function() {
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

      const result = rulesModule.getAssignedModelGroups(rulesets);

      // Verify that first model group was selected in the returned result
      expect(result[0].modelGroups[0].selected).to.be.true;
      expect(result[0].modelGroups[1].selected).to.be.false;
      // Verify original was not mutated
      expect(rulesets[0].modelGroups[0].selected).to.be.false;
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
      // Cumulative weights: [100, 200, 300]
      // First group: 255 < 100? No
      // Second group: 255 < 200? No
      // Third group: 255 < 300? Yes, selected!
      sandbox.stub(Math, 'random').returns(0.85);

      const result = rulesModule.getAssignedModelGroups(rulesets);

      expect(result[0].modelGroups[0].selected).to.be.false;
      expect(result[0].modelGroups[1].selected).to.be.false;
      expect(result[0].modelGroups[2].selected).to.be.true;
      // Verify original was not mutated
      expect(rulesets[0].modelGroups[0].selected).to.be.false;
      expect(rulesets[0].modelGroups[1].selected).to.be.false;
      expect(rulesets[0].modelGroups[2].selected).to.be.false;
    });

    it('should select correctly regardless of weight order (descending)', function() {
      const rulesets = [{
        name: 'testRuleSet',
        stage: 'processed-auction-request',
        modelGroups: [{
          weight: 100, // largest first
          selected: false,
          analyticsKey: 'testKey1',
          schema: [],
          rules: []
        }, {
          weight: 50, // medium
          selected: false,
          analyticsKey: 'testKey2',
          schema: [],
          rules: []
        }, {
          weight: 25, // smallest last
          selected: false,
          analyticsKey: 'testKey3',
          schema: [],
          rules: []
        }]
      }];

      // randomValue = 0.3 * 175 = 52.5
      // Cumulative weights: [100, 150, 175]
      // First group: 52.5 < 100? Yes, selected!
      sandbox.stub(Math, 'random').returns(0.3);

      const result = rulesModule.getAssignedModelGroups(rulesets);

      expect(result[0].modelGroups[0].selected).to.be.true;
      expect(result[0].modelGroups[1].selected).to.be.false;
      expect(result[0].modelGroups[2].selected).to.be.false;
    });

    it('should select correctly regardless of weight order (mixed)', function() {
      const rulesets = [{
        name: 'testRuleSet',
        stage: 'processed-auction-request',
        modelGroups: [{
          weight: 30, // medium
          selected: false,
          analyticsKey: 'testKey1',
          schema: [],
          rules: []
        }, {
          weight: 100, // largest in middle
          selected: false,
          analyticsKey: 'testKey2',
          schema: [],
          rules: []
        }, {
          weight: 20, // smallest last
          selected: false,
          analyticsKey: 'testKey3',
          schema: [],
          rules: []
        }]
      }];

      // randomValue = 0.6 * 150 = 90
      // Cumulative weights: [30, 130, 150]
      // First group: 90 < 30? No
      // Second group: 90 < 130? Yes, selected!
      sandbox.stub(Math, 'random').returns(0.6);

      const result = rulesModule.getAssignedModelGroups(rulesets);

      expect(result[0].modelGroups[0].selected).to.be.false;
      expect(result[0].modelGroups[1].selected).to.be.true;
      expect(result[0].modelGroups[2].selected).to.be.false;
    });

    it('should select last group when randomValue is in last range', function() {
      const rulesets = [{
        name: 'testRuleSet',
        stage: 'processed-auction-request',
        modelGroups: [{
          weight: 10,
          selected: false,
          analyticsKey: 'testKey1',
          schema: [],
          rules: []
        }, {
          weight: 20,
          selected: false,
          analyticsKey: 'testKey2',
          schema: [],
          rules: []
        }, {
          weight: 70, // largest weight
          selected: false,
          analyticsKey: 'testKey3',
          schema: [],
          rules: []
        }]
      }];

      // randomValue = 0.8 * 100 = 80
      // Cumulative weights: [10, 30, 100]
      // First group: 80 < 10? No
      // Second group: 80 < 30? No
      // Third group: 80 < 100? Yes, selected!
      sandbox.stub(Math, 'random').returns(0.8);

      const result = rulesModule.getAssignedModelGroups(rulesets);

      expect(result[0].modelGroups[0].selected).to.be.false;
      expect(result[0].modelGroups[1].selected).to.be.false;
      expect(result[0].modelGroups[2].selected).to.be.true;
    });

    it('should select first group when randomValue is very small', function() {
      const rulesets = [{
        name: 'testRuleSet',
        stage: 'processed-auction-request',
        modelGroups: [{
          weight: 10, // smallest
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
        }, {
          weight: 40,
          selected: false,
          analyticsKey: 'testKey3',
          schema: [],
          rules: []
        }]
      }];

      // randomValue = 0.01 * 100 = 1
      // Cumulative weights: [10, 60, 100]
      // First group: 1 < 10? Yes, selected!
      sandbox.stub(Math, 'random').returns(0.01);

      const result = rulesModule.getAssignedModelGroups(rulesets);

      expect(result[0].modelGroups[0].selected).to.be.true;
      expect(result[0].modelGroups[1].selected).to.be.false;
      expect(result[0].modelGroups[2].selected).to.be.false;
    });
  });

  describe('evaluateConfig', function() {
    beforeEach(function() {
      rulesModule.registerActivities();
    });

    [
      ['processed-auction-request', ACTIVITY_FETCH_BIDS],
      ['processed-auction', ACTIVITY_ADD_BID_RESPONSE]
    ].forEach(([stage, activity]) => {
      it(`should exclude bidder when it matches bidders list for ${stage} stage`, function() {
        const rulesJson = {
          enabled: true,
          timestamp: '1234567890',
          ruleSets: [{
            name: 'testRuleSet',
            stage: stage,
            version: '1.0',
            modelGroups: [{
              weight: 100,
              selected: true,
              analyticsKey: 'testAnalyticsKey',
              schema: [{ function: 'adUnitCode', args: [] }],
              rules: [{
                conditions: ['adUnit-0000'],
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

        const bidder1Params = activityParams(MODULE_TYPE_BIDDER, 'bidder1', {
          adUnit: { code: 'adUnit-0000' },
          auctionId: 'test-auction-id'
        });

        const bidder2Params = activityParams(MODULE_TYPE_BIDDER, 'bidder2', {
          adUnit: { code: 'adUnit-0000' },
          auctionId: 'test-auction-id'
        });

        expect(isActivityAllowed(activity, bidder1Params)).to.be.true;
        expect(isActivityAllowed(activity, bidder2Params)).to.be.true;

        rulesModule.evaluateConfig(rulesJson, 'test-auction-id');

        expect(isActivityAllowed(activity, bidder1Params)).to.be.false;
        expect(isActivityAllowed(activity, bidder2Params)).to.be.true;
      });

      it(`should include only bidder when it matches bidders list for ${stage} stage`, function() {
        const rulesJson = {
          enabled: true,
          timestamp: '1234567890',
          ruleSets: [{
            name: 'testRuleSet',
            stage: stage,
            version: '1.0',
            modelGroups: [{
              weight: 100,
              selected: true,
              analyticsKey: 'testAnalyticsKey',
              schema: [{ function: 'adUnitCode', args: [] }],
              rules: [{
                conditions: ['adUnit-0000'],
                results: [{
                  function: 'includeBidders',
                  args: [{
                    bidders: ['bidder1'],
                    analyticsValue: 'included'
                  }]
                }]
              }]
            }]
          }]
        };

        sandbox.stub(Math, 'random').returns(0.5);

        const bidder1Params = activityParams(MODULE_TYPE_BIDDER, 'bidder1', {
          adUnit: { code: 'adUnit-0000' },
          auctionId: 'test-auction-id'
        });

        const bidder2Params = activityParams(MODULE_TYPE_BIDDER, 'bidder2', {
          adUnit: { code: 'adUnit-0000' },
          auctionId: 'test-auction-id'
        });

        expect(isActivityAllowed(activity, bidder1Params)).to.be.true;
        expect(isActivityAllowed(activity, bidder2Params)).to.be.true;

        rulesModule.evaluateConfig(rulesJson, 'test-auction-id');

        expect(isActivityAllowed(activity, bidder1Params)).to.be.true;
        expect(isActivityAllowed(activity, bidder2Params)).to.be.false;
      });
    });

    it('should execute default rules when provided and no rules match', function() {
      const setLabelsStub = sandbox.stub(analyticsAdapter, 'setLabels');
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
            schema: [{
              function: 'percent',
              args: [5]
            }],
            default: [{
              function: 'logAtag',
              args: { analyticsValue: 'default-allow' }
            }],
            rules: [{
              conditions: ['true'],
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
      const auctionId = 'test-auction-id';
      rulesModule.evaluateConfig(rulesJson, auctionId);

      const bidder1Params = activityParams(MODULE_TYPE_BIDDER, 'bidder1', {
        auctionId
      });

      expect(isActivityAllowed(ACTIVITY_FETCH_BIDS, bidder1Params)).to.be.true;

      expect(setLabelsStub.calledWith({ [auctionId + '-testAnalyticsKey']: 'default-allow' })).to.be.true;

      setLabelsStub.resetHistory();
    });
  });

  describe('getGlobalRandom', function() {
    it('should return the same value for the same auctionId and call Math.random only once', function() {
      const auctionId = 'test-auction-id';
      const otherAuctionId = 'other-auction-id';
      const mathRandomStub = sandbox.stub(Math, 'random').returns(0.42);
      const auction1 = {auctionId: auctionId};
      const auction2 = {auctionId: otherAuctionId};
      const auctions = {
        [auctionId]: auction1,
        [otherAuctionId]: auction2
      }

      const index = {
        getAuction: ({auctionId}) => auctions[auctionId]
      }

      const result1 = rulesModule.dep.getGlobalRandom(auctionId, index);
      const result2 = rulesModule.dep.getGlobalRandom(auctionId, index);
      const result3 = rulesModule.dep.getGlobalRandom(auctionId, index);

      expect(result1).to.equal(0.42);
      expect(result2).to.equal(0.42);
      expect(result3).to.equal(0.42);
      expect(mathRandomStub.calledOnce).to.equal(true);

      mathRandomStub.returns(0.99);
      const result4 = rulesModule.dep.getGlobalRandom(otherAuctionId, index);

      expect(result4).to.equal(0.99);
      expect(mathRandomStub.calledTwice).to.equal(true);
    });
  });

  describe('evaluateSchema', function() {
    it('should evaluate percent condition', function() {
      sandbox.stub(rulesModule.dep, 'getGlobalRandom').returns(0.3);
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
      const func = rulesModule.evaluateSchema('adUnitCode', [], context);
      expect(func()).to.equal('div-1');

      const func2 = rulesModule.evaluateSchema('adUnitCode', [], context);
      expect(func2()).to.equal('div-1');
    });

    it('should evaluate adUnitCodeIn condition', function() {
      const context = {
        adUnit: {
          code: 'div-1'
        }
      };
      const func = rulesModule.evaluateSchema('adUnitCodeIn', [['div-1', 'div-2']], context);
      expect(func()).to.be.true;

      const func2 = rulesModule.evaluateSchema('adUnitCodeIn', [['div-3', 'div-4']], context);
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
      const func = rulesModule.evaluateSchema('deviceCountry', [], context);
      expect(func()).to.equal('US');

      const func2 = rulesModule.evaluateSchema('deviceCountry', [], context);
      expect(func2()).to.equal('US');
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
      const func = rulesModule.evaluateSchema('deviceCountryIn', [['US', 'UK']], context);
      expect(func()).to.be.true;

      const func2 = rulesModule.evaluateSchema('deviceCountryIn', [['DE', 'FR']], context);
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
        ortb2: {
          regs: {
            gpp_sid: [1, 2, 3]
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('gppSidIn', [[2]], context1);
      expect(func1()).to.be.true;

      const func2 = rulesModule.evaluateSchema('gppSidIn', [[4]], context1);
      expect(func2()).to.be.false;
    });

    it('should evaluate tcfInScope condition', function() {
      const context1 = {
        ortb2: {
          regs: {
            ext: {
              gdpr: 1
            }
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

    it('should evaluate domain condition', function() {
      const context1 = {
        ortb2: {
          site: {
            domain: 'example.com'
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('domain', [], context1);
      expect(func1()).to.equal('example.com');

      const context2 = {
        ortb2: {
          app: {
            domain: 'app.example.com'
          }
        }
      };
      const func2 = rulesModule.evaluateSchema('domain', [], context2);
      expect(func2()).to.equal('app.example.com');

      const context3 = {
        ortb2: {}
      };
      const func3 = rulesModule.evaluateSchema('domain', [], context3);
      expect(func3()).to.equal('');
    });

    it('should evaluate domainIn condition', function() {
      const context1 = {
        ortb2: {
          site: {
            domain: 'example.com'
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('domainIn', [['example.com', 'test.com']], context1);
      expect(func1()).to.be.true;

      const context2 = {
        ortb2: {
          app: {
            domain: 'app.example.com'
          }
        }
      };
      const func2 = rulesModule.evaluateSchema('domainIn', [['app.example.com']], context2);
      expect(func2()).to.be.true;

      const func3 = rulesModule.evaluateSchema('domainIn', [['other.com']], context1);
      expect(func3()).to.be.false;
    });

    it('should evaluate bundle condition', function() {
      const context1 = {
        ortb2: {
          app: {
            bundle: 'com.example.app'
          }
        }
      };
      const func1 = rulesModule.evaluateSchema('bundle', [], context1);
      expect(func1()).to.equal('com.example.app');

      const context2 = {
        ortb2: {}
      };
      const func2 = rulesModule.evaluateSchema('bundle', [], context2);
      expect(func2()).to.equal('');
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

      const func2 = rulesModule.evaluateSchema('bundleIn', [['com.other.app']], context1);
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
      const func1 = rulesModule.evaluateSchema('mediaTypeIn', [['banner']], context1);
      expect(func1()).to.be.true;

      const func2 = rulesModule.evaluateSchema('mediaTypeIn', [['native']], context1);
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
      const func1 = rulesModule.evaluateSchema('deviceTypeIn', [[2, 3]], context1);
      expect(func1()).to.be.true;

      const func2 = rulesModule.evaluateSchema('deviceTypeIn', [[4, 5]], context1);
      expect(func2()).to.be.false;
    });

    it('should evaluate bidPrice condition', function() {
      const context1 = {
        bid: {
          cpm: 5.50,
          currency: 'USD'
        }
      };
      const func1 = rulesModule.evaluateSchema('bidPrice', ['gt', 'USD', 5.0], context1);
      expect(func1()).to.be.true;

      const func2 = rulesModule.evaluateSchema('bidPrice', ['gt', 'USD', 6.0], context1);
      expect(func2()).to.be.false;

      const func3 = rulesModule.evaluateSchema('bidPrice', ['lte', 'USD', 6.0], context1);
      expect(func3()).to.be.true;

      const context3 = {
        bid: {
          cpm: 0,
          currency: 'USD'
        }
      };
      const func4 = rulesModule.evaluateSchema('bidPrice', ['gt', 'USD', 1.0], context3);
      expect(func4()).to.be.false;
    });

    it('should return null function for unknown schema function', function() {
      const func = rulesModule.evaluateSchema('unknownFunction', [], {});
      expect(func()).to.be.null;
    });

    describe('extraSchemaEvaluators', function() {
      it('should use custom browser evaluator from extraSchemaEvaluators', function() {
        const browserEvaluator = (args, context) => {
          return () => {
            const userAgent = context.ortb2?.device?.ua || navigator.userAgent;
            if (userAgent.includes('Chrome')) return 'Chrome';
            if (userAgent.includes('Firefox')) return 'Firefox';
            if (userAgent.includes('Safari')) return 'Safari';
            if (userAgent.includes('Edge')) return 'Edge';
            return 'Unknown';
          };
        };

        config.setConfig({
          shapingRules: {
            extraSchemaEvaluators: {
              browser: browserEvaluator
            }
          }
        });

        const context1 = {
          ortb2: {
            device: {
              ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'
            }
          }
        };

        const func1 = rulesModule.evaluateSchema('browser', [], context1);
        expect(func1()).to.equal('Chrome');

        const context2 = {
          ortb2: {
            device: {
              ua: 'Mozilla/5.0 Firefox/121.0.0'
            }
          }
        };
        const func2 = rulesModule.evaluateSchema('browser', [], context2);
        expect(func2()).to.equal('Firefox');
      });
    });
  });
});
