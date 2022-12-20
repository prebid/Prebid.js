import {logWarn} from '../src/utils.js';

export const MODULE_NAME = 'viewability';

export function init() {
  logWarn('Viewability module should not be used. See https://github.com/prebid/Prebid.js/issues/8928');
}

init();
