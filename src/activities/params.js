import {MODULE_TYPE_BIDDER} from './modules.js';
import {hook} from '../hook.js';

/**
 * Component ID - who is trying to perform the activity?
 * Relevant for all activities.
 */
export const ACTIVITY_PARAM_COMPONENT = 'component';
export const ACTIVITY_PARAM_COMPONENT_TYPE = ACTIVITY_PARAM_COMPONENT + 'Type';
export const ACTIVITY_PARAM_COMPONENT_NAME = ACTIVITY_PARAM_COMPONENT + 'Name';

/**
 * Code of the bid adapter that `componentName` is an alias of.
 * May be the same as the component name.
 *
 * relevant for all activities, but only when componentType is 'bidder'.
 */
export const ACTIVITY_PARAM_ADAPTER_CODE = 'adapterCode';

/**
 * Storage type - either 'html5' or 'cookie'.
 * Relevant for: accessDevice
 */
export const ACTIVITY_PARAM_STORAGE_TYPE = 'storageType';

/**
 * s2sConfig[].configName, used to identify a particular s2s instance
 * relevant for: fetchBids, but only when component is 'prebid.pbsBidAdapter'
 */
export const ACTIVITY_PARAM_S2S_NAME = 'configName';
/**
 * user sync type - 'iframe' or 'pixel'
 * relevant for: syncUser
 */
export const ACTIVITY_PARAM_SYNC_TYPE = 'syncType'
/**
 * user sync URL
 * relevant for: syncUser
 */
export const ACTIVITY_PARAM_SYNC_URL = 'syncUrl';
/**
 * @private
 * Configuration options for analytics adapter - the argument passed to `enableAnalytics`.
 * Relevant for: reportAnalytics.
 * @constant
 * @type {string}
 */
export const ACTIVITY_PARAM_ANL_CONFIG = '_config';

export function activityParamsBuilder(resolveAlias) {
  return function activityParams(moduleType, moduleName, params) {
    const defaults = {
      [ACTIVITY_PARAM_COMPONENT_TYPE]: moduleType,
      [ACTIVITY_PARAM_COMPONENT_NAME]: moduleName,
      [ACTIVITY_PARAM_COMPONENT]: `${moduleType}.${moduleName}`
    };
    if (moduleType === MODULE_TYPE_BIDDER) {
      defaults[ACTIVITY_PARAM_ADAPTER_CODE] = resolveAlias(moduleName);
    }
    return buildActivityParams(Object.assign(defaults, params));
  }
}

export const buildActivityParams = hook('sync', params => params);
