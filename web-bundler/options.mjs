import defaultOptions from 'buildOptions.mjs';
import { applyOptions } from '../customize/applyOptions.mjs';

export function parseParams(params) {
  const search = new URLSearchParams(params);
  let modules = search.getAll('modules');
  if (modules.length === 1) {
    modules = modules[0].split(',')
  }
  const buildOptionsOverrides = {};
  const options = {modules};
  ['distUrlBase', 'globalVarName'].forEach(param => {
    if (search.has(param)) {
      buildOptionsOverrides[param] = search.get(param);
    }
  })
  options.buildOptions = applyOptions(defaultOptions, buildOptionsOverrides)
  return options;
}

export function getBuildOptions(overrides) {
  return applyOptions(defaultOptions, overrides);
}
