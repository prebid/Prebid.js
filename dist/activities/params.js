"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ACTIVITY_PARAM_SYNC_URL = exports.ACTIVITY_PARAM_SYNC_TYPE = exports.ACTIVITY_PARAM_STORAGE_TYPE = exports.ACTIVITY_PARAM_S2S_NAME = exports.ACTIVITY_PARAM_COMPONENT_TYPE = exports.ACTIVITY_PARAM_COMPONENT_NAME = exports.ACTIVITY_PARAM_COMPONENT = exports.ACTIVITY_PARAM_ANL_CONFIG = exports.ACTIVITY_PARAM_ADAPTER_CODE = void 0;
exports.activityParamsBuilder = activityParamsBuilder;
exports.buildActivityParams = void 0;
var _modules = require("./modules.js");
var _hook = require("../hook.js");
/**
 * Component ID - who is trying to perform the activity?
 * Relevant for all activities.
 */
const ACTIVITY_PARAM_COMPONENT = exports.ACTIVITY_PARAM_COMPONENT = 'component';
const ACTIVITY_PARAM_COMPONENT_TYPE = exports.ACTIVITY_PARAM_COMPONENT_TYPE = ACTIVITY_PARAM_COMPONENT + 'Type';
const ACTIVITY_PARAM_COMPONENT_NAME = exports.ACTIVITY_PARAM_COMPONENT_NAME = ACTIVITY_PARAM_COMPONENT + 'Name';

/**
 * Code of the bid adapter that `componentName` is an alias of.
 * May be the same as the component name.
 *
 * relevant for all activities, but only when componentType is 'bidder'.
 */
const ACTIVITY_PARAM_ADAPTER_CODE = exports.ACTIVITY_PARAM_ADAPTER_CODE = 'adapterCode';

/**
 * Storage type - either 'html5' or 'cookie'.
 * Relevant for: accessDevice
 */
const ACTIVITY_PARAM_STORAGE_TYPE = exports.ACTIVITY_PARAM_STORAGE_TYPE = 'storageType';

/**
 * s2sConfig[].configName, used to identify a particular s2s instance
 * relevant for: fetchBids, but only when component is 'prebid.pbsBidAdapter'
 */
const ACTIVITY_PARAM_S2S_NAME = exports.ACTIVITY_PARAM_S2S_NAME = 'configName';
/**
 * user sync type - 'iframe' or 'pixel'
 * relevant for: syncUser
 */
const ACTIVITY_PARAM_SYNC_TYPE = exports.ACTIVITY_PARAM_SYNC_TYPE = 'syncType';
/**
 * user sync URL
 * relevant for: syncUser
 */
const ACTIVITY_PARAM_SYNC_URL = exports.ACTIVITY_PARAM_SYNC_URL = 'syncUrl';
/**
 * @private
 * configuration options for analytics adapter - the argument passed to `enableAnalytics`.
 * relevant for: reportAnalytics
 */
const ACTIVITY_PARAM_ANL_CONFIG = exports.ACTIVITY_PARAM_ANL_CONFIG = '_config';
function activityParamsBuilder(resolveAlias) {
  return function activityParams(moduleType, moduleName, params) {
    const defaults = {
      [ACTIVITY_PARAM_COMPONENT_TYPE]: moduleType,
      [ACTIVITY_PARAM_COMPONENT_NAME]: moduleName,
      [ACTIVITY_PARAM_COMPONENT]: "".concat(moduleType, ".").concat(moduleName)
    };
    if (moduleType === _modules.MODULE_TYPE_BIDDER) {
      defaults[ACTIVITY_PARAM_ADAPTER_CODE] = resolveAlias(moduleName);
    }
    return buildActivityParams(Object.assign(defaults, params));
  };
}
const buildActivityParams = exports.buildActivityParams = (0, _hook.hook)('sync', params => params);