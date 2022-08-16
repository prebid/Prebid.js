import { formatQS } from './utils.js';
import { targeting } from './targeting.js';
import {hook} from './hook.js';

// Adserver parent class
const AdServer = function(attr) {
  this.name = attr.adserver;
  this.code = attr.code;
  this.getWinningBidByCode = function() {
    return targeting.getWinningBids(this.code)[0];
  };
};


/**
 * return the GAM PPID, if available (eid for the userID configured with `userSync.ppidSource`)
 */
export const getPPID = hook('sync', () => undefined);
