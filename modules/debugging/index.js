import {config} from '../../src/config.js';
import {hook} from '../../src/hook.ts';
import {install} from './debugging.js';
import {prefixLog} from '../../src/utils.js';
import {createBid} from '../../src/bidfactory.ts';
import {DEBUG_KEY} from '../../src/debugging.js';

install({DEBUG_KEY, config, hook, createBid, logger: prefixLog('DEBUG:')});
