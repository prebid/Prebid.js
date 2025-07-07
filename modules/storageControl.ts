import {config} from '../src/config.js';
import {metadata} from '../libraries/metadata/metadata.js';
import {
    ACTIVITY_PARAM_COMPONENT,
    ACTIVITY_PARAM_COMPONENT_NAME,
    ACTIVITY_PARAM_COMPONENT_TYPE,
    ACTIVITY_PARAM_STORAGE_KEY,
    ACTIVITY_PARAM_STORAGE_TYPE
} from '../src/activities/params.js';
import {
    discloseStorageUse,
    STORAGE_TYPE_COOKIES,
    STORAGE_TYPE_LOCALSTORAGE,
    type StorageDisclosure as Disclosure
} from '../src/storageManager.js';
import {logWarn, uniques} from '../src/utils.js';
import {registerActivityControl} from '../src/activities/rules.js';
import {ACTIVITY_ACCESS_DEVICE} from '../src/activities/activities.js';
import {addApiMethod} from "../src/prebid.ts";
// @ts-expect-error the ts compiler is confused by build-time renaming of summary.mjs to summary.js, reassure it
// eslint-disable-next-line prebid/validate-imports
import {getStorageDisclosureSummary} from "../libraries/storageDisclosure/summary.js";
import {getGlobal} from "../src/prebidGlobal.ts";

export const ENFORCE_STRICT = 'strict';
export const ENFORCE_ALIAS = 'allowAliases';
export const ENFORCE_OFF = 'off';

let enforcement;

function escapeRegExp(string) {
  return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

function matches(params, disclosure) {
  if (
    !['cookie', 'web'].includes(disclosure.type) ||
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
  if (!data) return null;
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
  const component = params[ACTIVITY_PARAM_COMPONENT];
  if (key) {
    const disclosures = getMatchingDisclosures(params);
    if (disclosures == null) {
      reason = `Cannot determine if storage key "${key}" is disclosed by "${component}" because the necessary metadata is missing - was it included in the build?`
    } else {
      const {disclosureURLs, matches} = disclosures;
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
        reason = `Storage key "${key}" (for ${params[ACTIVITY_PARAM_STORAGE_TYPE]} storage) is not disclosed by "${component}"`
        if (disclosureURLs[moduleName]) {
          reason += ` @ ${disclosureURLs[moduleName]}`
        } else {
          reason += ` - no disclosure URL was provided, or it could not be retrieved`
        }
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

export type StorageControlConfig = {
    /**
     * - 'off': logs a warning when an undisclosed storage key is used
     * - 'strict': deny access to undisclosed storage keys
     * - 'allowAliases': deny access to undisclosed storage keys, unless the use is from an alias of a module that does
     *    disclose them
     */
    enforcement?: typeof ENFORCE_OFF | typeof ENFORCE_ALIAS | typeof ENFORCE_STRICT;
}

declare module '../src/config' {
    interface Config {
        storageControl: StorageControlConfig
    }
}

config.getConfig('storageControl', (cfg) => {
  enforcement = cfg?.storageControl?.enforcement ?? ENFORCE_OFF;
})

export function dynamicDisclosureCollector() {
    const disclosures = {};
    function mergeDisclosures(left, right) {
        const merged = {
            ...left,
            purposes: (left.purposes ?? []).concat(right.purposes ?? []).filter(uniques),
        };
        if (left.type === 'cookie') {
            if (left.maxAgeSeconds != null || right.maxAgeSeconds != null) {
                merged.maxAgeSeconds = (left.maxAgeSeconds ?? 0) > (right.maxAgeSeconds ?? 0) ? left.maxAgeSeconds : right.maxAgeSeconds;
            }
            if (left.cookieRefresh != null || right.cookieRefresh != null) {
                merged.cookieRefresh = left.cookieRefresh || right.cookieRefresh;
            }
        }
        return merged;
    }
    return {
        hook(next, moduleName, disclosure) {
            const key = `${disclosure.type}::${disclosure.identifier}`;
            if (!disclosures.hasOwnProperty(key)) {
                disclosures[key] = {
                    disclosedBy: [],
                    ...disclosure
                };
            }
            Object.assign(disclosures[key], mergeDisclosures(disclosures[key], disclosure));
            if (!disclosures[key].disclosedBy.includes(moduleName)) {
                disclosures[key].disclosedBy.push(moduleName);
            }
            next(moduleName, disclosure);
        },
        getDisclosures() {
            return Object.values(disclosures);
        }
    }
}

const {hook: discloseStorageHook, getDisclosures: dynamicDisclosures} = dynamicDisclosureCollector();
discloseStorageUse.before(discloseStorageHook);

export type StorageDisclosure = Disclosure & {
    /**
     * URL containing this disclosure, if any.
     */
    disclosedIn: string | null;
    /**
     * Names of the modules associated with this disclosure.
     */
    disclosedBy: string[];
}

function disclosureSummarizer(getDynamicDisclosures = dynamicDisclosures, getSummary = () => getStorageDisclosureSummary(getGlobal().installedModules, metadata.getModuleMetadata)) {
    return function() {
        return [].concat(
            getDynamicDisclosures().map(disclosure => ({
                disclosedIn: null,
                ...(disclosure as any)
            })),
            getSummary()
        );
    }
}

const getStorageUseDisclosures: () => StorageDisclosure[] = disclosureSummarizer();

declare module '../src/prebidGlobal' {
    interface PrebidJS {
        getStorageUseDisclosures: typeof getStorageUseDisclosures;
    }
}

addApiMethod('getStorageUseDisclosures', getStorageUseDisclosures);
