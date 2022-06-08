import {config} from './config.js';
import {hook} from './hook.js';
import {getGlobal} from './prebidGlobal.js';
import {logError, logMessage, prefixLog} from './utils.js';
import {createBid} from './bidfactory.js';

export const DEBUG_KEY = '__$$PREBID_GLOBAL$$_debugging__';

let promise = null;

export function reset() {
  promise = null;
}

export function ready() {
  return promise ? promise.catch(() => null) : Promise.resolve();
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

export function debuggingModuleLoader({alreadyInstalled = () => getGlobal().installedModules.includes('debugging'), script = loadScript} = {}) {
  let loading = null;
  return function () {
    if (loading == null) {
      loading = new Promise((resolve, reject) => {
        setTimeout(() => {
          if (alreadyInstalled()) {
            resolve();
          } else {
            const url = '$$PREBID_DIST_URL_BASE$$debugging-standalone.js';
            logMessage(`Debugging module not installed, loading it from "${url}"...`);
            getGlobal()._installDebugging = true;
            script(url).then(() => {
              getGlobal()._installDebugging({DEBUG_KEY, hook, config, createBid, logger: prefixLog('DEBUG:')})
            }).catch((err) => {
              logError('Could not load debugging module: ', err);
              return Promise.reject(err);
            }).then(resolve, reject);
          }
        });
      })
    }
    return loading;
  }
}

const loadDebugging = debuggingModuleLoader();

export function loadSession({storage = window.sessionStorage, load = loadDebugging} = {}) {
  let config = null;
  try {
    config = storage.getItem(DEBUG_KEY);
  } catch (e) {}
  if (config != null) {
    promise = load();
  }
}

export function getConfig({debugging}, {load = loadDebugging} = {}) {
  if (debugging.enabled) {
    promise = load();
  }
}

config.getConfig('debugging', getConfig);
loadSession();
