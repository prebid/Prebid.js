/**
 * This module adds Freewheel support for Video to Prebid.
 */

import { registerVideoSupport } from '../src/adServerManager.js';
import { getHook, submodule } from '../src/hook.js';

export const adpodUtils = {};
export function notifyTranslationModule(fn) {
  fn.call(this, 'freewheel');
}

getHook('registerAdserver').before(notifyTranslationModule);

registerVideoSupport('freewheel', {
  getTargeting: (args) => adpodUtils.getTargeting(args)
});

submodule('adpod', adpodUtils);
