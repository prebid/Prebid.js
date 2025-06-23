import {config} from '../src/config.js';
import {metadata} from '../libraries/metadata/metadata.js';
import {
  ACTIVITY_PARAM_COMPONENT_NAME,
  ACTIVITY_PARAM_COMPONENT_TYPE,
  ACTIVITY_PARAM_STORAGE_KEY,
  ACTIVITY_PARAM_STORAGE_TYPE
} from '../src/activities/params.js';
import {STORAGE_TYPE_COOKIES, STORAGE_TYPE_LOCALSTORAGE} from '../src/storageManager.js';
import {logWarn} from '../src/utils.js';
import {registerActivityControl} from '../src/activities/rules.js';
import {ACTIVITY_ACCESS_DEVICE} from '../src/activities/activities.js';

export const ENFORCE_STRICT = 'strict';
export const ENFORCE_ALIAS = 'allowAliases';
export const ENFORCE_OFF = 'off';

let enforcement;

function escapeRegExp(string) {
  return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

function matches(params, disclosure) {
  if (
    (disclosure.type === 'cookie' && params[ACTIVITY_PARAM_STORAGE_TYPE] !== STORAGE_TYPE_COOKIES) ||
    (disclosure.type === 'web' && params[ACTIVITY_PARAM_STORAGE_TYPE] !== STORAGE_TYPE_LOCALSTORAGE)
  ) return false;
  const pattern = new RegExp(`^${disclosure.identifier.split('*').map(escapeRegExp).join('.*?')}$`);
  return pattern.test(params[ACTIVITY_PARAM_STORAGE_KEY]);
}

export function getDisclosures(params, meta = metadata) {
  const matchingDisclosures = [];
  const disclosureURLs = {};
  const data = meta.getMetadata(params[ACTIVITY_PARAM_COMPONENT_TYPE], params[ACTIVITY_PARAM_COMPONENT_NAME]);
  if (data) {
    disclosureURLs[params[ACTIVITY_PARAM_COMPONENT_NAME]] = data.disclosureURL;
    if (data.aliasOf) {
      const parent = meta.getMetadata(params[ACTIVITY_PARAM_COMPONENT_TYPE], data.aliasOf);
      if (parent) {
        disclosureURLs[data.aliasOf] = parent.disclosureURL;
      }
    }
    Object.entries(disclosureURLs).forEach(([componentName, disclosureURL]) => {
      meta.getStorageDisclosure(disclosureURL)
        ?.filter(disclosure => matches(params, disclosure))
        ?.forEach(disclosure => {
          matchingDisclosures.push({
            [ACTIVITY_PARAM_COMPONENT_NAME]: componentName,
            disclosureURL,
            disclosure
          })
        })
    })
  }
  return {
    matches: matchingDisclosures,
    disclosureURLs
  };
}

export function checkDisclosure(params, getMatchingDisclosures = getDisclosures) {
  let disclosed = false;
  let parent = false;
  let reason = null;
  const key = params[ACTIVITY_PARAM_STORAGE_KEY]
  if (key) {
    const {disclosureURLs, matches} = getMatchingDisclosures(params);
    const moduleName = params[ACTIVITY_PARAM_COMPONENT_NAME]
    for (const {componentName} of matches) {
      if (componentName === moduleName) {
        disclosed = true;
      } else {
        parent = true;
        reason = `Storage key "${key}" is disclosed by module "${componentName}", but not by "${moduleName}" itself (the latter is an alias of the former)`
      }
      if (disclosed || parent) break;
    }
    if (!disclosed && !parent) {
      reason = `Storage key "${key}" (for ${params[ACTIVITY_PARAM_STORAGE_TYPE]} storage) is not disclosed by "${moduleName}"`
      if (disclosureURLs[moduleName]) {
        reason += ` @ ${disclosureURLs[moduleName]}`
      } else {
        reason += ` - no disclosure URL was provided, or it could not be retrieved`
      }
    }
  } else {
    disclosed = null;
  }
  return {
    disclosed, parent, reason
  }
}

export function storageControlRule(getEnforcement = () => enforcement, check = checkDisclosure) {
  return function (params) {
    const {disclosed, parent, reason} = check(params);
    if (disclosed === null) return;
    if (!disclosed) {
      const enforcement = getEnforcement();
      if (enforcement === ENFORCE_STRICT || (enforcement === ENFORCE_ALIAS && !parent)) return {allow: false, reason};
      if (reason) {
        logWarn('storageControl:', reason);
      }
    }
  }
}

registerActivityControl(ACTIVITY_ACCESS_DEVICE, 'storageControl', storageControlRule());

config.getConfig('storageControl', (cfg) => {
  enforcement = cfg?.storageControl?.enforcement ?? ENFORCE_OFF;
})
