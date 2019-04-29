/**
 * This module adds Freewheel support for Video to Prebid.
 */

import { registerVideoSupport } from '../src/adServerManager';
import { initAdpodHooks } from './adpod';
import { getHook } from '../src/hook';
import { getTargeting } from './common/videoAdserver';

export function notifyTranslationModule(fn) {
  fn.call(this, 'freewheel');
}

getHook('registerAdserver').before(notifyTranslationModule);

initAdpodHooks();
registerVideoSupport('freewheel', {
  getTargeting: getTargeting,
});
