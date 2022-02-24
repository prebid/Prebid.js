import {config} from '../../src/config.js';
import {hook} from '../../src/hook.js';
import {install} from './debugging.js';
import {prefixLog} from '../../src/utils.js';

install({config, hook, logger: prefixLog('DEBUG:')});
