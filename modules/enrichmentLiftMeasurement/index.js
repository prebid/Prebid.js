import { setLabels as setAnalyticLabels } from "../../libraries/analyticsAdapter/AnalyticsAdapter.js";
import { ACTIVITY_ENRICH_EIDS } from "../../src/activities/activities.js";
import { MODULE_TYPE_ANALYTICS, MODULE_TYPE_UID } from "../../src/activities/modules.js";
import { ACTIVITY_PARAM_COMPONENT_NAME, ACTIVITY_PARAM_COMPONENT_TYPE } from "../../src/activities/params.js";
import { registerActivityControl } from "../../src/activities/rules.js";
import { config } from "../../src/config.js";
import { GDPR_GVLIDS, VENDORLESS_GVLID } from "../../src/consentHandler.js";
import { getStorageManager } from "../../src/storageManager.js";
import { deepEqual, logError, logInfo } from "../../src/utils.js";

const MODULE_NAME = 'enrichmentLiftMeasurement';
const MODULE_TYPE = MODULE_TYPE_ANALYTICS;
export const STORAGE_KEY = `${MODULE_NAME}Config`;

export const suppressionMethod = {
  SUBMODULES: 'submodules',
  EIDS: 'eids'
};

export const storeSplitsMethod = {
  MEMORY: 'memory',
  SESSION_STORAGE: 'sessionStorage',
  LOCAL_STORAGE: 'localStorage'
};

let moduleConfig;
let rules = [];

export function init(storageManager = getStorageManager({ moduleType: MODULE_TYPE, moduleName: MODULE_NAME })) {
  moduleConfig = config.getConfig(MODULE_NAME) || {};
  const {suppression, testRun, storeSplits} = moduleConfig;
  let modules;

  if (testRun && storeSplits && storeSplits !== storeSplitsMethod.MEMORY) {
    const testConfig = getStoredTestConfig(storeSplits, storageManager);
    if (!testConfig || !compareConfigs(testConfig, moduleConfig)) {
      modules = internals.getCalculatedSubmodules();
      storeTestConfig(testRun, modules, storeSplits, storageManager);
    } else {
      modules = testConfig.modules
    }
  }

  modules = modules ?? internals.getCalculatedSubmodules();

  const bannedModules = new Set(modules.filter(({enabled}) => !enabled).map(({name}) => name));
  if (bannedModules.size) {
    const init = suppression === suppressionMethod.SUBMODULES;
    rules.push(registerActivityControl(ACTIVITY_ENRICH_EIDS, MODULE_NAME, userIdSystemBlockRule(bannedModules, init)));
  }

  if (testRun) {
    setAnalyticLabels({[testRun]: modules});
  }
}

export function reset() {
  rules.forEach(unregister => unregister());
  setAnalyticLabels({});
  rules = [];
}

export function compareConfigs(old, current) {
  const {modules: newModules, testRun: newTestRun} = current;
  const {modules: oldModules, testRun: oldTestRun} = old;

  const getModulesObject = (modules) => modules.reduce((acc, curr) => ({...acc, [curr.name]: curr.percentage}), {});

  const percentageEqual = deepEqual(
    getModulesObject(oldModules),
    getModulesObject(newModules)
  );

  const testRunEqual = newTestRun === oldTestRun;
  return percentageEqual && testRunEqual;
}

function userIdSystemBlockRule(bannedModules, init) {
  return (params) => {
    if ((params.init ?? true) === init && params[ACTIVITY_PARAM_COMPONENT_TYPE] === MODULE_TYPE_UID && bannedModules.has(params[ACTIVITY_PARAM_COMPONENT_NAME])) {
      return {allow: false, reason: 'disabled due to AB testing'};
    }
  }
};

export function getCalculatedSubmodules(modules = moduleConfig.modules) {
  return (modules || [])
    .map(({name, percentage}) => {
      const enabled = Math.random() < percentage;
      return {name, percentage, enabled}
    });
};

export function getStoredTestConfig(storeSplits, storageManager) {
  const [checkMethod, getMethod] = {
    [storeSplitsMethod.SESSION_STORAGE]: [storageManager.sessionStorageIsEnabled, storageManager.getDataFromSessionStorage],
    [storeSplitsMethod.LOCAL_STORAGE]: [storageManager.localStorageIsEnabled, storageManager.getDataFromLocalStorage],
  }[storeSplits];

  if (!checkMethod()) {
    logError(`${MODULE_NAME} Unable to save testing module config - storage is not enabled`);
    return null;
  }

  try {
    return JSON.parse(getMethod(STORAGE_KEY));
  } catch {
    return null;
  }
};

export function storeTestConfig(testRun, modules, storeSplits, storageManager) {
  const [checkMethod, storeMethod] = {
    [storeSplitsMethod.SESSION_STORAGE]: [storageManager.sessionStorageIsEnabled, storageManager.setDataInSessionStorage],
    [storeSplitsMethod.LOCAL_STORAGE]: [storageManager.localStorageIsEnabled, storageManager.setDataInLocalStorage],
  }[storeSplits];

  if (!checkMethod()) {
    logError(`${MODULE_NAME} Unable to save testing module config - storage is not enabled`);
    return;
  }

  const configToStore = {testRun, modules};
  storeMethod(STORAGE_KEY, JSON.stringify(configToStore));
  logInfo(`${MODULE_NAME}: AB test config successfully saved to ${storeSplits} storage`);
};

export const internals = {
  getCalculatedSubmodules
}

GDPR_GVLIDS.register(MODULE_TYPE, MODULE_NAME, VENDORLESS_GVLID);

init();
