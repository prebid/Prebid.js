/* eslint prebid/validate-imports: 0 */

import {config} from '../../src/config.js';
import {hook} from '../../src/hook.js';
import {install} from './debugging.js';
import {prefixLog} from '../../src/utils.js';
import {createBid} from '../../src/bidfactory.js';
import {DEBUG_KEY} from '../../src/debugging.js';
import * as utils from '../../src/utils.js';
import {BANNER, NATIVE, VIDEO} from '../../src/mediaTypes.js';
import {Renderer} from '../../src/Renderer.js';

install({
  DEBUG_KEY,
  config,
  hook,
  createBid,
  logger: prefixLog('DEBUG:'),
  utils,
  BANNER,
  NATIVE,
  VIDEO,
  Renderer,
});
