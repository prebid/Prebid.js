
export const ACTIVITY_PARAM_COMPONENT = 'component';
export const ACTIVITY_PARAM_COMPONENT_TYPE = ACTIVITY_PARAM_COMPONENT + 'Type';
export const ACTIVITY_PARAM_COMPONENT_NAME = ACTIVITY_PARAM_COMPONENT + 'Name';

export function activityParams(moduleType, moduleName, params) {
  return Object.assign({
    [ACTIVITY_PARAM_COMPONENT_TYPE]: moduleType,
    [ACTIVITY_PARAM_COMPONENT_NAME]: moduleName,
    [ACTIVITY_PARAM_COMPONENT]: `${moduleType}.${moduleName}`
  }, params);
}
