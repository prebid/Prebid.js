import { expect } from "chai";
import { getCalculatedSubmodules, internals, init, reset, storeSplitsMethod, storeTestConfig, suppressionMethod, getStoredTestConfig, compareConfigs, STORAGE_KEY } from "../../../modules/enrichmentLiftMeasurement/index.js";
import {server} from 'test/mocks/xhr.js';
import { config } from "../../../src/config.js"
import { isInteger } from "../../../src/utils.js";
import { ACTIVITY_ENRICH_EIDS } from "../../../src/activities/activities.js";
import { isActivityAllowed } from "../../../src/activities/rules.js";
import { activityParams } from "../../../src/activities/activityParams.js";
import { MODULE_TYPE_UID } from "../../../src/activities/modules.js";
import { disableAjaxForAnalytics, enableAjaxForAnalytics } from "../../mocks/analyticsStub.js";
import AnalyticsAdapter from "../../../libraries/analyticsAdapter/AnalyticsAdapter.js";
import { EVENTS } from "../../../src/constants.js";
import { getCoreStorageManager } from "../../../src/storageManager.js";

describe('enrichmentLiftMeasurement', () => {
  beforeEach(() => {
    config.resetConfig();
    reset();
  })

  it('should properly split traffic basing on percentage', () => {
    const TEST_SAMPLE_SIZE = 1000;
    const MARGIN_OF_ERROR = 0.05;
    const modulesConfig = [
      { name: 'idSystem1', percentage: 0.8 },
      { name: 'idSystem2', percentage: 0.5 },
      { name: 'idSystem3', percentage: 0.2 },
      { name: 'idSystem4', percentage: 1 },
      { name: 'idSystem5', percentage: 0 },
    ];
    const TOTAL_RANDOM_CALLS = TEST_SAMPLE_SIZE * modulesConfig.length;
    const fixedRandoms = Array.from({ length: TOTAL_RANDOM_CALLS }, (_, i) => i / TOTAL_RANDOM_CALLS);
    let callIndex = 0;

    const mathRandomStub = sinon.stub(Math, 'random').callsFake(() => {
      return fixedRandoms[callIndex++];
    });
    config.setConfig({ enrichmentLiftMeasurement: {
      modules: modulesConfig
    }});

    const results = [];
    for (let i = 0; i < TEST_SAMPLE_SIZE; i++) {
      results.push(getCalculatedSubmodules(modulesConfig));
    }
    modulesConfig.forEach((idSystem) => {
      const passedIdSystemsCount = results.filter((execution) => {
        const item = execution.find(({name}) => idSystem.name === name)
        return item?.enabled
      }).length
      const marginOfError = Number(Math.abs(passedIdSystemsCount / TEST_SAMPLE_SIZE - idSystem.percentage).toFixed(2));
      expect(marginOfError).to.be.at.most(isInteger(idSystem.percentage) ? 0 : MARGIN_OF_ERROR);
    });

    mathRandomStub.restore();
  });

  describe('should register activity based on suppression param', () => {
    Object.entries({
      [suppressionMethod.EIDS]: false,
      [suppressionMethod.SUBMODULES]: true
    }).forEach(([method, value]) => {
      it(method, () => {
        config.setConfig({ enrichmentLiftMeasurement: {
          suppression: method,
          modules: [
            { name: 'idSystem', percentage: 0 }
          ]
        }});
        init();
        expect(isActivityAllowed(ACTIVITY_ENRICH_EIDS, activityParams(MODULE_TYPE_UID, 'idSystem', {init: false}))).to.eql(value);
      });
    });
  });

  describe('config storing', () => {
    const TEST_RUN_ID = 'AB1';
    let getCalculatedSubmodulesStub;

    const mockConfig = [
      { name: 'idSystem', percentage: 0.5, enabled: true },
      { name: 'idSystem2', percentage: 0.5, enabled: false },
    ];

    beforeEach(() => {
      getCalculatedSubmodulesStub = sinon.stub(internals, 'getCalculatedSubmodules');
      config.setConfig({ enrichmentLiftMeasurement: {
        testRun: TEST_RUN_ID,
        storeSplits: storeSplitsMethod.SESSION_STORAGE,
        modules: [
          { name: 'idSystem', percentage: 1 }
        ]
      }});
    });

    afterEach(() => {
      getCalculatedSubmodulesStub.restore();
    })

    it('should get config from storage if present', () => {
      const currentConfig = {
        testRun: TEST_RUN_ID,
        modules: [
          { name: 'idSystem', percentage: 1, enabled: true }
        ]
      };
      const fakeStorageManager = {
        sessionStorageIsEnabled: () => true,
        getDataFromSessionStorage: sinon.stub().returns(JSON.stringify(currentConfig)),
        setDataInSessionStorage: sinon.stub()
      };
      init(fakeStorageManager);
      sinon.assert.notCalled(fakeStorageManager.setDataInSessionStorage);
      sinon.assert.notCalled(getCalculatedSubmodulesStub);
    });

    it('should store config if not present', () => {
      const stubCalculation = mockConfig.map(module => ({...module, percentage: 0.1}));
      getCalculatedSubmodulesStub.returns(stubCalculation);
      const fakeStorageManager = {
        sessionStorageIsEnabled: () => true,
        getDataFromSessionStorage: sinon.stub().returns(null),
        setDataInSessionStorage: sinon.stub()
      };
      init(fakeStorageManager);
      sinon.assert.calledOnce(fakeStorageManager.setDataInSessionStorage);
      sinon.assert.calledOnce(getCalculatedSubmodulesStub);
      const expectedArg = {testRun: TEST_RUN_ID, modules: stubCalculation};
      expect(fakeStorageManager.setDataInSessionStorage.getCall(0).args[1]).to.deep.eql(JSON.stringify(expectedArg));
    });

    it('should update config if present is different', () => {
      const stubCalculation = mockConfig.map(module => ({...module, percentage: 0.1}));
      getCalculatedSubmodulesStub.returns(stubCalculation);
      const previousTestConfig = {
        modules: mockConfig,
        testRun: TEST_RUN_ID
      }
      const fakeStorageManager = {
        sessionStorageIsEnabled: () => true,
        getDataFromSessionStorage: sinon.stub().returns(JSON.stringify(previousTestConfig)),
        setDataInSessionStorage: sinon.stub()
      };
      config.setConfig({ enrichmentLiftMeasurement: {
        testRun: TEST_RUN_ID,
        storeSplits: storeSplitsMethod.SESSION_STORAGE,
        modules: mockConfig.map(module => ({...module, percentage: 0.1}))
      }});

      init(fakeStorageManager);

      sinon.assert.calledOnce(fakeStorageManager.setDataInSessionStorage);
      sinon.assert.calledOnce(getCalculatedSubmodulesStub);
    });

    it('should attach module config to analytics labels', () => {
      getCalculatedSubmodulesStub.returns(mockConfig);
      const TEST_RUN_ID = 'AB1';
      enableAjaxForAnalytics();
      const adapter = new AnalyticsAdapter({
        url: 'https://localhost:9999/endpoint',
        analyticsType: 'endpoint'
      });
      config.setConfig({ enrichmentLiftMeasurement: {
        modules: mockConfig,
        testRun: TEST_RUN_ID,
        storeSplits: storeSplitsMethod.PAGE
      }});

      init();

      const eventType = EVENTS.BID_WON;
      adapter.track({eventType});

      const result = JSON.parse(server.requests[0].requestBody);

      sinon.assert.match(result, {labels: {[TEST_RUN_ID]: mockConfig}, eventType});
      disableAjaxForAnalytics();
    });

    describe('getStoredTestConfig', () => {
      const { LOCAL_STORAGE, SESSION_STORAGE } = storeSplitsMethod;
      const TEST_RUN_ID = 'ExperimentA';
      const expectedResult = {
        modules: mockConfig,
        testRun: TEST_RUN_ID
      };
      const stringifiedConfig = JSON.stringify(expectedResult);

      Object.entries({
        [LOCAL_STORAGE]: localStorage,
        [SESSION_STORAGE]: sessionStorage,
      }).forEach(([method, storage]) => {
        it('should get stored config for ' + method, () => {
          storage.setItem(STORAGE_KEY, stringifiedConfig);
          const result = getStoredTestConfig(method, getCoreStorageManager('enrichmentLiftMeasurement'));
          expect(result).to.deep.eql(expectedResult);
          storage.removeItem(STORAGE_KEY);
        });
      });
    });

    describe('storeTestConfig', () => {
      const { LOCAL_STORAGE, SESSION_STORAGE } = storeSplitsMethod;
      const TEST_RUN_ID = 'ExperimentA';

      Object.entries({
        [LOCAL_STORAGE]: localStorage,
        [SESSION_STORAGE]: sessionStorage,
      }).forEach(([method, storage]) => {
        it('should store test config for ' + method, () => {
          const expected = {
            modules: mockConfig,
            testRun: TEST_RUN_ID
          };
          storeTestConfig(TEST_RUN_ID, mockConfig, method, getCoreStorageManager('enrichmentLiftMeasurement'));
          const result = JSON.parse(storage.getItem(STORAGE_KEY));
          expect(result).to.deep.eql(expected);
          storage.removeItem(STORAGE_KEY);
        });
      });
    });
  });

  describe('compareConfigs', () => {
    it('should return true for same config and test run identifier regardless of order', () => {
      const oldConfig = {
        testRun: 'AB1',
        modules: [
          {name: 'idSystem1', percentage: 1.0, enabled: true},
          {name: 'idSystem2', percentage: 0.3, enabled: false},
        ]
      }
      const newConfig = {
        testRun: 'AB1',
        modules: [
          {name: 'idSystem2', percentage: 0.3},
          {name: 'idSystem1', percentage: 1.0},
        ]
      }
      expect(compareConfigs(newConfig, oldConfig)).to.eql(true);
    });

    it('should return false for same config and different run identifier', () => {
      const oldConfig = {
        testRun: 'AB1',
        modules: [
          {name: 'idSystem1', percentage: 1.0, enabled: true},
          {name: 'idSystem2', percentage: 0.3, enabled: false},
        ]
      }
      const newConfig = {
        testRun: 'AB2',
        modules: [
          {name: 'idSystem2', percentage: 0.3},
          {name: 'idSystem1', percentage: 1.0},
        ]
      }
      expect(compareConfigs(newConfig, oldConfig)).to.eql(false);
    });
  });
});
