import {config} from './config.js';
import {logError} from './utils.js';
const CACHE_TTL_SETTING = 'minBidCacheTTL';
let TTL_BUFFER = 1;
let minCacheTTL = null;
const listeners = [];

declare module './config' {
  interface Config {
    /**
     * TTL buffer in seconds.
     *
     * When an adapter bids, it provides a TTL (time-to-live); the bid is considered expired and unusuable after that time has elapsed.
     * Core subtracts from it a buffer (default 1 second) that is, a bid with TTL of 30 seconds is considered expired after 29 seconds.
     */
    ttlBuffer?: number;
    /**
     * When set, bids are only kept in memory for the duration of their actual TTL lifetime or the value of minBidCacheTTL, whichever is greater.
     * Setting minBidCacheTTL: 0 causes bids to be dropped as soon as they expire.
     *
     * If unset (the default), bids are kept for the lifetime of the page.
     */
    [CACHE_TTL_SETTING]?: number;
  }
}

config.getConfig('ttlBuffer', (cfg) => {
  if (typeof cfg.ttlBuffer === 'number') {
    TTL_BUFFER = cfg.ttlBuffer;
  } else {
    logError('Invalid value for ttlBuffer', cfg.ttlBuffer);
  }
})

export function getBufferedTTL(bid) {
  return bid.ttl - (bid.hasOwnProperty('ttlBuffer') ? bid.ttlBuffer : TTL_BUFFER);
}

export function getMinBidCacheTTL() {
  return minCacheTTL;
}

config.getConfig(CACHE_TTL_SETTING, (cfg) => {
  const prev = minCacheTTL;
  minCacheTTL = cfg?.[CACHE_TTL_SETTING];
  minCacheTTL = typeof minCacheTTL === 'number' ? minCacheTTL : null;
  if (prev !== minCacheTTL) {
    listeners.forEach(l => l(minCacheTTL))
  }
})

export function onMinBidCacheTTLChange(listener) {
  listeners.push(listener);
}
