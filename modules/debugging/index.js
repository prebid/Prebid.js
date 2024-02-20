import {config} from '../../src/config.js';
import {hook} from '../../src/hook.js';
import {install} from './debugging.js';
import {prefixLog} from '../../src/utils.js';
import {createBid} from '../../src/bidfactory.js';
import {DEBUG_KEY} from '../../src/debugging.js';

install({DEBUG_KEY, config, hook, createBid, logger: prefixLog('DEBUG:')});
