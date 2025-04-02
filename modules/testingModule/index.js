import { ACTIVITY_ACCESS_USER_IDS, ACTIVITY_ENRICH_EIDS, ACTIVITY_TRANSMIT_EIDS } from "../../src/activities/activities";
import { MODULE_TYPE_UID } from "../../src/activities/modules";
import { ACTIVITY_PARAM_COMPONENT_NAME } from "../../src/activities/params";
import { registerActivityControl } from "../../src/activities/rules";
import { config } from "../../src/config";

const MODULE_NAME = 'testingModule';
export const suppressionMethod = {
  SUBMODULES: 'submodules',
  EIDS: 'eids'
};

let moduleConfig;
let enabled = false;
let rules = [];
let bannedModules = [];

export function init() {
  config.getConfig(MODULE_NAME, (cfg) => {
    moduleConfig = cfg[MODULE_NAME];
    if (enabled && !moduleConfig) {
      reset();
    } else if (!enabled && moduleConfig) {
      enabled = true;
      const { suppression } = moduleConfig;
      const activityName = suppression === suppressionMethod.EIDS ? ACTIVITY_ACCESS_USER_IDS : ACTIVITY_ENRICH_EIDS;
      bannedModules = getCalculatedSubmodules()
        .filter(({isAllowed}) => !isAllowed);

      rules.push(registerActivityControl(activityName, 'testingModule', userIdSystemBlockRule()));
    }
  })
}

export function reset() {
  enabled = false;
  bannedModules = [];
  rules.forEach(unregister => unregister());
  rules = [];
}

function userIdSystemBlockRule() {
  return (params) => {
    if (params[ACTIVITY_PARAM_COMPONENT_TYPE] === MODULE_TYPE_UID && bannedModules.includes(params[ACTIVITY_PARAM_COMPONENT_NAME])) {
      return {allow: false, reason: 'disabled due to AB testing'};
    }
  }
}

export function getCalculatedSubmodules() {
  const { modules = [] } = moduleConfig;
  return modules
    .map(({name, percentage}) => {
      const isAllowed = Math.random() < percentage;
      return { name, percentage, isAllowed }
    });
};

init();