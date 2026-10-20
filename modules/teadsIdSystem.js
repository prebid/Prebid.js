// This file exists for backwards compatibility only.
// Teads no longer uses the first-party ID this module provided, so the module has been
// removed. Kept as a no-op ID submodule so publishers building with
// --modules=teadsIdSystem still get a working bundle.
// This file will be removed in Prebid 12.
import { logWarn } from '../src/utils.js';
import { submodule } from '../src/hook.js';

/**
 * @typedef {import('../modules/userId/spec.js').IdProviderSpec} IdProviderSpec
 * @typedef {import('./teadsIdSystem.d.ts').TeadsIdSystemModuleName} TeadsIdSystemModuleName
 */

/** @type {IdProviderSpec<TeadsIdSystemModuleName>} */
export const teadsIdSubmodule = {
  name: 'teadsId',
  decode() {
    return undefined;
  },
  getId() {
    logWarn('teadsIdSystem has been removed because Teads no longer uses this ID; it no longer provides one. Please remove "teadsId" from your userSync.userIds configuration.');
    return undefined;
  }
};

submodule('userId', teadsIdSubmodule);
