import path from 'path';

export function getPrebidRoot() {
  return path.resolve(path.join(import.meta.dirname, '../../..'))
}

export function bundleMaker(makeBundleFn) {
  let bundles = {};
  return async function (modules) {
    modules = (Array.isArray(modules) ? modules : [modules]).sort();
    const key = modules.join(',');
    if (bundles[key] == null) {
      bundles[key] = await makeBundleFn(modules);
    }
    return bundles[key];
  };
}
