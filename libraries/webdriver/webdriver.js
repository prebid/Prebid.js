import {canAccessWindowTop, internal as utilsInternals} from '../../src/utils.js';

/**
 * Warning: accessing navigator.webdriver may impact fingerprinting scores when this API is included in the built script.
 */
export function isWebdriverEnabled() {
  const win = canAccessWindowTop() ? utilsInternals.getWindowTop() : utilsInternals.getWindowSelf();
  return win.navigator?.webdriver === true;
}
