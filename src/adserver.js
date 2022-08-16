import { formatQS } from './utils.js';
import { targeting } from './targeting.js';
import {hook} from './hook.js';

/**
 * return the GAM PPID, if available (eid for the userID configured with `userSync.ppidSource`)
 */
export const getPPID = hook('sync', () => undefined);
