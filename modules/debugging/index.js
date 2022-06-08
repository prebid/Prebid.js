import {config} from '../../src/config.js';
import {hook} from '../../src/hook.js';
import {install} from './debugging.js';
import {prefixLog} from '../../src/utils.js';
import {createBid} from '../../src/bidfactory.js';

install({config, hook, createBid, logger: prefixLog('DEBUG:')});
