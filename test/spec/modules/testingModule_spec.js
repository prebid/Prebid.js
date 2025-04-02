import { expect } from "chai";
import { getCalculatedSubmodules, init, reset, suppressionMethod } from "../../../modules/testingModule";
import { config } from "../../../src/config"
import { isInteger } from "../../../src/utils";
import { ACTIVITY_ACCESS_USER_IDS, ACTIVITY_ENRICH_EIDS } from "../../../src/activities/activities";
import { isActivityAllowed, ruleRegistry } from "../../../src/activities/rules";
import { activityParams } from "../../../src/activities/activityParams";
import { MODULE_TYPE_UID } from "../../../src/activities/modules";

describe('testingModule', () => {
		const TEST_SAMPLE_SIZE = 10000;
		const MARGIN_OF_ERROR = 0.05;

		const modulesConfig = [
				{ name: 'idSystem1', percentage: 0.8 },
				{ name: 'idSystem2', percentage: 0.5 },
				{ name: 'idSystem3', percentage: 0.2 },
				{ name: 'idSystem4', percentage: 1 },
				{ name: 'idSystem5', percentage: 0 },
		];

		afterEach(() => {
			config.resetConfig();
			reset();
		})

		it('should properly split traffic basing on percentage', () => {
				config.setConfig({ testingModule: {
						modules: modulesConfig
				}})

				const results = [];

				for(let i = 0; i < TEST_SAMPLE_SIZE; i++) {            
						results.push(getCalculatedSubmodules())
				}
 
				modulesConfig.forEach((idSystem) => {
						const passedIdSystemsCount = results.filter((execution) => {
								const item = execution.find(({name}) => idSystem.name === name)
								return item?.isAllowed
						}).length
						const marginOfError = Number(Math.abs(passedIdSystemsCount / TEST_SAMPLE_SIZE - idSystem.percentage).toFixed(2));

						expect(marginOfError).to.be.at.most(isInteger(idSystem.percentage) ? 0 : MARGIN_OF_ERROR);
				});
		})

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
				})
			})
		})
})