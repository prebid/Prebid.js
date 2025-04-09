import { setLabels as setAnalyticLabels } from "../../libraries/analyticsAdapter/AnalyticsAdapter.js";
import { ACTIVITY_ACCESS_USER_IDS, ACTIVITY_ENRICH_EIDS } from "../../src/activities/activities.js";
import { MODULE_TYPE_UID } from "../../src/activities/modules.js";
import { ACTIVITY_PARAM_COMPONENT_NAME, ACTIVITY_PARAM_COMPONENT_TYPE } from "../../src/activities/params.js";
import { registerActivityControl } from "../../src/activities/rules.js";
import { config } from "../../src/config.js";
import { getCoreStorageManager } from "../../src/storageManager.js";
import { deepEqual, logError, logInfo } from "../../src/utils.js";

const MODULE_NAME = 'testingModule';
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

export function init(storageManager = getCoreStorageManager('testingModule')) {
  moduleConfig = config.getConfig(MODULE_NAME) || {};
  const {suppression, testRun, modules = [], storeSplits} = moduleConfig;
  if (testRun && storeSplits) {
    setAnalyticLabels({[testRun]: modules});
    const previousConfig = getStoredTestConfig(testRun, storeSplits, storageManager);
    if (!previousConfig || !deepEqual(previousConfig, modules)) {
      storeTestConfig(testRun, modules, storeSplits, storageManager);
    }
  }

  const activityName = suppression === suppressionMethod.EIDS ? ACTIVITY_ACCESS_USER_IDS : ACTIVITY_ENRICH_EIDS;
  const bannedModules = getCalculatedSubmodules()
    .filter(({isAllowed}) => !isAllowed)

  if (bannedModules.length) {
    rules.push(registerActivityControl(activityName, 'testingModule', userIdSystemBlockRule(bannedModules)));
  }
}

export function reset() {
  rules.forEach(unregister => unregister());
  rules = [];
}

function userIdSystemBlockRule(bannedModules) {
  return (params) => {
    if (params[ACTIVITY_PARAM_COMPONENT_TYPE] === MODULE_TYPE_UID && bannedModules.find(({name}) => name === params[ACTIVITY_PARAM_COMPONENT_NAME])) {
      return {allow: false, reason: 'disabled due to AB testing'};
    }
  }
};

export function getCalculatedSubmodules() {
  const {modules = []} = moduleConfig;
  return modules
    .map(({name, percentage}) => {
      const isAllowed = Math.random() < percentage;
      return {name, percentage, isAllowed}
    });
};

export function getStoredTestConfig(testRunString, storeSplits, storageManager) {
  const [checkMethod, getMethod] = {
    [storeSplitsMethod.LIFE_OF_USER]: [storageManager.cookiesAreEnabled, storageManager.getCookie],
    [storeSplitsMethod.SESSION]: [storageManager.sessionStorageIsEnabled, storageManager.getDataFromSessionStorage],
    [storeSplitsMethod.PAGE]: [storageManager.localStorageIsEnabled, storageManager.getDataFromLocalStorage],
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
    [storeSplitsMethod.LIFE_OF_USER]: [storageManager.cookiesAreEnabled, storageManager.setCookie],
    [storeSplitsMethod.SESSION]: [storageManager.sessionStorageIsEnabled, storageManager.setDataInSessionStorage],
    [storeSplitsMethod.PAGE]: [storageManager.localStorageIsEnabled, storageManager.setDataInLocalStorage],
  }[storeSplits];

  if (!checkMethod()) {
    logError(`${MODULE_NAME} Unable to save testing module config - storage is not enabled`);
  }

  storeMethod(testRunString, JSON.stringify(modules));
  logInfo(`${MODULE_NAME}: AB test config successfully saved to ${storeSplits} storage`);
};

init();
