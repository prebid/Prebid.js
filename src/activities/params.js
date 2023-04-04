export const ACTIVITY_PARAM_COMPONENT = 'component';
export const ACTIVITY_PARAM_COMPONENT_TYPE = ACTIVITY_PARAM_COMPONENT + 'Type';
export const ACTIVITY_PARAM_COMPONENT_NAME = ACTIVITY_PARAM_COMPONENT + 'Name';
/**
 * s2sConfig[].configName, used to identify a particular s2s instance
 * relevant for: fetchBids
 */
export const ACTIVITY_PARAM_S2S_NAME = 'configName';
/**
 * @private
 * configuration options for analytics adapter - the argument passed to `enableAnalytics`.
 * relevant for: reportAnalytics
 */
export const ACTIVITY_PARAM_ANL_CONFIG = '_config';

export function activityParams(moduleType, moduleName, params) {
  return Object.assign({
    [ACTIVITY_PARAM_COMPONENT_TYPE]: moduleType,
    [ACTIVITY_PARAM_COMPONENT_NAME]: moduleName,
    [ACTIVITY_PARAM_COMPONENT]: `${moduleType}.${moduleName}`
  }, params);
}
