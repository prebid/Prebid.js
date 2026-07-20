import { config } from './config.js';
import { getHook, hook } from './hook.js';
import { logError, prefixLog } from './utils.js';
import { createBid } from './bidfactory.js';
import { PbPromise } from './utils/promise.js';
import * as utils from './utils.js';
import { BANNER, NATIVE, VIDEO } from './mediaTypes.js';
import { Renderer } from './Renderer.js';
import { standaloneModuleLoader } from './standaloneModuleLoader.js';

import { getGlobalVarName } from './buildOptions.js';

export const DEBUG_KEY = `__${getGlobalVarName()}_debugging__`;

export function debuggingModuleLoader({ alreadyInstalled, script } = {}) {
  return standaloneModuleLoader({
    moduleName: 'debugging',
    installProp: '_installDebugging',
    bundle: 'debugging-standalone.js',
    deps: {
      DEBUG_KEY,
      hook,
      config,
      createBid,
      logger: prefixLog('DEBUG:'),
      utils,
      BANNER,
      NATIVE,
      VIDEO,
      Renderer
    },
    alreadyInstalled,
    script,
  });
}

export function debuggingControls({ load = debuggingModuleLoader(), hook = getHook('requestBids') } = {}) {
  let promise = null;
  let enabled = false;
  function waitForDebugging(next, ...args) {
    return (promise || PbPromise.resolve())
      .catch((e) => {
        logError(`Could not load debugging module`, e);
      })
      .then(() => next.apply(this, args));
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
    hook.getHooks({ hook: waitForDebugging }).remove();
    enabled = false;
  }
  function reset() {
    promise = null;
    disable();
  }
  return { enable, disable, reset };
}

const ctl = debuggingControls();
export const reset = ctl.reset;

export function loadSession() {
  let storage = null;
  try {
    // eslint-disable-next-line no-restricted-properties
    storage = window.sessionStorage;
  } catch (e) {}

  if (storage !== null) {
    const debugging = ctl;
    let config = null;
    try {
      config = storage.getItem(DEBUG_KEY);
    } catch (e) {}
    if (config !== null) {
      // just make sure the module runs; it will take care of parsing the config (and disabling itself if necessary)
      debugging.enable();
    }
  }
}

config.getConfig('debugging', function ({ debugging }) {
  debugging?.enabled ? ctl.enable() : ctl.disable();
});
