import { expect } from "chai";
import { getCalculatedSubmodules, internals, init, reset, storeSplitsMethod, storeTestConfig, suppressionMethod, getStoredTestConfig } from "../../../modules/idTestingModule";
import {server} from 'test/mocks/xhr.js';
import { config } from "../../../src/config"
import { isInteger } from "../../../src/utils";
import { ACTIVITY_ENRICH_EIDS } from "../../../src/activities/activities";
import { isActivityAllowed } from "../../../src/activities/rules";
import { activityParams } from "../../../src/activities/activityParams";
import { MODULE_TYPE_UID } from "../../../src/activities/modules";
import { disableAjaxForAnalytics, enableAjaxForAnalytics } from "../../mocks/analyticsStub";
import AnalyticsAdapter from "../../../libraries/analyticsAdapter/AnalyticsAdapter";
import { EVENTS } from "../../../src/constants";
import { getCoreStorageManager } from "../../../src/storageManager";

describe('idTestingModule', () => {
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
    config.setConfig({ idTestingModule: {
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
        config.setConfig({ idTestingModule: {
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

    const previousConfig = [
      { name: 'idSystem', percentage: 0.5, enabled: true },
      { name: 'idSystem2', percentage: 0.5, enabled: false },
    ];

    beforeEach(() => {
      getCalculatedSubmodulesStub = sinon.stub(internals, 'getCalculatedSubmodules');
      config.setConfig({ idTestingModule: {
        testRun: TEST_RUN_ID,
        storeSplits: storeSplitsMethod.SESSION,
        modules: [
          { name: 'idSystem', percentage: 1 }
        ]
      }});
    });

    afterEach(() => {
      getCalculatedSubmodulesStub.restore();
    })

    it('should get config from storage if present', () => {
      const currentConfig = [
        { name: 'idSystem', percentage: 1 }
      ]
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
      const stubCalculation = previousConfig.map(module => ({...module, percentage: 0.1}));
      getCalculatedSubmodulesStub.returns(stubCalculation);
      const fakeStorageManager = {
        sessionStorageIsEnabled: () => true,
        getDataFromSessionStorage: sinon.stub().returns(null),
        setDataInSessionStorage: sinon.stub()
      };			
      init(fakeStorageManager);
      sinon.assert.calledOnce(fakeStorageManager.setDataInSessionStorage);
      sinon.assert.calledOnce(getCalculatedSubmodulesStub);
      expect(fakeStorageManager.setDataInSessionStorage.getCall(0).args[1]).to.deep.eql(JSON.stringify(stubCalculation));
    });

    it('should update config if present is different', () => {
      const stubCalculation = previousConfig.map(module => ({...module, percentage: 0.1}));
      getCalculatedSubmodulesStub.returns(stubCalculation);
      const newConfig = previousConfig.map(module => ({...module, percentage: 0.1}));
      const fakeStorageManager = {
        sessionStorageIsEnabled: () => true,
        getDataFromSessionStorage: sinon.stub().returns(JSON.stringify(previousConfig)),
        setDataInSessionStorage: sinon.stub()
      };
      config.setConfig({ idTestingModule: {
        testRun: TEST_RUN_ID,
        storeSplits: storeSplitsMethod.SESSION,
        modules: newConfig
      }});
      
      init(fakeStorageManager);

      sinon.assert.calledOnce(fakeStorageManager.setDataInSessionStorage);
      sinon.assert.calledOnce(getCalculatedSubmodulesStub);
    });

    it('should attach module config to analytics labels', () => {
      getCalculatedSubmodulesStub.returns(previousConfig);
      const TEST_RUN_ID = 'AB1';
      enableAjaxForAnalytics();
      const adapter = new AnalyticsAdapter({
        url: 'https://localhost:9999/endpoint',
        analyticsType: 'endpoint'
      });
      config.setConfig({ idTestingModule: {
        modules: previousConfig,
        testRun: TEST_RUN_ID,
        storeSplits: storeSplitsMethod.PAGE
      }});
      
      init();

      const eventType = EVENTS.BID_WON;
      adapter.track({eventType});

      const result = JSON.parse(server.requests[0].requestBody);

      sinon.assert.match(result, {labels: {[TEST_RUN_ID]: previousConfig}, eventType});
      disableAjaxForAnalytics();
    });

    describe('getStoredTestConfig', () => {
      const { LIFE_OF_USER, SESSION } = storeSplitsMethod;
      const TEST_RUN_ID = 'ExperimentA';
      const stringifiedConfig = JSON.stringify(previousConfig);

      Object.entries({ 
        [LIFE_OF_USER]: localStorage,
        [SESSION]: sessionStorage,
      }).forEach(([method, storage]) => {
        it('should get stored config for ' + method, () => {
          storage.setItem(TEST_RUN_ID, stringifiedConfig);
          const result = getStoredTestConfig(TEST_RUN_ID, method, getCoreStorageManager('idTestingModule'));
          expect(result).to.deep.eql(previousConfig);
          storage.removeItem(TEST_RUN_ID);
        });
      });
    });

    describe('storeTestConfig', () => {
      const { LIFE_OF_USER, SESSION } = storeSplitsMethod;
      const TEST_RUN_ID = 'ExperimentA';

      Object.entries({ 
        [LIFE_OF_USER]: localStorage,
        [SESSION]: sessionStorage,
      }).forEach(([method, storage]) => {
        it('should store test config for ' + method, () => {
          storeTestConfig(TEST_RUN_ID, previousConfig, method, getCoreStorageManager('idTestingModule'));
          const result = JSON.parse(storage.getItem(TEST_RUN_ID));
          expect(result).to.deep.eql(previousConfig);
          storage.removeItem(TEST_RUN_ID);
        });
      });
    });
  });
});
