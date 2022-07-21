import {config} from './config.js';
import {getHook, hook} from './hook.js';
import {getGlobal} from './prebidGlobal.js';
import {logMessage, prefixLog} from './utils.js';
import {createBid} from './bidfactory.js';
import {loadExternalScript} from './adloader.js';
import {GreedyPromise} from './utils/promise.js';

export const DEBUG_KEY = '__$$PREBID_GLOBAL$$_debugging__';

function isDebuggingInstalled() {
  return getGlobal().installedModules.includes('debugging');
}

function loadScript(url) {
  return new GreedyPromise((resolve) => {
    loadExternalScript(url, 'debugging', resolve);
  });
}

export function debuggingModuleLoader({alreadyInstalled = isDebuggingInstalled, script = loadScript} = {}) {
  let loading = null;
  return function () {
    if (loading == null) {
      loading = new GreedyPromise((resolve, reject) => {
        // run this in a 0-delay timeout to give installedModules time to be populated
        setTimeout(() => {
          if (alreadyInstalled()) {
            resolve();
          } else {
            const url = '$$PREBID_DIST_URL_BASE$$debugging-standalone.js';
            logMessage(`Debugging module not installed, loading it from "${url}"...`);
            getGlobal()._installDebugging = true;
            script(url).then(() => {
              getGlobal()._installDebugging({DEBUG_KEY, hook, config, createBid, logger: prefixLog('DEBUG:')});
            }).then(resolve, reject);
          }
        });
      })
    }
    return loading;
  }
}

export function debuggingControls({load = debuggingModuleLoader(), hook = getHook('requestBids')} = {}) {
  let promise = null;
  let enabled = false;
  function waitForDebugging(next, ...args) {
    return (promise || GreedyPromise.resolve()).then(() => next.apply(this, args))
  }
  function enable() {
    if (!enabled) {
      promise = load();
      // set debugging to high priority so that it has the opportunity to mess with most things
      hook.before(waitForDebugging, 99);
      enabled = true;
    }
  }
  function disable() {
    hook.getHooks({hook: waitForDebugging}).remove();
    enabled = false;
  }
  function reset() {
    promise = null;
    disable();
  }
  return {enable, disable, reset};
}

const ctl = debuggingControls();
export const reset = ctl.reset;

export function loadSession({storage = window.sessionStorage, debugging = ctl} = {}) {
  let config = null;
  try {
    config = storage.getItem(DEBUG_KEY);
  } catch (e) {}
  if (config != null) {
    // just make sure the module runs; it will take care of parsing the config (and disabling itself if necessary)
    debugging.enable();
  }
}

config.getConfig('debugging', function ({debugging}) {
  debugging?.enabled ? ctl.enable() : ctl.disable();
});
