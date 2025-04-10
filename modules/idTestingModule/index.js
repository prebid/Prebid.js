import { setLabels as setAnalyticLabels } from "../../libraries/analyticsAdapter/AnalyticsAdapter.js";
import { ACTIVITY_ENRICH_EIDS } from "../../src/activities/activities.js";
import { MODULE_TYPE_ANALYTICS, MODULE_TYPE_UID } from "../../src/activities/modules.js";
import { ACTIVITY_PARAM_COMPONENT_NAME, ACTIVITY_PARAM_COMPONENT_TYPE } from "../../src/activities/params.js";
import { registerActivityControl } from "../../src/activities/rules.js";
import { config } from "../../src/config.js";
import { VENDORLESS_GVLID, gvlidRegistry } from "../../src/consentHandler.js";
import { getStorageManager } from "../../src/storageManager.js";
import { deepEqual, logError, logInfo } from "../../src/utils.js";

const MODULE_NAME = 'idTestingModule';
const MODULE_TYPE = MODULE_TYPE_ANALYTICS;

export const suppressionMethod = {
  SUBMODULES: 'submodules',
  EIDS: 'eids'
};

export const storeSplitsMethod = {
  PAGE: 'page',
  SESSION: 'session',
  LIFE_OF_USER: 'lifeOfUser'
};

let moduleConfig;
let rules = [];

export function init(storageManager = getStorageManager({ moduleType: MODULE_TYPE, moduleName: MODULE_NAME })) {
  moduleConfig = config.getConfig(MODULE_NAME) || {};
  const {suppression, testRun, modules = [], storeSplits} = moduleConfig;
  let testConfig;

  if (testRun && storeSplits && storeSplits !== storeSplitsMethod.PAGE) {
    testConfig = getStoredTestConfig(testRun, storeSplits, storageManager);
    if (!testConfig || !compareConfigs(testConfig, modules)) {
      testConfig = internals.getCalculatedSubmodules();
      storeTestConfig(testRun, testConfig, storeSplits, storageManager);
    }
  }

  testConfig = testConfig ?? internals.getCalculatedSubmodules();

  const bannedModules = testConfig.filter(({enabled}) => !enabled);

  if (bannedModules.length) {
    const init = suppression === suppressionMethod.SUBMODULES;
    rules.push(registerActivityControl(ACTIVITY_ENRICH_EIDS, MODULE_NAME, userIdSystemBlockRule(bannedModules, init)));
  }

  if (testRun) {
    setAnalyticLabels({[testRun]: testConfig});
  }
}

export function reset() {
  rules.forEach(unregister => unregister());
  setAnalyticLabels({});
  rules = [];
}

function compareConfigs(old, current) {
  return deepEqual(old.map(({percentage}) => percentage), current.map(({percentage}) => percentage));
}

function userIdSystemBlockRule(bannedModules, init) {
  return (params) => {
    if (params.init === init && params[ACTIVITY_PARAM_COMPONENT_TYPE] === MODULE_TYPE_UID && bannedModules.find(({name}) => name === params[ACTIVITY_PARAM_COMPONENT_NAME])) {
      return {allow: false, reason: 'disabled due to AB testing'};
    }
  }
};

export function getCalculatedSubmodules() {
  const {modules = []} = moduleConfig;
  return modules
    .map(({name, percentage}) => {
      const enabled = Math.random() < percentage;
      return {name, percentage, enabled}
    });
};

export function getStoredTestConfig(testRunString, storeSplits, storageManager) {
  const [checkMethod, getMethod] = {
    [storeSplitsMethod.SESSION]: [storageManager.sessionStorageIsEnabled, storageManager.getDataFromSessionStorage],
    [storeSplitsMethod.LIFE_OF_USER]: [storageManager.localStorageIsEnabled, storageManager.getDataFromLocalStorage],
  }[storeSplits];

  if (!checkMethod()) {
    logError(`${MODULE_NAME} Unable to save testing module config - storage is not enabled`);
  }

  try {
    return JSON.parse(getMethod(testRunString));
  } catch {
    return null;
  }
};

export function storeTestConfig(testRunString, modules, storeSplits, storageManager) {
  const [checkMethod, storeMethod] = {
    [storeSplitsMethod.SESSION]: [storageManager.sessionStorageIsEnabled, storageManager.setDataInSessionStorage],
    [storeSplitsMethod.LIFE_OF_USER]: [storageManager.localStorageIsEnabled, storageManager.setDataInLocalStorage],
  }[storeSplits];

  if (!checkMethod()) {
    logError(`${MODULE_NAME} Unable to save testing module config - storage is not enabled`);
  }

  storeMethod(testRunString, JSON.stringify(modules));
  logInfo(`${MODULE_NAME}: AB test config successfully saved to ${storeSplits} storage`);
};

export const internals = {
  getCalculatedSubmodules
}

gvlidRegistry().register(MODULE_TYPE, MODULE_NAME, VENDORLESS_GVLID);

init();
