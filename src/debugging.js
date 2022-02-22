import {loadModule} from './dynModules.js';

export const OVERRIDE_KEY = '$$PREBID_GLOBAL$$:debugging';

export function sessionLoader(storage) {
  storage = storage || window.sessionStorage;
  if (storage.getItem(OVERRIDE_KEY) != null) {
    return loadModule('debugging');
  } else {
    return Promise.resolve();
  }
}
