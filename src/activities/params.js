export const ACTIVITY_PARAM_COMPONENT = 'component';
export const ACTIVITY_PARAM_COMPONENT_TYPE = ACTIVITY_PARAM_COMPONENT + 'Type';
export const ACTIVITY_PARAM_COMPONENT_NAME = ACTIVITY_PARAM_COMPONENT + 'Name';
/**
 * s2sConfig[].configName, used to identify a particular s2s instance (applies to fetchBids)
 */
export const ACTIVITY_PARAM_S2S_NAME = 'configName';

export function activityParams(moduleType, moduleName, params) {
  return Object.assign({
    [ACTIVITY_PARAM_COMPONENT_TYPE]: moduleType,
    [ACTIVITY_PARAM_COMPONENT_NAME]: moduleName,
    [ACTIVITY_PARAM_COMPONENT]: `${moduleType}.${moduleName}`
  }, params);
}
