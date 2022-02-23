import {loadModule} from './dynModules.js';
import {config} from './config.js';

export const OVERRIDE_KEY = '$$PREBID_GLOBAL$$:debugging';

let promise = null;

export function reset() {
  promise = null;
}

export function ready() {
  return promise ? promise.catch(() => null) : Promise.resolve();
}

function loadDebuggingModule() {
  return loadModule('debugging');
}

export function loadSession({storage = window.sessionStorage, load = loadDebuggingModule} = {}) {
  if (storage.getItem(OVERRIDE_KEY) != null) {
    promise = load();
  }
}

export function getConfig({debugging}, {load = loadDebuggingModule} = {}) {
  if (debugging.enabled) {
    promise = load();
  }
}

config.getConfig('debugging', getConfig);
loadSession();
