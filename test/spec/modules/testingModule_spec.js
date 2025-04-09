import { expect } from "chai";
import { getCalculatedSubmodules, getStoredTestConfig, init, reset, storeSplitsMethod, storeTestConfig, suppressionMethod } from "../../../modules/testingModule";
import {server} from 'test/mocks/xhr.js';
import { config } from "../../../src/config"
import { isInteger } from "../../../src/utils";
import { ACTIVITY_ACCESS_USER_IDS, ACTIVITY_ENRICH_EIDS } from "../../../src/activities/activities";
import { isActivityAllowed } from "../../../src/activities/rules";
import { activityParams } from "../../../src/activities/activityParams";
import { MODULE_TYPE_UID } from "../../../src/activities/modules";
import { disableAjaxForAnalytics, enableAjaxForAnalytics } from "../../mocks/analyticsStub";
import AnalyticsAdapter, { setLabels } from "../../../libraries/analyticsAdapter/AnalyticsAdapter";
import { EVENTS } from "../../../src/constants";
import { getCoreStorageManager } from "../../../src/storageManager";

describe('testingModule', () => {

  beforeEach(() => {
    config.resetConfig();
    reset();
  })
  
  it('should properly split traffic basing on percentage', () => {
    const TEST_SAMPLE_SIZE = 10000;
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
    config.setConfig({ testingModule: {
        modules: modulesConfig
    }});

    init();

    const results = [];
    for (let i = 0; i < TEST_SAMPLE_SIZE; i++) {
        results.push(getCalculatedSubmodules());
    }
    modulesConfig.forEach((idSystem) => {
        const passedIdSystemsCount = results.filter((execution) => {
            const item = execution.find(({name}) => idSystem.name === name)
            return item?.isAllowed
        }).length
        const marginOfError = Number(Math.abs(passedIdSystemsCount / TEST_SAMPLE_SIZE - idSystem.percentage).toFixed(2));
        expect(marginOfError).to.be.at.most(isInteger(idSystem.percentage) ? 0 : MARGIN_OF_ERROR);
    });

    mathRandomStub.restore();
  });
  
  describe('should register activities based on suppression param', () => {
    Object.entries({
      [suppressionMethod.EIDS]: ACTIVITY_ACCESS_USER_IDS,
      [suppressionMethod.SUBMODULES]: ACTIVITY_ENRICH_EIDS
    }).forEach(([method, activityName]) => {
      it(activityName, () => {					
        config.setConfig({ testingModule: {
          suppression: method,
          modules: [
            { name: 'idSystem', percentage: 0 }
          ]
        }});
        init();
        expect(isActivityAllowed(activityName, activityParams(MODULE_TYPE_UID, 'idSystem', {}))).to.eql(false);
      });

      it(activityName, () => {					
        config.setConfig({ testingModule: {
          suppression: method,
          modules: [
            { name: 'idSystem', percentage: 1 }
          ]
        }});
        init();
        expect(isActivityAllowed(activityName, activityParams(MODULE_TYPE_UID, 'idSystem', {}))).to.eql(true);
      });
    });
  });

  describe('config storing', () => {
    const TEST_RUN_ID = 'AB1';
    const previousConfig = [{ name: 'idSystem', percentage: 0.5 }];

    it('should overwrite stored config if differs from old one', () => {
      const TEST_RUN_ID = 'AB1';
      const fakeStorageManager = {
        sessionStorageIsEnabled: () => true,
        getDataFromSessionStorage: sinon.stub().returns(JSON.stringify(previousConfig)),
        setDataInSessionStorage: sinon.stub()
      };			
      config.setConfig({ testingModule: {
        testRun: TEST_RUN_ID,
        storeSplits: storeSplitsMethod.SESSION,
        modules: [
          { name: 'idSystem', percentage: 1 }
        ]
      }});

      init(fakeStorageManager);

      sinon.assert.calledOnce(fakeStorageManager.setDataInSessionStorage);
    });

    it('should not store the config if has not changed', () => {
      const fakeStorageManager = {
        sessionStorageIsEnabled: () => true,
        getDataFromSessionStorage: sinon.stub().returns(JSON.stringify(previousConfig)),
        setDataInSessionStorage: sinon.stub()
      };			
      config.setConfig({ testingModule: {
        testRun: TEST_RUN_ID,
        storeSplits: storeSplitsMethod.SESSION,
        modules: previousConfig
      }});
      
      init(fakeStorageManager);

      sinon.assert.notCalled(fakeStorageManager.setDataInSessionStorage);
    });
    it('should attach module config to analytics labels', () => {
      const TEST_RUN_ID = 'AB1';
      enableAjaxForAnalytics();
      const adapter = new AnalyticsAdapter({
        url: 'https://localhost:9999/endpoint',
        analyticsType: 'endpoint'
      });
      config.setConfig({ testingModule: {
        modules: previousConfig,
        testRun: TEST_RUN_ID,
        storeSplits: storeSplitsMethod.SESSION
      }});
      const eventType = EVENTS.BID_WON; ;
      adapter.track({eventType});
      
      init();
      const result = JSON.parse(server.requests[0].requestBody);

      sinon.assert.match(result, {labels: {[TEST_RUN_ID]: previousConfig}, eventType});
      disableAjaxForAnalytics();
      setLabels({});
    });

    describe('getStoredTestConfig', () => {
      const { PAGE, LIFE_OF_USER, SESSION } = storeSplitsMethod;
      const TEST_RUN_ID = 'ExperimentA';
      const stringifiedConfig = JSON.stringify(previousConfig);

      Object.entries({ 
        [PAGE]: localStorage,
        [SESSION]: sessionStorage,
        [LIFE_OF_USER]: {
          setItem: (key, value) => {
            document.cookie = `${key}=${value}`;
          },
          removeItem: () => { document.cookie = ''; }
        }
      }).forEach(([method, storage]) => {
        it('should get stored config for ' + method, () => {
          storage.setItem(TEST_RUN_ID, stringifiedConfig);
          const result = getStoredTestConfig(TEST_RUN_ID, method, getCoreStorageManager('testingModule'));
          expect(result).to.deep.eql(previousConfig);
          storage.removeItem(TEST_RUN_ID);
        });
      });
    });

    describe('storeTestConfig', () => {
      const { PAGE, LIFE_OF_USER, SESSION } = storeSplitsMethod;
      const TEST_RUN_ID = 'ExperimentA';

      Object.entries({ 
        [PAGE]: localStorage,
        [SESSION]: sessionStorage,
        [LIFE_OF_USER]: {
          getItem: (name) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
          },
          removeItem: () => { document.cookie = ''; }
        }
      }).forEach(([method, storage]) => {
        it('should store test config for ' + method, () => {
          storeTestConfig(TEST_RUN_ID, previousConfig, method, getCoreStorageManager('testingModule'));
          const result = JSON.parse(storage.getItem(TEST_RUN_ID));
          expect(result).to.deep.eql(previousConfig);
          storage.removeItem(TEST_RUN_ID);
        });
      });
    });
  });
});
