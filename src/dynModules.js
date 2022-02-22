import {getGlobal} from './prebidGlobal.js';
import {logError, logMessage} from './utils.js';

function moduleURL(moduleName) {
  return `$$PREBID_DIST_URL_BASE$$${moduleName}.js`;
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.onload = resolve;
    script.onerror = reject;
    script.type = 'text/javascript';
    script.src = url;
    script.async = true;
    document.head.appendChild(script);
  });
}

export function moduleLoader({getUrl = moduleURL, loadUrl = loadScript, isInstalled = (mod) => getGlobal().installedModules.includes(mod)} = {}) {
  const cache = {};

  return function loadModule(moduleName) {
    if (!/^[\w-]+$/.exec(moduleName)) {
      throw new Error(`Invalid module name: ${moduleName}`);
    }
    if (!cache.hasOwnProperty(moduleName)) {
      const url = getUrl(moduleName);
      cache[moduleName] = new Promise((resolve, reject) => {
        setTimeout(() => {
          if (isInstalled(moduleName)) {
            resolve();
          } else {
            logMessage(`Loading module: "${moduleName}"...`);
            return loadUrl(url).then(resolve, reject);
          }
        });
      }).catch((err) => {
        logError(`Could not load module "${moduleName}" from "${url}"`, err);
        return Promise.reject(err);
      }).then(() => {
        logMessage(`Module "${moduleName}" loaded from "${url}"`);
      });
    }
    return cache[moduleName];
  };
}

/**
 * @type {function(string): Promise}
 *
 * Dynamically load a module by name. Returns a promise that resolves when the module has
 * been loaded.
 */
export const loadModule = moduleLoader();
